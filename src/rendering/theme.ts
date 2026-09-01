import { GlobalFonts } from '@napi-rs/canvas';
import { join } from 'path';

const fontsDir = join(process.cwd(), 'fonts');
GlobalFonts.registerFromPath(join(fontsDir, 'Inter-Regular.ttf'), 'Inter');
GlobalFonts.registerFromPath(join(fontsDir, 'Inter-Bold.ttf'), 'Inter Bold');
GlobalFonts.registerFromPath(join(fontsDir, 'Inter-Medium.ttf'), 'Inter Medium');
GlobalFonts.registerFromPath(join(fontsDir, 'Inter-SemiBold.ttf'), 'Inter SemiBold');

// ─── SCALE TOKENS ──────────────────────────────────────

export const THEME = {
  canvas: { width: 1400, height: 900 },
  padding: 32,
  gap: 20,

  colors: {
    bg: '#09090b',
    cardBg: '#121215',
    cardBgHover: '#16161a',
    border: '#27272a',
    borderSubtle: '#1f1f23',
    accent: '#dc2626',
    accentDim: '#991b1b',
    accentGlow: 'rgba(220, 38, 38, 0.12)',
    textPrimary: '#fafafa',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    textDim: '#52525b',
    gridLines: '#1e1e24',
    chartLine: '#dc2626',
    chartFill: 'rgba(220, 38, 38, 0.15)',
  },

  fonts: {
    title: 'bold 36px Inter',
    subtitle: '500 18px Inter',
    panelHeader: 'bold 20px Inter',
    statValue: 'bold 44px Inter',
    statLabel: 'bold 13px Inter',
    body: '500 16px Inter',
    bodyBold: 'bold 16px Inter',
    small: '500 13px Inter',
    tiny: '500 11px Inter',
  },

  borderRadius: 10,
} as const;

// ─── LAYOUT CONSTANTS ──────────────────────────────────

export const W = THEME.canvas.width;
export const H = THEME.canvas.height;
export const PAD = THEME.padding;
export const GAP = THEME.gap;

// Stat cards
export const STAT_H = 110;
export const STAT_W = (W - PAD * 2 - GAP * 4) / 5;

// Main content grid
export const GRID_TOP = PAD + 75 + 15 + STAT_H + 15;
export const PANEL_W = (W - PAD * 2 - GAP) / 2;
export const PANEL_H = (H - GRID_TOP - PAD - 25) / 2;

// Panel positions
export const PANELS = {
  topLeft:     { x: PAD, y: GRID_TOP, w: PANEL_W, h: PANEL_H },
  topRight:    { x: PAD + PANEL_W + GAP, y: GRID_TOP, w: PANEL_W, h: PANEL_H },
  bottomLeft:  { x: PAD, y: GRID_TOP + PANEL_H + GAP, w: PANEL_W, h: PANEL_H },
  bottomRight: { x: PAD + PANEL_W + GAP, y: GRID_TOP + PANEL_H + GAP, w: PANEL_W, h: PANEL_H },
} as const;

// ─── LEGACY COMPAT (used by renderers that import T.* directly) ──

export const T = {
  W, H, PAD,

  bg: THEME.colors.bg,
  panel: THEME.colors.cardBg,
  panelAlt: '#16161a',
  row: '#0e0e11',
  rowAlt: '#131316',

  border: THEME.colors.border,
  borderLight: '#2a2a2e',
  borderSubtle: THEME.colors.borderSubtle,

  text: THEME.colors.textPrimary,
  textSecondary: THEME.colors.textSecondary,
  textMuted: THEME.colors.textMuted,
  textDim: THEME.colors.textDim,
  textFaint: '#3f3f46',

  accent: THEME.colors.accent,
  accentBright: '#ef4444',
  accentSoft: '#991b1b',
  accentDim: '#7f1d1d',
  accentBg: THEME.colors.accentGlow,

  green: '#22c55e',
  greenSoft: '#16a34a',
  red: '#dc2626',
  redSoft: '#991b1b',
  yellow: '#eab308',

  chartLine: THEME.colors.chartLine,
  chartFill: THEME.colors.chartFill,
  chartGrid: THEME.colors.gridLines,
  chartText: '#71717a',

  heat0: '#18181b',
  heat1: '#450a0a',
  heat2: '#7f1d1d',
  heat3: '#991b1b',
  heat4: '#dc2626',
  heat5: '#ef4444',
} as const;

// ─── EXPORTS ───────────────────────────────────────────

export const COL_GAP = GAP;
export const HALF_W = PANEL_W;

// ─── UTILITIES ─────────────────────────────────────────

export function rr(ctx: any, x: number, y: number, w: number, h: number, r: number) {
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

export function fillRect(ctx: any, x: number, y: number, w: number, h: number, color: string, radius = 0) {
  if (color) ctx.fillStyle = color;
  if (radius > 0) { rr(ctx, x, y, w, h, radius); ctx.fill(); }
  else ctx.fillRect(x, y, w, h);
}

function fontFamily(weight: number): string {
  if (weight >= 700) return 'Inter Bold';
  if (weight >= 600) return 'Inter SemiBold';
  if (weight >= 500) return 'Inter Medium';
  return 'Inter';
}

export function text(ctx: any, str: string, x: number, y: number, opts?: {
  size?: number; weight?: number; color?: string;
  align?: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom';
}) {
  const o = opts || {};
  ctx.fillStyle = o.color || T.text;
  ctx.font = `${o.weight || 400} ${o.size || 14}px ${fontFamily(o.weight || 400)}`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'top';
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

export function truncate(ctx: any, str: string, maxW: number, opts?: { size?: number; weight?: number }): string {
  const w = opts?.weight || 400;
  ctx.font = `${w} ${opts?.size || 16}px ${fontFamily(w)}`;
  if (ctx.measureText(str).width <= maxW) return str;
  let s = str;
  while (s.length > 0 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}

export function numStr(n: number): string {
  return n.toLocaleString('en-US');
}

export function durStr(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 1000) return (h / 1000).toFixed(1) + 'kh';
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function pctStr(a: number, b: number): string {
  if (b === 0) return '—';
  const p = ((a - b) / b) * 100;
  if (p > 0) return `+${p.toFixed(1)}%`;
  return `${p.toFixed(1)}%`;
}

export function arrowForChange(current: number, previous: number): string {
  if (current > previous) return '↑';
  if (current < previous) return '↓';
  return '→';
}
