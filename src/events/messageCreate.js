import { Events } from "discord.js";

export default {
  name: Events.MessageCreate,

  async execute(message, client) {
    // Ignore bots & DMs
    if (message.author.bot || !message.guild) return;

    const prefix = "s!";

    // Check prefix
    if (!message.content.startsWith(prefix)) return;

    // Get args
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
      await command.execute(message, args, client);
    } catch (error) {
      console.error(error);
      message.reply("❌ Error running command");
    }
  }
};
