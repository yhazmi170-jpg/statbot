// Fake data generator — produces internally consistent random datasets

const USERNAMES = [
  'bunnycatdpg', 'ninqz', 'semeiological', 'xqlusive', 'hazey',
  'reverie', 'soniq', 'zephyr', 'luxferre', 'cyntax',
  'kori', 'drift', 'neonvibe', 'astral', 'emberly',
  'solstice', 'phnx', 'riven', 'vexis', 'luminae',
  'cl0ud', 'miist', 'ryze', 'synth', 'voltex',
  'prism', 'echo', 'blitz', 'nova', 'aether',
];

const CHANNEL_NAMES = [
  'chat', 'general', 'media', 'gaming', 'off-topic',
  'memes', 'music', 'art', 'dev', 'bot-commands',
  'voice-chat', 'announcements', 'rules', 'introductions', 'spam',
];

const DAYS_14 = Array.from({ length: 14 }, (_, i) => String(i + 1));
const DAYS_30 = Array.from({ length: 30 }, (_, i) => String(i + 1));
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function weightedHourly(): number[] {
  // Realistic Discord activity curve: low 0-7, ramp 8-12, dip 13-14, peak 18-22
  const base = [
    5, 3, 2, 1, 1, 2, 4, 8,
    15, 22, 28, 30, 25, 20, 22, 28,
    35, 42, 50, 55, 48, 38, 25, 15,
  ];
  return base.map(v => Math.max(0, v + rand(-5, 5)));
}

export interface FakeServerData {
  guildName: string;
  period: string;
  memberCount: number;
  totalMessages: number;
  totalVoiceMs: number;
  uniqueUsers: number;
  joins: number;
  leaves: number;
  peakHour: string;
  peakDay: string;
  topUsers: { userId: string; messages: number }[];
  topChannels: { channelId: string; messages: number }[];
  dailyMessages: number[];
  hourlyByDay: number[][];
  growthPct: number;
  prevMessages: number;
}

export function generateFakeServer(): FakeServerData {
  const memberCount = rand(1800, 4500);
  const uniqueUsers = rand(Math.floor(memberCount * 0.3), Math.floor(memberCount * 0.65));
  const totalMessages = rand(45000, 120000);
  const totalVoiceMs = rand(200000000, 900000000); // 55h – 250h
  const joins = rand(80, 350);
  const leaves = rand(20, Math.floor(joins * 0.6));
  const growthPct = parseFloat((((joins - leaves) / memberCount) * 100).toFixed(1));
  const prevMessages = rand(Math.floor(totalMessages * 0.75), Math.floor(totalMessages * 1.15));

  // Generate daily breakdown that sums to totalMessages
  const dailyWeights = Array.from({ length: 14 }, () => rand(40, 120));
  const dailyWeightSum = dailyWeights.reduce((s, w) => s + w, 0);
  const dailyMessages = dailyWeights.map(w => Math.round((w / dailyWeightSum) * totalMessages));
  // Fix rounding
  const diff = totalMessages - dailyMessages.reduce((s, v) => s + v, 0);
  dailyMessages[0] += diff;

  // Generate heatmap (7 x 24)
  const hourlyByDay: number[][] = [];
  for (let d = 0; d < 7; d++) {
    const hourWeights = weightedHourly();
    const dayTotal = dailyMessages[Math.floor(d * 2)] || rand(2000, 8000);
    const hwSum = hourWeights.reduce((s, v) => s + v, 0);
    hourlyByDay.push(hourWeights.map(v => Math.round((v / hwSum) * dayTotal)));
  }

  // Find peak
  const hourTotals = Array(24).fill(0);
  for (const day of hourlyByDay) for (let h = 0; h < 24; h++) hourTotals[h] += day[h];
  const peakHour = hourTotals.indexOf(Math.max(...hourTotals));
  const dayTotals = hourlyByDay.map(d => d.reduce((s, v) => s + v, 0));
  const peakDayIdx = dayTotals.indexOf(Math.max(...dayTotals));

  // Top users (must sum to less than totalMessages)
  const usernames = shuffle([...USERNAMES]).slice(0, 10);
  const userMsgs: number[] = [];
  let remaining = totalMessages;
  for (let i = 0; i < 10; i++) {
    const maxForUser = Math.floor(remaining * (0.25 - i * 0.02));
    const minForUser = Math.floor(maxForUser * 0.4);
    const msgs = rand(Math.max(minForUser, 100), Math.max(maxForUser, 200));
    userMsgs.push(msgs);
    remaining -= msgs;
  }
  const topUsers = usernames.map((name, i) => ({ userId: name, messages: userMsgs[i] }));

  // Top channels
  const channels = shuffle([...CHANNEL_NAMES]).slice(0, 8);
  const channelMsgs: number[] = [];
  let chRemaining = totalMessages;
  for (let i = 0; i < 8; i++) {
    const maxForCh = Math.floor(chRemaining * (0.35 - i * 0.03));
    const minForCh = Math.floor(maxForCh * 0.3);
    const msgs = rand(Math.max(minForCh, 200), Math.max(maxForCh, 500));
    channelMsgs.push(msgs);
    chRemaining -= msgs;
  }
  const topChannels = channels.map((name, i) => ({ channelId: name, messages: channelMsgs[i] }));

  return {
    guildName: '/marlboro social',
    period: 'Last 14 Days',
    memberCount,
    totalMessages,
    totalVoiceMs,
    uniqueUsers,
    joins,
    leaves,
    peakHour: `${String(peakHour).padStart(2, '0')}:00`,
    peakDay: WEEKDAYS[peakDayIdx],
    topUsers,
    topChannels,
    dailyMessages,
    hourlyByDay,
    growthPct,
    prevMessages,
  };
}

export interface FakeUserData {
  username: string;
  rank: number;
  totalMembers: number;
  totalMessages: number;
  totalVoiceMs: number;
  voiceSessions: number;
  activeDays: number;
  totalDays: number;
  topChannels: { channelId: string; messages: number }[];
  dailyMessages: number[];
  weekdayMessages: number[];
  hourlyMessages: number[];
  percentile: number;
  msgsThisWeek: number;
  msgsThisMonth: number;
  voiceThisWeek: number;
  voiceThisMonth: number;
}

export function generateFakeUser(username?: string): FakeUserData {
  const name = username || pick(USERNAMES);
  const totalMembers = rand(1800, 4500);
  const rank = rand(2, 30);
  const percentile = Math.round(((totalMembers - rank) / totalMembers) * 100);
  const totalMessages = rand(3000, 15000);
  const totalVoiceMs = rand(36000000, 300000000); // 10h – 83h
  const voiceSessions = rand(15, 120);
  const activeDays = rand(8, 14);
  const totalDays = 30;

  // Daily messages (30 days) that sum to totalMessages
  const dailyWeights = Array.from({ length: 30 }, () => rand(20, 100));
  const dwSum = dailyWeights.reduce((s, w) => s + w, 0);
  const dailyMessages = dailyWeights.map(w => Math.round((w / dwSum) * totalMessages));
  const diff = totalMessages - dailyMessages.reduce((s, v) => s + v, 0);
  dailyMessages[0] += diff;

  // Weekday aggregation
  const weekdayMessages = Array(7).fill(0);
  for (let i = 0; i < 30; i++) {
    const dow = new Date(2026, 7, i + 1).getDay();
    const idx = dow === 0 ? 6 : dow - 1;
    weekdayMessages[idx] += dailyMessages[i];
  }

  // Hourly distribution
  const hourlyMessages = weightedHourly().map(v => Math.round(v * (totalMessages / 500)));

  // Top channels
  const channels = shuffle([...CHANNEL_NAMES]).slice(0, 6);
  const channelMsgs: number[] = [];
  let chRemaining = totalMessages;
  for (let i = 0; i < 6; i++) {
    const maxForCh = Math.floor(chRemaining * (0.3 - i * 0.03));
    const minForCh = Math.floor(maxForCh * 0.3);
    const msgs = rand(Math.max(minForCh, 50), Math.max(maxForCh, 100));
    channelMsgs.push(msgs);
    chRemaining -= msgs;
  }
  const topChannels = channels.map((ch, i) => ({ channelId: ch, messages: channelMsgs[i] }));

  const msgsThisWeek = dailyMessages.slice(-7).reduce((s, v) => s + v, 0);
  const msgsThisMonth = totalMessages;
  const voiceThisWeek = Math.floor(totalVoiceMs * 0.25);
  const voiceThisMonth = totalVoiceMs;

  return {
    username: name,
    rank,
    totalMembers,
    totalMessages,
    totalVoiceMs,
    voiceSessions,
    activeDays,
    totalDays,
    topChannels,
    dailyMessages,
    weekdayMessages,
    hourlyMessages,
    percentile,
    msgsThisWeek,
    msgsThisMonth,
    voiceThisWeek,
    voiceThisMonth,
  };
}

export interface FakeReportData {
  guildName: string;
  period: string;
  totalMessages: number;
  totalVoiceMs: number;
  uniqueUsers: number;
  joins: number;
  leaves: number;
  peakHour: string;
  peakDay: string;
  topUsers: { userId: string; messages: number }[];
  topChannels: { channelId: string; messages: number }[];
  dailyMessages: number[];
  hourlyByDay: number[][];
  prevMessages: number;
  prevVoiceMs: number;
}

export function generateFakeReport(type: 'weekly' | 'monthly'): FakeReportData {
  const days = type === 'weekly' ? 7 : 30;
  const scaleFactor = type === 'weekly' ? 1 : 4;

  const totalMessages = rand(8000 * scaleFactor, 25000 * scaleFactor);
  const totalVoiceMs = rand(50000000 * scaleFactor, 200000000 * scaleFactor);
  const uniqueUsers = rand(200, 800);
  const joins = rand(20 * scaleFactor, 100 * scaleFactor);
  const leaves = rand(5 * scaleFactor, Math.floor(joins * 0.5));
  const prevMessages = rand(Math.floor(totalMessages * 0.8), Math.floor(totalMessages * 1.2));
  const prevVoiceMs = rand(Math.floor(totalVoiceMs * 0.8), Math.floor(totalVoiceMs * 1.2));

  // Daily breakdown
  const dailyWeights = Array.from({ length: days }, () => rand(40, 120));
  const dwSum = dailyWeights.reduce((s, w) => s + w, 0);
  const dailyMessages = dailyWeights.map(w => Math.round((w / dwSum) * totalMessages));
  const diff = totalMessages - dailyMessages.reduce((s, v) => s + v, 0);
  dailyMessages[0] += diff;

  // Heatmap
  const hourlyByDay: number[][] = [];
  for (let d = 0; d < 7; d++) {
    const hourWeights = weightedHourly();
    const dayTotal = dailyMessages[Math.min(d, days - 1)] || rand(1000, 5000);
    const hwSum = hourWeights.reduce((s, v) => s + v, 0);
    hourlyByDay.push(hourWeights.map(v => Math.round((v / hwSum) * dayTotal)));
  }

  const hourTotals = Array(24).fill(0);
  for (const day of hourlyByDay) for (let h = 0; h < 24; h++) hourTotals[h] += day[h];
  const peakHour = hourTotals.indexOf(Math.max(...hourTotals));
  const dayTotals = hourlyByDay.map(d => d.reduce((s, v) => s + v, 0));
  const peakDayIdx = dayTotals.indexOf(Math.max(...dayTotals));

  // Top users
  const usernames = shuffle([...USERNAMES]).slice(0, 10);
  const userMsgs: number[] = [];
  let remaining = totalMessages;
  for (let i = 0; i < 10; i++) {
    const maxForUser = Math.floor(remaining * (0.25 - i * 0.02));
    const minForUser = Math.floor(maxForUser * 0.4);
    const msgs = rand(Math.max(minForUser, 100), Math.max(maxForUser, 200));
    userMsgs.push(msgs);
    remaining -= msgs;
  }
  const topUsers = usernames.map((name, i) => ({ userId: name, messages: userMsgs[i] }));

  // Top channels
  const channels = shuffle([...CHANNEL_NAMES]).slice(0, 8);
  const channelMsgs: number[] = [];
  let chRemaining = totalMessages;
  for (let i = 0; i < 8; i++) {
    const maxForCh = Math.floor(chRemaining * (0.35 - i * 0.03));
    const minForCh = Math.floor(maxForCh * 0.3);
    const msgs = rand(Math.max(minForCh, 200), Math.max(maxForCh, 500));
    channelMsgs.push(msgs);
    chRemaining -= msgs;
  }
  const topChannels = channels.map((name, i) => ({ channelId: name, messages: channelMsgs[i] }));

  return {
    guildName: '/marlboro social',
    period: type === 'weekly' ? 'Weekly' : 'Monthly',
    totalMessages,
    totalVoiceMs,
    uniqueUsers,
    joins,
    leaves,
    peakHour: `${String(peakHour).padStart(2, '0')}:00`,
    peakDay: WEEKDAYS[peakDayIdx],
    topUsers,
    topChannels,
    dailyMessages,
    hourlyByDay,
    prevMessages,
    prevVoiceMs,
  };
}
