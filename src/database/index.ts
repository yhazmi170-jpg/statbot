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
    create: { id, name, iconUrl },
    update: { name, iconUrl },
  });
}

export async function ensureUser(id: string, username: string, avatarUrl?: string) {
  return prisma.user.upsert({
    where: { id },
    create: { id, username, avatarUrl },
    update: { username, avatarUrl },
  });
}

export async function ensureChannel(id: string, name: string, type: string, guildId: string) {
  return prisma.channel.upsert({
    where: { id },
    create: { id, name, type, guildId },
    update: { name },
  });
}
