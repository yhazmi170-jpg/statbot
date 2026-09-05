-- CreateTable
CREATE TABLE "UserChannelStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserChannelStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserHourlyStats" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hour" INTEGER NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserHourlyStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserChannelStats_guildId_userId_date_idx" ON "UserChannelStats"("guildId", "userId", "date");

-- CreateIndex
CREATE INDEX "UserChannelStats_guildId_channelId_date_idx" ON "UserChannelStats"("guildId", "channelId", "date");

-- CreateIndex
CREATE INDEX "UserChannelStats_guildId_date_idx" ON "UserChannelStats"("guildId", "date");

-- CreateIndex
CREATE INDEX "UserChannelStats_userId_date_idx" ON "UserChannelStats"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UserChannelStats_guildId_userId_channelId_date_key" ON "UserChannelStats"("guildId", "userId", "channelId", "date");

-- CreateIndex
CREATE INDEX "UserHourlyStats_guildId_userId_date_idx" ON "UserHourlyStats"("guildId", "userId", "date");

-- CreateIndex
CREATE INDEX "UserHourlyStats_guildId_date_idx" ON "UserHourlyStats"("guildId", "date");

-- CreateIndex
CREATE INDEX "UserHourlyStats_userId_date_idx" ON "UserHourlyStats"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UserHourlyStats_guildId_userId_date_hour_key" ON "UserHourlyStats"("guildId", "userId", "date", "hour");

-- AddForeignKey
ALTER TABLE "UserChannelStats" ADD CONSTRAINT "UserChannelStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChannelStats" ADD CONSTRAINT "UserChannelStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChannelStats" ADD CONSTRAINT "UserChannelStats_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHourlyStats" ADD CONSTRAINT "UserHourlyStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHourlyStats" ADD CONSTRAINT "UserHourlyStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;