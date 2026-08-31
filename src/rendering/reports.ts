import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, numStr, durStr, PAD } from './theme.js';
import { sectionBg, lineChart, barList, heatmap, leaderboard, footer, COL_GAP, HALF_W } from './components.js';

interface Data {
  guildName: string;
  period: string;
  totalMessages: number;
  totalVoiceMs: number;
  uniqueUsers: number;
  joins: number;
  leaves: number;
  peakHour: string;
  peakDay: string;
  topUsers: { userId: string; messages: number }[];
  topChannels: { channelId: string; messages: number }[];
  dailyMessages: number[];
  hourlyByDay: number[][];
  prevMessages?: number;
  prevVoiceMs?: number;
}

export async function renderWeeklyReport(d: Data): Promise<Buffer> {
  const W = 1400, H = 1100;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);
  let y = PAD;

  // Header
  fillRect(ctx, PAD, y, W - PAD * 2, 60, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, `${d.period.toUpperCase()} REPORT`, PAD + 16, y + 8, { size: 16, weight: 700, color: T.accentBright });
  text(ctx, d.guildName, PAD + 16, y + 32, { size: 12, color: T.textMuted });
  y += 72;

  // Stat cards
  const items = [
    { label: 'Messages', value: numStr(d.totalMessages), color: T.accentBright },
    { label: 'Active Users', value: numStr(d.uniqueUsers), color: T.green },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h', color: T.accent },
    { label: 'Joined', value: numStr(d.joins), color: T.green },
    { label: 'Left', value: numStr(d.leaves), color: T.red },
    { label: 'Peak', value: d.peakHour, color: T.yellow },
  ];
  const statW = (W - PAD * 2 - COL_GAP * (items.length - 1)) / items.length;
  for (let i = 0; i < items.length; i++) {
    const sx = PAD + i * (statW + COL_GAP);
    fillRect(ctx, sx, y, statW, 48, T.panel, 6);
    fillRect(ctx, sx, y, statW, 1, T.border);
    text(ctx, items[i].label.toUpperCase(), sx + 10, y + 6, { size: 9, weight: 600, color: T.textDim });
    text(ctx, items[i].value, sx + 10, y + 22, { size: 16, weight: 700, color: items[i].color });
  }
  y += 60;

  // Week-over-week
  if (d.prevMessages) {
    const diff = ((d.totalMessages - d.prevMessages) / d.prevMessages * 100).toFixed(1);
    const arrow = d.totalMessages > d.prevMessages ? '↑' : d.totalMessages < d.prevMessages ? '↓' : '→';
    fillRect(ctx, PAD, y, W - PAD * 2, 28, T.panel, 4);
    text(ctx, `vs Previous: ${arrow} ${diff}% messages`, PAD + 12, y + 7, { size: 10, color: parseFloat(diff) > 0 ? T.green : parseFloat(diff) < 0 ? T.red : T.textDim });
    y += 36;
  }

  // Main content
  const mainH = 200;
  sectionBg(ctx, PAD, y, HALF_W, mainH);
  const dayLabels = d.dailyMessages.map((_, i) => String(i + 1));
  const ls = Math.max(1, Math.floor(dayLabels.length / 7));
  lineChart(ctx, PAD + 4, y + 2, HALF_W - 8, mainH - 4, d.dailyMessages, {
    title: 'DAILY MESSAGES',
    labels: dayLabels.filter((_, i) => i % ls === 0),
    color: T.accentBright,
  });

  sectionBg(ctx, PAD + HALF_W + COL_GAP, y, HALF_W, mainH);
  leaderboard(ctx, PAD + HALF_W + COL_GAP + 4, y + 2, HALF_W - 8, d.topUsers.slice(0, 8).map((u, i) => ({
    rank: i + 1, name: u.userId, value: numStr(u.messages), color: T.accentSoft,
  })), { title: 'TOP USERS', height: mainH - 4 });

  y += mainH + 8;

  // Bottom
  const botH = H - y - PAD - 20;
  sectionBg(ctx, PAD, y, HALF_W, botH);
  barList(ctx, PAD + 4, y + 2, HALF_W - 8, d.topChannels.slice(0, 8).map(c => ({
    label: '#' + c.channelId, value: c.messages,
  })), { title: 'TOP CHANNELS', height: botH - 4 });

  sectionBg(ctx, PAD + HALF_W + COL_GAP, y, HALF_W, botH);
  heatmap(ctx, PAD + HALF_W + COL_GAP + 4, y + 2, HALF_W - 8, botH - 4, d.hourlyByDay, { title: 'ACTIVITY HEATMAP' });

  footer(ctx, 'StatBot • m?help for commands');

  return canvas.toBuffer('image/png');
}

export async function renderMonthlyReport(d: Data): Promise<Buffer> {
  return renderWeeklyReport({ ...d, period: d.period || 'Monthly' });
}
