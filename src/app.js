import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import express from 'express';
import cron from 'node-cron';

import config from './config/application.js';
import { initializeDatabase } from './utils/database.js';
import { logger, startupLog, shutdownLog } from './utils/logger.js';
import { checkBirthdays } from './services/birthdayService.js';
import { checkGiveaways } from './services/giveawayService.js';
import { loadCommands, registerCommands as registerSlashCommands } from './handlers/commandLoader.js';
import { addXp } from './services/xpSystem.js';

class SoloBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildBans
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

      await this.login(process.env.TOKEN);

      console.log(`Logged in as ${this.user.tag}`);

      this.on('interactionCreate', async (interaction) => {
        try {
          if (interaction.isChatInputCommand()) {
            const command = this.commands.get(interaction.commandName);

            if (!command) return;

            await command.execute(interaction, this);
          }

          if (interaction.isButton()) {

  // GIVEAWAY JOIN
  if (interaction.customId === "gw_join") {
    const { giveaways } = await import('./commands/giveaway/giveaway.js');

    const data = giveaways.get(interaction.message.id);
    if (!data) {
      return interaction.reply({ content: "Giveaway not found", ephemeral: true });
    }

    if (!data.entries.includes(interaction.user.id)) {
      data.entries.push(interaction.user.id);
    }

    return interaction.reply({ content: "You joined the giveaway", ephemeral: true });
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
      type: 0,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: ["ViewChannel"]
        },
        {
          id: interaction.user.id,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"]
        }
      ]
    });

    await channel.send(`Welcome ${interaction.user} support will be here soon`);

    return interaction.editReply({ content: `Ticket created: ${channel}` });
  }

  // CLOSE TICKET
  if (interaction.customId === "close_ticket") {
    await interaction.reply({ content: "Closing ticket...", ephemeral: true });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
  }
}

      this.on('messageCreate', async (message) => {
        try {
          if (!message.guild || message.author.bot) return;
          await addXp(this, message.guild, message.member);
        } catch (err) {
          logger.error('XP Error:', err);
        }
      });

      await this.registerCommands();

      startupLog('SoloBot ONLINE');

      this.setupCronJobs();

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

    app.listen(port);
  }

  setupCronJobs() {
    cron.schedule('0 6 * * *', () => checkBirthdays(this));
    cron.schedule('* * * * *', () => checkGiveaways(this));
  }

  async registerCommands() {
    try {
      await registerSlashCommands(this, config.bot.guildId);
    } catch (error) {
      logger.error('Command error:', error);
    }
  }

  async shutdown(reason = 'UNKNOWN') {
    shutdownLog(`Shutting down (${reason})...`);

    try {
      if (this.isReady()) this.destroy();
      process.exit(0);
    } catch (error) {
      logger.error('Shutdown error:', error);
      process.exit(1);
    }
  }
}

const bot = new SoloBot();

process.on('SIGINT', () => bot.shutdown('SIGINT'));
process.on('SIGTERM', () => bot.shutdown('SIGTERM'));

bot.start();

export default SoloBot;
