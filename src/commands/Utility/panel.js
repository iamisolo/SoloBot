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
      .setTitle("🎫 Support & Assistance Center")
.setDescription(
  "Welcome to the official support system.\n\n" +
  "📩 To get assistance from our support team, click the button below to create a private ticket.\n\n" +
  "━━━━━━━━━━━━━━━━━━\n" +
  "📌 Guidelines:\n" +
  "• Provide clear and detailed information\n" +
  "• Do not spam or create unnecessary tickets\n" +
  "• Be patient while waiting for a response\n\n" +
  "⚡ Our support team is available to help you as quickly as possible.\n" +
  "⏱️ Average response time: within a few minutes to a few hours\n" +
  "━━━━━━━━━━━━━━━━━━\n" +
  "💎 Thank you for being part of our community!"
)
.setColor("#00FF99")
.setFooter({ text: "Official Support System • We are here to help you" })
.setTimestamp()
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
