console.log("MESSAGE EVENT WORKING");

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      // PREFIX COMMAND SYSTEM
      const prefix = 's!';

      if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);

        if (command?.executePrefix) {
          await command.executePrefix(message, args, client);
          return;
        }
      }

      // LEVELING SYSTEM
      if (typeof handleLeveling === 'function') {
        await handleLeveling(message, client);
      }

    } catch (error) {
      console.error('Error in messageCreate event:', error);
    }
  }
};
