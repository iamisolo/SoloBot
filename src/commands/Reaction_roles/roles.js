import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Send role panel"),

  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("reaction_roles")
      .setPlaceholder("🎭 Select your roles")
      .setMinValues(0)
      .setMaxValues(4)
      .addOptions([
        {
          label: "Announcements",
          description: "Get server updates",
          value: "1482654420196921394",
          emoji: "📢"
        },
        {
          label: "Giveaways",
          description: "Get notified for rewards",
          value: "1482654194161680477",
          emoji: "🎁"
        },
        {
          label: "Roblox Player",
          description: "Blox Fruits players",
          value: "1482654276437413940",
          emoji: "🎮"
        },
        {
          label: "Minecraft Player",
          description: "Minecraft players",
          value: "1482654341629214831",
          emoji: "⛏️"
        }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setDescription(`
╔═══════════════╗
   🎭 **ROLE SELECTION**
╚═══════════════╝

Select your roles from the menu below!

━━━━━━━━━━━━━━━━━━

📢 ︱ **Announcements**  
🔔 Get server updates  

🎁 ︱ **Giveaways**  
🎉 Get notified for rewards  

🎮 ︱ **Roblox Player**  
⚔️ Blox Fruits players  

⛏️ ︱ **Minecraft Player**  
🌍 Minecraft players  

━━━━━━━━━━━━━━━━━━

✨ Select to add roles  
❌ Unselect to remove roles
      `);

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await interaction.deleteReply();
  }
};
