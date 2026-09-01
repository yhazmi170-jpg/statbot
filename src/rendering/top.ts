import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, fillRect, text, truncate, numStr, durStr } from './theme.js';
import { headerBanner, panelBg, panelHeader, panelContentY, rowItem, footer } from './components.js';

interface Row { userId: string; messages: number; voiceMs: number }

export async function renderTopUsers(guildName: string, period: string, users: Row[], totalMsgs: number): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  headerBanner(ctx, 'Top Users', `${guildName} • ${period}`, {
    rightLabel: 'Total Messages',
    rightValue: numStr(totalMsgs),
  });

  const tl = PANELS.topLeft;
  panelBg(ctx, tl);
  panelHeader(ctx, tl, 'Leaderboard', `${users.length} users`);
  const maxMsg = users[0]?.messages || 1;
  const rowH = Math.floor((tl.h - 44) / Math.min(users.length, 14));
  for (let i = 0; i < Math.min(users.length, 14); i++) {
    const ry = panelContentY(tl) + i * rowH;
    const u = users[i];
    const pct = maxMsg > 0 ? u.messages / maxMsg : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.accent : i === 2 ? T.accentSoft : T.textDim;
    rowItem(ctx, tl.x, ry, tl.w, rowH, {
      rank: i + 1, rankColor,
      label: truncate(ctx, u.userId, tl.w - 180, { size: 16 }),
      value: numStr(u.messages), barPct: pct,
      isLast: i === Math.min(users.length, 14) - 1,
    });
  }

  const tr = PANELS.topRight;
  panelBg(ctx, tr);
  panelHeader(ctx, tr, 'Insights');
  const topUser = users[0];
  const avg = users.length > 0 ? Math.round(totalMsgs / users.length) : 0;
  const topShare = totalMsgs > 0 ? ((topUser?.messages || 0) / totalMsgs * 100).toFixed(1) : '0';
  const voiceTop = users.filter(u => u.voiceMs > 0).sort((a, b) => b.voiceMs - a.voiceMs).slice(0, 5);

  let ry = panelContentY(tr) + 4;
  text(ctx, 'TOP USER', tr.x + 16, ry, { size: 13, weight: 700, color: T.textDim }); ry += 20;
  text(ctx, truncate(ctx, topUser?.userId || '—', tr.w - 40, { size: 22 }), tr.x + 16, ry, { size: 22, weight: 700, color: T.accentBright }); ry += 28;
  text(ctx, `${numStr(topUser?.messages || 0)} messages  •  ${topShare}% of total`, tr.x + 16, ry, { size: 14, weight: 500, color: T.textMuted }); ry += 32;
  fillRect(ctx, tr.x + 16, ry, tr.w - 32, 1, T.border); ry += 16;

  text(ctx, 'AVERAGE PER USER', tr.x + 16, ry, { size: 13, weight: 700, color: T.textDim }); ry += 20;
  text(ctx, `${numStr(avg)} messages`, tr.x + 16, ry, { size: 20, weight: 700, color: T.text }); ry += 32;
  fillRect(ctx, tr.x + 16, ry, tr.w - 32, 1, T.border); ry += 16;

  if (voiceTop.length > 0) {
    text(ctx, 'TOP VOICE', tr.x + 16, ry, { size: 13, weight: 700, color: T.textDim }); ry += 24;
    for (const u of voiceTop) {
      fillRect(ctx, tr.x + 16, ry, 28, 28, T.accentSoft, 14);
      text(ctx, truncate(ctx, u.userId, tr.w - 140, { size: 14 }), tr.x + 50, ry + 4, { size: 14, weight: 500, color: T.text });
      text(ctx, durStr(u.voiceMs), tr.x + tr.w - 16, ry + 4, { size: 14, weight: 600, color: T.accent, align: 'right' });
      ry += 32;
    }
  }

  // Full-width bottom panels
  const bl = PANELS.bottomLeft;
  const br = PANELS.bottomRight;
  const fullW = bl.w + GAP + br.w;
  panelBg(ctx, { x: bl.x, y: bl.y, w: fullW, h: bl.h });
  panelHeader(ctx, { x: bl.x, y: bl.y, w: fullW }, 'Distribution');
  const pctBarY = panelContentY(bl) + 8;
  text(ctx, 'Message share across top users', bl.x + 16, pctBarY, { size: 14, weight: 500, color: T.textMuted });
  let barX = bl.x + 16;
  const barW = fullW - 32;
  const barH = 40;
  fillRect(ctx, barX, pctBarY + 28, barW, barH, T.panelAlt, 6);
  const colors = [T.accentBright, T.accent, T.accentSoft, '#5a1212', '#3d0c0c', '#2a0808', '#1d0505', '#140303'];
  for (let i = 0; i < Math.min(users.length, 8); i++) {
    const w = totalMsgs > 0 ? (users[i].messages / totalMsgs) * barW : 0;
    fillRect(ctx, barX, pctBarY + 28, w, barH, colors[i % colors.length], i === 0 ? 6 : 0);
    barX += w;
  }

  footer(ctx, 'StatBot  •  m?help for commands');
  return canvas.toBuffer('image/png');
}
