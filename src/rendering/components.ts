import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, STAT_W, STAT_H, GRID_TOP, COL_GAP, fillRect, text, rr, THEME } from './theme.js';

export { COL_GAP, PANEL_W, PANEL_H, PANELS, GRID_TOP, STAT_W, STAT_H, GAP };
export const HALF_W = PANEL_W;

// ─── CARD DRAWING ──────────────────────────────────────

function drawCard(ctx: any, x: number, y: number, w: number, h: number, opts?: {
  accentTop?: boolean;
  accentColor?: string;
  subtle?: boolean;
}) {
  // Card background
  fillRect(ctx, x, y, w, h, opts?.subtle ? '#0e0e11' : T.panel, THEME.borderRadius);

  // Subtle border
  fillRect(ctx, x, y, w, h, 'transparent', THEME.borderRadius);
  ctx.strokeStyle = T.border;
  ctx.lineWidth = 1;
  rr(ctx, x, y, w, h, THEME.borderRadius);
  ctx.stroke();

  // Optional accent top line (very subtle)
  if (opts?.accentTop) {
    ctx.save();
    rr(ctx, x, y, w, h, THEME.borderRadius);
    ctx.clip();
    fillRect(ctx, x, y, w, 2, opts?.accentColor || T.accent, 0);
    ctx.restore();
  }
}

// ─── HEADER ────────────────────────────────────────────

export function headerBanner(ctx: any, title: string, subtitle: string, opts?: {
  rightLabel?: string; rightValue?: string;
}) {
  const y = PAD;
  const h = 75;

  drawCard(ctx, PAD, y, W - PAD * 2, h);

  text(ctx, title.toUpperCase(), PAD + 20, y + 20, { size: 36, weight: 700, color: T.text });
  text(ctx, subtitle, PAD + 20, y + 50, { size: 18, weight: 500, color: T.textMuted });

  if (opts?.rightLabel && opts?.rightValue) {
    text(ctx, opts.rightValue, W - PAD - 20, y + 12, { size: 44, weight: 700, color: T.accentBright, align: 'right' });
    text(ctx, opts.rightLabel.toUpperCase(), W - PAD - 20, y + 52, { size: 13, weight: 700, color: T.textDim, align: 'right' });
  }
}

// ─── STAT CARDS ────────────────────────────────────────

export function statCard(ctx: any, index: number, label: string, value: string, accentColor?: string) {
  const x = PAD + index * (STAT_W + GAP);
  const y = PAD + 75 + 15;
  const w = STAT_W;
  const h = STAT_H;

  drawCard(ctx, x, y, w, h, { accentTop: true, accentColor });

  text(ctx, label.toUpperCase(), x + 16, y + 18, { size: 13, weight: 700, color: T.textDim });
  text(ctx, value, x + 16, y + 46, { size: 44, weight: 700, color: T.text });
}

// ─── PANELS ────────────────────────────────────────────

export function panelBg(ctx: any, pos: { x: number; y: number; w: number; h: number }) {
  drawCard(ctx, pos.x, pos.y, pos.w, pos.h);
}

export function panelHeader(ctx: any, pos: { x: number; y: number; w: number }, title: string, subtitle?: string) {
  const headerH = 40;

  ctx.save();
  rr(ctx, pos.x, pos.y, pos.w, headerH, THEME.borderRadius);
  ctx.clip();
  fillRect(ctx, pos.x, pos.y, pos.w, headerH, '#16161a', 0);
  ctx.restore();

  // Separator
  fillRect(ctx, pos.x, pos.y + headerH - 1, pos.w, 1, T.borderSubtle);

  text(ctx, title.toUpperCase(), pos.x + 16, pos.y + 11, { size: 20, weight: 700, color: T.text });
  if (subtitle) {
    text(ctx, subtitle, pos.x + 16, pos.y + 28, { size: 11, weight: 500, color: T.textDim });
  }
}

export function panelContentY(pos: { y: number }): number {
  return pos.y + 40;
}

// ─── ROW ITEMS (Leaderboards) ──────────────────────────

export function rowItem(ctx: any, x: number, y: number, w: number, h: number, opts: {
  rank?: number; rankColor?: string; label: string; value: string;
  barPct?: number; isLast?: boolean;
}) {
  if (!opts.isLast) {
    fillRect(ctx, x, y + h - 1, w, 1, T.borderSubtle);
  }

  const rankX = x + 12;
  if (opts.rank !== undefined) {
    const rc = opts.rankColor || T.textDim;
    text(ctx, String(opts.rank).padStart(2, ' '), rankX, y + h / 2 - 10, { size: 18, weight: 700, color: rc });
  }

  const nameX = opts.rank !== undefined ? rankX + 38 : x + 12;
  text(ctx, opts.label, nameX, y + h / 2 - 10, { size: 16, weight: 500, color: T.text });

  text(ctx, opts.value, x + w - 16, y + h / 2 - 10, { size: 16, weight: 700, color: T.accentBright, align: 'right' });

  if (opts.barPct !== undefined && opts.barPct > 0) {
    const barX = nameX;
    const barW = w - nameX - 16 - 100;
    const barY = y + h / 2 + 10;
    fillRect(ctx, barX, barY, barW, 4, '#1e1e24', 2);
    fillRect(ctx, barX, barY, Math.max(barW * opts.barPct, 4), 4, T.accent, 2);
  }
}

// ─── EMPTY STATE ───────────────────────────────────────

export function emptyState(ctx: any, x: number, y: number, w: number, h: number, message?: string) {
  text(ctx, message || 'No data available', x + w / 2, y + h / 2 - 8, {
    size: 14, weight: 500, color: T.textDim, align: 'center', baseline: 'middle'
  });
}

// ─── BAR CHART ─────────────────────────────────────────

export function barChart(ctx: any, x: number, y: number, w: number, h: number, data: number[], opts?: {
  labels?: string[]; color?: string; showValues?: boolean; maxVal?: number;
}) {
  const color = opts?.color || T.accent;
  const max = opts?.maxVal || Math.max(...data, 1);
  const barCount = data.length;
  if (barCount === 0) { emptyState(ctx, x, y, w, h); return; }
  const gap = 3;
  const barW = Math.max((w - gap * (barCount + 1)) / barCount, 4);
  const topPad = 20;
  const chartH = h - topPad - 20;

  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const val = Math.round((max * i) / ySteps);
    const yy = y + topPad + chartH - (i / ySteps) * chartH;
    text(ctx, String(val), x - 8, yy - 7, { size: 12, weight: 500, color: T.chartText, align: 'right' });
    if (i > 0) {
      ctx.setLineDash?.([4, 4]);
      fillRect(ctx, x, yy, w, 1, T.chartGrid);
      ctx.setLineDash?.([]);
    }
  }

  const localMax = opts?.maxVal || Math.max(...data, 1);
  for (let i = 0; i < barCount; i++) {
    const bx = x + gap + i * (barW + gap);
    const bh = localMax > 0 ? (data[i] / localMax) * chartH : 0;
    const by = y + topPad + chartH - bh;

    const isPeak = data[i] === localMax && localMax > 0;
    fillRect(ctx, bx, by, barW, bh, isPeak ? color : '#7f1d1d', 3);

    if (opts?.labels && opts.labels[i] && i % Math.max(1, Math.floor(barCount / 14)) === 0) {
      text(ctx, opts.labels[i], bx + barW / 2, y + topPad + chartH + 6, { size: 11, weight: 500, color: T.textDim, align: 'center' });
    }

    if (opts?.showValues && data[i] > 0 && i % Math.max(1, Math.floor(barCount / 10)) === 0) {
      text(ctx, String(data[i]), bx + barW / 2, by - 16, { size: 11, weight: 600, color: T.textMuted, align: 'center' });
    }
  }
}

// ─── LINE CHART ────────────────────────────────────────

export function lineChart(ctx: any, x: number, y: number, w: number, h: number, data: number[], opts?: {
  color?: string; labels?: string[];
}) {
  const color = opts?.color || T.accent;
  const max = Math.max(...data, 1);
  const n = data.length;
  if (n === 0) { emptyState(ctx, x, y, w, h); return; }
  const topPad = 20;
  const chartH = h - topPad - 20;

  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const val = Math.round((max * i) / ySteps);
    const yy = y + topPad + chartH - (i / ySteps) * chartH;
    text(ctx, String(val), x - 8, yy - 7, { size: 12, weight: 500, color: T.chartText, align: 'right' });
    if (i > 0) {
      ctx.setLineDash?.([4, 4]);
      fillRect(ctx, x, yy, w, 1, T.chartGrid);
      ctx.setLineDash?.([]);
    }
  }

  // Area fill
  ctx.beginPath();
  ctx.moveTo(x, y + topPad + chartH);
  for (let i = 0; i < n; i++) {
    const px = x + (i / (n - 1)) * w;
    const py = y + topPad + chartH - (data[i] / max) * chartH;
    if (i === 0) ctx.lineTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w, y + topPad + chartH);
  ctx.closePath();
  ctx.fillStyle = T.chartFill;
  ctx.fill();

  // Line stroke
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const px = x + (i / (n - 1)) * w;
    const py = y + topPad + chartH - (data[i] / max) * chartH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  if (opts?.labels && opts.labels.length > 0) {
    const step = Math.max(1, Math.floor(n / 12));
    for (let i = 0; i < n; i += step) {
      const px = x + (i / (n - 1)) * w;
      text(ctx, opts.labels[i] || '', px, y + topPad + chartH + 6, { size: 11, weight: 500, color: T.textDim, align: 'center' });
    }
  }
}

// ─── HEATMAP ───────────────────────────────────────────

export function heatmap(ctx: any, x: number, y: number, w: number, h: number, grid: number[][]) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = 7;
  const hours = 24;
  const labelW = 40;
  const topLabelH = 20;
  const cellGap = 4;
  const cellW = (w - labelW - cellGap) / hours;
  const cellH = (h - topLabelH - 30 - cellGap) / days;

  let maxVal = 0;
  for (const row of grid) for (const v of row) if (v > maxVal) maxVal = v;

  // Hour labels
  for (let hr = 0; hr < hours; hr++) {
    if (hr % 3 === 0) {
      text(ctx, `${String(hr).padStart(2, '0')}`, x + labelW + hr * cellW + cellW / 2, y, { size: 11, weight: 500, color: T.textDim, align: 'center' });
    }
  }

  // Day labels + cells
  for (let d = 0; d < days; d++) {
    text(ctx, dayNames[d], x, y + topLabelH + d * cellH + cellH / 2 - 7, { size: 12, weight: 500, color: T.textDim });
    for (let hr = 0; hr < hours; hr++) {
      const val = grid[d]?.[hr] || 0;
      const intensity = maxVal > 0 ? val / maxVal : 0;
      let color: string = T.heat0;
      if (intensity > 0.8) color = T.heat5;
      else if (intensity > 0.6) color = T.heat4;
      else if (intensity > 0.4) color = T.heat3;
      else if (intensity > 0.2) color = T.heat2;
      else if (intensity > 0) color = T.heat1;

      fillRect(ctx, x + labelW + hr * cellW, y + topLabelH + d * cellH, cellW - cellGap, cellH - cellGap, color, 3);
    }
  }

  // Legend
  const legendX = x + labelW;
  const legendY = y + h - 16;
  const legendW = 140;
  text(ctx, 'Less', legendX, legendY, { size: 11, weight: 500, color: T.textDim });
  const step = 5;
  const lw = legendW / step;
  const heatColors = [T.heat0, T.heat2, T.heat3, T.heat4, T.heat5] as string[];
  for (let i = 0; i < step; i++) {
    fillRect(ctx, legendX + 34 + i * lw, legendY, lw - 1, 14, heatColors[i], 3);
  }
  text(ctx, 'More', legendX + 34 + legendW + 6, legendY, { size: 11, weight: 500, color: T.textDim });
}

// ─── FOOTER ────────────────────────────────────────────

export function footer(ctx: any, str: string) {
  text(ctx, str, W / 2, H - 16, { size: 11, weight: 500, color: T.textFaint, align: 'center' });
}
