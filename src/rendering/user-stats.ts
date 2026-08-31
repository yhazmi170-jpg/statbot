import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, numStr, durStr, PAD } from './theme.js';
import { sectionBg, lineChart, barList, footer, COL_GAP, HALF_W } from './components.js';

interface Data {
  user: { username: string; avatarUrl?: string };
  rank: number;
  totalMembers: number;
  totalMessages: number;
  totalVoiceMs: number;
  voiceSessions: number;
  activeDays: number;
  totalDays: number;
  topChannels: { channelId: string; messages: number }[];
  dailyMessages: number[];
  weekdayMessages: number[];
  hourlyMessages: number[];
  percentile: number;
  msgsThisWeek: number;
  msgsThisMonth: number;
  voiceThisWeek: number;
  voiceThisMonth: number;
}

export async function renderUserStats(d: Data): Promise<Buffer> {
  const W = 1400, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  // ─── HEADER ─────────────────────────────────────────
  fillRect(ctx, PAD, y, W - PAD * 2, 68, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);

  // Avatar placeholder
  fillRect(ctx, PAD + 14, y + 12, 44, 44, T.accentSoft, 22);

  text(ctx, d.user.username, PAD + 68, y + 10, { size: 18, weight: 700, color: T.text });
  text(ctx, 'PERSONAL STATISTICS', PAD + 68, y + 32, { size: 11, weight: 600, color: T.textDim });
  text(ctx, 'Last 30 Days', PAD + 68, y + 48, { size: 10, color: T.textFaint });

  text(ctx, `#${d.rank}`, W - PAD - 16, y + 8, { size: 28, weight: 700, color: T.accentBright, align: 'right' });
  text(ctx, `of ${d.totalMembers}`, W - PAD - 16, y + 42, { size: 10, color: T.textMuted, align: 'right' });
  y += 80;

  // ─── STAT ROW ───────────────────────────────────────
  const stats = [
    { label: 'Messages', value: numStr(d.totalMessages), color: T.accentBright },
    { label: 'Voice', value: durStr(d.totalVoiceMs), color: T.accent },
    { label: 'Activity', value: d.totalDays > 0 ? Math.round((d.activeDays / d.totalDays) * 100) + '%' : '0%', color: T.green },
    { label: 'Rank', value: `#${d.rank}`, color: T.yellow },
    { label: 'Sessions', value: String(d.voiceSessions), color: T.accentSoft },
  ];
  const statW = (W - PAD * 2 - COL_GAP * (stats.length - 1)) / stats.length;
  for (let i = 0; i < stats.length; i++) {
    const sx = PAD + i * (statW + COL_GAP);
    fillRect(ctx, sx, y, statW, 52, T.panel, 6);
    fillRect(ctx, sx, y, statW, 1, T.border);
    text(ctx, stats[i].label.toUpperCase(), sx + 12, y + 8, { size: 10, weight: 600, color: T.textDim });
    text(ctx, stats[i].value, sx + 12, y + 26, { size: 18, weight: 700, color: stats[i].color });
  }
  y += 64;

  // ─── MAIN ROW (chart + channels) ────────────────────
  const mainH = 240;

  sectionBg(ctx, PAD, y, HALF_W, mainH);
  const dayLabels = Array.from({ length: d.dailyMessages.length }, (_, i) => String(i + 1));
  const ls = Math.max(1, Math.floor(dayLabels.length / 7));
  lineChart(ctx, PAD + 4, y + 2, HALF_W - 8, mainH - 4, d.dailyMessages, {
    title: 'MESSAGE ACTIVITY',
    labels: dayLabels.filter((_, i) => i % ls === 0),
    color: T.accentBright,
  });

  sectionBg(ctx, PAD + HALF_W + COL_GAP, y, HALF_W, mainH);
  barList(ctx, PAD + HALF_W + COL_GAP + 4, y + 2, HALF_W - 8, d.topChannels.slice(0, 8).map(c => ({
    label: '#' + c.channelId,
    value: c.messages,
  })), { title: 'TOP CHANNELS', height: mainH - 4 });

  y += mainH + 8;

  // ─── BOTTOM ROW (3 columns) ─────────────────────────
  const botH = H - y - PAD - 20;
  const thirdW = (W - PAD * 2 - COL_GAP * 2) / 3;

  // Weekday bars
  sectionBg(ctx, PAD, y, thirdW, botH);
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const wdMax = Math.max(...d.weekdayMessages, 1);
  const wdBarW = (thirdW - 32) / 7;
  text(ctx, 'PEAK DAY', PAD + 12, y + 8, { size: 10, weight: 600, color: T.textDim });
  const peakDayIdx = d.weekdayMessages.indexOf(Math.max(...d.weekdayMessages));
  text(ctx, weekdays[peakDayIdx], PAD + 12, y + 24, { size: 14, weight: 700, color: T.accentBright });
  for (let i = 0; i < 7; i++) {
    const bx = PAD + 16 + i * wdBarW;
    const bh = (d.weekdayMessages[i] / wdMax) * (botH - 52);
    fillRect(ctx, bx + 4, y + botH - 20 - bh, wdBarW - 8, bh, i === peakDayIdx ? T.accentBright : T.accentSoft, 3);
    text(ctx, weekdays[i], bx + wdBarW / 2, y + botH - 14, { size: 9, color: T.textDim, align: 'center' });
  }

  // Peak hours
  sectionBg(ctx, PAD + thirdW + COL_GAP, y, thirdW, botH);
  const peakIdx = d.hourlyMessages.indexOf(Math.max(...d.hourlyMessages));
  const peakStart = Math.max(0, peakIdx - 1);
  const peakEnd = Math.min(23, peakIdx + 1);
  text(ctx, 'PEAK HOURS', PAD + thirdW + COL_GAP + 12, y + 8, { size: 10, weight: 600, color: T.textDim });
  text(ctx, `${String(peakStart).padStart(2, '0')}:00 – ${String(peakEnd + 1).padStart(2, '0')}:00`, PAD + thirdW + COL_GAP + 12, y + 24, { size: 14, weight: 700, color: T.accentBright });

  const sparkX = PAD + thirdW + COL_GAP + 12;
  const sparkY = y + 48;
  const sparkW = thirdW - 24;
  const sparkH = botH - 68;
  const hMax = Math.max(...d.hourlyMessages, 1);
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const px = sparkX + (i / 23) * sparkW;
    const py = sparkY + sparkH - (d.hourlyMessages[i] / hMax) * sparkH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = T.accentBright;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Percentile
  sectionBg(ctx, PAD + (thirdW + COL_GAP) * 2, y, thirdW, botH);
  text(ctx, 'SERVER PERCENTILE', PAD + (thirdW + COL_GAP) * 2 + 12, y + 8, { size: 10, weight: 600, color: T.textDim });
  if (d.percentile > 0) {
    text(ctx, `${d.percentile}%`, PAD + (thirdW + COL_GAP) * 2 + 12, y + 26, { size: 28, weight: 700, color: T.accentBright });
    text(ctx, `More active than ${d.percentile}%`, PAD + (thirdW + COL_GAP) * 2 + 12, y + 60, { size: 10, color: T.textMuted });
    text(ctx, 'of server members', PAD + (thirdW + COL_GAP) * 2 + 12, y + 74, { size: 10, color: T.textMuted });
    fillRect(ctx, PAD + (thirdW + COL_GAP) * 2 + 12, y + botH - 24, thirdW - 24, 8, T.panelAlt, 4);
    fillRect(ctx, PAD + (thirdW + COL_GAP) * 2 + 12, y + botH - 24, (thirdW - 24) * (d.percentile / 100), 8, T.accentBright, 4);
  }

  footer(ctx, 'StatBot • m?help for commands');

  return canvas.toBuffer('image/png');
}
