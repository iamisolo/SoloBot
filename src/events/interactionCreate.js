import {
  Events,
  ChannelType,
  PermissionsBitField,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { createTranscript } from "discord-html-transcripts";
import { giveaways, BONUS_ROLES } from "../commands/Giveaway/giveaway.js";

/* ================= CONFIG ================= */

const CATEGORY_ID = "1496885067149213908";
const LOG_CHANNEL_ID = "1504152813767364741";

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

/* ================= TICKET SYSTEM ================= */

let ticketCount = 0;

function formatTicketNumber(num) {
  return num.toString().padStart(4, "0");
}

let ticketCooldown = new Map();
const COOLDOWN_TIME = 10 * 60 * 1000;

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
    for (let i = 0; i < count; i++) pool.push(userId);
  }

  if (!pool.length) {
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

  channel.send({
    embeds: [{
      color: 0x2b2d31,
      description:
        `🎉 **Winners** 🎉\n\n` +
        `${winners.map(x => `<@${x}>`).join(", ")}\n\n` +
        `🏆 Prize: **${data.prize}**\n👑 Host: <@${data.hostId}>`
    }]
  });

  giveaways.delete(id);
}

/* ================= MAIN ================= */

export default (client) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      const { guild, user, member } = interaction;

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        return await command.execute(interaction, client);
      }

      if (interaction.isButton()) {
        const { customId } = interaction;
        const data = giveaways.get(interaction.message.id);

        /* ================= CREATE TICKET ================= */

        if (customId === "create_ticket") {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.editReply({
              content: "❌ You must be verified to open a ticket"
            });
          }

          const existing = guild.channels.cache.find(
            c => c.parentId === CATEGORY_ID && c.topic === user.id
          );

          if (existing) {
            return interaction.editReply({
              content: `❌ You already have an open ticket: ${existing}`
            });
          }

          const lastClosed = ticketCooldown.get(user.id);

          if (lastClosed && Date.now() - lastClosed < COOLDOWN_TIME) {
            const timeLeft = Math.ceil(
              (COOLDOWN_TIME - (Date.now() - lastClosed)) / 60000
            );

            return interaction.editReply({
              content: `⏳ Wait ${timeLeft} minute(s) before opening a new ticket`
            });
          }

          ticketCount++;
          const ticketNumber = formatTicketNumber(ticketCount);

          const channel = await guild.channels.create({
            name: `ticket-${ticketNumber}`,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
              },
              {
                id: user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory
                ]
              },
              ...STAFF_ROLE_IDS.map(id => ({
                id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory
                ]
              }))
            ]
          });

          await channel.setTopic(user.id);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("claim_ticket")
              .setLabel("Claim")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("close_ticket")
              .setLabel("Close")
              .setStyle(ButtonStyle.Danger)
          );

          await channel.send({
            content: `🎫 Ticket opened by ${user}`,
            components: [row]
          });

          return interaction.editReply({
            content: `✅ Ticket created: ${channel}`
          });
        }

        /* ================= CLAIM ================= */

        if (customId === "claim_ticket") {
          const isStaff = member.roles.cache.some(r =>
            STAFF_ROLE_IDS.includes(r.id)
          );

          if (!isStaff) {
            return interaction.reply({
              content: "❌ Only staff",
              flags: MessageFlags.Ephemeral
            });
          }

          return interaction.update({
            content: `👨‍💼 Claimed by ${user}`,
            components: interaction.message.components
          });
        }

        /* ================= CLOSE ================= */

        if (customId === "close_ticket") {
          const channel = interaction.channel;

          await interaction.reply({
            content: "🔒 Closing & saving transcript...",
            flags: MessageFlags.Ephemeral
          });

          const transcript = await createTranscript(channel, {
            limit: -1,
            returnType: "attachment",
            filename: `transcript-${channel.name}.html`
          });

          const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);

          if (logChannel) {
            await logChannel.send({
              content: `📄 Transcript: ${channel.name}`,
              files: [transcript]
            });
          }

          const ownerId = channel.topic;

          // ✅ SAVE COOLDOWN
          ticketCooldown.set(ownerId, Date.now());

          await channel.permissionOverwrites.edit(ownerId, {
            ViewChannel: false
          });

          await channel.permissionOverwrites.edit(guild.id, {
            SendMessages: false
          });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("delete_ticket")
              .setLabel("Delete Ticket")
              .setStyle(ButtonStyle.Danger)
          );

          await channel.send({
            content: "🔒 Ticket closed. Staff only.",
            components: [row]
          });
        }

        /* ================= DELETE ================= */

        if (customId === "delete_ticket") {
          const isStaff = member.roles.cache.some(r =>
            STAFF_ROLE_IDS.includes(r.id)
          );

          if (!isStaff) {
            return interaction.reply({
              content: "❌ Only staff",
              flags: MessageFlags.Ephemeral
            });
          }

          await interaction.reply({
            content: "🗑 Deleting...",
            flags: MessageFlags.Ephemeral
          });

          setTimeout(() => {
            interaction.channel.delete().catch(() => {});
          }, 2000);
        }

        /* ================= GIVEAWAY ================= */

        if (customId === "gw_join") {
          if (!data) return;

          if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.reply({
              content: "❌ You need to be verified yo join the giveawy",
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
          for (const val of data.entries.values()) count += val;

          const isPrivileged =
            user.id === data.hostId ||
            member.roles.cache.some(r =>
              GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
            );

          await interaction.message.edit({
            components: [getRow(count, isPrivileged)]
          });
        }

        if (customId === "gw_end" || customId === "gw_reroll") {
          if (!data) return;

          endGiveaway(interaction.message.id, client);

          return interaction.reply({
            content: customId === "gw_end" ? "🛑 Ended" : "🔁 Rerolled",
            flags: MessageFlags.Ephemeral
          });
        }
      }

    } catch (err) {
      console.error(err);
    }
  });
};
