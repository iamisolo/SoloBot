




import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';

import { logger } from '../../utils/logger.js';
import {
  handleInteractionError,
  TitanBotError,
  ErrorTypes
} from '../../utils/errorHandler.js';

import { checkUserPermissions } from '../../utils/permissionGuard.js';

import {
  removeLevels,
  getUserLevelData,
  getLevelingConfig,
  getXpForLevel
} from '../../services/leveling.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('levelremove')
    .setDescription('Remove levels from a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to modify')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('levels')
        .setDescription('Levels to remove')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(500)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  category: 'Leveling',

  async execute(interaction, config, client) {
    try {
      const start = Date.now();
      await InteractionHelper.safeDefer(interaction);

      const hasPermission = await checkUserPermissions(
        interaction,
        PermissionFlagsBits.ManageGuild,
        'You need Manage Server permission to use this command.'
      );
      if (!hasPermission) return;

      const levelingConfig = await getLevelingConfig(
        client,
        interaction.guildId
      );

      if (!levelingConfig?.enabled) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            new EmbedBuilder()
              .setColor('#f1c40f')
              .setDescription('Leveling system is disabled.')
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const targetUser = interaction.options.getUser('user');
      const levelsToRemove = interaction.options.getInteger('levels');

      const member = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);

      if (!member) {
        throw new TitanBotError(
          `User ${targetUser.id} not found`,
          ErrorTypes.USER_INPUT,
          'User is not in this server.'
        );
      }

      const beforeData = await getUserLevelData(
        client,
        interaction.guildId,
        targetUser.id
      );

      const currentLevel = beforeData?.level ?? 0;

      if (currentLevel <= 0) {
        throw new TitanBotError(
          `Already level 0`,
          ErrorTypes.VALIDATION,
          `${targetUser.tag} is already at level 0.`
        );
      }

      const updatedData = await removeLevels(
        client,
        interaction.guildId,
        targetUser.id,
        levelsToRemove
      );

      const newLevel = updatedData.level;
      const xpNeeded = getXpForLevel(newLevel + 1);

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'SoloBot Level Manager',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTitle('⬇️ Levels Removed')
        .addFields(
          {
            name: '👤 User',
            value: `${targetUser.tag}`,
            inline: true
          },
          {
            name: '📊 Old Level',
            value: `${currentLevel}`,
            inline: true
          },
          {
            name: '📉 Removed',
            value: `${levelsToRemove}`,
            inline: true
          },
          {
            name: '🚀 New Level',
            value: `${newLevel}`,
            inline: true
          },
          {
            name: '⭐ Total XP',
            value: `${updatedData.totalXp}`,
            inline: true
          },
          {
            name: '🎯 Next Level XP',
            value: `${xpNeeded}`,
            inline: true
          }
        )
        .setColor('#ff4d4d')
        .setFooter({
          text: `Action by ${interaction.user.tag}`
        })
        .setTimestamp();

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed]
      });

      logger.info(
        `[SOLOBOT] ${interaction.user.tag} removed ${levelsToRemove} levels from ${targetUser.tag} (${currentLevel} → ${newLevel}) | ${Date.now() - start}ms`
      );

    } catch (error) {
      logger.error('[SOLOBOT] LevelRemove Error:', error);

      await handleInteractionError(interaction, error, {
        type: 'command',
        commandName: 'levelremove'
      });
    }
  }
};
