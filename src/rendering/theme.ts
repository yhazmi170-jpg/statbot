export const PAD = 30;

export const T = {
  W: 1400,
  H: 900,

  // Backgrounds
  bg: '#0d0d0f',
  panel: '#141418',
  panelAlt: '#1a1a1f',
  panelHover: '#1f1f25',
  row: '#111114',
  rowAlt: '#161619',

  // Borders
  border: '#2a1012',
  borderLight: '#3a1518',
  borderAccent: '#6f0000',

  // Text
  text: '#e8e6e3',
  textMuted: '#9a9590',
  textDim: '#6a6560',
  textFaint: '#4a4540',

  // Primary accent — deep Marlboro red
  accent: '#8b0000',
  accentBright: '#a51d1d',
  accentSoft: '#6f0000',
  accentBg: 'rgba(139,0,0,0.12)',
  accentBorder: '#5a0000',

  // Positive
  green: '#3a7a3a',
  greenSoft: '#2d5e2d',
  greenBg: 'rgba(58,122,58,0.10)',

  // Negative
  red: '#8b0000',
  redSoft: '#6f0000',
  redBg: 'rgba(139,0,0,0.10)',

  // Warning
  yellow: '#c9a84c',
  yellowSoft: '#8a7235',

  // Chart
  chartLine: '#8b0000',
  chartFill: 'rgba(139,0,0,0.18)',
  chartGrid: '#1f1516',
  chartText: '#6a5555',

  // Heatmap — red scale
  heat0: '#111114',
  heat1: '#2a1012',
  heat2: '#3d1518',
  heat3: '#5a1a1a',
  heat4: '#7a2020',
  heat5: '#a52828',

  // Fonts
  font: 'sans-serif',
} as const;

// ─── Utility ──────────────────────────────────────────

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

export function text(ctx: any, str: string, x: number, y: number, opts?: {
  size?: number; weight?: number; color?: string; align?: 'left'|'center'|'right'; baseline?: 'top'|'middle'|'bottom';
}) {
  const o = opts || {};
  ctx.fillStyle = o.color || T.text;
  ctx.font = `${o.weight || 400} ${o.size || 14}px ${T.font}`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'top';
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

export function truncate(ctx: any, str: string, maxW: number, opts?: { size?: number; weight?: number }): string {
  ctx.font = `${opts?.weight || 400} ${opts?.size || 13}px ${T.font}`;
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
