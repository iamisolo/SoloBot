import {
  Events,
  ChannelType,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { giveaways, BONUS_ROLES } from "../commands/Giveaway/giveaway.js";

const STAFF_ROLE_IDS = [
  "1483819172403347548",
  "1483818875958067210",
  "1469921454865911879",
  "1498955717799968819"
];

const GIVEAWAY_STAFF_ROLE_IDS = [
  "1469921454865911879",
  "1498955717799968819",
  "1483818875958067210",
  "1483819172403347548",
  "1480860174116720690"
];

const VERIFIED_ROLE_ID = "1485246026913808384";
const SELF_ROLE_ID = "1485120899949531198";

/* ================= GIVEAWAY UI ================= */

function getRow(count, isPrivileged) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gw_join")
      .setLabel(`🎉 ${count}`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("gw_participants")
      .setLabel("Participants")
      .setStyle(ButtonStyle.Secondary)
  );

  if (isPrivileged) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("gw_end")
        .setLabel("End")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("gw_reroll")
        .setLabel("Reroll")
        .setStyle(ButtonStyle.Success)
    );
  }

  return row;
}

function endGiveaway(id, client) {
  const data = giveaways.get(id);
  if (!data) return;

  const channel = client.channels.cache.get(data.channelId);
  if (!channel) return;

  let pool = [];

  for (const [userId, count] of data.entries) {
    for (let i = 0; i < count; i++) {
      pool.push(userId);
    }
  }

  if (pool.length === 0) {
    channel.send("❌ No participants.");
    giveaways.delete(id);
    return;
  }

  const winners = [];
  const used = new Set();

  while (winners.length < data.winners && used.size < pool.length) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!used.has(pick)) {
      used.add(pick);
      winners.push(pick);
    }
  }

  const winnerMentions = winners.map(id => `<@${id}>`).join(", ");

  channel.send({
    embeds: [
      {
        color: 0x2b2d31,
        description:
          `🎉 **Congratulations!** 🎉\n\n` +
          `${winnerMentions} won **${data.prize}**\n\n` +
          `• Hosted by: <@${data.hostId}>`
      }
    ]
  });

  giveaways.delete(id);
}

/* ================= MAIN ================= */

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    try {
      const { guild, user, member } = interaction;

      /* ================= SLASH COMMAND ================= */
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
          await interaction.deferReply(); // 🔥 FIX

          await command.execute(interaction, client);

        } catch (error) {
          console.error(error);

          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: "❌ Error executing command" });
          } else {
            await interaction.reply({
              content: "❌ Error executing command",
              flags: MessageFlags.Ephemeral
            });
          }
        }

        return;
      }

      /* ================= BUTTONS ================= */
      if (interaction.isButton()) {

        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferUpdate().catch(() => {});
        }

        const data = giveaways.get(interaction.message.id);

        if (interaction.customId === "gw_join") {
          if (!data) return;

          const isHost = user.id === data.hostId;
          const isStaff = member.roles.cache.some(r =>
            GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
          );

          if (isHost) return;

          if (!member.roles.cache.has(VERIFIED_ROLE_ID) && !isStaff) return;

          if (data.entries.has(user.id)) {
            data.entries.delete(user.id);
          } else {
            let entries = 1;

            for (const roleId in BONUS_ROLES) {
              if (member.roles.cache.has(roleId)) {
                entries += BONUS_ROLES[roleId];
              }
            }

            data.entries.set(user.id, entries);
          }

          let count = 0;
          for (const v of data.entries.values()) count += v;

          const isPrivileged =
            isHost ||
            member.roles.cache.some(r =>
              GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
            );

          await interaction.editReply({
            components: [getRow(count, isPrivileged)]
          });

          return;
        }

        if (interaction.customId === "gw_participants") {
          if (!data) return;

          const list = [];

          for (const [userId, count] of data.entries) {
            list.push(`• <@${userId}> (${count})`);
          }

          return interaction.followUp({
            content: list.join("\n") || "No participants",
            flags: MessageFlags.Ephemeral
          });
        }

        if (interaction.customId === "gw_end") {
          if (!data) return;

          endGiveaway(interaction.message.id, client);

          return interaction.followUp({
            content: "🛑 Giveaway Ended",
            flags: MessageFlags.Ephemeral
          });
        }

        if (interaction.customId === "gw_reroll") {
          if (!data) return;

          endGiveaway(interaction.message.id, client);

          return interaction.followUp({
            content: "🔁 Rerolled",
            flags: MessageFlags.Ephemeral
          });
        }

        if (interaction.customId === "ticket_create") {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.editReply({ content: "❌ You must be verified" });
          }

          const existing = guild.channels.cache.find(
            c => c.name === `ticket-${user.id}`
          );

          if (existing) {
            return interaction.editReply({ content: "❌ You already have a ticket" });
          }

          const channel = await guild.channels.create({
            name: `ticket-${user.id}`,
            type: ChannelType.GuildText
          });

          await channel.send(`🎫 Ticket for ${user}`);

          return interaction.editReply({
            content: `✅ Ticket created: ${channel}`
          });
        }

        if (interaction.customId === "close_ticket") {
          await interaction.followUp({
            content: "Closing...",
            flags: MessageFlags.Ephemeral
          });

          setTimeout(() => {
            interaction.channel.delete().catch(() => {});
          }, 2000);
        }
      }

    } catch (error) {
      console.error("Interaction Error:", error);
    }
  }
};
