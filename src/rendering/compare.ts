import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, numStr, durStr, PAD, arrowForChange } from './theme.js';
import { footer, COL_GAP } from './components.js';

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
  const W = 1400, H = 700;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);
  let y = PAD;

  // Header
  fillRect(ctx, PAD, y, W - PAD * 2, 52, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, 'PERIOD COMPARISON', PAD + 16, y + 8, { size: 15, weight: 700, color: T.accentBright });
  text(ctx, `${current.label} vs ${previous.label}`, PAD + 16, y + 30, { size: 11, color: T.textMuted });
  y += 64;

  const colW = (W - PAD * 2 - COL_GAP * 2) / 3;

  // Current period
  fillRect(ctx, PAD, y, colW, 420, T.panel, 6);
  fillRect(ctx, PAD, y, colW, 1, T.accent);
  text(ctx, current.label.toUpperCase(), PAD + 12, y + 8, { size: 10, weight: 600, color: T.accentBright });
  const curItems = [
    ['Messages', numStr(current.messages)],
    ['Active Users', numStr(current.activeUsers)],
    ['Voice Hours', current.voiceHours.toFixed(1) + 'h'],
    ['New Members', numStr(current.joins)],
    ['Members Left', numStr(current.leaves)],
    ['Peak Hour', current.peakHour],
  ];
  for (let i = 0; i < curItems.length; i++) {
    const iy = y + 28 + i * 36;
    text(ctx, curItems[i][0], PAD + 12, iy, { size: 10, color: T.textDim });
    text(ctx, curItems[i][1], PAD + colW - 12, iy + 4, { size: 14, weight: 700, color: T.text, align: 'right' });
    if (i < curItems.length - 1) fillRect(ctx, PAD + 12, iy + 26, colW - 24, 1, T.border);
  }

  // Previous period
  fillRect(ctx, PAD + colW + COL_GAP, y, colW, 420, T.panel, 6);
  fillRect(ctx, PAD + colW + COL_GAP, y, colW, 1, T.border);
  text(ctx, previous.label.toUpperCase(), PAD + colW + COL_GAP + 12, y + 8, { size: 10, weight: 600, color: T.textDim });
  const prevItems = [
    ['Messages', numStr(previous.messages)],
    ['Active Users', numStr(previous.activeUsers)],
    ['Voice Hours', previous.voiceHours.toFixed(1) + 'h'],
    ['New Members', numStr(previous.joins)],
    ['Members Left', numStr(previous.leaves)],
    ['Peak Hour', previous.peakHour],
  ];
  for (let i = 0; i < prevItems.length; i++) {
    const iy = y + 28 + i * 36;
    text(ctx, prevItems[i][0], PAD + colW + COL_GAP + 12, iy, { size: 10, color: T.textDim });
    text(ctx, prevItems[i][1], PAD + colW + COL_GAP + colW - 12, iy + 4, { size: 14, weight: 700, color: T.textMuted, align: 'right' });
    if (i < prevItems.length - 1) fillRect(ctx, PAD + colW + COL_GAP + 12, iy + 26, colW - 24, 1, T.border);
  }

  // Change column
  fillRect(ctx, PAD + (colW + COL_GAP) * 2, y, colW, 420, T.panel, 6);
  fillRect(ctx, PAD + (colW + COL_GAP) * 2, y, colW, 1, T.accent);
  text(ctx, 'CHANGE', PAD + (colW + COL_GAP) * 2 + 12, y + 8, { size: 10, weight: 600, color: T.accentBright });

  const changes = [
    { label: 'Messages', current: current.messages, previous: previous.messages },
    { label: 'Active Users', current: current.activeUsers, previous: previous.activeUsers },
    { label: 'Voice Hours', current: current.voiceHours, previous: previous.voiceHours },
    { label: 'New Members', current: current.joins, previous: previous.joins },
    { label: 'Members Left', current: current.leaves, previous: previous.leaves },
  ];

  for (let i = 0; i < changes.length; i++) {
    const iy = y + 28 + i * 36;
    const c = changes[i];
    const diff = c.previous > 0 ? ((c.current - c.previous) / c.previous * 100) : 0;
    const arrow = arrowForChange(c.current, c.previous);
    const color = diff > 0 ? T.green : diff < 0 ? T.red : T.textDim;
    const pctStr = c.previous > 0 ? `${arrow} ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : '—';

    text(ctx, c.label, PAD + (colW + COL_GAP) * 2 + 12, iy, { size: 10, color: T.textDim });
    text(ctx, pctStr, PAD + (colW + COL_GAP) * 2 + colW - 12, iy + 4, { size: 14, weight: 700, color, align: 'right' });
    if (i < changes.length - 1) fillRect(ctx, PAD + (colW + COL_GAP) * 2 + 12, iy + 26, colW - 24, 1, T.border);
  }

  footer(ctx, 'StatBot • m?help for commands');

  return canvas.toBuffer('image/png');
}
