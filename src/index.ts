import { Client, GatewayIntentBits, Events } from 'discord.js';
import { createServer } from 'http';
import { config } from './config.js';
import { prisma, log, ensureGuild } from './database/index.js';
import { onMessageCreate, flushMessages } from './collectors/messages.js';
import { onVoiceStateUpdate, flushVoiceSessions } from './collectors/voice.js';
import { onGuildMemberAdd, onGuildMemberRemove } from './collectors/members.js';
import { handleCommand, getCommands } from './commands/index.js';
import { startReportService } from './services/reports.js';

const port = parseInt(process.env.PORT || '3000');

// In-memory log buffer for remote debugging
const logBuffer: string[] = [];
const MAX_LOGS = 200;
const origLog = log.info.bind(log);
const origError = log.error.bind(log);
const origWarn = log.warn.bind(log);

function pushLog(level: string, msg: string) {
  const entry = `[${new Date().toISOString()}] ${level}: ${msg}`;
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();
}

log.info = function(msg: any) { pushLog('INFO', typeof msg === 'string' ? msg : JSON.stringify(msg)); origLog.apply(log, arguments as any); } as any;
log.error = function(msg: any) { pushLog('ERR', typeof msg === 'string' ? msg : JSON.stringify(msg)); origError.apply(log, arguments as any); } as any;
log.warn = function(msg: any) { pushLog('WARN', typeof msg === 'string' ? msg : JSON.stringify(msg)); origWarn.apply(log, arguments as any); } as any;

createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Statbot is running');
  } else if (req.url === '/logs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(logBuffer));
  } else if (req.url === '/status') {
    const uptime = Math.floor(process.uptime());
    const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const discord = client.isReady();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`discord=${discord} uptime=${uptime}s mem=${mem}MB guilds=${client.guilds.cache.size} commands=${getCommands().length} node=${process.version}`);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
}).listen(port, () => log.info(`HTTP server on port ${port}`));

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

  // DM owner that bot is online
  const OWNER_ID = '536278876247162882';
  try {
    const owner = await c.users.fetch(OWNER_ID);
    await owner.send(`Statbot is online as **${c.user.tag}** in ${c.guilds.cache.size} server(s).`).catch(() => {});
    log.info(`Sent online DM to owner`);
  } catch (err: any) {
    log.warn({ err: err.message }, 'Failed to DM owner');
  }

  startReportService(client);
  log.info(`Tracking ${c.guilds.cache.size} guilds, ${getCommands().length} commands ready`);
});

client.on(Events.Error, (err: any) => log.error({ err: err.message }, 'Discord client error'));
client.on(Events.Warn, (msg: string) => log.warn({ msg }, 'Discord warning'));

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

// Login with timeout
const loginTimeout = setTimeout(() => {
  log.error('Discord login timed out after 120s');
  process.exit(1);
}, 120_000);

client.once(Events.ClientReady, () => clearTimeout(loginTimeout));

client.login(config.token).catch((err: any) => {
  log.error({ err: err.message }, 'Discord login failed');
  clearTimeout(loginTimeout);
  process.exit(1);
});
