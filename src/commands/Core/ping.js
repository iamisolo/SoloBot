import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { createEmbed } from "../../utils/embeds.js";
import { logger } from "../../utils/logger.js";
import { InteractionHelper } from "../../utils/interactionHelper.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Checks the bot latency and API speed"),

  name: "ping",

  // ✅ SLASH COMMAND
  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) return;

    try {
      await InteractionHelper.safeEditReply(interaction, {
        content: "Pinging...",
      });

      const latency = Date.now() - interaction.createdTimestamp;
      const apiLatency = Math.round(interaction.client.ws.ping);

      const embed = createEmbed({
        title: "🏓 Pong!",
        description: null
      }).addFields(
        { name: "Bot Latency", value: `${latency}ms`, inline: true },
        { name: "API Latency", value: `${apiLatency}ms`, inline: true }
      );

      await InteractionHelper.safeEditReply(interaction, {
        content: null,
        embeds: [embed],
      });

    } catch (error) {
      logger.error("Ping slash error:", error);

      await InteractionHelper.safeReply(interaction, {
        content: "❌ Error",
        flags: MessageFlags.Ephemeral
      });
    }
  },

  // ✅ PREFIX COMMAND
  async executePrefix(message) {
    try {
      const sent = await message.reply("🏓 Pinging...");
      const latency = sent.createdTimestamp - message.createdTimestamp;

      await sent.edit(`🏓 Pong!\nBot: ${latency}ms`);
    } catch (error) {
      console.error("Ping prefix error:", error);
      message.reply("❌ Error");
    }
  }
};
