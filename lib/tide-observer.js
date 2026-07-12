import { getActiveSeason } from './seasonal-fish.js';
import { getTodayKey } from './time.js';

function clampChance(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

export function selectTideObserverSurvey(rod, userData, pool = [], options = {}) {
  const survey = rod?.seasonalSurvey;
  if (!survey || !Array.isArray(pool) || pool.length === 0) return null;

  const dateKey = options.dateKey || getTodayKey();
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const activeSeason = getActiveSeason(dateKey);
  if (!activeSeason) return null;

  const collected = new Set(userData?.seasonalCollections?.[activeSeason.id] || []);
  const missingFish = pool.filter(item => item?.seasonal?.eventId === activeSeason.id && !collected.has(item.name));
  if (!missingFish.length || random() >= clampChance(survey.missingFishSelectionChance)) return null;

  return {
    template: missingFish[Math.floor(random() * missingFish.length)],
    season: activeSeason,
    missingCount: missingFish.length
  };
}
