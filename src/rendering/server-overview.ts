import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, STAT_W, STAT_H, GRID_TOP, fillRect, text, numStr } from './theme.js';
import { headerBanner, statCard, panelBg, panelHeader, panelContentY, areaLineChart, rowItem, heatmap, footer, sanitizeText, formatPeakHour, panelClip, panelRestore } from './components.js';

interface Channel { name?: string; channelId?: string; messages: number; voiceMs?: number }
interface Hourly { hour: number; messages: number }
interface Data {
  guildName?: string;
  guild?: { name: string; memberCount?: number; channelCount?: number; roleCount?: number; emojiCount?: number; boostLevel?: number; boostCount?: number; createdAt?: string; ownerTag?: string };
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
  peakHour?: string;
  peakDay?: string;
  msgsPerDay?: number;
  joins?: number;
  leaves?: number;
}

export async function renderServerOverview(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  const guildName = d.guildName || d.guild?.name || 'Server';
  const totalMessages = d.totalMessages;
  const activeUsers = d.activeUsers || d.uniqueUsers || 0;
  const period = d.period || 'Last 14 Days';

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

  const heatmapGrid = d.heatmapGrid || d.hourlyByDay || Array.from({ length: 7 }, () => Array(24).fill(0));

  const topChannels = d.topChannels.map(c => ({
    name: sanitizeText(c.name || c.channelId || 'unknown'),
    messages: c.messages,
    voiceMs: c.voiceMs || 0,
  }));

  headerBanner(ctx, sanitizeText(guildName), period, {
    rightLabel: 'Total Messages',
    rightValue: numStr(totalMessages),
  });

  const topChName = topChannels[0] ? topChannels[0].name : '—';
  const peakHourStr = d.peakHour || formatPeakHour(hourlyActivity.reduce((a, b) => b.messages > a.messages ? b : a, { hour: 0, messages: 0 }).hour);
  const stats = [
    { label: 'Messages', value: numStr(totalMessages), color: T.accentBright },
    { label: 'Active Users', value: numStr(activeUsers) },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h' },
    { label: 'Top Channel', value: topChName },
    { label: 'Peak Hour', value: peakHourStr },
  ];
  for (let i = 0; i < stats.length; i++) {
    statCard(ctx, i, stats[i].label, stats[i].value, stats[i].color);
  }

  // ─── PANEL 1: Message Activity (topLeft) ───
  const tl = PANELS.topLeft;
  panelBg(ctx, tl);
  const tlContentY = panelContentY(tl);
  const tlContentH = tl.h - 40;
  panelClip(ctx, { x: tl.x, y: tlContentY, w: tl.w, h: tlContentH });
  panelHeader(ctx, tl, 'Message Activity', period);
  areaLineChart(ctx, tl.x + 50, tlContentY, tl.w - 70, tlContentH - 15,
    hourlyActivity.map(h => h.messages), {
      labels: hourlyActivity.map(h => `${String(h.hour).padStart(2, '0')}`),
    });
  panelRestore(ctx);

  // ─── PANEL 2: Top Users (topRight) ───
  const tr = PANELS.topRight;
  panelBg(ctx, tr);
  const trContentY = panelContentY(tr);
  const trContentH = tr.h - 40;
  panelClip(ctx, { x: tr.x, y: trContentY, w: tr.w, h: trContentH });
  panelHeader(ctx, tr, 'Top Users', `${d.topUsers.length} users`);
  const maxMsg = d.topUsers[0]?.messages || 1;
  const userRowH = Math.floor((trContentH - 4) / Math.min(d.topUsers.length, 12));
  for (let i = 0; i < Math.min(d.topUsers.length, 12); i++) {
    const ry = trContentY + i * userRowH;
    const u = d.topUsers[i];
    const pct = maxMsg > 0 ? u.messages / maxMsg : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.textSecondary : i === 2 ? T.textMuted : T.textDim;
    rowItem(ctx, tr.x, ry, tr.w, userRowH, {
      rank: i + 1,
      rankColor,
      label: u.userId,
      value: numStr(u.messages),
      barPct: pct,
      isLast: i === Math.min(d.topUsers.length, 12) - 1,
    });
  }
  panelRestore(ctx);

  // ─── PANEL 3: Top Channels (bottomLeft) ───
  const bl = PANELS.bottomLeft;
  panelBg(ctx, bl);
  const blContentY = panelContentY(bl);
  const blContentH = bl.h - 40;
  panelClip(ctx, { x: bl.x, y: blContentY, w: bl.w, h: blContentH });
  panelHeader(ctx, bl, 'Top Channels', `${topChannels.length} channels`);
  const maxCh = topChannels[0]?.messages || 1;
  const chRowH = Math.floor((blContentH - 4) / Math.min(topChannels.length, 12));
  for (let i = 0; i < Math.min(topChannels.length, 12); i++) {
    const ry = blContentY + i * chRowH;
    const ch = topChannels[i];
    const pct = maxCh > 0 ? ch.messages / maxCh : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.textSecondary : i === 2 ? T.textMuted : T.textDim;
    rowItem(ctx, bl.x, ry, bl.w, chRowH, {
      rank: i + 1,
      rankColor,
      label: ch.name,
      value: numStr(ch.messages),
      barPct: pct,
      isLast: i === Math.min(topChannels.length, 12) - 1,
    });
  }
  panelRestore(ctx);

  // ─── PANEL 4: Activity Heatmap (bottomRight) ───
  const br = PANELS.bottomRight;
  panelBg(ctx, br);
  const brContentY = panelContentY(br);
  const brContentH = br.h - 40;
  panelClip(ctx, { x: br.x, y: brContentY, w: br.w, h: brContentH });
  panelHeader(ctx, br, 'Activity Heatmap', 'Hourly Activity');
  heatmap(ctx, br.x + 16, brContentY, br.w - 32, brContentH - 15, heatmapGrid);
  panelRestore(ctx);

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}