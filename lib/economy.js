import {
  EASTER_EGG_RARITY,
  RARITY_LABELS,
  RARITY_SELL_LIMITS,
  SHOP_ITEMS
} from './constants.js';
import { fishTemplateByName } from '../fishdata/fishpool.js';

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeBodyValue(value, range) {
  const numericValue = Number(value);
  const min = Number(range?.min);
  const max = Number(range?.max);
  if (!Number.isFinite(numericValue) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return 0.5;
  }
  return clampNumber((numericValue - min) / (max - min), 0, 1);
}

function getFishBodyQuality(fish) {
  const template = fishTemplateByName?.[fish?.name];
  if (!template) return 0.5;
  const lengthQuality = normalizeBodyValue(fish.length, template.size);
  const weightQuality = normalizeBodyValue(fish.weight, template.weight);
  return clampNumber(lengthQuality * 0.3 + weightQuality * 0.7, 0, 1);
}

export function getFishSellValue(fish) {
  if (fish.rarity === 'legendary' || fish.rarity === EASTER_EGG_RARITY) return 0;
  const limits = RARITY_SELL_LIMITS[fish.rarity];
  if (!limits) return 0;
  const quality = getFishBodyQuality(fish);
  const rawPrice = limits.min + (limits.max - limits.min) * quality;
  return Math.round(clampNumber(rawPrice, limits.min, limits.max));
}

export function parseSellTarget(msg) {
  const text = String(msg || '')
    .replace(/^#?(?:鱼市)?\s*(?:售鱼)?\s*/, '')
    .trim();
  const compact = text.replace(/\s+/g, '');
  const tokens = text.split(/\s+/).filter(Boolean);
  const source = compact.includes('鱼缸') ? 'tank' : 'today';
  const all = /全部|所有|all/i.test(compact) || compact === '鱼缸';
  const rarityMatch = compact.match(/(common|uncommon|rare|epic|legendary|彩蛋|[?？])/i);
  const rarity = rarityMatch
    ? (rarityMatch[1] === '彩蛋' || rarityMatch[1] === '?' || rarityMatch[1] === '？' ? EASTER_EGG_RARITY : rarityMatch[1].toLowerCase())
    : null;
  const compactWithoutSource = compact.replace(/^鱼缸/, '');
  const rarityPattern = rarity === EASTER_EGG_RARITY ? /彩蛋|[?？]/i : new RegExp(rarity, 'i');
  let compactWithoutRarity = rarity ? compactWithoutSource.replace(rarityPattern, '') : compactWithoutSource;
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
