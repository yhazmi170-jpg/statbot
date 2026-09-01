import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, truncate, numStr, durStr } from './theme.js';
import { headerBanner, sectionBg, rowItem, HALF_W, COL_GAP, footer } from './components.js';

interface Row {
  userId: string;
  messages: number;
  voiceMs: number;
}

export async function renderTopUsers(guildName: string, period: string, users: Row[], totalMsgs: number): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  // ─── HEADER ─────────────────────────────────────────
  headerBanner(ctx, y, 'Top Users', `${guildName} • ${period}`, {
    rightLabel: 'Total Messages',
    rightValue: numStr(totalMsgs),
  });
  y += 78;

  const contentH = H - y - PAD - 44;
  const leftW = HALF_W;
  const rightX = PAD + HALF_W + COL_GAP;

  // ── LEFT: Leaderboard ──
  sectionBg(ctx, PAD, y, leftW, contentH);
  fillRect(ctx, PAD, y, leftW, 34, T.panelAlt, 0);
  text(ctx, 'LEADERBOARD', PAD + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  text(ctx, `${users.length} users`, PAD + 16, y + 22, { size: 10, color: T.textDim });

  const maxMsg = users[0]?.messages || 1;
  const rowH = Math.min(38, (contentH - 42) / Math.min(users.length, 20));
  for (let i = 0; i < Math.min(users.length, 20); i++) {
    const ry = y + 40 + i * rowH;
    const u = users[i];
    const pct = maxMsg > 0 ? u.messages / maxMsg : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.accent : i === 2 ? T.accentSoft : T.textDim;
    rowItem(ctx, PAD, ry, leftW, rowH, {
      rank: i + 1,
      rankColor,
      label: truncate(ctx, u.userId, leftW - 220, { size: 14 }),
      value: numStr(u.messages),
      barPct: pct,
      isLast: i === Math.min(users.length, 20) - 1,
    });
  }

  // ── RIGHT: Stats Panel ──
  sectionBg(ctx, rightX, y, HALF_W, contentH);
  fillRect(ctx, rightX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'INSIGHTS', rightX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const topUser = users[0];
  const avg = users.length > 0 ? Math.round(totalMsgs / users.length) : 0;
  const topShare = totalMsgs > 0 ? ((topUser?.messages || 0) / totalMsgs * 100).toFixed(1) : '0';
  const voiceTop = users.filter(u => u.voiceMs > 0).sort((a, b) => b.voiceMs - a.voiceMs).slice(0, 5);

  let ry = y + 48;

  // Top User
  text(ctx, 'TOP USER', rightX + 16, ry, { size: 11, weight: 600, color: T.textDim });
  ry += 18;
  text(ctx, truncate(ctx, topUser?.userId || '—', HALF_W - 40, { size: 18 }), rightX + 16, ry, { size: 18, weight: 700, color: T.accentBright });
  ry += 24;
  text(ctx, `${numStr(topUser?.messages || 0)} messages  •  ${topShare}% of total`, rightX + 16, ry, { size: 12, color: T.textMuted });
  ry += 28;
  fillRect(ctx, rightX + 16, ry, HALF_W - 32, 1, T.border);
  ry += 14;

  // Average
  text(ctx, 'AVERAGE PER USER', rightX + 16, ry, { size: 11, weight: 600, color: T.textDim });
  ry += 18;
  text(ctx, `${numStr(avg)} messages`, rightX + 16, ry, { size: 16, weight: 700, color: T.text });
  ry += 28;
  fillRect(ctx, rightX + 16, ry, HALF_W - 32, 1, T.border);
  ry += 14;

  // Voice Top
  if (voiceTop.length > 0) {
    text(ctx, 'TOP VOICE', rightX + 16, ry, { size: 11, weight: 600, color: T.textDim });
    ry += 20;
    for (let i = 0; i < voiceTop.length; i++) {
      const u = voiceTop[i];
      fillRect(ctx, rightX + 16, ry, 24, 24, T.accentSoft, 12);
      text(ctx, truncate(ctx, u.userId, HALF_W - 120, { size: 13 }), rightX + 46, ry + 3, { size: 13, weight: 500, color: T.text });
      text(ctx, durStr(u.voiceMs), rightX + HALF_W - 16, ry + 3, { size: 13, weight: 600, color: T.accent, align: 'right' });
      ry += 28;
    }
  }

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
