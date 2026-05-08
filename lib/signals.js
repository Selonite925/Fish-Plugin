import { EASTER_EGG_RARITY, RARITY_ORDER } from './constants.js';

const BEIJING_TIME_ZONE = 'Asia/Shanghai';
const BEIJING_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: BEIJING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

export function getTodayKey(date = new Date()) {
  const parts = Object.fromEntries(
    BEIJING_DATE_FORMATTER.formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

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

  const targetCount = Math.random() < 0.55 ? 1 : 2;
  const targets = pickRandom(signalPool, targetCount);
  const signal = {
    date: today,
    targets,
    bonusCoins: 18
  };

  worldState.todaySignal = signal;
  return signal;
}
