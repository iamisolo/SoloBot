import {
  ActionRowBuilder,
  StringSelectMenuBuilder
} from "discord.js";

export default {
  name: "ticketpanel",

  async executePrefix(message) {
    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("Select ticket type")
        .addOptions([
          { label: "Support", value: "support" },
          { label: "Report", value: "report" },
          { label: "Claim", value: "claim" }
        ])
    );

    await message.channel.send({
      content: "Ticket Panel - Select a category",
      components: [menu]
    });
  }
};
