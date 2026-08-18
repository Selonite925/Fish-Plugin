import { RARITY_LABELS, RARITY_ORDER, ROD_CATALOG } from './constants.js';
import { fishTypes, legacyFishAliases } from '../fishdata/fishpool.js';
import { getMapFishTypes, normalizeMapId } from './maps.js';

function normalizeFishTemplateName(name = '') {
  const text = String(name || '').trim();
  if (!text) return '';
  return legacyFishAliases?.[text] || text;
}

function rarityLabel(rarity) {
  return RARITY_LABELS[rarity] || rarity;
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function shuffleList(list = []) {
  const shuffled = [...list];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function normalizeTargetMapId(mapId = 'pond') {
  return normalizeMapId(mapId) === 'abyss' ? 'abyss' : 'pond';
}

function getLegacyTargetMapId(target) {
  return normalizeTargetMapId(target?.mapId || 'pond');
}

function normalizeTargetChangeDateValue(value) {
  const date = String(value || '').trim();
  return date === '[object Object]' ? '' : date;
}

export function getRodTargetForMap(userData, rod, mapId = 'pond') {
  const targetStore = userData?.rodTargets?.[rod?.id];
  const targetMapId = normalizeTargetMapId(mapId);
  if (!targetStore || typeof targetStore !== 'object') return null;
  if (targetStore.byMap && typeof targetStore.byMap === 'object' && !Array.isArray(targetStore.byMap)) {
    const target = targetStore.byMap[targetMapId];
    return target && typeof target === 'object' ? target : null;
  }
  if (!targetStore.type || getLegacyTargetMapId(targetStore) !== targetMapId) return null;
  return targetStore;
}

export function setRodTargetForMap(userData, rodId, mapId, target) {
  if (!userData || !rodId || !target) return;
  if (!userData.rodTargets || typeof userData.rodTargets !== 'object' || Array.isArray(userData.rodTargets)) {
    userData.rodTargets = {};
  }
  const targetMapId = normalizeTargetMapId(mapId);
  const current = userData.rodTargets?.[rodId];
  const byMap = current?.byMap && typeof current.byMap === 'object' && !Array.isArray(current.byMap)
    ? { ...current.byMap }
    : current?.type
      ? { [getLegacyTargetMapId(current)]: current }
      : {};
  byMap[targetMapId] = { ...target, mapId: targetMapId };
  userData.rodTargets[rodId] = { byMap };
}

export function clearRodTargetForMap(userData, rodId, mapId) {
  if (!userData?.rodTargets?.[rodId]) return false;
  const targetMapId = normalizeTargetMapId(mapId);
  const current = userData.rodTargets[rodId];
  if (current?.byMap && typeof current.byMap === 'object' && !Array.isArray(current.byMap)) {
    const byMap = { ...current.byMap };
    if (!Object.hasOwn(byMap, targetMapId)) return false;
    delete byMap[targetMapId];
    if (Object.keys(byMap).length) userData.rodTargets[rodId] = { byMap };
    else delete userData.rodTargets[rodId];
    return true;
  }
  if (current.type && getLegacyTargetMapId(current) === targetMapId) {
    delete userData.rodTargets[rodId];
    return true;
  }
  return false;
}

export function getRodTargetChangeDateForMap(userData, rodId, mapId = 'pond') {
  const value = userData?.rodTargetChangeDates?.[rodId];
  const targetMapId = normalizeTargetMapId(mapId);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return normalizeTargetChangeDateValue(value[targetMapId]);
  }
  return targetMapId === 'pond' ? normalizeTargetChangeDateValue(value) : '';
}

export function setRodTargetChangeDateForMap(userData, rodId, mapId, dateKey) {
  if (!userData) return;
  if (!userData.rodTargetChangeDates || typeof userData.rodTargetChangeDates !== 'object' || Array.isArray(userData.rodTargetChangeDates)) {
    userData.rodTargetChangeDates = {};
  }
  const targetMapId = normalizeTargetMapId(mapId);
  const current = userData.rodTargetChangeDates?.[rodId];
  const byMap = current && typeof current === 'object' && !Array.isArray(current)
    ? { ...current }
    : current
      ? { pond: normalizeTargetChangeDateValue(current) }
      : {};
  byMap[targetMapId] = normalizeTargetChangeDateValue(dateKey);
  userData.rodTargetChangeDates[rodId] = byMap;
}

export function resolveRodTarget(userData, rod, options = {}) {
  const mapId = normalizeTargetMapId(options.mapId || options.mapContext?.id || 'pond');
  const target = getRodTargetForMap(userData, rod, mapId);
  if (!target || typeof target !== 'object') return null;
  const type = String(target.type || 'fish').trim();
  const rarity = String(target.rarity || '').trim();
  if (!rarity || !RARITY_ORDER.includes(rarity)) return null;
  if (type === 'rarity') {
    return {
      type: 'rarity',
      rarity,
      name: '',
      mapId,
      template: null,
      distractors: [],
      updatedAt: Number(target.updatedAt || 0),
      updatedDate: String(target.updatedDate || '').trim()
    };
  }
  const name = normalizeFishTemplateName(target.name);
  if (!name) return null;
  const mapFishTypes = options.fishTypes || options.mapContext?.fishTypes || (mapId === 'pond' ? fishTypes : getMapFishTypes(mapId));
  const mapPool = Array.isArray(mapFishTypes?.[rarity]) ? mapFishTypes[rarity] : [];
  const template = mapPool.find(item => item?.name === name) || null;
  if (!template) return null;
  const poolNames = new Set(mapPool.map(item => item?.name).filter(Boolean));
  const distractors = Array.isArray(target.distractors)
    ? target.distractors
      .map(item => normalizeFishTemplateName(item))
      .filter(item => item && item !== name && (
        poolNames.has(item)
      ))
    : [];
  return {
    type: 'fish',
    name,
    rarity,
    mapId,
    template,
    distractors: [...new Set(distractors)],
    updatedAt: Number(target.updatedAt || 0),
    updatedDate: String(target.updatedDate || '').trim()
  };
}

export function isGoldHumbleRarityTarget(target) {
  return target?.type === 'rarity' || target?.targetType === 'rarity';
}

export function getGoldHumbleTargetDisplayName(target) {
  if (!target) return '未指定';
  if (isGoldHumbleRarityTarget(target)) return `${rarityLabel(target.rarity)} 稀有度`;
  return `${target.name}（${target.rarity}）`;
}

export function getGoldHumbleTargetShortName(target) {
  if (!target) return '未指定';
  return isGoldHumbleRarityTarget(target) ? `${rarityLabel(target.rarity)} 稀有度` : target.name;
}

export function getGoldHumbleRarityBias(rod, rodTarget) {
  if (rod?.targetFishEffect?.type !== 'gold_humble' || !rodTarget?.rarity) return {};
  return rod.targetFishEffect.rarityBiasByTargetRarity?.[rodTarget.rarity] || {};
}

export function getGoldHumbleCatchRateBonus(rod, rodTarget) {
  if (rod?.targetFishEffect?.type !== 'gold_humble' || !rodTarget?.rarity) return 0;
  return Number(rod.targetFishEffect.catchRateBonusByTargetRarity?.[rodTarget.rarity] || 0);
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

export function getGoldHumbleTargetProfile(effect, rarity, target = '', poolSize = 0) {
  const rarityTarget = typeof target === 'object' && isGoldHumbleRarityTarget(target);
  const targetName = typeof target === 'object' ? target.name : target;
  const rewardMap = rarityTarget ? effect?.rarityTargetRewardCoinsByRarity : effect?.rewardCoinsByRarity;
  const baseReward = Math.max(0, Math.floor(Number(rewardMap?.[rarity] || 0)));
  const rewardMultiplier = rarityTarget ? 1 : getGoldHumbleTargetRewardMultiplier(targetName);
  return {
    revealChance: clampNumber(effect?.revealChanceByRarity?.[rarity] ?? 0, 0, 1),
    distractorCount: getGoldHumbleDistractorCount(effect, rarity, poolSize),
    rewardCoins: Math.max(0, Math.floor(baseReward * rewardMultiplier))
  };
}

export function pickGoldHumbleDistractors(pool = [], targetName = '', count = 0) {
  const candidates = pool.filter(item => item?.name && item.name !== targetName);
  return shuffleList(candidates)
    .slice(0, Math.max(0, Math.min(candidates.length, count)))
    .map(item => item.name);
}

function getStableGoldHumbleDistractors(pool = [], target, count = 0, excludes = []) {
  const excludeSet = new Set([target?.name, ...excludes].filter(Boolean));
  const seed = `${target?.name || ''}:${target?.rarity || ''}:${target?.updatedAt || target?.updatedDate || ''}`;
  return pool
    .filter(item => item?.name && !excludeSet.has(item.name))
    .map(item => {
      const hash = [...`${seed}:${item.name}`]
        .reduce((sum, char) => ((sum * 131) + (char.codePointAt(0) || 0)) >>> 0, 0);
      return { name: item.name, hash };
    })
    .sort((left, right) => left.hash - right.hash)
    .slice(0, Math.max(0, Math.min(pool.length, count)))
    .map(item => item.name);
}

export function resolveGoldHumbleCandidateNames(effect, pool = [], target) {
  if (!target?.name || !target?.rarity) return [];
  if (isGoldHumbleRarityTarget(target)) return [];
  const profile = getGoldHumbleTargetProfile(effect, target.rarity, target, pool.length);
  const poolNames = new Set(pool.map(item => item.name));
  const distractors = Array.isArray(target.distractors)
    ? target.distractors.filter(name => name !== target.name && poolNames.has(name))
    : [];
  const activeDistractors = distractors.slice(0, profile.distractorCount);
  const missingCount = Math.max(0, profile.distractorCount - activeDistractors.length);
  const fallbackDistractors = missingCount > 0
    ? getStableGoldHumbleDistractors(
      pool.filter(item => !activeDistractors.includes(item.name)),
      target,
      missingCount,
      activeDistractors
    )
    : [];
  return [target.name, ...activeDistractors, ...fallbackDistractors].filter(name => poolNames.has(name));
}

export function getGoldHumbleSpecialRewardCoins(effect = {}) {
  const configuredReward = Math.floor(Number(effect.rewardCoins || 0));
  if (configuredReward > 0) return configuredReward;
  if (!effect?.targetHit || effect.type !== 'gold_humble') return 0;

  const rod = ROD_CATALOG[effect.rodId] || Object.values(ROD_CATALOG).find(item => item.targetFishEffect?.type === 'gold_humble');
  const rarity = String(effect.targetRarity || '').trim();
  if (!rod?.targetFishEffect || !rarity) return 1;
  const target = {
    type: effect.targetType === 'rarity' ? 'rarity' : 'fish',
    targetType: effect.targetType,
    rarity,
    name: effect.targetType === 'rarity' ? '' : String(effect.targetName || '').trim()
  };
  const fallbackReward = getGoldHumbleTargetProfile(rod.targetFishEffect, rarity, target).rewardCoins;
  return Math.max(1, Math.floor(Number(fallbackReward || 0)));
}
