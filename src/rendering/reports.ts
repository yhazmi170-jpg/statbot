import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, fillRect, text, numStr } from './theme.js';
import { headerBanner, statCard, panelBg, panelHeader, panelContentY, barChart, rowItem, heatmap, footer, COL_GAP, sanitizeText, panelClip, panelRestore } from './components.js';

interface ReportData {
  type: 'weekly' | 'monthly';
  guildName: string; period: string;
  totalMessages: number; totalVoiceMs: number; activeUsers: number;
  joins: number; leaves: number; peakHour: string;
  topUsers: { userId: string; messages: number }[];
  topChannels: { name: string; messages: number }[];
  dailyMessages: number[];
  previousMessages?: number;
}

export async function renderReport(d: ReportData): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  const title = d.type === 'weekly' ? 'Weekly Report' : 'Monthly Report';
  headerBanner(ctx, title, `${sanitizeText(d.guildName)} • ${d.period}`, {
    rightLabel: d.type === 'weekly' ? 'This Week' : 'This Month',
    rightValue: numStr(d.totalMessages),
  });

  const stats = [
    { label: 'Messages', value: numStr(d.totalMessages), color: T.accentBright },
    { label: 'Active Users', value: numStr(d.activeUsers) },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h' },
    { label: 'Joins', value: numStr(d.joins), color: T.green },
    { label: 'Leaves', value: numStr(d.leaves), color: T.red },
  ];
  for (let i = 0; i < stats.length; i++) statCard(ctx, i, stats[i].label, stats[i].value, stats[i].color);

  const tl = PANELS.topLeft;
  panelBg(ctx, tl);
  panelClip(ctx, tl);
  panelHeader(ctx, tl, 'Daily Messages');
  barChart(ctx, tl.x + 50, panelContentY(tl), tl.w - 70, tl.h - 55,
    d.dailyMessages, { labels: d.dailyMessages.map((_, i) => `${i + 1}`), showValues: false });
  panelRestore(ctx);

  const tr = PANELS.topRight;
  panelBg(ctx, tr);
  panelClip(ctx, tr);
  panelHeader(ctx, tr, 'Top Users');
  const maxMsg = d.topUsers[0]?.messages || 1;
  const userRowH = Math.floor((tr.h - 44) / Math.min(d.topUsers.length, 10));
  for (let i = 0; i < Math.min(d.topUsers.length, 10); i++) {
    const ry = panelContentY(tr) + i * userRowH;
    const u = d.topUsers[i];
    const pct = maxMsg > 0 ? u.messages / maxMsg : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.textSecondary : i === 2 ? T.textMuted : T.textDim;
    rowItem(ctx, tr.x, ry, tr.w, userRowH, {
      rank: i + 1, rankColor,
      label: u.userId,
      value: numStr(u.messages),
      isLast: i === Math.min(d.topUsers.length, 10) - 1,
    });
  }
  panelRestore(ctx);

  const bl = PANELS.bottomLeft;
  panelBg(ctx, bl);
  panelClip(ctx, bl);
  panelHeader(ctx, bl, 'Top Channels');
  const maxCh = d.topChannels[0]?.messages || 1;
  const chRowH = Math.floor((bl.h - 44) / Math.min(d.topChannels.length, 10));
  for (let i = 0; i < Math.min(d.topChannels.length, 10); i++) {
    const ry = panelContentY(bl) + i * chRowH;
    const ch = d.topChannels[i];
    const pct = maxCh > 0 ? ch.messages / maxCh : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.textSecondary : i === 2 ? T.textMuted : T.textDim;
    rowItem(ctx, bl.x, ry, bl.w, chRowH, {
      rank: i + 1, rankColor,
      label: ch.name,
      value: numStr(ch.messages),
      isLast: i === Math.min(d.topChannels.length, 10) - 1,
    });
  }
  panelRestore(ctx);

  const br = PANELS.bottomRight;
  panelBg(ctx, br);
  panelClip(ctx, br);
  panelHeader(ctx, br, 'Period Summary');
  const net = d.joins - d.leaves;
  const summaryItems = [
    { label: 'Net Growth', value: `${net >= 0 ? '+' : ''}${numStr(net)}`, color: net >= 0 ? T.green : T.red },
    { label: 'Messages/Day', value: numStr(Math.round(d.totalMessages / (d.type === 'weekly' ? 7 : 30))) },
    { label: 'Voice/Day', value: (d.totalVoiceMs / (d.type === 'weekly' ? 7 : 30) / 3600000).toFixed(1) + 'h' },
    { label: 'Peak Hour', value: d.peakHour },
    { label: 'Msgs/User', value: d.activeUsers > 0 ? numStr(Math.round(d.totalMessages / d.activeUsers)) : '—' },
  ];
  let ry = panelContentY(br) + 8;
  for (const item of summaryItems) {
    text(ctx, item.label.toUpperCase(), br.x + 16, ry, { size: 13, weight: 700, color: T.textDim });
    text(ctx, item.value, br.x + br.w - 16, ry, { size: 18, weight: 700, color: (item.color as string) || T.text, align: 'right' });
    ry += 38;
    fillRect(ctx, br.x + 16, ry - 8, br.w - 32, 1, T.borderSubtle);
  }
  panelRestore(ctx);

  footer(ctx, 'StatBot  •  m?help for commands');
  return canvas.toBuffer('image/png');
}

interface WeeklyReportData {
  guildName: string; period: string;
  totalMessages: number; totalVoiceMs: number; uniqueUsers: number;
  joins: number; leaves: number; peakHour: string; peakDay?: string;
  topUsers: { userId: string; messages: number }[];
  topChannels: { name: string; messages: number }[];
  dailyMessages: number[];
  hourlyByDay?: number[][]; prevMessages?: number;
}

export async function renderWeeklyReport(d: WeeklyReportData): Promise<Buffer> {
  return renderReport({
    type: 'weekly', guildName: d.guildName, period: d.period,
    totalMessages: d.totalMessages, totalVoiceMs: d.totalVoiceMs, activeUsers: d.uniqueUsers,
    joins: d.joins, leaves: d.leaves, peakHour: d.peakHour,
    topUsers: d.topUsers,
    topChannels: d.topChannels,
    dailyMessages: d.dailyMessages, previousMessages: d.prevMessages,
  });
}

export async function renderMonthlyReport(d: WeeklyReportData): Promise<Buffer> {
  return renderReport({
    type: 'monthly', guildName: d.guildName, period: d.period,
    totalMessages: d.totalMessages, totalVoiceMs: d.totalVoiceMs, activeUsers: d.uniqueUsers,
    joins: d.joins, leaves: d.leaves, peakHour: d.peakHour,
    topUsers: d.topUsers,
    topChannels: d.topChannels,
    dailyMessages: d.dailyMessages, previousMessages: d.prevMessages,
  });
}
