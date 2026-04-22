import { Events } from "discord.js";

export default {
  name: Events.MessageCreate,

  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const prefix = "s!";

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      if (typeof command.executePrefix === "function") {
        await command.executePrefix(message, args, client);
      } else if (typeof command.execute === "function") {
        await command.execute(message, args, client);
      }
    } catch (error) {
      console.error(error);
      message.reply("❌ Error running command");
    }
  }
};
