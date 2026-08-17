import assert from 'node:assert/strict';

import {
  applyMapEvent,
  canAccessMap,
  consumeMapEventBonus,
  ensureMapState,
  getMapContext,
  getMapFishTemplateByName,
  getMapInfluence,
  getVeteranProgress,
  recordMapCatch
} from '../lib/maps.js';
import { EASTER_EGG_RARITY, LEGENDARY_ROD_RECIPES, ROD_CATALOG } from '../lib/constants.js';
import { createDefaultUserData, normalizeUserData } from '../lib/user.js';

const newcomer = createDefaultUserData();
normalizeUserData(newcomer);
assert.equal(canAccessMap(newcomer, 'abyss'), false);
assert.equal(getMapContext(newcomer).id, 'pond');

const veteran = createDefaultUserData();
veteran.total = 24;
veteran.allTimeFish = Array.from({ length: 10 }, (_, index) => ({ name: `old-${index}`, rarity: 'common' }));
normalizeUserData(veteran);
assert.equal(canAccessMap(veteran, '深海'), true);
const context = getMapContext(veteran, '深海裂谷');
assert.equal(context.name, '深海裂谷');
assert.ok(context.fishTypes.common.length > 0);
assert.equal(context.fishTypes.common.length, 12);
assert.equal(context.fishTypes.uncommon.length, 12);
assert.equal(context.fishTypes.rare.length, 12);
assert.equal(context.fishTypes.epic.length, 12);
assert.equal(context.fishTypes.legendary.length, 10);
assert.equal(Object.values(context.fishTypes).flat().length, 61);
assert.ok(context.fishTypes.common.every(fish => !['鲫鱼', '鲤鱼', '草鱼'].includes(fish.name)));
assert.ok(getMapFishTemplateByName('abyss', '灯笼乌贼'));

for (const rarity of ['epic', 'legendary', EASTER_EGG_RARITY]) {
  const fishNames = context.fishTypes[rarity].map(fish => fish.name).sort();
  const performances = context.specialMessagesByFish?.[rarity] || {};
  assert.deepEqual(Object.keys(performances).sort(), fishNames);
  for (const fishName of fishNames) {
    assert.ok(performances[fishName].intro);
    assert.ok(performances[fishName].reveal);
  }
}

for (const fish of context.fishTypes.legendary) {
  const recipe = Object.values(LEGENDARY_ROD_RECIPES).find(item => item.sourceLegendary === fish.name);
  assert.ok(recipe, `${fish.name} should have a legendary rod recipe`);
  assert.equal(ROD_CATALOG[recipe.id]?.sourceLegendary, fish.name);
}

const baselineInfluence = getMapInfluence(createDefaultUserData(), 'abyss');
const veteranInfluence = getMapInfluence(veteran, 'abyss');
assert.ok(veteranInfluence.catchRateBonus > baselineInfluence.catchRateBonus);
assert.ok(veteranInfluence.rarityBias.rare > baselineInfluence.rarityBias.rare);

const state = ensureMapState(veteran);
const beforeCatchCount = state.catches.abyss || 0;
recordMapCatch(veteran, { name: '灯笼乌贼' }, 'abyss');
assert.equal(veteran.mapState.catches.abyss, beforeCatchCount + 1);
const eventResult = applyMapEvent(veteran, { effect: 'chart' }, Date.now());
assert.equal(eventResult.effect, 'chart');
assert.equal(veteran.mapState.abyss.chart, 1);
assert.ok(consumeMapEventBonus(veteran, Date.now()) > 0);
assert.equal(consumeMapEventBonus(veteran, Date.now()), 0);

console.log('map profiles, veteran influence and deep-sea event state ok');
