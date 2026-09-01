import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, fillRect, text, numStr, pctStr, arrowForChange, THEME } from './theme.js';
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
  ctx.save();
  rr(ctx, cX, colY, colW, 40, THEME.borderRadius);
  ctx.clip();
  fillRect(ctx, cX, colY, colW, 40, '#16161a', 0);
  ctx.restore();
  fillRect(ctx, cX, colY + 39, colW, 1, T.borderSubtle);
  text(ctx, current.label.toUpperCase(), cX + 16, colY + 11, { size: 16, weight: 700, color: T.text });
  let ry = colY + 56;
  for (const m of metrics) {
    text(ctx, m.label.toUpperCase(), cX + 16, ry, { size: 13, weight: 700, color: T.textDim });
    text(ctx, m.get(current), cX + colW - 16, ry, { size: 20, weight: 700, color: T.text, align: 'right' });
    ry += 42;
    fillRect(ctx, cX + 16, ry - 8, colW - 32, 1, T.borderSubtle);
  }

  // Previous
  const pX = PAD + colW + GAP;
  panelBg(ctx, { x: pX, y: colY, w: colW, h: colH });
  ctx.save();
  rr(ctx, pX, colY, colW, 40, THEME.borderRadius);
  ctx.clip();
  fillRect(ctx, pX, colY, colW, 40, '#16161a', 0);
  ctx.restore();
  fillRect(ctx, pX, colY + 39, colW, 1, T.borderSubtle);
  text(ctx, previous.label.toUpperCase(), pX + 16, colY + 11, { size: 16, weight: 700, color: T.textSecondary });
  ry = colY + 56;
  for (const m of metrics) {
    text(ctx, m.label.toUpperCase(), pX + 16, ry, { size: 13, weight: 700, color: T.textDim });
    text(ctx, m.get(previous), pX + colW - 16, ry, { size: 20, weight: 700, color: T.textSecondary, align: 'right' });
    ry += 42;
    fillRect(ctx, pX + 16, ry - 8, colW - 32, 1, T.borderSubtle);
  }

  // Change
  const chX = PAD + (colW + GAP) * 2;
  panelBg(ctx, { x: chX, y: colY, w: colW, h: colH });
  ctx.save();
  rr(ctx, chX, colY, colW, 40, THEME.borderRadius);
  ctx.clip();
  fillRect(ctx, chX, colY, colW, 40, '#16161a', 0);
  ctx.restore();
  fillRect(ctx, chX, colY + 39, colW, 1, T.borderSubtle);
  text(ctx, 'CHANGE', chX + 16, colY + 11, { size: 16, weight: 700, color: T.accentBright });

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
    fillRect(ctx, chX + 16, ry - 8, colW - 32, 1, T.borderSubtle);
  }

  footer(ctx, 'StatBot  •  m?help for commands');
  return canvas.toBuffer('image/png');
}

function rr(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
