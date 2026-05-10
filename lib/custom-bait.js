import { BAIT_CATALOG, BASE_CATCH_RATE, EASTER_EGG_RARITY, RARITY_VALUE_LIMITS } from './constants.js';
import { rarityWeights } from '../fishdata/fishpool.js';

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getExpectedBodyQuality(multiplier = 1, minRatio = 0) {
  const safeMultiplier = clampNumber(Number(multiplier) || 1, 0.5, 3);
  const safeMinRatio = clampNumber(Number(minRatio) || 0, 0, 0.95);
  const floorEnd = clampNumber(safeMinRatio / safeMultiplier, 0, 1);
  const capStart = clampNumber(1 / safeMultiplier, 0, 1);
  const variableStart = Math.min(floorEnd, capStart);
  const variableEnd = Math.max(floorEnd, capStart);

  return clampNumber(
    safeMinRatio * variableStart +
      (safeMultiplier * (variableEnd ** 2 - variableStart ** 2)) / 2 +
      (1 - variableEnd),
    0,
    1
  );
}

function getEstimatedRarityValue(rarity, bait = {}) {
  const limits = RARITY_VALUE_LIMITS[rarity];
  if (!limits) return 0;
  if (rarity === 'legendary' || rarity === EASTER_EGG_RARITY) return limits.max;

  const lengthQuality = getExpectedBodyQuality(bait.sizeMultiplier, bait.minSizeRatio);
  const weightQuality = getExpectedBodyQuality(bait.weightMultiplier, bait.minWeightRatio);
  const quality = lengthQuality * 0.3 + weightQuality * 0.7;
  return limits.min + (limits.max - limits.min) * quality;
}

function getEstimatedCaughtValue(bait = {}) {
  const adjustedWeights = Object.fromEntries(
    Object.entries(rarityWeights).map(([rarity, weight]) => [
      rarity,
      Math.max(0.0001, weight + Number(bait.rarityBias?.[rarity] || 0))
    ])
  );
  const totalWeight = Object.values(adjustedWeights).reduce((sum, weight) => sum + weight, 0);
  return Object.entries(adjustedWeights).reduce(
    (sum, [rarity, weight]) => sum + (weight / totalWeight) * getEstimatedRarityValue(rarity, bait),
    0
  );
}

function calibrateCustomBaitValue(bait, targetValueMultiplier) {
  const costPerUse = bait.price / bait.packSize;
  const plainExpectedPerCast = BASE_CATCH_RATE * getEstimatedCaughtValue();
  const targetExpectedPerCast = plainExpectedPerCast + costPerUse * targetValueMultiplier;
  const caughtValue = Math.max(1, getEstimatedCaughtValue(bait));
  const targetCatchRate = clampNumber(targetExpectedPerCast / caughtValue, 0.05, 0.95);
  bait.catchRateBonus = Number(clampNumber(targetCatchRate - BASE_CATCH_RATE, 0.1, 0.34).toFixed(4));
}

const POSITIVE_EFFECTS = [
  {
    key: 'openMouth',
    apply: bait => {
      bait.catchRateBonus += 0.01;
      bait.tags.push('更容易让鱼先开口');
    }
  },
  {
    key: 'steadyMouth',
    apply: bait => {
      bait.catchRateBonus += 0.007;
      bait.minWeightRatio = Math.max(bait.minWeightRatio || 0, 0.035);
      bait.tags.push('入口会更稳一点');
    }
  },
  {
    key: 'schoolFlow',
    apply: bait => {
      bait.catchRateBonus += 0.005;
      bait.rarityBias.common += 0.012;
      bait.rarityBias.uncommon += 0.01;
      bait.rarityBias.rare -= 0.003;
      bait.tags.push('杂口会更勤一些');
    }
  },
  {
    key: 'rareTrace',
    apply: bait => {
      bait.rarityBias.common -= 0.012;
      bait.rarityBias.uncommon -= 0.006;
      bait.rarityBias.rare += 0.01;
      bait.rarityBias.epic += 0.006;
      bait.rarityBias.legendary += 0.002;
      bait.tags.push('更像是在等更像样的鱼');
    }
  },
  {
    key: 'deepTrace',
    apply: bait => {
      bait.rarityBias.common -= 0.018;
      bait.rarityBias.uncommon -= 0.008;
      bait.rarityBias.rare += 0.008;
      bait.rarityBias.epic += 0.009;
      bait.rarityBias.legendary += 0.004;
      bait.tags.push('深层鱼口会更靠近一点');
    }
  },
  {
    key: 'longBody',
    apply: bait => {
      bait.sizeMultiplier *= 1.025;
      bait.minSizeRatio = Math.max(bait.minSizeRatio || 0, 0.04);
      bait.tags.push('更容易碰到修长个体');
    }
  },
  {
    key: 'heavyBody',
    apply: bait => {
      bait.weightMultiplier *= 1.035;
      bait.minWeightRatio = Math.max(bait.minWeightRatio || 0, 0.06);
      bait.tags.push('更容易诱出压手个体');
    }
  },
  {
    key: 'fullBody',
    apply: bait => {
      bait.sizeMultiplier *= 1.012;
      bait.weightMultiplier *= 1.018;
      bait.minWeightRatio = Math.max(bait.minWeightRatio || 0, 0.045);
      bait.tags.push('同种鱼的体型会更饱满');
    }
  },
  {
    key: 'epicScent',
    apply: bait => {
      bait.rarityBias.common -= 0.014;
      bait.rarityBias.uncommon -= 0.006;
      bait.rarityBias.rare += 0.006;
      bait.rarityBias.epic += 0.011;
      bait.rarityBias.legendary += 0.003;
      bait.tags.push('高阶鱼讯会更清楚一点');
    }
  },
  {
    key: 'balanced',
    apply: bait => {
      bait.catchRateBonus += 0.004;
      bait.sizeMultiplier *= 1.008;
      bait.weightMultiplier *= 1.008;
      bait.rarityBias.rare += 0.004;
      bait.rarityBias.epic += 0.002;
      bait.tags.push('整体表现会更均衡');
    }
  }
];

const NEGATIVE_EFFECTS = [
  {
    key: 'slowWarm',
    apply: bait => {
      bait.catchRateBonus -= 0.006;
      bait.tags.push('起口会慢半拍');
    }
  },
  {
    key: 'softHook',
    apply: bait => {
      bait.catchRateBonus -= 0.005;
      bait.rarityBias.rare -= 0.004;
      bait.rarityBias.epic -= 0.002;
      bait.tags.push('吃口会虚一点');
    }
  },
  {
    key: 'looseScent',
    apply: bait => {
      bait.rarityBias.common += 0.014;
      bait.rarityBias.uncommon += 0.006;
      bait.rarityBias.rare -= 0.007;
      bait.rarityBias.epic -= 0.004;
      bait.rarityBias.legendary -= 0.001;
      bait.tags.push('味型会有点散');
    }
  },
  {
    key: 'lightBody',
    apply: bait => {
      bait.weightMultiplier *= 0.975;
      bait.tags.push('偶尔会偏轻口');
    }
  },
  {
    key: 'shortBody',
    apply: bait => {
      bait.sizeMultiplier *= 0.985;
      bait.tags.push('体长表现会收一点');
    }
  },
  {
    key: 'muddyTrace',
    apply: bait => {
      bait.rarityBias.common += 0.01;
      bait.rarityBias.uncommon += 0.006;
      bait.rarityBias.rare -= 0.004;
      bait.rarityBias.epic -= 0.005;
      bait.rarityBias.legendary -= 0.002;
      bait.tags.push('高阶鱼讯会被杂味压住一点');
    }
  },
  {
    key: 'thinSignal',
    apply: bait => {
      bait.rarityBias.rare -= 0.006;
      bait.rarityBias.epic -= 0.005;
      bait.rarityBias.legendary -= 0.002;
      bait.tags.push('关键鱼讯会细一点');
    }
  },
  {
    key: 'coarseMix',
    apply: bait => {
      bait.catchRateBonus -= 0.003;
      bait.weightMultiplier *= 0.99;
      bait.rarityBias.common += 0.006;
      bait.rarityBias.rare -= 0.002;
      bait.tags.push('味型会显得粗一点');
    }
  }
];

function createBaseRarityBias() {
  return { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
}

function normalizeText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

function makeHash(text) {
  let hash = 0;
  for (const char of text) {
    hash = (hash * 131 + char.codePointAt(0)) % 2147483647;
  }
  return hash || 17;
}

function createRandom(seed) {
  let state = seed % 2147483647;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

function pickMany(pool, count, rand) {
  const items = [...pool];
  const result = [];
  while (items.length && result.length < count) {
    const index = Math.floor(rand() * items.length);
    result.push(items.splice(index, 1)[0]);
  }
  return result;
}

export function generateCustomBaitFromText(text) {
  const source = normalizeText(text);
  const seed = makeHash(source);
  const rand = createRandom(seed);
  const positiveCount = 4;
  const negativeCount = 2;
  const packSize = 3;
  const price = 96;
  const targetValueMultiplier = 0.8 + rand() * 0.6;

  const bait = {
    id: `custom_${seed.toString(36)}`,
    name: `${source.slice(0, 8)}特调饵`,
    aliases: [source, `${source}特调饵`],
    price,
    packSize,
    catchRateBonus: 0,
    sizeMultiplier: 1,
    weightMultiplier: 1,
    minSizeRatio: 0,
    minWeightRatio: 0,
    rarityBias: createBaseRarityBias(),
    valueMultiplier: Number(targetValueMultiplier.toFixed(4)),
    description: '',
    sourceText: source,
    isCustom: true,
    tags: []
  };

  const positives = pickMany(POSITIVE_EFFECTS, positiveCount, rand);
  const negatives = pickMany(NEGATIVE_EFFECTS, negativeCount, rand);
  [...positives, ...negatives].forEach(effect => effect.apply(bait));

  bait.catchRateBonus = Number(bait.catchRateBonus.toFixed(4));
  bait.sizeMultiplier = Number(Math.max(0.96, Math.min(1.08, bait.sizeMultiplier)).toFixed(4));
  bait.weightMultiplier = Number(Math.max(0.95, Math.min(1.13, bait.weightMultiplier)).toFixed(4));
  bait.minSizeRatio = Number(Math.max(0, Math.min(0.08, bait.minSizeRatio)).toFixed(4));
  bait.minWeightRatio = Number(Math.max(0, Math.min(0.1, bait.minWeightRatio)).toFixed(4));
  const calibrationValueMultiplier = 0.9 + ((targetValueMultiplier - 0.8) / 0.6) * 0.46;
  calibrateCustomBaitValue(bait, calibrationValueMultiplier);

  bait.description = `由“${source}”提取出来的手作鱼饵，${bait.tags.slice(0, -1).join('，')}${bait.tags.length > 1 ? '，' : ''}${bait.tags[bait.tags.length - 1]}。`;
  delete bait.tags;
  return bait;
}

export function getBuiltinBaitList() {
  return Object.values(BAIT_CATALOG);
}

export function findCustomBaitBySource(customBaits = {}, text) {
  const source = normalizeText(text);
  return Object.values(customBaits).find(item => item?.sourceText === source) || null;
}
