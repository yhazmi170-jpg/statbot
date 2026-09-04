import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

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

// ─── GITHUB BACKUP ──────────────────────────────────────

let backupTimer: NodeJS.Timeout | null = null;
let backupRunning = false;

function getDbPath(): string {
  const url = process.env.DATABASE_URL || '';
  const match = url.match(/file:(.+)/);
  return match ? match[1] : './data/statbot.db';
}

function backupDb() {
  if (backupRunning) return;
  backupRunning = true;
  try {
    const dbPath = getDbPath();
    if (!existsSync(dbPath)) {
      log.warn('DB file not found for backup: ' + dbPath);
      return;
    }
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    if (!githubToken || !githubRepo) {
      log.warn('GITHUB_TOKEN or GITHUB_REPO not set, skipping backup');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = `data/statbot-${timestamp}.db`;

    execSync(`cp "${dbPath}" "${backupPath}"`);

    const content = require('fs').readFileSync(backupPath).toString('base64');
    const sha = execSync(
      `curl -s -H "Authorization: token ${githubToken}" "https://api.github.com/repos/${githubRepo}/contents/${backupPath}"`,
      { timeout: 15000 }
    ).toString().trim();

    let currentSha = '';
    try {
      const parsed = JSON.parse(sha);
      if (parsed.sha) currentSha = parsed.sha;
    } catch {}

    const body = JSON.stringify({
      message: `Backup statbot DB ${timestamp}`,
      content,
      ...(currentSha ? { sha: currentSha } : {}),
    });

    execSync(
      `curl -s -X PUT -H "Authorization: token ${githubToken}" -H "Content-Type: application/json" -d '${body}' "https://api.github.com/repos/${githubRepo}/contents/${backupPath}"`,
      { timeout: 30000 }
    );

    // Cleanup local backup
    try { require('fs').unlinkSync(backupPath); } catch {}
    log.info(`Backup completed: ${backupPath}`);
  } catch (err: any) {
    log.error({ err: err.message }, 'Backup failed');
  } finally {
    backupRunning = false;
  }
}

export function startBackup(intervalMs = 300_000) {
  // Initial backup after 60s
  setTimeout(backupDb, 60_000);
  backupTimer = setInterval(backupDb, intervalMs);
  log.info(`GitHub backup started (interval: ${intervalMs / 1000}s)`);
}

export function stopBackup() {
  if (backupTimer) clearInterval(backupTimer);
}
