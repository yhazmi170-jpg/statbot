// Pure, dependency-free consistency helpers for the user-card data pipeline.
// Imported by src/analytics/window-stats.ts and by the regression check
// (src/checks/window-consistency.ts) which runs WITHOUT a database.

export interface WindowUser {
  userId: string;
  messages: number;
  voiceMs: number;
}

export interface WindowChannel {
  channelId: string;
  messages: number;
}

export interface WindowCard {
  windowLabel: string;
  windowSince: Date;
  messages: number;
  voiceMs: number;
  rank: number | null;
  rankingPopulation: number;
  topPercent: number | null;
  activeUserCount: number;
  serverTotalMessages: number;
  channels: WindowChannel[];
  channelMessagesTotal: number;
}

export function topPercent(rank: number | null, population: number): number | null {
  if (rank === null || rank < 1 || population < 1) return null;
  return Math.ceil((rank / population) * 100);
}

export function computeWindowCard(
  users: WindowUser[],
  targetId: string,
  opts: { activeUserCount: number; serverTotalMessages: number },
): Pick<WindowCard, 'messages' | 'voiceMs' | 'rank' | 'rankingPopulation' | 'topPercent' | 'activeUserCount' | 'serverTotalMessages'> {
  const idx = users.findIndex(u => u.userId === targetId);
  const entry = idx >= 0 ? users[idx] : null;
  const rankingPopulation = users.length;
  const rank = entry ? idx + 1 : null;
  return {
    messages: entry?.messages ?? 0,
    voiceMs: entry?.voiceMs ?? 0,
    rank,
    rankingPopulation,
    topPercent: topPercent(rank, rankingPopulation),
    activeUserCount: opts.activeUserCount,
    serverTotalMessages: opts.serverTotalMessages,
  };
}

export interface CardValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateUserCard(card: WindowCard, leaderboardMessages: number): CardValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (card.messages > 0 && card.messages > card.serverTotalMessages) {
    errors.push(`user messages (${card.messages}) exceed server messages (${card.serverTotalMessages}) - impossible`);
  }
  if (card.messages !== leaderboardMessages) {
    errors.push(
      `user card messages (${card.messages}) diverge from leaderboard entry (${leaderboardMessages}) - data sources are inconsistent`,
    );
  }
  if (card.rank === null) {
    if (card.messages > 0) {
      errors.push(`rank is null but messages=${card.messages} - target not found in ranked dataset`);
    }
  } else if (card.rank < 1 || card.rank > card.rankingPopulation) {
    errors.push(`rank ${card.rank} outside ranked population 1..${card.rankingPopulation}`);
  }
  if (card.topPercent !== null && (card.topPercent < 1 || card.topPercent > 100)) {
    errors.push(`top ${card.topPercent}% outside 1..100`);
  }
  if (card.activeUserCount < card.rankingPopulation) {
    warnings.push(`active users (${card.activeUserCount}) smaller than ranked population (${card.rankingPopulation})`);
  }
  const sorted = card.channels.every((c, i) => i === 0 || card.channels[i - 1].messages >= c.messages);
  if (!sorted) {
    warnings.push('channel list is not sorted by messages desc');
  }
  if (card.channelMessagesTotal > card.messages) {
    errors.push(`channel messages (${card.channelMessagesTotal}) exceed user messages (${card.messages}) - impossible`);
  } else if (card.channelMessagesTotal < card.messages) {
    warnings.push(`channel messages (${card.channelMessagesTotal}) trail user messages (${card.messages}) - historical channel data pending`);
  }

  return { ok: errors.length === 0, errors, warnings };
}