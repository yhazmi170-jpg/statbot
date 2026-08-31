import { Message, TextChannel } from 'discord.js';
import { prisma, ensureUser, ensureChannel, ensureGuild, log } from '../database/index.js';

const buffer: { guildId: string; userId: string; channelId: string; timestamp: Date }[] = [];
let flushTimer: NodeJS.Timeout | null = null;

export function onMessageCreate(msg: Message) {
  if (!msg.guild || msg.author.bot) return;
  const guildId = msg.guild.id;
  const userId = msg.author.id;
  const channelId = msg.channel.id;

  buffer.push({ guildId, userId, channelId, timestamp: msg.createdAt });

  if (buffer.length >= 50) flush();
  if (!flushTimer) flushTimer = setInterval(flush, 5000);
}

async function flush() {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, 100);
  if (buffer.length === 0 && flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  try {
    const guildIds = new Set(batch.map(b => b.guildId));
    const userIds = new Set(batch.map(b => b.userId));
    const channelIds = new Set(batch.map(b => b.channelId));

    const guildMap = new Map<string, { name: string; iconUrl?: string }>();
    const userMap = new Map<string, { username: string; avatarUrl?: string }>();
    const channelMap = new Map<string, { name: string; type: string; guildId: string }>();

    for (const g of guildIds) {
      const guild = batch.find(b => b.guildId === g);
      if (guild) {
        // Minimal fetch - just ensure exists, don't block
        guildMap.set(g, { name: 'unknown' });
      }
    }
    for (const u of userIds) {
      const entry = batch.find(b => b.userId === u);
      if (entry) userMap.set(u, { username: 'unknown' });
    }
    for (const c of channelIds) {
      const entry = batch.find(b => b.channelId === c);
      if (entry) channelMap.set(c, { name: 'unknown', type: 'text', guildId: entry.guildId });
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

      // User daily stats
      await prisma.userDailyStats.upsert({
        where: { guildId_userId_date: { guildId: entry.guildId, userId: entry.userId, date: today } },
        create: { guildId: entry.guildId, userId: entry.userId, date: today, messages: 1 },
        update: { messages: { increment: 1 } },
      }).catch(() => {});

      // Channel stats
      await prisma.channelStats.upsert({
        where: { guildId_channelId_date: { guildId: entry.guildId, channelId: entry.channelId, date: today } },
        create: { guildId: entry.guildId, channelId: entry.channelId, date: today, messages: 1, uniqueUsers: 1 },
        update: { messages: { increment: 1 } },
      }).catch(() => {});
    }
  } catch (err) {
    log.error({ err }, 'Error flushing message buffer');
  }
}

export async function flushMessages() {
  flush();
}
