import { RARITY_PRIORITY, TANK_UPGRADE_COSTS, TANK_UPGRADE_EXTRA_CASTS, TANK_UPGRADE_SIZE } from './constants.js';
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

export function getUpgradeCost(costType) {
  return TANK_UPGRADE_COSTS[costType];
}

export function applyTankUpgrade(userData) {
  userData.tankCapacity += TANK_UPGRADE_SIZE;
  userData.tankLevel += 1;
  userData.extraDailyLimit += TANK_UPGRADE_EXTRA_CASTS;
}
