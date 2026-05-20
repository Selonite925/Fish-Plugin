import plugin from '../../lib/plugins/plugin.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fishTemplateByName,
  fishTypes,
  rarityWeights,
  trashItems,
  randomEvents,
  generateFish,
  lostItemEvents
} from './fishdata/fishpool.js';
import {
  ACHIEVEMENT_DEFS,
  BAIT_CATALOG,
  DEFAULT_ROD_ID,
  EASTER_EGG_RARITY,
  HIDDEN_PITY_CATCH_BONUS,
  LEGENDARY_ROD_RECIPES,
  RARITY_LABELS,
  RARITY_ORDER,
  ROD_CATALOG,
  SHOP_ITEMS,
  TANK_UPGRADE_EXTRA_CASTS
} from './lib/constants.js';
import { defaultLegendaryMessage, defaultMysteryMessage, emptyHookMessages, epicMessages, failProtectionFakeFailMessages, legendaryMessages, mysteryMessages } from './lib/messages.js';
import {
  ensureGeneratedDir,
  loadBaitData,
  loadConfig,
  loadFishData,
  loadLostItems,
  loadWorldState,
  saveBaitData,
  saveConfig,
  saveFishData,
  saveLostItems,
  saveWorldState
} from './lib/storage.js';
import {
  addFishHistory,
  applyPendingEasterEggSwitch,
  canFishToday,
  createDefaultUserData,
  ensureFishId,
  getCatchRate,
  getDailyLimit,
  getDailyLimitBreakdown,
  getEasterEggStatusSummary,
  getTodayNormalCastUsed,
  describeEasterEggEffects,
  getEasterEggEffects,
  getEquippedBait,
  getEquippedRod,
  getFishingLimitExhaustedText,
  getFishingLimitText,
  getTargetUserId,
  getDisplayNameForUser,
  getUserDisplay,
  getOwnedBaitsSummary,
  getOwnedEasterEggCollection,
  getOwnedRodsSummary,
  isSameFish,
  normalizeAllUsers,
  normalizeUserData,
  repairAllUsersFishData,
  recordEmptyCast,
  removeOwnedFish,
  resetEmptyCastStreak,
  registerCastUsage,
  scheduleEasterEggSwitch,
  unlockEasterEgg
} from './lib/user.js';
import {
  addFishToTank,
  applyTankUpgrade,
  getFishUpgradePoints,
  getOriginalIndexByDisplayIndex,
  getSortedTankWithIndex,
  getTankUpgradeRequiredPoints,
  parseTankIndexes
} from './lib/tank.js';
import { buildSellPreview, canSellFish, findShopItem, getFishSellValue, parseSellTarget } from './lib/economy.js';
import { formatAchievementList, getAchievementCatchRateBonus, getAchievementDailyCastBonus, getCollectionStats, scanAchievements } from './lib/achievements.js';
import { ensureDailySignal, getTodayKey } from './lib/signals.js';
import { ensureResourceDirs, replyWithPanel } from './lib/panel.js';
import { findCustomBaitBySource, generateCustomBaitFromText } from './lib/custom-bait.js';
import {
  parseBaitIndex,
  parseLegendaryCraftTarget,
  parseLegendaryPreviewTarget,
  parseMarketPurchaseKeyword,
  parseRodIndex
} from './lib/command-parsers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FISH_PLUGIN_REPO = 'https://github.com/Selonite925/Fish-Plugin.git';
const SELF_UPDATE_PRESERVE_PATHS = [
  /^fishdata\/(?!fishpool\.js$).+/i,
  /^resources\/backgrounds(?:\/|$)/i,
  /^resources\/generated(?:\/|$)/i
];

const HELP_GROUPS = [
  {
    group: '基础玩法',
    list: [
      { title: '#钓鱼', desc: '正常抛竿一次，结算当前鱼竿、鱼饵、彩蛋和鱼讯效果。' },
      { title: '#钓鱼极速版', desc: '一口气钓完当前能用次数，优先发图汇总结果。' },
      { title: '#今日鱼获 / #查看鱼获 @某人', desc: '查看自己或别人的当日鱼获记录。' },
      { title: '#钓鱼图鉴 / #钓鱼排行 / #鱼王榜 / #空军榜', desc: '看收藏、排行、鱼王分数和今日空军情况。' }
    ]
  },
  {
    group: '鱼缸与鱼获',
    list: [
      { title: '#查看鱼缸', desc: '查看鱼缸容量、升级进度、库存和当前收藏。' },
      { title: '#升级鱼缸 legendary 1 / #升级鱼缸 epic 1 2 3', desc: '支持 epic 与 legendary 混交、分次提交；传说计3点，史诗计1点。' },
      { title: '#放生鱼 1', desc: '从鱼缸放生指定鱼。彩蛋鱼属于收藏，不在鱼缸里。' },
      { title: '#赠渔 @某人 1', desc: '把指定鱼送给别人，方便互换收藏或代管材料。' }
    ]
  },
  {
    group: '鱼市与装备',
    list: [
      { title: '#鱼市 / #售鱼 1 / #售鱼 common / #售鱼 全部', desc: '卖鱼、看鱼市，也可以按今日鱼获编号、稀有度或批量处理。' },
      { title: '#售鱼 鱼缸3 / #售鱼 鱼缸 2 3 4 5', desc: '支持卖鱼缸单条或多条，不会和第23条这种写法冲突。' },
      { title: '#鱼市购买 鱼饵1*5 / #鱼市购买 钓鱼券*3', desc: '批量购买鱼饵和钓鱼券。' },
      { title: '#鱼市购买 鱼竿1 / #鱼市回收 鱼竿1', desc: '购买普通鱼竿，或按回收列表序号回收已拥有鱼竿；普通竿半价，legendary 竿回收价 750。' },
      { title: '#鱼竿 / #换竿 0', desc: '查看鱼竿库存，并切换到默认竿或指定鱼竿。' },
      { title: '#鱼竿详情 鱼竿1 / #鱼竿属性 疾风短竿', desc: '查看已有或可见鱼竿的属性值概览。' },
      { title: '#鱼饵 / #换饵 0', desc: '查看鱼饵库存，并切回默认饵或切到指定鱼饵。' }
    ]
  },
  {
    group: '活动与进阶',
    list: [
      { title: '#限时鱼讯', desc: '查看当天高活跃鱼讯与命中奖励。' },
      { title: '#彩蛋收藏', desc: '查看已收集彩蛋、当前生效项和待切换项。' },
      { title: '#切换彩蛋 愿望锦鲤', desc: '安排彩蛋效果切换；每天只能安排一次，次日生效。' },
      { title: '#钓鱼成就', desc: '查看成就进度和永久加成。' },
      { title: '#打窝 文本 / #打窝 @某人', desc: '生成自定义鱼饵，按文本倾向组合正负效果。' },
      { title: '#炼竿 1 / #炼竿预览 1', desc: '按鱼缸展示序号先预览 legendary 会炼成什么鱼竿，再决定是否正式炼制。' },
      { title: '#钓鱼管理', desc: '查看主人和群管理维护命令。' }
    ]
  }
];

const MANAGEMENT_HELP_GROUPS = [
  {
    group: '主人命令',
    list: [
      { title: '#设置钓鱼次数10', desc: '调整全局基础每日钓鱼次数。' },
      { title: '#鱼币补偿 @某人 *100', desc: '给单人补发鱼币。' },
      { title: '#鱼币补偿 全体 *100', desc: '给已有数据的全部玩家统一补发鱼币。' },
      { title: '#补鱼 @某人 rare 鳗鱼 80 3.5', desc: '直接补发指定鱼，长度和重量可省略。' },
      { title: '#强制刷新钓鱼日', desc: '强制刷新全服当天钓鱼状态。' },
      { title: '#钓鱼更新', desc: '从远端仓库拉取 Fish-plugin 最新版本并重启。' }
    ]
  },
  {
    group: '群与维护',
    list: [
      { title: '#封竿', desc: '关闭当前群里的 Fish-plugin 响应。' },
      { title: '#解封竿', desc: '恢复当前群里的 Fish-plugin 响应。' },
      { title: '#同步鱼缸', desc: '同步和整理鱼缸数据。' },
      { title: '#修复鱼数据', desc: '修复缺失 fishId、重复鱼和异常记录。' }
    ]
  },
  {
    group: '群管理命令',
    list: [
      { title: '#重置钓鱼次数 @某人 / 全体', desc: '重置单人或当前已有数据玩家的当日抛竿次数。' },
      { title: '#钓鱼次数', desc: '查看当前每日上限与已用次数。' }
    ]
  }
];

const HELP_TEXT = HELP_GROUPS.flatMap(group => [
  group.group,
  ...group.list.map(item => `${item.title}：${item.desc}`),
  ''
]).slice(0, -1).join('\n');

const MANAGEMENT_HELP_TEXT = MANAGEMENT_HELP_GROUPS.flatMap(group => [
  group.group,
  ...group.list.map(item => `${item.title}：${item.desc}`),
  ''
]).slice(0, -1).join('\n');

const EMPTY_HOOK_FAIL_RATE = 0.3;
const DAILY_TICKET_PURCHASE_LIMIT = 5;
const FAST_FISHING_CATCH_RATE_PENALTY = 0.08;
const FISHING_BUSY_MESSAGE = '你正在钓鱼，钓鱼就要戒骄戒躁，请稍后。';
const activeFishingUsers = new Set();
const activeFishingBusyNotified = new Set();
const FAIL_RESULT_LABELS = {
  empty_hook: '空钩',
  lost_item: '捞回失物',
  trash: '杂物',
  lost_event: '掉落事件',
  random_event: '空军事件'
};
const COLLECTION_RARITY_THEMES = {
  common: {
    accent: '#16a34a',
    accentSoft: 'rgba(22, 163, 74, 0.14)',
    textColor: '#166534',
    ownedTextColor: '#14532d',
    chipBg: 'rgba(220, 252, 231, 0.92)',
    chipBorder: 'rgba(34, 197, 94, 0.38)'
  },
  uncommon: {
    accent: '#0891b2',
    accentSoft: 'rgba(8, 145, 178, 0.14)',
    textColor: '#0f766e',
    ownedTextColor: '#155e75',
    chipBg: 'rgba(207, 250, 254, 0.92)',
    chipBorder: 'rgba(6, 182, 212, 0.38)'
  },
  rare: {
    accent: '#d97706',
    accentSoft: 'rgba(217, 119, 6, 0.14)',
    textColor: '#b45309',
    ownedTextColor: '#92400e',
    chipBg: 'rgba(254, 243, 199, 0.94)',
    chipBorder: 'rgba(245, 158, 11, 0.4)'
  },
  epic: {
    accent: '#9333ea',
    accentSoft: 'rgba(147, 51, 234, 0.14)',
    textColor: '#7e22ce',
    ownedTextColor: '#6b21a8',
    chipBg: 'rgba(243, 232, 255, 0.94)',
    chipBorder: 'rgba(168, 85, 247, 0.4)'
  },
  legendary: {
    accent: '#dc2626',
    accentSoft: 'rgba(220, 38, 38, 0.16)',
    textColor: '#b91c1c',
    ownedTextColor: '#991b1b',
    chipBg: 'rgba(254, 226, 226, 0.95)',
    chipBorder: 'rgba(248, 113, 113, 0.42)'
  },
  [EASTER_EGG_RARITY]: {
    accent: '#db2777',
    accentSoft: 'rgba(219, 39, 119, 0.16)',
    textColor: '#be185d',
    ownedTextColor: '#9d174d',
    chipBg: 'rgba(252, 231, 243, 0.96)',
    chipBorder: 'rgba(244, 114, 182, 0.46)'
  }
};

const FISH_KING_SCORE_BANDS = {
  common: { min: 10, max: 80 },
  uncommon: { min: 90, max: 180 },
  rare: { min: 190, max: 340 },
  epic: { min: 360, max: 560 },
  legendary: { min: 620, max: 860 },
  [EASTER_EGG_RARITY]: { min: 900, max: 1000 }
};

function formatFishLine(fish, index = null) {
  const prefix = index == null ? '•' : `[${index + 1}]`;
  return `${prefix} ${fish.name}(${fish.rarity}) ${fish.length}cm/${fish.weight}kg`;
}

function formatTodayFishRecordLine(fish, index = null) {
  const prefix = index == null ? '•' : `[${index + 1}]`;
  return `${prefix} ${fish.name}(${fish.rarity}) 长度：${fish.length}cm，重量：${fish.weight}kg`;
}

function getSignalRodBonusCoins(rod, fish) {
  if (!rod) return 0;
  if (rod.id === 'legend_poseidon') {
    if (fish?.rarity === 'legendary' || fish?.rarity === EASTER_EGG_RARITY) return 500;
    return Math.round(getFishSellValue(fish) / 3);
  }
  return Number(rod.signalBonusCoins || 0);
}

function rarityLabel(rarity) {
  return RARITY_LABELS[rarity] || rarity;
}

function getBuyableRodList() {
  return Object.values(ROD_CATALOG).filter(item => item.price > 0 && !item.sourceLegendary);
}

function getRodRecycleValue(rod) {
  if (!rod || rod.id === DEFAULT_ROD_ID) return 0;
  if (rod.sourceLegendary) return 750;
  return Math.max(0, Math.floor(Number(rod.price || 0) / 2));
}

function getVisibleCollectionRarities() {
  return [...RARITY_ORDER];
}

function getVisibleRodList(userData) {
  const owned = new Set(userData?.rodsOwned || []);
  return Object.values(ROD_CATALOG).filter(rod => !rod.sourceLegendary || owned.has(rod.id));
}

function getSwitchableRodList(userData) {
  const owned = new Set(userData?.rodsOwned || []);
  const buyable = getBuyableRodList();
  const crafted = Object.values(ROD_CATALOG)
    .filter(rod => rod.sourceLegendary && owned.has(rod.id));
  return [...buyable, ...crafted];
}

function getRecyclableRodList(userData) {
  const owned = new Set(userData?.rodsOwned || []);
  return Object.values(ROD_CATALOG)
    .filter(rod => rod.id !== DEFAULT_ROD_ID && owned.has(rod.id))
    .sort((a, b) => {
      const craftedDiff = Number(Boolean(b.sourceLegendary)) - Number(Boolean(a.sourceLegendary));
      if (craftedDiff !== 0) return craftedDiff;
      return getRodRecycleValue(b) - getRodRecycleValue(a);
    });
}

function getBuiltinBuyableBaitList() {
  return Object.values(BAIT_CATALOG).filter(item => !item.isDefault);
}

function getCustomBaitList(userData) {
  return Object.values(userData?.customBaits || {})
    .filter(bait => Number(userData?.baitInventory?.[bait.id] || 0) > 0)
    .filter((bait, index, arr) => arr.findIndex(item => item.id === bait.id) === index);
}

function getSwitchableBaitList(userData) {
  return [...getBuiltinBuyableBaitList(), ...getCustomBaitList(userData)];
}

function getBaitPackText(bait) {
  const packSize = Math.max(1, Number(bait?.packSize || 1));
  const unitPrice = Number(bait?.price || 0);
  const costPerUse = unitPrice / packSize;
  return `${unitPrice}鱼币/包，1包${packSize}份，约${costPerUse.toFixed(1)}鱼币/次`;
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

function clampFishBodyValue(value, min, max, decimals) {
  const number = Math.max(min, Math.min(max, Number(value)));
  const rounded = Number(number.toFixed(decimals));
  return decimals === 2 && max > 0 ? Math.max(0.01, rounded) : rounded;
}

function getRandomBodyValue(min, max, decimals) {
  const rounded = Number((Math.random() * (max - min) + min).toFixed(decimals));
  return decimals === 2 && max > 0 ? Math.max(0.01, rounded) : rounded;
}

function escapePanelHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHelpGridSections(groups = []) {
  return groups.map(group => {
    const htmlParts = ['<div class="help-grid">'];
    const items = group.list || [];
    let visualIndex = 0;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const title = escapePanelHtml(item.title || '');
      const desc = escapePanelHtml(item.desc || '');
      const badge = String(++visualIndex).padStart(2, '0');

      const renderItem = (currentItem, currentBadge) => {
        const currentTitle = escapePanelHtml(currentItem.title || '');
        const currentDesc = escapePanelHtml(currentItem.desc || '');
        return (
          '<div class="help-grid-item">' +
          `<div class="help-grid-item-badge">${currentBadge}</div>` +
          `<div class="help-grid-item-title">${currentTitle}</div>` +
          `<div class="help-grid-item-desc">${currentDesc}</div>` +
          '</div>'
        );
      };

      if (item.fullWidth) {
        htmlParts.push('<div class="help-grid-row">');
        htmlParts.push(`<div class="help-grid-item help-grid-item-note">` +
          `<div class="help-grid-item-badge">${badge}</div>` +
          `<div class="help-grid-item-title">${title}</div>` +
          `<div class="help-grid-item-desc">${desc}</div>` +
          '</div>');
        htmlParts.push('</div>');
        continue;
      }

      const nextItem = items[i + 1];
      const canPair = nextItem && !nextItem.fullWidth;
      htmlParts.push('<div class="help-grid-row">');
      htmlParts.push(renderItem(item, badge));
      if (canPair) {
        const nextBadge = String(++visualIndex).padStart(2, '0');
        htmlParts.push(renderItem(nextItem, nextBadge));
        i += 1;
      } else {
        htmlParts.push('<div class="help-grid-item help-grid-item-empty" aria-hidden="true"></div>');
      }
      htmlParts.push('</div>');
    }

    htmlParts.push('</div>');
    const html = htmlParts.join('');

    return {
      type: 'help-grid',
      title: group.group,
      html
    };
  });
}

function describeTrend(value, thresholds = [0.01, 0.03, 0.06]) {
  const numeric = Number(value || 0);
  const abs = Math.abs(numeric);
  const level = abs >= thresholds[2] ? '大幅度' : abs >= thresholds[1] ? '中幅度' : abs >= thresholds[0] ? '小幅度' : null;
  if (!level) return null;
  return { positive: numeric > 0, level };
}

function rarityBiasArrow(value) {
  const numeric = Number(value || 0);
  const abs = Math.abs(numeric);
  if (abs < 0.004) return '-';
  const arrow = numeric > 0 ? '↑' : '↓';
  if (abs >= 0.04) return `${arrow}${arrow}${arrow}`;
  if (abs >= 0.02) return `${arrow}${arrow}`;
  return arrow;
}

function describeMultiplierDirection(value, thresholds = [0.015, 0.04, 0.08]) {
  const numeric = Number(value || 1) - 1;
  return describeTrend(numeric, thresholds);
}

function buildRodTraitLines(rod) {
  const lines = [];

  const catchRateTrend = describeTrend(rod?.catchRateBonus || 0, [0.006, 0.02, 0.05]);
  lines.push(catchRateTrend
    ? `上鱼率${catchRateTrend.level}${catchRateTrend.positive ? '上升' : '下降'}`
    : '上鱼率基本不变');

  const failProtectionTrend = describeTrend(rod?.failProtection || 0, [0.08, 0.18, 0.32]);
  if (failProtectionTrend) {
    lines.push(`护钩率${failProtectionTrend.level}${failProtectionTrend.positive ? '上升' : '下降'}`);
  }

  const waitTrend = describeMultiplierDirection(rod?.waitMultiplier || 1, [0.08, 0.18, 0.3]);
  if (waitTrend) {
    lines.push(`等口时间${waitTrend.level}${waitTrend.positive ? '变长' : '缩短'}`);
  }

  const rarityBiasEntries = RARITY_ORDER
    .filter(rarity => Object.prototype.hasOwnProperty.call(rod?.rarityBias || {}, rarity))
    .map(rarity => `${rarity}鱼比例${rarityBiasArrow(rod?.rarityBias?.[rarity])}`);
  if (rarityBiasEntries.some(text => !text.endsWith('-'))) {
    lines.push(rarityBiasEntries.join(' '));
  }

  const sizeTrend = describeMultiplierDirection(rod?.sizeMultiplier || 1, [0.015, 0.045, 0.09]);
  if (sizeTrend) lines.push(`尺寸表现${sizeTrend.level}${sizeTrend.positive ? '上升' : '下降'}`);

  const weightTrend = describeMultiplierDirection(rod?.weightMultiplier || 1, [0.02, 0.06, 0.12]);
  if (weightTrend) lines.push(`重量表现${weightTrend.level}${weightTrend.positive ? '上升' : '下降'}`);

  if (Number(rod?.minSizeRatio || 0) > 0 || Number(rod?.minWeightRatio || 0) > 0) {
    lines.push('巨物下限更稳，不容易出太小的个体');
  }
  if (Number(rod?.baitPreserveChance || 0) > 0) {
    const preserveTrend = describeTrend(rod.baitPreserveChance, [0.08, 0.18, 0.28]);
    lines.push(`保饵能力${preserveTrend?.level || '小幅度'}上升`);
  }
  if (Number(rod?.catchCoinBonus || 0) > 0) lines.push('每次成功上鱼会顺带多捞一点鱼币');
  if (Number(rod?.signalBonusCoins || 0) > 0) lines.push('命中鱼讯时收成会更亮眼');
  if (Number(rod?.permanentDailyCasts || 0) > 0) lines.push('装备后每日可抛竿次数会增加');
  if (Number(rod?.ownedPermanentDailyCasts || 0) > 0) lines.push('只要拥有这根竿，每日可抛竿次数就会增加');

  return lines;
}

function createFishFromTemplate(template, rarity) {
  return {
    name: template.name,
    rarity,
    length: getRandomBodyValue(template.size.min, template.size.max, 1),
    weight: getRandomBodyValue(template.weight.min, template.weight.max, 2)
  };
}

function normalizeRarityKeyword(keyword = '') {
  const text = String(keyword || '').trim().toLowerCase();
  const aliases = {
    c: 'common',
    common: 'common',
    普通: 'common',
    u: 'uncommon',
    uncommon: 'uncommon',
    罕见: 'uncommon',
    r: 'rare',
    rare: 'rare',
    稀有: 'rare',
    e: 'epic',
    epic: 'epic',
    史诗: 'epic',
    l: 'legendary',
    legendary: 'legendary',
    传说: 'legendary',
    '?': EASTER_EGG_RARITY,
    '？': EASTER_EGG_RARITY,
    彩蛋: EASTER_EGG_RARITY
  };
  return aliases[text] || null;
}

function getCompensateFishUsage() {
  return '格式示例：#补鱼 @某人 rare 鳗鱼 80 3.5，也可写 #补鱼 @某人 鳗鱼 rare；长度和重量可省略。';
}

function applyFishBodyBuffs(fish, modifiers = {}) {
  if (!fish || typeof fish !== 'object') return fish;
  const fishPool = fishTypes[fish.rarity] || [];
  const template = fishPool.find(item => item.name === fish.name);
  if (!template) return fish;

  const sizeMultiplier = Math.max(0.5, Math.min(2, Number(modifiers.sizeMultiplier || 1)));
  const weightMultiplier = Math.max(0.5, Math.min(2.5, Number(modifiers.weightMultiplier || 1)));
  const minSizeRatio = Math.max(0, Math.min(0.95, Number(modifiers.minSizeRatio || 0)));
  const minWeightRatio = Math.max(0, Math.min(0.95, Number(modifiers.minWeightRatio || 0)));
  const minLength = template.size.min + (template.size.max - template.size.min) * minSizeRatio;
  const minWeight = template.weight.min + (template.weight.max - template.weight.min) * minWeightRatio;

  fish.length = clampFishBodyValue(Math.max(fish.length * sizeMultiplier, minLength), template.size.min, template.size.max, 1);
  fish.weight = clampFishBodyValue(Math.max(fish.weight * weightMultiplier, minWeight), template.weight.min, template.weight.max, 2);
  return fish;
}

function mergeFishBodyModifiers(...items) {
  return items.reduce((merged, item) => ({
    sizeMultiplier: merged.sizeMultiplier * Math.max(0.5, Math.min(2, Number(item?.sizeMultiplier || 1))),
    weightMultiplier: merged.weightMultiplier * Math.max(0.5, Math.min(2.5, Number(item?.weightMultiplier || 1))),
    minSizeRatio: Math.max(merged.minSizeRatio, Number(item?.minSizeRatio || 0)),
    minWeightRatio: Math.max(merged.minWeightRatio, Number(item?.minWeightRatio || 0))
  }), {
    sizeMultiplier: 1,
    weightMultiplier: 1,
    minSizeRatio: 0,
    minWeightRatio: 0
  });
}

function amplifyBaitModifiers(bait = {}, amplifier = 0) {
  const ratio = Math.max(0, Number(amplifier || 0));
  if (ratio <= 0) return bait;

  const scaledBias = Object.fromEntries(
    Object.entries(bait.rarityBias || {}).map(([rarity, value]) => [rarity, Number(value || 0) * (1 + ratio)])
  );

  const scaleDelta = (value, fallback = 1) => {
    const numeric = Number(value ?? fallback);
    return fallback + (numeric - fallback) * (1 + ratio);
  };

  const scaleDirect = (value, fallback = 0) => Number(value ?? fallback) * (1 + ratio);

  return {
    ...bait,
    catchRateBonus: Number(bait.catchRateBonus || 0) * (1 + ratio),
    rarityBias: scaledBias,
    sizeMultiplier: scaleDelta(bait.sizeMultiplier, 1),
    weightMultiplier: scaleDelta(bait.weightMultiplier, 1),
    minSizeRatio: scaleDirect(bait.minSizeRatio, 0),
    minWeightRatio: scaleDirect(bait.minWeightRatio, 0)
  };
}

export class fishing extends plugin {
  constructor() {
    super({
      name: '钓鱼',
      dsc: '独立钓鱼小游戏插件',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: '^#钓鱼$', fnc: 'startFishing' },
        { reg: '^#钓鱼极速版$', fnc: 'startFastFishing' },
        { reg: '^#钓鱼帮助$', fnc: 'showHelp' },
        { reg: '^#钓鱼管理$', fnc: 'showManagementHelp' },
        { reg: '^#今日鱼获$', fnc: 'checkTodayFishRecord' },
        { reg: '^#查看鱼获.*', fnc: 'checkOthersFishRecord' },
        { reg: '^#空军榜$', fnc: 'checkEmptyHandsList' },
        { reg: '^#钓鱼图鉴$', fnc: 'checkFishCollection' },
        { reg: '^#钓鱼排行$', fnc: 'checkFishingRank' },
        { reg: '^#鱼王榜$', fnc: 'checkFishKingRank' },
        { reg: '^#设置钓鱼次数(\\d+)$', fnc: 'setFishingLimit' },
        { reg: '^#重置钓鱼次数\\s*(全体|全部|@?.*)?$', fnc: 'resetFishingCount' },
        { reg: '^#钓鱼次数$', fnc: 'checkFishingLimit' },
        { reg: '^#查看鱼缸$', fnc: 'checkFishTank' },
        { reg: '^#彩蛋收藏$', fnc: 'checkEasterEggCollection' },
        { reg: '^#切换彩蛋\\s+.+$', fnc: 'scheduleActiveEasterEgg' },
        { reg: '^#升级鱼缸\\s+(legendary|epic)\\s+.+', fnc: 'upgradeFishTank' },
        { reg: '^#放生鱼\\s+\\d+(?:\\s+.*)?$', fnc: 'releaseFish' },
        { reg: '^#赠渔\\s*.*\\d+$', fnc: 'giftFish' },
        { reg: '^#炼竿预览.*$', fnc: 'previewLegendaryRod' },
        { reg: '^#炼竿.*$', fnc: 'craftLegendaryRod' },
        { reg: '^#打窝', fnc: 'addBait' },
        { reg: '^#同步鱼缸$', fnc: 'syncAllFishTanks' },
        { reg: '^#修复鱼数据$', fnc: 'repairFishData' },
        { reg: '^#(鱼市|售鱼)(.*)$', fnc: 'handleMarketCommand' },
        { reg: '^#鱼竿(?:详情|属性)\\s+.+$', fnc: 'showRodDetailsCommand' },
        { reg: '^#(鱼竿|换竿|换杆)(.*)$', fnc: 'handleRodCommand' },
        { reg: '^#(鱼饵|换饵)(.*)$', fnc: 'handleBaitCommand' },
        { reg: '^#限时鱼讯$', fnc: 'showDailySignal' },
        { reg: '^#钓鱼成就$', fnc: 'showAchievements' },
        { reg: '^#鱼币补偿\\s*.*$', fnc: 'compensateFishCoins' },
        { reg: '^#补鱼.*$', fnc: 'compensateFish' },
        { reg: '^#强制刷新钓鱼日$', fnc: 'forceRefreshFishingDay' },
        { reg: '^#钓鱼更新$', fnc: 'updateFishPlugin' },
        { reg: '^#封竿$', fnc: 'sealFishingGroup' },
        { reg: '^#解封竿$', fnc: 'unsealFishingGroup' }
      ]
    });

    this.fishTypes = fishTypes;
    this.trashItems = trashItems;
    this.randomEvents = randomEvents;
    this.lostItemEvents = lostItemEvents;
    this.config = loadConfig();
    ensureGeneratedDir();
    ensureResourceDirs();
    this.ensureWorldState();
    this.task = {
      name: 'fish-daily-reset',
      cron: '0 * * * * *',
      fnc: this.clearTodayData.bind(this),
      log: false
    };

    globalThis.__fishPluginLoadLogged ??= false;
    if (!globalThis.__fishPluginLoadLogged) {
      globalThis.logger?.mark?.('[Fish-plugin] 鱼竿已架好，鱼塘开门营业啦~');
      globalThis.__fishPluginLoadLogged = true;
    }

  }

  accept(e) {
    if (!this.isFishCommand(e?.msg)) return false;
    if (e?.isMaster && /^#解封竿$/.test(String(e?.msg || '').trim())) return false;
    if (!this.isGroupSealed(e?.group_id)) return false;
    return 'return';
  }

  ensureWorldState() {
    const world = loadWorldState();
    if (this.ensureDailyResetIfNeeded()) {
      return loadWorldState();
    }
    if (!world.lastDailyResetDate) {
      world.lastDailyResetDate = getTodayKey();
    }
    ensureDailySignal(world, this.fishTypes);
    saveWorldState(world);
    return world;
  }

  loadData() {
    this.ensureDailyResetIfNeeded();
    const data = loadFishData();
    if (normalizeAllUsers(data)) saveFishData(data);
    return data;
  }

  resetDailyState(targetDate = getTodayKey()) {
    const data = loadFishData();
    for (const userId in data) {
      const userData = data[userId];
      normalizeUserData(userData);
      let settlementCoins = 0;
      for (const fish of userData.today?.fish || []) {
        if (!canSellFish(fish)) continue;
        const alreadyInTank = userData.fishTank.some(item => isSameFish(item, fish));
        if (alreadyInTank) continue;
        settlementCoins += getFishSellValue(fish);
      }
      if (settlementCoins > 0) userData.coins += settlementCoins;
      applyPendingEasterEggSwitch(userData);
      userData.today = { count: 0, catches: 0, fish: [] };
      userData.todayExtraUsed = 0;
      userData.todayTicketsBought = 0;
    }
    saveFishData(data);

    const baitData = loadBaitData();
    for (const userId in baitData) {
      baitData[userId].todayUsed = false;
      baitData[userId].remainingCasts = 0;
      baitData[userId].bonusRate = 0;
    }
    saveBaitData(baitData);

    const world = loadWorldState();
    world.lastDailyResetDate = targetDate;
    world.todaySignal = null;
    ensureDailySignal(world, this.fishTypes);
    saveWorldState(world);
  }

  ensureDailyResetIfNeeded() {
    const today = getTodayKey();
    const world = loadWorldState();
    const lastReset = String(world.lastDailyResetDate || '').trim();
    if (lastReset === today) return false;
    this.resetDailyState(today);
    return true;
  }

  getOrCreateUser(data, userId) {
    if (!data[userId]) data[userId] = createDefaultUserData();
    normalizeUserData(data[userId]);
    return data[userId];
  }

  hasManagePermission(e) {
    return Boolean(e.isMaster || e.member?.is_admin || e.member?.is_owner || e.sender?.role === 'admin' || e.sender?.role === 'owner');
  }

  async acquireFishingLock(userId, userDisplay) {
    if (activeFishingUsers.has(userId)) {
      if (!activeFishingBusyNotified.has(userId)) {
        activeFishingBusyNotified.add(userId);
        await this.reply(`${userDisplay}\n${FISHING_BUSY_MESSAGE}`);
      }
      return false;
    }
    activeFishingUsers.add(userId);
    activeFishingBusyNotified.delete(userId);
    return true;
  }

  releaseFishingLock(userId) {
    activeFishingUsers.delete(userId);
    activeFishingBusyNotified.delete(userId);
  }

  async getGitTrackedFiles(repoDir) {
    const ret = await Bot.exec(['git', '-C', repoDir, 'ls-files'], { quiet: true });
    if (ret.error) throw ret.error;
    return ret.stdout
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);
  }

  shouldPreserveSelfUpdatePath(file) {
    const normalized = file.split(path.sep).join('/');
    return SELF_UPDATE_PRESERVE_PATHS.some(reg => reg.test(normalized));
  }

  copyGitTrackedFiles(sourceDir, targetDir, files) {
    for (const file of files) {
      if (this.shouldPreserveSelfUpdatePath(file)) continue;
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  async reinstallFishPluginFromGithub() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fish-plugin-'));
    try {
      const cloneRet = await Bot.exec(['git', 'clone', '--depth=1', FISH_PLUGIN_REPO, tempDir]);
      if (cloneRet.error) return cloneRet;
      const trackedFiles = await this.getGitTrackedFiles(tempDir);
      fs.rmSync(path.join(__dirname, '.git'), { recursive: true, force: true });
      fs.cpSync(path.join(tempDir, '.git'), path.join(__dirname, '.git'), { recursive: true, force: true });
      this.copyGitTrackedFiles(tempDir, __dirname, trackedFiles);
      return { stdout: `已从 ${FISH_PLUGIN_REPO} 重新安装 Fish-plugin 仓库。`, stderr: '' };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  async updateFishPlugin(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能更新钓鱼插件。');
      return false;
    }

    await this.reply('开始更新Fish-Plugin，请稍后');
    const remoteRet = await Bot.exec(['git', '-C', __dirname, 'config', '--get', 'remote.origin.url'], { quiet: true });
    const remoteUrl = remoteRet.stdout.trim();
    if (remoteRet.error || !/Fish-Plugin(?:\.git)?$/i.test(remoteUrl.replace(/\/+$/, ''))) {
      await this.reply('正在合并，请稍后');
      const reinstallRet = await this.reinstallFishPluginFromGithub();
      const reinstallOutput = [reinstallRet.stdout, reinstallRet.stderr].filter(Boolean).join('\n').trim();
      if (reinstallRet.error) {
        await this.reply(`Fish-plugin 重新安装失败：\n${reinstallRet.error.message}${reinstallOutput ? `\n${reinstallOutput}` : ''}`);
        return false;
      }

      await this.reply('Fish-Plugin已经是最新版，现在开始重启以生效变动。');
      const restartRet = await Bot.restart();
      await this.reply(`重启错误：\n${Bot.String(restartRet)}`);
      return true;
    }

    await this.reply('正在合并，请稍后');
    const ret = await Bot.exec(['git', '-C', __dirname, 'pull']);
    const output = [ret.stdout, ret.stderr].filter(Boolean).join('\n').trim();
    if (ret.error) {
      await this.reply(`Fish-plugin 更新失败：\n${ret.error.message}${output ? `\n${output}` : ''}`);
      return false;
    }

    await this.reply('Fish-Plugin已经是最新版，现在开始重启以生效变动。');
    const restartRet = await Bot.restart();
    await this.reply(`重启错误：\n${Bot.String(restartRet)}`);
    return true;
  }

  isFishCommand(msg = '') {
    const text = String(msg || '');
    return this.rule.some(item => {
      const reg = item.reg instanceof RegExp ? item.reg : new RegExp(item.reg);
      return reg.test(text);
    });
  }

  getSealedGroups() {
    const groups = this.config?.sealedGroups;
    return Array.isArray(groups) ? groups.map(String) : [];
  }

  isGroupSealed(groupId) {
    if (!groupId) return false;
    return this.getSealedGroups().includes(String(groupId));
  }

  getResetTargetUserId(e) {
    if (e.at) return String(e.at);
    const match = e.msg.match(/\b(\d{5,})\b/);
    return match ? match[1] : null;
  }

  parseCompensationCommand(msg) {
    const text = String(msg || '').replace(/^#鱼币补偿\s*/, '').trim();
    const match = text.match(/(?:^|\s|\*)\+?(\d+)\s*$/);
    if (!match) return null;
    return Number(match[1]);
  }

  isAllPlayerCompensation(msg = '') {
    return /全体|全部|所有玩家|全服/.test(String(msg || ''));
  }

  parseCompensateFishCommand(e) {
    let text = String(e?.msg || '').replace(/^#补鱼\s*/, '').trim();
    const targetUserId = getTargetUserId(e);
    if (!targetUserId) return { error: `请指定补鱼对象，${getCompensateFishUsage()}` };
    text = text.replace(/\[CQ:at,qq=\d+\]/g, '').replace(/@\d{5,}\b/g, '').trim();
    if (e?.at) {
      text = text
        .replace(new RegExp(`\\b${e.at}\\b`), '')
        .trim();
    } else {
      text = text.replace(/\b\d{5,}\b/, '').trim();
    }
    text = text.replace(/[，,;；|/]+/g, ' ').replace(/[：:＝=×xX*]+/g, ' ').replace(/\s+/g, ' ').trim();

    const tokens = text.split(/\s+/).filter(Boolean);
    const rarityTokenIndex = tokens.findIndex(token => normalizeRarityKeyword(token));
    const rarity = rarityTokenIndex >= 0 ? normalizeRarityKeyword(tokens[rarityTokenIndex]) : null;
    if (!rarity) return { error: `请指定稀有度：common / uncommon / rare / epic / legendary / ？。${getCompensateFishUsage()}` };
    tokens.splice(rarityTokenIndex, 1);
    text = tokens.join(' ').trim();

    const numbers = [...text.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s*$|\s)/g)].map(match => Number(match[1]));
    const sizeProvided = numbers.length >= 2;
    const length = sizeProvided ? numbers[numbers.length - 2] : null;
    const weight = sizeProvided ? numbers[numbers.length - 1] : null;
    if (numbers.length === 1 || numbers.length > 2) {
      return { error: `长度和重量需要同时填写。${getCompensateFishUsage()}` };
    }
    if (sizeProvided && (!Number.isFinite(length) || !Number.isFinite(weight) || length < 0 || weight < 0)) {
      return { error: '长度和重量需要是非负数字。' };
    }

    const fishName = (sizeProvided
      ? text.replace(/(?:^|\s)\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?)\s*$/, '')
      : text
    ).trim();
    if (!fishName) return { error: `请填写鱼名，${getCompensateFishUsage()}` };

    const template = (this.fishTypes[rarity] || []).find(item => item.name === fishName);
    if (!template) return { error: `鱼池里没有 ${rarity} 鱼：${fishName}` };

    const fish = sizeProvided
      ? { name: fishName, rarity, length: Number(length.toFixed(1)), weight: Number(weight.toFixed(2)) }
      : createFishFromTemplate(template, rarity);
    return { targetUserId, fish };
  }

  getRodByKeyword(keyword) {
    const text = String(keyword || '').trim();
    return Object.values(ROD_CATALOG).find(rod => rod.id === text || rod.name === text || rod.aliases?.includes(text)) || null;
  }

  getBaitByKeyword(userData, keyword) {
    const text = String(keyword || '').trim();
    return userData?.customBaits?.[text] ||
      Object.values(userData?.customBaits || {}).find(item => item.name === text || item.sourceText === text) ||
      Object.values(BAIT_CATALOG).find(item => item.id === text || item.name === text || item.aliases?.includes(text)) ||
      null;
  }

  resolveLegendaryCraftSelection(userData, target) {
    if (!target) return { error: '请输入鱼缸序号，或 legendary 鱼名。' };

    let originalIndex = null;
    let fish = null;
    if (target.mode === 'tank_index') {
      originalIndex = getOriginalIndexByDisplayIndex(userData, target.index);
      if (!Number.isInteger(originalIndex)) {
        return { error: '鱼缸序号不存在，请先用 #查看鱼缸 确认序号。' };
      }
      fish = userData.fishTank[originalIndex];
    } else {
      const matches = getSortedTankWithIndex(userData.fishTank)
        .filter(item => item.fish?.rarity === 'legendary' && item.fish?.name === target.fishName);
      if (!matches.length) {
        return { error: `鱼缸里没有名为 ${target.fishName} 的 legendary 鱼。` };
      }
      const picked = matches[target.duplicateIndex];
      if (!picked) {
        return { error: `${target.fishName} 只有 ${matches.length} 条，无法选择第 ${target.duplicateIndex + 1} 条。` };
      }
      originalIndex = picked.originalIndex;
      fish = picked.fish;
    }

    if (!fish || fish.rarity !== 'legendary') {
      return { error: '只有 legendary 鱼可以拿来炼制特殊鱼竿。' };
    }

    const recipe = Object.values(LEGENDARY_ROD_RECIPES).find(item => item.sourceLegendary === fish.name);
    if (!recipe) {
      return { error: `这条 ${fish.name} 还没有对应的特殊鱼竿配方。` };
    }

    return { originalIndex, fish, recipe };
  }

  getDailySignal() {
    const world = this.ensureWorldState();
    return ensureDailySignal(world, this.fishTypes);
  }

  applyRarityBias(baseWeights, bias = {}) {
    const adjusted = {};
    for (const [rarity, weight] of Object.entries(baseWeights)) {
      adjusted[rarity] = Math.max(0.0001, weight + (bias[rarity] || 0));
    }
    return adjusted;
  }

  getWeightedRandom(items, weightMap = rarityWeights) {
    const totalWeight = items.reduce((sum, item) => sum + (weightMap[item] || 0), 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
      random -= weightMap[item] || 0;
      if (random <= 0) return item;
    }
    return items[items.length - 1];
  }

  getFishKingScore(fish) {
    const band = FISH_KING_SCORE_BANDS[fish?.rarity];
    if (!band) return 0;

    const template = fishTemplateByName[fish.name];
    const normalizeValue = (value, range) => {
      const min = Number(range?.min);
      const max = Number(range?.max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0.5;
      return Math.max(0, Math.min(1, (Number(value || 0) - min) / (max - min)));
    };

    const lengthQuality = normalizeValue(fish.length, template?.size);
    const weightQuality = normalizeValue(fish.weight, template?.weight);
    const quality = lengthQuality * 0.35 + weightQuality * 0.65;
    const score = band.min + (band.max - band.min) * quality;
    return Math.max(band.min, Math.min(band.max, Number(score.toFixed(2))));
  }

  catchFish(userData = null, extraBias = {}, bodyModifiers = {}) {
    let rarities = Object.keys(this.fishTypes);
    const weights = this.applyRarityBias(rarityWeights, extraBias);
    const ownedEggs = new Set(getOwnedEasterEggCollection(userData));
    const availableMysteryFish = (this.fishTypes[EASTER_EGG_RARITY] || []).filter(fish => !ownedEggs.has(fish.name));
    if (availableMysteryFish.length === 0) {
      weights.legendary = (weights.legendary || 0) + (weights[EASTER_EGG_RARITY] || 0);
      rarities = rarities.filter(rarity => rarity !== EASTER_EGG_RARITY);
    }
    const rarity = this.getWeightedRandom(rarities, weights);
    if (rarity === EASTER_EGG_RARITY && availableMysteryFish.length > 0) {
      const template = availableMysteryFish[Math.floor(Math.random() * availableMysteryFish.length)];
      return applyFishBodyBuffs(createFishFromTemplate(template, rarity), bodyModifiers);
    }
    return applyFishBodyBuffs(generateFish(rarity), bodyModifiers);
  }

  consumeManualBait(userId, baitData, options = {}) {
    if (!baitData[userId] || baitData[userId].remainingCasts <= 0) {
      return { bonus: 0, message: '', rarityBias: {} };
    }
    baitData[userId].remainingCasts -= 1;
    const remaining = baitData[userId].remainingCasts;
    saveBaitData(baitData);
    return {
      bonus: baitData[userId].bonusRate || 0,
      message: `\n[打窝效果] 剩余${remaining}竿`,
      rarityBias: {}
    };
  }

  // 当前鱼饵是“已装备且有库存”的持续装备，不再是买完立刻生效的临时效果。
  // 这样用户就可以通过 #换饵 在不同鱼饵之间切换，学习成本更低，也更容易做后续扩展。
  consumeShopBait(userData, lockedBait = null) {
    const rawBait = lockedBait || getEquippedBait(userData);
    const easterEggEffect = getEasterEggEffects(userData);
    const bait = amplifyBaitModifiers(rawBait, easterEggEffect.baitEffectAmplifier);
    if (!bait || bait.id === 'plain') {
      return { bonus: 0, message: '', rarityBias: {}, bodyModifiers: {} };
    }
    if (!userData.baitInventory?.[bait.id] || userData.baitInventory[bait.id] <= 0) {
      userData.equippedBait = 'plain';
      return { bonus: 0, message: '\n[鱼饵] 备用鱼饵用完，已自动换回清水团饵。', rarityBias: {}, bodyModifiers: {} };
    }
    const rod = getEquippedRod(userData);
    const preserveChance = Math.max(0, Math.min(0.9, Number(rod?.baitPreserveChance || 0) + easterEggEffect.baitPreserveChance));
    const preserved = Math.random() < preserveChance;
    const beforeCount = Number(userData.baitInventory[bait.id] || 0);
    if (!preserved) userData.baitInventory[bait.id] -= 1;
    const afterCount = Number(userData.baitInventory[bait.id] || 0);
    const message = preserved
      ? `\n[当前鱼饵] ${bait.name} 这次被稳稳留住了，剩余 ${beforeCount} 份。`
      : afterCount > 0
        ? `\n[当前鱼饵] 已消耗 1 份 ${bait.name}，剩余 ${afterCount} 份。`
        : `\n[当前鱼饵] 已消耗最后 1 份 ${bait.name}，下次将自动换回清水团饵。`;
    const rarityBias = bait.rarityBias || {};
    if (userData.baitInventory[bait.id] <= 0) userData.equippedBait = 'plain';
    return {
      bonus: bait.catchRateBonus || 0,
      message,
      rarityBias,
      bodyModifiers: bait
    };
  }

  async showHelp() {
    const signal = this.getDailySignal();
    await replyWithPanel(this, {
      key: 'help-panel',
      title: '钓鱼帮助',
      subtitle: `今日鱼讯：${signal.targets.map(fish => `${fish.name}(${fish.rarity})`).join('、')}`,
      sections: buildHelpGridSections(HELP_GROUPS),
      footer: ''
    }, HELP_TEXT);
  }

  async showManagementHelp() {
    await replyWithPanel(this, {
      key: 'management-help-panel',
      title: '钓鱼管理',
      subtitle: '主人和群管理维护指令',
      sections: buildHelpGridSections(MANAGEMENT_HELP_GROUPS),
      footer: '#封竿 会禁用当前群的 Fish-plugin 响应，#解封竿 用于恢复。'
    }, MANAGEMENT_HELP_TEXT);
  }

  async setFishingLimit(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能设置钓鱼次数限制。');
      return;
    }
    const limit = parseInt(e.msg.match(/\d+/)[0]);
    this.config.dailyLimit = limit;
    saveConfig(this.config);
    await this.reply(`已将基础每日钓鱼次数设置为：${limit}次`);
  }

  async checkFishingLimit(e) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, String(e.user_id));
    const rod = getEquippedRod(userData);
    const limit = getDailyLimitBreakdown(this.config, userData, rod);
    const normalUsed = getTodayNormalCastUsed(userData);
    const ticketUsed = Math.min(Number(userData.todayExtraUsed || 0), Number(userData.today?.count || 0));
    const easterEggSourceText = limit.easterEggBonus > 0 ? ' + 彩蛋效果（已计入）' : '';
    await this.reply(
      `你的每日基础钓鱼次数：${limit.total}次\n` +
      `今日已用：基础${normalUsed}/${limit.total}，钓鱼券${ticketUsed}张，剩余钓鱼券${Number(userData.tickets || 0)}张\n` +
      `来源：全局基础${limit.base} + 鱼缸${limit.tankBonus} + 成就${limit.achievementBonus} + 鱼竿${limit.rodBonus}${easterEggSourceText}\n` +
      `说明：鱼缸每升1级，玩家本人永久额外+${TANK_UPGRADE_EXTRA_CASTS}竿；钓鱼券只记录为额外竿，不会占用鱼缸升级后新增的基础次数。`
    );
  }

  async resetFishingCount(e) {
    if (!this.hasManagePermission(e)) {
      await this.reply('只有主人或管理员才能重置钓鱼次数。');
      return;
    }

    const data = this.loadData();
    if (/全体|全部/.test(e.msg)) {
      let resetCount = 0;
      for (const userId in data) {
        normalizeUserData(data[userId]);
        if (data[userId].today.count !== 0) resetCount++;
        data[userId].today.count = 0;
        data[userId].todayExtraUsed = 0;
      }
      saveFishData(data);
      await this.reply(`已重置 ${resetCount} 名用户今天的钓鱼次数。\n说明：只重置今日已用次数，不清空今日鱼获。`);
      return;
    }

    const targetUserId = this.getResetTargetUserId(e);
    if (!targetUserId) {
      await this.reply('请指定要重置的人。\n例如：#重置钓鱼次数 @某人\n或：#重置钓鱼次数 123456789\n或：#重置钓鱼次数 全体');
      return;
    }

    const userData = this.getOrCreateUser(data, targetUserId);
    const targetDisplay = getDisplayNameForUser(e, targetUserId);
    const oldCount = userData.today.count;
    userData.today.count = 0;
    userData.todayExtraUsed = 0;
    saveFishData(data);
    await this.reply(`已重置 ${targetDisplay} 今天的钓鱼次数：${oldCount} -> 0\n说明：只重置今日已用次数，不清空今日鱼获。`);
  }

  async addBait(e) {
    const userId = String(e.user_id);
    const baitData = loadBaitData();
    if (!baitData[userId]) {
      baitData[userId] = { todayUsed: false, remainingCasts: 0, bonusRate: 0 };
    }
    if (baitData[userId].todayUsed) {
      await this.reply('你今天已经打过窝了，明天再来吧。');
      return;
    }

    let baitContent = '';
    let bonusRate = 0;
    if (e.at) {
      baitContent = `群友(${e.at})`;
      bonusRate = (Math.random() * 30 - 15) / 100;
    } else {
      const match = e.msg.match(/#打窝\s+(.+)/);
      if (!match || !match[1]) {
        await this.reply('请输入打窝内容或@一个群友。\n例如：#打窝 玉米粒\n或：#打窝 @某人');
        return;
      }
      baitContent = match[1].trim();
      bonusRate = (Math.random() * 14 - 7) / 100;
    }

    baitData[userId] = {
      todayUsed: true,
      remainingCasts: 2,
      bonusRate,
      baitContent
    };
    saveBaitData(baitData);

    const ratePercent = (bonusRate * 100).toFixed(1);
    const effectMsg = bonusRate > 0
      ? `看起来效果不错，上鱼率增加${ratePercent}%`
      : bonusRate < 0
        ? `这窝子味道有点怪，上鱼率降低${Math.abs(ratePercent)}%`
        : '效果一般，上鱼率没有变化';
    await this.reply(`你把${baitContent}扔下去打了窝。\n${effectMsg}\n效果将持续2竿钓鱼。`);
  }

  async handleSpecialFishEvent(fish) {
    const rarity = fish.rarity;
    if (rarity !== 'epic' && rarity !== 'legendary' && rarity !== EASTER_EGG_RARITY) return;

    await this.reply(epicMessages[Math.floor(Math.random() * epicMessages.length)]);
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 3000) + 1200));

    if (rarity === 'legendary' || rarity === EASTER_EGG_RARITY) {
      const legendaryMessage = rarity === EASTER_EGG_RARITY
        ? defaultLegendaryMessage
        : (legendaryMessages[fish.name] || defaultLegendaryMessage);
      await this.reply(legendaryMessage);
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1500));
    }
    if (rarity === EASTER_EGG_RARITY) {
      await this.reply(mysteryMessages[fish.name] || defaultMysteryMessage);
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1500) + 1000));
    }
  }

  async getRandomFailResult(userId, groupId, e, rod = null, options = {}) {
    const lostItems = options.lostItemsData || loadLostItems();
    const persistLostItems = () => {
      if (options.autoSaveLostItems !== false) saveLostItems(lostItems);
    };

    if (Math.random() < EMPTY_HOOK_FAIL_RATE) {
      return {
        type: 'empty_hook',
        message: emptyHookMessages[Math.floor(Math.random() * emptyHookMessages.length)]
      };
    }

    if (Math.random() < 0.2 && lostItems[groupId] && lostItems[groupId].length > 0) {
      const randomIndex = Math.floor(Math.random() * lostItems[groupId].length);
      const foundItem = lostItems[groupId][randomIndex];
      lostItems[groupId].splice(randomIndex, 1);
      if (lostItems[groupId].length === 0) delete lostItems[groupId];
      persistLostItems();
      return {
        type: 'lost_item',
        message: `你捞到了一个 ${foundItem.itemName}。\n这好像是 ${foundItem.ownerName}(${foundItem.ownerId}) 之前掉进水里的。`
      };
    }

    if (Math.random() < 0.4) {
      return {
        type: 'trash',
        message: `很遗憾，你钓到了一件 ${this.trashItems[Math.floor(Math.random() * this.trashItems.length)]}。`
      };
    }

    if (Math.random() < 0.1) {
      const lostEvent = this.lostItemEvents[Math.floor(Math.random() * this.lostItemEvents.length)];
      if (!lostItems[groupId]) lostItems[groupId] = [];
      lostItems[groupId].push({
        ownerId: userId,
        ownerName: e.sender?.card || e.sender?.nickname || userId,
        itemName: lostEvent.itemName,
        timestamp: Date.now()
      });
      persistLostItems();
      return {
        type: 'lost_event',
        message: lostEvent.message
      };
    }

    return {
      type: 'random_event',
      message: this.randomEvents[Math.floor(Math.random() * this.randomEvents.length)]
    };
  }

  saveCaughtFish(userId, fish) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, userId);
    const result = this.addCaughtFishToUser(userData, fish);
    saveFishData(data);
    return result;
  }

  addCaughtFishToUser(userData, fish) {
    const fishWithTimestamp = { ...fish, timestamp: Date.now() };
    ensureFishId(fishWithTimestamp);
    userData.today.fish.push(fishWithTimestamp);
    userData.today.catches = Number(userData.today.catches || 0) + 1;
    addFishHistory(userData, fishWithTimestamp);
    let tankResult = addFishToTank(userData, fishWithTimestamp, { autoSellReplacedFish: true });
    let tankUpdateMsg = tankResult.message;

    if (fishWithTimestamp.rarity === EASTER_EGG_RARITY) {
      userData.everCaughtEasterEgg = true;
      const unlockResult = unlockEasterEgg(userData, fishWithTimestamp.name);
      tankResult = { ...tankResult, unlockResult };
      if (unlockResult.added) {
        tankUpdateMsg += unlockResult.activeAssigned
          ? `\n这是你收集到的第一条彩蛋鱼，当前生效：${describeEasterEggEffects(userData)}。`
          : `\n已收录到彩蛋收藏。当前生效：${describeEasterEggEffects(userData)}。如需切换，请使用 #切换彩蛋 ${fishWithTimestamp.name}`;
      }
    }
    userData.hasEasterEgg = getOwnedEasterEggCollection(userData).length > 0;

    return { fishWithTimestamp, tankUpdateMsg, tankResult };
  }

  createFastFishingSummary(rod) {
    return {
      rodName: rod.name,
      casts: 0,
      catches: 0,
      misses: 0,
      rescued: 0,
      ticketCasts: 0,
      coinGain: 0,
      signalHits: 0,
      tankAdded: 0,
      tankReplaced: 0,
      autoSellCoins: 0,
      manualBaitCasts: 0,
      baitUses: {},
      rarityCounts: {},
      failTypes: {},
      fishByName: new Map(),
      notableFish: [],
      achievements: new Set()
    };
  }

  recordFastAchievementUnlocks(summary, unlocked) {
    for (const item of unlocked || []) {
      if (item.newlyUnlocked) summary.achievements.add(`解锁 ${item.name}`);
      if (item.rewardDelivered) summary.achievements.add(`奖励 ${item.rewardText}`);
    }
  }

  recordFastFish(summary, fish) {
    summary.rarityCounts[fish.rarity] = (summary.rarityCounts[fish.rarity] || 0) + 1;
    const key = `${fish.rarity}:${fish.name}`;
    const current = summary.fishByName.get(key) || {
      name: fish.name,
      rarity: fish.rarity,
      count: 0,
      bestFish: fish,
      bestScore: this.getFishKingScore(fish)
    };
    current.count += 1;
    const score = this.getFishKingScore(fish);
    if (score > current.bestScore) {
      current.bestFish = fish;
      current.bestScore = score;
    }
    summary.fishByName.set(key, current);

    if (fish.rarity === 'epic' || fish.rarity === 'legendary' || fish.rarity === EASTER_EGG_RARITY) {
      summary.notableFish.push(fish);
    }
  }

  buildCollectionPanel(userData) {
    const visibleRarities = getVisibleCollectionRarities();
    const visibleRaritySet = new Set(visibleRarities);
    const collectedNames = new Set((userData.allTimeFish || [])
      .filter(fish => visibleRaritySet.has(fish.rarity))
      .map(fish => fish.name));
    for (const name of getOwnedEasterEggCollection(userData)) {
      collectedNames.add(name);
    }
    const totalSpecies = visibleRarities.reduce((sum, rarity) => sum + (this.fishTypes[rarity] || []).length, 0);
    const collectedCount = collectedNames.size;
    const progress = totalSpecies === 0 ? 0 : ((collectedCount / totalSpecies) * 100).toFixed(1);
    const stats = getCollectionStats(userData, this.fishTypes, visibleRarities);
    const sections = [];

    for (const rarity of visibleRarities) {
      const theme = COLLECTION_RARITY_THEMES[rarity] || COLLECTION_RARITY_THEMES.common;
      const species = this.fishTypes[rarity] || [];
      const chips = species.map(fish => {
        const owned = collectedNames.has(fish.name);
        const className = owned ? 'collection-chip owned' : 'collection-chip';
        const hiddenSpecial = !owned && (rarity === 'legendary' || rarity === EASTER_EGG_RARITY);
        const chipText = hiddenSpecial
          ? (rarity === 'legendary' ? '未现身的传说' : '未揭晓的彩蛋')
          : fish.name;
        const style = owned
          ? `--chip-bg:${theme.chipBg};--chip-border:${theme.chipBorder};--chip-color:${theme.ownedTextColor || theme.textColor};--chip-shadow:${theme.accentSoft};`
          : '';
        return `<span class="${className}" style="${style}">${escapePanelHtml(chipText)}</span>`;
      }).join('');

      sections.push({
        type: 'collection',
        title: `${rarityLabel(rarity)} ${stats[rarity].owned}/${stats[rarity].total}`,
        titleStyle: `--collection-accent:${theme.accent};--collection-accent-soft:${theme.accentSoft};--collection-text:${theme.textColor};`,
        html: `<div class="collection-group">${chips}</div>`
      });
    }

    const missingPreview = [];
    for (const rarity of [...visibleRarities].reverse()) {
      for (const fish of this.fishTypes[rarity] || []) {
        if (!collectedNames.has(fish.name)) {
          missingPreview.push(`${fish.name}(${rarityLabel(rarity)})`);
        }
      }
    }

    const footer = missingPreview.length > 0
      ? `还缺 ${missingPreview.length} 种 | 优先补位：${missingPreview.slice(0, 6).join('、')}`
      : '你已经集齐当前所有可展示鱼种。';

    const fallbackLines = [
      '钓鱼图鉴',
      `已收集：${collectedCount}/${totalSpecies} 种（${progress}%）`
    ];
    for (const rarity of visibleRarities) {
      fallbackLines.push(`${rarityLabel(rarity)}：${stats[rarity].owned}/${stats[rarity].total}`);
      const owned = [];
      const missing = [];
      for (const fish of this.fishTypes[rarity] || []) {
        (collectedNames.has(fish.name) ? owned : missing).push(fish.name);
      }
      fallbackLines.push(`已收集：${owned.join('、') || '暂无'}`);
      if (rarity === 'legendary' || rarity === EASTER_EGG_RARITY) {
        fallbackLines.push(`未收集：${missing.length > 0 ? `还有 ${missing.length} 条未揭晓` : '已集齐'}`);
      } else {
        fallbackLines.push(`未收集：${missing.join('、') || '已集齐'}`);
      }
      fallbackLines.push('');
    }

    return {
      panel: {
        key: `collection-${Date.now()}`,
        title: '钓鱼图鉴',
        subtitle: `已收集 ${collectedCount}/${totalSpecies} 种 | 完成度 ${progress}%`,
        sections,
        footer
      },
      fallback: fallbackLines.join('\n').trim()
    };
  }

  buildFastFishingResultPanel(userDisplay, summary, userData, rod) {
    const rarityLines = RARITY_ORDER
      .filter(rarity => summary.rarityCounts[rarity] > 0)
      .map(rarity => `${rarityLabel(rarity)}：${summary.rarityCounts[rarity]}条`);

    const fishLines = [...summary.fishByName.values()]
      .sort((a, b) => {
        const countDiff = b.count - a.count;
        if (countDiff !== 0) return countDiff;
        return (RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)) || a.name.localeCompare(b.name, 'zh-Hans-CN');
      })
      .slice(0, 10)
      .map(item => {
        const valueText = canSellFish(item.bestFish) ? `，参考售价${getFishSellValue(item.bestFish)}鱼币` : '';
        return `${rarityLabel(item.rarity)} ${item.name} x${item.count}，最大${item.bestFish.length}cm/${item.bestFish.weight}kg${valueText}`;
      });

    const notableLines = summary.notableFish
      .slice(0, 8)
      .map(fish => `${rarityLabel(fish.rarity)} ${fish.name} ${fish.length}cm/${fish.weight}kg`);

    const failLines = Object.entries(summary.failTypes)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${FAIL_RESULT_LABELS[type] || type}：${count}次`);

    const baitLines = Object.entries(summary.baitUses)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name}：生效${count}竿`);
    if (summary.manualBaitCasts > 0) baitLines.push(`打窝效果：生效${summary.manualBaitCasts}竿`);

    const extraLines = [
      summary.ticketCasts > 0 ? `本次消耗钓鱼券：${summary.ticketCasts}张` : null,
      summary.rescued > 0 ? `失败保护补救：${summary.rescued}次` : null,
      summary.signalHits > 0 ? `命中限时鱼讯：${summary.signalHits}条` : null,
      summary.tankAdded > 0 || summary.tankReplaced > 0 ? `鱼缸更新：新增${summary.tankAdded}条，替换${summary.tankReplaced}条` : null,
      summary.autoSellCoins > 0 ? `鱼缸替换自动售出：+${summary.autoSellCoins}鱼币` : null
    ].filter(Boolean);

    const sections = [
      userDisplay,
      `鱼竿：${rod.name}`,
      `总抛竿：${summary.casts}竿，上鱼${summary.catches}条，空军${summary.misses}竿`,
      `今日次数：${getFishingLimitText(this.config, userData, getEquippedRod(userData))}`,
      `鱼币变化：${summary.coinGain >= 0 ? '+' : ''}${summary.coinGain}，当前${userData.coins}`,
      ...extraLines,
      '',
      '稀有度统计',
      ...(rarityLines.length ? rarityLines : ['本次没有上鱼']),
      '',
      '主要鱼获',
      ...(fishLines.length ? fishLines : ['本次没有鱼获']),
      ...(notableLines.length ? ['', '高稀有鱼获', ...notableLines] : []),
      ...(failLines.length ? ['', '空军统计', ...failLines] : []),
      ...(baitLines.length ? ['', '鱼饵消耗', ...baitLines] : []),
      ...(summary.achievements.size ? ['', '成就变化', ...[...summary.achievements].slice(0, 8)] : [])
    ];

    const fallback = [
      '钓鱼极速版结果',
      ...sections
    ].join('\n');

    return {
      panel: {
        key: `fast-fishing-${Date.now()}`,
        title: '钓鱼极速版结果',
        subtitle: `一次结算 ${summary.casts} 竿 | 上鱼 ${summary.catches} 条`,
        sections,
        footer: `当前鱼币：${userData.coins} | 当前鱼缸：${userData.fishTank.length}/${userData.tankCapacity}`
      },
      fallback
    };
  }

  async startFastFishing(e) {
    const { userId, text: userDisplay } = getUserDisplay(e);
    if (!await this.acquireFishingLock(userId, userDisplay)) return;

    try {
      const data = this.loadData();
      const baitData = loadBaitData();
      const lostItems = loadLostItems();
      const userData = this.getOrCreateUser(data, userId);
      let rod = getEquippedRod(userData);

      if (!canFishToday(this.config, userData, rod)) {
        await this.reply(`${userDisplay}\n${getFishingLimitExhaustedText(this.config, userData, rod)}`);
        return;
      }

      const summary = this.createFastFishingSummary(rod);
      const signal = this.getDailySignal();

      while (canFishToday(this.config, userData, rod)) {
        const coinsBeforeCast = Number(userData.coins || 0);
        userData.total += 1;
        const usage = registerCastUsage(this.config, userData, rod);
        if (!usage.registered) break;

        summary.casts += 1;
        if (usage.usedTicket) summary.ticketCasts += 1;

        const currentCount = userData.today.count;
        const bait = getEquippedBait(userData);
        const shopBait = this.consumeShopBait(userData, bait);
        const shopBaitActive = bait.id !== 'plain' && (shopBait.bonus !== 0 || Object.keys(shopBait.rarityBias || {}).length > 0 || Object.keys(shopBait.bodyModifiers || {}).length > 0);
        if (shopBaitActive) summary.baitUses[bait.name] = (summary.baitUses[bait.name] || 0) + 1;

        const manualBait = this.consumeManualBait(userId, baitData, { persist: false });
        if (manualBait.message) summary.manualBaitCasts += 1;

        const easterEggEffect = getEasterEggEffects(userData);
        let hiddenPityBonus = 0;
        if (currentCount === 10 && Number(userData.today.catches || 0) === 0) {
          hiddenPityBonus = HIDDEN_PITY_CATCH_BONUS;
        }

        const mergedBias = mergeRarityBias(rod.rarityBias, shopBait.rarityBias, easterEggEffect.rarityBias);
        const bodyModifiers = mergeFishBodyModifiers(rod, shopBait.bodyModifiers);
        const catchRate = Math.max(0.05, getCatchRate(userData, manualBait.bonus + shopBait.bonus + hiddenPityBonus, rod.catchRateBonus || 0) - FAST_FISHING_CATCH_RATE_PENALTY);
        const failRescueChance = Math.max(0, Math.min(0.45, Number(rod.failProtection || 0) + easterEggEffect.failProtection));
        const missedCatch = Math.random() >= catchRate;
        const failResult = missedCatch ? await this.getRandomFailResult(userId, e.group_id, e, null, { lostItemsData: lostItems, autoSaveLostItems: false }) : null;
        const rescuedCatch = failResult?.type === 'empty_hook' && Math.random() < failRescueChance;

        if (rescuedCatch) summary.rescued += 1;

        if (missedCatch && !rescuedCatch) {
          summary.misses += 1;
          summary.failTypes[failResult.type] = (summary.failTypes[failResult.type] || 0) + 1;
          recordEmptyCast(userData);
          const unlocked = scanAchievements(userData, this.fishTypes);
          this.recordFastAchievementUnlocks(summary, unlocked);
          userData.achievementCatchRateBonus = getAchievementCatchRateBonus(userData);
          userData.achievementDailyCastBonus = getAchievementDailyCastBonus(userData);
          summary.coinGain += Number(userData.coins || 0) - coinsBeforeCast;
          rod = getEquippedRod(userData);
          continue;
        }

        summary.catches += 1;
        const fish = this.catchFish(userData, mergedBias, bodyModifiers);
        const { fishWithTimestamp, tankResult } = this.addCaughtFishToUser(userData, fish);
        this.recordFastFish(summary, fishWithTimestamp);
        resetEmptyCastStreak(userData);
        userData.stats.lastCatchRarity = fishWithTimestamp.rarity;
        if (tankResult?.added) summary.tankAdded += 1;
        if (tankResult?.replaced) summary.tankReplaced += 1;
        if (tankResult?.soldCoins > 0) summary.autoSellCoins += tankResult.soldCoins;

        if (signal.targets.some(item => item.name === fishWithTimestamp.name)) {
          const equippedRod = getEquippedRod(userData);
          const signalCoins = signal.bonusCoins + getSignalRodBonusCoins(equippedRod, fishWithTimestamp);
          userData.coins += signalCoins;
          userData.stats.signalFishCaught += 1;
          summary.signalHits += 1;
        }
        const rodCoinBonus = Number(getEquippedRod(userData)?.catchCoinBonus || 0);
        if (rodCoinBonus > 0) userData.coins += rodCoinBonus;
        if (easterEggEffect.catchCoinBonus > 0) userData.coins += easterEggEffect.catchCoinBonus;
        if (easterEggEffect.catchCoinBonusRate > 0) {
          userData.coins += Math.floor(getFishSellValue(fishWithTimestamp) * easterEggEffect.catchCoinBonusRate);
        }

        const unlocked = scanAchievements(userData, this.fishTypes);
        this.recordFastAchievementUnlocks(summary, unlocked);
        userData.achievementCatchRateBonus = getAchievementCatchRateBonus(userData);
        userData.achievementDailyCastBonus = getAchievementDailyCastBonus(userData);
        summary.coinGain += Number(userData.coins || 0) - coinsBeforeCast;
        rod = getEquippedRod(userData);
      }

      const result = this.buildFastFishingResultPanel(userDisplay, summary, userData, rod);
      const replyResult = await replyWithPanel(this, result.panel, result.fallback);
      if (!replyResult?.ok) {
        await this.reply(`${userDisplay}\n极速钓鱼结果发送失败，本次未扣除次数，也未结算鱼获。请稍后重试。`);
        return;
      }

      saveFishData(data);
      saveBaitData(baitData);
      saveLostItems(lostItems);
    } finally {
      this.releaseFishingLock(userId);
    }
  }

  async startFishing(e) {
    const { userId, text: userDisplay } = getUserDisplay(e);
    if (!await this.acquireFishingLock(userId, userDisplay)) return;

    try {
      const data = this.loadData();
      const userData = this.getOrCreateUser(data, userId);
      const rod = getEquippedRod(userData);

      if (!canFishToday(this.config, userData, rod)) {
        await this.reply(`${userDisplay}\n${getFishingLimitExhaustedText(this.config, userData, rod)}`);
        return;
      }

      userData.total += 1;
      registerCastUsage(this.config, userData, rod);
      const currentCount = userData.today.count;
      const bait = getEquippedBait(userData);
      const shopBait = this.consumeShopBait(userData, bait);
      saveFishData(data);

      const easterEggEffect = getEasterEggEffects(userData);
      await this.reply(`${userDisplay}\n已抛竿，当前鱼竿：${rod.name}\n当前鱼饵：${bait.name}\n请稍等片刻...`);

      const minDelay = 1000;
      const maxDelay = 15000;
      const waitMultiplier = Math.max(0.35, (rod.waitMultiplier || 1) * easterEggEffect.waitMultiplier);
      const scaledDelay = Math.max(minDelay, Math.floor((Math.random() * (maxDelay - minDelay) + minDelay) * waitMultiplier));
      await new Promise(resolve => setTimeout(resolve, scaledDelay));

      const settleData = this.loadData();
      const settleUser = this.getOrCreateUser(settleData, userId);
      const baitData = loadBaitData();
      const manualBait = this.consumeManualBait(userId, baitData);

      let hiddenPityBonus = 0;
      if (currentCount === 10 && Number(settleUser.today.catches || 0) === 0) {
        hiddenPityBonus = HIDDEN_PITY_CATCH_BONUS;
      }

      const mergedBias = mergeRarityBias(rod.rarityBias, shopBait.rarityBias, easterEggEffect.rarityBias);
      const bodyModifiers = mergeFishBodyModifiers(rod, shopBait.bodyModifiers);

      const catchRate = getCatchRate(settleUser, manualBait.bonus + shopBait.bonus + hiddenPityBonus, rod.catchRateBonus || 0);
      const easterEggMsg = easterEggEffect.descriptions.length ? `\n[彩蛋加成] ${easterEggEffect.descriptions.join('；')}` : '';
      const failRescueChance = Math.max(0, Math.min(0.45, Number(rod.failProtection || 0) + easterEggEffect.failProtection));
      const missedCatch = Math.random() >= catchRate;
      const failResult = missedCatch ? await this.getRandomFailResult(userId, e.group_id, e) : null;
      const rescuedCatch = failResult?.type === 'empty_hook' && Math.random() < failRescueChance;
      const rescuedCatchFakeFailMessage = rescuedCatch
        ? failProtectionFakeFailMessages[Math.floor(Math.random() * failProtectionFakeFailMessages.length)]
        : '';
      if (rescuedCatch) {
        await this.reply(`${userDisplay}\n${rescuedCatchFakeFailMessage}`);
      }
      if (missedCatch && !rescuedCatch) {
        recordEmptyCast(settleUser);
        const unlocked = scanAchievements(settleUser, this.fishTypes);
        settleUser.achievementCatchRateBonus = getAchievementCatchRateBonus(settleUser);
        settleUser.achievementDailyCastBonus = getAchievementDailyCastBonus(settleUser);
        saveFishData(settleData);
        await this.reply(`${userDisplay}\n${failResult.message}\n今日钓鱼次数：${getFishingLimitText(this.config, settleUser, getEquippedRod(settleUser))}${manualBait.message}${shopBait.message}${easterEggMsg}${this.formatAchievementUnlocks(unlocked)}`);
        return;
      }

      const signal = this.getDailySignal();
      const fish = this.catchFish(settleUser, mergedBias, bodyModifiers);
      const { fishWithTimestamp, tankUpdateMsg } = this.addCaughtFishToUser(settleUser, fish);
      resetEmptyCastStreak(settleUser);
      settleUser.stats.lastCatchRarity = fishWithTimestamp.rarity;

      const resultIntroMsg = rescuedCatch
        ? '但你猛的一提，看似空钩的一口被稳住了，鱼钩重新咬牢，成功上鱼。\n'
        : '';
      let signalMsg = '';
      if (signal.targets.some(item => item.name === fishWithTimestamp.name)) {
        const equippedRod = getEquippedRod(settleUser);
        const signalCoins = signal.bonusCoins + getSignalRodBonusCoins(equippedRod, fishWithTimestamp);
        settleUser.coins += signalCoins;
        settleUser.stats.signalFishCaught += 1;
        signalMsg += `\n[限时鱼讯] 命中今日目标鱼，额外获得 ${signalCoins} 鱼币。`;
      }
      const rodCoinBonus = Number(getEquippedRod(settleUser)?.catchCoinBonus || 0);
      if (rodCoinBonus > 0) {
        settleUser.coins += rodCoinBonus;
        signalMsg += `\n[鱼竿效果] 本次额外收获 ${rodCoinBonus} 鱼币。`;
      }
      if (easterEggEffect.catchCoinBonus > 0) {
        settleUser.coins += easterEggEffect.catchCoinBonus;
        signalMsg += '\n[彩蛋加成] 本次收获被悄悄抬高了一截。';
      }
      if (easterEggEffect.catchCoinBonusRate > 0) {
        settleUser.coins += Math.floor(getFishSellValue(fishWithTimestamp) * easterEggEffect.catchCoinBonusRate);
        signalMsg += '\n[彩蛋加成] 本次收获被悄悄抬高了一截。';
      }
      const unlocked = scanAchievements(settleUser, this.fishTypes);
      settleUser.achievementCatchRateBonus = getAchievementCatchRateBonus(settleUser);
      settleUser.achievementDailyCastBonus = getAchievementDailyCastBonus(settleUser);
      saveFishData(settleData);
      await this.handleSpecialFishEvent(fish);
      await this.reply(
        `${userDisplay}\n` +
        resultIntroMsg +
        `恭喜！你钓到了一条 ${fishWithTimestamp.rarity} 鱼：${fishWithTimestamp.name}\n` +
        `长度：${fishWithTimestamp.length}cm，重量：${fishWithTimestamp.weight}kg${tankUpdateMsg}\n` +
        `今日钓鱼次数：${getFishingLimitText(this.config, settleUser, getEquippedRod(settleUser))}${manualBait.message}${shopBait.message}${easterEggMsg}${signalMsg}${this.formatAchievementUnlocks(unlocked)}`
      );
    } finally {
      this.releaseFishingLock(userId);
    }
  }

  refreshAchievements(data, userId) {
    const userData = this.getOrCreateUser(data, userId);
    const unlocked = scanAchievements(userData, this.fishTypes);
    userData.achievementCatchRateBonus = getAchievementCatchRateBonus(userData);
    userData.achievementDailyCastBonus = getAchievementDailyCastBonus(userData);
    saveFishData(data);
    return unlocked;
  }

  formatAchievementUnlocks(unlocked) {
    if (!unlocked || unlocked.length === 0) return '';
    return `\n[钓鱼成就] ${unlocked.map(item => {
      const tags = [];
      if (item.newlyUnlocked) tags.push(`解锁 ${item.name}`);
      if (item.rewardDelivered) tags.push(`奖励 ${item.rewardText}`);
      return tags.join('，');
    }).join('；')}`;
  }

  getTankUpgradeProgressText(userData) {
    const currentLevel = Number(userData?.tankLevel || 0);
    const progress = userData?.tankUpgradeProgress;
    const { targetLevel, requiredPoints } = getTankUpgradeRequiredPoints(currentLevel);
    const activeTargetLevel = Number(progress?.targetLevel || targetLevel);
    const activeRequiredPoints = Number(progress?.requiredPoints || requiredPoints);
    const submittedPoints = Math.max(0, Math.min(activeRequiredPoints, Number(progress?.submittedPoints || 0)));
    return `${currentLevel} -> ${activeTargetLevel}级，${submittedPoints}/${activeRequiredPoints}点（legendary=3，epic=1）`;
  }

  async upgradeFishTank(e) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = data[userId];
    if (!userData) {
      await this.reply(`${userDisplay}\n你还没有鱼缸数据，先去钓鱼吧。`);
      return;
    }
    normalizeUserData(userData);
    if (!userData.fishTank || userData.fishTank.length === 0) {
      await this.reply(`${userDisplay}\n你的鱼缸是空的，不能提交升级材料。`);
      return;
    }

    const currentLevel = Number(userData.tankLevel || 0);
    const costType = e.msg.match(/#升级鱼缸\s+(legendary|epic)/)?.[1];
    if (!costType) {
      await this.reply(`${userDisplay}\n升级消耗类型不正确，请使用 legendary 或 epic。`);
      return;
    }
    const { targetLevel, requiredPoints } = getTankUpgradeRequiredPoints(currentLevel);
    if (!userData.tankUpgradeProgress || Number(userData.tankUpgradeProgress.targetLevel) !== targetLevel) {
      userData.tankUpgradeProgress = {
        targetLevel,
        requiredPoints,
        submittedPoints: 0
      };
    }

    const displayIndexes = parseTankIndexes(e.msg);
    const uniqueDisplayIndexes = [...new Set(displayIndexes)];
    if (uniqueDisplayIndexes.length === 0) {
      await this.reply(`${userDisplay}\n请带上鱼缸序号提交升级材料，例如：#升级鱼缸 epic 1 2 3`);
      return;
    }

    const sortedTank = getSortedTankWithIndex(userData.fishTank);
    const selected = uniqueDisplayIndexes.map(index => sortedTank[index]).filter(Boolean);
    if (selected.length !== uniqueDisplayIndexes.length) {
      await this.reply(`${userDisplay}\n鱼缸序号不存在，请先用 #查看鱼缸 确认序号。`);
      return;
    }
    const consumedFish = selected.map(item => item.fish);
    const invalidFish = consumedFish.find(fish => getFishUpgradePoints(fish) <= 0);
    if (invalidFish) {
      await this.reply(`${userDisplay}\n只能提交 epic 或 legendary 鱼作为升级材料。`);
      return;
    }

    const submittedPoints = consumedFish.reduce((sum, fish) => sum + getFishUpgradePoints(fish), 0);
    const progress = userData.tankUpgradeProgress;
    const remainingPoints = Math.max(0, Number(progress.requiredPoints || 0) - Number(progress.submittedPoints || 0));
    if (submittedPoints > remainingPoints) {
      await this.reply(`${userDisplay}\n当前只差 ${remainingPoints} 点升级，所选鱼会超额提交，请换一组材料。`);
      return;
    }

    removeOwnedFish(userData, consumedFish, { today: true, tank: true });
    progress.submittedPoints = Math.min(progress.requiredPoints, Number(progress.submittedPoints || 0) + submittedPoints);
    const fishSummary = consumedFish.map(fish => `${fish.name}(${fish.rarity})`).join('、');

    if (progress.submittedPoints >= progress.requiredPoints) {
      applyTankUpgrade(userData);
      const unlocked = scanAchievements(userData, this.fishTypes);
      userData.achievementCatchRateBonus = getAchievementCatchRateBonus(userData);
      userData.achievementDailyCastBonus = getAchievementDailyCastBonus(userData);
      saveFishData(data);

      await this.reply(
        `${userDisplay}\n已提交升级材料：${fishSummary}\n` +
        `升级进度已完成，鱼缸升级成功。\n` +
        `等级：${currentLevel} -> ${userData.tankLevel}\n` +
        `容量：${userData.fishTank.length}/${userData.tankCapacity}\n` +
        `每日钓鱼次数：${getDailyLimit(this.config, userData, getEquippedRod(userData))}次（本次升级+${TANK_UPGRADE_EXTRA_CASTS}竿）${this.formatAchievementUnlocks(unlocked)}`
      );
      return;
    }

    saveFishData(data);
    await this.reply(
      `${userDisplay}\n已提交升级材料：${fishSummary}\n` +
      `本次提交 ${submittedPoints} 点，当前升级进度：${this.getTankUpgradeProgressText(userData)}`
    );
  }

  async releaseFish(e) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = data[userId];
    if (!userData || !userData.fishTank || userData.fishTank.length === 0) {
      await this.reply(`${userDisplay}\n你的鱼缸是空的，没有可以放生的鱼。`);
      return;
    }
    normalizeUserData(userData);

    const [displayIndex] = parseTankIndexes(e.msg, 1);
    const originalIndex = getOriginalIndexByDisplayIndex(userData, displayIndex);
    if (!Number.isInteger(originalIndex)) {
      await this.reply(`${userDisplay}\n鱼缸序号不存在，请先用 #查看鱼缸 确认序号。`);
      return;
    }

    const releasedFish = userData.fishTank[originalIndex];
    userData.fishTank.splice(originalIndex, 1);
    removeOwnedFish(userData, releasedFish, { today: true, tank: false });
    saveFishData(data);
    await this.reply(`${userDisplay}\n已放生 ${releasedFish.name}（${releasedFish.rarity}）。`);
  }

  async giftFish(e) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const targetUserId = getTargetUserId(e);
    if (!targetUserId) {
      await this.reply(`${userDisplay}\n请@群友或输入QQ号，例如：#赠渔 @某人 1`);
      return;
    }
    if (targetUserId === userId) {
      await this.reply(`${userDisplay}\n不能把鱼赠送给自己。`);
      return;
    }

    const userData = data[userId];
    if (!userData || !userData.fishTank || userData.fishTank.length === 0) {
      await this.reply(`${userDisplay}\n你的鱼缸是空的，没有可以赠送的鱼。`);
      return;
    }
    normalizeUserData(userData);
    const targetData = this.getOrCreateUser(data, targetUserId);

    const [displayIndex] = parseTankIndexes(e.msg, 1);
    const originalIndex = getOriginalIndexByDisplayIndex(userData, displayIndex);
    if (!Number.isInteger(originalIndex)) {
      await this.reply(`${userDisplay}\n鱼缸序号不存在，请先用 #查看鱼缸 确认序号。`);
      return;
    }
    if (targetData.fishTank.length >= targetData.tankCapacity) {
      await this.reply(`${userDisplay}\n对方鱼缸已满，无法接收赠送。`);
      return;
    }

    const giftedFish = userData.fishTank[originalIndex];
    userData.fishTank.splice(originalIndex, 1);
    giftedFish.giftedFrom = userId;
    giftedFish.giftedAt = Date.now();
    removeOwnedFish(userData, giftedFish, { today: true, tank: false });
    targetData.fishTank.push(giftedFish);
    addFishHistory(targetData, giftedFish);
    saveFishData(data);
    const targetDisplay = getDisplayNameForUser(e, targetUserId);
    await this.reply(`${userDisplay}\n已将 ${giftedFish.name}（${giftedFish.rarity}）赠送给 ${targetDisplay}。`);
  }

  async syncAllFishTanks(e) {
    if (!e.isMaster) {
      await this.reply('只有机器人主人才能使用此命令。');
      return;
    }

    const data = this.loadData();
    let syncCount = 0;
    let addedCount = 0;
    let replacedCount = 0;
    for (const userId in data) {
      const userData = data[userId];
      normalizeUserData(userData);
      if (!userData.today?.fish?.length) continue;

      let changed = false;
      for (const fish of userData.today.fish) {
        ensureFishId(fish);
        if (fish?.rarity === EASTER_EGG_RARITY) continue;
        const exists = userData.fishTank.some(item => isSameFish(item, fish));
        if (exists) continue;

        const tankResult = addFishToTank(userData, fish);
        if (tankResult.changed) {
          changed = true;
          if (tankResult.replaced) replacedCount++;
          if (tankResult.added) addedCount++;
        }
      }
      if (changed) syncCount++;
    }
    saveFishData(data);

    await this.reply(`鱼缸同步完成\n涉及用户数：${syncCount} 人\n新增鱼数量：${addedCount} 条\n替换鱼数量：${replacedCount} 条`);
  }

  async repairFishData(e) {
    if (!e.isMaster) {
      await this.reply('只有机器人主人才能使用此命令。');
      return;
    }

    const data = this.loadData();
    const summary = repairAllUsersFishData(data);
    if (summary.changed) {
      saveFishData(data);
    }

    await this.reply(
      `鱼数据修复完成\n` +
      `扫描用户：${summary.usersScanned} 人\n` +
      `修复用户：${summary.usersChanged} 人\n` +
      `补充 fishId：${summary.fishIdsAssigned} 条\n` +
      `清理今日重复鱼：${summary.todayDuplicatesRemoved} 条\n` +
      `清理鱼缸重复鱼：${summary.tankDuplicatesRemoved} 条\n` +
      `清理历史重复记录：${summary.historyDuplicatesRemoved} 条`
    );
  }

  async checkTodayFishRecord(e) {
    const data = this.loadData();
    const userData = data[String(e.user_id)];
    const todayCatchCount = Number(userData?.today?.catches || 0);
    if (!userData || todayCatchCount === 0) {
      await this.reply(userData && userData.today.count > 0
        ? `今天你钓了 ${userData.today.count} 次，但一条鱼都没钓到，空军了。`
        : '今天你还没有钓过鱼。');
      return;
    }

    let replyMsg = `今日钓鱼次数：${getFishingLimitText(this.config, userData, getEquippedRod(userData))}\n今日钓到鱼：${todayCatchCount}条\n当前剩余鱼获：${userData.today.fish.length}条\n总共钓鱼次数：${userData.total}\n\n今日鱼获：\n`;
    for (const [index, fish] of userData.today.fish.entries()) {
      replyMsg += `${formatTodayFishRecordLine(fish, index)}\n`;
    }
    await this.reply(replyMsg.trim());
  }

  async checkOthersFishRecord(e) {
    let targetUserId = e.at ? String(e.at) : null;
    if (!targetUserId) {
      const match = e.msg.match(/#查看鱼获\s*(\d+)/);
      if (match && match[1]) targetUserId = match[1];
    }
    if (!targetUserId) {
      await this.reply('请@某人或输入QQ号来查看鱼获。\n例如：#查看鱼获 @某人\n或：#查看鱼获 123456789');
      return;
    }

    const data = this.loadData();
    const userFish = data[targetUserId];
    const targetDisplay = getDisplayNameForUser(e, targetUserId);
    const todayCatchCount = Number(userFish?.today?.catches || 0);
    if (!userFish || todayCatchCount === 0) {
      await this.reply(userFish && userFish.today.count > 0
        ? `${targetDisplay}今天钓了${userFish.today.count}次，但一条鱼都没钓到，空军了。`
        : `${targetDisplay}今天还没有钓过鱼。`);
      return;
    }

    let replyMsg = `${targetDisplay}的鱼获记录：\n\n今日钓鱼次数：${getFishingLimitText(this.config, userFish, getEquippedRod(userFish))}\n今日钓到鱼：${todayCatchCount}条\n当前剩余鱼获：${userFish.today.fish.length}条\n总共钓鱼次数：${userFish.total}\n\n今日鱼获：\n`;
    for (const [index, fish] of userFish.today.fish.entries()) {
      replyMsg += `${formatTodayFishRecordLine(fish, index)}\n`;
    }
    await this.reply(replyMsg.trim());
  }

  async checkFishCollection(e) {
    const data = this.loadData();
    const userId = String(e.user_id);
    const userData = data[userId];
    if (!userData) {
      await this.reply('你还没有任何钓鱼记录，先去甩一竿吧。');
      return;
    }
    normalizeUserData(userData);
    const result = this.buildCollectionPanel(userData);
    await replyWithPanel(this, result.panel, result.fallback);
  }

  async checkFishingRank(e) {
    const data = this.loadData();
    const rankList = Object.entries(data)
      .map(([userId, userData]) => {
        normalizeUserData(userData);
        return {
          userId,
          total: userData.total || 0,
          tankSize: userData.fishTank.length
        };
      })
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    if (rankList.length === 0) {
      await this.reply('还没有可显示的钓鱼排行。');
      return;
    }

    let replyMsg = '钓鱼排行（总钓鱼次数）\n\n';
    rankList.forEach((item, index) => {
      const displayName = getDisplayNameForUser(e, item.userId);
      replyMsg += `${index + 1}. ${displayName} - ${item.total}次，鱼缸${item.tankSize}条\n`;
    });
    await this.reply(replyMsg.trim());
  }

  async checkFishKingRank(e) {
    const data = this.loadData();

    const rankList = Object.entries(data)
      .map(([userId, userData]) => {
        normalizeUserData(userData);
        const sortedTank = getSortedTankWithIndex(userData.fishTank).map(item => item.fish).slice(0, 5);
        const weights = [1.0, 0.7, 0.5, 0.35, 0.25];
        const score = sortedTank.reduce((sum, fish, index) => sum + this.getFishKingScore(fish) * (weights[index] || 0.2), 0);
        return {
          userId,
          score: Number(score.toFixed(2)),
          topFish: sortedTank[0]
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (rankList.length === 0) {
      await this.reply('还没有可显示的鱼王榜。');
      return;
    }

    let replyMsg = '鱼王榜（按鱼缸综合质量）\n\n';
    rankList.forEach((item, index) => {
      const topFishMsg = item.topFish ? `，镇缸鱼：${item.topFish.name}(${item.topFish.rarity})` : '';
      const displayName = getDisplayNameForUser(e, item.userId);
      replyMsg += `${index + 1}. ${displayName} - ${item.score}分${topFishMsg}\n`;
    });
    await this.reply(replyMsg.trim());
  }

  async checkEasterEggCollection(e) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, String(e.user_id));
    normalizeUserData(userData);
    const status = getEasterEggStatusSummary(userData);
    const ownedText = status.owned.length ? status.owned.join('、') : '暂无';
    const pendingText = status.pendingName ? `${status.pendingName}（明日生效）` : '无';
    await this.reply(
      `彩蛋收藏\n` +
      `已收集：${status.owned.length} 条\n` +
      `当前生效：${status.activeDescription}\n` +
      `待切换：${pendingText}\n` +
      `收藏列表：${ownedText}\n` +
      `切换方式：#切换彩蛋 彩蛋名`
    );
  }

  async scheduleActiveEasterEgg(e) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    normalizeUserData(userData);

    const targetName = String(e.msg || '').replace(/^#切换彩蛋\s+/, '').trim();
    if (!targetName) {
      await this.reply(`${userDisplay}\n请填写要切换的彩蛋鱼名称，例如：#切换彩蛋 愿望锦鲤`);
      return;
    }

    const result = scheduleEasterEggSwitch(userData, targetName, getTodayKey());
    if (!result.ok) {
      if (result.reason === 'not_owned') {
        await this.reply(`${userDisplay}\n你还没有收集到 ${targetName}。可先用 #彩蛋收藏 查看已收集列表。`);
        return;
      }
      if (result.reason === 'already_active') {
        await this.reply(`${userDisplay}\n${targetName} 当前已经在生效。`);
        return;
      }
      if (result.reason === 'already_pending') {
        await this.reply(`${userDisplay}\n${targetName} 已经安排为明日生效。`);
        return;
      }
      if (result.reason === 'already_scheduled_today') {
        await this.reply(`${userDisplay}\n你今天已经安排过一次彩蛋切换了，请明天再改。`);
        return;
      }
      await this.reply(`${userDisplay}\n彩蛋切换安排失败。`);
      return;
    }

    saveFishData(data);
    const currentText = describeEasterEggEffects(userData);
    const nextText = getEasterEggStatusSummary(userData).pendingDescription;
    await this.reply(`${userDisplay}\n已安排明天切换为 ${targetName}。\n当前生效：${currentText}\n明日生效后将改为：${nextText}`);
  }

  async checkFishTank(e) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, String(e.user_id));
    normalizeUserData(userData);
    const sortedFish = getSortedTankWithIndex(userData.fishTank).map(item => item.fish);
    const rod = getEquippedRod(userData);
    const progressText = this.getTankUpgradeProgressText(userData);
    const easterEggStatus = getEasterEggStatusSummary(userData);
    const easterEggOwnedText = easterEggStatus.owned.length ? easterEggStatus.owned.join('、') : '暂无';
    const easterEggPendingText = easterEggStatus.pendingName ? `${easterEggStatus.pendingName}（明日生效）` : '无';

    const sections = [
      `鱼缸容量：${userData.fishTank.length}/${userData.tankCapacity}`,
      `鱼缸等级：${userData.tankLevel || 0}`,
      `升级进度：${progressText}`,
      `今日钓鱼次数：${getFishingLimitText(this.config, userData, rod)}`,
      `当前鱼竿：${rod.name}`,
      `当前鱼饵：${getEquippedBait(userData).name}`,
      `鱼币：${userData.coins}，钓鱼券：${userData.tickets}`,
      `鱼竿库存：${getOwnedRodsSummary(userData) || '无'}`,
      `鱼饵库存：${Object.entries(userData.baitInventory || {}).filter(([, count]) => count > 0).map(([id, count]) => `${userData.customBaits?.[id]?.name || BAIT_CATALOG[id]?.name || id}x${count}`).join('、') || '无'}`,
      `彩蛋收藏：${easterEggStatus.owned.length} 条`,
      `当前彩蛋：${easterEggStatus.activeDescription}`,
      `待切换：${easterEggPendingText}`
    ];
    sections.push(...sortedFish.slice(0, 16).map((fish, index) => formatFishLine(fish, index)));
    if (sortedFish.length > 16) {
      sections.push(`...还有 ${sortedFish.length - 16} 条未展示`);
    }

    const fallbackText = [
      '你的鱼缸',
      `当前收藏 ${sortedFish.length} 条鱼`,
      ...sortedFish.map((fish, index) => formatFishLine(fish, index)),
      `鱼缸容量：${userData.fishTank.length}/${userData.tankCapacity}`,
      `鱼缸等级：${userData.tankLevel || 0}`,
      `升级进度：${progressText}`,
      `今日钓鱼次数：${getFishingLimitText(this.config, userData, rod)}`,
      `鱼竿库存：${getOwnedRodsSummary(userData) || '无'}`,
      `彩蛋加成：${describeEasterEggEffects(userData)}`,
      `彩蛋收藏：${easterEggOwnedText}`,
      `待切换：${easterEggPendingText}`,
      `总共钓鱼次数：${userData.total || 0}`
    ].join('\n');

    await replyWithPanel(this, {
      key: `tank-${e.user_id}`,
      title: '鱼缸总览',
      subtitle: `当前鱼竿：${rod.name} | 当前鱼饵：${getEquippedBait(userData).name} | 鱼币 ${userData.coins}`,
      sections,
      footer: `总钓鱼次数：${userData.total || 0} | 彩蛋加成：${describeEasterEggEffects(userData)}`
    }, fallbackText);
  }

  async checkEmptyHandsList(e) {
    const data = this.loadData();
    const emptyHandsList = [];
    for (const userId in data) {
      const userData = data[userId];
      if (userData.today.count > 0 && Number(userData.today.catches || 0) === 0) {
        emptyHandsList.push({ userId, count: userData.today.count });
      }
    }
    if (emptyHandsList.length === 0) {
      await this.reply('今天还没有人空军。');
      return;
    }
    emptyHandsList.sort((a, b) => b.count - a.count);
    let replyMsg = '今日空军榜（钓了鱼但一条鱼都没钓到）：\n\n';
    for (let i = 0; i < emptyHandsList.length; i++) {
      const user = emptyHandsList[i];
      const displayName = getDisplayNameForUser(e, user.userId);
      replyMsg += `${i + 1}. ${displayName} - 钓了${user.count}次，全军覆没\n`;
    }
    await this.reply(replyMsg.trim());
  }

  async handleMarketCommand(e) {
    const tail = (e.msg.match(/^#(?:鱼市|售鱼)(.*)$/)?.[1] || '').trim();
    if (!tail) {
      await this.showMarket(e);
      return;
    }

    if (/^购买/.test(tail)) {
      await this.buyMarketItem(e, tail.replace(/^购买/, '').trim());
      return;
    }

    if (/^回收/.test(tail)) {
      await this.recycleMarketItem(e, tail.replace(/^回收/, '').trim());
      return;
    }

    await this.sellFish(e, tail);
  }

  async showMarket(e) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, String(e.user_id));
    const tank = getSortedTankWithIndex(userData.fishTank).map(item => item.fish);
    const commonPreview = tank.filter(fish => fish.rarity === 'common').slice(0, 3);
    const previewCoins = commonPreview.reduce((sum, fish) => sum + getFishSellValue(fish), 0);
    const baitList = getBuiltinBuyableBaitList();
    const rodList = getBuyableRodList();
    const utilityItems = Object.values(SHOP_ITEMS).filter(item => item.type === 'ticket' || item.type === 'custom_bait');

    const sections = [
      `鱼币：${userData.coins} | 钓鱼券：${userData.tickets}`,
      `当前鱼竿：${getEquippedRod(userData).name}`,
      `当前鱼饵：${getEquippedBait(userData).name}`,
      '',
      '出售示例：#售鱼 1 / #售鱼 common / #售鱼 common3 / #售鱼 鱼缸3 / #售鱼 鱼缸 2 3 4 5 / #售鱼 全部',
      '说明：#售鱼 1 对应 #今日鱼获 里显示的第 1 条。',
      '回收示例：#鱼市回收 鱼竿 / #鱼市回收 鱼竿1 / #鱼市回收 疾风短竿',
      '说明：#鱼市回收 鱼竿1 对应回收列表里的第 1 根，不一定等于 #鱼竿 面板里的鱼竿1。',
      `示例预估：卖出 ${commonPreview.length} 条 common 可得约 ${previewCoins} 鱼币`,
      '',
      '鱼饵区：',
      ...baitList.map((bait, index) => `鱼饵${index + 1} | ${bait.name} - ${getBaitPackText(bait)} - ${bait.description}`),
      '',
      '鱼竿区：',
      ...rodList.map((rod, index) => `鱼竿${index + 1} | ${rod.name} - ${rod.price}鱼币 - ${rod.description}`),
      '',
      '功能区：',
      ...utilityItems.map(item => `${item.name} - ${item.price}鱼币 - ${item.description}`)
    ];

    const fallback = [
      '鱼市',
      `鱼币：${userData.coins} | 钓鱼券：${userData.tickets}`,
      `当前鱼竿：${getEquippedRod(userData).name}`,
      `当前鱼饵：${getEquippedBait(userData).name}`,
      '',
      '鱼饵区：',
      ...baitList.map((bait, index) => `鱼饵${index + 1} | ${bait.name} - ${getBaitPackText(bait)} - ${bait.description}`),
      '',
      '鱼竿区：',
      ...rodList.map((rod, index) => `鱼竿${index + 1} | ${rod.name} - ${rod.price}鱼币 - ${rod.description}`),
      '',
      '功能区：',
      ...utilityItems.map(item => `${item.name} - ${item.price}鱼币 - ${item.description}`)
    ].join('\n');

    await replyWithPanel(this, {
      key: `market-${e.user_id}`,
      title: '鱼市',
      subtitle: '卖多余鱼换鱼币，再购入鱼饵、额外钓鱼券和鱼竿。',
      sections,
      footer: '购买格式：#鱼市购买 鱼饵1 / #鱼市购买 鱼饵1*5 / #鱼市购买 鱼竿1 / #鱼市购买 自定义鱼饵 桂花酒糟；回收格式：#鱼市回收 鱼竿1；炼竿预览：#炼竿预览 1'
    }, fallback);
  }

  // #售鱼 默认卖“今日渔获”，这样不会和鱼缸序号命令混在一起；
  // 如果用户明确写“鱼缸”，才去卖鱼缸里的鱼。
  pickFishForSale(userData, target) {
    if (target.source === 'tank') {
      const sortedTank = getSortedTankWithIndex(userData.fishTank)
        .map(item => ({ source: 'tank', originalIndex: item.originalIndex, fish: item.fish }));
      if (target.explicitTankIndexes?.length) {
        return target.explicitTankIndexes
          .map(index => sortedTank[index])
          .filter(item => item && canSellFish(item.fish));
      }
      const sellableTank = sortedTank
        .filter(item => canSellFish(item.fish))
        .reverse();
      if (target.rarity && ['common', 'uncommon', 'rare', 'epic'].includes(target.rarity)) {
        const matched = sellableTank.filter(item => item.fish.rarity === target.rarity);
        if (target.all || target.mode === 'rarity_all') return matched;
        if (target.mode === 'rarity_index') return matched[target.count - 1] ? [matched[target.count - 1]] : [];
        return matched;
      }
      if (target.all) return sellableTank;
      return sellableTank.slice(0, target.count);
    }

    const todayFish = (userData.today.fish || [])
      .map((fish, index) => ({ source: 'today', originalIndex: index, fish }))
      .filter(item => canSellFish(item.fish));
    if (target.rarity && ['common', 'uncommon', 'rare', 'epic'].includes(target.rarity)) {
      const matched = todayFish.filter(item => item.fish.rarity === target.rarity);
      if (target.all || target.mode === 'rarity_all') return matched;
      if (target.mode === 'rarity_index') return matched[target.count - 1] ? [matched[target.count - 1]] : [];
      return matched;
    }
    if (target.all) return todayFish;
    return todayFish.slice(0, target.count);
  }

  async sellFish(e, commandText) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    if (!userData.fishTank.length && !userData.today.fish.length) {
      await this.reply(`${userDisplay}\n你今天和鱼缸里都没有可售卖的鱼。`);
      return;
    }

    const target = parseSellTarget(commandText);
    if (target.rarity === 'legendary' || target.rarity === EASTER_EGG_RARITY) {
      await this.reply(`${userDisplay}\nlegendary 鱼和彩蛋鱼不能售卖。`);
      return;
    }

    const picked = this.pickFishForSale(userData, target);
    if (!picked.length) {
      await this.reply(`${userDisplay}\n没有符合条件的鱼可售卖。legendary 鱼和彩蛋鱼不会进入售卖列表。`);
      return;
    }
    if (target.source === 'tank' && target.explicitTankIndexes?.length && picked.length !== target.explicitTankIndexes.length) {
      await this.reply(`${userDisplay}\n选择的鱼缸序号里有不存在或不可售卖的鱼，请先用 #查看鱼缸 确认序号。`);
      return;
    }

    const selected = picked.map(item => item.fish);
    const preview = buildSellPreview(selected);
    const removedCount = removeOwnedFish(userData, selected, { today: true, tank: true });
    if (removedCount <= 0) {
      await this.reply(`${userDisplay}\n售鱼失败：没有从今日鱼获或鱼缸中移除对应鱼，请先使用 #修复鱼数据 后再试。`);
      return;
    }
    userData.coins += preview.totalCoins;
    userData.marketTrades += 1;

    const unlocked = this.refreshAchievements(data, userId);
    const achievementText = this.formatAchievementUnlocks(unlocked).replace(/^\n/, '');
    const sections = [
      `已售出：${selected.length} 条`,
      `获得鱼币：${preview.totalCoins}`,
      `当前鱼币：${userData.coins}`,
      `出售来源：${target.source === 'tank' ? '鱼缸' : '今日鱼获'}`,
      ...preview.lines.slice(0, 12),
      preview.lines.length > 12 ? `...另有 ${preview.lines.length - 12} 条未展开` : null,
      achievementText || null
    ].filter(Boolean);
    const fallback = [
      '售鱼结果',
      `已售出 ${selected.length} 条鱼，获得 ${preview.totalCoins} 鱼币。`,
      ...preview.lines.slice(0, 12),
      preview.lines.length > 12 ? `...另有 ${preview.lines.length - 12} 条未展开` : null,
      `当前鱼币：${userData.coins}`,
      achievementText || null
    ].filter(Boolean).join('\n');

    await replyWithPanel(this, {
      key: `sell-result-${e.user_id}`,
      title: '售鱼结果',
      subtitle: `${userDisplay} 本次卖鱼收入 ${preview.totalCoins} 鱼币`,
      sections,
      footer: '继续使用：#售鱼 1 / #售鱼 common / #售鱼 鱼缸3 / #售鱼 全部'
    }, fallback);
  }

  async recycleMarketItem(e, keyword) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const equippedRod = getEquippedRod(userData);
    const recyclableRods = getRecyclableRodList(userData);
    const normalizedKeyword = String(keyword || '').trim();

    if (!normalizedKeyword || /^(?:鱼竿|鱼杆|竿|杆)$/.test(normalizedKeyword.replace(/\s+/g, ''))) {
      if (!recyclableRods.length) {
        await this.reply(`${userDisplay}\n你目前没有可回收的鱼竿。`);
        return;
      }
      const lines = recyclableRods.map((rod, index) => {
        const extra = rod.sourceLegendary ? ` | 炼成来源:${rod.sourceLegendary}` : '';
        const equipMark = rod.id === equippedRod.id ? ' | 当前装备' : '';
        return `鱼竿${index + 1} | ${rod.name} - 回收价 ${getRodRecycleValue(rod)} 鱼币${extra}${equipMark}`;
      });
      await this.reply(
        `${userDisplay}\n可回收鱼竿列表\n` +
        `${lines.join('\n')}\n` +
        `使用：#鱼市回收 鱼竿1 或 #鱼市回收 ${recyclableRods[0].name}`
      );
      return;
    }

    const compact = normalizedKeyword.replace(/\s+/g, '');
    let rod = null;
    const rodNo = compact.match(/^鱼?[竿杆](\d{1,3})$/);
    if (rodNo) {
      rod = recyclableRods[Number(rodNo[1]) - 1] || null;
    } else {
      rod = recyclableRods.find(item => item.name === normalizedKeyword || item.id === normalizedKeyword || item.aliases?.includes(normalizedKeyword)) || null;
    }

    if (!rod) {
      await this.reply(`${userDisplay}\n没有找到可回收的鱼竿。可先用 #鱼市回收 鱼竿 查看列表。`);
      return;
    }
    if (rod.id === equippedRod.id) {
      await this.reply(`${userDisplay}\n当前装备中的鱼竿不能直接回收，请先换竿。`);
      return;
    }

    const recycleValue = getRodRecycleValue(rod);
    if (recycleValue <= 0) {
      await this.reply(`${userDisplay}\n${rod.name} 不能回收。`);
      return;
    }

    userData.rodsOwned = (userData.rodsOwned || []).filter(id => id !== rod.id);
    userData.coins += recycleValue;
    saveFishData(data);
    await this.reply(`${userDisplay}\n已回收鱼竿 ${rod.name}，获得 ${recycleValue} 鱼币。当前鱼币：${userData.coins}`);
  }

  async previewLegendaryRod(e) {
    const data = this.loadData();
    const { text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, String(e.user_id));
    if (!userData.fishTank?.length) {
      await this.reply(`${userDisplay}\n鱼缸里没有可用于炼竿的传说鱼。`);
      return;
    }

    const target = parseLegendaryPreviewTarget(e.msg);
    if (!target) {
      await this.reply(`${userDisplay}\n请输入鱼缸序号，或 legendary 鱼名。\n例如：#炼竿预览 3 / #炼竿预览 神龙 / #炼竿预览 神龙 2`);
      return;
    }

    const resolved = this.resolveLegendaryCraftSelection(userData, target);
    if (resolved.error) {
      await this.reply(`${userDisplay}\n${resolved.error}`);
      return;
    }

    const { fish, recipe } = resolved;
    const owned = userData.rodsOwned?.includes(recipe.id);
    const crafted = Boolean(userData.craftedLegendaryRods?.[recipe.id]);
    const sections = [
      `材料鱼：${fish.name} | ${fish.length}cm / ${fish.weight}kg`,
      `将炼成：${recipe.name}`,
      `状态：${owned ? '已拥有' : '未拥有'}${crafted ? ' | 已炼过' : ''}`,
      `手感描述：${recipe.description}`,
      ...buildRodTraitLines(recipe)
    ];
    const fallback = [
      '炼竿预览',
      `材料鱼：${fish.name} | ${fish.length}cm / ${fish.weight}kg`,
      `将炼成：${recipe.name}`,
      `状态：${owned ? '已拥有' : '未拥有'}${crafted ? ' | 已炼过' : ''}`,
      `手感描述：${recipe.description}`,
      ...buildRodTraitLines(recipe),
      '使用：#炼竿 该鱼序号 或 #炼竿 legendary鱼名'
    ].join('\n');

    await replyWithPanel(this, {
      key: `craft-preview-${e.user_id}`,
      title: '炼竿预览',
      subtitle: `${fish.name} -> ${recipe.name}`,
      sections,
      footer: '确认后可用：#炼竿 1 / #炼竿 神龙2；同一种 legendary 特殊竿不能重复炼制。'
    }, fallback);
  }

  async craftLegendaryRod(e) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    userData.rodsOwned = [...new Set((userData.rodsOwned || []).filter(id => ROD_CATALOG[id]))];
    if (!userData.rodsOwned.includes(DEFAULT_ROD_ID)) userData.rodsOwned.unshift(DEFAULT_ROD_ID);
    if (!userData.fishTank?.length) {
      await this.reply(`${userDisplay}\n鱼缸里没有可用于炼竿的传说鱼。`);
      return;
    }

    const target = parseLegendaryCraftTarget(e.msg);
    if (!target) {
      await this.reply(`${userDisplay}\n请输入鱼缸序号，或 legendary 鱼名。\n例如：#炼竿 3 / #炼竿神龙 / #炼竿 神龙 2`);
      return;
    }
    const resolved = this.resolveLegendaryCraftSelection(userData, target);
    if (resolved.error) {
      await this.reply(`${userDisplay}\n${resolved.error}`);
      return;
    }
    const { originalIndex, fish, recipe } = resolved;
    if (userData.rodsOwned.includes(recipe.id)) {
      await this.reply(`${userDisplay}\n你已经拥有 ${recipe.name} 了，这条 ${fish.name} 先留着吧。`);
      return;
    }
    if (userData.craftedLegendaryRods?.[recipe.id]) {
      await this.reply(`${userDisplay}\n你已经炼制过 ${recipe.name} 了，同一种 legendary 特殊竿不能重复炼制。`);
      return;
    }

    userData.fishTank.splice(originalIndex, 1);
    removeOwnedFish(userData, fish, { today: true, tank: false });
    userData.rodsOwned.push(recipe.id);
    userData.craftedLegendaryRods[recipe.id] = {
      sourceFishName: fish.name,
      sourceFishId: fish.fishId || null,
      craftedAt: Date.now()
    };

    const unlocked = this.refreshAchievements(data, userId);
    await this.reply(
      `${userDisplay}\n你消耗了 ${fish.name}，炼成了特殊鱼竿 ${recipe.name}。\n` +
      `效果：${recipe.description}${this.formatAchievementUnlocks(unlocked)}`
    );
  }

  async buyMarketItem(e, keyword) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const rawKeyword = String(keyword || '').trim();
    const customMatch = rawKeyword.match(/^自定义鱼饵\s+(.+)$/);
    if (customMatch) {
      const sourceText = customMatch[1].trim();
      const customPrice = SHOP_ITEMS.custom_bait.price;
      if (userData.coins < customPrice) {
        await this.reply(`${userDisplay}\n鱼币不足，当前只有 ${userData.coins}。`);
        return;
      }
      const bait = findCustomBaitBySource(userData.customBaits, sourceText) || generateCustomBaitFromText(sourceText);
      bait.price = customPrice;
      bait.packSize = 3;
      userData.coins -= customPrice;
      userData.customBaits[bait.id] = bait;
      if (!userData.baitInventory[bait.id]) userData.baitInventory[bait.id] = 0;
      userData.baitInventory[bait.id] += bait.packSize;
      saveFishData(data);
      await this.reply(`${userDisplay}\n已定制 ${bait.name}，花费 ${customPrice} 鱼币，库存 +${bait.packSize} 次。\n特点：${bait.description}\n可用 #换饵 ${bait.name} 切换。当前鱼币：${userData.coins}`);
      return;
    }

    const parsedPurchase = parseMarketPurchaseKeyword(keyword);
    if (!parsedPurchase) {
      await this.reply(`${userDisplay}\n购买数量格式不正确。批量购买请写在商品后面，例如：#鱼市购买鱼饵1*5`);
      return;
    }
    const { keyword: itemKeyword, compactKeyword, quantity } = parsedPurchase;

    let item = null;
    const baitNo = compactKeyword.match(/^鱼饵(\d{1,2})$/);
    const rodNo = compactKeyword.match(/^鱼竿(\d{1,2})$/);
    if (baitNo) {
      item = getBuiltinBuyableBaitList()[Number(baitNo[1]) - 1] || null;
      if (item) item = { ...item, type: 'bait' };
    } else if (rodNo) {
      item = getBuyableRodList()[Number(rodNo[1]) - 1] || null;
    } else {
      item = findShopItem(itemKeyword) || this.getRodByKeyword(itemKeyword);
    }
    if (!item) {
      await this.reply(`${userDisplay}\n未找到要购买的商品。`);
      return;
    }

    if (quantity > 1 && item.type !== 'bait' && item.type !== 'ticket') {
      await this.reply(`${userDisplay}\n只有鱼饵和钓鱼券支持批量购买。`);
      return;
    }

    if (item.type === 'ticket') {
      const boughtToday = Number(userData.todayTicketsBought || 0);
      const remainingToday = Math.max(0, DAILY_TICKET_PURCHASE_LIMIT - boughtToday);
      if (remainingToday <= 0) {
        await this.reply(`${userDisplay}\n今天钓鱼券购买已达上限 ${DAILY_TICKET_PURCHASE_LIMIT} 张，明天再来。`);
        return;
      }
      const cappedQuantity = Math.min(quantity, remainingToday);
      const totalPrice = item.price * cappedQuantity;
      if (userData.coins < totalPrice) {
        await this.reply(`${userDisplay}\n鱼币不足，需要 ${totalPrice}，当前只有 ${userData.coins}。`);
        return;
      }
      const addedTickets = item.count * cappedQuantity;
      userData.coins -= totalPrice;
      userData.tickets += addedTickets;
      userData.todayTicketsBought = boughtToday + addedTickets;
      saveFishData(data);
      const cappedMsg = cappedQuantity < quantity ? `\n今日最多购买 ${DAILY_TICKET_PURCHASE_LIMIT} 张，已自动调整为 ${cappedQuantity} 张。` : '';
      await this.reply(`${userDisplay}${cappedMsg}\n已购买 ${item.name} x${addedTickets}。今日已购：${userData.todayTicketsBought}/${DAILY_TICKET_PURCHASE_LIMIT}，当前钓鱼券：${userData.tickets}，鱼币：${userData.coins}`);
      return;
    }

    const totalPrice = item.price * quantity;
    if (userData.coins < totalPrice) {
      await this.reply(`${userDisplay}\n鱼币不足，需要 ${totalPrice}，当前只有 ${userData.coins}。`);
      return;
    }

    userData.coins -= totalPrice;
    if (item.type === 'bait') {
      if (!userData.baitInventory[item.id]) userData.baitInventory[item.id] = 0;
      const addedCount = item.packSize * quantity;
      userData.baitInventory[item.id] += addedCount;
      saveFishData(data);
      await this.reply(`${userDisplay}\n已购买 ${item.name} ${quantity} 包，共 ${totalPrice} 鱼币；每包 ${item.packSize} 份，库存 +${addedCount} 次。可用 #换饵 ${item.name} 切换。当前鱼币：${userData.coins}`);
      return;
    }

    if (item.id) {
      if (userData.rodsOwned.includes(item.id)) {
        userData.coins += totalPrice;
        await this.reply(`${userDisplay}\n你已经拥有 ${item.name}。`);
        return;
      }
      if (item.sourceLegendary) {
        userData.coins += totalPrice;
        await this.reply(`${userDisplay}\n${item.name} 不能直接购买，需要用对应的 legendary 鱼执行 #炼竿。`);
        return;
      }
      userData.rodsOwned.push(item.id);
      const unlocked = this.refreshAchievements(data, userId);
      await this.reply(`${userDisplay}\n已购买鱼竿 ${item.name}。当前鱼币：${userData.coins}${this.formatAchievementUnlocks(unlocked)}`);
    }
  }

  async handleRodCommand(e) {
    const tail = (e.msg.match(/^#(?:鱼竿|换竿|换杆)(.*)$/)?.[1] || '').trim();
    if (!tail) {
      await this.showRods(e);
      return;
    }

    await this.equipRod(e, tail);
  }

  async showRodDetailsCommand(e) {
    const keyword = (e.msg.match(/^#鱼竿(?:详情|属性)\s+(.+)$/)?.[1] || '').trim();
    const { text: userDisplay } = getUserDisplay(e);
    if (!keyword) {
      await this.reply(`${userDisplay}\n请输入鱼竿编号或鱼竿名，例如：#鱼竿详情 鱼竿1 / #鱼竿属性 疾风短竿`);
      return;
    }
    await this.showRodDetails(e, keyword);
  }

  async showRods(e) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, String(e.user_id));
    const equipped = getEquippedRod(userData);
    const owned = new Set(userData.rodsOwned);

    const rodList = getSwitchableRodList(userData);
    const lines = rodList.map((rod, index) => {
      const marks = [
        rod.id === equipped.id ? '已装备' : null,
        owned.has(rod.id) ? '已拥有' : `${rod.price}鱼币`,
        owned.has(rod.id) && rod.id !== DEFAULT_ROD_ID ? `回收价:${getRodRecycleValue(rod)}鱼币` : null,
        rod.sourceLegendary ? `炼成来源:${rod.sourceLegendary}` : null
      ].filter(Boolean).join(' | ');
      return `鱼竿${index + 1} | ${rod.name} - ${marks} - ${rod.description}`;
    });

    const sections = [
      `当前鱼竿：${equipped.name}`,
      `默认鱼竿：${ROD_CATALOG.starter.name} - 可用 #换竿 0 / #换竿 默认`,
      ...lines
    ].filter(Boolean);
    const fallback = [
      '鱼竿',
      `当前鱼竿：${equipped.name}`,
      `默认鱼竿：${ROD_CATALOG.starter.name} - 可用 #换竿 0 / #换竿 默认`,
      ...lines,
      '使用：#换竿 编号 或 #换竿 鱼竿名'
    ].filter(Boolean).join('\n');
    await replyWithPanel(this, {
      key: `rods-${e.user_id}`,
      title: '鱼竿',
      subtitle: `当前使用：${equipped.name}`,
      sections,
      footer: '使用：#换竿 0 / #换竿 鱼竿1 / #鱼竿详情 鱼竿1 / #炼竿预览 1 / #炼竿 1 / #鱼市回收 鱼竿1'
    }, fallback);
  }

  async showRodDetails(e, keyword) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const visibleRods = getSwitchableRodList(userData);
    const rodIndex = parseRodIndex(keyword);
    const rod = rodIndex === 'default'
      ? ROD_CATALOG.starter
      : rodIndex !== null
        ? visibleRods[rodIndex]
        : this.getRodByKeyword(keyword);

    if (!rod) {
      await this.reply(`${userDisplay}\n没有找到这根鱼竿。`);
      return;
    }

    const owned = userData.rodsOwned.includes(rod.id);
    const sections = [
      `鱼竿：${rod.name}`,
      `状态：${owned ? '已拥有' : '未拥有'}${rod.id === getEquippedRod(userData).id ? ' | 当前装备' : ''}`,
      rod.sourceLegendary ? `炼成来源：${rod.sourceLegendary}` : `售价：${rod.price}鱼币`,
      `手感描述：${rod.description}`,
      ...buildRodTraitLines(rod)
    ];
    const fallback = [
      '鱼竿详情',
      `鱼竿：${rod.name}`,
      `状态：${owned ? '已拥有' : '未拥有'}${rod.id === getEquippedRod(userData).id ? ' | 当前装备' : ''}`,
      rod.sourceLegendary ? `炼成来源：${rod.sourceLegendary}` : `售价：${rod.price}鱼币`,
      `手感描述：${rod.description}`,
      ...buildRodTraitLines(rod)
    ].join('\n');

    await replyWithPanel(this, {
      key: `rod-details-${e.user_id}`,
      title: '鱼竿详情',
      subtitle: rod.name,
      sections,
      footer: '这里只展示词条倾向，不直接公开具体数值。'
    }, fallback);
  }

  async equipRod(e, keyword) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const rodIndex = parseRodIndex(keyword);
    const rod = rodIndex === 'default'
      ? ROD_CATALOG.starter
      : rodIndex !== null
        ? getSwitchableRodList(userData)[rodIndex]
        : this.getRodByKeyword(keyword);
    if (!rod) {
      await this.reply(`${userDisplay}\n没有找到这根鱼竿。`);
      return;
    }
    if (!userData.rodsOwned.includes(rod.id)) {
      await this.reply(`${userDisplay}\n你还没有拥有 ${rod.name}，先去鱼市购买。`);
      return;
    }
    userData.equippedRod = rod.id;
    saveFishData(data);
    await this.reply(`${userDisplay}\n已换上 ${rod.name}。\n手感：${rod.description}`);
  }

  async handleBaitCommand(e) {
    const tail = (e.msg.match(/^#(?:鱼饵|换饵)(.*)$/)?.[1] || '').trim();
    if (!tail) {
      await this.showBaits(e);
      return;
    }
    await this.switchBait(e, tail);
  }

  async showBaits(e) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, String(e.user_id));
    const equipped = getEquippedBait(userData);
    const ownedBaitsSummary = getOwnedBaitsSummary(userData) || '暂无可消耗鱼饵';
    const ownedRodsSummary = getOwnedRodsSummary(userData) || '暂无已购鱼竿';
    const builtinBaits = getBuiltinBuyableBaitList();
    const builtinLines = builtinBaits.map((bait, index) => {
      const count = userData.baitInventory?.[bait.id] || 0;
      const state = bait.id === equipped.id ? '当前使用' : count > 0 ? '可切换' : '未持有';
      return `鱼饵${index + 1} | ${bait.name} - ${state} - ${bait.description}`;
    });
    const customLines = getCustomBaitList(userData)
      .map((bait, index) => {
        const count = userData.baitInventory?.[bait.id] || 0;
        const state = bait.id === equipped.id ? '当前使用' : count > 0 ? '可切换' : '已用完';
        return `鱼饵${builtinBaits.length + index + 1} | ${bait.name} - ${state} - ${bait.description}`;
      });
    const sections = [
      `当前鱼饵：${equipped.name}`,
      `持有鱼饵：${ownedBaitsSummary}`,
      `已购鱼竿：${ownedRodsSummary}`,
      `默认鱼饵：${BAIT_CATALOG.plain.name} - 可用 #换饵 0 / #换饵 默认`,
      ...builtinLines,
      ...customLines
    ];
    const fallback = [
      '鱼饵',
      `当前鱼饵：${equipped.name}`,
      `持有鱼饵：${ownedBaitsSummary}`,
      `已购鱼竿：${ownedRodsSummary}`,
      `默认鱼饵：${BAIT_CATALOG.plain.name} - 可用 #换饵 0 / #换饵 默认`,
      ...builtinLines,
      ...customLines,
      '使用：#换饵 编号 或 #换饵 鱼饵名'
    ].join('\n');
    await replyWithPanel(this, {
      key: `baits-${e.user_id}`,
      title: '鱼饵',
      subtitle: `当前使用：${equipped.name}`,
      sections,
      footer: '使用：#换饵 1 / #换饵 沉流鱼饵'
    }, fallback);
  }

  async switchBait(e, keyword) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const baitIndex = parseBaitIndex(keyword);
    const bait = baitIndex === 'default'
      ? BAIT_CATALOG.plain
      : baitIndex !== null
        ? getSwitchableBaitList(userData)[baitIndex]
        : this.getBaitByKeyword(userData, keyword);
    if (!bait) {
      await this.reply(`${userDisplay}\n没有找到这种鱼饵。`);
      return;
    }
    if (!bait.isDefault && !(userData.baitInventory?.[bait.id] > 0)) {
      await this.reply(`${userDisplay}\n你还没有 ${bait.name}，先去鱼市购买。`);
      return;
    }
    userData.equippedBait = bait.id;
    saveFishData(data);
    await this.reply(`${userDisplay}\n已换上 ${bait.name}。\n手感：${bait.description}`);
  }

  async showDailySignal() {
    const signal = this.getDailySignal();
    const lines = [
      `刷新日期：${signal.date}`,
      `今日高活跃鱼：${signal.targets.map(item => `${item.name}(${item.rarity})`).join('、')}`,
      `命中奖励：每条额外 +${signal.bonusCoins} 鱼币`
    ];
    await this.reply(lines.join('\n'));
  }

  async showAchievements(e) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, String(e.user_id));
    const unlocked = scanAchievements(userData, this.fishTypes);
    userData.achievementCatchRateBonus = getAchievementCatchRateBonus(userData);
    userData.achievementDailyCastBonus = getAchievementDailyCastBonus(userData);
    saveFishData(data);
    const list = formatAchievementList(userData);

    const sections = list.map(item => `${item.unlocked ? '已点亮' : '未完成'} | ${item.name} | ${item.description} | 奖励 ${item.rewardText}`);
    const fallback = [
      '钓鱼成就',
      ...sections
    ].join('\n');

    await replyWithPanel(this, {
      key: `achievement-${e.user_id}`,
      title: '钓鱼成就',
      subtitle: `已完成 ${list.filter(item => item.unlocked).length}/${ACHIEVEMENT_DEFS.length}`,
      sections,
      footer: unlocked.length ? `本次自动点亮：${unlocked.map(item => item.name).join('、')}` : '如有已达成但未触发的钓鱼成就，进入此页会自动补点亮。'
    }, fallback);
  }

  async compensateFishCoins(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能使用鱼币补偿。');
      return;
    }

    const amount = this.parseCompensationCommand(e.msg);
    if (!Number.isFinite(amount) || amount <= 0) {
      await this.reply('补偿数额需要是正整数，格式示例：#鱼币补偿 @某人 *100 或 #鱼币补偿 全体 *100');
      return;
    }

    const data = this.loadData();
    if (this.isAllPlayerCompensation(e.msg)) {
      let count = 0;
      for (const userId of Object.keys(data)) {
        const userData = this.getOrCreateUser(data, userId);
        userData.coins += amount;
        count += 1;
      }
      saveFishData(data);
      await this.reply(`已为 ${count} 名已有数据玩家发放更新补偿：每人 ${amount} 鱼币。`);
      return;
    }

    const targetUserId = getTargetUserId(e);
    if (!targetUserId) {
      await this.reply('请 @ 需要补偿的人，格式示例：#鱼币补偿 @某人 *100 或 #鱼币补偿 全体 *100');
      return;
    }

    const userData = this.getOrCreateUser(data, targetUserId);
    userData.coins += amount;
    saveFishData(data);
    const targetDisplay = getDisplayNameForUser(e, targetUserId);

    await this.reply(`已为 ${targetDisplay} 补偿 ${amount} 鱼币，当前鱼币：${userData.coins}`);
  }

  async compensateFish(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能使用补鱼。');
      return;
    }

    const parsed = this.parseCompensateFishCommand(e);
    if (parsed.error) {
      await this.reply(parsed.error);
      return;
    }

    const data = this.loadData();
    const userData = this.getOrCreateUser(data, parsed.targetUserId);
    const { fishWithTimestamp, tankUpdateMsg } = this.addCaughtFishToUser(userData, parsed.fish);
    const unlocked = scanAchievements(userData, this.fishTypes);
    userData.achievementCatchRateBonus = getAchievementCatchRateBonus(userData);
    userData.achievementDailyCastBonus = getAchievementDailyCastBonus(userData);
    saveFishData(data);
    const targetDisplay = getDisplayNameForUser(e, parsed.targetUserId);

    await this.reply(
      `已为 ${targetDisplay} 补入 ${fishWithTimestamp.rarity} 鱼：${fishWithTimestamp.name}\n` +
      `长度：${fishWithTimestamp.length}cm，重量：${fishWithTimestamp.weight}kg${tankUpdateMsg}` +
      `${this.formatAchievementUnlocks(unlocked)}`
    );
  }

  async sealFishingGroup(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能封竿。');
      return;
    }
    if (!e.group_id) {
      await this.reply('封竿只能在群聊中使用。');
      return;
    }

    const groupId = String(e.group_id);
    const sealedGroups = new Set(this.getSealedGroups());
    if (sealedGroups.has(groupId)) {
      await this.reply('本群已经封竿，本插件将继续保持禁用。');
      return;
    }

    sealedGroups.add(groupId);
    this.config.sealedGroups = [...sealedGroups];
    saveConfig(this.config);
    await this.reply('已封竿，本群将不再响应 Fish-plugin 指令。');
  }

  async unsealFishingGroup(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能解封竿。');
      return;
    }
    if (!e.group_id) {
      await this.reply('解封竿只能在群聊中使用。');
      return;
    }

    const groupId = String(e.group_id);
    const sealedGroups = new Set(this.getSealedGroups());
    if (!sealedGroups.has(groupId)) {
      await this.reply('本群当前没有封竿。');
      return;
    }

    sealedGroups.delete(groupId);
    this.config.sealedGroups = [...sealedGroups];
    saveConfig(this.config);
    await this.reply('已解封竿，本群恢复响应 Fish-plugin 指令。');
  }

  async forceRefreshFishingDay(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能强制刷新到新的一天。');
      return;
    }

    this.resetDailyState(getTodayKey());
    const signal = this.getDailySignal();
    await this.reply(
      `已强制刷新钓鱼日。\n` +
      `当前日期：${signal.date}\n` +
      `今日鱼讯：${signal.targets.map(item => `${item.name}(${item.rarity})`).join('、')}`
    );
  }

  clearTodayData() {
    this.ensureDailyResetIfNeeded();
  }
}
