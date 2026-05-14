import { createCanvas, loadImage } from 'canvas';

export async function generateRankCard({
  user,
  member,
  level,
  xp,
  xpNeeded,
  rank,
}) {
  const width = 800;
  const height = 250;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // ===== BACKGROUND =====
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // ===== CARD =====
  ctx.fillStyle = '#111827';
  ctx.fillRect(20, 20, width - 40, height - 40);

  // ===== AVATAR =====
  const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
  const avatar = await loadImage(avatarURL);

  ctx.save();
  ctx.beginPath();
  ctx.arc(125, 125, 70, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 55, 55, 140, 140);
  ctx.restore();

  // ===== USERNAME =====
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Sans';
  ctx.fillText(member.displayName, 220, 90);

  // ===== LEVEL =====
  ctx.font = '20px Sans';
  ctx.fillStyle = '#22c55e';
  ctx.fillText(`Level: ${level}`, 220, 130);

  // ===== RANK =====
  ctx.fillStyle = '#3b82f6';
  ctx.fillText(`Rank: #${rank || 'N/A'}`, 220, 160);

  // ===== XP TEXT =====
  ctx.fillStyle = '#9ca3af';
  ctx.fillText(`${xp} / ${xpNeeded} XP`, 220, 190);

  // ===== PROGRESS BAR =====
  const barX = 220;
  const barY = 200;
  const barWidth = 500;
  const barHeight = 20;

  const percent = xpNeeded > 0 ? xp / xpNeeded : 0;

  // BG
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // FILL
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(barX, barY, barWidth * percent, barHeight);

  return canvas.toBuffer();
          }
