import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

export const giveaways = new Map();

const BONUS_ROLES = [
  { roleId: "1483138492048474215", entries: 2 },
  { roleId: "1483138651767701565", entries: 5 },
  { roleId: "1483138868071895190", entries: 10 },
  { roleId: "1483139151426752753", entries: 20 },
  { roleId: "1483139317495894056", entries: 20 }
];

function parseDuration(input) {
  const match = input.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  };

  return value * multipliers[unit];
}

function pickWinners(pool, count) {
  return [...new Set(
    pool.sort(() => 0.5 - Math.random()).slice(0, count)
  )];
}

export default {
  data: new SlashCommandBuilder()
    .setName("gw")
    .setDescription("Giveaway system")

    .addSubcommand(sub =>
      sub.setName("start")
        .setDescription("Start giveaway")
        .addStringOption(o => o.setName("prize").setRequired(true))
        .addStringOption(o => o.setName("duration").setRequired(true))
        .addIntegerOption(o => o.setName("winners").setRequired(true))
        .addUserOption(o => o.setName("host"))
    )

    .addSubcommand(sub =>
      sub.setName("end")
        .setDescription("End giveaway")
        .addStringOption(o =>
          o.setName("message_id").setRequired(true))
    )

    .addSubcommand(sub =>
      sub.setName("reroll")
        .setDescription("Reroll winners")
        .addStringOption(o =>
          o.setName("message_id").setRequired(true))
    )

    .addSubcommand(sub =>
      sub.setName("delete")
        .setDescription("Delete giveaway")
        .addStringOption(o =>
          o.setName("message_id").setRequired(true))
    ),

  async execute(interaction) {

    const sub = interaction.options.getSubcommand();

    // ================= START =================
    if (sub === "start") {

      const prize = interaction.options.getString("prize");
      const durationInput = interaction.options.getString("duration");
      const winnerCount = interaction.options.getInteger("winners");
      const hostUser = interaction.options.getUser("host") || interaction.user;

      const durationMs = parseDuration(durationInput);
      if (!durationMs) {
        return interaction.reply({ content: "Invalid duration", ephemeral: true });
      }

      const end = Math.floor((Date.now() + durationMs) / 1000);

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🎉 GIVEAWAY 🎉")
        .setDescription(`
Prize: ${prize}
Hosted by: ${hostUser}
Winners: ${winnerCount}
Ends: <t:${end}:R>

Bonus Entries:
${BONUS_ROLES.map(r => `<@&${r.roleId}> +${r.entries}`).join("\n")}
`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("giveaway_enter")
          .setLabel("Enter")
          .setStyle(ButtonStyle.Primary)
      );

      const msg = await interaction.channel.send({
        embeds: [embed],
        components: [row]
      });

      giveaways.set(msg.id, {
        users: [],
        winnerCount,
        prize,
        host: hostUser.id,
        message: msg
      });

      await interaction.reply({ content: "Started", ephemeral: true });

      setTimeout(() => endGiveaway(msg.id, interaction), durationMs);
    }

    // ================= END =================
    if (sub === "end") {
      const id = interaction.options.getString("message_id");
      await endGiveaway(id, interaction, true);
    }

    // ================= REROLL =================
    if (sub === "reroll") {

      const id = interaction.options.getString("message_id");
      const data = giveaways.get(id);
      if (!data) return interaction.reply({ content: "Not found", ephemeral: true });

      const pool = await buildPool(data, interaction);
      const winners = pickWinners(pool, data.winnerCount);

      await interaction.channel.send(
        `🔄 New winners: ${winners.map(x => `<@${x}>`).join(", ")}`
      );

      interaction.reply({ content: "Rerolled", ephemeral: true });
    }

    // ================= DELETE =================
    if (sub === "delete") {
      const id = interaction.options.getString("message_id");
      giveaways.delete(id);
      interaction.reply({ content: "Deleted", ephemeral: true });
    }

    // ===== FUNCTIONS =====

    async function buildPool(data, interaction) {
      let pool = [];

      for (const id of data.users) {
        const member = await interaction.guild.members.fetch(id).catch(() => null);
        if (!member) continue;

        let entries = 1;

        for (const bonus of BONUS_ROLES) {
          if (member.roles.cache.has(bonus.roleId)) {
            entries += bonus.entries;
          }
        }

        for (let i = 0; i < entries; i++) pool.push(id);
      }

      return pool;
    }

    async function endGiveaway(id, interaction, manual = false) {

      const data = giveaways.get(id);
      if (!data) return;

      const pool = await buildPool(data, interaction);
      const winners = pickWinners(pool, data.winnerCount);

      const result = new EmbedBuilder()
        .setTitle("🎉 Ended")
        .setDescription(
          winners.length
            ? `Winners: ${winners.map(x => `<@${x}>`).join(", ")}\nHost: <@${data.host}>`
            : "No winners"
        );

      await data.message.edit({ embeds: [result], components: [] });

      if (winners.length) {
        await interaction.channel.send(
          `🎉 Congrats ${winners.map(x => `<@${x}>`).join(", ")}`
        );
      }

      giveaways.delete(id);

      if (manual) {
        interaction.reply({ content: "Ended", ephemeral: true });
      }
    }
  }
};
