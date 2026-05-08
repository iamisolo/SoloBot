import { Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';

const MAX = 512;

export default {
  name: Events.MessageUpdate,
  once: false,

  async execute(oldMessage, newMessage) {
    try {
      if (!newMessage.guild || newMessage.author?.bot) return;

      if (oldMessage.partial) await oldMessage.fetch().catch(() => null);
      if (newMessage.partial) await newMessage.fetch().catch(() => null);

      const oldContent = oldMessage.content ?? '';
      const newContent = newMessage.content ?? '';

      if (!oldContent || !newContent) return;
      if (oldContent === newContent) return;

      const trim = (txt) =>
        txt.length > MAX ? txt.slice(0, MAX - 3) + '...' : txt;

      const fields = [
        {
          name: '👤 Author',
          value: `${newMessage.author.tag} (${newMessage.author.id})`,
          inline: true
        },
        {
          name: '💬 Channel',
          value: `${newMessage.channel.toString()} (${newMessage.channel.id})`,
          inline: true
        },
        {
          name: '🆔 Message ID',
          value: newMessage.id,
          inline: true
        },
        {
          name: '📝 Old Content',
          value: trim(oldContent) || '*(empty)*',
          inline: false
        },
        {
          name: '📝 New Content',
          value: trim(newContent) || '*(empty)*',
          inline: false
        }
      ];

      await logEvent({
        client: newMessage.client,
        guildId: newMessage.guild.id,
        eventType: EVENT_TYPES.MESSAGE_EDIT,
        data: {
          description: `Message edited in ${newMessage.channel.toString()}`,
          userId: newMessage.author.id,
          channelId: newMessage.channel.id,
          fields
        }
      });

    } catch (err) {
      logger.error('MessageUpdate Error:', err);
    }
  }
};
