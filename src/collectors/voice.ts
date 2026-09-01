import { VoiceState } from 'discord.js';
import { prisma, log, ensureUser, ensureGuild } from '../database/index.js';

const activeSessions = new Map<string, { guildId: string; userId: string; channelId: string; startedAt: Date }>();

export function onVoiceStateUpdate(old: VoiceState, new_: VoiceState) {
  const userId = new_.id;
  const guildId = new_.guild?.id;
  if (!guildId) return;

  const key = `${guildId}:${userId}`;

  // User joined a voice channel
  if (!old.channel && new_.channel) {
    activeSessions.set(key, {
      guildId,
      userId,
      channelId: new_.channel.id,
      startedAt: new Date(),
    });
  }
  // User left a voice channel
  else if (old.channel && !new_.channel) {
    const session = activeSessions.get(key);
    if (session) {
      activeSessions.delete(key);
      const durationMs = Date.now() - session.startedAt.getTime();
      ensureUser(session.userId, 'unknown').then(() => {
        prisma.voiceSession.create({
          data: {
            guildId: session.guildId,
            userId: session.userId,
            channelId: session.channelId,
            startedAt: session.startedAt,
            endedAt: new Date(),
            durationMs: BigInt(durationMs),
          },
        }).catch(err => log.error({ err }, 'Error saving voice session'));

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        prisma.userDailyStats.upsert({
          where: { guildId_userId_date: { guildId, userId, date: today } },
          create: { guildId, userId, date: today, voiceMs: BigInt(durationMs) },
          update: { voiceMs: { increment: BigInt(durationMs) } },
        }).catch(() => {});

        prisma.guildDailyStats.upsert({
          where: { guildId_date: { guildId, date: today } },
          create: { guildId, date: today, totalVoiceMs: BigInt(durationMs) },
          update: { totalVoiceMs: { increment: BigInt(durationMs) } },
        }).catch(() => {});
      }).catch(() => {});
    }
  }
  // User moved channels
  else if (old.channel && new_.channel && old.channel.id !== new_.channel.id) {
    const session = activeSessions.get(key);
    if (session) {
      const durationMs = Date.now() - session.startedAt.getTime();
      ensureUser(session.userId, 'unknown').then(() =>
        prisma.voiceSession.create({
          data: {
            guildId: session.guildId,
            userId: session.userId,
            channelId: session.channelId,
            startedAt: session.startedAt,
            endedAt: new Date(),
            durationMs: BigInt(durationMs),
          },
        })
      ).catch(() => {});

      activeSessions.set(key, {
        ...session,
        channelId: new_.channel.id,
        startedAt: new Date(),
      });
    }
  }
}

export async function flushVoiceSessions() {
  for (const [key, session] of activeSessions) {
    const durationMs = Date.now() - session.startedAt.getTime();
    if (durationMs > 1000) {
      try {
        await ensureUser(session.userId, 'unknown').catch(() => {});
        await prisma.voiceSession.create({
          data: {
            guildId: session.guildId,
            userId: session.userId,
            channelId: session.channelId,
            startedAt: session.startedAt,
            endedAt: new Date(),
            durationMs: BigInt(durationMs),
          },
        });
      } catch {}
    }
  }
  activeSessions.clear();
}
