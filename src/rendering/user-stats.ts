import { createCanvas, loadImage } from '@napi-rs/canvas';
import { T, W, H, PAD, GAP, PANEL_W, PANEL_H, PANELS, STAT_W, STAT_H, GRID_TOP, fillRect, text, numStr, durStr, THEME } from './theme.js';
import { headerBanner, statCard, panelBg, panelHeader, panelContentY, barChart, rowItem, footer, sanitizeText, panelClip, panelRestore } from './components.js';

interface Channel { name?: string; channelId?: string; messages: number; voiceMs?: number }
interface Data {
  guildName?: string;
  userId?: string;
  username?: string;
  user?: { username: string; avatarUrl?: string };
  avatarUrl?: string;
  totalMessages: number;
  totalVoiceMs: number;
  activeDays: number;
  totalDays: number;
  periodLabel?: string;
  firstSeen?: string;
  topChannelName?: string;
  topChannels: Channel[];
  hourlyMessages?: number[];
  weekdayMessages: number[];
  dailyMessages?: number[];
  rank: number;
  totalUsers?: number;
  totalMembers?: number;
  percentile: number;
  voiceSessions?: number;
  msgsThisWeek?: number;
  msgsThisMonth?: number;
  voiceThisWeek?: number;
  voiceThisMonth?: number;
  // Legacy data
  legacyMessages?: number;
  legacyVoiceMs?: number;
  legacyMsgRank?: number | null;
  legacyVoiceRank?: number | null;
  liveMessages?: number;
  liveVoiceMs?: number;
  // Active voice
  activeVoiceMs?: number;
  activeVoiceChannelId?: string;
  activeVoiceChannelName?: string;
}

export async function renderUserStats(d: Data): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRect(ctx, 0, 0, W, H, T.bg);

  const username = sanitizeText(d.username || d.user?.username || d.userId || 'User');
  const totalUsers = d.totalUsers || d.totalMembers || 0;
  const guildName = d.guildName || '';

  const topChannels = d.topChannels.map(c => ({
    name: sanitizeText(c.name || c.channelId || 'unknown'),
    messages: c.messages,
    voiceMs: c.voiceMs || 0,
  }));

  // Load avatar image
  let avatarImage: any = null;
  const avatarUrl = d.user?.avatarUrl || d.avatarUrl;
  if (avatarUrl) {
    try {
      avatarImage = await loadImage(avatarUrl);
    } catch {}
  }

  // Header with avatar
  fillRect(ctx, PAD, PAD, W - PAD * 2, 80, T.panel, THEME.borderRadius);

  const avatarSize = 56;
  const avatarX = PAD + 20;
  const avatarY = PAD + 12;

  if (avatarImage) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } else {
    fillRect(ctx, avatarX, avatarY, avatarSize, avatarSize, T.accentDim, avatarSize / 2);
    text(ctx, username.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 - 12, { size: 26, weight: 700, color: T.text, align: 'center' });
  }

  const textX = avatarX + avatarSize + 16;
  text(ctx, username, textX, PAD + 16, { size: 28, weight: 700, color: T.text });
  text(ctx, `${guildName}  •  ${d.periodLabel || `Last ${d.totalDays} Days`}`, textX, PAD + 48, { size: 16, weight: 500, color: T.textMuted });

  text(ctx, `#${d.rank}`, W - PAD - 24, PAD + 12, { size: 44, weight: 700, color: T.accentBright, align: 'right' });
  text(ctx, `of ${numStr(totalUsers)} users`, W - PAD - 24, PAD + 52, { size: 13, weight: 500, color: T.textMuted, align: 'right' });

  const topChannelLabel = topChannels.length > 0 ? topChannels[0].name : '—';

  // Clean totals - no live/legacy breakdown in UI
  const msgValue = numStr(d.totalMessages);
  const voiceValue = (d.totalVoiceMs / 3600000).toFixed(1) + 'h';

  const stats = [
    { label: 'Messages', value: msgValue, color: T.accentBright },
    { label: 'Voice Hours', value: voiceValue },
    { label: 'Active Days', value: `${d.activeDays}/${d.totalDays}` },
    { label: 'Top Channel', value: topChannelLabel },
    { label: 'Percentile', value: `Top ${d.percentile}%` },
  ];
  for (let i = 0; i < stats.length; i++) {
    statCard(ctx, i, stats[i].label, stats[i].value, stats[i].color);
  }

  // Activity by Hour — smooth area chart (12-hour AM/PM)
  const tl = PANELS.topLeft;
  panelBg(ctx, tl);
  // Clip to content area only (below header)
  const tlContentY = panelContentY(tl);
  const tlContentH = tl.h - 40;
  panelClip(ctx, { x: tl.x, y: tlContentY, w: tl.w, h: tlContentH });
  panelHeader(ctx, tl, 'Activity by Hour');

  const hourlyData = d.hourlyMessages || Array(24).fill(0);
  const maxActivity = Math.max(...hourlyData, 1);
  const yAxisMax = Math.ceil(maxActivity / 5) * 5 || 5;

  const chartX = tl.x + 50;
  const chartY = tlContentY;
  const chartW = tl.w - 70;
  const chartH = tlContentH - 15;
  const topPad = 20;
  const drawH = chartH - topPad - 20;

  // Y-axis grid + labels (drawn OUTSIDE clip)
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const val = Math.round((yAxisMax * i) / ySteps);
    const yy = chartY + topPad + drawH - (i / ySteps) * drawH;
    text(ctx, String(val), chartX - 8, yy - 7, { size: 12, weight: 500, color: T.chartText, align: 'right' });
  }

  // Clip to exact chart inner bounds
  ctx.save();
  ctx.beginPath();
  ctx.rect(chartX, chartY + topPad, chartW, drawH);
  ctx.clip();

  // Grid lines INSIDE clip using proper path
  for (let i = 0; i <= ySteps; i++) {
    const yy = chartY + topPad + drawH - (i / ySteps) * drawH;
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(chartX, yy);
      ctx.lineTo(chartX + chartW, yy);
      ctx.strokeStyle = T.chartGrid;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Build points
  const stepX = chartW / 23;
  const points = hourlyData.map((val, idx) => ({
    px: chartX + idx * stepX,
    py: chartY + topPad + drawH - (val / yAxisMax) * drawH,
  }));

  // Crimson gradient fill
  const gradient = ctx.createLinearGradient(0, chartY + topPad, 0, chartY + topPad + drawH);
  gradient.addColorStop(0, 'rgba(220, 38, 38, 0.3)');
  gradient.addColorStop(1, 'rgba(220, 38, 38, 0.0)');

  ctx.beginPath();
  ctx.moveTo(points[0].px, points[0].py);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].px, points[i].py);
  ctx.lineTo(points[points.length - 1].px, chartY + topPad + drawH);
  ctx.lineTo(points[0].px, chartY + topPad + drawH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Stroke line
  ctx.beginPath();
  ctx.moveTo(points[0].px, points[0].py);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].px, points[i].py);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore();

  // X-axis labels — every 4 hours, 12-hour AM/PM
  for (let i = 0; i < 24; i += 4) {
    const ampm = i < 12 ? 'AM' : 'PM';
    const hour12 = i % 12 === 0 ? 12 : i % 12;
    const label = `${hour12}${ampm}`;
    const labelX = chartX + i * stepX;
    text(ctx, label, labelX, chartY + topPad + drawH + 8, { size: 11, weight: 500, color: T.textDim, align: 'center' });
  }
  panelRestore(ctx);

  // Activity by Weekday chart
  const tr = PANELS.topRight;
  panelBg(ctx, tr);
  panelClip(ctx, tr);
  panelHeader(ctx, tr, 'Activity by Weekday');
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const wdYMax = Math.ceil(Math.max(...d.weekdayMessages, 1) / 5) * 5 || 5;
  barChart(ctx, tr.x + 50, panelContentY(tr), tr.w - 70, tr.h - 55,
    d.weekdayMessages, { labels: dayLabels, showValues: true, color: T.accent, maxVal: wdYMax });
  panelRestore(ctx);

  // Top Channels panel — 2-column grid, max 6
  const bl = PANELS.bottomLeft;
  const br = PANELS.bottomRight;
  const fullW = bl.w + GAP + br.w;
  panelBg(ctx, { x: bl.x, y: bl.y, w: fullW, h: bl.h });
  panelClip(ctx, { x: bl.x, y: bl.y, w: fullW, h: bl.h });
  panelHeader(ctx, { x: bl.x, y: bl.y, w: fullW }, 'Top Channels', `${Math.min(topChannels.length, 6)} channels`);

  const displayChannels = topChannels.slice(0, 6);
  const maxCh = displayChannels[0]?.messages || 1;
  const chCols = 2;
  const chColW = (fullW - GAP) / chCols;
  const chPerCol = 3;
  const chRowH = Math.floor((bl.h - 50) / chPerCol);

  for (let ci = 0; ci < chCols; ci++) {
    const colX = bl.x + ci * (chColW + GAP);
    for (let ri = 0; ri < chPerCol; ri++) {
      const idx = ci * chPerCol + ri;
      if (idx >= displayChannels.length) break;
      const ch = displayChannels[idx];
      const itemY = panelContentY(bl) + ri * chRowH;
      const pct = maxCh > 0 ? ch.messages / maxCh : 0;
      const rankColor = idx === 0 ? T.accentBright : idx === 1 ? T.textSecondary : idx === 2 ? T.textMuted : T.textDim;
      rowItem(ctx, colX, itemY, chColW, chRowH, {
        rank: idx + 1,
        rankColor,
        label: ch.name,
        value: numStr(ch.messages),
        isLast: ri === chPerCol - 1,
      });
    }
  }
  panelRestore(ctx);

  footer(ctx, 'StatBot  •  m?help for commands');

  return canvas.toBuffer('image/png');
}
