import assert from 'node:assert/strict';
import { fishTypes } from '../fishdata/fishpool.js';
import { createDefaultUserData } from '../lib/user.js';
import { isSeasonalFishActive } from '../lib/duanwu.js';
import {
  getActiveSeason,
  getSeasonProgress,
  recordSeasonalFishCatch
} from '../lib/seasonal-fish.js';
import {
  applyHarborDonation,
  ensureHarborState,
  HARBOR_BUFF_DONATION_THRESHOLD,
  HARBOR_BUFF_EXTENSION_MS,
  HARBOR_BUFF_MAX_DURATION_MS,
  HARBOR_LEVELS,
  getHarborEffect,
  getHarborFishPoints
} from '../lib/harbor.js';

const userData = createDefaultUserData();
for (let index = 1; index < HARBOR_LEVELS.length; index += 1) {
  assert.ok(HARBOR_LEVELS[index].catchRateBonus > HARBOR_LEVELS[index - 1].catchRateBonus);
}
assert.equal(getActiveSeason('2026-07-10')?.id, 'world_cup_2026');
assert.equal(getActiveSeason('2026-08-19')?.id, 'qixi_2026');
assert.equal(getActiveSeason('2026-09-25')?.id, 'mid_autumn_2026');
assert.equal(getActiveSeason('2026-10-03')?.id, 'golden_october_2026');
assert.equal(getActiveSeason('2026-11-11')?.id, 'double_eleven_2026');
assert.equal(getActiveSeason('2026-12-24')?.id, 'winter_festival_2026');
assert.equal(getActiveSeason('2026-07-02')?.id, 'duanwu_2026');
assert.equal(getActiveSeason('2026-07-03')?.id, 'world_cup_2026');
assert.equal(getActiveSeason('2026-07-05')?.id, 'world_cup_2026');
const seasonBeforeCatch = getSeasonProgress(userData, fishTypes, 'summer_tide_2026', '2026-07-10');
assert.equal(seasonBeforeCatch.totalCount, 2);
assert.equal(seasonBeforeCatch.ownedCount, 0);
assert.equal(getSeasonProgress(userData, fishTypes, 'summer_tide_2026', '2026-07-10').season.archived, true);
assert.equal(isSeasonalFishActive({ seasonal: { eventId: 'summer_tide_2026', startDate: '2026-07-04', endDateExclusive: '2026-09-01' } }, '2026-07-10'), false);

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
assert.equal(harborDonation.buffExtensionUnits, 4);
assert.ok(harborDonation.harbor.buffExpiresAt >= donationStartedAt + HARBOR_BUFF_EXTENSION_MS * 4 - 1000);
assert.equal(getHarborEffect(worldState, 'group-1').level, 1);
assert.equal(getHarborEffect(worldState, 'group-1').active, true);
assert.equal(getHarborEffect(worldState, 'group-1').catchRateBonus, 0.005);
assert.equal(getHarborFishPoints({ rarity: 'epic' }), 350);

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

const cappedState = {};
const cappedHarbor = ensureHarborState(cappedState, 'group-4');
const capStartedAt = Date.now();
cappedHarbor.buffExpiresAt = capStartedAt + 29 * 24 * 60 * 60 * 1000;
applyHarborDonation(cappedState, 'group-4', 'user-1', { coins: HARBOR_BUFF_DONATION_THRESHOLD * 10 });
assert.ok(cappedHarbor.buffExpiresAt <= capStartedAt + HARBOR_BUFF_MAX_DURATION_MS + 1000);
assert.ok(cappedHarbor.buffExpiresAt >= capStartedAt + HARBOR_BUFF_MAX_DURATION_MS - 1000);

console.log('seasonal fish and harbor ok');
