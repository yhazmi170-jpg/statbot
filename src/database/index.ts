import { PrismaClient } from '@prisma/client';
import pino from 'pino';

export const log = pino({ name: 'statbot', level: 'info' });

let _prisma: PrismaClient | null = null;
export function getPrisma() {
  if (!_prisma) _prisma = new PrismaClient({ log: ['error'] });
  return _prisma;
}

// Lazy proxy so existing code still works
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrisma() as any)[prop];
  },
});

export async function ensureGuild(id: string, name: string, iconUrl?: string) {
  return prisma.guild.upsert({
    where: { id },
    create: { id, name, iconUrl: iconUrl || null },
    update: { name, ...(iconUrl ? { iconUrl } : {}) },
  });
}

export async function ensureUser(id: string, username: string, avatarUrl?: string) {
  return prisma.user.upsert({
    where: { id },
    create: { id, username, avatarUrl: avatarUrl || null },
    update: { username, ...(avatarUrl ? { avatarUrl } : {}) },
  });
}

export async function ensureChannel(id: string, name: string, type: string, guildId: string) {
  return prisma.channel.upsert({
    where: { id },
    create: { id, name, type, guildId },
    update: { name },
  });
}

// ─── DATABASE STARTUP VERIFICATION ──────────────────────

export async function verifyDatabase() {
  const p = getPrisma();
  const dbUrl = process.env.DATABASE_URL || '';
  const provider = dbUrl.startsWith('postgresql') ? 'postgresql' : 'sqlite';

  log.info(`[Database] provider: ${provider}`);

  try {
    await p.$connect();
    log.info('[Database] connected');

    const [guildCount, userStatsCount, legacyCount] = await Promise.all([
      p.guild.count(),
      p.userDailyStats.count(),
      p.legacyUserStats.count(),
    ]);

    log.info(`[Database] guild count: ${guildCount}`);
    log.info(`[Database] user stats rows: ${userStatsCount}`);
    log.info(`[Database] legacy rows: ${legacyCount}`);

    return { guildCount, userStatsCount, legacyCount };
  } catch (err: any) {
    log.error({ err: err.message }, '[Database] verification failed');
    throw err;
  }
}

// ─── SHUTDOWN HANDLER ───────────────────────────────────

export async function shutdownDatabase() {
  log.info('[Database] shutting down...');
  const p = getPrisma();
  await p.$disconnect();
  log.info('[Database] disconnected');
}
