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
    waitMultiplier: -0.10,
    emptyStreakCatchRateBonus: 0.025,
    emptyStreakCatchRateBonusCap: 0.10,
    description: '等待略短，空军越久越容易等来下一口'
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
    description: '竹节老实，入水后不偏不倚，最适合先把手感练熟。'
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
    description: '短竿一抖像风掠水面，近处那些耐不住性的口总先找上来。'
  },
  steady: {
    id: 'steady',
    name: '稳钓重竿',
    price: 320,
    waitMultiplier: 0.88,
    catchRateBonus: -0.0164,
    failProtection: 0.16,
    rarityBias: {},
    description: '竿身压得住浪头，原本要散掉的那一下，常会被它稳稳接回来。'
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
    description: '线放得远，心也沉得住，像样的动静总爱在它眼皮底下露头。'
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
    description: '竿梢带着潮气，来的鱼未必急，却常比看上去更有点分量。'
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
    description: '影子一样轻细，风一过就有回讯，适合守着一整天不断的小动静。'
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
    description: '像炉火里退出来的硬调，真咬实了，手里总更有几分底气。'
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
    description: '雾里最会分轻重，平时静些，真来口时往往不像小事。'
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
    description: '像拿尺去量水里的影子，拉上来的家伙常比同类更阔更沉。'
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
    description: '守得像块坠岩，半天不见动静也罢，一沉下去多半不轻。'
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
    description: '纱线一沾潮声就轻轻发紧，鱼口来得快，饵也不爱白白走丢。'
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
    description: '像带着龙宫递来的水信，水里哪处正热闹，常先被它听见。'
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
    description: '重心压得很深，肯开口的多半不是寻常路过的小东西。'
  },
  {
    id: 'legend_ancient',
    sourceLegendary: '远古巨鲨',
    name: '齿岚战竿',
    waitMultiplier: 1.02,
    catchRateBonus: -0.0175,
    failProtection: 0.3,
    rarityBias: { common: -0.03, uncommon: -0.02, rare: 0.02, epic: 0.02, legendary: 0.012 },
    description: '提竿时像有旧海兽反咬一口，真压手的家伙不太走得脱。'
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
    description: '云气压在竿身上，鱼讯一起，来路正的那口总显得更近。'
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
    description: '慢得像北溟翻潮，可真压下来时，手里常像拖着整片水势。'
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
    description: '焰羽一抖，水面就热闹起来，连着来几口也不稀奇。'
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
    description: '不躁不乱，像把水面的气都抚平，越钓越显得顺手安稳。'
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
    description: '线垂得很深，像触腕往下探，碰上的多半不是轻飘飘的角色。'
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
    description: '海皇的潮意总和当天水路合拍，真撞上那阵热闹，收成常会翻浪。'
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
    description: '像在水下划了一道不许越过去的线，口不算多，却极难白白放走。'
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
    description: '躁得像辐潮翻身，先来试探它的鱼，总比别处多一些。'
  },
  {
    id: 'legend_sturgeon',
    sourceLegendary: '欧洲鳇',
    name: '鳇纹古竿',
    waitMultiplier: 1.04,
    catchRateBonus: 0.0126,
    failProtection: 0.22,
    rarityBias: { common: -0.02, uncommon: -0.01, rare: 0.02, epic: 0.016, legendary: 0.01 },
    description: '古纹贴着竿身，水气老练得很，来者未必多，却常像有点年头。'
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
    description: '沉得像大河心口的淤流，守着守着，总会把那口大的等出来。'
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
    description: '骨节挺得很直，鱼一靠近就有声色，抬手时也常顺带捎回点彩头。'
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
    description: '线意拖得很长，像追着深层那点若隐若现的亮光走。'
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
    description: '圆滚滚地热闹，水面稍有风吹草动，它就爱跟着起劲。'
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
    description: '冷得很沉，最适合和慢口耗着，越往后越显得不慌不忙。'
  },
  {
    id: 'legend_greatwhite',
    sourceLegendary: '大白鲨',
    name: '裂海锋竿',
    waitMultiplier: 0.96,
    catchRateBonus: -0.0241,
    failProtection: 0.3,
    rarityBias: { common: -0.035, uncommon: -0.015, rare: 0.018, epic: 0.022, legendary: 0.015 },
    description: '利得像一记横斩，真碰上大口时，几乎不给它转身的余地。'
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
    description: '看着宽缓，水下却铺得很开，一整天用下来总有种不紧不慢的安稳。'
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
    description: '乱流里的信号都能被它一点点理顺，险些散掉的口，常会被重新兜回来。'
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
    description: '团得清清爽爽，不抢水味，也不替你拿主意。'
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
    description: '谷香一散，先围上来的总是些不太挑剔的嘴。'
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
    description: '沉下去后不太爱惊动浅口，底下那点影子反而更清楚。'
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
    description: '碎银一样散开，近处的小动静总会先一步来试探。'
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
    description: '像岸边石缝里带出来的水气，浅岸和中层都愿意先来闻一闻。'
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
    description: '咸辛味一顶上来，犹豫的小口会散些，留下来的往往更有点力气。'
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
    description: '有种暖潮推着手走的顺劲，放进哪片水里都不太显得突兀。'
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
    description: '咸鲜味压得住场子，像是专门拿来等那些更值点钱的家伙。'
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
    description: '气味来得急，像远处闷雷滚过，真有分量的动静会更醒目。'
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
    description: '味道淡淡铺开，水面安静，底下却未必真的清闲。'
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
    description: '香气沉得住，像是冲着像样的大口去的，小鱼多半不敢先碰。'
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
    description: '发得蓬松，看着普通，真正引来的常是同类里更出挑的那条。'
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
    description: '落到底下就很少讨好轻口，像在专门请那些压手的东西露面。'
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
    description: '照着一句话现拌出来的小怪东西，常有几分灵性，也总带点脾气。'
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
