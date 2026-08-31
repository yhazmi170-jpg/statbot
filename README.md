# StatBot — Production Discord Statistics Bot

Production-quality Discord statistics bot with prefix commands, image generation, and scheduled reports.

## Features

- **Real-time tracking**: Messages, voice sessions, member join/leave events
- **Aggregated analytics**: Daily, hourly, and per-user/per-channel stats
- **Image generation**: Server overviews, user stats, leaderboards, activity heatmaps using `@napi-rs/canvas`
- **Prefix commands** (`m?` default): All analytics via chat commands
- **Scheduled reports**: Auto-post daily/weekly/monthly stats to a channel
- **PostgreSQL + Prisma**: Reliable, queryable data with migrations

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `m?stats` | Server overview (image) | `m?stats` |
| `m?me` | Your personal stats (image) | `m?me` |
| `m?top [days]` | Top users leaderboard (image) | `m?top 7` |
| `m?channels [days]` | Top channels | `m?channels 14` |
| `m?voice [days]` | Voice activity leaderboard | `m?voice 30` |
| `m?activity` | Hourly activity chart (image) | `m?activity` |
| `m?heatmap` | 7-day activity heatmap (image) | `m?heatmap` |
| `m?growth [days]` | Member growth stats | `m?growth 30` |
| `m?help` | Show all commands (image) | `m?help` |
| `m?config` | View/set guild config | `m?config prefix !` |
| `m?report add #channel daily` | Schedule auto-reports | |
| `m?report remove #channel` | Remove scheduled report | |
| `m?reset` | Reset all stats (owner only) | |
| `m?ping` | Check bot latency | |

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Discord bot token (with Message Content intent)

### Install

```bash
cd statbot
npm install

# Setup database
sudo -u postgres psql -c "CREATE USER statbot WITH PASSWORD 'statbot' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE statbot OWNER statbot;"

# Configure
cp .env.example .env
# Edit .env with your DISCORD_TOKEN

# Initialize database
npx prisma migrate dev --name init

# Build
npx tsc

# Run
npm start
```

### Environment Variables

```
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
DATABASE_URL=postgresql://statbot:statbot@localhost:5432/statbot
PREFIX=m?
TZ=UTC
```

### systemd Service

```ini
[Unit]
Description=StatBot
After=network.target postgresql.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/statbot
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Architecture

```
src/
├── index.ts              # Entry point, client setup, event routing
├── config.ts             # Environment config
├── database/index.ts     # Prisma client, upsert helpers
├── collectors/
│   ├── messages.ts       # MessageCreate → batch flush to DB
│   ├── voice.ts          # VoiceStateUpdate → session tracking
│   └── members.ts        # Member add/remove → daily aggregates
├── analytics/
│   └── queries.ts        # All database queries for stats
├── rendering/
│   ├── theme.ts          # Colors, fonts, card drawing, chart utils
│   ├── server-stats.ts   # Server overview image
│   ├── user-stats.ts     # Personal stats image
│   ├── top.ts            # Leaderboard image
│   ├── heatmap.ts        # Activity heatmap image
│   ├── activity.ts       # Hourly activity chart image
│   └── help.ts           # Help card image
├── commands/
│   └── index.ts          # Command registry + all command handlers
└── services/
    └── reports.ts        # Scheduled auto-report service
```

## Data Model

- **GuildDailyStats**: Daily message/voice/join/leave aggregates per guild
- **GuildHourlyStats**: Hourly message/voice aggregates per guild
- **UserDailyStats**: Per-user daily message/voice aggregates
- **ChannelStats**: Per-channel daily message aggregates
- **VoiceSession**: Individual voice sessions with duration
- **ReportConfig**: Scheduled report configurations

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Discord**: discord.js v14
- **Database**: PostgreSQL + Prisma ORM
- **Image Generation**: @napi-rs/canvas (prebuilt, no Cairo needed)
- **Logging**: pino
