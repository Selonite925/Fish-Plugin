import { BAIT_CATALOG } from './constants.js';

const POSITIVE_EFFECTS = [
  {
    key: 'catchRateBonus',
    apply: bait => {
      bait.catchRateBonus += 0.02;
      bait.tags.push('更容易让鱼先开口');
    }
  },
  {
    key: 'commonFlow',
    apply: bait => {
      bait.rarityBias.common += 0.015;
      bait.rarityBias.uncommon += 0.008;
      bait.tags.push('杂口会更勤一些');
    }
  },
  {
    key: 'rareLean',
    apply: bait => {
      bait.rarityBias.common -= 0.015;
      bait.rarityBias.uncommon -= 0.008;
      bait.rarityBias.rare += 0.015;
      bait.rarityBias.epic += 0.008;
      bait.tags.push('更像是在等更像样的鱼');
    }
  },
  {
    key: 'steadyPull',
    apply: bait => {
      bait.catchRateBonus += 0.01;
      bait.tags.push('手感会稳一点');
    }
  }
];

const NEGATIVE_EFFECTS = [
  {
    key: 'slowWarm',
    apply: bait => {
      bait.catchRateBonus -= 0.01;
      bait.tags.push('起口会慢半拍');
    }
  },
  {
    key: 'lightMouth',
    apply: bait => {
      bait.rarityBias.common -= 0.01;
      bait.tags.push('普通鱼会挑一点');
    }
  },
  {
    key: 'scatter',
    apply: bait => {
      bait.rarityBias.uncommon -= 0.008;
      bait.rarityBias.rare -= 0.006;
      bait.tags.push('鱼口有时会散');
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
  const positiveCount = rand() < 0.55 ? 1 : 2;

  const bait = {
    id: `custom_${seed.toString(36)}`,
    name: `${source.slice(0, 8)}特调饵`,
    aliases: [source, `${source}特调饵`],
    price: 66,
    packSize: 2,
    catchRateBonus: 0,
    rarityBias: createBaseRarityBias(),
    description: '',
    sourceText: source,
    isCustom: true,
    tags: []
  };

  const positives = pickMany(POSITIVE_EFFECTS, positiveCount, rand);
  const negative = pickMany(NEGATIVE_EFFECTS, 1, rand);
  [...positives, ...negative].forEach(effect => effect.apply(bait));

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
