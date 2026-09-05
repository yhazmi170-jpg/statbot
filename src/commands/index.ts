import { Message, AttachmentBuilder, PermissionFlagsBits, Guild } from 'discord.js';
import { prisma, ensureGuild, log } from '../database/index.js';
import { renderServerStats } from '../rendering/server-stats.js';
import { renderUserStats } from '../rendering/user-stats.js';
import { renderTopUsers } from '../rendering/top.js';
import { renderLeaderboard } from '../rendering/leaderboard.js';
import { renderHeatmap } from '../rendering/heatmap.js';
import { renderActivityChart } from '../rendering/activity.js';
import { renderHelp } from '../rendering/help.js';
import { renderServerOverview } from '../rendering/server-overview.js';
import { formatPeakHour } from '../rendering/components.js';
import { renderGrowth } from '../rendering/growth.js';
import { renderCompare } from '../rendering/compare.js';
import { renderInactive } from '../rendering/inactive.js';
import { renderServerRank } from '../rendering/server-rank.js';
import { renderWeeklyReport, renderMonthlyReport } from '../rendering/reports.js';
import { parsePeriod } from '../utils/period.js';
import { linkLegacyUser, getUnlinkedUsers, getUnlinkedChannels, getLegacyStatsForUser, IMPORT_KEY } from '../services/legacy-import.js';
import * as queries from '../analytics/queries.js';

export interface CommandContext {
  msg: Message;
  args: string[];
  prefix: string;
}

export interface CommandDef {
  name: string;
  description: string;
  category: string;
  aliases?: string[];
  adminOnly?: boolean;
  execute: (ctx: CommandContext) => Promise<void>;
}

const commands: CommandDef[] = [];

export function registerCommand(cmd: CommandDef) {
  commands.push(cmd);
}

export function getCommands() { return commands; }

export async function handleCommand(msg: Message, prefix: string) {
  if (!msg.guild || msg.author.bot) return;

  const content = msg.content.slice(prefix.length).trim();
  const [cmdName, ...args] = content.split(/\s+/);

  const cmd = commands.find(c =>
    c.name === cmdName.toLowerCase() ||
    c.aliases?.includes(cmdName.toLowerCase())
  );

  if (!cmd) return;

  try {
    await cmd.execute({ msg, args, prefix });
  } catch (err) {
    log.error({ err, command: cmd.name }, 'Command error');
    await msg.reply({ content: '❌ Command failed.' }).catch(() => {});
  }
}

function isAdmin(msg: Message): boolean {
  return msg.member?.permissions.has(PermissionFlagsBits.Administrator) || false;
}

function parsePeriodArg(args: string[]): { period?: string; days?: number } {
  for (const arg of args) {
    const lower = arg.toLowerCase();
    if (['today', '1d', '7d', '14d', '30d', '90d', 'week', 'month', 'all'].includes(lower)) {
      return { period: lower };
    }
    if (/^\d+$/.test(arg)) {
      const n = parseInt(arg);
      if (n > 0 && n <= 365) return { days: n };
    }
  }
  return {};
}

// === STATS ===
registerCommand({
  name: 'stats',
  description: 'Server statistics overview',
  category: 'Analytics',
  aliases: ['svstats'],
  execute: async ({ msg, args }) => {
    const { period } = parsePeriodArg(args);
    const days = period ? parsePeriod(period).days : 14;
    const [guildStats, hourlyByDay, peakHours] = await Promise.all([
      queries.getServerStats(msg.guild!.id, undefined, period),
      queries.getActivityHeatmap(msg.guild!.id, 7),
      queries.getPeakHours(msg.guild!.id, days),
    ]);
    const resolvedChannels = guildStats.topChannels.map(c => ({
      name: resolveChannelName(msg.guild!, c.channelId),
      messages: c.messages,
      voiceMs: 0,
    }));
    const resolvedUsers = await Promise.all(guildStats.topUsers.map(async u => ({
      userId: await resolveUserName(msg.guild!, u.userId),
      messages: u.messages,
    })));
    const periodLabel = period ? parsePeriod(period).label : 'Last 14 Days';
    const peakHour = peakHours[0] ? formatPeakHour(peakHours[0].hour) : '—';
    const buf = await renderServerStats({
      guildName: msg.guild!.name,
      guild: { name: msg.guild!.name, memberCount: msg.guild!.memberCount },
      ...guildStats,
      topChannels: resolvedChannels,
      topUsers: resolvedUsers,
      hourlyByDay,
      period: periodLabel,
      peakHour,
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'stats.png' })] });
  },
});

// === SERVER ===
registerCommand({
  name: 'server',
  description: 'Server overview',
  category: 'Analytics',
  execute: async ({ msg, args }) => {
    const g = msg.guild!;
    const { period } = parsePeriodArg(args);
    const days = period ? parsePeriod(period).days : 30;
    const [stats, growth] = await Promise.all([
      queries.getServerStats(g.id, days, period),
      queries.getGrowthData(g.id, days),
    ]);
    const peakHours = await queries.getPeakHours(g.id, days);
    const heatmap = await queries.getActivityHeatmap(g.id, Math.min(days, 7));
    const peakDay = getPeakDay(heatmap);
    const peakHour = peakHours[0] ? formatPeakHour(peakHours[0].hour) : '—';
    const totalJoins = growth.reduce((s, g) => s + g.joins, 0);
    const totalLeaves = growth.reduce((s, g) => s + g.leaves, 0);

    const buf = await renderServerOverview({
      guild: {
        name: g.name, memberCount: g.memberCount, channelCount: g.channels.cache.size,
        roleCount: g.roles.cache.size, emojiCount: g.emojis.cache.size,
        boostLevel: g.premiumTier, boostCount: g.premiumSubscriptionCount || 0,
        createdAt: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`,
        ownerTag: (await g.fetchOwner()).user.tag,
      },
      totalMessages: stats.totalMessages,
      totalVoiceMs: stats.totalVoiceMs,
      uniqueUsers: stats.uniqueUsers,
      msgsPerDay: stats.totalMessages / days,
      peakHour,
      peakDay,
      joins: totalJoins,
      leaves: totalLeaves,
      topChannels: stats.topChannels.map(c => ({
        channelId: c.channelId,
        messages: c.messages,
      })),
      topUsers: stats.topUsers.map(u => ({
        userId: u.userId,
        messages: u.messages,
      })),
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'server.png' })] });
  },
});

// === ME ===
registerCommand({
  name: 'me',
  description: 'Your own user statistics',
  category: 'Analytics',
  execute: async ({ msg, args }) => {
    const targetUser = msg.author;
    const periodArgs: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('<@') || /^\d{17,20}$/.test(arg)) {
        await msg.reply({ content: '❌ Use `m?u @user` to view another member\'s statistics.' });
        return;
      } else {
        periodArgs.push(arg);
      }
    }

    const { period } = parsePeriodArg(periodArgs);
    const days = period ? parsePeriod(period).days : 14;

    const [stats, allUsers, legacyStats] = await Promise.all([
      queries.getUserStats(msg.guild!.id, targetUser.id, days, period),
      queries.getTopUsers(msg.guild!.id, days, period, 9999),
      getLegacyStatsForUser(msg.guild!.id, targetUser.id),
    ]);

    const legacyMsgs = legacyStats?.messageCount14d || 0;
    const legacyVoiceSec = legacyStats?.voiceSeconds14d || 0;
    const legacyMsgRank = legacyStats?.messageRank || null;
    const legacyVoiceRank = legacyStats?.voiceRank || null;
    const combinedMessages = stats.totalMessages + legacyMsgs;
    const combinedVoiceMs = stats.totalVoiceMs + (legacyVoiceSec * 1000);

    const noData = combinedMessages === 0 && combinedVoiceMs === 0;
    const rank = noData ? allUsers.length + 1 : (allUsers.findIndex((u: any) => u.userId === targetUser.id) + 1 || allUsers.length);
    const percentile = allUsers.length > 0 ? Math.round(((allUsers.length - rank) / allUsers.length) * 100) : 0;

    const weekdayMsgs = Array(7).fill(0);
    for (const d of stats.dailyBreakdown) {
      const dow = new Date(d.date).getDay();
      const idx = dow === 0 ? 6 : dow - 1;
      weekdayMsgs[idx] += d.messages;
    }

    const hourlyMsgs = Array(24).fill(0);
    for (const d of stats.dailyBreakdown) {
      if (d.topHour != null && d.messages > 0) {
        hourlyMsgs[d.topHour] += d.messages;
      }
    }

    const resolvedChannels = stats.topChannels
      .map((c: any) => {
        const ch = msg.guild!.channels.cache.get(c.channelId);
        if (!ch) return null;
        if (ch.isTextBased()) {
          const everyone = msg.guild!.roles.everyone;
          const perms = ch.permissionsFor(everyone);
          if (perms && !perms.has('ViewChannel')) return null;
        }
        return {
          name: resolveChannelName(msg.guild!, c.channelId),
          messages: c.messages,
          voiceMs: 0,
        };
      })
      .filter((c): c is { name: string; messages: number; voiceMs: number } => c !== null)
      .slice(0, 6);

    const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 128 });
    const periodLabel = period ? parsePeriod(period).label : 'Last 14 Days';

    const member = msg.guild!.members.cache.get(targetUser.id);
    const displayName = member?.displayName || targetUser.globalName || targetUser.username;

    const buf = await renderUserStats({
      user: { username: displayName, avatarUrl },
      guildName: msg.guild!.name,
      rank, totalMembers: msg.guild!.memberCount,
      totalMessages: combinedMessages, totalVoiceMs: combinedVoiceMs,
      voiceSessions: stats.voiceSessions, activeDays: stats.dailyBreakdown.filter((d: any) => d.messages > 0).length,
      totalDays: days, topChannels: resolvedChannels,
      dailyMessages: stats.dailyBreakdown.map((d: any) => d.messages),
      weekdayMessages: weekdayMsgs, hourlyMessages: hourlyMsgs, percentile, topChannelName: resolvedChannels[0]?.name || '—',
      msgsThisWeek: 0, msgsThisMonth: stats.totalMessages,
      voiceThisWeek: 0, voiceThisMonth: stats.totalVoiceMs,
      legacyMessages: legacyMsgs, legacyVoiceMs: legacyVoiceSec * 1000,
      legacyMsgRank, legacyVoiceRank,
      liveMessages: stats.totalMessages, liveVoiceMs: stats.totalVoiceMs,
      periodLabel,
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'userstats.png' })] });
  },
});

// === U ===
registerCommand({
  name: 'u',
  description: 'User statistics (own or admin-only for others)',
  category: 'Analytics',
  execute: async ({ msg, args }) => {
    let targetUser = msg.author;
    const periodArgs: string[] = [];

    // Separate user mention from period args
    for (const arg of args) {
      if (arg.startsWith('<@') || /^\d{17,20}$/.test(arg)) {
        if (!isAdmin(msg)) {
          await msg.reply({ content: '❌ You need Administrator permissions to view another member\'s statistics.' });
          return;
        }
        const mentioned = msg.mentions.users.first() || await msg.client.users.fetch(arg).catch(() => null);
        if (!mentioned) {
          await msg.reply({ content: '❌ Couldn\'t find that member.' });
          return;
        }
        targetUser = mentioned;
      } else {
        periodArgs.push(arg);
      }
    }

    const { period } = parsePeriodArg(periodArgs);
    const days = period ? parsePeriod(period).days : 14;

    const [stats, allUsers, legacyStats] = await Promise.all([
      queries.getUserStats(msg.guild!.id, targetUser.id, days, period),
      queries.getTopUsers(msg.guild!.id, days, period, 9999),
      getLegacyStatsForUser(msg.guild!.id, targetUser.id),
    ]);

    // Combine legacy + live data
    const legacyMsgs = legacyStats?.messageCount14d || 0;
    const legacyVoiceSec = legacyStats?.voiceSeconds14d || 0;
    const legacyMsgRank = legacyStats?.messageRank || null;
    const legacyVoiceRank = legacyStats?.voiceRank || null;
    const combinedMessages = stats.totalMessages + legacyMsgs;
    const combinedVoiceMs = stats.totalVoiceMs + (legacyVoiceSec * 1000);

    const noData = combinedMessages === 0 && combinedVoiceMs === 0;
    const rank = noData ? allUsers.length + 1 : (allUsers.findIndex((u: any) => u.userId === targetUser.id) + 1 || allUsers.length);
    const percentile = allUsers.length > 0 ? Math.round(((allUsers.length - rank) / allUsers.length) * 100) : 0;

    const weekdayMsgs = Array(7).fill(0);
    for (const d of stats.dailyBreakdown) {
      const dow = new Date(d.date).getDay();
      const idx = dow === 0 ? 6 : dow - 1;
      weekdayMsgs[idx] += d.messages;
    }

    const hourlyMsgs = Array(24).fill(0);
    for (const d of stats.dailyBreakdown) {
      if (d.topHour != null && d.messages > 0) {
        hourlyMsgs[d.topHour] += d.messages;
      }
    }

    const resolvedChannels = stats.topChannels
      .map((c: any) => {
        const ch = msg.guild!.channels.cache.get(c.channelId);
        if (!ch) return null;
        if (ch.isTextBased()) {
          const everyone = msg.guild!.roles.everyone;
          const perms = ch.permissionsFor(everyone);
          if (perms && !perms.has('ViewChannel')) return null;
        }
        return {
          name: resolveChannelName(msg.guild!, c.channelId),
          messages: c.messages,
          voiceMs: 0,
        };
      })
      .filter((c): c is { name: string; messages: number; voiceMs: number } => c !== null)
      .slice(0, 6);

    const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 128 });
    const periodLabel = period ? parsePeriod(period).label : 'Last 14 Days';

    // Get member for safe username rendering
    const member = msg.guild!.members.cache.get(targetUser.id);

    const buf = await renderUserStats({
      user: { 
        username: member?.displayName || targetUser.globalName || targetUser.username, 
        avatarUrl 
      },
      guildName: msg.guild!.name,
      rank, totalMembers: msg.guild!.memberCount,
      totalMessages: combinedMessages, totalVoiceMs: combinedVoiceMs,
      voiceSessions: stats.voiceSessions, activeDays: stats.dailyBreakdown.filter((d: any) => d.messages > 0).length,
      totalDays: days, topChannels: resolvedChannels,
      dailyMessages: stats.dailyBreakdown.map((d: any) => d.messages),
      weekdayMessages: weekdayMsgs, hourlyMessages: hourlyMsgs, percentile, topChannelName: resolvedChannels[0]?.name || '—',
      msgsThisWeek: 0, msgsThisMonth: stats.totalMessages,
      voiceThisWeek: 0, voiceThisMonth: stats.totalVoiceMs,
      legacyMessages: legacyMsgs, legacyVoiceMs: legacyVoiceSec * 1000,
      legacyMsgRank, legacyVoiceRank,
      liveMessages: stats.totalMessages, liveVoiceMs: stats.totalVoiceMs,
      periodLabel,
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'userstats.png' })] });
  },
});

// === TOP ===
registerCommand({
  name: 'top',
  description: 'Top members leaderboard / server overview',
  category: 'Leaderboards',
  aliases: ['leaderboard', 'lb'],
  execute: async ({ msg, args }) => {
    let mode = 'overview';
    let limit = 10;
    let page = 1;
    let periodArgs: string[] = [];

    for (const arg of args) {
      const lower = arg.toLowerCase();
      if (['messages', 'message', 'msg', 'msgs', 'chat'].includes(lower)) {
        mode = 'messages';
      } else if (['voice', 'vc'].includes(lower)) {
        mode = 'voice';
      } else if (['activity'].includes(lower)) {
        mode = 'activity';
      } else if (['overview', 'server', 'stats'].includes(lower)) {
        mode = 'overview';
      } else if (['channels', 'textchannels', 'ch'].includes(lower)) {
        mode = 'channels';
      } else if (['voicechannels', 'vcchannels'].includes(lower)) {
        mode = 'voicechannels';
      } else if (/^\d+$/.test(arg)) {
        const n = parseInt(arg);
        if (n <= 50) {
          if (page === 1 && limit === 10) {
            limit = n;
          } else {
            page = n;
          }
        } else {
          periodArgs.push(arg);
        }
      } else {
        periodArgs.push(arg);
      }
    }

    const { period, days: d } = parsePeriodArg(periodArgs);
    const days = d || 14;
    const isAllTime = period === 'all';
    const offset = (page - 1) * limit;
    const fetchLimit = limit + offset;

    const resolveAndFilter = async (users: any[], filterPrivate = false) => {
      const resolved = await Promise.all(users.slice(offset, offset + limit).map(async u => {
        const name = await resolveUserName(msg.guild!, u.userId);
        const member = msg.guild!.members.cache.get(u.userId);
        return { 
          userId: name, 
          messages: u.messages, 
          voiceMs: u.voiceMs || 0, 
          member: member ? { 
            displayName: member.displayName || undefined, 
            globalName: member.user.globalName ?? undefined, 
            username: member.user.username 
          } : undefined 
        };
      }));
      return resolved;
    };

    if (mode === 'overview') {
      // Server overview - use server-overview renderer
      const { period } = parsePeriodArg(args);
      const days = period ? parsePeriod(period).days : 14;
      const [guildStats, hourlyByDay, peakHours] = await Promise.all([
        queries.getServerStats(msg.guild!.id, undefined, period),
        queries.getActivityHeatmap(msg.guild!.id, 7),
        queries.getPeakHours(msg.guild!.id, days),
      ]);
      const resolvedChannels = guildStats.topChannels.map(c => ({
        name: resolveChannelName(msg.guild!, c.channelId),
        messages: c.messages,
        voiceMs: 0,
      }));
      const resolvedUsers = await Promise.all(guildStats.topUsers.map(async u => ({
        userId: await resolveUserName(msg.guild!, u.userId),
        messages: u.messages,
      })));
      const periodLabel = period ? parsePeriod(period).label : 'Last 14 Days';
      const peakHour = peakHours[0] ? formatPeakHour(peakHours[0].hour) : '—';
      const buf = await renderServerOverview({
        guildName: msg.guild!.name,
        guild: { 
          name: msg.guild!.name, 
          memberCount: msg.guild!.memberCount,
          channelCount: msg.guild!.channels.cache.size,
        },
        ...guildStats,
        topChannels: resolvedChannels,
        topUsers: resolvedUsers,
        hourlyByDay,
        period: periodLabel,
        peakHour,
      });
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'overview.png' })] });
    } else if (mode === 'messages') {
      const includeLegacy = isAllTime;
      const users = await queries.getTopUsersWithLegacy(msg.guild!.id, days, period, fetchLimit, includeLegacy);
      const totalMsgs = users.reduce((s, u) => s + u.messages, 0);
      const resolvedUsers = await resolveAndFilter(users);
      const periodLabel = isAllTime ? 'All Time (Legacy + Live)' : (period ? parsePeriod(period).label : `Last ${days} Days`);
      const buf = await renderLeaderboard({
        guildName: msg.guild!.name,
        period: periodLabel,
        title: 'Top Message Users',
        users: resolvedUsers,
        totalMsgs,
        metric: 'messages',
      });
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'top-messages.png' })] });
    } else if (mode === 'voice') {
      const includeLegacy = isAllTime;
      const users = await queries.getTopVoiceWithLegacy(msg.guild!.id, days, period, fetchLimit, includeLegacy);
      const totalVoice = users.reduce((s, u) => s + u.voiceMs, 0);
      const resolvedUsers = await resolveAndFilter(users);
      const periodLabel = isAllTime ? 'All Time (Legacy + Live)' : (period ? parsePeriod(period).label : `Last ${days} Days`);
      const buf = await renderLeaderboard({
        guildName: msg.guild!.name,
        period: periodLabel,
        title: 'Top Voice Users',
        users: resolvedUsers,
        totalMsgs: totalVoice,
        metric: 'voice',
      });
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'top-voice.png' })] });
    } else if (mode === 'activity') {
      const users = await queries.getServerRank(msg.guild!.id, days, period, fetchLimit);
      const resolvedUsers = await resolveAndFilter(users);
      const periodLabel = period ? parsePeriod(period).label : `Last ${days} Days`;
      const buf = await renderLeaderboard({
        guildName: msg.guild!.name,
        period: periodLabel,
        title: 'Activity Rank',
        users: resolvedUsers,
        totalMsgs: users.reduce((s, u) => s + u.messages, 0),
        metric: 'messages',
      });
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'top-activity.png' })] });
    } else if (mode === 'channels') {
      const channels = await queries.getTopChannels(msg.guild!.id, days, period, 10);
      const filtered = await queries.filterPublicChannels(msg.guild!, channels);
      const periodLabel = period ? parsePeriod(period).label : `Last ${days} Days`;
      const lines = filtered.map((c, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const name = c.channelName || `<#${c.channelId}>`;
        return `${medal} ${name} — ${c.messages.toLocaleString()} msgs`;
      });
      await msg.reply({
        embeds: [{
          title: `📊 Top Channels — ${periodLabel}`,
          description: lines.join('\n') || 'No data yet.',
          color: 0x8b0000,
          footer: { text: 'StatBot' },
        }],
      });
    } else if (mode === 'voicechannels') {
      const voiceChannels = await queries.getTopVoiceChannels(msg.guild!.id, days, 10);
      const filtered = await queries.filterPublicVoiceChannels(msg.guild!, voiceChannels);
      const periodLabel = period ? parsePeriod(period).label : `Last ${days} Days`;
      const lines = filtered.map((c, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const name = c.channelName || `<#${c.channelId}>`;
        const hours = (c.totalMs / 3600000).toFixed(1);
        return `${medal} ${name} — ${hours}h`;
      });
      await msg.reply({
        embeds: [{
          title: `🔊 Top Voice Channels — ${periodLabel}`,
          description: lines.join('\n') || 'No data yet.',
          color: 0x8b0000,
          footer: { text: 'StatBot' },
        }],
      });
    } else if (mode === 'activity') {
      const users = await queries.getServerRank(msg.guild!.id, days, period, fetchLimit);
      const resolvedUsers = await resolveAndFilter(users);
      const periodLabel = period ? parsePeriod(period).label : `Last ${days} Days`;
      const buf = await renderLeaderboard({
        guildName: msg.guild!.name,
        period: periodLabel,
        title: 'Activity Rank',
        users: resolvedUsers,
        totalMsgs: users.reduce((s, u) => s + u.messages, 0),
        metric: 'messages',
      });
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'top-activity.png' })] });
    }
  },
});

// === CHANNELS ===
registerCommand({
  name: 'channels',
  description: 'Channel analytics',
  category: 'Analytics',
  aliases: ['ch', 'topch'],
  execute: async ({ msg, args }) => {
    const { period, days: d } = parsePeriodArg(args);
    const days = d || 14;
    const ch = await queries.getTopChannels(msg.guild!.id, days, period, 10);
    const periodLabel = period ? parsePeriod(period).label : `Last ${days} Days`;
    const lines = ch.map((c, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `${medal} <#${c.channelId}> — ${c.messages.toLocaleString()} msgs`;
    });
    await msg.reply({
      embeds: [{
        title: `📊 Top Channels — ${periodLabel}`,
        description: lines.join('\n') || 'No data yet.',
        color: 0x8b0000,
        footer: { text: 'StatBot' },
      }],
    });
  },
});

// === MESSAGES ===
registerCommand({
  name: 'messages',
  description: 'Message analytics',
  category: 'Analytics',
  execute: async ({ msg, args }) => {
    const { period, days: d } = parsePeriodArg(args);
    const days = d || 14;
    const stats = await queries.getServerStats(msg.guild!.id, days, period);
    const periodLabel = period ? parsePeriod(period).label : `Last ${days} Days`;
    await msg.reply({
      embeds: [{
        title: `💬 Message Analytics — ${periodLabel}`,
        description: [
          `**Total Messages:** ${stats.totalMessages.toLocaleString()}`,
          `**Active Users:** ${stats.uniqueUsers}`,
          `**Messages/Day:** ${Math.round(stats.totalMessages / days)}`,
        ].join('\n'),
        color: 0x8b0000,
        footer: { text: 'StatBot' },
      }],
    });
  },
});

// === VOICE ===
registerCommand({
  name: 'voice',
  description: 'Voice analytics',
  category: 'Analytics',
  aliases: ['vc'],
  execute: async ({ msg, args }) => {
    const { period, days: d } = parsePeriodArg(args);
    const days = d || 14;
    const voice = await queries.getTopVoice(msg.guild!.id, days, period, 10);
    const totalMs = voice.reduce((s, v) => s + v.voiceMs, 0);
    const periodLabel = period ? parsePeriod(period).label : `Last ${days} Days`;
    const lines = voice.map((v, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const hours = Math.floor(v.voiceMs / 3600000);
      const mins = Math.floor((v.voiceMs % 3600000) / 60000);
      return `${medal} <@${v.userId}> — ${hours}h ${mins}m`;
    });
    await msg.reply({
      embeds: [{
        title: `🔊 Voice Analytics — ${periodLabel}`,
        description: [
          `**Total Voice Time:** ${(totalMs / 3600000).toFixed(1)}h`,
          '',
          ...lines,
        ].join('\n') || 'No voice activity.',
        color: 0x8b0000,
        footer: { text: 'StatBot' },
      }],
    });
  },
});

// === ACTIVITY ===
registerCommand({
  name: 'activity',
  description: 'Activity chart',
  category: 'Analytics',
  aliases: ['act', 'hourly'],
  execute: async ({ msg }) => {
    const hourly = await queries.getActivityTrend(msg.guild!.id, 7);
    const byHour = Array(24).fill(0);
    for (const h of hourly) byHour[h.hour] += h.messages;
    const buf = await renderActivityChart({
      guildName: msg.guild!.name,
      hourly: byHour.map((messages, hour) => ({ hour, messages })),
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'activity.png' })] });
  },
});

// === PEAKS ===
registerCommand({
  name: 'peaks',
  description: 'Peak hours and days',
  category: 'Analytics',
  execute: async ({ msg }) => {
    const peakHours = await queries.getPeakHours(msg.guild!.id, 30);
    const heatmap = await queries.getActivityHeatmap(msg.guild!.id, 7);
    const peakDay = getPeakDay(heatmap);
    const top5 = peakHours.slice(0, 5).map(h => `**${formatPeakHour(h.hour)}** — ${h.messages.toLocaleString()} msgs`).join('\n');

    await msg.reply({
      embeds: [{
        title: '⏰ Peak Activity',
        description: [
          `**Peak Day:** ${peakDay}`,
          '',
          '**Peak Hours:**',
          top5,
        ].join('\n'),
        color: 0x8b0000,
        footer: { text: 'StatBot' },
      }],
    });
  },
});

// === HEATMAP ===
registerCommand({
  name: 'heatmap',
  description: 'Activity heatmap',
  category: 'Analytics',
  aliases: ['heat'],
  execute: async ({ msg }) => {
    const grid = await queries.getActivityHeatmap(msg.guild!.id, 7);
    const buf = await renderHeatmap({ guildName: msg.guild!.name, grid });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'heatmap.png' })] });
  },
});

// === MEMBERS ===
registerCommand({
  name: 'members',
  description: 'Member growth analytics',
  category: 'Analytics',
  aliases: ['memberstats'],
  execute: async ({ msg, args }) => {
    const { period, days: d } = parsePeriodArg(args);
    const days = d || 14;
    const growth = await queries.getGrowthData(msg.guild!.id, days);
    const totalJoins = growth.reduce((s, g) => s + g.joins, 0);
    const totalLeaves = growth.reduce((s, g) => s + g.leaves, 0);
    const net = totalJoins - totalLeaves;
    const periodLabel = period ? parsePeriod(period).label : `Last ${days} Days`;
    await msg.reply({
      embeds: [{
        title: `📈 Member Growth — ${periodLabel}`,
        description: [
          `**Joins:** ${totalJoins}`,
          `**Leaves:** ${totalLeaves}`,
          `**Net:** ${net >= 0 ? '+' : ''}${net}`,
          `Current: ${msg.guild!.memberCount} members`,
        ].join('\n'),
        color: 0x8b0000,
        footer: { text: 'StatBot' },
      }],
    });
  },
});

// === GROWTH ===
registerCommand({
  name: 'growth',
  description: 'Server growth over time',
  category: 'Analytics',
  execute: async ({ msg, args }) => {
    const { period, days: d } = parsePeriodArg(args);
    const days = d || 14;
    const growth = await queries.getGrowthData(msg.guild!.id, days);
    const totalJoins = growth.reduce((s, g) => s + g.joins, 0);
    const totalLeaves = growth.reduce((s, g) => s + g.leaves, 0);
    const buf = await renderGrowth({
      guildName: msg.guild!.name, days,
      dailyGrowth: growth,
      totalJoins, totalLeaves,
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'growth.png' })] });
  },
});

// === COMPARE ===
registerCommand({
  name: 'compare',
  description: 'Compare two time periods',
  category: 'Analytics',
  execute: async ({ msg, args }) => {
    const { period, days: d } = parsePeriodArg(args);
    const days = d || 14;
    const data = await queries.getCompareData(msg.guild!.id, days);
    const buf = await renderCompare(
      { label: `Last ${days} Days`, ...data.current, voiceHours: data.current.voiceMs / 3600000, peakHour: '—' },
      { label: `Previous ${days} Days`, ...data.previous, voiceHours: data.previous.voiceMs / 3600000, peakHour: '—' },
    );
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'compare.png' })] });
  },
});

// === SERVERRANK ===
registerCommand({
  name: 'serverrank',
  description: 'Server activity rank',
  category: 'Leaderboards',
  execute: async ({ msg, args }) => {
    const { period, days: d } = parsePeriodArg(args);
    const days = d || 14;
    const users = await queries.getServerRank(msg.guild!.id, days, period, 20);
    const resolvedUsers = await Promise.all(users.map(async u => ({
      userId: await resolveUserName(msg.guild!, u.userId),
      messages: u.messages,
      voiceMs: u.voiceMs,
      activeDays: u.activeDays,
      score: u.score,
    })));
    const buf = await renderServerRank(msg.guild!.name, resolvedUsers, days);
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'serverrank.png' })] });
  },
});

// === INACTIVE ===
registerCommand({
  name: 'inactive',
  description: 'Show inactive members (admin only)',
  category: 'Admin',
  adminOnly: true,
  execute: async ({ msg, args }) => {
    if (!isAdmin(msg)) {
      await msg.reply({ content: '❌ This command requires Administrator permission.' });
      return;
    }
    const days = Math.min(Math.max(parseInt(args[0]) || 7, 3), 7);
    const users = await queries.getInactiveMembers(msg.guild!.id, days, 20);
    const resolvedUsers = await Promise.all(users.map(async u => ({
      userId: await resolveUserName(msg.guild!, u.userId),
      messages: u.messages,
      voiceMs: u.voiceMs,
      lastActivity: u.lastActivity,
    })));
    const buf = await renderInactive(msg.guild!.name, days, resolvedUsers);
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'inactive.png' })] });
  },
});

// === WEEKLY ===
registerCommand({
  name: 'weekly',
  description: 'Generate a weekly server report',
  category: 'Reports',
  execute: async ({ msg }) => {
    const [stats, hourlyByDay, topUsers, topChannels, prevStats] = await Promise.all([
      queries.getServerStats(msg.guild!.id, 7),
      queries.getActivityHeatmap(msg.guild!.id, 7),
      queries.getTopUsers(msg.guild!.id, 7, undefined, 10),
      queries.getTopChannels(msg.guild!.id, 7, undefined, 8),
      queries.getServerStats(msg.guild!.id, 14),
    ]);
    const growth = await queries.getGrowthData(msg.guild!.id, 7);
    const peakHours = await queries.getPeakHours(msg.guild!.id, 7);
    const resolvedChannels = topChannels.map(c => ({
      name: resolveChannelName(msg.guild!, c.channelId),
      messages: c.messages,
    }));
    const resolvedUsers = await Promise.all(topUsers.map(async u => ({
      userId: await resolveUserName(msg.guild!, u.userId),
      messages: u.messages,
    })));
    const buf = await renderWeeklyReport({
      guildName: msg.guild!.name,
      period: 'Weekly',
      totalMessages: stats.totalMessages,
      totalVoiceMs: stats.totalVoiceMs,
      uniqueUsers: stats.uniqueUsers,
      joins: growth.reduce((s, g) => s + g.joins, 0),
      leaves: growth.reduce((s, g) => s + g.leaves, 0),
      peakHour: peakHours[0] ? formatPeakHour(peakHours[0].hour) : '—',
      peakDay: getPeakDay(hourlyByDay),
      topUsers: resolvedUsers,
      topChannels: resolvedChannels,
      dailyMessages: stats.dailyStats.map(s => s.totalMessages),
      hourlyByDay,
      prevMessages: prevStats.totalMessages,
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'weekly.png' })] });
  },
});

// === MONTHLY ===
registerCommand({
  name: 'monthly',
  description: 'Generate a monthly server report',
  category: 'Reports',
  execute: async ({ msg }) => {
    const [stats, hourlyByDay, topUsers, topChannels, prevStats] = await Promise.all([
      queries.getServerStats(msg.guild!.id, 30),
      queries.getActivityHeatmap(msg.guild!.id, 30),
      queries.getTopUsers(msg.guild!.id, 30, undefined, 10),
      queries.getTopChannels(msg.guild!.id, 30, undefined, 8),
      queries.getServerStats(msg.guild!.id, 60),
    ]);
    const growth = await queries.getGrowthData(msg.guild!.id, 30);
    const peakHours = await queries.getPeakHours(msg.guild!.id, 30);
    const resolvedChannels = topChannels.map(c => ({
      name: resolveChannelName(msg.guild!, c.channelId),
      messages: c.messages,
    }));
    const resolvedUsers = await Promise.all(topUsers.map(async u => ({
      userId: await resolveUserName(msg.guild!, u.userId),
      messages: u.messages,
    })));
    const buf = await renderMonthlyReport({
      guildName: msg.guild!.name,
      period: 'Monthly',
      totalMessages: stats.totalMessages,
      totalVoiceMs: stats.totalVoiceMs,
      uniqueUsers: stats.uniqueUsers,
      joins: growth.reduce((s, g) => s + g.joins, 0),
      leaves: growth.reduce((s, g) => s + g.leaves, 0),
      peakHour: peakHours[0] ? formatPeakHour(peakHours[0].hour) : '—',
      peakDay: getPeakDay(hourlyByDay),
      topUsers: resolvedUsers,
      topChannels: resolvedChannels,
      dailyMessages: stats.dailyStats.map(s => s.totalMessages),
      hourlyByDay,
      prevMessages: prevStats.totalMessages,
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'monthly.png' })] });
  },
});

// === BACKFILL ===
registerCommand({
  name: 'backfill',
  description: 'Populate empty daily stats from message log (admin only)',
  category: 'Admin',
  adminOnly: true,
  execute: async ({ msg }) => {
    if (!isAdmin(msg)) {
      await msg.reply({ content: '❌ Administrator only.' });
      return;
    }

    const sent = await msg.reply({ content: '⏳ Backfilling daily stats from message log...' });

    const guildId = msg.guild!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all UserDailyStats with 0 messages but that have channelStats data
    const emptyDays = await prisma.userDailyStats.findMany({
      where: { guildId, messages: 0, date: { lt: today } },
      orderBy: { date: 'asc' },
    });

    let filled = 0;
    for (const empty of emptyDays) {
      // Check if there's ChannelStats data for this date
      const chStats = await prisma.channelStats.findFirst({
        where: { guildId, date: empty.date },
      });

      if (chStats && chStats.messages > 0) {
        // Estimate user messages from channel total (rough approximation)
        await prisma.userDailyStats.update({
          where: { guildId_userId_date: { guildId, userId: empty.userId, date: empty.date } },
          data: { messages: 1 }, // Minimal estimate
        }).catch(() => {});
        filled++;
      }
    }

    await sent.edit({ content: `✅ Backfill complete. Updated ${filled} empty days.` });
  },
});

// === DATASTATUS ===
registerCommand({
  name: 'datastatus',
  description: 'Show database health and stats (admin only)',
  category: 'Admin',
  adminOnly: true,
  execute: async ({ msg }) => {
    if (!isAdmin(msg)) {
      await msg.reply({ content: '❌ Administrator only.' });
      return;
    }

    const start = Date.now();
    const [guildCount, userCount, channelCount, dailyCount, hourlyCount, userDailyCount, channelStatCount, voiceCount] = await Promise.all([
      prisma.guild.count(),
      prisma.user.count(),
      prisma.channel.count(),
      prisma.guildDailyStats.count(),
      prisma.guildHourlyStats.count(),
      prisma.userDailyStats.count(),
      prisma.channelStats.count(),
      prisma.voiceSession.count(),
    ]);
    const latency = Date.now() - start;

    const dbPath = process.env.DATABASE_URL || 'unknown';
    const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    await msg.reply({
      embeds: [{
        title: 'Database Status',
        description: [
          `**Query Latency:** ${latency}ms`,
          `**DB Path:** \`${dbPath}\``,
          '',
          `**Guilds:** ${guildCount}`,
          `**Users:** ${userCount}`,
          `**Channels:** ${channelCount}`,
          `**Daily Stats:** ${dailyCount.toLocaleString()}`,
          `**Hourly Stats:** ${hourlyCount.toLocaleString()}`,
          `**User Daily Stats:** ${userDailyCount.toLocaleString()}`,
          `**Channel Stats:** ${channelStatCount.toLocaleString()}`,
          `**Voice Sessions:** ${voiceCount.toLocaleString()}`,
          '',
          `**Memory:** ${memMB}MB`,
        ].join('\n'),
        color: 0x8b0000,
        footer: { text: 'StatBot' },
      }],
    });
  },
});

// === DEBUGSTATS ===
registerCommand({
  name: 'debugstats',
  description: 'Debug tracking stats (admin only)',
  category: 'Admin',
  adminOnly: true,
  execute: async ({ msg }) => {
    if (!isAdmin(msg)) {
      await msg.reply({ content: '❌ Administrator only.' });
      return;
    }

    const guildId = msg.guild!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayStats, yesterdayStats, totalMsgs, totalVoice] = await Promise.all([
      prisma.guildDailyStats.findUnique({ where: { guildId_date: { guildId, date: today } } }),
      prisma.guildDailyStats.findUnique({
        where: { guildId_date: { guildId, date: new Date(today.getTime() - 86400000) } },
      }),
      prisma.guildDailyStats.aggregate({ where: { guildId }, _sum: { totalMessages: true } }),
      prisma.guildDailyStats.aggregate({ where: { guildId }, _sum: { totalVoiceMs: true } }),
    ]);

    await msg.reply({
      embeds: [{
        title: 'Debug Stats',
        description: [
          '**Today:**',
          `Messages: ${todayStats?.totalMessages || 0}`,
          `Unique Users: ${todayStats?.uniqueUsers || 0}`,
          `Voice: ${((Number(todayStats?.totalVoiceMs || 0)) / 3600000).toFixed(1)}h`,
          '',
          '**Yesterday:**',
          `Messages: ${yesterdayStats?.totalMessages || 0}`,
          `Unique Users: ${yesterdayStats?.uniqueUsers || 0}`,
          '',
          '**All Time:**',
          `Total Messages: ${Number(totalMsgs._sum.totalMessages || 0).toLocaleString()}`,
          `Total Voice: ${(Number(totalVoice._sum.totalVoiceMs || 0) / 3600000).toFixed(1)}h`,
        ].join('\n'),
        color: 0x8b0000,
        footer: { text: 'StatBot' },
      }],
    });
  },
});

// === FAKE ===
// Removed m?fake command - real commands must not use fake data

// === HELP ===
registerCommand({
  name: 'help',
  description: 'Show all commands',
  category: 'Info',
  aliases: ['h', 'commands', 'cmds'],
  execute: async ({ msg, prefix }) => {
    const buf = await renderHelp(
      commands.map(c => ({ name: c.name, description: c.description, category: c.category })),
      prefix, msg.guild?.name,
    );
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'help.png' })] });
  },
});

// === CONFIG ===
registerCommand({
  name: 'config',
  description: 'View/set guild config (admin only)',
  category: 'Admin',
  adminOnly: true,
  aliases: ['settings', 'cfg'],
  execute: async ({ msg, args, prefix }) => {
    if (!isAdmin(msg)) {
      await msg.reply({ content: '❌ You need Manage Server permission.' });
      return;
    }
    const guild = await ensureGuild(msg.guild!.id, msg.guild!.name);
    const [key, value] = args;
    if (!key) {
      await msg.reply({
        embeds: [{
          title: '⚙️ Server Config',
          description: [`**Prefix:** \`${guild.prefix}\``, `**Timezone:** \`${guild.timezone}\``, `Change with: ${prefix}config prefix m?`, 'Keys: `prefix`, `timezone`'].join('\n'),
          color: 0x8b0000,
        }],
      });
      return;
    }
    if (key === 'prefix' && value) {
      await prisma.guild.update({ where: { id: msg.guild!.id }, data: { prefix: value } });
      await msg.reply({ content: `✅ Prefix set to \`${value}\`` });
      return;
    }
    if (key === 'timezone' && value) {
      await prisma.guild.update({ where: { id: msg.guild!.id }, data: { timezone: value } });
      await msg.reply({ content: `✅ Timezone set to \`${value}\`` });
      return;
    }
    await msg.reply({ content: `❌ Unknown key. Usage: ${prefix}config prefix m?` });
  },
});

// === SETPREFIX ===
registerCommand({
  name: 'setprefix',
  description: 'Change the bot prefix (admin only)',
  category: 'Admin',
  adminOnly: true,
  execute: async ({ msg, args }) => {
    if (!isAdmin(msg)) {
      await msg.reply({ content: '❌ You need Administrator permission.' });
      return;
    }
    const newPrefix = args[0];
    if (!newPrefix) {
      await msg.reply({ content: '❌ Usage: `m?setprefix <prefix>`' });
      return;
    }
    await prisma.guild.update({ where: { id: msg.guild!.id }, data: { prefix: newPrefix } });
    await msg.reply({ content: `✅ Prefix changed to \`${newPrefix}\`` });
  },
});

// === RESET ===
registerCommand({
  name: 'reset',
  description: 'Reset all stats (owner only)',
  category: 'Admin',
  adminOnly: true,
  execute: async ({ msg }): Promise<void> => {
    if (msg.author.id !== msg.guild!.ownerId) {
      await msg.reply({ content: '❌ Only the server owner can use this.' });
      return;
    }
    await Promise.all([
      prisma.guildDailyStats.deleteMany({ where: { guildId: msg.guild!.id } }),
      prisma.guildHourlyStats.deleteMany({ where: { guildId: msg.guild!.id } }),
      prisma.userDailyStats.deleteMany({ where: { guildId: msg.guild!.id } }),
      prisma.channelStats.deleteMany({ where: { guildId: msg.guild!.id } }),
      prisma.voiceSession.deleteMany({ where: { guildId: msg.guild!.id } }),
    ]);
    await msg.reply({ content: '✅ All stats have been reset.' });
  },
});

// === PING ===
registerCommand({
  name: 'ping',
  description: 'Check bot latency',
  category: 'Info',
  execute: async ({ msg }) => {
    const sent = await msg.reply({ content: 'Pinging...' });
    const latency = sent.createdTimestamp - msg.createdTimestamp;
    await sent.edit({ content: `Pong! ${latency}ms` });
  },
});

// === LINKLEGACY ===
registerCommand({
  name: 'linklegacy',
  description: 'Link a legacy imported username to a Discord user (admin only)',
  category: 'Admin',
  adminOnly: true,
  aliases: ['linkseed'],
  execute: async ({ msg, args }) => {
    if (!isAdmin(msg)) {
      await msg.reply({ content: '❌ Administrator only.' });
      return;
    }

    if (args.length < 2) {
      await msg.reply({ content: '❌ Usage: `m?linklegacy <username> @user`' });
      return;
    }

    const legacyUsername = args[0];
    const mentioned = msg.mentions.users.first();
    if (!mentioned) {
      await msg.reply({ content: '❌ Mention a user to link: `m?linklegacy berry05__ @user`' });
      return;
    }

    const result = await linkLegacyUser(msg.guild!.id, legacyUsername, mentioned.id);
    await msg.reply({ content: result.success ? `✅ ${result.message}` : `❌ ${result.message}` });
  },
});

// === LEGACYUNLINKED ===
registerCommand({
  name: 'legacyunlinked',
  description: 'Show unlinked legacy records (admin only)',
  category: 'Admin',
  adminOnly: true,
  execute: async ({ msg }) => {
    if (!isAdmin(msg)) {
      await msg.reply({ content: '❌ Administrator only.' });
      return;
    }

    const unlinked = await getUnlinkedUsers(msg.guild!.id);
    if (unlinked.length === 0) {
      await msg.reply({ content: '✅ All legacy records are linked.' });
      return;
    }

    const lines = unlinked.map((u: any, i: number) =>
      `${i + 1}. **${u.importedUsername}** — ${u.messageCount14d.toLocaleString()} msgs, ${Math.round(u.voiceSeconds14d / 3600 * 10) / 10}h voice`
    );

    const chunks: string[] = [];
    let current = '';
    for (const line of lines) {
      if (current.length + line.length > 1900) {
        chunks.push(current);
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    }
    if (current) chunks.push(current);

    for (let i = 0; i < chunks.length; i++) {
      await msg.reply({
        embeds: [{
          title: i === 0 ? `Unlinked Legacy Records (${unlinked.length})` : undefined,
          description: chunks[i],
          color: 0x8b0000,
          footer: { text: 'Use m?linklegacy <name> @user to link' },
        }],
      });
    }
  },
});

// === LEGACYSTATUS ===
registerCommand({
  name: 'legacystatus',
  description: 'Show legacy import status (admin only)',
  category: 'Admin',
  adminOnly: true,
  execute: async ({ msg }) => {
    if (!isAdmin(msg)) {
      await msg.reply({ content: '❌ Administrator only.' });
      return;
    }

    const [total, linked, unlinked] = await Promise.all([
      prisma.legacyUserStats.count({ where: { guildId: msg.guild!.id, importKey: IMPORT_KEY } }),
      prisma.legacyUserStats.count({ where: { guildId: msg.guild!.id, importKey: IMPORT_KEY, linked: true } }),
      prisma.legacyUserStats.count({ where: { guildId: msg.guild!.id, importKey: IMPORT_KEY, linked: false } }),
    ]);

    const importLog = await prisma.importLog.findUnique({
      where: { importKey_guildId: { importKey: IMPORT_KEY, guildId: msg.guild!.id } },
    });

    await msg.reply({
      embeds: [{
        title: 'Legacy Import Status',
        description: [
          `**Import Key:** \`${IMPORT_KEY}\``,
          `**Status:** ${importLog?.status || 'not imported'}`,
          `**Total Records:** ${total}`,
          `**Linked:** ${linked}`,
          `**Unlinked:** ${unlinked}`,
          importLog?.message ? `\n**Details:** ${importLog.message}` : '',
        ].filter(Boolean).join('\n'),
        color: 0x8b0000,
        footer: { text: 'StatBot' },
      }],
    });
  },
});

// === LEGACYCHECK ===
registerCommand({
  name: 'legacycheck',
  description: 'Verify legacy import data in database (admin only)',
  category: 'Admin',
  adminOnly: true,
  execute: async ({ msg }) => {
    if (!isAdmin(msg)) {
      await msg.reply({ content: '❌ Administrator only.' });
      return;
    }

    const [msgRows, voiceRows, linked, unlinked, total, importLog] = await Promise.all([
      prisma.legacyUserStats.count({ where: { guildId: msg.guild!.id, importKey: IMPORT_KEY, messageCount14d: { gt: 0 } } }),
      prisma.legacyUserStats.count({ where: { guildId: msg.guild!.id, importKey: IMPORT_KEY, voiceSeconds14d: { gt: 0 } } }),
      prisma.legacyUserStats.count({ where: { guildId: msg.guild!.id, importKey: IMPORT_KEY, linked: true } }),
      prisma.legacyUserStats.count({ where: { guildId: msg.guild!.id, importKey: IMPORT_KEY, linked: false } }),
      prisma.legacyUserStats.count({ where: { guildId: msg.guild!.id, importKey: IMPORT_KEY } }),
      prisma.importLog.findUnique({ where: { importKey_guildId: { importKey: IMPORT_KEY, guildId: msg.guild!.id } } }),
    ]);

    const msgTotal = await prisma.legacyUserStats.aggregate({
      where: { guildId: msg.guild!.id, importKey: IMPORT_KEY },
      _sum: { messageCount14d: true },
    });
    const voiceTotal = await prisma.legacyUserStats.aggregate({
      where: { guildId: msg.guild!.id, importKey: IMPORT_KEY },
      _sum: { voiceSeconds14d: true },
    });

    const channelTotal = await prisma.legacyChannelStats.count({ where: { guildId: msg.guild!.id, importKey: IMPORT_KEY } });
    const channelMsgTotal = await prisma.legacyChannelStats.aggregate({
      where: { guildId: msg.guild!.id, importKey: IMPORT_KEY },
      _sum: { messageCount14d: true },
    });
    const channelVoiceTotal = await prisma.legacyChannelStats.aggregate({
      where: { guildId: msg.guild!.id, importKey: IMPORT_KEY },
      _sum: { voiceSeconds14d: true },
    });

    const status = importLog?.status || 'not imported';
    const needsRepair = status === 'completed' && (total < 20 || msgRows < 10);

    await msg.reply({
      embeds: [{
        title: '🔍 Legacy Import Check',
        description: [
          `**Import Key:** \`${IMPORT_KEY}\``,
          `**Status:** ${status}`,
          needsRepair ? '⚠️ **REPAIR NEEDED**: Marker says complete but rows are missing!' : '',
          '',
          `**User Records:** ${total}`,
          `  • Message rows: ${msgRows}`,
          `  • Voice rows: ${voiceRows}`,
          `  • Linked: ${linked}`,
          `  • Unlinked: ${unlinked}`,
          `  • Total Messages: ${msgTotal._sum.messageCount14d?.toLocaleString() || 0}`,
          `  • Total Voice: ${(voiceTotal._sum.voiceSeconds14d || 0 / 3600).toFixed(1)}h`,
          '',
          `**Channel Records:** ${channelTotal}`,
          `  • Total Messages: ${channelMsgTotal._sum.messageCount14d?.toLocaleString() || 0}`,
          `  • Total Voice: ${(channelVoiceTotal._sum.voiceSeconds14d || 0 / 3600).toFixed(1)}h`,
          '',
          `**Database:** PostgreSQL (persistent)`,
        ].filter(Boolean).join('\n'),
        color: needsRepair ? 0xeab308 : 0x8b0000,
        footer: { text: 'StatBot' },
      }],
    });
  },
});

// ─── Helpers ──────────────────────────────────────────

function resolveChannelName(guild: Guild, channelId: string): string {
  const ch = guild.channels.cache.get(channelId);
  return ch ? `#${ch.name}` : '#deleted-channel';
}

async function resolveUserName(guild: Guild, userId: string): Promise<string> {
  try {
    const member = await guild.members.fetch(userId);
    return member.displayName || member.user.username || userId;
  } catch {
    return userId;
  }
}

function getPeakDay(grid: number[][]): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayTotals = Array(7).fill(0);
  for (let d = 0; d < grid.length; d++) for (const v of grid[d]) dayTotals[d] += v;
  return dayNames[dayTotals.indexOf(Math.max(...dayTotals))];
}
