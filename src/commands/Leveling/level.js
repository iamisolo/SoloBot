import { getColor } from '../../config/bot.js';
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder
} from 'discord.js';

import { createEmbed, errorEmbed } from '../../utils/embeds.js';
import {
  getLevelingConfig,
  saveLevelingConfig
} from '../../services/leveling.js';

import { botHasPermission } from '../../utils/permissionGuard.js';
import {
  TitanBotError,
  ErrorTypes,
  handleInteractionError
} from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

import levelDashboard from './modules/level_dashboard.js';

export default {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Manage the leveling system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)

    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Setup & enable leveling system')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Level up messages channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('xp_min').setDescription('Min XP').setMinValue(1).setMaxValue(500)
        )
        .addIntegerOption(opt =>
          opt.setName('xp_max').setDescription('Max XP').setMinValue(1).setMaxValue(500)
        )
        .addIntegerOption(opt =>
          opt.setName('xp_cooldown').setDescription('Cooldown (sec)').setMinValue(0).setMaxValue(3600)
        )
        .addStringOption(opt =>
          opt
            .setName('message')
            .setDescription('Use {user} {level}')
            .setMaxLength(500)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('toggle')
        .setDescription('Enable or disable leveling')
    )

    .addSubcommand(sub =>
      sub
        .setName('config')
        .setDescription('View current config')
    )

    .addSubcommand(sub =>
      sub
        .setName('dashboard')
        .setDescription('Open leveling dashboard')
    ),

  category: 'Leveling',

  async execute(interaction, config, client) {
    try {
      const start = Date.now();

      await InteractionHelper.safeDefer(interaction, {
        flags: MessageFlags.Ephemeral
      });

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [errorEmbed('Missing Permission', 'Manage Server required')]
        });
      }

      const sub = interaction.options.getSubcommand();

      if (sub === 'dashboard') {
        return levelDashboard.execute(interaction, config, client);
      }

      const data = await getLevelingConfig(client, interaction.guildId);

      if (sub === 'toggle') {
        const enabled = !data?.enabled;

        await saveLevelingConfig(client, interaction.guildId, {
          ...data,
          enabled
        });

        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            createEmbed({
              title: '⚙️ Leveling Toggled',
              description: `Leveling is now **${enabled ? 'ENABLED' : 'DISABLED'}**`,
              color: enabled ? 'success' : 'error'
            })
          ]
        });
      }

      if (sub === 'config') {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            new EmbedBuilder()
              .setTitle('📊 Leveling Config')
              .setColor(getColor('primary'))
              .addFields(
                { name: 'Status', value: data?.enabled ? 'Enabled' : 'Disabled', inline: true },
                { name: 'Channel', value: `<#${data?.levelUpChannel || 'Not set'}>`, inline: true },
                {
                  name: 'XP Range',
                  value: `${data?.xpRange?.min || 0} - ${data?.xpRange?.max || 0}`,
                  inline: true
                },
                {
                  name: 'Cooldown',
                  value: `${data?.xpCooldown || 0}s`,
                  inline: true
                }
              )
          ]
        });
      }

      if (sub === 'setup') {
        const channel = interaction.options.getChannel('channel');
        const xpMin = interaction.options.getInteger('xp_min') ?? 15;
        const xpMax = interaction.options.getInteger('xp_max') ?? 25;
        const xpCooldown = interaction.options.getInteger('xp_cooldown') ?? 60;
        const message =
          interaction.options.getString('message') ??
          '{user} reached level {level}!';

        if (xpMin > xpMax) {
          return InteractionHelper.safeEditReply(interaction, {
            embeds: [errorEmbed('Error', 'Min XP cannot exceed Max XP')]
          });
        }

        if (!botHasPermission(channel, ['SendMessages', 'EmbedLinks'])) {
          throw new TitanBotError(
            'Missing perms',
            ErrorTypes.PERMISSION,
            'Bot needs SendMessages + EmbedLinks'
          );
        }

        await saveLevelingConfig(client, interaction.guildId, {
          configured: true,
          enabled: true,
          levelUpChannel: channel.id,
          xpRange: { min: xpMin, max: xpMax },
          xpCooldown,
          levelUpMessage: message
        });

        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            createEmbed({
              title: '✅ SoloBot Leveling Setup',
              description:
                `Channel: ${channel}\n` +
                `XP: ${xpMin}-${xpMax}\n` +
                `Cooldown: ${xpCooldown}s\n` +
                `Message: ${message}`,
              color: 'success'
            })
          ]
        });
      }

      logger.info(`[SOLOBOT] Level command used | ${Date.now() - start}ms`);

    } catch (error) {
      logger.error('[SOLOBOT] Level Error:', error);

      await handleInteractionError(interaction, error, {
        type: 'command',
        commandName: 'level'
      });
    }
  }
};
