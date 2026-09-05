import { prisma } from '../database/index.js';
import { parsePeriod, type PeriodRange } from '../utils/period.js';
import { IMPORT_KEY } from '../services/legacy-import.js';

// Timezone conversion helper
function convertHourToTimezone(utcHour: number, timezone: string): number {
  try {
    // Use a reference date to get the timezone offset
    const refDate = new Date('2024-01-15T00:00:00Z');
    const utcHourDate = new Date(refDate);
    utcHourDate.setUTCHours(utcHour, 0, 0, 0);
    
    // Convert to target timezone
    const targetTime = utcHourDate.toLocaleString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    
    return parseInt(targetTime, 10) % 24;
  } catch {
    return utcHour;
  }
}

export async function getGuildTimezone(guildId: string): Promise<string> {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { timezone: true },
  });
  return guild?.timezone || 'UTC';
}

// Shared period resolver
function resolvePeriod(days?: number, period?: string): PeriodRange {
  if (period) return parsePeriod(period);
  if (days !== undefined) {
    const p = parsePeriod('30d');
    p.days = days;
    p.since = new Date();
    p.since.setDate(p.since.getDate() - days);
    p.since.setHours(0, 0, 0, 0);
    return p;
  }
  return parsePeriod('14d');
}

// ─── LEGACY STATS HELPERS ──────────────────────────────────

export async function getLegacyUserStats(guildId: string, discordUserId: string) {
  return prisma.legacyUserStats.findFirst({
    where: { guildId, discordUserId, importKey: IMPORT_KEY },
  });
}

export async function getLegacyUserStatsByUsername(guildId: string, username: string) {
  return prisma.legacyUserStats.findFirst({
    where: { guildId, importedUsername: username, importKey: IMPORT_KEY },
  });
}

export async function getAllLegacyUserStats(guildId: string) {
  return prisma.legacyUserStats.findMany({
    where: { guildId, importKey: IMPORT_KEY },
    orderBy: { messageCount14d: 'desc' },
  });
}

export async function getAllLegacyChannelStats(guildId: string) {
  return prisma.legacyChannelStats.findMany({
    where: { guildId, importKey: IMPORT_KEY },
    orderBy: { messageCount14d: 'desc' },
  });
}

export async function getLegacyLeaderboardMessages(guildId: string, limit: number = 15) {
  const stats = await prisma.legacyUserStats.findMany({
    where: { guildId, importKey: IMPORT_KEY, messageCount14d: { gt: 0 } },
    orderBy: { messageCount14d: 'desc' },
    take: limit,
  });
  return stats.map(s => ({
    userId: s.discordUserId || s.importedUsername,
    messages: s.messageCount14d,
    voiceMs: s.voiceSeconds14d * 1000,
    isLegacy: true,
  }));
}

export async function getLegacyLeaderboardVoice(guildId: string, limit: number = 15) {
  const stats = await prisma.legacyUserStats.findMany({
    where: { guildId, importKey: IMPORT_KEY, voiceSeconds14d: { gt: 0 } },
    orderBy: { voiceSeconds14d: 'desc' },
    take: limit,
  });
  return stats.map(s => ({
    userId: s.discordUserId || s.importedUsername,
    messages: s.messageCount14d,
    voiceMs: s.voiceSeconds14d * 1000,
    isLegacy: true,
  }));
}

// Server overview stats
export async function getServerStats(guildId: string, days?: number, period?: string) {
  const { since, days: d } = resolvePeriod(days, period);

  const [totalMessages, totalVoiceMs, uniqueUsers, dailyStats, topChannels, topUsers] = await Promise.all([
    prisma.guildDailyStats.aggregate({
      where: { guildId, date: { gte: since } },
      _sum: { totalMessages: true },
    }),
    prisma.guildDailyStats.aggregate({
      where: { guildId, date: { gte: since } },
      _sum: { totalVoiceMs: true },
    }),
    // Active users = users with messages OR voice activity
    prisma.userDailyStats.groupBy({
      by: ['userId'],
      where: {
        guildId,
        date: { gte: since },
        OR: [
          { messages: { gt: 0 } },
          { voiceMs: { gt: 0 } },
        ],
      },
      _count: { userId: true },
    }),
    prisma.guildDailyStats.findMany({
      where: { guildId, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
    prisma.channelStats.groupBy({
      by: ['channelId'],
      where: { guildId, date: { gte: since } },
      _sum: { messages: true },
      _count: true,
      orderBy: { _sum: { messages: 'desc' } },
      take: 10,
    }),
    prisma.userDailyStats.groupBy({
      by: ['userId'],
      where: { guildId, date: { gte: since }, messages: { gt: 0 } },
      _sum: { messages: true },
      _count: true,
      orderBy: { _sum: { messages: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    totalMessages: totalMessages._sum.totalMessages || 0,
    totalVoiceMs: Number(totalVoiceMs._sum.totalVoiceMs || 0),
    uniqueUsers: uniqueUsers.length,
    dailyStats,
    topChannels: topChannels.map(c => ({
      channelId: c.channelId,
      messages: c._sum?.messages || 0,
      users: typeof c._count === 'number' ? c._count : 0,
    })),
    topUsers: topUsers.map(u => ({
      userId: u.userId,
      messages: u._sum?.messages || 0,
    })),
  };
}

// User stats
export async function getUserStats(guildId: string, userId: string, days?: number, period?: string) {
  const { since } = resolvePeriod(days, period);
  const now = new Date();

  const [dailyStats, voiceSessions, topChannels, dailyBreakdown, activeVoiceSession] = await Promise.all([
    prisma.userDailyStats.aggregate({
      where: { guildId, userId, date: { gte: since } },
      _sum: { messages: true, voiceMs: true },
      _count: { messages: true },
    }),
    prisma.voiceSession.aggregate({
      where: { guildId, userId, startedAt: { gte: since } },
      _sum: { durationMs: true },
      _count: { id: true },
    }),
    prisma.userDailyStats.groupBy({
      by: ['topChannelId'],
      where: { guildId, userId, date: { gte: since }, topChannelId: { not: null } },
      _count: { topChannelId: true },
      orderBy: { _count: { topChannelId: 'desc' } },
      take: 6,
    }),
    prisma.userDailyStats.findMany({
      where: { guildId, userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
    // Get currently active voice session for this user
    prisma.voiceSession.findFirst({
      where: {
        guildId,
        userId,
        endedAt: null,
        startedAt: { lte: now },
      },
      select: {
        startedAt: true,
        channelId: true,
        channelName: true,
      },
    }),
  ]);

  // Calculate active voice session duration if user is currently in voice
  let activeVoiceMs = 0;
  let activeVoiceChannelId: string | null = null;
  let activeVoiceChannelName: string | null = null;

  if (activeVoiceSession) {
    activeVoiceMs = now.getTime() - activeVoiceSession.startedAt.getTime();
    activeVoiceChannelId = activeVoiceSession.channelId;
    activeVoiceChannelName = activeVoiceSession.channelName;
  }

  return {
    totalMessages: dailyStats._sum.messages || 0,
    totalVoiceMs: Number(dailyStats._sum.voiceMs || 0) + activeVoiceMs,
    voiceSessions: voiceSessions._count.id,
    voiceTotalMs: Number(voiceSessions._sum.durationMs || 0) + activeVoiceMs,
    topChannels: topChannels.map(c => ({
      channelId: c.topChannelId || '',
      messages: c._count?.topChannelId || 0,
    })),
    dailyBreakdown,
    activeVoiceMs,
    activeVoiceChannelId,
    activeVoiceChannelName,
  };
}

// Top users leaderboard
export async function getTopUsers(guildId: string, days?: number, period?: string, limit: number = 15) {
  const { since } = resolvePeriod(days, period);
  const stats = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    where: { guildId, date: { gte: since }, messages: { gt: 0 } },
    _sum: { messages: true, voiceMs: true },
    orderBy: { _sum: { messages: 'desc' } },
    take: limit,
  });

  return stats.map(s => ({
    userId: s.userId,
    messages: s._sum.messages || 0,
    voiceMs: Number(s._sum.voiceMs || 0),
  }));
}

// Top users leaderboard with legacy support
export async function getTopUsersWithLegacy(guildId: string, days?: number, period?: string, limit: number = 15, includeLegacy: boolean = false) {
  const liveStats = await getTopUsers(guildId, days, period, limit);
  
  if (!includeLegacy) return liveStats;
  
  const legacyStats = await getLegacyLeaderboardMessages(guildId, limit);
  
  // Merge live + legacy
  const merged = new Map<string, { userId: string; messages: number; voiceMs: number }>();
  
  for (const s of liveStats) {
    merged.set(s.userId, { ...s });
  }
  
  for (const s of legacyStats) {
    const existing = merged.get(s.userId);
    if (existing) {
      existing.messages += s.messages;
      existing.voiceMs += s.voiceMs;
    } else {
      merged.set(s.userId, { ...s });
    }
  }
  
  return Array.from(merged.values())
    .sort((a, b) => b.messages - a.messages)
    .slice(0, limit);
}

// Top voice leaderboard with legacy support
export async function getTopVoiceWithLegacy(guildId: string, days?: number, period?: string, limit: number = 15, includeLegacy: boolean = false) {
  const liveStats = await getTopVoice(guildId, days, period, limit);
  
  if (!includeLegacy) return liveStats;
  
  const legacyStats = await getLegacyLeaderboardVoice(guildId, limit);
  
  // Merge live + legacy
  const merged = new Map<string, { userId: string; messages: number; voiceMs: number }>();
  
  for (const s of liveStats) {
    merged.set(s.userId, { ...s });
  }
  
  for (const s of legacyStats) {
    const existing = merged.get(s.userId);
    if (existing) {
      existing.messages += s.messages;
      existing.voiceMs += s.voiceMs;
    } else {
      merged.set(s.userId, { ...s });
    }
  }
  
  return Array.from(merged.values())
    .sort((a, b) => b.voiceMs - a.voiceMs)
    .slice(0, limit);
}

// Top channels leaderboard
export async function getTopChannels(guildId: string, days?: number, period?: string, limit: number = 15) {
  const { since } = resolvePeriod(days, period);
  const stats = await prisma.channelStats.groupBy({
    by: ['channelId'],
    where: { guildId, date: { gte: since } },
    _sum: { messages: true },
    _count: true,
    orderBy: { _sum: { messages: 'desc' } },
    take: limit,
  });

  return stats.map(s => ({
    channelId: s.channelId,
    messages: s._sum?.messages || 0,
    users: typeof s._count === 'number' ? s._count : 0,
  }));
}

// Top channels leaderboard with legacy support
export async function getTopChannelsWithLegacy(guildId: string, days?: number, period?: string, limit: number = 15, includeLegacy: boolean = false) {
  const liveStats = await getTopChannels(guildId, days, period, limit);
  
  if (!includeLegacy) return liveStats;
  
  const legacyStats = await getAllLegacyChannelStats(guildId);
  
  const legacyFormatted = legacyStats
    .filter(s => s.messageCount14d > 0)
    .map(s => ({
      channelId: s.channelId || `legacy:${s.channelName}`,
      messages: s.messageCount14d,
      users: 1,
      isLegacy: true,
      channelName: s.channelName,
    }))
    .slice(0, limit);
  
  const merged = new Map<string, { channelId: string; messages: number; users: number; channelName?: string }>();
  
  for (const s of liveStats) {
    merged.set(s.channelId, { ...s, channelName: undefined });
  }
  
  for (const s of legacyFormatted) {
    const existing = merged.get(s.channelId);
    if (existing) {
      existing.messages += s.messages;
      existing.users = Math.max(existing.users, s.users);
    } else {
      merged.set(s.channelId, { ...s });
    }
  }
  
  return Array.from(merged.values())
    .sort((a, b) => b.messages - a.messages)
    .slice(0, limit);
}

// ─── CHANNEL FILTERING ─────────────────────────────────────

export interface FilteredChannel {
  channelId: string;
  messages: number;
  users: number;
  channelName?: string;
}

export interface VoiceChannelStats {
  channelId: string;
  totalMs: number;
  sessions: number;
  channelName?: string;
}

export async function filterPublicChannels(guild: any, channels: FilteredChannel[]): Promise<FilteredChannel[]> {
  if (!guild || !guild.roles || !guild.roles.everyone) return channels;
  
  const everyoneRole = guild.roles.everyone;
  
  return channels.filter(c => {
    if (!c.channelId || c.channelId.startsWith('legacy:')) return true;
    
    const channel = guild.channels.cache.get(c.channelId);
    if (!channel) return false;
    
    if (!channel.isTextBased()) return false;
    
    const perms = channel.permissionsFor(everyoneRole);
    if (!perms || !perms.has('ViewChannel')) return false;
    
    return true;
  });
}

export async function filterPublicVoiceChannels(guild: any, channels: VoiceChannelStats[]): Promise<VoiceChannelStats[]> {
  if (!guild || !guild.roles || !guild.roles.everyone) return channels;
  
  const everyoneRole = guild.roles.everyone;
  
  return channels.filter(c => {
    if (!c.channelId) return false;
    
    const channel = guild.channels.cache.get(c.channelId);
    if (!channel) return false;
    
    if (!channel.isVoiceBased()) return false;
    
    const perms = channel.permissionsFor(everyoneRole);
    if (!perms || !perms.has('ViewChannel')) return false;
    
    return true;
  });
}

// Activity heatmap (24h x 7days)
export async function getActivityHeatmap(guildId: string, days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const timezone = await getGuildTimezone(guildId);

  const hourly = await prisma.guildHourlyStats.findMany({
    where: { guildId, date: { gte: since } },
    orderBy: [{ date: 'asc' }, { hour: 'asc' }],
  });

  // Build 7x24 grid
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const h of hourly) {
    // Convert UTC hour to guild timezone
    const localHour = await convertHourToTimezone(h.hour, timezone);
    const dayOfWeek = new Date(h.date).getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Sun=6
    grid[adjustedDay][localHour] += h.messages;
  }

  return grid;
}

// Server activity trend (hourly messages)
export async function getActivityTrend(guildId: string, days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const hourly = await prisma.guildHourlyStats.findMany({
    where: { guildId, date: { gte: since } },
    orderBy: [{ date: 'asc' }, { hour: 'asc' }],
  });
  return hourly.map(h => ({
    date: h.date,
    hour: h.hour,
    messages: h.messages,
  }));
}

// Voice leaderboard
export async function getTopVoice(guildId: string, days?: number, period?: string, limit: number = 15) {
  const { since } = resolvePeriod(days, period);
  const stats = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    where: { guildId, date: { gte: since }, voiceMs: { gt: 0 } },
    _sum: { voiceMs: true, messages: true },
    orderBy: { _sum: { voiceMs: 'desc' } },
    take: limit,
  });

  return stats.map(s => ({
    userId: s.userId,
    messages: s._sum.messages || 0,
    voiceMs: Number(s._sum.voiceMs || 0),
  }));
}

// Member growth data
export async function getMemberGrowth(guildId: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const stats = await prisma.guildDailyStats.findMany({
    where: { guildId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { date: true, joins: true, leaves: true },
  });
  return stats;
}

// Peak hours
export async function getPeakHours(guildId: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const timezone = await getGuildTimezone(guildId);

  const hourly = await prisma.guildHourlyStats.groupBy({
    by: ['hour'],
    where: { guildId, date: { gte: since } },
    _sum: { messages: true },
    orderBy: { _sum: { messages: 'desc' } },
  });

  // Convert UTC hours to guild timezone
  const converted = await Promise.all(hourly.map(async h => ({
    hour: await convertHourToTimezone(h.hour, timezone),
    messages: h._sum.messages || 0,
  })));

  // Re-sort by messages after conversion
  return converted.sort((a, b) => b.messages - a.messages);
}

// Recent voice sessions
export async function getRecentVoice(guildId: string, limit: number = 10) {
  return prisma.voiceSession.findMany({
    where: { guildId, endedAt: { not: null } },
    orderBy: { startedAt: 'desc' },
    take: limit,
    select: {
      userId: true,
      channelId: true,
      channelName: true,
      startedAt: true,
      endedAt: true,
      durationMs: true,
    },
  });
}

// Server rank (composite score)
export async function getServerRank(guildId: string, days?: number, period?: string, limit: number = 20) {
  const { since } = resolvePeriod(days, period);
  const stats = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    where: { guildId, date: { gte: since } },
    _sum: { messages: true, voiceMs: true },
    _count: { date: true },
    orderBy: { _sum: { messages: 'desc' } },
    take: 100,
  });

  return stats.map(s => ({
    userId: s.userId,
    messages: s._sum.messages || 0,
    voiceMs: Number(s._sum.voiceMs || 0),
    activeDays: typeof s._count === 'number' ? s._count : 0,
    score: (s._sum.messages || 0) + Math.floor(Number(s._sum.voiceMs || 0) / 3600000 * 10) + (typeof s._count === 'number' ? s._count : 0) * 100,
  })).sort((a, b) => b.score - a.score).slice(0, limit);
}

// Inactive members
export async function getInactiveMembers(guildId: string, days: number = 30, limit: number = 20) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const activeDuring = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    where: { guildId, date: { gte: since }, messages: { gt: 0 } },
  });
  const activeIds = new Set(activeDuring.map(u => u.userId));

  const allUsers = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    where: { guildId, messages: { gt: 0 } },
    _sum: { messages: true, voiceMs: true },
    _max: { date: true },
  });

  return allUsers
    .filter(u => !activeIds.has(u.userId))
    .map(u => ({
      userId: u.userId,
      messages: u._sum.messages || 0,
      voiceMs: Number(u._sum.voiceMs || 0),
      lastActivity: u._max.date ? new Date(u._max.date).toLocaleDateString() : 'Unknown',
    }))
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
    .slice(0, limit);
}

// Compare two periods
export async function getCompareData(guildId: string, days: number = 14) {
  const now = new Date();
  const currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - days);
  currentStart.setHours(0, 0, 0, 0);
  const previousStart = new Date();
  previousStart.setDate(previousStart.getDate() - days * 2);
  previousStart.setHours(0, 0, 0, 0);

  const [current, previous] = await Promise.all([
    prisma.guildDailyStats.aggregate({
      where: { guildId, date: { gte: currentStart, lt: now } },
      _sum: { totalMessages: true, totalVoiceMs: true, joins: true, leaves: true },
      _count: { totalMessages: true },
    }),
    prisma.guildDailyStats.aggregate({
      where: { guildId, date: { gte: previousStart, lt: currentStart } },
      _sum: { totalMessages: true, totalVoiceMs: true, joins: true, leaves: true },
      _count: { totalMessages: true },
    }),
  ]);

  const currentUsers = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    where: { guildId, date: { gte: currentStart, lt: now }, messages: { gt: 0 } },
  });
  const previousUsers = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    where: { guildId, date: { gte: previousStart, lt: currentStart }, messages: { gt: 0 } },
  });

  return {
    current: {
      messages: Number(current._sum.totalMessages || 0),
      voiceMs: Number(current._sum.totalVoiceMs || 0),
      activeUsers: currentUsers.length,
      joins: current._sum.joins || 0,
      leaves: current._sum.leaves || 0,
    },
    previous: {
      messages: Number(previous._sum.totalMessages || 0),
      voiceMs: Number(previous._sum.totalVoiceMs || 0),
      activeUsers: previousUsers.length,
      joins: previous._sum.joins || 0,
      leaves: previous._sum.leaves || 0,
    },
  };
}

// Growth data with daily totals
export async function getGrowthData(guildId: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const stats = await prisma.guildDailyStats.findMany({
    where: { guildId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { date: true, joins: true, leaves: true },
  });

  let runningTotal = 0;
  const totalJoinsAll = await prisma.guildDailyStats.aggregate({
    where: { guildId },
    _sum: { joins: true, leaves: true },
  });
  const netAll = (totalJoinsAll._sum.joins || 0) - (totalJoinsAll._sum.leaves || 0);
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  runningTotal = (guild?.memberCount || 100) - netAll;

  return stats.map(s => {
    runningTotal += s.joins - s.leaves;
    return {
      date: s.date.toISOString().split('T')[0],
      joins: s.joins,
      leaves: s.leaves,
      net: s.joins - s.leaves,
      total: runningTotal,
    };
  });
}

// Get daily messages for a period
export async function getDailyMessages(guildId: string, days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const stats = await prisma.guildDailyStats.findMany({
    where: { guildId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { totalMessages: true },
  });
  return stats.map(s => s.totalMessages);
}

// Hourly activity for a user (24h breakdown)
export async function getUserHourlyActivity(guildId: string, userId: string, days: number = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const hourly = await prisma.guildHourlyStats.findMany({
    where: { guildId, date: { gte: since } },
    orderBy: [{ date: 'asc' }, { hour: 'asc' }],
  });

  // Aggregate by hour across all days
  const byHour = Array(24).fill(0);
  for (const h of hourly) {
    byHour[h.hour] += h.messages;
  }
  return byHour;
}

// Weekday activity for a user (Mon-Sun breakdown)
export async function getUserWeekdayActivity(guildId: string, userId: string, days: number = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const daily = await prisma.userDailyStats.findMany({
    where: { guildId, userId, date: { gte: since } },
    orderBy: { date: 'asc' },
  });

  const byWeekday = Array(7).fill(0);
  for (const d of daily) {
    const dow = new Date(d.date).getDay();
    const adjusted = dow === 0 ? 6 : dow - 1; // Mon=0, Sun=6
    byWeekday[adjusted] += d.messages;
  }
  return byWeekday;
}

// Voice channel leaderboard (top channels by voice time)
export async function getTopVoiceChannels(guildId: string, days: number = 30, limit: number = 10) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const stats = await prisma.voiceSession.groupBy({
    by: ['channelId'],
    where: { guildId, startedAt: { gte: since } },
    _sum: { durationMs: true },
    _count: { id: true },
    orderBy: { _sum: { durationMs: 'desc' } },
    take: limit,
  });

  return stats.map(s => ({
    channelId: s.channelId,
    totalMs: Number(s._sum.durationMs || 0),
    sessions: s._count.id,
  }));
}

// Top voice users with channel names
export async function getTopVoiceWithChannels(guildId: string, days: number = 30, limit: number = 10) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const stats = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    where: { guildId, date: { gte: since }, voiceMs: { gt: 0 } },
    _sum: { voiceMs: true },
    orderBy: { _sum: { voiceMs: 'desc' } },
    take: limit,
  });

  return stats.map(s => ({
    userId: s.userId,
    voiceMs: Number(s._sum.voiceMs || 0),
  }));
}

// Daily user messages (for user stats chart)
export async function getUserDailyMessages(guildId: string, userId: string, days: number = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const daily = await prisma.userDailyStats.findMany({
    where: { guildId, userId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { date: true, messages: true },
  });

  return daily.map(d => ({
    date: d.date.toISOString().split('T')[0],
    messages: d.messages,
  }));
}
