import { logger } from '../utils/logger.js';

export default {
  name: 'messageCreate',

  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      // =========================
      // PREFIX SYSTEM
      // =========================
      const prefix = 's!';

      if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);

        if (command && command.executePrefix) {
          await command.executePrefix(message, args, client);
          return;
        }
      }

      // =========================
      // LEVELING SYSTEM
      // =========================
      // (only if your function exists)
      if (typeof handleLeveling === 'function') {
        await handleLeveling(message, client);
      }

    } catch (error) {
      logger.error('messageCreate error:', error);
    }
  }
};
