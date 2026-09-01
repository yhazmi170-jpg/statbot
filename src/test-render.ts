import { renderServerStats } from './rendering/server-stats.js';
import { renderUserStats } from './rendering/user-stats.js';
import { renderTopUsers } from './rendering/top.js';
import { renderActivityChart } from './rendering/activity.js';
import { renderHeatmap } from './rendering/heatmap.js';
import { renderHelp } from './rendering/help.js';
import { renderServerOverview } from './rendering/server-overview.js';
import { renderGrowth } from './rendering/growth.js';
import { renderCompare } from './rendering/compare.js';
import { renderReport } from './rendering/reports.js';
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

  console.log('m?stats...');
  writeFileSync('/tmp/test-stats.png', await renderServerStats({
    guildName: '/marlboro social',
    totalMessages: 82492, activeUsers: 347, totalVoiceMs: 456789000,
    topChannels: [
      { name: '#chat', messages: 54313 }, { name: '#general', messages: 30664 },
      { name: '#media', messages: 10267 }, { name: '#gaming', messages: 8921 },
      { name: '#off-topic', messages: 6821 }, { name: '#music', messages: 4312 },
      { name: '#art', messages: 3211 }, { name: '#bot-cmds', messages: 2100 },
    ],
    topUsers: [
      { userId: 'bunnycatdpg', messages: 5898 }, { userId: 'ninqz', messages: 4493 },
      { userId: 'semeiological', messages: 4297 }, { userId: 'astroboy', messages: 3921 },
      { userId: 'moonlight', messages: 3812 }, { userId: 'shadowfox', messages: 3441 },
      { userId: 'pixelwave', messages: 3182 }, { userId: 'neonridge', messages: 2993 },
    ],
    hourlyActivity: hourlyByDay[0].map((messages, hour) => ({ hour, messages })),
    heatmapGrid: hourlyByDay, weekdayMessages: [980, 1120, 890, 1050, 1200, 1400, 1258],
    hourLabels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
    period: 'Last 30 Days',
  }));

  console.log('m?u...');
  writeFileSync('/tmp/test-me.png', await renderUserStats({
    guildName: '/marlboro social', userId: 'bunnycatdpg', username: 'bunnycatdpg',
    totalMessages: 5898, totalVoiceMs: 23456000, activeDays: 24, totalDays: 30,
    firstSeen: '2024-01-15', peakHour: 21,
    topChannels: [
      { name: '#chat', messages: 3200 }, { name: '#general', messages: 1400 },
      { name: '#gaming', messages: 800 }, { name: '#media', messages: 498 },
    ],
    hourlyActivity: hourlyByDay[0].map((messages, hour) => ({ hour, messages })),
    weekdayMessages: [980, 1120, 890, 1050, 1200, 1400, 1258],
    rank: 1, totalUsers: 347, percentile: 94,
  }));

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

  console.log('m?activity...');
  writeFileSync('/tmp/test-activity.png', await renderActivityChart({
    guildName: '/marlboro social',
    hourly: hourlyByDay[0].map((messages, hour) => ({ hour, messages })),
  }));

  console.log('m?heatmap...');
  writeFileSync('/tmp/test-heatmap.png', await renderHeatmap({
    guildName: '/marlboro social', grid: hourlyByDay,
  }));

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

  console.log('m?server...');
  writeFileSync('/tmp/test-server.png', await renderServerOverview({
    guild: {
      name: '/marlboro social', memberCount: 1248, channelCount: 42,
      roleCount: 18, emojiCount: 35, boostLevel: 2, boostCount: 7,
      createdAt: '<t:1609459200:R>', ownerTag: 'bunnycatdpg',
    },
    totalMessages: 82492, totalVoiceMs: 456789000, uniqueUsers: 347,
    msgsPerDay: 2750, peakHour: '9:00 PM', peakDay: 'Saturday', joins: 89, leaves: 23,
  }));

  console.log('m?growth...');
  const growthData = Array.from({ length: 30 }, (_, i) => ({
    date: `2026-08-${String(i + 1).padStart(2, '0')}`,
    joins: Math.floor(Math.random() * 8) + 1, leaves: Math.floor(Math.random() * 3),
    net: 0, total: 1200 + i * 2,
  }));
  growthData.forEach(g => g.net = g.joins - g.leaves);
  writeFileSync('/tmp/test-growth.png', await renderGrowth({
    guildName: '/marlboro social', days: 30,
    dailyGrowth: growthData, totalJoins: 89, totalLeaves: 23,
  }));

  console.log('m?compare...');
  writeFileSync('/tmp/test-compare.png', await renderCompare(
    { label: 'Last 14 Days', messages: 82492, activeUsers: 347, voiceHours: 126.9, joins: 45, leaves: 12, peakHour: '9:00 PM' },
    { label: 'Previous 14 Days', messages: 71883, activeUsers: 312, voiceHours: 112.4, joins: 38, leaves: 18, peakHour: '8:00 PM' },
  ));

  console.log('m?weekly...');
  writeFileSync('/tmp/test-weekly.png', await renderReport({
    type: 'weekly', guildName: '/marlboro social', period: 'Aug 25 – Aug 31, 2026',
    totalMessages: 18420, totalVoiceMs: 98760000, activeUsers: 234,
    joins: 12, leaves: 3, peakHour: '9:00 PM',
    topUsers: [
      { userId: 'bunnycatdpg', messages: 1890 }, { userId: 'ninqz', messages: 1420 },
      { userId: 'semeiological', messages: 1380 }, { userId: 'astroboy', messages: 1210 },
      { userId: 'moonlight', messages: 1150 },
    ],
    topChannels: [
      { name: '#chat', messages: 8900 }, { name: '#general', messages: 4200 },
      { name: '#media', messages: 2100 }, { name: '#gaming', messages: 1800 },
    ],
    dailyMessages: Array.from({ length: 7 }, () => Math.floor(2200 + Math.random() * 800)),
    previousMessages: 16200,
  }));

  console.log('m?fake (server)...');
  writeFileSync('/tmp/test-fake-server.png', await renderFakeServerStats(generateFakeServer()));
  console.log('m?fake user...');
  writeFileSync('/tmp/test-fake-user.png', await renderFakeUserStats(generateFakeUser()));
  console.log('m?fake weekly...');
  writeFileSync('/tmp/test-fake-weekly.png', await renderFakeReport(generateFakeReport('weekly')));
  console.log('m?fake monthly...');
  writeFileSync('/tmp/test-fake-monthly.png', await renderFakeReport(generateFakeReport('monthly')));

  console.log('Done!');
}

main().catch(console.error);
