import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { giveaways } from "./gwcreate.js";

export default {
  data: new SlashCommandBuilder()
    .setName("gwdelete")
    .setDescription("Delete giveaway")
    .addStringOption(o => o.setName("message_id").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const id = interaction.options.getString("message_id");
    const data = giveaways.get(id);

    if (!data) return interaction.reply({ content: "Not found", ephemeral: true });

    giveaways.delete(id);

    const msg = await interaction.channel.messages.fetch(id).catch(() => null);
    if (msg) await msg.delete().catch(() => {});

    return interaction.reply({ content: "Deleted", ephemeral: true });
  }
};
