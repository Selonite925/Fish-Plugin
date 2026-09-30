import { BAIT_CATALOG, HEALTH_POTION_CATALOG } from './constants.js';

export const HEALTH_POINT_COIN_VALUE = 2.42;
export const HEALTH_VALUE_SAFETY_FACTOR = 0.75;

export function healthPointsToFishEggs(points, coinValuePerPoint = HEALTH_POINT_COIN_VALUE) {
  const amount = Number(points);
  const rate = Number(coinValuePerPoint);
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return 0;
  return Math.round(amount * Math.max(0, rate));
}

export function getHealthPotionFishEggValue(potionOrId, maxHealth = 440) {
  const potion = typeof potionOrId === 'string'
    ? HEALTH_POTION_CATALOG[potionOrId]
    : potionOrId;
  if (!potion) return 0;
  const recovery = potion.restoreType === 'percent'
    ? Math.max(1, Math.ceil(Math.max(0, Number(maxHealth) || 0) * Number(potion.restorePercent || 0)))
    : Math.max(0, Math.floor(Number(potion.restoreAmount) || 0));
  return healthPointsToFishEggs(recovery);
}

export function getFishingOutcomeFishEggValue(effect = {}, options = {}) {
  const amount = Number(effect.amount ?? effect.count ?? 0);
  if (!Number.isFinite(amount)) return 0;

  if (effect.type === 'coins') return amount;
  if (effect.type === 'health') return healthPointsToFishEggs(amount, options.healthPointCoinValue);
  if (effect.type === 'health_potion') {
    return getHealthPotionFishEggValue(effect.id, options.maxHealth || 440) * amount;
  }
  if (effect.type === 'bait') {
    const bait = BAIT_CATALOG[effect.id];
    if (!bait) return amount < 0 ? Number(effect.fallbackCoins || 0) : 0;
    const packSize = Math.max(1, Math.floor(Number(bait.packSize) || 1));
    const unitValue = Math.max(0, Number(bait.price) || 0) / packSize;
    if (amount < 0 && !options.baitInventory && effect.fallbackCoins != null) {
      return Number(effect.fallbackCoins) || 0;
    }
    if (amount < 0 && options.baitInventory) {
      const available = Math.max(0, Math.floor(Number(options.baitInventory[effect.id]) || 0));
      if (available <= 0) return Number(effect.fallbackCoins || 0);
      return -Math.min(available, Math.abs(amount)) * unitValue;
    }
    return amount * unitValue;
  }
  return Number(effect.fallbackCoins || 0);
}

export function getExpectedFishingOutcomeFishEggValue(outcomes = [], options = {}) {
  if (!Array.isArray(outcomes) || outcomes.length === 0) return 0;
  const totalWeight = outcomes.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
  if (totalWeight <= 0) return 0;
  return outcomes.reduce((sum, item) => {
    const weight = Math.max(0, Number(item.weight) || 0);
    return sum + weight / totalWeight * getFishingOutcomeFishEggValue(item.effect, options);
  }, 0);
}
