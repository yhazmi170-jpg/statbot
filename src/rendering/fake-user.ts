import { createCanvas } from '@napi-rs/canvas';
import { T, W, H, PAD, fillRect, text, truncate, numStr, durStr, rr } from './theme.js';
import { headerBanner, statCard, sectionBg, barChart, rowItem, HALF_W, COL_GAP, footer } from './components.js';
import type { FakeUserData } from '../fake/generator.js';

export async function renderFakeUserStats(d: FakeUserData): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  let y = PAD;

  // ─── HEADER ─────────────────────────────────────────
  fillRect(ctx, PAD, y, W - PAD * 2, 80, T.panel, 8);
  fillRect(ctx, PAD, y, W - PAD * 2, 1, T.accent);

  // Avatar
  const avatarSize = 52;
  const avatarX = PAD + 16;
  const avatarY = y + 14;
  fillRect(ctx, avatarX, avatarY, avatarSize, avatarSize, T.accentSoft, avatarSize / 2);
  text(ctx, d.username.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 - 10, { size: 22, weight: 700, color: T.accentBright, align: 'center' });

  const textX = avatarX + avatarSize + 14;
  text(ctx, d.username, textX, y + 14, { size: 24, weight: 700, color: T.text });
  text(ctx, 'Last 30 Days', textX, y + 44, { size: 12, color: T.textMuted });

  text(ctx, `#${d.rank}`, W - PAD - 20, y + 14, { size: 32, weight: 700, color: T.accentBright, align: 'right' });
  text(ctx, `of ${numStr(d.totalMembers)} users`, W - PAD - 20, y + 50, { size: 11, color: T.textMuted, align: 'right' });

  y += 94;

  // ─── DEMO LABEL ─────────────────────────────────────
  fillRect(ctx, PAD, y, W - PAD * 2, 28, 'rgba(139,0,0,0.15)', 6);
  text(ctx, 'FICTIONAL DATA  •  DEMO', PAD + 16, y + 7, { size: 11, weight: 600, color: T.accentBright });
  y += 36;

  // ─── PRIMARY STATS ──────────────────────────────────
  const stats = [
    { label: 'Messages', value: numStr(d.totalMessages), color: T.accentBright },
    { label: 'Voice Hours', value: (d.totalVoiceMs / 3600000).toFixed(1) + 'h' },
    { label: 'Active Days', value: `${d.activeDays}/${d.totalDays}` },
    { label: 'Percentile', value: `Top ${d.percentile}%` },
    { label: 'Voice Sessions', value: String(d.voiceSessions) },
  ];
  const statW = (W - PAD * 2 - COL_GAP * (stats.length - 1)) / stats.length;
  const statH = 72;
  for (let i = 0; i < stats.length; i++) {
    statCard(ctx, PAD + i * (statW + COL_GAP), y, statW, statH, stats[i].label, stats[i].value, stats[i].color);
  }
  y += statH + 14;

  // ─── MAIN CONTENT ───────────────────────────────────
  const contentH = H - y - PAD - 50;
  const colH = Math.floor((contentH - COL_GAP) / 2);
  const leftX = PAD;
  const rightX = PAD + HALF_W + COL_GAP;

  // ── TOP LEFT: Daily Activity ──
  sectionBg(ctx, leftX, y, HALF_W, colH);
  fillRect(ctx, leftX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'DAILY MESSAGES', leftX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  const dayLabels = Array.from({ length: d.dailyMessages.length }, (_, i) => String(i + 1));
  const ls = Math.max(1, Math.floor(dayLabels.length / 15));
  barChart(ctx, leftX + 50, y + 44, HALF_W - 70, colH - 64, d.dailyMessages, {
    labels: dayLabels.filter((_, i) => i % ls === 0),
    showValues: false,
  });

  // ── TOP RIGHT: Weekday Activity ──
  sectionBg(ctx, rightX, y, HALF_W, colH);
  fillRect(ctx, rightX, y, HALF_W, 34, T.panelAlt, 0);
  text(ctx, 'ACTIVITY BY WEEKDAY', rightX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  barChart(ctx, rightX + 50, y + 44, HALF_W - 70, colH - 64, d.weekdayMessages, {
    labels: weekdays,
    showValues: true,
    color: T.accent,
  });

  y += colH + COL_GAP;

  // ── BOTTOM: Top Channels ──
  sectionBg(ctx, leftX, y, W - PAD * 2, colH);
  fillRect(ctx, leftX, y, W - PAD * 2, 34, T.panelAlt, 0);
  text(ctx, 'TOP CHANNELS', leftX + 16, y + 9, { size: 13, weight: 700, color: T.accentBright });

  const maxCh = d.topChannels[0]?.messages || 1;
  const chRowH = Math.min(34, (colH - 42) / Math.min(d.topChannels.length, 8));
  for (let i = 0; i < Math.min(d.topChannels.length, 8); i++) {
    const ry = y + 40 + i * chRowH;
    const ch = d.topChannels[i];
    const pct = maxCh > 0 ? ch.messages / maxCh : 0;
    const rankColor = i === 0 ? T.accentBright : i === 1 ? T.accent : i === 2 ? T.accentSoft : T.textDim;
    rowItem(ctx, leftX, ry, W - PAD * 2, chRowH, {
      rank: i + 1,
      rankColor,
      label: '#' + truncate(ctx, ch.channelId, W - PAD * 2 - 200, { size: 13 }),
      value: numStr(ch.messages),
      barPct: pct,
      isLast: i === Math.min(d.topChannels.length, 8) - 1,
    });
  }

  footer(ctx, 'FICTIONAL DATA • DEMO  —  StatBot m?fake user');

  return canvas.toBuffer('image/png');
}
