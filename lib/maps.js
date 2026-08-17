import { EASTER_EGG_RARITY } from './constants.js';

const DEEP_SEA_FISH = {
  common: [
    { name: '灯笼乌贼', size: { min: 8, max: 24 }, weight: { min: 0.02, max: 0.18 } },
    { name: '玻璃鳀', size: { min: 6, max: 18 }, weight: { min: 0.01, max: 0.06 } },
    { name: '深潮银鱼', size: { min: 10, max: 28 }, weight: { min: 0.02, max: 0.2 } },
    { name: '荧光鳗苗', size: { min: 12, max: 32 }, weight: { min: 0.03, max: 0.3 } },
    { name: '黑潮鲱', size: { min: 18, max: 42 }, weight: { min: 0.08, max: 0.5 } },
    { name: '岩缝雀鲷', size: { min: 7, max: 22 }, weight: { min: 0.02, max: 0.16 } }
  ],
  uncommon: [
    { name: '雾鳞鲈', size: { min: 24, max: 70 }, weight: { min: 0.4, max: 6 } },
    { name: '蓝洞鲹', size: { min: 28, max: 78 }, weight: { min: 0.5, max: 7 } },
    { name: '棱镜海鳗', size: { min: 35, max: 120 }, weight: { min: 0.6, max: 8 } },
    { name: '裂谷鲳', size: { min: 22, max: 65 }, weight: { min: 0.3, max: 4.5 } },
    { name: '月牙狗鱼', size: { min: 40, max: 105 }, weight: { min: 1, max: 14 } },
    { name: '熔岩鳚', size: { min: 18, max: 52 }, weight: { min: 0.2, max: 2.8 } }
  ],
  rare: [
    { name: '深潜六线鱼', size: { min: 55, max: 130 }, weight: { min: 3, max: 25 } },
    { name: '冰脊鳕', size: { min: 65, max: 150 }, weight: { min: 4, max: 30 } },
    { name: '黑潮旗鲷', size: { min: 70, max: 180 }, weight: { min: 5, max: 38 } },
    { name: '斑纹鬼鲉', size: { min: 40, max: 100 }, weight: { min: 1.5, max: 14 } },
    { name: '蓝洞石斑', size: { min: 70, max: 165 }, weight: { min: 6, max: 45 } },
    { name: '夜航鲭', size: { min: 65, max: 145 }, weight: { min: 4, max: 26 } }
  ],
  epic: [
    { name: '巨口海狼', size: { min: 120, max: 260 }, weight: { min: 30, max: 180 } },
    { name: '断层鲨', size: { min: 180, max: 420 }, weight: { min: 90, max: 560 } },
    { name: '深渊皇带鱼', size: { min: 250, max: 620 }, weight: { min: 35, max: 240 } },
    { name: '冰火双鳍鲨', size: { min: 220, max: 500 }, weight: { min: 100, max: 650 } },
    { name: '黑曜鲸鲨', size: { min: 360, max: 820 }, weight: { min: 500, max: 3500 } },
    { name: '沉眠巨魟', size: { min: 220, max: 560 }, weight: { min: 90, max: 720 } }
  ],
  legendary: [
    { name: '深海灯塔鲸', size: { min: 700, max: 1500 }, weight: { min: 4500, max: 22000 } },
    { name: '裂谷古龙', size: { min: 900, max: 2200 }, weight: { min: 6000, max: 30000 } },
    { name: '逆流利维坦', size: { min: 1800, max: 5200 }, weight: { min: 18000, max: 90000 } },
    { name: '星环巨乌贼', size: { min: 900, max: 1900 }, weight: { min: 2500, max: 12000 } },
    { name: '黑潮海皇', size: { min: 1200, max: 3600 }, weight: { min: 12000, max: 70000 } }
  ],
  [EASTER_EGG_RARITY]: [
    { name: '潜梦水母鱼', size: { min: 20, max: 66 }, weight: { min: 0.1, max: 2.6 } },
    { name: '无声鳐', size: { min: 90, max: 260 }, weight: { min: 12, max: 90 } },
    { name: '零点灯鱼', size: { min: 1, max: 9 }, weight: { min: 0.01, max: 0.09 } }
  ]
};

const DEEP_SEA_RARITY_WEIGHTS = Object.freeze({
  common: 0.46,
  uncommon: 0.28,
  rare: 0.16,
  epic: 0.075,
  legendary: 0.02,
  [EASTER_EGG_RARITY]: 0.005
});

const DEEP_SEA_TRASH = [
  '断裂的探测器外壳',
  '褪色的潜水信标',
  '缠满海藤的旧缆线',
  '裂开的观测舱窗',
  '失压的补给罐',
  '半枚沉船罗盘',
  '一只发光的空壳'
];

const DEEP_SEA_EVENTS = [
  { message: '鱼线忽然向下绷直，裂谷里传来一声沉闷回响，等你扬竿时只剩一串蓝色气泡。', effect: 'echo' },
  { message: '水下的微光排成一条路，像有什么东西在引你追过去；下一刻，整条路在钩边熄灭。', effect: 'chart' },
  { message: '一阵冷流把浮漂推向黑暗，耳边响起陌生的鲸歌，鱼口却在歌声结束前消失了。', effect: 'echo' },
  { message: '钩尖擦过一块会发热的岩壁，熔光沿鱼线爬上来，留下半截陌生的鳞片。', effect: 'heat' },
  { message: '探照灯照见一只巨大的影子，它绕船一周后安静沉入深处，只把潮声留在原地。', effect: 'chart' },
  { message: '深处像有人轻敲船舷三下，你屏住呼吸提竿，钩上只挂着一枚温热的黑色石片。', effect: 'echo' }
];

const DEEP_SEA_LOST_ITEMS = [
  { itemName: '潜水手套', message: '一只潜水手套被暗流卷走，消失在裂谷边缘。' },
  { itemName: '声呐浮标', message: '声呐浮标脱离绳扣，带着微光沉进了深处。' },
  { itemName: '备用电池', message: '备用电池滚过甲板，扑通一声掉进黑水。' },
  { itemName: '旧航海日志', message: '一本旧航海日志被海风掀走，落在看不见底的水面。' },
  { itemName: '深潜面罩', message: '深潜面罩滑出船边，转眼被冷流带远。' }
];

const DEEP_SEA_MESSAGES = {
  epic: [
    '海面突然向两侧裂开，断层鲨从幽蓝的深处翻身而起，背鳍像一道移动的峭壁。',
    '远处的探照灯被巨影遮住，黑曜色的鲸鲨绕着船底缓缓盘旋，整片海都在它的呼吸里起伏。',
    '鱼线拖出一串细密的火花，沉眠巨魟从海沟底部展开双翼，像一块苏醒的夜空。'
  ],
  legendary: [
    '所有灯光同时熄灭，只有海底亮起一圈遥远的星环。巨大的触手从光环中央升起，星环巨乌贼把整片海面托向夜空。',
    '裂谷深处传来古老的龙吟，海水沿着鱼线逆流而上。裂谷古龙破浪而出，鳞片里藏着一整条发光的地层。',
    '一座像灯塔的鲸影从黑暗里缓缓上浮，它没有张口，却让每一盏船灯重新亮起。深海灯塔鲸把航路照回来了。'
  ],
  [EASTER_EGG_RARITY]: [
    '水面忽然变得像一面梦镜，潜梦水母鱼从镜面另一侧游来，透明的触须拖着一串未醒的星光。'
  ]
};

const MAPS = Object.freeze({
  pond: Object.freeze({
    id: 'pond',
    name: '初始鱼塘',
    shortName: '鱼塘',
    description: '熟悉的岸边水面，保留原有鱼池与演出。',
    unlock: () => true,
    fishTypes: null,
    rarityWeights: null,
    trashItems: null,
    randomEvents: null,
    lostItemEvents: null,
    specialMessages: null,
    castIntro: '岸边的水面轻轻晃着。',
    eventPrefix: '[鱼塘回声]'
  }),
  abyss: Object.freeze({
    id: 'abyss',
    name: '深海裂谷',
    shortName: '裂谷',
    description: '远离初始鱼塘的黑潮海域，鱼影、潮声和失手事件都已换成另一套。',
    unlock: userData => getVeteranProgress(userData).unlocked,
    fishTypes: DEEP_SEA_FISH,
    rarityWeights: DEEP_SEA_RARITY_WEIGHTS,
    trashItems: DEEP_SEA_TRASH,
    randomEvents: DEEP_SEA_EVENTS,
    lostItemEvents: DEEP_SEA_LOST_ITEMS,
    specialMessages: DEEP_SEA_MESSAGES,
    castIntro: '船底的探照灯切开黑潮，鱼线向裂谷深处垂落。',
    eventPrefix: '[深海事件]'
  })
});

const DEEP_SEA_MAP_ID = 'abyss';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function countUnlockedAchievements(userData) {
  return Object.values(userData?.achievements || {})
    .filter(item => item === true || item?.unlocked || item?.completed).length;
}

export function getVeteranProgress(userData = {}) {
  const total = Math.max(0, Number(userData.total || 0));
  const allTimeFish = Array.isArray(userData.allTimeFish) ? userData.allTimeFish.length : 0;
  const tankLevel = Math.max(0, Number(userData.tankLevel || 0));
  const releaseTier = Math.max(0, Number(userData.releaseEcho?.tier || 0));
  const achievements = countUnlockedAchievements(userData);
  const score = clamp(
    total / 24 + allTimeFish / 18 + tankLevel * 1.8 + releaseTier * 1.5 + achievements / 6,
    0,
    12
  );
  const unlocked = total >= 12 || allTimeFish >= 10 || tankLevel >= 1 || releaseTier >= 1 || achievements >= 3;
  return {
    score,
    unlocked,
    tier: score >= 7 ? 'old_salt' : score >= 3 ? 'seasoned' : unlocked ? 'familiar' : 'newcomer'
  };
}

export function getMapProfile(mapId = 'pond') {
  return MAPS[mapId] || MAPS.pond;
}

export function normalizeMapId(mapId = 'pond') {
  const value = String(mapId || '').trim().toLowerCase();
  if (value === 'abyss' || value === 'deep' || value === 'deep_sea' || value === 'deep sea' || value === '深海' || value === '深海裂谷' || value === '裂谷') return DEEP_SEA_MAP_ID;
  return 'pond';
}

export function ensureMapState(userData = {}) {
  if (!userData.mapState || typeof userData.mapState !== 'object' || Array.isArray(userData.mapState)) {
    userData.mapState = {};
  }
  userData.mapState.current = normalizeMapId(userData.mapState.current);
  if (!userData.mapState.visits || typeof userData.mapState.visits !== 'object') userData.mapState.visits = {};
  if (!userData.mapState.catches || typeof userData.mapState.catches !== 'object') userData.mapState.catches = {};
  if (!userData.mapState.discoveries || typeof userData.mapState.discoveries !== 'object') userData.mapState.discoveries = {};
  if (!userData.mapState.events || typeof userData.mapState.events !== 'object') userData.mapState.events = {};
  if (!userData.mapState.abyss || typeof userData.mapState.abyss !== 'object') userData.mapState.abyss = {};
  const abyss = userData.mapState.abyss;
  abyss.echo = Math.max(0, Math.min(20, Math.floor(Number(abyss.echo || 0))));
  abyss.chart = Math.max(0, Math.min(20, Math.floor(Number(abyss.chart || 0))));
  abyss.heat = Math.max(0, Math.min(20, Math.floor(Number(abyss.heat || 0))));
  abyss.nextCastBonusUntil = Math.max(0, Number(abyss.nextCastBonusUntil || 0));
  return userData.mapState;
}

export function getCurrentMapId(userData = {}) {
  return ensureMapState(userData).current;
}

export function canAccessMap(userData, mapId) {
  const profile = getMapProfile(normalizeMapId(mapId));
  return Boolean(profile.unlock?.(userData));
}

export function getMapInfluence(userData = {}, mapId = 'abyss') {
  const normalizedMapId = normalizeMapId(mapId);
  if (normalizedMapId !== DEEP_SEA_MAP_ID) {
    return { score: 0, label: '岸边熟悉感', catchRateBonus: 0, rarityBias: {}, eventChance: 0 };
  }
  const veteran = getVeteranProgress(userData);
  const affinity = clamp(veteran.score / 12, 0, 1);
  const echo = ensureMapState(userData).abyss;
  const echoBonus = echo.echo > 0 ? Math.min(0.002, echo.echo * 0.00025) : 0;
  return {
    score: veteran.score,
    label: affinity >= 0.65 ? '老鱼匠的航感' : affinity >= 0.25 ? '熟悉水性的手感' : '岸边留下的水声',
    catchRateBonus: 0.0015 * affinity + echoBonus,
    rarityBias: {
      rare: 0.0006 * affinity,
      epic: 0.00025 * affinity,
      legendary: 0.00008 * affinity
    },
    eventChance: 0.025 * affinity
  };
}

export function getMapContext(userData = {}, mapId = null) {
  const id = normalizeMapId(mapId || getCurrentMapId(userData));
  const profile = getMapProfile(id);
  const influence = getMapInfluence(userData, id);
  return {
    ...profile,
    id,
    influence,
    fishTypes: profile.fishTypes,
    rarityWeights: profile.rarityWeights,
    trashItems: profile.trashItems,
    randomEvents: profile.randomEvents,
    lostItemEvents: profile.lostItemEvents,
    specialMessages: profile.specialMessages,
    isAlternate: id !== 'pond'
  };
}

export function getMapFishTemplateByName(mapId, name) {
  const profile = getMapProfile(normalizeMapId(mapId));
  for (const list of Object.values(profile.fishTypes || {})) {
    const found = (list || []).find(item => item.name === name);
    if (found) return found;
  }
  return null;
}

export function getMapFishTypes(mapId) {
  return getMapProfile(normalizeMapId(mapId)).fishTypes;
}

export function applyMapEvent(userData, event, now = Date.now()) {
  if (!event || !userData) return null;
  const mapState = ensureMapState(userData);
  const abyss = mapState.abyss;
  const effect = String(event.effect || '');
  if (effect === 'echo') abyss.echo = Math.min(20, abyss.echo + 1);
  if (effect === 'chart') abyss.chart = Math.min(20, abyss.chart + 1);
  if (effect === 'heat') abyss.heat = Math.min(20, abyss.heat + 1);
  abyss.nextCastBonusUntil = Math.max(abyss.nextCastBonusUntil, now + 24 * 60 * 60 * 1000);
  return {
    effect,
    label: effect === 'chart' ? '裂谷航图记住了一笔' : effect === 'heat' ? '热流在钩边留下一点余温' : '深海回声贴近了你的船',
    nextCastHint: '下一次抛竿会带着这段回声。'
  };
}

export function consumeMapEventBonus(userData, now = Date.now()) {
  const state = ensureMapState(userData).abyss;
  if (state.nextCastBonusUntil <= now) return 0;
  state.nextCastBonusUntil = 0;
  return 0.003;
}

export function recordMapVisit(userData, mapId) {
  const state = ensureMapState(userData);
  const id = normalizeMapId(mapId);
  state.visits[id] = Math.max(0, Number(state.visits[id] || 0)) + 1;
  return state.visits[id];
}

export function recordMapCatch(userData, fish, mapId) {
  const state = ensureMapState(userData);
  const id = normalizeMapId(mapId);
  state.catches[id] = Math.max(0, Number(state.catches[id] || 0)) + 1;
  if (fish?.name) {
    if (!Array.isArray(state.discoveries[id])) state.discoveries[id] = [];
    if (!state.discoveries[id].includes(fish.name)) state.discoveries[id].push(fish.name);
  }
  return state;
}

export function recordMapEvent(userData, mapId) {
  const state = ensureMapState(userData);
  const id = normalizeMapId(mapId);
  state.events[id] = Math.max(0, Number(state.events[id] || 0)) + 1;
  return state.events[id];
}

export const FISHING_MAPS = MAPS;
