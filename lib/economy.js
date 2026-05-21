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
  const source = compact.includes('鱼缸') ? 'tank' : 'today';
  const all = /全部|所有|all/i.test(compact) || compact === '鱼缸';
  const rarityMatch = compact.match(/(common|uncommon|rare|epic|legendary|彩蛋|[?？])/i);
  const rarity = rarityMatch
    ? (rarityMatch[1] === '彩蛋' || rarityMatch[1] === '?' || rarityMatch[1] === '？' ? EASTER_EGG_RARITY : rarityMatch[1].toLowerCase())
    : null;
  const sourceRemovedCompact = compact.replace(/^鱼缸/, '');
  const sourceRemovedText = source === 'tank' ? text.replace(/^鱼缸\s*/i, '').trim() : text;
  const rarityPattern = rarity
    ? (rarity === EASTER_EGG_RARITY ? /彩蛋|[?？]/i : new RegExp(rarity, 'i'))
    : null;
  let compactWithoutRarity = rarity ? sourceRemovedCompact.replace(rarityPattern, '') : sourceRemovedCompact;
  compactWithoutRarity = compactWithoutRarity.replace(/全部|所有|all/ig, '');
  const explicitIndexes = [];
  const pushIndexesFromText = rawText => {
    for (const match of rawText.matchAll(/\d{1,3}/g)) {
      const value = Number(match[0]);
      if (Number.isInteger(value) && value > 0) explicitIndexes.push(value - 1);
    }
  };
  const rarityRemovedText = rarity
    ? sourceRemovedText.replace(rarityPattern, '').replace(/全部|所有|all/ig, '').trim()
    : sourceRemovedText.replace(/全部|所有|all/ig, '').trim();
  const pureNumberList = rawText => /^\d{1,3}(?:\s+\d{1,3})*$/.test(String(rawText || '').trim());
  if (!all && !rarity) {
    if (source === 'tank') {
      if (pureNumberList(sourceRemovedText) || /^\d{1,3}$/.test(sourceRemovedCompact)) {
        pushIndexesFromText(sourceRemovedText || sourceRemovedCompact);
      }
    } else if (pureNumberList(text)) {
      pushIndexesFromText(text);
    }
  } else if (rarity && rarityRemovedText && pureNumberList(rarityRemovedText)) {
    pushIndexesFromText(rarityRemovedText);
  }
  const uniqueExplicitIndexes = [...new Set(explicitIndexes)];
  const trailingNumberMatch = compactWithoutRarity.match(/(\d{1,3})$/);
  const count = trailingNumberMatch ? Number(trailingNumberMatch[1]) : 1;
  let fishName = '';
  let duplicateIndex = 0;
  if (source === 'tank' && !all && !rarity && uniqueExplicitIndexes.length === 0) {
    const nameMatch = sourceRemovedText.replace(/全部|所有|all/ig, '').trim().match(/^(.*?)(\d{1,3})?$/);
    fishName = String(nameMatch?.[1] || '').trim();
    duplicateIndex = nameMatch?.[2] ? Math.max(0, Number(nameMatch[2]) - 1) : 0;
    if (!fishName) duplicateIndex = 0;
  }
  let mode = 'count';
  if (all) {
    mode = 'all';
  } else if (rarity) {
    mode = uniqueExplicitIndexes.length ? 'rarity_indexes' : (trailingNumberMatch ? 'rarity_index' : 'rarity_all');
  } else if (source === 'tank' && fishName) {
    mode = 'tank_name';
  } else if (uniqueExplicitIndexes.length) {
    mode = source === 'tank' ? 'tank_index' : 'today_index';
  }
  return {
    source,
    count,
    rarity,
    all,
    explicitIndexes: uniqueExplicitIndexes,
    fishName,
    duplicateIndex,
    mode
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
