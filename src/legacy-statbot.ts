// Legacy StatBot data imported from /marlboro social
// Source: 14-day snapshot from previous StatBot installation
// Import key: legacy-statbot-marlboro-v3
// Voice stored as seconds (hours * 3600)

export const IMPORT_KEY = 'legacy-statbot-marlboro-v3';

export interface LegacyUserRecord {
  discordUserId: string | null;
  importedUsername: string;
  messageCount14d: number;
  voiceSeconds14d: number;
  messageRank?: number;
  voiceRank?: number;
}

// Merged from message leaderboard + voice leaderboard
// Users appearing in both lists get combined totals
export const LEGACY_USERS: LegacyUserRecord[] = [
  // Message leaderboard users (with message rank)
  { discordUserId: '1469399552518918216', importedUsername: 'berry05__',           messageCount14d: 9383,  voiceSeconds14d: Math.round(5.70  * 3600), messageRank: 1,  voiceRank: 15 },
  { discordUserId: '1410273099336782016', importedUsername: 'bunnycatdpg',         messageCount14d: 8684,  voiceSeconds14d: Math.round(107.45 * 3600), messageRank: 2,  voiceRank: 1  },
  { discordUserId: '1532800493632491610', importedUsername: 'ninqz',               messageCount14d: 7643,  voiceSeconds14d: 0,                        messageRank: 3 },
  { discordUserId: '1092161180900008126', importedUsername: 'semeiological',       messageCount14d: 7607,  voiceSeconds14d: 0,                        messageRank: 4 },
  { discordUserId: '1477368200218939526', importedUsername: 'jafer09',             messageCount14d: 6505,  voiceSeconds14d: Math.round(18.07 * 3600), messageRank: 5,  voiceRank: 3  },
  { discordUserId: '1403284736071172137', importedUsername: 'flyingonlovefr',      messageCount14d: 6382,  voiceSeconds14d: Math.round(12.90 * 3600), messageRank: 6,  voiceRank: 7  },
  { discordUserId: '1395109398350659704', importedUsername: 'cryiin',              messageCount14d: 5496,  voiceSeconds14d: 0,                        messageRank: 7 },
  { discordUserId: '1449230712770400368', importedUsername: 'adorezaraa',          messageCount14d: 5098,  voiceSeconds14d: Math.round(26.63 * 3600), messageRank: 8,  voiceRank: 2  },
  { discordUserId: '1449949229349867663', importedUsername: 'explxin',             messageCount14d: 4973,  voiceSeconds14d: Math.round(9.90  * 3600), messageRank: 9,  voiceRank: 9  },
  { discordUserId: '1345249554492297311', importedUsername: 'zaedynisded',         messageCount14d: 4663,  voiceSeconds14d: Math.round(11.38 * 3600), messageRank: 10, voiceRank: 8  },
  { discordUserId: '1534252833745145877', importedUsername: 'duckintsbitch',       messageCount14d: 4227,  voiceSeconds14d: Math.round(9.53  * 3600), messageRank: 11, voiceRank: 11 },
  { discordUserId: '1129779470107164724', importedUsername: 'bitchseller',         messageCount14d: 3531,  voiceSeconds14d: 0,                        messageRank: 12 },
  { discordUserId: '1518469610335244339', importedUsername: '1_1aq',               messageCount14d: 3419,  voiceSeconds14d: 0,                        messageRank: 13 },
  { discordUserId: '1501011018762158233', importedUsername: 'yoishti',             messageCount14d: 3352,  voiceSeconds14d: 0,                        messageRank: 14 },
  { discordUserId: '737712511306039328',  importedUsername: 'aliyyevvv',           messageCount14d: 3284,  voiceSeconds14d: 0,                        messageRank: 15 },
  { discordUserId: '1499773600696107029', importedUsername: '.raxvq',              messageCount14d: 3257,  voiceSeconds14d: 0,                        messageRank: 16 },
  { discordUserId: '1440068116238438671', importedUsername: '.angel1c.d0ll',       messageCount14d: 3255,  voiceSeconds14d: Math.round(5.87  * 3600), messageRank: 17, voiceRank: 14 },
  { discordUserId: null,                  importedUsername: 'z2nx.',               messageCount14d: 3162,  voiceSeconds14d: Math.round(5.68  * 3600), messageRank: 18, voiceRank: 16 },
  { discordUserId: '717486731691163648',  importedUsername: 'rezearcbrokeme',      messageCount14d: 3150,  voiceSeconds14d: 0,                        messageRank: 19 },
  { discordUserId: '536278876247162882',  importedUsername: 'yxx2',                messageCount14d: 3136,  voiceSeconds14d: 0,                        messageRank: 20 },

  // Voice-only users (not in message top 20)
  { discordUserId: '1421728770833911910', importedUsername: '.cursedkk',           messageCount14d: 0,     voiceSeconds14d: Math.round(17.63 * 3600), voiceRank: 4  },
  { discordUserId: '1227687938716995659', importedUsername: 'zumilala',            messageCount14d: 0,     voiceSeconds14d: Math.round(17.45 * 3600), voiceRank: 5  },
  { discordUserId: '1209936003276734465', importedUsername: 'prostatedestroyer__', messageCount14d: 0,     voiceSeconds14d: Math.round(13.28 * 3600), voiceRank: 6  },
  { discordUserId: '1129598974815371314', importedUsername: 'wagec',               messageCount14d: 0,     voiceSeconds14d: Math.round(9.87  * 3600), voiceRank: 10 },
  { discordUserId: '1087508686206935101', importedUsername: 'drzxii',              messageCount14d: 0,     voiceSeconds14d: Math.round(6.88  * 3600), voiceRank: 12 },
  { discordUserId: '1298250485979021384', importedUsername: 'killsanji',           messageCount14d: 0,     voiceSeconds14d: Math.round(6.35  * 3600), voiceRank: 13 },
  { discordUserId: '1440068116238438671', importedUsername: '.angel1c.d0ll',       messageCount14d: 0,     voiceSeconds14d: Math.round(5.87  * 3600), voiceRank: 14 },
  { discordUserId: '1469399552518918216', importedUsername: 'berry05__',           messageCount14d: 0,     voiceSeconds14d: Math.round(5.70  * 3600), voiceRank: 15 },
  { discordUserId: null,                  importedUsername: 'z2nx.',               messageCount14d: 0,     voiceSeconds14d: Math.round(5.68  * 3600), voiceRank: 16 },
  { discordUserId: '1493047021991628901', importedUsername: 'presence.psl',        messageCount14d: 0,     voiceSeconds14d: Math.round(4.50  * 3600), voiceRank: 17 },
  { discordUserId: '1012880393042669628', importedUsername: 'dulcets.',            messageCount14d: 0,     voiceSeconds14d: Math.round(4.42  * 3600), voiceRank: 18 },
  { discordUserId: '1163215701675348090', importedUsername: 'litblvntz.',          messageCount14d: 0,     voiceSeconds14d: Math.round(4.23  * 3600), voiceRank: 19 },
  { discordUserId: '1128099249159163976', importedUsername: 'ibrahim_heh',         messageCount14d: 0,     voiceSeconds14d: Math.round(3.93  * 3600), voiceRank: 20 },
];

export interface LegacyChannelRecord {
  channelName: string;
  messageCount14d: number;
  channelRank?: number;
  voiceChannelRank?: number;
  voiceSeconds14d?: number;
}

export const LEGACY_CHANNELS: LegacyChannelRecord[] = [
  // Message channels (ranked by message count, channel IDs unknown)
  { channelName: 'unknown-channel-1', messageCount14d: 70591, channelRank: 1 },
  { channelName: 'unknown-channel-2', messageCount14d: 54313, channelRank: 2 },
  { channelName: 'unknown-channel-3', messageCount14d: 26049, channelRank: 3 },
  // Voice channels (from snapshot names, IDs unknown)
  { channelName: "zumilala's channel",     messageCount14d: 0, voiceSeconds14d: Math.round(20.28 * 3600), voiceChannelRank: 1 },
  { channelName: "bunnycatdpg's channel",  messageCount14d: 0, voiceSeconds14d: Math.round(18.82 * 3600), voiceChannelRank: 2 },
  { channelName: "bunnycatdpg's channel",  messageCount14d: 0, voiceSeconds14d: Math.round(18.27 * 3600), voiceChannelRank: 3 },
];