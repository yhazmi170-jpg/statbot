-- CreateTable
CREATE TABLE "LegacyUserStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LegacyChannelStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importKey" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
