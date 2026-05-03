  import {
  Events,
  ChannelType,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import gwCommand from "../commands/Giveaway/gwcreate.js";

const { giveaways, BONUS_ROLES } = gwCommand;

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
      .setLabel("🎉")
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

function endGiveaway(id) {
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

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    try {

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction, client);
      }

      else if (interaction.isButton()) {

        const { guild, user, member } = interaction;
        const data = giveaways.get(interaction.message.id);

        if (interaction.customId === "gw_join") {

          if (!data) return;

          const isHost = user.id === data.hostId;
          const isStaff = member.roles.cache.some(r =>
            GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
          );

          if (isHost) {
            return interaction.reply({
              content: "❌ Host cannot join the giveaway",
              flags: MessageFlags.Ephemeral
            });
          }

          if (!member.roles.cache.has(VERIFIED_ROLE_ID) && !isStaff) {
            return interaction.reply({
              content: "❌ You must be verified to join this giveaway",
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

          const count = data.entries.size;

          const isPrivileged = isHost || isStaff;

          const row = getRow(count, isPrivileged);

          await interaction.update({ components: [row] });
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
              content: "❌ Only host or giveaway staff can end this giveaway",
              flags: MessageFlags.Ephemeral
            });
          }

          endGiveaway(interaction.message.id);

          await interaction.reply({
            content: "🛑 Giveaway Ended!",
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        if (interaction.customId === "gw_reroll") {

          if (!data) return;

          const isHost = user.id === data.hostId;
          const isStaff = member.roles.cache.some(r =>
            GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
          );

          if (!isHost && !isStaff) {
            return interaction.reply({
              content: "❌ Only host or giveaway staff can reroll",
              flags: MessageFlags.Ephemeral
            });
          }

          endGiveaway(interaction.message.id);

          await interaction.reply({
            content: "🔁 Giveaway Rerolled!",
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        if (interaction.customId === "ticket_create") {

          await interaction.deferReply({ ephemeral: true });

          if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.editReply({
              content: "❌ You must be verified to create a ticket"
            });
          }

          const existing = guild.channels.cache.find(
            c => c.name === `ticket-${user.username}`
          );

import {
  Events,
  ChannelType,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import gwCommand from "../commands/Giveaway/gwcreate.js";

const { giveaways, BONUS_ROLES } = gwCommand;

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
      .setLabel("🎉")
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

function endGiveaway(id) {
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

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    try {

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction, client);
      }

      else if (interaction.isButton()) {

        const { guild, user, member } = interaction;
        const data = giveaways.get(interaction.message.id);

        if (interaction.customId === "gw_join") {

          if (!data) return;

          const isHost = user.id === data.hostId;
          const isStaff = member.roles.cache.some(r =>
            GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
          );

          if (isHost) {
            return interaction.reply({
              content: "❌ Host cannot join the giveaway",
              flags: MessageFlags.Ephemeral
            });
          }

          if (!member.roles.cache.has(VERIFIED_ROLE_ID) && !isStaff) {
            return interaction.reply({
              content: "❌ You must be verified to join this giveaway",
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

          const count = data.entries.size;

          const isPrivileged = isHost || isStaff;

          const row = getRow(count, isPrivileged);

          await interaction.update({ components: [row] });
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
              content: "❌ Only host or giveaway staff can end this giveaway",
              flags: MessageFlags.Ephemeral
            });
          }

          endGiveaway(interaction.message.id);

          await interaction.reply({
            content: "🛑 Giveaway Ended!",
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        if (interaction.customId === "gw_reroll") {

          if (!data) return;

          const isHost = user.id === data.hostId;
          const isStaff = member.roles.cache.some(r =>
            GIVEAWAY_STAFF_ROLE_IDS.includes(r.id)
          );

          if (!isHost && !isStaff) {
            return interaction.reply({
              content: "❌ Only host or giveaway staff can reroll",
              flags: MessageFlags.Ephemeral
            });
          }

          endGiveaway(interaction.message.id);

          await interaction.reply({
            content: "🔁 Giveaway Rerolled!",
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        if (interaction.customId === "ticket_create") {

          await interaction.deferReply({ ephemeral: true });

          if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.editReply({
              content: "❌ You must be verified to create a ticket"
            });
          }

          const existing = guild.channels.cache.find(
            c => c.name === `ticket-${user.username}`
          );

          if (existing) {
            return interaction.editReply({
              content: "❌ You already have a ticket."
            });
          }

          let category = guild.channels.cache.find(
            c => c.name === "Tickets" && c.type === ChannelType.GuildCategory
          );

          if (!category) {
            category = await guild.channels.create({
              name: "Tickets",
              type: ChannelType.GuildCategory
            });
          }

          const channel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
              { id: guild.id, deny: ["ViewChannel"] },
              {
                id: user.id,
                allow: ["ViewChannel"],
                deny: ["SendMessages"]
              },
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
              .setLabel("Close Ticket")
              .setStyle(ButtonStyle.Danger)
          );

          await channel.send({
            content: `🎫 Welcome ${user}!`,
            components: [row]
          });

          await interaction.editReply({
            content: `✅ Ticket created: ${channel}`
          });

          return;
        }

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

      else if (interaction.isStringSelectMenu()) {

        const { member } = interaction;

        if (interaction.customId === "reaction_roles") {

          const selectedRoles = interaction.values;
          const allRoles = interaction.component.options.map(opt => opt.value);

          for (const roleId of allRoles) {
            if (!selectedRoles.includes(roleId)) {
              await member.roles.remove(roleId).catch(() => {});
            }
          }

          for (const roleId of selectedRoles) {
            await member.roles.add(roleId).catch(() => {});
          }

          if (selectedRoles.length > 0) {
            await member.roles.add(SELF_ROLE_ID).catch(() => {});
          } else {
            await member.roles.remove(SELF_ROLE_ID).catch(() => {});
          }

          await interaction.reply({
            content: "✅ Roles updated!",
            flags: MessageFlags.Ephemeral
          });

          return;
        }
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
