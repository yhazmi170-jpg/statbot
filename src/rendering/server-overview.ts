import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, numStr, durStr } from './theme.js';
import { headerBanner, statCard, sectionBg, rowItem, HALF_W, COL_GAP, footer } from './components.js';

interface Data {
  guild: {
    name: string; iconUrl?: string; memberCount: number; onlineCount?: number;
    botCount?: number; channelCount: number; roleCount: number; emojiCount: number;
    boostLevel: number; boostCount: number; createdAt: string; ownerTag?: string;
  };
  totalMessages: number;
  totalVoiceMs: number;
  uniqueUsers: number;
  msgsPerDay: number;
  peakHour: string;
  peakDay: string;
  joins: number;
  leaves: number;
}

export async function renderServerOverview(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  // ─── HEADER ─────────────────────────────────────────
  headerBanner(ctx, y, d.guild.name, `Server Overview  •  Created ${d.guild.createdAt}`, {
    rightLabel: 'Members',
    rightValue: numStr(d.guild.memberCount),
  });
  y += 78;

  // ─── INFO CARDS ─────────────────────────────────────
  const infoItems = [
    { label: 'Channels', value: String(d.guild.channelCount) },
    { label: 'Roles', value: String(d.guild.roleCount) },
    { label: 'Emojis', value: String(d.guild.emojiCount) },
    { label: 'Boosts', value: `Lv.${d.guild.boostLevel} (${d.guild.boostCount})` },
    { label: 'Bots', value: String(d.guild.botCount || 0) },
  ];
  const infoW = (W - PAD * 2 - COL_GAP * (infoItems.length - 1)) / infoItems.length;
  const infoH = 56;
  for (let i = 0; i < infoItems.length; i++) {
    const ix = PAD + i * (infoW + COL_GAP);
    fillRect(ctx, ix, y, infoW, infoH, T.panel, 8);
    fillRect(ctx, ix, y, infoW, 1, T.border);
    text(ctx, infoItems[i].label.toUpperCase(), ix + 14, y + 10, { size: 11, weight: 600, color: T.textDim });
    text(ctx, infoItems[i].value, ix + 14, y + 28, { size: 20, weight: 700, color: T.text });
  }
  y += infoH + 14;

  // ─── MAIN CONTENT ───────────────────────────────────
  const contentH = H - y - PAD - 44;
  const colH = Math.floor((contentH - COL_GAP) / 2);

  // ── TOP LEFT: Activity ──
  sectionBg(ctx, PAD, y, HALF_W, colH);
  fillRect(ctx, PAD, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'ACTIVITY', PAD + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const actItems = [
    ['Total Messages', numStr(d.totalMessages)],
    ['Active Users', numStr(d.uniqueUsers)],
    ['Voice Hours', (d.totalVoiceMs / 3600000).toFixed(1) + 'h'],
    ['Messages/Day', numStr(Math.round(d.msgsPerDay))],
    ['Peak Hour', d.peakHour],
    ['Peak Day', d.peakDay],
  ];
  let ry = y + 44;
  for (const [label, value] of actItems) {
    text(ctx, label.toUpperCase(), PAD + 16, ry, { size: 11, weight: 600, color: T.textDim });
    text(ctx, value, PAD + HALF_W - 16, ry, { size: 16, weight: 700, color: T.text, align: 'right' });
    ry += 34;
    fillRect(ctx, PAD + 16, ry - 8, HALF_W - 32, 1, T.border);
  }

  // ── TOP RIGHT: Growth ──
  const rightX = PAD + HALF_W + COL_GAP;
  sectionBg(ctx, rightX, y, HALF_W, colH);
  fillRect(ctx, rightX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'GROWTH', rightX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const net = d.joins - d.leaves;
  const growItems = [
    { label: 'Joined', value: numStr(d.joins), color: T.green },
    { label: 'Left', value: numStr(d.leaves), color: T.red },
    { label: 'Net Growth', value: `${net >= 0 ? '+' : ''}${numStr(net)}`, color: net >= 0 ? T.green : T.red },
    { label: 'Growth %', value: d.guild.memberCount > 0 ? ((net / d.guild.memberCount) * 100).toFixed(1) + '%' : '0%', color: net >= 0 ? T.green : T.red },
  ];
  ry = y + 44;
  for (const item of growItems) {
    text(ctx, item.label.toUpperCase(), rightX + 16, ry, { size: 11, weight: 600, color: T.textDim });
    text(ctx, item.value, rightX + HALF_W - 16, ry, { size: 16, weight: 700, color: item.color, align: 'right' });
    ry += 34;
    fillRect(ctx, rightX + 16, ry - 8, HALF_W - 32, 1, T.border);
  }

  y += colH + COL_GAP;

  // ── BOTTOM LEFT: Quick Stats ──
  sectionBg(ctx, PAD, y, HALF_W, colH);
  fillRect(ctx, PAD, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'QUICK STATS', PAD + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const quickItems = [
    { label: 'Avg. Messages/User', value: d.uniqueUsers > 0 ? numStr(Math.round(d.totalMessages / d.uniqueUsers)) : '—' },
    { label: 'Voice Sessions/User', value: d.uniqueUsers > 0 ? (d.totalVoiceMs / d.uniqueUsers / 60000).toFixed(1) + 'm' : '—' },
    { label: 'Message/Peak Hour', value: numStr(Math.round(d.totalMessages / 30)) },
    { label: 'Online Now', value: d.guild.onlineCount ? numStr(d.guild.onlineCount) : '—' },
  ];
  ry = y + 44;
  for (const item of quickItems) {
    text(ctx, item.label.toUpperCase(), PAD + 16, ry, { size: 11, weight: 600, color: T.textDim });
    text(ctx, item.value, PAD + HALF_W - 16, ry, { size: 16, weight: 700, color: T.text, align: 'right' });
    ry += 34;
    fillRect(ctx, PAD + 16, ry - 8, HALF_W - 32, 1, T.border);
  }

  // ── BOTTOM RIGHT: Owner ──
  sectionBg(ctx, rightX, y, HALF_W, colH);
  fillRect(ctx, rightX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'SERVER INFO', rightX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const infoDetails = [
    { label: 'Owner', value: d.guild.ownerTag || 'Unknown' },
    { label: 'Boost Level', value: `Level ${d.guild.boostLevel}` },
    { label: 'Total Boosts', value: String(d.guild.boostCount) },
  ];
  ry = y + 44;
  for (const item of infoDetails) {
    text(ctx, item.label.toUpperCase(), rightX + 16, ry, { size: 11, weight: 600, color: T.textDim });
    text(ctx, item.value, rightX + HALF_W - 16, ry, { size: 16, weight: 700, color: T.text, align: 'right' });
    ry += 34;
    fillRect(ctx, rightX + 16, ry - 8, HALF_W - 32, 1, T.border);
  }

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
