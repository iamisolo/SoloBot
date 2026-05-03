import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { giveaways } from "./gwcreate.js";

export default {
  data: new SlashCommandBuilder()
    .setName("gwreroll")
    .setDescription("Reroll giveaway")
    .addStringOption(o => o.setName("message_id").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const id = interaction.options.getString("message_id");
    const data = giveaways.get(id);

    if (!data) return interaction.reply({ content: "Not found", ephemeral: true });

    const pool = [];

    for (const [userId, count] of data.entries) {
      for (let i = 0; i < count; i++) pool.push(userId);
    }

    const winners = [];
    const used = new Set();

    while (winners.length < data.winners && used.size < pool.length) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (!used.has(pick)) {
        used.add(pick);
        winners.push(`<@${pick}>`);
      }
    }

    interaction.channel.send(`🔁 Reroll Winners: ${winners.join(", ")}`);

    return interaction.reply({ content: "Rerolled", ephemeral: true });
  }
};
