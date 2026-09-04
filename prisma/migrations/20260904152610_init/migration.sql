-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "prefix" TEXT NOT NULL DEFAULT 'm?',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "ownerId" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "channelCount" INTEGER NOT NULL DEFAULT 0,
    "roleCount" INTEGER NOT NULL DEFAULT 0,
    "emojiCount" INTEGER NOT NULL DEFAULT 0,
    "boostLevel" INTEGER NOT NULL DEFAULT 0,
    "boostCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "guildId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GuildDailyStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "totalVoiceMs" BIGINT NOT NULL DEFAULT 0,
    "joins" INTEGER NOT NULL DEFAULT 0,
    "leaves" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuildDailyStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuildHourlyStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "hour" INTEGER NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "voiceMs" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "GuildHourlyStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserDailyStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "voiceMs" BIGINT NOT NULL DEFAULT 0,
    "topChannelId" TEXT,
    "topHour" INTEGER,
    CONSTRAINT "UserDailyStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserDailyStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChannelStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "voiceMs" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "ChannelStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoiceSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "durationMs" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "VoiceSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoiceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'weekly',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExcludedChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    CONSTRAINT "ExcludedChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExcludedRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "ExcludedRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Guild_ownerId_idx" ON "Guild"("ownerId");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "Channel_guildId_idx" ON "Channel"("guildId");

-- CreateIndex
CREATE INDEX "Channel_name_idx" ON "Channel"("name");

-- CreateIndex
CREATE INDEX "GuildDailyStats_guildId_date_idx" ON "GuildDailyStats"("guildId", "date");

-- CreateIndex
CREATE INDEX "GuildDailyStats_date_idx" ON "GuildDailyStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "GuildDailyStats_guildId_date_key" ON "GuildDailyStats"("guildId", "date");

-- CreateIndex
CREATE INDEX "GuildHourlyStats_guildId_date_idx" ON "GuildHourlyStats"("guildId", "date");

-- CreateIndex
CREATE INDEX "GuildHourlyStats_date_idx" ON "GuildHourlyStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "GuildHourlyStats_guildId_date_hour_key" ON "GuildHourlyStats"("guildId", "date", "hour");

-- CreateIndex
CREATE INDEX "UserDailyStats_guildId_userId_date_idx" ON "UserDailyStats"("guildId", "userId", "date");

-- CreateIndex
CREATE INDEX "UserDailyStats_guildId_date_idx" ON "UserDailyStats"("guildId", "date");

-- CreateIndex
CREATE INDEX "UserDailyStats_userId_date_idx" ON "UserDailyStats"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UserDailyStats_guildId_userId_date_key" ON "UserDailyStats"("guildId", "userId", "date");

-- CreateIndex
CREATE INDEX "ChannelStats_guildId_channelId_date_idx" ON "ChannelStats"("guildId", "channelId", "date");

-- CreateIndex
CREATE INDEX "ChannelStats_guildId_date_idx" ON "ChannelStats"("guildId", "date");

-- CreateIndex
CREATE INDEX "ChannelStats_channelId_date_idx" ON "ChannelStats"("channelId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelStats_guildId_channelId_date_key" ON "ChannelStats"("guildId", "channelId", "date");

-- CreateIndex
CREATE INDEX "VoiceSession_guildId_userId_startedAt_idx" ON "VoiceSession"("guildId", "userId", "startedAt");

-- CreateIndex
CREATE INDEX "VoiceSession_guildId_channelId_startedAt_idx" ON "VoiceSession"("guildId", "channelId", "startedAt");

-- CreateIndex
CREATE INDEX "VoiceSession_startedAt_idx" ON "VoiceSession"("startedAt");

-- CreateIndex
CREATE INDEX "VoiceSession_guildId_startedAt_idx" ON "VoiceSession"("guildId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportConfig_guildId_channelId_key" ON "ReportConfig"("guildId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "ExcludedChannel_guildId_channelId_key" ON "ExcludedChannel"("guildId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "ExcludedRole_guildId_roleId_key" ON "ExcludedRole"("guildId", "roleId");
