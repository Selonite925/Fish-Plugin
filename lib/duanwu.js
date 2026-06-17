import { BAIT_CATALOG, DUANWU_EVENT_CONFIG } from './constants.js';
import { getNowTimestamp, getTodayKey } from './time.js';

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function randomInteger(min, max) {
  const lower = Math.floor(Number(min));
  const upper = Math.floor(Number(max));
  const realMin = Number.isFinite(lower) ? lower : 0;
  const realMax = Number.isFinite(upper) ? upper : realMin;
  const start = Math.min(realMin, realMax);
  const end = Math.max(realMin, realMax);
  return Math.floor(Math.random() * (end - start + 1)) + start;
}

function mergeRarityBias(...biasList) {
  const merged = {};
  for (const bias of biasList) {
    for (const [rarity, value] of Object.entries(bias || {})) {
      merged[rarity] = (merged[rarity] || 0) + Number(value || 0);
    }
  }
  return merged;
}

function isDateInRange(dateKey, startDate = '', endDateExclusive = '') {
  const today = String(dateKey || getTodayKey()).trim();
  const start = String(startDate || '').trim();
  const end = String(endDateExclusive || '').trim();
  if (start && today < start) return false;
  if (end && today >= end) return false;
  return true;
}

export function isDuanwuEventActive(dateKey = getTodayKey()) {
  return isDateInRange(dateKey, DUANWU_EVENT_CONFIG.startDate, DUANWU_EVENT_CONFIG.endDateExclusive);
}

export function isSeasonalBaitActive(bait, dateKey = getTodayKey()) {
  if (!bait?.seasonal) return true;
  return isDateInRange(dateKey, bait.seasonal.startDate, bait.seasonal.endDateExclusive);
}

function mergeBaitRandomEffect(bait, effect) {
  if (!effect) return bait;
  return {
    ...bait,
    activeRandomEffectName: effect.name || '',
    activeRandomEffectDesc: effect.desc || '',
    catchRateBonus: Number(bait?.catchRateBonus || 0) + Number(effect.catchRateBonus || 0),
    baitPreserveChance: Number(bait?.baitPreserveChance || 0) + Number(effect.baitPreserveChance || 0),
    rarityBias: mergeRarityBias(bait?.rarityBias || {}, effect.rarityBias || {}),
    sizeMultiplier: Number(bait?.sizeMultiplier || 1) * Number(effect.sizeMultiplier || 1),
    weightMultiplier: Number(bait?.weightMultiplier || 1) * Number(effect.weightMultiplier || 1),
    minSizeRatio: Math.max(Number(bait?.minSizeRatio || 0), Number(effect.minSizeRatio || 0)),
    minWeightRatio: Math.max(Number(bait?.minWeightRatio || 0), Number(effect.minWeightRatio || 0))
  };
}

export function applyBaitRandomEffectForCast(bait) {
  const effects = Array.isArray(bait?.randomEffects) ? bait.randomEffects.filter(Boolean) : [];
  if (!effects.length) return bait;
  const effect = effects[Math.floor(Math.random() * effects.length)];
  return mergeBaitRandomEffect(bait, effect);
}

export function claimDailyDuanwuZongziGift(userData, todayKey = getTodayKey()) {
  if (!isDuanwuEventActive(todayKey)) return null;
  const bait = BAIT_CATALOG[DUANWU_EVENT_CONFIG.baitId];
  if (!bait) return null;
  if (!userData.duanwuEvent || typeof userData.duanwuEvent !== 'object') {
    userData.duanwuEvent = {};
  }
  if (String(userData.duanwuEvent.lastGiftDate || '').trim() === todayKey) return null;

  const packCount = Math.max(1, Math.floor(Number(DUANWU_EVENT_CONFIG.dailyGiftPackCount || 1)));
  const packSize = Math.max(1, Math.floor(Number(bait.packSize || 1)));
  const count = packCount * packSize;
  if (!userData.baitInventory || typeof userData.baitInventory !== 'object') userData.baitInventory = {};
  userData.baitInventory[bait.id] = Number(userData.baitInventory[bait.id] || 0) + count;
  userData.duanwuEvent.lastGiftDate = todayKey;
  userData.duanwuEvent.lastGiftAt = getNowTimestamp();
  return {
    bait,
    packCount,
    count,
    text: `[端午活动] 今日水边挂起了艾草，送你 ${bait.name || bait.id} ${packCount}包(${count}份)。活动期间装备粽子，空钩时有机会遇见一段江上的奇事。`
  };
}

export function shouldTriggerDuanwuQuyuanEvent(shopBait = {}, dateKey = getTodayKey()) {
  const event = shopBait?.activityEvent;
  if (event?.id !== 'duanwu_quyuan' || !isDuanwuEventActive(dateKey)) return false;
  const chance = clampNumber(event.failEventChance ?? DUANWU_EVENT_CONFIG.failEventChance, 0, 1);
  return Math.random() < chance;
}

export function applyDuanwuQuyuanEvent(userData) {
  const rewardRange = DUANWU_EVENT_CONFIG.rewardCoins || {};
  const rewardCoins = randomInteger(rewardRange.min ?? 200, rewardRange.max ?? 700);
  userData.coins = Number(userData.coins || 0) + rewardCoins;
  if (!userData.duanwuEvent || typeof userData.duanwuEvent !== 'object') userData.duanwuEvent = {};
  userData.duanwuEvent.quyuanHits = Number(userData.duanwuEvent.quyuanHits || 0) + 1;
  userData.duanwuEvent.lastQuyuanAt = getNowTimestamp();
  return {
    rewardCoins,
    compactText: `端午奇遇：钓上屈原，+${rewardCoins}鱼蛋`,
    resultText:
      `[端午奇遇] 钩尖没有鱼，却牵起一缕沉静的江潮。\n` +
      `粽叶在水面铺开，彩绳轻轻一紧，你竟从波纹里钓起了屈原的诗魂。\n` +
      `江风替你翻过一页离骚，水边落下一袋节令鱼蛋：+${rewardCoins}。`
  };
}
