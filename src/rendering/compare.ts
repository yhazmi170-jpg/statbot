import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, fillRect, text, numStr, pctStr, arrowForChange } from './theme.js';
import { headerBanner, panelBg, panelContentY, footer, COL_GAP } from './components.js';

interface Period { label: string; messages: number; activeUsers: number; voiceHours: number; joins: number; leaves: number; peakHour: string; }

export async function renderCompare(current: Period, previous: Period): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  headerBanner(ctx, 'Period Comparison', `${current.label} vs ${previous.label}`);

  const colW = (W - PAD * 2 - GAP * 2) / 3;
  const colH = H - PAD - 75 - 15 - GAP - 25;
  const colY = PAD + 75 + 15;

  const metrics = [
    { label: 'Messages', get: (p: Period) => numStr(p.messages) },
    { label: 'Active Users', get: (p: Period) => numStr(p.activeUsers) },
    { label: 'Voice Hours', get: (p: Period) => p.voiceHours.toFixed(1) + 'h' },
    { label: 'Joins', get: (p: Period) => numStr(p.joins) },
    { label: 'Leaves', get: (p: Period) => numStr(p.leaves) },
    { label: 'Peak Hour', get: (p: Period) => p.peakHour },
  ];

  // Current
  const cX = PAD;
  panelBg(ctx, { x: cX, y: colY, w: colW, h: colH });
  fillRect(ctx, cX, colY, colW, 40, T.accent, 0);
  text(ctx, current.label.toUpperCase(), cX + 16, colY + 10, { size: 16, weight: 700, color: '#fff' });
  let ry = colY + 56;
  for (const m of metrics) {
    text(ctx, m.label.toUpperCase(), cX + 16, ry, { size: 13, weight: 700, color: T.textDim });
    text(ctx, m.get(current), cX + colW - 16, ry, { size: 20, weight: 700, color: T.text, align: 'right' });
    ry += 42;
    fillRect(ctx, cX + 16, ry - 8, colW - 32, 1, T.border);
  }

  // Previous
  const pX = PAD + colW + GAP;
  panelBg(ctx, { x: pX, y: colY, w: colW, h: colH });
  fillRect(ctx, pX, colY, colW, 40, T.panelAlt, 0);
  text(ctx, previous.label.toUpperCase(), pX + 16, colY + 10, { size: 16, weight: 700, color: T.textMuted });
  ry = colY + 56;
  for (const m of metrics) {
    text(ctx, m.label.toUpperCase(), pX + 16, ry, { size: 13, weight: 700, color: T.textDim });
    text(ctx, m.get(previous), pX + colW - 16, ry, { size: 20, weight: 700, color: T.textMuted, align: 'right' });
    ry += 42;
    fillRect(ctx, pX + 16, ry - 8, colW - 32, 1, T.border);
  }

  // Change
  const chX = PAD + (colW + GAP) * 2;
  panelBg(ctx, { x: chX, y: colY, w: colW, h: colH });
  fillRect(ctx, chX, colY, colW, 40, T.accent, 0);
  text(ctx, 'CHANGE', chX + 16, colY + 10, { size: 16, weight: 700, color: '#fff' });

  const changes = [
    { label: 'Messages', current: current.messages, previous: previous.messages },
    { label: 'Active Users', current: current.activeUsers, previous: previous.activeUsers },
    { label: 'Voice Hours', current: current.voiceHours, previous: previous.voiceHours },
    { label: 'Joins', current: current.joins, previous: previous.joins },
    { label: 'Leaves', current: current.leaves, previous: previous.leaves },
  ];

  ry = colY + 56;
  for (const c of changes) {
    const diff = c.previous > 0 ? ((c.current - c.previous) / c.previous * 100) : 0;
    const arrow = arrowForChange(c.current, c.previous);
    const color = diff > 0 ? T.green : diff < 0 ? T.red : T.textDim;
    const pctDisplay = c.previous > 0 ? `${arrow} ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : '—';
    text(ctx, c.label.toUpperCase(), chX + 16, ry, { size: 13, weight: 700, color: T.textDim });
    text(ctx, pctDisplay, chX + colW - 16, ry, { size: 20, weight: 700, color, align: 'right' });
    ry += 42;
    fillRect(ctx, chX + 16, ry - 8, colW - 32, 1, T.border);
  }

  footer(ctx, 'StatBot  •  m?help for commands');
  return canvas.toBuffer('image/png');
}
