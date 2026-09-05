// Regression check for the user-card data pipeline (no DB required).
// Run: npx tsx src/checks/window-consistency.ts
//
// Guards the exact scenario that previously produced card=3,519 while the
// leaderboard said 382: a user card MUST equal the m?top leaderboard entry
// for the same window, and validation must HARD-FAIL if legacy data is ever
// added back into a 14-day window.

import { topPercent, computeWindowCard, validateUserCard } from '../analytics/consistency.js';

let failures = 0;
const totalStart = Date.now();

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// User's exact fixture: server total 3357, active users 80, leaderboard
// nini 446 / 270K Max 382 / p.le 353.
const fixtureUsers = [
  { userId: 'nini', messages: 446, voiceMs: 0 },
  { userId: '270K Max', messages: 382, voiceMs: 0 },
  { userId: 'p.le', messages: 353, voiceMs: 0 },
];

console.log('Scenario 1: 270K Max in 3-user fixture');
const card = computeWindowCard(fixtureUsers, '270K Max', { activeUserCount: 80, serverTotalMessages: 3357 });
check('card messages == leaderboard entry (382)', card.messages === 382, `got ${card.messages}`);
check('rank == 2', card.rank === 2, `got ${card.rank}`);
check('rankingPopulation == fixture length (3)', card.rankingPopulation === 3, `got ${card.rankingPopulation}`);
check('topPercent = ceil(2/3*100) = 67', card.topPercent === 67, `got ${card.topPercent}`);

console.log('Scenario 2: real population (rank 2 of 78)');
check('topPercent = ceil(2/78*100) = 3', topPercent(2, 78) === 3, `got ${topPercent(2, 78)}`);
check('messages <= server total (382 <= 3357)', card.messages <= 3357);

console.log('Scenario 3: validation accepts an identical card');
const windowCard = {
  windowLabel: 'Last 14 Days',
  windowSince: new Date(),
  messages: card.messages,
  voiceMs: 0,
  rank: card.rank,
  rankingPopulation: card.rankingPopulation,
  topPercent: card.topPercent,
  activeUserCount: 80,
  serverTotalMessages: 3357,
  channels: [] as { channelId: string; messages: number }[],
  channelMessagesTotal: 0,
};
const ok = validateUserCard(windowCard, 382);
check('ok on identical data', ok.ok === true, ok.errors.join(' | '));
check('ranked population <= active users (78 <= 80)', card.rankingPopulation <= 80);

console.log('Scenario 4: validation HARD-FAILS if legacy is re-added (3,519)');
const broken = validateUserCard({ ...windowCard, messages: 3519, channelMessagesTotal: 0 }, 382);
check('fails when card != leaderboard entry', broken.ok === false, 'should have failed');
check('error mentions leaderboard divergence', broken.errors.some(e => e.includes('diverge')));

console.log('Scenario 5: validation fails on impossible counts');
const impossible = validateUserCard({ ...windowCard, messages: 5000, channelMessagesTotal: 0 }, 5000);
check('fails when messages exceed server total', impossible.ok === false);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}  (${Date.now() - totalStart}ms)`);
if (failures > 0) process.exit(1);