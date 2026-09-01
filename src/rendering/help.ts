import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, rr } from './theme.js';
import { footer, COL_GAP } from './components.js';

interface Cmd { name: string; description: string; category: string }

export async function renderHelp(commands: Cmd[], prefix: string, guildName?: string): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  // ─── HEADER ─────────────────────────────────────────
  fillRect(ctx, PAD, y, W - PAD * 2, 72, T.panel, 8);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, 'STATBOT', PAD + 24, y + 14, { size: 28, weight: 700, color: T.accentBright });
  text(ctx, `Command Reference  •  Prefix: ${prefix}`, PAD + 24, y + 46, { size: 13, color: T.textMuted });
  y += 86;

  // ─── CATEGORIES ─────────────────────────────────────
  const cats = new Map<string, Cmd[]>();
  for (const c of commands) {
    const list = cats.get(c.category) || [];
    list.push(c);
    cats.set(c.category, list);
  }

  const catEntries = Array.from(cats.entries());
  const cols = Math.min(catEntries.length, 3);
  const colGap = COL_GAP;
  const colW = (W - PAD * 2 - colGap * (cols - 1)) / cols;
  const maxRows = Math.ceil(catEntries.length / cols);
  const rowH = Math.floor((H - y - PAD - 44) / maxRows);

  for (let ci = 0; ci < catEntries.length; ci++) {
    const [cat, cmds] = catEntries[ci];
    const col = ci % cols;
    const row = Math.floor(ci / cols);
    const cx = PAD + col * (colW + colGap);
    const cy = y + row * (rowH + colGap);

    // Panel
    fillRect(ctx, cx, cy, colW, rowH - colGap, T.panel, 8);

    // Category header
    fillRect(ctx, cx, cy, colW, 36, T.accent, 0);
    ctx.save();
    rr(ctx, cx, cy, colW, 36, 8);
    ctx.clip();
    fillRect(ctx, cx, cy, colW, 36, T.accent, 0);
    ctx.restore();
    fillRect(ctx, cx, cy + 28, colW, 8, T.accent);
    text(ctx, cat.toUpperCase(), cx + 16, cy + 9, { size: 14, weight: 700, color: '#fff' });

    for (let i = 0; i < cmds.length; i++) {
      const cmdY = cy + 44 + i * 40;
      if (cmdY + 40 > cy + rowH - colGap - 8) break;

      text(ctx, `${prefix}${cmds[i].name}`, cx + 16, cmdY + 2, { size: 14, weight: 700, color: T.text });
      text(ctx, cmds[i].description, cx + 16, cmdY + 20, { size: 11, color: T.textMuted });

      if (i < cmds.length - 1) {
        fillRect(ctx, cx + 16, cmdY + 38, colW - 32, 1, T.border);
      }
    }
  }

  footer(ctx, 'StatBot  •  Production Discord Analytics');

  return canvas.toBuffer('image/png');
}
