export default {
  name: 'ping',

  async execute(interaction) {
    await interaction.reply('Pong (slash)');
  },

  async executePrefix(message) {
    await message.reply('Pong (prefix)');
  }
};
