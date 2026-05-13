import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} from "discord.js";

export default {
  name: "ticketpanel", // command = s!ticketpanel

  async executePrefix(message) {
    const embed = new EmbedBuilder()
      .setTitle("🎫 Support Center")
      .setDescription(
        "**Welcome to our official support system!**\n\n" +
        "📩 Need help? Select a category below to create a ticket.\n\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "📌 **Guidelines**\n" +
        "• Provide clear and detailed information\n" +
        "• Do not spam or create unnecessary tickets\n" +
        "• Be patient while waiting for a response\n\n" +
        "⚡ **Support Info**\n" +
        "• Fast and friendly assistance\n" +
        "• Average response time: a few minutes to a few hours\n" +
        "━━━━━━━━━━━━━━━━━━\n\n" +
        "🔒 Tickets are private — only you and staff can view them.\n\n" +
        "💎 Thank you for being part of our community!"
      )
      .setColor(0x5865F2)
      .setFooter({ text: "Solo Bot • Support System" });

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("🎫 Select a ticket category")
        .addOptions([
          {
            label: "Support",
            value: "support",
            description: "Get general help",
            emoji: "🛠️"
          },
          {
            label: "Report",
            value: "report",
            description: "Report a user or issue",
            emoji: "🚨"
          },
          {
            label: "Claim",
            value: "claim",
            description: "Claim rewards or items",
            emoji: "📦"
          }
        ])
    );

    await message.channel.send({
      embeds: [embed],
      components: [menu]
    });
  }
};
