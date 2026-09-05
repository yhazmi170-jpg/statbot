import { Message, TextChannel, ChannelType } from 'discord.js';
import { prisma, ensureUser, ensureChannel, ensureGuild, log } from '../database/index.js';

const buffer: { guildId: string; userId: string; channelId: string; channelName: string; username: string; timestamp: Date }[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let flushCount = 0;

export function onMessageCreate(msg: Message) {
  if (!msg.guild || msg.author.bot) return;
  const guildId = msg.guild.id;
  const userId = msg.author.id;
  const channelId = msg.channel.id;

  // Resolve channel name from cache
  let channelName = 'unknown';
  const ch = msg.guild.channels.cache.get(channelId);
  if (ch) channelName = ch.name;

  // Resolve username from cache
  const username = msg.member?.displayName || msg.author.username || 'unknown';

  buffer.push({ guildId, userId, channelId, channelName, username, timestamp: msg.createdAt });

  if (buffer.length >= 50) flush();
  if (!flushTimer) flushTimer = setInterval(flush, 5000);
}

async function flush() {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, 200);
  if (buffer.length === 0 && flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  try {
    const guildIds = new Set(batch.map(b => b.guildId));
    const userIds = new Set(batch.map(b => b.userId));
    const channelIds = new Set(batch.map(b => b.channelId));

    // Ensure parent records exist (SQLite FK constraints)
    for (const g of guildIds) {
      await ensureGuild(g, 'Unknown').catch(() => {});
    }
    for (const u of userIds) {
      const entry = batch.find(b => b.userId === u);
      if (entry) await ensureUser(u, entry.username).catch(() => {});
    }
    for (const c of channelIds) {
      const entry = batch.find(b => b.channelId === c);
      if (entry) await ensureChannel(c, entry.channelName, 'text', entry.guildId).catch(() => {});
    }

    // Upsert aggregates
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const entry of batch) {
      const hour = entry.timestamp.getHours();

      // Daily guild stats
      await prisma.guildDailyStats.upsert({
        where: { guildId_date: { guildId: entry.guildId, date: today } },
        create: { guildId: entry.guildId, date: today, totalMessages: 1, uniqueUsers: 1 },
        update: { totalMessages: { increment: 1 } },
      }).catch(() => {});

      // Hourly guild stats
      await prisma.guildHourlyStats.upsert({
        where: { guildId_date_hour: { guildId: entry.guildId, date: today, hour } },
        create: { guildId: entry.guildId, date: today, hour, messages: 1 },
        update: { messages: { increment: 1 } },
      }).catch(() => {});

      // User daily stats (topChannelId/topHour are no longer overwritten here;
      // real per-user per-channel/per-hour counts live in the new tables)
      await prisma.userDailyStats.upsert({
        where: { guildId_userId_date: { guildId: entry.guildId, userId: entry.userId, date: today } },
        create: { guildId: entry.guildId, userId: entry.userId, date: today, messages: 1 },
        update: {
          messages: { increment: 1 },
        },
      }).catch(() => {});

      // Per-user per-channel daily stats
      await prisma.userChannelStats.upsert({
        where: {
          guildId_userId_channelId_date: {
            guildId: entry.guildId, userId: entry.userId, channelId: entry.channelId, date: today,
          },
        },
        create: {
          guildId: entry.guildId, userId: entry.userId, channelId: entry.channelId, date: today, messages: 1,
        },
        update: { messages: { increment: 1 } },
      }).catch(() => {});

      // Per-user hourly stats
      await prisma.userHourlyStats.upsert({
        where: {
          guildId_userId_date_hour: {
            guildId: entry.guildId, userId: entry.userId, date: today, hour,
          },
        },
        create: { guildId: entry.guildId, userId: entry.userId, date: today, hour, messages: 1 },
        update: { messages: { increment: 1 } },
      }).catch(() => {});

      // Channel stats
      await prisma.channelStats.upsert({
        where: { guildId_channelId_date: { guildId: entry.guildId, channelId: entry.channelId, date: today } },
        create: { guildId: entry.guildId, channelId: entry.channelId, date: today, messages: 1, uniqueUsers: 1 },
        update: { messages: { increment: 1 } },
      }).catch(() => {});
    }

    flushCount++;
    if (flushCount % 100 === 0) {
      log.info(`Flushed ${batch.length} messages (total flushes: ${flushCount})`);
    }
  } catch (err) {
    log.error({ err }, 'Error flushing message buffer');
  }
}

export async function flushMessages() {
  flush();
}
