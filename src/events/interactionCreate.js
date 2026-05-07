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

/* ================= END GIVEAWAY ================= */

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
    embeds: [{
      color: 0x2b2d31,
      description:
        `🎉 **Congratulations!** 🎉\n\n` +
        `${winnerMentions} won **${data.prize}**\n\n` +
        `👑 Hosted by: <@${data.hostId}>`
    }]
  });

  giveaways.delete(id);
}

/* ================= MAIN ================= */

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    try {
      const { guild, user, member } = interaction;

      /* ================= SLASH COMMANDS ================= */

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
          await command.execute(interaction, client);
        } catch (error) {
          console.error(error);

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: "❌ Error executing command",
              flags: MessageFlags.Ephemeral
            }).catch(() => {});
          } else {
            await interaction.reply({
              content: "❌ Error executing command",
              flags: MessageFlags.Ephemeral
            }).catch(() => {});
          }
        }

        return;
      }

      /* ================= BUTTONS ================= */

      if (interaction.isButton()) {
        const data = giveaways.get(interaction.message.id);

        /* ===== JOIN ===== */

        if (interaction.customId === "gw_join") {
          if (!data) {
            return interaction.reply({
              content: "❌ Giveaway not found",
              flags: MessageFlags.Ephemeral
            });
          }

          const isHost = user.id === data.hostId;
          const isStaff = member.roles.cache.some(r =>
            GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
          );

          if (isHost) {
            return interaction.reply({
              content: "❌ Host cannot join",
              flags: MessageFlags.Ephemeral
            });
          }

          if (!member.roles.cache.has(VERIFIED_ROLE_ID) && !isStaff) {
            return interaction.reply({
              content: "❌ You must be verified",
              flags: MessageFlags.Ephemeral
            });
          }

          /* SAFE LEVEL CHECK */
          let userLevel = 0;

          if (client.xp && typeof client.xp.get === "function") {
            userLevel = client.xp.get(user.id)?.level || 0;
          }

          if (data.requiredLevel && userLevel < data.requiredLevel) {
            return interaction.reply({
              content: `❌ You need level ${data.requiredLevel} to join`,
              flags: MessageFlags.Ephemeral
            });
          }

          await interaction.deferUpdate();

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
          for (const value of data.entries.values()) count += value;

          const isPrivileged =
            isHost ||
            member.roles.cache.some(r =>
              GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
            );

          await interaction.message.edit({
            components: [getRow(count, isPrivileged)]
          });

          return;
        }

        /* ===== PARTICIPANTS ===== */

        if (interaction.customId === "gw_participants") {
          if (!data) return;

          const list = [];

          for (const [userId, count] of data.entries) {
            list.push(`• <@${userId}> (${count} ${count > 1 ? "entries" : "entry"})`);
          }

          return interaction.reply({
            embeds: [{
              color: 0x2b2d31,
              title: "Giveaway Participants",
              description: list.length ? list.join("\n") : "No participants yet",
              footer: { text: `Total Participants: ${data.entries.size}` }
            }],
            flags: MessageFlags.Ephemeral
          });
        }

        /* ===== END ===== */

        if (interaction.customId === "gw_end") {
          if (!data) return;

          const isHost = user.id === data.hostId;
          const isStaff = member.roles.cache.some(r =>
            GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
          );

          if (!isHost && !isStaff) {
            return interaction.reply({
              content: "❌ Only host or staff can end",
              flags: MessageFlags.Ephemeral
            });
          }

          endGiveaway(interaction.message.id, client);

          return interaction.reply({
            content: "🛑 Giveaway Ended",
            flags: MessageFlags.Ephemeral
          });
        }

        /* ===== REROLL ===== */

        if (interaction.customId === "gw_reroll") {
          if (!data) return;

          const isHost = user.id === data.hostId;
          const isStaff = member.roles.cache.some(r =>
            GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
          );

          if (!isHost && !isStaff) {
            return interaction.reply({
              content: "❌ Only host or staff can reroll",
              flags: MessageFlags.Ephemeral
            });
          }

          endGiveaway(interaction.message.id, client);

          return interaction.reply({
            content: "🔁 Giveaway Rerolled",
            flags: MessageFlags.Ephemeral
          });
        }

        /* ===== CREATE TICKET ===== */

        if (interaction.customId === "ticket_create") {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.editReply({
              content: "❌ You must be verified"
            });
          }

          const existing = guild.channels.cache.find(
            c => c.name === `ticket-${user.id}`
          );

          if (existing) {
            return interaction.editReply({
              content: "❌ You already have a ticket"
            });
          }

          const category = guild.channels.cache.find(
            c => c.type === ChannelType.GuildCategory
          );

          const channel = await guild.channels.create({
            name: `ticket-${user.id}`,
            type: ChannelType.GuildText,
            parent: category?.id || null,
            permissionOverwrites: [
              { id: guild.id, deny: ["ViewChannel"] },
              { id: user.id, allow: ["ViewChannel", "SendMessages"] },
              { id: VERIFIED_ROLE_ID, allow: ["ViewChannel", "SendMessages"] },
              ...STAFF_ROLE_IDS.map(id => ({
                id,
                allow: ["ViewChannel", "SendMessages"]
              }))
            ]
          });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("close_ticket")
              .setLabel("Close")
              .setStyle(ButtonStyle.Danger)
          );

          await channel.send({
            content: `🎫 Ticket for ${user}`,
            components: [row]
          });

          return interaction.editReply({
            content: `✅ Ticket created: ${channel}`
          });
        }

        /* ===== CLOSE TICKET ===== */

        if (interaction.customId === "close_ticket") {
          await interaction.reply({
            content: "Closing ticket...",
            flags: MessageFlags.Ephemeral
          });

          setTimeout(() => {
            interaction.channel.delete().catch(() => {});
          }, 2000);

          return;
        }
      }

      /* ================= SELECT MENU ================= */

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId !== "reaction_roles") return;

        const selected = interaction.values;
        const all = interaction.component.options.map(o => o.value);

        for (const roleId of all) {
          if (!selected.includes(roleId)) {
            await interaction.member.roles.remove(roleId).catch(() => {});
          }
        }

        for (const roleId of selected) {
          await interaction.member.roles.add(roleId).catch(() => {});
        }

        if (selected.length > 0) {
          await interaction.member.roles.add(SELF_ROLE_ID).catch(() => {});
        } else {
          await interaction.member.roles.remove(SELF_ROLE_ID).catch(() => {});
        }

        return interaction.reply({
          content: "✅ Roles updated",
          flags: MessageFlags.Ephemeral
        });
      }

    } catch (error) {
      console.error("Interaction Error:", error);
    }
  }
};
