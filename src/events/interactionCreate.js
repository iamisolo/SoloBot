
import {
  Events,
  ChannelType,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

const STAFF_ROLE_IDS = [
  "1483819172403347548",
  "1483818875958067210",
  "1469921454865911879"
];

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    try {

      // ================= SLASH COMMANDS =================
      if (interaction.isChatInputCommand()) {

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
          await command.execute(interaction, client);
        } catch (err) {
          console.error(err);
          await interaction.reply({
            content: "❌ Error executing command",
            flags: MessageFlags.Ephemeral
          });
        }
      }

      // ================= BUTTONS =================
      else if (interaction.isButton()) {

        const { guild, user } = interaction;

        // 🎟️ CREATE TICKET
        if (interaction.customId === "ticket_create") {

          await interaction.deferReply({ ephemeral: true });

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
              { id: user.id, allow: ["ViewChannel", "SendMessages"] },
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
            content: `🎫 Welcome ${user}! Support will be with you shortly.`,
            components: [row]
          });

          await interaction.editReply({
            content: `✅ Ticket created: ${channel}`
          });

          return;
        }

        // ❌ CLOSE TICKET
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

      // ================= SELECT MENU =================
      else if (interaction.isStringSelectMenu()) {

        if (interaction.customId === "ticket_select") {

          const { guild, user } = interaction;
          const choice = interaction.values[0];

          const existing = guild.channels.cache.find(
            c => c.name === `${choice}-${user.username}`
          );

          if (existing) {
            return interaction.reply({
              content: "❌ You already opened a ticket.",
              flags: MessageFlags.Ephemeral
            });
          }

          let categoryName = "Tickets";
          if (choice === "support") categoryName = "Support Tickets";
          if (choice === "report") categoryName = "Report Tickets";
          if (choice === "claim") categoryName = "Claim Tickets";

          let category = guild.channels.cache.find(
            c => c.name === categoryName && c.type === ChannelType.GuildCategory
          );

          if (!category) {
            category = await guild.channels.create({
              name: categoryName,
              type: ChannelType.GuildCategory
            });
          }

          const channel = await guild.channels.create({
            name: `${choice}-${user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
              { id: guild.id, deny: ["ViewChannel"] },
              { id: user.id, allow: ["ViewChannel", "SendMessages"] },
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
            content: `🎫 ${user} ticket created`,
            components: [row]
          });

          await interaction.reply({
            content: `✅ Ticket created: ${channel}`,
            flags: MessageFlags.Ephemeral
          });

          return;
        }
      }

    } catch (error) {
      console.error("Interaction Error:", error);
    }
  }
};
