export default {
  name: 'messageCreate',

  async execute(message, client) {
    console.log("MESSAGE EVENT TRIGGERED:", message.content);

    if (message.author.bot || !message.guild) return;

    const prefix = 's!';

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    console.log("COMMAND:", commandName);

    const command = client.commands.get(commandName);

    if (!command) {
      console.log("Command not found");
      return;
    }

    if (command.executePrefix) {
      command.executePrefix(message, args, client);
    }
  }
};
