const HARBOR_DEFAULT = {
  level: 0,
  constructionPoints: 0,
  contributors: {},
  buffExpiresAt: 0
};

export const HARBOR_BUFF_DONATION_THRESHOLD = 2000;
export const HARBOR_BUFF_EXTENSION_MS = 3 * 24 * 60 * 60 * 1000;
export const HARBOR_BUFF_MAX_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const HARBOR_FISH_POINT_VALUES = Object.freeze({
  common: 20,
  uncommon: 50,
  rare: 120,
  epic: 350,
  legendary: 1000
});

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function toSafeNonNegativeInteger(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(numeric));
}

function safeAdd(left, right) {
  return Math.min(
    Number.MAX_SAFE_INTEGER,
    toSafeNonNegativeInteger(left) + toSafeNonNegativeInteger(right)
  );
}

export const HARBOR_LEVELS = [
  {
    level: 0,
    requiredPoints: 0,
    name: '浅滩码头',
    catchRateBonus: 0,
    signalBonusCoins: 0,
    rarityBias: {},
    prosperity: { catchRateBonus: 0.001, signalBonusCoins: 0, rarityBias: {} }
  },
  {
    level: 1,
    requiredPoints: 2000,
    name: '木桩渔港',
    catchRateBonus: 0.003,
    signalBonusCoins: 0,
    rarityBias: {},
    prosperity: { catchRateBonus: 0.002, signalBonusCoins: 0, rarityBias: {} }
  },
  {
    level: 2,
    requiredPoints: 7000,
    name: '潮汐渔港',
    catchRateBonus: 0.006,
    signalBonusCoins: 5,
    rarityBias: {},
    prosperity: { catchRateBonus: 0.003, signalBonusCoins: 4, rarityBias: { rare: 0.001 } }
  },
  {
    level: 3,
    requiredPoints: 16000,
    name: '繁盛渔港',
    catchRateBonus: 0.009,
    signalBonusCoins: 10,
    rarityBias: { rare: 0.003, epic: 0.002, legendary: 0.001 },
    prosperity: { catchRateBonus: 0.004, signalBonusCoins: 6, rarityBias: { rare: 0.001, epic: 0.0008, legendary: 0.0004 } }
  },
  {
    level: 4,
    requiredPoints: 32000,
    name: '星灯渔港',
    catchRateBonus: 0.012,
    signalBonusCoins: 16,
    rarityBias: { rare: 0.005, epic: 0.0035, legendary: 0.002 },
    prosperity: { catchRateBonus: 0.005, signalBonusCoins: 9, rarityBias: { rare: 0.002, epic: 0.0015, legendary: 0.0008 } }
  },
  {
    level: 5,
    requiredPoints: 100000,
    name: '远航渔港',
    catchRateBonus: 0.015,
    signalBonusCoins: 22,
    rarityBias: { rare: 0.0065, epic: 0.0048, legendary: 0.0028 },
    prosperity: { catchRateBonus: 0.006, signalBonusCoins: 12, rarityBias: { rare: 0.0025, epic: 0.002, legendary: 0.001 } }
  },
  {
    level: 6,
    requiredPoints: 300000,
    name: '鲸歌渔港',
    catchRateBonus: 0.019,
    signalBonusCoins: 30,
    rarityBias: { rare: 0.0085, epic: 0.0065, legendary: 0.004 },
    prosperity: { catchRateBonus: 0.0075, signalBonusCoins: 16, rarityBias: { rare: 0.003, epic: 0.0025, legendary: 0.0015 } }
  },
  {
    level: 7,
    requiredPoints: 700000,
    name: '深蓝渔港',
    catchRateBonus: 0.023,
    signalBonusCoins: 40,
    rarityBias: { rare: 0.011, epic: 0.0085, legendary: 0.0055 },
    prosperity: { catchRateBonus: 0.009, signalBonusCoins: 21, rarityBias: { rare: 0.004, epic: 0.003, legendary: 0.002 } }
  },
  {
    level: 8,
    requiredPoints: 1500000,
    name: '天穹渔港',
    catchRateBonus: 0.028,
    signalBonusCoins: 54,
    rarityBias: { rare: 0.014, epic: 0.011, legendary: 0.007 },
    prosperity: { catchRateBonus: 0.011, signalBonusCoins: 28, rarityBias: { rare: 0.005, epic: 0.004, legendary: 0.0025 } }
  }
];

function mergeRarityBias(base = {}, extra = {}) {
  const result = { ...base };
  for (const [rarity, value] of Object.entries(extra || {})) {
    result[rarity] = Number(result[rarity] || 0) + Number(value || 0);
  }
  return result;
}

function getConfiguredEffect(source = {}) {
  return {
    catchRateBonus: Number(source.catchRateBonus || 0),
    signalBonusCoins: Number(source.signalBonusCoins || 0),
    rarityBias: { ...(source.rarityBias || {}) }
  };
}

function normalizeGroupId(groupId) {
  return String(groupId || '').trim();
}

export function ensureHarborState(worldState, groupId) {
  const normalizedGroupId = normalizeGroupId(groupId);
  if (!normalizedGroupId) return null;
  if (!isPlainObject(worldState)) return null;
  if (!isPlainObject(worldState.harbors)) worldState.harbors = {};
  const current = Object.prototype.hasOwnProperty.call(worldState.harbors, normalizedGroupId)
    ? worldState.harbors[normalizedGroupId]
    : null;
  if (!isPlainObject(current)) {
    worldState.harbors[normalizedGroupId] = structuredClone(HARBOR_DEFAULT);
  }
  const harbor = worldState.harbors[normalizedGroupId];
  harbor.constructionPoints = toSafeNonNegativeInteger(harbor.constructionPoints);
  harbor.contributors = isPlainObject(harbor.contributors) ? harbor.contributors : {};
  for (const [userId, contribution] of Object.entries(harbor.contributors)) {
    harbor.contributors[userId] = isPlainObject(contribution)
      ? {
          ...contribution,
          coins: toSafeNonNegativeInteger(contribution.coins),
          fishPoints: toSafeNonNegativeInteger(contribution.fishPoints)
        }
      : { coins: 0, fishPoints: 0 };
  }
  if (!Object.prototype.hasOwnProperty.call(harbor, 'buffExpiresAt')) {
    // Give existing harbors one fair transition period before the timed buff model applies.
    harbor.buffExpiresAt = harbor.constructionPoints > 0
      ? Date.now() + HARBOR_BUFF_EXTENSION_MS
      : 0;
  }
  harbor.buffExpiresAt = toSafeNonNegativeInteger(harbor.buffExpiresAt);
  harbor.level = getHarborLevel(harbor.constructionPoints).level;
  return harbor;
}

export function normalizeHarborStates(worldState) {
  if (!isPlainObject(worldState)) return false;
  if (!isPlainObject(worldState.harbors)) {
    worldState.harbors = {};
    return true;
  }
  const before = JSON.stringify(worldState.harbors);
  for (const groupId of Object.keys(worldState.harbors)) {
    ensureHarborState(worldState, groupId);
  }
  return JSON.stringify(worldState.harbors) !== before;
}

export function getHarborLevel(points = 0) {
  const normalizedPoints = toSafeNonNegativeInteger(points);
  return [...HARBOR_LEVELS].reverse().find(item => normalizedPoints >= item.requiredPoints) || HARBOR_LEVELS[0];
}

export function getNextHarborLevel(level = 0) {
  return HARBOR_LEVELS.find(item => item.level > Number(level || 0)) || null;
}

export function getHarborEffect(worldState, groupId) {
  const harbor = ensureHarborState(worldState, groupId);
  if (!harbor) {
    return {
      level: 0,
      name: '无群渔港',
      catchRateBonus: 0,
      signalBonusCoins: 0,
      rarityBias: {},
      baseEffect: getConfiguredEffect(),
      prosperityEffect: getConfiguredEffect(),
      active: false,
      expiresAt: 0
    };
  }
  const level = getHarborLevel(harbor.constructionPoints);
  const active = harbor.buffExpiresAt > Date.now();
  const baseEffect = getConfiguredEffect(level);
  const prosperityEffect = getConfiguredEffect(level.prosperity);
  return {
    ...level,
    catchRateBonus: baseEffect.catchRateBonus + (active ? prosperityEffect.catchRateBonus : 0),
    signalBonusCoins: baseEffect.signalBonusCoins + (active ? prosperityEffect.signalBonusCoins : 0),
    rarityBias: active
      ? mergeRarityBias(baseEffect.rarityBias, prosperityEffect.rarityBias)
      : baseEffect.rarityBias,
    baseEffect,
    prosperityEffect,
    active,
    expiresAt: harbor.buffExpiresAt
  };
}

function ensureContributor(harbor, userId) {
  const key = String(userId || '').trim();
  if (!key) return null;
  const current = harbor.contributors[key];
  if (!isPlainObject(current)) harbor.contributors[key] = { coins: 0, fishPoints: 0 };
  harbor.contributors[key].coins = toSafeNonNegativeInteger(harbor.contributors[key].coins);
  harbor.contributors[key].fishPoints = toSafeNonNegativeInteger(harbor.contributors[key].fishPoints);
  return harbor.contributors[key];
}

export function applyHarborDonation(worldState, groupId, userId, donation = {}) {
  const harbor = ensureHarborState(worldState, groupId);
  if (!harbor) return null;
  const coins = toSafeNonNegativeInteger(donation.coins);
  const fishPoints = toSafeNonNegativeInteger(donation.fishPoints);
  const points = safeAdd(coins, fishPoints);
  if (points <= 0) return { harbor, points: 0, levelBefore: harbor.level, levelAfter: harbor.level };

  const levelBefore = harbor.level;
  harbor.constructionPoints = safeAdd(harbor.constructionPoints, points);
  harbor.level = getHarborLevel(harbor.constructionPoints).level;
  const requestedTime = toSafeNonNegativeInteger(donation.now);
  const now = requestedTime > 0 ? requestedTime : Date.now();
  const extensionUnits = Math.floor(coins / HARBOR_BUFF_DONATION_THRESHOLD);
  let buffExtendedMs = 0;
  if (extensionUnits > 0) {
    const baseExpiry = Math.max(now, toSafeNonNegativeInteger(harbor.buffExpiresAt));
    const nextExpiry = Math.min(
      baseExpiry + extensionUnits * HARBOR_BUFF_EXTENSION_MS,
      now + HARBOR_BUFF_MAX_DURATION_MS
    );
    buffExtendedMs = Math.max(0, nextExpiry - baseExpiry);
    harbor.buffExpiresAt = nextExpiry;
  }
  const contributor = ensureContributor(harbor, userId);
  if (contributor) {
    contributor.coins = safeAdd(contributor.coins, coins);
    contributor.fishPoints = safeAdd(contributor.fishPoints, fishPoints);
  }
  return {
    harbor,
    points,
    levelBefore,
    levelAfter: harbor.level,
    buffExtensionUnits: extensionUnits,
    buffExtendedMs,
    buffExpiresAt: harbor.buffExpiresAt
  };
}

export function getHarborBuffRemainingMs(harbor, now = Date.now()) {
  return Math.max(0, toSafeNonNegativeInteger(harbor?.buffExpiresAt) - toSafeNonNegativeInteger(now));
}

export function formatHarborBuffRemaining(harbor, now = Date.now()) {
  const remainingMs = getHarborBuffRemainingMs(harbor, now);
  if (remainingMs <= 0) return '繁荣未激活，等级加成仍生效';
  const totalHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}天${hours}小时后到期`;
  return `${Math.max(1, hours)}小时后到期`;
}

export function formatHarborEffectSummary(effect = {}) {
  const parts = [];
  const catchRateBonus = Number(effect.catchRateBonus || 0);
  const signalBonusCoins = Number(effect.signalBonusCoins || 0);
  const rarityBias = effect.rarityBias || {};
  if (catchRateBonus > 0) parts.push(`上鱼率 +${(catchRateBonus * 100).toFixed(1)}%`);
  if (signalBonusCoins > 0) parts.push(`鱼讯额外 +${signalBonusCoins} 鱼蛋`);
  const rarityBonus = ['rare', 'epic', 'legendary']
    .filter(rarity => Number(rarityBias[rarity] || 0) > 0)
    .map(rarity => `${rarity} +${(Number(rarityBias[rarity]) * 100).toFixed(2)}%`);
  if (rarityBonus.length) parts.push(`鱼影倾向 ${rarityBonus.join('/')}`);
  return parts.join('，') || '暂无额外加成';
}

export function getHarborProgressText(harbor) {
  const current = getHarborLevel(harbor?.constructionPoints);
  const next = getNextHarborLevel(current.level);
  const points = toSafeNonNegativeInteger(harbor?.constructionPoints);
  if (!next) return `${current.name} Lv.${current.level}（${points}建设值，已满级）`;
  return `${current.name} Lv.${current.level}（${points}/${next.requiredPoints}建设值，距${next.name}还差${Math.max(0, next.requiredPoints - points)}）`;
}

export function getHarborFishPoints(fish) {
  return HARBOR_FISH_POINT_VALUES[fish?.rarity] || 0;
}
