import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, fillRect, text, truncate, numStr, THEME } from './theme.js';
import { headerBanner, statCard, panelBg, panelHeader, panelContentY, barChart, rowItem, footer } from './components.js';
import type { FakeUserData } from '../fake/generator.js';

export async function renderFakeUserStats(d: FakeUserData): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  fillRect(ctx, PAD, PAD, W - PAD * 2, 80, T.panel, THEME.borderRadius);
  const avatarSize = 56;
  fillRect(ctx, PAD + 20, PAD + 12, avatarSize, avatarSize, T.accentDim, avatarSize / 2);
  text(ctx, d.username.charAt(0).toUpperCase(), PAD + 20 + avatarSize / 2, PAD + 12 + avatarSize / 2 - 12, { size: 26, weight: 700, color: T.text, align: 'center' });
  text(ctx, d.username, PAD + 20 + avatarSize + 16, PAD + 16, { size: 28, weight: 700, color: T.text });
  text(ctx, 'Last 30 Days', PAD + 20 + avatarSize + 16, PAD + 48, { size: 16, weight: 500, color: T.textMuted });
  text(ctx, `#${d.rank}`, W - PAD - 24, PAD + 12, { size: 44, weight: 700, color: T.accentBright, align: 'right' });
  text(ctx, `of ${numStr(d.totalMembers)} users`, W - PAD - 24, PAD + 52, { size: 13, weight: 500, color: T.textMuted, align: 'right' });

  fillRect(ctx, PAD, PAD + 75 + 8, W - PAD * 2, 30, 'rgba(220,38,38,0.08)', 8);
  text(ctx, 'FICTIONAL DATA  •  DEMO', PAD + 16, PAD + 75 + 14, { size: 13, weight: 700, color: T.accentBright });

  const stats = [
    { label: 'Messages', value: numStr(d.totalMessages), color: T.accentBright },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h' },
    { label: 'Active Days', value: `${d.activeDays}/${d.totalDays}` },
    { label: 'Percentile', value: `Top ${d.percentile}%` },
    { label: 'Voice Sessions', value: String(d.voiceSessions) },
  ];
  for (let i = 0; i < stats.length; i++) statCard(ctx, i, stats[i].label, stats[i].value, stats[i].color);

  const tl = PANELS.topLeft;
  panelBg(ctx, tl);
  panelHeader(ctx, tl, 'Daily Messages');
  barChart(ctx, tl.x + 50, panelContentY(tl), tl.w - 70, tl.h - 55, d.dailyMessages, {
    labels: Array.from({ length: d.dailyMessages.length }, (_, i) => String(i + 1)).filter((_, i) => i % 3 === 0),
    showValues: false,
  });

  const tr = PANELS.topRight;
  panelBg(ctx, tr);
  panelHeader(ctx, tr, 'Activity by Weekday');
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  barChart(ctx, tr.x + 50, panelContentY(tr), tr.w - 70, tr.h - 55, d.weekdayMessages, {
    labels: weekdays, showValues: true, color: T.accent,
  });

  const fullW = W - PAD * 2;
  const bl = PANELS.bottomLeft;
  panelBg(ctx, { x: bl.x, y: bl.y, w: fullW, h: bl.h });
  panelHeader(ctx, { x: bl.x, y: bl.y, w: fullW }, 'Top Channels');
  const maxCh = d.topChannels[0]?.messages || 1;
  const chRowH = Math.floor((bl.h - 44) / Math.min(d.topChannels.length, 8));
  for (let i = 0; i < Math.min(d.topChannels.length, 8); i++) {
    const ry = panelContentY(bl) + i * chRowH;
    const ch = d.topChannels[i];
    const pct = maxCh > 0 ? ch.messages / maxCh : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.textSecondary : i === 2 ? T.textMuted : T.textDim;
    rowItem(ctx, bl.x, ry, fullW, chRowH, {
      rank: i + 1, rankColor,
      label: '#' + truncate(ctx, ch.channelId, fullW - 180, { size: 16 }),
      value: numStr(ch.messages), barPct: pct,
      isLast: i === Math.min(d.topChannels.length, 8) - 1,
    });
  }

  footer(ctx, 'FICTIONAL DATA • DEMO  —  StatBot m?fake user');
  return canvas.toBuffer('image/png');
}
