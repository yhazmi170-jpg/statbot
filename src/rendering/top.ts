import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, truncate, numStr, durStr, PAD } from './theme.js';
import { footer, COL_GAP, HALF_W } from './components.js';

interface Row {
  userId: string;
  messages: number;
  voiceMs: number;
}

export async function renderTopUsers(guildName: string, period: string, users: Row[], totalMsgs: number): Promise<Buffer> {
  const W = 1400, H = 760;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  // ─── HEADER ─────────────────────────────────────────
  fillRect(ctx, PAD, y, W - PAD * 2, 52, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, 'TOP MESSAGE ACTIVITY', PAD + 16, y + 8, { size: 15, weight: 700, color: T.accentBright });
  text(ctx, `${guildName} • ${period}`, PAD + 16, y + 30, { size: 11, color: T.textMuted });
  text(ctx, numStr(totalMsgs), W - PAD - 16, y + 6, { size: 18, weight: 700, color: T.accentBright, align: 'right' });
  text(ctx, 'TOTAL MESSAGES', W - PAD - 16, y + 28, { size: 9, color: T.textDim, align: 'right' });
  y += 64;

  // ─── MAIN ROW ───────────────────────────────────────
  const leftW = HALF_W;
  const rightX = PAD + HALF_W + COL_GAP;
  const listH = H - y - PAD - 20;

  // Left: Leaderboard (10 rows)
  fillRect(ctx, PAD, y, leftW, listH, T.panel, 6);
  const rowH = listH / 10;
  const maxMsg = users[0]?.messages || 1;

  for (let i = 0; i < Math.min(users.length, 10); i++) {
    const ry = y + i * rowH;
    const u = users[i];

    const rankColors = [T.accentBright, T.accent, T.accentSoft];
    const rankColor = i < 3 ? rankColors[i] : T.textDim;
    text(ctx, String(i + 1).padStart(2, '0'), PAD + 14, ry + rowH / 2 - 8, { size: 14, weight: 700, color: rankColor });

    fillRect(ctx, PAD + 46, ry + rowH / 2 - 12, 24, 24, [T.accentBright, T.accent, T.accentSoft, '#5a0000', '#3a0000', '#2a0000'][i % 6], 12);

    text(ctx, truncate(ctx, u.userId, 200, { size: 13 }), PAD + 78, ry + rowH / 2 - 8, { size: 13, weight: 500, color: T.text });

    text(ctx, numStr(u.messages), PAD + leftW - 14, ry + rowH / 2 - 8, { size: 13, weight: 700, color: T.accentBright, align: 'right' });

    fillRect(ctx, PAD + 78, ry + rowH / 2 + 10, leftW - 100, 3, T.panelAlt, 2);
    const pct = maxMsg > 0 ? u.messages / maxMsg : 0;
    fillRect(ctx, PAD + 78, ry + rowH / 2 + 10, Math.max((leftW - 100) * pct, 3), 3, T.accent, 2);

    if (i < Math.min(users.length, 10) - 1) {
      fillRect(ctx, PAD + 14, ry + rowH - 0.5, leftW - 28, 1, T.border);
    }
  }

  // Right panel
  fillRect(ctx, rightX, y, HALF_W, listH, T.panel, 6);
  const topUser = users[0];
  const avg = users.length > 0 ? Math.round(totalMsgs / users.length) : 0;
  const topShare = totalMsgs > 0 ? ((topUser?.messages || 0) / totalMsgs * 100).toFixed(1) : '0';

  let ry = y + 18;

  text(ctx, 'TOP USER', rightX + 16, ry, { size: 10, weight: 600, color: T.textDim });
  ry += 18;
  text(ctx, topUser?.userId || '—', rightX + 16, ry, { size: 14, weight: 700, color: T.accentBright });
  ry += 22;
  text(ctx, `${numStr(topUser?.messages || 0)} messages`, rightX + 16, ry, { size: 11, color: T.textMuted });
  ry += 28;
  fillRect(ctx, rightX + 16, ry, HALF_W - 32, 1, T.border);
  ry += 14;

  text(ctx, 'AVERAGE', rightX + 16, ry, { size: 10, weight: 600, color: T.textDim });
  ry += 18;
  text(ctx, `${numStr(avg)} msgs/user`, rightX + 16, ry, { size: 12, weight: 600, color: T.text });
  ry += 28;
  fillRect(ctx, rightX + 16, ry, HALF_W - 32, 1, T.border);
  ry += 14;

  text(ctx, 'TOP USER SHARE', rightX + 16, ry, { size: 10, weight: 600, color: T.textDim });
  ry += 18;
  text(ctx, `${topShare}%`, rightX + 16, ry, { size: 12, weight: 600, color: T.accentBright });
  ry += 28;
  fillRect(ctx, rightX + 16, ry, HALF_W - 32, 1, T.border);
  ry += 14;

  // Voice
  text(ctx, 'TOP VOICE', rightX + 16, ry, { size: 10, weight: 600, color: T.textDim });
  ry += 20;
  const voiceTop = users.filter(u => u.voiceMs > 0).sort((a, b) => b.voiceMs - a.voiceMs).slice(0, 5);
  for (let i = 0; i < voiceTop.length; i++) {
    const u = voiceTop[i];
    fillRect(ctx, rightX + 16, ry, 20, 20, T.accentSoft, 10);
    text(ctx, truncate(ctx, u.userId, 170, { size: 12 }), rightX + 42, ry + 2, { size: 12, weight: 500, color: T.text });
    text(ctx, durStr(u.voiceMs), rightX + HALF_W - 16, ry + 2, { size: 12, weight: 600, color: T.accent, align: 'right' });
    ry += 26;
  }

  footer(ctx, 'StatBot • m?help for commands');

  return canvas.toBuffer('image/png');
}
