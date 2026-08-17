const MAX_SAFE_POINTS = Number.MAX_SAFE_INTEGER;

export const RELEASE_RARITY_VALUES = Object.freeze({
  common: 1,
  uncommon: 2,
  rare: 5,
  epic: 12,
  legendary: 30
});

// Reaching the final named water does not end the loop. Further releases
// periodically earn a small return gift, while the hidden affinity keeps
// growing for future extensions.
export const RELEASE_ECHO_REPEAT_INTERVAL = 240;

// The thresholds stay internal: players see the named waters, not a grind meter.
export const RELEASE_ECHO_TIERS = Object.freeze([
  {
    level: 0,
    name: '静水',
    description: '水面还在记住你的脚步。',
    summary: '水面还没有形成额外回应。',
    effect: { catchRateBonus: 0, baitPreserveChance: 0, rarityBias: {}, signalBonusCoins: 0 },
    gift: null
  },
  {
    level: 1,
    requiredPoints: 24,
    name: '微澜',
    description: '放生后的鱼群开始回到你的钩边。',
    summary: '鱼群会更愿意回到你的钩边。',
    effect: { catchRateBonus: 0.0025, baitPreserveChance: 0, rarityBias: {}, signalBonusCoins: 0 },
    gift: { type: 'ticket', label: '潮水送来了一张钓鱼券' }
  },
  {
    level: 2,
    requiredPoints: 72,
    name: '回潮',
    description: '潮水会替你护住偶尔的饵香。',
    summary: '偶尔有一份饵香会被潮水替你留下。',
    effect: { catchRateBonus: 0.0025, baitPreserveChance: 0.045, rarityBias: {}, signalBonusCoins: 0 },
    gift: { type: 'bait', baitId: 'silver_bait', label: '潮水送来了一份银鳞鱼饵' }
  },
  {
    level: 3,
    requiredPoints: 168,
    name: '深流',
    description: '深水鱼影愿意在回声里靠近。',
    summary: '深水鱼影更愿意在回声里靠近。',
    effect: {
      catchRateBonus: 0.0025,
      baitPreserveChance: 0.045,
      rarityBias: { rare: 0.0015, epic: 0.0009, legendary: 0.0004 },
      signalBonusCoins: 0
    },
    gift: { type: 'ticket', label: '深流回赠了一张钓鱼券' }
  },
  {
    level: 4,
    requiredPoints: 360,
    name: '海歌',
    description: '鱼讯会把你的善意带得更远。',
    summary: '命中鱼讯时，回响会替你留下一点额外收成。',
    effect: {
      catchRateBonus: 0.0025,
      baitPreserveChance: 0.045,
      rarityBias: { rare: 0.0015, epic: 0.0009, legendary: 0.0004 },
      signalBonusCoins: 3
    },
    gift: { type: 'bait', baitId: 'deep_bait', label: '海歌送来了一份沉流鱼饵' }
  }
]);

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function toSafeNonNegativeInteger(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.min(MAX_SAFE_POINTS, Math.floor(numeric));
}

function safeAdd(left, right) {
  return Math.min(MAX_SAFE_POINTS, toSafeNonNegativeInteger(left) + toSafeNonNegativeInteger(right));
}

export function getReleaseFishValue(fish) {
  return RELEASE_RARITY_VALUES[fish?.rarity] || 0;
}

export function getReleaseEchoTier(points = 0) {
  const normalizedPoints = toSafeNonNegativeInteger(points);
  return [...RELEASE_ECHO_TIERS]
    .reverse()
    .find(tier => normalizedPoints >= Number(tier.requiredPoints || 0)) || RELEASE_ECHO_TIERS[0];
}

export function ensureReleaseEcho(userData) {
  if (!isPlainObject(userData)) return null;
  if (!isPlainObject(userData.releaseEcho)) userData.releaseEcho = {};
  const echo = userData.releaseEcho;
  echo.points = toSafeNonNegativeInteger(echo.points);
  echo.releasedCount = toSafeNonNegativeInteger(echo.releasedCount);
  echo.lastReleaseAt = toSafeNonNegativeInteger(echo.lastReleaseAt);
  const lastRarity = typeof echo.lastRarity === 'string' ? echo.lastRarity.trim() : '';
  echo.lastRarity = Object.prototype.hasOwnProperty.call(RELEASE_RARITY_VALUES, lastRarity) ? lastRarity : '';
  echo.tier = getReleaseEchoTier(echo.points).level;
  return echo;
}

export function getReleaseEchoEffect(userData) {
  const echo = ensureReleaseEcho(userData);
  const tier = getReleaseEchoTier(echo?.points || 0);
  return {
    level: tier.level,
    name: tier.name,
    description: tier.description,
    summary: tier.summary || tier.description,
    catchRateBonus: Number(tier.effect?.catchRateBonus || 0),
    baitPreserveChance: Number(tier.effect?.baitPreserveChance || 0),
    rarityBias: { ...(tier.effect?.rarityBias || {}) },
    signalBonusCoins: Number(tier.effect?.signalBonusCoins || 0)
  };
}

function getFinalTier() {
  return RELEASE_ECHO_TIERS[RELEASE_ECHO_TIERS.length - 1];
}

function getRepeatGiftCycle(points = 0) {
  const finalPoints = Number(getFinalTier()?.requiredPoints || 0);
  const normalizedPoints = toSafeNonNegativeInteger(points);
  if (normalizedPoints <= finalPoints) return 0;
  return Math.floor((normalizedPoints - finalPoints) / RELEASE_ECHO_REPEAT_INTERVAL);
}

export function getReleaseEchoRepeatGift(cycle = 1) {
  const numericCycle = Number(cycle);
  const normalizedCycle = Number.isFinite(numericCycle)
    ? Math.max(1, Math.floor(numericCycle))
    : 1;
  if (normalizedCycle % 2 === 1) {
    return { type: 'ticket', label: '海歌留下了一张钓鱼券' };
  }
  return { type: 'bait', baitId: 'deep_bait', label: '海歌留下了一份沉流鱼饵' };
}

export function getReleaseEchoStatus(userData) {
  const echo = ensureReleaseEcho(userData);
  const tier = getReleaseEchoTier(echo?.points || 0);
  const nextTier = RELEASE_ECHO_TIERS.find(item => item.level === tier.level + 1) || null;
  return {
    tier,
    nextTier,
    releasedCount: echo?.releasedCount || 0,
    lastRarity: echo?.lastRarity || ''
  };
}

export function applyReleaseEcho(userData, fishes = []) {
  const echo = ensureReleaseEcho(userData);
  if (!echo) return null;
  const fishList = (Array.isArray(fishes) ? fishes : [fishes]).filter(Boolean);
  const pointsGained = fishList.reduce((sum, fish) => sum + getReleaseFishValue(fish), 0);
  const pointsBefore = echo.points;
  const tierBefore = getReleaseEchoTier(echo.points);
  echo.points = safeAdd(echo.points, pointsGained);
  echo.releasedCount = safeAdd(echo.releasedCount, fishList.length);
  echo.lastRarity = fishList[fishList.length - 1]?.rarity || echo.lastRarity;
  echo.lastReleaseAt = Date.now();
  echo.tier = getReleaseEchoTier(echo.points).level;
  const tierAfter = getReleaseEchoTier(echo.points);
  const promotedTiers = RELEASE_ECHO_TIERS.filter(tier => tier.level > tierBefore.level && tier.level <= tierAfter.level);
  const repeatGiftCycleBefore = getRepeatGiftCycle(pointsBefore);
  const repeatGiftCycleAfter = getRepeatGiftCycle(echo.points);
  const repeatGiftCount = Math.min(8, Math.max(0, repeatGiftCycleAfter - repeatGiftCycleBefore));
  const repeatGifts = Array.from({ length: repeatGiftCount }, (_, index) =>
    getReleaseEchoRepeatGift(repeatGiftCycleBefore + index + 1)
  );
  return {
    fishCount: fishList.length,
    pointsGained,
    tierBefore,
    tierAfter,
    promotedTiers,
    repeatGiftCount,
    repeatGifts,
    releasedCount: echo.releasedCount
  };
}

export function getReleaseEchoGift(tier) {
  if (!tier?.gift) return null;
  return { ...tier.gift };
}
