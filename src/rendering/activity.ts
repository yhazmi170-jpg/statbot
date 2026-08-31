import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, numStr, PAD } from './theme.js';
import { footer } from './components.js';

interface Data {
  guildName: string;
  hourly: { hour: number; messages: number }[];
}

export async function renderActivityChart(d: Data): Promise<Buffer> {
  const W = 1400, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  // Header
  fillRect(ctx, PAD, y, W - PAD * 2, 52, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, 'ACTIVITY BY HOUR', PAD + 16, y + 8, { size: 15, weight: 700, color: T.accentBright });
  text(ctx, `${d.guildName} • Last 7 Days`, PAD + 16, y + 30, { size: 11, color: T.textMuted });
  const total = d.hourly.reduce((s, h) => s + h.messages, 0);
  text(ctx, `${numStr(total)} total`, W - PAD - 16, y + 8, { size: 14, weight: 700, color: T.accentBright, align: 'right' });
  text(ctx, 'MESSAGES', W - PAD - 16, y + 28, { size: 9, color: T.textDim, align: 'right' });
  y += 64;

  // Chart
  fillRect(ctx, PAD, y, W - PAD * 2, H - y - 36, T.panel, 6);

  const chartX = PAD + 50;
  const chartY = y + 14;
  const chartW = W - PAD * 2 - 70;
  const chartH = H - y - 64;

  const data = d.hourly.map(h => h.messages);
  const max = Math.max(...data, 1);

  // Y axis
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const val = Math.round((max * i) / ySteps);
    const yy = chartY + chartH - (i / ySteps) * chartH;
    text(ctx, numStr(val), chartX - 8, yy - 6, { size: 9, color: T.chartText, align: 'right' });
    if (i > 0) fillRect(ctx, chartX, yy, chartW, 1, T.chartGrid);
  }

  // Bars
  const barW = chartW / 24;
  for (let h = 0; h < 24; h++) {
    const bx = chartX + h * barW;
    const bh = (data[h] / max) * chartH;
    const by = chartY + chartH - bh;

    const isPeak = data[h] === max;
    const gradient = ctx.createLinearGradient(bx, by, bx, by + bh);
    gradient.addColorStop(0, isPeak ? T.accentBright : T.accent);
    gradient.addColorStop(1, isPeak ? T.accent : T.accentSoft);
    ctx.beginPath();
    ctx.rect(bx + 2, by, barW - 4, bh);
    ctx.fillStyle = gradient;
    ctx.fill();

    if (h % 3 === 0) {
      text(ctx, `${String(h).padStart(2, '0')}`, bx + barW / 2, chartY + chartH + 4, { size: 9, color: T.textDim, align: 'center' });
    }
    if (isPeak) {
      text(ctx, numStr(data[h]), bx + barW / 2, by - 12, { size: 9, weight: 700, color: T.accentBright, align: 'center' });
    }
  }

  footer(ctx, 'StatBot • m?help for commands');

  return canvas.toBuffer('image/png');
}
