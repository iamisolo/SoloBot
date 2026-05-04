import { logger } from '../utils/logger.js';
import { getLevelingConfig, getXpForLevel, getUserLevelData, saveUserLevelData } from './leveling.js';

const cooldowns = new Map();

export async function addXp(client, guild, member, xpToAdd = null) {
  try {
    if (!guild || !member || member.user.bot) return;

    const config = await getLevelingConfig(client, guild.id);
    if (!config.enabled) return;

    const now = Date.now();
    const cooldownKey = `${guild.id}-${member.id}`;
    const cooldownTime = (config.xpCooldown || 60) * 1000;

    if (cooldowns.has(cooldownKey)) {
      const expire = cooldowns.get(cooldownKey);
      if (now < expire) return;
    }

    cooldowns.set(cooldownKey, now + cooldownTime);

    const xpMin = config.xpRange?.min || 15;
    const xpMax = config.xpRange?.max || 25;

    const xpGain = xpToAdd ?? Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;

    const data = await getUserLevelData(client, guild.id, member.id);

    data.xp += xpGain;
    data.totalXp += xpGain;
    data.lastMessage = now;

    let leveledUp = false;

    while (data.xp >= getXpForLevel(data.level + 1)) {
      data.xp -= getXpForLevel(data.level + 1);
      data.level++;
      leveledUp = true;

      await handleRoleRewards(guild, member, config, data.level);
      await sendLevelUpMessage(guild, member, config, data.level);
    }

    await saveUserLevelData(client, guild.id, member.id, data);

    return {
      success: true,
      xp: data.xp,
      level: data.level,
      totalXp: data.totalXp,
      leveledUp
    };

  } catch (err) {
    logger.error('XP System Error:', err);
    return { success: false };
  }
}

async function handleRoleRewards(guild, member, config, level) {
  try {
    if (!config.roleRewards) return;

    const roleIds = config.roleRewards[level];
    if (!roleIds) return;

    for (const roleId of roleIds) {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId).catch(() => {});
      }
    }
  } catch (err) {
    logger.error('Role Reward Error:', err);
  }
}

async function sendLevelUpMessage(guild, member, config, level) {
  try {
    if (!config.announceLevelUp) return;

    const channel = guild.channels.cache.get(config.levelUpChannel);
    if (!channel || !channel.isTextBased()) return;

    const message = (config.levelUpMessage || '{user} reached level {level}!')
      .replace(/{user}/g, `<@${member.id}>`)
      .replace(/{level}/g, level);

    await channel.send({ content: message }).catch(() => {});
  } catch (err) {
    logger.error('Level Message Error:', err);
  }
}
