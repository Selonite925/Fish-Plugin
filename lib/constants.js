import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGIN_ROOT = path.resolve(__dirname, '..');

export const DATA_DIR = path.join(PLUGIN_ROOT, 'fishdata');
export const RESOURCE_DIR = path.join(PLUGIN_ROOT, 'resources');
export const BACKGROUND_DIR = path.join(RESOURCE_DIR, 'backgrounds');
export const GENERATED_DIR = path.join(RESOURCE_DIR, 'generated');
export const TEMPLATE_DIR = path.join(RESOURCE_DIR, 'panel');

export const FISH_DATA_FILE = `${DATA_DIR}/fishData.json`;
export const CONFIG_FILE = `${DATA_DIR}/fishConfig.json`;
export const BAIT_DATA_FILE = `${DATA_DIR}/baitData.json`;
export const LOST_ITEMS_FILE = `${DATA_DIR}/lostItems.json`;
export const WORLD_STATE_FILE = `${DATA_DIR}/worldState.json`;

export const BASE_CATCH_RATE = 0.20;
export const HIDDEN_PITY_CATCH_BONUS = 0.25;
export const ACHIEVEMENT_CATCH_RATE_SOFT_CAP = 0.03;

export const DEFAULT_TANK_CAPACITY = 5;
export const TANK_UPGRADE_SIZE = 5;
export const TANK_UPGRADE_EXTRA_CASTS = 2;

export const EASTER_EGG_RARITY = '？';

export const RARITY_PRIORITY = {
  [EASTER_EGG_RARITY]: 6,
  easterEgg: 6,
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1
};

export const RARITY_LABELS = {
  common: 'common',
  uncommon: 'uncommon',
  rare: 'rare',
  epic: 'epic',
  legendary: 'legendary',
  [EASTER_EGG_RARITY]: EASTER_EGG_RARITY
};

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', EASTER_EGG_RARITY];

// 价格基准：
// legendary + 彩蛋鱼的上鱼概率为 1.25% + 0.75% = 2%，二者不可出售但统一视作 1500 价值。
// 因此稀有鱼基准期望为 1500 * 2% = 30 鱼币/次成功上鱼；可售鱼区间按 30 / 当前稀有度概率反推后取整。
export const FISH_VALUE_BASELINE = {
  referenceValue: 1500,
  referenceCatchWeight: 0.02,
  referenceExpectedValue: 30
};

export const RARITY_VALUE_LIMITS = {
  common: { min: 35, max: 80 },
  uncommon: { min: 75, max: 165 },
  rare: { min: 150, max: 330 },
  epic: { min: 280, max: 620 },
  legendary: { min: 1500, max: 1500 },
  [EASTER_EGG_RARITY]: { min: 1500, max: 1500 }
};

export const RARITY_SELL_LIMITS = {
  common: RARITY_VALUE_LIMITS.common,
  uncommon: RARITY_VALUE_LIMITS.uncommon,
  rare: RARITY_VALUE_LIMITS.rare,
  epic: RARITY_VALUE_LIMITS.epic,
  legendary: { min: 0, max: 0 },
  [EASTER_EGG_RARITY]: { min: 0, max: 0 }
};

export const EASTER_EGG_EFFECTS = {
  '愿望锦鲤': {
    catchRateBonus: 0.05,
    description: '上鱼率永久+5%'
  },
  '月光玻璃鱼': {
    permanentDailyCasts: 1,
    description: '每日基础钓数永久+1'
  },
  '星尘飞鱼': {
    rarityBias: { rare: 0.012, epic: 0.008, legendary: 0.002 },
    description: '稀有鱼讯更容易靠近'
  },
  '时间沙漏鱼': {
    waitMultiplier: -0.08,
    description: '等待时间略微缩短'
  },
  '反方向的鱼': {
    failProtection: 0.08,
    description: '空竿时有机会补救为上鱼'
  },
  '不存在的鱼': {
    catchCoinBonus: 8,
    description: '每次上鱼额外+8鱼币'
  },
  '空指针鲤': {
    baitPreserveChance: 0.12,
    description: '鱼饵更容易保留下来'
  }
};

export const DEFAULT_ROD_ID = 'starter';
export const DEFAULT_BAIT_ID = 'plain';

// ===== 鱼竿配置说明 =====
// 1. id 要唯一，name 是玩家看到的名字。
// 2. price 是鱼市售价；传说炼成鱼竿保持 0，并通过 sourceLegendary 标记来源。
// 3. waitMultiplier 越小，等待越短；建议保持在 0.60 ~ 1.25 之间。
// 4. catchRateBonus 是上鱼率修正，普通鱼竿建议控制在 -0.03 ~ 0.08 之间。
// 5. failProtection 只在失败事件抽到“空钩”时生效；越高越容易把空钩补救成真实上鱼，普通竿建议 0.02 ~ 0.18，专精竿最高不超过 0.45。
// 6. rarityBias 用来偏移不同稀有度的出鱼倾向，最终会在逻辑里重新归一化。
// 7. 传说鱼竿可额外带 baitPreserveChance / catchCoinBonus / signalBonusCoins 等词条。
// 8. 如果以后要让某根 legendary 专属鱼竿增加玩家每日基础钓数：
//    - 推荐方式：只要玩家拥有这根鱼竿就永久生效，在对应鱼竿配置里加 ownedPermanentDailyCasts: 1。
//    - 如果你明确想做“装备后才有”的鱼竿词条，在对应鱼竿配置里加 permanentDailyCasts: 1。
//    注意：这两种都是基础上限加成，不是钓鱼券；钓鱼券只用于超过基础上限后的临时消耗。
const BUILTIN_ROD_CATALOG = {
  starter: {
    id: 'starter',
    name: '新手竹竿',
    price: 0,
    waitMultiplier: 1,
    catchRateBonus: 0,
    failProtection: 0,
    rarityBias: {},
    description: '均衡耐用，没有偏科，适合拿来熟悉各种鱼口节奏。'
  },
  quick: {
    id: 'quick',
    name: '疾风短竿',
    price: 120,
    waitMultiplier: 0.58,
    catchRateBonus: 0.0094,
    failProtection: 0.08,
    rarityBias: {
      common: 0.028,
      uncommon: 0.018,
      rare: -0.012,
      epic: -0.012,
      legendary: -0.004
    },
    description: '出手和收线都很利落，等待明显更短，偏向高频钓起近岸杂鱼。'
  },
  steady: {
    id: 'steady',
    name: '稳钓重竿',
    price: 320,
    waitMultiplier: 0.88,
    catchRateBonus: -0.0164,
    failProtection: 0.16,
    rarityBias: {},
    description: '节奏偏稳，虽然上鱼率略低，但空竿补救能力明显更强。'
  },
  hunter: {
    id: 'hunter',
    name: '猎珍长竿',
    price: 500,
    waitMultiplier: 1.15,
    catchRateBonus: -0.0319,
    failProtection: 0.1,
    rarityBias: {
      common: -0.05,
      uncommon: -0.025,
      rare: 0.042,
      epic: 0.028,
      legendary: 0.01
    },
    description: '更愿意等值钱目标开口，压低杂鱼和基础上鱼率，换来更高稀有度倾向。'
  },
  tide: {
    id: 'tide',
    name: '潮声海竿',
    price: 240,
    waitMultiplier: 0.92,
    catchRateBonus: -0.0183,
    failProtection: 0.1,
    sizeMultiplier: 1.025,
    weightMultiplier: 1.03,
    rarityBias: {
      common: -0.015,
      uncommon: 0.008,
      rare: 0.012,
      epic: 0.006
    },
    description: '尺寸和重量会略微往上提，鱼口节奏比新手竿更紧一些。'
  },
  willow: {
    id: 'willow',
    name: '柳影细竿',
    price: 180,
    waitMultiplier: 0.82,
    catchRateBonus: -0.0005,
    failProtection: 0.07,
    rarityBias: {
      common: 0.02,
      uncommon: 0.012,
      rare: -0.006
    },
    description: '等待更短，主要偏向常见和次常见鱼，适合追求连续有口。'
  },
  ember: {
    id: 'ember',
    name: '炽炉硬调竿',
    price: 420,
    waitMultiplier: 1.02,
    catchRateBonus: -0.0209,
    failProtection: 0.14,
    rarityBias: {
      common: -0.018,
      uncommon: -0.012,
      rare: 0.02,
      epic: 0.014,
      legendary: 0.002
    },
    description: '偏向中高稀有度鱼口，兼顾一定补救能力，节奏比珍猎竿稍轻。'
  },
  mist: {
    id: 'mist',
    name: '雾汀夜竿',
    price: 580,
    waitMultiplier: 1.08,
    catchRateBonus: -0.0268,
    failProtection: 0.14,
    minWeightRatio: 0.24,
    rarityBias: {
      common: -0.035,
      uncommon: -0.02,
      rare: 0.032,
      epic: 0.02,
      legendary: 0.006
    },
    description: '更擅长守重量在线的鱼，会上提最低重量门槛，稀有鱼口也更集中。'
  },
  broadscale: {
    id: 'broadscale',
    name: '阔鳞量竿',
    aliases: ['阔鳞量竿', '大鱼竿', '量竿'],
    price: 700,
    waitMultiplier: 1.12,
    catchRateBonus: -0.0283,
    failProtection: 0.16,
    sizeMultiplier: 1.06,
    weightMultiplier: 1.1,
    minWeightRatio: 0.24,
    rarityBias: {
      common: -0.028,
      uncommon: -0.012,
      rare: 0.022,
      epic: 0.018,
      legendary: 0.006
    },
    description: '明显偏向大个体和重鱼，鱼获体型更好，节奏也会更慢一些。'
  },
  boulder: {
    id: 'boulder',
    name: '坠岩守竿',
    aliases: ['坠岩守竿', '巨物竿', '守巨物竿'],
    price: 800,
    waitMultiplier: 1.22,
    catchRateBonus: -0.0564,
    failProtection: 0.23,
    sizeMultiplier: 1.05,
    weightMultiplier: 1.12,
    minWeightRatio: 0.36,
    rarityBias: {
      common: -0.045,
      uncommon: -0.02,
      rare: 0.028,
      epic: 0.026,
      legendary: 0.009
    },
    description: '最擅长守巨物，重量门槛和补救都很高，但基础上鱼率压得最狠。'
  }
};

const LEGENDARY_ROD_BLUEPRINTS = [
  {
    id: 'legend_siren',
    sourceLegendary: '美人鱼',
    name: '潮歌纱竿',
    waitMultiplier: 0.86,
    catchRateBonus: 0.0628,
    failProtection: 0.1,
    baitPreserveChance: 0.2,
    rarityBias: { common: -0.01, uncommon: 0.01, rare: 0.02, epic: 0.008, legendary: 0.004 },
    description: '等待偏短、节奏轻快，还能显著提高鱼饵保留率。'
  },
  {
    id: 'legend_palace',
    sourceLegendary: '龙宫使者',
    name: '宫潮礼竿',
    waitMultiplier: 0.95,
    catchRateBonus: 0.0394,
    failProtection: 0.16,
    signalBonusCoins: 20,
    rarityBias: { common: -0.015, uncommon: -0.005, rare: 0.02, epic: 0.012, legendary: 0.006 },
    description: '整体偏向中高稀有度，命中限时鱼讯时还能多拿一笔额外鱼币。'
  },
  {
    id: 'legend_abyss',
    sourceLegendary: '深海霸主',
    name: '渊统重竿',
    waitMultiplier: 1.14,
    catchRateBonus: 0.011,
    failProtection: 0.2,
    catchCoinBonus: 10,
    rarityBias: { common: -0.04, uncommon: -0.02, rare: 0.03, epic: 0.018, legendary: 0.01 },
    description: '压低常见鱼，稳稳抬高高稀有度占比，每次上鱼还固定多赚鱼币。'
  },
  {
    id: 'legend_ancient',
    sourceLegendary: '远古巨鲨',
    name: '齿岚战竿',
    waitMultiplier: 1.02,
    catchRateBonus: -0.0175,
    failProtection: 0.3,
    rarityBias: { common: -0.03, uncommon: -0.02, rare: 0.02, epic: 0.02, legendary: 0.012 },
    description: '补救能力极强，明显偏向稀有大口，是强硬的守巨物路线。'
  },
  {
    id: 'legend_dragon',
    sourceLegendary: '神龙',
    name: '云霄龙竿',
    waitMultiplier: 0.9,
    catchRateBonus: 0.0062,
    failProtection: 0.14,
    signalBonusCoins: 30,
    rarityBias: { common: -0.05, uncommon: -0.03, rare: 0.03, epic: 0.025, legendary: 0.018 },
    description: '整体偏高稀有度，命中限时鱼讯时能再多拿一大笔鱼币。'
  },
  {
    id: 'legend_kun',
    sourceLegendary: '鲲',
    name: '北溟阔竿',
    waitMultiplier: 1.22,
    catchRateBonus: -0.0665,
    failProtection: 0.38,
    catchCoinBonus: 18,
    rarityBias: { common: -0.06, uncommon: -0.03, rare: 0.03, epic: 0.03, legendary: 0.02 },
    description: '等待偏长、补救极高，外加固定鱼币收益，典型的慢节奏重收益路线。'
  },
  {
    id: 'legend_phoenix',
    sourceLegendary: '凤凰鱼',
    name: '焰羽回竿',
    waitMultiplier: 0.8,
    catchRateBonus: 0.0732,
    failProtection: 0.08,
    baitPreserveChance: 0.28,
    rarityBias: { common: 0.01, uncommon: 0.015, rare: 0.01, epic: 0.008, legendary: 0.004 },
    description: '高频率、高保饵，整体更像一把专门拉快节奏的传说快竿。'
  },
  {
    id: 'legend_qilin',
    sourceLegendary: '麒麟鱼',
    name: '瑞角安竿',
    waitMultiplier: 0.92,
    catchRateBonus: 0.029,
    failProtection: 0.24,
    baitPreserveChance: 0.12,
    rarityBias: { common: -0.01, uncommon: 0.008, rare: 0.015, epic: 0.01, legendary: 0.004 },
    description: '稳字当头，补救和保饵都在线，适合想长期稳定出货的节奏。'
  },
  {
    id: 'legend_kraken',
    sourceLegendary: '巨型乌贼',
    name: '触渊长竿',
    waitMultiplier: 1.12,
    catchRateBonus: 0.0129,
    failProtection: 0.19,
    catchCoinBonus: 12,
    rarityBias: { common: -0.025, uncommon: -0.015, rare: 0.02, epic: 0.02, legendary: 0.012 },
    description: '偏深层、偏值钱，每次上鱼还有稳定追加收益。'
  },
  {
    id: 'legend_megalodon',
    sourceLegendary: '巨齿鲨',
    name: '断潮齿竿',
    waitMultiplier: 1.05,
    catchRateBonus: -0.0444,
    failProtection: 0.36,
    rarityBias: { common: -0.04, uncommon: -0.02, rare: 0.02, epic: 0.025, legendary: 0.015 },
    description: '提竿像咬住了东西一样狠，巨物很难从它手里挣脱。'
  },
  {
    id: 'legend_poseidon',
    sourceLegendary: '海皇波塞冬',
    name: '皇潮御竿',
    waitMultiplier: 0.98,
    catchRateBonus: 0.0104,
    failProtection: 0.18,
    signalBonusCoins: 36,
    rarityBias: { common: -0.03, uncommon: -0.02, rare: 0.02, epic: 0.02, legendary: 0.014 },
    description: '和限时鱼讯最合拍，命中后会把额外鱼币直接放大成一笔大收成。'
  },
  {
    id: 'legend_leviathan',
    sourceLegendary: '利维坦',
    name: '深律禁竿',
    waitMultiplier: 1.18,
    catchRateBonus: -0.0778,
    failProtection: 0.45,
    catchCoinBonus: 20,
    rarityBias: { common: -0.05, uncommon: -0.02, rare: 0.02, epic: 0.025, legendary: 0.018 },
    description: '基础上鱼率压得很低，但补救极强，是典型的极稳守口竿。'
  },
  {
    id: 'legend_kaiju',
    sourceLegendary: '哥斯拉...？',
    name: '辐潮怪竿',
    waitMultiplier: 0.88,
    catchRateBonus: 0.0696,
    failProtection: 0.1,
    catchCoinBonus: 8,
    rarityBias: { common: 0.015, uncommon: 0.01, rare: 0.008, epic: 0.006, legendary: 0.004 },
    description: '节奏很快、上鱼率也高，虽然稀有度提升有限，但整体非常热闹。'
  },
  {
    id: 'legend_sturgeon',
    sourceLegendary: '欧洲鳇',
    name: '鳇纹古竿',
    waitMultiplier: 1.04,
    catchRateBonus: 0.0126,
    failProtection: 0.22,
    rarityBias: { common: -0.02, uncommon: -0.01, rare: 0.02, epic: 0.016, legendary: 0.01 },
    description: '稳中偏贵口，补救和稀有度都不激进，但手感很整齐。'
  },
  {
    id: 'legend_mekong',
    sourceLegendary: '湄公河巨鲶',
    name: '湄涛沉竿',
    waitMultiplier: 1.08,
    catchRateBonus: -0.0062,
    failProtection: 0.32,
    baitPreserveChance: 0.1,
    rarityBias: { common: -0.02, uncommon: 0.005, rare: 0.015, epic: 0.015, legendary: 0.008 },
    description: '补救与保饵并存，节奏偏沉，适合长线守较大目标。'
  },
  {
    id: 'legend_arapaima',
    sourceLegendary: '巨骨舌鱼',
    name: '骨潮挺竿',
    waitMultiplier: 0.84,
    catchRateBonus: 0.0511,
    failProtection: 0.12,
    catchCoinBonus: 6,
    rarityBias: { common: -0.01, uncommon: 0.008, rare: 0.015, epic: 0.012, legendary: 0.006 },
    description: '等待短、收益稳，兼顾一点高稀有度倾向和固定鱼币加成。'
  },
  {
    id: 'legend_oarfish',
    sourceLegendary: '皇带鱼',
    name: '绫海长竿',
    waitMultiplier: 1.16,
    catchRateBonus: 0.0317,
    failProtection: 0.14,
    signalBonusCoins: 16,
    rarityBias: { common: -0.025, uncommon: -0.01, rare: 0.018, epic: 0.016, legendary: 0.01 },
    description: '偏向深层和鱼讯收益，等待较长，但命中目标时回报更厚。'
  },
  {
    id: 'legend_sunfish',
    sourceLegendary: '翻车鱼',
    name: '圆潮乐竿',
    waitMultiplier: 0.74,
    catchRateBonus: 0.0895,
    failProtection: 0.06,
    baitPreserveChance: 0.18,
    rarityBias: { common: 0.02, uncommon: 0.015, rare: 0.005, epic: 0.002, legendary: 0.001 },
    description: '等待极短、上鱼率高，还有一定保饵，属于快乐高频流。'
  },
  {
    id: 'legend_greenland',
    sourceLegendary: '格陵兰鲨',
    name: '寒渊夜竿',
    waitMultiplier: 1.2,
    catchRateBonus: -0.053,
    failProtection: 0.4,
    catchCoinBonus: 14,
    rarityBias: { common: -0.045, uncommon: -0.02, rare: 0.02, epic: 0.022, legendary: 0.014 },
    description: '非常耐守，补救和固定鱼币都高，适合把一口大鱼拖到底。'
  },
  {
    id: 'legend_greatwhite',
    sourceLegendary: '大白鲨',
    name: '裂海锋竿',
    waitMultiplier: 0.96,
    catchRateBonus: -0.0241,
    failProtection: 0.3,
    rarityBias: { common: -0.035, uncommon: -0.015, rare: 0.018, epic: 0.022, legendary: 0.015 },
    description: '补救非常强，明显偏向大口和高稀有度，是另一种凶狠守口路线。'
  },
  {
    id: 'legend_whaleshark',
    sourceLegendary: '鲸鲨',
    name: '鲸穹宽竿',
    waitMultiplier: 1.1,
    catchRateBonus: 0.0075,
    failProtection: 0.22,
    baitPreserveChance: 0.14,
    signalBonusCoins: 12,
    rarityBias: { common: -0.02, uncommon: -0.01, rare: 0.016, epic: 0.018, legendary: 0.012 },
    description: '覆盖面大、节奏稳，还有保饵和鱼讯奖励，整天用下来会很省心。'
  },
  {
    id: 'legend_mojibake',
    sourceLegendary: '锟斤拷烫烫鱼',
    name: '乱码调试竿',
    waitMultiplier: 0.99,
    catchRateBonus: -0.0039,
    failProtection: 0.28,
    baitPreserveChance: 0.16,
    rarityBias: { common: -0.025, uncommon: -0.01, rare: 0.02, epic: 0.018, legendary: 0.01 },
    description: '补救和保饵都很强，整体又偏向更贵的鱼口，是一把很全能的稳竿。'
  }
];

export const LEGENDARY_ROD_RECIPES = Object.fromEntries(
  LEGENDARY_ROD_BLUEPRINTS.map(item => [
    item.id,
    {
      price: 0,
      aliases: [item.name, item.sourceLegendary],
      ...item
    }
  ])
);

export const ROD_CATALOG = {
  ...BUILTIN_ROD_CATALOG,
  ...LEGENDARY_ROD_RECIPES
};

// ===== 鱼饵配置说明 =====
// 1. 默认鱼饵请保留 isDefault: true，且 packSize 设为 0。
// 2. 其他鱼饵的 packSize 表示购买一次给几份库存；强力鱼饵建议缩到 1~2。
// 3. catchRateBonus 现在允许高价单包鱼饵做到 +0.30；越强就越应该配更高价格或更低包数。
// 4. rarityBias 是对稀有度的倾向修正，最终会在逻辑里重新归一化。
// 5. aliases 里可以放你习惯的别名，便于 #换饵 和 #鱼市购买 使用。
// 6. description 只写风格和体感，不直接报数值。
export const BAIT_CATALOG = {
  plain: {
    id: 'plain',
    name: '清水团饵',
    price: 0,
    isDefault: true,
    packSize: 0,
    catchRateBonus: 0,
    rarityBias: {},
    description: '没有额外偏向，适合先拿来试水域、试鱼竿和看基础手感。'
  },
  special_bait: {
    id: 'special_bait',
    name: '香谷鱼饵',
    aliases: ['香谷鱼饵', '香谷饵', '特制鱼饵'],
    price: 45,
    packSize: 3,
    catchRateBonus: 0.1558,
    sizeMultiplier: 0.97,
    weightMultiplier: 0.95,
    rarityBias: {
      common: 0.055,
      uncommon: 0.03,
      rare: -0.025,
      epic: -0.01,
      legendary: -0.003
    },
    description: '明显抬高上鱼率，但会更偏向常见小个体，适合先求稳定出鱼。'
  },
  deep_bait: {
    id: 'deep_bait',
    name: '沉流鱼饵',
    aliases: ['沉流鱼饵', '沉流饵', '深海鱼饵'],
    price: 54,
    packSize: 2,
    catchRateBonus: 0.1148,
    weightMultiplier: 1.03,
    minWeightRatio: 0.12,
    rarityBias: {
      common: -0.075,
      uncommon: -0.035,
      rare: 0.045,
      epic: 0.028,
      legendary: 0.012
    },
    description: '压低杂鱼，略提重量和最低重量门槛，适合等更像样的深层鱼口。'
  },
  silver_bait: {
    id: 'silver_bait',
    name: '银鳞鱼饵',
    aliases: ['银鳞鱼饵', '银鳞饵', '轻灵鱼饵'],
    price: 36,
    packSize: 3,
    catchRateBonus: 0.1632,
    sizeMultiplier: 0.9,
    weightMultiplier: 0.82,
    rarityBias: {
      common: 0.07,
      uncommon: 0.03,
      rare: -0.03,
      epic: -0.015,
      legendary: -0.005
    },
    description: '上鱼率很高，但更容易来小而轻的常见鱼，适合追求高频有口。'
  },
  moss_bait: {
    id: 'moss_bait',
    name: '青苔鱼饵',
    aliases: ['青苔鱼饵', '青苔饵', '草味鱼饵'],
    price: 36,
    packSize: 3,
    catchRateBonus: 0.1232,
    sizeMultiplier: 0.96,
    weightMultiplier: 0.94,
    rarityBias: {
      common: 0.015,
      uncommon: 0.045,
      rare: 0.008,
      epic: -0.015,
      legendary: -0.004
    },
    description: '偏向次常见与中层鱼口，节奏自然，体型会比默认饵略收一点。'
  },
  pepper_bait: {
    id: 'pepper_bait',
    name: '椒盐鱼饵',
    aliases: ['椒盐鱼饵', '椒盐饵', '刺激鱼饵'],
    price: 54,
    packSize: 2,
    catchRateBonus: 0.1508,
    sizeMultiplier: 1.02,
    weightMultiplier: 1.12,
    minWeightRatio: 0.35,
    rarityBias: {
      common: -0.03,
      uncommon: -0.015,
      rare: 0.02,
      epic: 0.008,
      legendary: 0.002
    },
    description: '保留高上鱼率的同时抬高重量门槛，留下来的鱼通常更压手。'
  },
  amber_bait: {
    id: 'amber_bait',
    name: '琥珀鱼饵',
    aliases: ['琥珀鱼饵', '琥珀饵', '暖潮鱼饵'],
    price: 51,
    packSize: 2,
    catchRateBonus: 0.179,
    rarityBias: {
      common: 0.002,
      uncommon: 0.004,
      rare: 0.006,
      epic: 0.004
    },
    description: '整体最均衡，纯粹把上鱼率和各档鱼口一起轻推上去，几乎不挑场。'
  },
  squid_bait: {
    id: 'squid_bait',
    name: '乌贼鱼饵',
    aliases: ['乌贼鱼饵', '乌贼饵', '咸鲜鱼饵'],
    price: 75,
    packSize: 2,
    catchRateBonus: 0.1521,
    sizeMultiplier: 0.99,
    weightMultiplier: 1.12,
    minWeightRatio: 0.4,
    rarityBias: {
      common: -0.04,
      uncommon: -0.02,
      rare: 0.024,
      epic: 0.024,
      legendary: 0.01
    },
    description: '明显偏向较重、较值钱的鱼口，杂鱼会少，但节奏不会特别快。'
  },
  thunder_bait: {
    id: 'thunder_bait',
    name: '雷息鱼饵',
    aliases: ['雷息鱼饵', '雷息饵', '暴口鱼饵'],
    price: 69,
    packSize: 2,
    catchRateBonus: 0.1393,
    sizeMultiplier: 1.12,
    weightMultiplier: 1.08,
    rarityBias: {
      common: -0.035,
      uncommon: -0.02,
      rare: 0.016,
      epic: 0.024,
      legendary: 0.014
    },
    description: '更偏大体型和高阶动静，常见小口会被压下去，适合盯尺寸。'
  },
  moon_bait: {
    id: 'moon_bait',
    name: '月盐鱼饵',
    aliases: ['月盐鱼饵', '月盐饵', '夜钓鱼饵'],
    price: 54,
    packSize: 3,
    catchRateBonus: 0.1275,
    rarityBias: {
      common: -0.005,
      uncommon: 0.018,
      rare: 0.016,
      epic: 0.006,
      legendary: 0.001
    },
    description: '轻微偏向中高稀有度，整体柔和顺手，是比较稳的日常鱼饵。'
  },
  dragon_bait: {
    id: 'dragon_bait',
    name: '龙涎鱼饵',
    aliases: ['龙涎鱼饵', '龙涎饵', '天香鱼饵'],
    price: 66,
    packSize: 1,
    catchRateBonus: 0.139,
    sizeMultiplier: 1.12,
    weightMultiplier: 1.16,
    minWeightRatio: 0.55,
    rarityBias: {
      common: -0.09,
      uncommon: -0.045,
      rare: 0.04,
      epic: 0.038,
      legendary: 0.022
    },
    description: '强压常见鱼，重推高稀有度和高重量门槛，单份就奔着高回报去。'
  },
  growth_bait: {
    id: 'growth_bait',
    name: '丰水膨化饵',
    aliases: ['丰水膨化饵', '丰水鱼饵', '膨化鱼饵', '大体型鱼饵'],
    price: 48,
    packSize: 2,
    catchRateBonus: 0.1437,
    sizeMultiplier: 1.18,
    weightMultiplier: 1.16,
    minSizeRatio: 0.12,
    minWeightRatio: 0.28,
    rarityBias: {
      common: -0.005,
      uncommon: 0.003,
      rare: 0.005,
      epic: 0.003
    },
    description: '重点强化体长、体重和最低个体线，适合专门刷更漂亮的同种鱼。'
  },
  giant_bait: {
    id: 'giant_bait',
    name: '巨物沉底饵',
    aliases: ['巨物沉底饵', '巨物饵', '沉底巨物饵'],
    price: 54,
    packSize: 1,
    catchRateBonus: 0.1709,
    sizeMultiplier: 1.03,
    weightMultiplier: 1.22,
    minWeightRatio: 0.62,
    rarityBias: {
      common: -0.065,
      uncommon: -0.03,
      rare: 0.03,
      epic: 0.025,
      legendary: 0.008
    },
    description: '强烈偏向重鱼和大口，最低重量线很高，基本不照顾轻口小鱼。'
  }
};

export const SHOP_ITEMS = {
  special_bait: {
    ...BAIT_CATALOG.special_bait,
    type: 'bait'
  },
  deep_bait: {
    ...BAIT_CATALOG.deep_bait,
    type: 'bait'
  },
  silver_bait: {
    ...BAIT_CATALOG.silver_bait,
    type: 'bait'
  },
  moss_bait: {
    ...BAIT_CATALOG.moss_bait,
    type: 'bait'
  },
  pepper_bait: {
    ...BAIT_CATALOG.pepper_bait,
    type: 'bait'
  },
  amber_bait: {
    ...BAIT_CATALOG.amber_bait,
    type: 'bait'
  },
  squid_bait: {
    ...BAIT_CATALOG.squid_bait,
    type: 'bait'
  },
  thunder_bait: {
    ...BAIT_CATALOG.thunder_bait,
    type: 'bait'
  },
  moon_bait: {
    ...BAIT_CATALOG.moon_bait,
    type: 'bait'
  },
  dragon_bait: {
    ...BAIT_CATALOG.dragon_bait,
    type: 'bait'
  },
  growth_bait: {
    ...BAIT_CATALOG.growth_bait,
    type: 'bait'
  },
  giant_bait: {
    ...BAIT_CATALOG.giant_bait,
    type: 'bait'
  },
  extra_ticket: {
    id: 'extra_ticket',
    name: '额外钓鱼券',
    aliases: ['额外钓鱼券', '钓鱼券', '加时券'],
    type: 'ticket',
    price: 58,
    count: 1,
    description: '达到每日上限后会自动顶上一竿。'
  },
  custom_bait: {
    id: 'custom_bait',
    name: '自定义鱼饵',
    aliases: ['自定义鱼饵', '定制鱼饵', '手作鱼饵'],
    type: 'custom_bait',
    price: 96,
    description: '根据你输入的文本现配一份鱼饵，固定带 4 条正面效果和 2 条负面效果，整体价值会自动校准。'
  }
};

export const ACHIEVEMENT_DEFS = [
  // 如果以后要让某个成就永久提高玩家本人的每日基础钓数，在 rewards 里加 permanentDailyCasts: 1。
  // 示例：rewards: { permanentDailyCasts: 1 }
  // 注意：不要用 tickets 表示永久次数；tickets 是临时钓鱼券，超过基础上限后每钓一竿消耗 1 张。
  {
    id: 'first_legendary',
    name: '传说开张',
    description: '第一次钓上 legendary。',
    rewardCoins: 120,
    rewards: {
      catchRateBonus: 0.008,
      catchRateHint: '之后提竿时，偶尔会觉得鱼口更肯给面子'
    }
  },
  {
    id: 'epic_arrival',
    name: '大货露头',
    description: '第一次钓上 epic 或更高稀有度的鱼。',
    rewardCoins: 80,
    rewards: {
      baits: [{ id: 'pepper_bait', count: 1 }]
    }
  },
  {
    id: 'rare_pathfinder',
    name: '识水的人',
    description: '第一次摸到 rare 或更深层的鱼口。',
    rewardCoins: 50,
    rewards: {
      baits: [{ id: 'moss_bait', count: 2 }]
    }
  },
  {
    id: 'common_master',
    name: '常见鱼学家',
    description: '集齐全部 common 鱼种。',
    rewardCoins: 160,
    rewards: {
      tickets: 1
    }
  },
  {
    id: 'species_collector',
    name: '认鱼熟手',
    description: '累计见过 15 种不同的鱼。',
    rewardCoins: 90,
    rewards: {
      baits: [{ id: 'silver_bait', count: 2 }]
    }
  },
  {
    id: 'encyclopedia_apprentice',
    name: '图鉴抄满半页',
    description: '累计见过 40 种不同的鱼。',
    rewardCoins: 180,
    rewards: {
      catchRateBonus: 0.01,
      catchRateHint: '往后下竿时，手气会比从前再顺一点'
    }
  },
  {
    id: 'thirty_catches',
    name: '今天也在抛竿',
    description: '累计钓到 30 条鱼。',
    rewardCoins: 70,
    rewards: {
      tickets: 1
    }
  },
  {
    id: 'empty_streak_10',
    name: '十连空军',
    description: '连续空军 10 次。',
    rewardCoins: 100,
    rewards: {
      baits: [{ id: 'special_bait', count: 2 }]
    }
  },
  {
    id: 'market_first_trade',
    name: '鱼市试营业',
    description: '第一次在鱼市兑换鱼币。',
    rewardCoins: 60,
    rewards: {
      baits: [{ id: 'amber_bait', count: 1 }]
    }
  },
  {
    id: 'market_regular',
    name: '摊位常客',
    description: '在鱼市完成 10 次交易。',
    rewardCoins: 120,
    rewards: {
      tickets: 1
    }
  },
  {
    id: 'rod_collector',
    name: '装备党',
    description: '拥有 3 种不同鱼竿。',
    rewardCoins: 90,
    rewards: {
      baits: [{ id: 'deep_bait', count: 1 }]
    }
  },
  {
    id: 'tank_first_upgrade',
    name: '鱼缸扩建',
    description: '第一次升级鱼缸。',
    rewardCoins: 110,
    rewards: {
      catchRateBonus: 0.005,
      catchRateHint: '鱼缸宽裕之后，整个人的节奏都更稳了些'
    }
  },
  {
    id: 'legend_rod_smith',
    name: '炼竿有成',
    description: '第一次炼出传说鱼竿。',
    rewardCoins: 150,
    rewards: {
      tickets: 1,
      baits: [{ id: 'dragon_bait', count: 1 }]
    }
  },
  {
    id: 'signal_hunter',
    name: '追讯人',
    description: '钓到 5 条限时鱼讯目标鱼。',
    rewardCoins: 140,
    rewards: {
      catchRateBonus: 0.007,
      catchRateHint: '听鱼讯久了，抬手的时机也会更准一点'
    }
  }
];

export const PANEL_WIDTH = 1120;
export const PANEL_SECTION_LINE_HEIGHT = 38;
export const PANEL_PADDING = 48;
