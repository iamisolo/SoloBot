import { logger } from '../utils/logger.js';
import {
  getUserLevelData,
  saveUserLevelData,
  getXpForLevel,
  giveRoles,
  checkCooldown
} from '../services/leveling.js';

const XP_MIN = 10;
const XP_MAX = 30;
const COOLDOWN = 60;
const LEVEL_CHANNEL_ID = "1480931561556938773";

export async function addXp(client, guild, member) {
  try {
    if (!guild || !member) return;
    if (!member.user || member.user.bot) return;

    const allowed = checkCooldown(guild.id, member.id, COOLDOWN);
    if (!allowed) return;

    const xpGain = generateXp();
    const data = await getUserLevelData(client, guild.id, member.id);

    if (!data.messages) data.messages = 0;

    data.xp += xpGain;
    data.totalXp += xpGain;
    data.messages += 1;
    data.lastMessage = Date.now();

    let leveledUp = false;
    let levelsGained = 0;

    while (true) {
      const needed = getXpForLevel(data.level + 1);
      if (data.xp < needed) break;

      data.xp -= needed;
      data.level += 1;
      leveledUp = true;
      levelsGained++;

      await handleRoleRewards(guild, member, data.level);
    }

    await saveUserLevelData(client, guild.id, member.id, data);

    if (leveledUp) {
      await sendLevelUpMessage(client, guild, member, data, levelsGained);
    }
  } catch (error) {
    logger.error('XP Add Error:', error);
  }
}

async function handleRoleRewards(guild, member, level) {
  try {
    await giveRoles(guild, member, level);
  } catch (error) {
    logger.error('Role Reward Error:', error);
  }
}

async function sendLevelUpMessage(client, guild, member, data, levelsGained) {
  try {
    const channel = resolveChannel(guild);
    if (!channel) return;

    const message = buildLevelMessage(member, data.level, levelsGained);
    await channel.send(message).catch(() => {});
  } catch (error) {
    logger.error('Level Message Error:', error);
  }
}

function resolveChannel(guild) {
  const fixed = guild.channels.cache.get(LEVEL_CHANNEL_ID);
  if (fixed) return fixed;

  if (guild.systemChannel) return guild.systemChannel;

  return null;
}

function buildLevelMessage(member, level, levelsGained) {
  if (levelsGained > 1) {
    return `🚀 <@${member.id}> jumped ${levelsGained} levels and reached **Level ${level}**! Keep grinding 💪`;
  }

  return `🎉 <@${member.id}> reached **Level ${level}**! GG 🔥`;
}

function generateXp() {
  const base = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
  const bonus = Math.random() < 0.1 ? Math.floor(base * 0.5) : 0;
  return base + bonus;
}

export async function giveBonusXp(client, guild, member, amount = 50) {
  try {
    const data = await getUserLevelData(client, guild.id, member.id);

    data.xp += amount;
    data.totalXp += amount;

    await saveUserLevelData(client, guild.id, member.id, data);
  } catch (error) {
    logger.error('Bonus XP Error:', error);
  }
}

export async function removeXp(client, guild, member, amount = 50) {
  try {
    const data = await getUserLevelData(client, guild.id, member.id);

    data.xp = Math.max(0, data.xp - amount);
    data.totalXp = Math.max(0, data.totalXp - amount);

    await saveUserLevelData(client, guild.id, member.id, data);
  } catch (error) {
    logger.error('Remove XP Error:', error);
  }
}

export async function setXp(client, guild, member, xp = 0) {
  try {
    const data = await getUserLevelData(client, guild.id, member.id);

    data.xp = xp;

    await saveUserLevelData(client, guild.id, member.id, data);
  } catch (error) {
    logger.error('Set XP Error:', error);
  }
}

export async function resetUser(client, guild, member) {
  try {
    const data = {
      xp: 0,
      level: 0,
      totalXp: 0,
      messages: 0,
      lastMessage: 0
    };

    await saveUserLevelData(client, guild.id, member.id, data);
  } catch (error) {
    logger.error('Reset User Error:', error);
  }
}

export async function fetchUserStats(client, guild, member) {
  try {
    const data = await getUserLevelData(client, guild.id, member.id);

    return {
      id: member.id,
      level: data.level,
      xp: data.xp,
      totalXp: data.totalXp,
      messages: data.messages || 0,
      lastMessage: data.lastMessage || 0
    };
  } catch (error) {
    logger.error('Fetch Stats Error:', error);
    return null;
  }
}

export async function forceLevelUp(client, guild, member, levels = 1) {
  try {
    const data = await getUserLevelData(client, guild.id, member.id);

    for (let i = 0; i < levels; i++) {
      data.level++;
      await handleRoleRewards(guild, member, data.level);
    }

    data.xp = 0;

    await saveUserLevelData(client, guild.id, member.id, data);

    await sendLevelUpMessage(client, guild, member, data, levels);
  } catch (error) {
    logger.error('Force Level Error:', error);
  }
}

export async function syncRoles(client, guild, member) {
  try {
    const data = await getUserLevelData(client, guild.id, member.id);
    await giveRoles(guild, member, data.level);
  } catch (error) {
    logger.error('Sync Roles Error:', error);
  }
  }
