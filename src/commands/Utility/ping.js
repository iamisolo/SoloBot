import { SlashCommandBuilder } from 'discord.js';

export default {
  name: 'ping',

  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping command'),

  async execute(interaction) {
    await interaction.reply('Pong (slash)');
  },

  async executePrefix(message) {
    await message.reply('Pong (prefix)');
  }
};
