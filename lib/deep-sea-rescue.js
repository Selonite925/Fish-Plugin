import { getFishValue } from './economy.js';

export const DEEP_SEA_RESCUE_GRAND_PRIZE_ID = 'deep_sea_lifeline';
export const DEEP_SEA_RESCUE_MULTIPLIER = 1.5;
export const DEEP_SEA_RESCUE_WINDOW_DAYS = 1;

function cloneFish(fish) {
  return typeof structuredClone === 'function'
    ? structuredClone(fish)
    : JSON.parse(JSON.stringify(fish));
}

function normalizeDateKey(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function shiftDateKey(dateKey, days) {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) return '';
  const date = new Date(`${normalized}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Math.floor(Number(days) || 0));
  return date.toISOString().slice(0, 10);
}

export function hasDeepSeaRescueGuarantee(userData) {
  return Array.isArray(userData?.lotteryGrandPrizes) && userData.lotteryGrandPrizes.includes(DEEP_SEA_RESCUE_GRAND_PRIZE_ID);
}

export function ensureDeepSeaRescueFish(userData) {
  if (!userData || typeof userData !== 'object') return [];
  if (!Array.isArray(userData.deepSeaRescueFish)) userData.deepSeaRescueFish = [];
  return userData.deepSeaRescueFish;
}

export function pruneExpiredDeepSeaRescueFish(userData, todayKey) {
  const list = ensureDeepSeaRescueFish(userData);
  const today = normalizeDateKey(todayKey);
  if (!today) return 0;
  const before = list.length;
  userData.deepSeaRescueFish = list.filter(item => {
    const availableDate = normalizeDateKey(item?.availableDate);
    return availableDate && availableDate >= today;
  });
  return before - userData.deepSeaRescueFish.length;
}

export function recordDeepSeaEscapedFish(userData, fish, escapedDate) {
  if (!hasDeepSeaRescueGuarantee(userData) || !fish || typeof fish !== 'object') return null;
  const date = normalizeDateKey(escapedDate);
  if (!date) return null;
  const list = ensureDeepSeaRescueFish(userData);
  const copy = cloneFish(fish);
  copy.mapId = 'abyss';
  const entry = {
    id: `rescue_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    fish: copy,
    escapedDate: date,
    availableDate: shiftDateKey(date, DEEP_SEA_RESCUE_WINDOW_DAYS),
    recordedAt: Date.now()
  };
  list.push(entry);
  if (list.length > 20) list.splice(0, list.length - 20);
  return entry;
}

export function getAvailableDeepSeaRescueFish(userData, todayKey) {
  const today = normalizeDateKey(todayKey);
  if (!today) return [];
  return ensureDeepSeaRescueFish(userData)
    .filter(item => normalizeDateKey(item?.availableDate) === today)
    .map((item, index) => ({ ...item, index, cost: getDeepSeaRescueCost(item.fish) }));
}

export function getDeepSeaRescueCost(fish) {
  const fishValue = Math.max(0, Math.floor(Number(getFishValue(fish) || 0)));
  return Math.max(1, Math.ceil(fishValue * DEEP_SEA_RESCUE_MULTIPLIER));
}

export function removeDeepSeaRescueFish(userData, ids = []) {
  const wanted = new Set((Array.isArray(ids) ? ids : [ids]).map(id => String(id || '').trim()).filter(Boolean));
  if (!wanted.size) return [];
  const list = ensureDeepSeaRescueFish(userData);
  const removed = list.filter(item => wanted.has(String(item?.id || '').trim()));
  userData.deepSeaRescueFish = list.filter(item => !wanted.has(String(item?.id || '').trim()));
  return removed;
}
