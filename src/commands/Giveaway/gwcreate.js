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
  "1483139317495894056": 50
};

function parseDuration(input) {
  const time = parseInt(input);
  if (input.endsWith("s")) return time * 1000;
  if (input.endsWith("m")) return time * 60000;
  if (input.endsWith("h")) return time * 3600000;
  if (input.endsWith("d")) return time * 86400000;
  return 0;
}

export default {
  data: new SlashCommandBuilder()
    .setName("gw")
    .setDescription("Ultra Giveaway")
    .addSubcommand(sub =>
      sub.setName("start")
        .addStringOption(o => o.setName("prize").setRequired(true))
        .addStringOption(o => o.setName("duration").setRequired(true))
        .addIntegerOption(o => o.setName("winners").setRequired(true))
    ),

  async execute(interaction) {

    const prize = interaction.options.getString("prize");
    const duration = interaction.options.getString("duration");
    const winnersCount = interaction.options.getInteger("winners");

    const ms = parseDuration(duration);
    const endTime = Date.now() + ms;

    const embed = new EmbedBuilder()
      .setTitle(`🎉 ${prize}`)
      .setColor("#2b2d31")
      .setDescription(`
Click 🎉 to enter!

**Winners:** ${winnersCount}
**Ends:** <t:${Math.floor(endTime/1000)}:R>
**Hosted by:** ${interaction.user}

**Requirements:**
None

**Extra Entries:**
<@&1483138492048474215>: +2
<@&1483138651767701565>: +5
<@&1483138868071895190>: +10
<@&1483139151426752753>: +20
<@&1483139317495894056>: +50
`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("gw_join").setLabel("🎉").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("gw_count").setLabel("0").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("gw_end").setLabel("End").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("gw_reroll").setLabel("Reroll").setStyle(ButtonStyle.Success)
    );

    const msg = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    giveaways.set(msg.id, {
      entries: new Map(),
      winnersCount,
      endTime,
      message: msg
    });

    // 🔄 LIVE TIMER UPDATE
    const interval = setInterval(async () => {
      const data = giveaways.get(msg.id);
      if (!data) return clearInterval(interval);

      const timeLeft = data.endTime - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        endGiveaway(msg.id);
        return;
      }

      embed.setDescription(embed.data.description.replace(
        /Ends: <t:\d+:R>/,
        `Ends: <t:${Math.floor(data.endTime/1000)}:R>`
      ));

      await msg.edit({ embeds: [embed] });

    }, 10000);
  },

  giveaways,
  BONUS_ROLES
};

// 🎯 END FUNCTION
async function endGiveaway(id) {
  const data = giveaways.get(id);
  if (!data) return;

  let pool = [];

  for (const [userId, entry] of data.entries) {
    for (let i = 0; i < entry; i++) {
      pool.push(userId);
    }
  }

  if (pool.length === 0) {
    data.message.channel.send("No participants.");
    return;
  }

  const winners = [];
  for (let i = 0; i < data.winnersCount; i++) {
    winners.push(`<@${pool[Math.floor(Math.random() * pool.length)]}>`);
  }

  data.message.channel.send(`🎉 Winners: ${winners.join(", ")}`);
  }
