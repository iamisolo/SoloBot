import { EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig, setGuildConfig } from '../services/guildConfig.js';
import { TitanBotError, ErrorTypes } from '../utils/errorHandler.js';
import { addXp } from './xpSystem.js';

const LEVEL_ROLES = {
  1: ["1480936538446495885", "1485126707974242335"],
  5: ["1480936864318754866"],
  10: ["1480937062713790554"],
  25: ["1480937216262930594"],
  50: ["1480937422542999664"],
  75: ["1480937594974900437"],
  100: ["1480937780484902982"]
};

const BASE_XP = 100;
const XP_MULTIPLIER = 1.5;
const MAX_LEVEL = 1000;
const MIN_LEVEL = 0;

export function getXpForLevel(level) {
  if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
    throw new TitanBotError(
      `Invalid level: ${level}. Must be between ${MIN_LEVEL} and ${MAX_LEVEL}`,
      ErrorTypes.VALIDATION,
      'The level must be a valid number.'
    );
  }
  return 5 * Math.pow(level, 2) + 50 * level + 50;
}

export function getLevelFromXp(xp) {
  if (!Number.isInteger(xp) || xp < 0) {
    throw new TitanBotError(
      `Invalid XP: ${xp}`,
      ErrorTypes.VALIDATION,
      'XP must be a non-negative number.'
    );
  }

  let level = 0;
  let xpNeeded = 0;
  
  while (xp >= getXpForLevel(level) && level < MAX_LEVEL) {
    xpNeeded = getXpForLevel(level);
    xp -= xpNeeded;
    level++;
  }
  
  return {
    level: Math.min(level, MAX_LEVEL),
    currentXp: xp,
    xpNeeded: getXpForLevel(Math.min(level, MAX_LEVEL))
  };
}

export async function getLeaderboard(client, guildId, limit = 10) {
  try {
    if (!guildId || typeof guildId !== 'string') {
      throw new TitanBotError(
        'Invalid guild ID',
        ErrorTypes.VALIDATION,
        'Guild ID is required.'
      );
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      limit = Math.min(Math.max(limit, 1), 100);
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn(`Guild ${guildId} not found in cache`);
      return [];
    }
    
    const members = await guild.members.fetch().catch(() => new Map());

    const leaderboard = [];
    
    for (const [userId, member] of members) {
      if (member.user.bot) continue;
      
      const data = await getUserLevelData(client, guildId, userId);
      if (data && (data.totalXp > 0 || data.level > 0)) {
        leaderboard.push({
          userId,
          username: member.user.username,
          discriminator: member.user.discriminator,
          ...data
        });
      }
    }
    
    leaderboard.sort((a, b) => b.totalXp - a.totalXp);
    
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    return leaderboard.slice(0, limit);
    
  } catch (error) {
    logger.error('Error getting leaderboard:', error);
    throw error;
  }
}

export async function getLevelingConfig(client, guildId) {
  try {
    const guildConfig = await getGuildConfig(client, guildId);
    return guildConfig.leveling || { enabled: true };
  } catch {
    return { enabled: true };
  }
}

export async function getUserLevelData(client, guildId, userId) {
  const key = `${guildId}:leveling:users:${userId}`;
  const data = await client.db.get(key);
  
  return data || {
    xp: 0,
    level: 0,
    totalXp: 0,
    lastMessage: 0,
    rank: 0
  };
}

export async function saveUserLevelData(client, guildId, userId, data) {
  const key = `${guildId}:leveling:users:${userId}`;
  await client.db.set(key, data);
}

export async function addLevels(client, guildId, userId, levels) {
  const userData = await getUserLevelData(client, guildId, userId);
  const newLevel = userData.level + levels;

  userData.level = newLevel;
  userData.xp = 0;
  userData.totalXp += getXpForLevel(newLevel);

  const guild = client.guilds.cache.get(guildId);
  if (guild) {
    const member = await guild.members.fetch(userId).catch(() => null);
    const roles = LEVEL_ROLES[newLevel];
    if (roles && member) {
      for (const roleId of roles) {
        await member.roles.add(roleId).catch(() => {});
      }
    }
  }

  await saveUserLevelData(client, guildId, userId, userData);
  return userData;
}

export async function removeLevels(client, guildId, userId, levels) {
  const userData = await getUserLevelData(client, guildId, userId);
  const newLevel = Math.max(0, userData.level - levels);

  userData.level = newLevel;
  userData.xp = 0;
  userData.totalXp = getXpForLevel(newLevel);

  await saveUserLevelData(client, guildId, userId, userData);
  return userData;
}

export async function setUserLevel(client, guildId, userId, level) {
  const userData = await getUserLevelData(client, guildId, userId);

  userData.level = level;
  userData.xp = 0;
  userData.totalXp = getXpForLevel(level);

  const guild = client.guilds.cache.get(guildId);
  if (guild) {
    const member = await guild.members.fetch(userId).catch(() => null);
    const roles = LEVEL_ROLES[level];
    if (roles && member) {
      for (const roleId of roles) {
        await member.roles.add(roleId).catch(() => {});
      }
    }
  }

  await saveUserLevelData(client, guildId, userId, userData);
  return userData;
}
