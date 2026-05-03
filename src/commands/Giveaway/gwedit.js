import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { giveaways } from "./gwcreate.js";

export default {
  data: new SlashCommandBuilder()
    .setName("gwedit")
    .setDescription("Edit giveaway")
    .addStringOption(o => o.setName("message_id").setRequired(true))
    .addStringOption(o => o.setName("prize"))
    .addIntegerOption(o => o.setName("winners"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const id = interaction.options.getString("message_id");
    const prize = interaction.options.getString("prize");
    const winners = interaction.options.getInteger("winners");

    const data = giveaways.get(id);
    if (!data) return interaction.reply({ content: "Not found", ephemeral: true });

    if (prize) data.prize = prize;
    if (winners) data.winners = winners;

    return interaction.reply({ content: "Updated", ephemeral: true });
  }
};
