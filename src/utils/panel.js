import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Send ticket panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle("🎟️ Support Tickets")
.setDescription("Welcome to the support system.\n\nClick the button below to open a ticket and our staff team will assist you as soon as possible.\n\n⚡ Please avoid spam and open tickets only for real issues.")

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_create")
        .setLabel("🎫 Create Ticket")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      content: "✅ Panel sent",
      flags: 64
    });

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });
  }
};
