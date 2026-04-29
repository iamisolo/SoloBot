import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Send role panel"),

  async execute(interaction) {

    const menu = new StringSelectMenuBuilder()
      .setCustomId("reaction_roles") // MUST MATCH
      .setPlaceholder("Select your roles")
      .setMinValues(0)
      .setMaxValues(5)
      .addOptions([
        {
          label: "Announcements Notifications",
          value: "1482654420196921394"
        },
        {
          label: "Giveaway Notifications",
          value: "1482654194161680477"
        },
        {
          label: "Roblox Player",
          value: "1482654276437413940"
        },
        {
          label: "Minecraft Player",
          value: "1482654341629214831"
        }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: "🎭 Select your roles below:\nSelect = add | Unselect = remove",
      components: [row]
    });
  }
};
