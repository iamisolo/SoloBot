import {
  Events,
  ChannelType,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { giveaways, BONUS_ROLES } from "../commands/Giveaway/gwcreate.js";

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

function getRow(count, isPrivileged) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gw_join")
      .setLabel("🎉 Join")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("gw_count")
      .setLabel(`${count}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
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

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    try {
      const { guild, user, member } = interaction;

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction, client);
        return;
      }

      if (interaction.isButton()) {
        const data = giveaways.get(interaction.message.id);

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
          for (const v of data.entries.values()) {
            count += v;
          }

          const isPrivileged =
            isHost ||
            member.roles.cache.some(r =>
              GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
            );

          await interaction.update({
            components: [getRow(count, isPrivileged)]
          });

          return;
        }

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
            content: "🔁 Rerolled",
            flags: MessageFlags.Ephemeral
          });
        }

        if (interaction.customId === "ticket_create") {
          await interaction.deferReply({ ephemeral: true });

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
              { id: user.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
              {
                id: VERIFIED_ROLE_ID,
                allow: ["ViewChannel", "SendMessages"]
              },
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

        if (interaction.customId === "close_ticket") {
          await interaction.reply({
            content: "Closing...",
            flags: MessageFlags.Ephemeral
          });

          setTimeout(() => {
            interaction.channel.delete().catch(() => {});
          }, 2000);

          return;
        }
      }

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

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "❌ Error occurred",
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: "❌ Error occurred",
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
