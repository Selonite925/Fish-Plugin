import {
  EASTER_EGG_RARITY,
  RARITY_LABELS,
  RARITY_SELL_LIMITS,
  RARITY_SELL_PRICE,
  RARITY_WEIGHT_PRICE,
  SHOP_ITEMS
} from './constants.js';

export function getFishSellValue(fish) {
  if (fish.rarity === 'legendary' || fish.rarity === EASTER_EGG_RARITY) return 0;
  const base = RARITY_SELL_PRICE[fish.rarity] || 0;
  const weightBonus = Math.max(0, Math.floor(Number(fish.weight || 0) * (RARITY_WEIGHT_PRICE[fish.rarity] || 1)));
  const rawPrice = base + weightBonus;
  const limits = RARITY_SELL_LIMITS[fish.rarity];
  if (!limits) return rawPrice;
  return Math.max(limits.min, Math.min(limits.max, rawPrice));
}

export function parseSellTarget(msg) {
  const text = String(msg || '')
    .replace(/^#?(?:鱼市)?\s*(?:售鱼)?\s*/, '')
    .trim();
  const compact = text.replace(/\s+/g, '');
  const tokens = text.split(/\s+/).filter(Boolean);
  const source = compact.includes('鱼缸') ? 'tank' : 'today';
  const all = /全部|所有|all/i.test(compact) || compact === '鱼缸';
  const rarityMatch = compact.match(/(common|uncommon|rare|epic|legendary)/i);
  const rarity = rarityMatch ? rarityMatch[1].toLowerCase() : null;
  const compactWithoutSource = compact.replace(/^鱼缸/, '');
  let compactWithoutRarity = rarity ? compactWithoutSource.replace(new RegExp(rarity, 'i'), '') : compactWithoutSource;
  compactWithoutRarity = compactWithoutRarity.replace(/全部|所有|all/ig, '');
  const trailingNumberMatch = compactWithoutRarity.match(/(\d{1,3})$/);
  const count = trailingNumberMatch ? Number(trailingNumberMatch[1]) : 1;
  const explicitTankIndexes = [];
  if (source === 'tank' && !all && !rarity) {
    const tankNumberMatch = compact.match(/^鱼缸(\d{1,3})$/) || compact.match(/^(\d{1,3})鱼缸$/);
    if (tankNumberMatch) explicitTankIndexes.push(Number(tankNumberMatch[1]) - 1);
  }
  return {
    source,
    count,
    rarity,
    all,
    explicitTankIndexes,
    mode: all ? 'all' : rarity ? (trailingNumberMatch ? 'rarity_index' : 'rarity_all') : (source === 'tank' && explicitTankIndexes.length ? 'tank_index' : 'count')
  };
}

export function buildSellPreview(fishList) {
  const totalCoins = fishList.reduce((sum, fish) => sum + getFishSellValue(fish), 0);
  return {
    totalCoins,
    lines: fishList.map(fish => `${fish.name}(${RARITY_LABELS[fish.rarity] || fish.rarity}) +${getFishSellValue(fish)}鱼币`)
  };
}

export function canSellFish(fish) {
  return fish.rarity !== 'legendary' && fish.rarity !== EASTER_EGG_RARITY;
}

export function findShopItem(keyword) {
  const text = String(keyword || '').trim();
  return Object.values(SHOP_ITEMS).find(item =>
    item.id === text ||
    item.name === text ||
    item.aliases?.includes(text)
  ) || null;
}
