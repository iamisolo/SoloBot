import 'dotenv/config';
import {
  Client,
  Collection,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';
import express from 'express';
import cron from 'node-cron';
import fs from 'fs';

import config from './config/application.js';
import { initializeDatabase } from './utils/database.js';
import { logger, startupLog, shutdownLog } from './utils/logger.js';
import { checkBirthdays } from './services/birthdayService.js';
import { loadCommands, registerCommands as registerSlashCommands } from './handlers/commandLoader.js';
import { addXp } from './services/xpSystem.js';

// ===== SIMPLE DB (JSON) =====
const FILE = './src/commands/giveaway/giveaways.json';
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]');

const giveaways = new Map();

function loadGiveaways() {
  const data = JSON.parse(fs.readFileSync(FILE));
  for (const g of data) giveaways.set(g.messageId, g);
}

function saveGiveaways() {
  fs.writeFileSync(FILE, JSON.stringify([...giveaways.values()], null, 2));
}

function endGiveaway(id) {
  const g = giveaways.get(id);
  if (!g) return null;

  const winner =
    g.entries.length > 0
      ? g.entries[Math.floor(Math.random() * g.entries.length)]
      : null;

  giveaways.delete(id);
  saveGiveaways();

  return { g, winner };
}

class SoloBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ],
    });

    this.config = config;
    this.commands = new Collection();
    this.db = null;
  }

  async start() {
    try {
      startupLog('Starting SoloBot...');

      const dbInstance = await initializeDatabase();
      this.db = dbInstance.db;

      this.startWebServer();

      await loadCommands(this);
      loadGiveaways();

      await this.login(process.env.TOKEN);

      console.log(`Logged in as ${this.user.tag}`);
      console.log(`Commands Loaded: ${this.commands.size}`);

      // ===== INTERACTIONS =====
      this.on('interactionCreate', async (interaction) => {
        try {
          if (interaction.isChatInputCommand()) {
            const command = this.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction, this);
          }

          if (interaction.isButton()) {

            // JOIN GIVEAWAY
            if (interaction.customId === "gw_join") {
              const g = giveaways.get(interaction.message.id);

              if (!g) {
                return interaction.reply({ content: "Giveaway not found", ephemeral: true });
              }

              if (g.entries.includes(interaction.user.id)) {
                return interaction.reply({ content: "You already joined!", ephemeral: true });
              }

              g.entries.push(interaction.user.id);
              saveGiveaways();

              return interaction.reply({ content: "Joined giveaway!", ephemeral: true });
            }

            // CREATE TICKET
            if (interaction.customId === "create_ticket") {
              await interaction.deferReply({ ephemeral: true });

              const existing = interaction.guild.channels.cache.find(
                c => c.name === `ticket-${interaction.user.id}`
              );

              if (existing) {
                return interaction.editReply({ content: `You already have a ticket: ${existing}` });
              }

              const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.id}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                  },
                  {
                    id: interaction.user.id,
                    allow: [
                      PermissionFlagsBits.ViewChannel,
                      PermissionFlagsBits.SendMessages,
                      PermissionFlagsBits.ReadMessageHistory
                    ]
                  }
                ]
              });

              await channel.send(`Welcome ${interaction.user}`);
              return interaction.editReply({ content: `Ticket created: ${channel}` });
            }

            // CLOSE TICKET
            if (interaction.customId === "close_ticket") {
              await interaction.reply({ content: "Closing...", ephemeral: true });
              setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }
          }

        } catch (err) {
          console.error(err);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "Error", ephemeral: true });
          }
        }
      });

      // ===== XP =====
      this.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot) return;
        await addXp(this, message.guild, message.member);
      });

      // ===== COMMAND REGISTER =====
      await this.registerCommands();

      // ===== CRON =====
      cron.schedule('* * * * *', async () => {
        const now = Date.now();

        for (const [id, g] of giveaways) {
          if (now >= g.endAt) {
            const channel = await this.channels.fetch(g.channelId).catch(() => null);
            if (!channel) continue;

            const result = endGiveaway(id);
            if (!result) continue;

            const { winner, g: data } = result;

            if (winner) {
              channel.send(`🏆 Winner: <@${winner}> | **${data.prize}**`);
            } else {
              channel.send(`No participants | **${data.prize}**`);
            }
          }
        }
      });

      cron.schedule('0 6 * * *', () => checkBirthdays(this));

      startupLog('SoloBot ONLINE');

    } catch (error) {
      logger.error('Startup error:', error);
      process.exit(1);
    }
  }

  startWebServer() {
    const app = express();
    const port = process.env.PORT || 3000;

    app.get('/', (req, res) => {
      res.json({ status: 'SoloBot Online' });
    });

import 'dotenv/config';
import {
  Client,
  Collection,
  GatewayIntentBits
} from 'discord.js';

import fs from 'fs';
import express from 'express';
import cron from 'node-cron';

import config from './config/application.js';
import { initializeDatabase } from './utils/database.js';
import { logger } from './utils/logger.js';
import { loadCommands, registerCommands } from './handlers/commandLoader.js';

// ✅ LOAD INTERACTION HANDLER
import './events/interactionCreate.js';

// ===== GIVEAWAY FILE SETUP =====
const FILE = './data/giveaways.json';
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]');

export const giveaways = new Map();

// ===== BOT CLASS =====
class Bot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
      ]
    });

    this.commands = new Collection();
  }

  async start() {
    try {
      // ✅ DATABASE
      await initializeDatabase();

      // ✅ LOAD COMMANDS
      await loadCommands(this);

      // ✅ READY EVENT (FIXED)
      this.once("ready", () => {
        console.log("=================================");
        console.log(`🤖 Logged in as ${this.user.tag}`);
        console.log(`📊 Servers: ${this.guilds.cache.size}`);
        console.log("=================================");
      });

      // ✅ LOGIN
      await this.login(process.env.TOKEN);

      // ✅ REGISTER COMMANDS
      await registerCommands(this, config.bot.guildId);

      // ✅ START SERVICES
      this.startServer();
      this.startCron();

    } catch (err) {
      logger.error(err);
    }
  }

  // ===== WEB SERVER =====
  startServer() {
    const app = express();

    app.get('/', (req, res) => {
      res.json({
        status: "ONLINE",
        bot: this.user?.tag || "Starting..."
      });
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🌐 Web server running on port ${port}`);
    });
  }

  // ===== CRON JOBS =====
  startCron() {
    cron.schedule('* * * * *', () => {
      console.log("⏱ Checking giveaways...");
    });
  }
}

// ===== START BOT =====
const bot = new Bot();
bot.start();

export default bot;
