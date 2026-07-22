import assert from 'node:assert/strict';
import { fishTypes } from '../fishdata/fishpool.js';
import { createDefaultUserData } from '../lib/user.js';
import { isSeasonalFishActive } from '../lib/duanwu.js';
import {
  getActiveSeason,
  getActiveSeasons,
  getHistoricalSeasons,
  getSeasonProgress,
  recordSeasonalFishCatch,
  SEASON_CATALOG
} from '../lib/seasonal-fish.js';
import {
  applyHarborDonation,
  ensureHarborState,
  HARBOR_BUFF_DONATION_THRESHOLD,
  HARBOR_BUFF_EXTENSION_MS,
  HARBOR_BUFF_MAX_DURATION_MS,
  HARBOR_FISH_POINT_VALUES,
  HARBOR_LEVELS,
  getHarborEffect,
  getHarborFishPoints,
  getHarborLevel,
  normalizeHarborStates
} from '../lib/harbor.js';
import {
  commitHarborDonation,
  prepareHarborCoinDonation,
  prepareHarborFishDonation,
  recoverPendingHarborDonations
} from '../lib/harbor-transactions.js';

const userData = createDefaultUserData();
for (let index = 1; index < HARBOR_LEVELS.length; index += 1) {
  assert.ok(HARBOR_LEVELS[index].catchRateBonus > HARBOR_LEVELS[index - 1].catchRateBonus);
}
const activeSchedule = Object.values(SEASON_CATALOG)
  .filter(season => !season.archived)
  .sort((left, right) => left.startDate.localeCompare(right.startDate));
for (let index = 1; index < activeSchedule.length; index += 1) {
  assert.ok(activeSchedule[index - 1].endDateExclusive <= activeSchedule[index].startDate);
}
assert.equal(getActiveSeason('2026-07-10')?.id, 'world_cup_2026');
assert.equal(getActiveSeason('2026-08-19')?.id, 'qixi_2026');
assert.equal(getActiveSeason('2026-09-25')?.id, 'mid_autumn_2026');
assert.equal(getActiveSeason('2026-10-03')?.id, 'golden_october_2026');
assert.equal(getActiveSeason('2026-11-11')?.id, 'double_eleven_2026');
assert.equal(getActiveSeason('2026-12-24')?.id, 'winter_festival_2026');
assert.equal(getActiveSeason('2026-07-02')?.id, 'duanwu_2026');
assert.equal(getActiveSeason('2026-07-03')?.id, 'world_cup_2026');
assert.equal(getActiveSeason('2026-07-19')?.id, 'world_cup_2026');
assert.equal(getActiveSeason('2026-07-20')?.id, 'summer_tide_2026');
assert.equal(getActiveSeason('2026-08-09')?.id, 'summer_tide_2026');
assert.equal(getActiveSeason('2026-08-10')?.id, 'qixi_2026');
assert.deepEqual(getActiveSeasons('2026-07-12').map(season => season.id), ['world_cup_2026']);
assert.notEqual(SEASON_CATALOG.summer_tide_2026.archived, true);
assert.ok(!getHistoricalSeasons('2026-07-12').some(season => season.id === 'summer_tide_2026'));
assert.ok(getHistoricalSeasons('2026-08-10').some(season => season.id === 'summer_tide_2026'));
const seasonBeforeCatch = getSeasonProgress(userData, fishTypes, 'summer_tide_2026', '2026-07-10');
assert.equal(seasonBeforeCatch.totalCount, 2);
assert.equal(seasonBeforeCatch.ownedCount, 0);
assert.equal(isSeasonalFishActive({ seasonal: { eventId: 'summer_tide_2026', startDate: '2026-07-20', endDateExclusive: '2026-08-10' } }, '2026-07-12'), false);
assert.equal(isSeasonalFishActive({ seasonal: { eventId: 'summer_tide_2026', startDate: '2026-07-20', endDateExclusive: '2026-08-10' } }, '2026-07-20'), true);

const seasonalResult = recordSeasonalFishCatch(userData, {
  name: '晒网银鱼',
  seasonal: { eventId: 'summer_tide_2026' }
});
assert.equal(seasonalResult.newlyCollected, true);
assert.equal(getSeasonProgress(userData, fishTypes, 'summer_tide_2026', '2026-07-10').ownedCount, 1);

const worldState = {};
ensureHarborState(worldState, 'group-1');
const donationStartedAt = Date.now();
const harborDonation = applyHarborDonation(worldState, 'group-1', 'user-1', { coins: 2000 });
assert.equal(harborDonation.levelAfter, 1);
assert.equal(harborDonation.buffExtensionUnits, 1);
assert.ok(harborDonation.harbor.buffExpiresAt >= donationStartedAt + HARBOR_BUFF_EXTENSION_MS - 1000);
assert.equal(getHarborEffect(worldState, 'group-1').level, 1);
assert.equal(getHarborEffect(worldState, 'group-1').active, true);
assert.equal(getHarborEffect(worldState, 'group-1').catchRateBonus, 0.005);
for (const [rarity, points] of Object.entries(HARBOR_FISH_POINT_VALUES)) {
  assert.equal(getHarborFishPoints({ rarity }), points);
}
assert.equal(getHarborFishPoints({ rarity: 'easteregg' }), 0);

worldState.harbors['group-1'].buffExpiresAt = Date.now() - 1;
const expiredEffect = getHarborEffect(worldState, 'group-1');
assert.equal(expiredEffect.active, false);
assert.equal(expiredEffect.catchRateBonus, 0.003);
assert.equal(expiredEffect.signalBonusCoins, 0);

const belowThresholdState = {};
const belowThresholdDonation = applyHarborDonation(belowThresholdState, 'group-2', 'user-1', {
  coins: HARBOR_BUFF_DONATION_THRESHOLD - 1
});
assert.equal(belowThresholdDonation.buffExtensionUnits, 0);
assert.equal(belowThresholdDonation.harbor.buffExpiresAt, 0);

const permanentLevelState = {};
const fishDonation = applyHarborDonation(permanentLevelState, 'group-3', 'user-1', { fishPoints: 7000 });
assert.equal(fishDonation.levelAfter, 2);
assert.equal(fishDonation.buffExtensionUnits, 0);
assert.equal(fishDonation.harbor.buffExpiresAt, 0);
const permanentLevelEffect = getHarborEffect(permanentLevelState, 'group-3');
assert.equal(permanentLevelEffect.active, false);
assert.equal(permanentLevelEffect.catchRateBonus, 0.006);
assert.equal(permanentLevelEffect.signalBonusCoins, 5);
assert.equal(getHarborLevel(32000).level, 4);
assert.equal(getHarborLevel(1500000).level, 8);

const cappedState = {};
const cappedHarbor = ensureHarborState(cappedState, 'group-4');
const capStartedAt = Date.now();
cappedHarbor.buffExpiresAt = capStartedAt + 29 * 24 * 60 * 60 * 1000;
applyHarborDonation(cappedState, 'group-4', 'user-1', { coins: HARBOR_BUFF_DONATION_THRESHOLD * 10 });
assert.ok(cappedHarbor.buffExpiresAt <= capStartedAt + HARBOR_BUFF_MAX_DURATION_MS + 1000);
assert.ok(cappedHarbor.buffExpiresAt >= capStartedAt + HARBOR_BUFF_MAX_DURATION_MS - 1000);

const malformedState = {
  harbors: {
    'group-bad': {
      level: 99,
      constructionPoints: '7000.9',
      contributors: {
        'user-1': { coins: '10', fishPoints: 'invalid' },
        'user-2': null
      },
      buffExpiresAt: 'invalid'
    },
    'group-non-finite': {
      constructionPoints: Number.NaN,
      contributors: {
        'user-3': { coins: Number.POSITIVE_INFINITY, fishPoints: -50 }
      },
      buffExpiresAt: Number.POSITIVE_INFINITY
    }
  }
};
assert.equal(normalizeHarborStates(malformedState), true);
const repairedHarbor = malformedState.harbors['group-bad'];
assert.equal(repairedHarbor.constructionPoints, 7000);
assert.equal(repairedHarbor.level, 2);
assert.equal(repairedHarbor.buffExpiresAt, 0);
assert.deepEqual(repairedHarbor.contributors['user-1'], { coins: 10, fishPoints: 0 });
assert.deepEqual(repairedHarbor.contributors['user-2'], { coins: 0, fishPoints: 0 });
const repairedDonation = applyHarborDonation(malformedState, 'group-bad', 'user-1', { coins: 2000 });
assert.equal(repairedDonation.harbor.constructionPoints, 9000);
assert.equal(repairedDonation.harbor.contributors['user-1'].coins, 2010);
assert.equal(typeof repairedDonation.harbor.contributors['user-1'].coins, 'number');
assert.equal(malformedState.harbors['group-non-finite'].constructionPoints, 0);
assert.equal(malformedState.harbors['group-non-finite'].buffExpiresAt, 0);
assert.equal(malformedState.harbors['group-non-finite'].contributors['user-3'].coins, 0);
assert.equal(applyHarborDonation({}, 'group-invalid', 'user-1', { coins: Number.POSITIVE_INFINITY }).points, 0);

const cancelledCoinWorld = {};
const cancelledCoinData = { 'user-1': { coins: 5000, fishTank: [] } };
prepareHarborCoinDonation(cancelledCoinWorld, {
  groupId: 'group-tx-cancel',
  userId: 'user-1',
  amount: 2000,
  balanceBefore: 5000
});
const cancelledCoinRecovery = recoverPendingHarborDonations(cancelledCoinWorld, cancelledCoinData);
assert.equal(cancelledCoinRecovery.applied, 0);
assert.equal(cancelledCoinRecovery.cancelled, 1);
assert.equal(cancelledCoinWorld.harbors, undefined);

const recoveredCoinWorld = {};
const recoveredCoinData = { 'user-1': { coins: 5000, fishTank: [] } };
prepareHarborCoinDonation(recoveredCoinWorld, {
  groupId: 'group-tx-coins',
  userId: 'user-1',
  amount: 2000,
  balanceBefore: 5000
});
recoveredCoinData['user-1'].coins = 3000;
const recoveredCoinSummary = recoverPendingHarborDonations(recoveredCoinWorld, recoveredCoinData);
assert.equal(recoveredCoinSummary.applied, 1);
assert.equal(recoveredCoinSummary.cancelled, 0);
assert.equal(recoveredCoinWorld.harbors['group-tx-coins'].constructionPoints, 2000);
assert.equal(recoverPendingHarborDonations(recoveredCoinWorld, recoveredCoinData).changed, false);

const directCommitWorld = {};
const directTransaction = prepareHarborCoinDonation(directCommitWorld, {
  groupId: 'group-tx-direct',
  userId: 'user-1',
  amount: 2000,
  balanceBefore: 3000
});
const directCommit = commitHarborDonation(directCommitWorld, directTransaction.id);
assert.equal(directCommit.result.points, 2000);
assert.equal(directCommitWorld.harbors['group-tx-direct'].constructionPoints, 2000);
assert.equal(Object.keys(directCommitWorld.pendingHarborDonations).length, 0);

const recoveredFishWorld = {};
const recoveredFishData = {
  'user-2': {
    coins: 0,
    fishTank: [{ fishId: 'fish-tx-1', name: '测试鱼', rarity: 'epic' }]
  }
};
prepareHarborFishDonation(recoveredFishWorld, {
  groupId: 'group-tx-fish',
  userId: 'user-2',
  points: 350,
  fishId: 'fish-tx-1'
});
recoveredFishData['user-2'].fishTank = [];
const recoveredFishSummary = recoverPendingHarborDonations(recoveredFishWorld, recoveredFishData);
assert.equal(recoveredFishSummary.applied, 1);
assert.equal(recoveredFishWorld.harbors['group-tx-fish'].constructionPoints, 350);

console.log('seasonal fish and harbor ok');
