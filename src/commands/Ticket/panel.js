import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

export default {
  name: 'ticketpanel',

  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Send the ticket panel'),

  // ✅ SLASH COMMAND
  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle('🎟️ Support Tickets')
      .setDescription('Click the button below to create a ticket.')
      .setColor('Green');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  },

  // ✅ PREFIX COMMAND
  async executePrefix(message) {

    const embed = new EmbedBuilder()
      .setTitle('🎟️ Support Tickets')
      .setDescription('Click the button below to create a ticket.')
      .setColor('Green');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({
      embeds: [embed],
      components: [row]
    });
  }
};
