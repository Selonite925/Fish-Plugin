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

function getGrandPrizePlugin(pluginId = LOTTERY_CONFIG.grandPrize.defaultPluginId) {
  return LOTTERY_GRAND_PRIZE_PLUGINS[pluginId] || LOTTERY_GRAND_PRIZE_PLUGINS[LOTTERY_CONFIG.grandPrize.defaultPluginId] || null;
}

function addBaitReward(userData, baitId, count) {
  const bait = BAIT_CATALOG[baitId];
  if (!bait) return null;
  if (!userData.baitInventory) userData.baitInventory = {};
  userData.baitInventory[baitId] = Number(userData.baitInventory[baitId] || 0) + Math.max(1, Math.floor(Number(count || 1)));
  return bait;
}

function addTicketReward(userData, count) {
  const amount = Math.max(1, Math.floor(Number(count || 1)));
  userData.tickets = Number(userData.tickets || 0) + amount;
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
      title: reward.title || `${amount} 鱼币`,
      desc: reward.desc || `鱼币 +${amount}`,
      value: amount
    };
  }

  if (reward.type === 'bait') {
    const bait = addBaitReward(userData, reward.id, reward.count);
    const count = Math.max(1, Math.floor(Number(reward.count || 1)));
    return {
      ...normalizedReward,
      title: reward.title || `${bait?.name || reward.id} x${count}`,
      desc: reward.desc || `鱼饵库存 +${count}`,
      value: Number(reward.value || 0),
      itemName: bait?.name || reward.id,
      count
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
        ? `重复大奖，折算补偿 ${reward.duplicateCompensationCoins || 0} 鱼币`
        : (reward.desc || '新增鱼竿'),
      value: Number(reward.value || 0),
      rodName: rod?.name || reward.id,
      duplicate,
      compensationCoins: duplicate ? Number(reward.duplicateCompensationCoins || 0) : 0
    };
  }

  return normalizedReward;
}

export function parseLotteryCommand(msg = '') {
  const raw = String(msg || '').trim();
  const poolView = /^#钓鱼抽奖(?:奖池|概率|说明)$/.test(raw);
  if (poolView) return { mode: 'pool', count: 0 };
  const match = raw.match(/^#钓鱼抽奖\s*(\d{0,2})$/);
  if (!match) return null;
  const count = match[1] ? clampInteger(match[1], 1, LOTTERY_CONFIG.maxDrawsPerCommand) : 1;
  return { mode: 'draw', count };
}

export function getLotteryExpectedValue() {
  const grandPlugin = getGrandPrizePlugin();
  const grandExpected = LOTTERY_CONFIG.grandPrize.rate * Number(grandPlugin?.reward?.value || 0);
  const regularWeightTotal = LOTTERY_CONFIG.regularRewards
    .reduce((sum, reward) => sum + Math.max(0, Number(reward.weight || 0)), 0);
  const regularExpected = LOTTERY_CONFIG.regularRewards.reduce((sum, reward) => {
    const normalizedWeight = regularWeightTotal > 0
      ? Math.max(0, Number(reward.weight || 0)) / regularWeightTotal
      : 0;
    return sum + (1 - LOTTERY_CONFIG.grandPrize.rate) * normalizedWeight * Number(reward.value || 0);
  }, 0);
  return {
    cost: LOTTERY_CONFIG.cost,
    expectedValue: grandExpected + regularExpected,
    expectedRate: (grandExpected + regularExpected) / LOTTERY_CONFIG.cost,
    grandExpected,
    regularExpected
  };
}

export function getLotteryPoolSummary() {
  const grandPlugin = getGrandPrizePlugin();
  return {
    config: LOTTERY_CONFIG,
    grandPlugin,
    expected: getLotteryExpectedValue(),
    regularRewards: LOTTERY_CONFIG.regularRewards
  };
}

export function performLotteryDraws(userData, count, options = {}) {
  const drawCount = clampInteger(count, 1, LOTTERY_CONFIG.maxDrawsPerCommand);
  const totalCost = drawCount * LOTTERY_CONFIG.cost;
  if (Number(userData.coins || 0) < totalCost) {
    return {
      ok: false,
      reason: 'coins_not_enough',
      drawCount,
      totalCost
    };
  }

  userData.coins = Number(userData.coins || 0) - totalCost;
  const grandPlugin = getGrandPrizePlugin(options.grandPluginId);
  const results = [];

  for (let index = 0; index < drawCount; index += 1) {
    const isGrandPrize = options.forceGrandPrize === true || Math.random() < LOTTERY_CONFIG.grandPrize.rate;
    const reward = isGrandPrize && grandPlugin
      ? {
        ...grandPlugin.reward,
        category: 'grand',
        pluginId: grandPlugin.id,
        title: grandPlugin.name
      }
      : pickWeighted(LOTTERY_CONFIG.regularRewards);
    const applied = applyReward(userData, reward, { index, grandPlugin });
    results.push({
      index,
      isGrandPrize,
      reward: applied,
      timestamp: getNowTimestamp()
    });
  }

  return {
    ok: true,
    drawCount,
    totalCost,
    results,
    grandPlugin,
    coinsAfter: Number(userData.coins || 0)
  };
}
