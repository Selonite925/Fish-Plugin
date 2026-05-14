import { BAIT_CATALOG, BASE_CATCH_RATE, EASTER_EGG_RARITY, HIDDEN_PITY_CATCH_BONUS, RARITY_VALUE_LIMITS } from './constants.js';
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

function getEffectiveCatchRate(baseCatchRate) {
  const normalCatchRate = clampNumber(Number(baseCatchRate) || BASE_CATCH_RATE, 0.05, 0.95);
  const pityCatchRate = clampNumber(normalCatchRate + HIDDEN_PITY_CATCH_BONUS, 0.05, 0.95);
  const tenthCastCatchRate = normalCatchRate + ((1 - normalCatchRate) ** 9) * (pityCatchRate - normalCatchRate);
  return ((9 * normalCatchRate) + tenthCastCatchRate) / 10;
}

function getEstimatedPerCastValue(bait = {}) {
  const caughtValue = Math.max(1, getEstimatedCaughtValue(bait));
  const catchRate = getEffectiveCatchRate(BASE_CATCH_RATE + Number(bait.catchRateBonus || 0));
  return catchRate * caughtValue;
}

function applyCustomBaitStatBounds(bait) {
  bait.sizeMultiplier = Number(Math.max(0.96, Math.min(1.08, bait.sizeMultiplier)).toFixed(4));
  bait.weightMultiplier = Number(Math.max(0.95, Math.min(1.13, bait.weightMultiplier)).toFixed(4));
  bait.minSizeRatio = Number(Math.max(0, Math.min(0.08, bait.minSizeRatio)).toFixed(4));
  bait.minWeightRatio = Number(Math.max(0, Math.min(0.1, bait.minWeightRatio)).toFixed(4));
}

function calibrateCustomBaitValue(bait, targetValueMultiplier) {
  const costPerUse = bait.price / bait.packSize;
  const plainExpectedPerCast = getEstimatedPerCastValue();
  const targetExpectedPerCast = plainExpectedPerCast + costPerUse * targetValueMultiplier;
  const baseCatchBonus = Number(bait.catchRateBonus || 0);
  let low = clampNumber(baseCatchBonus + 0.06, 0.06, 0.28);
  let high = clampNumber(baseCatchBonus + 0.24, low + 0.0001, 0.32);

  for (let index = 0; index < 24; index += 1) {
    const mid = (low + high) / 2;
    bait.catchRateBonus = mid;
    const estimatedPerCast = getEstimatedPerCastValue(bait);
    if (estimatedPerCast < targetExpectedPerCast) {
      low = mid;
    } else {
      high = mid;
    }
  }

  bait.catchRateBonus = Number(high.toFixed(4));
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

let customBaitEffectDeltaRange = null;

function createCustomBaitDraft() {
  return {
    catchRateBonus: 0,
    sizeMultiplier: 1,
    weightMultiplier: 1,
    minSizeRatio: 0,
    minWeightRatio: 0,
    rarityBias: createBaseRarityBias(),
    tags: []
  };
}

function getCustomBaitEffectDeltaRange() {
  if (customBaitEffectDeltaRange) return customBaitEffectDeltaRange;

  const plainExpectedPerCast = getEstimatedPerCastValue();
  let minDelta = Infinity;
  let maxDelta = -Infinity;

  for (let positiveA = 0; positiveA < POSITIVE_EFFECTS.length; positiveA += 1) {
    for (let positiveB = positiveA + 1; positiveB < POSITIVE_EFFECTS.length; positiveB += 1) {
      for (let positiveC = positiveB + 1; positiveC < POSITIVE_EFFECTS.length; positiveC += 1) {
        for (let positiveD = positiveC + 1; positiveD < POSITIVE_EFFECTS.length; positiveD += 1) {
          for (let negativeA = 0; negativeA < NEGATIVE_EFFECTS.length; negativeA += 1) {
            for (let negativeB = negativeA + 1; negativeB < NEGATIVE_EFFECTS.length; negativeB += 1) {
              const bait = createCustomBaitDraft();
              POSITIVE_EFFECTS[positiveA].apply(bait);
              POSITIVE_EFFECTS[positiveB].apply(bait);
              POSITIVE_EFFECTS[positiveC].apply(bait);
              POSITIVE_EFFECTS[positiveD].apply(bait);
              NEGATIVE_EFFECTS[negativeA].apply(bait);
              NEGATIVE_EFFECTS[negativeB].apply(bait);
              applyCustomBaitStatBounds(bait);
              const effectDelta = getEstimatedPerCastValue(bait) - plainExpectedPerCast;
              minDelta = Math.min(minDelta, effectDelta);
              maxDelta = Math.max(maxDelta, effectDelta);
            }
          }
        }
      }
    }
  }

  customBaitEffectDeltaRange = {
    min: Number(minDelta.toFixed(6)),
    max: Number(maxDelta.toFixed(6))
  };
  return customBaitEffectDeltaRange;
}

function getCustomBaitValueMultiplier(effectDelta) {
  const range = getCustomBaitEffectDeltaRange();
  const normalizedStrength = clampNumber(
    (effectDelta - range.min) / Math.max(0.0001, range.max - range.min),
    0,
    1
  );
  return Number((0.92 + normalizedStrength * 0.34).toFixed(4));
}

export function generateCustomBaitFromText(text) {
  const source = normalizeText(text);
  const seed = makeHash(source);
  const rand = createRandom(seed);
  const positiveCount = 4;
  const negativeCount = 2;
  const packSize = 3;
  const price = 96;

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
    valueMultiplier: 0,
    description: '',
    sourceText: source,
    isCustom: true,
    tags: []
  };

  const positives = pickMany(POSITIVE_EFFECTS, positiveCount, rand);
  const negatives = pickMany(NEGATIVE_EFFECTS, negativeCount, rand);
  [...positives, ...negatives].forEach(effect => effect.apply(bait));

  bait.catchRateBonus = Number(bait.catchRateBonus.toFixed(4));
  applyCustomBaitStatBounds(bait);

  const plainExpectedPerCast = getEstimatedPerCastValue();
  const rawExpectedPerCast = getEstimatedPerCastValue(bait);
  const effectDelta = rawExpectedPerCast - plainExpectedPerCast;
  bait.valueMultiplier = getCustomBaitValueMultiplier(effectDelta);
  calibrateCustomBaitValue(bait, bait.valueMultiplier);

  bait.description = `根据“${source}”调出来的定制鱼饵，带 4 条正面效果和 2 条负面效果：${bait.tags.slice(0, -1).join('，')}${bait.tags.length > 1 ? '，' : ''}${bait.tags[bait.tags.length - 1]}。`;
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
