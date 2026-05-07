import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

export const giveaways = new Map();

export const BONUS_ROLES = {
  "1483138492048474215": 2,
  "1483138651767701565": 5,
  "1483138868071895190": 10,
  "1483139151426752753": 20,
  "1483139317495894056": 50
};

function parseDuration(input) {
  const time = parseInt(input);

  if (input.endsWith("s")) return time * 1000;
  if (input.endsWith("m")) return time * 60 * 1000;
  if (input.endsWith("h")) return time * 60 * 60 * 1000;
  if (input.endsWith("d")) return time * 24 * 60 * 60 * 1000;

  return null;
}

function endGiveaway(id, client) {
  const data = giveaways.get(id);
  if (!data) return;

  const channel = client.channels.cache.get(data.channelId);
  if (!channel) return;

  const pool = [];

  for (const [userId, count] of data.entries) {
    for (let i = 0; i < count; i++) {
      pool.push(userId);
    }
  }

  if (!pool.length) {
    channel.send("❌ No participants.");
    giveaways.delete(id);
    return;
  }

  const winners = [];
  const used = new Set();

  while (
    winners.length < data.winners &&
    used.size < pool.length
  ) {
    const pick =
      pool[Math.floor(Math.random() * pool.length)];

    if (!used.has(pick)) {
      used.add(pick);
      winners.push(`<@${pick}>`);
    }
  }

  channel.send(
    `🎉 Winners: ${winners.join(", ")}`
  );

  giveaways.delete(id);
}

export default {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Manage giveaways")

    /* CREATE */

    .addSubcommand(sub =>
      sub
        .setName("create")
        .setDescription("Create giveaway")

        .addIntegerOption(o =>
          o
            .setName("winners")
            .setDescription("Number of winners")
            .setRequired(true)
        )

        .addStringOption(o =>
          o
            .setName("prize")
            .setDescription("Giveaway prize")
            .setRequired(true)
        )

        .addStringOption(o =>
          o
            .setName("duration")
            .setDescription("10s / 5m / 1h / 1d")
            .setRequired(true)
        )

        .addUserOption(o =>
          o
            .setName("host")
            .setDescription("Optional host")
            .setRequired(false)
        )
    )

    /* END */

    .addSubcommand(sub =>
      sub
        .setName("end")
        .setDescription("End giveaway")

        .addStringOption(o =>
          o
            .setName("messageid")
            .setDescription("Giveaway message ID")
            .setRequired(true)
        )
    )

    /* REROLL */

    .addSubcommand(sub =>
      sub
        .setName("reroll")
        .setDescription("Reroll giveaway")

        .addStringOption(o =>
          o
            .setName("messageid")
            .setDescription("Giveaway message ID")
            .setRequired(true)
        )
    )

    /* DELETE */

    .addSubcommand(sub =>
      sub
        .setName("delete")
        .setDescription("Delete giveaway")

        .addStringOption(o =>
          o
            .setName("messageid")
            .setDescription("Giveaway message ID")
            .setRequired(true)
        )
    )

    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {

    const sub = interaction.options.getSubcommand();

    /* ================= CREATE ================= */

    if (sub === "create") {

      const winners =
        interaction.options.getInteger("winners");

      const prize =
        interaction.options.getString("prize");

      const duration =
        interaction.options.getString("duration");

      const host =
        interaction.options.getUser("host") ||
        interaction.user;

      const ms = parseDuration(duration);

      if (!ms) {
        return interaction.reply({
          content: "❌ Invalid duration",
          ephemeral: true
        });
      }

      const endTime = Date.now() + ms;

      const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(`🎉 ${prize}`)
        .setDescription(
          `Click 🎉 to join!\n\n` +
          `👑 Host: <@${host.id}>\n` +
          `👥 Winners: ${winners}\n` +
          `⏰ Ends: <t:${Math.floor(endTime / 1000)}:R>\n\n` +
          `🎁 Extra Entries:\n` +
          `<@&1483138492048474215>: +2\n` +
          `<@&1483138651767701565>: +5\n` +
          `<@&1483138868071895190>: +10\n` +
          `<@&1483139151426752753>: +20\n` +
          `<@&1483139317495894056>: +50`
        );

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("gw_join")
            .setLabel("🎉 Join")
            .setStyle(ButtonStyle.Primary)
        );

      const msg = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true
      });

      giveaways.set(msg.id, {
        prize,
        hostId: host.id,
        winners,
        entries: new Map(),
        channelId: interaction.channel.id
      });

      setTimeout(() => {
        endGiveaway(msg.id, interaction.client);
      }, ms);

      return;
    }

    /* ================= END ================= */

    if (sub === "end") {

      const id =
        interaction.options.getString("messageid");

      if (!giveaways.has(id)) {
        return interaction.reply({
          content: "❌ Giveaway not found",
          ephemeral: true
        });
      }

      endGiveaway(id, interaction.client);

      return interaction.reply({
        content: "🛑 Giveaway ended",
        ephemeral: true
      });
    }

    /* ================= REROLL ================= */

    if (sub === "reroll") {

      return interaction.reply({
        content: "🔁 Reroll system coming soon",
        ephemeral: true
      });
    }

    /* ================= DELETE ================= */

    if (sub === "delete") {

      const id =
        interaction.options.getString("messageid");

      giveaways.delete(id);

      return interaction.reply({
        content: "🗑 Giveaway deleted",
        ephemeral: true
      });
    }
  }
};
