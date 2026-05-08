import { Events } from "discord.js";
import {
  getLevelingConfig,
  getUserLevel,
  saveUserLevel,
  getXPNeeded
} from "../../services/leveling.js";

export default {
  name: Events.MessageCreate,

  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const prefix = "s!";

    /* =======================
       🎯 LEVELING SYSTEM
    ======================= */

    try {
      const cfg = await getLevelingConfig(client, guildId);

      if (
        cfg?.enabled &&
        message.content.length > 5 &&
        !message.content.startsWith(prefix)
      ) {
        let data = await getUserLevel(client, guildId, userId);

        const now = Date.now();

        if (now - (data.lastXP || 0) > cfg.xpCooldown * 1000) {
          const xp =
            Math.floor(Math.random() * (cfg.xpMax - cfg.xpMin + 1)) + cfg.xpMin;

          data.xp += xp;
          data.totalXp += xp;
          data.lastXP = now;

          const needed = getXPNeeded(data.level);

          if (data.xp >= needed) {
            data.level++;
            data.xp = 0;

            if (cfg.levelUpChannel) {
              const ch = message.guild.channels.cache.get(cfg.levelUpChannel);

              if (ch) {
                const msg = cfg.levelUpMessage
                  .replace("{user}", `<@${userId}>`)
                  .replace("{level}", data.level);

                ch.send({ content: msg }).catch(() => {});
              }
            }
          }

          await saveUserLevel(client, guildId, userId, data);
        }
      }
    } catch (err) {
      console.error("Leveling Error:", err);
    }

    /* =======================
       ⚡ PREFIX COMMAND SYSTEM
    ======================= */

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command =
      client.commands.get(commandName) ||
      client.commands.find(cmd => cmd.aliases?.includes(commandName));

    if (!command) return;

    try {
      if (command.executePrefix) {
        await command.executePrefix(message, args, client);
      } else if (command.execute && !command.data) {
        await command.execute(message, args, client);
      }
    } catch (error) {
      console.error(error);
      message.reply("❌ Error running command");
    }
  }
};
