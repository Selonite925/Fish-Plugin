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
    startDate: '2026-07-20',
    endDateExclusive: '2026-08-10',
    description: '世界杯决赛落幕后的盛夏潮汛，晒网与海风带来一批短暂鱼影。'
  },
  world_cup_2026: {
    id: 'world_cup_2026',
    name: '世界杯决赛潮',
    startDate: '2026-07-03',
    endDateExclusive: '2026-07-20',
    description: '北美世界杯进入淘汰赛与决赛阶段，绿茵的喧响顺着海风传到钓点。'
  },
  qixi_2026: {
    id: 'qixi_2026',
    name: '七夕星河',
    startDate: '2026-08-10',
    endDateExclusive: '2026-09-01',
    description: '七夕前后，鹊桥倒影落入水面，星河鱼影只在夜潮里出现。'
  },
  mid_autumn_2026: {
    id: 'mid_autumn_2026',
    name: '中秋月潮',
    startDate: '2026-09-01',
    endDateExclusive: '2026-10-01',
    description: '中秋月圆，桂香和月色一起沉进水底，照亮一批团圆鱼影。'
  },
  golden_october_2026: {
    id: 'golden_october_2026',
    name: '金秋竞技潮',
    startDate: '2026-10-01',
    endDateExclusive: '2026-11-01',
    description: '国庆假期与亚运会收官的热潮交汇，水面也开始争夺金色鳞片。'
  },
  double_eleven_2026: {
    id: 'double_eleven_2026',
    name: '双十一抢鳞季',
    startDate: '2026-11-01',
    endDateExclusive: '2026-12-01',
    description: '购物车满载而归，水下也开始上演一场限时抢购。'
  },
  winter_festival_2026: {
    id: 'winter_festival_2026',
    name: '冬至圣诞夜',
    startDate: '2026-12-01',
    endDateExclusive: '2027-01-01',
    description: '冬至最长夜和圣诞灯火相遇，极光沿着冰冷的水线落钩。'
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
  return getActiveSeasons(dateKey)[0] || null;
}

export function getActiveSeasons(dateKey = getTodayKey()) {
  return Object.values(SEASON_CATALOG)
    .filter(season => !season.archived && isDateInRange(dateKey, season.startDate, season.endDateExclusive))
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
}

export function getHistoricalSeasons(dateKey = getTodayKey()) {
  return Object.values(SEASON_CATALOG)
    .filter(season => season.archived || (season.endDateExclusive && dateKey >= season.endDateExclusive))
    .sort((left, right) => right.startDate.localeCompare(left.startDate));
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
