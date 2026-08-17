import {
  EASTER_EGG_RARITY,
  RARITY_VALUE_LIMITS,
  RARITY_LABELS,
  RARITY_SELL_LIMITS,
  SHOP_ITEMS
} from './constants.js';
import { fishTemplateByName } from '../fishdata/fishpool.js';
import { getMapFishTemplateByName } from './maps.js';

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
  const template = fishTemplateByName?.[fish?.name] ||
    getMapFishTemplateByName(fish?.mapId, fish?.name) ||
    getMapFishTemplateByName('abyss', fish?.name);
  if (!template) return 0.5;
  const lengthQuality = normalizeBodyValue(fish.length, template.size);
  const weightQuality = normalizeBodyValue(fish.weight, template.weight);
  return clampNumber(lengthQuality * 0.3 + weightQuality * 0.7, 0, 1);
}

// 鱼蛋结算需要保留 legendary/彩蛋鱼的内部价值，即使它们不能直接售卖。
export function getFishValue(fish) {
  if (!fish || typeof fish !== 'object') return 0;
  const limits = RARITY_VALUE_LIMITS[fish.rarity];
  if (!limits) return 0;
  const quality = getFishBodyQuality(fish);
  const rawPrice = limits.min + (limits.max - limits.min) * quality;
  return Math.round(clampNumber(rawPrice, limits.min, limits.max));
}

export function getFishSellValue(fish) {
  if (fish.rarity === 'legendary' || fish.rarity === EASTER_EGG_RARITY) return 0;
  const limits = RARITY_SELL_LIMITS[fish.rarity];
  if (!limits) return 0;
  return getFishValue({ ...fish, rarity: fish.rarity });
}

export function parseSellTarget(msg) {
  const text = String(msg || '')
    .replace(/^#?(?:鱼市)?\s*(?:售鱼)?\s*/, '')
    .trim();
  const compact = text.replace(/\s+/g, '');
  if (!compact) {
    return { error: '请指定要出售的鱼，例如：#售鱼 1 / #售鱼 common / #售鱼 鱼缸虹鳟 / #售鱼 全部。' };
  }

  const source = compact.startsWith('鱼缸') ? 'tank' : 'today';
  const targetText = source === 'tank' ? text.replace(/^鱼缸\s*/i, '').trim() : text;
  const targetCompact = targetText.replace(/\s+/g, '');
  const pureNumberList = rawText => /^\d{1,3}(?:\s+\d{1,3})*$/.test(String(rawText || '').trim());
  const parseIndexes = rawText => {
    const values = [...String(rawText || '').matchAll(/\d{1,3}/g)].map(match => Number(match[0]));
    if (!values.length || values.some(value => !Number.isInteger(value) || value <= 0)) return null;
    return [...new Set(values.map(value => value - 1))];
  };
  const all = (source === 'tank' && !targetCompact) || /^(?:全部|所有|all)$/i.test(targetCompact);

  if (all) {
    return {
      source,
      count: 1,
      rarity: null,
      all: true,
      explicitIndexes: [],
      fishName: '',
      duplicateIndex: 0,
      mode: 'all'
    };
  }

  const rarityMatch = targetText.match(/^(uncommon|common|rare|epic|legendary|彩蛋|[?？])\s*(.*)$/i);
  if (rarityMatch) {
    const rarityTail = String(rarityMatch[2] || '').trim();
    if (rarityTail && !pureNumberList(rarityTail)) {
      return { error: '稀有度后只能填写鱼的序号，例如：#售鱼 uncommon / #售鱼 uncommon 1 2。' };
    }
    const rarityToken = rarityMatch[1];
    const rarity = /^(?:彩蛋|[?？])$/.test(rarityToken) ? EASTER_EGG_RARITY : rarityToken.toLowerCase();
    const explicitIndexes = rarityTail ? parseIndexes(rarityTail) : [];
    if (rarityTail && !explicitIndexes) {
      return { error: '鱼的序号必须从 1 开始。' };
    }
    return {
      source,
      count: explicitIndexes.length ? explicitIndexes[0] + 1 : 1,
      rarity,
      all: !explicitIndexes.length,
      explicitIndexes,
      fishName: '',
      duplicateIndex: 0,
      mode: explicitIndexes.length ? 'rarity_indexes' : 'rarity_all'
    };
  }

  if (pureNumberList(targetText)) {
    const explicitIndexes = parseIndexes(targetText);
    if (!explicitIndexes) {
      return { error: '鱼的序号必须从 1 开始。' };
    }
    return {
      source,
      count: explicitIndexes.length ? explicitIndexes[0] + 1 : 1,
      rarity: null,
      all: false,
      explicitIndexes,
      fishName: '',
      duplicateIndex: 0,
      mode: source === 'tank' ? 'tank_index' : 'today_index'
    };
  }

  if (source !== 'tank') {
    return { error: '无法识别售鱼目标。请使用编号、稀有度或“全部”，鱼名出售需写成 #售鱼 鱼缸鱼名。' };
  }

  const nameMatch = targetText.match(/^(.*?)(\d{1,3})?$/);
  const fishName = String(nameMatch?.[1] || '').trim();
  if (!fishName) {
    return { error: '无法识别鱼缸中的售鱼目标，请先用 #查看鱼缸 确认鱼名或序号。' };
  }
  const duplicateIndex = nameMatch?.[2] ? Math.max(0, Number(nameMatch[2]) - 1) : 0;
  return {
    source,
    count: duplicateIndex + 1,
    rarity: null,
    all: false,
    explicitIndexes: [],
    fishName,
    duplicateIndex,
    mode: 'tank_name'
  };
}

export function buildSellPreview(fishList) {
  const totalCoins = fishList.reduce((sum, fish) => sum + getFishSellValue(fish), 0);
  return {
    totalCoins,
    lines: fishList.map(fish => `${fish.name}(${RARITY_LABELS[fish.rarity] || fish.rarity}) +${getFishSellValue(fish)}鱼蛋`)
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
