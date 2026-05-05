




import {
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';

import { logger } from '../../utils/logger.js';
import {
  handleInteractionError,
  TitanBotError,
  ErrorTypes
} from '../../utils/errorHandler.js';

import {
  getUserLevelData,
  getXpForLevel
} from '../../services/leveling.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Check your or another user's rank and level")
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check')
        .setRequired(false)
    )
    .setDMPermission(false),

  category: 'Leveling',

  async execute(interaction, config, client) {
    try {
      const start = Date.now();
      await InteractionHelper.safeDefer(interaction);

      const targetUser =
        interaction.options.getUser('user') || interaction.user;

      const member = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);

      if (!member) {
        throw new TitanBotError(
          `User ${targetUser.id} not found`,
          ErrorTypes.USER_INPUT,
          'User not found in this server.'
        );
      }

      const data = await getUserLevelData(
        client,
        interaction.guildId,
        targetUser.id
      );

      const level = data?.level ?? 0;
      const xp = data?.xp ?? 0;
      const totalXp = data?.totalXp ?? 0;

      const xpNeeded = getXpForLevel(level + 1);
      const progress =
        xpNeeded > 0 ? Math.floor((xp / xpNeeded) * 100) : 0;

      const progressBar = buildProgressBar(progress, 20);

      const rankPosition = await getRankPosition(
        client,
        interaction.guildId,
        targetUser.id
      );

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${member.displayName}'s Rank`,
          iconURL: member.displayAvatarURL({ dynamic: true })
        })
        .addFields(
          {
            name: '🏆 Rank',
            value: rankPosition ? `#${rankPosition}` : 'Unranked',
            inline: true
          },
          {
            name: '📊 Level',
            value: `${level}`,
            inline: true
          },
          {
            name: '⭐ XP',
            value: `${xp}/${xpNeeded}`,
            inline: true
          },
          {
            name: '✨ Total XP',
            value: `${totalXp}`,
            inline: true
          },
          {
            name: `Progress to Level ${level + 1}`,
            value: `${progressBar} ${progress}%`
          }
        )
        .setColor('#00ffcc')
        .setFooter({
          text: `Requested by ${interaction.user.username}`
        })
        .setTimestamp();

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed]
      });

      logger.debug(
        `Rank checked → ${targetUser.id} | ${Date.now() - start}ms`
      );

    } catch (error) {
      logger.error('Rank Command Error:', error);

      await handleInteractionError(interaction, error, {
        type: 'command',
        commandName: 'rank'
      });
    }
  }
};

function buildProgressBar(percent, size = 10) {
  percent = Math.max(0, Math.min(100, percent));
  const filled = Math.round((percent / 100) * size);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

async function getRankPosition(client, guildId, userId) {
  try {
    const keys = await client.db.keys(`${guildId}:xp:*`);
    const users = [];

    for (const key of keys) {
      const data = await client.db.get(key);
      const id = key.split(':').pop();

      users.push({
        id,
        xp: data?.totalXp || 0
      });
    }

    users.sort((a, b) => b.xp - a.xp);

    const index = users.findIndex(u => u.id === userId);

    return index === -1 ? null : index + 1;

  } catch (error) {
    logger.error('Rank Position Error:', error);
    return null;
  }
}
