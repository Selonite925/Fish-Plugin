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
export const BAIT_PRESERVE_CHANCE_CAP = 0.75;

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
// 因此稀有鱼基准期望为 1500 * 2% = 30 鱼蛋/次成功上鱼；可售鱼区间按 30 / 当前稀有度概率反推后取整。
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
    catchRateBonus: 0.03,
    description: '水面会更愿意回应你的期待'
  },
  '月光玻璃鱼': {
    permanentDailyCasts: 1,
    description: '明天开始，你会比昨天多出一次从容抛竿'
  },
  '星尘飞鱼': {
    rarityBias: { common: -0.012, uncommon: -0.008, rare: 0.01, epic: 0.007, legendary: 0.003 },
    description: '稀有的动静更容易向你这边聚拢'
  },
  '时间沙漏鱼': {
    waitMultiplier: -0.08,
    emptyStreakCatchRateBonus: 0.02,
    emptyStreakCatchRateBonusCap: 0.04,
    description: '等待会悄悄缩短，久未起鱼时下一口也更容易来'
  },
  '反方向的鱼': {
    failProtection: 0.055,
    description: '有些本该落空的手感，会被悄悄拉回正轨'
  },
  '不存在的鱼': {
    catchCoinBonusRate: 0.08,
    description: '每次真正起鱼时，都会多出一点看不见的收获'
  },
  '空指针鲤': {
    baitPreserveChance: 0.28,
    description: '挂上的鱼饵比平时更不容易无声消失'
  },
  '铁yu...?': {
    baitEffectAmplifier: 0.05,
    description: '钓鱼核心已就绪，鱼饵效率上升'
  },
  '闲鱼': {
    recycleOwnTrash: true,
    description: '自己钓起垃圾、捞起失物，或把少量失手翻成垃圾时，会被它顺手回收成鱼蛋'
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
    description: '竹节泛着淡青色，竿尾缠着粗麻线，像刚从河岸边削好。'
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
    description: '短竿细窄，竿身有几道像风纹一样的浅刻，握柄轻得像一截羽骨。'
  },
  steady: {
    id: 'steady',
    name: '稳钓重竿',
    price: 320,
    waitMultiplier: 0.88,
    catchRateBonus: -0.0164,
    failProtection: 0.16,
    rarityBias: {},
    description: '竿身厚重乌亮，铜色配重环一圈圈压在尾节上。'
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
    description: '长竿线轮深黑，竿梢嵌着一点冷银，整体像一支拉长的猎矛。'
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
    description: '竿梢覆着一层淡蓝潮纹，金属导环像被海雾磨过。'
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
    description: '竿身细得像柳枝，青灰色漆面在光下有柔软的弯弧。'
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
    description: '暗红竿节像淬过火的炭纹，握把边缘留着细碎炉灰色。'
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
    description: '雾白漆面半透明，竿节交界处像被薄雾轻轻罩住。'
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
    description: '宽扁竿身刻着大片鳞纹，量尺一样的银线沿背脊铺开。'
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
    description: '尾节像石坠一样厚，灰黑竿身上有粗糙的岩纹。'
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
    description: '半透明纱线缠在竿节之间，淡蓝竿身像浸过一层潮光。'
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
    description: '竿身镶着贝母白与青金纹，尾端垂着小小的宫铃坠。'
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
    description: '深黑竿身压着暗金脊线，尾节像一枚沉入海底的锚。'
  },
  {
    id: 'legend_ancient',
    sourceLegendary: '远古巨鲨',
    name: '齿岚战竿',
    waitMultiplier: 1.02,
    catchRateBonus: -0.0175,
    failProtection: 0.3,
    rarityBias: { common: -0.03, uncommon: -0.02, rare: 0.02, epic: 0.02, legendary: 0.012 },
    description: '锯齿状护片沿竿背排开，银灰刃纹像被海风磨亮。'
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
    description: '云白竿身盘着细金龙纹，竿梢一点青光像藏在云后。'
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
    description: '宽阔竿身呈深海蓝，边缘铺着像鲸背一样的幽暗渐层。'
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
    description: '赤羽纹从握柄一路燃到竿梢，漆面像覆着温热的火光。'
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
    description: '白玉色竿节温润平滑，握柄上嵌着一枚小小的瑞角纹。'
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
    description: '长竿通体墨紫，几道触腕状纹路沿着竿身缓缓缠绕。'
  },
  {
    id: 'legend_megalodon',
    sourceLegendary: '巨齿鲨',
    name: '断潮齿竿',
    waitMultiplier: 1.05,
    catchRateBonus: -0.0444,
    failProtection: 0.36,
    rarityBias: { common: -0.04, uncommon: -0.02, rare: 0.02, epic: 0.025, legendary: 0.015 },
    description: '竿背裂开鲨齿般的白纹，锋利银边从尾节一直收向竿梢。'
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
    description: '深蓝竿身覆着王冠状潮纹，金色导环像一串小小海冕。'
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
    description: '黑曜色竿身刻着整齐禁纹，冷银线条像水下的边界。'
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
    description: '竿身有不规则的荧绿斑痕，暗色漆面像被怪兽踩过的潮泥。'
  },
  {
    id: 'legend_sturgeon',
    sourceLegendary: '欧洲鳇',
    name: '鳇纹古竿',
    waitMultiplier: 1.04,
    catchRateBonus: 0.0126,
    failProtection: 0.22,
    rarityBias: { common: -0.02, uncommon: -0.01, rare: 0.02, epic: 0.016, legendary: 0.01 },
    description: '古铜竿节布满细密骨纹，表面带着旧河泥般的暗金色。'
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
    description: '厚实竿身呈浑河棕，尾端包着一圈沉甸甸的旧铜。'
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
    description: '白骨色竿脊笔直挺起，蓝灰纹路像潮水灌进骨缝。'
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
    description: '细长竿身拖着绫带般的银蓝纹，竿梢像一线飘远的海光。'
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
    description: '圆润短胖的竿节泛着暖橙光，握柄上画着一圈圈潮泡。'
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
    description: '冷黑竿身像夜色里的冰面，细小银点沿竿节稀疏闪着。'
  },
  {
    id: 'legend_greatwhite',
    sourceLegendary: '大白鲨',
    name: '裂海锋竿',
    waitMultiplier: 0.96,
    catchRateBonus: -0.0241,
    failProtection: 0.3,
    rarityBias: { common: -0.035, uncommon: -0.015, rare: 0.018, epic: 0.022, legendary: 0.015 },
    description: '锋利白纹斜切过深蓝竿身，尾端护片像一片开裂的浪刃。'
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
    description: '宽背竿身有鲸腹一样的浅灰弧线，背面铺着深蓝穹顶色。'
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
    description: '竿身闪着断断续续的方块纹，几枚错位字符卡在透明漆层里。'
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

export const LOTTERY_ROD_PLUGINS = {
  gold_humble: {
    id: 'lottery_gold_humble',
    sourceLottery: true,
    lotteryValue: 2500,
    recycleValue: 1250,
    name: '金满而谦虚之竿',
    aliases: ['金满而谦虚之竿', '金谦竿', '金谦', '金满竿'],
    price: 0,
    waitMultiplier: 1.04,
    catchRateBonus: -0.012,
    failProtection: 0.1,
    rarityBias: {
      common: 0.018,
      uncommon: 0.006,
      rare: -0.008,
      epic: -0.01,
      legendary: -0.003,
      [EASTER_EGG_RARITY]: -0.003
    },
    targetFishEffect: {
      type: 'gold_humble',
      targetChangeLimitPerDay: 1,
      revealChanceByRarity: {
        common: 0.5,
        uncommon: 0.5,
        rare: 0.5,
        epic: 0.44,
        legendary: 0.52,
        [EASTER_EGG_RARITY]: 0.52
      },
      distractorCountByRarity: {
        common: 4,
        uncommon: 3,
        rare: 2,
        epic: 2,
        legendary: 1,
        [EASTER_EGG_RARITY]: 1
      },
      rarityBiasByTargetRarity: {
        common: { common: 0.102, uncommon: -0.081, rare: -0.017, epic: -0.01, legendary: 0.0025, [EASTER_EGG_RARITY]: 0.0035 },
        uncommon: { common: -0.248, uncommon: 0.199, rare: 0.023, epic: 0.01, legendary: 0.0105, [EASTER_EGG_RARITY]: 0.0055 },
        rare: { common: -0.308, uncommon: -0.071, rare: 0.243, epic: 0.09, legendary: 0.0305, [EASTER_EGG_RARITY]: 0.0155 },
        epic: { common: -0.278, uncommon: -0.081, rare: 0.013, epic: 0.25, legendary: 0.0505, [EASTER_EGG_RARITY]: 0.0455 },
        legendary: { common: -0.248, uncommon: -0.081, rare: 0.003, epic: 0.16, legendary: 0.1305, [EASTER_EGG_RARITY]: 0.0355 },
        [EASTER_EGG_RARITY]: { common: -0.248, uncommon: -0.081, rare: 0.003, epic: 0.16, legendary: 0.0305, [EASTER_EGG_RARITY]: 0.1355 }
      },
      catchRateBonusByTargetRarity: {
        common: 0.1646,
        uncommon: 0.0636,
        rare: -0.0377,
        epic: -0.0858,
        legendary: -0.1082,
        [EASTER_EGG_RARITY]: -0.1084
      },
      rewardCoinsByRarity: {
        common: 720,
        uncommon: 820,
        rare: 820,
        epic: 1050,
        legendary: 1450,
        [EASTER_EGG_RARITY]: 1800
      },
      rarityTargetRewardCoinsByRarity: {
        common: 30,
        uncommon: 45,
        rare: 65,
        epic: 95,
        legendary: 220,
        [EASTER_EGG_RARITY]: 300
      }
    },
    suppressExtraCoinBonuses: true,
    description: '竿身鎏金却薄得像一线晨光，握把缠着素白细绳，华丽得很克制。'
  }
};

export const LOTTERY_GRAND_PRIZE_PLUGINS = {
  gold_humble_rod: {
    id: 'gold_humble_rod',
    name: '金满而谦虚之竿',
    aliases: ['金满而谦虚之竿', '金满竿', '金谦竿', '金谦'],
    description: '金线绕着竿节安静收束，像把一束很亮的愿望压低了声音。',
    reward: {
      type: 'rod',
      id: LOTTERY_ROD_PLUGINS.gold_humble.id,
      value: 2500,
      duplicateCompensationCoins: 1250
    }
  },
  bait_delivery_clerk: {
    id: 'bait_delivery_clerk',
    name: '鱼饵配送员',
    aliases: ['鱼饵配送员', '配送员', '鱼饵快递', '鱼饵配送', '配送'],
    description: '每天会在第一次抛竿前送来三包随机鱼饵，普通鱼饵和祈愿限定鱼饵都有机会。',
    reward: {
      type: 'special_item',
      id: 'bait_delivery_clerk',
      value: 2200,
      title: '鱼饵配送员',
      desc: '已登记每日鱼饵配送服务：每天可领取 3 包随机鱼饵。'
    },
    dailyDelivery: {
      packCount: 3,
      pool: 'all_baits'
    }
  }
};

export const LOTTERY_CONFIG = {
  cost: 100,
  maxDrawsPerCommand: 10,
  grandPrize: {
    rate: 0.01,
    pityDraws: 100,
    defaultPluginId: 'gold_humble_rod'
  },
  regularRewards: [
    { type: 'coins', min: 18, max: 26, weight: 0.0844, value: 22, title: '零散鱼蛋', desc: '袋底还有几枚亮晶晶的鱼蛋' },
    { type: 'coins', min: 42, max: 58, weight: 0.139, value: 50, title: '小袋鱼蛋', desc: '回收台下摸出一小袋鱼蛋' },
    { type: 'coins', min: 76, max: 98, weight: 0.12, value: 87, title: '沉甸鱼蛋', desc: '袋子不大，但响得很踏实' },
    { type: 'coins', amount: 180, weight: 0.043, value: 180, title: '闪金鱼蛋', desc: '一枚挺会发光的金色前菜' },
    { type: 'ticket', count: 1, weight: 0.122, value: 58, title: '额外钓鱼券', desc: '今日上限后可再多抛一竿' },
    { type: 'ticket', count: 2, weight: 0.06, value: 116, title: '双尾钓鱼券', desc: '两次额外抛竿，适合继续追口' },
    { type: 'lottery_free_draw', count: 1, weight: 0.01, value: 100, title: '再祈一愿', desc: '获得 1 次免费钓鱼祈愿' },
    { type: 'lottery_free_draw', count: 10, weight: 0.0006, value: 1000, title: '免费十连', desc: '获得 10 次免费钓鱼祈愿' },
    { type: 'bait', id: 'special_bait', count: 2, weight: 0.06, value: 30, title: '香谷鱼饵 2份', desc: '鱼饵库存 +2 份，稳定好用的垫池鱼饵' },
    { type: 'bait', id: 'deep_bait', count: 1, weight: 0.04, value: 27, title: '沉流鱼饵 1份', desc: '鱼饵库存 +1 份，给深水口留一点机会' },
    { type: 'bait', id: 'lottery_gilt_bait', packCount: 1, weight: 0.07, value: 58, title: '鎏金团饵 1包', desc: '愿品限定：1包1份，库存 +1 份' },
    { type: 'bait', id: 'lottery_humble_bait', packCount: 1, weight: 0.04, value: 92, title: '谦光素饵 1包', desc: '愿品限定：1包2份，库存 +2 份' },
    { type: 'bait', id: 'lottery_starry_bait', packCount: 1, weight: 0.06, value: 62, title: '星屑诱饵 1包', desc: '愿品限定：1包1份，库存 +1 份' },
    { type: 'bait', id: 'lottery_abyss_bait', packCount: 1, weight: 0.055, value: 74, title: '渊金鱼饵 1包', desc: '愿品限定：1包1份，库存 +1 份' },
    { type: 'bait', id: 'lottery_dark_tide_bait', packCount: 1, weight: 0.006, value: 86, title: '冥潮逆饵 1包', desc: '愿品限定：1包1份，库存 +1 份' },
    { type: 'bait', id: 'lottery_giant_bait', packCount: 1, weight: 0.06, value: 68, title: '王鳞重饵 1包', desc: '愿品限定：1包1份，库存 +1 份' },
    { type: 'bait', id: 'lottery_mirror_bait', packCount: 1, weight: 0.03, value: 80, title: '镜水留饵 1包', desc: '愿品限定：1包2份，库存 +2 份' }
  ]
};

export const ROD_CATALOG = {
  ...BUILTIN_ROD_CATALOG,
  ...LEGENDARY_ROD_RECIPES,
  ...Object.fromEntries(Object.values(LOTTERY_ROD_PLUGINS).map(item => [item.id, item]))
};

// ===== 鱼饵配置说明 =====
// 1. 默认鱼饵请保留 isDefault: true，且 packSize 设为 0。
// 2. 其他鱼饵的 packSize 表示购买一次给几份库存；强力鱼饵建议缩到 1~2。
// 3. catchRateBonus 现在允许高价单包鱼饵做到 +0.30；越强就越应该配更高价格或更低包数。
// 4. rarityBias 是对稀有度的倾向修正，最终会在逻辑里重新归一化。
// 5. aliases 里可以放你习惯的别名，便于 #换饵 和 #鱼市购买 使用。
// 6. description 只写外观、材质和气味，不直接描述效果或报数值。
export const BAIT_CATALOG = {
  plain: {
    id: 'plain',
    name: '清水团饵',
    price: 0,
    isDefault: true,
    packSize: 0,
    catchRateBonus: 0,
    rarityBias: {},
    description: '清水色饵团圆润透明，表面只挂着一层淡淡水光。'
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
    description: '浅米色饵团夹着碎谷壳，捏开时有一圈松散的细纹。'
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
    description: '深青色饵团沉沉发暗，边缘像被水流磨成钝圆。'
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
    description: '细碎银片贴在饵面上，晃动时像一小把鱼鳞落光。'
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
    description: '青绿色饵面带着绒绒苔痕，边角还沾着一点湿润石粉。'
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
    description: '乳白饵团上撒着黑红细粒，看起来像裹了一层粗盐。'
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
    description: '琥珀色饵团透着暖光，中间像封着一颗小小气泡。'
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
    description: '墨黑饵团带着乌紫光泽，表面有几道卷曲的细纹。'
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
    description: '深灰饵团里藏着蓝白裂纹，像一团被雷光照亮的云。'
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
    description: '淡白饵面泛着月盐般的晶粒，边缘有一圈柔和银晕。'
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
    description: '蜜金色饵团拉出细长光丝，表面像凝着一滴古香。'
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
    description: '蓬松饵团鼓成不规则小球，浅黄色孔洞密密麻麻。'
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
    description: '黑褐色重饵压成扁圆石块，底面嵌着几颗粗砂。'
  },
  lottery_gilt_bait: {
    id: 'lottery_gilt_bait',
    name: '鎏金团饵',
    aliases: ['鎏金团饵', '鎏金饵', '祈愿鎏金饵'],
    price: 0,
    packSize: 1,
    lotteryOnly: true,
    catchRateBonus: 0.055,
    sizeMultiplier: 1.04,
    weightMultiplier: 1.14,
    minWeightRatio: 0.35,
    rarityBias: {
      common: -0.085,
      uncommon: -0.04,
      rare: 0.045,
      epic: 0.035,
      legendary: 0.018
    },
    description: '金粉在饵团表面浮成细碎涟漪，捏开时像有一点暖光漏出来。'
  },
  lottery_humble_bait: {
    id: 'lottery_humble_bait',
    name: '谦光素饵',
    aliases: ['谦光素饵', '谦光饵', '祈愿谦光饵'],
    price: 0,
    packSize: 2,
    lotteryOnly: true,
    catchRateBonus: 0.235,
    baitPreserveChance: 0.08,
    sizeMultiplier: 0.9,
    weightMultiplier: 0.86,
    rarityBias: {
      common: 0.09,
      uncommon: 0.04,
      rare: -0.045,
      epic: -0.022,
      legendary: -0.006
    },
    description: '白得近乎透明，边缘只有一圈很淡的金线，放在掌心像一枚薄玉。'
  },
  lottery_starry_bait: {
    id: 'lottery_starry_bait',
    name: '星屑诱饵',
    aliases: ['星屑诱饵', '星屑饵', '祈愿星屑饵'],
    price: 0,
    packSize: 1,
    lotteryOnly: true,
    catchRateBonus: 0.095,
    sizeMultiplier: 0.98,
    weightMultiplier: 1.04,
    rarityBias: {
      common: -0.105,
      uncommon: -0.045,
      rare: 0.085,
      epic: 0.052,
      legendary: -0.006
    },
    description: '深蓝饵粉里嵌着细小亮点，像被轻轻压碎的一小片夜空。'
  },
  lottery_abyss_bait: {
    id: 'lottery_abyss_bait',
    name: '渊金鱼饵',
    aliases: ['渊金鱼饵', '渊金饵', '祈愿渊金饵'],
    price: 0,
    packSize: 1,
    lotteryOnly: true,
    catchRateBonus: -0.035,
    sizeMultiplier: 1.1,
    weightMultiplier: 1.2,
    minWeightRatio: 0.55,
    rarityBias: {
      common: -0.16,
      uncommon: -0.08,
      rare: 0.055,
      epic: 0.065,
      legendary: 0.04,
      [EASTER_EGG_RARITY]: 0.018
    },
    description: '黑金色饵团沉甸甸的，表面偶尔浮起像深水气泡的光。'
  },
  lottery_dark_tide_bait: {
    id: 'lottery_dark_tide_bait',
    name: '冥潮逆饵',
    aliases: ['冥潮逆饵', '冥潮饵', '祈愿冥潮饵', '深稀有鱼饵'],
    price: 0,
    packSize: 1,
    lotteryOnly: true,
    catchRateBonus: -0.115,
    sizeMultiplier: 0.86,
    weightMultiplier: 0.78,
    rarityBias: {
      common: -0.31,
      uncommon: -0.18,
      rare: -0.075,
      epic: 0.04,
      legendary: 0.085,
      [EASTER_EGG_RARITY]: 0.052
    },
    description: '墨蓝饵团像一小块沉下去的夜色，边缘浮着细碎冷银砂。'
  },
  lottery_giant_bait: {
    id: 'lottery_giant_bait',
    name: '王鳞重饵',
    aliases: ['王鳞重饵', '王鳞饵', '祈愿王鳞饵'],
    price: 0,
    packSize: 1,
    lotteryOnly: true,
    catchRateBonus: 0.08,
    sizeMultiplier: 1.22,
    weightMultiplier: 1.32,
    minSizeRatio: 0.38,
    minWeightRatio: 0.68,
    rarityBias: {
      common: -0.06,
      uncommon: -0.025,
      rare: 0.03,
      epic: 0.022,
      legendary: 0.006
    },
    description: '饵面压着大块鳞纹，拿在手里像一枚小小的金属坠子。'
  },
  lottery_mirror_bait: {
    id: 'lottery_mirror_bait',
    name: '镜水留饵',
    aliases: ['镜水留饵', '镜水饵', '祈愿镜水饵'],
    price: 0,
    packSize: 2,
    lotteryOnly: true,
    catchRateBonus: 0.035,
    baitPreserveChance: 0.42,
    sizeMultiplier: 0.94,
    weightMultiplier: 0.92,
    rarityBias: {
      common: 0.035,
      uncommon: 0.02,
      rare: -0.018,
      epic: -0.01,
      legendary: -0.003
    },
    description: '湿润得像一片水面，转动时能映出一圈模糊的倒影。'
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
    description: '第一次在鱼市兑换鱼蛋。',
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
