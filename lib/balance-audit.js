import { BASE_CATCH_RATE, MAX_TANK_LEVEL } from './constants.js';
import { getFishSellValue, getFishValue } from './economy.js';
import { HARBOR_LEVELS } from './harbor.js';
import {
  DEEP_SEA_CAST_HEALTH_COST,
  DEEP_SEA_FISHBALL_RATE,
  getMapProfile,
  getPlayerMaxHealth
} from './maps.js';
import { rarityWeights } from '../fishdata/fishpool.js';
import { HEALTH_POINT_COIN_VALUE, HEALTH_VALUE_SAFETY_FACTOR } from './value-formula.js';

export const HEALTH_VALUE_REFERENCE_MAX_HEALTH = getPlayerMaxHealth(
  { tankLevel: MAX_TANK_LEVEL },
  Math.max(...HARBOR_LEVELS.map(item => Number(item.level) || 0))
);

export function getDeepSeaBaselineRewardPerCatch() {
  const profile = getMapProfile('abyss');
  const totalRarityWeight = Object.values(rarityWeights)
    .reduce((sum, weight) => sum + Math.max(0, Number(weight) || 0), 0);
  if (totalRarityWeight <= 0) return { sellValue: 0, internalValue: 0 };

  let sellValue = 0;
  let internalValue = 0;
  for (const [rarity, weightValue] of Object.entries(rarityWeights)) {
    const fish = profile.fishTypes?.[rarity] || [];
    if (!fish.length) continue;
    const weight = Math.max(0, Number(weightValue) || 0) / totalRarityWeight;
    const averageSellValue = fish.reduce((sum, item) =>
      sum + getFishSellValue({ ...item, rarity, mapId: 'abyss' }), 0) / fish.length;
    const averageInternalValue = fish.reduce((sum, item) =>
      sum + getFishValue({ ...item, rarity, mapId: 'abyss' }), 0) / fish.length;
    sellValue += weight * averageSellValue;
    internalValue += weight * averageInternalValue;
  }
  return { sellValue, internalValue };
}

export function deriveHealthPointCoinValue() {
  const fishValue = getDeepSeaBaselineRewardPerCatch();
  const expectedCoinsPerCast = BASE_CATCH_RATE * (
    fishValue.sellValue + DEEP_SEA_FISHBALL_RATE * fishValue.internalValue
  );
  return Math.round(
    expectedCoinsPerCast / DEEP_SEA_CAST_HEALTH_COST * HEALTH_VALUE_SAFETY_FACTOR * 100
  ) / 100;
}

export function getHealthValueAudit() {
  return {
    referenceMaxHealth: HEALTH_VALUE_REFERENCE_MAX_HEALTH,
    expectedCoinsPerBaseCast: (() => {
      const fishValue = getDeepSeaBaselineRewardPerCatch();
      return BASE_CATCH_RATE * (fishValue.sellValue + DEEP_SEA_FISHBALL_RATE * fishValue.internalValue);
    })(),
    expectedHealthValuePerPoint: deriveHealthPointCoinValue(),
    configuredHealthValuePerPoint: HEALTH_POINT_COIN_VALUE,
    matchesConfiguredValue: deriveHealthPointCoinValue() === HEALTH_POINT_COIN_VALUE
  };
}
