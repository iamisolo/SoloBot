import { logger } from '../utils/logger.js';

export const LEVEL_ROLES = {
  1: ["1480936538446495885", "1485126707974242335"],
  5: ["1480936864318754866"],
  10: ["1480937062713790554"],
  25: ["1480937216262930594"],
  50: ["1480937422542999664"],
  75: ["1480937594974900437"],
  100: ["1480937780484902982"]
};

const cooldowns = new Map();

export function getXpForLevel(level) {
  return 5 * level * level + 50 * level + 50;
}

export async function getUserLevelData(client, guildId, userId) {
  const key = `${guildId}:xp:${userId}`;
  const data = await client.db.get(key);

  return data || {
    xp: 0,
    level: 0,
    totalXp: 0,
    lastMessage: 0
  };
}

export async function saveUserLevelData(client, guildId, userId, data) {
  const key = `${guildId}:xp:${userId}`;
  await client.db.set(key, data);
}

export async function addLevels(client, guild, member, levels) {
  const data = await getUserLevelData(client, guild.id, member.id);

  data.level += levels;
  data.xp = 0;
  data.totalXp += getXpForLevel(data.level);

  await giveRoles(guild, member, data.level);
  await saveUserLevelData(client, guild.id, member.id, data);

  return data;
}

export async function removeLevels(client, guild, member, levels) {
  const data = await getUserLevelData(client, guild.id, member.id);

  data.level = Math.max(0, data.level - levels);
  data.xp = 0;
  data.totalXp = getXpForLevel(data.level);

  await saveUserLevelData(client, guild.id, member.id, data);

  return data;
}

export async function setLevel(client, guild, member, level) {
  const data = await getUserLevelData(client, guild.id, member.id);

  data.level = level;
  data.xp = 0;
  data.totalXp = getXpForLevel(level);

  await giveRoles(guild, member, level);
  await saveUserLevelData(client, guild.id, member.id, data);

  return data;
}

export async function giveRoles(guild, member, level) {
  try {
    const roles = LEVEL_ROLES[level];
    if (!roles) return;

    for (const roleId of roles) {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId).catch(() => {});
      }
    }
  } catch (err) {
    logger.error(err);
  }
}

export function checkCooldown(guildId, userId, seconds = 60) {
  const key = `${guildId}-${userId}`;
  const now = Date.now();

  if (cooldowns.has(key)) {
    const expire = cooldowns.get(key);
    if (now < expire) return false;
  }

  cooldowns.set(key, now + seconds * 1000);
  return true;
}
