import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} from "discord.js";

export default {
  name: "ticketpanel",

  async executePrefix(message) {
    const embed = new EmbedBuilder()
      .setTitle("🎫 Support Center")
      .setDescription("Select a category below to open a ticket.\nStaff will assist you shortly.")
      .setColor(0x5865F2);

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("Choose ticket type")
        .addOptions([
          { label: "Support", value: "support", emoji: "🛠️" },
          { label: "Report", value: "report", emoji: "🚨" },
          { label: "Claim", value: "claim", emoji: "📦" }
        ])
    );

    await message.channel.send({
      embeds: [embed],
      components: [menu]
    });
  }
};
