import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, numStr, durStr, pctStr, arrowForChange, truncate } from './theme.js';
import { headerBanner, statCard, sectionBg, rowItem, HALF_W, COL_GAP, barChart, footer } from './components.js';

interface ReportData {
  type: 'weekly' | 'monthly';
  guildName: string;
  period: string;
  totalMessages: number;
  totalVoiceMs: number;
  activeUsers: number;
  joins: number;
  leaves: number;
  peakHour: string;
  topUsers: { userId: string; messages: number }[];
  topChannels: { name: string; messages: number }[];
  dailyMessages: number[];
  previousMessages?: number;
  previousVoiceMs?: number;
  previousActiveUsers?: number;
}

export async function renderReport(d: ReportData): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  // ─── HEADER ─────────────────────────────────────────
  const title = d.type === 'weekly' ? 'Weekly Report' : 'Monthly Report';
  headerBanner(ctx, y, title, `${d.guildName} • ${d.period}`, {
    rightLabel: d.type === 'weekly' ? 'This Week' : 'This Month',
    rightValue: numStr(d.totalMessages),
  });
  y += 78;

  // ─── PRIMARY STATS ──────────────────────────────────
  const msgChange = d.previousMessages != null ? pctStr(d.totalMessages, d.previousMessages) : null;
  const voiceChange = d.previousVoiceMs != null ? pctStr(d.totalVoiceMs, d.previousVoiceMs) : null;
  const userChange = d.previousActiveUsers != null ? pctStr(d.activeUsers, d.previousActiveUsers) : null;

  const stats = [
    { label: 'Messages', value: numStr(d.totalMessages), color: T.accentBright },
    { label: 'Active Users', value: numStr(d.activeUsers) },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h' },
    { label: 'Joins', value: numStr(d.joins), color: T.green },
    { label: 'Leaves', value: numStr(d.leaves), color: T.red },
  ];
  const statW = (W - PAD * 2 - COL_GAP * (stats.length - 1)) / stats.length;
  const statH = 72;
  for (let i = 0; i < stats.length; i++) {
    statCard(ctx, PAD + i * (statW + COL_GAP), y, statW, statH, stats[i].label, stats[i].value, stats[i].color);
  }
  y += statH + 14;

  // ─── MAIN CONTENT ───────────────────────────────────
  const contentH = H - y - PAD - 44;
  const colH = Math.floor((contentH - COL_GAP) / 2);
  const leftX = PAD;
  const rightX = PAD + HALF_W + COL_GAP;

  // ── TOP LEFT: Daily Trend ──
  sectionBg(ctx, leftX, y, HALF_W, colH);
  fillRect(ctx, leftX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'DAILY MESSAGES', leftX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  barChart(ctx, leftX + 50, y + 44, HALF_W - 70, colH - 64, d.dailyMessages, {
    labels: d.dailyMessages.map((_, i) => `${i + 1}`),
    showValues: true,
  });

  // ── TOP RIGHT: Top Users ──
  sectionBg(ctx, rightX, y, HALF_W, colH);
  fillRect(ctx, rightX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'TOP USERS', rightX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const maxMsg = d.topUsers[0]?.messages || 1;
  const userRowH = Math.min(34, (colH - 42) / Math.min(d.topUsers.length, 10));
  for (let i = 0; i < Math.min(d.topUsers.length, 10); i++) {
    const ry = y + 40 + i * userRowH;
    const u = d.topUsers[i];
    const pct = maxMsg > 0 ? u.messages / maxMsg : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.accent : i === 2 ? T.accentSoft : T.textDim;
    rowItem(ctx, rightX, ry, HALF_W, userRowH, {
      rank: i + 1,
      rankColor,
      label: truncate(ctx, u.userId, HALF_W - 200, { size: 13 }),
      value: numStr(u.messages),
      barPct: pct,
      isLast: i === Math.min(d.topUsers.length, 10) - 1,
    });
  }

  y += colH + COL_GAP;

  // ── BOTTOM LEFT: Top Channels ──
  sectionBg(ctx, leftX, y, HALF_W, colH);
  fillRect(ctx, leftX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'TOP CHANNELS', leftX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const maxCh = d.topChannels[0]?.messages || 1;
  const chRowH = Math.min(34, (colH - 42) / Math.min(d.topChannels.length, 10));
  for (let i = 0; i < Math.min(d.topChannels.length, 10); i++) {
    const ry = y + 40 + i * chRowH;
    const ch = d.topChannels[i];
    const pct = maxCh > 0 ? ch.messages / maxCh : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.accent : i === 2 ? T.accentSoft : T.textDim;
    rowItem(ctx, leftX, ry, HALF_W, chRowH, {
      rank: i + 1,
      rankColor,
      label: '#' + truncate(ctx, ch.name, HALF_W - 200, { size: 13 }),
      value: numStr(ch.messages),
      barPct: pct,
      isLast: i === Math.min(d.topChannels.length, 10) - 1,
    });
  }

  // ── BOTTOM RIGHT: Summary ──
  sectionBg(ctx, rightX, y, HALF_W, colH);
  fillRect(ctx, rightX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'PERIOD SUMMARY', rightX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const net = d.joins - d.leaves;
  const summaryItems = [
    { label: 'Net Growth', value: `${net >= 0 ? '+' : ''}${numStr(net)}`, color: net >= 0 ? T.green : T.red },
    { label: 'Messages/Day', value: numStr(Math.round(d.totalMessages / (d.type === 'weekly' ? 7 : 30))) },
    { label: 'Voice/Day', value: (d.totalVoiceMs / (d.type === 'weekly' ? 7 : 30) / 3600000).toFixed(1) + 'h' },
    { label: 'Peak Hour', value: d.peakHour },
    { label: 'Msgs/User', value: d.activeUsers > 0 ? numStr(Math.round(d.totalMessages / d.activeUsers)) : '—' },
  ];

  let ry = y + 48;
  for (const item of summaryItems) {
    text(ctx, item.label.toUpperCase(), rightX + 16, ry, { size: 11, weight: 600, color: T.textDim });
    text(ctx, item.value, rightX + HALF_W - 16, ry, { size: 16, weight: 700, color: item.color || T.text, align: 'right' });
    ry += 32;
    fillRect(ctx, rightX + 16, ry - 8, HALF_W - 32, 1, T.border);
  }

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}

// Backward-compatible aliases used by commands/index.ts
interface WeeklyReportData {
  guildName: string;
  period: string;
  totalMessages: number;
  totalVoiceMs: number;
  uniqueUsers: number;
  joins: number;
  leaves: number;
  peakHour: string;
  peakDay?: string;
  topUsers: { userId: string; messages: number }[];
  topChannels: { channelId: string; messages: number }[];
  dailyMessages: number[];
  hourlyByDay?: number[][];
  prevMessages?: number;
}

export async function renderWeeklyReport(d: WeeklyReportData): Promise<Buffer> {
  return renderReport({
    type: 'weekly',
    guildName: d.guildName,
    period: d.period,
    totalMessages: d.totalMessages,
    totalVoiceMs: d.totalVoiceMs,
    activeUsers: d.uniqueUsers,
    joins: d.joins,
    leaves: d.leaves,
    peakHour: d.peakHour,
    topUsers: d.topUsers,
    topChannels: d.topChannels.map(c => ({ name: c.channelId, messages: c.messages })),
    dailyMessages: d.dailyMessages,
    previousMessages: d.prevMessages,
  });
}

export async function renderMonthlyReport(d: WeeklyReportData): Promise<Buffer> {
  return renderReport({
    type: 'monthly',
    guildName: d.guildName,
    period: d.period,
    totalMessages: d.totalMessages,
    totalVoiceMs: d.totalVoiceMs,
    activeUsers: d.uniqueUsers,
    joins: d.joins,
    leaves: d.leaves,
    peakHour: d.peakHour,
    topUsers: d.topUsers,
    topChannels: d.topChannels.map(c => ({ name: c.channelId, messages: c.messages })),
    dailyMessages: d.dailyMessages,
    previousMessages: d.prevMessages,
  });
}
