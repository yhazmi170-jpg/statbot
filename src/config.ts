import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  defaultPrefix: process.env.PREFIX || 'm?',
  timezone: process.env.TZ || 'UTC',
  databaseUrl: process.env.DATABASE_URL || '',
  intents: 32767 | 0,
  cacheSizes: {
    channels: 500,
    guilds: 200,
    members: 200,
  },
  batch: {
    flushIntervalMs: 5_000,
    maxBatchSize: 50,
  },
  retention: {
    rawDays: 90,
    aggregatedDays: 365,
  },
} as const;
