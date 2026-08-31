import { createCanvas } from '@napi-rs/canvas';
import { T, fillRect, text, truncate, numStr, PAD } from './theme.js';
import { footer } from './components.js';

interface RankUser {
  userId: string;
  score: number;
  messages: number;
  voiceMs: number;
  activeDays: number;
}

export async function renderServerRank(guildName: string, users: RankUser[], totalDays: number): Promise<Buffer> {
  const W = 1400, H = 800;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);
  let y = PAD;

  fillRect(ctx, PAD, y, W - PAD * 2, 52, T.panel, 6);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);
  text(ctx, 'SERVER ACTIVITY RANK', PAD + 16, y + 8, { size: 15, weight: 700, color: T.accentBright });
  text(ctx, `${guildName} • Score = Messages + Voice(hrs×10) + ActiveDays×100`, PAD + 16, y + 30, { size: 10, color: T.textMuted });
  y += 64;

  fillRect(ctx, PAD, y, W - PAD * 2, H - y - PAD - 20, T.panel, 6);

  // Header
  fillRect(ctx, PAD, y, W - PAD * 2, 28, T.panelAlt, 0);
  text(ctx, '#', PAD + 12, y + 8, { size: 10, weight: 600, color: T.textDim });
  text(ctx, 'USER', PAD + 40, y + 8, { size: 10, weight: 600, color: T.textDim });
  text(ctx, 'SCORE', PAD + 500, y + 8, { size: 10, weight: 600, color: T.textDim });
  text(ctx, 'MSGS', PAD + 620, y + 8, { size: 10, weight: 600, color: T.textDim });
  text(ctx, 'VOICE', PAD + 750, y + 8, { size: 10, weight: 600, color: T.textDim });
  text(ctx, 'ACTIVE', PAD + 880, y + 8, { size: 10, weight: 600, color: T.textDim });
  text(ctx, '%', PAD + 980, y + 8, { size: 10, weight: 600, color: T.textDim });
  y += 30;

  const maxScore = users[0]?.score || 1;
  const rowH = 38;
  for (let i = 0; i < Math.min(users.length, 20); i++) {
    const ry = y + i * rowH;
    const u = users[i];

    const rankColors = [T.accentBright, T.accent, T.accentSoft];
    const rankColor = i < 3 ? rankColors[i] : T.textDim;
    text(ctx, String(i + 1).padStart(2, '0'), PAD + 12, ry + 10, { size: 13, weight: 700, color: rankColor });
    fillRect(ctx, PAD + 40, ry + 6, 24, 24, [T.accentBright, T.accent, T.accentSoft, '#5a0000', '#3a0000'][i % 5], 12);
    text(ctx, truncate(ctx, u.userId, 200, { size: 12 }), PAD + 70, ry + 10, { size: 12, color: T.text });

    // Score bar
    fillRect(ctx, PAD + 250, ry + 14, 230, 6, T.panelAlt, 3);
    const pct = maxScore > 0 ? u.score / maxScore : 0;
    fillRect(ctx, PAD + 250, ry + 14, Math.max(230 * pct, 6), 6, T.accent, 3);

    text(ctx, numStr(u.score), PAD + 500, ry + 10, { size: 12, weight: 700, color: T.accentBright });
    text(ctx, numStr(u.messages), PAD + 620, ry + 10, { size: 11, color: T.text });
    text(ctx, (u.voiceMs / 3600000).toFixed(1) + 'h', PAD + 750, ry + 10, { size: 11, color: T.text });
    text(ctx, `${u.activeDays}/${totalDays}`, PAD + 880, ry + 10, { size: 11, color: T.text });
    const activityPct = totalDays > 0 ? Math.round((u.activeDays / totalDays) * 100) : 0;
    text(ctx, activityPct + '%', PAD + 980, ry + 10, { size: 11, color: T.green });

    if (i < Math.min(users.length, 20) - 1) {
      fillRect(ctx, PAD + 12, ry + rowH - 1, W - PAD * 2 - 24, 1, T.border);
    }
  }

  footer(ctx, 'StatBot • m?help for commands');

  return canvas.toBuffer('image/png');
}
