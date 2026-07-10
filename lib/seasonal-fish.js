import { fishTypes } from '../fishdata/fishpool.js';
import { getTodayKey } from './time.js';

export const SEASON_CATALOG = {
  duanwu_2026: {
    id: 'duanwu_2026',
    name: '端午江潮',
    startDate: '2026-06-18',
    endDateExclusive: '2026-07-03',
    description: '端午期间才会出现的节令鱼影。'
  },
  summer_tide_2026: {
    id: 'summer_tide_2026',
    name: '夏潮赛季',
    startDate: '2026-07-04',
    endDateExclusive: '2026-09-01',
    description: '潮水转暖后，新的鱼影会沿着夏夜水线靠岸。'
  }
};

function isDateInRange(dateKey, startDate, endDateExclusive) {
  const key = String(dateKey || '').trim();
  return Boolean(key && key >= startDate && key < endDateExclusive);
}

export function getSeasonById(seasonId) {
  return SEASON_CATALOG[String(seasonId || '').trim()] || null;
}

export function getActiveSeason(dateKey = getTodayKey()) {
  return Object.values(SEASON_CATALOG).find(season =>
    isDateInRange(dateKey, season.startDate, season.endDateExclusive)
  ) || null;
}

export function getSeasonByFish(fish, fishTypesMap = fishTypes) {
  const directId = String(fish?.seasonal?.eventId || '').trim();
  if (directId && getSeasonById(directId)) return getSeasonById(directId);

  const name = String(fish?.name || '').trim();
  if (!name) return null;
  for (const pool of Object.values(fishTypesMap || {})) {
    const template = (pool || []).find(item => item.name === name);
    const eventId = String(template?.seasonal?.eventId || '').trim();
    if (eventId && getSeasonById(eventId)) return getSeasonById(eventId);
  }
  return null;
}

export function getSeasonalFishList(fishTypesMap = fishTypes, seasonId = '', dateKey = getTodayKey()) {
  const season = getSeasonById(seasonId) || getActiveSeason(dateKey);
  if (!season) return [];
  return Object.entries(fishTypesMap || {}).flatMap(([rarity, pool]) =>
    (pool || [])
      .filter(fish => fish?.seasonal?.eventId === season.id)
      .map(fish => ({ ...fish, rarity }))
  );
}

export function ensureSeasonalCollections(userData) {
  if (!userData || typeof userData !== 'object') return false;
  if (!userData.seasonalCollections || typeof userData.seasonalCollections !== 'object') {
    userData.seasonalCollections = {};
  }

  let changed = false;
  for (const seasonId of Object.keys(userData.seasonalCollections)) {
    const current = userData.seasonalCollections[seasonId];
    const normalized = Array.isArray(current)
      ? [...new Set(current.map(name => String(name || '').trim()).filter(Boolean))]
      : [];
    if (JSON.stringify(current) !== JSON.stringify(normalized)) changed = true;
    userData.seasonalCollections[seasonId] = normalized;
  }
  for (const fish of userData.allTimeFish || []) {
    const season = getSeasonByFish(fish);
    if (!season) continue;
    if (!Array.isArray(userData.seasonalCollections[season.id])) {
      userData.seasonalCollections[season.id] = [];
      changed = true;
    }
    if (!userData.seasonalCollections[season.id].includes(fish.name)) {
      userData.seasonalCollections[season.id].push(fish.name);
      changed = true;
    }
  }
  return changed;
}

export function recordSeasonalFishCatch(userData, fish) {
  const season = getSeasonByFish(fish);
  if (!season) return { season: null, newlyCollected: false };
  ensureSeasonalCollections(userData);
  if (!Array.isArray(userData.seasonalCollections[season.id])) {
    userData.seasonalCollections[season.id] = [];
  }
  const collection = userData.seasonalCollections[season.id];
  const newlyCollected = !collection.includes(fish.name);
  if (newlyCollected) collection.push(fish.name);
  return { season, newlyCollected };
}

export function getSeasonProgress(userData, fishTypesMap = fishTypes, seasonId = '', dateKey = getTodayKey()) {
  const season = getSeasonById(seasonId) || getActiveSeason(dateKey);
  if (!season) return null;
  const fishList = getSeasonalFishList(fishTypesMap, season.id, dateKey);
  const owned = new Set(userData?.seasonalCollections?.[season.id] || []);
  const ownedCount = fishList.filter(fish => owned.has(fish.name)).length;
  return {
    season,
    fishList,
    owned,
    ownedCount,
    totalCount: fishList.length,
    progress: fishList.length ? (ownedCount / fishList.length) * 100 : 0
  };
}
