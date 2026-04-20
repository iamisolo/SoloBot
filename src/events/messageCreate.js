import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.MessageCreate,

  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      const prefix = 's!';

      if (!message.content.startsWith(prefix)) return;

      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      const command = client.commands.get(commandName);

      if (!command) return;

      if (command.executePrefix) {
        await command.executePrefix(message, args, client);
      }

    } catch (error) {
      logger.error('Error in messageCreate:', error);
    }
  }
};
