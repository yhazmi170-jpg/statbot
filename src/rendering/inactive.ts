import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, truncate, numStr, durStr } from './theme.js';
import { headerBanner, sectionBg, footer } from './components.js';

interface InactiveUser {
  userId: string;
  lastActivity: string;
  messages: number;
  voiceMs: number;
}

export async function renderInactive(guildName: string, days: number, users: InactiveUser[]): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  headerBanner(ctx, y, 'Inactive Members', `${guildName} • No activity in ${days} days`, {
    rightLabel: 'Inactive Users',
    rightValue: numStr(users.length),
  });
  y += 78;

  // Table
  const tableH = H - y - PAD - 44;
  sectionBg(ctx, PAD, y, W - PAD * 2, tableH);

  // Column widths
  const colRank = 50;
  const colUser = 300;
  const colLast = 200;
  const colMsgs = 200;
  const colVoice = 200;
  const tableX = PAD;

  // Header row
  fillRect(ctx, tableX, y, W - PAD * 2, 36, T.panelAlt, 0);
  text(ctx, '#', tableX + 16, y + 10, { size: 11, weight: 700, color: T.textDim });
  text(ctx, 'USER', tableX + colRank + 16, y + 10, { size: 11, weight: 700, color: T.textDim });
  text(ctx, 'LAST ACTIVE', tableX + colRank + colUser + 16, y + 10, { size: 11, weight: 700, color: T.textDim });
  text(ctx, 'MESSAGES', tableX + colRank + colUser + colLast + 16, y + 10, { size: 11, weight: 700, color: T.textDim });
  text(ctx, 'VOICE', tableX + colRank + colUser + colLast + colMsgs + 16, y + 10, { size: 11, weight: 700, color: T.textDim });
  y += 38;

  const maxRows = Math.floor((tableH - 42) / 38);
  for (let i = 0; i < Math.min(users.length, maxRows); i++) {
    const ry = y + i * 38;
    const u = users[i];

    if (i % 2 === 0) fillRect(ctx, tableX, ry, W - PAD * 2, 38, T.row, 0);

    text(ctx, String(i + 1).padStart(2, ' '), tableX + 16, ry + 10, { size: 14, weight: 700, color: T.textDim });
    fillRect(ctx, tableX + colRank + 16, ry + 6, 26, 26, T.accentSoft, 13);
    text(ctx, truncate(ctx, u.userId, colUser - 50, { size: 13 }), tableX + colRank + 48, ry + 10, { size: 13, color: T.text });
    text(ctx, u.lastActivity, tableX + colRank + colUser + 16, ry + 10, { size: 12, color: T.textMuted });
    text(ctx, numStr(u.messages), tableX + colRank + colUser + colLast + 16, ry + 10, { size: 13, color: T.text });
    text(ctx, durStr(u.voiceMs), tableX + colRank + colUser + colLast + colMsgs + 16, ry + 10, { size: 13, color: T.text });

    if (i < Math.min(users.length, maxRows) - 1) {
      fillRect(ctx, tableX + 16, ry + 37, W - PAD * 2 - 32, 1, T.border);
    }
  }

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
