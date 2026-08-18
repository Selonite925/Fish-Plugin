import assert from 'node:assert/strict';

import { getFishSellValue, getFishValue } from '../lib/economy.js';
import {
  applyHealthDamage,
  applyHealthRecovery,
  DEEP_SEA_CAST_HEALTH_COST,
  DEEP_SEA_FISHBALL_RATE,
  DEEP_SEA_NIGHT_RETURN_HOUR,
  DEEP_SEA_ROD_ATTRIBUTE_MULTIPLIER,
  DEEP_SEA_SPECIAL_ROD_FISHBALL_RATE,
  DEEP_SEA_TRAVEL_COST,
  ensurePlayerHealth,
  getDeepSeaCastHealthCost,
  getDeepSeaDamageProfile,
  getDeepSeaEscapePerformance,
  getDeepSeaRodAttributes,
  getDeepSeaSpecialRodProfile,
  getPlayerMaxHealth,
  getMapProfile,
  rollDeepSeaFishDamage,
  rollDeepSeaEventDamage,
  shouldStopDeepSeaFishing
} from '../lib/maps.js';
import { createDefaultUserData, getEasterEggEffects, getEasterEggStatusSummary, normalizeUserData } from '../lib/user.js';
import { fishing } from '../Fish.js';

const user = createDefaultUserData();
normalizeUserData(user);
assert.equal(getPlayerMaxHealth(user, 0), 200);
user.tankLevel = 3;
assert.equal(getPlayerMaxHealth(user, 2), 270);

assert.equal(ensurePlayerHealth(user, { dayKey: 'day-1', harborLevel: 2 }).current, 270);
const damage = applyHealthDamage(user, 42, { dayKey: 'day-1', maxHealth: 270 });
assert.equal(damage.after, 228);
assert.equal(ensurePlayerHealth(user, { dayKey: 'day-2', harborLevel: 2 }).current, 270);
assert.equal(applyHealthDamage(user, 999, { dayKey: 'day-2', maxHealth: 270 }).depleted, true);
assert.equal(ensurePlayerHealth(user, { dayKey: 'day-2', harborLevel: 2 }).current, 0);
const recoveryUser = createDefaultUserData();
normalizeUserData(recoveryUser);
ensurePlayerHealth(recoveryUser, { dayKey: 'recovery-day', maxHealth: 200 });
assert.equal(applyHealthDamage(recoveryUser, 20, { dayKey: 'recovery-day', maxHealth: 200 }).after, 180);
assert.equal(applyHealthRecovery(recoveryUser, 5, { dayKey: 'recovery-day', maxHealth: 200 }).after, 185);
assert.equal(applyHealthDamage(recoveryUser, 999, { dayKey: 'recovery-day', maxHealth: 200 }).depleted, true);
assert.equal(applyHealthRecovery(recoveryUser, 20, { dayKey: 'recovery-day', maxHealth: 200 }).amount, 0);
assert.equal(recoveryUser.health, 0);
const reloadedUser = JSON.parse(JSON.stringify(user));
normalizeUserData(reloadedUser);
assert.equal(ensurePlayerHealth(reloadedUser, { dayKey: 'day-2', harborLevel: 2 }).max, 270);
assert.equal(ensurePlayerHealth(reloadedUser, { dayKey: 'day-2', harborLevel: 0 }).max, 260);

assert.equal(shouldStopDeepSeaFishing({ isAlternate: true }, { current: 1 }), false);
assert.equal(shouldStopDeepSeaFishing({ isAlternate: true }, { current: 0 }), true);
assert.equal(shouldStopDeepSeaFishing({ isAlternate: false }, { current: 0 }), false);

assert.ok(getDeepSeaDamageProfile('legendary').chance > getDeepSeaDamageProfile('common').chance);
assert.ok(getDeepSeaDamageProfile('legendary').max > getDeepSeaDamageProfile('common').max);
assert.ok(getDeepSeaDamageProfile('common').chance > 0.04);
assert.ok(getDeepSeaDamageProfile('common').max > 5);
assert.ok(getDeepSeaDamageProfile('legendary').chance > 0.38);
assert.ok(getDeepSeaDamageProfile('legendary').min > 14);
assert.ok(getDeepSeaDamageProfile('？').chance > 0.46);
assert.equal(DEEP_SEA_NIGHT_RETURN_HOUR, 0);
const guaranteedDamage = rollDeepSeaFishDamage({ rarity: 'legendary' }, { random: () => 0 });
assert.equal(guaranteedDamage.triggered, true);
assert.ok(guaranteedDamage.damage >= getDeepSeaDamageProfile('legendary').min);

const ordinaryRod = getDeepSeaSpecialRodProfile({ id: 'starter' });
const craftedRod = getDeepSeaSpecialRodProfile({
  id: 'legend_abyss',
  sourceLegendary: '深海霸主',
  name: '渊统重竿',
  catchRateBonus: 0.011,
  failProtection: 0.2,
  deepSeaHealthCostReduction: 2,
  deepSeaHealthRecovery: 4,
  deepSeaFishballRateBonus: 0.05
});
assert.equal(ordinaryRod.enabled, false);
assert.equal(craftedRod.enabled, true);
assert.ok(craftedRod.healthCost > 0);
assert.ok(craftedRod.fishballRate > DEEP_SEA_FISHBALL_RATE);
assert.equal(DEEP_SEA_SPECIAL_ROD_FISHBALL_RATE, craftedRod.fishballRate - 0.05);
assert.equal(craftedRod.healthCostReduction, 2);
assert.equal(craftedRod.healthRecovery, 4);
assert.equal(getDeepSeaCastHealthCost(craftedRod), DEEP_SEA_CAST_HEALTH_COST - 2);
assert.equal(getDeepSeaCastHealthCost(craftedRod, { deepSeaHealthCostReduction: 3 }), DEEP_SEA_CAST_HEALTH_COST - 5);
assert.equal(getDeepSeaCastHealthCost({ healthCostBonus: 3 }), DEEP_SEA_CAST_HEALTH_COST + 3);
assert.equal(DEEP_SEA_TRAVEL_COST, 1000);

const ordinaryAttributes = {
  id: 'quick',
  waitMultiplier: 0.58,
  catchRateBonus: 0.0094,
  failProtection: 0.08,
  rarityBias: { rare: 0.02 },
  sizeMultiplier: 1.06,
  minWeightRatio: 0.4
};
const deepAttributes = getDeepSeaRodAttributes(ordinaryAttributes, { isAlternate: true });
assert.equal(deepAttributes.catchRateBonus, ordinaryAttributes.catchRateBonus * DEEP_SEA_ROD_ATTRIBUTE_MULTIPLIER);
assert.equal(deepAttributes.waitMultiplier, 1 + (ordinaryAttributes.waitMultiplier - 1) * DEEP_SEA_ROD_ATTRIBUTE_MULTIPLIER);
assert.equal(deepAttributes.rarityBias.rare, ordinaryAttributes.rarityBias.rare * DEEP_SEA_ROD_ATTRIBUTE_MULTIPLIER);
assert.strictEqual(getDeepSeaRodAttributes(ordinaryAttributes, { isAlternate: false }), ordinaryAttributes);
const specialAttributes = { sourceLegendary: '深海霸主', catchRateBonus: 0.011 };
assert.strictEqual(getDeepSeaRodAttributes(specialAttributes, { isAlternate: true }), specialAttributes);

const eventDamage = rollDeepSeaEventDamage({ healthDamage: { chance: 1, min: 10, max: 10 } }, { random: () => 0, damageMultiplier: 0.5 });
assert.equal(eventDamage.damage, 5);
const genericEscape = getDeepSeaEscapePerformance({ name: '未知深海鱼', rarity: 'rare' }, { random: () => 0 });
assert.equal(genericEscape.specific, false);
assert.ok(genericEscape.intro && genericEscape.reveal);
const lighthouseEscape = getDeepSeaEscapePerformance({ name: '深海灯塔鲸', rarity: 'legendary' });
assert.equal(lighthouseEscape.specific, true);
assert.match(lighthouseEscape.reveal, /灯鲸/);
const dreamJellyEscape = getDeepSeaEscapePerformance({ name: '潜梦水母鱼', rarity: '？' });
assert.equal(dreamJellyEscape.specific, true);
assert.match(dreamJellyEscape.reveal, /潜梦水母鱼/);
for (const rarity of ['legendary', '？']) {
  for (const fish of getMapProfile('abyss').fishTypes[rarity]) {
    assert.equal(
      getDeepSeaEscapePerformance({ ...fish, rarity }).specific,
      true,
      `${rarity} fish ${fish.name} should have a dedicated escape performance`
    );
  }
}
const edgeEscape = getDeepSeaEscapePerformance({ name: '未知深海鱼', rarity: 'rare' }, { random: () => 1 });
assert.ok(edgeEscape.intro && edgeEscape.reveal);

const deepEggUser = createDefaultUserData();
deepEggUser.easterEggCollection = ['潜梦水母鱼'];
deepEggUser.activeEasterEgg = '潜梦水母鱼';
normalizeUserData(deepEggUser);
assert.equal(getEasterEggEffects(deepEggUser).deepSeaHealthCostReduction, 3);

const healthHarness = Object.create(fishing.prototype);
healthHarness.getUserHealthState = userData => ensurePlayerHealth(userData, { dayKey: 'harness-day', maxHealth: 200 });
const pondRodUser = createDefaultUserData();
normalizeUserData(pondRodUser);
ensurePlayerHealth(pondRodUser, { dayKey: 'harness-day', maxHealth: 200 });
const pondRodSettlement = healthHarness.applyDeepSeaRodCost(pondRodUser, { isAlternate: false }, { sourceLegendary: '深海霸主', catchRateBonus: 0.011, failProtection: 0.2 });
assert.equal(pondRodSettlement.healthDamage, 0);
assert.equal(pondRodUser.health, 200);
const ordinaryDeepUser = createDefaultUserData();
normalizeUserData(ordinaryDeepUser);
ensurePlayerHealth(ordinaryDeepUser, { dayKey: 'harness-day', maxHealth: 200 });
const ordinaryDeepRod = { id: 'starter', name: '新手竹竿' };
const ordinaryDeepCost = healthHarness.applyDeepSeaRodCost(ordinaryDeepUser, { isAlternate: true }, ordinaryDeepRod);
assert.equal(ordinaryDeepCost.castHealthCost, DEEP_SEA_CAST_HEALTH_COST);
assert.equal(ordinaryDeepCost.rodHealthCost, 0);
assert.equal(ordinaryDeepCost.healthDamage, DEEP_SEA_CAST_HEALTH_COST);
assert.equal(ordinaryDeepUser.health, 200 - DEEP_SEA_CAST_HEALTH_COST);
const deepRodUser = createDefaultUserData();
normalizeUserData(deepRodUser);
ensurePlayerHealth(deepRodUser, { dayKey: 'harness-day', maxHealth: 200 });
const deepRodSettlement = healthHarness.applyDeepSeaRodCost(deepRodUser, { isAlternate: true }, { sourceLegendary: '深海霸主', catchRateBonus: 0.011, failProtection: 0.2 });
assert.equal(deepRodSettlement.castHealthCost, DEEP_SEA_CAST_HEALTH_COST);
assert.equal(deepRodSettlement.healthDamage, DEEP_SEA_CAST_HEALTH_COST + deepRodSettlement.rodHealthCost);

const originalRandom = Math.random;
Math.random = () => 0.99;
try {
  const deepCatchUser = createDefaultUserData();
  normalizeUserData(deepCatchUser);
  ensurePlayerHealth(deepCatchUser, { dayKey: 'harness-day', maxHealth: 200 });
  const deepCatch = healthHarness.applyDeepSeaCatchSettlement(
    deepCatchUser,
    { name: '深潮银鱼', rarity: 'common', mapId: 'abyss', length: 20, weight: 0.1 },
    { isAlternate: true },
    ordinaryDeepRod
  );
  assert.equal(deepCatch.fishDamage, 0);
  assert.equal(deepCatch.healthDamage, DEEP_SEA_CAST_HEALTH_COST);
  assert.equal(deepCatch.health.current, 200 - DEEP_SEA_CAST_HEALTH_COST);
  assert.ok(deepCatch.fishballReward > 0);

  const escapeUser = createDefaultUserData();
  normalizeUserData(escapeUser);
  ensurePlayerHealth(escapeUser, { dayKey: 'harness-day', maxHealth: 200 });
  escapeUser.health = 5;
  const escapePreview = healthHarness.getDeepSeaCatchSettlementPreview(
    escapeUser,
    { name: '深潮银鱼', rarity: 'common', mapId: 'abyss', length: 20, weight: 0.1 },
    { isAlternate: true },
    ordinaryDeepRod
  );
  assert.equal(escapePreview.insufficientHealth, true);
  const escapedSettlement = healthHarness.applyDeepSeaCatchSettlement(
    escapeUser,
    { name: '深潮银鱼', rarity: 'common', mapId: 'abyss', length: 20, weight: 0.1 },
    { isAlternate: true },
    ordinaryDeepRod,
    '',
    null,
    escapePreview
  );
  assert.equal(escapedSettlement.escaped, true);
  assert.equal(escapedSettlement.fishballReward, 0);
  assert.equal(escapeUser.health, 0);

  const pondSpecialUser = createDefaultUserData();
  normalizeUserData(pondSpecialUser);
  ensurePlayerHealth(pondSpecialUser, { dayKey: 'harness-day', maxHealth: 200 });
  const pondCoinsBefore = pondSpecialUser.coins;
  const pondSpecialSettlement = healthHarness.applyDeepSeaCatchSettlement(
    pondSpecialUser,
    { name: '深潮银鱼', rarity: 'common', mapId: 'abyss', length: 20, weight: 0.1 },
    { isAlternate: false },
    { sourceLegendary: '深海霸主', name: '渊统重竿', catchRateBonus: 0.011, failProtection: 0.2 }
  );
  assert.equal(pondSpecialSettlement.healthDamage, 0);
  assert.equal(pondSpecialSettlement.fishballReward, 0);
  assert.equal(pondSpecialUser.health, 200);
  assert.equal(pondSpecialUser.coins, pondCoinsBefore);
} finally {
  Math.random = originalRandom;
}

const legacyDeepEggUser = createDefaultUserData();
legacyDeepEggUser.easterEggCollection = ['愿望锦鲤'];
legacyDeepEggUser.allTimeFish = [
  { name: '潜梦水母鱼', rarity: '？', mapId: 'abyss' },
  { name: '无声鳐', rarity: '？', mapId: 'abyss' },
  { name: '零点灯鱼', rarity: '？', mapId: 'abyss' }
];
normalizeUserData(legacyDeepEggUser);
assert.deepEqual(legacyDeepEggUser.easterEggCollection, ['愿望锦鲤', '潜梦水母鱼', '无声鳐', '零点灯鱼']);
assert.deepEqual(getEasterEggStatusSummary(legacyDeepEggUser).owned, legacyDeepEggUser.easterEggCollection);

const deepCommon = { name: '深潮银鱼', rarity: 'common', mapId: 'abyss', length: 20, weight: 0.1 };
const deepLegendary = { name: '深海灯塔鲸', rarity: 'legendary', mapId: 'abyss', length: 1000, weight: 10000 };
assert.ok(getFishValue(deepCommon) > 0);
assert.ok(getFishValue(deepLegendary) > 0);
assert.equal(getFishSellValue(deepLegendary), 0);

console.log('deep-sea health, collection migration, damage, and value rules ok');
