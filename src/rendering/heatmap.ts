import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, fillRect, text, numStr } from './theme.js';
import { headerBanner, panelBg, panelHeader, panelContentY, heatmap, footer, formatPeakHour, panelClip, panelRestore } from './components.js';

interface Data { guildName: string; grid: number[][] }

export async function renderHeatmap(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  let peakVal = 0, peakDay = 0, peakHour = 0;
  for (let d2 = 0; d2 < d.grid.length; d2++) {
    for (let h = 0; h < (d.grid[d2]?.length || 0); h++) {
      if ((d.grid[d2]?.[h] || 0) > peakVal) { peakVal = d.grid[d2][h]; peakDay = d2; peakHour = h; }
    }
  }
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  headerBanner(ctx, 'Activity Heatmap', `${d.guildName} • Last 7 Days`, {
    rightLabel: 'Peak', rightValue: peakVal > 0 ? `${dayNames[peakDay]} ${formatPeakHour(peakHour)}` : '—',
  });

  const fullW = W - PAD * 2;
  const fullH = H - PAD - 75 - 15 - GAP - 25;
  const panelY = PAD + 75 + 15;
  panelBg(ctx, { x: PAD, y: panelY, w: fullW, h: fullH });
  panelClip(ctx, { x: PAD, y: panelY, w: fullW, h: fullH });
  panelHeader(ctx, { x: PAD, y: panelY, w: fullW }, 'Hourly Activity', `${numStr(peakVal)} messages at peak`);
  heatmap(ctx, PAD + 20, panelContentY({ y: panelY }), fullW - 40, fullH - 55, d.grid);
  panelRestore(ctx);

  footer(ctx, 'StatBot  •  m?help for commands');
  return canvas.toBuffer('image/png');
}
