import assert from 'node:assert/strict';

import { getFishSellValue, getFishValue } from '../lib/economy.js';
import {
  applyHealthDamage,
  DEEP_SEA_FISHBALL_RATE,
  DEEP_SEA_SPECIAL_ROD_FISHBALL_RATE,
  DEEP_SEA_TRAVEL_COST,
  ensurePlayerHealth,
  getDeepSeaDamageProfile,
  getDeepSeaSpecialRodProfile,
  getPlayerMaxHealth,
  rollDeepSeaFishDamage,
  shouldStopDeepSeaFishing
} from '../lib/maps.js';
import { createDefaultUserData, getEasterEggStatusSummary, normalizeUserData } from '../lib/user.js';

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
const reloadedUser = JSON.parse(JSON.stringify(user));
normalizeUserData(reloadedUser);
assert.equal(ensurePlayerHealth(reloadedUser, { dayKey: 'day-2', harborLevel: 2 }).max, 270);
assert.equal(ensurePlayerHealth(reloadedUser, { dayKey: 'day-2', harborLevel: 0 }).max, 260);

assert.equal(shouldStopDeepSeaFishing({ isAlternate: true }, { current: 1 }), false);
assert.equal(shouldStopDeepSeaFishing({ isAlternate: true }, { current: 0 }), true);
assert.equal(shouldStopDeepSeaFishing({ isAlternate: false }, { current: 0 }), false);

assert.ok(getDeepSeaDamageProfile('legendary').chance > getDeepSeaDamageProfile('common').chance);
assert.ok(getDeepSeaDamageProfile('legendary').max > getDeepSeaDamageProfile('common').max);
const guaranteedDamage = rollDeepSeaFishDamage({ rarity: 'legendary' }, { random: () => 0 });
assert.equal(guaranteedDamage.triggered, true);
assert.ok(guaranteedDamage.damage >= getDeepSeaDamageProfile('legendary').min);

const ordinaryRod = getDeepSeaSpecialRodProfile({ id: 'starter' });
const craftedRod = getDeepSeaSpecialRodProfile({ id: 'legend_abyss', sourceLegendary: '深海霸主', name: '渊统重竿', catchRateBonus: 0.011, failProtection: 0.2 });
assert.equal(ordinaryRod.enabled, false);
assert.equal(craftedRod.enabled, true);
assert.ok(craftedRod.healthCost > 0);
assert.ok(craftedRod.fishballRate > DEEP_SEA_FISHBALL_RATE);
assert.equal(DEEP_SEA_SPECIAL_ROD_FISHBALL_RATE, craftedRod.fishballRate);
assert.equal(DEEP_SEA_TRAVEL_COST, 1000);

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
