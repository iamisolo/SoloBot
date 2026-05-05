




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
  setUserLevel,
  getUserLevelData,
  getLevelingConfig,
  getXpForLevel
} from '../../services/leveling.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('levelset')
    .setDescription("Set a user's level to a specific value")
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to modify')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('Level to set')
        .setRequired(true)
        .setMinValue(0)
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
      const newLevel = interaction.options.getInteger('level');

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

      const updatedData = await setUserLevel(
        client,
        interaction.guildId,
        targetUser.id,
        newLevel
      );

      const xpNeeded = getXpForLevel(newLevel + 1);

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'SoloBot Level Manager',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTitle('✅ Level Updated')
        .addFields(
          {
            name: '👤 User',
            value: `${targetUser.tag}`,
            inline: true
          },
          {
            name: '📊 Old Level',
            value: `${beforeData?.level ?? 0}`,
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
        .setColor('#00ffcc')
        .setFooter({
          text: `Action by ${interaction.user.tag}`
        })
        .setTimestamp();

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed]
      });

      logger.info(
        `[SOLOBOT] ${interaction.user.tag} set ${targetUser.tag} → Level ${newLevel} | ${Date.now() - start}ms`
      );

    } catch (error) {
      logger.error('[SOLOBOT] LevelSet Error:', error);

      await handleInteractionError(interaction, error, {
        type: 'command',
        commandName: 'levelset'
      });
    }
  }
};
