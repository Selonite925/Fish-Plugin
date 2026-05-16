import { EASTER_EGG_RARITY, RARITY_PRIORITY, TANK_UPGRADE_EXTRA_CASTS, TANK_UPGRADE_SIZE } from './constants.js';
import { getFishSellValue } from './economy.js';
import { isSameFish, removeFishFromList } from './user.js';

export function compareFish(fish1, fish2) {
  const rarityDiff = (RARITY_PRIORITY[fish1.rarity] || 0) - (RARITY_PRIORITY[fish2.rarity] || 0);
  if (rarityDiff !== 0) return rarityDiff;
  return (fish1.weight || 0) - (fish2.weight || 0);
}

export function getSortedTankWithIndex(fishTank = []) {
  return fishTank
    .map((fish, originalIndex) => ({ fish, originalIndex }))
    .sort((a, b) => compareFish(b.fish, a.fish));
}

export function parseTankIndexes(msg, expectedCount = null) {
  const indexes = [...msg.matchAll(/\b(\d{1,3})\b/g)].map(match => Number(match[1]) - 1);
  return expectedCount ? indexes.slice(-expectedCount) : indexes;
}

export function getOriginalIndexByDisplayIndex(userData, displayIndex) {
  const sortedTank = getSortedTankWithIndex(userData.fishTank);
  return sortedTank[displayIndex]?.originalIndex;
}

export function addFishToTank(userData, fish, options = {}) {
  const { autoSellReplacedFish = false } = options;

  if (fish?.rarity === EASTER_EGG_RARITY && userData.fishTank.some(item => item.rarity === EASTER_EGG_RARITY)) {
    return {
      changed: false,
      added: false,
      replaced: false,
      replacedFish: null,
      soldCoins: 0,
      message: '\n鱼缸里已有彩蛋鱼，这条彩蛋鱼没有加入鱼缸。'
    };
  }

  if (userData.fishTank.length < userData.tankCapacity) {
    userData.fishTank.push(fish);
    return {
      changed: true,
      added: true,
      replaced: false,
      replacedFish: null,
      soldCoins: 0,
      message: '\n\u5df2\u52a0\u5165\u9c7c\u7f38\uff01'
    };
  }

  const sortedTank = [...userData.fishTank].sort((a, b) => compareFish(a, b));
  const worstFish = sortedTank[0];
  if (compareFish(fish, worstFish) <= 0) {
    return {
      changed: false,
      added: false,
      replaced: false,
      replacedFish: null,
      soldCoins: 0,
      message: ''
    };
  }

  const worstIndex = userData.fishTank.findIndex(item =>
    isSameFish(item, worstFish)
  );
  if (worstIndex < 0) {
    return {
      changed: false,
      added: false,
      replaced: false,
      replacedFish: null,
      soldCoins: 0,
      message: ''
    };
  }

  userData.fishTank[worstIndex] = fish;
  let soldCoins = 0;
  let sellMessage = '';

  if (autoSellReplacedFish) {
    soldCoins = getFishSellValue(worstFish);
    removeFishFromList(userData?.today?.fish, [worstFish]);
    if (soldCoins > 0) {
      userData.coins = Number(userData.coins || 0) + soldCoins;
      sellMessage = `\n\u88ab\u66ff\u6362\u51fa\u6765\u7684 ${worstFish.name}(${worstFish.rarity}) \u5df2\u81ea\u52a8\u552e\u5356\uff0c\u83b7\u5f97 ${soldCoins} \u9c7c\u5e01\u3002`;
    } else {
      sellMessage = `\n\u88ab\u66ff\u6362\u51fa\u6765\u7684 ${worstFish.name}(${worstFish.rarity}) \u65e0\u6cd5\u552e\u5356\u3002`;
    }
  }

  return {
    changed: true,
    added: false,
    replaced: true,
    replacedFish: worstFish,
    soldCoins,
    message: `\n\u5df2\u66ff\u6362\u9c7c\u7f38\u4e2d\u7684 ${worstFish.name}(${worstFish.rarity})\u3002${sellMessage}`
  };
}

export function getUpgradeCost(costType, currentLevel = 0) {
  const { targetLevel, requiredPoints } = getTankUpgradeRequiredPoints(currentLevel);
  if (costType === 'legendary') {
    return { rarity: 'legendary', count: targetLevel, points: requiredPoints };
  }
  if (costType === 'epic') {
    return { rarity: 'epic', count: requiredPoints, points: requiredPoints };
  }
  return null;
}

export function getTankUpgradeRequiredPoints(currentLevel = 0) {
  const normalizedLevel = Math.max(0, Math.floor(Number(currentLevel || 0)));
  const targetLevel = normalizedLevel + 1;
  return {
    currentLevel: normalizedLevel,
    targetLevel,
    requiredPoints: targetLevel * 3
  };
}

export function getFishUpgradePoints(fish) {
  if (fish?.rarity === 'legendary') return 3;
  if (fish?.rarity === 'epic') return 1;
  return 0;
}

export function applyTankUpgrade(userData) {
  userData.tankCapacity = Number(userData.tankCapacity || 0) + TANK_UPGRADE_SIZE;
  userData.tankLevel = Number(userData.tankLevel || 0) + 1;
  userData.extraDailyLimit = Number(userData.extraDailyLimit || 0) + TANK_UPGRADE_EXTRA_CASTS;
  userData.tankUpgradeProgress = null;
}
