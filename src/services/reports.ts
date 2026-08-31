import { Client, TextChannel, AttachmentBuilder } from 'discord.js';
import { prisma, log } from '../database/index.js';
import * as queries from '../analytics/queries.js';
import { renderServerStats } from '../rendering/server-stats.js';

export async function startReportService(client: Client) {
  // Check every hour for due reports
  setInterval(async () => {
    try {
      const now = new Date();
      const reports = await prisma.reportConfig.findMany({
        where: { enabled: true },
      });

      for (const report of reports) {
        const shouldRun = !report.lastRun || isDue(report.lastRun, report.interval, now);
        if (!shouldRun) continue;

        await sendReport(client, report);
        await prisma.reportConfig.update({
          where: { id: report.id },
          data: { lastRun: now },
        });
      }
    } catch (err) {
      log.error({ err }, 'Error in report service');
    }
  }, 60 * 60 * 1000); // Check hourly
}

function isDue(lastRun: Date, interval: string, now: Date): boolean {
  const diff = now.getTime() - lastRun.getTime();
  const DAY = 86400000;
  switch (interval) {
    case 'daily': return diff >= DAY;
    case 'weekly': return diff >= 7 * DAY;
    case 'monthly': return diff >= 30 * DAY;
    default: return false;
  }
}

async function sendReport(client: Client, report: any) {
  try {
    const channel = await client.channels.fetch(report.channelId);
    if (!channel || !('send' in channel)) return;

    const guildStats = await queries.getServerStats(report.guildId, report.interval === 'daily' ? 1 : report.interval === 'weekly' ? 7 : 30);
    const guild = await prisma.guild.findUnique({ where: { id: report.guildId } });
    const hourlyByDay = await queries.getActivityHeatmap(report.guildId, 7);

    const buf = await renderServerStats({
      guild: { name: guild?.name || 'Server', memberCount: guild?.memberCount || 0 },
      ...guildStats,
      hourlyByDay,
    });

    await (channel as TextChannel).send({
      content: `📊 **${report.interval.charAt(0).toUpperCase() + report.interval.slice(1)} Report**`,
      files: [new AttachmentBuilder(buf, { name: `${report.interval}-report.png` })],
    });

    log.info({ guildId: report.guildId, channel: report.channelId }, 'Report sent');
  } catch (err) {
    log.error({ err, report }, 'Failed to send report');
  }
}

export async function addReportConfig(guildId: string, channelId: string, interval: string) {
  return prisma.reportConfig.upsert({
    where: { guildId_channelId: { guildId, channelId } },
    create: { guildId, channelId, interval },
    update: { interval, enabled: true },
  });
}

export async function removeReportConfig(guildId: string, channelId: string) {
  return prisma.reportConfig.deleteMany({ where: { guildId, channelId } });
}
