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
      .setTitle("🎟️ Support Ticket")
      .setDescription(
        "Click the button below to create a ticket.\n\nOur staff will assist you shortly."
      )
      .setColor(0x00ff00)
      .setFooter({ text: "Solo Bot Ticket System" });

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
