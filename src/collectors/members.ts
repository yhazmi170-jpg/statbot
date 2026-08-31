import { GuildMember, PartialGuildMember } from 'discord.js';
import { prisma, log } from '../database/index.js';

export function onGuildMemberAdd(member: GuildMember) {
  if (!member.guild) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  prisma.guildDailyStats.upsert({
    where: { guildId_date: { guildId: member.guild.id, date: today } },
    create: { guildId: member.guild.id, date: today, joins: 1 },
    update: { joins: { increment: 1 } },
  }).catch(err => log.error({ err }, 'Error tracking member join'));
}

export function onGuildMemberRemove(member: GuildMember | PartialGuildMember) {
  if (!('guild' in member) || !member.guild) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  prisma.guildDailyStats.upsert({
    where: { guildId_date: { guildId: member.guild.id, date: today } },
    create: { guildId: member.guild.id, date: today, leaves: 1 },
    update: { leaves: { increment: 1 } },
  }).catch(err => log.error({ err }, 'Error tracking member leave'));
}
