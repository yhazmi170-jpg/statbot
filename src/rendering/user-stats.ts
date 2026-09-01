import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, truncate, numStr, durStr, rr } from './theme.js';
import { headerBanner, statCard, sectionBg, barChart, lineChart, rowItem, footer, HALF_W, COL_GAP } from './components.js';

interface Channel { name?: string; channelId?: string; messages: number; voiceMs?: number }
interface Hourly { hour: number; messages: number }
interface Data {
  guildName?: string;
  userId?: string;
  username?: string;
  user?: { username: string; avatarUrl?: string };
  avatarUrl?: string;
  totalMessages: number;
  totalVoiceMs: number;
  activeDays: number;
  totalDays: number;
  firstSeen?: string;
  peakHour?: number;
  topChannels: Channel[];
  hourlyActivity?: Hourly[];
  hourlyMessages?: number[];
  weekdayMessages: number[];
  dailyMessages?: number[];
  rank: number;
  totalUsers?: number;
  totalMembers?: number;
  percentile: number;
  voiceSessions?: number;
  msgsThisWeek?: number;
  msgsThisMonth?: number;
  voiceThisWeek?: number;
  voiceThisMonth?: number;
}

export async function renderUserStats(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  const username = d.username || d.user?.username || d.userId || 'User';
  const totalUsers = d.totalUsers || d.totalMembers || 0;
  const guildName = d.guildName || '';

  // Build hourly activity from hourlyMessages if needed
  let hourlyActivity: Hourly[];
  if (d.hourlyActivity) {
    hourlyActivity = d.hourlyActivity;
  } else if (d.hourlyMessages) {
    hourlyActivity = d.hourlyMessages.map((messages, hour) => ({ hour, messages }));
  } else {
    hourlyActivity = Array.from({ length: 24 }, (_, h) => ({ hour: h, messages: 0 }));
  }

  const peakHour = d.peakHour ?? hourlyActivity.reduce((a, b) => b.messages > a.messages ? b : a, { hour: 0, messages: 0 }).hour;

  // Map topChannels
  const topChannels = d.topChannels.map(c => ({
    name: c.name || c.channelId || 'unknown',
    messages: c.messages,
    voiceMs: c.voiceMs || 0,
  }));

  let y = PAD;

  // ─── HEADER ─────────────────────────────────────────
  fillRect(ctx, PAD, y, W - PAD * 2, 80, T.panel, 8);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);

  // Avatar circle
  const avatarSize = 52;
  const avatarX = PAD + 16;
  const avatarY = y + 14;
  fillRect(ctx, avatarX, avatarY, avatarSize, avatarSize, T.accentSoft, avatarSize / 2);
  text(ctx, username.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 - 10, { size: 22, weight: 700, color: T.accentBright, align: 'center' });

  // Username + server
  const textX = avatarX + avatarSize + 14;
  text(ctx, truncate(ctx, username, 300, { size: 24 }), textX, y + 14, { size: 24, weight: 700, color: T.text });
  text(ctx, `${guildName}  •  Last ${d.totalDays} Days`, textX, y + 44, { size: 12, color: T.textMuted });

  // Rank badge
  text(ctx, `#${d.rank}`, W - PAD - 20, y + 14, { size: 32, weight: 700, color: T.accentBright, align: 'right' });
  text(ctx, `of ${numStr(totalUsers)} users`, W - PAD - 20, y + 50, { size: 11, color: T.textMuted, align: 'right' });

  y += 94;

  // ─── PRIMARY STATS ──────────────────────────────────
  const stats = [
    { label: 'Messages', value: numStr(d.totalMessages), color: T.accentBright },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h' },
    { label: 'Active Days', value: `${d.activeDays}/${d.totalDays}` },
    { label: 'Peak Hour', value: `${String(peakHour).padStart(2, '0')}:00` },
    { label: 'Percentile', value: `Top ${d.percentile}%` },
  ];
  const statW = (W - PAD * 2 - COL_GAP * (stats.length - 1)) / stats.length;
  const statH = 72;
  for (let i = 0; i < stats.length; i++) {
    statCard(ctx, PAD + i * (statW + COL_GAP), y, statW, statH, stats[i].label, stats[i].value, stats[i].color);
  }
  y += statH + 14;

  // ─── MAIN CONTENT ───────────────────────────────────
  const contentH = H - y - PAD - 50;
  const colH = Math.floor((contentH - COL_GAP) / 2);
  const leftX = PAD;
  const rightX = PAD + HALF_W + COL_GAP;

  // ── TOP LEFT: Activity by Hour ──
  sectionBg(ctx, leftX, y, HALF_W, colH);
  fillRect(ctx, leftX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'ACTIVITY BY HOUR', leftX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  barChart(ctx, leftX + 50, y + 44, HALF_W - 70, colH - 64, hourlyActivity.map(h => h.messages), {
    labels: hourlyActivity.map(h => `${String(h.hour).padStart(2, '0')}`),
    showValues: true,
  });

  // ── TOP RIGHT: Activity by Weekday ──
  sectionBg(ctx, rightX, y, HALF_W, colH);
  fillRect(ctx, rightX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'ACTIVITY BY WEEKDAY', rightX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  barChart(ctx, rightX + 50, y + 44, HALF_W - 70, colH - 64, d.weekdayMessages, {
    labels: dayLabels,
    showValues: true,
    color: T.accent,
  });

  y += colH + COL_GAP;

  // ── BOTTOM: Top Channels ──
  sectionBg(ctx, leftX, y, W - PAD * 2, colH);
  fillRect(ctx, leftX, y, W - PAD * 2, 34, T.panelAlt, 0);
  text(ctx, 'TOP CHANNELS', leftX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  text(ctx, `${topChannels.length} channels`, leftX + 16, y + 22, { size: 10, color: T.textDim });

  const maxCh = topChannels[0]?.messages || 1;
  const chCols = 2;
  const chColW = (W - PAD * 2 - COL_GAP) / chCols;
  const chPerCol = Math.ceil(Math.min(topChannels.length, 10) / chCols);
  const chRowH = Math.min(32, (colH - 42) / chPerCol);

  for (let ci = 0; ci < chCols; ci++) {
    const cx = leftX + ci * (chColW + COL_GAP);
    for (let i = 0; i < chPerCol; i++) {
      const idx = ci * chPerCol + i;
      if (idx >= Math.min(topChannels.length, 10)) break;
      const ch = topChannels[idx];
      const ry = y + 40 + i * chRowH;
      const pct = maxCh > 0 ? ch.messages / maxCh : 0;
      const rankColor = idx === 0 ? T.accentBright : idx === 1 ? T.accent : idx === 2 ? T.accentSoft : T.textDim;
      rowItem(ctx, cx, ry, chColW, chRowH, {
        rank: idx + 1,
        rankColor,
        label: '#' + truncate(ctx, ch.name, chColW - 200, { size: 13 }),
        value: numStr(ch.messages),
        barPct: pct,
        isLast: i === chPerCol - 1,
      });
    }
  }

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
