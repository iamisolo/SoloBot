import 'dotenv/config';

import {
  Client,
  Collection,
  GatewayIntentBits
} from 'discord.js';

import fs from 'fs';
import path from 'path';
import express from 'express';
import cron from 'node-cron';

import config from './config/application.js';
import { initializeDatabase } from './utils/database.js';
import { logger } from './utils/logger.js';
import { loadCommands, registerCommands } from './handlers/commandLoader.js';

// ✅ interaction handler
import interactionHandler from './events/interactionCreate.js';

// ===== GIVEAWAY FILE PATH (FIXED CASE) =====
const FILE = path.join(process.cwd(), 'src', 'commands', 'Giveaway', 'giveaways.json');

// ensure folder exists
if (!fs.existsSync(path.dirname(FILE))) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
}

// ensure file exists
if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, '[]');
}

// ===== MEMORY CACHE =====
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
      await initializeDatabase();

      // ✅ LOAD INTERACTIONS FIRST
      interactionHandler(this);

      // load commands
      await loadCommands(this);

      this.once('ready', () => {
        console.log('==============================');
        console.log(`🤖 Logged in as ${this.user.tag}`);
        console.log(`📊 Guilds: ${this.guilds.cache.size}`);
        console.log('==============================');
      });

      // login
      await this.login(process.env.DISCORD_TOKEN);

      // register slash commands
      await registerCommands(this, config.bot.guildId);

      // systems
      this.startServer();
      this.startCron();

    } catch (err) {
      logger.error(err);
    }
  }

  // ===== EXPRESS SERVER =====
  startServer() {
    const app = express();

    app.get('/', (req, res) => {
      res.json({
        status: 'online',
        bot: this.user?.tag || 'starting...'
      });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🌐 Server running on ${PORT}`);
    });
  }

  // ===== GIVEAWAY AUTO END =====
  startCron() {
    cron.schedule('* * * * *', () => {
      try {
        const data = JSON.parse(fs.readFileSync(FILE));

        let updated = false;

        for (const g of data) {
          if (g.ended) continue;

          if (Date.now() >= g.endTime) {
            g.ended = true;

            if (!g.entries || g.entries.length === 0) {
              g.winner = null;
              console.log(`❌ No entries for: ${g.prize}`);
            } else {
              const winner =
                g.entries[Math.floor(Math.random() * g.entries.length)];
              g.winner = winner;

              console.log(`🎉 Winner (${g.prize}): ${winner}`);
            }

            updated = true;
          }
        }

        if (updated) {
          fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
        }

      } catch (err) {
        console.error('❌ Cron Error:', err);
      }
    });
  }
}

// ===== START =====
const bot = new Bot();
bot.start();

export default bot;
export default bot;
