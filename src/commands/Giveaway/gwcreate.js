import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";

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

export default {
  data: new SlashCommandBuilder()
    .setName("gwcreate")
    .setDescription("Create a giveaway")
    .addIntegerOption(o => o.setName("winners").setRequired(true))
    .addStringOption(o => o.setName("prize").setRequired(true))
    .addStringOption(o => o.setName("duration").setRequired(true))
    .addUserOption(o => o.setName("host").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const winners = interaction.options.getInteger("winners");
    const prize = interaction.options.getString("prize");
    const duration = interaction.options.getString("duration");
    const host = interaction.options.getUser("host") || interaction.user;

    const ms = parseDuration(duration);
    if (!ms) return interaction.reply({ content: "Invalid duration", ephemeral: true });

    const endTime = Date.now() + ms;

    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle(`🎉 ${prize}`)
      .setDescription(
        `Click 🎉 to join!\n\n` +
        `👑 Host: ${host}\n` +
        `👥 Winners: ${winners}\n` +
        `⏰ Ends: <t:${Math.floor(endTime / 1000)}:R>\n\n` +
        `🎁 Extra Entries:\n` +
        `<@&1483138492048474215>: +2\n` +
        `<@&1483138651767701565>: +5\n` +
        `<@&1483138868071895190>: +10\n` +
        `<@&1483139151426752753>: +20\n` +
        `<@&1483139317495894056>: +50`
      )
      .setFooter({ text: "Good luck!" });

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

    giveaways.set(msg.id, {
      prize,
      hostId: host.id,
      winners,
      entries: new Map(),
      channelId: interaction.channel.id,
      messageId: msg.id
    });

    setTimeout(() => endGiveaway(msg.id, interaction.client), ms);
  }
};

function endGiveaway(id, client) {
  const data = giveaways.get(id);
  if (!data) return;

  const channel = client.channels.cache.get(data.channelId);
  if (!channel) return;

  const pool = [];

  for (const [userId, count] of data.entries) {
    for (let i = 0; i < count; i++) pool.push(userId);
  }

  if (!pool.length) {
    channel.send("No participants.");
    giveaways.delete(id);
    return;
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

  channel.send(`🎉 Winners: ${winners.join(", ")}`);
  giveaways.delete(id);
}

export { endGiveaway };
