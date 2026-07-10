import assert from 'node:assert/strict';
import { fishTypes } from '../fishdata/fishpool.js';
import { createDefaultUserData } from '../lib/user.js';
import {
  getSeasonProgress,
  recordSeasonalFishCatch
} from '../lib/seasonal-fish.js';
import {
  applyHarborDonation,
  ensureHarborState,
  getHarborEffect,
  getHarborFishPoints
} from '../lib/harbor.js';

const userData = createDefaultUserData();
const seasonBeforeCatch = getSeasonProgress(userData, fishTypes, 'summer_tide_2026', '2026-07-10');
assert.equal(seasonBeforeCatch.totalCount, 2);
assert.equal(seasonBeforeCatch.ownedCount, 0);

const seasonalResult = recordSeasonalFishCatch(userData, {
  name: '晒网银鱼',
  seasonal: { eventId: 'summer_tide_2026' }
});
assert.equal(seasonalResult.newlyCollected, true);
assert.equal(getSeasonProgress(userData, fishTypes, 'summer_tide_2026', '2026-07-10').ownedCount, 1);

const worldState = {};
ensureHarborState(worldState, 'group-1');
const harborDonation = applyHarborDonation(worldState, 'group-1', 'user-1', { coins: 2000 });
assert.equal(harborDonation.levelAfter, 1);
assert.equal(getHarborEffect(worldState, 'group-1').level, 1);
assert.equal(getHarborFishPoints({ rarity: 'epic' }), 350);

console.log('seasonal fish and harbor ok');
