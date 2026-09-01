import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, numStr } from './theme.js';
import { headerBanner, sectionBg, barChart, footer } from './components.js';

interface Data {
  guildName: string;
  hourly: { hour: number; messages: number }[];
}

export async function renderActivityChart(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  const total = d.hourly.reduce((s, h) => s + h.messages, 0);
  const peak = d.hourly.reduce((a, b) => b.messages > a.messages ? b : a, { hour: 0, messages: 0 });

  headerBanner(ctx, y, 'Activity by Hour', `${d.guildName} • Last 7 Days`, {
    rightLabel: 'Total Messages',
    rightValue: numStr(total),
  });
  y += 78;

  // Chart fills the rest
  const chartH = H - y - PAD - 44;
  sectionBg(ctx, PAD, y, W - PAD * 2, chartH);
  fillRect(ctx, PAD, y, W - PAD * 2, 34, T.panelAlt, 0);
  text(ctx, 'HOURLY DISTRIBUTION', PAD + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  text(ctx, `Peak: ${String(peak.hour).padStart(2, '0')}:00 — ${numStr(peak.messages)} messages`, PAD + 16, y + 22, { size: 10, color: T.textDim });

  barChart(ctx, PAD + 60, y + 48, W - PAD * 2 - 90, chartH - 68, d.hourly.map(h => h.messages), {
    labels: d.hourly.map(h => `${String(h.hour).padStart(2, '0')}`),
    showValues: true,
  });

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
