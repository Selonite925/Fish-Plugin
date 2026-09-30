import assert from 'node:assert/strict';

import { BASE_CATCH_RATE, EASTER_EGG_EFFECTS, HEALTH_POTION_CATALOG, LOTTERY_CONFIG } from '../lib/constants.js';
import {
  deriveHealthPointCoinValue,
  getDeepSeaBaselineRewardPerCatch,
  HEALTH_VALUE_REFERENCE_MAX_HEALTH
} from '../lib/balance-audit.js';
import { getHealthPotionValue } from '../lib/health-potions.js';
import { getLotteryPoolSummary } from '../lib/lottery.js';
import {
  HEALTH_POINT_COIN_VALUE,
  getExpectedFishingOutcomeFishEggValue,
  getHealthPotionFishEggValue,
  healthPointsToFishEggs
} from '../lib/value-formula.js';

assert.equal(HEALTH_VALUE_REFERENCE_MAX_HEALTH, 440);
assert.equal(deriveHealthPointCoinValue(), HEALTH_POINT_COIN_VALUE);
assert.equal(healthPointsToFishEggs(10), 24);
assert.equal(getExpectedFishingOutcomeFishEggValue([
  { weight: 50, effect: { type: 'health', amount: -10 } },
  { weight: 50, effect: { type: 'coins', amount: 10 } }
]), -7);
assert.equal(getExpectedFishingOutcomeFishEggValue([
  { weight: 100, effect: { type: 'health_potion', id: 'health_potion_fixed_small', count: 2 } }
]), 170);

for (const reward of LOTTERY_CONFIG.regularRewards.filter(item => item.type === 'health_potion')) {
  const potion = HEALTH_POTION_CATALOG[reward.id];
  const value = getHealthPotionFishEggValue(potion, HEALTH_VALUE_REFERENCE_MAX_HEALTH);
  assert.equal(getHealthPotionValue(reward.id), value);
  assert.equal(potion.value, value);
  assert.equal(reward.value, value);
}

const lotterySummary = getLotteryPoolSummary({ dateKey: '2026-09-30' });
for (const reward of lotterySummary.regularRewards.filter(item => item.type === 'health_potion')) {
  assert.equal(reward.value, getHealthPotionValue(reward.id));
}

const zeroPoint = EASTER_EGG_EFFECTS['零点灯鱼'];
const averageFish = getDeepSeaBaselineRewardPerCatch();
const expectedExtraFishEggs = BASE_CATCH_RATE * averageFish.internalValue * zeroPoint.deepSeaFishballRateBonus;
const expectedHealthCost = healthPointsToFishEggs(zeroPoint.deepSeaHealthCostBonus);
assert.ok(Math.abs(expectedExtraFishEggs - expectedHealthCost) <= 1);

console.log('health value formula, potion values, and zero-point balance ok');
