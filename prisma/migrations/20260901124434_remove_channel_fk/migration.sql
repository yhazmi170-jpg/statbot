-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChannelStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "voiceMs" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "ChannelStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChannelStats" ("channelId", "date", "guildId", "id", "messages", "uniqueUsers", "voiceMs") SELECT "channelId", "date", "guildId", "id", "messages", "uniqueUsers", "voiceMs" FROM "ChannelStats";
DROP TABLE "ChannelStats";
ALTER TABLE "new_ChannelStats" RENAME TO "ChannelStats";
CREATE INDEX "ChannelStats_guildId_channelId_date_idx" ON "ChannelStats"("guildId", "channelId", "date");
CREATE INDEX "ChannelStats_guildId_date_idx" ON "ChannelStats"("guildId", "date");
CREATE UNIQUE INDEX "ChannelStats_guildId_channelId_date_key" ON "ChannelStats"("guildId", "channelId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
