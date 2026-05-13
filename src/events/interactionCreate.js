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

/* ================= GIVEAWAY UI ================= */

function getRow(count) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gw_join")
      .setLabel(`🎉 ${count}`)
      .setStyle(ButtonStyle.Primary)
  );
}

/* ================= MAIN ================= */

export default (client) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      const { guild, user, member } = interaction;
      if (!guild) return;

      if (interaction.isButton()) {
        const { customId } = interaction;

        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);

        /* ================= CREATE TICKET ================= */

        if (customId === "create_ticket") {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.editReply({
              content: "❌ You must be verified to open a ticket"
            });
          }

          await guild.channels.fetch();
          const category = guild.channels.cache.get(CATEGORY_ID);

          if (!category) {
            return interaction.editReply({
              content: "❌ Category not found. Fix CATEGORY_ID"
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
            parent: category.id,
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

          /* ===== LOG CREATE ===== */
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setColor("Green")
              .setTitle("🟢 Ticket Created")
              .addFields(
                { name: "User", value: `${user}`, inline: true },
                { name: "Channel", value: `<#${channel.id}>`, inline: true }
              )
              .setThumbnail(user.displayAvatarURL({ dynamic: true }))
              .setTimestamp();

            await logChannel.send({ embeds: [embed] });
          }

          return interaction.editReply({
            content: `✅ Ticket created: ${channel}`
          });
        }

        /* ================= CLAIM ================= */

        if (customId === "claim_ticket") {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          const isStaff = member.roles.cache.some(r =>
            STAFF_ROLE_IDS.includes(r.id)
          );

          if (!isStaff) {
            return interaction.editReply({
              content: "❌ Only staff"
            });
          }

          await interaction.message.edit({
            content: `👨‍💼 Claimed by ${user}`,
            components: interaction.message.components
          });

          /* ===== LOG CLAIM ===== */
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setColor("Blue")
              .setTitle("🔵 Ticket Claimed")
              .addFields(
                { name: "Staff", value: `${user}`, inline: true },
                { name: "Channel", value: `<#${interaction.channel.id}>`, inline: true }
              )
              .setThumbnail(user.displayAvatarURL({ dynamic: true }))
              .setTimestamp();

            await logChannel.send({ embeds: [embed] });
          }

          return interaction.editReply({
            content: "✅ Ticket claimed"
          });
        }

        /* ================= CLOSE ================= */

        if (customId === "close_ticket") {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          const channel = interaction.channel;

          const transcript = await createTranscript(channel, {
            limit: -1,
            returnType: "attachment",
            filename: `transcript-${channel.name}.html`
          });

          /* ===== LOG CLOSE ===== */
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setColor("Yellow")
              .setTitle("🟡 Ticket Closed")
              .addFields(
                { name: "Closed By", value: `${user}`, inline: true },
                { name: "Channel", value: `<#${channel.id}>`, inline: true }
              )
              .setThumbnail(user.displayAvatarURL({ dynamic: true }))
              .setFooter({ text: "Transcript attached below" })
              .setTimestamp();

            await logChannel.send({
              embeds: [embed],
              files: [transcript]
            });
          }

          const ownerId = channel.name.split("-")[1];

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

          return interaction.editReply({
            content: "✅ Ticket closed"
          });
        }

        /* ================= DELETE ================= */

        if (customId === "delete_ticket") {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          const isStaff = member.roles.cache.some(r =>
            STAFF_ROLE_IDS.includes(r.id)
          );

          if (!isStaff) {
            return interaction.editReply({
              content: "❌ Only staff"
            });
          }

          /* ===== LOG DELETE ===== */
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setColor("Red")
              .setTitle("🔴 Ticket Deleted")
              .addFields(
                { name: "Deleted By", value: `${user}`, inline: true },
                { name: "Ticket", value: `#${interaction.channel.name}`, inline: true }
              )
              .setThumbnail(user.displayAvatarURL({ dynamic: true }))
              .setTimestamp();

            await logChannel.send({ embeds: [embed] });
          }

          await interaction.editReply({
            content: "🗑 Deleting..."
          });

          setTimeout(() => {
            interaction.channel.delete().catch(() => {});
          }, 2000);
        }

        /* ================= GIVEAWAY JOIN ================= */

        if (customId === "gw_join") {
          const data = giveaways.get(interaction.message.id);
          if (!data) return;

          await interaction.deferUpdate();

          if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
            return interaction.followUp({
              content: "❌ You must be verified to join giveaways",
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
          for (const val of data.entries.values()) count += val;

          await interaction.message.edit({
            components: [getRow(count)]
          });
        }
      }

    } catch (err) {
      console.error(err);
    }
  });
};
