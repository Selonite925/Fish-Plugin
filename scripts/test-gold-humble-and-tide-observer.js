import assert from 'node:assert/strict';
import { fishing } from '../Fish.js';
import { BAIT_CATALOG, LOTTERY_ROD_PLUGINS, ROD_CATALOG } from '../lib/constants.js';
import { fishTypes } from '../fishdata/fishpool.js';
import { selectTideObserverSurvey } from '../lib/tide-observer.js';
import { createDefaultUserData, getCatchRate } from '../lib/user.js';

const goldRod = LOTTERY_ROD_PLUGINS.gold_humble;
const tideObserver = LOTTERY_ROD_PLUGINS.tide_observer;
const userData = createDefaultUserData();
userData.achievementCatchRateBonus = 0.02;
userData.easterEggCollection = ['愿望锦鲤'];
userData.activeEasterEgg = '愿望锦鲤';

const reducedCatchRate = getCatchRate(userData, 0.1, 0.2, { externalEffectMultiplier: goldRod.externalModifierMultiplier });
assert.equal(reducedCatchRate, 0.525);

userData.equippedRod = goldRod.id;
userData.equippedBait = 'special_bait';
userData.baitInventory.special_bait = 1;
const plugin = new fishing();
const oldRandom = Math.random;
Math.random = () => 0.99;
try {
  const baitResult = plugin.consumeShopBait(userData);
  assert.equal(baitResult.bonus, BAIT_CATALOG.special_bait.catchRateBonus * goldRod.externalModifierMultiplier);
} finally {
  Math.random = oldRandom;
}

const worldCupPool = fishTypes.common.filter(fish => fish.seasonal?.eventId === 'world_cup_2026');
const survey = selectTideObserverSurvey(tideObserver, createDefaultUserData(), worldCupPool, {
  dateKey: '2026-07-12',
  random: () => 0
});
assert.equal(survey?.season.id, 'world_cup_2026');
assert.equal(survey?.template.name, '绿茵鳞鱼');
assert.equal(selectTideObserverSurvey(tideObserver, {
  seasonalCollections: { world_cup_2026: ['绿茵鳞鱼'] }
}, worldCupPool, { dateKey: '2026-07-12', random: () => 0 }), null);
assert.equal(tideObserver.signalBonusCoins, undefined);
assert.equal(tideObserver.rarityBias, undefined);
assert.ok(tideObserver.seasonalSurvey);
assert.ok(Number(ROD_CATALOG.legend_poseidon.signalBonusCoins || 0) > 0);

console.log('gold humble external penalty and tide observer survey ok');
