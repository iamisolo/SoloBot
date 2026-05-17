import {
  Events,
  ChannelType,
  PermissionsBitField,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
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

const VERIFIED_ROLE_ID = "1485246026913808384";

/* ================= MEMORY ================= */

let ticketCount = 0;
const ticketCooldown = new Map();
const COOLDOWN = 10 * 60 * 1000;

/* ================= LOG SYSTEM ================= */

async function sendLog(guild, user, title, fields = []) {
  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!logChannel) return console.log("❌ Log channel not found");

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(title)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(fields)
    .setTimestamp();

  await logChannel.send({ embeds: [embed] });
}

/* ================= MAIN ================= */

export default (client) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      const { guild, user, member } = interaction;

      /* ================= COMMANDS ================= */

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          console.log("❌ Command not found:", interaction.commandName);
          return;
        }

        try {
          await command.execute(interaction, client);
        } catch (err) {
          console.error("❌ Command Error:", err);

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: "❌ Error executing command",
              flags: MessageFlags.Ephemeral
            });
          } else {
            await interaction.reply({
              content: "❌ Error executing command",
              flags: MessageFlags.Ephemeral
            });
          }
        }

        return;
      }

// ================= SELECT MENU (REACTION ROLES) =================
if (interaction.isStringSelectMenu()) {

  if (interaction.customId === "reaction_roles") {

    try {
      await interaction.deferUpdate();

      const selectedRoles = interaction.values;

      for (const roleId of selectedRoles) {
        const role = guild.roles.cache.get(roleId);
        if (!role) continue;

        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
        } else {
          await member.roles.add(roleId);
        }
      }

      await interaction.followUp({
        content: "✅ Your roles have been updated!",
        flags: MessageFlags.Ephemeral
      });

    } catch (err) {
      console.error("❌ Role Select Error:", err);

      if (!interaction.replied) {
        await interaction.followUp({
          content: "❌ Failed to update roles",
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
}

// ================= BUTTONS =================
if (!interaction.isButton()) return;

      const { customId } = interaction;
      const data = giveaways.get(interaction.message.id);

      /* ================= CREATE TICKET ================= */

      if (customId === "create_ticket") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // ✅ VERIFIED ONLY
        if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
          return interaction.editReply({
            content: "❌ You must be verified to create a ticket"
          });
        }

        const existing = guild.channels.cache.find(
          c => c.parentId === CATEGORY_ID && c.topic === user.id
        );

        if (existing) {
          return interaction.editReply({
            content: `❌ You already have a ticket: ${existing}`
          });
        }

        const last = ticketCooldown.get(user.id);
        if (last && Date.now() - last < COOLDOWN) {
          return interaction.editReply({
            content: "⏳ Wait before creating another ticket"
          });
        }

        ticketCount++;
        const name = `ticket-${ticketCount.toString().padStart(4, "0")}`;

        const channel = await guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            {
              id: user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages
              ]
            },
            ...STAFF_ROLE_IDS.map(id => ({
              id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages
              ]
            }))
          ]
        });

        await channel.setTopic(user.id);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
        );

        await channel.send({
          content: `🎫 Ticket opened by ${user}`,
          components: [row]
        });

        await sendLog(guild, user, "🎫 Ticket Created", [
          { name: "User", value: `${user}`, inline: true },
          { name: "Channel", value: `${channel}`, inline: true }
        ]);

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

        await sendLog(guild, user, "👨‍💼 Ticket Claimed", [
          { name: "Staff", value: `${user}`, inline: true },
          { name: "Channel", value: `${interaction.channel}`, inline: true }
        ]);

        return interaction.update({
          content: `👨‍💼 Claimed by ${user}`,
          components: interaction.message.components
        });
      }

      /* ================= CLOSE ================= */

      if (customId === "close_ticket") {
        const channel = interaction.channel;

        await interaction.reply({
          content: "🔒 Closing...",
          flags: MessageFlags.Ephemeral
        });

        const transcript = await createTranscript(channel, {
          returnType: "attachment",
          filename: `${channel.name}.html`
        });

        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
          await logChannel.send({
            content: `📄 Transcript: ${channel.name}`,
            files: [transcript]
          });
        }

        ticketCooldown.set(channel.topic, Date.now());

        await sendLog(guild, user, "🔒 Ticket Closed", [
          { name: "Closed By", value: `${user}`, inline: true },
          { name: "Channel", value: `${channel.name}`, inline: true }
        ]);

        await channel.permissionOverwrites.edit(channel.topic, {
          ViewChannel: false
        });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("delete_ticket").setLabel("Delete").setStyle(ButtonStyle.Danger)
        );

        await channel.send({
          content: "🔒 Ticket closed",
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

        await sendLog(guild, user, "🗑 Ticket Deleted", [
          { name: "Deleted By", value: `${user}`, inline: true },
          { name: "Channel", value: `${interaction.channel.name}`, inline: true }
        ]);

        await interaction.reply({
          content: "🗑 Deleting...",
          flags: MessageFlags.Ephemeral
        });

        setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
      }

      /* ================= GIVEAWAY ================= */

      if (customId === "gw_join") {
        if (!data) return;

        // ✅ VERIFIED ONLY
        if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
          return interaction.reply({
            content: "❌ You must be verified to join giveaway",
            flags: MessageFlags.Ephemeral
          });
        }

        await interaction.deferUpdate();

        if (data.entries.has(user.id)) {
          data.entries.delete(user.id);
        } else {
          let entries = 1;

          for (const role in BONUS_ROLES) {
            if (member.roles.cache.has(role)) {
              entries += BONUS_ROLES[role];
            }
          }

          data.entries.set(user.id, entries);
        }
      }

    } catch (err) {
      console.error("❌ INTERACTION ERROR:", err);
    }
  });
};
