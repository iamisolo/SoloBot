import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import express from 'express';
import cron from 'node-cron';

import config from './config/application.js';
import { initializeDatabase } from './utils/database.js';
import { logger, startupLog, shutdownLog } from './utils/logger.js';
import { checkBirthdays } from './services/birthdayService.js';
import { checkGiveaways } from './services/giveawayService.js';
import { loadCommands, registerCommands as registerSlashCommands } from './handlers/commandLoader.js';

/* ✅ XP SYSTEM */
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
    this.rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  }

  async start() {
    try {
      startupLog('Starting SoloBot...');

      /* DB */
      const dbInstance = await initializeDatabase();
      this.db = dbInstance.db;

      /* WEB SERVER */
      this.startWebServer();

      /* COMMANDS */
      await loadCommands(this);

      /* LOGIN FIRST */
      await this.login(process.env.TOKEN);

      /* 🔥 XP SYSTEM EVENT */
      this.on('messageCreate', async (message) => {
        try {
          if (!message.guild || message.author.bot) return;

          await addXp(this, message.guild, message.member);
        } catch (err) {
          logger.error('XP Error:', err);
        }
      });

      /* SLASH COMMANDS */
      await this.registerCommands();

      startupLog('SoloBot ONLINE ✅');

      /* CRON JOBS */
      this.setupCronJobs();

    } catch (error) {
      logger.error('Startup error:', error);
      process.exit(1);
    }
  }

  /* 🌐 WEB SERVER */
  startWebServer() {
    const app = express();
    const port = process.env.PORT || 3000;

    app.get('/', (req, res) => {
      res.json({ status: 'SoloBot Online ✅' });
    });

    app.listen(port, () => {
      startupLog(`Web server running on port ${port}`);
    });
  }

  /* ⏰ CRON JOBS */
  setupCronJobs() {
    cron.schedule('0 6 * * *', () => checkBirthdays(this));
    cron.schedule('* * * * *', () => checkGiveaways(this));
  }

  /* 📌 REGISTER COMMANDS */
  async registerCommands() {
    try {
      await registerSlashCommands(this, config.bot.guildId);
    } catch (error) {
      logger.error('Command error:', error);
    }
  }

  /* 🛑 SHUTDOWN */
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

/* 🚀 START BOT */
const bot = new SoloBot();

process.on('SIGINT', () => bot.shutdown('SIGINT'));
process.on('SIGTERM', () => bot.shutdown('SIGTERM'));

bot.start();

export default SoloBot;
