import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, numStr } from './theme.js';
import { headerBanner, statCard, sectionBg, lineChart, footer, COL_GAP } from './components.js';

interface Data {
  guildName: string;
  days: number;
  dailyGrowth: { date: string; joins: number; leaves: number; net: number; total: number }[];
  totalJoins: number;
  totalLeaves: number;
}

export async function renderGrowth(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  headerBanner(ctx, y, 'Member Growth', `${d.guildName} • Last ${d.days} Days`, {
    rightLabel: 'Net Growth',
    rightValue: `${d.totalJoins - d.totalLeaves >= 0 ? '+' : ''}${numStr(d.totalJoins - d.totalLeaves)}`,
  });
  y += 78;

  // Stats
  const net = d.totalJoins - d.totalLeaves;
  const stats = [
    { label: 'Joined', value: numStr(d.totalJoins), color: T.green },
    { label: 'Left', value: numStr(d.totalLeaves), color: T.red },
    { label: 'Net', value: `${net >= 0 ? '+' : ''}${numStr(net)}`, color: net >= 0 ? T.green : T.red },
    { label: 'Current Members', value: numStr(d.dailyGrowth[d.dailyGrowth.length - 1]?.total || 0), color: T.accentBright },
  ];
  const statW = (W - PAD * 2 - COL_GAP * (stats.length - 1)) / stats.length;
  const statH = 72;
  for (let i = 0; i < stats.length; i++) {
    statCard(ctx, PAD + i * (statW + COL_GAP), y, statW, statH, stats[i].label, stats[i].value, stats[i].color);
  }
  y += statH + 14;

  // Chart fills the rest
  const chartH = H - y - PAD - 44;
  sectionBg(ctx, PAD, y, W - PAD * 2, chartH);
  fillRect(ctx, PAD, y, W - PAD * 2, 34, T.panelAlt, 0);
  text(ctx, 'MEMBER COUNT OVER TIME', PAD + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const memberTotal = d.dailyGrowth.map(g => g.total);
  const dayLabels = d.dailyGrowth.map((_, i) => String(i + 1));
  const ls = Math.max(1, Math.floor(dayLabels.length / 15));
  lineChart(ctx, PAD + 60, y + 48, W - PAD * 2 - 90, chartH - 68, memberTotal, {
    color: T.accentBright,
    labels: dayLabels.filter((_, i) => i % ls === 0),
  });

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
