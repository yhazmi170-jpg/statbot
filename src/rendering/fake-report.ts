import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, numStr, truncate } from './theme.js';
import { headerBanner, statCard, sectionBg, rowItem, HALF_W, COL_GAP, barChart, heatmap, footer } from './components.js';
import type { FakeReportData } from '../fake/generator.js';

export async function renderFakeReport(d: FakeReportData): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  // ─── HEADER ─────────────────────────────────────────
  headerBanner(ctx, y, `${d.period} Report`, d.guildName, {
    rightLabel: 'Total Messages',
    rightValue: numStr(d.totalMessages),
  });
  y += 78;

  // ─── DEMO LABEL ─────────────────────────────────────
  fillRect(ctx, PAD, y, W - PAD * 2, 28, 'rgba(139,0,0,0.15)', 6);
  text(ctx, 'FICTIONAL DATA  •  DEMO', PAD + 16, y + 7, { size: 11, weight: 600, color: T.accentBright });
  y += 36;

  // ─── PRIMARY STATS ──────────────────────────────────
  const stats = [
    { label: 'Messages', value: numStr(d.totalMessages), color: T.accentBright },
    { label: 'Active Users', value: numStr(d.uniqueUsers) },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h' },
    { label: 'Joins', value: numStr(d.joins), color: T.green },
    { label: 'Leaves', value: numStr(d.leaves), color: T.red },
  ];
  const statW = (W - PAD * 2 - COL_GAP * (stats.length - 1)) / stats.length;
  const statH = 72;
  for (let i = 0; i < stats.length; i++) {
    statCard(ctx, PAD + i * (statW + COL_GAP), y, statW, statH, stats[i].label, stats[i].value, stats[i].color);
  }
  y += statH + 14;

  // ─── MAIN CONTENT ───────────────────────────────────
  const contentH = H - y - PAD - 44;
  const colH = Math.floor((contentH - COL_GAP) / 2);
  const leftX = PAD;
  const rightX = PAD + HALF_W + COL_GAP;

  // ── TOP LEFT: Daily Messages ──
  sectionBg(ctx, leftX, y, HALF_W, colH);
  fillRect(ctx, leftX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'DAILY MESSAGES', leftX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  barChart(ctx, leftX + 50, y + 44, HALF_W - 70, colH - 64, d.dailyMessages, {
    labels: d.dailyMessages.map((_, i) => `${i + 1}`),
    showValues: false,
  });

  // ── TOP RIGHT: Top Users ──
  sectionBg(ctx, rightX, y, HALF_W, colH);
  fillRect(ctx, rightX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'TOP USERS', rightX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const maxMsg = d.topUsers[0]?.messages || 1;
  const userRowH = Math.min(34, (colH - 42) / Math.min(d.topUsers.length, 10));
  for (let i = 0; i < Math.min(d.topUsers.length, 10); i++) {
    const ry = y + 40 + i * userRowH;
    const u = d.topUsers[i];
    const pct = maxMsg > 0 ? u.messages / maxMsg : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.accent : i === 2 ? T.accentSoft : T.textDim;
    rowItem(ctx, rightX, ry, HALF_W, userRowH, {
      rank: i + 1,
      rankColor,
      label: truncate(ctx, u.userId, HALF_W - 200, { size: 13 }),
      value: numStr(u.messages),
      barPct: pct,
      isLast: i === Math.min(d.topUsers.length, 10) - 1,
    });
  }

  y += colH + COL_GAP;

  // ── BOTTOM LEFT: Top Channels ──
  sectionBg(ctx, leftX, y, HALF_W, colH);
  fillRect(ctx, leftX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'TOP CHANNELS', leftX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const maxCh = d.topChannels[0]?.messages || 1;
  const chRowH = Math.min(34, (colH - 42) / Math.min(d.topChannels.length, 10));
  for (let i = 0; i < Math.min(d.topChannels.length, 10); i++) {
    const ry = y + 40 + i * chRowH;
    const ch = d.topChannels[i];
    const pct = maxCh > 0 ? ch.messages / maxCh : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.accent : i === 2 ? T.accentSoft : T.textDim;
    rowItem(ctx, leftX, ry, HALF_W, chRowH, {
      rank: i + 1,
      rankColor,
      label: '#' + truncate(ctx, ch.channelId, HALF_W - 200, { size: 13 }),
      value: numStr(ch.messages),
      barPct: pct,
      isLast: i === Math.min(d.topChannels.length, 10) - 1,
    });
  }

  // ── BOTTOM RIGHT: Heatmap ──
  sectionBg(ctx, rightX, y, HALF_W, colH);
  fillRect(ctx, rightX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'ACTIVITY HEATMAP', rightX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  heatmap(ctx, rightX + 14, y + 42, HALF_W - 28, colH - 52, d.hourlyByDay);

  footer(ctx, 'FICTIONAL DATA • DEMO  —  StatBot m?fake');

  return canvas.toBuffer('image/png');
}
