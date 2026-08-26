import assert from 'node:assert/strict';

import {
  addHealthPotion,
  consumeHealthPotion,
  getHealthPotionList,
  getHealthPotionRecovery,
  resolveHealthPotionId
} from '../lib/health-potions.js';
import {
  applyHealthRecovery,
  ensurePlayerHealth
} from '../lib/maps.js';
import { createDefaultUserData, normalizeUserData } from '../lib/user.js';
import { fishing } from '../Fish.js';
import {
  DEEP_SEA_RESCUE_GRAND_PRIZE_ID,
  getAvailableDeepSeaRescueFish,
  getDeepSeaRescueCost,
  pruneExpiredDeepSeaRescueFish,
  recordDeepSeaEscapedFish
} from '../lib/deep-sea-rescue.js';

const user = createDefaultUserData();
normalizeUserData(user);
assert.equal(getHealthPotionList(user).length, 0);
for (const id of [
  'health_potion_fixed_small',
  'health_potion_fixed_medium',
  'health_potion_fixed_large',
  'health_potion_percent_small',
  'health_potion_percent_medium',
  'health_potion_percent_large'
]) addHealthPotion(user, id);

const potions = getHealthPotionList(user);
assert.equal(potions.length, 6);
assert.equal(resolveHealthPotionId('血瓶1', user), potions[0].id);
assert.equal(getHealthPotionRecovery(potions[0], 200), 35);
assert.equal(getHealthPotionRecovery(potions[5], 270), 122);

ensurePlayerHealth(user, { dayKey: '2026-08-26', maxHealth: 200 });
user.health = 0;
const consumed = consumeHealthPotion(user, potions[0].id);
assert.ok(consumed);
const revived = applyHealthRecovery(user, getHealthPotionRecovery(consumed.potion, 200), {
  dayKey: '2026-08-26',
  maxHealth: 200,
  allowRevive: true
});
assert.equal(revived.after, 35);
const healthHarness = Object.create(fishing.prototype);
assert.equal(healthHarness.formatHealthText({ current: 35, max: 200 }), '生命值：35/200');

const rescueUser = createDefaultUserData();
normalizeUserData(rescueUser);
rescueUser.lotteryGrandPrizes = [DEEP_SEA_RESCUE_GRAND_PRIZE_ID];
const settlementUser = createDefaultUserData();
normalizeUserData(settlementUser);
settlementUser.lotteryGrandPrizes = [DEEP_SEA_RESCUE_GRAND_PRIZE_ID];
ensurePlayerHealth(settlementUser, { dayKey: '2026-08-26', maxHealth: 200 });
settlementUser.health = 5;
const settlementHarness = Object.create(fishing.prototype);
settlementHarness.getUserHealthState = value => ensurePlayerHealth(value, { dayKey: '2026-08-26', maxHealth: 200 });
const oldRandom = Math.random;
Math.random = () => 0.99;
try {
  const settlementFish = { name: '深潮银鱼', rarity: 'common', mapId: 'abyss', length: 20, weight: 0.1 };
  const preview = settlementHarness.getDeepSeaCatchSettlementPreview(
    settlementUser,
    settlementFish,
    { isAlternate: true },
    { id: 'starter' }
  );
  const settlement = settlementHarness.applyDeepSeaCatchSettlement(
    settlementUser,
    settlementFish,
    { isAlternate: true },
    { id: 'starter' },
    '',
    null,
    preview
  );
  assert.equal(settlement.escaped, true);
  assert.equal(Boolean(settlement.rescueEntry), true);
} finally {
  Math.random = oldRandom;
}
const escapedFish = {
  name: '深潮银鱼',
  rarity: 'common',
  mapId: 'abyss',
  length: 20,
  weight: 0.1
};
const recorded = recordDeepSeaEscapedFish(rescueUser, escapedFish, '2026-08-25');
assert.ok(recorded);
assert.equal(getAvailableDeepSeaRescueFish(rescueUser, '2026-08-25').length, 0);
const available = getAvailableDeepSeaRescueFish(rescueUser, '2026-08-26');
assert.equal(available.length, 1);
assert.equal(available[0].cost, Math.ceil(getDeepSeaRescueCost(escapedFish)));
assert.equal(getDeepSeaRescueCost(escapedFish), available[0].cost);
assert.equal(pruneExpiredDeepSeaRescueFish(rescueUser, '2026-08-26'), 0);
assert.equal(pruneExpiredDeepSeaRescueFish(rescueUser, '2026-08-27'), 1);

console.log('health potions and deep-sea rescue rules ok');
