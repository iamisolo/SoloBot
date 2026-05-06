import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder
} from 'discord.js';

import { getColor } from '../../config/bot.js';
import { createEmbed, errorEmbed } from '../../utils/embeds.js';
import {
  getLevelingConfig,
  saveLevelingConfig
} from '../../services/leveling.js';

import { botHasPermission } from '../../utils/permissionGuard.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

import levelDashboard from './modules/level_dashboard.js';

export default {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Manage leveling system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)

    // SETUP
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Setup leveling system')
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
          opt.setName('cooldown').setDescription('Cooldown (sec)').setMinValue(0).setMaxValue(3600)
        )
        .addStringOption(opt =>
          opt
            .setName('message')
            .setDescription('Use {user} {level}')
            .setMaxLength(300)
        )
    )

    // TOGGLE
    .addSubcommand(sub =>
      sub.setName('toggle').setDescription('Enable or disable leveling')
    )

    // CONFIG
    .addSubcommand(sub =>
      sub.setName('config').setDescription('View current config')
    )

    // DASHBOARD
    .addSubcommand(sub =>
      sub.setName('dashboard').setDescription('Open leveling dashboard')
    ),

  category: 'Leveling',

  async execute(interaction, config, client) {
    try {
      const start = Date.now();

      await InteractionHelper.safeDefer(interaction, {
        flags: MessageFlags.Ephemeral
      });

      // PERMISSION CHECK
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [errorEmbed('Missing Permission', 'Manage Server required')]
        });
      }

      const sub = interaction.options.getSubcommand();
      const guildId = interaction.guildId;

      // DASHBOARD
      if (sub === 'dashboard') {
        return levelDashboard.execute(interaction, config, client);
      }

      const data = await getLevelingConfig(client, guildId);

      // TOGGLE
      if (sub === 'toggle') {
        const enabled = !data?.enabled;

        await saveLevelingConfig(client, guildId, {
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

      // CONFIG
      if (sub === 'config') {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            new EmbedBuilder()
              .setTitle('📊 Leveling Config')
              .setColor(getColor('primary'))
              .addFields(
                {
                  name: 'Status',
                  value: data?.enabled ? 'Enabled' : 'Disabled',
                  inline: true
                },
                {
                  name: 'Channel',
                  value: data?.levelUpChannel
                    ? `<#${data.levelUpChannel}>`
                    : 'Not set',
                  inline: true
                },
                {
                  name: 'XP Range',
                  value: `${data?.xpRange?.min || 15} - ${data?.xpRange?.max || 25}`,
                  inline: true
                },
                {
                  name: 'Cooldown',
                  value: `${data?.xpCooldown || 60}s`,
                  inline: true
                },
                {
                  name: 'Message',
                  value: data?.levelUpMessage || '{user} reached level {level}!',
                  inline: false
                }
              )
          ]
        });
      }

      // SETUP
      if (sub === 'setup') {
        const channel = interaction.options.getChannel('channel');
        const xpMin = interaction.options.getInteger('xp_min') ?? 15;
        const xpMax = interaction.options.getInteger('xp_max') ?? 25;
        const cooldown = interaction.options.getInteger('cooldown') ?? 60;
        const message =
          interaction.options.getString('message') ||
          '{user} reached level {level}!';

        if (xpMin > xpMax) {
          return InteractionHelper.safeEditReply(interaction, {
            embeds: [errorEmbed('Error', 'Min XP cannot be greater than Max XP')]
          });
        }

        if (!botHasPermission(channel, ['SendMessages', 'EmbedLinks'])) {
          return InteractionHelper.safeEditReply(interaction, {
            embeds: [
              errorEmbed('Permission Error', 'Bot needs SendMessages + EmbedLinks')
            ]
          });
        }

        await saveLevelingConfig(client, guildId, {
          configured: true,
          enabled: true,
          levelUpChannel: channel.id,
          xpRange: { min: xpMin, max: xpMax },
          xpCooldown: cooldown,
          levelUpMessage: message
        });

        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            createEmbed({
              title: '✅ Leveling Setup Complete',
              description:
                `Channel: ${channel}\n` +
                `XP: ${xpMin}-${xpMax}\n` +
                `Cooldown: ${cooldown}s\n` +
                `Message: ${message}`,
              color: 'success'
            })
          ]
        });
      }

      logger.info(`[LEVEL] ${interaction.user.tag} | ${Date.now() - start}ms`);

    } catch (err) {
      logger.error('[LEVEL ERROR]', err);

      return InteractionHelper.safeEditReply(interaction, {
        embeds: [errorEmbed('Error', 'Something went wrong')]
      });
    }
  }
};
