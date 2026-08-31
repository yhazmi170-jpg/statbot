import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, numStr, PAD } from './theme.js';
import { sectionBg, lineChart, footer, COL_GAP } from './components.js';

interface Data {
  guildName: string;
  days: number;
  dailyGrowth: { date: string; joins: number; leaves: number; net: number; total: number }[];
  totalJoins: number;
  totalLeaves: number;
}

export async function renderGrowth(d: Data): Promise<Buffer> {
  const W = 1400, H = 600;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);
  let y = PAD;

  fillRect(ctx, PAD, y, W - PAD * 2, 52, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, 'MEMBER GROWTH', PAD + 16, y + 8, { size: 15, weight: 700, color: T.accentBright });
  text(ctx, `${d.guildName} • Last ${d.days} Days`, PAD + 16, y + 30, { size: 11, color: T.textMuted });
  y += 64;

  // Stat cards
  const net = d.totalJoins - d.totalLeaves;
  const items = [
    { label: 'Joined', value: numStr(d.totalJoins), color: T.green },
    { label: 'Left', value: numStr(d.totalLeaves), color: T.red },
    { label: 'Net', value: `${net >= 0 ? '+' : ''}${numStr(net)}`, color: net >= 0 ? T.green : T.red },
    { label: 'Current', value: numStr(d.dailyGrowth[d.dailyGrowth.length - 1]?.total || 0), color: T.accentBright },
  ];
  const statW = (W - PAD * 2 - COL_GAP * (items.length - 1)) / items.length;
  for (let i = 0; i < items.length; i++) {
    const sx = PAD + i * (statW + COL_GAP);
    fillRect(ctx, sx, y, statW, 52, T.panel, 6);
    fillRect(ctx, sx, y, statW, 1, T.border);
    text(ctx, items[i].label.toUpperCase(), sx + 12, y + 8, { size: 10, weight: 600, color: T.textDim });
    text(ctx, items[i].value, sx + 12, y + 26, { size: 18, weight: 700, color: items[i].color });
  }
  y += 64;

  // Chart
  const chartH = H - y - PAD - 20;
  sectionBg(ctx, PAD, y, W - PAD * 2, chartH);
  const memberTotal = d.dailyGrowth.map(g => g.total);
  const dayLabels = d.dailyGrowth.map((_, i) => String(i + 1));
  const ls = Math.max(1, Math.floor(dayLabels.length / 10));
  lineChart(ctx, PAD + 4, y + 2, W - PAD * 2 - 8, chartH - 4, memberTotal, {
    title: 'MEMBER COUNT OVER TIME',
    labels: dayLabels.filter((_, i) => i % ls === 0),
    color: T.accentBright,
  });

  footer(ctx, 'StatBot • m?help for commands');

  return canvas.toBuffer('image/png');
}
