




import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';

import { logger } from '../../utils/logger.js';
import {
  handleInteractionError,
  TitanBotError,
  ErrorTypes
} from '../../utils/errorHandler.js';

import {
  getLeaderboard,
  getLevelingConfig,
  getXpForLevel
} from '../../services/leveling.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('levelleaderboard')
    .setDescription('View the server leveling leaderboard')
    .setDMPermission(false),

  category: 'Leveling',

  async execute(interaction, config, client) {
    try {
      const start = Date.now();

      await InteractionHelper.safeDefer(interaction);

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

      const leaderboard = await getLeaderboard(
        client,
        interaction.guildId,
        10
      );

      if (!leaderboard.length) {
        throw new TitanBotError(
          'No leaderboard data',
          ErrorTypes.DATABASE,
          'No data yet. Start chatting!'
        );
      }

      const lines = [];

      for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];

        let prefix = `**${i + 1}.**`;
        if (i === 0) prefix = '🥇';
        if (i === 1) prefix = '🥈';
        if (i === 2) prefix = '🥉';

        const member = await interaction.guild.members
          .fetch(user.userId)
          .catch(() => null);

        const mention = member
          ? `<@${member.id}>`
          : `<@${user.userId}>`;

        const nextXp = getXpForLevel(user.level + 1);

        lines.push(
          `${prefix} ${mention}\n` +
          `Level: **${user.level}** | XP: **${user.xp}/${nextXp}**`
        );
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'SoloBot Leaderboard',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTitle('🏆 Top 10 Members')
        .setDescription(lines.join('\n\n'))
        .setColor('#00ffcc')
        .setFooter({
          text: `Requested by ${interaction.user.tag}`
        })
        .setTimestamp();

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed]
      });

      logger.info(
        `[SOLOBOT] Leaderboard viewed in ${interaction.guildId} | ${Date.now() - start}ms`
      );

    } catch (error) {
      logger.error('[SOLOBOT] Leaderboard Error:', error);

      await handleInteractionError(interaction, error, {
        type: 'command',
        commandName: 'levelleaderboard'
      });
    }
  }
};
