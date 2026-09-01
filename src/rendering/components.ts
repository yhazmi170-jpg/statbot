import { T, W, H, PAD, COL_GAP, fillRect, text, rr } from './theme.js';

export { COL_GAP };
export const HALF_W = (W - PAD * 2 - COL_GAP) / 2;
export const THIRD_W = (W - PAD * 2 - COL_GAP * 2) / 3;

export function sectionBg(ctx: any, x: number, y: number, w: number, h: number) {
  fillRect(ctx, x, y, w, h, T.panel, 8);
}

export function sectionHeader(ctx: any, x: number, y: number, w: number, title: string, subtitle?: string) {
  fillRect(ctx, x, y, w, 36, T.panelAlt, 0);
  text(ctx, title.toUpperCase(), x + 16, y + 8, { size: 12, weight: 700, color: T.accentBright });
  if (subtitle) {
    text(ctx, subtitle, x + 16, y + 22, { size: 10, color: T.textDim });
  }
}

export function statCard(ctx: any, x: number, y: number, w: number, h: number, label: string, value: string, accentColor?: string) {
  fillRect(ctx, x, y, w, h, T.panel, 8);
  fillRect(ctx, x, y, w, 1, T.border);
  text(ctx, label.toUpperCase(), x + 16, y + 12, { size: 11, weight: 600, color: T.textDim });
  text(ctx, value, x + 16, y + 30, { size: 28, weight: 700, color: accentColor || T.text });
}

export function rowItem(ctx: any, x: number, y: number, w: number, h: number, opts: {
  rank?: number; rankColor?: string; label: string; value: string;
  barPct?: number; isLast?: boolean;
}) {
  if (!opts.isLast) {
    fillRect(ctx, x, y + h - 1, w, 1, T.border);
  }

  const rankX = x + 12;
  if (opts.rank !== undefined) {
    const rc = opts.rankColor || T.textDim;
    text(ctx, String(opts.rank).padStart(2, ' '), rankX, y + h / 2 - 10, { size: 18, weight: 700, color: rc });
  }

  const nameX = opts.rank !== undefined ? rankX + 38 : x + 12;
  text(ctx, opts.label, nameX, y + h / 2 - 10, { size: 14, weight: 600, color: T.text });

  text(ctx, opts.value, x + w - 16, y + h / 2 - 10, { size: 14, weight: 700, color: T.accentBright, align: 'right' });

  if (opts.barPct !== undefined && opts.barPct > 0) {
    const barX = nameX;
    const barW = w - nameX - 16 - 80;
    const barY = y + h / 2 + 8;
    fillRect(ctx, barX, barY, barW, 4, T.panelAlt, 2);
    fillRect(ctx, barX, barY, Math.max(barW * opts.barPct, 4), 4, T.accent, 2);
  }
}

export function barChart(ctx: any, x: number, y: number, w: number, h: number, data: number[], opts?: {
  labels?: string[]; color?: string; showValues?: boolean; maxVal?: number;
}) {
  const color = opts?.color || T.accentBright;
  const max = opts?.maxVal || Math.max(...data, 1);
  const barCount = data.length;
  const gap = 3;
  const barW = Math.max((w - gap * (barCount + 1)) / barCount, 4);
  const topPad = 14;
  const chartH = h - topPad;

  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const val = Math.round((max * i) / ySteps);
    const yy = y + topPad + chartH - (i / ySteps) * chartH;
    text(ctx, String(val), x - 8, yy - 7, { size: 10, color: T.chartText, align: 'right' });
    if (i > 0) fillRect(ctx, x, yy, w, 1, T.chartGrid);
  }

  const localMax = opts?.maxVal || Math.max(...data, 1);
  for (let i = 0; i < barCount; i++) {
    const bx = x + gap + i * (barW + gap);
    const bh = localMax > 0 ? (data[i] / localMax) * chartH : 0;
    const by = y + topPad + chartH - bh;

    const isPeak = data[i] === localMax && localMax > 0;
    fillRect(ctx, bx, by, barW, bh, isPeak ? color : T.accent, 3);

    if (opts?.labels && opts.labels[i] && i % Math.max(1, Math.floor(barCount / 12)) === 0) {
      text(ctx, opts.labels[i], bx + barW / 2, y + topPad + chartH + 5, { size: 10, color: T.textDim, align: 'center' });
    }

    if (opts?.showValues && data[i] > 0 && i % Math.max(1, Math.floor(barCount / 8)) === 0) {
      text(ctx, String(data[i]), bx + barW / 2, by - 14, { size: 10, weight: 600, color: T.textMuted, align: 'center' });
    }
  }
}

export function lineChart(ctx: any, x: number, y: number, w: number, h: number, data: number[], opts?: {
  color?: string; labels?: string[];
}) {
  const color = opts?.color || T.accentBright;
  const max = Math.max(...data, 1);
  const n = data.length;
  if (n === 0) return;
  const topPad = 14;
  const chartH = h - topPad;

  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const val = Math.round((max * i) / ySteps);
    const yy = y + topPad + chartH - (i / ySteps) * chartH;
    text(ctx, String(val), x - 8, yy - 7, { size: 10, color: T.chartText, align: 'right' });
    if (i > 0) fillRect(ctx, x, yy, w, 1, T.chartGrid);
  }

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

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const px = x + (i / (n - 1)) * w;
    const py = y + topPad + chartH - (data[i] / max) * chartH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (opts?.labels && opts.labels.length > 0) {
    const step = Math.max(1, Math.floor(n / 10));
    for (let i = 0; i < n; i += step) {
      const px = x + (i / (n - 1)) * w;
      text(ctx, opts.labels[i] || '', px, y + topPad + chartH + 5, { size: 10, color: T.textDim, align: 'center' });
    }
  }
}

export function heatmap(ctx: any, x: number, y: number, w: number, h: number, grid: number[][]) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = 7;
  const hours = 24;
  const labelW = 36;
  const labelH = 22;
  const cellGap = 2;
  const cellW = (w - labelW - cellGap) / hours;
  const cellH = (h - labelH - cellGap) / days;

  let maxVal = 0;
  for (const row of grid) {
    for (const v of row) {
      if (v > maxVal) maxVal = v;
    }
  }

  for (let hr = 0; hr < hours; hr++) {
    if (hr % 3 === 0) {
      text(ctx, `${String(hr).padStart(2, '0')}`, x + labelW + hr * cellW + cellW / 2, y, { size: 10, color: T.textDim, align: 'center' });
    }
  }

  for (let d = 0; d < days; d++) {
    text(ctx, dayNames[d], x, y + labelH + d * cellH + cellH / 2 - 6, { size: 10, color: T.textDim });
    for (let hr = 0; hr < hours; hr++) {
      const val = grid[d]?.[hr] || 0;
      const intensity = maxVal > 0 ? val / maxVal : 0;
      let color: string = T.heat0;
      if (intensity > 0.8) color = T.heat5;
      else if (intensity > 0.6) color = T.heat4;
      else if (intensity > 0.4) color = T.heat3;
      else if (intensity > 0.2) color = T.heat2;
      else if (intensity > 0) color = T.heat1;

      fillRect(ctx, x + labelW + hr * cellW, y + labelH + d * cellH, cellW - cellGap, cellH - cellGap, color, 3);
    }
  }

  const legendX = x + labelW;
  const legendY = y + h - 12;
  const legendW = 120;
  text(ctx, 'Less', legendX, legendY, { size: 9, color: T.textDim });
  const step = 5;
  const lw = legendW / step;
  const heatColors = [T.heat0, T.heat2, T.heat3, T.heat4, T.heat5] as string[];
  for (let i = 0; i < step; i++) {
    fillRect(ctx, legendX + 30 + i * lw, legendY, lw - 1, 12, heatColors[i], 2);
  }
  text(ctx, 'More', legendX + 30 + legendW + 4, legendY, { size: 9, color: T.textDim });
}

export function footer(ctx: any, str: string) {
  text(ctx, str, W / 2, H - 14, { size: 10, color: T.textFaint, align: 'center' });
}

export function headerBanner(ctx: any, y: number, title: string, subtitle: string, opts?: {
  rightLabel?: string; rightValue?: string;
}) {
  fillRect(ctx, PAD, y, W - PAD * 2, 64, T.panel, 8);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, title.toUpperCase(), PAD + 20, y + 14, { size: 22, weight: 700, color: T.accentBright });
  text(ctx, subtitle, PAD + 20, y + 38, { size: 12, color: T.textMuted });

  if (opts?.rightLabel && opts?.rightValue) {
    text(ctx, opts.rightValue, W - PAD - 20, y + 10, { size: 26, weight: 700, color: T.accentBright, align: 'right' });
    text(ctx, opts.rightLabel.toUpperCase(), W - PAD - 20, y + 40, { size: 10, weight: 600, color: T.textDim, align: 'right' });
  }
}
