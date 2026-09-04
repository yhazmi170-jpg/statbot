// Legacy StatBot data imported from /marlboro social
// Source: 14-day snapshot from previous StatBot installation
// Import key: legacy-statbot-marlboro-v1
// Voice stored as seconds (hours * 3600)

export const IMPORT_KEY = 'legacy-statbot-marlboro-v1';

export interface LegacyUserRecord {
  username: string;
  messages14d: number;
  voiceSeconds14d: number;
  messageRank?: number;
  voiceRank?: number;
}

// Merged from message leaderboard + voice leaderboard
// Users appearing in both lists get combined totals
export const LEGACY_USERS: LegacyUserRecord[] = [
  { username: 'berry05__',           messages14d: 9383, voiceSeconds14d: Math.round(5.70 * 3600),  messageRank: 1,  voiceRank: 15 },
  { username: 'bunnycatdpg',         messages14d: 8684, voiceSeconds14d: Math.round(107.45 * 3600), messageRank: 2,  voiceRank: 1 },
  { username: 'ninqz',               messages14d: 7643, voiceSeconds14d: 0,                        messageRank: 3 },
  { username: 'semeiological',       messages14d: 7607, voiceSeconds14d: 0,                        messageRank: 4 },
  { username: 'jafer09',             messages14d: 6505, voiceSeconds14d: Math.round(18.07 * 3600), messageRank: 5,  voiceRank: 3 },
  { username: 'flyingonlovefr',      messages14d: 6382, voiceSeconds14d: Math.round(12.90 * 3600), messageRank: 6,  voiceRank: 7 },
  { username: 'cryiin',              messages14d: 5496, voiceSeconds14d: 0,                        messageRank: 7 },
  { username: 'adorezaraa',          messages14d: 5098, voiceSeconds14d: Math.round(26.63 * 3600), messageRank: 8,  voiceRank: 2 },
  { username: 'explxin',             messages14d: 4973, voiceSeconds14d: Math.round(9.90 * 3600),  messageRank: 9,  voiceRank: 9 },
  { username: 'zaedynisded',         messages14d: 4663, voiceSeconds14d: Math.round(11.38 * 3600), messageRank: 10, voiceRank: 8 },
  { username: 'duckintsbitch',       messages14d: 4227, voiceSeconds14d: Math.round(9.53 * 3600),  messageRank: 11, voiceRank: 11 },
  { username: 'bitchseller',         messages14d: 3531, voiceSeconds14d: 0,                        messageRank: 12 },
  { username: '1_1aq',               messages14d: 3419, voiceSeconds14d: 0,                        messageRank: 13 },
  { username: 'yoishti',             messages14d: 3352, voiceSeconds14d: 0,                        messageRank: 14 },
  { username: 'aliyyevvv',           messages14d: 3284, voiceSeconds14d: 0,                        messageRank: 15 },
  { username: '.raxvq',              messages14d: 3257, voiceSeconds14d: 0,                        messageRank: 16 },
  { username: '.angel1c.d0ll',       messages14d: 3255, voiceSeconds14d: Math.round(5.87 * 3600),  messageRank: 17, voiceRank: 14 },
  { username: 'z2nx.',               messages14d: 3162, voiceSeconds14d: Math.round(5.68 * 3600),  messageRank: 18, voiceRank: 16 },
  { username: 'rezearcbrokeme',      messages14d: 3150, voiceSeconds14d: 0,                        messageRank: 19 },
  { username: 'yxx2',                messages14d: 3136, voiceSeconds14d: 0,                        messageRank: 20 },
  // Voice-only users (not in message top 20)
  { username: '.cursedkk',           messages14d: 0,    voiceSeconds14d: Math.round(17.63 * 3600), voiceRank: 4 },
  { username: 'zumilala',            messages14d: 0,    voiceSeconds14d: Math.round(17.45 * 3600), voiceRank: 5 },
  { username: 'prostatedestroyer__', messages14d: 0,    voiceSeconds14d: Math.round(13.28 * 3600), voiceRank: 6 },
  { username: 'wagec',               messages14d: 0,    voiceSeconds14d: Math.round(9.87 * 3600),  voiceRank: 10 },
  { username: 'drzxii',              messages14d: 0,    voiceSeconds14d: Math.round(6.88 * 3600),  voiceRank: 12 },
  { username: 'killsanji',           messages14d: 0,    voiceSeconds14d: Math.round(6.35 * 3600),  voiceRank: 13 },
  { username: 'presence.psl',        messages14d: 0,    voiceSeconds14d: Math.round(4.50 * 3600),  voiceRank: 17 },
  { username: 'dulcets.',            messages14d: 0,    voiceSeconds14d: Math.round(4.42 * 3600),  voiceRank: 18 },
  { username: 'litblvntz.',          messages14d: 0,    voiceSeconds14d: Math.round(4.23 * 3600),  voiceRank: 19 },
  { username: 'ibrahim_heh',         messages14d: 0,    voiceSeconds14d: Math.round(3.93 * 3600),  voiceRank: 20 },
];

export interface LegacyChannelRecord {
  channelName: string;
  messages14d: number;
  channelRank?: number;
  voiceChannelRank?: number;
  voiceSeconds14d?: number;
}

export const LEGACY_CHANNELS: LegacyChannelRecord[] = [
  // Message channels (ranked by message count, channel IDs unknown)
  { channelName: 'unknown-channel-1', messages14d: 70591, channelRank: 1 },
  { channelName: 'unknown-channel-2', messages14d: 54313, channelRank: 2 },
  { channelName: 'unknown-channel-3', messages14d: 26049, channelRank: 3 },
  // Voice channels (from snapshot names, IDs unknown)
  { channelName: 'zumilala\'s channel',     messages14d: 0, voiceSeconds14d: Math.round(20.28 * 3600), voiceChannelRank: 1 },
  { channelName: 'bunnycatdpg\'s channel',  messages14d: 0, voiceSeconds14d: Math.round(18.82 * 3600), voiceChannelRank: 2 },
  { channelName: 'bunnycatdpg\'s channel',  messages14d: 0, voiceSeconds14d: Math.round(18.27 * 3600), voiceChannelRank: 3 },
];
