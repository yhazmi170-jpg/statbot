import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, truncate, numStr } from './theme.js';
import { headerBanner, sectionBg, rowItem, footer } from './components.js';

interface RankUser {
  userId: string;
  score: number;
  messages: number;
  voiceMs: number;
  activeDays: number;
}

export async function renderServerRank(guildName: string, users: RankUser[], totalDays: number): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  headerBanner(ctx, y, 'Server Activity Rank', `${guildName}  •  Score = Messages + Voice(hrs×10) + ActiveDays×100`, {
    rightLabel: 'Participants',
    rightValue: numStr(users.length),
  });
  y += 78;

  // Table
  const tableH = H - y - PAD - 44;
  sectionBg(ctx, PAD, y, W - PAD * 2, tableH);

  // Header
  fillRect(ctx, PAD, y, W - PAD * 2, 36, T.panelAlt, 0);
  text(ctx, '#', PAD + 16, y + 10, { size: 11, weight: 700, color: T.textDim });
  text(ctx, 'USER', PAD + 56, y + 10, { size: 11, weight: 700, color: T.textDim });
  text(ctx, 'SCORE', PAD + 400, y + 10, { size: 11, weight: 700, color: T.textDim });
  text(ctx, 'MSGS', PAD + 560, y + 10, { size: 11, weight: 700, color: T.textDim });
  text(ctx, 'VOICE', PAD + 700, y + 10, { size: 11, weight: 700, color: T.textDim });
  text(ctx, 'ACTIVE', PAD + 850, y + 10, { size: 11, weight: 700, color: T.textDim });
  text(ctx, '%', PAD + 1000, y + 10, { size: 11, weight: 700, color: T.textDim });
  y += 38;

  const maxScore = users[0]?.score || 1;
  const maxRows = Math.floor((tableH - 42) / 40);
  for (let i = 0; i < Math.min(users.length, maxRows); i++) {
    const ry = y + i * 40;
    const u = users[i];

    if (i % 2 === 0) fillRect(ctx, PAD, ry, W - PAD * 2, 40, T.row, 0);

    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.accent : i === 2 ? T.accentSoft : T.textDim;
    text(ctx, String(i + 1).padStart(2, ' '), PAD + 16, ry + 10, { size: 16, weight: 700, color: rankColor });
    fillRect(ctx, PAD + 56, ry + 6, 28, 28, [T.accentBright, T.accent, T.accentSoft, '#5a0000', '#3a0000'][i % 5], 14);
    text(ctx, truncate(ctx, u.userId, 280, { size: 13 }), PAD + 90, ry + 10, { size: 13, color: T.text });

    // Score bar
    fillRect(ctx, PAD + 230, ry + 15, 150, 8, T.panelAlt, 4);
    const pct = maxScore > 0 ? u.score / maxScore : 0;
    fillRect(ctx, PAD + 230, ry + 15, Math.max(150 * pct, 8), 8, T.accent, 4);

    text(ctx, numStr(u.score), PAD + 400, ry + 10, { size: 14, weight: 700, color: T.accentBright });
    text(ctx, numStr(u.messages), PAD + 560, ry + 10, { size: 13, color: T.text });
    text(ctx, (u.voiceMs / 3600000).toFixed(1) + 'h', PAD + 700, ry + 10, { size: 13, color: T.text });
    text(ctx, `${u.activeDays}/${totalDays}`, PAD + 850, ry + 10, { size: 13, color: T.text });
    const activityPct = totalDays > 0 ? Math.round((u.activeDays / totalDays) * 100) : 0;
    text(ctx, activityPct + '%', PAD + 1000, ry + 10, { size: 13, color: T.green });

    if (i < Math.min(users.length, maxRows) - 1) {
      fillRect(ctx, PAD + 16, ry + 39, W - PAD * 2 - 32, 1, T.border);
    }
  }

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
