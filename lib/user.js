import {
  ACHIEVEMENT_DEFS,
  ACHIEVEMENT_CATCH_RATE_SOFT_CAP,
  BAIT_CATALOG,
  BASE_CATCH_RATE,
  DEFAULT_BAIT_ID,
  DEFAULT_ROD_ID,
  DEFAULT_TANK_CAPACITY,
  EASTER_EGG_EFFECTS,
  EASTER_EGG_RARITY,
  ROD_CATALOG,
  SHOP_ITEMS,
  TANK_UPGRADE_EXTRA_CASTS,
  TANK_UPGRADE_SIZE
} from './constants.js';
import { fishRarityByName, fishTemplateByName, fishTypes, legacyFishAliases } from '../fishdata/fishpool.js';

let fishIdCounter = 0;

function getLegacyFishKey(fish) {
  if (!fish || typeof fish !== 'object') return null;
  const parts = [
    fish.name || '',
    fish.rarity || '',
    Number.isFinite(Number(fish.length)) ? Number(fish.length) : '',
    Number.isFinite(Number(fish.weight)) ? Number(fish.weight) : '',
    Number.isFinite(Number(fish.timestamp)) ? Number(fish.timestamp) : ''
  ];
  return parts.some(Boolean) ? parts.join('|') : null;
}

function findFishTemplate(fish) {
  if (!fish || typeof fish !== 'object') return null;
  const rarityPool = fishTypes?.[fish.rarity];
  const sameRarityTemplate = Array.isArray(rarityPool)
    ? rarityPool.find(item => item.name === fish.name)
    : null;
  return sameRarityTemplate ||
    fishTemplateByName?.[fish.name] ||
    fishTemplateByName?.[legacyFishAliases?.[fish.name]] ||
    null;
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getClaimedAchievementDailyCastBonus(userData) {
  if (!userData?.achievements) return 0;
  return ACHIEVEMENT_DEFS.reduce((sum, def) => {
    const slot = userData.achievements?.[def.id];
    if (!slot?.rewardClaimed) return sum;
    return sum + Math.max(0, toFiniteNumber(def.rewards?.permanentDailyCasts, 0));
  }, 0);
}

function getOwnedRodDailyCastBonus(userData) {
  const ownedRodIds = new Set(Array.isArray(userData?.rodsOwned) ? userData.rodsOwned : []);
  return [...ownedRodIds].reduce((sum, rodId) => {
    const rod = ROD_CATALOG[rodId];
    return sum + Math.max(0, toFiniteNumber(rod?.ownedPermanentDailyCasts, 0));
  }, 0);
}

function clampMultiplier(value, fallback = 1) {
  const number = toFiniteNumber(value, fallback);
  return Math.max(0.2, Math.min(3, number));
}

export function getEasterEggEffects(userData) {
  const effect = {
    names: [],
    catchRateBonus: 0,
    permanentDailyCasts: 0,
    waitMultiplier: 1,
    failProtection: 0,
    baitPreserveChance: 0,
    catchCoinBonus: 0,
    rarityBias: {},
    descriptions: []
  };

  const seenNames = new Set();
  for (const fish of userData?.fishTank || []) {
    if (fish?.rarity !== EASTER_EGG_RARITY) continue;
    const name = String(fish.name || '').trim();
    const config = EASTER_EGG_EFFECTS[name];
    if (!name || !config || seenNames.has(name)) continue;
    seenNames.add(name);
    effect.names.push(name);
    effect.catchRateBonus += toFiniteNumber(config.catchRateBonus, 0);
    effect.permanentDailyCasts += Math.max(0, toFiniteNumber(config.permanentDailyCasts, 0));
    effect.waitMultiplier *= clampMultiplier(1 + toFiniteNumber(config.waitMultiplier, 0));
    effect.failProtection += Math.max(0, toFiniteNumber(config.failProtection, 0));
    effect.baitPreserveChance += Math.max(0, toFiniteNumber(config.baitPreserveChance, 0));
    effect.catchCoinBonus += Math.max(0, toFiniteNumber(config.catchCoinBonus, 0));
    for (const [rarity, bias] of Object.entries(config.rarityBias || {})) {
      effect.rarityBias[rarity] = (effect.rarityBias[rarity] || 0) + toFiniteNumber(bias, 0);
    }
    if (config.description) effect.descriptions.push(`${name}：${config.description}`);
  }

  effect.waitMultiplier = clampMultiplier(effect.waitMultiplier);
  effect.failProtection = Math.min(0.9, effect.failProtection);
  effect.baitPreserveChance = Math.min(0.9, effect.baitPreserveChance);
  return effect;
}

export function describeEasterEggEffects(userData) {
  const effect = getEasterEggEffects(userData);
  if (!effect.descriptions.length) return '未生效';
  return effect.descriptions.join('；');
}

function sanitizeFishRecord(fish) {
  if (!fish || typeof fish !== 'object') return;
  const template = findFishTemplate(fish);
  const currentRarity = typeof fish.rarity === 'string' ? fish.rarity : '';
  const canonicalName = legacyFishAliases?.[fish.name];
  const canonicalRarity = fishRarityByName?.[fish.name] || fishRarityByName?.[canonicalName];
  if (!fishTypes?.[currentRarity] && canonicalRarity) {
    fish.rarity = canonicalRarity;
  }
  if (!Number.isFinite(Number(fish.length))) {
    fish.length = template?.size?.min ?? 0;
  } else {
    fish.length = Number(fish.length);
  }
  if (!Number.isFinite(Number(fish.weight))) {
    fish.weight = template?.weight?.min ?? 0;
  } else {
    fish.weight = Number(fish.weight);
  }
  if (template?.weight && Number(fish.weight) < 0.01) {
    fish.weight = Math.max(0.01, Number(template.weight.min || 0.01));
  }
  if (!Number.isFinite(Number(fish.timestamp))) {
    fish.timestamp = Date.now();
  } else {
    fish.timestamp = Number(fish.timestamp);
  }
}

function createFishId(usedIds = null) {
  let fishId = '';
  do {
    fishIdCounter += 1;
    fishId = `fish_${Date.now().toString(36)}_${fishIdCounter.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  } while (usedIds?.has(fishId));
  return fishId;
}

export function ensureFishId(fish, usedIds = null) {
  if (!fish || typeof fish !== 'object') return null;
  const existingId = typeof fish.fishId === 'string' ? fish.fishId.trim() : '';
  if (existingId) {
    if (usedIds) usedIds.add(existingId);
    fish.fishId = existingId;
    return existingId;
  }
  const fishId = createFishId(usedIds);
  fish.fishId = fishId;
  if (usedIds) usedIds.add(fishId);
  return fishId;
}

export function isSameFish(left, right) {
  if (!left || !right) return false;
  const leftId = typeof left.fishId === 'string' ? left.fishId.trim() : '';
  const rightId = typeof right.fishId === 'string' ? right.fishId.trim() : '';
  if (leftId && rightId) return leftId === rightId;
  const leftKey = getLegacyFishKey(left);
  const rightKey = getLegacyFishKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

export function removeFishFromList(list, fishes) {
  if (!Array.isArray(list) || !Array.isArray(fishes) || fishes.length === 0) return 0;
  const pending = fishes.filter(Boolean).slice();
  let removed = 0;
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const matchedIndex = pending.findIndex(fish => isSameFish(list[index], fish));
    if (matchedIndex < 0) continue;
    list.splice(index, 1);
    pending.splice(matchedIndex, 1);
    removed += 1;
    if (pending.length === 0) break;
  }
  return removed;
}

export function removeOwnedFish(userData, fishes, options = {}) {
  const fishList = Array.isArray(fishes) ? fishes : [fishes];
  const { today = true, tank = true } = options;
  let removed = 0;
  if (today) removed += removeFishFromList(userData?.today?.fish, fishList);
  if (tank) removed += removeFishFromList(userData?.fishTank, fishList);
  return removed;
}

function countMissingFishIds(list) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((count, fish) => count + ((fish && typeof fish === 'object' && !String(fish.fishId || '').trim()) ? 1 : 0), 0);
}

function dedupeFishList(list) {
  if (!Array.isArray(list) || list.length <= 1) return 0;

  const uniqueFish = [];
  const seen = new Set();
  let removed = 0;

  for (const fish of list) {
    if (!fish || typeof fish !== 'object') {
      removed += 1;
      continue;
    }

    const key = String(fish.fishId || '').trim() || getLegacyFishKey(fish) || ensureFishId(fish);
    if (seen.has(key)) {
      removed += 1;
      continue;
    }

    seen.add(key);
    uniqueFish.push(fish);
  }

  if (removed > 0) {
    list.splice(0, list.length, ...uniqueFish);
  }

  return removed;
}

function enforceSingleEasterEggFish(list) {
  if (!Array.isArray(list)) return 0;
  let seenEasterEgg = false;
  let removed = 0;
  for (let index = 0; index < list.length; index += 1) {
    const fish = list[index];
    if (fish?.rarity !== EASTER_EGG_RARITY) continue;
    if (!seenEasterEgg) {
      seenEasterEgg = true;
      continue;
    }
    list.splice(index, 1);
    removed += 1;
    index -= 1;
  }
  return removed;
}

export function getUserDisplay(e) {
  const userId = String(e.user_id);
  const nickname = e.sender?.card || e.sender?.nickname || userId;
  return {
    userId,
    nickname,
    text: `@${nickname}(${userId})`
  };
}

export function createDefaultUserData() {
  return {
    total: 0,
    today: { count: 0, catches: 0, fish: [] },
    fishTank: [],
    tankCapacity: DEFAULT_TANK_CAPACITY,
    tankLevel: 0,
    extraDailyLimit: 0,
    hasEasterEgg: false,
    everCaughtEasterEgg: false,
    coins: 0,
    rodsOwned: [DEFAULT_ROD_ID],
    craftedLegendaryRods: {},
    equippedRod: DEFAULT_ROD_ID,
    tickets: 0,
    todayExtraUsed: 0,
    todayTicketsBought: 0,
    baitInventory: { [DEFAULT_BAIT_ID]: 1 },
    customBaits: {},
    equippedBait: DEFAULT_BAIT_ID,
    achievements: {},
    achievementCatchRateBonus: 0,
    achievementDailyCastBonus: 0,
    marketTrades: 0,
    stats: {
      consecutiveEmpty: 0,
      bestConsecutiveEmpty: 0,
      signalFishCaught: 0,
      lastCatchRarity: null
    },
    allTimeFish: []
  };
}

export function normalizeUserData(userData) {
  if (!userData.today) userData.today = { count: 0, catches: 0, fish: [] };
  if (!Array.isArray(userData.today.fish)) userData.today.fish = [];
  userData.today.count = Math.max(0, toFiniteNumber(userData.today.count, 0));
  userData.today.catches = Math.max(0, toFiniteNumber(userData.today.catches, userData.today.fish.length));
  if (!Array.isArray(userData.fishTank)) userData.fishTank = [];
  if (!Array.isArray(userData.allTimeFish)) userData.allTimeFish = [];
  userData.total = Math.max(0, toFiniteNumber(userData.total, 0));
  userData.tankCapacity = Math.max(DEFAULT_TANK_CAPACITY, toFiniteNumber(userData.tankCapacity, DEFAULT_TANK_CAPACITY));
  if (!Number.isFinite(Number(userData.tankLevel))) {
    userData.tankLevel = Math.max(0, Math.floor((userData.tankCapacity - DEFAULT_TANK_CAPACITY) / TANK_UPGRADE_SIZE));
  } else {
    userData.tankLevel = Math.max(0, Math.floor(Number(userData.tankLevel)));
  }
  const tankDailyCastBonus = userData.tankLevel * TANK_UPGRADE_EXTRA_CASTS;
  if (!Number.isFinite(Number(userData.extraDailyLimit))) {
    userData.extraDailyLimit = userData.tankLevel * TANK_UPGRADE_EXTRA_CASTS;
  } else {
    userData.extraDailyLimit = Math.max(0, Number(userData.extraDailyLimit));
  }
  // 旧数据里可能只有 tankLevel / tankCapacity，没有写入 extraDailyLimit；这里按鱼缸等级补足永久加钓数。
  userData.extraDailyLimit = Math.max(userData.extraDailyLimit, tankDailyCastBonus);
  userData.coins = Math.max(0, toFiniteNumber(userData.coins, 0));
  if (!Array.isArray(userData.rodsOwned) || userData.rodsOwned.length === 0) {
    userData.rodsOwned = [DEFAULT_ROD_ID];
  }
  if (!userData.craftedLegendaryRods || typeof userData.craftedLegendaryRods !== 'object') {
    userData.craftedLegendaryRods = {};
  }
  userData.rodsOwned = [...new Set(userData.rodsOwned.filter(id => ROD_CATALOG[id]))];
  if (!userData.rodsOwned.includes(DEFAULT_ROD_ID)) userData.rodsOwned.unshift(DEFAULT_ROD_ID);
  if (!ROD_CATALOG[userData.equippedRod]) userData.equippedRod = DEFAULT_ROD_ID;
  if (!userData.rodsOwned.includes(userData.equippedRod)) userData.equippedRod = userData.rodsOwned[0];
  userData.tickets = Math.max(0, toFiniteNumber(userData.tickets, 0));
  userData.todayExtraUsed = Math.max(0, toFiniteNumber(userData.todayExtraUsed, 0));
  userData.todayExtraUsed = Math.min(userData.todayExtraUsed, userData.today.count);
  userData.todayTicketsBought = Math.max(0, toFiniteNumber(userData.todayTicketsBought, 0));
  if (!userData.baitInventory || typeof userData.baitInventory !== 'object') {
    userData.baitInventory = { [DEFAULT_BAIT_ID]: 1 };
  }
  if (!userData.customBaits || typeof userData.customBaits !== 'object') {
    userData.customBaits = {};
  }
  if (!Number.isFinite(userData.baitInventory[DEFAULT_BAIT_ID])) {
    userData.baitInventory[DEFAULT_BAIT_ID] = 1;
  }
  for (const baitId of Object.keys(userData.baitInventory)) {
    if (!(BAIT_CATALOG[baitId] || userData.customBaits[baitId]) || !Number.isFinite(userData.baitInventory[baitId])) {
      delete userData.baitInventory[baitId];
    }
  }
  if (!userData.baitInventory[DEFAULT_BAIT_ID]) userData.baitInventory[DEFAULT_BAIT_ID] = 1;
  if (!(BAIT_CATALOG[userData.equippedBait] || userData.customBaits[userData.equippedBait])) userData.equippedBait = DEFAULT_BAIT_ID;
  if (!userData.baitInventory[userData.equippedBait]) userData.equippedBait = DEFAULT_BAIT_ID;
  if (!userData.achievements || typeof userData.achievements !== 'object') userData.achievements = {};
  if (!Number.isFinite(Number(userData.achievementCatchRateBonus))) userData.achievementCatchRateBonus = 0;
  userData.achievementCatchRateBonus = Math.max(0, Math.min(ACHIEVEMENT_CATCH_RATE_SOFT_CAP, Number(userData.achievementCatchRateBonus)));
  if (!Number.isFinite(Number(userData.achievementDailyCastBonus))) userData.achievementDailyCastBonus = 0;
  userData.achievementDailyCastBonus = Math.max(0, Number(userData.achievementDailyCastBonus));
  userData.marketTrades = Math.max(0, toFiniteNumber(userData.marketTrades, 0));
  if (!userData.stats || typeof userData.stats !== 'object') {
    userData.stats = {};
  }
  userData.stats.consecutiveEmpty = Math.max(0, toFiniteNumber(userData.stats.consecutiveEmpty, 0));
  userData.stats.bestConsecutiveEmpty = Math.max(0, toFiniteNumber(userData.stats.bestConsecutiveEmpty, 0));
  userData.stats.signalFishCaught = Math.max(0, toFiniteNumber(userData.stats.signalFishCaught, 0));
  if (typeof userData.stats.lastCatchRarity !== 'string') userData.stats.lastCatchRarity = null;

  for (const fish of userData.fishTank) {
    if (fish.rarity === 'easterEgg') fish.rarity = EASTER_EGG_RARITY;
    sanitizeFishRecord(fish);
  }
  for (const fish of userData.today.fish) {
    if (fish.rarity === 'easterEgg') fish.rarity = EASTER_EGG_RARITY;
    sanitizeFishRecord(fish);
  }
  for (const fish of userData.allTimeFish) {
    if (fish.rarity === 'easterEgg') fish.rarity = EASTER_EGG_RARITY;
    sanitizeFishRecord(fish);
  }

  const usedFishIds = new Set();
  const fishCollections = [userData.today.fish, userData.fishTank, userData.allTimeFish];
  const sharedFishIds = new Map();
  for (const collection of fishCollections) {
    for (const fish of collection) {
      if (!fish || typeof fish !== 'object') continue;
      const key = getLegacyFishKey(fish);
      const mappedId = key ? sharedFishIds.get(key) : null;
      if (mappedId) {
        const currentId = typeof fish.fishId === 'string' ? fish.fishId.trim() : '';
        if (!currentId || currentId !== mappedId) {
          fish.fishId = mappedId;
          usedFishIds.add(mappedId);
          continue;
        }
      }
      const fishId = typeof fish.fishId === 'string' ? fish.fishId.trim() : '';
      if (!fishId) continue;
      fish.fishId = fishId;
      usedFishIds.add(fishId);
      if (key && !sharedFishIds.has(key)) sharedFishIds.set(key, fishId);
    }
  }
  for (const collection of fishCollections) {
    for (const fish of collection) {
      if (!fish || typeof fish !== 'object') continue;
      const key = getLegacyFishKey(fish);
      const mappedId = key ? sharedFishIds.get(key) : null;
      if (mappedId && !(typeof fish.fishId === 'string' && fish.fishId.trim())) {
        fish.fishId = mappedId;
        usedFishIds.add(mappedId);
        continue;
      }
      const fishId = ensureFishId(fish, usedFishIds);
      if (key && !sharedFishIds.has(key)) sharedFishIds.set(key, fishId);
    }
  }

  if (userData.allTimeFish.length === 0) {
    const seed = [...userData.fishTank, ...userData.today.fish];
    for (const fish of seed) {
      userData.allTimeFish.push({
        name: fish.name,
        rarity: fish.rarity,
        timestamp: fish.timestamp || Date.now(),
        fishId: fish.fishId || ensureFishId(fish, usedFishIds)
      });
    }
  }

  userData.hasEasterEgg = userData.fishTank.some(fish => fish.rarity === EASTER_EGG_RARITY);
  userData.everCaughtEasterEgg = Boolean(userData.everCaughtEasterEgg);

  for (const def of ACHIEVEMENT_DEFS) {
    if (!userData.achievements[def.id]) {
      userData.achievements[def.id] = {
        unlocked: false,
        unlockedAt: null,
        rewardClaimed: false,
        rewardClaimedAt: null
      };
    }
  }
  userData.achievementDailyCastBonus = getClaimedAchievementDailyCastBonus(userData);
}

export function normalizeAllUsers(data) {
  let changed = false;
  for (const userId in data) {
    const before = JSON.stringify(data[userId]);
    normalizeUserData(data[userId]);
    if (JSON.stringify(data[userId]) !== before) changed = true;
  }
  return changed;
}

export function repairUserFishData(userData) {
  const before = JSON.stringify(userData);
  const missingFishIdsBefore =
    countMissingFishIds(userData?.today?.fish) +
    countMissingFishIds(userData?.fishTank) +
    countMissingFishIds(userData?.allTimeFish);

  normalizeUserData(userData);

  const todayDuplicatesRemoved = dedupeFishList(userData.today.fish);
  const tankDuplicatesRemoved = dedupeFishList(userData.fishTank);
  const historyDuplicatesRemoved = dedupeFishList(userData.allTimeFish);
  const extraEasterEggRemoved = enforceSingleEasterEggFish(userData.fishTank);

  userData.hasEasterEgg = userData.fishTank.some(fish => fish.rarity === EASTER_EGG_RARITY);

  return {
    changed: JSON.stringify(userData) !== before,
    fishIdsAssigned: missingFishIdsBefore,
    todayDuplicatesRemoved,
    tankDuplicatesRemoved: tankDuplicatesRemoved + extraEasterEggRemoved,
    historyDuplicatesRemoved
  };
}

export function repairAllUsersFishData(data) {
  const summary = {
    usersScanned: 0,
    usersChanged: 0,
    fishIdsAssigned: 0,
    todayDuplicatesRemoved: 0,
    tankDuplicatesRemoved: 0,
    historyDuplicatesRemoved: 0,
    changed: false
  };

  for (const userId in data) {
    summary.usersScanned += 1;
    const stats = repairUserFishData(data[userId]);
    if (stats.changed) {
      summary.usersChanged += 1;
      summary.changed = true;
    }
    summary.fishIdsAssigned += stats.fishIdsAssigned;
    summary.todayDuplicatesRemoved += stats.todayDuplicatesRemoved;
    summary.tankDuplicatesRemoved += stats.tankDuplicatesRemoved;
    summary.historyDuplicatesRemoved += stats.historyDuplicatesRemoved;
  }

  return summary;
}

export function getDailyLimit(config, userData, rod = null) {
  return getDailyLimitBreakdown(config, userData, rod).total;
}

export function getDailyLimitBreakdown(config, userData, rod = null) {
  const base = Math.max(0, toFiniteNumber(config?.dailyLimit, 0));
  const tankBonus = Math.max(0, toFiniteNumber(userData?.extraDailyLimit, 0));
  const achievementBonus = getClaimedAchievementDailyCastBonus(userData);
  const equippedRodBonus = Math.max(0, toFiniteNumber(rod?.permanentDailyCasts, 0));
  const ownedRodBonus = getOwnedRodDailyCastBonus(userData);
  const rodBonus = equippedRodBonus + ownedRodBonus;
  const easterEggBonus = getEasterEggEffects(userData).permanentDailyCasts;

  // 永久基础上限来源统一放这里：
  // 1. 鱼缸升级：extraDailyLimit，已由 applyTankUpgrade 永久写入玩家数据。
  // 2. 成就奖励：achievementDailyCastBonus，由 achievements.js 根据 rewards.permanentDailyCasts 统计。
  //    以后要新增“永久+1竿”的成就，只在 constants.js 的对应成就 rewards 里加 permanentDailyCasts: 1。
  // 3. legendary 专属鱼竿特效：
  //    - 装备该鱼竿才生效：在该鱼竿配置里加 permanentDailyCasts: 1。
  //    - 只要玩家拥有该鱼竿就生效：在该鱼竿配置里加 ownedPermanentDailyCasts: 1。
  //    现在不要直接在这里写死某个成就或某根鱼竿，保持走配置。
  // 钓鱼券不要加在这里；钓鱼券只在超过这个基础上限后临时消耗。
  return {
    base,
    tankBonus,
    achievementBonus,
    rodBonus,
    easterEggBonus,
    total: base + tankBonus + achievementBonus + rodBonus + easterEggBonus
  };
}

export function getTodayMaxCasts(config, userData, rod = null) {
  return getDailyLimit(config, userData, rod) + Number(userData?.tickets || 0) + Number(userData?.todayExtraUsed || 0);
}

export function getTodayNormalCastUsed(userData) {
  const totalUsed = Math.max(0, toFiniteNumber(userData?.today?.count, 0));
  const extraUsed = Math.min(totalUsed, Math.max(0, toFiniteNumber(userData?.todayExtraUsed, 0)));
  return Math.max(0, totalUsed - extraUsed);
}

export function canFishToday(config, userData, rod = null) {
  const normalLimit = getDailyLimit(config, userData, rod);
  return getTodayNormalCastUsed(userData) < normalLimit || Number(userData.tickets || 0) > 0;
}

export function registerCastUsage(config, userData, rod = null) {
  const normalLimit = getDailyLimit(config, userData, rod);
  const normalUsed = getTodayNormalCastUsed(userData);
  const usedTicket = normalUsed >= normalLimit;
  if (usedTicket) {
    if (Number(userData.tickets || 0) <= 0) return { registered: false, usedTicket: false };
    userData.todayExtraUsed += 1;
    userData.tickets = Math.max(0, Number(userData.tickets || 0) - 1);
  }
  userData.today.count += 1;
  return {
    registered: true,
    usedTicket,
    totalUsed: userData.today.count,
    normalUsed: getTodayNormalCastUsed(userData)
  };
}

export function recordEmptyCast(userData) {
  if (!userData.stats || typeof userData.stats !== 'object') userData.stats = {};
  const currentStreak = Math.max(0, toFiniteNumber(userData.stats.consecutiveEmpty, 0)) + 1;
  const bestStreak = Math.max(0, toFiniteNumber(userData.stats.bestConsecutiveEmpty, 0), currentStreak);
  userData.stats.consecutiveEmpty = currentStreak;
  userData.stats.bestConsecutiveEmpty = bestStreak;
  return { currentStreak, bestStreak };
}

export function resetEmptyCastStreak(userData) {
  if (!userData.stats || typeof userData.stats !== 'object') userData.stats = {};
  userData.stats.consecutiveEmpty = 0;
}

export function getFishingLimitText(config, userData, rod = null) {
  const normalLimit = getDailyLimit(config, userData, rod);
  const normalUsed = getTodayNormalCastUsed(userData);
  const extraUsed = Math.min(Number(userData.todayExtraUsed || 0), Number(userData.today?.count || 0));
  const tickets = Number(userData.tickets || 0);
  if (extraUsed <= 0 && tickets <= 0) {
    return `${normalUsed}/${normalLimit}`;
  }
  return `基础${normalUsed}/${normalLimit} + 券${extraUsed}竿，余${tickets}张（总${Number(userData.today?.count || 0)}竿）`;
}

export function getFishingLimitExhaustedText(config, userData, rod = null) {
  const normalLimit = getDailyLimit(config, userData, rod);
  const normalUsed = getTodayNormalCastUsed(userData);
  const extraUsed = Math.min(Number(userData.todayExtraUsed || 0), Number(userData.today?.count || 0));
  if (extraUsed > 0) {
    return `基础次数已用完，额外钓鱼券也用完了。（基础${normalUsed}/${normalLimit}，今日用券${extraUsed}张，总${Number(userData.today?.count || 0)}竿）`;
  }
  return `今天的钓鱼次数已用完。（基础${normalUsed}/${normalLimit}，没有可用钓鱼券）`;
}

export function getCatchRate(userData, baitBonus = 0, rodBonus = 0) {
  let catchRate = BASE_CATCH_RATE + baitBonus + rodBonus + Number(userData?.achievementCatchRateBonus || 0);
  catchRate += getEasterEggEffects(userData).catchRateBonus;
  return Math.max(0.05, Math.min(0.95, catchRate));
}

export function getEquippedRod(userData) {
  return ROD_CATALOG[userData?.equippedRod] || ROD_CATALOG[DEFAULT_ROD_ID];
}

export function getEquippedBait(userData) {
  return userData?.customBaits?.[userData?.equippedBait] || BAIT_CATALOG[userData?.equippedBait] || BAIT_CATALOG[DEFAULT_BAIT_ID];
}

export function getTargetUserId(e) {
  if (e.at) return String(e.at);
  const cqAt = e.msg.match(/\[CQ:at,qq=(\d{5,})\]/);
  if (cqAt) return cqAt[1];
  const plainAt = e.msg.match(/@(\d{5,})\b/);
  if (plainAt) return plainAt[1];
  const match = e.msg.match(/\b(\d{5,})\b/);
  return match ? match[1] : null;
}

export function addFishHistory(userData, fish) {
  userData.allTimeFish.push({
    name: fish.name,
    rarity: fish.rarity,
    timestamp: fish.timestamp ?? Date.now(),
    fishId: fish.fishId || ensureFishId(fish)
  });
  if (userData.allTimeFish.length > 5000) {
    userData.allTimeFish = userData.allTimeFish.slice(-5000);
  }
}

export function getOwnedBaitsSummary(userData) {
  return Object.entries(userData.baitInventory || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([id, count]) => `${userData.customBaits?.[id]?.name || BAIT_CATALOG[id]?.name || SHOP_ITEMS[id]?.name || id}x${count}`)
    .join('、');
}

export function getOwnedRodsSummary(userData) {
  return [...new Set(userData?.rodsOwned || [])]
    .map(id => ROD_CATALOG[id]?.name)
    .filter(Boolean)
    .join('、');
}
