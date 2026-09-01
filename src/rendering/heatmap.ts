import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, numStr } from './theme.js';
import { headerBanner, sectionBg, heatmap, footer } from './components.js';

interface Data {
  guildName: string;
  grid: number[][];
}

export async function renderHeatmap(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  // Peak info
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
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  headerBanner(ctx, y, 'Activity Heatmap', `${d.guildName} • Last 7 Days`, {
    rightLabel: 'Peak',
    rightValue: peakVal > 0 ? `${dayNames[peakDay]} ${String(peakHour).padStart(2, '0')}:00` : '—',
  });
  y += 78;

  // Heatmap fills the entire remaining space
  const mapH = H - y - PAD - 44;
  sectionBg(ctx, PAD, y, W - PAD * 2, mapH);
  fillRect(ctx, PAD, y, W - PAD * 2, 34, T.panelAlt, 0);
  text(ctx, 'HOURLY ACTIVITY', PAD + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  text(ctx, `${numStr(peakVal)} messages at peak`, PAD + 16, y + 22, { size: 10, color: T.textDim });

  heatmap(ctx, PAD + 20, y + 44, W - PAD * 2 - 40, mapH - 56, d.grid);

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
