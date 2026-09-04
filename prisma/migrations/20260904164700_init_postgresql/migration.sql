-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "guildId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildDailyStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "totalVoiceMs" BIGINT NOT NULL DEFAULT 0,
    "joins" INTEGER NOT NULL DEFAULT 0,
    "leaves" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildDailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildHourlyStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hour" INTEGER NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "voiceMs" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "GuildHourlyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDailyStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "voiceMs" BIGINT NOT NULL DEFAULT 0,
    "topChannelId" TEXT,
    "topHour" INTEGER,

    CONSTRAINT "UserDailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "voiceMs" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "ChannelStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSession" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "VoiceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'weekly',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcludedChannel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "ExcludedChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcludedRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "ExcludedRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyUserStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT,
    "importedUsername" TEXT NOT NULL,
    "messageCount14d" INTEGER NOT NULL DEFAULT 0,
    "voiceSeconds14d" INTEGER NOT NULL DEFAULT 0,
    "messageRank" INTEGER,
    "voiceRank" INTEGER,
    "linked" BOOLEAN NOT NULL DEFAULT false,
    "importKey" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'legacy-statbot',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyUserStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyChannelStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "channelName" TEXT NOT NULL,
    "channelType" TEXT NOT NULL DEFAULT 'text',
    "messageCount14d" INTEGER NOT NULL DEFAULT 0,
    "voiceSeconds14d" INTEGER NOT NULL DEFAULT 0,
    "channelRank" INTEGER,
    "voiceChannelRank" INTEGER,
    "linked" BOOLEAN NOT NULL DEFAULT false,
    "importKey" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'legacy-statbot',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyChannelStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "importKey" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "LegacyUserStats_guildId_discordUserId_idx" ON "LegacyUserStats"("guildId", "discordUserId");

-- CreateIndex
CREATE INDEX "LegacyUserStats_guildId_linked_idx" ON "LegacyUserStats"("guildId", "linked");

-- CreateIndex
CREATE INDEX "LegacyUserStats_importKey_idx" ON "LegacyUserStats"("importKey");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyUserStats_guildId_importedUsername_importKey_key" ON "LegacyUserStats"("guildId", "importedUsername", "importKey");

-- CreateIndex
CREATE INDEX "LegacyChannelStats_guildId_linked_idx" ON "LegacyChannelStats"("guildId", "linked");

-- CreateIndex
CREATE INDEX "LegacyChannelStats_importKey_idx" ON "LegacyChannelStats"("importKey");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyChannelStats_guildId_channelName_importKey_key" ON "LegacyChannelStats"("guildId", "channelName", "importKey");

-- CreateIndex
CREATE UNIQUE INDEX "ImportLog_importKey_guildId_key" ON "ImportLog"("importKey", "guildId");

-- AddForeignKey
ALTER TABLE "GuildDailyStats" ADD CONSTRAINT "GuildDailyStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildHourlyStats" ADD CONSTRAINT "GuildHourlyStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyStats" ADD CONSTRAINT "UserDailyStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyStats" ADD CONSTRAINT "UserDailyStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelStats" ADD CONSTRAINT "ChannelStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportConfig" ADD CONSTRAINT "ReportConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcludedChannel" ADD CONSTRAINT "ExcludedChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcludedRole" ADD CONSTRAINT "ExcludedRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

