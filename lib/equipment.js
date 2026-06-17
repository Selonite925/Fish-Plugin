import {
  BAIT_CATALOG,
  DEFAULT_BAIT_ID,
  DEFAULT_ROD_ID,
  LOTTERY_GRAND_PRIZE_PLUGINS,
  ROD_CATALOG,
  SHOP_ITEMS
} from './constants.js';
import { getNowTimestamp, getTodayKey } from './time.js';
import { isSeasonalBaitActive } from './duanwu.js';

// 鱼竿/鱼饵目录辅助：负责目录可见性、库存列表、展示文案和鱼饵配送员。

export function getBuyableRodList() {
  return Object.values(ROD_CATALOG).filter(item => item.price > 0 && !item.sourceLegendary);
}

export function getRodRecycleValue(rod) {
  if (!rod || rod.id === DEFAULT_ROD_ID) return 0;
  if (Number(rod.recycleValue || 0) > 0) return Math.floor(Number(rod.recycleValue || 0));
  if (rod.sourceLegendary) return 750;
  return Math.max(0, Math.floor(Number(rod.price || 0) / 2));
}

export function getVisibleRodList(userData) {
  const owned = new Set(userData?.rodsOwned || []);
  return Object.values(ROD_CATALOG).filter(rod => {
    if (rod.sourceLegendary || rod.sourceLottery) return owned.has(rod.id);
    return true;
  });
}

export function getSwitchableRodList(userData) {
  const owned = new Set(userData?.rodsOwned || []);
  const buyable = getBuyableRodList();
  const special = Object.values(ROD_CATALOG)
    .filter(rod => (rod.sourceLegendary || rod.sourceLottery) && owned.has(rod.id));
  return [...buyable, ...special];
}

export function getRecyclableRodList(userData) {
  const owned = new Set(userData?.rodsOwned || []);
  return Object.values(ROD_CATALOG)
    .filter(rod => rod.id !== DEFAULT_ROD_ID && owned.has(rod.id))
    .sort((a, b) => {
      const craftedDiff = Number(Boolean(b.sourceLegendary)) - Number(Boolean(a.sourceLegendary));
      if (craftedDiff !== 0) return craftedDiff;
      return getRodRecycleValue(b) - getRodRecycleValue(a);
    });
}

export function getOwnedRodDetailsList(userData) {
  const owned = new Set(userData?.rodsOwned || []);
  return Object.values(ROD_CATALOG)
    .filter(Boolean)
    .filter(rod => rod.id === DEFAULT_ROD_ID || owned.has(rod.id));
}

export function getBuiltinBuyableBaitList(dateKey = getTodayKey()) {
  return Object.values(BAIT_CATALOG)
    .filter(item => !item.isDefault && !item.lotteryOnly)
    .filter(item => isSeasonalBaitActive(item, dateKey));
}

export function getOwnedBuiltinBaitList(userData) {
  return Object.values(BAIT_CATALOG)
    .filter(item => !item.isDefault)
    .filter(item => !item.lotteryOnly || Number(userData?.baitInventory?.[item.id] || 0) > 0);
}

export function getCustomBaitList(userData) {
  return Object.values(userData?.customBaits || {})
    .filter(bait => Number(userData?.baitInventory?.[bait.id] || 0) > 0)
    .filter((bait, index, arr) => arr.findIndex(item => item.id === bait.id) === index);
}

export function getSwitchableBaitList(userData) {
  return [...getOwnedBuiltinBaitList(userData), ...getCustomBaitList(userData)];
}

export function getNextAutoRenewBait(userData, currentBaitId = '') {
  const orderedBaits = getSwitchableBaitList(userData)
    .filter(bait => bait?.id && bait.id !== DEFAULT_BAIT_ID);
  if (!orderedBaits.length) return null;

  const currentIndex = orderedBaits.findIndex(bait => bait.id === currentBaitId);
  const ordered = currentIndex >= 0
    ? [...orderedBaits.slice(currentIndex + 1), ...orderedBaits.slice(0, currentIndex)]
    : orderedBaits;
  return ordered.find(bait => Number(userData?.baitInventory?.[bait.id] || 0) > 0) || null;
}

export function getOwnedBaitDetailsList(userData) {
  const ownedBuiltinBaits = Object.values(BAIT_CATALOG)
    .filter(item => !item.isDefault)
    .filter(item => Number(userData?.baitInventory?.[item.id] || 0) > 0);
  return [BAIT_CATALOG[DEFAULT_BAIT_ID], ...ownedBuiltinBaits, ...getCustomBaitList(userData)]
    .filter(Boolean)
    .filter((bait, index, arr) => arr.findIndex(item => item.id === bait.id) === index);
}

export function getBaitPackText(bait) {
  const packSize = Math.max(1, Number(bait?.packSize || 1));
  const unitPrice = Number(bait?.price || 0);
  const costPerUse = unitPrice / packSize;
  if (bait?.lotteryOnly) return `祈愿限定，1包${packSize}份，库存按份消耗`;
  if (bait?.seasonal) return `${unitPrice}鱼蛋/包，1包${packSize}份，限时出售至${bait.seasonal.endDateExclusive}`;
  return `${unitPrice}鱼蛋/包，1包${packSize}份，约${costPerUse.toFixed(1)}鱼蛋/次`;
}

export function isCustomBait(bait) {
  return Boolean(bait?.isCustom || bait?.sourceText || String(bait?.id || '').startsWith('custom_'));
}

export function getLegacyCustomBaitName(bait) {
  const source = String(bait?.sourceText || '').trim();
  if (source) return `${source.slice(0, 8)}特调饵`;
  return bait?.name || bait?.id || '自定义鱼饵';
}

export function getBaitDisplayName(bait) {
  if (!bait) return '未知鱼饵';
  if (!isCustomBait(bait)) return bait.name || bait.id || '未知鱼饵';
  const name = String(bait.name || '').trim();
  if (!name || /^手作鱼饵-[0-9A-Z]{4}$/i.test(name)) return getLegacyCustomBaitName(bait);
  return name;
}

export function getBaitDisplayDescription(bait) {
  if (!bait) return '';
  if (!isCustomBait(bait)) return bait.description || '';
  return bait.description || '一份按私人配方拌出的定制鱼饵，气味层次复杂，适合试试不同手感。';
}

export function getOwnedBaitsDisplaySummary(userData) {
  const entries = Object.entries(userData?.baitInventory || {})
    .filter(([, count]) => Number(count || 0) > 0)
    .map(([id, count]) => {
      const bait = userData?.customBaits?.[id] || BAIT_CATALOG[id] || SHOP_ITEMS[id] || { id, name: id };
      return `${getBaitDisplayName(bait)}x${count}`;
    });
  return entries.join('、');
}

export function getBaitAcquireText(bait) {
  const packSize = Math.max(1, Number(bait?.packSize || 1));
  if (bait?.isDefault) return '售价：不可购买';
  if (bait?.lotteryOnly) return `获取：祈愿限定，1包${packSize}份，库存按份消耗`;
  if (bait?.seasonal) return `售价：${Number(bait?.price || 0)}鱼蛋 / 包，1包${packSize}份；限时出售至${bait.seasonal.endDateExclusive}`;
  return `售价：${Number(bait?.price || 0)}鱼蛋 / 包，1包${packSize}份`;
}

export function getBaitDeliveryPool(dateKey = getTodayKey()) {
  return Object.values(BAIT_CATALOG)
    .filter(bait => bait?.id && !bait.isDefault && isSeasonalBaitActive(bait, dateKey) && Math.max(1, Math.floor(Number(bait.packSize || 0))) > 0);
}

export function summarizeBaitDeliveryPacks(deliveries = []) {
  const groups = new Map();
  for (const item of deliveries) {
    const baitId = item?.bait?.id;
    if (!baitId) continue;
    const current = groups.get(baitId) || { bait: item.bait, packs: 0, count: 0 };
    current.packs += 1;
    current.count += Math.max(1, Math.floor(Number(item.count || 1)));
    groups.set(baitId, current);
  }
  return [...groups.values()]
    .map(item => `${getBaitDisplayName(item.bait)} ${item.packs}包(${item.count}份)`)
    .join('、');
}

export function claimDailyBaitDelivery(userData, todayKey = getTodayKey()) {
  const grandPlugin = LOTTERY_GRAND_PRIZE_PLUGINS.bait_delivery_clerk;
  if (!grandPlugin?.id || !Array.isArray(userData?.lotteryGrandPrizes) || !userData.lotteryGrandPrizes.includes(grandPlugin.id)) return null;

  if (!userData.dailyBaitDelivery || typeof userData.dailyBaitDelivery !== 'object') {
    userData.dailyBaitDelivery = { lastDate: '', delivered: false };
  }
  if (String(userData.dailyBaitDelivery.lastDate || '').trim() === todayKey && userData.dailyBaitDelivery.delivered) return null;

  const pool = getBaitDeliveryPool();
  if (!pool.length) return null;
  const packCount = Math.max(1, Math.floor(Number(grandPlugin.dailyDelivery?.packCount || 3)));
  const deliveries = [];
  if (!userData.baitInventory || typeof userData.baitInventory !== 'object') userData.baitInventory = {};
  for (let index = 0; index < packCount; index += 1) {
    const bait = pool[Math.floor(Math.random() * pool.length)];
    const count = Math.max(1, Math.floor(Number(bait.packSize || 1)));
    userData.baitInventory[bait.id] = Number(userData.baitInventory[bait.id] || 0) + count;
    deliveries.push({ bait, count });
  }
  const totalCount = deliveries.reduce((sum, item) => sum + item.count, 0);
  userData.dailyBaitDelivery = {
    lastDate: todayKey,
    delivered: true,
    deliveredAt: getNowTimestamp(),
    packs: deliveries.map(item => ({
      id: item.bait.id,
      name: getBaitDisplayName(item.bait),
      count: item.count
    }))
  };
  return {
    deliveries,
    totalCount,
    text: `[鱼饵配送员] 今日鱼饵配送到货：${summarizeBaitDeliveryPacks(deliveries)}，库存合计 +${totalCount} 份。`
  };
}
