import {
  BASE_CATCH_RATE,
  EASTER_EGG_RARITY,
  LOTTERY_CONFIG,
  RARITY_VALUE_LIMITS,
  ROD_CATALOG
} from '../lib/constants.js';
import { getLotteryExpectedValue } from '../lib/lottery.js';
import { fishTypes, rarityWeights } from '../fishdata/fishpool.js';

const CASTS = Number(process.argv[2] || 250000);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function weightedPick(keys, weights) {
  const total = keys.reduce((sum, key) => sum + Number(weights[key] || 0), 0);
  let roll = Math.random() * total;
  for (const key of keys) {
    roll -= Number(weights[key] || 0);
    if (roll <= 0) return key;
  }
  return keys[keys.length - 1];
}

function applyRarityBias(baseWeights, bias = {}) {
  const adjusted = {};
  for (const [rarity, weight] of Object.entries(baseWeights)) {
    adjusted[rarity] = Math.max(0.0001, weight + Number(bias[rarity] || 0));
  }
  return adjusted;
}

function mergeRarityBias(...biasList) {
  const merged = {};
  for (const bias of biasList) {
    for (const [rarity, value] of Object.entries(bias || {})) {
      merged[rarity] = (merged[rarity] || 0) + Number(value || 0);
    }
  }
  return merged;
}

function getGoldHumbleTargetRewardMultiplier(targetName = '') {
  const chars = [...String(targetName || '')];
  if (!chars.length) return 1;
  const hash = chars.reduce((sum, char) => ((sum * 131) + (char.codePointAt(0) || 0)) >>> 0, 0);
  return 0.96 + (hash % 9) * 0.01;
}

function getGoldHumbleDistractorCount(effect, rarity, poolSize = 0) {
  const legacyCount = effect?.distractorCountByRarity?.[rarity];
  if (Number.isFinite(Number(legacyCount))) {
    return Math.max(0, Math.floor(Number(legacyCount)));
  }
  const rules = effect?.distractorPoolSizeRules || {};
  const min = Math.max(0, Math.floor(Number(rules.min ?? 1)));
  const max = Math.max(min, Math.floor(Number(rules.max ?? 4)));
  const size = Math.max(0, Math.floor(Number(poolSize || 0)));
  const thresholds = Array.isArray(rules.thresholds) ? rules.thresholds : [];
  const matched = [...thresholds]
    .sort((left, right) => Number(right.minPoolSize || 0) - Number(left.minPoolSize || 0))
    .find(rule => size >= Number(rule.minPoolSize || 0));
  const count = matched ? Math.floor(Number(matched.count || min)) : min;
  return Math.max(min, Math.min(max, count));
}

function getGoldHumbleTargetProfile(effect, rarity, targetName = '', poolSize = 0) {
  const revealChance = clamp(Number(effect?.revealChanceByRarity?.[rarity] ?? 0), 0, 1);
  const distractorCount = getGoldHumbleDistractorCount(effect, rarity, poolSize);
  const baseReward = Math.max(0, Math.floor(Number(effect?.rewardCoinsByRarity?.[rarity] || 0)));
  const rewardCoins = Math.max(0, Math.floor(baseReward * getGoldHumbleTargetRewardMultiplier(targetName)));
  return { revealChance, distractorCount, rewardCoins };
}

function randomBodyValue(min, max, decimals) {
  const value = Math.random() * (max - min) + min;
  const rounded = Number(value.toFixed(decimals));
  return decimals === 2 && max > 0 ? Math.max(0.01, rounded) : rounded;
}

function createFish(template, rarity) {
  return {
    name: template.name,
    rarity,
    length: randomBodyValue(template.size.min, template.size.max, 1),
    weight: randomBodyValue(template.weight.min, template.weight.max, 2)
  };
}

function normalizeBodyValue(value, range) {
  if (!range || range.max <= range.min) return 0.5;
  return clamp((value - range.min) / (range.max - range.min), 0, 1);
}

function fishSellLikeValue(fish) {
  if (fish.rarity === 'legendary' || fish.rarity === EASTER_EGG_RARITY) return 1500;
  const limits = RARITY_VALUE_LIMITS[fish.rarity];
  const template = fishTypes[fish.rarity].find(item => item.name === fish.name);
  const lengthQuality = normalizeBodyValue(fish.length, template.size);
  const weightQuality = normalizeBodyValue(fish.weight, template.weight);
  const quality = lengthQuality * 0.3 + weightQuality * 0.7;
  return Math.round(limits.min + (limits.max - limits.min) * quality);
}

function simulateRod(rod, options = {}) {
  const counts = { catches: 0, targetRarityCatches: 0, targetReveals: 0, targetHits: 0, fishValue: 0, targetReward: 0 };
  const catchRate = clamp(BASE_CATCH_RATE + Number(rod.catchRateBonus || 0), 0.05, 0.95);
  const failProtection = clamp(Number(rod.failProtection || 0), 0, 0.45);
  const target = options.target;
  const targetBias = target && rod.targetFishEffect?.type === 'gold_humble'
    ? rod.targetFishEffect.rarityBiasByTargetRarity?.[target.rarity] || {}
    : {};
  const weights = applyRarityBias(rarityWeights, mergeRarityBias(rod.rarityBias || {}, targetBias));
  const rarities = Object.keys(fishTypes);

  for (let i = 0; i < CASTS; i += 1) {
    const missed = Math.random() >= catchRate;
    if (missed) {
      const emptyHook = Math.random() < 0.30;
      const rescued = emptyHook && Math.random() < failProtection;
      if (!rescued) continue;
    }

    const rarity = weightedPick(rarities, weights);
    const pool = fishTypes[rarity];
    let template = pool[Math.floor(Math.random() * pool.length)];
    if (target && rod.targetFishEffect && rarity === target.rarity) {
      counts.targetRarityCatches += 1;
      const profile = getGoldHumbleTargetProfile(rod.targetFishEffect, rarity, target.name, pool.length);
      const candidateCount = Math.max(1, Math.min(pool.length, 1 + profile.distractorCount));
      const revealTriggered = Math.random() < profile.revealChance;
      if (revealTriggered) {
        counts.targetReveals += 1;
        const candidateIndex = Math.floor(Math.random() * candidateCount);
        if (candidateIndex === 0) {
          template = pool.find(item => item.name === target.name) || template;
          counts.targetHits += 1;
          counts.targetReward += profile.rewardCoins;
        } else {
          template = pool.find(item => item.name !== target.name) || template;
        }
      } else {
        const fallbackPool = pool.filter(item => item.name !== target.name);
        if (fallbackPool.length) template = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
      }
      if (template.name === target.name && !revealTriggered) {
        const fallbackPool = pool.filter(item => item.name !== target.name);
        if (fallbackPool.length) template = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
      }
      if (template.name === target.name && revealTriggered) {
        // Already counted above. This branch documents that natural target rolls are intentionally excluded.
      }
    }
    const fish = createFish(template, rarity);
    counts.catches += 1;
    counts.fishValue += fishSellLikeValue(fish);
  }

  return {
    name: rod.name,
    casts: CASTS,
    catches: counts.catches,
    catchRate: counts.catches / CASTS,
    targetRarityCatches: counts.targetRarityCatches,
    targetRarityRate: counts.targetRarityCatches / CASTS,
    targetReveals: counts.targetReveals,
    targetRevealRate: counts.targetRarityCatches ? counts.targetReveals / counts.targetRarityCatches : 0,
    targetHits: counts.targetHits,
    targetHitRate: counts.targetHits / CASTS,
    targetConditionalHitRate: counts.targetRarityCatches ? counts.targetHits / counts.targetRarityCatches : 0,
    targetRewardPerCast: counts.targetReward / CASTS,
    fishValuePerCast: counts.fishValue / CASTS,
    valuePerCast: (counts.fishValue + counts.targetReward) / CASTS
  };
}

console.log(`=== 大量垂钓模拟：${CASTS} 杆，清水团饵，无额外鱼蛋加成 ===`);
console.log('legendary / 彩蛋鱼按1500鱼蛋计；其它鱼按现有售鱼价格规则计。');

const baselineRows = Object.values(ROD_CATALOG)
  .filter(rod => !rod.sourceLottery)
  .map(rod => simulateRod(rod))
  .sort((left, right) => right.valuePerCast - left.valuePerCast);

for (const row of baselineRows.slice(0, 12)) {
  console.log(`${row.name}\t${row.valuePerCast.toFixed(2)} 鱼蛋/杆\t上鱼率 ${(row.catchRate * 100).toFixed(2)}%`);
}

const goldHumbleRod = Object.values(ROD_CATALOG).find(rod => rod.targetFishEffect?.type === 'gold_humble');
if (goldHumbleRod) {
  console.log('\n=== 金满而谦虚之竿：指定目标模拟 ===');
  const targets = [
    { rarity: 'common', name: fishTypes.common[0].name },
    { rarity: 'uncommon', name: fishTypes.uncommon[0].name },
    { rarity: 'rare', name: fishTypes.rare[0].name },
    { rarity: 'epic', name: fishTypes.epic[0].name },
    { rarity: 'legendary', name: fishTypes.legendary[0].name },
    { rarity: EASTER_EGG_RARITY, name: fishTypes[EASTER_EGG_RARITY][0].name }
  ];
  for (const target of targets) {
    const row = simulateRod(goldHumbleRod, { target });
    console.log(`${target.rarity} ${target.name}\t鱼本身 ${row.fishValuePerCast.toFixed(2)} 鱼蛋/杆\t含目标奖励 ${row.valuePerCast.toFixed(2)}\t目标稀有度 ${(row.targetRarityRate * 100).toFixed(3)}%\t条件目标 ${(row.targetConditionalHitRate * 100).toFixed(2)}%\t目标奖励EV ${row.targetRewardPerCast.toFixed(2)}\t干扰数 ${getGoldHumbleDistractorCount(goldHumbleRod.targetFishEffect, target.rarity, fishTypes[target.rarity].length)}`);
  }
}

const lotteryExpected = getLotteryExpectedValue();
const lotteryExpectedAfterGrand = getLotteryExpectedValue({ grandAvailable: false });
console.log('\n=== 祈愿期望 ===');
console.log(`单次成本：${LOTTERY_CONFIG.cost}`);
console.log('限定愿品价值不计入收入期望。');
console.log(`限定愿品仍可遇见：普通愿品期望 ${lotteryExpected.expectedValue.toFixed(2)} 鱼蛋，回报率 ${(lotteryExpected.expectedRate * 100).toFixed(2)}%`);
console.log(`限定愿品已获得后：普通愿品期望 ${lotteryExpectedAfterGrand.expectedValue.toFixed(2)} 鱼蛋，回报率 ${(lotteryExpectedAfterGrand.expectedRate * 100).toFixed(2)}%`);
console.log(`免费祈愿递延期望：每次约 ${lotteryExpected.freeDrawExpectedCount.toFixed(3)} 次免费祈愿`);
