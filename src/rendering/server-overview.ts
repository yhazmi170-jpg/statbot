import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, numStr, durStr, PAD } from './theme.js';
import { sectionBg, footer, COL_GAP, HALF_W, THIRD_W } from './components.js';

interface Data {
  guild: {
    name: string; iconUrl?: string; memberCount: number; onlineCount?: number;
    botCount?: number; channelCount: number; roleCount: number; emojiCount: number;
    boostLevel: number; boostCount: number; createdAt: string; ownerTag?: string;
  };
  totalMessages: number;
  totalVoiceMs: number;
  uniqueUsers: number;
  msgsPerDay: number;
  peakHour: string;
  peakDay: string;
  joins: number;
  leaves: number;
}

export async function renderServerOverview(d: Data): Promise<Buffer> {
  const W = 1400, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);
  let y = PAD;

  // Header
  fillRect(ctx, PAD, y, W - PAD * 2, 68, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  fillRect(ctx, PAD + 14, y + 12, 44, 44, T.accentSoft, 22);
  text(ctx, d.guild.name.toUpperCase(), PAD + 68, y + 10, { size: 18, weight: 700, color: T.accentBright });
  text(ctx, 'SERVER OVERVIEW', PAD + 68, y + 32, { size: 11, weight: 600, color: T.textDim });
  text(ctx, `Created ${d.guild.createdAt}`, PAD + 68, y + 48, { size: 10, color: T.textFaint });
  text(ctx, numStr(d.guild.memberCount), W - PAD - 16, y + 8, { size: 22, weight: 700, color: T.accentBright, align: 'right' });
  text(ctx, 'MEMBERS', W - PAD - 16, y + 34, { size: 10, color: T.textDim, align: 'right' });
  text(ctx, `Owner: ${d.guild.ownerTag || 'Unknown'}`, W - PAD - 16, y + 50, { size: 10, color: T.textMuted, align: 'right' });
  y += 80;

  // Info cards
  const infoItems = [
    { label: 'Channels', value: String(d.guild.channelCount) },
    { label: 'Roles', value: String(d.guild.roleCount) },
    { label: 'Emojis', value: String(d.guild.emojiCount) },
    { label: 'Boosts', value: `Lv.${d.guild.boostLevel} (${d.guild.boostCount})` },
    { label: 'Bots', value: String(d.guild.botCount || 0) },
  ];
  const infoW = (W - PAD * 2 - COL_GAP * (infoItems.length - 1)) / infoItems.length;
  for (let i = 0; i < infoItems.length; i++) {
    const ix = PAD + i * (infoW + COL_GAP);
    fillRect(ctx, ix, y, infoW, 48, T.panel, 6);
    fillRect(ctx, ix, y, infoW, 1, T.border);
    text(ctx, infoItems[i].label.toUpperCase(), ix + 10, y + 8, { size: 9, weight: 600, color: T.textDim });
    text(ctx, infoItems[i].value, ix + 10, y + 24, { size: 14, weight: 700, color: T.text });
  }
  y += 60;

  // Activity section
  const colW = (W - PAD * 2 - COL_GAP) / 2;

  sectionBg(ctx, PAD, y, colW, 180);
  text(ctx, 'ACTIVITY', PAD + 12, y + 8, { size: 10, weight: 600, color: T.accentBright });
  const actItems = [
    ['Total Messages', numStr(d.totalMessages)],
    ['Active Users', numStr(d.uniqueUsers)],
    ['Voice Hours', (d.totalVoiceMs / 3600000).toFixed(1) + 'h'],
    ['Messages/Day', numStr(Math.round(d.msgsPerDay))],
    ['Peak Hour', d.peakHour],
    ['Peak Day', d.peakDay],
  ];
  for (let i = 0; i < actItems.length; i++) {
    const iy = y + 26 + i * 24;
    text(ctx, actItems[i][0], PAD + 12, iy, { size: 10, color: T.textMuted });
    text(ctx, actItems[i][1], PAD + colW - 12, iy, { size: 10, weight: 600, color: T.text, align: 'right' });
  }

  sectionBg(ctx, PAD + colW + COL_GAP, y, colW, 180);
  text(ctx, 'GROWTH', PAD + colW + COL_GAP + 12, y + 8, { size: 10, weight: 600, color: T.accentBright });
  const net = d.joins - d.leaves;
  const growItems = [
    ['Joined', numStr(d.joins), T.green],
    ['Left', numStr(d.leaves), T.red],
    ['Net Growth', `${net >= 0 ? '+' : ''}${numStr(net)}`, net >= 0 ? T.green : T.red],
    ['Growth %', d.guild.memberCount > 0 ? ((net / d.guild.memberCount) * 100).toFixed(1) + '%' : '0%', net >= 0 ? T.green : T.red],
  ];
  for (let i = 0; i < growItems.length; i++) {
    const iy = y + 26 + i * 32;
    text(ctx, growItems[i][0], PAD + colW + COL_GAP + 12, iy, { size: 10, color: T.textMuted });
    text(ctx, growItems[i][1], PAD + colW + COL_GAP + colW - 12, iy, { size: 14, weight: 700, color: growItems[i][2], align: 'right' });
  }
  y += 192;

  // Bottom row
  const botH = H - y - PAD - 20;

  sectionBg(ctx, PAD, y, colW, botH);
  text(ctx, 'RECENT GROWTH', PAD + 12, y + 8, { size: 10, weight: 600, color: T.accentBright });
  // Mini bar chart for joins vs leaves
  const barMax = Math.max(d.joins, d.leaves, 1);
  const barArea = botH - 40;
  fillRect(ctx, PAD + 30, y + 30, 60, barArea, T.panelAlt, 4);
  const joinH = (d.joins / barMax) * barArea;
  fillRect(ctx, PAD + 30, y + 30 + barArea - joinH, 60, joinH, T.green, 4);
  fillRect(ctx, PAD + 110, y + 30, 60, barArea, T.panelAlt, 4);
  const leaveH = (d.leaves / barMax) * barArea;
  fillRect(ctx, PAD + 110, y + 30 + barArea - leaveH, 60, leaveH, T.red, 4);
  text(ctx, 'Joins', PAD + 60, y + 30 + barArea + 6, { size: 9, color: T.green, align: 'center' });
  text(ctx, 'Leaves', PAD + 140, y + 30 + barArea + 6, { size: 9, color: T.red, align: 'center' });

  sectionBg(ctx, PAD + colW + COL_GAP, y, colW, botH);
  text(ctx, 'QUICK STATS', PAD + colW + COL_GAP + 12, y + 8, { size: 10, weight: 600, color: T.accentBright });
  const quickItems = [
    ['Avg. Messages/User', d.uniqueUsers > 0 ? numStr(Math.round(d.totalMessages / d.uniqueUsers)) : '—'],
    ['Voice Sessions/User', d.uniqueUsers > 0 ? (d.totalVoiceMs / d.uniqueUsers / 60000).toFixed(1) + 'm' : '—'],
    ['Message/Peak Hour', numStr(Math.round(d.totalMessages / 30))],
  ];
  for (let i = 0; i < quickItems.length; i++) {
    const iy = y + 28 + i * 28;
    text(ctx, quickItems[i][0], PAD + colW + COL_GAP + 12, iy, { size: 10, color: T.textMuted });
    text(ctx, quickItems[i][1], PAD + colW + COL_GAP + colW - 12, iy, { size: 11, weight: 600, color: T.text, align: 'right' });
  }

  footer(ctx, 'StatBot • m?help for commands');

  return canvas.toBuffer('image/png');
}
