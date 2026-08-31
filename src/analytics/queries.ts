import { prisma } from '../database/index.js';
import { subDays } from 'date-fns';

// Server overview stats
export async function getServerStats(guildId: string, days: number = 30) {
  const since = subDays(new Date(), days);

  const [totalMessages, totalVoiceMs, uniqueUsers, dailyStats, topChannels, topUsers] = await Promise.all([
    prisma.guildDailyStats.aggregate({
      where: { guildId, date: { gte: since } },
      _sum: { totalMessages: true },
    }),
    prisma.guildDailyStats.aggregate({
      where: { guildId, date: { gte: since } },
      _sum: { totalVoiceMs: true },
    }),
    prisma.userDailyStats.groupBy({
      by: ['userId'],
      where: { guildId, date: { gte: since }, messages: { gt: 0 } },
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
export async function getUserStats(guildId: string, userId: string, days: number = 30) {
  const since = subDays(new Date(), days);

  const [dailyStats, voiceSessions, topChannels, dailyBreakdown] = await Promise.all([
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
    prisma.channelStats.groupBy({
      by: ['channelId'],
      where: { guildId, date: { gte: since } },
      _sum: { messages: true },
      orderBy: { _sum: { messages: 'desc' } },
      take: 5,
    }),
    prisma.userDailyStats.findMany({
      where: { guildId, userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
  ]);

  return {
    totalMessages: dailyStats._sum.messages || 0,
    totalVoiceMs: Number(dailyStats._sum.voiceMs || 0),
    voiceSessions: voiceSessions._count.id,
    voiceTotalMs: Number(voiceSessions._sum.durationMs || 0),
    topChannels: topChannels.map(c => ({
      channelId: c.channelId,
      messages: c._sum.messages || 0,
    })),
    dailyBreakdown,
  };
}

// Top users leaderboard
export async function getTopUsers(guildId: string, days: number = 30, limit: number = 15) {
  const since = subDays(new Date(), days);
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

// Top channels leaderboard
export async function getTopChannels(guildId: string, days: number = 30, limit: number = 15) {
  const since = subDays(new Date(), days);
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

// Activity heatmap (24h x 7days)
export async function getActivityHeatmap(guildId: string, days: number = 7) {
  const since = subDays(new Date(), days);
  const hourly = await prisma.guildHourlyStats.findMany({
    where: { guildId, date: { gte: since } },
    orderBy: [{ date: 'asc' }, { hour: 'asc' }],
  });

  // Build 7x24 grid
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const h of hourly) {
    const dayOfWeek = new Date(h.date).getDay();
    grid[dayOfWeek][h.hour] += h.messages;
  }

  return grid;
}

// Server activity trend (hourly messages)
export async function getActivityTrend(guildId: string, days: number = 7) {
  const since = subDays(new Date(), days);
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
export async function getTopVoice(guildId: string, days: number = 30, limit: number = 15) {
  const since = subDays(new Date(), days);
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

// Member growth data
export async function getMemberGrowth(guildId: string, days: number = 30) {
  const since = subDays(new Date(), days);
  const stats = await prisma.guildDailyStats.findMany({
    where: { guildId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { date: true, joins: true, leaves: true },
  });
  return stats;
}

// Peak hours
export async function getPeakHours(guildId: string, days: number = 30) {
  const since = subDays(new Date(), days);
  const hourly = await prisma.guildHourlyStats.groupBy({
    by: ['hour'],
    where: { guildId, date: { gte: since } },
    _sum: { messages: true },
    orderBy: { _sum: { messages: 'desc' } },
  });
  return hourly.map(h => ({
    hour: h.hour,
    messages: h._sum.messages || 0,
  }));
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
      startedAt: true,
      endedAt: true,
      durationMs: true,
    },
  });
}

// Server rank (composite score)
export async function getServerRank(guildId: string, days: number = 30, limit: number = 20) {
  const since = subDays(new Date(), days);
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

// Inactive members (users with no messages in N days)
export async function getInactiveMembers(guildId: string, days: number = 30, limit: number = 20) {
  const since = subDays(new Date(), days);

  // Find all users who had activity before the period but not during
  const activeDuring = await prisma.userDailyStats.groupBy({
    by: ['userId'],
    where: { guildId, date: { gte: since }, messages: { gt: 0 } },
  });
  const activeIds = new Set(activeDuring.map(u => u.userId));

  // Get all users with any historical data
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
  const currentStart = subDays(now, days);
  const previousStart = subDays(currentStart, days);

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
  const stats = await prisma.guildDailyStats.findMany({
    where: { guildId, date: { gte: subDays(new Date(), days) } },
    orderBy: { date: 'asc' },
    select: { date: true, joins: true, leaves: true },
  });

  // Calculate running total
  let runningTotal = 0;
  // Get total members from earliest known point
  const earliest = await prisma.guildDailyStats.findFirst({
    where: { guildId },
    orderBy: { date: 'asc' },
  });

  // Estimate starting total
  const totalJoinsAll = await prisma.guildDailyStats.aggregate({
    where: { guildId },
    _sum: { joins: true, leaves: true },
  });
  const netAll = (totalJoinsAll._sum.joins || 0) - (totalJoinsAll._sum.leaves || 0);

  // Use guild member count as current and work backwards
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

// Get daily messages for a period (7 or 30 days)
export async function getDailyMessages(guildId: string, days: number = 7) {
  const stats = await prisma.guildDailyStats.findMany({
    where: { guildId, date: { gte: subDays(new Date(), days) } },
    orderBy: { date: 'asc' },
    select: { totalMessages: true },
  });
  return stats.map(s => s.totalMessages);
}

// Voice leaderboard
export async function getVoiceLeaderboard(guildId: string, days: number = 30, limit: number = 10) {
  const since = subDays(new Date(), days);
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

// Channel message counts for a period
export async function getChannelMessages(guildId: string, days: number = 30) {
  const since = subDays(new Date(), days);
  const stats = await prisma.channelStats.groupBy({
    by: ['channelId'],
    where: { guildId, date: { gte: since } },
    _sum: { messages: true },
    orderBy: { _sum: { messages: 'desc' } },
    take: 10,
  });
  return stats.map(s => ({
    channelId: s.channelId,
    messages: s._sum.messages || 0,
  }));
}

// Peak hours aggregation
export async function getPeakHoursAgg(guildId: string, days: number = 30) {
  const since = subDays(new Date(), days);
  const hourly = await prisma.guildHourlyStats.groupBy({
    by: ['hour'],
    where: { guildId, date: { gte: since } },
    _sum: { messages: true },
    orderBy: { _sum: { messages: 'desc' } },
  });
  return hourly.map(h => ({
    hour: h.hour,
    messages: h._sum.messages || 0,
  }));
}
