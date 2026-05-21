import { EASTER_EGG_RARITY, RARITY_ORDER } from './constants.js';
import { getTodayKey } from './time.js';

function pickRandom(list, count) {
  const pool = [...list];
  const result = [];
  while (pool.length > 0 && result.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

export function ensureDailySignal(worldState, fishTypes, date = new Date()) {
  const today = getTodayKey(date);
  if (worldState?.todaySignal?.date === today && Array.isArray(worldState.todaySignal.targets)) {
    return worldState.todaySignal;
  }

  const signalPool = [];
  for (const rarity of RARITY_ORDER) {
    if (rarity === EASTER_EGG_RARITY) continue;
    for (const fish of fishTypes[rarity] || []) {
      signalPool.push({ name: fish.name, rarity });
    }
  }

  const targetCount = Math.floor(Math.random() * 4) + 5;
  const targets = pickRandom(signalPool, targetCount);
  const signal = {
    date: today,
    targets,
    bonusCoins: 36
  };

  worldState.todaySignal = signal;
  return signal;
}
