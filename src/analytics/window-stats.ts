import { prisma } from '../database/index.js';
import { getTopUsers, getTopUsersWithLegacy } from './queries.js';
import {
  topPercent, computeWindowCard, validateUserCard,
  type WindowUser, type WindowChannel, type WindowCard, type CardValidation,
} from './consistency.js';

export {
  topPercent, computeWindowCard, validateUserCard,
  type WindowUser, type WindowChannel, type WindowCard, type CardValidation,
};

export interface WindowUserDetail {
  daily: { date: Date; messages: number; voiceMs: number }[];
  channels: WindowChannel[]; // sorted desc, full list (caller slices)
  hourly: number[];          // 24 buckets from UserHourlyStats
  weekday: number[];         // Mon=0..Sun=6 from userDailyStats
  activeDays: number;
  messages: number;
  voiceMs: number;
}

// Max ranked users considered; m?top leaderboards only show top N but the
// user card rank must be computed against the FULL ranked set.
const RANKING_LIMIT = 2500;

// Resolve the window used by every stats command. Mirrors
// queries.resolvePeriod so period strings behave identically.
export function resolveWindow(days?: number, period?: string): { since: Date; days: number; label: string } {
  if (period) {
    const key = (period || '14d').toLowerCase().trim();
    const map: Record<string, number> = {
      'today': 0, '1d': 1, '7d': 7, '14d': 14, '30d': 30, '90d': 90,
      'week': 7, 'month': 30, 'all': 365 * 5,
    };
    const d = map[key] ?? 14;
    const since = new Date();
    since.setDate(since.getDate() - d);
    since.setHours(0, 0, 0, 0);
    const labels: Record<string, string> = {
      'today': 'Today', '1d': 'Last 24 Hours', '7d': 'Last 7 Days', '14d': 'Last 14 Days',
      '30d': 'Last 30 Days', '90d': 'Last 90 Days', 'week': 'This Week', 'month': 'This Month', 'all': 'All Time',
    };
    return { since, days: d, label: labels[key] || `Last ${d} Days` };
  }
  const d = days ?? 14;
  const since = new Date();
  since.setDate(since.getDate() - d);
  since.setHours(0, 0, 0, 0);
  return { since, days: d, label: `Last ${d} Days` };
}

// The ranked user set a leaderboard and a user card share. 'all' merges
// legacy like getTopUsersWithLegacy so ranks span legacy users too.
export async function getWindowRankedUsers(
  guildId: string,
  days?: number,
  period?: string,
): Promise<WindowUser[]> {
  if (period && period.toLowerCase() === 'all') {
    return getTopUsersWithLegacy(guildId, days, period, RANKING_LIMIT, true);
  }
  return getTopUsers(guildId, days, period, RANKING_LIMIT);
}

// Users with ANY activity (messages OR voice) in the window. This is the
// "active users" number; the ranking population is the messages-only set.
export async function getActiveWindowUserCount(guildId: string, since: Date): Promise<number> {
  const rows = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    where: { guildId, date: { gte: since }, OR: [{ messages: { gt: 0 } }, { voiceMs: { gt: 0 } }] },
    _count: true,
  });
  return rows.length;
}

export async function getWindowServerTotalMessages(guildId: string, since: Date): Promise<number> {
  const agg = await prisma.guildDailyStats.aggregate({
    where: { guildId, date: { gte: since } },
    _sum: { totalMessages: true },
  });
  return Number(agg._sum.totalMessages || 0);
}

export async function getWindowUserDetail(guildId: string, userId: string, since: Date): Promise<WindowUserDetail> {
  const [dailyRows, channelRows, hourlyRows] = await Promise.all([
    prisma.userDailyStats.findMany({
      where: { guildId, userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
    prisma.userChannelStats.groupBy({
      by: ['channelId'],
      where: { guildId, userId, date: { gte: since } },
      _sum: { messages: true },
      orderBy: { _sum: { messages: 'desc' } },
    }),
    prisma.userHourlyStats.groupBy({
      by: ['hour'],
      where: { guildId, userId, date: { gte: since } },
      _sum: { messages: true },
    }),
  ]);

  const channels = channelRows
    .map(r => ({ channelId: r.channelId, messages: r._sum.messages || 0 }))
    .sort((a, b) => b.messages - a.messages);

  const hourly = Array(24).fill(0) as number[];
  for (const r of hourlyRows) hourly[r.hour] += r._sum.messages || 0;

  const weekday = Array(7).fill(0) as number[];
  let activeDays = 0;
  let messages = 0;
  let voiceMs = 0;
  const daily = dailyRows.map(d => {
    messages += d.messages;
    voiceMs += Number(d.voiceMs || 0);
    if (d.messages > 0) activeDays++;
    const dow = new Date(d.date).getDay();
    weekday[dow === 0 ? 6 : dow - 1] += d.messages;
    return { date: d.date, messages: d.messages, voiceMs: Number(d.voiceMs || 0) };
  });

  return { daily, channels, hourly, weekday, activeDays, messages, voiceMs };
}

// First date any per-user channel data exists (for the "tracking since"
// banner during the migration window when the table is still empty).
export async function getChannelTrackingSince(guildId: string): Promise<Date | null> {
  const first = await prisma.userChannelStats.findFirst({
    where: { guildId },
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  return first?.date ?? null;
}