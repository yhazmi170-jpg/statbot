import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, truncate, numStr, durStr, PAD } from './theme.js';
import { footer } from './components.js';

interface InactiveUser {
  userId: string;
  lastActivity: string;
  messages: number;
  voiceMs: number;
}

export async function renderInactive(guildName: string, days: number, users: InactiveUser[]): Promise<Buffer> {
  const W = 1400, H = 800;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);
  let y = PAD;

  fillRect(ctx, PAD, y, W - PAD * 2, 52, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, 'INACTIVE MEMBERS', PAD + 16, y + 8, { size: 15, weight: 700, color: T.accentBright });
  text(ctx, `${guildName} • No activity in ${days} days`, PAD + 16, y + 30, { size: 11, color: T.textMuted });
  text(ctx, `${users.length} members`, W - PAD - 16, y + 10, { size: 14, weight: 700, color: T.accentBright, align: 'right' });
  y += 64;

  // Table
  fillRect(ctx, PAD, y, W - PAD * 2, H - y - PAD - 20, T.panel, 6);

  // Header row
  fillRect(ctx, PAD, y, W - PAD * 2, 28, T.panelAlt, 0);
  text(ctx, '#', PAD + 12, y + 8, { size: 10, weight: 600, color: T.textDim });
  text(ctx, 'USER', PAD + 40, y + 8, { size: 10, weight: 600, color: T.textDim });
  text(ctx, 'LAST ACTIVE', PAD + 300, y + 8, { size: 10, weight: 600, color: T.textDim });
  text(ctx, 'MESSAGES', PAD + 500, y + 8, { size: 10, weight: 600, color: T.textDim });
  text(ctx, 'VOICE', PAD + 650, y + 8, { size: 10, weight: 600, color: T.textDim });
  y += 30;

  const rowH = 36;
  for (let i = 0; i < Math.min(users.length, 20); i++) {
    const ry = y + i * rowH;
    const u = users[i];

    text(ctx, String(i + 1).padStart(2, '0'), PAD + 12, ry + 10, { size: 12, color: T.textDim });
    fillRect(ctx, PAD + 40, ry + 6, 22, 22, T.accentSoft, 11);
    text(ctx, truncate(ctx, u.userId, 200, { size: 12 }), PAD + 68, ry + 10, { size: 12, color: T.text });
    text(ctx, u.lastActivity, PAD + 300, ry + 10, { size: 11, color: T.textMuted });
    text(ctx, numStr(u.messages), PAD + 500, ry + 10, { size: 11, color: T.text });
    text(ctx, durStr(u.voiceMs), PAD + 650, ry + 10, { size: 11, color: T.text });

    if (i < Math.min(users.length, 20) - 1) {
      fillRect(ctx, PAD + 12, ry + rowH - 1, W - PAD * 2 - 24, 1, T.border);
    }
  }

  footer(ctx, 'StatBot • m?help for commands');

  return canvas.toBuffer('image/png');
}
