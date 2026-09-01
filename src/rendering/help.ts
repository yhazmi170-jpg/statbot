import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, fillRect, text, rr, THEME } from './theme.js';
import { footer, COL_GAP } from './components.js';

interface Cmd { name: string; description: string; category: string }

export async function renderHelp(commands: Cmd[], prefix: string, guildName?: string): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  const hdrY = PAD;
  const hdrH = 75;
  fillRect(ctx, PAD, hdrY, W - PAD * 2, hdrH, T.panel, THEME.borderRadius);
  text(ctx, 'STATBOT', PAD + 24, hdrY + 16, { size: 36, weight: 700, color: T.text });
  text(ctx, `Command Reference  •  Prefix: ${prefix}`, PAD + 24, hdrY + 50, { size: 18, weight: 500, color: T.textMuted });

  const startY = hdrY + hdrH + 20;

  const cats = new Map<string, Cmd[]>();
  for (const c of commands) {
    const list = cats.get(c.category) || [];
    list.push(c);
    cats.set(c.category, list);
  }

  const catEntries = Array.from(cats.entries());
  const cols = Math.min(catEntries.length, 3);
  const colW = (W - PAD * 2 - COL_GAP * (cols - 1)) / cols;
  const maxRows = Math.ceil(catEntries.length / cols);
  const rowH = Math.floor((H - startY - PAD - 25) / maxRows);

  for (let ci = 0; ci < catEntries.length; ci++) {
    const [cat, cmds] = catEntries[ci];
    const col = ci % cols;
    const row = Math.floor(ci / cols);
    const cx = PAD + col * (colW + COL_GAP);
    const cy = startY + row * (rowH + COL_GAP);

    fillRect(ctx, cx, cy, colW, rowH - COL_GAP, T.panel, THEME.borderRadius);
    ctx.strokeStyle = T.border;
    ctx.lineWidth = 1;
    rr(ctx, cx, cy, colW, rowH - COL_GAP, THEME.borderRadius);
    ctx.stroke();

    // Category header - subtle dark bg, no bright red
    ctx.save();
    rr(ctx, cx, cy, colW, 40, THEME.borderRadius);
    ctx.clip();
    fillRect(ctx, cx, cy, colW, 40, '#16161a', 0);
    ctx.restore();
    fillRect(ctx, cx, cy + 39, colW, 1, T.borderSubtle);
    text(ctx, cat.toUpperCase(), cx + 16, cy + 11, { size: 16, weight: 700, color: T.text });

    for (let i = 0; i < cmds.length; i++) {
      const cmdY = cy + 50 + i * 44;
      if (cmdY + 44 > cy + rowH - COL_GAP - 8) break;
      text(ctx, `${prefix}${cmds[i].name}`, cx + 16, cmdY, { size: 16, weight: 700, color: T.text });
      text(ctx, cmds[i].description, cx + 16, cmdY + 20, { size: 13, weight: 500, color: T.textMuted });
      if (i < cmds.length - 1) fillRect(ctx, cx + 16, cmdY + 42, colW - 32, 1, T.borderSubtle);
    }
  }

  footer(ctx, 'StatBot  •  Production Discord Analytics');
  return canvas.toBuffer('image/png');
}
