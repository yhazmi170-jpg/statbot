import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, fillRect, text, numStr, durStr } from './theme.js';
import { headerBanner, panelBg, panelHeader, panelContentY, rowItem, footer, fitText, sanitizeText, panelClip, panelRestore } from './components.js';

interface Row { userId: string; messages: number; voiceMs: number }

export async function renderTopUsers(guildName: string, period: string, users: Row[], totalMsgs: number): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  headerBanner(ctx, 'Top Users', `${sanitizeText(guildName)} • ${period}`, {
    rightLabel: 'Total Messages',
    rightValue: numStr(totalMsgs),
  });

  const tl = PANELS.topLeft;
  panelBg(ctx, tl);
  // Clip to content area only
  const tlContentY = panelContentY(tl);
  const tlContentH = tl.h - 40;
  panelClip(ctx, { x: tl.x, y: tlContentY, w: tl.w, h: tlContentH });
  panelHeader(ctx, tl, 'Leaderboard', `${users.length} users`);
  const maxMsg = users[0]?.messages || 1;
  const rowH = Math.floor((tlContentH - 4) / Math.min(users.length, 14));
  for (let i = 0; i < Math.min(users.length, 14); i++) {
    const ry = tlContentY + i * rowH;
    const u = users[i];
    const pct = maxMsg > 0 ? u.messages / maxMsg : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.textSecondary : i === 2 ? T.textMuted : T.textDim;
    rowItem(ctx, tl.x, ry, tl.w, rowH, {
      rank: i + 1, rankColor,
      label: u.userId,
      value: numStr(u.messages),
      isLast: i === Math.min(users.length, 14) - 1,
    });
  }
  panelRestore(ctx);

  const tr = PANELS.topRight;
  panelBg(ctx, tr);
  const trContentY = panelContentY(tr);
  const trContentH = tr.h - 40;
  panelClip(ctx, { x: tr.x, y: trContentY, w: tr.w, h: trContentH });
  panelHeader(ctx, tr, 'Insights');
  const topUser = users[0];
  const avg = users.length > 0 ? Math.round(totalMsgs / users.length) : 0;
  const topShare = totalMsgs > 0 ? ((topUser?.messages || 0) / totalMsgs * 100).toFixed(1) : '0';
  const voiceTop = users.filter(u => u.voiceMs > 0).sort((a, b) => b.voiceMs - a.voiceMs).slice(0, 5);

  let ry = trContentY + 4;
  text(ctx, 'TOP USER', tr.x + 16, ry, { size: 13, weight: 700, color: T.textDim }); ry += 20;
  fitText(ctx, topUser?.userId || '—', tr.x + 16, ry, tr.w - 40, { size: 22, weight: 700, color: T.text }); ry += 28;
  text(ctx, `${numStr(topUser?.messages || 0)} messages  •  ${topShare}% of total`, tr.x + 16, ry, { size: 14, weight: 500, color: T.textMuted }); ry += 32;
  fillRect(ctx, tr.x + 16, ry, tr.w - 32, 1, T.borderSubtle); ry += 16;

  text(ctx, 'AVERAGE PER USER', tr.x + 16, ry, { size: 13, weight: 700, color: T.textDim }); ry += 20;
  text(ctx, `${numStr(avg)} messages`, tr.x + 16, ry, { size: 20, weight: 700, color: T.text }); ry += 32;
  fillRect(ctx, tr.x + 16, ry, tr.w - 32, 1, T.borderSubtle); ry += 16;

  if (voiceTop.length > 0) {
    text(ctx, 'TOP VOICE', tr.x + 16, ry, { size: 13, weight: 700, color: T.textDim }); ry += 24;
    for (const u of voiceTop) {
      fillRect(ctx, tr.x + 16, ry, 28, 28, T.accentDim, 14);
      fitText(ctx, u.userId, tr.x + 50, ry + 4, tr.w - 140, { size: 14, weight: 500, color: T.text });
      text(ctx, durStr(u.voiceMs), tr.x + tr.w - 16, ry + 4, { size: 14, weight: 600, color: T.accentBright, align: 'right' });
      ry += 32;
    }
  }
  panelRestore(ctx);

  const bl = PANELS.bottomLeft;
  const br = PANELS.bottomRight;
  const fullW = bl.w + GAP + br.w;
  panelBg(ctx, { x: bl.x, y: bl.y, w: fullW, h: bl.h });
  const blContentY = panelContentY(bl);
  const blContentH = bl.h - 40;
  panelClip(ctx, { x: bl.x, y: blContentY, w: fullW, h: blContentH });
  panelHeader(ctx, { x: bl.x, y: bl.y, w: fullW }, 'Distribution');
  const pctBarY = blContentY + 8;
  text(ctx, 'Message share across top users', bl.x + 16, pctBarY, { size: 14, weight: 500, color: T.textMuted });
  let barX = bl.x + 16;
  const barW = fullW - 32;
  const barH = 40;
  fillRect(ctx, barX, pctBarY + 28, barW, barH, T.row, 6);
  const colors = [T.accentBright, '#991b1b', '#7f1d1d', '#52525b', '#3f3f46', '#27272a', '#1f1f23', '#18181b'];
  for (let i = 0; i < Math.min(users.length, 8); i++) {
    const w = totalMsgs > 0 ? (users[i].messages / totalMsgs) * barW : 0;
    fillRect(ctx, barX, pctBarY + 28, w, barH, colors[i % colors.length], i === 0 ? 6 : 0);
    barX += w;
  }
  panelRestore(ctx);

  footer(ctx, 'StatBot  •  m?help for commands');
  return canvas.toBuffer('image/png');
}
