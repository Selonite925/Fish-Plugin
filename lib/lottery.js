import {
  BAIT_CATALOG,
  LOTTERY_CONFIG,
  LOTTERY_GRAND_PRIZE_PLUGINS,
  ROD_CATALOG
} from './constants.js';
import { getNowTimestamp } from './time.js';

function clampInteger(value, min, max) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function randomInteger(min, max) {
  const lower = Math.floor(Number(min));
  const upper = Math.floor(Number(max));
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return 0;
  const realMin = Math.min(lower, upper);
  const realMax = Math.max(lower, upper);
  return Math.floor(Math.random() * (realMax - realMin + 1)) + realMin;
}

function pickWeighted(items = []) {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, Number(item.weight || 0)), 0);
  if (totalWeight <= 0) return null;
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= Math.max(0, Number(item.weight || 0));
    if (roll <= 0) return item;
  }
  return items[items.length - 1] || null;
}

function normalizeGrandPrizeKeyword(text = '') {
  return String(text || '').trim().replace(/\s+/g, '').toLowerCase();
}

export function getLotteryGrandPrizePlugin(pluginId = LOTTERY_CONFIG.grandPrize.defaultPluginId) {
  return LOTTERY_GRAND_PRIZE_PLUGINS[pluginId] || LOTTERY_GRAND_PRIZE_PLUGINS[LOTTERY_CONFIG.grandPrize.defaultPluginId] || null;
}

export function getLotteryGrandPrizeList() {
  return Object.values(LOTTERY_GRAND_PRIZE_PLUGINS).filter(item => item?.id);
}

export function resolveLotteryGrandPrizePlugin(keyword = '') {
  const normalized = normalizeGrandPrizeKeyword(keyword);
  if (!normalized) return null;
  return getLotteryGrandPrizeList().find(plugin => {
    const names = [
      plugin.id,
      plugin.name,
      plugin.reward?.id,
      plugin.reward?.title,
      ...(Array.isArray(plugin.aliases) ? plugin.aliases : [])
    ];
    return names.some(name => normalizeGrandPrizeKeyword(name) === normalized);
  }) || null;
}

export function getPreferredLotteryGrandPrizePlugin(userData) {
  return getLotteryGrandPrizePlugin(userData?.preferredLotteryGrandPrizeId);
}

export function isLotteryGrandPrizeAvailable(userData, grandPlugin = getLotteryGrandPrizePlugin()) {
  if (!grandPlugin?.id) return false;
  if (Array.isArray(userData?.lotteryGrandPrizes) && userData.lotteryGrandPrizes.includes(grandPlugin.id)) return false;
  const rodId = grandPlugin.reward?.type === 'rod' ? grandPlugin.reward.id : '';
  if (rodId && Array.isArray(userData?.rodsOwned) && userData.rodsOwned.includes(rodId)) return false;
  return true;
}

function markGrandPrizeOwnedIfRewardAlreadyPresent(userData, grandPlugin = getLotteryGrandPrizePlugin()) {
  if (!grandPlugin?.id) return false;
  if (!Array.isArray(userData.lotteryGrandPrizes)) userData.lotteryGrandPrizes = [];
  if (userData.lotteryGrandPrizes.includes(grandPlugin.id)) return true;
  const rodId = grandPlugin.reward?.type === 'rod' ? grandPlugin.reward.id : '';
  const alreadyOwnsReward = Boolean(rodId && Array.isArray(userData.rodsOwned) && userData.rodsOwned.includes(rodId));
  if (!alreadyOwnsReward) return false;
  userData.lotteryGrandPrizes.push(grandPlugin.id);
  return true;
}

function addBaitReward(userData, baitId, count) {
  const bait = BAIT_CATALOG[baitId];
  if (!bait) return null;
  if (!userData.baitInventory) userData.baitInventory = {};
  userData.baitInventory[baitId] = Number(userData.baitInventory[baitId] || 0) + Math.max(1, Math.floor(Number(count || 1)));
  return bait;
}

function getBaitRewardAmounts(reward, bait) {
  const packCount = Math.max(0, Math.floor(Number(reward.packCount || 0)));
  const packSize = Math.max(1, Math.floor(Number(bait?.packSize || 1)));
  if (packCount > 0) {
    return {
      count: packCount * packSize,
      packCount,
      packSize
    };
  }
  return {
    count: Math.max(1, Math.floor(Number(reward.count || 1))),
    packCount: 0,
    packSize
  };
}

function addTicketReward(userData, count) {
  const amount = Math.max(1, Math.floor(Number(count || 1)));
  userData.tickets = Number(userData.tickets || 0) + amount;
  return amount;
}

function addLotteryFreeDrawReward(userData, count) {
  const amount = Math.max(1, Math.floor(Number(count || 1)));
  userData.lotteryFreeDraws = Number(userData.lotteryFreeDraws || 0) + amount;
  return amount;
}

function addRodReward(userData, rodId) {
  const rod = ROD_CATALOG[rodId];
  if (!rod) return { rod: null, duplicate: false };
  if (!Array.isArray(userData.rodsOwned)) userData.rodsOwned = [];
  const duplicate = userData.rodsOwned.includes(rodId);
  if (!duplicate) userData.rodsOwned.push(rodId);
  return { rod, duplicate };
}

function applyReward(userData, reward, context = {}) {
  const normalizedReward = { ...reward };
  if (reward.type === 'coins') {
    const amount = Number.isFinite(Number(reward.amount))
      ? Math.max(0, Math.floor(Number(reward.amount)))
      : randomInteger(reward.min, reward.max);
    userData.coins = Number(userData.coins || 0) + amount;
    return {
      ...normalizedReward,
      amount,
      title: reward.title || `${amount} 鱼蛋`,
      desc: reward.desc || `鱼蛋 +${amount}`,
      value: amount
    };
  }

  if (reward.type === 'bait') {
    const bait = BAIT_CATALOG[reward.id];
    if (!bait) return normalizedReward;
    const { count, packCount, packSize } = getBaitRewardAmounts(reward, bait);
    addBaitReward(userData, reward.id, count);
    const defaultTitle = packCount > 0
      ? `${bait?.name || reward.id} ${packCount}包`
      : `${bait?.name || reward.id} ${count}份`;
    const defaultDesc = packCount > 0
      ? `获得 ${packCount} 包 ${bait?.name || reward.id}，每包 ${packSize} 份，库存 +${count} 份`
      : `鱼饵库存 +${count} 份`;
    return {
      ...normalizedReward,
      title: reward.title || defaultTitle,
      desc: reward.desc || defaultDesc,
      value: Number(reward.value || 0),
      itemName: bait?.name || reward.id,
      count,
      packCount,
      packSize
    };
  }

  if (reward.type === 'ticket') {
    const count = addTicketReward(userData, reward.count);
    return {
      ...normalizedReward,
      title: reward.title || `额外钓鱼券 x${count}`,
      desc: reward.desc || `钓鱼券 +${count}`,
      value: Number(reward.value || 0),
      count
    };
  }

  if (reward.type === 'lottery_free_draw') {
    const count = addLotteryFreeDrawReward(userData, reward.count);
    return {
      ...normalizedReward,
      title: reward.title || `免费祈愿 x${count}`,
      desc: reward.desc || `免费钓鱼祈愿 +${count}`,
      value: Number(reward.value || 0),
      count
    };
  }

  if (reward.type === 'rod') {
    const { rod, duplicate } = addRodReward(userData, reward.id);
    if (duplicate && reward.duplicateCompensationCoins > 0) {
      userData.coins = Number(userData.coins || 0) + reward.duplicateCompensationCoins;
    }
    return {
      ...normalizedReward,
      title: duplicate
        ? `${rod?.name || reward.id}（已拥有）`
        : (reward.title || `${rod?.name || reward.id}`),
      desc: duplicate
        ? `你已经拥有它了，这次化作 ${reward.duplicateCompensationCoins || 0} 鱼蛋`
        : (reward.desc || '新增鱼竿'),
      value: Number(reward.value || 0),
      rodName: rod?.name || reward.id,
      duplicate,
      compensationCoins: duplicate ? Number(reward.duplicateCompensationCoins || 0) : 0
    };
  }

  if (reward.type === 'special_item') {
    return {
      ...normalizedReward,
      title: reward.title || reward.name || reward.id || '特殊愿品',
      desc: reward.desc || '特殊愿品已登记，后续会自动生效。',
      value: Number(reward.value || 0),
      itemName: reward.title || reward.name || reward.id || '特殊愿品'
    };
  }

  return normalizedReward;
}

export function parseLotteryCommand(msg = '') {
  const raw = String(msg || '').trim();
  const poolView = /^#钓鱼祈愿(?:清单|列表|概率|说明)$/.test(raw);
  if (poolView) return { mode: 'pool', count: 0 };
  const wishMatch = raw.match(/^#钓鱼祈愿\s*(\d{0,2})$/);
  const wishComboMatch = raw.match(/^#钓鱼祈愿\s*(?:(十)|(\d{1,2}))连$/);
  const comboMatch = raw.match(/^#钓鱼(?:(十)|(\d{1,2}))连$/);
  if (!wishMatch && !wishComboMatch && !comboMatch) return null;
  const countText = wishMatch
    ? wishMatch[1]
    : wishComboMatch
      ? (wishComboMatch[1] ? '10' : wishComboMatch[2])
      : comboMatch[1] ? '10' : comboMatch[2];
  const count = countText ? clampInteger(countText, 1, LOTTERY_CONFIG.maxDrawsPerCommand) : 1;
  return { mode: 'draw', count };
}

export function getLotteryExpectedValue(options = {}) {
  const grandAvailable = options.grandAvailable !== false;
  const grandPassRate = grandAvailable ? Math.max(0, 1 - Number(LOTTERY_CONFIG.grandPrize.rate || 0)) : 1;
  const regularWeightTotal = LOTTERY_CONFIG.regularRewards
    .reduce((sum, reward) => sum + Math.max(0, Number(reward.weight || 0)), 0);
  let directExpected = 0;
  let freeDrawExpectedCount = 0;
  for (const reward of LOTTERY_CONFIG.regularRewards) {
    const normalizedWeight = regularWeightTotal > 0
      ? Math.max(0, Number(reward.weight || 0)) / regularWeightTotal
      : 0;
    if (reward.type === 'lottery_free_draw') {
      freeDrawExpectedCount += normalizedWeight * Math.max(1, Math.floor(Number(reward.count || 1)));
    } else {
      directExpected += normalizedWeight * Number(reward.value || 0);
    }
  }
  const denominator = Math.max(0.0001, 1 - grandPassRate * freeDrawExpectedCount);
  const regularExpected = grandPassRate * directExpected / denominator;
  const rawRegularExpected = directExpected / Math.max(0.0001, 1 - freeDrawExpectedCount);
  return {
    cost: LOTTERY_CONFIG.cost,
    expectedValue: regularExpected,
    expectedRate: regularExpected / LOTTERY_CONFIG.cost,
    grandExpected: 0,
    regularExpected,
    rawRegularExpected,
    directExpected,
    freeDrawExpectedCount,
    grandAvailable,
    grandExcluded: true
  };
}

export function getLotteryPoolSummary(options = {}) {
  const grandPlugin = getLotteryGrandPrizePlugin(options.grandPluginId);
  return {
    config: LOTTERY_CONFIG,
    grandPlugin,
    expected: getLotteryExpectedValue(options),
    regularRewards: LOTTERY_CONFIG.regularRewards
  };
}

export function performLotteryDraws(userData, count, options = {}) {
  const drawCount = clampInteger(count, 1, LOTTERY_CONFIG.maxDrawsPerCommand);
  const freeBefore = Math.max(0, Math.floor(Number(userData.lotteryFreeDraws || 0)));
  const freeUsed = Math.min(freeBefore, drawCount);
  const paidDraws = drawCount - freeUsed;
  const totalCost = paidDraws * LOTTERY_CONFIG.cost;
  if (Number(userData.coins || 0) < totalCost) {
    return {
      ok: false,
      reason: 'coins_not_enough',
      drawCount,
      freeUsed,
      paidDraws,
      totalCost
    };
  }

  userData.coins = Number(userData.coins || 0) - totalCost;
  userData.lotteryFreeDraws = Math.max(0, freeBefore - freeUsed);
  userData.lotteryPity = Math.max(0, Math.floor(Number(userData.lotteryPity || 0)));
  if (!Array.isArray(userData.lotteryGrandPrizes)) userData.lotteryGrandPrizes = [];
  const grandPlugin = getLotteryGrandPrizePlugin(options.grandPluginId || userData.preferredLotteryGrandPrizeId);
  markGrandPrizeOwnedIfRewardAlreadyPresent(userData, grandPlugin);
  const results = [];
  let grandAvailable = options.forceGrandPrize === true || isLotteryGrandPrizeAvailable(userData, grandPlugin);
  const pityLimit = Math.max(1, Number(LOTTERY_CONFIG.grandPrize.pityDraws || 100));

  for (let index = 0; index < drawCount; index += 1) {
    const nextPity = userData.lotteryPity + 1;
    const pityHit = grandAvailable && nextPity >= pityLimit;
    const randomHit = grandAvailable && Math.random() < LOTTERY_CONFIG.grandPrize.rate;
    const isGrandPrize = grandAvailable && (options.forceGrandPrize === true || pityHit || randomHit);
    const reward = isGrandPrize && grandPlugin
      ? {
        ...grandPlugin.reward,
        category: 'grand',
        pluginId: grandPlugin.id,
        title: grandPlugin.name
      }
      : pickWeighted(LOTTERY_CONFIG.regularRewards);
    const applied = applyReward(userData, reward, { index, grandPlugin });
    if (isGrandPrize && grandPlugin?.id) {
      if (!userData.lotteryGrandPrizes.includes(grandPlugin.id)) userData.lotteryGrandPrizes.push(grandPlugin.id);
      userData.lotteryPity = 0;
      grandAvailable = false;
    } else if (grandAvailable) {
      userData.lotteryPity = nextPity;
    }
    results.push({
      index,
      isGrandPrize,
      pityHit,
      paid: index >= freeUsed,
      reward: applied,
      timestamp: getNowTimestamp()
    });
  }

  return {
    ok: true,
    drawCount,
    freeUsed,
    paidDraws,
    totalCost,
    results,
    grandPlugin,
    grandAvailableAfter: grandAvailable,
    pityAfter: Number(userData.lotteryPity || 0),
    pityLimit,
    freeDrawsAfter: Number(userData.lotteryFreeDraws || 0),
    coinsAfter: Number(userData.coins || 0)
  };
}
