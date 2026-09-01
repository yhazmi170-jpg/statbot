import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, truncate, numStr, durStr } from './theme.js';
import { headerBanner, statCard, HALF_W, COL_GAP, sectionBg, lineChart, heatmap, barChart, rowItem, footer } from './components.js';

interface Channel { name?: string; channelId?: string; messages: number; voiceMs?: number }
interface Hourly { hour: number; messages: number }
interface Data {
  guildName?: string;
  guild?: { name: string; memberCount?: number };
  guildId?: string;
  iconUrl?: string;
  period?: string;
  totalMessages: number;
  activeUsers?: number;
  uniqueUsers?: number;
  totalVoiceMs: number;
  topChannels: Channel[];
  topUsers: { userId: string; messages: number }[];
  hourlyActivity?: Hourly[];
  hourlyByDay?: number[][];
  heatmapGrid?: number[][];
  weekdayMessages?: number[];
  hourLabels?: string[];
  dailyStats?: { totalMessages: number }[];
}

export async function renderServerStats(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  const guildName = d.guildName || d.guild?.name || 'Server';
  const totalMessages = d.totalMessages;
  const activeUsers = d.activeUsers || d.uniqueUsers || 0;
  const period = d.period || 'Last 30 Days';

  // Build hourly activity from hourlyByDay if not provided
  let hourlyActivity: Hourly[];
  if (d.hourlyActivity) {
    hourlyActivity = d.hourlyActivity;
  } else if (d.hourlyByDay) {
    hourlyActivity = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      messages: d.hourlyByDay!.reduce((sum, day) => sum + (day[h] || 0), 0),
    }));
  } else {
    hourlyActivity = Array.from({ length: 24 }, (_, h) => ({ hour: h, messages: 0 }));
  }

  // Build heatmap grid
  const heatmapGrid = d.heatmapGrid || d.hourlyByDay || Array.from({ length: 7 }, () => Array(24).fill(0));

  // Map topChannels to have name field
  const topChannels = d.topChannels.map(c => ({
    name: c.name || c.channelId || 'unknown',
    messages: c.messages,
    voiceMs: c.voiceMs || 0,
  }));

  let y = PAD;

  // ─── HEADER ─────────────────────────────────────────
  headerBanner(ctx, y, 'StatBot', `${guildName} • ${period}`, {
    rightLabel: 'Total Messages',
    rightValue: numStr(totalMessages),
  });
  y += 78;

  // ─── PRIMARY STATS ROW ──────────────────────────────
  const peak = hourlyActivity.reduce((a, b) => b.messages > a.messages ? b : a, { hour: 0, messages: 0 });
  const stats = [
    { label: 'Messages', value: numStr(totalMessages), color: T.accentBright },
    { label: 'Active Users', value: numStr(activeUsers) },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h' },
    { label: 'Top Channel', value: topChannels[0] ? '#' + truncate(ctx, topChannels[0].name, 100, { size: 20 }) : '—' },
    { label: 'Peak Hour', value: `${String(peak.hour).padStart(2, '0')}:00` },
  ];
  const statW = (W - PAD * 2 - COL_GAP * (stats.length - 1)) / stats.length;
  const statH = 72;
  for (let i = 0; i < stats.length; i++) {
    statCard(ctx, PAD + i * (statW + COL_GAP), y, statW, statH, stats[i].label, stats[i].value, stats[i].color);
  }
  y += statH + 14;

  // ─── MAIN CONTENT: 2 columns ────────────────────────
  const contentH = H - y - PAD - 50;
  const colH = Math.floor((contentH - COL_GAP) / 2);
  const leftX = PAD;
  const rightX = PAD + HALF_W + COL_GAP;

  // ── TOP LEFT: Message Activity ──
  sectionBg(ctx, leftX, y, HALF_W, colH);
  fillRect(ctx, leftX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'MESSAGE ACTIVITY', leftX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  text(ctx, 'Last 7 Days', leftX + 16, y + 22, { size: 10, color: T.textDim });

  const chartAreaY = y + 40;
  const chartAreaH = colH - 50;
  barChart(ctx, leftX + 50, chartAreaY, HALF_W - 70, chartAreaH - 10, hourlyActivity.map(h => h.messages), {
    labels: hourlyActivity.map(h => `${String(h.hour).padStart(2, '0')}`),
    showValues: true,
  });

  // ── TOP RIGHT: Top Users ──
  sectionBg(ctx, rightX, y, HALF_W, colH);
  fillRect(ctx, rightX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'TOP USERS', rightX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  text(ctx, `${d.topUsers.length} users`, rightX + 16, y + 22, { size: 10, color: T.textDim });

  const maxMsg = d.topUsers[0]?.messages || 1;
  const userRowH = Math.min(36, (colH - 42) / Math.min(d.topUsers.length, 15));
  for (let i = 0; i < Math.min(d.topUsers.length, 15); i++) {
    const ry = y + 40 + i * userRowH;
    const u = d.topUsers[i];
    const pct = maxMsg > 0 ? u.messages / maxMsg : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.accent : i === 2 ? T.accentSoft : T.textDim;
    rowItem(ctx, rightX, ry, HALF_W, userRowH, {
      rank: i + 1,
      rankColor,
      label: truncate(ctx, u.userId, HALF_W - 200, { size: 14 }),
      value: numStr(u.messages),
      barPct: pct,
      isLast: i === Math.min(d.topUsers.length, 15) - 1,
    });
  }

  y += colH + COL_GAP;

  // ── BOTTOM LEFT: Top Channels ──
  sectionBg(ctx, leftX, y, HALF_W, colH);
  fillRect(ctx, leftX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'TOP CHANNELS', leftX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  text(ctx, `${topChannels.length} channels`, leftX + 16, y + 22, { size: 10, color: T.textDim });

  const maxCh = topChannels[0]?.messages || 1;
  const chRowH = Math.min(36, (colH - 42) / Math.min(topChannels.length, 15));
  for (let i = 0; i < Math.min(topChannels.length, 15); i++) {
    const ry = y + 40 + i * chRowH;
    const ch = topChannels[i];
    const pct = maxCh > 0 ? ch.messages / maxCh : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.accent : i === 2 ? T.accentSoft : T.textDim;
    rowItem(ctx, leftX, ry, HALF_W, chRowH, {
      rank: i + 1,
      rankColor,
      label: '#' + truncate(ctx, ch.name, HALF_W - 200, { size: 14 }),
      value: numStr(ch.messages),
      barPct: pct,
      isLast: i === Math.min(topChannels.length, 15) - 1,
    });
  }

  // ── BOTTOM RIGHT: Heatmap ──
  sectionBg(ctx, rightX, y, HALF_W, colH);
  fillRect(ctx, rightX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'ACTIVITY HEATMAP', rightX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  text(ctx, 'Hourly Activity', rightX + 16, y + 22, { size: 10, color: T.textDim });

  heatmap(ctx, rightX + 14, y + 42, HALF_W - 28, colH - 52, heatmapGrid);

  // ─── FOOTER ─────────────────────────────────────────
  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
