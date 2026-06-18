import assert from 'node:assert/strict';
import { fishing } from '../Fish.js';
import { EASTER_EGG_RARITY, LOTTERY_ROD_PLUGINS } from '../lib/constants.js';
import { createDefaultUserData } from '../lib/user.js';
import { fishTypes } from '../fishdata/fishpool.js';

const targetName = '愿望锦鲤';
const plugin = new fishing();
const userData = createDefaultUserData();

userData.rodsOwned.push(LOTTERY_ROD_PLUGINS.gold_humble.id);
userData.equippedRod = LOTTERY_ROD_PLUGINS.gold_humble.id;
userData.easterEggCollection = fishTypes[EASTER_EGG_RARITY]
  .map(item => item.name)
  .filter(name => name !== targetName);
userData.rodTargets[LOTTERY_ROD_PLUGINS.gold_humble.id] = {
  type: 'fish',
  name: targetName,
  rarity: EASTER_EGG_RARITY,
  distractors: [],
  updatedAt: 1,
  updatedDate: 'test'
};

plugin.getWeightedRandom = () => EASTER_EGG_RARITY;

const oldRandom = Math.random;
Math.random = () => 0.99;
try {
  const fish = plugin.catchFish(userData, {}, {});
  assert.equal(fish.name, targetName);
  assert.equal(fish.rarity, EASTER_EGG_RARITY);
  assert.equal(fish.specialRodEffect?.targetHit, true);
  assert.ok(Number(fish.specialRodEffect?.rewardCoins || 0) > 0);

  const beforeCoins = Number(userData.coins || 0);
  const effect = plugin.applySpecialRodCatchEffect(userData, fish);
  assert.ok(effect.rewardCoins > 0);
  assert.equal(userData.coins, beforeCoins + effect.rewardCoins);
} finally {
  Math.random = oldRandom;
}

console.log('gold humble easter target reward ok');
