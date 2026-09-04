import { Client, GatewayIntentBits, Events } from 'discord.js';
import { createServer } from 'http';
import dns from 'dns';
import { config } from './config.js';
import { prisma, log, ensureGuild, verifyDatabase, shutdownDatabase } from './database/index.js';
import { onMessageCreate, flushMessages } from './collectors/messages.js';
import { onVoiceStateUpdate, flushVoiceSessions } from './collectors/voice.js';
import { onGuildMemberAdd, onGuildMemberRemove } from './collectors/members.js';
import { handleCommand, getCommands } from './commands/index.js';
import { startReportService } from './services/reports.js';
import { importLegacyData } from './services/legacy-import.js';

dns.setDefaultResultOrder('ipv4first');

const port = parseInt(process.env.PORT || '3000');

// In-memory log buffer for remote debugging
const logBuffer: string[] = [];
const MAX_LOGS = 200;

function pushLog(level: string, msg: string) {
  const entry = `[${new Date().toISOString()}] ${level}: ${msg}`;
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();
}

const origInfo = log.info.bind(log);
const origError = log.error.bind(log);
const origWarn = log.warn.bind(log);

log.info = function(...args: any[]) {
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  pushLog('INFO', msg);
  return origInfo.apply(log, args as any);
} as any;

log.error = function(...args: any[]) {
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  pushLog('ERR', msg);
  return origError.apply(log, args as any);
} as any;

log.warn = function(...args: any[]) {
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  pushLog('WARN', msg);
  return origWarn.apply(log, args as any);
} as any;

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
    GatewayIntentBits.GuildMembers,
  ],
});

// ─── STARTUP SEQUENCE ───────────────────────────────────
// 1. Verify DB  2. Login Discord  3. Sync guilds  4. Import legacy  5. Collectors  6. Reports

async function startup() {
  // Step 1: Verify database
  log.info('[Startup] Step 1: Verify database...');
  await verifyDatabase();

  // Step 2: Login Discord
  log.info('[Startup] Step 2: Login Discord...');
  try {
    await client.login(config.token);
  } catch (err: any) {
    log.error({ err: err.message }, '[Startup] Discord login failed, retrying...');
    setTimeout(async () => {
      try { await client.login(config.token); } catch (e: any) {
        log.error({ err: e.message }, '[Startup] Retry failed, exiting');
        process.exit(1);
      }
    }, 30_000);
    return;
  }
}

client.once(Events.ClientReady, async (c) => {
  log.info(`[Startup] Step 3: Logged in as ${c.user.tag}`);

  // Step 3: Sync guilds
  for (const [id, guild] of c.guilds.cache) {
    await ensureGuild(id, guild.name, guild.iconURL() || undefined).catch(() => {});
  }
  log.info(`[Startup] Synced ${c.guilds.cache.size} guilds`);

  // Step 4: Import legacy data
  log.info('[Startup] Step 4: Legacy import...');
  for (const [, guild] of c.guilds.cache) {
    try {
      const result = await importLegacyData(guild);
      log.info(`[Startup] Legacy import result: ${JSON.stringify(result)}`);
    } catch (err: any) {
      log.error({ err: err.message }, '[Startup] Legacy import failed');
    }
  }

  // Step 5: Post-import DB verification
  log.info('[Startup] Step 5: Post-import DB verification...');
  const p = getPrisma();
  const legacyCount = await p.legacyUserStats.count();
  const linkedCount = await p.legacyUserStats.count({ where: { linked: true } });
  log.info(`[Startup] DB legacy total: ${legacyCount}, linked: ${linkedCount}`);

  // Step 6: Reports + DM owner
  startReportService(c);
  const OWNER_ID = config.ownerId;
  try {
    const owner = await c.users.fetch(OWNER_ID);
    await owner.send(`Statbot v3 online as **${c.user.tag}** in ${c.guilds.cache.size} server(s). PostgreSQL connected.`).catch(() => {});
  } catch {}

  log.info(`[Startup] Complete. Tracking ${c.guilds.cache.size} guilds, ${getCommands().length} commands ready`);
});

function getPrisma() {
  return (globalThis as any)._prisma || prisma;
}

// ─── EVENT HANDLERS ─────────────────────────────────────

client.on(Events.Error, (err: any) => log.error({ err: err.message }, 'Discord client error'));
client.on(Events.Warn, (msg: string) => log.warn({ msg }, 'Discord warning'));

client.on(Events.MessageCreate, async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  const guild = await prisma.guild.findUnique({ where: { id: msg.guild.id } }).catch(() => null);
  const prefix = guild?.prefix || config.defaultPrefix;

  if (msg.content.startsWith(prefix)) {
    await handleCommand(msg, prefix);
  }

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

// ─── SHUTDOWN ───────────────────────────────────────────

const shutdown = async () => {
  log.info('[Shutdown] Flushing pending data...');
  flushMessages();
  await flushVoiceSessions();
  await shutdownDatabase();
  client.destroy();
  log.info('[Shutdown] Complete');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ─── START ──────────────────────────────────────────────

startup().catch(err => {
  log.error({ err: err.message }, 'Startup failed');
  process.exit(1);
});
