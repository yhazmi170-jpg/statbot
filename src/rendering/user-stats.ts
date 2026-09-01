import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, STAT_W, STAT_H, GRID_TOP, fillRect, text, numStr, durStr, THEME } from './theme.js';
import { headerBanner, statCard, panelBg, panelHeader, panelContentY, barChart, rowItem, footer, sanitizeText, formatPeakHour } from './components.js';

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

  const username = sanitizeText(d.username || d.user?.username || d.userId || 'User');
  const totalUsers = d.totalUsers || d.totalMembers || 0;
  const guildName = d.guildName || '';

  let hourlyActivity: Hourly[];
  if (d.hourlyActivity) {
    hourlyActivity = d.hourlyActivity;
  } else if (d.hourlyMessages) {
    hourlyActivity = d.hourlyMessages.map((messages, hour) => ({ hour, messages }));
  } else {
    hourlyActivity = Array.from({ length: 24 }, (_, h) => ({ hour: h, messages: 0 }));
  }

  const peakHour = d.peakHour ?? hourlyActivity.reduce((a, b) => b.messages > a.messages ? b : a, { hour: 0, messages: 0 }).hour;

  const topChannels = d.topChannels.map(c => ({
    name: sanitizeText(c.name || c.channelId || 'unknown'),
    messages: c.messages,
    voiceMs: c.voiceMs || 0,
  }));

  // Header with avatar
  fillRect(ctx, PAD, PAD, W - PAD * 2, 80, T.panel, THEME.borderRadius);

  const avatarSize = 56;
  const avatarX = PAD + 20;
  const avatarY = PAD + 12;
  fillRect(ctx, avatarX, avatarY, avatarSize, avatarSize, T.accentDim, avatarSize / 2);
  text(ctx, username.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 - 12, { size: 26, weight: 700, color: T.text, align: 'center' });

  const textX = avatarX + avatarSize + 16;
  text(ctx, username, textX, PAD + 16, { size: 28, weight: 700, color: T.text });
  text(ctx, `${guildName}  •  Last ${d.totalDays} Days`, textX, PAD + 48, { size: 16, weight: 500, color: T.textMuted });

  text(ctx, `#${d.rank}`, W - PAD - 24, PAD + 12, { size: 44, weight: 700, color: T.accentBright, align: 'right' });
  text(ctx, `of ${numStr(totalUsers)} users`, W - PAD - 24, PAD + 52, { size: 13, weight: 500, color: T.textMuted, align: 'right' });

  const stats = [
    { label: 'Messages', value: numStr(d.totalMessages), color: T.accentBright },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h' },
    { label: 'Active Days', value: `${d.activeDays}/${d.totalDays}` },
    { label: 'Peak Hour', value: formatPeakHour(peakHour) },
    { label: 'Percentile', value: `Top ${d.percentile}%` },
  ];
  for (let i = 0; i < stats.length; i++) {
    statCard(ctx, i, stats[i].label, stats[i].value, stats[i].color);
  }

  const tl = PANELS.topLeft;
  panelBg(ctx, tl);
  panelHeader(ctx, tl, 'Activity by Hour');
  barChart(ctx, tl.x + 50, panelContentY(tl), tl.w - 70, tl.h - 55,
    hourlyActivity.map(h => h.messages), {
      labels: hourlyActivity.map(h => `${String(h.hour).padStart(2, '0')}`),
      showValues: true,
    });

  const tr = PANELS.topRight;
  panelBg(ctx, tr);
  panelHeader(ctx, tr, 'Activity by Weekday');
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  barChart(ctx, tr.x + 50, panelContentY(tr), tr.w - 70, tr.h - 55,
    d.weekdayMessages, { labels: dayLabels, showValues: true, color: T.accent });

  const bl = PANELS.bottomLeft;
  const br = PANELS.bottomRight;
  const fullW = bl.w + GAP + br.w;
  panelBg(ctx, { x: bl.x, y: bl.y, w: fullW, h: bl.h });
  panelHeader(ctx, { x: bl.x, y: bl.y, w: fullW }, 'Top Channels', `${topChannels.length} channels`);

  const maxCh = topChannels[0]?.messages || 1;
  const chCols = 2;
  const chColW = (fullW - GAP) / chCols;
  const chPerCol = Math.ceil(Math.min(topChannels.length, 10) / chCols);
  const chRowH = Math.floor((bl.h - 50) / chPerCol);

  for (let ci = 0; ci < chCols; ci++) {
    const cx = bl.x + ci * (chColW + GAP);
    for (let i = 0; i < chPerCol; i++) {
      const idx = ci * chPerCol + i;
      if (idx >= Math.min(topChannels.length, 10)) break;
      const ch = topChannels[idx];
      const ry = panelContentY(bl) + i * chRowH;
      const pct = maxCh > 0 ? ch.messages / maxCh : 0;
      const rankColor = idx === 0 ? T.accentBright : idx === 1 ? T.textSecondary : idx === 2 ? T.textMuted : T.textDim;
      rowItem(ctx, cx, ry, chColW, chRowH, {
        rank: idx + 1,
        rankColor,
        label: ch.name,
        value: numStr(ch.messages),
        barPct: pct,
        isLast: i === chPerCol - 1,
      });
    }
  }

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
