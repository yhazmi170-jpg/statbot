import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, fillRect, text, numStr, truncate } from './theme.js';
import { headerBanner, statCard, panelBg, panelHeader, panelContentY, barChart, rowItem, heatmap, footer } from './components.js';
import type { FakeReportData } from '../fake/generator.js';

export async function renderFakeReport(d: FakeReportData): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  headerBanner(ctx, `${d.period} Report`, d.guildName, {
    rightLabel: 'Total Messages', rightValue: numStr(d.totalMessages),
  });

  fillRect(ctx, PAD, PAD + 75 + 8, W - PAD * 2, 30, 'rgba(220,38,38,0.08)', 8);
  text(ctx, 'FICTIONAL DATA  •  DEMO', PAD + 16, PAD + 75 + 14, { size: 13, weight: 700, color: T.accentBright });

  const stats = [
    { label: 'Messages', value: numStr(d.totalMessages), color: T.accentBright },
    { label: 'Active Users', value: numStr(d.uniqueUsers) },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h' },
    { label: 'Joins', value: numStr(d.joins), color: T.green },
    { label: 'Leaves', value: numStr(d.leaves), color: T.red },
  ];
  for (let i = 0; i < stats.length; i++) statCard(ctx, i, stats[i].label, stats[i].value, stats[i].color);

  const tl = PANELS.topLeft;
  panelBg(ctx, tl);
  panelHeader(ctx, tl, 'Daily Messages');
  barChart(ctx, tl.x + 50, panelContentY(tl), tl.w - 70, tl.h - 55, d.dailyMessages, {
    labels: d.dailyMessages.map((_, i) => `${i + 1}`), showValues: false,
  });

  const tr = PANELS.topRight;
  panelBg(ctx, tr);
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
      label: truncate(ctx, u.userId, tr.w - 180, { size: 16 }),
      value: numStr(u.messages), barPct: pct,
      isLast: i === Math.min(d.topUsers.length, 10) - 1,
    });
  }

  const bl = PANELS.bottomLeft;
  panelBg(ctx, bl);
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
      label: '#' + truncate(ctx, ch.channelId, bl.w - 180, { size: 16 }),
      value: numStr(ch.messages), barPct: pct,
      isLast: i === Math.min(d.topChannels.length, 10) - 1,
    });
  }

  const br = PANELS.bottomRight;
  panelBg(ctx, br);
  panelHeader(ctx, br, 'Activity Heatmap');
  heatmap(ctx, br.x + 16, panelContentY(br), br.w - 32, br.h - 55, d.hourlyByDay);

  footer(ctx, 'FICTIONAL DATA • DEMO  —  StatBot m?fake');
  return canvas.toBuffer('image/png');
}
