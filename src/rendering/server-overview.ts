import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, fillRect, text, numStr } from './theme.js';
import { headerBanner, panelBg, panelHeader, panelContentY, footer, COL_GAP, sanitizeText } from './components.js';

interface Data {
  guild: { name: string; memberCount: number; channelCount: number; roleCount: number; emojiCount: number; boostLevel: number; boostCount: number; createdAt: string; ownerTag?: string; };
  totalMessages: number; totalVoiceMs: number; uniqueUsers: number;
  msgsPerDay: number; peakHour: string; peakDay: string; joins: number; leaves: number;
}

export async function renderServerOverview(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  fillRect(ctx, 0, 0, W, H, T.bg);

  headerBanner(ctx, sanitizeText(d.guild.name), `Server Overview  •  Created ${d.guild.createdAt}`, {
    rightLabel: 'Members', rightValue: numStr(d.guild.memberCount),
  });

  const infoItems = [
    { label: 'Channels', value: String(d.guild.channelCount) },
    { label: 'Roles', value: String(d.guild.roleCount) },
    { label: 'Emojis', value: String(d.guild.emojiCount) },
    { label: 'Boosts', value: `Lv.${d.guild.boostLevel} (${d.guild.boostCount})` },
  ];
  const infoW = (W - PAD * 2 - GAP * (infoItems.length - 1)) / infoItems.length;
  const infoY = PAD + 75 + 15;
  for (let i = 0; i < infoItems.length; i++) {
    const ix = PAD + i * (infoW + GAP);
    fillRect(ctx, ix, infoY, infoW, 60, T.panel, 12);
    ctx.strokeStyle = T.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(ix, infoY, infoW, 60);
    text(ctx, infoItems[i].label.toUpperCase(), ix + 14, infoY + 10, { size: 13, weight: 700, color: T.textDim });
    text(ctx, infoItems[i].value, ix + 14, infoY + 30, { size: 24, weight: 700, color: T.text });
  }

  const tl = PANELS.topLeft;
  panelBg(ctx, tl);
  panelHeader(ctx, tl, 'Activity');
  const actItems = [
    ['Total Messages', numStr(d.totalMessages)], ['Active Users', numStr(d.uniqueUsers)],
    ['Voice Hours', (d.totalVoiceMs / 3600000).toFixed(1) + 'h'], ['Messages/Day', numStr(Math.round(d.msgsPerDay))],
    ['Peak Hour', d.peakHour], ['Peak Day', d.peakDay],
  ];
  let ry = panelContentY(tl) + 8;
  for (const [label, value] of actItems) {
    text(ctx, label.toUpperCase(), tl.x + 16, ry, { size: 13, weight: 700, color: T.textDim });
    text(ctx, value, tl.x + tl.w - 16, ry, { size: 18, weight: 700, color: T.text, align: 'right' });
    ry += 38;
    fillRect(ctx, tl.x + 16, ry - 8, tl.w - 32, 1, T.borderSubtle);
  }

  const tr = PANELS.topRight;
  panelBg(ctx, tr);
  panelHeader(ctx, tr, 'Growth');
  const net = d.joins - d.leaves;
  const growItems = [
    { label: 'Joined', value: numStr(d.joins), color: T.green },
    { label: 'Left', value: numStr(d.leaves), color: T.red },
    { label: 'Net Growth', value: `${net >= 0 ? '+' : ''}${numStr(net)}`, color: net >= 0 ? T.green : T.red },
    { label: 'Growth %', value: d.guild.memberCount > 0 ? ((net / d.guild.memberCount) * 100).toFixed(1) + '%' : '0%', color: net >= 0 ? T.green : T.red },
  ];
  ry = panelContentY(tr) + 8;
  for (const item of growItems) {
    text(ctx, item.label.toUpperCase(), tr.x + 16, ry, { size: 13, weight: 700, color: T.textDim });
    text(ctx, item.value, tr.x + tr.w - 16, ry, { size: 18, weight: 700, color: item.color, align: 'right' });
    ry += 38;
    fillRect(ctx, tr.x + 16, ry - 8, tr.w - 32, 1, T.borderSubtle);
  }

  const bl = PANELS.bottomLeft;
  panelBg(ctx, bl);
  panelHeader(ctx, bl, 'Quick Stats');
  const quickItems = [
    { label: 'Avg. Messages/User', value: d.uniqueUsers > 0 ? numStr(Math.round(d.totalMessages / d.uniqueUsers)) : '—' },
    { label: 'Voice Sessions/User', value: d.uniqueUsers > 0 ? (d.totalVoiceMs / d.uniqueUsers / 60000).toFixed(1) + 'm' : '—' },
    { label: 'Message/Peak Hour', value: numStr(Math.round(d.totalMessages / 30)) },
  ];
  ry = panelContentY(bl) + 8;
  for (const item of quickItems) {
    text(ctx, item.label.toUpperCase(), bl.x + 16, ry, { size: 13, weight: 700, color: T.textDim });
    text(ctx, item.value, bl.x + bl.w - 16, ry, { size: 18, weight: 700, color: T.text, align: 'right' });
    ry += 38;
    fillRect(ctx, bl.x + 16, ry - 8, bl.w - 32, 1, T.borderSubtle);
  }

  const br = PANELS.bottomRight;
  panelBg(ctx, br);
  panelHeader(ctx, br, 'Server Info');
  const infoDetails = [
    { label: 'Owner', value: d.guild.ownerTag || 'Unknown' },
    { label: 'Boost Level', value: `Level ${d.guild.boostLevel}` },
    { label: 'Total Boosts', value: String(d.guild.boostCount) },
  ];
  ry = panelContentY(br) + 8;
  for (const item of infoDetails) {
    text(ctx, item.label.toUpperCase(), br.x + 16, ry, { size: 13, weight: 700, color: T.textDim });
    text(ctx, item.value, br.x + br.w - 16, ry, { size: 18, weight: 700, color: T.text, align: 'right' });
    ry += 38;
    fillRect(ctx, br.x + 16, ry - 8, br.w - 32, 1, T.borderSubtle);
  }

  footer(ctx, 'StatBot  •  m?help for commands');
  return canvas.toBuffer('image/png');
}
