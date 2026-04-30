import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

const giveaways = new Map();

const BONUS_ROLES = {
  "1483138492048474215": 2,
  "1483138651767701565": 5,
  "1483138868071895190": 10,
  "1483139151426752753": 20,
  "1483139317495894056": 20
};

function parseDuration(input) {
  const time = parseInt(input);
  if (input.endsWith("s")) return time * 1000;
  if (input.endsWith("m")) return time * 60 * 1000;
  if (input.endsWith("h")) return time * 60 * 60 * 1000;
  if (input.endsWith("d")) return time * 24 * 60 * 60 * 1000;
  return 0;
}

export default {
  data: new SlashCommandBuilder()
    .setName("gw")
    .setDescription("Giveaway system")
    .addSubcommand(sub =>
      sub.setName("start")
        .setDescription("Start giveaway")
        .addStringOption(o =>
          o.setName("prize")
            .setDescription("Prize")
            .setRequired(true))
        .addStringOption(o =>
          o.setName("duration")
            .setDescription("10s, 5m, 1h, 1d")
            .setRequired(true))
        .addIntegerOption(o =>
          o.setName("winners")
            .setDescription("Number of winners")
            .setRequired(true))
        .addUserOption(o =>
          o.setName("host")
            .setDescription("Host user")))
    .addSubcommand(sub =>
      sub.setName("end")
        .setDescription("End giveaway")
        .addStringOption(o =>
          o.setName("message_id")
            .setDescription("Giveaway message ID")
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName("reroll")
        .setDescription("Reroll giveaway")
        .addStringOption(o =>
          o.setName("message_id")
            .setDescription("Giveaway message ID")
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName("delete")
        .setDescription("Delete giveaway")
        .addStringOption(o =>
          o.setName("message_id")
            .setDescription("Giveaway message ID")
            .setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      const prize = interaction.options.getString("prize");
      const duration = interaction.options.getString("duration");
      const winnersCount = interaction.options.getInteger("winners");
      const hostUser = interaction.options.getUser("host") || interaction.user;

      const ms = parseDuration(duration);
      const endTime = Date.now() + ms;

      const embed = new EmbedBuilder()
        .setTitle(`🎉 ${prize}`)
        .setDescription(`Ends: <t:${Math.floor(endTime / 1000)}:R>\nHosted by: ${hostUser}`)
        .setColor("#2b2d31");

      const button = new ButtonBuilder()
        .setCustomId("gw_join")
        .setLabel("🎉 Join")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      const msg = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true
      });

      giveaways.set(msg.id, {
        prize,
        endTime,
        winnersCount,
        host: hostUser.id,
        entries: new Map()
      });

      setTimeout(async () => {
        const data = giveaways.get(msg.id);
        if (!data) return;

        let pool = [];

        for (const [userId, entry] of data.entries) {
          for (let i = 0; i < entry; i++) {
            pool.push(userId);
          }
        }

        if (pool.length === 0) {
          msg.channel.send("No participants.");
          return;
        }

        const winners = [];
        for (let i = 0; i < data.winnersCount; i++) {
          const winner = pool[Math.floor(Math.random() * pool.length)];
          winners.push(`<@${winner}>`);
        }

        msg.channel.send(`🎉 Winners: ${winners.join(", ")}`);
      }, ms);
    }

    if (sub === "end") {
      const id = interaction.options.getString("message_id");
      const data = giveaways.get(id);
      if (!data) return interaction.reply({ content: "Not found", ephemeral: true });

      data.endTime = Date.now();
      interaction.reply({ content: "Ended", ephemeral: true });
    }

    if (sub === "reroll") {
      const id = interaction.options.getString("message_id");
      const data = giveaways.get(id);
      if (!data) return interaction.reply({ content: "Not found", ephemeral: true });

      let pool = [];

      for (const [userId, entry] of data.entries) {
        for (let i = 0; i < entry; i++) {
          pool.push(userId);
        }
      }

      const winner = pool[Math.floor(Math.random() * pool.length)];
      interaction.reply(`🎉 New Winner: <@${winner}>`);
    }

    if (sub === "delete") {
      const id = interaction.options.getString("message_id");
      giveaways.delete(id);
      interaction.reply({ content: "Deleted", ephemeral: true });
    }
  },

  giveaways,
  BONUS_ROLES
};.

