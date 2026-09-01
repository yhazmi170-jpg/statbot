import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, STAT_W, STAT_H, GRID_TOP, fillRect, text, numStr } from './theme.js';
import { headerBanner, statCard, panelBg, panelHeader, panelContentY, lineChart, footer, COL_GAP } from './components.js';

interface Data {
  guildName: string; days: number;
  dailyGrowth: { date: string; joins: number; leaves: number; net: number; total: number }[];
  totalJoins: number; totalLeaves: number;
}

export async function renderGrowth(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  const net = d.totalJoins - d.totalLeaves;
  headerBanner(ctx, 'Member Growth', `${d.guildName} • Last ${d.days} Days`, {
    rightLabel: 'Net Growth', rightValue: `${net >= 0 ? '+' : ''}${numStr(net)}`,
  });

  const stats = [
    { label: 'Joined', value: numStr(d.totalJoins), color: T.green },
    { label: 'Left', value: numStr(d.totalLeaves), color: T.red },
    { label: 'Net', value: `${net >= 0 ? '+' : ''}${numStr(net)}`, color: net >= 0 ? T.green : T.red },
    { label: 'Current Members', value: numStr(d.dailyGrowth[d.dailyGrowth.length - 1]?.total || 0), color: T.accentBright },
  ];
  for (let i = 0; i < stats.length; i++) statCard(ctx, i, stats[i].label, stats[i].value, stats[i].color);

  const fullW = W - PAD * 2;
  const fullH = H - PAD - 75 - 15 - STAT_H - 15 - GAP - 25;
  const panelY = PAD + 75 + 15 + STAT_H + 15;
  panelBg(ctx, { x: PAD, y: panelY, w: fullW, h: fullH });
  panelHeader(ctx, { x: PAD, y: panelY, w: fullW }, 'Member Count Over Time');

  const memberTotal = d.dailyGrowth.map(g => g.total);
  const dayLabels = d.dailyGrowth.map((_, i) => String(i + 1));
  const ls = Math.max(1, Math.floor(dayLabels.length / 15));
  lineChart(ctx, PAD + 60, panelContentY({ y: panelY }), fullW - 90, fullH - 55,
    memberTotal, { color: T.accentBright, labels: dayLabels.filter((_, i) => i % ls === 0) });

  footer(ctx, 'StatBot  •  m?help for commands');
  return canvas.toBuffer('image/png');
}
