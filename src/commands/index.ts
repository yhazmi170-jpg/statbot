import { Message, AttachmentBuilder, PermissionFlagsBits, Guild } from 'discord.js';
import { prisma, ensureGuild, log } from '../database/index.js';
import { renderServerStats } from '../rendering/server-stats.js';
import { renderUserStats } from '../rendering/user-stats.js';
import { renderTopUsers } from '../rendering/top.js';
import { renderHeatmap } from '../rendering/heatmap.js';
import { renderActivityChart } from '../rendering/activity.js';
import { renderHelp } from '../rendering/help.js';
import { renderServerOverview } from '../rendering/server-overview.js';
import { renderGrowth } from '../rendering/growth.js';
import { renderCompare } from '../rendering/compare.js';
import { renderInactive } from '../rendering/inactive.js';
import { renderServerRank } from '../rendering/server-rank.js';
import { renderWeeklyReport, renderMonthlyReport } from '../rendering/reports.js';
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

// === STATS ===
registerCommand({
  name: 'stats',
  description: 'Server statistics overview',
  category: 'Analytics',
  aliases: ['svstats', 'top'],
  execute: async ({ msg }) => {
    const [guildStats, hourlyByDay] = await Promise.all([
      queries.getServerStats(msg.guild!.id),
      queries.getActivityHeatmap(msg.guild!.id, 7),
    ]);
    const resolvedChannels = guildStats.topChannels.map(c => ({
      name: resolveChannelName(msg.guild!, c.channelId),
      messages: c.messages,
      voiceMs: 0,
    }));
    const buf = await renderServerStats({
      guildName: msg.guild!.name,
      guild: { name: msg.guild!.name, memberCount: msg.guild!.memberCount },
      ...guildStats,
      topChannels: resolvedChannels,
      hourlyByDay,
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'stats.png' })] });
  },
});

// === SERVER ===
registerCommand({
  name: 'server',
  description: 'Server overview',
  category: 'Analytics',
  execute: async ({ msg }) => {
    const g = msg.guild!;
    const stats = await queries.getServerStats(g.id, 30);
    const growth = await queries.getGrowthData(g.id, 30);
    const peakHours = await queries.getPeakHoursAgg(g.id, 30);
    const peakDay = getPeakDay(await queries.getActivityHeatmap(g.id, 7));
    const peakHour = peakHours[0] ? `${String(peakHours[0].hour).padStart(2, '0')}:00` : '—';

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
      msgsPerDay: stats.totalMessages / 30,
      peakHour,
      peakDay,
      joins: totalJoins,
      leaves: totalLeaves,
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'server.png' })] });
  },
});

// === U (replaces ME) ===
registerCommand({
  name: 'u',
  description: 'User statistics (own or admin-only for others)',
  category: 'Analytics',
  execute: async ({ msg, args }) => {
    let targetUser = msg.author;

    if (args[0]) {
      if (!isAdmin(msg)) {
        await msg.reply({ content: '❌ You need Administrator permissions to view another member\'s statistics.' });
        return;
      }
      const mentioned = msg.mentions.users.first() || await msg.client.users.fetch(args[0]).catch(() => null);
      if (!mentioned) {
        await msg.reply({ content: '❌ Couldn\'t find that member.' });
        return;
      }
      targetUser = mentioned;
    }

    const stats = await queries.getUserStats(msg.guild!.id, targetUser.id);
    if (stats.totalMessages === 0 && stats.totalVoiceMs === 0) {
      await msg.reply({ content: '❌ Not enough activity data has been collected yet.' });
      return;
    }

    const allUsers = await queries.getTopUsers(msg.guild!.id, 30, 9999);
    const rank = allUsers.findIndex(u => u.userId === targetUser.id) + 1 || allUsers.length;
    const hourly = await queries.getPeakHours(msg.guild!.id, 30);
    const percentile = allUsers.length > 0 ? Math.round(((allUsers.length - rank) / allUsers.length) * 100) : 0;

    const weekdayMsgs = Array(7).fill(0);
    for (const d of stats.dailyBreakdown) {
      const dow = new Date(d.date).getDay();
      const idx = dow === 0 ? 6 : dow - 1;
      weekdayMsgs[idx] += d.messages;
    }
    const hourlyMsgs = Array(24).fill(0);
    for (const h of hourly) hourlyMsgs[h.hour] = h.messages;

    const resolvedChannels = stats.topChannels.map(c => ({
      name: resolveChannelName(msg.guild!, c.channelId),
      messages: c.messages,
      voiceMs: 0,
    }));

    const buf = await renderUserStats({
      user: { username: targetUser.username, avatarUrl: targetUser.displayAvatarURL() },
      rank, totalMembers: msg.guild!.memberCount,
      totalMessages: stats.totalMessages, totalVoiceMs: stats.totalVoiceMs,
      voiceSessions: stats.voiceSessions, activeDays: stats.dailyBreakdown.filter(d => d.messages > 0).length,
      totalDays: 30, topChannels: resolvedChannels,
      dailyMessages: stats.dailyBreakdown.map(d => d.messages),
      weekdayMessages: weekdayMsgs, hourlyMessages: hourlyMsgs, percentile,
      msgsThisWeek: 0, msgsThisMonth: stats.totalMessages,
      voiceThisWeek: 0, voiceThisMonth: stats.totalVoiceMs,
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'userstats.png' })] });
  },
});

// === TOP ===
registerCommand({
  name: 'top',
  description: 'Top members leaderboard',
  category: 'Leaderboards',
  aliases: ['leaderboard', 'lb'],
  execute: async ({ msg, args }) => {
    let mode = 'messages';
    let days = 30;
    let limit = 10;

    for (const arg of args) {
      if (['messages', 'voice', 'activity'].includes(arg.toLowerCase())) mode = arg.toLowerCase();
      else if (/^\d+$/.test(arg)) {
        const n = parseInt(arg);
        if (n <= 50) limit = n;
        else days = n;
      }
    }

    if (mode === 'voice') {
      const voice = await queries.getTopVoice(msg.guild!.id, days, limit);
      const totalVoice = voice.reduce((s, v) => s + v.voiceMs, 0);
      const buf = await renderTopUsers(msg.guild!.name, `Voice • Last ${days} Days`, voice.map(v => ({
        userId: v.userId, messages: 0, voiceMs: v.voiceMs,
      })), totalVoice);
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'top-voice.png' })] });
    } else if (mode === 'activity') {
      const users = await queries.getServerRank(msg.guild!.id, days, limit);
      const buf = await renderTopUsers(msg.guild!.name, `Activity • Last ${days} Days`, users.map(u => ({
        userId: u.userId, messages: u.messages, voiceMs: u.voiceMs,
      })), users.reduce((s, u) => s + u.messages, 0));
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'top-activity.png' })] });
    } else {
      const users = await queries.getTopUsers(msg.guild!.id, days, limit);
      const totalMsgs = users.reduce((s, u) => s + u.messages, 0);
      const buf = await renderTopUsers(msg.guild!.name, `Messages • Last ${days} Days`, users.map(u => ({
        userId: u.userId, messages: u.messages, voiceMs: 0,
      })), totalMsgs);
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'top.png' })] });
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
    const days = parseInt(args[0]) || 30;
    const ch = await queries.getTopChannels(msg.guild!.id, days, 10);
    const lines = ch.map((c, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `${medal} <#${c.channelId}> — ${c.messages.toLocaleString()} msgs`;
    });
    await msg.reply({
      embeds: [{
        title: `📊 Top Channels — Last ${days} Days`,
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
    const days = parseInt(args[0]) || 30;
    const stats = await queries.getServerStats(msg.guild!.id, days);
    await msg.reply({
      embeds: [{
        title: `💬 Message Analytics — Last ${days} Days`,
        description: [
          `**Total Messages:** ${stats.totalMessages.toLocaleString()}`,
          `**Active Users:** ${stats.uniqueUsers}`,
          `**Messages/Day:** ${Math.round(stats.totalMessages / days)}`,
          `**Peak Hour:** ${getPeakHourFromDaily(stats.dailyStats)}`,
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
    const days = parseInt(args[0]) || 30;
    const voice = await queries.getTopVoice(msg.guild!.id, days, 10);
    const totalMs = voice.reduce((s, v) => s + v.voiceMs, 0);
    const lines = voice.map((v, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const hours = Math.floor(v.voiceMs / 3600000);
      const mins = Math.floor((v.voiceMs % 3600000) / 60000);
      return `${medal} <@${v.userId}> — ${hours}h ${mins}m`;
    });
    await msg.reply({
      embeds: [{
        title: `🔊 Voice Analytics — Last ${days} Days`,
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
    const peakHours = await queries.getPeakHoursAgg(msg.guild!.id, 30);
    const heatmap = await queries.getActivityHeatmap(msg.guild!.id, 7);
    const peakDay = getPeakDay(heatmap);
    const top5 = peakHours.slice(0, 5).map(h => `**${String(h.hour).padStart(2, '0')}:00** — ${h.messages.toLocaleString()} msgs`).join('\n');

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
    const days = parseInt(args[0]) || 30;
    const growth = await queries.getGrowthData(msg.guild!.id, days);
    const totalJoins = growth.reduce((s, g) => s + g.joins, 0);
    const totalLeaves = growth.reduce((s, g) => s + g.leaves, 0);
    const net = totalJoins - totalLeaves;
    await msg.reply({
      embeds: [{
        title: `📈 Member Growth — Last ${days} Days`,
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
    const days = parseInt(args[0]) || 30;
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
    const days = parseInt(args[0]) || 14;
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
    const days = parseInt(args[0]) || 30;
    const users = await queries.getServerRank(msg.guild!.id, days, 20);
    const buf = await renderServerRank(msg.guild!.name, users, days);
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
    const days = parseInt(args[0]) || 30;
    const users = await queries.getInactiveMembers(msg.guild!.id, days, 20);
    const buf = await renderInactive(msg.guild!.name, days, users);
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
      queries.getTopUsers(msg.guild!.id, 7, 10),
      queries.getTopChannels(msg.guild!.id, 7, 8),
      queries.getServerStats(msg.guild!.id, 14),
    ]);
    const growth = await queries.getGrowthData(msg.guild!.id, 7);
    const peakHours = await queries.getPeakHoursAgg(msg.guild!.id, 7);
    const resolvedChannels = topChannels.map(c => ({
      name: resolveChannelName(msg.guild!, c.channelId),
      messages: c.messages,
    }));
    const buf = await renderWeeklyReport({
      guildName: msg.guild!.name,
      period: 'Weekly',
      totalMessages: stats.totalMessages,
      totalVoiceMs: stats.totalVoiceMs,
      uniqueUsers: stats.uniqueUsers,
      joins: growth.reduce((s, g) => s + g.joins, 0),
      leaves: growth.reduce((s, g) => s + g.leaves, 0),
      peakHour: peakHours[0] ? `${String(peakHours[0].hour).padStart(2, '0')}:00` : '—',
      peakDay: getPeakDay(hourlyByDay),
      topUsers: topUsers.map(u => ({ userId: u.userId, messages: u.messages })),
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
      queries.getTopUsers(msg.guild!.id, 30, 10),
      queries.getTopChannels(msg.guild!.id, 30, 8),
      queries.getServerStats(msg.guild!.id, 60),
    ]);
    const growth = await queries.getGrowthData(msg.guild!.id, 30);
    const peakHours = await queries.getPeakHoursAgg(msg.guild!.id, 30);
    const resolvedChannels = topChannels.map(c => ({
      name: resolveChannelName(msg.guild!, c.channelId),
      messages: c.messages,
    }));
    const buf = await renderMonthlyReport({
      guildName: msg.guild!.name,
      period: 'Monthly',
      totalMessages: stats.totalMessages,
      totalVoiceMs: stats.totalVoiceMs,
      uniqueUsers: stats.uniqueUsers,
      joins: growth.reduce((s, g) => s + g.joins, 0),
      leaves: growth.reduce((s, g) => s + g.leaves, 0),
      peakHour: peakHours[0] ? `${String(peakHours[0].hour).padStart(2, '0')}:00` : '—',
      peakDay: getPeakDay(hourlyByDay),
      topUsers: topUsers.map(u => ({ userId: u.userId, messages: u.messages })),
      topChannels: resolvedChannels,
      dailyMessages: stats.dailyStats.map(s => s.totalMessages),
      hourlyByDay,
      prevMessages: prevStats.totalMessages,
    });
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'monthly.png' })] });
  },
});

// === FAKE ===
import { generateFakeServer, generateFakeUser, generateFakeReport } from '../fake/generator.js';
import { renderFakeServerStats } from '../rendering/fake-server.js';
import { renderFakeUserStats } from '../rendering/fake-user.js';
import { renderFakeReport } from '../rendering/fake-report.js';

registerCommand({
  name: 'fake',
  description: 'Generate fictional statistics (admin only, demo)',
  category: 'Admin',
  adminOnly: true,
  execute: async ({ msg, args }) => {
    if (!isAdmin(msg)) {
      await msg.reply({ content: '❌ You need Administrator permissions to generate fake statistics.' });
      return;
    }

    const sub = args[0]?.toLowerCase();

    // m?fake @user
    const mentionedUser = msg.mentions.users.first();

    if (mentionedUser) {
      const fakeUser = generateFakeUser(mentionedUser.username);
      const buf = await renderFakeUserStats(fakeUser);
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'fake-userstats.png' })] });
      return;
    }

    if (sub === 'user') {
      const fakeUser = generateFakeUser();
      const buf = await renderFakeUserStats(fakeUser);
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'fake-userstats.png' })] });
      return;
    }

    if (sub === 'weekly') {
      const fakeReport = generateFakeReport('weekly');
      const buf = await renderFakeReport(fakeReport);
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'fake-weekly.png' })] });
      return;
    }

    if (sub === 'monthly') {
      const fakeReport = generateFakeReport('monthly');
      const buf = await renderFakeReport(fakeReport);
      await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'fake-monthly.png' })] });
      return;
    }

    // Default: m?fake (server stats)
    const fakeServer = generateFakeServer();
    const buf = await renderFakeServerStats(fakeServer);
    await msg.reply({ files: [new AttachmentBuilder(buf, { name: 'fake-stats.png' })] });
  },
});

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
    const sent = await msg.reply({ content: '🏓 Pinging...' });
    const latency = sent.createdTimestamp - msg.createdTimestamp;
    await sent.edit({ content: `🏓 Pong! ${latency}ms` });
  },
});

// ─── Helpers ──────────────────────────────────────────

function resolveChannelName(guild: Guild, channelId: string): string {
  const ch = guild.channels.cache.get(channelId);
  return ch ? `#${ch.name}` : '#deleted-channel';
}

function getPeakHour(grid: number[][]): string {
  const totals = Array(24).fill(0);
  for (const day of grid) for (let h = 0; h < 24; h++) totals[h] += day[h] || 0;
  const peak = totals.indexOf(Math.max(...totals));
  return `${String(peak).padStart(2, '0')}:00`;
}

function getPeakDay(grid: number[][]): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayTotals = Array(7).fill(0);
  for (let d = 0; d < grid.length; d++) for (const v of grid[d]) dayTotals[d] += v;
  return dayNames[dayTotals.indexOf(Math.max(...dayTotals))];
}

function getPeakHourFromDaily(daily: any[]): string {
  return '—';
}
