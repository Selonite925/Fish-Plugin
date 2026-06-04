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
  const counts = { catches: 0, targetHits: 0, value: 0, targetReward: 0 };
  const catchRate = clamp(BASE_CATCH_RATE + Number(rod.catchRateBonus || 0), 0.05, 0.95);
  const failProtection = clamp(Number(rod.failProtection || 0), 0, 0.45);
  const weights = applyRarityBias(rarityWeights, rod.rarityBias || {});
  const rarities = Object.keys(fishTypes);
  const target = options.target;

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
      const lookCount = Math.max(1, Math.min(pool.length, Number(rod.targetFishEffect.lookCount || 1)));
      const candidates = [...pool].sort(() => Math.random() - 0.5).slice(0, lookCount);
      const targetTemplate = candidates.find(item => item.name === target.name);
      if (targetTemplate) {
        template = targetTemplate;
        counts.targetHits += 1;
        const reward = Number(rod.targetFishEffect.rewardCoinsByRarity?.[rarity] || 0);
        counts.targetReward += reward;
        counts.value += reward;
      }
    }
    const fish = createFish(template, rarity);
    counts.catches += 1;
    counts.value += fishSellLikeValue(fish);
  }

  return {
    name: rod.name,
    casts: CASTS,
    catches: counts.catches,
    catchRate: counts.catches / CASTS,
    targetHits: counts.targetHits,
    targetHitRate: counts.targetHits / CASTS,
    targetRewardPerCast: counts.targetReward / CASTS,
    valuePerCast: counts.value / CASTS
  };
}

console.log(`=== 大量垂钓模拟：${CASTS} 杆，清水团饵，无额外鱼币加成 ===`);
console.log('legendary / 彩蛋鱼按1500鱼币计；其它鱼按现有售鱼价格规则计。');

const baselineRows = Object.values(ROD_CATALOG)
  .filter(rod => !rod.sourceLottery)
  .map(rod => simulateRod(rod))
  .sort((left, right) => right.valuePerCast - left.valuePerCast);

for (const row of baselineRows.slice(0, 12)) {
  console.log(`${row.name}\t${row.valuePerCast.toFixed(2)} 鱼币/杆\t上鱼率 ${(row.catchRate * 100).toFixed(2)}%`);
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
    console.log(`${target.rarity} ${target.name}\t${row.valuePerCast.toFixed(2)} 鱼币/杆\t目标命中 ${(row.targetHitRate * 100).toFixed(3)}%\t目标奖励EV ${row.targetRewardPerCast.toFixed(2)}`);
  }
}

const lotteryExpected = getLotteryExpectedValue();
console.log('\n=== 抽奖期望 ===');
console.log(`单抽成本：${LOTTERY_CONFIG.cost}`);
console.log(`单抽期望：${lotteryExpected.expectedValue.toFixed(2)} 鱼币`);
console.log(`长期回报率：${(lotteryExpected.expectedRate * 100).toFixed(2)}%`);
console.log(`大奖贡献：${lotteryExpected.grandExpected.toFixed(2)} | 普通奖贡献：${lotteryExpected.regularExpected.toFixed(2)}`);
