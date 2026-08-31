import { renderServerStats } from './rendering/server-stats.js';
import { renderUserStats } from './rendering/user-stats.js';
import { renderTopUsers } from './rendering/top.js';
import { renderActivityChart } from './rendering/activity.js';
import { renderHeatmap } from './rendering/heatmap.js';
import { renderHelp } from './rendering/help.js';
import { renderServerOverview } from './rendering/server-overview.js';
import { renderGrowth } from './rendering/growth.js';
import { renderCompare } from './rendering/compare.js';
import { renderWeeklyReport } from './rendering/reports.js';
import { renderFakeServerStats } from './rendering/fake-server.js';
import { renderFakeUserStats } from './rendering/fake-user.js';
import { renderFakeReport } from './rendering/fake-report.js';
import { generateFakeServer, generateFakeUser, generateFakeReport } from './fake/generator.js';
import { writeFileSync } from 'fs';

async function main() {
  console.log('Generating test images...');

  const hourlyByDay = Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const base = h >= 18 && h <= 22 ? 150 : h >= 10 && h <= 16 ? 80 : h >= 3 && h <= 7 ? 10 : 40;
      return Math.floor(base + Math.random() * 30 + (d >= 5 ? 40 : 0));
    })
  );

  const dailyStats = Array.from({ length: 30 }, () => ({
    totalMessages: Math.floor(2000 + Math.random() * 800),
  }));

  // Server Stats
  console.log('m?stats...');
  writeFileSync('/tmp/test-stats.png', await renderServerStats({
    guild: { name: '/marlboro social', memberCount: 1248 },
    totalMessages: 82492, totalVoiceMs: 456789000, uniqueUsers: 347,
    topChannels: [
      { channelId: 'chat', messages: 54313 }, { channelId: 'general', messages: 30664 },
      { channelId: 'media', messages: 10267 }, { channelId: 'gaming', messages: 8921 },
      { channelId: 'off-topic', messages: 6821 }, { channelId: 'music', messages: 4312 },
      { channelId: 'art', messages: 3211 }, { channelId: 'bot-cmds', messages: 2100 },
    ],
    topUsers: [
      { userId: 'bunnycatdpg', messages: 5898 }, { userId: 'ninqz', messages: 4493 },
      { userId: 'semeiological', messages: 4297 }, { userId: 'astroboy', messages: 3921 },
      { userId: 'moonlight', messages: 3812 }, { userId: 'shadowfox', messages: 3441 },
      { userId: 'pixelwave', messages: 3182 }, { userId: 'neonridge', messages: 2993 },
    ],
    dailyStats, hourlyByDay,
  }));

  // User Stats
  console.log('m?u...');
  writeFileSync('/tmp/test-me.png', await renderUserStats({
    user: { username: 'bunnycatdpg' }, rank: 1, totalMembers: 1248,
    totalMessages: 5898, totalVoiceMs: 23456000, voiceSessions: 47,
    activeDays: 24, totalDays: 30,
    topChannels: [
      { channelId: 'chat', messages: 3200 }, { channelId: 'general', messages: 1400 },
      { channelId: 'gaming', messages: 800 }, { channelId: 'media', messages: 498 },
    ],
    dailyMessages: Array.from({ length: 30 }, () => Math.floor(150 + Math.random() * 100)),
    weekdayMessages: [980, 1120, 890, 1050, 1200, 1400, 1258],
    hourlyMessages: hourlyByDay[0], percentile: 94,
    msgsThisWeek: 2100, msgsThisMonth: 5898, voiceThisWeek: 8400000, voiceThisMonth: 23456000,
  }));

  // Top Users
  console.log('m?top...');
  writeFileSync('/tmp/test-top.png', await renderTopUsers('/marlboro social', 'Messages • Last 14 Days', [
    { userId: 'bunnycatdpg', messages: 5898, voiceMs: 12340000 },
    { userId: 'ninqz', messages: 4493, voiceMs: 8920000 },
    { userId: 'semeiological', messages: 4297, voiceMs: 15670000 },
    { userId: 'astroboy', messages: 3921, voiceMs: 6540000 },
    { userId: 'moonlight', messages: 3812, voiceMs: 9870000 },
    { userId: 'shadowfox', messages: 3441, voiceMs: 4320000 },
    { userId: 'pixelwave', messages: 3182, voiceMs: 7650000 },
    { userId: 'neonridge', messages: 2993, voiceMs: 5430000 },
    { userId: 'emberstrike', messages: 2821, voiceMs: 3210000 },
    { userId: 'crimsonveil', messages: 2611, voiceMs: 6780000 },
  ], 37469));

  // Activity
  console.log('m?activity...');
  writeFileSync('/tmp/test-activity.png', await renderActivityChart({
    guildName: '/marlboro social',
    hourly: hourlyByDay[0].map((messages, hour) => ({ hour, messages })),
  }));

  // Heatmap
  console.log('m?heatmap...');
  writeFileSync('/tmp/test-heatmap.png', await renderHeatmap({
    guildName: '/marlboro social', grid: hourlyByDay,
  }));

  // Help
  console.log('m?help...');
  writeFileSync('/tmp/test-help.png', await renderHelp([
    { name: 'stats', description: 'Server statistics overview', category: 'Analytics' },
    { name: 'server', description: 'Server overview', category: 'Analytics' },
    { name: 'u', description: 'User statistics', category: 'Analytics' },
    { name: 'top', description: 'Top members leaderboard', category: 'Leaderboards' },
    { name: 'channels', description: 'Channel analytics', category: 'Analytics' },
    { name: 'messages', description: 'Message analytics', category: 'Analytics' },
    { name: 'voice', description: 'Voice analytics', category: 'Analytics' },
    { name: 'activity', description: 'Activity chart', category: 'Analytics' },
    { name: 'peaks', description: 'Peak hours and days', category: 'Analytics' },
    { name: 'heatmap', description: 'Activity heatmap', category: 'Analytics' },
    { name: 'growth', description: 'Server growth over time', category: 'Analytics' },
    { name: 'compare', description: 'Compare two time periods', category: 'Analytics' },
    { name: 'serverrank', description: 'Server activity rank', category: 'Leaderboards' },
    { name: 'inactive', description: 'Show inactive members', category: 'Admin' },
    { name: 'weekly', description: 'Weekly server report', category: 'Reports' },
    { name: 'monthly', description: 'Monthly server report', category: 'Reports' },
    { name: 'config', description: 'View/set guild config', category: 'Admin' },
    { name: 'setprefix', description: 'Change the bot prefix', category: 'Admin' },
    { name: 'reset', description: 'Reset all stats', category: 'Admin' },
    { name: 'help', description: 'Show all commands', category: 'Info' },
    { name: 'ping', description: 'Check bot latency', category: 'Info' },
  ], 'm?'));

  // Server Overview
  console.log('m?server...');
  writeFileSync('/tmp/test-server.png', await renderServerOverview({
    guild: {
      name: '/marlboro social', memberCount: 1248, channelCount: 42,
      roleCount: 18, emojiCount: 35, boostLevel: 2, boostCount: 7,
      createdAt: '<t:1609459200:R>', ownerTag: 'bunnycatdpg',
    },
    totalMessages: 82492, totalVoiceMs: 456789000, uniqueUsers: 347,
    msgsPerDay: 2750, peakHour: '21:00', peakDay: 'Saturday',
    joins: 89, leaves: 23,
  }));

  // Growth
  console.log('m?growth...');
  const growthData = Array.from({ length: 30 }, (_, i) => ({
    date: `2026-08-${String(i + 1).padStart(2, '0')}`,
    joins: Math.floor(Math.random() * 8) + 1,
    leaves: Math.floor(Math.random() * 3),
    net: 0, total: 1200 + i * 2,
  }));
  growthData.forEach(g => g.net = g.joins - g.leaves);
  writeFileSync('/tmp/test-growth.png', await renderGrowth({
    guildName: '/marlboro social', days: 30,
    dailyGrowth: growthData, totalJoins: 89, totalLeaves: 23,
  }));

  // Compare
  console.log('m?compare...');
  writeFileSync('/tmp/test-compare.png', await renderCompare(
    { label: 'Last 14 Days', messages: 82492, activeUsers: 347, voiceHours: 126.9, joins: 45, leaves: 12, peakHour: '21:00' },
    { label: 'Previous 14 Days', messages: 71883, activeUsers: 312, voiceHours: 112.4, joins: 38, leaves: 18, peakHour: '20:00' },
  ));

  // Weekly Report
  console.log('m?weekly...');
  writeFileSync('/tmp/test-weekly.png', await renderWeeklyReport({
    guildName: '/marlboro social', period: 'Weekly',
    totalMessages: 18420, totalVoiceMs: 98760000, uniqueUsers: 234,
    joins: 12, leaves: 3, peakHour: '21:00', peakDay: 'Saturday',
    topUsers: [
      { userId: 'bunnycatdpg', messages: 1890 }, { userId: 'ninqz', messages: 1420 },
      { userId: 'semeiological', messages: 1380 }, { userId: 'astroboy', messages: 1210 },
      { userId: 'moonlight', messages: 1150 },
    ],
    topChannels: [
      { channelId: 'chat', messages: 8900 }, { channelId: 'general', messages: 4200 },
      { channelId: 'media', messages: 2100 }, { channelId: 'gaming', messages: 1800 },
    ],
    dailyMessages: Array.from({ length: 7 }, () => Math.floor(2200 + Math.random() * 800)),
    hourlyByDay, prevMessages: 16200,
  }));

  // === FAKE DEMO IMAGES ===
  console.log('m?fake (server)...');
  const fakeServer = generateFakeServer();
  writeFileSync('/tmp/test-fake-server.png', await renderFakeServerStats(fakeServer));

  console.log('m?fake user...');
  const fakeUser = generateFakeUser();
  writeFileSync('/tmp/test-fake-user.png', await renderFakeUserStats(fakeUser));

  console.log('m?fake weekly...');
  const fakeWeekly = generateFakeReport('weekly');
  writeFileSync('/tmp/test-fake-weekly.png', await renderFakeReport(fakeWeekly));

  console.log('m?fake monthly...');
  const fakeMonthly = generateFakeReport('monthly');
  writeFileSync('/tmp/test-fake-monthly.png', await renderFakeReport(fakeMonthly));

  console.log('Done!');
}

main().catch(console.error);
