import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, PAD, rr } from './theme.js';
import { footer, COL_GAP } from './components.js';

interface Cmd { name: string; description: string; category: string }

export async function renderHelp(commands: Cmd[], prefix: string, guildName?: string): Promise<Buffer> {
  const W = 1400, H = 700;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  fillRect(ctx, PAD, y, W - PAD * 2, 52, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, 'STATBOT COMMANDS', PAD + 16, y + 8, { size: 16, weight: 700, color: T.accentBright });
  text(ctx, `Prefix: ${prefix}`, PAD + 16, y + 30, { size: 11, color: T.textMuted });

  y += 64;

  const cats = new Map<string, Cmd[]>();
  for (const c of commands) {
    const list = cats.get(c.category) || [];
    list.push(c);
    cats.set(c.category, list);
  }

  const catEntries = Array.from(cats.entries());
  const colW = (W - PAD * 2 - COL_GAP * (Math.min(catEntries.length, 3) - 1)) / Math.min(catEntries.length, 3);

  for (let ci = 0; ci < catEntries.length; ci++) {
    const [cat, cmds] = catEntries[ci];
    const col = ci % 3;
    const row = Math.floor(ci / 3);
    const cx = PAD + col * (colW + COL_GAP);
    const cy = y + row * 220;

    fillRect(ctx, cx, cy, colW, 200, T.panel, 6);

    // Category header
    fillRect(ctx, cx, cy, colW, 28, T.accent, 0);
    // Round top corners
    ctx.save();
    rr(ctx, cx, cy, colW, 28, 6);
    ctx.clip();
    fillRect(ctx, cx, cy, colW, 28, T.accent, 0);
    ctx.restore();
    fillRect(ctx, cx, cy + 20, colW, 8, T.accent);
    text(ctx, cat.toUpperCase(), cx + 12, cy + 7, { size: 11, weight: 700, color: '#fff' });

    for (let i = 0; i < cmds.length; i++) {
      const cmdY = cy + 36 + i * 36;
      if (cmdY + 36 > cy + 200) break;

      text(ctx, `${prefix}${cmds[i].name}`, cx + 12, cmdY + 2, { size: 12, weight: 600, color: T.text });
      text(ctx, cmds[i].description, cx + 12, cmdY + 18, { size: 9, color: T.textDim });

      if (i < cmds.length - 1) {
        fillRect(ctx, cx + 12, cmdY + 34, colW - 24, 1, T.border);
      }
    }
  }

  footer(ctx, 'StatBot • Production Discord Statistics');

  return canvas.toBuffer('image/png');
}
