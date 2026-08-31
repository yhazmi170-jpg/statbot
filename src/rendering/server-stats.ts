import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, truncate, numStr, durStr, PAD } from './theme.js';
import { sectionBg, statRow, leaderboard, barList, lineChart, heatmap, footer, COL_GAP, HALF_W } from './components.js';

interface Data {
  guild: { name: string; memberCount: number };
  totalMessages: number;
  totalVoiceMs: number;
  uniqueUsers: number;
  topChannels: { channelId: string; messages: number }[];
  topUsers: { userId: string; messages: number }[];
  dailyStats: { totalMessages: number }[];
  hourlyByDay: number[][];
}

export async function renderServerStats(d: Data): Promise<Buffer> {
  const W = 1400, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  // ─── HEADER ─────────────────────────────────────────
  fillRect(ctx, PAD, y, W - PAD * 2, 68, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, d.guild.name.toUpperCase(), PAD + 16, y + 10, { size: 18, weight: 700, color: T.accentBright });
  text(ctx, 'SERVER STATISTICS', PAD + 16, y + 32, { size: 11, weight: 600, color: T.textDim });
  text(ctx, 'Last 30 Days', PAD + 16, y + 48, { size: 10, color: T.textFaint });
  text(ctx, numStr(d.totalMessages), W - PAD - 16, y + 8, { size: 22, weight: 700, color: T.accentBright, align: 'right' });
  text(ctx, 'MESSAGES', W - PAD - 16, y + 32, { size: 10, color: T.textDim, align: 'right' });
  text(ctx, `${d.uniqueUsers} active users`, W - PAD - 16, y + 48, { size: 10, color: T.textMuted, align: 'right' });
  y += 80;

  // ─── STAT ROW ───────────────────────────────────────
  statRow(ctx, PAD, y, [
    { label: 'Messages', value: numStr(d.totalMessages), color: T.accentBright },
    { label: 'Active Users', value: numStr(d.uniqueUsers), color: T.green },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h', color: T.accent },
    { label: 'Top Channel', value: d.topChannels[0] ? '#' + d.topChannels[0].channelId : '—' },
    { label: 'Peak Hour', value: getPeakHour(d.hourlyByDay) },
  ]);
  y += 68;

  // ─── MAIN ROW ───────────────────────────────────────
  const mainH = 260;

  sectionBg(ctx, PAD, y, HALF_W, mainH);
  const msgDaily = d.dailyStats.map(s => s.totalMessages);
  const dayLabels = ['1', '5', '10', '15', '20', '25', '30'];
  lineChart(ctx, PAD + 4, y + 2, HALF_W - 8, mainH - 4, msgDaily, {
    title: 'MESSAGE ACTIVITY',
    labels: dayLabels,
    color: T.accentBright,
  });

  sectionBg(ctx, PAD + HALF_W + COL_GAP, y, HALF_W, mainH);
  const topUserRows = d.topUsers.slice(0, 8).map((u, i) => ({
    rank: i + 1,
    name: u.userId,
    value: numStr(u.messages),
    color: T.accentSoft,
    pct: d.totalMessages > 0 ? ((u.messages / d.totalMessages) * 100).toFixed(1) + '%' : '',
  }));
  leaderboard(ctx, PAD + HALF_W + COL_GAP, y + 2, HALF_W, topUserRows, { title: 'TOP USERS', height: mainH - 4 });

  y += mainH + 8;

  // ─── BOTTOM ROW ─────────────────────────────────────
  const botH = H - y - PAD - 20;

  sectionBg(ctx, PAD, y, HALF_W, botH);
  barList(ctx, PAD + 4, y + 2, HALF_W - 8, d.topChannels.slice(0, 8).map(c => ({
    label: '#' + c.channelId,
    value: c.messages,
  })), { title: 'TOP CHANNELS', height: botH - 4 });

  sectionBg(ctx, PAD + HALF_W + COL_GAP, y, HALF_W, botH);
  heatmap(ctx, PAD + HALF_W + COL_GAP + 4, y + 2, HALF_W - 8, botH - 4, d.hourlyByDay, { title: 'ACTIVITY HEATMAP' });

  footer(ctx, 'StatBot • m?help for commands');

  return canvas.toBuffer('image/png');
}

function getPeakHour(grid: number[][]): string {
  const totals = Array(24).fill(0);
  for (const day of grid) for (let h = 0; h < 24; h++) totals[h] += day[h] || 0;
  const peak = totals.indexOf(Math.max(...totals));
  return `${String(peak).padStart(2, '0')}:00`;
}
