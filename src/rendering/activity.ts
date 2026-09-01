import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, fillRect, text, numStr } from './theme.js';
import { headerBanner, panelBg, panelHeader, panelContentY, areaLineChart, footer, formatPeakHour } from './components.js';

interface Data { guildName: string; hourly: { hour: number; messages: number }[] }

export async function renderActivityChart(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  const total = d.hourly.reduce((s, h) => s + h.messages, 0);
  const peak = d.hourly.reduce((a, b) => b.messages > a.messages ? b : a, { hour: 0, messages: 0 });

  headerBanner(ctx, 'Activity by Hour', `${d.guildName} • Last 7 Days`, {
    rightLabel: 'Total Messages', rightValue: numStr(total),
  });

  const fullW = W - PAD * 2;
  const fullH = H - PAD - 75 - 15 - GAP - 25;
  const panelY = PAD + 75 + 15;
  panelBg(ctx, { x: PAD, y: panelY, w: fullW, h: fullH });
  panelHeader(ctx, { x: PAD, y: panelY, w: fullW }, 'Hourly Distribution', `Peak: ${formatPeakHour(peak.hour)} — ${numStr(peak.messages)} messages`);
  areaLineChart(ctx, PAD + 60, panelContentY({ y: panelY }), fullW - 90, fullH - 55,
    d.hourly.map(h => h.messages), {
      labels: d.hourly.map(h => `${String(h.hour).padStart(2, '0')}`),
    });

  footer(ctx, 'StatBot  •  m?help for commands');
  return canvas.toBuffer('image/png');
}
