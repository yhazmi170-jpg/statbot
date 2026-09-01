import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, fillRect, text, numStr, durStr } from './theme.js';
import { headerBanner, panelBg, footer, fitText } from './components.js';

interface InactiveUser { userId: string; lastActivity: string; messages: number; voiceMs: number; }

export async function renderInactive(guildName: string, days: number, users: InactiveUser[]): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  headerBanner(ctx, 'Inactive Members', `${guildName} • No activity in ${days} days`, {
    rightLabel: 'Inactive Users', rightValue: numStr(users.length),
  });

  const tableY = PAD + 75 + 15;
  const tableH = H - tableY - PAD - 25;
  panelBg(ctx, { x: PAD, y: tableY, w: W - PAD * 2, h: tableH });

  const colRank = 60;
  const colUser = 320;
  const colLast = 240;
  const colMsgs = 240;
  const colVoice = 240;

  fillRect(ctx, PAD, tableY, W - PAD * 2, 40, '#16161a', 0);
  text(ctx, '#', PAD + 16, tableY + 12, { size: 13, weight: 700, color: T.textDim });
  text(ctx, 'USER', PAD + colRank + 16, tableY + 12, { size: 13, weight: 700, color: T.textDim });
  text(ctx, 'LAST ACTIVE', PAD + colRank + colUser + 16, tableY + 12, { size: 13, weight: 700, color: T.textDim });
  text(ctx, 'MESSAGES', PAD + colRank + colUser + colLast + 16, tableY + 12, { size: 13, weight: 700, color: T.textDim });
  text(ctx, 'VOICE', PAD + colRank + colUser + colLast + colMsgs + 16, tableY + 12, { size: 13, weight: 700, color: T.textDim });

  const maxRows = Math.floor((tableH - 48) / 40);
  for (let i = 0; i < Math.min(users.length, maxRows); i++) {
    const ry = tableY + 44 + i * 40;
    const u = users[i];
    if (i % 2 === 0) fillRect(ctx, PAD, ry, W - PAD * 2, 40, T.row, 0);
    text(ctx, String(i + 1).padStart(2, ' '), PAD + 16, ry + 10, { size: 16, weight: 700, color: T.textDim });
    fillRect(ctx, PAD + colRank + 16, ry + 6, 28, 28, T.accentDim, 14);
    fitText(ctx, u.userId, PAD + colRank + 50, ry + 10, colUser - 50, { size: 14, weight: 400, color: T.text });
    text(ctx, u.lastActivity, PAD + colRank + colUser + 16, ry + 10, { size: 13, weight: 500, color: T.textMuted });
    text(ctx, numStr(u.messages), PAD + colRank + colUser + colLast + 16, ry + 10, { size: 14, color: T.text });
    text(ctx, durStr(u.voiceMs), PAD + colRank + colUser + colLast + colMsgs + 16, ry + 10, { size: 14, color: T.text });
  }

  footer(ctx, 'StatBot  •  m?help for commands');
  return canvas.toBuffer('image/png');
}
