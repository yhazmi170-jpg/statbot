import { createCanvas } from '@napi-rs/canvas';
import { T, PAD, fillRect, text, numStr, durStr, pctStr, arrowForChange } from './theme.js';
import { headerBanner, sectionBg, COL_GAP, footer } from './components.js';

interface Period {
  label: string;
  messages: number;
  activeUsers: number;
  voiceHours: number;
  joins: number;
  leaves: number;
  peakHour: string;
}

export async function renderCompare(current: Period, previous: Period): Promise<Buffer> {
  const W = 1400, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  headerBanner(ctx, y, 'Period Comparison', `${current.label} vs ${previous.label}`);
  y += 78;

  const colW = (W - PAD * 2 - COL_GAP * 2) / 3;
  const colH = H - y - PAD - 44;

  const metrics = [
    { label: 'Messages', get: (p: Period) => numStr(p.messages), raw: (p: Period) => p.messages },
    { label: 'Active Users', get: (p: Period) => numStr(p.activeUsers), raw: (p: Period) => p.activeUsers },
    { label: 'Voice Hours', get: (p: Period) => p.voiceHours.toFixed(1) + 'h', raw: (p: Period) => p.voiceHours },
    { label: 'Joins', get: (p: Period) => numStr(p.joins), raw: (p: Period) => p.joins },
    { label: 'Leaves', get: (p: Period) => numStr(p.leaves), raw: (p: Period) => p.leaves },
    { label: 'Peak Hour', get: (p: Period) => p.peakHour, raw: () => 0 },
  ];

  // ── Current Period ──
  sectionBg(ctx, PAD, y, colW, colH);
  fillRect(ctx, PAD, y, colW, 36, T.accent, 0);
  text(ctx, current.label.toUpperCase(), PAD + 16, y + 9, { size: 14, weight: 700, color: '#fff' });

  let ry = y + 50;
  for (const m of metrics) {
    text(ctx, m.label.toUpperCase(), PAD + 16, ry, { size: 11, weight: 600, color: T.textDim });
    text(ctx, m.get(current), PAD + colW - 16, ry, { size: 18, weight: 700, color: T.text, align: 'right' });
    ry += 40;
    fillRect(ctx, PAD + 16, ry - 8, colW - 32, 1, T.border);
  }

  // ── Previous Period ──
  const prevX = PAD + colW + COL_GAP;
  sectionBg(ctx, prevX, y, colW, colH);
  fillRect(ctx, prevX, y, colW, 36, T.panelAlt, 0);
  text(ctx, previous.label.toUpperCase(), prevX + 16, y + 9, { size: 14, weight: 700, color: T.textMuted });

  ry = y + 50;
  for (const m of metrics) {
    text(ctx, m.label.toUpperCase(), prevX + 16, ry, { size: 11, weight: 600, color: T.textDim });
    text(ctx, m.get(previous), prevX + colW - 16, ry, { size: 18, weight: 700, color: T.textMuted, align: 'right' });
    ry += 40;
    fillRect(ctx, prevX + 16, ry - 8, colW - 32, 1, T.border);
  }

  // ── Change Column ──
  const chgX = PAD + (colW + COL_GAP) * 2;
  sectionBg(ctx, chgX, y, colW, colH);
  fillRect(ctx, chgX, y, colW, 36, T.accent, 0);
  text(ctx, 'CHANGE', chgX + 16, y + 9, { size: 14, weight: 700, color: '#fff' });

  const changes = [
    { label: 'Messages', current: current.messages, previous: previous.messages },
    { label: 'Active Users', current: current.activeUsers, previous: previous.activeUsers },
    { label: 'Voice Hours', current: current.voiceHours, previous: previous.voiceHours },
    { label: 'Joins', current: current.joins, previous: previous.joins },
    { label: 'Leaves', current: current.leaves, previous: previous.leaves },
  ];

  ry = y + 50;
  for (const c of changes) {
    const diff = c.previous > 0 ? ((c.current - c.previous) / c.previous * 100) : 0;
    const arrow = arrowForChange(c.current, c.previous);
    const color = diff > 0 ? T.green : diff < 0 ? T.red : T.textDim;
    const pctDisplay = c.previous > 0 ? `${arrow} ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : '—';

    text(ctx, c.label.toUpperCase(), chgX + 16, ry, { size: 11, weight: 600, color: T.textDim });
    text(ctx, pctDisplay, chgX + colW - 16, ry, { size: 18, weight: 700, color, align: 'right' });
    ry += 40;
    fillRect(ctx, chgX + 16, ry - 8, colW - 32, 1, T.border);
  }

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
