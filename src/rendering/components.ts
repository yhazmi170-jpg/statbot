import { createCanvas, Image } from '@napi-rs/canvas';
import { T, fillRect, text, rr, truncate, numStr, durStr } from './theme.js';

type C = any;

// ─── Layout Constants ─────────────────────────────────

export const PAD = 30;
export const COL_GAP = 16;
export const HALF_W = (T.W - PAD * 2 - COL_GAP) / 2;
export const THIRD_W = (T.W - PAD * 2 - COL_GAP * 2) / 3;
export const QUARTER_W = (T.W - PAD * 2 - COL_GAP * 3) / 4;

// ─── Section ──────────────────────────────────────────

export function sectionBg(ctx: C, x: number, y: number, w: number, h: number) {
  fillRect(ctx, x, y, w, h, T.panel, 6);
  // Subtle top accent line
  fillRect(ctx, x, y, w, 1, T.border);
}

export function sectionTitle(ctx: C, title: string, x: number, y: number) {
  text(ctx, title, x, y, { size: 11, weight: 600, color: T.accentBright });
}

// ─── Stat Card ────────────────────────────────────────

export function statCard(ctx: C, x: number, y: number, w: number, h: number, label: string, value: string, opts?: {
  color?: string; sub?: string; subColor?: string;
}) {
  fillRect(ctx, x, y, w, h, T.panel, 6);
  fillRect(ctx, x, y, w, 1, T.border);
  text(ctx, label.toUpperCase(), x + 12, y + 10, { size: 10, weight: 600, color: T.textDim });
  text(ctx, value, x + 12, y + 26, { size: 20, weight: 700, color: opts?.color || T.text });
  if (opts?.sub) {
    text(ctx, opts.sub, x + 12, y + 52, { size: 10, color: opts.subColor || T.textDim });
  }
}

// ─── Compact Stat Row ─────────────────────────────────

export function statRow(ctx: C, x: number, y: number, items: { label: string; value: string; color?: string }[]) {
  const w = (T.W - PAD * 2 - COL_GAP * (items.length - 1)) / items.length;
  for (let i = 0; i < items.length; i++) {
    const ix = x + i * (w + COL_GAP);
    fillRect(ctx, ix, y, w, 56, T.panel, 6);
    fillRect(ctx, ix, y, w, 1, T.border);
    text(ctx, items[i].label.toUpperCase(), ix + 12, y + 8, { size: 10, weight: 600, color: T.textDim });
    text(ctx, items[i].value, ix + 12, y + 26, { size: 18, weight: 700, color: items[i].color || T.accent });
  }
}

// ─── Leaderboard ──────────────────────────────────────

export function leaderboard(ctx: C, x: number, y: number, w: number, rows: {
  rank: number; name: string; value: string; color?: string;
  pct?: string;
}[], opts?: { title?: string; height?: number }) {
  const rowH = 38;
  const h = opts?.height || rows.length * rowH + (opts?.title ? 26 : 0);
  let cy = y;

  if (opts?.title) {
    sectionTitle(ctx, opts.title, x + 12, cy + 8);
    cy += 24;
  }

  fillRect(ctx, x, cy, w, h - (opts?.title ? 24 : 0), T.panel, 6);

  for (let i = 0; i < rows.length; i++) {
    const ry = cy + i * rowH;
    const r = rows[i];

    // Rank
    const rankColors = [T.accentBright, T.accent, T.accentSoft];
    const rankColor = r.rank <= 3 ? rankColors[r.rank - 1] : T.textDim;
    text(ctx, String(r.rank).padStart(2, '0'), x + 12, ry + 10, { size: 14, weight: 700, color: rankColor });

    // Avatar placeholder
    fillRect(ctx, x + 42, ry + 7, 24, 24, r.color || T.accentSoft, 12);

    // Name
    text(ctx, truncate(ctx, r.name, w - 160, { size: 13 }), x + 74, ry + 10, { size: 13, weight: 500, color: T.text });

    // Percentage (if provided)
    if (r.pct) {
      text(ctx, r.pct, x + w - 90, ry + 10, { size: 11, color: T.textDim, align: 'right' });
    }

    // Value
    text(ctx, r.value, x + w - 12, ry + 10, { size: 13, weight: 600, color: T.accent, align: 'right' });

    // Separator
    if (i < rows.length - 1) {
      fillRect(ctx, x + 12, ry + rowH - 1, w - 24, 1, T.border);
    }
  }
}

// ─── Bar List ─────────────────────────────────────────

export function barList(ctx: C, x: number, y: number, w: number, rows: {
  label: string; value: number; display?: string;
}[], opts?: { title?: string; height?: number; max?: number }) {
  const rowH = 28;
  const h = opts?.height || rows.length * rowH + (opts?.title ? 26 : 0);
  let cy = y;

  if (opts?.title) {
    sectionTitle(ctx, opts.title, x + 12, cy + 8);
    cy += 24;
  }

  fillRect(ctx, x, cy, w, h - (opts?.title ? 24 : 0), T.panel, 6);

  const maxVal = opts?.max || Math.max(...rows.map(r => r.value), 1);
  const barMaxW = w - 140;

  for (let i = 0; i < rows.length; i++) {
    const ry = cy + i * rowH;
    const r = rows[i];

    text(ctx, truncate(ctx, r.label, 120, { size: 12 }), x + 12, ry + 7, { size: 12, color: T.text });

    fillRect(ctx, x + 140, ry + 9, barMaxW, 10, T.panelAlt, 5);

    const pct = maxVal > 0 ? r.value / maxVal : 0;
    if (pct > 0) {
      fillRect(ctx, x + 140, ry + 9, Math.max(barMaxW * pct, 10), 10, T.accent, 5);
    }

    text(ctx, r.display || numStr(r.value), x + w - 12, ry + 7, { size: 12, weight: 600, color: T.text, align: 'right' });

    if (i < rows.length - 1) {
      fillRect(ctx, x + 12, ry + rowH - 1, w - 24, 1, T.border);
    }
  }
}

// ─── Line Chart ───────────────────────────────────────

export function lineChart(ctx: C, x: number, y: number, w: number, h: number, data: number[], opts?: {
  title?: string; labels?: string[]; color?: string; showDots?: boolean; peak?: boolean;
}) {
  let cy = y;

  if (opts?.title) {
    sectionTitle(ctx, opts.title, x, cy);
    cy += 20;
  }

  const chartH = h - (opts?.title ? 20 : 0) - 18;
  const chartW = w - 50;

  if (data.length < 2) return;

  const max = Math.max(...data, 1);
  const min = 0;
  const range = max - min || 1;

  // Y axis labels + grid
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const val = min + (range * i) / ySteps;
    const yy = cy + chartH - (i / ySteps) * chartH;
    text(ctx, numStr(Math.round(val)), x + 40, yy - 6, { size: 9, color: T.chartText, align: 'right' });
    if (i > 0 && i < ySteps) {
      fillRect(ctx, x + 46, yy, chartW - 40, 1, T.chartGrid);
    }
  }

  const step = (chartW - 50) / (data.length - 1);
  const color = opts?.color || T.chartLine;

  // Fill under line
  ctx.beginPath();
  ctx.moveTo(x + 50, cy + chartH);
  for (let i = 0; i < data.length; i++) {
    const px = x + 50 + i * step;
    const py = cy + chartH - ((data[i] - min) / range) * chartH;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x + 50 + (data.length - 1) * step, cy + chartH);
  ctx.closePath();
  ctx.fillStyle = T.chartFill;
  ctx.fill();

  // Line
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const px = x + 50 + i * step;
    const py = cy + chartH - ((data[i] - min) / range) * chartH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Peak dot
  if (opts?.peak !== false) {
    const peakIdx = data.indexOf(Math.max(...data));
    const px = x + 50 + peakIdx * step;
    const py = cy + chartH - ((data[peakIdx] - min) / range) * chartH;
    fillRect(ctx, px - 4, py - 4, 8, 8, T.accentBright, 4);
    text(ctx, numStr(data[peakIdx]), px, py - 14, { size: 9, weight: 600, color: T.accentBright, align: 'center' });
  }

  // X axis labels
  if (opts?.labels) {
    const labelStep = Math.max(1, Math.floor(opts.labels.length / 7));
    for (let i = 0; i < opts.labels.length; i += labelStep) {
      const lx = x + 50 + i * step;
      text(ctx, opts.labels[i], lx, cy + chartH + 4, { size: 9, color: T.chartText, align: 'center' });
    }
  }
}

// ─── Heatmap ──────────────────────────────────────────

export function heatmap(ctx: C, x: number, y: number, w: number, h: number, grid: number[][], opts?: {
  title?: string;
}) {
  let cy = y;

  if (opts?.title) {
    sectionTitle(ctx, opts.title, x, cy);
    cy += 20;
  }

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const cellW = (w - 54) / 24;
  const cellH = (h - (opts?.title ? 20 : 0) - 28) / 7;

  let maxVal = 0;
  for (const row of grid) for (const v of row) if (v > maxVal) maxVal = v;
  if (maxVal === 0) maxVal = 1;

  // Hour labels
  for (let hr = 0; hr < 24; hr += 4) {
    const hx = x + 48 + hr * cellW;
    text(ctx, `${String(hr).padStart(2, '0')}`, hx, cy - 2, { size: 9, color: T.textDim, align: 'center' });
  }

  for (let d = 0; d < 7; d++) {
    const dy = cy + 10 + d * cellH;
    text(ctx, days[d], x + 4, dy + cellH / 2 - 5, { size: 9, color: T.textMuted });

    for (let hr = 0; hr < 24; hr++) {
      const dx = x + 48 + hr * cellW;
      const val = grid[d]?.[hr] || 0;
      const intensity = val / maxVal;

      let color: string;
      if (intensity < 0.15) color = T.heat0;
      else if (intensity < 0.3) color = T.heat1;
      else if (intensity < 0.5) color = T.heat2;
      else if (intensity < 0.7) color = T.heat3;
      else if (intensity < 0.85) color = T.heat4;
      else color = T.heat5;

      fillRect(ctx, dx + 1, dy + 1, cellW - 2, cellH - 2, color, 2);
    }
  }

  // Legend
  const legY = cy + 10 + 7 * cellH + 6;
  text(ctx, 'Less', x + 48, legY, { size: 9, color: T.textDim });
  const legColors = [T.heat0, T.heat1, T.heat2, T.heat3, T.heat4, T.heat5];
  for (let i = 0; i < legColors.length; i++) {
    fillRect(ctx, x + 78 + i * 16, legY - 2, 14, 10, legColors[i], 2);
  }
  text(ctx, 'More', x + 78 + legColors.length * 16 + 4, legY, { size: 9, color: T.textDim });
}

// ─── Footer ───────────────────────────────────────────

export function footer(ctx: C, text_: string) {
  text(ctx, text_, PAD, T.H - 16, { size: 9, color: T.textFaint });
}

// ─── Divider ──────────────────────────────────────────

export function divider(ctx: C, y: number) {
  fillRect(ctx, PAD, y, T.W - PAD * 2, 1, T.border);
}
