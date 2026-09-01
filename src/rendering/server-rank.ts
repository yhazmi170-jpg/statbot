import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, fillRect, text, truncate, numStr } from './theme.js';
import { headerBanner, panelBg, footer } from './components.js';

interface RankUser { userId: string; score: number; messages: number; voiceMs: number; activeDays: number; }

export async function renderServerRank(guildName: string, users: RankUser[], totalDays: number): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  headerBanner(ctx, 'Server Activity Rank', `${guildName}  •  Score = Messages + Voice(hrs×10) + ActiveDays×100`, {
    rightLabel: 'Participants', rightValue: numStr(users.length),
  });

  const tableY = PAD + 75 + 15;
  const tableH = H - tableY - PAD - 25;
  panelBg(ctx, { x: PAD, y: tableY, w: W - PAD * 2, h: tableH });

  fillRect(ctx, PAD, tableY, W - PAD * 2, 40, T.panelAlt, 0);
  text(ctx, '#', PAD + 16, tableY + 12, { size: 13, weight: 700, color: T.textDim });
  text(ctx, 'USER', PAD + 60, tableY + 12, { size: 13, weight: 700, color: T.textDim });
  text(ctx, 'SCORE', PAD + 440, tableY + 12, { size: 13, weight: 700, color: T.textDim });
  text(ctx, 'MSGS', PAD + 620, tableY + 12, { size: 13, weight: 700, color: T.textDim });
  text(ctx, 'VOICE', PAD + 780, tableY + 12, { size: 13, weight: 700, color: T.textDim });
  text(ctx, 'ACTIVE', PAD + 940, tableY + 12, { size: 13, weight: 700, color: T.textDim });
  text(ctx, '%', PAD + 1100, tableY + 12, { size: 13, weight: 700, color: T.textDim });

  const maxScore = users[0]?.score || 1;
  const maxRows = Math.floor((tableH - 48) / 42);
  for (let i = 0; i < Math.min(users.length, maxRows); i++) {
    const ry = tableY + 44 + i * 42;
    const u = users[i];
    if (i % 2 === 0) fillRect(ctx, PAD, ry, W - PAD * 2, 42, T.row, 0);

    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.accent : i === 2 ? T.accentSoft : T.textDim;
    text(ctx, String(i + 1).padStart(2, ' '), PAD + 16, ry + 10, { size: 18, weight: 700, color: rankColor });
    fillRect(ctx, PAD + 60, ry + 6, 30, 30, [T.accentBright, T.accent, T.accentSoft, '#5a1212', '#3d0c0c'][i % 5], 15);
    text(ctx, truncate(ctx, u.userId, 300, { size: 14 }), PAD + 96, ry + 10, { size: 14, color: T.text });

    fillRect(ctx, PAD + 260, ry + 16, 160, 8, T.panelAlt, 4);
    const pct = maxScore > 0 ? u.score / maxScore : 0;
    fillRect(ctx, PAD + 260, ry + 16, Math.max(160 * pct, 8), 8, T.accent, 4);

    text(ctx, numStr(u.score), PAD + 440, ry + 10, { size: 16, weight: 700, color: T.accentBright });
    text(ctx, numStr(u.messages), PAD + 620, ry + 10, { size: 14, color: T.text });
    text(ctx, (u.voiceMs / 3600000).toFixed(1) + 'h', PAD + 780, ry + 10, { size: 14, color: T.text });
    text(ctx, `${u.activeDays}/${totalDays}`, PAD + 940, ry + 10, { size: 14, color: T.text });
    const activityPct = totalDays > 0 ? Math.round((u.activeDays / totalDays) * 100) : 0;
    text(ctx, activityPct + '%', PAD + 1100, ry + 10, { size: 14, color: T.green });
  }

  footer(ctx, 'StatBot  •  m?help for commands');
  return canvas.toBuffer('image/png');
}
