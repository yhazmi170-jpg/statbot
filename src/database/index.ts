import { PrismaClient } from '@prisma/client';
import pino from 'pino';

export const log = pino({ name: 'statbot', level: 'info' });
export const prisma = new PrismaClient({ log: ['error'] });

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
