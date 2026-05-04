import { logger } from '../utils/logger.js';
import {
  getUserLevelData,
  saveUserLevelData,
  getXpForLevel,
  updateRoles,
  checkCooldown
} from '../systems/leveling.js';

/* CONFIG */
const XP_MIN = 15;
const XP_MAX = 25;
const COOLDOWN = 60;

const LEVEL_CHANNEL_ID = "1480931561556938773";

export async function addXp(client, guild, member) {
  try {
    if (!guild || !member || member.user.bot) return;

    const canGain = checkCooldown(guild.id, member.id, COOLDOWN);
    if (!canGain) return;

    const xpGain = randomXp();

    const data = await getUserLevelData(client, guild.id, member.id);

    data.xp += xpGain;
    data.totalXp += xpGain;
    data.lastMessage = Date.now();
    data.messages = (data.messages || 0) + 1;

    let leveledUp = false;
    let levelsGained = 0;

    while (data.xp >= getXpForLevel(data.level + 1)) {
      data.xp -= getXpForLevel(data.level + 1);
      data.level++;
      leveledUp = true;
      levelsGained++;

      await updateRoles(guild, member, data.level);
    }

    await saveUserLevelData(client, guild.id, member.id, data);

    if (leveledUp) {
      await handleLevelUp(client, guild, member, data.level, levelsGained);
    }

  } catch (err) {
    logger.error('XP System Error:', err);
  }
}

/* ---------- LEVEL UP HANDLER ---------- */
async function handleLevelUp(client, guild, member, level, levelsGained) {
  try {
    const channel = getLevelChannel(guild);
    if (!channel) return;

    const msg = formatLevelMessage(member, level, levelsGained);

    await channel.send(msg).catch(() => {});
  } catch (err) {
    logger.error('LevelUp Error:', err);
  }
}

/* ---------- CHANNEL FIXED ---------- */
function getLevelChannel(guild) {
  return guild.channels.cache.get(LEVEL_CHANNEL_ID) 
    || guild.systemChannel 
    || null;
}

/* ---------- MESSAGE FORMAT ---------- */
function formatLevelMessage(member, level, levelsGained) {
  if (levelsGained > 1) {
    return `🚀 <@${member.id}> jumped ${levelsGained} levels and reached **Level ${level}**!`;
  }
  return `🎉 <@${member.id}> reached **Level ${level}**!`;
}

/* ---------- RANDOM XP ---------- */
function randomXp() {
  return Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
}

/* ---------- BONUS XP ---------- */
export async function giveBonusXp(client, guild, member, amount = 50) {
  try {
    const data = await getUserLevelData(client, guild.id, member.id);

    data.xp += amount;
    data.totalXp += amount;

    await saveUserLevelData(client, guild.id, member.id, data);
  } catch (err) {
    logger.error('Bonus XP Error:', err);
  }
}

/* ---------- RESET USER ---------- */
export async function resetUserXp(client, guild, member) {
  try {
    const data = {
      xp: 0,
      level: 0,
      totalXp: 0,
      messages: 0,
      lastMessage: 0
    };

    await saveUserLevelData(client, guild.id, member.id, data);
  } catch (err) {
    logger.error('Reset XP Error:', err);
  }
}

/* ---------- GET STATS ---------- */
export async function getUserStats(client, guild, member) {
  try {
    const data = await getUserLevelData(client, guild.id, member.id);

    return {
      level: data.level,
      xp: data.xp,
      totalXp: data.totalXp,
      messages: data.messages || 0
    };
  } catch (err) {
    logger.error('Stats Error:', err);
    return null;
  }
}
