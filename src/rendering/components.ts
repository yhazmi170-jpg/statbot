import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, STAT_W, STAT_H, GRID_TOP, COL_GAP, fillRect, text, rr, THEME } from './theme.js';

export { COL_GAP, PANEL_W, PANEL_H, PANELS, GRID_TOP, STAT_W, STAT_H, GAP };
export const HALF_W = PANEL_W;

// ─── FORMAT PEAK HOUR (24h to 12h AM/PM) ───────────────

export function formatPeakHour(peakHourRaw: any): string {
  let hour = typeof peakHourRaw === 'string' ? parseInt(peakHourRaw.split(':')[0], 10) : Number(peakHourRaw);
  if (isNaN(hour) || hour < 0 || hour > 23) return '12:00 PM';
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:00 ${period}`;
}

// ─── SANITIZE TEXT (strip unrenderable glyphs) ──────────

export function sanitizeText(str: string): string {
  if (!str) return '';
  const clean = str
    .replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '') // Remove Discord custom emoji codes
    .replace(/[^\x00-\x7F]/g, '')            // Strip non-ASCII characters causing [NO GLYPH]
    .trim();
  return clean.length > 0 ? clean : 'channel';
}

// ─── FIT TEXT (safe truncation) ─────────────────────────

function fontFamily(weight: number): string {
  if (weight >= 700) return 'Inter Bold';
  if (weight >= 600) return 'Inter SemiBold';
  if (weight >= 500) return 'Inter Medium';
  return 'Inter';
}

export function fitText(ctx: any, str: string, x: number, y: number, maxWidth: number, opts: {
  size: number; weight: number; color?: string;
  align?: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom';
}) {
  const font = `${opts.weight} ${opts.size}px ${fontFamily(opts.weight)}`;
  ctx.font = font;
  ctx.fillStyle = opts.color || T.text;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.baseline || 'top';

  let display = str;
  if (ctx.measureText(display).width > maxWidth) {
    while (ctx.measureText(display + '…').width > maxWidth && display.length > 0) {
      display = display.slice(0, -1);
    }
    display += '…';
  }
  ctx.fillText(display, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

// ─── CARD DRAWING ──────────────────────────────────────

function drawCard(ctx: any, x: number, y: number, w: number, h: number, opts?: {
  accentTop?: boolean;
  accentColor?: string;
  subtle?: boolean;
}) {
  fillRect(ctx, x, y, w, h, opts?.subtle ? '#0e0e11' : T.panel, THEME.borderRadius);

  ctx.strokeStyle = T.border;
  ctx.lineWidth = 1;
  rr(ctx, x, y, w, h, THEME.borderRadius);
  ctx.stroke();

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

// ─── STAT CARDS (auto-scale font) ──────────────────────

export function statCard(ctx: any, index: number, label: string, value: string, accentColor?: string) {
  const x = PAD + index * (STAT_W + GAP);
  const y = PAD + 75 + 15;
  const w = STAT_W;
  const h = STAT_H;

  drawCard(ctx, x, y, w, h, { accentTop: true, accentColor });

  text(ctx, label.toUpperCase(), x + 16, y + 18, { size: 13, weight: 700, color: T.textDim });

  // Auto-scale value font to fit card width
  const maxValW = w - 32;
  let fontSize = 44;
  ctx.font = `700 ${fontSize}px ${fontFamily(700)}`;
  while (ctx.measureText(value).width > maxValW && fontSize > 16) {
    fontSize -= 2;
    ctx.font = `700 ${fontSize}px ${fontFamily(700)}`;
  }
  text(ctx, value, x + 16, y + 46, { size: fontSize, weight: 700, color: T.text });
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
  // Alternating row background
  if (opts.rank !== undefined && opts.rank % 2 === 1) {
    fillRect(ctx, x + 4, y + 2, w - 8, h - 4, 'rgba(255,255,255,0.02)', 4);
  }

  if (!opts.isLast) {
    fillRect(ctx, x, y + h - 1, w, 1, T.borderSubtle);
  }

  const rankX = x + 12;
  if (opts.rank !== undefined) {
    const rc = opts.rankColor || T.textDim;
    text(ctx, String(opts.rank).padStart(2, ' '), rankX, y + h / 2 - 10, { size: 18, weight: 700, color: rc });
  }

  const nameX = opts.rank !== undefined ? rankX + 38 : x + 12;
  const maxLabelW = w - (nameX - x) - 16 - 100;
  fitText(ctx, opts.label, nameX, y + h / 2 - 10, maxLabelW, { size: 16, weight: 500, color: T.text });

  text(ctx, opts.value, x + w - 16, y + h / 2 - 10, { size: 16, weight: 700, color: T.accentBright, align: 'right' });

  if (opts.barPct !== undefined && opts.barPct > 0) {
    const barX = nameX;
    const barW = w - nameX - 16 - 100;
    const barY = y + h / 2 + 10;
    fillRect(ctx, barX, barY, barW, 4, '#1e1e24', 2);
    fillRect(ctx, barX, barY, Math.max(barW * opts.barPct, 4), 4, T.accent, 2);
  }
}

// ─── LEADERBOARD (with styled rows & empty states) ─────

export function leaderboard(ctx: any, x: number, y: number, w: number, h: number,
  items: Array<{ name: string; value: number }>, opts?: { maxItems?: number }) {
  const maxItems = opts?.maxItems || 8;
  const rowH = Math.floor((h - 44) / Math.min(items.length || maxItems, maxItems));
  const maxVal = items.length > 0 ? Math.max(...items.map(i => i.value), 1) : 1;

  if (items.length === 0) {
    for (let i = 0; i < maxItems; i++) {
      const ry = y + 40 + i * rowH;
      if (i % 2 === 0) fillRect(ctx, x + 4, ry + 2, w - 8, rowH - 4, 'rgba(255,255,255,0.02)', 4);
      if (i < maxItems - 1) fillRect(ctx, x, ry + rowH - 1, w, 1, T.borderSubtle);
      const rankX = x + 12;
      text(ctx, String(i + 1).padStart(2, ' '), rankX, ry + rowH / 2 - 10, { size: 18, weight: 700, color: T.textFaint });
      text(ctx, '—', rankX + 38, ry + rowH / 2 - 10, { size: 16, weight: 500, color: T.textFaint });
    }
    return;
  }

  for (let i = 0; i < Math.min(items.length, maxItems); i++) {
    const ry = y + 40 + i * rowH;
    const item = items[i];
    const pct = maxVal > 0 ? item.value / maxVal : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.textSecondary : i === 2 ? T.textMuted : T.textDim;

    rowItem(ctx, x, ry, w, rowH, {
      rank: i + 1, rankColor,
      label: item.name,
      value: item.value.toLocaleString(),
      barPct: pct,
      isLast: i === Math.min(items.length, maxItems) - 1,
    });
  }
}

// ─── EMPTY STATE ───────────────────────────────────────

export function emptyState(ctx: any, x: number, y: number, w: number, h: number, message?: string) {
  text(ctx, message || 'No data available', x + w / 2, y + h / 2 - 8, {
    size: 14, weight: 500, color: T.textDim, align: 'center', baseline: 'middle'
  });
}

// ─── AREA LINE CHART (crimson gradient fill) ───────────

export function areaLineChart(ctx: any, x: number, y: number, w: number, h: number, data: number[], opts?: {
  labels?: string[]; color?: string;
}) {
  const n = data.length;
  if (n === 0) { emptyState(ctx, x, y, w, h); return; }

  const color = opts?.color || T.accentBright;
  const max = Math.max(...data, 1);
  const topPad = 20;
  const chartH = h - topPad - 20;

  // Clip to panel bounds to prevent overflow into adjacent panels
  ctx.save();
  ctx.beginPath();
  rr(ctx, x - 40, y - 5, w + 60, h + 10, 8);
  ctx.clip();

  // Y-axis grid + labels (drawn outside clip for labels)
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

  // Build points
  const points = data.map((val, idx) => ({
    px: x + (idx / (n - 1)) * w,
    py: y + topPad + chartH - (val / max) * chartH,
  }));

  // Gradient fill below line
  const gradient = ctx.createLinearGradient(0, y + topPad, 0, y + topPad + chartH);
  gradient.addColorStop(0, 'rgba(220, 38, 38, 0.25)');
  gradient.addColorStop(1, 'rgba(220, 38, 38, 0.0)');

  ctx.beginPath();
  ctx.moveTo(points[0].px, points[0].py);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].px, points[i].py);
  }
  ctx.lineTo(points[points.length - 1].px, y + topPad + chartH);
  ctx.lineTo(points[0].px, y + topPad + chartH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Stroke line
  ctx.beginPath();
  ctx.moveTo(points[0].px, points[0].py);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].px, points[i].py);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore(); // Release clip

  // X-axis labels (outside clip)
  if (opts?.labels && opts.labels.length > 0) {
    const step = Math.max(1, Math.floor(n / 14));
    for (let i = 0; i < n; i += step) {
      const px = x + (i / (n - 1)) * w;
      text(ctx, opts.labels[i] || '', px, y + topPad + chartH + 6, { size: 11, weight: 500, color: T.textDim, align: 'center' });
    }
  }
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

  const labelWidth = 45;
  const headerHeight = 35;
  const footerHeight = 30;

  const gridX = x + labelWidth + 10;
  const gridY = y + headerHeight + 5;
  const gridWidth = w - labelWidth - 30;
  const gridHeight = h - headerHeight - footerHeight - 10;

  const cellWidth = Math.floor(gridWidth / 24);
  const cellHeight = Math.floor(gridHeight / 7);
  const gap = 3;

  let maxVal = 0;
  for (const row of grid) for (const v of row) if (v > maxVal) maxVal = v;

  // Hour headers
  ctx.font = '500 11px Inter';
  ctx.fillStyle = T.textDim;
  for (let hr = 0; hr < 24; hr += 3) {
    const hrText = hr.toString().padStart(2, '0');
    const hrX = gridX + (hr * cellWidth) + (cellWidth / 2) - 6;
    ctx.fillText(hrText, hrX, gridY - 10);
  }

  // Day rows & cells
  for (let d = 0; d < 7; d++) {
    ctx.font = '500 12px Inter';
    ctx.fillStyle = T.textSecondary;
    const dayY = gridY + (d * cellHeight) + (cellHeight / 2) + 4;
    ctx.fillText(dayNames[d], x + 12, dayY);

    for (let hr = 0; hr < 24; hr++) {
      const val = grid[d]?.[hr] || 0;
      const intensity = maxVal > 0 ? val / maxVal : 0;

      let fillColor: string = T.heat0;
      if (intensity > 0.8) fillColor = T.heat5;
      else if (intensity > 0.6) fillColor = T.heat4;
      else if (intensity > 0.4) fillColor = T.heat3;
      else if (intensity > 0.2) fillColor = T.heat2;
      else if (intensity > 0) fillColor = T.heat1;

      const cellX = gridX + (hr * cellWidth);
      const cellY = gridY + (d * cellHeight);

      fillRect(ctx, cellX, cellY, cellWidth - gap, cellHeight - gap, fillColor, 3);
    }
  }

  // Legend
  const legendY = y + h - 15;
  ctx.font = '500 11px Inter';
  ctx.fillStyle = T.textDim;
  ctx.fillText('Less', gridX, legendY);

  const heatColors = [T.heat0, T.heat2, T.heat3, T.heat4, T.heat5] as string[];
  heatColors.forEach((col, i) => {
    fillRect(ctx, gridX + 35 + (i * 16), legendY - 9, 12, 12, col, 2);
  });

  ctx.fillStyle = T.textDim;
  ctx.fillText('More', gridX + 35 + (heatColors.length * 16) + 8, legendY);
}

// ─── FOOTER ────────────────────────────────────────────

export function footer(ctx: any, str: string) {
  text(ctx, str, W / 2, H - 16, { size: 11, weight: 500, color: T.textFaint, align: 'center' });
}
