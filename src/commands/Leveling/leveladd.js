




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
  addLevels,
  getUserLevelData,
  getLevelingConfig,
  getXpForLevel
} from '../../services/leveling.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leveladd')
    .setDescription('Add levels to a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to modify')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('levels')
        .setDescription('Levels to add')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(500)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  category: 'Leveling',

  async execute(interaction, client) {
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
      const levelsToAdd = interaction.options.getInteger('levels');

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

      const oldLevel = beforeData?.level ?? 0;

      const updatedData = await addLevels(
        client,
        interaction.guildId,
        targetUser.id,
        levelsToAdd
      );

      const newLevel = updatedData.level;
      const xpNeeded = getXpForLevel(newLevel + 1);

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'SoloBot Level Manager',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTitle('⬆️ Levels Added')
        .addFields(
          {
            name: '👤 User',
            value: `${targetUser.tag}`,
            inline: true
          },
          {
            name: '📊 Old Level',
            value: `${oldLevel}`,
            inline: true
          },
          {
            name: '📈 Added',
            value: `${levelsToAdd}`,
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
        .setColor('#2ecc71')
        .setFooter({
          text: `Action by ${interaction.user.tag}`
        })
        .setTimestamp();

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed]
      });

      logger.info(
        `[SOLOBOT] ${interaction.user.tag} added ${levelsToAdd} levels to ${targetUser.tag} (${oldLevel} → ${newLevel}) | ${Date.now() - start}ms`
      );

    } catch (error) {
      logger.error('[SOLOBOT] LevelAdd Error:', error);

      await handleInteractionError(interaction, error, {
        type: 'command',
        commandName: 'leveladd'
      });
    }
  }
};
