import { Client, GatewayIntentBits, Events } from 'discord.js';
import { mkdirSync } from 'fs';
import { config } from './config.js';
import { prisma, log, ensureGuild } from './database/index.js';
import { onMessageCreate, flushMessages } from './collectors/messages.js';
import { onVoiceStateUpdate, flushVoiceSessions } from './collectors/voice.js';
import { onGuildMemberAdd, onGuildMemberRemove } from './collectors/members.js';
import { handleCommand, getCommands } from './commands/index.js';
import { startReportService } from './services/reports.js';

// Ensure data directory exists for SQLite
try { mkdirSync('./data', { recursive: true }); } catch {}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async (c) => {
  log.info(`Logged in as ${c.user.tag}`);

  // Sync guilds
  for (const [id, guild] of c.guilds.cache) {
    await ensureGuild(id, guild.name, guild.iconURL() || undefined).catch(() => {});
  }

  startReportService(client);
  log.info(`Tracking ${c.guilds.cache.size} guilds, ${getCommands().length} commands ready`);
});

client.on(Events.MessageCreate, async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  // Check for prefix
  const guild = await prisma.guild.findUnique({ where: { id: msg.guild.id } }).catch(() => null);
  const prefix = guild?.prefix || config.defaultPrefix;

  if (msg.content.startsWith(prefix)) {
    await handleCommand(msg, prefix);
  }

  // Track message
  onMessageCreate(msg);
});

client.on(Events.VoiceStateUpdate, (old, new_) => {
  onVoiceStateUpdate(old, new_);
});

client.on(Events.GuildMemberAdd, (member) => {
  onGuildMemberAdd(member);
});

client.on(Events.GuildMemberRemove, (member) => {
  onGuildMemberRemove(member);
});

client.on(Events.GuildCreate, async (guild) => {
  await ensureGuild(guild.id, guild.name, guild.iconURL() || undefined);
  log.info({ guild: guild.name }, 'Joined guild');
});

// Graceful shutdown
const shutdown = async () => {
  log.info('Shutting down...');
  flushMessages();
  await flushVoiceSessions();
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Login
if (!config.token) {
  log.error('DISCORD_TOKEN not set');
  process.exit(1);
}

client.login(config.token);
