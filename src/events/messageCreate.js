import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.MessageCreate,

  async execute(message, client) {
    try {
      // ❌ Ignore bots & DMs
      if (message.author.bot || !message.guild) return;

      const prefix = 's!';

      // ❌ Not a prefix command
      if (!message.content.startsWith(prefix)) return;

      // ✂️ Parse command
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift()?.toLowerCase();

      if (!commandName) return;

      const command = client.commands.get(commandName);

      if (!command) return;

      logger.info(`Prefix command executed: ${commandName}`, {
        user: message.author.tag,
        guildId: message.guild.id
      });

      // ✅ SUPPORT BOTH TYPES
      if (typeof command.executePrefix === 'function') {
        await command.executePrefix(message, args, client);
      } else if (typeof command.execute === 'function') {
        await command.execute(message, args, client);
      } else {
        logger.warn(`Command ${commandName} has no valid execute function`);
      }

    } catch (error) {
      logger.error('Error in messageCreate:', {
        error: error.message,
        stack: error.stack
      });

      try {
        await message.reply('❌ Error executing command.');
      } catch {}
    }
  }
};
