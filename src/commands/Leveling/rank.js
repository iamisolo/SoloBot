import {
  SlashCommandBuilder,
  AttachmentBuilder
} from 'discord.js';

import { logger } from '../../utils/logger.js';
import { generateRankCard } from '../../utils/rankCard.js';

import {
  getUserLevelData,
  getXPNeeded
} from '../../services/leveling.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Check rank")
    .addUserOption(option =>
      option.setName('user').setDescription('Target user')
    ),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const targetUser =
        interaction.options.getUser('user') || interaction.user;

      const member = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);

      if (!member) {
        return interaction.editReply("❌ User not found");
      }

      const data = await getUserLevelData(
        client,
        interaction.guildId,
        targetUser.id
      );

      const level = data.level || 0;
      const xp = data.xp || 0;
      const xpNeeded = getXPNeeded(level);

      const rank = await getRankPosition(
        client,
        interaction.guildId,
        targetUser.id
      );

      const buffer = await generateRankCard({
        user: targetUser,
        member,
        level,
        xp,
        xpNeeded,
        rank
      });

      const attachment = new AttachmentBuilder(buffer, {
        name: 'rank.png'
      });

      await interaction.editReply({
        files: [attachment]
      });

    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Error generating rank card");
    }
  }
};

async function getRankPosition(client, guildId, userId) {
  try {
    const keys = await client.db.keys(`${guildId}:xp:*`);
    const users = [];

    for (const key of keys) {
      const data = await client.db.get(key);
      users.push({
        id: key.split(':')[2],
        xp: data?.totalXp || 0
      });
    }

    users.sort((a, b) => b.xp - a.xp);

    const index = users.findIndex(u => u.id === userId);

    return index === -1 ? null : index + 1;

  } catch {
    return null;
  }
}
