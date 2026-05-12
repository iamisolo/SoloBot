import {
  Events,
  ChannelType,
  PermissionsBitField,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { giveaways, BONUS_ROLES } from "../commands/Giveaway/giveaway.js";

/* ================= CONFIG ================= */

const CATEGORY_ID = "1496885067149213908";

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

/* ================= GIVEAWAY BUTTON UI ================= */

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
        `🎉 **Congratulations!** 🎉\n\n` +
        `${winners.map(x => `<@${x}>`).join(", ")} won **${data.prize}**\n\n` +
        `👑 Hosted by: <@${data.hostId}>`
    }]
  });

  giveaways.delete(id);
}

/* ================= MAIN ================= */

export default (client) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      const { guild, user, member } = interaction;

      /* ===== SLASH COMMANDS ===== */

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction, client);
        return;
      }

      /* ===== BUTTONS ===== */

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
            c => c.name === `ticket-${user.id}`
          );

          if (existing) {
            return interaction.editReply({
              content: `❌ You already have a ticket: ${existing}`
            });
          }

          const channel = await guild.channels.create({
            name: `ticket-${user.id}`,
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
              {
                id: VERIFIED_ROLE_ID,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages
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
              content: "❌ Only staff can claim tickets",
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
          await interaction.reply({
            content: "❌ Closing ticket...",
            flags: MessageFlags.Ephemeral
          });

          setTimeout(() => {
            interaction.channel.delete().catch(() => {});
          }, 3000);

          return;
        }

        /* ================= GIVEAWAY JOIN ================= */

        if (customId === "gw_join") {
          if (!data) {
            return interaction.reply({
              content: "❌ Giveaway not found",
              flags: MessageFlags.Ephemeral
            });
          }

          if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.reply({
              content: "❌ Only verified users can join",
              flags: MessageFlags.Ephemeral
            });
          }

          if (user.id === data.hostId) {
            return interaction.reply({
              content: "❌ Host cannot join",
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

          return;
        }

        /* ================= PARTICIPANTS ================= */

        if (customId === "gw_participants") {
          if (!data) return;

          const list = [];

          for (const [id, count] of data.entries) {
            list.push(`• <@${id}> (${count})`);
          }

          return interaction.reply({
            embeds: [{
              color: 0x2b2d31,
              title: "Participants",
              description: list.length ? list.join("\n") : "None"
            }],
            flags: MessageFlags.Ephemeral
          });
        }

        /* ================= END ================= */

        if (customId === "gw_end") {
          if (!data) return;

          const isHost = user.id === data.hostId;
          const isStaff = member.roles.cache.some(r =>
            GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
          );

          if (!isHost && !isStaff) {
            return interaction.reply({
              content: "❌ No permission",
              flags: MessageFlags.Ephemeral
            });
          }

          endGiveaway(interaction.message.id, client);

          return interaction.reply({
            content: "🛑 Giveaway ended",
            flags: MessageFlags.Ephemeral
          });
        }

        /* ================= REROLL ================= */

        if (customId === "gw_reroll") {
          if (!data) return;

          endGiveaway(interaction.message.id, client);

          return interaction.reply({
            content: "🔁 Giveaway rerolled",
            flags: MessageFlags.Ephemeral
          });
        }
      }

      /* ================= ROLE MENU ================= */

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

    } catch (err) {
      console.error("Interaction Error:", err);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Unexpected error",
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
      }
    }
  });
};
