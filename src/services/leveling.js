import { logger } from '../utils/logger.js';

/* ================= ROLE CONFIG ================= */

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

/* ================= XP SYSTEM ================= */

// MAIN XP FUNCTION
export function getXpForLevel(level) {
  return Math.floor(5 * level * level + 50 * level + 50);
}

// ✅ FIX (for your commands)
export function getXPNeeded(level) {
  return getXpForLevel(level);
}

// Progress bar
export function getProgressBar(current, required, size = 10) {
  const percent = required > 0 ? current / required : 0;
  const filled = Math.round(size * percent);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

/* ================= USER DATA ================= */

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

/* ================= LEVEL MODIFY ================= */

export async function addLevels(client, guildId, userId, levels) {
  const data = await getUserLevelData(client, guildId, userId);

  data.level += levels;
  data.xp = 0;
  data.totalXp += getXpForLevel(data.level);

  await saveUserLevelData(client, guildId, userId, data);
  return data;
}

export async function removeLevels(client, guildId, userId, levels) {
  const data = await getUserLevelData(client, guildId, userId);

  data.level = Math.max(0, data.level - levels);
  data.xp = 0;
  data.totalXp = getXpForLevel(data.level);

  await saveUserLevelData(client, guildId, userId, data);
  return data;
}

export async function setUserLevel(client, guildId, userId, level) {
  const data = await getUserLevelData(client, guildId, userId);

  data.level = level;
  data.xp = 0;
  data.totalXp = getXpForLevel(level);

  await saveUserLevelData(client, guildId, userId, data);
  return data;
}

/* ================= XP FROM MESSAGES ================= */

export async function handleMessageXP(client, message) {
  try {
    if (!message.guild || message.author.bot) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    const config = await getLevelingConfig(client, guildId);
    if (!config.enabled) return;

    if (!checkCooldown(guildId, userId, config.xpCooldown)) return;

    const data = await getUserLevelData(client, guildId, userId);

    const xpGain = random(config.xpRange.min, config.xpRange.max);
    data.xp += xpGain;
    data.totalXp += xpGain;

    const requiredXp = getXpForLevel(data.level + 1);

    if (data.xp >= requiredXp) {
      data.level++;
      data.xp = 0;

      await handleLevelUp(message, data.level, config);
    }

    await saveUserLevelData(client, guildId, userId, data);

  } catch (err) {
    logger.error('[XP SYSTEM ERROR]', err);
  }
}

/* ================= LEVEL UP HANDLER ================= */

async function handleLevelUp(message, level, config) {
  await updateRoles(message.member, level);

  if (config.announceLevelUp && config.levelUpChannel) {
    const channel = message.guild.channels.cache.get(config.levelUpChannel);
    if (!channel) return;

    const msg = config.levelUpMessage
      .replace('{user}', `<@${message.author.id}>`)
      .replace('{level}', level);

    channel.send({ content: msg }).catch(() => {});
  }
}

/* ================= ROLE SYSTEM ================= */

export async function updateRoles(member, level) {
  try {
    if (!member) return;

    // Remove all leveling roles first
    const allRoles = Object.values(LEVEL_ROLES).flat();

    for (const roleId of allRoles) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId).catch(() => {});
      }
    }

    // Add highest eligible role
    const eligibleLevels = Object.keys(LEVEL_ROLES)
      .map(Number)
      .filter(lvl => lvl <= level)
      .sort((a, b) => b - a);

    if (eligibleLevels.length === 0) return;

    const highest = eligibleLevels[0];
    const rolesToAdd = LEVEL_ROLES[highest];

    for (const roleId of rolesToAdd) {
      await member.roles.add(roleId).catch(() => {});
    }

  } catch (err) {
    logger.error('[ROLE SYSTEM ERROR]', err);
  }
}

/* ================= COOLDOWN ================= */

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

/* ================= CONFIG ================= */

export async function getLevelingConfig(client, guildId) {
  const key = `${guildId}:config`;

  return (await client.db.get(key)) || {
    enabled: true,
    configured: false,
    announceLevelUp: true,
    levelUpChannel: null,
    xpRange: { min: 15, max: 25 },
    xpCooldown: 60,
    levelUpMessage: '{user} reached level {level}!'
  };
}

export async function saveLevelingConfig(client, guildId, config) {
  const key = `${guildId}:config`;
  await client.db.set(key, config);
}

/* ================= LEADERBOARD ================= */

export async function getLeaderboard(client, guildId, limit = 10) {
  const all = await client.db.all();

  return all
    .filter(x => x.id.startsWith(`${guildId}:xp:`))
    .map(x => ({
      userId: x.id.split(':')[2],
      ...x.value
    }))
    .sort((a, b) => b.totalXp - a.totalXp)
    .slice(0, limit);
}

export async function getUserRank(client, guildId, userId) {
  const leaderboard = await getLeaderboard(client, guildId, 1000);
  const index = leaderboard.findIndex(u => u.userId === userId);
  return index === -1 ? null : index + 1;
}

/* ================= UTILS ================= */

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
