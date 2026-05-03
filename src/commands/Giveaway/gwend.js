import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { giveaways } from "./gwcreate.js";
import { endGiveaway } from "./gwcreate.js";

export default {
  data: new SlashCommandBuilder()
    .setName("gwend")
    .setDescription("End giveaway")
    .addStringOption(o => o.setName("message_id").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const id = interaction.options.getString("message_id");
    const data = giveaways.get(id);

    if (!data) return interaction.reply({ content: "Not found", ephemeral: true });

    endGiveaway(id, interaction.client);
    giveaways.delete(id);

    return interaction.reply({ content: "Ended", ephemeral: true });
  }
};
