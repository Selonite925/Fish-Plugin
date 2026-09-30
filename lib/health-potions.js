import { HEALTH_POTION_CATALOG, HEALTH_POTION_ORDER } from './constants.js';
import { HEALTH_VALUE_REFERENCE_MAX_HEALTH } from './balance-audit.js';
import { getHealthPotionFishEggValue } from './value-formula.js';

function normalizeCount(value) {
  const count = Math.floor(Number(value));
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function normalizeKeyword(value = '') {
  return String(value || '')
    .trim()
    .replace(/[\s　]+/gu, '')
    .toLowerCase();
}

export function normalizeHealthPotionInventory(userData) {
  if (!userData || typeof userData !== 'object') return false;
  const before = JSON.stringify(userData.healthPotions);
  const source = userData.healthPotions && typeof userData.healthPotions === 'object'
    && !Array.isArray(userData.healthPotions)
    ? userData.healthPotions
    : {};
  const normalized = {};
  for (const id of HEALTH_POTION_ORDER) {
    const count = normalizeCount(source[id]);
    if (count > 0) normalized[id] = count;
  }
  userData.healthPotions = normalized;
  return before !== JSON.stringify(normalized);
}

export function getHealthPotionList(userData = {}) {
  normalizeHealthPotionInventory(userData);
  return HEALTH_POTION_ORDER
    .map(id => HEALTH_POTION_CATALOG[id])
    .filter(item => Number(userData.healthPotions?.[item.id] || 0) > 0)
    .map(item => ({ ...item, count: normalizeCount(userData.healthPotions[item.id]) }));
}

export function getHealthPotionByIndex(userData, index) {
  const list = getHealthPotionList(userData);
  const normalizedIndex = Math.floor(Number(index));
  return Number.isInteger(normalizedIndex) && normalizedIndex >= 0 ? list[normalizedIndex] || null : null;
}

export function resolveHealthPotionId(keyword = '', userData = {}) {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return '';
  const list = getHealthPotionList(userData);
  const indexMatch = normalized.match(/^(?:血瓶|生命药剂|药剂)?(\d{1,3})$/u);
  if (indexMatch) {
    return getHealthPotionByIndex(userData, Number(indexMatch[1]) - 1)?.id || '';
  }
  const item = list.find(entry => {
    if (normalizeKeyword(entry.id) === normalized || normalizeKeyword(entry.name) === normalized) return true;
    return (entry.aliases || []).some(alias => normalizeKeyword(alias) === normalized);
  });
  return item?.id || '';
}

export function addHealthPotion(userData, potionId, count = 1) {
  const potion = HEALTH_POTION_CATALOG[potionId];
  if (!potion || !userData || typeof userData !== 'object') return null;
  normalizeHealthPotionInventory(userData);
  const amount = Math.max(1, Math.floor(Number(count || 1)));
  userData.healthPotions[potion.id] = Number(userData.healthPotions[potion.id] || 0) + amount;
  return { potion, count: amount, total: userData.healthPotions[potion.id] };
}

export function consumeHealthPotion(userData, potionId) {
  const potion = HEALTH_POTION_CATALOG[potionId];
  if (!potion || !userData || typeof userData !== 'object') return null;
  normalizeHealthPotionInventory(userData);
  const before = normalizeCount(userData.healthPotions[potion.id]);
  if (before <= 0) return null;
  userData.healthPotions[potion.id] = before - 1;
  if (userData.healthPotions[potion.id] <= 0) delete userData.healthPotions[potion.id];
  return { potion, remaining: Math.max(0, before - 1) };
}

export function getHealthPotionRecovery(potion, maxHealth) {
  if (!potion) return 0;
  if (potion.restoreType === 'percent') {
    return Math.max(1, Math.ceil(Math.max(0, Number(maxHealth) || 0) * Number(potion.restorePercent || 0)));
  }
  return Math.max(0, Math.floor(Number(potion.restoreAmount || 0)));
}

export function getHealthPotionEffectText(potion, maxHealth = 0) {
  if (!potion) return '';
  const recovery = getHealthPotionRecovery(potion, maxHealth);
  if (potion.restoreType === 'percent') {
    const percentText = `恢复生命上限的 ${Math.round(Number(potion.restorePercent || 0) * 100)}%`;
    return Number(maxHealth) > 0 ? `${percentText}（当前上限约 ${recovery} 点）` : percentText;
  }
  return `固定恢复 ${recovery} 点生命值`;
}

export function getHealthPotionValue(potionId, maxHealth = HEALTH_VALUE_REFERENCE_MAX_HEALTH) {
  return getHealthPotionFishEggValue(HEALTH_POTION_CATALOG[potionId], maxHealth);
}
