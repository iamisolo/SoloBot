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

export default {
  data: new SlashCommandBuilder()
    .setName("gwcreate")
    .setDescription("Giveaway system")
    .addSubcommand(sub =>
      sub
        .setName("start")
        .setDescription("Start giveaway")
        .addStringOption(opt => opt.setName("prize").setRequired(true))
        .addStringOption(opt => opt.setName("duration").setRequired(true))
        .addIntegerOption(opt => opt.setName("winners").setRequired(true))
        .addUserOption(opt => opt.setName("host"))
    ),

  async execute(interaction) {

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
      host: hostUser.id
    });

    await interaction.reply({ content: "Started", ephemeral: true });

    setTimeout(async () => {

      const data = giveaways.get(msg.id);
      if (!data) return;

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

      const winners = [...new Set(pool.sort(() => 0.5 - Math.random()).slice(0, data.winnerCount))];

      const result = new EmbedBuilder()
        .setTitle("Ended")
        .setDescription(
          winners.length
            ? `Winners: ${winners.map(x => `<@${x}>`).join(", ")}\nHost: <@${data.host}>`
            : "No winners"
        );

      await msg.edit({ embeds: [result], components: [] });

      giveaways.delete(msg.id);

    }, durationMs);
  }
};
