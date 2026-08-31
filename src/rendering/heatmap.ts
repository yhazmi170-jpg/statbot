import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, numStr, PAD } from './theme.js';
import { heatmap as drawHeatmap, footer } from './components.js';

interface Data {
  guildName: string;
  grid: number[][];
}

export async function renderHeatmap(d: Data): Promise<Buffer> {
  const W = 1400, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  fillRect(ctx, PAD, y, W - PAD * 2, 52, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, 'ACTIVITY HEATMAP', PAD + 16, y + 8, { size: 15, weight: 700, color: T.accentBright });
  text(ctx, `${d.guildName} • Last 7 Days`, PAD + 16, y + 30, { size: 11, color: T.textMuted });

  let peakVal = 0, peakDay = 0, peakHour = 0;
  for (let d2 = 0; d2 < d.grid.length; d2++) {
    for (let h = 0; h < (d.grid[d2]?.length || 0); h++) {
      if ((d.grid[d2]?.[h] || 0) > peakVal) {
        peakVal = d.grid[d2][h];
        peakDay = d2;
        peakHour = h;
      }
    }
  }
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (peakVal > 0) {
    text(ctx, `Peak: ${dayNames[peakDay]} ${String(peakHour).padStart(2, '0')}:00`, W - PAD - 16, y + 8, { size: 13, weight: 700, color: T.accentBright, align: 'right' });
    text(ctx, `${numStr(peakVal)} messages`, W - PAD - 16, y + 28, { size: 11, color: T.textMuted, align: 'right' });
  }

  y += 64;

  fillRect(ctx, PAD, y, W - PAD * 2, H - y - 36, T.panel, 6);
  drawHeatmap(ctx, PAD + 8, y + 8, W - PAD * 2 - 16, H - y - 52, d.grid);

  footer(ctx, 'StatBot • m?help for commands');

  return canvas.toBuffer('image/png');
}
