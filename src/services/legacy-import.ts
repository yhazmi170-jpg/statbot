import { Guild } from 'discord.js';
import { prisma, log } from '../database/index.js';
import { LEGACY_USERS, LEGACY_CHANNELS } from '../legacy-statbot.js';

export const IMPORT_KEY = 'legacy-statbot-marlboro-v2';

export interface ImportResult {
  usersImported: number;
  usersLinked: number;
  usersUnlinked: number;
  channelsImported: number;
  channelsLinked: number;
  channelsUnlinked: number;
  alreadyImported: boolean;
}

export async function isAlreadyImported(guildId: string): Promise<boolean> {
  const log = await prisma.importLog.findUnique({
    where: { importKey_guildId: { importKey: IMPORT_KEY, guildId } },
  });
  return log?.status === 'completed';
}

export async function importLegacyData(guild: Guild): Promise<ImportResult> {
  const guildId = guild.id;

  // Check if already imported
  const existing = await isAlreadyImported(guildId);
  if (existing) {
    log.info(`Legacy import ${IMPORT_KEY} already completed for ${guild.name}`);
    return {
      usersImported: 0, usersLinked: 0, usersUnlinked: 0,
      channelsImported: 0, channelsLinked: 0, channelsUnlinked: 0,
      alreadyImported: true,
    };
  }

  log.info(`Starting legacy import ${IMPORT_KEY} for ${guild.name}`);

  // Fetch all guild members for potential linking of unlinked records
  let members;
  try {
    members = await guild.members.fetch();
  } catch (err: any) {
    log.error({ err: err.message }, 'Failed to fetch guild members for legacy import');
    members = new Map();
  }

  // Build member lookup by Discord ID (for direct ID matching)
  const memberById = new Map<string, { id: string; username: string; displayName: string }>();
  for (const [, member] of members) {
    if (member.user.bot) continue;
    memberById.set(member.user.id, {
      id: member.user.id,
      username: member.user.username,
      displayName: member.displayName,
    });
  }

  let usersImported = 0;
  let usersLinked = 0;
  let usersUnlinked = 0;

  // Import user records - use direct Discord ID from LEGACY_USERS
  for (const record of LEGACY_USERS) {
    // Use the direct Discord ID from the record
    const matchedMember = record.discordUserId ? memberById.get(record.discordUserId) || null : null;

    try {
      await prisma.legacyUserStats.upsert({
        where: {
          guildId_importedUsername_importKey: {
            guildId,
            importedUsername: record.importedUsername,
            importKey: IMPORT_KEY,
          },
        },
        create: {
          guildId,
          discordUserId: record.discordUserId,
          importedUsername: record.importedUsername,
          messageCount14d: record.messageCount14d,
          voiceSeconds14d: record.voiceSeconds14d,
          messageRank: record.messageRank || null,
          voiceRank: record.voiceRank || null,
          linked: !!matchedMember,
          importKey: IMPORT_KEY,
        },
        update: {
          discordUserId: record.discordUserId,
          linked: !!matchedMember,
          messageCount14d: record.messageCount14d,
          voiceSeconds14d: record.voiceSeconds14d,
          messageRank: record.messageRank || null,
          voiceRank: record.voiceRank || null,
        },
      });

      usersImported++;
      if (matchedMember) {
        usersLinked++;
        log.info(`Linked legacy user ${record.importedUsername} -> ${matchedMember.id} (${matchedMember.username})`);
      } else {
        usersUnlinked++;
        log.warn(`Unlinked legacy user: ${record.importedUsername} (no match found)`);
      }
    } catch (err: any) {
      log.error({ err: err.message, username: record.importedUsername }, 'Failed to import legacy user');
    }
  }

  let channelsImported = 0;
  let channelsLinked = 0;
  let channelsUnlinked = 0;

  // Import channel records
  for (const record of LEGACY_CHANNELS) {
    // Try to match channel by name
    let matchedChannelId: string | null = null;

    const ch = guild.channels.cache.find(c => c.name.toLowerCase() === record.channelName.toLowerCase());
    if (ch) {
      matchedChannelId = ch.id;
    }

    try {
      await prisma.legacyChannelStats.upsert({
        where: {
          guildId_channelName_importKey: {
            guildId,
            channelName: record.channelName,
            importKey: IMPORT_KEY,
          },
        },
        create: {
          guildId,
          channelId: matchedChannelId,
          channelName: record.channelName,
          channelType: record.messageCount14d > 0 ? 'text' : 'voice',
          messageCount14d: record.messageCount14d,
          voiceSeconds14d: record.voiceSeconds14d || 0,
          channelRank: record.channelRank || null,
          voiceChannelRank: record.voiceChannelRank || null,
          linked: !!matchedChannelId,
          importKey: IMPORT_KEY,
        },
        update: {
          channelId: matchedChannelId || undefined,
          linked: !!matchedChannelId,
          messageCount14d: record.messageCount14d,
          voiceSeconds14d: record.voiceSeconds14d || 0,
          channelRank: record.channelRank || null,
          voiceChannelRank: record.voiceChannelRank || null,
        },
      });

      channelsImported++;
      if (matchedChannelId) {
        channelsLinked++;
        log.info(`Linked legacy channel ${record.channelName} -> ${matchedChannelId}`);
      } else {
        channelsUnlinked++;
        log.warn(`Unlinked legacy channel: ${record.channelName}`);
      }
    } catch (err: any) {
      log.error({ err: err.message, channel: record.channelName }, 'Failed to import legacy channel');
    }
  }

  // Record import completion
  try {
    await prisma.importLog.upsert({
      where: { importKey_guildId: { importKey: IMPORT_KEY, guildId } },
      create: {
        importKey: IMPORT_KEY,
        guildId,
        status: 'completed',
        message: `Imported ${usersImported} users (${usersLinked} linked, ${usersUnlinked} unlinked), ${channelsImported} channels (${channelsLinked} linked, ${channelsUnlinked} unlinked)`,
      },
      update: { status: 'completed' },
    });
  } catch (err: any) {
    log.error({ err: err.message }, 'Failed to record import log');
  }

  const result: ImportResult = {
    usersImported, usersLinked, usersUnlinked,
    channelsImported, channelsLinked, channelsUnlinked,
    alreadyImported: false,
  };

  log.info({ result }, 'Legacy import completed');
  return result;
}

// Manual link: associate a legacy username with a Discord user ID
export async function linkLegacyUser(guildId: string, legacyUsername: string, discordUserId: string): Promise<{ success: boolean; message: string }> {
  const record = await prisma.legacyUserStats.findFirst({
    where: { guildId, importedUsername: legacyUsername, importKey: IMPORT_KEY },
  });

  if (!record) {
    return { success: false, message: `No legacy record found for "${legacyUsername}"` };
  }

  await prisma.legacyUserStats.update({
    where: { id: record.id },
    data: { discordUserId, linked: true },
  });

  return { success: true, message: `Linked "${legacyUsername}" -> <@${discordUserId}>` };
}

// Get unlinked legacy users
export async function getUnlinkedUsers(guildId: string) {
  return prisma.legacyUserStats.findMany({
    where: { guildId, linked: false, importKey: IMPORT_KEY },
    orderBy: { messageCount14d: 'desc' },
  });
}

// Get unlinked legacy channels
export async function getUnlinkedChannels(guildId: string) {
  return prisma.legacyChannelStats.findMany({
    where: { guildId, linked: false, importKey: IMPORT_KEY },
    orderBy: { messageCount14d: 'desc' },
  });
}

// Get all legacy stats for a user (by Discord ID)
export async function getLegacyStatsForUser(guildId: string, discordUserId: string) {
  return prisma.legacyUserStats.findFirst({
    where: { guildId, discordUserId, importKey: IMPORT_KEY },
  });
}

// Get combined legacy stats for a user (by username, for unlinked users)
export async function getLegacyStatsByUsername(guildId: string, username: string) {
  return prisma.legacyUserStats.findFirst({
    where: { guildId, importedUsername: username, importKey: IMPORT_KEY },
  });
}