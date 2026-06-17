import plugin from '../../lib/plugins/plugin.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fishTemplateByName,
  fishTypes,
  legacyFishAliases,
  rarityWeights,
  trashItems,
  randomEvents,
  generateFish,
  lostItemEvents
} from './fishdata/fishpool.js';
import {
  ACHIEVEMENT_DEFS,
  BAIT_PRESERVE_CHANCE_CAP,
  BAIT_CATALOG,
  DEFAULT_BAIT_ID,
  DEFAULT_ROD_ID,
  EASTER_EGG_EFFECTS,
  EASTER_EGG_RARITY,
  HIDDEN_PITY_CATCH_BONUS,
  LEGENDARY_ROD_RECIPES,
  LOTTERY_GRAND_PRIZE_PLUGINS,
  RARITY_LABELS,
  RARITY_ORDER,
  ROD_CATALOG,
  SHOP_ITEMS,
  TANK_UPGRADE_EXTRA_CASTS
} from './lib/constants.js';
import { defaultLegendaryMessage, defaultMysteryMessage, emptyHookMessages, epicMessages, failProtectionFakeFailMessages, legendaryMessages, lostItemRecoverMessages, mysteryMessages, trashCatchMessages } from './lib/messages.js';
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
  getLockedFishIds,
  getTargetUserId,
  getDisplayNameForUser,
  getUserDisplay,
  getOwnedEasterEggCollection,
  getOwnedRodsSummary,
  isFishLocked,
  isSameFish,
  lockFishById,
  normalizeAllUsers,
  normalizeUserData,
  repairAllUsersFishData,
  recordEmptyCast,
  removeOwnedFish,
  resetEmptyCastStreak,
  registerCastUsage,
  scheduleEasterEggSwitch,
  unlockFishById,
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
import { ensureDailySignal } from './lib/signals.js';
import { ensureResourceDirs, replyWithPanel } from './lib/panel.js';
import {
  getLotteryGrandPrizeList,
  getLotteryPoolSummary,
  getPreferredLotteryGrandPrizePlugin,
  isLotteryGrandPrizeAvailable,
  parseLotteryCommand,
  performLotteryDraws,
  resolveLotteryGrandPrizePlugin
} from './lib/lottery.js';
import { findCustomBaitBySource, generateCustomBaitFromText } from './lib/custom-bait.js';
import { getNowTimestamp, getTodayKey, getTimeRuntimeInfo } from './lib/time.js';
import {
  SEGMENTED_CAST_RETURN_EXTRA_TICKET_HOUR,
  getDailyResetHour,
  getFastFishingUsageOptions,
  getFishingDayKey,
  getFishingUsageOptions,
  getSegmentedCastReturnStatusText,
  parseDailyResetHour,
  parseOnOffToggle
} from './lib/fishing-day.js';
import {
  applyBaitRandomEffectForCast,
  applyDuanwuQuyuanEvent,
  claimDailyDuanwuZongziGift,
  isDuanwuEventActive,
  isSeasonalBaitActive,
  shouldTriggerDuanwuQuyuanEvent
} from './lib/duanwu.js';
import {
  getGoldHumbleCatchRateBonus,
  getGoldHumbleRarityBias,
  getGoldHumbleSpecialRewardCoins,
  getGoldHumbleTargetDisplayName,
  getGoldHumbleTargetProfile,
  getGoldHumbleTargetShortName,
  isGoldHumbleRarityTarget,
  pickGoldHumbleDistractors,
  resolveGoldHumbleCandidateNames,
  resolveRodTarget
} from './lib/gold-humble.js';
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
const FISH_PLUGIN_UPDATE_PROXY_CONFIG_KEY = 'updateProxy';
const SELF_UPDATE_BACKUP_DIR = '.self-update-backups';
const USER_BACKUP_DIR = 'user_backup';
const USER_BACKUP_FILES = [
  'fishdata/fishData.json',
  'fishdata/baitData.json'
];
const SELF_UPDATE_PRESERVE_PATHS = [
  /^fishdata\/(?!fishpool\.js$).+/i,
  /^resources\/backgrounds(?:\/|$)/i,
  /^resources\/generated(?:\/|$)/i
];
let fishPluginUpdating = false;
const GIFT_COMMAND_FILLER_TOKENS = new Set(['给', '给到', '送给', '发给', '转给', '把']);
const COMPENSATE_COMMAND_FILLER_TOKENS = new Set(['给', '给到', '补给', '补到', '发给', '来条', '来个', '来一条']);
const XIANYU_EASTER_EGG_NAME = '闲鱼';
const CUSTOM_BAIT_PURCHASE_PATTERN = '(?:自定义鱼饵|定制鱼饵|手作鱼饵)';
const ALL_DETAILS_KEYWORD_REG = /^(?:全部|所有|全量|一览|all)$/i;

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
      { title: '#查看鱼缸 / #查看鱼缸 @某人', desc: '查看自己或群友的鱼缸容量、升级进度、库存和当前收藏。' },
      { title: '#升级鱼缸 legendary 1 / #升级鱼缸 epic 1 2 3', desc: '按鱼缸展示序号提交材料，支持分次提交；legendary 模式只收传说鱼，epic 模式只收史诗鱼。' },
      { title: '#放生鱼 1', desc: '从鱼缸放生指定鱼。彩蛋鱼属于收藏，不在鱼缸里。' },
      { title: '#赠鱼 @某人 1 / #赠鱼 1 @某人', desc: '把指定鱼送给别人，支持按鱼缸序号或鱼名赠送。' },
      { title: '#锁定鱼 3 / #锁定鱼 虹鳟2 / #解锁鱼 3', desc: '支持按鱼缸序号或鱼名锁定；已锁定的鱼不能出售、升级、炼竿、放生、赠送或被自动替换。' }
    ]
  },
  {
    group: '鱼市与装备',
    list: [
      { title: '#鱼市 / #售鱼 1 / #售鱼 common / #售鱼 全部', desc: '卖鱼、看鱼市，也可以按今日鱼获编号、稀有度或批量处理。' },
      { title: '#售鱼 鱼缸3 / #售鱼 鱼缸 2 3 4 5 / #售鱼 鱼缸虹鳟 / #售鱼 鱼缸 uncommon', desc: '支持按鱼缸序号、同名鱼顺序、鱼缸稀有度或全部出售。' },
      { title: '#鱼市购买 鱼饵1*5 / #鱼市购买 3*自定义鱼饵清香窝料', desc: '批量购买鱼饵、钓鱼券和自定义鱼饵。' },
      { title: '#鱼市购买 鱼竿1 / #鱼市回收 鱼竿1', desc: '购买普通鱼竿，或按回收列表序号回收已拥有鱼竿；普通竿半价，legendary 竿回收价 750。' },
      { title: '#鱼竿 / #换竿 0', desc: '查看鱼竿库存，并切换到默认竿或指定鱼竿。' },
      { title: '#鱼竿详情 鱼竿1 / #鱼竿详情全部', desc: '查看单根鱼竿详情，或缩略查看自己拥有的全部鱼竿。' },
      { title: '#鱼饵 / #换饵 0', desc: '查看鱼饵库存，并切回默认饵或切到指定鱼饵。' },
      { title: '#鱼饵详情 鱼饵1 / #鱼饵详情全部', desc: '查看单种鱼饵详情，或缩略查看自己拥有的全部鱼饵，自定义鱼饵也支持。' },
      { title: '#自动续饵开 / #续饵关 / #鱼饵自动续', desc: '当前鱼饵用完后，按持有鱼饵列表顺序自动续到下一种。' }
    ]
  },
  {
    group: '活动与进阶',
    list: [
      { title: '#限时鱼讯', desc: '查看当天高活跃鱼讯与命中奖励。' },
      { title: '#彩蛋收藏', desc: '查看已收集彩蛋、当前生效项和待切换项。' },
      { title: '#切换彩蛋 愿望锦鲤', desc: '安排彩蛋效果切换；每天只能安排一次，次日生效。' },
      { title: '#钓鱼祈愿 / #钓鱼祈愿10 / #钓鱼十连 / #钓鱼祈愿清单', desc: '100鱼蛋祈愿1次，可获得限定鱼竿、限定鱼饵和免费祈愿。' },
      { title: '#钓鱼祈愿大奖 金满竿 / #钓鱼祈愿大奖 鱼饵配送员', desc: '切换当前想抽的祈愿大奖，已有保底进度会继续累计。' },
      { title: '#金谦指定 虹鳟 / #金谦目标 rare', desc: '拥有金满而谦虚之竿后，每天可指定1次目标鱼或整个稀有度；清除目标需发送 #金谦指定 确认清除。' },
      { title: '#钓鱼成就', desc: '查看成就进度和永久加成。' },
      { title: '#打窝 文本 / #打窝 @某人', desc: '投放临时窝料，效果持续2竿。' },
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
      { title: '#设置钓鱼刷新时间 6', desc: '设置每日钓鱼日刷新时间，24小时制，只能填0-23点。' },
      { title: '#钓鱼分段返还 开启 / 关闭', desc: '开启后基础次数按刷新点、+6小时、+12小时分三段返还，+16小时后可用钓鱼券。' },
      { title: '#鱼蛋补偿 @某人 *100', desc: '给单人补发鱼蛋。' },
      { title: '#鱼蛋补偿 全体 *100', desc: '给已有数据的全部玩家统一补发鱼蛋。' },
      { title: '#补鱼 @某人 鳗鱼 / #补鱼 rare 鳗鱼 @某人 80 3.5', desc: '直接补发指定鱼，目标、稀有度、鱼名顺序更自由，长度和重量可省略。' },
      { title: '#强制刷新钓鱼日', desc: '强制刷新全服当天钓鱼状态。' },
      { title: '#钓鱼更新', desc: '从远端仓库拉取 Fish-plugin 最新版本并重启。' },
      { title: '#钓鱼更新代理 https://gh-proxy.com/', desc: '设置 GitHub 更新代理；#钓鱼更新代理关闭 可恢复直连。' }
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

const EMPTY_HOOK_FAIL_RATE = 0.30;
const FAIL_LOST_EVENT_RATE = 0.15;
const FAIL_LOST_ITEM_RATE = 0.10;
const FAIL_TRASH_RATE = 0.15;
const FAIL_RANDOM_EVENT_RATE = 0.30;
const XIANYU_RANDOM_FAIL_TO_TRASH_RATE = 0.05;
const POST_EMPTY_FAIL_RANGE = 1 - EMPTY_HOOK_FAIL_RATE;
const FAIL_LOST_EVENT_POST_EMPTY_RATE = FAIL_LOST_EVENT_RATE / POST_EMPTY_FAIL_RANGE;
const FAIL_LOST_ITEM_POST_EMPTY_RATE = FAIL_LOST_ITEM_RATE / POST_EMPTY_FAIL_RANGE;
const FAIL_TRASH_POST_EMPTY_RATE = FAIL_TRASH_RATE / POST_EMPTY_FAIL_RANGE;
const FAIL_RANDOM_EVENT_POST_EMPTY_RATE = FAIL_RANDOM_EVENT_RATE / POST_EMPTY_FAIL_RANGE;
const DAILY_TICKET_PURCHASE_LIMIT = 5;
const FAST_FISHING_CATCH_RATE_PENALTY = 0.08;
const FISHING_BUSY_MESSAGE = '你正在钓鱼，钓鱼就要戒骄戒躁，请稍后。';
const activeFishingUsers = new Set();
const activeFishingBusyNotified = new Set();
const FAIL_RESULT_LABELS = {
  empty_hook: '空钩',
  lost_item: '捞回失物',
  trash: '钓到垃圾',
  lost_event: '物品落水',
  random_event: '普通失手'
};

function hasActiveXianyuEffect(userData) {
  return getEasterEggEffects(userData).activeName === XIANYU_EASTER_EGG_NAME;
}
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
  const lockMark = fish?.locked ? ' [已锁定]' : '';
  return `${prefix} ${fish.name}(${fish.rarity}) ${fish.length}cm/${fish.weight}kg${lockMark}`;
}

function formatTodayFishRecordLine(fish, index = null) {
  const prefix = index == null ? '•' : `[${index + 1}]`;
  const lockMark = fish?.locked ? ' [已锁定]' : '';
  return `${prefix} ${fish.name}(${fish.rarity}) 长度：${fish.length}cm，重量：${fish.weight}kg${lockMark}`;
}

function getRarityCountSummary(fishList = []) {
  const counts = new Map();
  for (const fish of fishList) {
    const rarity = String(fish?.rarity || '未知');
    counts.set(rarity, (counts.get(rarity) || 0) + 1);
  }
  const order = [...RARITY_ORDER, ...[...counts.keys()].filter(rarity => !RARITY_ORDER.includes(rarity))];
  return order
    .filter(rarity => counts.has(rarity))
    .map(rarity => `${rarityLabel(rarity)} ${counts.get(rarity)}条`)
    .join('、') || '暂无';
}

function buildTodayFishRecordPanel(config, userData, ownerDisplay = '你', options = {}) {
  const displayName = String(ownerDisplay || '你').trim() || '你';
  const today = userData?.today || {};
  const rod = userData ? getEquippedRod(userData) : null;
  const fishList = Array.isArray(today.fish) ? today.fish : [];
  const annotatedFish = userData ? fishList.map(fish => annotateFishLock(userData, fish)) : [];
  const todayCount = Number(today.count || 0);
  const todayCatchCount = Number(today.catches || 0);
  const currentFishCount = annotatedFish.length;
  const totalCount = Number(userData?.total || 0);
  const limitText = userData ? getFishingLimitText(config, userData, rod, getFishingUsageOptions(config)) : '0/0';
  const emptyText = userData
    ? todayCatchCount > 0
      ? '今天钓到的鱼已经不在当前鱼获列表里，可能已经出售或移入鱼缸。'
      : todayCount > 0
        ? `今天钓了 ${todayCount} 次，但一条鱼都没钓到，空军了。`
        : '今天还没有钓过鱼。'
    : '今天还没有钓鱼记录。';
  const title = options.isSelf ? '今日鱼获' : `${displayName}的今日鱼获`;
  const sections = [
    '今日概况',
    `今日钓鱼次数：${limitText}`,
    `今日抛竿：${todayCount}次`,
    `今日钓到鱼：${todayCatchCount}条`,
    `当前剩余鱼获：${currentFishCount}条`,
    `总共钓鱼次数：${totalCount}`,
    `当前鱼竿：${rod?.name || '暂无'}`,
    '',
    '稀有度分布',
    `当前鱼获：${getRarityCountSummary(annotatedFish)}`,
    '',
    '今日鱼获',
    ...(annotatedFish.length
      ? annotatedFish.map((fish, index) => formatTodayFishRecordLine(fish, index))
      : [emptyText])
  ];
  const fallback = [
    title,
    ...sections
  ].join('\n');
  return {
    panel: {
      key: options.key || `today-fish-${options.userId || 'self'}`,
      title,
      subtitle: userData
        ? `今日钓到 ${todayCatchCount} 条 | 当前剩余 ${currentFishCount} 条 | 次数 ${limitText}`
        : emptyText,
      sections,
      footer: annotatedFish.length ? '鱼获编号可用于：#售鱼 1 / #售鱼 1 2 3' : '继续使用：#钓鱼 / #钓鱼极速版'
    },
    fallback
  };
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
  if (Number(rod.recycleValue || 0) > 0) return Math.floor(Number(rod.recycleValue || 0));
  if (rod.sourceLegendary) return 750;
  return Math.max(0, Math.floor(Number(rod.price || 0) / 2));
}

function getVisibleCollectionRarities() {
  return [...RARITY_ORDER];
}

function getVisibleRodList(userData) {
  const owned = new Set(userData?.rodsOwned || []);
  return Object.values(ROD_CATALOG).filter(rod => {
    if (rod.sourceLegendary || rod.sourceLottery) return owned.has(rod.id);
    return true;
  });
}

function getSwitchableRodList(userData) {
  const owned = new Set(userData?.rodsOwned || []);
  const buyable = getBuyableRodList();
  const special = Object.values(ROD_CATALOG)
    .filter(rod => (rod.sourceLegendary || rod.sourceLottery) && owned.has(rod.id));
  return [...buyable, ...special];
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

function getBuiltinBuyableBaitList(dateKey = getTodayKey()) {
  return Object.values(BAIT_CATALOG)
    .filter(item => !item.isDefault && !item.lotteryOnly)
    .filter(item => isSeasonalBaitActive(item, dateKey));
}

function getOwnedBuiltinBaitList(userData) {
  return Object.values(BAIT_CATALOG)
    .filter(item => !item.isDefault)
    .filter(item => !item.lotteryOnly || Number(userData?.baitInventory?.[item.id] || 0) > 0);
}

function getCustomBaitList(userData) {
  return Object.values(userData?.customBaits || {})
    .filter(bait => Number(userData?.baitInventory?.[bait.id] || 0) > 0)
    .filter((bait, index, arr) => arr.findIndex(item => item.id === bait.id) === index);
}

function getSwitchableBaitList(userData) {
  return [...getOwnedBuiltinBaitList(userData), ...getCustomBaitList(userData)];
}

function getNextAutoRenewBait(userData, currentBaitId = '') {
  const orderedBaits = getSwitchableBaitList(userData)
    .filter(bait => bait?.id && bait.id !== DEFAULT_BAIT_ID);
  if (!orderedBaits.length) return null;

  const currentIndex = orderedBaits.findIndex(bait => bait.id === currentBaitId);
  const ordered = currentIndex >= 0
    ? [...orderedBaits.slice(currentIndex + 1), ...orderedBaits.slice(0, currentIndex)]
    : orderedBaits;
  return ordered.find(bait => Number(userData?.baitInventory?.[bait.id] || 0) > 0) || null;
}

function parseAutoRenewBaitToggle(keyword = '') {
  const text = String(keyword || '')
    .trim()
    .toLowerCase()
    .replace(/[\s　:：,，。.!！?？、_\-\\/]+/g, '');
  if (!text || /^(?:状态|查看|查询|帮助|说明|怎么用|开关|当前|help)$/.test(text)) return null;
  if (/^(?:off|close|closed|false|0|no|n|关|关闭|关掉|关了|停用|禁用|取消|停止|不要|不用|不开|不续)/.test(text)) return false;
  if (/^(?:on|open|opened|true|1|yes|y|开|开启|打开|启用|启动|使用|要|需要|续|自动|自动续|自动续饵|续饵)/.test(text)) return true;
  return null;
}

function extractAutoRenewBaitKeyword(msg = '') {
  const text = String(msg || '').trim();
  const match = text.match(/^#\s*(?:自动\s*续\s*(?:鱼)?饵?|续\s*(?:鱼)?饵|(?:鱼饵|换饵)\s*自动\s*续(?:饵)?|自动\s*(?:换|补)\s*(?:鱼)?饵)\s*(.*)$/);
  return match ? match[1].trim() : text.replace(/^#\s*/, '').trim();
}

function getAutoRenewBaitUsageText() {
  return '格式：#自动续饵开 / #自动续饵关；也可用 #续饵 开 / #鱼饵自动续 关闭';
}

function getBaitPackText(bait) {
  const packSize = Math.max(1, Number(bait?.packSize || 1));
  const unitPrice = Number(bait?.price || 0);
  const costPerUse = unitPrice / packSize;
  if (bait?.lotteryOnly) return `祈愿限定，1包${packSize}份，库存按份消耗`;
  if (bait?.seasonal) return `${unitPrice}鱼蛋/包，1包${packSize}份，限时出售至${bait.seasonal.endDateExclusive}`;
  return `${unitPrice}鱼蛋/包，1包${packSize}份，约${costPerUse.toFixed(1)}鱼蛋/次`;
}

function isCustomBait(bait) {
  return Boolean(bait?.isCustom || bait?.sourceText || String(bait?.id || '').startsWith('custom_'));
}

function getLegacyCustomBaitName(bait) {
  const source = String(bait?.sourceText || '').trim();
  if (source) return `${source.slice(0, 8)}特调饵`;
  return bait?.name || bait?.id || '自定义鱼饵';
}

function getBaitDisplayName(bait) {
  if (!bait) return '未知鱼饵';
  if (!isCustomBait(bait)) return bait.name || bait.id || '未知鱼饵';
  const name = String(bait.name || '').trim();
  if (!name || /^手作鱼饵-[0-9A-Z]{4}$/i.test(name)) return getLegacyCustomBaitName(bait);
  return name;
}

function getBaitDisplayDescription(bait) {
  if (!bait) return '';
  if (!isCustomBait(bait)) return bait.description || '';
  return bait.description || '一份按私人配方拌出的定制鱼饵，气味层次复杂，适合试试不同手感。';
}

function getOwnedBaitsDisplaySummary(userData) {
  const entries = Object.entries(userData?.baitInventory || {})
    .filter(([, count]) => Number(count || 0) > 0)
    .map(([id, count]) => {
      const bait = userData?.customBaits?.[id] || BAIT_CATALOG[id] || SHOP_ITEMS[id] || { id, name: id };
      return `${getBaitDisplayName(bait)}x${count}`;
    });
  return entries.join('、');
}

function getSenderGroupDisplayName(e, fallback = '你') {
  const card = String(e?.sender?.card || '').trim();
  if (card) return card;
  const nickname = String(e?.sender?.nickname || '').trim();
  if (nickname) return nickname;
  return fallback;
}

function extractSafeDisplayName(member, userId = '') {
  const card = String(member?.card || '').trim();
  if (card) return card;
  const nickname = String(member?.nickname || member?.name || '').trim();
  if (nickname && nickname !== String(userId || '').trim()) return nickname;
  return '';
}

function getPickedGroupMember(e, targetUserId) {
  const userId = String(targetUserId || '').trim();
  if (!userId) return null;
  return e?.group?.pickMember?.(userId) || e?.bot?.pickMember?.(e?.group_id, userId) || null;
}

async function getSafeGroupMemberDisplayNameAsync(e, targetUserId, fallback = '某位群友') {
  const rawUserId = Array.isArray(targetUserId) ? targetUserId[0] : targetUserId;
  const userId = String(rawUserId || '').trim();
  if (!userId) return fallback;

  const pickedMember = getPickedGroupMember(e, userId);
  const cachedName = extractSafeDisplayName(pickedMember, userId);
  if (cachedName) return cachedName;

  if (typeof pickedMember?.getInfo === 'function') {
    try {
      const memberInfo = await pickedMember.getInfo();
      const memberName = extractSafeDisplayName(memberInfo, userId);
      if (memberName) return memberName;
    } catch {
      // 群成员资料读取失败时继续使用安全兜底，避免把 QQ 当昵称展示。
    }
  }

  const displayName = getDisplayNameForUser(e, userId);
  if (displayName && displayName !== userId) return displayName;
  return fallback;
}

async function getSafeLostItemOwnerNameAsync(e, foundItem = {}) {
  const ownerId = String(foundItem?.ownerId || '').trim();
  if (ownerId) {
    const displayName = await getSafeGroupMemberDisplayNameAsync(e, ownerId, '');
    if (displayName) return displayName;
  }

  const storedName = String(foundItem?.ownerName || '').trim();
  if (storedName && storedName !== ownerId && !/^\d{5,}$/.test(storedName)) return storedName;
  return '某位钓友';
}

function getBaitAcquireText(bait) {
  const packSize = Math.max(1, Number(bait?.packSize || 1));
  if (bait?.isDefault) return '售价：不可购买';
  if (bait?.lotteryOnly) return `获取：祈愿限定，1包${packSize}份，库存按份消耗`;
  if (bait?.seasonal) return `售价：${Number(bait?.price || 0)}鱼蛋 / 包，1包${packSize}份；限时出售至${bait.seasonal.endDateExclusive}`;
  return `售价：${Number(bait?.price || 0)}鱼蛋 / 包，1包${packSize}份`;
}

function getLotteryRewardMetaText(reward) {
  if (reward?.type !== 'bait') return '';
  const bait = BAIT_CATALOG[reward.id];
  if (!bait) return '';
  const packSize = Math.max(1, Math.floor(Number(bait.packSize || 1)));
  const packCount = Math.max(0, Math.floor(Number(reward.packCount || 0)));
  if (packCount > 0) {
    return `${packCount}包，每包${packSize}份，获得${packCount * packSize}份`;
  }
  const count = Math.max(1, Math.floor(Number(reward.count || 1)));
  return `${count}份，库存按份消耗`;
}

function getLotteryRewardPreviewMetaText(reward) {
  if (!reward) return '愿品内容以实际入账为准';
  if (reward.type === 'bait') return getLotteryRewardMetaText(reward) || '鱼饵会直接加入库存';
  if (reward.type === 'ticket') return `额外钓鱼券 +${Math.max(1, Math.floor(Number(reward.count || 1)))}`;
  if (reward.type === 'lottery_free_draw') return `免费祈愿 +${Math.max(1, Math.floor(Number(reward.count || 1)))}`;
  if (reward.type === 'coins') return '鱼蛋愿品，获得后会直接到账';
  return '愿品内容以实际入账为准';
}

function getLotteryRewardResultMetaText(reward, item = {}) {
  if (!reward) return '已完成本次祈愿';
  if (item.isGrandPrize) {
    if (reward.duplicate) return `你已经拥有它，这次折成 ${reward.compensationCoins || 0} 鱼蛋`;
    if (reward.type === 'rod') return '已加入鱼竿收藏';
    if (reward.type === 'special_item') return '特殊愿品已登记，会自动生效';
    return '限定愿品已入账';
  }
  if (reward.duplicate) return `重复愿品折成 ${reward.compensationCoins || 0} 鱼蛋`;
  if (reward.type === 'coins') return `到账 ${Number(reward.amount || 0)} 鱼蛋`;
  if (reward.type === 'bait') return getLotteryRewardMetaText(reward) || '鱼饵已加入库存';
  if (reward.type === 'ticket') return `钓鱼券 +${Math.max(1, Math.floor(Number(reward.count || 1)))}`;
  if (reward.type === 'lottery_free_draw') return `免费祈愿 +${Math.max(1, Math.floor(Number(reward.count || 1)))}`;
  if (reward.type === 'special_item') return '特殊愿品已登记，会自动生效';
  return '已发放到背包';
}

function getBaitDeliveryPool(dateKey = getTodayKey()) {
  return Object.values(BAIT_CATALOG)
    .filter(bait => bait?.id && !bait.isDefault && isSeasonalBaitActive(bait, dateKey) && Math.max(1, Math.floor(Number(bait.packSize || 0))) > 0);
}

function summarizeBaitDeliveryPacks(deliveries = []) {
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

function claimDailyBaitDelivery(userData, todayKey = getTodayKey()) {
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

function formatLotteryProbability(rate) {
  const percent = Number(rate || 0) * 100;
  if (!Number.isFinite(percent) || percent <= 0) return '0%';
  if (percent < 0.1) return `${percent.toFixed(3)}%`;
  if (percent < 1) return `${percent.toFixed(2)}%`;
  return `${percent.toFixed(1)}%`;
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

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
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

const PANEL_GROUP_THEMES = {
  lake: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.18)',
    title: '#115e59'
  },
  sky: {
    accent: '#2563eb',
    soft: 'rgba(37, 99, 235, 0.18)',
    title: '#1d4ed8'
  },
  amber: {
    accent: '#d97706',
    soft: 'rgba(217, 119, 6, 0.18)',
    title: '#b45309'
  },
  coral: {
    accent: '#e11d48',
    soft: 'rgba(225, 29, 72, 0.18)',
    title: '#be123c'
  },
  plum: {
    accent: '#7c3aed',
    soft: 'rgba(124, 58, 237, 0.18)',
    title: '#6d28d9'
  },
  slate: {
    accent: '#475569',
    soft: 'rgba(71, 85, 105, 0.18)',
    title: '#334155'
  },
  gold: {
    accent: '#ca8a04',
    soft: 'rgba(202, 138, 4, 0.18)',
    title: '#a16207'
  }
};

function buildPanelGroupStyle(themeName = 'slate') {
  const theme = PANEL_GROUP_THEMES[themeName] || PANEL_GROUP_THEMES.slate;
  return `--group-accent:${theme.accent};--group-accent-soft:${theme.soft};--group-title:${theme.title};`;
}

function applyGroupThemes(groups = [], themeNames = []) {
  return groups.map((group, index) => ({
    ...group,
    groupStyle: group.groupStyle || buildPanelGroupStyle(themeNames[index] || 'slate')
  }));
}

function joinTextParts(parts = [], separator = ' | ', fallback = '无') {
  const filtered = parts
    .map(part => String(part || '').trim())
    .filter(Boolean);
  return filtered.length ? filtered.join(separator) : fallback;
}

function getRarityCardTone(rarity) {
  if (rarity === EASTER_EGG_RARITY) return 'mystery';
  return ({
    common: 'common',
    uncommon: 'uncommon',
    rare: 'rare',
    epic: 'epic',
    legendary: 'legendary'
  })[rarity] || 'neutral';
}

function getFishCardTone(fish, locked = false) {
  if (locked) return 'locked';
  return getRarityCardTone(fish?.rarity);
}

function annotateFishLock(userData, fish) {
  if (!fish || typeof fish !== 'object') return fish;
  return { ...fish, locked: isFishLocked(userData, fish) };
}

function getSortedTankEntries(userData) {
  return getSortedTankWithIndex(userData?.fishTank || []).map((item, displayIndex) => ({
    ...item,
    displayIndex,
    locked: isFishLocked(userData, item.fish)
  }));
}

function resolveFishNameSelection(entries, fishName, duplicateIndex = 0, options = {}) {
  const { rarity = null, allowAmbiguous = false } = options;
  const normalizedName = String(fishName || '').trim();
  if (!normalizedName) return { error: '请输入鱼名。' };
  const matches = entries.filter(item =>
    item?.fish?.name === normalizedName &&
    (!rarity || item?.fish?.rarity === rarity)
  );
  if (!matches.length) {
    return { error: rarity ? `没有找到名为 ${normalizedName} 的 ${rarity} 鱼。` : `没有找到名为 ${normalizedName} 的鱼。` };
  }
  if (!allowAmbiguous && matches.length > 1 && duplicateIndex === 0) {
    return { error: `${normalizedName} 有 ${matches.length} 条，请写成 ${normalizedName}2 这种形式指定第几条。` };
  }
  const picked = matches[duplicateIndex];
  if (!picked) {
    return { error: `${normalizedName} 只有 ${matches.length} 条，无法选择第 ${duplicateIndex + 1} 条。` };
  }
  return { item: picked, matches };
}

function renderGridBadge(badgeText, overlayText = '') {
  const badge = escapePanelHtml(badgeText);
  const overlay = String(overlayText || '').trim();
  return (
    `<div class="help-grid-item-badge-stack">` +
    `<div class="help-grid-item-badge">${badge}</div>` +
    (overlay ? `<div class="help-grid-item-badge-overlay">${escapePanelHtml(overlay)}</div>` : '') +
    `</div>`
  );
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
        const toneClass = currentItem.tone ? ` help-grid-item-${currentItem.tone}` : '';
        return (
          `<div class="help-grid-item${toneClass}">` +
          renderGridBadge(currentBadge, currentItem.badgeOverlay) +
          `<div class="help-grid-item-title">${currentTitle}</div>` +
          `<div class="help-grid-item-desc">${currentDesc}</div>` +
          '</div>'
        );
      };

      if (item.fullWidth) {
        htmlParts.push('<div class="help-grid-row">');
        htmlParts.push(`<div class="help-grid-item help-grid-item-note">` +
          renderGridBadge(badge, item.badgeOverlay) +
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
      html,
      titleStyle: group.titleStyle || '',
      groupStyle: group.groupStyle || ''
    };
  });
}

function buildCardGridSections(groups = [], options = {}) {
  const badgePrefix = options.badgePrefix || '';
  const emptyPlaceholder = options.emptyPlaceholder || '';

  return groups.map(group => {
    const htmlParts = ['<div class="help-grid">'];
    const items = group.list || [];
    let visualIndex = 0;

    const renderItem = (item, badgeText) => {
      const title = escapePanelHtml(item.title || '');
      const desc = escapePanelHtml(item.desc || '');
      const meta = item.meta ? `<div class="help-grid-item-meta">${escapePanelHtml(item.meta)}</div>` : '';
      const toneClass = item.tone ? ` help-grid-item-${item.tone}` : '';
      return (
        `<div class="help-grid-item${toneClass}">` +
        renderGridBadge(badgeText, item.badgeOverlay) +
        `<div class="help-grid-item-title">${title}</div>` +
        `<div class="help-grid-item-desc">${desc}</div>` +
        meta +
        '</div>'
      );
    };

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const badge = item.badge || `${badgePrefix}${String(++visualIndex).padStart(2, '0')}`;

      if (item.fullWidth) {
        htmlParts.push('<div class="help-grid-row">');
        htmlParts.push(renderItem({ ...item, tone: item.tone || 'note' }, badge).replace('help-grid-item', 'help-grid-item help-grid-item-note'));
        htmlParts.push('</div>');
        continue;
      }

      const nextItem = items[i + 1];
      const canPair = nextItem && !nextItem.fullWidth;
      htmlParts.push('<div class="help-grid-row">');
      htmlParts.push(renderItem(item, badge));
      if (canPair) {
        const nextBadge = nextItem.badge || `${badgePrefix}${String(++visualIndex).padStart(2, '0')}`;
        htmlParts.push(renderItem(nextItem, nextBadge));
        i += 1;
      } else {
        htmlParts.push(`<div class="help-grid-item help-grid-item-empty" aria-hidden="true">${escapePanelHtml(emptyPlaceholder)}</div>`);
      }
      htmlParts.push('</div>');
    }

    htmlParts.push('</div>');

    return {
      type: 'help-grid',
      title: group.group,
      html: htmlParts.join(''),
      titleStyle: group.titleStyle || '',
      groupStyle: group.groupStyle || ''
    };
  });
}

function describeTrend(value, thresholds = [0.004, 0.012, 0.03, 0.06, 0.1]) {
  const numeric = Number(value || 0);
  const abs = Math.abs(numeric);
  const level =
    abs >= thresholds[4] ? '极大幅度'
      : abs >= thresholds[3] ? '大幅度'
        : abs >= thresholds[2] ? '较大幅度'
          : abs >= thresholds[1] ? '中幅度'
            : abs >= thresholds[0] ? '小幅度'
              : abs > 0 ? '微小幅度' : null;
  if (!level) return null;
  return { positive: numeric > 0, level };
}

function getRarityDeltaLevel(value, baseWeight = 0) {
  const numeric = Number(value || 0);
  const abs = Math.abs(numeric);
  if (abs < 0.0001) return 0;

  const base = Math.max(Math.abs(Number(baseWeight || 0)), 0.0001);
  const relative = abs / base;
  const absoluteLevel = abs >= 0.04 ? 3 : abs >= 0.02 ? 2 : abs >= 0.004 ? 1 : 0;
  const relativeLevel = relative >= 1 ? 3 : relative >= 0.2 ? 2 : relative >= 0.02 ? 1 : 0;
  return Math.max(absoluteLevel, relativeLevel);
}

function rarityBiasArrow(value, baseWeight = 0) {
  const level = getRarityDeltaLevel(value, baseWeight);
  if (!level) return '-';
  return (Number(value || 0) > 0 ? '↑' : '↓').repeat(level);
}

function getAdjustedRarityWeights(bias = {}) {
  const adjusted = {};
  for (const [rarity, weight] of Object.entries(rarityWeights)) {
    adjusted[rarity] = Math.max(0.0001, Number(weight || 0) + Number(bias?.[rarity] || 0));
  }
  const total = Object.values(adjusted).reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return {};
  return Object.fromEntries(Object.entries(adjusted).map(([rarity, weight]) => [rarity, weight / total]));
}

function rarityProbabilityDelta(rarity, bias = {}) {
  const adjusted = getAdjustedRarityWeights(bias);
  return Number(adjusted?.[rarity] || 0) - Number(rarityWeights?.[rarity] || 0);
}

function describeMultiplierDirection(value, thresholds = [0.015, 0.04, 0.08]) {
  const numeric = Number(value || 1) - 1;
  return describeTrend(numeric, thresholds);
}

function getRarityBiasLabel(rarity) {
  return rarity === EASTER_EGG_RARITY ? '彩蛋鱼比例' : `${rarity}鱼比例`;
}

function getRarityBiasTone(value, baseWeight = 0) {
  if (!getRarityDeltaLevel(value, baseWeight)) return 'neutral';
  return Number(value || 0) > 0 ? 'positive' : 'negative';
}

function hasRarityBiasValue(bias = {}) {
  return RARITY_ORDER.some(rarity => Number(bias?.[rarity] || 0) !== 0);
}

function buildRarityBiasEntries(bias = {}) {
  if (!hasRarityBiasValue(bias)) return [];
  return RARITY_ORDER.map(rarity => {
    const value = rarityProbabilityDelta(rarity, bias);
    const baseWeight = rarityWeights?.[rarity] || 0;
    const arrow = rarityBiasArrow(value, baseWeight);
    return {
      label: getRarityBiasLabel(rarity),
      arrow,
      tone: getRarityBiasTone(value, baseWeight),
      arrowTone: arrow === '-' ? 'flat' : value > 0 ? 'up' : 'down'
    };
  }).filter(entry => !(entry.label === getRarityBiasLabel(EASTER_EGG_RARITY) && entry.arrow === '-'));
}

function getRodWithTargetBias(rod, rodTarget = null) {
  if (!rodTarget || rod?.targetFishEffect?.type !== 'gold_humble') return rod;
  const targetBias = getGoldHumbleRarityBias(rod, rodTarget);
  const targetCatchRateBonus = getGoldHumbleCatchRateBonus(rod, rodTarget);
  if (!Object.keys(targetBias).length && targetCatchRateBonus === 0) return rod;
  return {
    ...rod,
    catchRateBonus: Number(rod.catchRateBonus || 0) + targetCatchRateBonus,
    rarityBias: mergeRarityBias(rod.rarityBias || {}, targetBias)
  };
}

function buildRodTraitEntries(rod, options = {}) {
  const effectiveRod = getRodWithTargetBias(rod, options.rodTarget);
  const entries = [];

  const catchRateTrend = describeTrend(effectiveRod?.catchRateBonus || 0, [0.003, 0.008, 0.018, 0.04, 0.07]);
  entries.push(catchRateTrend
    ? {
      text: `上鱼率${catchRateTrend.level}${catchRateTrend.positive ? '上升' : '下降'}`,
      tone: catchRateTrend.positive ? 'positive' : 'negative'
    }
    : { text: '上鱼率基本不变', tone: 'neutral' });

  const failProtectionTrend = describeTrend(effectiveRod?.failProtection || 0, [0.03, 0.08, 0.15, 0.25, 0.35]);
  if (failProtectionTrend) {
    entries.push({
      text: `护钩率${failProtectionTrend.level}${failProtectionTrend.positive ? '上升' : '下降'}`,
      tone: failProtectionTrend.positive ? 'positive' : 'negative'
    });
  }

  const waitTrend = describeMultiplierDirection(effectiveRod?.waitMultiplier || 1, [0.03, 0.08, 0.16, 0.26, 0.38]);
  if (waitTrend) {
    entries.push({
      text: `等口时间${waitTrend.level}${waitTrend.positive ? '变长' : '缩短'}`,
      tone: waitTrend.positive ? 'negative' : 'positive'
    });
  }

  const rarityBiasEntries = buildRarityBiasEntries(effectiveRod?.rarityBias || {});
  if (rarityBiasEntries.length) {
    entries.push({
      text: rarityBiasEntries.map(entry => `${entry.label}${entry.arrow}`).join(' '),
      tone: 'mixed',
      parts: rarityBiasEntries
    });
  }

  const sizeTrend = describeMultiplierDirection(effectiveRod?.sizeMultiplier || 1, [0.008, 0.02, 0.05, 0.09, 0.14]);
  if (sizeTrend) {
    entries.push({
      text: `尺寸表现${sizeTrend.level}${sizeTrend.positive ? '上升' : '下降'}`,
      tone: sizeTrend.positive ? 'positive' : 'negative'
    });
  }

  const weightTrend = describeMultiplierDirection(effectiveRod?.weightMultiplier || 1, [0.01, 0.03, 0.07, 0.12, 0.18]);
  if (weightTrend) {
    entries.push({
      text: `重量表现${weightTrend.level}${weightTrend.positive ? '上升' : '下降'}`,
      tone: weightTrend.positive ? 'positive' : 'negative'
    });
  }

  if (Number(effectiveRod?.minSizeRatio || 0) > 0 || Number(effectiveRod?.minWeightRatio || 0) > 0) {
    entries.push({ text: '巨物下限更稳，不容易出太小的个体', tone: 'positive' });
  }
  if (Number(effectiveRod?.baitPreserveChance || 0) > 0) {
    const preserveTrend = describeTrend(effectiveRod.baitPreserveChance, [0.03, 0.08, 0.15, 0.24, 0.34]);
    entries.push({
      text: `保饵能力${preserveTrend?.level || '微小幅度'}上升`,
      tone: 'positive'
    });
  }
  if (Number(effectiveRod?.catchCoinBonus || 0) > 0) entries.push({ text: '每次成功上鱼会顺带多捞一点鱼蛋', tone: 'positive' });
  if (Number(effectiveRod?.signalBonusCoins || 0) > 0) entries.push({ text: '命中鱼讯时收成会更亮眼', tone: 'positive' });
  if (Number(effectiveRod?.permanentDailyCasts || 0) > 0) entries.push({ text: '装备后每日可抛竿次数会增加', tone: 'positive' });
  if (Number(effectiveRod?.ownedPermanentDailyCasts || 0) > 0) entries.push({ text: '只要拥有这根竿，每日可抛竿次数就会增加', tone: 'positive' });
  if (rod?.targetFishEffect) entries.push({ text: '可指定单条目标鱼，也可指定整个稀有度', tone: 'positive' });
  if (rod?.targetFishEffect?.rewardCoinsByRarity) {
    const profile = options.rodTarget
      ? getGoldHumbleTargetProfile(rod.targetFishEffect, options.rodTarget.rarity, options.rodTarget)
      : null;
    entries.push({
      text: profile
        ? `当前目标命中奖励 +${profile.rewardCoins}鱼蛋`
        : '成功钓到指定目标时会获得额外鱼蛋奖励，整稀有度目标奖励较低',
      tone: 'positive'
    });
  }
  if (rod?.suppressExtraCoinBonuses) entries.push({ text: '目标检索生效时，其它额外鱼蛋收益会被压下去', tone: 'negative' });

  return entries;
}

function buildRodTraitLines(rod, options = {}) {
  return buildRodTraitEntries(rod, options).map(entry => entry.text);
}

function buildRodTraitHtml(rod, options = {}) {
  const entries = buildRodTraitEntries(rod, options);
  if (!entries.length) return '';

  const html = entries.map(entry => {
    if (entry.parts?.length) {
      const partsHtml = entry.parts.map(part => (
        `<span class="rod-trait-segment rod-trait-${part.tone}">` +
        `<span class="rod-trait-label rod-trait-${part.tone}">${escapePanelHtml(part.label)}</span>` +
        `<span class="rod-trait-arrow rod-trait-${part.tone} rod-trait-${part.arrowTone}">${escapePanelHtml(part.arrow)}</span>` +
        '</span>'
      )).join('');
      return `<div class="rod-trait-line rod-trait-mixed">${partsHtml}</div>`;
    }
    return `<div class="rod-trait-line rod-trait-${entry.tone}">${escapePanelHtml(entry.text)}</div>`;
  }).join('');

  return `<div class="rod-trait-list">${html}</div>`;
}

function buildBaitTraitEntries(bait) {
  const entries = [];

  if (Array.isArray(bait?.randomEffects) && bait.randomEffects.length) {
    entries.push({ text: '每次使用会随机获得一种节令小效果', tone: 'positive' });
  }
  if (bait?.activityEvent?.id === 'duanwu_quyuan' && isDuanwuEventActive()) {
    entries.push({ text: '端午活动中，空钩时有小概率触发屈原奇遇', tone: 'positive' });
  }

  const catchRateTrend = describeTrend(bait?.catchRateBonus || 0, [0.008, 0.025, 0.055, 0.11, 0.18]);
  entries.push(catchRateTrend
    ? {
      text: `上鱼率${catchRateTrend.level}${catchRateTrend.positive ? '上升' : '下降'}`,
      tone: catchRateTrend.positive ? 'positive' : 'negative'
    }
    : { text: '上鱼率基本不变', tone: 'neutral' });

  const rarityBiasEntries = buildRarityBiasEntries(bait?.rarityBias || {});
  if (rarityBiasEntries.length) {
    entries.push({
      text: rarityBiasEntries.map(entry => `${entry.label}${entry.arrow}`).join(' '),
      tone: 'mixed',
      parts: rarityBiasEntries
    });
  }

  const sizeTrend = describeMultiplierDirection(bait?.sizeMultiplier || 1, [0.01, 0.03, 0.06, 0.11, 0.16]);
  if (sizeTrend) {
    entries.push({
      text: `尺寸表现${sizeTrend.level}${sizeTrend.positive ? '上升' : '下降'}`,
      tone: sizeTrend.positive ? 'positive' : 'negative'
    });
  }

  const weightTrend = describeMultiplierDirection(bait?.weightMultiplier || 1, [0.012, 0.035, 0.075, 0.13, 0.2]);
  if (weightTrend) {
    entries.push({
      text: `重量表现${weightTrend.level}${weightTrend.positive ? '上升' : '下降'}`,
      tone: weightTrend.positive ? 'positive' : 'negative'
    });
  }

  if (Number(bait?.minSizeRatio || 0) > 0 || Number(bait?.minWeightRatio || 0) > 0) {
    entries.push({ text: '巨物下限更稳，不容易摸到太瘦小的个体', tone: 'positive' });
  }
  if (Number(bait?.baitPreserveChance || 0) > 0) {
    const preserveTrend = describeTrend(bait.baitPreserveChance, [0.03, 0.07, 0.13, 0.21, 0.3]);
    entries.push({
      text: `保饵能力${preserveTrend?.level || '微小幅度'}上升`,
      tone: 'positive'
    });
  }

  return entries;
}

function buildBaitTraitLines(bait) {
  return buildBaitTraitEntries(bait).map(entry => entry.text);
}

function buildBaitTraitHtml(bait) {
  const entries = buildBaitTraitEntries(bait);
  if (!entries.length) return '';

  const html = entries.map(entry => {
    if (entry.parts?.length) {
      const partsHtml = entry.parts.map(part => (
        `<span class="rod-trait-segment rod-trait-${part.tone}">` +
        `<span class="rod-trait-label rod-trait-${part.tone}">${escapePanelHtml(part.label)}</span>` +
        `<span class="rod-trait-arrow rod-trait-${part.tone} rod-trait-${part.arrowTone}">${escapePanelHtml(part.arrow)}</span>` +
        '</span>'
      )).join('');
      return `<div class="rod-trait-line rod-trait-mixed">${partsHtml}</div>`;
    }
    return `<div class="rod-trait-line rod-trait-${entry.tone}">${escapePanelHtml(entry.text)}</div>`;
  }).join('');

  return `<div class="rod-trait-list">${html}</div>`;
}

function buildEquipCardItem({ badge, title, desc, meta, tone = 'neutral' }) {
  return { badge, title, desc, meta, tone };
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
  const normalizedText = text.replace(/(?:鱼|稀有度|品质|级)$/u, '');
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
  return aliases[text] || aliases[normalizedText] || null;
}

function getCompensateFishUsage() {
  return '格式示例：#补鱼 @某人 rare 鳗鱼 80 3.5、#补鱼 rare 鳗鱼 @某人、#补鱼 @某人 鳗鱼；长度和重量可省略。';
}

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeCommandText(text = '') {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

function parsePositiveQuantity(value, fallback = 1) {
  const quantity = Number(value || fallback);
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  return quantity;
}

function stripTrailingCustomBaitQuantity(text = '') {
  const normalized = normalizeCommandText(text);
  const patterns = [
    /^(.*?)\s*[*xX×]\s*(\d{1,3})(?:包|份|个|组)?$/,
    /^(.*?)\s+(\d{1,3})(?:包|份|个|组)$/,
    /^(.*?)\s+(?:包|份|个|组)(\d{1,3})$/
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const sourceText = normalizeCommandText(match[1]);
    const quantity = parsePositiveQuantity(match[2]);
    if (sourceText && quantity) return { sourceText, quantity };
  }
  return { sourceText: normalized, quantity: 1 };
}

function parseCustomBaitPurchaseKeyword(keyword = '') {
  const text = normalizeCommandText(keyword);
  if (!text) return null;
  const pattern = CUSTOM_BAIT_PURCHASE_PATTERN;
  const prefixPattern = new RegExp(`^(\\d{1,3})\\s*(?:包|份|个|组)?\\s*(?:[*xX×]\\s*)?${pattern}\\s*(.+)$`);
  const compactPrefixPattern = new RegExp(`^(\\d{1,3})\\s*[*xX×]\\s*${pattern}\\s*(.+)$`);
  const suffixPatterns = [
    new RegExp(`^${pattern}\\s*[*xX×]\\s*(\\d{1,3})\\s*(?:包|份|个|组)?\\s*(.+)$`),
    new RegExp(`^${pattern}\\s*(\\d{1,3})\\s*(?:包|份|个|组)\\s*(.+)$`)
  ];
  const normalPattern = new RegExp(`^${pattern}\\s*(.+)$`);
  const matches = [
    text.match(prefixPattern),
    text.match(compactPrefixPattern),
    ...suffixPatterns.map(pattern => text.match(pattern))
  ];

  for (const match of matches) {
    if (!match) continue;
    const quantity = parsePositiveQuantity(match[1]);
    const sourceText = normalizeCommandText(match[2]);
    if (!quantity || !sourceText) return null;
    return { sourceText, quantity };
  }

  const normalMatch = text.match(normalPattern);
  if (!normalMatch) return null;
  const trailing = stripTrailingCustomBaitQuantity(normalMatch[1]);
  if (!trailing.sourceText || !trailing.quantity) return null;
  return trailing;
}

function isAllDetailsKeyword(keyword = '') {
  return ALL_DETAILS_KEYWORD_REG.test(String(keyword || '').trim());
}

function getOwnedRodDetailsList(userData) {
  const owned = new Set(userData?.rodsOwned || []);
  const rods = Object.values(ROD_CATALOG)
    .filter(Boolean)
    .filter(rod => rod.id === DEFAULT_ROD_ID || owned.has(rod.id));
  return rods;
}

function getOwnedBaitDetailsList(userData) {
  const ownedBuiltinBaits = Object.values(BAIT_CATALOG)
    .filter(item => !item.isDefault)
    .filter(item => Number(userData?.baitInventory?.[item.id] || 0) > 0);
  return [BAIT_CATALOG.plain, ...ownedBuiltinBaits, ...getCustomBaitList(userData)]
    .filter(Boolean)
    .filter((bait, index, arr) => arr.findIndex(item => item.id === bait.id) === index);
}

function buildTraitSummary(lines = [], fallback = '暂无明显词条') {
  return lines.filter(Boolean).slice(0, 3).join('；') || fallback;
}

function normalizeFishTemplateName(name = '') {
  const text = String(name || '').trim();
  if (!text) return '';
  return legacyFishAliases?.[text] || text;
}

function findFishTemplatesByName(name = '') {
  const normalized = normalizeFishTemplateName(name);
  if (!normalized) return [];
  return Object.entries(fishTypes)
    .filter(([, list]) => Array.isArray(list) && list.some(item => item.name === normalized))
    .map(([rarity]) => ({ rarity, template: fishTemplateByName?.[normalized] || null }))
    .filter(item => item.template);
}

function rollXianyuRecycleReward() {
  return Math.random() < 0.01
    ? 200
    : Math.floor(Math.random() * 16) + 5;
}

function rollXianyuLostItemRecycleReward() {
  return Math.floor(Math.random() * 11) + 20;
}

function fillMessageTemplate(template = '', data = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(data?.[key] ?? ''));
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
        { reg: '^#(?:设置)?钓鱼(?:每日)?刷新(?:时间|小时)?\\s*.*$', fnc: 'setDailyResetHour' },
        { reg: '^#(?:钓鱼)?分段(?:式)?(?:返还|次数|钓鱼)?\\s*.*$', fnc: 'toggleSegmentedCastReturn' },
        { reg: '^#重置钓鱼次数\\s*(全体|全部|@?.*)?$', fnc: 'resetFishingCount' },
        { reg: '^#钓鱼次数$', fnc: 'checkFishingLimit' },
        { reg: '^#查看鱼缸(?:\\s*.*)?$', fnc: 'checkFishTank' },
        { reg: '^#彩蛋收藏$', fnc: 'checkEasterEggCollection' },
        { reg: '^#切换彩蛋\\s+.+$', fnc: 'scheduleActiveEasterEgg' },
        { reg: '^#钓鱼祈愿(?:大奖|目标|切换|选择)\\s*.*$', fnc: 'setFishingLotteryGrandPrize' },
        { reg: '^#钓鱼(?:祈愿(?:\\s*\\d{0,2}|\\s*(?:十|\\d{1,2})连|清单|列表|概率|说明)?|(?:十|\\d{1,2})连)$', fnc: 'handleFishingLottery' },
        { reg: '^#(?:金谦指定|金谦目标)\\s*.*$', fnc: 'setGoldHumbleRodTarget' },
        { reg: '^#升级鱼缸\\s+(legendary|epic)\\s+.+', fnc: 'upgradeFishTank' },
        { reg: '^#放生鱼\\s+\\d+(?:\\s+.*)?$', fnc: 'releaseFish' },
        { reg: '^#(?:赠鱼|赠渔|送鱼)\\s*.+$', fnc: 'giftFish' },
        { reg: '^#锁定鱼\\s*.+$', fnc: 'lockFishCommand' },
        { reg: '^#解锁鱼\\s*.+$', fnc: 'unlockFishCommand' },
        { reg: '^#炼竿预览.*$', fnc: 'previewLegendaryRod' },
        { reg: '^#炼竿.*$', fnc: 'craftLegendaryRod' },
        { reg: '^#打窝', fnc: 'addBait' },
        { reg: '^#同步鱼缸$', fnc: 'syncAllFishTanks' },
        { reg: '^#修复鱼数据$', fnc: 'repairFishData' },
        { reg: '^#(鱼市|售鱼)(.*)$', fnc: 'handleMarketCommand' },
        { reg: '^#鱼竿(?:详情|属性)\\s*.+$', fnc: 'showRodDetailsCommand' },
        { reg: '^#鱼饵(?:详情|属性)\\s*.+$', fnc: 'showBaitDetailsCommand' },
        { reg: '^#\\s*(?:自动\\s*续\\s*(?:鱼)?饵?|续\\s*(?:鱼)?饵|(?:鱼饵|换饵)\\s*自动\\s*续(?:饵)?|自动\\s*(?:换|补)\\s*(?:鱼)?饵)\\s*.*$', fnc: 'toggleAutoRenewBait' },
        { reg: '^#(鱼竿|换竿|换杆)(.*)$', fnc: 'handleRodCommand' },
        { reg: '^#(鱼饵|换饵)(.*)$', fnc: 'handleBaitCommand' },
        { reg: '^#限时鱼讯$', fnc: 'showDailySignal' },
        { reg: '^#钓鱼成就$', fnc: 'showAchievements' },
        { reg: '^#鱼蛋补偿\\s*.*$', fnc: 'compensateFishCoins' },
        { reg: '^#补鱼.*$', fnc: 'compensateFish' },
        { reg: '^#强制刷新钓鱼日$', fnc: 'forceRefreshFishingDay' },
        { reg: '^#钓鱼更新$', fnc: 'updateFishPlugin' },
        { reg: '^#钓鱼更新代理(?:\\s*.*)?$', fnc: 'setFishUpdateProxy' },
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
    this.timeRuntime = getTimeRuntimeInfo();
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
      world.lastDailyResetDate = getFishingDayKey(this.config);
    }
    ensureDailySignal(world, this.fishTypes, getFishingDayKey(this.config));
    saveWorldState(world);
    return world;
  }

  loadData() {
    this.ensureDailyResetIfNeeded();
    const data = loadFishData();
    if (normalizeAllUsers(data)) saveFishData(data);
    return data;
  }

  resetDailyState(targetDate = getFishingDayKey(this.config)) {
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
    ensureDailySignal(world, this.fishTypes, targetDate);
    saveWorldState(world);
  }

  ensureDailyResetIfNeeded() {
    const today = getFishingDayKey(this.config);
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
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  async getGitHead(repoDir, short = true) {
    const args = ['git', '-C', repoDir, 'rev-parse'];
    if (short) args.push('--short');
    args.push('HEAD');
    const ret = await Bot.exec(args, { quiet: true });
    if (ret.error) return '';
    return ret.stdout.trim();
  }

  async gitExec(args, options = {}) {
    return Bot.exec(['git', '-C', __dirname, ...args], options);
  }

  normalizeUpdateProxyInput(input = '') {
    const text = String(input || '').trim();
    if (!text) return '';
    if (/^(关闭|关|off|disable|disabled|none|null|clear|reset)$/i.test(text)) return '';
    if (!/^https?:\/\//i.test(text)) return null;
    return text.replace(/\s+/g, '').replace(/\/+$/, '/');
  }

  getFishUpdateProxy() {
    const proxy = this.config?.[FISH_PLUGIN_UPDATE_PROXY_CONFIG_KEY];
    return typeof proxy === 'string' ? proxy.trim() : '';
  }

  getFishUpdateRepoUrl(repoUrl = FISH_PLUGIN_REPO) {
    const proxy = this.getFishUpdateProxy();
    if (!proxy) return repoUrl;
    if (proxy.includes('{url}')) return proxy.replaceAll('{url}', repoUrl);
    if (proxy.includes('{repo}')) return proxy.replaceAll('{repo}', repoUrl);
    if (/github\.com[/:].*Fish-Plugin(?:\.git)?/i.test(proxy)) return proxy.replace(/\/+$/, '');
    return `${proxy.replace(/\/+$/, '')}/${repoUrl}`;
  }

  getFishUpdateProxyText() {
    const proxy = this.getFishUpdateProxy();
    return proxy ? `当前更新代理：${proxy}` : '当前更新代理：未启用，使用 GitHub 直连。';
  }

  async getCurrentBranch(repoDir = __dirname) {
    const ret = await Bot.exec(['git', '-C', repoDir, 'branch', '--show-current'], { quiet: true });
    if (ret.error) return '';
    return ret.stdout.trim();
  }

  async getRemoteNameForBranch(repoDir = __dirname, branch = '') {
    if (!branch) return '';
    const ret = await Bot.exec(['git', '-C', repoDir, 'config', `branch.${branch}.remote`], { quiet: true });
    if (ret.error) return '';
    return ret.stdout.trim();
  }

  async getRemoteTrackingRef(repoDir = __dirname) {
    const branch = await this.getCurrentBranch(repoDir);
    const remote = await this.getRemoteNameForBranch(repoDir, branch);
    if (!branch || !remote) return '';
    return `${remote}/${branch}`;
  }

  async getDefaultRemoteName(repoDir = __dirname) {
    const branch = await this.getCurrentBranch(repoDir);
    const trackingRemote = await this.getRemoteNameForBranch(repoDir, branch);
    if (trackingRemote) return trackingRemote;
    const ret = await Bot.exec(['git', '-C', repoDir, 'remote'], { quiet: true });
    if (ret.error) return 'origin';
    return ret.stdout.split(/\r?\n/).map(item => item.trim()).filter(Boolean)[0] || 'origin';
  }

  async fetchRemote(repoDir = __dirname) {
    const remote = await this.getDefaultRemoteName(repoDir);
    const repoUrl = this.getFishUpdateRepoUrl();
    return Bot.exec(['git', '-C', repoDir, '-c', `remote.${remote}.url=${repoUrl}`, 'fetch', remote, '--prune'], { quiet: true });
  }

  async getRemoteHead(repoDir = __dirname, short = true) {
    const trackingRef = await this.getRemoteTrackingRef(repoDir);
    if (!trackingRef) return '';
    const args = ['git', '-C', repoDir, 'rev-parse'];
    if (short) args.push('--short');
    args.push(trackingRef);
    const ret = await Bot.exec(args, { quiet: true });
    if (ret.error) return '';
    return ret.stdout.trim();
  }

  async getGitDirtyTrackedFiles(repoDir) {
    const ret = await Bot.exec(['git', '-C', repoDir, 'status', '--porcelain', '--untracked-files=no'], { quiet: true });
    if (ret.error) throw ret.error;
    return ret.stdout
      .split(/\r?\n/)
      .map(line => line.trimEnd())
      .filter(Boolean)
      .map(line => {
        const rawPath = line.slice(3).trim();
        const normalized = rawPath.includes(' -> ')
          ? rawPath.split(' -> ').pop().trim()
          : rawPath;
        return normalized.replace(/\\/g, '/');
      })
      .filter(Boolean);
  }

  shouldPreserveSelfUpdatePath(file) {
    const normalized = file.split(path.sep).join('/');
    return SELF_UPDATE_PRESERVE_PATHS.some(reg => reg.test(normalized));
  }

  backupUserData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, USER_BACKUP_DIR, timestamp);
    const copiedFiles = [];

    for (const file of USER_BACKUP_FILES) {
      const sourcePath = path.join(__dirname, file);
      if (!fs.existsSync(sourcePath)) continue;
      const targetPath = path.join(backupDir, file.replace(/^fishdata\//, ''));
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
      copiedFiles.push(file);
    }

    if (!copiedFiles.length) return '';

    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify({
      createdAt: new Date().toISOString(),
      copiedFiles
    }, null, 2), 'utf8');

    return backupDir;
  }

  backupSelfUpdateFiles(files) {
    const normalizedFiles = [...new Set(files.map(file => file.replace(/\\/g, '/')).filter(Boolean))];
    if (!normalizedFiles.length) return '';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, SELF_UPDATE_BACKUP_DIR, timestamp);
    const copiedFiles = [];
    const missingFiles = [];

    for (const file of normalizedFiles) {
      const sourcePath = path.join(__dirname, file);
      if (!fs.existsSync(sourcePath)) {
        missingFiles.push(file);
        continue;
      }

      const targetPath = path.join(backupDir, file);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
      copiedFiles.push(file);
    }

    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify({
      createdAt: new Date().toISOString(),
      repo: FISH_PLUGIN_REPO,
      copiedFiles,
      missingFiles
    }, null, 2), 'utf8');

    return backupDir;
  }

  removeGitTrackedFiles(targetDir, files) {
    for (const file of files) {
      if (this.shouldPreserveSelfUpdatePath(file)) continue;
      const targetPath = path.join(targetDir, file);
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      }
    }
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
      const repoUrl = this.getFishUpdateRepoUrl();
      const cloneRet = await Bot.exec(['git', 'clone', '--depth=1', repoUrl, tempDir]);
      if (cloneRet.error) return cloneRet;
      const trackedFiles = await this.getGitTrackedFiles(tempDir);
      const currentTrackedFiles = await this.getGitTrackedFiles(__dirname).catch(() => []);
      const dirtyFiles = await this.getGitDirtyTrackedFiles(__dirname).catch(() => []);
      const backupDir = this.backupSelfUpdateFiles(dirtyFiles);
      const userBackupDir = this.backupUserData();
      const staleFiles = currentTrackedFiles.filter(file => !trackedFiles.includes(file));
      const previousHead = await this.getGitHead(__dirname);
      const latestHead = await this.getGitHead(tempDir);

      this.removeGitTrackedFiles(__dirname, staleFiles);
      fs.rmSync(path.join(__dirname, '.git'), { recursive: true, force: true });
      fs.cpSync(path.join(tempDir, '.git'), path.join(__dirname, '.git'), { recursive: true, force: true });
      this.copyGitTrackedFiles(tempDir, __dirname, trackedFiles);
      const statusText = previousHead && latestHead && previousHead === latestHead
        ? `已校正本地文件，当前版本 ${latestHead}`
        : `已同步到最新版本 ${latestHead || ''}`.trim();
      const backupText = backupDir ? `\n已备份被覆盖的本地文件：${backupDir}` : '';
      const userBackupText = userBackupDir ? `\n已备份用户数据：${userBackupDir}` : '';
      return {
        stdout: `已从 ${repoUrl} 获取最新代码。\n${statusText}${backupText}${userBackupText}`,
        stderr: '',
        meta: {
          backupDir,
          userBackupDir,
          dirtyFiles,
          previousHead,
          latestHead
        }
      };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  async updateFishPlugin(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能更新钓鱼插件。');
      return false;
    }

    if (fishPluginUpdating) {
      await this.reply('Fish-plugin 正在更新中，请稍后再试。');
      return false;
    }

    fishPluginUpdating = true;
    try {
      await this.reply('开始更新 Fish-plugin，请稍后。');

      const currentHead = await this.getGitHead(__dirname);
      const fetchRet = await this.fetchRemote(__dirname);
      if (fetchRet.error) {
        const fetchOutput = [fetchRet.stdout, fetchRet.stderr].filter(Boolean).join('\n').trim();
        await this.reply(`Fish-plugin 更新失败：\n${fetchRet.error.message}${fetchOutput ? `\n${fetchOutput}` : ''}`);
        return false;
      }

      const remoteHead = await this.getRemoteHead(__dirname);
      const dirtyFiles = await this.getGitDirtyTrackedFiles(__dirname).catch(() => []);
      const hasRemoteUpdate = Boolean(currentHead && remoteHead && currentHead !== remoteHead);

      if (!hasRemoteUpdate && dirtyFiles.length === 0) {
        await this.reply(`Fish-plugin 已是最新版。\n当前版本：${currentHead || remoteHead || '未知版本'}`);
        return true;
      }

      if (dirtyFiles.length === 0 && hasRemoteUpdate) {
        await this.reply(`检测到新版本 ${currentHead || '未知版本'} -> ${remoteHead}，正在尝试标准更新。`);
        const trackingRef = await this.getRemoteTrackingRef(__dirname);
        const pullRet = trackingRef
          ? await this.gitExec(['merge', '--ff-only', trackingRef])
          : { error: new Error('未找到当前分支的远端跟踪分支，无法标准更新。'), stdout: '', stderr: '' };
        const pullOutput = [pullRet.stdout, pullRet.stderr].filter(Boolean).join('\n').trim();
        if (!pullRet.error) {
          const userBackupDir = this.backupUserData();
          const userBackupText = userBackupDir ? `\n已备份用户数据：${userBackupDir}` : '';
          await this.reply(`Fish-plugin 更新完成。\n${pullOutput || `已更新到 ${remoteHead}`}${userBackupText}\n正在重启机器人以应用改动。`);
          const restartRet = await Bot.restart();
          if (restartRet?.error) {
            await this.reply(`重启失败：\n${Bot.String(restartRet)}`);
            return false;
          }
          return true;
        }
      }

      const dirtyTip = dirtyFiles.length
        ? `检测到 ${dirtyFiles.length} 个本地改动，改为安全更新模式。`
        : '标准更新未成功，改为安全更新模式。';
      await this.reply(`${dirtyTip}\n正在同步远端文件，并自动备份本地改动与用户数据。`);

      const reinstallRet = await this.reinstallFishPluginFromGithub();
      const output = [reinstallRet.stdout, reinstallRet.stderr].filter(Boolean).join('\n').trim();
      if (reinstallRet.error) {
        await this.reply(`Fish-plugin 更新失败：\n${reinstallRet.error.message}${output ? `\n${output}` : ''}`);
        return false;
      }

      await this.reply(`Fish-plugin 更新完成。\n${output}\n正在重启机器人以应用改动。`);
      const restartRet = await Bot.restart();
      if (restartRet?.error) {
        await this.reply(`重启失败：\n${Bot.String(restartRet)}`);
        return false;
      }
      return true;
    } finally {
      fishPluginUpdating = false;
    }
  }

  async setFishUpdateProxy(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能设置钓鱼更新代理。');
      return false;
    }

    const raw = String(e.msg || '').replace(/^#钓鱼更新代理\s*/u, '').trim();
    if (!raw) {
      await this.reply(
        `${this.getFishUpdateProxyText()}\n` +
        '设置示例：#钓鱼更新代理 https://gh-proxy.com/\n' +
        '也支持完整模板：#钓鱼更新代理 https://gh-proxy.com/{url}\n' +
        '关闭代理：#钓鱼更新代理关闭'
      );
      return true;
    }

    const normalized = this.normalizeUpdateProxyInput(raw);
    if (normalized === null) {
      await this.reply('代理地址格式不正确，请使用 http:// 或 https:// 开头，例如：#钓鱼更新代理 https://gh-proxy.com/');
      return false;
    }

    if (!normalized) {
      delete this.config[FISH_PLUGIN_UPDATE_PROXY_CONFIG_KEY];
      saveConfig(this.config);
      await this.reply('已关闭 Fish-plugin 更新代理，后续 #钓鱼更新 将使用 GitHub 直连。');
      return true;
    }

    this.config[FISH_PLUGIN_UPDATE_PROXY_CONFIG_KEY] = normalized;
    saveConfig(this.config);
    await this.reply(
      `已设置 Fish-plugin 更新代理：${normalized}\n` +
      `实际拉取地址示例：${this.getFishUpdateRepoUrl()}`
    );
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
    const text = String(msg || '').replace(/^#鱼蛋补偿\s*/, '').trim();
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
    text = text
      .replace(/^(?:给|补给|补到|发给)\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return { error: `请填写鱼名，${getCompensateFishUsage()}` };

    let tokens = text
      .split(/\s+/)
      .filter(Boolean)
      .filter(token => !COMPENSATE_COMMAND_FILLER_TOKENS.has(token));
    text = tokens.join(' ').trim();
    if (!text) return { error: `请填写鱼名，${getCompensateFishUsage()}` };

    const rarityTokenIndex = tokens.findIndex(token => normalizeRarityKeyword(token));
    let rarity = rarityTokenIndex >= 0 ? normalizeRarityKeyword(tokens[rarityTokenIndex]) : null;
    if (rarityTokenIndex >= 0) tokens.splice(rarityTokenIndex, 1);

    const numberIndexes = tokens
      .map((token, index) => ({ token, index }))
      .filter(item => /^\d+(?:\.\d+)?$/.test(item.token));
    if (numberIndexes.length === 1 || numberIndexes.length > 2) {
      return { error: `长度和重量需要同时填写。${getCompensateFishUsage()}` };
    }
    const sizeProvided = numberIndexes.length === 2;
    const length = sizeProvided ? Number(numberIndexes[0].token) : null;
    const weight = sizeProvided ? Number(numberIndexes[1].token) : null;
    if (sizeProvided && (!Number.isFinite(length) || !Number.isFinite(weight) || length < 0 || weight < 0)) {
      return { error: '长度和重量需要是非负数字。' };
    }

    const fishName = normalizeFishTemplateName(
      tokens
        .filter(token => !/^\d+(?:\.\d+)?$/.test(token))
        .join(' ')
    ).trim();
    if (!fishName) return { error: `请填写鱼名，${getCompensateFishUsage()}` };

    const candidates = findFishTemplatesByName(fishName);
    if (!rarity) {
      if (candidates.length === 1) {
        rarity = candidates[0].rarity;
      } else if (candidates.length > 1) {
        return { error: `鱼名 ${fishName} 存在多个稀有度版本，请补充 rare/common 等稀有度。${getCompensateFishUsage()}` };
      }
    }
    if (!rarity) return { error: `请指定稀有度：common / uncommon / rare / epic / legendary / ？。${getCompensateFishUsage()}` };

    const template = (this.fishTypes[rarity] || []).find(item => item.name === fishName);
    if (!template) {
      if (candidates.length === 1) {
        return { error: `${fishName} 实际属于 ${candidates[0].rarity}，不是 ${rarity}。` };
      }
      if (candidates.length > 1) {
        return { error: `${fishName} 目前可用稀有度：${candidates.map(item => item.rarity).join(' / ')}，不是 ${rarity}。` };
      }
      return { error: `鱼池里没有 ${rarity} 鱼：${fishName}` };
    }

    const fish = sizeProvided
      ? { name: fishName, rarity, length: Number(length.toFixed(1)), weight: Number(weight.toFixed(2)) }
      : createFishFromTemplate(template, rarity);
    return { targetUserId, fish };
  }

  parseGiftFishCommand(e) {
    let text = String(e?.msg || '').replace(/^#(?:赠鱼|赠渔|送鱼)\s*/i, '').trim();
    const targetUserId = getTargetUserId(e);
    if (!targetUserId) return { error: '请@群友或输入QQ号，例如：#赠鱼 @某人 1 / #赠鱼 1 @某人 / #赠鱼 @某人 虹鳟2' };

    text = text
      .replace(/\[CQ:at,qq=\d+\]/g, ' ')
      .replace(/@\d{5,}\b/g, ' ')
      .replace(/\b\d{5,}\b/g, match => (match === String(targetUserId) ? ' ' : match))
      .replace(/[，,;；|/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    text = text
      .replace(/^(?:把|给|送给|发给|转给)\s*/g, '')
      .replace(/\s*(?:给到|送给|发给|转给|给)\s*$/g, '')
      .trim();

    if (e?.at) {
      text = text.replace(new RegExp(`\\b${escapeRegExp(String(e.at))}\\b`, 'g'), ' ').replace(/\s+/g, ' ').trim();
    }

    const body = text
      .split(/\s+/)
      .filter(Boolean)
      .filter(token => !GIFT_COMMAND_FILLER_TOKENS.has(token))
      .join(' ')
      .trim();

    if (!body) {
      return { error: '请写要赠送的鱼缸序号或鱼名，例如：#赠鱼 @某人 3 / #赠鱼 3 @某人 / #赠鱼 @某人 虹鳟2' };
    }

    return {
      targetUserId,
      selector: this.parseTankFishSelector(body)
    };
  }

  getRodByKeyword(keyword) {
    const text = String(keyword || '').trim();
    return Object.values(ROD_CATALOG).find(rod => rod.id === text || rod.name === text || rod.aliases?.includes(text)) || null;
  }

  getBaitByKeyword(userData, keyword) {
    const text = String(keyword || '').trim();
    return userData?.customBaits?.[text] ||
      Object.values(userData?.customBaits || {}).find(item =>
        item.id === text ||
        item.name === text ||
        item.displayName === text ||
        getBaitDisplayName(item) === text ||
        item.sourceText === text
      ) ||
      Object.values(BAIT_CATALOG).find(item => item.id === text || item.name === text || item.aliases?.includes(text)) ||
      null;
  }

  parseTankFishSelector(text = '') {
    const body = String(text || '')
      .replace(/^#?(?:锁定鱼|解锁鱼)\s*/i, '')
      .replace(/^鱼缸\s*/i, '')
      .trim();
    if (!body) return null;
    if (/^\d{1,3}$/.test(body)) {
      return { mode: 'tank_index', index: Number(body) - 1 };
    }
    const match = body.match(/^(.*?)(\d{1,3})?$/);
    const fishName = String(match?.[1] || '').trim();
    const duplicateIndex = match?.[2] ? Number(match[2]) - 1 : 0;
    if (!fishName) return null;
    return { mode: 'tank_name', fishName, duplicateIndex };
  }

  resolveTankFishSelection(userData, target) {
    if (!target) return { error: '请输入鱼缸序号，或鱼名。' };
    const sortedEntries = getSortedTankEntries(userData);
    if (target.mode === 'tank_index') {
      const picked = sortedEntries[target.index];
      if (!picked) {
        return { error: '鱼缸序号不存在，请先用 #查看鱼缸 确认序号。' };
      }
      return picked;
    }
    const resolved = resolveFishNameSelection(sortedEntries, target.fishName, target.duplicateIndex);
    if (resolved.error) return resolved;
    return resolved.item;
  }

  getLockedFishMessage(fish, actionText = '操作') {
    return `${fish?.name || '这条鱼'} 已被锁定，解锁前不能${actionText}。`;
  }

  async toggleFishLock(e, shouldLock) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    normalizeUserData(userData);
    if (!userData.fishTank?.length) {
      await this.reply(`${userDisplay}\n你的鱼缸是空的，没有可以${shouldLock ? '锁定' : '解锁'}的鱼。`);
      return;
    }
    const target = this.parseTankFishSelector(e.msg);
    if (!target) {
      await this.reply(`${userDisplay}\n请输入鱼缸序号，或鱼名。\n例如：#锁定鱼 3 / #锁定鱼 虹鳟2 / #解锁鱼 3`);
      return;
    }
    const resolved = this.resolveTankFishSelection(userData, target);
    if (resolved.error) {
      await this.reply(`${userDisplay}\n${resolved.error}`);
      return;
    }
    const fish = resolved.fish;
    const changed = shouldLock
      ? lockFishById(userData, fish.fishId)
      : unlockFishById(userData, fish.fishId);
    const lockedCount = getLockedFishIds(userData).length;
    saveFishData(data);
    if (!changed) {
      await this.reply(`${userDisplay}\n${fish.name}（鱼缸序号 ${resolved.displayIndex + 1}）当前已经是${shouldLock ? '锁定' : '未锁定'}状态。`);
      return;
    }
    await this.reply(`${userDisplay}\n已${shouldLock ? '锁定' : '解锁'} ${fish.name}（鱼缸序号 ${resolved.displayIndex + 1}，${fish.rarity}）。\n当前锁定鱼：${lockedCount} 条。`);
  }

  async lockFishCommand(e) {
    await this.toggleFishLock(e, true);
  }

  async unlockFishCommand(e) {
    await this.toggleFishLock(e, false);
  }

  resolveLegendaryCraftSelection(userData, target, options = {}) {
    const { allowLocked = false } = options;
    if (!target) return { error: '请输入鱼缸序号，或 legendary 鱼名。' };

    let originalIndex = null;
    let fish = null;
    let displayIndex = null;
    if (target.mode === 'tank_index') {
      const picked = this.resolveTankFishSelection(userData, target);
      if (picked.error) return picked;
      originalIndex = picked.originalIndex;
      displayIndex = picked.displayIndex;
      fish = picked.fish;
    } else {
      const sortedEntries = getSortedTankEntries(userData).filter(item => item.fish?.rarity === 'legendary');
      const resolved = resolveFishNameSelection(sortedEntries, target.fishName, target.duplicateIndex);
      if (resolved.error) {
        return { error: resolved.error.replace(`名为 ${target.fishName} 的鱼`, `名为 ${target.fishName} 的 legendary 鱼`) };
      }
      originalIndex = resolved.item.originalIndex;
      displayIndex = resolved.item.displayIndex;
      fish = resolved.item.fish;
    }

    if (!fish || fish.rarity !== 'legendary') {
      return { error: '只有 legendary 鱼可以拿来炼制特殊鱼竿。' };
    }
    if (!allowLocked && isFishLocked(userData, fish)) {
      return { error: this.getLockedFishMessage(fish, '炼竿') };
    }

    const recipe = Object.values(LEGENDARY_ROD_RECIPES).find(item => item.sourceLegendary === fish.name);
    if (!recipe) {
      return { error: `这条 ${fish.name} 还没有对应的特殊鱼竿配方。` };
    }

    return { originalIndex, displayIndex, fish, recipe };
  }

  getDailySignal() {
    const world = this.ensureWorldState();
    return ensureDailySignal(world, this.fishTypes, getFishingDayKey(this.config));
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
    const rod = getEquippedRod(userData);
    const rodTarget = resolveRodTarget(userData, rod);
    const targetEffect = rod?.targetFishEffect && rodTarget ? {
      ...rod.targetFishEffect,
      target: rodTarget
    } : null;
    let rarities = Object.keys(this.fishTypes);
    const targetRarityBias = getGoldHumbleRarityBias(rod, rodTarget);
    const weights = this.applyRarityBias(rarityWeights, mergeRarityBias(extraBias, targetRarityBias));
    const ownedEggs = new Set(getOwnedEasterEggCollection(userData));
    const availableMysteryFish = (this.fishTypes[EASTER_EGG_RARITY] || []).filter(fish => !ownedEggs.has(fish.name));
    if (availableMysteryFish.length === 0) {
      weights.legendary = (weights.legendary || 0) + (weights[EASTER_EGG_RARITY] || 0);
      rarities = rarities.filter(rarity => rarity !== EASTER_EGG_RARITY);
    }
    const rarity = this.getWeightedRandom(rarities, weights);
    let fish = null;
    let targetHit = false;
    let candidatesSeen = 0;
    let candidateNames = [];
    let revealTriggered = false;
    let targetPoolSize = 0;
    const rarityTarget = isGoldHumbleRarityTarget(targetEffect?.target);
    if (targetEffect && rarity === targetEffect.target.rarity && !rarityTarget) {
      const pool = rarity === EASTER_EGG_RARITY ? availableMysteryFish : (this.fishTypes[rarity] || []);
      targetPoolSize = pool.length;
      const profile = getGoldHumbleTargetProfile(targetEffect, rarity, targetEffect.target, pool.length);
      candidateNames = resolveGoldHumbleCandidateNames(targetEffect, pool, targetEffect.target);
      candidatesSeen = candidateNames.length;
      revealTriggered = candidatesSeen > 0 && Math.random() < profile.revealChance;
      if (revealTriggered) {
        const candidateName = candidateNames[Math.floor(Math.random() * candidateNames.length)];
        const candidateTemplate = pool.find(item => item.name === candidateName);
        if (candidateTemplate) {
          fish = createFishFromTemplate(candidateTemplate, rarity);
          targetHit = candidateTemplate.name === targetEffect.target.name;
        }
      }
    }
    if (!fish && rarity === EASTER_EGG_RARITY && availableMysteryFish.length > 0) {
      const fallbackPool = targetEffect?.target?.rarity === rarity && !rarityTarget
        ? availableMysteryFish.filter(item => item.name !== targetEffect.target.name)
        : availableMysteryFish;
      const realPool = fallbackPool.length ? fallbackPool : availableMysteryFish;
      const template = realPool[Math.floor(Math.random() * realPool.length)];
      fish = createFishFromTemplate(template, rarity);
    } else if (!fish) {
      const pool = this.fishTypes[rarity] || [];
      const fallbackPool = targetEffect?.target?.rarity === rarity && !rarityTarget
        ? pool.filter(item => item.name !== targetEffect.target.name)
        : pool;
      const realPool = fallbackPool.length ? fallbackPool : pool;
      const template = realPool[Math.floor(Math.random() * realPool.length)];
      fish = template ? createFishFromTemplate(template, rarity) : generateFish(rarity);
    }
    fish = applyFishBodyBuffs(fish, bodyModifiers);
    if (targetEffect && rarityTarget && fish?.rarity === targetEffect.target.rarity) {
      targetHit = true;
      targetPoolSize = this.fishTypes[rarity]?.length || 0;
    }
    if (targetEffect) {
      fish.specialRodEffect = {
        type: targetEffect.type || 'target_fish',
        rodId: rod.id,
        rodName: rod.name,
        targetName: getGoldHumbleTargetShortName(targetEffect.target),
        targetRarity: targetEffect.target.rarity,
        targetType: rarityTarget ? 'rarity' : 'fish',
        targetHit,
        candidatesSeen,
        candidateNames,
        revealTriggered,
        rewardCoins: targetHit ? getGoldHumbleTargetProfile(targetEffect, rarity, targetEffect.target, targetPoolSize).rewardCoins : 0,
        suppressExtraCoinBonuses: Boolean(rod.suppressExtraCoinBonuses && targetHit)
      };
    }
    return fish;
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
    const randomizedBait = applyBaitRandomEffectForCast(rawBait);
    const bait = amplifyBaitModifiers(randomizedBait, easterEggEffect.baitEffectAmplifier);
    if (!bait || bait.id === 'plain') {
      return { bonus: 0, message: '', rarityBias: {}, bodyModifiers: {} };
    }
    if (!userData.baitInventory?.[bait.id] || userData.baitInventory[bait.id] <= 0) {
      const nextBait = userData.autoRenewBait ? getNextAutoRenewBait(userData, bait.id) : null;
      userData.equippedBait = nextBait?.id || 'plain';
      const message = nextBait
        ? `\n[自动续饵] ${getBaitDisplayName(bait)} 已用完，下次将自动改用 ${getBaitDisplayName(nextBait)}。`
        : userData.autoRenewBait
          ? `\n[自动续饵] ${getBaitDisplayName(bait)} 已用完，但没有可续用的备用鱼饵，已换回清水团饵。`
          : `\n[鱼饵] ${getBaitDisplayName(bait)} 已用完，已换回清水团饵。`;
      return { bonus: 0, message, rarityBias: {}, bodyModifiers: {} };
    }
    const rod = getEquippedRod(userData);
    const preserveChance = Math.max(0, Math.min(
      BAIT_PRESERVE_CHANCE_CAP,
      Number(bait?.baitPreserveChance || 0) + Number(rod?.baitPreserveChance || 0) + Number(easterEggEffect.baitPreserveChance || 0)
    ));
    const preserved = Math.random() < preserveChance;
    const beforeCount = Number(userData.baitInventory[bait.id] || 0);
    if (!preserved) userData.baitInventory[bait.id] -= 1;
    const afterCount = Number(userData.baitInventory[bait.id] || 0);
    const baitName = getBaitDisplayName(bait);
    let message = preserved
      ? `\n[当前鱼饵] ${baitName} 这次被稳稳留住了，剩余 ${beforeCount} 份。`
      : afterCount > 0
        ? `\n[当前鱼饵] 已消耗 1 份 ${baitName}，剩余 ${afterCount} 份。`
        : `\n[当前鱼饵] 已消耗最后 1 份 ${baitName}，下次将换回清水团饵。`;
    if (bait.activeRandomEffectName) {
      message += `\n[粽子风味] ${bait.activeRandomEffectName}：${bait.activeRandomEffectDesc || '本次节令小效果已生效。'}`;
    }
    const rarityBias = bait.rarityBias || {};
    if (userData.baitInventory[bait.id] <= 0) {
      const nextBait = userData.autoRenewBait ? getNextAutoRenewBait(userData, bait.id) : null;
      userData.equippedBait = nextBait?.id || 'plain';
      message = nextBait
        ? `\n[当前鱼饵] 已消耗最后 1 份 ${baitName}。\n[自动续饵] 下次将自动改用 ${getBaitDisplayName(nextBait)}，库存 ${Number(userData.baitInventory[nextBait.id] || 0)} 份。`
        : userData.autoRenewBait
          ? `\n[当前鱼饵] 已消耗最后 1 份 ${baitName}。\n[自动续饵] 没有可续用的备用鱼饵，下次将换回清水团饵。`
          : message;
    }
    return {
      bonus: bait.catchRateBonus || 0,
      message,
      rarityBias,
      bodyModifiers: bait,
      activityEvent: isDuanwuEventActive() ? bait.activityEvent : null
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

  async setDailyResetHour(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能设置钓鱼每日刷新时间。');
      return;
    }
    const hour = parseDailyResetHour(e.msg);
    if (hour === null) {
      await this.reply(`当前钓鱼每日刷新时间：${getDailyResetHour(this.config)}:00\n格式：#设置钓鱼刷新时间 6 或 #钓鱼刷新时间 06:00（24小时制，0-23）`);
      return;
    }

    this.config.dailyResetHour = hour;
    saveConfig(this.config);
    const fishingDay = getFishingDayKey(this.config);
    const world = loadWorldState();
    world.lastDailyResetDate = fishingDay;
    if (world.todaySignal?.date && world.todaySignal.date !== fishingDay) {
      world.todaySignal = null;
      ensureDailySignal(world, this.fishTypes, fishingDay);
    }
    saveWorldState(world);
    await this.reply(`已将钓鱼每日刷新时间设置为 ${hour}:00。\n当前钓鱼日：${fishingDay}\n说明：本次设置不会立刻清空今日鱼获和次数；下一个 ${hour}:00 起按新时间刷新。`);
  }

  async toggleSegmentedCastReturn(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能设置分段式返还钓鱼次数。');
      return;
    }
    const raw = String(e.msg || '').replace(/^#(?:钓鱼)?分段(?:式)?(?:返还|次数|钓鱼)?\s*/, '').trim();
    const nextValue = parseOnOffToggle(raw);
    const resetHour = getDailyResetHour(this.config);
    const statusText = getSegmentedCastReturnStatusText(this.config, Number(this.config.dailyLimit || 0), getFishingUsageOptions(this.config));
    if (nextValue === null) {
      await this.reply(`${statusText}\n格式：#钓鱼分段返还 开启 / #钓鱼分段返还 关闭\n规则：${resetHour}:00 返还1/3，${(resetHour + 6) % 24}:00 再返还1/3，${(resetHour + 12) % 24}:00 返还剩余次数，${(resetHour + SEGMENTED_CAST_RETURN_EXTRA_TICKET_HOUR) % 24}:00 后可用额外钓鱼券。`);
      return;
    }

    this.config.segmentedCastReturnEnabled = nextValue;
    saveConfig(this.config);
    const status = nextValue ? '开启' : '关闭';
    await this.reply(
      `分段式返还钓鱼次数已${status}。\n` +
      `刷新时间：${resetHour}:00\n` +
      (nextValue
        ? `返还节点：${resetHour}:00 / ${(resetHour + 6) % 24}:00 / ${(resetHour + 12) % 24}:00；${(resetHour + SEGMENTED_CAST_RETURN_EXTRA_TICKET_HOUR) % 24}:00 后可用钓鱼券。\n钓鱼极速版仍可提前消耗当天全部基础次数。`
        : '关闭后恢复为每日刷新后一次性获得全部基础次数。')
    );
  }

  async checkFishingLimit(e) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, String(e.user_id));
    const rod = getEquippedRod(userData);
    const limit = getDailyLimitBreakdown(this.config, userData, rod);
    const usageOptions = getFishingUsageOptions(this.config);
    const normalUsed = getTodayNormalCastUsed(userData);
    const ticketUsed = Math.min(Number(userData.todayExtraUsed || 0), Number(userData.today?.count || 0));
    const easterEggSourceText = limit.easterEggBonus > 0 ? ' + 彩蛋效果（已计入）' : '';
    await this.reply(
      `你的每日基础钓鱼次数：${limit.total}次\n` +
      `今日已用：${getFishingLimitText(this.config, userData, rod, usageOptions)}\n` +
      `来源：全局基础${limit.base} + 鱼缸${limit.tankBonus} + 成就${limit.achievementBonus} + 鱼竿${limit.rodBonus}${easterEggSourceText}\n` +
      `${getSegmentedCastReturnStatusText(this.config, limit.total, usageOptions)}\n` +
      `钓鱼券：今日已用${ticketUsed}张，剩余${Number(userData.tickets || 0)}张\n` +
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
    const senderDisplay = getSenderGroupDisplayName(e);
    const baitData = loadBaitData();
    if (!baitData[userId]) {
      baitData[userId] = { todayUsed: false, remainingCasts: 0, bonusRate: 0 };
    }
    if (baitData[userId].todayUsed) {
      await this.reply('你今天已经打过窝了，明天再来吧。');
      return;
    }

    let baitContent = '';
    let baitDisplayText = '一份窝料';
    let baitType = 'text';
    let actionText = '';
    let bonusRate = 0;
    if (e.at) {
      const targetUserId = Array.isArray(e.at) ? e.at[0] : e.at;
      const targetDisplay = await getSafeGroupMemberDisplayNameAsync(e, targetUserId);
      baitContent = `群友(${targetDisplay})`;
      baitDisplayText = `群友${targetDisplay}`;
      baitType = 'user';
      actionText = `【${senderDisplay}】将群友【${targetDisplay}】丢下去打了窝`;
      bonusRate = (Math.random() * 30 - 15) / 100;
    } else {
      const match = e.msg.match(/#打窝\s+(.+)/);
      if (!match || !match[1]) {
        await this.reply('请输入打窝内容或@一个群友。\n例如：#打窝 玉米粒\n或：#打窝 @某人');
        return;
      }
      baitContent = match[1].trim();
      baitDisplayText = baitContent;
      actionText = `【${senderDisplay}】将${baitContent}丢下去打了窝`;
      bonusRate = (Math.random() * 14 - 7) / 100;
    }

    baitData[userId] = {
      todayUsed: true,
      remainingCasts: 2,
      bonusRate,
      baitContent,
      baitDisplayText,
      baitType
    };
    saveBaitData(baitData);

    const ratePercent = (bonusRate * 100).toFixed(1);
    const effectMsg = bonusRate > 0
      ? `看起来效果不错，上鱼率增加${ratePercent}%`
      : bonusRate < 0
        ? `这窝子味道有点怪，上鱼率降低${Math.abs(ratePercent)}%`
        : '效果一般，上鱼率没有变化';
    await this.reply(`${actionText}。\n${effectMsg}\n效果将持续2竿钓鱼。`);
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
    const buildTrashFailResult = () => {
      const trashItem = this.trashItems[Math.floor(Math.random() * this.trashItems.length)];
      const messageTemplate = trashCatchMessages[Math.floor(Math.random() * trashCatchMessages.length)];
      return {
        type: 'trash',
        message: fillMessageTemplate(messageTemplate, { item: trashItem })
      };
    };

    if (Math.random() < EMPTY_HOOK_FAIL_RATE) {
      return {
        type: 'empty_hook',
        message: emptyHookMessages[Math.floor(Math.random() * emptyHookMessages.length)]
      };
    }

    const failRoll = Math.random();
    const groupLostItems = Array.isArray(lostItems[groupId]) ? lostItems[groupId] : [];
    const lostEventThreshold = FAIL_LOST_EVENT_POST_EMPTY_RATE;
    const lostItemThreshold = lostEventThreshold + FAIL_LOST_ITEM_POST_EMPTY_RATE;
    const trashThreshold = lostItemThreshold + FAIL_TRASH_POST_EMPTY_RATE;
    const xianyuTrashThreshold = trashThreshold + (hasActiveXianyuEffect(options.userData) ? XIANYU_RANDOM_FAIL_TO_TRASH_RATE / POST_EMPTY_FAIL_RANGE : 0);
    const randomEventThreshold = xianyuTrashThreshold + FAIL_RANDOM_EVENT_POST_EMPTY_RATE;

    if (failRoll < lostEventThreshold) {
      const lostEvent = this.lostItemEvents[Math.floor(Math.random() * this.lostItemEvents.length)];
      if (!lostItems[groupId]) lostItems[groupId] = [];
      lostItems[groupId].push({
        ownerId: userId,
        ownerName: e.sender?.card || e.sender?.nickname || userId,
        itemName: lostEvent.itemName,
        timestamp: getNowTimestamp()
      });
      persistLostItems();
      return {
        type: 'lost_event',
        message: lostEvent.message
      };
    }

    if (failRoll < lostItemThreshold) {
      if (!groupLostItems.length) {
        return buildTrashFailResult();
      }
      const randomIndex = Math.floor(Math.random() * groupLostItems.length);
      const foundItem = groupLostItems[randomIndex];
      groupLostItems.splice(randomIndex, 1);
      if (groupLostItems.length === 0) delete lostItems[groupId];
      persistLostItems();
      const messageTemplate = lostItemRecoverMessages[Math.floor(Math.random() * lostItemRecoverMessages.length)];
      return {
        type: 'lost_item',
        itemName: foundItem.itemName,
        message: fillMessageTemplate(messageTemplate, {
          ...foundItem,
          ownerName: await getSafeLostItemOwnerNameAsync(e, foundItem),
          ownerId: ''
        })
      };
    }

    if (failRoll < trashThreshold) {
      return buildTrashFailResult();
    }

    if (failRoll < xianyuTrashThreshold) {
      const result = buildTrashFailResult();
      result.xianyuConvertedFromRandomFail = true;
      return result;
    }

    if (failRoll < randomEventThreshold) {
      return {
        type: 'random_event',
        message: this.randomEvents[Math.floor(Math.random() * this.randomEvents.length)]
      };
    }

    return {
      type: 'random_event',
      message: this.randomEvents[Math.floor(Math.random() * this.randomEvents.length)]
    };
  }

  applyXianyuRecycle(data, catcherUserId, e, reward) {
    const catcherData = data?.[catcherUserId];
    if (!catcherData) return null;
    normalizeUserData(catcherData);
    if (!hasActiveXianyuEffect(catcherData)) return null;
    catcherData.coins = Number(catcherData.coins || 0) + reward;

    return {
      ownerUserId: catcherUserId,
      ownerDisplay: getDisplayNameForUser(e, catcherUserId) || catcherUserId,
      reward
    };
  }

  applyXianyuFailRecycleMessage(data, failResult, catcherUserId, e) {
    if (!failResult || !['trash', 'lost_item'].includes(failResult.type)) return null;
    const reward = failResult.type === 'lost_item'
      ? rollXianyuLostItemRecycleReward()
      : rollXianyuRecycleReward();
    const recycleResult = this.applyXianyuRecycle(data, catcherUserId, e, reward);
    if (!recycleResult) return null;
    const targetText = failResult.type === 'lost_item'
      ? `捞到的${failResult.itemName || '失物'}`
      : '这件杂物';
    failResult.message += `\n[闲鱼回收] 你装备的闲鱼顺手把${targetText}回收了，到账 ${recycleResult.reward} 鱼蛋。`;
    return recycleResult;
  }

  saveCaughtFish(userId, fish) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, userId);
    const result = this.addCaughtFishToUser(userData, fish);
    saveFishData(data);
    return result;
  }

  addCaughtFishToUser(userData, fish) {
    const { specialRodEffect, ...fishData } = fish || {};
    const fishWithTimestamp = { ...fishData, timestamp: getNowTimestamp() };
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

  applySpecialRodCatchEffect(userData, fish, options = {}) {
    const effect = fish?.specialRodEffect;
    if (!effect?.targetHit) return { message: '', rewardCoins: 0, suppressExtraCoinBonuses: false };
    const rewardCoins = getGoldHumbleSpecialRewardCoins(effect);
    if (rewardCoins > 0) {
      userData.coins = Number(userData.coins || 0) + rewardCoins;
    }
    const targetText = effect.targetType === 'rarity'
      ? effect.targetName
      : `目标 ${effect.targetName}`;
    const message = options.compact
      ? `${effect.rodName}：命中${targetText}，+${rewardCoins}鱼蛋${effect.suppressExtraCoinBonuses ? '，其它额外鱼蛋不叠加' : ''}`
      : `\n[${effect.rodName}] 金线确认命中${targetText}，奖励 ${rewardCoins} 鱼蛋。`;
    return {
      message,
      rewardCoins,
      suppressExtraCoinBonuses: Boolean(effect.suppressExtraCoinBonuses)
    };
  }

  async playDuanwuQuyuanPerformance() {
    await this.reply(epicMessages[Math.floor(Math.random() * epicMessages.length)]);
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 3000) + 1200));
    await this.reply('水面忽然安静下来，粽叶香气沿着鱼线往深处沉去。像是有什么不属于鱼群的东西，正从江心慢慢回头。');
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1500));
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
      duanwuEvents: 0,
      duanwuCoins: 0,
      specialEffects: [],
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

    let missingCount = 0;
    for (const rarity of [...visibleRarities].reverse()) {
      for (const fish of this.fishTypes[rarity] || []) {
        if (!collectedNames.has(fish.name)) {
          missingCount += 1;
        }
      }
    }

    const footer = missingCount > 0
      ? `还缺 ${missingCount} 种 | 继续钓鱼，新的鱼影会慢慢亮起来。`
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
        key: `collection-${getNowTimestamp()}`,
        title: '钓鱼图鉴',
        subtitle: `已收集 ${collectedCount}/${totalSpecies} 种 | 完成度 ${progress}%`,
        sections,
        footer
      },
      fallback: fallbackLines.join('\n').trim()
    };
  }

  buildFastFishingResultPanel(userDisplay, summary, userData, rod, usageOptions = getFishingUsageOptions(this.config)) {
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
        const valueText = canSellFish(item.bestFish) ? `，参考售价${getFishSellValue(item.bestFish)}鱼蛋` : '';
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
    const specialEffectLines = [...new Set(summary.specialEffects || [])].slice(0, 8);

    const extraLines = [
      summary.ticketCasts > 0 ? `本次消耗钓鱼券：${summary.ticketCasts}张` : null,
      summary.rescued > 0 ? `失败保护补救：${summary.rescued}次` : null,
      summary.signalHits > 0 ? `命中限时鱼讯：${summary.signalHits}条` : null,
      summary.duanwuEvents > 0 ? `端午奇遇：${summary.duanwuEvents}次，+${summary.duanwuCoins}鱼蛋` : null,
      summary.tankAdded > 0 || summary.tankReplaced > 0 ? `鱼缸更新：新增${summary.tankAdded}条，替换${summary.tankReplaced}条` : null,
      summary.autoSellCoins > 0 ? `鱼缸替换自动售出：+${summary.autoSellCoins}鱼蛋` : null
    ].filter(Boolean);

    const groups = applyGroupThemes([
      {
        group: '本次结算',
        list: [
          { badge: '玩家', title: userDisplay, desc: `使用鱼竿：${rod.name}`, tone: 'active' },
          {
            badge: '抛竿',
            title: `${summary.casts} 竿`,
            desc: `上鱼 ${summary.catches} 条，空军 ${summary.misses} 竿`,
            meta: `今日次数：${getFishingLimitText(this.config, userData, getEquippedRod(userData), usageOptions)}`,
            tone: summary.catches > 0 ? 'positive' : 'warning'
          },
          {
            badge: '鱼蛋',
            title: `${summary.coinGain >= 0 ? '+' : ''}${summary.coinGain} 鱼蛋`,
            desc: `当前共有 ${userData.coins} 鱼蛋`,
            meta: extraLines.join(' | ') || '本次没有额外结算项',
            tone: summary.coinGain >= 0 ? 'positive' : 'warning',
            fullWidth: true
          }
        ]
      },
      {
        group: '稀有度统计',
        list: rarityLines.length
          ? RARITY_ORDER
            .filter(rarity => summary.rarityCounts[rarity] > 0)
            .map(rarity => ({
              badge: rarityLabel(rarity),
              title: `${summary.rarityCounts[rarity]} 条`,
              desc: `${rarityLabel(rarity)} 鱼获`,
              tone: getRarityCardTone(rarity)
            }))
          : [{ badge: '无', title: '本次没有上鱼', desc: '空军统计见下方', tone: 'warning', fullWidth: true }]
      },
      {
        group: '主要鱼获',
        list: fishLines.length
          ? fishLines.map((line, index) => ({
            badge: `鱼${index + 1}`,
            title: line.split('，')[0] || line,
            desc: line.split('，').slice(1).join('，') || '本次入袋鱼获',
            tone: 'neutral'
          }))
          : [{ badge: '空', title: '本次没有鱼获', desc: '再来一竿试试手气', tone: 'warning', fullWidth: true }]
      },
      ...(notableLines.length ? [{
        group: '高稀有鱼获',
        list: notableLines.map((line, index) => ({
          badge: `高${index + 1}`,
          title: line.split(' ').slice(0, 2).join(' '),
          desc: line.split(' ').slice(2).join(' ') || line,
          tone: 'legendary'
        }))
      }] : []),
      ...(failLines.length ? [{
        group: '空军统计',
        list: failLines.map((line, index) => ({
          badge: `空${index + 1}`,
          title: line.split('：')[0] || line,
          desc: line.split('：').slice(1).join('：') || '本次失败记录',
          tone: 'warning'
        }))
      }] : []),
      ...(baitLines.length ? [{
        group: '鱼饵消耗',
        list: baitLines.map((line, index) => ({
          badge: `饵${index + 1}`,
          title: line.split('：')[0] || line,
          desc: line.split('：').slice(1).join('：') || '本次生效次数',
          tone: 'sky'
        }))
      }] : []),
      ...(specialEffectLines.length ? [{
        group: '特殊鱼竿',
        list: specialEffectLines.map((line, index) => ({
          badge: `竿${index + 1}`,
          title: line.split('：')[0] || line,
          desc: line.split('：').slice(1).join('：') || '本次触发特殊鱼竿效果',
          tone: 'gold'
        }))
      }] : []),
      ...(summary.achievements.size ? [{
        group: '成就变化',
        list: [...summary.achievements].slice(0, 8).map((line, index) => ({
          badge: `成${index + 1}`,
          title: line,
          desc: '本次极速钓鱼中触发',
          tone: 'positive'
        }))
      }] : [])
    ], ['lake', 'gold', 'sky', 'coral', 'amber', 'plum']);
    const sections = buildCardGridSections(groups, { badgePrefix: '结' });

    const fallback = [
      '钓鱼极速版结果',
      userDisplay,
      `鱼竿：${rod.name}`,
      `总抛竿：${summary.casts}竿，上鱼${summary.catches}条，空军${summary.misses}竿`,
      `今日次数：${getFishingLimitText(this.config, userData, getEquippedRod(userData), usageOptions)}`,
      `鱼蛋变化：${summary.coinGain >= 0 ? '+' : ''}${summary.coinGain}，当前${userData.coins}`,
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
      ...(specialEffectLines.length ? ['', '特殊鱼竿', ...specialEffectLines] : []),
      ...(summary.achievements.size ? ['', '成就变化', ...[...summary.achievements].slice(0, 8)] : [])
    ].join('\n');

    return {
      panel: {
        key: `fast-fishing-${getNowTimestamp()}`,
        title: '钓鱼极速版结果',
        subtitle: `一次结算 ${summary.casts} 竿 | 上鱼 ${summary.catches} 条`,
        sections,
        footer: `当前鱼蛋：${userData.coins} | 当前鱼缸：${userData.fishTank.length}/${userData.tankCapacity}`
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
      const usageOptions = getFastFishingUsageOptions(this.config);

      if (!canFishToday(this.config, userData, rod, usageOptions)) {
        await this.reply(`${userDisplay}\n${getFishingLimitExhaustedText(this.config, userData, rod, usageOptions)}`);
        return;
      }

      const todayKey = getFishingDayKey(this.config);
      const duanwuGift = claimDailyDuanwuZongziGift(userData);
      const delivery = claimDailyBaitDelivery(userData, todayKey);
      const preCastTexts = [duanwuGift?.text, delivery?.text].filter(Boolean);
      if (preCastTexts.length) {
        saveFishData(data);
        await this.reply(`${userDisplay}\n${preCastTexts.join('\n')}`);
      }

      const summary = this.createFastFishingSummary(rod);
      const signal = this.getDailySignal();

      while (canFishToday(this.config, userData, rod, usageOptions)) {
        const coinsBeforeCast = Number(userData.coins || 0);
        userData.total += 1;
        const usage = registerCastUsage(this.config, userData, rod, usageOptions);
        if (!usage.registered) break;

        summary.casts += 1;
        if (usage.usedTicket) summary.ticketCasts += 1;

        const currentCount = userData.today.count;
        const bait = getEquippedBait(userData);
        const shopBait = this.consumeShopBait(userData, bait);
        const shopBaitActive = bait.id !== 'plain' && (shopBait.bonus !== 0 || Object.keys(shopBait.rarityBias || {}).length > 0 || Object.keys(shopBait.bodyModifiers || {}).length > 0);
        if (shopBaitActive) {
          const baitName = getBaitDisplayName(bait);
          summary.baitUses[baitName] = (summary.baitUses[baitName] || 0) + 1;
        }

        const manualBait = this.consumeManualBait(userId, baitData, { persist: false });
        if (manualBait.message) summary.manualBaitCasts += 1;

        const easterEggEffect = getEasterEggEffects(userData);
        let hiddenPityBonus = 0;
        if (Number(userData?.stats?.consecutiveEmpty || 0) >= 9) {
          hiddenPityBonus = HIDDEN_PITY_CATCH_BONUS;
        }

        const mergedBias = mergeRarityBias(rod.rarityBias, shopBait.rarityBias, easterEggEffect.rarityBias);
        const bodyModifiers = mergeFishBodyModifiers(rod, shopBait.bodyModifiers);
        const rodTarget = resolveRodTarget(userData, rod);
        const targetCatchRateBonus = getGoldHumbleCatchRateBonus(rod, rodTarget);
        const rodCatchRateBonus = Number(rod.catchRateBonus || 0) + targetCatchRateBonus;
        const catchRate = Math.max(0.05, getCatchRate(userData, manualBait.bonus + shopBait.bonus + hiddenPityBonus, rodCatchRateBonus) - FAST_FISHING_CATCH_RATE_PENALTY);
        const failRescueChance = Math.max(0, Math.min(0.45, Number(rod.failProtection || 0) + easterEggEffect.failProtection));
        const missedCatch = Math.random() >= catchRate;
        const duanwuEvent = missedCatch && shouldTriggerDuanwuQuyuanEvent(shopBait)
          ? applyDuanwuQuyuanEvent(userData)
          : null;
        if (duanwuEvent) {
          summary.duanwuEvents += 1;
          summary.duanwuCoins += duanwuEvent.rewardCoins;
          summary.specialEffects.push(duanwuEvent.compactText);
          resetEmptyCastStreak(userData);
          summary.coinGain += Number(userData.coins || 0) - coinsBeforeCast;
          rod = getEquippedRod(userData);
          continue;
        }

        const failResult = missedCatch ? await this.getRandomFailResult(userId, e.group_id, e, null, { lostItemsData: lostItems, autoSaveLostItems: false, userData }) : null;
        const rescuedCatch = failResult?.type === 'empty_hook' && Math.random() < failRescueChance;

        if (rescuedCatch) summary.rescued += 1;

        if (missedCatch && !rescuedCatch) {
          this.applyXianyuFailRecycleMessage(data, failResult, userId, e);
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
        const specialRodEffect = this.applySpecialRodCatchEffect(userData, fish, { compact: true });
        const { fishWithTimestamp, tankResult } = this.addCaughtFishToUser(userData, fish);
        this.recordFastFish(summary, fishWithTimestamp);
        resetEmptyCastStreak(userData);
        userData.stats.lastCatchRarity = fishWithTimestamp.rarity;
        if (tankResult?.added) summary.tankAdded += 1;
        if (tankResult?.replaced) summary.tankReplaced += 1;
        if (tankResult?.soldCoins > 0) summary.autoSellCoins += tankResult.soldCoins;

        if (specialRodEffect.message) {
          summary.specialEffects.push(specialRodEffect.message);
        }
        const suppressExtraCoinBonuses = specialRodEffect.suppressExtraCoinBonuses;
        const signalHit = signal.targets.some(item => item.name === fishWithTimestamp.name);
        if (signalHit) {
          const equippedRod = getEquippedRod(userData);
          const signalCoins = signal.bonusCoins + getSignalRodBonusCoins(equippedRod, fishWithTimestamp);
          if (!suppressExtraCoinBonuses) userData.coins += signalCoins;
          userData.stats.signalFishCaught += 1;
          summary.signalHits += 1;
        }
        const rodCoinBonus = Number(getEquippedRod(userData)?.catchCoinBonus || 0);
        if (!suppressExtraCoinBonuses && rodCoinBonus > 0) userData.coins += rodCoinBonus;
        if (!suppressExtraCoinBonuses && easterEggEffect.catchCoinBonus > 0) userData.coins += easterEggEffect.catchCoinBonus;
        if (!suppressExtraCoinBonuses && easterEggEffect.catchCoinBonusRate > 0) {
          userData.coins += Math.floor(getFishSellValue(fishWithTimestamp) * easterEggEffect.catchCoinBonusRate);
        }

        const unlocked = scanAchievements(userData, this.fishTypes);
        this.recordFastAchievementUnlocks(summary, unlocked);
        userData.achievementCatchRateBonus = getAchievementCatchRateBonus(userData);
        userData.achievementDailyCastBonus = getAchievementDailyCastBonus(userData);
        summary.coinGain += Number(userData.coins || 0) - coinsBeforeCast;
        rod = getEquippedRod(userData);
      }

      const result = this.buildFastFishingResultPanel(userDisplay, summary, userData, rod, usageOptions);
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
      const usageOptions = getFishingUsageOptions(this.config);

      if (!canFishToday(this.config, userData, rod, usageOptions)) {
        await this.reply(`${userDisplay}\n${getFishingLimitExhaustedText(this.config, userData, rod, usageOptions)}`);
        return;
      }

      const todayKey = getFishingDayKey(this.config);
      const duanwuGift = claimDailyDuanwuZongziGift(userData);
      const delivery = claimDailyBaitDelivery(userData, todayKey);
      userData.total += 1;
      registerCastUsage(this.config, userData, rod, usageOptions);
      const currentCount = userData.today.count;
      const bait = getEquippedBait(userData);
      const shopBait = this.consumeShopBait(userData, bait);
      saveFishData(data);

      const easterEggEffect = getEasterEggEffects(userData);
      const preCastText = [duanwuGift?.text, delivery?.text].filter(Boolean).map(text => `${text}\n`).join('');
      await this.reply(`${userDisplay}\n${preCastText}已抛竿，当前鱼竿：${rod.name}\n当前鱼饵：${getBaitDisplayName(bait)}\n请稍等片刻...`);

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
      if (Number(settleUser?.stats?.consecutiveEmpty || 0) >= 9) {
        hiddenPityBonus = HIDDEN_PITY_CATCH_BONUS;
      }

      const mergedBias = mergeRarityBias(rod.rarityBias, shopBait.rarityBias, easterEggEffect.rarityBias);
      const bodyModifiers = mergeFishBodyModifiers(rod, shopBait.bodyModifiers);

      const settleRod = getEquippedRod(settleUser);
      const settleRodTarget = resolveRodTarget(settleUser, settleRod);
      const settleRodCatchRateBonus = Number(settleRod.catchRateBonus || 0) + getGoldHumbleCatchRateBonus(settleRod, settleRodTarget);
      const catchRate = getCatchRate(settleUser, manualBait.bonus + shopBait.bonus + hiddenPityBonus, settleRodCatchRateBonus);
      const easterEggMsg = easterEggEffect.descriptions.length ? `\n[彩蛋加成] ${easterEggEffect.descriptions.join('；')}` : '';
      const failRescueChance = Math.max(0, Math.min(0.45, Number(rod.failProtection || 0) + easterEggEffect.failProtection));
      const missedCatch = Math.random() >= catchRate;
      const duanwuEvent = missedCatch && shouldTriggerDuanwuQuyuanEvent(shopBait)
        ? applyDuanwuQuyuanEvent(settleUser)
        : null;
      if (duanwuEvent) {
        resetEmptyCastStreak(settleUser);
        const unlocked = scanAchievements(settleUser, this.fishTypes);
        settleUser.achievementCatchRateBonus = getAchievementCatchRateBonus(settleUser);
        settleUser.achievementDailyCastBonus = getAchievementDailyCastBonus(settleUser);
        saveFishData(settleData);
        await this.playDuanwuQuyuanPerformance();
        await this.reply(`${userDisplay}\n${duanwuEvent.resultText}\n今日钓鱼次数：${getFishingLimitText(this.config, settleUser, getEquippedRod(settleUser), usageOptions)}${manualBait.message}${shopBait.message}${easterEggMsg}${this.formatAchievementUnlocks(unlocked)}`);
        return;
      }

      const failResult = missedCatch ? await this.getRandomFailResult(userId, e.group_id, e, null, { userData: settleUser }) : null;
      const rescuedCatch = failResult?.type === 'empty_hook' && Math.random() < failRescueChance;
      const rescuedCatchFakeFailMessage = rescuedCatch
        ? failProtectionFakeFailMessages[Math.floor(Math.random() * failProtectionFakeFailMessages.length)]
        : '';
      if (rescuedCatch) {
        await this.reply(`${userDisplay}\n${rescuedCatchFakeFailMessage}`);
      }
      if (missedCatch && !rescuedCatch) {
        this.applyXianyuFailRecycleMessage(settleData, failResult, userId, e);
        recordEmptyCast(settleUser);
        const unlocked = scanAchievements(settleUser, this.fishTypes);
        settleUser.achievementCatchRateBonus = getAchievementCatchRateBonus(settleUser);
        settleUser.achievementDailyCastBonus = getAchievementDailyCastBonus(settleUser);
        saveFishData(settleData);
        await this.reply(`${userDisplay}\n${failResult.message}\n今日钓鱼次数：${getFishingLimitText(this.config, settleUser, getEquippedRod(settleUser), usageOptions)}${manualBait.message}${shopBait.message}${easterEggMsg}${this.formatAchievementUnlocks(unlocked)}`);
        return;
      }

      const signal = this.getDailySignal();
      const fish = this.catchFish(settleUser, mergedBias, bodyModifiers);
      const specialRodEffect = this.applySpecialRodCatchEffect(settleUser, fish);
      const suppressExtraCoinBonuses = specialRodEffect.suppressExtraCoinBonuses;
      const { fishWithTimestamp, tankUpdateMsg } = this.addCaughtFishToUser(settleUser, fish);
      resetEmptyCastStreak(settleUser);
      settleUser.stats.lastCatchRarity = fishWithTimestamp.rarity;

      const resultIntroMsg = rescuedCatch
        ? '但你猛的一提，看似空钩的一口被稳住了，鱼钩重新咬牢，成功上鱼。\n'
        : '';
      let signalMsg = '';
      const signalHit = signal.targets.some(item => item.name === fishWithTimestamp.name);
      if (signalHit) {
        const equippedRod = getEquippedRod(settleUser);
        const signalCoins = signal.bonusCoins + getSignalRodBonusCoins(equippedRod, fishWithTimestamp);
        if (!suppressExtraCoinBonuses) settleUser.coins += signalCoins;
        settleUser.stats.signalFishCaught += 1;
        signalMsg += suppressExtraCoinBonuses
          ? '\n[限时鱼讯] 命中今日目标鱼，但本次金谦限制压制了额外鱼蛋。'
          : `\n[限时鱼讯] 命中今日目标鱼，额外获得 ${signalCoins} 鱼蛋。`;
      }
      const rodCoinBonus = Number(getEquippedRod(settleUser)?.catchCoinBonus || 0);
      if (!suppressExtraCoinBonuses && rodCoinBonus > 0) {
        settleUser.coins += rodCoinBonus;
        signalMsg += `\n[鱼竿效果] 本次额外收获 ${rodCoinBonus} 鱼蛋。`;
      }
      if (!suppressExtraCoinBonuses && easterEggEffect.catchCoinBonus > 0) {
        settleUser.coins += easterEggEffect.catchCoinBonus;
        signalMsg += '\n[彩蛋加成] 本次收获被悄悄抬高了一截。';
      }
      if (!suppressExtraCoinBonuses && easterEggEffect.catchCoinBonusRate > 0) {
        settleUser.coins += Math.floor(getFishSellValue(fishWithTimestamp) * easterEggEffect.catchCoinBonusRate);
        signalMsg += '\n[彩蛋加成] 本次收获被悄悄抬高了一截。';
      }
      if (specialRodEffect.message) {
        signalMsg += specialRodEffect.message;
        if (suppressExtraCoinBonuses) signalMsg += '\n[金谦限制] 本次已命中指定目标，其它额外鱼蛋收益不再叠加。';
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
        `今日钓鱼次数：${getFishingLimitText(this.config, settleUser, getEquippedRod(settleUser), usageOptions)}${manualBait.message}${shopBait.message}${easterEggMsg}${signalMsg}${this.formatAchievementUnlocks(unlocked)}`
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
    const lockedFish = consumedFish.find(fish => isFishLocked(userData, fish));
    if (lockedFish) {
      await this.reply(`${userDisplay}\n${this.getLockedFishMessage(lockedFish, '作为升级材料提交')}`);
      return;
    }
    const invalidFish = consumedFish.find(fish => getFishUpgradePoints(fish) <= 0);
    if (invalidFish) {
      await this.reply(`${userDisplay}\n只能提交 epic 或 legendary 鱼作为升级材料。`);
      return;
    }

    const invalidByMode = consumedFish.find(fish => fish?.rarity !== costType);
    if (invalidByMode) {
      const modeLabel = costType === 'epic' ? 'epic' : 'legendary';
      const invalidSummary = consumedFish
        .map((fish, idx) => `${uniqueDisplayIndexes[idx] + 1}:${fish.name}(${fish.rarity})`)
        .join('、');
      await this.reply(
        `${userDisplay}\n当前是 ${modeLabel} 升级模式，只能提交 ${modeLabel} 鱼。\n` +
        `你选中的材料：${invalidSummary}\n` +
        `请按 #查看鱼缸 里的展示序号重新选择，避免把别的稀有度鱼误提交。`
      );
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
    if (isFishLocked(userData, releasedFish)) {
      await this.reply(`${userDisplay}\n${this.getLockedFishMessage(releasedFish, '放生')}`);
      return;
    }
    userData.fishTank.splice(originalIndex, 1);
    removeOwnedFish(userData, releasedFish, { today: true, tank: false });
    saveFishData(data);
    await this.reply(`${userDisplay}\n已放生 ${releasedFish.name}（${releasedFish.rarity}）。`);
  }

  async giftFish(e) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const parsed = this.parseGiftFishCommand(e);
    if (parsed.error) {
      await this.reply(`${userDisplay}\n${parsed.error}`);
      return;
    }
    if (parsed.rarity === EASTER_EGG_RARITY && getOwnedEasterEggCollection(userData).includes(parsed.name)) {
      await this.reply(`${userDisplay}\n${parsed.name} 已经在彩蛋收藏里，彩蛋鱼不会重复获得，建议换一个还没收集到的目标。`);
      return;
    }
    const { targetUserId, selector } = parsed;
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

    const resolved = this.resolveTankFishSelection(userData, selector);
    if (resolved.error) {
      await this.reply(`${userDisplay}\n${resolved.error}`);
      return;
    }
    if (targetData.fishTank.length >= targetData.tankCapacity) {
      await this.reply(`${userDisplay}\n对方鱼缸已满，无法接收赠送。`);
      return;
    }

    const giftedFish = userData.fishTank[resolved.originalIndex];
    if (isFishLocked(userData, giftedFish)) {
      await this.reply(`${userDisplay}\n${this.getLockedFishMessage(giftedFish, '赠送')}`);
      return;
    }
    userData.fishTank.splice(resolved.originalIndex, 1);
    unlockFishById(userData, giftedFish.fishId);
    giftedFish.giftedFrom = userId;
    giftedFish.giftedAt = getNowTimestamp();
    removeOwnedFish(userData, giftedFish, { today: true, tank: false });
    targetData.fishTank.push(giftedFish);
    addFishHistory(targetData, giftedFish);
    saveFishData(data);
    const targetDisplay = getDisplayNameForUser(e, targetUserId);
    await this.reply(
      `${userDisplay}\n已将 ${giftedFish.name}（${giftedFish.rarity}）赠送给 ${targetDisplay}。` +
      `\n鱼缸序号 ${resolved.displayIndex + 1} 已转出；对方会在鱼缸里收到这条鱼。`
    );
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
    const userData = data[String(e.user_id)] || null;
    if (userData) normalizeUserData(userData);
    const result = buildTodayFishRecordPanel(this.config, userData, '你', {
      isSelf: true,
      userId: String(e.user_id)
    });
    await replyWithPanel(this, result.panel, result.fallback);
  }

  async checkOthersFishRecord(e) {
    const targetUserId = getTargetUserId(e);
    if (!targetUserId) {
      await this.reply('请@某人或输入QQ号来查看鱼获。\n例如：#查看鱼获 @某人\n或：#查看鱼获 123456789');
      return;
    }

    const data = this.loadData();
    const userFish = data[targetUserId];
    if (userFish) normalizeUserData(userFish);
    const targetDisplay = await getSafeGroupMemberDisplayNameAsync(e, targetUserId, '某位钓友');
    const result = buildTodayFishRecordPanel(this.config, userFish || null, targetDisplay, {
      isSelf: String(e.user_id) === targetUserId,
      userId: targetUserId,
      key: `today-fish-${targetUserId}`
    });
    await replyWithPanel(this, result.panel, result.fallback);
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
    const { text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, String(e.user_id));
    normalizeUserData(userData);
    const status = getEasterEggStatusSummary(userData);
    const ownedText = status.owned.length ? status.owned.join('、') : '暂无';
    const pendingText = status.pendingName ? `${status.pendingName}（明日生效）` : '无';
    const hiddenCount = Math.max(0, Object.keys(EASTER_EGG_EFFECTS).length - status.owned.length);
    const effectItems = status.owned.map(name => {
      const effect = EASTER_EGG_EFFECTS[name] || {};
      const isActive = status.activeName === name;
      const isPending = status.pendingName === name;
      const badges = [
        '已收集',
        isActive ? '当前生效' : null,
        isPending ? '待切换' : null
      ].filter(Boolean).join(' | ');
      return {
        badge: isActive ? '生效' : isPending ? '待切' : '已收',
        title: name,
        desc: effect.description || '效果已记录',
        meta: badges,
        tone: isActive ? 'active' : isPending ? 'warning' : 'positive'
      };
    });
    const statusGroups = [{
      group: '彩蛋状态',
      list: [
        { badge: '已收', title: `已收集 ${status.owned.length} 条`, desc: ownedText, tone: 'positive' },
        { badge: '生效', title: status.activeName || '当前无生效彩蛋', desc: status.activeDescription || '暂无效果', tone: status.activeName ? 'active' : 'neutral' },
        { badge: '待切', title: status.pendingName || '暂无待切换彩蛋', desc: pendingText, tone: status.pendingName ? 'warning' : 'neutral' },
        { badge: '切换', title: '#切换彩蛋 彩蛋名', desc: '每天只能安排一次，次日生效。', tone: 'note' }
      ]
    }, {
      group: '彩蛋条目',
      list: [
        ...(effectItems.length ? effectItems : [{
          badge: '暂无',
          title: '还没有收集到彩蛋',
          desc: '继续钓鱼，特别的鱼影会在遇见后记录到这里。',
          tone: 'neutral',
          fullWidth: true
        }]),
        ...(hiddenCount > 0 ? [{
          badge: '未揭',
          title: `还有 ${hiddenCount} 条彩蛋未揭晓`,
          desc: '未遇见前不会提前显示名称和效果。',
          tone: 'neutral',
          fullWidth: true
        }] : [])
      ]
    }];
    const fallback = [
      '彩蛋收藏',
      `已收集：${status.owned.length} 条`,
      `当前生效：${status.activeDescription}`,
      `待切换：${pendingText}`,
      `收藏列表：${ownedText}`,
      '切换方式：#切换彩蛋 彩蛋名'
    ].join('\n');

    await replyWithPanel(this, {
      key: `easter-egg-${e.user_id}`,
      title: '彩蛋收藏',
      subtitle: `${userDisplay} 的彩蛋生效状态`,
      sections: buildCardGridSections(statusGroups, { badgePrefix: '彩' }),
      footer: status.activeName ? `当前生效：${status.activeName}` : '当前未启用彩蛋效果'
    }, fallback);
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

    const result = scheduleEasterEggSwitch(userData, targetName, getFishingDayKey(this.config));
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

  parseGoldHumbleTargetCommand(msg = '') {
    const body = String(msg || '').replace(/^#(?:金谦指定|金谦目标)\s*/i, '').trim();
    if (!body) {
      return { empty: true };
    }
    if (/^(?:取消|清除|重置|无|none)$/i.test(body)) {
      return { clearPrompt: true };
    }
    if (/^(?:确认清除|确认取消|确认重置|确定清除|确定取消|确定重置|clear-confirm|confirm-clear)$/i.test(body)) {
      return { clear: true };
    }
    const rarityOnly = normalizeRarityKeyword(body);
    if (rarityOnly) {
      return { targetType: 'rarity', rarity: rarityOnly };
    }
    const tokens = body.split(/\s+/).filter(Boolean);
    let rarity = null;
    let fishName = body;
    if (tokens.length >= 2) {
      const parsedRarity = normalizeRarityKeyword(tokens[0]);
      if (parsedRarity) {
        rarity = parsedRarity;
        fishName = tokens.slice(1).join(' ');
      }
    }
    fishName = normalizeFishTemplateName(fishName);
    const candidates = findFishTemplatesByName(fishName);
    if (!candidates.length) {
      return { error: `鱼池里没有找到 ${fishName || body}。示例：#金谦指定 虹鳟 / #金谦目标 rare 金龙鱼 / #金谦指定 rare` };
    }
    if (!rarity) {
      if (candidates.length === 1) {
        rarity = candidates[0].rarity;
      } else {
        return { error: `${fishName} 有多个稀有度版本，请补充 common / rare 等稀有度。` };
      }
    }
    const template = (this.fishTypes[rarity] || []).find(item => item.name === fishName);
    if (!template) {
      return { error: `${fishName} 不属于 ${rarity}，可用稀有度：${candidates.map(item => item.rarity).join(' / ')}` };
    }
    return { targetType: 'fish', name: fishName, rarity, template };
  }

  async setGoldHumbleRodTarget(e) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const rod = Object.values(ROD_CATALOG).find(item => item.targetFishEffect?.type === 'gold_humble');
    if (!rod || !userData.rodsOwned?.includes(rod.id)) {
      await this.reply(`${userDisplay}\n你还没有金满而谦虚之竿，无法指定目标鱼。`);
      return;
    }

    const parsed = this.parseGoldHumbleTargetCommand(e.msg);
    if (parsed.error) {
      await this.reply(`${userDisplay}\n${parsed.error}`);
      return;
    }
    if (!userData.rodTargets || typeof userData.rodTargets !== 'object') userData.rodTargets = {};
    if (!userData.rodTargetChangeDates || typeof userData.rodTargetChangeDates !== 'object') userData.rodTargetChangeDates = {};
    const todayKey = getFishingDayKey(this.config);
    const lastChangeDate = String(userData.rodTargetChangeDates[rod.id] || '').trim();
    const currentTarget = resolveRodTarget(userData, rod);
    if (parsed.empty || parsed.clearPrompt) {
      const currentText = getGoldHumbleTargetDisplayName(currentTarget);
      const actionText = parsed.clearPrompt ? '已收到清除请求，但还没有修改目标。' : '没有填写指定鱼，本次不会修改目标。';
      await this.reply(
        `${userDisplay}\n${actionText}\n` +
        `当前目标：${currentText}\n` +
        `要指定单条鱼，请发送：#金谦指定 鱼名\n` +
        `要指定整个稀有度，请发送：#金谦指定 rare\n` +
        `要清除目标，请确认发送：#金谦指定 确认清除`
      );
      return;
    }
    const isNoopClear = parsed.clear && !currentTarget;
    if (!isNoopClear && lastChangeDate === todayKey) {
      await this.reply(
        `${userDisplay}\n${rod.name} 每天最多调整 1 次目标。你今天已经调整过了，请明天再改。\n` +
        `当前目标：${getGoldHumbleTargetDisplayName(currentTarget)}`
      );
      return;
    }
    if (parsed.clear) {
      delete userData.rodTargets[rod.id];
      if (!isNoopClear) userData.rodTargetChangeDates[rod.id] = todayKey;
      saveFishData(data);
      await this.reply(`${userDisplay}\n已清除 ${rod.name} 的指定目标。`);
      return;
    }

    if (parsed.targetType === 'rarity') {
      const rawPool = this.fishTypes[parsed.rarity] || [];
      if (!rawPool.length) {
        await this.reply(`${userDisplay}\n鱼池里还没有 ${rarityLabel(parsed.rarity)} 鱼，暂时不能指定这个稀有度。`);
        return;
      }
      if (parsed.rarity === EASTER_EGG_RARITY) {
        const ownedEggs = new Set(getOwnedEasterEggCollection(userData));
        const availableEggs = rawPool.filter(item => !ownedEggs.has(item.name));
        if (!availableEggs.length) {
          await this.reply(`${userDisplay}\n彩蛋鱼已经全部收集过了，彩蛋鱼不会重复钓起。建议指定其他稀有度或具体鱼。`);
          return;
        }
      }
      const profile = getGoldHumbleTargetProfile(rod.targetFishEffect, parsed.rarity, parsed);
      userData.rodTargets[rod.id] = {
        type: 'rarity',
        rarity: parsed.rarity,
        updatedAt: getNowTimestamp(),
        updatedDate: todayKey
      };
      userData.rodTargetChangeDates[rod.id] = todayKey;
      saveFishData(data);
      await this.reply(
        `${userDisplay}\n${rod.name} 已指定目标：${rarityLabel(parsed.rarity)} 稀有度。\n` +
        `金线会追踪这一整档鱼影；钓到 ${rarityLabel(parsed.rarity)} 鱼时都会判定命中目标。\n` +
        `整稀有度目标范围更宽，命中奖励降低为 +${profile.rewardCoins} 鱼蛋；今天的目标调整次数已用完。`
      );
      return;
    }

    if (parsed.rarity === EASTER_EGG_RARITY && getOwnedEasterEggCollection(userData).includes(parsed.name)) {
      await this.reply(`${userDisplay}\n${parsed.name} 已经收集过，彩蛋鱼不会重复钓起。建议指定还没收集到的彩蛋鱼。`);
      return;
    }

    const ownedEggs = new Set(getOwnedEasterEggCollection(userData));
    const rawPool = this.fishTypes[parsed.rarity] || [];
    const distractorPool = parsed.rarity === EASTER_EGG_RARITY
      ? rawPool.filter(item => item.name === parsed.name || !ownedEggs.has(item.name))
      : rawPool;
    const profile = getGoldHumbleTargetProfile(rod.targetFishEffect, parsed.rarity, parsed, distractorPool.length);
    const distractors = pickGoldHumbleDistractors(distractorPool, parsed.name, profile.distractorCount);
    userData.rodTargets[rod.id] = {
      type: 'fish',
      name: parsed.name,
      rarity: parsed.rarity,
      distractors,
      updatedAt: getNowTimestamp(),
      updatedDate: todayKey
    };
    userData.rodTargetChangeDates[rod.id] = todayKey;
    saveFishData(data);
    const intruderText = distractors.length > 1
      ? '几道同稀有度的鱼影也趁乱闯了进去'
      : distractors.length === 1
        ? '一道同稀有度的鱼影也不小心闯了进去'
        : '这次倒是没有别的鱼影挤进来';
    await this.reply(
      `${userDisplay}\n${rod.name} 已指定目标：${parsed.name}（${parsed.rarity}）。\n` +
      `金线已经记住了它的水纹，${intruderText}，水面一下子热闹了些。\n` +
      `接下来钓到 ${parsed.rarity} 鱼时，${parsed.name} 在同稀有度里的出现感会大大增加；命中真正目标奖励 +${profile.rewardCoins} 鱼蛋；今天的目标调整次数已用完。`
    );
  }

  async checkFishTank(e) {
    const data = this.loadData();
    const selfUserId = String(e.user_id);
    const targetUserId = getTargetUserId(e) || selfUserId;
    const isSelf = targetUserId === selfUserId;
    const userData = this.getOrCreateUser(data, targetUserId);
    normalizeUserData(userData);
    const ownerDisplay = isSelf
      ? '你'
      : await getSafeGroupMemberDisplayNameAsync(e, targetUserId, '某位钓友');
    const ownerTitle = isSelf ? '你的鱼缸' : `${ownerDisplay}的鱼缸`;
    const sortedEntries = getSortedTankEntries(userData);
    const sortedFish = sortedEntries.map(item => annotateFishLock(userData, item.fish));
    const rod = getEquippedRod(userData);
    const progressText = this.getTankUpgradeProgressText(userData);
    const easterEggStatus = getEasterEggStatusSummary(userData);
    const easterEggOwnedText = easterEggStatus.owned.length ? easterEggStatus.owned.join('、') : '暂无';
    const easterEggPendingText = easterEggStatus.pendingName ? `${easterEggStatus.pendingName}（明日生效）` : '无';
    const baitInventoryText = getOwnedBaitsDisplaySummary(userData) || '无';
    const sections = buildCardGridSections(applyGroupThemes([
      {
        group: '鱼缸状态',
        list: [
          {
            badge: '容量',
            title: `${userData.fishTank.length}/${userData.tankCapacity}`,
            desc: `鱼缸等级 ${userData.tankLevel || 0}`,
            meta: `升级进度：${progressText} | 已锁定 ${getLockedFishIds(userData).length} 条`,
            tone: 'active'
          },
          {
            badge: '次数',
            title: getFishingLimitText(this.config, userData, rod, getFishingUsageOptions(this.config)),
            desc: `鱼蛋 ${userData.coins} | 钓鱼券 ${userData.tickets}`,
            meta: `${getSegmentedCastReturnStatusText(this.config, getDailyLimit(this.config, userData, rod), getFishingUsageOptions(this.config))} | 总钓鱼次数 ${userData.total || 0}`,
            tone: 'positive'
          }
        ]
      },
      {
        group: '装备与库存',
        list: [
          {
            badge: '鱼竿',
            title: rod.name,
            desc: `鱼竿库存：${getOwnedRodsSummary(userData) || '无'}`,
            tone: 'plum'
          },
          {
            badge: '鱼饵',
            title: getBaitDisplayName(getEquippedBait(userData)),
            desc: `鱼饵库存：${baitInventoryText}`,
            tone: 'sky'
          }
        ]
      },
      {
        group: '彩蛋状态',
        list: [
          {
            badge: '收藏',
            title: `已收集 ${easterEggStatus.owned.length} 条`,
            desc: easterEggOwnedText,
            tone: 'positive'
          },
          {
            badge: '生效',
            title: easterEggStatus.activeDescription,
            desc: `待切换：${easterEggPendingText}`,
            tone: easterEggStatus.pendingName ? 'warning' : 'active'
          }
        ]
      },
      {
        group: '鱼缸鱼获',
        list: sortedEntries.length
          ? [
            ...sortedEntries.slice(0, 16).map(item => ({
              badge: `${item.displayIndex + 1}`,
              badgeOverlay: item.locked ? '锁定' : '',
              title: `${item.fish.name} (${rarityLabel(item.fish.rarity)})${item.locked ? ' · 已锁定' : ''}`,
              desc: `${item.fish.length}cm / ${item.fish.weight}kg`,
              meta: item.locked ? `鱼缸序号 ${item.displayIndex + 1} | 已锁定，解锁前不能操作` : `鱼缸序号 ${item.displayIndex + 1}`,
              tone: getFishCardTone(item.fish, item.locked)
            })),
            ...(sortedEntries.length > 16 ? [{
              badge: '余量',
              title: `还有 ${sortedEntries.length - 16} 条未展示`,
              desc: '当前面板只展示前 16 条排序后的鱼获',
              tone: 'neutral',
              fullWidth: true
            }] : [])
          ]
          : [{
            badge: '空',
            title: '鱼缸里还没有鱼',
            desc: '先去 #钓鱼 或 #钓鱼极速版 甩几竿吧',
            tone: 'warning',
            fullWidth: true
          }]
      }
    ], ['lake', 'plum', 'amber', 'sky']), { badgePrefix: '缸' });

    const fallbackText = [
      ownerTitle,
      `当前收藏 ${sortedFish.length} 条鱼`,
      ...sortedFish.map((fish, index) => formatFishLine(fish, index)),
      `鱼缸容量：${userData.fishTank.length}/${userData.tankCapacity}`,
      `鱼缸等级：${userData.tankLevel || 0}`,
      `升级进度：${progressText}`,
      `今日钓鱼次数：${getFishingLimitText(this.config, userData, rod, getFishingUsageOptions(this.config))}`,
      `鱼竿库存：${getOwnedRodsSummary(userData) || '无'}`,
      `彩蛋加成：${describeEasterEggEffects(userData)}`,
      `彩蛋收藏：${easterEggOwnedText}`,
      `待切换：${easterEggPendingText}`,
      `总共钓鱼次数：${userData.total || 0}`
    ].join('\n');

    await replyWithPanel(this, {
      key: `tank-${targetUserId}`,
      title: ownerTitle,
      subtitle: `当前鱼竿：${rod.name} | 当前鱼饵：${getBaitDisplayName(getEquippedBait(userData))} | 鱼蛋 ${userData.coins}`,
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

    const groups = applyGroupThemes([
      {
        group: '摊位总览',
        list: [
          buildEquipCardItem({
            badge: '鱼蛋',
            title: `${userData.coins} 鱼蛋`,
            desc: `钓鱼券 ${userData.tickets} 张`,
            meta: `示例预估：卖出 ${commonPreview.length} 条 common 约得 ${previewCoins} 鱼蛋`,
            tone: 'active'
          }),
          buildEquipCardItem({
            badge: '装备',
            title: getEquippedRod(userData).name,
            desc: `当前鱼饵：${getBaitDisplayName(getEquippedBait(userData))}`,
            meta: `鱼缸现有 ${tank.length} 条鱼`,
            tone: 'positive'
          })
        ]
      },
      {
        group: '交易说明',
        list: [
          {
            badge: '售鱼',
            title: '#售鱼 1 / #售鱼 鱼缸8 / #售鱼 鱼缸虹鳟 / #售鱼 鱼缸 uncommon',
            desc: '支持按今日鱼获编号、鱼缸序号、同名鱼顺序、稀有度或全部出售。',
            meta: '#售鱼 1 对应 #今日鱼获 里显示的第 1 条；已锁定的鱼不会被出售。',
            tone: 'amber'
          },
          {
            badge: '回收',
            title: '#鱼市回收 鱼竿 / #鱼市回收 鱼竿1',
            desc: '可以按回收列表序号或鱼竿名回收，不一定等于鱼竿面板里的序号。',
            meta: '回收前需要先卸下当前装备中的鱼竿。',
            tone: 'coral'
          }
        ]
      },
      {
        group: '鱼饵区',
        list: baitList.map((bait, index) => ({
          badge: `饵${index + 1}`,
          title: getBaitDisplayName(bait),
          desc: getBaitDisplayDescription(bait),
          meta: getBaitPackText(bait),
          tone: userData.baitInventory?.[bait.id] > 0 ? 'positive' : 'sky'
        }))
      },
      {
        group: '鱼竿区',
        list: rodList.map((rod, index) => ({
          badge: `竿${index + 1}`,
          title: rod.name,
          desc: rod.description,
          meta: `${rod.price}鱼蛋`,
          tone: userData.rodsOwned?.includes(rod.id) ? 'positive' : 'plum'
        }))
      },
      {
        group: '功能区',
        list: utilityItems.map((item, index) => ({
          badge: `功${index + 1}`,
          title: item.name,
          desc: item.description,
          meta: `${item.price}鱼蛋`,
          tone: 'gold'
        }))
      }
    ], ['lake', 'slate', 'sky', 'plum', 'amber']);
    const sections = buildCardGridSections(groups, { badgePrefix: '市' });

    const fallback = [
      '鱼市',
      `鱼蛋：${userData.coins} | 钓鱼券：${userData.tickets}`,
      `当前鱼竿：${getEquippedRod(userData).name}`,
      `当前鱼饵：${getBaitDisplayName(getEquippedBait(userData))}`,
      '',
      '鱼饵区：',
      ...baitList.map((bait, index) => `鱼饵${index + 1} | ${getBaitDisplayName(bait)} - ${getBaitPackText(bait)} - ${getBaitDisplayDescription(bait)}`),
      '',
      '鱼竿区：',
      ...rodList.map((rod, index) => `鱼竿${index + 1} | ${rod.name} - ${rod.price}鱼蛋 - ${rod.description}`),
      '',
      '功能区：',
      ...utilityItems.map(item => `${item.name} - ${item.price}鱼蛋 - ${item.description}`)
    ].join('\n');

    await replyWithPanel(this, {
      key: `market-${e.user_id}`,
      title: '鱼市',
      subtitle: '卖多余鱼换鱼蛋，再购入鱼饵、额外钓鱼券和鱼竿。',
      sections,
      footer: '购买格式：#鱼市购买 鱼饵1 / #鱼市购买 鱼饵1*5 / #鱼市购买 鱼竿1 / #鱼市购买 3*自定义鱼饵清香窝料；回收格式：#鱼市回收 鱼竿1；炼竿预览：#炼竿预览 1'
    }, fallback);
  }

  buildLotteryResultPanel(userDisplay, userData, result) {
    const grandCount = result.results.filter(item => item.isGrandPrize).length;
    const grandName = result.grandPlugin?.name || '限定愿品';
    const grandStatus = result.grandAvailableAfter
      ? `大奖进度 ${result.pityAfter}/${result.pityLimit || 100}`
      : '当前限定愿品已获得，留些机会给没遇见它的钓友吧';
    const rewardLines = result.results.map((item, index) => {
      const reward = item.reward || {};
      const prefix = item.isGrandPrize ? (item.pityHit ? '保底牵引' : '限定愿品') : `愿${index + 1}`;
      return `${prefix} | ${reward.title || reward.type} | ${reward.desc || ''} | ${getLotteryRewardResultMetaText(reward, item)}`;
    });
    const groups = applyGroupThemes([
      {
        group: '祈愿结算',
        list: [
          {
            badge: '次数',
            title: `${result.drawCount} 连`,
            desc: `付费 ${result.paidDraws} 次，免费 ${result.freeUsed} 次，消耗 ${result.totalCost} 鱼蛋`,
            meta: `${userDisplay} 当前鱼蛋 ${userData.coins} | 免费祈愿 ${result.freeDrawsAfter}`,
            tone: 'active'
          },
          {
            badge: '限定',
            title: grandCount > 0 ? `相遇 ${grandCount} 次` : '擦肩而过',
            desc: grandName,
            meta: grandStatus,
            tone: grandCount > 0 ? 'legendary' : 'neutral'
          }
        ]
      },
      {
        group: '愿品明细',
        list: result.results.map((item, index) => {
          const reward = item.reward || {};
          return {
            badge: item.isGrandPrize ? (item.pityHit ? '保底' : '限定') : `愿${index + 1}`,
            title: reward.title || reward.type,
            desc: reward.desc || '已发放到背包',
            meta: getLotteryRewardResultMetaText(reward, item),
            tone: item.isGrandPrize ? 'legendary' : reward.type === 'coins' ? 'gold' : reward.type === 'bait' ? 'sky' : reward.type === 'lottery_free_draw' ? 'active' : 'positive'
          };
        })
      }
    ], ['gold', 'lake']);
    const fallback = [
      '钓鱼祈愿结果',
      `${userDisplay} 祈愿 ${result.drawCount} 次，付费 ${result.paidDraws} 次，免费 ${result.freeUsed} 次，消耗 ${result.totalCost} 鱼蛋。`,
      ...rewardLines,
      grandStatus,
      `免费祈愿剩余：${result.freeDrawsAfter}`,
      `当前鱼蛋：${userData.coins}`
    ].join('\n');
    return {
      panel: {
        key: `fish-lottery-${getNowTimestamp()}`,
        title: '钓鱼祈愿结果',
        subtitle: grandCount > 0 ? `${grandName} 已经入账` : '水面轻轻晃了一下',
        sections: buildCardGridSections(groups, { badgePrefix: '愿' }),
        footer: '继续使用：#钓鱼祈愿 / #钓鱼祈愿10 / #钓鱼十连 / #钓鱼祈愿清单 / #钓鱼祈愿大奖 鱼饵配送员'
      },
      fallback
    };
  }

  async showFishingLotteryPool(e) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, String(e.user_id));
    const grandPlugin = getPreferredLotteryGrandPrizePlugin(userData);
    const grandAvailable = isLotteryGrandPrizeAvailable(userData, grandPlugin);
    const pool = getLotteryPoolSummary({ grandAvailable, grandPluginId: grandPlugin?.id });
    const pityNow = Number(userData.lotteryPity || 0);
    const pityLimit = Math.max(1, Number(pool.config.grandPrize.pityDraws || 100));
    const grandStatusText = grandAvailable
      ? `大奖进度 ${pityNow}/${pityLimit}`
      : '当前限定愿品已获得，留些机会给没遇见它的钓友吧';
    const grandRate = grandAvailable ? Number(pool.config.grandPrize.rate || 0) : 0;
    const regularRateTotal = grandAvailable ? Math.max(0, 1 - grandRate) : 1;
    const regularWeightTotal = pool.regularRewards
      .reduce((sum, item) => sum + Math.max(0, Number(item.weight || 0)), 0);
    const getRegularProbability = reward => regularWeightTotal > 0
      ? Math.max(0, Number(reward.weight || 0)) / regularWeightTotal * regularRateTotal
      : 0;
    const regularRewards = pool.regularRewards.map(reward => {
      const probability = getRegularProbability(reward);
      return {
        badge: reward.type === 'coins' ? '丸' : reward.type === 'bait' ? '饵' : reward.type === 'ticket' ? '券' : reward.type === 'lottery_free_draw' ? '愿' : '品',
        title: reward.title || reward.id || reward.type,
        desc: reward.desc || '普通愿品',
        meta: `概率约 ${formatLotteryProbability(probability)} | ${getLotteryRewardPreviewMetaText(reward)}`,
        tone: reward.type === 'coins' ? 'gold' : reward.type === 'bait' ? 'sky' : reward.type === 'lottery_free_draw' ? 'active' : 'positive'
      };
    });
    const groups = applyGroupThemes([
      {
        group: '祈愿规则',
        list: [
          {
            badge: '费用',
            title: `${pool.config.cost} 鱼蛋 / 次`,
            desc: `单次最多 ${pool.config.maxDrawsPerCommand} 连`,
            meta: `你当前有 ${userData.coins} 鱼蛋 | 免费祈愿 ${Number(userData.lotteryFreeDraws || 0)}`,
            tone: 'active'
          },
          {
            badge: '提示',
            title: '愿品会直接入账',
            desc: '鱼蛋、鱼饵、钓鱼券和免费祈愿都会在结算后自动加入',
            meta: '清单仅作愿池预览，实际获得以结算为准',
            tone: 'gold'
          },
          {
            badge: '限定',
            title: pool.grandPlugin?.name || '暂未开放',
            desc: grandAvailable
              ? `${pool.grandPlugin?.description || '限定愿品正在水面下等待'}`
              : '你已经获得过当前限定愿品，留些机会给没遇见它的钓友吧。',
            meta: grandAvailable ? `${grandStatusText} | 概率约 ${formatLotteryProbability(grandRate)}` : grandStatusText,
            tone: 'legendary',
            fullWidth: true
          }
        ]
      },
      {
        group: '普通愿品',
        list: regularRewards
      }
    ], ['gold', 'sky']);
    const fallback = [
      '钓鱼祈愿清单',
      `${pool.config.cost}鱼蛋/次，单次最多 ${pool.config.maxDrawsPerCommand} 连`,
      `免费祈愿：${Number(userData.lotteryFreeDraws || 0)}`,
      `限定愿品：${pool.grandPlugin?.name || '暂未开放'}（${grandStatusText}）`,
      ...pool.regularRewards.map(item => `${item.title || item.id || item.type} | 概率约 ${formatLotteryProbability(getRegularProbability(item))} | ${getLotteryRewardPreviewMetaText(item)}`)
    ].join('\n');
    await replyWithPanel(this, {
      key: `fish-lottery-pool-${e.user_id}`,
      title: '钓鱼祈愿清单',
      subtitle: `当前大奖：${pool.grandPlugin?.name || '暂未开放'} | 100鱼蛋一次`,
      sections: buildCardGridSections(groups, { badgePrefix: '愿' }),
      footer: '祈愿：#钓鱼祈愿 / #钓鱼祈愿10 / #钓鱼十连；切换大奖：#钓鱼祈愿大奖 金满竿 / #钓鱼祈愿大奖 鱼饵配送员'
    }, fallback);
  }

  async setFishingLotteryGrandPrize(e) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const keyword = String(e.msg || '')
      .replace(/^#钓鱼祈愿(?:大奖|目标|切换|选择)\s*/, '')
      .trim();

    if (!keyword) {
      const current = getPreferredLotteryGrandPrizePlugin(userData);
      const lines = getLotteryGrandPrizeList().map(plugin => {
        const owned = userData.lotteryGrandPrizes?.includes(plugin.id);
        const currentMark = plugin.id === current?.id ? '当前' : '可选';
        return `${plugin.name} - ${currentMark}${owned ? '，已获得' : ''} - ${plugin.description || ''}`;
      });
      await this.reply(`${userDisplay}\n当前祈愿大奖：${current?.name || '未设置'}\n可切换：\n${lines.join('\n')}\n格式：#钓鱼祈愿大奖 金满竿 / #钓鱼祈愿大奖 鱼饵配送员`);
      return;
    }

    const target = resolveLotteryGrandPrizePlugin(keyword);
    if (!target) {
      await this.reply(`${userDisplay}\n没有找到这个祈愿大奖。可选：${getLotteryGrandPrizeList().map(item => item.name).join('、')}`);
      return;
    }

    userData.preferredLotteryGrandPrizeId = target.id;
    saveFishData(data);
    const ownedText = userData.lotteryGrandPrizes?.includes(target.id)
      ? '你已经获得过这个大奖，当前大奖池会显示为已获得。'
      : `保底进度会继续按当前记录累计：${Number(userData.lotteryPity || 0)}/${Math.max(1, Number(getLotteryPoolSummary({ grandPluginId: target.id }).config.grandPrize.pityDraws || 100))}`;
    await this.reply(`${userDisplay}\n已将祈愿大奖切换为：${target.name}\n${target.description || ''}\n${ownedText}`);
  }

  async handleFishingLottery(e) {
    const parsed = parseLotteryCommand(e.msg);
    if (!parsed) {
      await this.reply('格式：#钓鱼祈愿 / #钓鱼祈愿10 / #钓鱼十连 / #钓鱼祈愿清单');
      return;
    }
    if (parsed.mode === 'pool') {
      await this.showFishingLotteryPool(e);
      return;
    }
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const result = performLotteryDraws(userData, parsed.count, { grandPluginId: userData.preferredLotteryGrandPrizeId });
    if (!result.ok) {
      await this.reply(`${userDisplay}\n鱼蛋不足：本次 ${result.drawCount} 连可用免费祈愿 ${result.freeUsed} 次，仍有 ${result.paidDraws} 次需要付费，共需 ${result.totalCost} 鱼蛋，当前只有 ${userData.coins}。`);
      return;
    }
    const unlocked = this.refreshAchievements(data, userId);
    saveFishData(data);
    const view = this.buildLotteryResultPanel(userDisplay, userData, result);
    const achievementText = this.formatAchievementUnlocks(unlocked).replace(/^\n/, '');
    if (achievementText) {
      view.panel.footer = `${view.panel.footer} | ${achievementText}`;
      view.fallback += `\n${achievementText}`;
    }
    await replyWithPanel(this, view.panel, view.fallback);
  }

  // #售鱼 默认卖“今日渔获”，这样不会和鱼缸序号命令混在一起；
  // 如果用户明确写“鱼缸”，才去卖鱼缸里的鱼。
  pickFishForSale(userData, target) {
    const lockedSelected = [];
    const registerLocked = item => {
      if (item?.fish && isFishLocked(userData, item.fish)) lockedSelected.push(item.fish);
      return item;
    };

    if (target.source === 'tank') {
      const sortedTank = getSortedTankEntries(userData)
        .map(item => ({ source: 'tank', originalIndex: item.originalIndex, displayIndex: item.displayIndex, fish: item.fish, locked: item.locked }));
      if (target.mode === 'tank_index') {
        return {
          picked: target.explicitIndexes
            .map(index => registerLocked(sortedTank[index]))
            .filter(item => item && canSellFish(item.fish) && !item.locked),
          lockedSelected
        };
      }
      if (target.mode === 'tank_name') {
        const resolved = resolveFishNameSelection(sortedTank, target.fishName, target.duplicateIndex);
        if (resolved.error) return { error: resolved.error, lockedSelected };
        registerLocked(resolved.item);
        return {
          picked: resolved.item && canSellFish(resolved.item.fish) && !resolved.item.locked ? [resolved.item] : [],
          lockedSelected
        };
      }
      const sellableTank = sortedTank.filter(item => canSellFish(item.fish) && !item.locked);
      if (target.rarity && ['common', 'uncommon', 'rare', 'epic'].includes(target.rarity)) {
        const matched = sellableTank.filter(item => item.fish.rarity === target.rarity);
        if (target.all || target.mode === 'rarity_all') return { picked: matched, lockedSelected };
        if (target.mode === 'rarity_index') return { picked: matched[target.count - 1] ? [matched[target.count - 1]] : [], lockedSelected };
        if (target.mode === 'rarity_indexes') {
          const picked = target.explicitIndexes
            .map(index => matched[index])
            .filter(Boolean);
          return { picked, lockedSelected };
        }
        return { picked: matched, lockedSelected };
      }
      if (target.all) return { picked: sellableTank, lockedSelected };
      return { picked: sellableTank.slice(0, target.count), lockedSelected };
    }

    const todayFish = (userData.today.fish || []).map((fish, index) => ({
      source: 'today',
      originalIndex: index,
      displayIndex: index,
      fish,
      locked: isFishLocked(userData, fish)
    }));
    if (target.mode === 'today_index') {
      return {
        picked: target.explicitIndexes
          .map(index => registerLocked(todayFish[index]))
          .filter(item => item && canSellFish(item.fish) && !item.locked),
        lockedSelected
      };
    }
    const sellableTodayFish = todayFish.filter(item => canSellFish(item.fish) && !item.locked);
    if (target.rarity && ['common', 'uncommon', 'rare', 'epic'].includes(target.rarity)) {
      const matched = sellableTodayFish.filter(item => item.fish.rarity === target.rarity);
      if (target.all || target.mode === 'rarity_all') return { picked: matched, lockedSelected };
      if (target.mode === 'rarity_index') return { picked: matched[target.count - 1] ? [matched[target.count - 1]] : [], lockedSelected };
      if (target.mode === 'rarity_indexes') {
        const picked = target.explicitIndexes
          .map(index => matched[index])
          .filter(Boolean);
        return { picked, lockedSelected };
      }
      return { picked: matched, lockedSelected };
    }
    if (target.all) return { picked: sellableTodayFish, lockedSelected };
    return { picked: sellableTodayFish.slice(0, target.count), lockedSelected };
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

    const selection = this.pickFishForSale(userData, target);
    if (selection.error) {
      await this.reply(`${userDisplay}\n${selection.error}`);
      return;
    }
    const picked = selection.picked || [];
    if (selection.lockedSelected?.length) {
      await this.reply(`${userDisplay}\n${this.getLockedFishMessage(selection.lockedSelected[0], '出售')}`);
      return;
    }
    if (!picked.length) {
      await this.reply(`${userDisplay}\n没有符合条件的鱼可售卖。legendary 鱼和彩蛋鱼不会进入售卖列表。`);
      return;
    }
    if (target.source === 'tank' && target.mode === 'tank_index' && target.explicitIndexes?.length && picked.length !== target.explicitIndexes.length) {
      await this.reply(`${userDisplay}\n选择的鱼缸序号里有不存在或不可售卖的鱼，请先用 #查看鱼缸 确认序号。`);
      return;
    }
    if (target.source === 'today' && target.mode === 'today_index' && target.explicitIndexes?.length && picked.length !== target.explicitIndexes.length) {
      await this.reply(`${userDisplay}\n选择的今日鱼获编号里有不存在或不可售卖的鱼，请先用 #今日鱼获 确认编号。`);
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
    const sections = buildCardGridSections(applyGroupThemes([
      {
        group: '本次结算',
        list: [
          {
            badge: '售出',
            title: `${selected.length} 条`,
            desc: `出售来源：${target.source === 'tank' ? '鱼缸' : '今日鱼获'}`,
            meta: `${userDisplay} 本次卖鱼收入 ${preview.totalCoins} 鱼蛋`,
            tone: 'active'
          },
          {
            badge: '鱼蛋',
            title: `+${preview.totalCoins} 鱼蛋`,
            desc: `当前共有 ${userData.coins} 鱼蛋`,
            meta: achievementText || '本次没有额外成就变化',
            tone: 'positive'
          }
        ]
      },
      {
        group: '售出明细',
        list: [
          ...selected.slice(0, 12).map((fish, index) => {
            const line = preview.lines[index] || `${fish.name}(${rarityLabel(fish.rarity)}) +${getFishSellValue(fish)}鱼蛋`;
            const [fishPart, coinPart = ''] = line.split(' +');
            return {
              badge: `鱼${index + 1}`,
              title: fishPart,
              desc: coinPart ? `+${coinPart}` : '已结算',
              tone: getFishCardTone(fish, false)
            };
          }),
          ...(preview.lines.length > 12 ? [{
            badge: '余量',
            title: `另有 ${preview.lines.length - 12} 条未展开`,
            desc: '当前面板最多展示前 12 条售出明细',
            tone: 'neutral',
            fullWidth: true
          }] : []),
          ...(achievementText ? [{
            badge: '成就',
            title: '成就变化',
            desc: achievementText,
            tone: 'amber',
            fullWidth: true
          }] : [])
        ]
      }
    ], ['lake', 'sky']), { badgePrefix: '售' });
    const fallback = [
      '售鱼结果',
      `已售出 ${selected.length} 条鱼，获得 ${preview.totalCoins} 鱼蛋。`,
      ...preview.lines.slice(0, 12),
      preview.lines.length > 12 ? `...另有 ${preview.lines.length - 12} 条未展开` : null,
      `当前鱼蛋：${userData.coins}`,
      achievementText || null
    ].filter(Boolean).join('\n');

    await replyWithPanel(this, {
      key: `sell-result-${e.user_id}`,
      title: '售鱼结果',
      subtitle: `${userDisplay} 本次卖鱼收入 ${preview.totalCoins} 鱼蛋`,
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
        const extra = rod.sourceLegendary
          ? ` | 炼成来源:${rod.sourceLegendary}`
          : rod.sourceLottery ? ' | 祈愿限定' : '';
        const equipMark = rod.id === equippedRod.id ? ' | 当前装备' : '';
        return `鱼竿${index + 1} | ${rod.name} - 回收价 ${getRodRecycleValue(rod)} 鱼蛋${extra}${equipMark}`;
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
    await this.reply(`${userDisplay}\n已回收鱼竿 ${rod.name}，获得 ${recycleValue} 鱼蛋。当前鱼蛋：${userData.coins}`);
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

    const resolved = this.resolveLegendaryCraftSelection(userData, target, { allowLocked: true });
    if (resolved.error) {
      await this.reply(`${userDisplay}\n${resolved.error}`);
      return;
    }

    const { fish, recipe } = resolved;
    const traitLines = buildRodTraitLines(recipe);
    const owned = userData.rodsOwned?.includes(recipe.id);
    const crafted = Boolean(userData.craftedLegendaryRods?.[recipe.id]);
    const sections = [
      `材料鱼：${fish.name} | ${fish.length}cm / ${fish.weight}kg`,
      `将炼成：${recipe.name}`,
      `状态：${owned ? '已拥有' : '未拥有'}${crafted ? ' | 已炼过' : ''}`,
      `手感描述：${recipe.description}`,
      { type: 'html-block', html: buildRodTraitHtml(recipe) }
    ];
    const fallback = [
      '炼竿预览',
      `材料鱼：${fish.name} | ${fish.length}cm / ${fish.weight}kg`,
      `将炼成：${recipe.name}`,
      `状态：${owned ? '已拥有' : '未拥有'}${crafted ? ' | 已炼过' : ''}`,
      `手感描述：${recipe.description}`,
      ...traitLines,
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
      craftedAt: getNowTimestamp()
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
    const customPurchase = parseCustomBaitPurchaseKeyword(rawKeyword);
    if (customPurchase) {
      const { sourceText, quantity } = customPurchase;
      const customPrice = SHOP_ITEMS.custom_bait.price;
      const totalPrice = customPrice * quantity;
      if (userData.coins < totalPrice) {
        await this.reply(`${userDisplay}\n鱼蛋不足，需要 ${totalPrice}，当前只有 ${userData.coins}。`);
        return;
      }
      const bait = findCustomBaitBySource(userData.customBaits, sourceText) || generateCustomBaitFromText(sourceText);
      bait.price = customPrice;
      bait.packSize = 3;
      const addedCount = bait.packSize * quantity;
      userData.coins -= totalPrice;
      userData.customBaits[bait.id] = bait;
      if (!userData.baitInventory[bait.id]) userData.baitInventory[bait.id] = 0;
      userData.baitInventory[bait.id] += addedCount;
      saveFishData(data);
      const baitName = getBaitDisplayName(bait);
      await this.reply(`${userDisplay}\n已定制 ${baitName} ${quantity} 包，花费 ${totalPrice} 鱼蛋，库存 +${addedCount} 次。\n特点：${getBaitDisplayDescription(bait)}\n可用 #换饵 ${baitName} 切换，#鱼饵详情 ${baitName} 查看效果。当前鱼蛋：${userData.coins}`);
      return;
    }

    if (new RegExp(`^${CUSTOM_BAIT_PURCHASE_PATTERN}$`).test(rawKeyword)) {
      await this.reply(`${userDisplay}\n请在自定义鱼饵后面写上配方名，例如：#鱼市购买 自定义鱼饵 清香窝料；批量可用：#鱼市购买 3*自定义鱼饵清香窝料。`);
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
    if (item.type === 'bait' && item.seasonal && !isSeasonalBaitActive(item)) {
      await this.reply(`${userDisplay}\n${item.name} 是限时鱼饵，当前不在出售时间内。`);
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
        await this.reply(`${userDisplay}\n鱼蛋不足，需要 ${totalPrice}，当前只有 ${userData.coins}。`);
        return;
      }
      const addedTickets = item.count * cappedQuantity;
      userData.coins -= totalPrice;
      userData.tickets += addedTickets;
      userData.todayTicketsBought = boughtToday + addedTickets;
      saveFishData(data);
      const cappedMsg = cappedQuantity < quantity ? `\n今日最多购买 ${DAILY_TICKET_PURCHASE_LIMIT} 张，已自动调整为 ${cappedQuantity} 张。` : '';
      await this.reply(`${userDisplay}${cappedMsg}\n已购买 ${item.name} x${addedTickets}。今日已购：${userData.todayTicketsBought}/${DAILY_TICKET_PURCHASE_LIMIT}，当前钓鱼券：${userData.tickets}，鱼蛋：${userData.coins}`);
      return;
    }

    const totalPrice = item.price * quantity;
    if (userData.coins < totalPrice) {
      await this.reply(`${userDisplay}\n鱼蛋不足，需要 ${totalPrice}，当前只有 ${userData.coins}。`);
      return;
    }

    userData.coins -= totalPrice;
    if (item.type === 'bait') {
      if (!userData.baitInventory[item.id]) userData.baitInventory[item.id] = 0;
      const addedCount = item.packSize * quantity;
      userData.baitInventory[item.id] += addedCount;
      saveFishData(data);
      const baitName = getBaitDisplayName(item);
      await this.reply(`${userDisplay}\n已购买 ${baitName} ${quantity} 包，共 ${totalPrice} 鱼蛋；每包 ${item.packSize} 份，库存 +${addedCount} 次。可用 #换饵 ${baitName} 切换。当前鱼蛋：${userData.coins}`);
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
      if (item.sourceLottery) {
        userData.coins += totalPrice;
        await this.reply(`${userDisplay}\n${item.name} 是祈愿限定鱼竿，不能在鱼市直接购买。`);
        return;
      }
      userData.rodsOwned.push(item.id);
      const unlocked = this.refreshAchievements(data, userId);
      await this.reply(`${userDisplay}\n已购买鱼竿 ${item.name}。当前鱼蛋：${userData.coins}${this.formatAchievementUnlocks(unlocked)}`);
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
    const keyword = (e.msg.match(/^#鱼竿(?:详情|属性)\s*(.+)$/)?.[1] || '').trim();
    const { text: userDisplay } = getUserDisplay(e);
    if (!keyword) {
      await this.reply(`${userDisplay}\n请输入鱼竿编号或鱼竿名，例如：#鱼竿详情 鱼竿1 / #鱼竿属性 疾风短竿`);
      return;
    }
    if (isAllDetailsKeyword(keyword)) {
      await this.showAllRodDetails(e);
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
        owned.has(rod.id) ? '已拥有' : `${rod.price}鱼蛋`,
        owned.has(rod.id) && rod.id !== DEFAULT_ROD_ID ? `回收价:${getRodRecycleValue(rod)}鱼蛋` : null,
        rod.sourceLegendary ? `炼成来源:${rod.sourceLegendary}` : null,
        rod.sourceLottery ? '祈愿限定' : null
      ].filter(Boolean).join(' | ');
      return `鱼竿${index + 1} | ${rod.name} - ${marks} - ${rod.description}`;
    });

    const sections = buildCardGridSections(applyGroupThemes([
      {
        group: '当前装备',
        list: [{
          badge: '当前',
          title: equipped.name,
          desc: equipped.description,
          meta: `默认鱼竿：${ROD_CATALOG.starter.name}，可用 #换竿 0 / #换竿 默认 切回`,
          tone: 'active',
          fullWidth: true
        }]
      },
      {
        group: '可切换鱼竿',
        list: rodList.map((rod, index) => ({
          badge: `竿${index + 1}`,
          title: rod.name,
          desc: rod.description,
          meta: joinTextParts([
            rod.id === equipped.id ? '当前装备' : '',
            owned.has(rod.id) ? '已拥有' : `${rod.price}鱼蛋`,
            owned.has(rod.id) && rod.id !== DEFAULT_ROD_ID ? `回收价 ${getRodRecycleValue(rod)}鱼蛋` : '',
            rod.sourceLegendary ? `炼成来源 ${rod.sourceLegendary}` : '',
            rod.sourceLottery ? '祈愿限定' : ''
          ]),
          tone: rod.id === equipped.id ? 'active' : owned.has(rod.id) ? 'positive' : rod.sourceLegendary || rod.sourceLottery ? 'legendary' : 'plum'
        }))
      }
    ], ['lake', 'plum']), { badgePrefix: '竿' });
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
    const rodTarget = resolveRodTarget(userData, rod);
    const traitLines = buildRodTraitLines(rod, { rodTarget });
    const sourceLine = rod.sourceLottery
      ? `来源：祈愿限定`
      : rod.sourceLegendary
        ? `炼成来源：${rod.sourceLegendary}`
        : `售价：${rod.price}鱼蛋`;
    let targetLine = null;
    if (rod.targetFishEffect) {
      if (rodTarget) {
        targetLine = isGoldHumbleRarityTarget(rodTarget)
          ? `指定目标：${getGoldHumbleTargetDisplayName(rodTarget)} | 下方词条已按当前目标修正，钓到该稀有度就会触发较低额外奖励`
          : `指定目标：${getGoldHumbleTargetDisplayName(rodTarget)} | 下方词条已按当前目标修正，同稀有度出现感已大大增加`;
      } else {
        targetLine = '指定目标：未指定，可用 #金谦指定 鱼名 / #金谦指定 rare';
      }
    }
    const sections = [
      `鱼竿：${rod.name}`,
      `状态：${owned ? '已拥有' : '未拥有'}${rod.id === getEquippedRod(userData).id ? ' | 当前装备' : ''}`,
      sourceLine,
      targetLine,
      `手感描述：${rod.description}`,
      { type: 'html-block', html: buildRodTraitHtml(rod, { rodTarget }) }
    ].filter(Boolean);
    const fallback = [
      '鱼竿详情',
      `鱼竿：${rod.name}`,
      `状态：${owned ? '已拥有' : '未拥有'}${rod.id === getEquippedRod(userData).id ? ' | 当前装备' : ''}`,
      sourceLine,
      targetLine,
      `手感描述：${rod.description}`,
      ...traitLines
    ].filter(Boolean).join('\n');

    await replyWithPanel(this, {
      key: `rod-details-${e.user_id}`,
      title: '鱼竿详情',
      subtitle: rod.name,
      sections,
      footer: '词条以倾向展示，实际手感以抛竿为准。'
    }, fallback);
  }

  async showAllRodDetails(e) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const equipped = getEquippedRod(userData);
    const rods = getOwnedRodDetailsList(userData);
    const switchableRods = getSwitchableRodList(userData);

    if (!rods.length) {
      await this.reply(`${userDisplay}\n你还没有可展示的鱼竿。`);
      return;
    }

    const list = rods.map((rod, index) => {
      const rodTarget = resolveRodTarget(userData, rod);
      const detailIndex = switchableRods.findIndex(item => item.id === rod.id);
      const indexText = rod.id === DEFAULT_ROD_ID
        ? '默认鱼竿'
        : detailIndex >= 0
          ? `详情编号 鱼竿${detailIndex + 1}`
          : '';
      const sourceText = rod.sourceLottery
        ? '来源 祈愿限定'
        : rod.sourceLegendary
          ? `炼成来源 ${rod.sourceLegendary}`
          : rod.id === DEFAULT_ROD_ID
            ? '默认鱼竿'
            : `回收价 ${getRodRecycleValue(rod)}鱼蛋`;
      return {
        badge: rod.id === equipped.id ? '当前' : rod.id === DEFAULT_ROD_ID ? '默认' : `竿${detailIndex >= 0 ? detailIndex + 1 : index + 1}`,
        title: rod.name,
        desc: buildTraitSummary(buildRodTraitLines(rod, { rodTarget }), rod.description),
        meta: joinTextParts([
          rod.id === equipped.id ? '当前装备' : '',
          indexText,
          sourceText,
          rodTarget ? `目标 ${getGoldHumbleTargetShortName(rodTarget)}` : ''
        ]),
        tone: rod.id === equipped.id ? 'active' : rod.sourceLegendary || rod.sourceLottery ? 'legendary' : 'plum'
      };
    });

    const sections = buildCardGridSections(applyGroupThemes([{
      group: '已拥有鱼竿缩略详情',
      list
    }], ['plum']), { badgePrefix: '竿' });
    const fallback = [
      '鱼竿详情总览',
      `当前鱼竿：${equipped.name}`,
      ...rods.map((rod, index) => {
        const rodTarget = resolveRodTarget(userData, rod);
        const detailIndex = switchableRods.findIndex(item => item.id === rod.id);
        const indexText = rod.id === DEFAULT_ROD_ID ? '默认鱼竿' : detailIndex >= 0 ? `鱼竿${detailIndex + 1}` : `鱼竿${index + 1}`;
        return `${indexText} | ${rod.name}${rod.id === equipped.id ? ' | 当前装备' : ''} | ${buildTraitSummary(buildRodTraitLines(rod, { rodTarget }), rod.description)}`;
      })
    ].join('\n');

    await replyWithPanel(this, {
      key: `rod-details-all-${e.user_id}`,
      title: '鱼竿详情总览',
      subtitle: `已拥有 ${rods.length} 根 | 当前：${equipped.name}`,
      sections,
      footer: '查看完整单项：#鱼竿详情 鱼竿1 / #鱼竿详情 鱼竿名'
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

  async toggleAutoRenewBait(e) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const keyword = extractAutoRenewBaitKeyword(e.msg);
    const nextValue = parseAutoRenewBaitToggle(keyword);
    if (nextValue === null) {
      const status = userData.autoRenewBait ? '开启' : '关闭';
      await this.reply(`${userDisplay}\n自动续饵当前：${status}\n${getAutoRenewBaitUsageText()}`);
      return;
    }

    userData.autoRenewBait = nextValue;
    saveFishData(data);
    const status = nextValue ? '开启' : '关闭';
    const nextBait = nextValue ? getNextAutoRenewBait(userData, getEquippedBait(userData).id) : null;
    const nextText = nextValue
      ? nextBait
        ? `\n当前鱼饵用完后，将按顺序续到：${getBaitDisplayName(nextBait)}。`
        : '\n当前没有可续用的备用鱼饵；之后获得鱼饵后，会按持有列表顺序接上。'
      : '\n已停止自动续用备用鱼饵，用完后会回到清水团饵。';
    await this.reply(`${userDisplay}\n自动续饵已${status}。${nextText}`);
  }

  async showBaitDetailsCommand(e) {
    const keyword = (e.msg.match(/^#鱼饵(?:详情|属性)\s*(.+)$/)?.[1] || '').trim();
    const { text: userDisplay } = getUserDisplay(e);
    if (!keyword) {
      await this.reply(`${userDisplay}\n请输入鱼饵编号或鱼饵名，例如：#鱼饵详情 鱼饵1 / #鱼饵属性 沉流鱼饵 / #鱼饵详情 桂花酒糟特调饵`);
      return;
    }
    if (isAllDetailsKeyword(keyword)) {
      await this.showAllBaitDetails(e);
      return;
    }
    await this.showBaitDetails(e, keyword);
  }

  async showBaits(e) {
    const data = this.loadData();
    const userData = this.getOrCreateUser(data, String(e.user_id));
    const equipped = getEquippedBait(userData);
    const equippedName = getBaitDisplayName(equipped);
    const ownedBaitsSummary = getOwnedBaitsDisplaySummary(userData) || '暂无可消耗鱼饵';
    const ownedRodsSummary = getOwnedRodsSummary(userData) || '暂无已购鱼竿';
    const autoRenewStatus = userData.autoRenewBait ? '开启' : '关闭';
    const nextAutoRenewBait = userData.autoRenewBait ? getNextAutoRenewBait(userData, equipped.id) : null;
    const autoRenewHint = userData.autoRenewBait
      ? nextAutoRenewBait
        ? `下一种可续用：${getBaitDisplayName(nextAutoRenewBait)}`
        : '暂无可续用备用鱼饵，用完后会回到清水团饵'
      : '关闭后，鱼饵用完会回到清水团饵';
    const builtinBaits = getOwnedBuiltinBaitList(userData);
    const builtinLines = builtinBaits.map((bait, index) => {
      const count = userData.baitInventory?.[bait.id] || 0;
      const state = bait.id === equipped.id ? '当前使用' : count > 0 ? '可切换' : '未持有';
      return `鱼饵${index + 1} | ${getBaitDisplayName(bait)} - ${state} - ${getBaitDisplayDescription(bait)}`;
    });
    const customLines = getCustomBaitList(userData)
      .map((bait, index) => {
        const count = userData.baitInventory?.[bait.id] || 0;
        const state = bait.id === equipped.id ? '当前使用' : count > 0 ? '可切换' : '已用完';
        return `鱼饵${builtinBaits.length + index + 1} | ${getBaitDisplayName(bait)} - ${state} - ${getBaitDisplayDescription(bait)}`;
      });
    const sections = buildCardGridSections(applyGroupThemes([
      {
        group: '当前配置',
        list: [{
          badge: '当前',
          title: equippedName,
          desc: `持有鱼饵：${ownedBaitsSummary}`,
          meta: `自动续饵：${autoRenewStatus} | 已购鱼竿：${ownedRodsSummary} | 默认鱼饵：${BAIT_CATALOG.plain.name}`,
          tone: 'active',
          fullWidth: true
        }, {
          badge: '续饵',
          title: `自动续饵：${autoRenewStatus}`,
          desc: autoRenewHint,
          meta: '指令：#自动续饵开 / #续饵关 / #鱼饵自动续 关闭',
          tone: userData.autoRenewBait ? 'positive' : 'sky',
          fullWidth: true
        }]
      },
      {
        group: '可用鱼饵',
        list: builtinBaits.map((bait, index) => {
          const count = Number(userData.baitInventory?.[bait.id] || 0);
          return {
            badge: `饵${index + 1}`,
            title: getBaitDisplayName(bait),
            desc: getBaitDisplayDescription(bait),
            meta: joinTextParts([
              bait.id === equipped.id ? '当前使用' : '',
              count > 0 ? `库存 ${count} 份` : '未持有',
              bait.lotteryOnly ? '祈愿限定' : '',
              getBaitPackText(bait)
            ]),
            tone: bait.id === equipped.id ? 'active' : count > 0 ? 'positive' : 'sky'
          };
        })
      },
      ...(getCustomBaitList(userData).length ? [{
        group: '自定义鱼饵',
        list: getCustomBaitList(userData).map((bait, index) => {
          const count = Number(userData.baitInventory?.[bait.id] || 0);
          return {
            badge: `定${index + 1}`,
            title: getBaitDisplayName(bait),
            desc: getBaitDisplayDescription(bait),
            meta: joinTextParts([
              bait.id === equipped.id ? '当前使用' : '',
              count > 0 ? `库存 ${count} 份` : '已用完'
            ]),
            tone: bait.id === equipped.id ? 'active' : count > 0 ? 'amber' : 'slate'
          };
        })
      }] : [])
    ], ['lake', 'sky', 'amber']), { badgePrefix: '饵' });
    const fallback = [
      '鱼饵',
      `当前鱼饵：${equippedName}`,
      `自动续饵：${autoRenewStatus} - ${autoRenewHint}`,
      `持有鱼饵：${ownedBaitsSummary}`,
      `已购鱼竿：${ownedRodsSummary}`,
      `默认鱼饵：${BAIT_CATALOG.plain.name} - 可用 #换饵 0 / #换饵 默认`,
      ...builtinLines,
      ...customLines,
      '使用：#换饵 编号 或 #换饵 鱼饵名 / #自动续饵开 / #续饵关 / #鱼饵详情 鱼饵1'
    ].join('\n');
    await replyWithPanel(this, {
      key: `baits-${e.user_id}`,
      title: '鱼饵',
      subtitle: `当前使用：${equippedName}`,
      sections,
      footer: '使用：#换饵 1 / #换饵 沉流鱼饵 / #自动续饵开 / #续饵关 / #鱼饵详情 1 / #鱼饵属性 自定义鱼饵名'
    }, fallback);
  }

  async showBaitDetails(e, keyword) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const visibleBaits = getSwitchableBaitList(userData);
    const baitIndex = parseBaitIndex(keyword);
    const bait = baitIndex === 'default'
      ? BAIT_CATALOG.plain
      : baitIndex !== null
        ? visibleBaits[baitIndex]
        : this.getBaitByKeyword(userData, keyword);

    if (!bait) {
      await this.reply(`${userDisplay}\n没有找到这种鱼饵。`);
      return;
    }

    const inventory = Number(userData.baitInventory?.[bait.id] || 0);
    const isEquipped = bait.id === getEquippedBait(userData).id;
    const traitLines = buildBaitTraitLines(bait);
    const baitName = getBaitDisplayName(bait);
    const baitDescription = getBaitDisplayDescription(bait);
    const sourceText = isCustomBait(bait) ? '定制来源：私人配方' : null;
    const sections = [
      `鱼饵：${baitName}`,
      `状态：${bait.isDefault ? '默认鱼饵' : inventory > 0 ? `持有 ${inventory} 份` : '未持有'}${isEquipped ? ' | 当前装备' : ''}`,
      getBaitAcquireText(bait),
      sourceText,
      `手感描述：${baitDescription}`,
      { type: 'html-block', html: buildBaitTraitHtml(bait) }
    ].filter(Boolean);
    const fallback = [
      '鱼饵详情',
      `鱼饵：${baitName}`,
      `状态：${bait.isDefault ? '默认鱼饵' : inventory > 0 ? `持有 ${inventory} 份` : '未持有'}${isEquipped ? ' | 当前装备' : ''}`,
      getBaitAcquireText(bait),
      sourceText,
      `手感描述：${baitDescription}`,
      ...traitLines
    ].filter(Boolean).join('\n');

    await replyWithPanel(this, {
      key: `bait-details-${e.user_id}`,
      title: '鱼饵详情',
      subtitle: baitName,
      sections,
      footer: '词条以倾向展示，实际手感以抛竿为准。'
    }, fallback);
  }

  async showAllBaitDetails(e) {
    const data = this.loadData();
    const { userId, text: userDisplay } = getUserDisplay(e);
    const userData = this.getOrCreateUser(data, userId);
    const equipped = getEquippedBait(userData);
    const baits = getOwnedBaitDetailsList(userData);
    const switchableBaits = getSwitchableBaitList(userData);

    if (!baits.length) {
      await this.reply(`${userDisplay}\n你还没有可展示的鱼饵。`);
      return;
    }

    const list = baits.map((bait, index) => {
      const inventory = Number(userData.baitInventory?.[bait.id] || 0);
      const baitName = getBaitDisplayName(bait);
      const detailIndex = switchableBaits.findIndex(item => item.id === bait.id);
      const indexText = bait.isDefault
        ? '默认鱼饵'
        : detailIndex >= 0
          ? `详情编号 鱼饵${detailIndex + 1}`
          : '';
      const status = bait.isDefault ? '默认鱼饵' : `库存 ${inventory} 份`;
      return {
        badge: bait.id === equipped.id ? '当前' : bait.isDefault ? '默认' : `饵${detailIndex >= 0 ? detailIndex + 1 : index + 1}`,
        title: baitName,
        desc: buildTraitSummary(buildBaitTraitLines(bait), getBaitDisplayDescription(bait)),
        meta: joinTextParts([
          bait.id === equipped.id ? '当前使用' : '',
          indexText,
          status,
          isCustomBait(bait) ? '自定义鱼饵' : '',
          bait.lotteryOnly ? '祈愿限定' : ''
        ]),
        tone: bait.id === equipped.id ? 'active' : isCustomBait(bait) ? 'amber' : inventory > 0 ? 'positive' : 'sky'
      };
    });

    const sections = buildCardGridSections(applyGroupThemes([{
      group: '已拥有鱼饵缩略详情',
      list
    }], ['sky']), { badgePrefix: '饵' });
    const fallback = [
      '鱼饵详情总览',
      `当前鱼饵：${getBaitDisplayName(equipped)}`,
      ...baits.map((bait, index) => {
        const inventory = Number(userData.baitInventory?.[bait.id] || 0);
        const detailIndex = switchableBaits.findIndex(item => item.id === bait.id);
        const indexText = bait.isDefault ? '默认鱼饵' : detailIndex >= 0 ? `鱼饵${detailIndex + 1}` : `鱼饵${index + 1}`;
        return `${indexText} | ${getBaitDisplayName(bait)}${bait.id === equipped.id ? ' | 当前使用' : ''} | ${bait.isDefault ? '默认鱼饵' : `库存 ${inventory} 份`} | ${buildTraitSummary(buildBaitTraitLines(bait), getBaitDisplayDescription(bait))}`;
      })
    ].join('\n');

    await replyWithPanel(this, {
      key: `bait-details-all-${e.user_id}`,
      title: '鱼饵详情总览',
      subtitle: `可用 ${baits.length} 种 | 当前：${getBaitDisplayName(equipped)}`,
      sections,
      footer: '查看完整单项：#鱼饵详情 鱼饵1 / #鱼饵详情 鱼饵名'
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
      await this.reply(`${userDisplay}\n你还没有 ${getBaitDisplayName(bait)}，先去鱼市购买。`);
      return;
    }
    userData.equippedBait = bait.id;
    saveFishData(data);
    await this.reply(`${userDisplay}\n已换上 ${getBaitDisplayName(bait)}。\n手感：${getBaitDisplayDescription(bait)}`);
  }

  async showDailySignal() {
    const signal = this.getDailySignal();
    const lines = [
      `刷新日期：${signal.date}`,
      `今日高活跃鱼：${signal.targets.map(item => `${item.name}(${item.rarity})`).join('、')}`,
      `命中奖励：每条额外 +${signal.bonusCoins} 鱼蛋`
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

    const sections = buildCardGridSections([{
      group: '成就列表',
      list: list.map(item => ({
        badge: item.unlocked ? '达成' : '未解',
        title: item.name,
        desc: item.description,
        meta: `奖励：${item.rewardText}`,
        tone: item.unlocked ? 'achievement-done' : 'achievement-pending'
      }))
    }], { badgePrefix: '成' });
    const fallback = [
      '钓鱼成就',
      ...list.map(item => `${item.unlocked ? '已点亮' : '未完成'} | ${item.name} | ${item.description} | 奖励 ${item.rewardText}`)
    ].join('\n');

    await replyWithPanel(this, {
      key: `achievement-${e.user_id}`,
      title: '钓鱼成就',
      subtitle: `已完成 ${list.filter(item => item.unlocked).length}/${ACHIEVEMENT_DEFS.length}`,
      sections,
      footer: unlocked.length ? `本次点亮：${unlocked.map(item => item.name).join('、')}` : '继续钓鱼、售鱼和升级鱼缸，可以点亮更多成就。'
    }, fallback);
  }

  async compensateFishCoins(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能使用鱼蛋补偿。');
      return;
    }

    const amount = this.parseCompensationCommand(e.msg);
    if (!Number.isFinite(amount) || amount <= 0) {
      await this.reply('补偿数额需要是正整数，格式示例：#鱼蛋补偿 @某人 *100 或 #鱼蛋补偿 全体 *100');
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
      await this.reply(`已为 ${count} 名已有数据玩家发放更新补偿：每人 ${amount} 鱼蛋。`);
      return;
    }

    const targetUserId = getTargetUserId(e);
    if (!targetUserId) {
      await this.reply('请 @ 需要补偿的人，格式示例：#鱼蛋补偿 @某人 *100 或 #鱼蛋补偿 全体 *100');
      return;
    }

    const userData = this.getOrCreateUser(data, targetUserId);
    userData.coins += amount;
    saveFishData(data);
    const targetDisplay = getDisplayNameForUser(e, targetUserId);

    await this.reply(`已为 ${targetDisplay} 补偿 ${amount} 鱼蛋，当前鱼蛋：${userData.coins}`);
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

    this.resetDailyState(getFishingDayKey(this.config));
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
