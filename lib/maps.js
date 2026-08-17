import { EASTER_EGG_RARITY } from './constants.js';

const DEEP_SEA_FISH = {
  common: [
    { name: '灯笼乌贼', size: { min: 8, max: 24 }, weight: { min: 0.02, max: 0.18 } },
    { name: '玻璃鳀', size: { min: 6, max: 18 }, weight: { min: 0.01, max: 0.06 } },
    { name: '深潮银鱼', size: { min: 10, max: 28 }, weight: { min: 0.02, max: 0.2 } },
    { name: '荧光鳗苗', size: { min: 12, max: 32 }, weight: { min: 0.03, max: 0.3 } },
    { name: '黑潮鲱', size: { min: 18, max: 42 }, weight: { min: 0.08, max: 0.5 } },
    { name: '岩缝雀鲷', size: { min: 7, max: 22 }, weight: { min: 0.02, max: 0.16 } },
    { name: '幽光鲥', size: { min: 9, max: 26 }, weight: { min: 0.02, max: 0.15 } },
    { name: '沉砂鳗', size: { min: 14, max: 38 }, weight: { min: 0.04, max: 0.32 } },
    { name: '盲潮鮅', size: { min: 16, max: 44 }, weight: { min: 0.06, max: 0.42 } },
    { name: '磷尾鲹', size: { min: 20, max: 48 }, weight: { min: 0.1, max: 0.65 } },
    { name: '冷泉鳀', size: { min: 8, max: 20 }, weight: { min: 0.01, max: 0.08 } },
    { name: '深蓝鲻', size: { min: 22, max: 55 }, weight: { min: 0.12, max: 0.8 } }
  ],
  uncommon: [
    { name: '雾鳞鲈', size: { min: 24, max: 70 }, weight: { min: 0.4, max: 6 } },
    { name: '蓝洞鲹', size: { min: 28, max: 78 }, weight: { min: 0.5, max: 7 } },
    { name: '棱镜海鳗', size: { min: 35, max: 120 }, weight: { min: 0.6, max: 8 } },
    { name: '裂谷鲳', size: { min: 22, max: 65 }, weight: { min: 0.3, max: 4.5 } },
    { name: '月牙狗鱼', size: { min: 40, max: 105 }, weight: { min: 1, max: 14 } },
    { name: '熔岩鳚', size: { min: 18, max: 52 }, weight: { min: 0.2, max: 2.8 } },
    { name: '火山雀鲷', size: { min: 30, max: 86 }, weight: { min: 0.6, max: 8 } },
    { name: '环礁海狼', size: { min: 42, max: 110 }, weight: { min: 1.2, max: 16 } },
    { name: '幽门鳗', size: { min: 38, max: 140 }, weight: { min: 0.9, max: 12 } },
    { name: '沉船鲳', size: { min: 30, max: 94 }, weight: { min: 0.8, max: 10 } },
    { name: '冷泉鲈', size: { min: 45, max: 125 }, weight: { min: 1.5, max: 20 } },
    { name: '深蓝梭鱼', size: { min: 55, max: 145 }, weight: { min: 2, max: 24 } }
  ],
  rare: [
    { name: '深潜六线鱼', size: { min: 55, max: 130 }, weight: { min: 3, max: 25 } },
    { name: '冰脊鳕', size: { min: 65, max: 150 }, weight: { min: 4, max: 30 } },
    { name: '黑潮旗鲷', size: { min: 70, max: 180 }, weight: { min: 5, max: 38 } },
    { name: '斑纹鬼鲉', size: { min: 40, max: 100 }, weight: { min: 1.5, max: 14 } },
    { name: '蓝洞石斑', size: { min: 70, max: 165 }, weight: { min: 6, max: 45 } },
    { name: '夜航鲭', size: { min: 65, max: 145 }, weight: { min: 4, max: 26 } },
    { name: '裂光鮟鱇', size: { min: 80, max: 210 }, weight: { min: 8, max: 52 } },
    { name: '火山带鱼', size: { min: 95, max: 240 }, weight: { min: 10, max: 80 } },
    { name: '深潜旗鱼', size: { min: 110, max: 260 }, weight: { min: 14, max: 95 } },
    { name: '幽门石斑', size: { min: 85, max: 230 }, weight: { min: 9, max: 75 } },
    { name: '冰镜鲨', size: { min: 120, max: 320 }, weight: { min: 20, max: 150 } },
    { name: '断流鳐', size: { min: 100, max: 280 }, weight: { min: 16, max: 110 } }
  ],
  epic: [
    { name: '巨口海狼', size: { min: 120, max: 260 }, weight: { min: 30, max: 180 } },
    { name: '断层鲨', size: { min: 180, max: 420 }, weight: { min: 90, max: 560 } },
    { name: '深渊皇带鱼', size: { min: 250, max: 620 }, weight: { min: 35, max: 240 } },
    { name: '冰火双鳍鲨', size: { min: 220, max: 500 }, weight: { min: 100, max: 650 } },
    { name: '黑曜鲸鲨', size: { min: 360, max: 820 }, weight: { min: 500, max: 3500 } },
    { name: '沉眠巨魟', size: { min: 220, max: 560 }, weight: { min: 90, max: 720 } },
    { name: '海沟巨鳗', size: { min: 260, max: 650 }, weight: { min: 70, max: 360 } },
    { name: '潮汐巨口鲨', size: { min: 300, max: 780 }, weight: { min: 150, max: 900 } },
    { name: '熔脉鲸', size: { min: 480, max: 1100 }, weight: { min: 900, max: 6500 } },
    { name: '幽蓝剑鱼', size: { min: 240, max: 580 }, weight: { min: 80, max: 420 } },
    { name: '深渊锤头鲨', size: { min: 350, max: 900 }, weight: { min: 300, max: 1800 } },
    { name: '黑棘巨鲹', size: { min: 260, max: 700 }, weight: { min: 120, max: 680 } }
  ],
  legendary: [
    { name: '深海灯塔鲸', size: { min: 700, max: 1500 }, weight: { min: 4500, max: 22000 } },
    { name: '裂谷古龙', size: { min: 900, max: 2200 }, weight: { min: 6000, max: 30000 } },
    { name: '逆流利维坦', size: { min: 1800, max: 5200 }, weight: { min: 18000, max: 90000 } },
    { name: '星环巨乌贼', size: { min: 900, max: 1900 }, weight: { min: 2500, max: 12000 } },
    { name: '黑潮海皇', size: { min: 1200, max: 3600 }, weight: { min: 12000, max: 70000 } },
    { name: '海沟天柱鲸', size: { min: 1400, max: 4200 }, weight: { min: 16000, max: 80000 } },
    { name: '深蓝星龙', size: { min: 1200, max: 3200 }, weight: { min: 10000, max: 60000 } },
    { name: '永夜巨鲨', size: { min: 1600, max: 4800 }, weight: { min: 20000, max: 100000 } },
    { name: '潮汐母舰', size: { min: 2000, max: 6000 }, weight: { min: 30000, max: 140000 } },
    { name: '沉星古鲸', size: { min: 1800, max: 5000 }, weight: { min: 22000, max: 120000 } }
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
  { message: '鱼线忽然向下绷直，裂谷里传来一声沉闷回响，等你扬竿时只剩一串蓝色气泡。', effect: 'echo', healthDamage: { chance: 0.28, min: 2, max: 6 } },
  { message: '水下的微光排成一条路，像有什么东西在引你追过去；下一刻，整条路在钩边熄灭。', effect: 'chart', healthDamage: { chance: 0.2, min: 2, max: 5 } },
  { message: '一阵冷流把浮漂推向黑暗，耳边响起陌生的鲸歌，鱼口却在歌声结束前消失了。', effect: 'echo', healthDamage: { chance: 0.32, min: 3, max: 8 } },
  { message: '钩尖擦过一块会发热的岩壁，熔光沿鱼线爬上来，留下半截陌生的鳞片。', effect: 'heat', healthDamage: { chance: 0.35, min: 3, max: 9 } },
  { message: '探照灯照见一只巨大的影子，它绕船一周后安静沉入深处，只把潮声留在原地。', effect: 'chart', healthDamage: { chance: 0.24, min: 2, max: 7 } },
  { message: '深处像有人轻敲船舷三下，你屏住呼吸提竿，钩上只挂着一枚温热的黑色石片。', effect: 'echo', healthDamage: { chance: 0.3, min: 2, max: 7 } }
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
    '鱼线拖出一串细密的火花，沉眠巨魟从海沟底部展开双翼，像一块苏醒的夜空。',
    '深海先传来一阵低沉的电流声，海沟巨鳗贴着船底盘起，鳞片间的蓝光像一条正在苏醒的航道。',
    '熔脉鲸撞开黑潮，滚烫的气泡沿着鱼线一路升起，船边的海水短暂亮成了赤色。',
    '深渊锤头鲨从探照灯外折返，宽阔的头部撞开一面暗流，整艘船都被推得向后滑去。'
  ],
  legendary: [
    '所有灯光同时熄灭，只有海底亮起一圈遥远的星环。巨大的触手从光环中央升起，星环巨乌贼把整片海面托向夜空。',
    '裂谷深处传来古老的龙吟，海水沿着鱼线逆流而上。裂谷古龙破浪而出，鳞片里藏着一整条发光的地层。',
    '一座像灯塔的鲸影从黑暗里缓缓上浮，它没有张口，却让每一盏船灯重新亮起。深海灯塔鲸把航路照回来了。',
    '海沟天柱鲸从垂直的黑暗里升起，背脊像一座移动的山脉，所有声呐刻度都被它的呼吸抬高。',
    '永夜巨鲨绕船一周，海面上的星光逐盏熄灭；它张口时，裂谷像被夜色咬出了一道更深的门。',
    '潮汐母舰拖着整片回流驶过船底，远处的海水像舰队列阵，连鱼线都被它的潮令拉直。'
  ],
  [EASTER_EGG_RARITY]: [
    '水面忽然变得像一面梦镜，潜梦水母鱼从镜面另一侧游来，透明的触须拖着一串未醒的星光。',
    '所有声呐同时归零，一道无声的影子从船底掠过。无声鳐翻身时，连浪花都忘了响。',
    '深海的钟声停在零点，钩尖只亮起一粒微小的光。零点灯鱼把一瞬间的黑暗叼出了水面。'
  ]
};

// 深海高稀有鱼按鱼种绑定演出，避免随机抽到与实际鱼影不相干的默认文案。
const DEEP_SEA_FISH_MESSAGES = Object.freeze({
  epic: Object.freeze({
    '巨口海狼': { intro: '探照灯刚照进裂谷，一张巨大的狼口便从黑水里合拢，鱼线被拖出低沉的啸声。', reveal: '巨口海狼贴着船底游过，像一座长着獠牙的海沟，把四周的水压都咬紧了。' },
    '断层鲨': { intro: '海面被一条笔直的裂纹切开，鱼线另一端传来像地层移动一样的重击。', reveal: '断层鲨破水而出，背鳍像移动的峭壁，裂谷的蓝光沿它的鳞片一层层断开。' },
    '深渊皇带鱼': { intro: '银红色的细光在深处盘旋，鱼线像被一条看不见的长带绕住，缓慢向下沉。', reveal: '深渊皇带鱼从海沟竖直升起，长长的身躯把整片黑潮划成了两条相反的航道。' },
    '冰火双鳍鲨': { intro: '一侧海水结起薄冰，另一侧却冒出灼热气泡；两种水温同时压上了竿梢。', reveal: '冰火双鳍鲨冲出冷热交界，左右两片鳍翼各带着一条相反的潮汐。' },
    '黑曜鲸鲨': { intro: '远处的星点突然排成斑纹，巨影每靠近一寸，船底的回声就沉下去一层。', reveal: '黑曜鲸鲨绕船缓缓转身，黑曜色的皮肤吞掉灯光，只留下星点在它背上移动。' },
    '沉眠巨魟': { intro: '鱼线下方传来一声漫长的呼吸，探照灯照见一双翼影从沉积物里慢慢展开。', reveal: '沉眠巨魟终于醒来，双翼掀起一圈无声的浪，把海沟底的尘光托到了水面。' },
    '海沟巨鳗': { intro: '电流沿鱼线一节节爬上来，黑水里盘起一圈又一圈发蓝的鳞光。', reveal: '海沟巨鳗贴着船底抬头，身上的电光照出一条通往更深处的窄路。' },
    '潮汐巨口鲨': { intro: '潮声忽然变成整齐的鼓点，海水向船首聚拢，像有什么巨物正在张口。', reveal: '潮汐巨口鲨一口吞下前方的浪头，船边只剩被它咬碎的白色泡沫。' },
    '熔脉鲸': { intro: '黑潮下亮起一条赤色脉络，温度顺着鱼线升高，船灯被映成了暗红色。', reveal: '熔脉鲸带着滚烫的深海气泡浮出，背上的熔光像一座正在移动的火山。' },
    '幽蓝剑鱼': { intro: '一束幽蓝的细光从船侧闪过，鱼线瞬间被切出尖锐的金属声。', reveal: '幽蓝剑鱼以几乎看不见的速度折返，剑吻划开的水面留下一道长久不散的蓝线。' },
    '深渊锤头鲨': { intro: '探照灯外传来沉重的横向撞击，暗流像墙一样朝甲板推来。', reveal: '深渊锤头鲨从黑暗中转身，宽阔的头部把一面潮墙撞成了翻卷的碎光。' },
    '黑棘巨鲹': { intro: '鱼线周围浮起一圈细密黑刺，水面像被无数枚针同时轻轻敲响。', reveal: '黑棘巨鲹甩尾破水，背鳍上的黑棘排成一列，像一把从深处拔出的长刃。' }
  }),
  legendary: Object.freeze({
    '深海灯塔鲸': { intro: '所有船灯同时暗下，只有远处一点暖白灯光沿着鱼线缓缓靠近。', reveal: '深海灯塔鲸从黑暗里升起，背脊上的灯火一盏盏点亮，把裂谷照成了回航的路。' },
    '裂谷古龙': { intro: '海水开始逆着鱼线向上流，裂谷底部传来一声穿过岩层的古老龙吟。', reveal: '裂谷古龙破开黑潮，鳞片里藏着发光的地层，每一次摆尾都让海水倒流。' },
    '逆流利维坦': { intro: '船周的潮水突然全部反向，鱼线像被一只看不见的巨手拉向海沟最深处。', reveal: '逆流利维坦在倒流的海面下睁眼，巨大的身躯把上下方向重新交给了深海。' },
    '星环巨乌贼': { intro: '海底亮起一圈又一圈星环，触手从环心伸出，先缠住了水面上的月光。', reveal: '星环巨乌贼托着整片星环升起，触手划过之处，黑潮像夜空一样展开。' },
    '黑潮海皇': { intro: '远处响起沉重的潮钟，黑色海水向两侧分开，一道王冠般的影子正在靠近。', reveal: '黑潮海皇从分开的海面中升起，周围的潮声像臣服的号角，依次沉入水下。' },
    '海沟天柱鲸': { intro: '垂直的深海里落下一道看不见底的阴影，声呐刻度被它的呼吸一格格抬高。', reveal: '海沟天柱鲸从深处拔地而起，背脊像一座移动的山脉，船只只够停在它的影子里。' },
    '深蓝星龙': { intro: '星点从黑水里逆向升起，沿鱼线聚成一条深蓝龙影，海面像被夜空覆盖。', reveal: '深蓝星龙吐出冷色龙息，整条裂谷被照成星河，它的鳞片在每一颗星光里闪动。' },
    '永夜巨鲨': { intro: '海面上的星光逐盏熄灭，鱼线另一端只剩一股逼近的黑暗和缓慢张开的水纹。', reveal: '永夜巨鲨绕船一周，张口时像把裂谷咬出一道更深的夜门，所有回声都被它吞没。' },
    '潮汐母舰': { intro: '远方潮汐排成舰列，海水一层层向船底推进，鱼线被无数道潮令同时拉直。', reveal: '潮汐母舰拖着整片回流驶过，背上的潮纹像舰桥灯火，指挥黑海向同一个方向航行。' },
    '沉星古鲸': { intro: '一颗暗淡的星光坠入海面，水下传来悠长鲸歌，整艘船在歌声里慢慢下沉。', reveal: '沉星古鲸从星光坠落处浮起，背上驮着一片沉睡的夜空，鲸歌让所有浪花安静下来。' }
  }),
  [EASTER_EGG_RARITY]: Object.freeze({
    '潜梦水母鱼': { intro: '水面折成一面梦镜，透明的触须从镜后探出，拖着一串还没有醒来的星光。', reveal: '潜梦水母鱼游过船灯，光线在它体内变成一座倒悬的梦境。', collection: '海图上凭空多出一颗梦境新星，潜梦水母鱼把自己的航迹留在裂谷里。' },
    '无声鳐': { intro: '所有声呐同时归零，鱼线没有发出一点声音，却被一股巨大的力量向后拖去。', reveal: '无声鳐翻身掠过船底，连浪花都像被剪掉了一帧，深海第一次安静得看得见。', collection: '海图上的声呐刻度被抹去一格，无声鳐把一段无声航迹留在裂谷里。' },
    '零点灯鱼': { intro: '深海钟声停在零点，钩尖只亮起一粒微光，黑暗里有一双小眼睛靠近。', reveal: '零点灯鱼把一瞬间的黑暗叼出水面，微光沿鱼线返回，像给航海图补上了一个坐标。', collection: '海图上亮起一个零点坐标，零点灯鱼把一瞬间的黑暗留在了收藏里。' }
  })
});

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
    specialMessagesByFish: DEEP_SEA_FISH_MESSAGES,
    castIntro: '船底的探照灯切开黑潮，鱼线向裂谷深处垂落。',
    eventPrefix: '[深海事件]'
  })
});

const DEEP_SEA_MAP_ID = 'abyss';

// 深海的生存线：生命值不是可交易资源，只在每日刷新时回满。
export const BASE_PLAYER_HEALTH = 200;
export const TANK_HEALTH_PER_LEVEL = 20;
export const HARBOR_HEALTH_PER_LEVEL = 5;
export const DEEP_SEA_TRAVEL_COST = 1000;
export const DEEP_SEA_CAST_HEALTH_COST = 10;
export const DEEP_SEA_ROD_ATTRIBUTE_MULTIPLIER = 0.7;
export const DEEP_SEA_FISHBALL_RATE = 0.25;
export const DEEP_SEA_SPECIAL_ROD_FISHBALL_RATE = 0.4;

const DEEP_SEA_DAMAGE_PROFILES = Object.freeze({
  common: Object.freeze({ chance: 0.04, min: 2, max: 5 }),
  uncommon: Object.freeze({ chance: 0.08, min: 3, max: 8 }),
  rare: Object.freeze({ chance: 0.15, min: 5, max: 12 }),
  epic: Object.freeze({ chance: 0.24, min: 8, max: 18 }),
  legendary: Object.freeze({ chance: 0.38, min: 14, max: 30 }),
  [EASTER_EGG_RARITY]: Object.freeze({ chance: 0.46, min: 18, max: 36 })
});

const DEEP_SEA_DAMAGE_SCENES = Object.freeze([
  '一股冷压突然撞上船舷，护具发出沉闷的回响。',
  '鱼影甩尾带起暗流，缆绳猛地勒住你的手臂。',
  '深海荧光在眼前炸开，耳边只剩尖锐的嗡鸣。',
  '钩线拖着你向下坠了一瞬，甲板上的警示灯连闪数次。'
]);

export function getPlayerMaxHealth(userData = {}, harborLevel = 0) {
  const tankLevel = Math.max(0, Math.floor(Number(userData?.tankLevel || 0)));
  const normalizedHarborLevel = Math.max(0, Math.floor(Number(harborLevel || 0)));
  return BASE_PLAYER_HEALTH + tankLevel * TANK_HEALTH_PER_LEVEL + normalizedHarborLevel * HARBOR_HEALTH_PER_LEVEL;
}

export function ensurePlayerHealth(userData = {}, options = {}) {
  if (!userData || typeof userData !== 'object') return { current: 0, max: 0, date: '' };
  const max = Math.max(BASE_PLAYER_HEALTH, Math.floor(Number(options.maxHealth || getPlayerMaxHealth(userData, options.harborLevel || 0))));
  const dayKey = String(options.dayKey || '').trim();
  const previousDate = String(userData.healthDate || '').trim();
  const current = Number(userData.health);
  userData.healthMax = max;
  if (dayKey && previousDate !== dayKey) {
    userData.health = max;
    userData.healthDate = dayKey;
  } else {
    userData.health = Number.isFinite(current) ? Math.max(0, Math.min(max, Math.floor(current))) : max;
    if (dayKey) userData.healthDate = dayKey;
  }
  return {
    current: userData.health,
    max,
    date: String(userData.healthDate || '')
  };
}

export function applyHealthDamage(userData, damage, options = {}) {
  const state = ensurePlayerHealth(userData, options);
  const amount = Math.max(0, Math.floor(Number(damage) || 0));
  const before = state.current;
  const after = Math.max(0, before - amount);
  userData.health = after;
  return {
    amount: before - after,
    before,
    after,
    max: state.max,
    depleted: after <= 0
  };
}

export function applyHealthRecovery(userData, recovery, options = {}) {
  const state = ensurePlayerHealth(userData, options);
  const amount = Math.max(0, Math.floor(Number(recovery) || 0));
  const before = state.current;
  const after = before <= 0 ? 0 : Math.min(state.max, before + amount);
  userData.health = after;
  return {
    amount: after - before,
    before,
    after,
    max: state.max,
    depleted: after <= 0
  };
}

// 深海极速结算和单竿结算共用同一条停航规则，避免生命值归零后多抛一竿。
export function shouldStopDeepSeaFishing(mapContext, healthState) {
  if (!mapContext?.isAlternate) return false;
  const current = Number(healthState?.current);
  return !Number.isFinite(current) || current <= 0;
}

export function getDeepSeaDamageProfile(rarity) {
  const profile = DEEP_SEA_DAMAGE_PROFILES[rarity] || DEEP_SEA_DAMAGE_PROFILES.common;
  return { ...profile };
}

function scaleTowardBase(value, base) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return base + (numeric - base) * DEEP_SEA_ROD_ATTRIBUTE_MULTIPLIER;
}

// 普通鱼竿在深海会被水压削弱；炼制竿和祈愿竿保留各自的完整属性。
export function getDeepSeaRodAttributes(rod = {}, mapContext = null) {
  if (!rod || !mapContext?.isAlternate || rod.sourceLegendary || rod.sourceLottery) return rod;
  return {
    ...rod,
    waitMultiplier: scaleTowardBase(rod.waitMultiplier, 1),
    catchRateBonus: scaleTowardBase(rod.catchRateBonus, 0),
    failProtection: scaleTowardBase(rod.failProtection, 0),
    baitPreserveChance: scaleTowardBase(rod.baitPreserveChance, 0),
    catchCoinBonus: scaleTowardBase(rod.catchCoinBonus, 0),
    signalBonusCoins: scaleTowardBase(rod.signalBonusCoins, 0),
    sizeMultiplier: scaleTowardBase(rod.sizeMultiplier, 1),
    weightMultiplier: scaleTowardBase(rod.weightMultiplier, 1),
    minSizeRatio: scaleTowardBase(rod.minSizeRatio, 0),
    minWeightRatio: scaleTowardBase(rod.minWeightRatio, 0),
    rarityBias: Object.fromEntries(
      Object.entries(rod.rarityBias || {}).map(([rarity, value]) => [rarity, scaleTowardBase(value, 0)])
    )
  };
}

export function rollDeepSeaFishDamage(fish, options = {}) {
  const profile = getDeepSeaDamageProfile(fish?.rarity);
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const damageMultiplier = Math.max(0, Number(options.damageMultiplier ?? 1));
  if (random() >= profile.chance) {
    return { triggered: false, damage: 0, profile, scene: '' };
  }
  const rawDamage = profile.min + Math.floor(random() * (profile.max - profile.min + 1));
  const damage = Math.max(1, Math.floor(rawDamage * damageMultiplier));
  const scene = DEEP_SEA_DAMAGE_SCENES[Math.floor(random() * DEEP_SEA_DAMAGE_SCENES.length)];
  return { triggered: true, damage, profile, scene };
}

export function rollDeepSeaEventDamage(event, options = {}) {
  const profile = event?.healthDamage;
  if (!profile) return { triggered: false, damage: 0, scene: '' };
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const damageMultiplier = Math.max(0, Number(options.damageMultiplier ?? 1));
  const chance = Math.max(0, Math.min(1, Number(profile.chance ?? 1)));
  if (random() >= chance) return { triggered: false, damage: 0, scene: '' };
  const min = Math.max(0, Math.floor(Number(profile.min || 0)));
  const max = Math.max(min, Math.floor(Number(profile.max ?? min)));
  const rawDamage = min + Math.floor(random() * (max - min + 1));
  const damage = Math.max(0, Math.floor(rawDamage * damageMultiplier));
  const scene = DEEP_SEA_DAMAGE_SCENES[Math.floor(random() * DEEP_SEA_DAMAGE_SCENES.length)];
  return { triggered: damage > 0, damage, scene };
}

export function getDeepSeaSpecialRodProfile(rod = {}) {
  if (!rod?.sourceLegendary) {
    return {
      enabled: false,
      healthCost: 0,
      healthCostReduction: 0,
      healthCostBonus: 0,
      healthRecovery: 0,
      fishballRate: DEEP_SEA_FISHBALL_RATE,
      label: ''
    };
  }
  const pressure = Math.max(0, Number(rod.catchRateBonus || 0)) * 20 + Math.max(0, Number(rod.failProtection || 0)) * 4;
  const healthCost = Math.max(6, Math.min(14, 7 + Math.round(pressure)));
  const healthCostReduction = Math.max(0, Math.floor(Number(rod.deepSeaHealthCostReduction || 0)));
  const healthCostBonus = Math.max(0, Math.floor(Number(rod.deepSeaHealthCostBonus || 0)));
  const healthRecovery = Math.max(0, Math.floor(Number(rod.deepSeaHealthRecovery || 0)));
  const fishballRate = Math.max(
    DEEP_SEA_SPECIAL_ROD_FISHBALL_RATE,
    Math.min(0.65, DEEP_SEA_SPECIAL_ROD_FISHBALL_RATE + Number(rod.deepSeaFishballRateBonus || 0))
  );
  return {
    enabled: true,
    healthCost,
    healthCostReduction,
    healthCostBonus,
    healthRecovery,
    fishballRate,
    label: rod.name || '炼制鱼竿'
  };
}

export function getDeepSeaCastHealthCost(rodProfile = {}, easterEggEffect = {}) {
  const reduction = Math.max(
    0,
    Math.floor(Number(rodProfile.healthCostReduction || 0)) + Math.floor(Number(easterEggEffect.deepSeaHealthCostReduction || 0))
  );
  const bonus = Math.max(
    0,
    Math.floor(Number(rodProfile.healthCostBonus || 0)) + Math.floor(Number(easterEggEffect.deepSeaHealthCostBonus || 0))
  );
  return Math.max(0, DEEP_SEA_CAST_HEALTH_COST + bonus - reduction);
}

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
    specialMessagesByFish: profile.specialMessagesByFish,
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
