export const FISHING_STORY_TRIGGER_CHANCE = 0.12;
export const FISHING_STORY_TTL_MS = 15 * 60 * 1000;

function getFishingStoryReplyErrors(result) {
  if (Array.isArray(result?.error)) return result.error;
  return result?.error ? [result.error] : [];
}

export function isFishingStoryReplyFailure(result) {
  return result == null || result === false || getFishingStoryReplyErrors(result).length > 0;
}

export function isFishingStoryReplyLikelyDelivered(result) {
  return getFishingStoryReplyErrors(result).some(error => {
    const message = String(
      error?.message ||
      error?.wording ||
      error?.error?.message ||
      error?.error?.wording ||
      error ||
      ''
    );
    return /Timeout: NTEvent serviceAndMethod:NodeIKernelMsgService\/sendMsg/i.test(message);
  });
}

export async function sendFishingStoryMessage(message, options = {}) {
  const send = typeof options.send === 'function' ? options.send : async () => false;
  const fallbackSend = typeof options.fallbackSend === 'function' ? options.fallbackSend : null;
  const sleep = typeof options.sleep === 'function'
    ? options.sleep
    : milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  const retryDelay = Math.max(0, Number(options.retryDelay) || 800);
  const attempt = async sender => {
    try {
      return await sender(message);
    } catch (error) {
      return { error };
    }
  };

  let response = await attempt(send);
  if (isFishingStoryReplyFailure(response) && !isFishingStoryReplyLikelyDelivered(response)) {
    await sleep(retryDelay);
    response = await attempt(send);
  }
  if (isFishingStoryReplyFailure(response) && !isFishingStoryReplyLikelyDelivered(response) && fallbackSend) {
    response = await attempt(fallbackSend);
  }

  return {
    ok: !isFishingStoryReplyFailure(response) || isFishingStoryReplyLikelyDelivered(response),
    response
  };
}

export function formatFishingStoryEvent(event, minutesLeft = 15) {
  if (!event) return '';
  const options = event.actions
    .map((item, index) => `#钓鱼事件 ${index + 1} ${item.label}`)
    .join('\n');
  return (
    `[随机剧情] ${event.title}\n${event.intro}\n\n${event.scene}\n\n` +
    `你准备怎么做？\n${options}\n剧情将在约 ${Math.max(1, Math.ceil(Number(minutesLeft) || 1))} 分钟后淡去。`
  );
}

export function parseFishingStoryChoice(event, message = '') {
  if (!event) return '';
  const rawChoice = String(message || '')
    .trim()
    .replace(/^#钓鱼事件(?:\s+|$)/u, '')
    .trim();
  const numericChoice = /^([1-3])(?:\s+.*)?$/u.exec(rawChoice);
  if (numericChoice) return event.actions[Number(numericChoice[1]) - 1]?.id || '';
  const normalized = rawChoice.replace(/[\s　]+/gu, '').toLowerCase();
  return event.actions.find(item =>
    [item.id, item.label].some(value => String(value || '').replace(/[\s　]+/gu, '').toLowerCase() === normalized)
  )?.id || '';
}

function outcome(_weight, text, effect) {
  return { text, effect };
}

function action(id, label, stage, outcomes, weights = [68, 24, 8]) {
  return {
    id,
    label,
    stage,
    outcomes: outcomes.map((item, index) => ({ ...item, weight: weights[index] })),
  };
}

export const FISHING_STORY_EVENTS = Object.freeze(
  [
    {
      id: 'sealed_bottle',
      title: '漂流瓶里的旧航线',
      intro: '一只封着红蜡的玻璃瓶撞上船舷，瓶中卷着一张被海水染蓝的纸。',
      scene:
        '纸上只写着半句：「若灯还亮着，请把它带回北岸。」远处没有岸，只有一盏忽明忽暗的浮标灯。',
      actions: [
        action('read', '拆开蜡封', '你小心撬开蜡封，纸页背面露出一串褪色的数字。', [
          outcome(0, '数字是一处旧补给点的坐标，岸边还留着一袋鱼蛋。', {
            type: 'coins',
            amount: 42,
          }),
          outcome(0, '纸页夹层藏着一份保存完好的香谷鱼饵。', {
            type: 'bait',
            id: 'special_bait',
            amount: 1,
          }),
          outcome(0, '蜡封碎片划破指尖，几枚鱼蛋滚进了海里。', { type: 'coins', amount: -24 }),
        ]),
        action(
          'sell',
          '把瓶子交给收购船',
          '你朝收购船挥手，对方放下一只带编号的网兜。',
          [
            outcome(0, '船员认出这是收藏品，爽快付给你一笔鱼蛋。', { type: 'coins', amount: 56 }),
            outcome(0, '瓶子不值钱，但船员塞给你一包银鳞鱼饵。', {
              type: 'bait',
              id: 'silver_bait',
              amount: 1,
            }),
            outcome(0, '对方认错了瓶子，反倒向你收了搬运费。', { type: 'coins', amount: -18 }),
          ],
          [74, 20, 6],
        ),
        action(
          'return',
          '把瓶子送回海里',
          '你把瓶口朝向来时的潮水，轻轻将它放回浪间。',
          [
            outcome(0, '瓶子被一道回流推回船边，里面多了一枚纪念币。', {
              type: 'coins',
              amount: 30,
            }),
            outcome(0, '远处传来三声短笛，一袋沉流鱼饵顺着浮标漂来。', {
              type: 'bait',
              id: 'deep_bait',
              amount: 1,
            }),
            outcome(0, '瓶子被浪头打碎，尖锐的玻璃声惊散了鱼群。', { type: 'coins', amount: -12 }),
          ],
          [58, 30, 12],
        ),
      ],
    },
    {
      id: 'supply_crate',
      title: '没有编号的补给箱',
      intro: '一只木箱挂在鱼线上，箱盖钉着陌生船队的铜牌。',
      scene: '箱子里传来轻微的滚动声，铜牌背面刻着一行字：「只拿你用得上的。」',
      actions: [
        action(
          'haul',
          '把箱子拖上船',
          '你绕住缆绳，趁浪势抬手把箱子拖过船舷。',
          [
            outcome(0, '箱底整齐码着一小袋鱼蛋，刚好没有受潮。', { type: 'coins', amount: 48 }),
            outcome(0, '夹层里有两份沉流鱼饵，标签还很新。', {
              type: 'bait',
              id: 'deep_bait',
              amount: 2,
            }),
            outcome(0, '箱中弹簧猛地回弹，你赔进去几枚修缆费。', { type: 'coins', amount: -28 }),
          ],
          [60, 26, 14],
        ),
        action(
          'pry',
          '撬开箱盖',
          '你用鱼钩挑开铜扣，箱盖吱呀一声弹起。',
          [
            outcome(0, '一袋鱼蛋从棉布里滚出来，竟一枚不少。', { type: 'coins', amount: 38 }),
            outcome(0, '箱里是一包椒盐鱼饵，外层油纸把它护得干干净净。', {
              type: 'bait',
              id: 'pepper_bait',
              amount: 1,
            }),
            outcome(0, '压在箱底的旧零件滚落甲板，修理花掉了鱼蛋。', {
              type: 'coins',
              amount: -22,
            }),
          ],
          [70, 22, 8],
        ),
        action(
          'mark',
          '记下位置后放流',
          '你把坐标记在海图边缘，再剪断缠住箱子的旧线。',
          [
            outcome(0, '箱子被巡航船找到，对方按约付来谢礼。', { type: 'coins', amount: 34 }),
            outcome(0, '一只备用饵盒从箱侧脱落，被你的抄网接住。', {
              type: 'bait',
              id: 'moss_bait',
              amount: 1,
            }),
            outcome(0, '标记写得太匆忙，海图被海水洇花，补绘花了些零钱。', {
              type: 'coins',
              amount: -10,
            }),
          ],
          [72, 20, 8],
        ),
      ],
    },
    {
      id: 'broken_beacon',
      title: '失灵的白色浮标',
      intro: '一盏白灯在浪尖连闪四次，随后沉默，像是在等人回答。',
      scene: '浮标外壳裂开，里面的电池还剩最后一点电。水面下有细小的影子绕着灯光打转。',
      actions: [
        action(
          'repair',
          '试着修好它',
          '你拆下线轮旁的备用接头，把浮标线路重新接在一起。',
          [
            outcome(0, '白灯重新亮起，附近船只送来一袋维修谢礼。', { type: 'coins', amount: 45 }),
            outcome(0, '灯光引来一群鱼，浮标旁挂着一份银鳞鱼饵。', {
              type: 'bait',
              id: 'silver_bait',
              amount: 1,
            }),
            outcome(0, '电池短路，你只好花鱼蛋买新的接头。', { type: 'coins', amount: -20 }),
          ],
          [62, 26, 12],
        ),
        action(
          'follow',
          '顺着灯影找过去',
          '你把船速压低，沿着白灯最后照亮的方向缓缓靠近。',
          [
            outcome(0, '水下是一处浅礁，礁缝里卡着装满鱼蛋的小网袋。', {
              type: 'coins',
              amount: 52,
            }),
            outcome(0, '影子散开后留下几份青苔鱼饵，漂到你的抄网里。', {
              type: 'bait',
              id: 'moss_bait',
              amount: 2,
            }),
            outcome(0, '礁边暗流撞上船底，你在深海裂谷损失了一截生命。', {
              type: 'health',
              amount: -9,
            }),
          ],
          [55, 30, 15],
        ),
        action(
          'disable',
          '拆下灯芯带走',
          '你关掉残余电流，把灯芯和铜线收进工具袋。',
          [
            outcome(0, '铜线能卖个好价钱，收购船付来鱼蛋。', { type: 'coins', amount: 36 }),
            outcome(0, '灯座夹层卡着一包备用香谷鱼饵。', {
              type: 'bait',
              id: 'special_bait',
              amount: 1,
            }),
            outcome(0, '灯芯烧得太久，只换回一点拆解费。', { type: 'coins', amount: -8 }),
          ],
          [78, 18, 4],
        ),
      ],
    },
    {
      id: 'tired_seabird',
      title: '落在桅杆上的海鸟',
      intro: '一只湿透的海鸟停在桅杆顶端，爪间还缠着一截亮色渔线。',
      scene: '它没有飞走，只把一枚贝壳放在甲板上，然后歪着头望向船尾的鱼饵桶。',
      actions: [
        action(
          'feed',
          '分它一点鱼饵',
          '你捻出少量鱼饵放在掌心，海鸟低头啄了两口。',
          [
            outcome(0, '贝壳里藏着几枚发亮的鱼蛋，算是它的回礼。', { type: 'coins', amount: 32 }),
            outcome(0, '海鸟把一份乌贼鱼饵推到你脚边，随后振翅飞远。', {
              type: 'bait',
              id: 'squid_bait',
              amount: 1,
            }),
            outcome(0, '它叼走了你一份备用鱼饵，转眼消失在雾里。', {
              type: 'bait',
              id: 'special_bait',
              amount: -1,
              fallbackCoins: -18,
            }),
          ],
          [64, 24, 12],
        ),
        action(
          'untangle',
          '解开它脚上的渔线',
          '你扶住桅杆，慢慢剪开勒住爪子的渔线。',
          [
            outcome(0, '线结里缠着一张收购券，能换来一袋鱼蛋。', { type: 'coins', amount: 44 }),
            outcome(0, '海鸟带你找到一处遗落的鱼饵盒。', {
              type: 'bait',
              id: 'amber_bait',
              amount: 1,
            }),
            outcome(0, '挣扎的鸟撞翻了工具盒，修补器材花了些鱼蛋。', {
              type: 'coins',
              amount: -16,
            }),
          ],
          [72, 22, 6],
        ),
        action(
          'watch',
          '安静观察它',
          '你没有惊动它，只靠在船边等它自己决定去留。',
          [
            outcome(0, '它绕船一圈后落下一枚旧铜币。', { type: 'coins', amount: 26 }),
            outcome(0, '海鸟衔来一份青苔鱼饵，轻轻放在甲板上。', {
              type: 'bait',
              id: 'moss_bait',
              amount: 1,
            }),
            outcome(0, '它被浪声惊飞，爪间的贝壳掉进海里。', { type: 'coins', amount: -6 }),
          ],
          [80, 16, 4],
        ),
      ],
    },
    {
      id: 'radio_whisper',
      title: '来自空频道的呼叫',
      intro: '收音机忽然跳到一个空频道，里面有人用很轻的声音念出你的船号。',
      scene: '呼叫断断续续，只剩三个词：「东边、雾、别追。」随后传来一阵短促的电流声。',
      actions: [
        action(
          'answer',
          '回应呼叫',
          '你按住通话键报出位置，等待对方重新开口。',
          [
            outcome(0, '另一头报出一处旧补给点，那里还留着鱼蛋。', { type: 'coins', amount: 40 }),
            outcome(0, '对方确认安全后，把一份雷息鱼饵的坐标发给你。', {
              type: 'bait',
              id: 'thunder_bait',
              amount: 1,
            }),
            outcome(0, '频道里只剩刺耳噪音，修理电台花了些鱼蛋。', { type: 'coins', amount: -18 }),
          ],
          [62, 26, 12],
        ),
        action(
          'trace',
          '追踪信号来源',
          '你转动天线，沿着忽强忽弱的讯号缓慢校准方向。',
          [
            outcome(0, '信号来自一艘抛锚的渔船，对方付了拖缆谢礼。', { type: 'coins', amount: 58 }),
            outcome(0, '坐标指向一只漂浮饵箱，里面有一份沉流鱼饵。', {
              type: 'bait',
              id: 'deep_bait',
              amount: 1,
            }),
            outcome(0, '你追进一股急流，在深海裂谷被水压撞掉一些生命。', {
              type: 'health',
              amount: -11,
            }),
          ],
          [52, 30, 18],
        ),
        action(
          'silence',
          '关掉接收机',
          '你切断电源，任由空频道重新陷入静默。',
          [
            outcome(0, '静下来后，你在仪表下摸到几枚备用鱼蛋。', { type: 'coins', amount: 24 }),
            outcome(0, '电台下卡着一包琥珀鱼饵，正好没被潮气浸湿。', {
              type: 'bait',
              id: 'amber_bait',
              amount: 1,
            }),
            outcome(0, '电源开关卡住，换保险丝花掉少量鱼蛋。', { type: 'coins', amount: -10 }),
          ],
          [78, 18, 4],
        ),
      ],
    },
    {
      id: 'ghost_net',
      title: '缠住船桨的旧渔网',
      intro: '一张旧渔网悄无声息地缠上船桨，网眼里闪着零星微光。',
      scene: '网绳已经被海藻裹紧，远处有小鱼在网后乱窜，像是在等你做决定。',
      actions: [
        action(
          'haul',
          '把整张网拖上来',
          '你套上手套，一段段把湿重的网绳收进船舱。',
          [
            outcome(0, '网结里卷着一袋沉甸甸的鱼蛋。', { type: 'coins', amount: 50 }),
            outcome(0, '小鱼散开后，网眼里留下两份香谷鱼饵。', {
              type: 'bait',
              id: 'special_bait',
              amount: 2,
            }),
            outcome(0, '旧网突然断开，缆绳被扯坏，修理花了鱼蛋。', { type: 'coins', amount: -26 }),
          ],
          [58, 28, 14],
        ),
        action(
          'cut',
          '剪断网绳放生',
          '你沿着船桨剪开网绳，让小鱼顺着水流游回去。',
          [
            outcome(0, '渔网主人从远处赶来，给你一笔放生谢礼。', { type: 'coins', amount: 38 }),
            outcome(0, '一条小鱼把银鳞鱼饵袋顶到了船边。', {
              type: 'bait',
              id: 'silver_bait',
              amount: 1,
            }),
            outcome(0, '绷紧的网线弹回船侧，深海裂谷的冲击削去少许生命。', {
              type: 'health',
              amount: -8,
            }),
          ],
          [74, 20, 6],
        ),
        action(
          'search',
          '检查网眼里的亮光',
          '你用抄网托住亮点，发现它只是卡在结里的小盒子。',
          [
            outcome(0, '盒子里存着一枚旧船队留下的奖金币。', { type: 'coins', amount: 34 }),
            outcome(0, '盒子底部有一份椒盐鱼饵和一张褪色标签。', {
              type: 'bait',
              id: 'pepper_bait',
              amount: 1,
            }),
            outcome(0, '盒扣锈死，你的工具也被卡住，最后只好赔钱取回。', {
              type: 'coins',
              amount: -14,
            }),
          ],
          [66, 24, 10],
        ),
      ],
    },
    {
      id: 'tide_trader',
      title: '逆潮而来的小商船',
      intro: '一艘挂着绿帆的小商船逆着潮水靠近，船长举起一只空秤盘。',
      scene: '他不报商品价格，只说：「拿你手边的东西，换一份今天用得上的好运。」',
      actions: [
        action(
          'barter',
          '拿鱼饵交换',
          '你递出一份鱼饵，船长用铜秤称了称，笑着收进货箱。',
          [
            outcome(0, '他补给你一袋鱼蛋，还多添了一枚零钱。', { type: 'coins', amount: 46 }),
            outcome(0, '秤盘另一端落下一份更合你手的沉流鱼饵。', {
              type: 'bait',
              id: 'deep_bait',
              amount: 1,
            }),
            outcome(0, '商人说秤盘坏了，反而收走你一份备用鱼饵。', {
              type: 'bait',
              id: 'special_bait',
              amount: -1,
              fallbackCoins: -20,
            }),
          ],
          [58, 28, 14],
        ),
        action(
          'haggle',
          '和船长讨价还价',
          '你指了指空秤盘，提出先看货、再谈价。',
          [
            outcome(0, '船长被你说服，按友情价给了鱼蛋。', { type: 'coins', amount: 62 }),
            outcome(0, '他没有降价，却送你一份琥珀鱼饵。', {
              type: 'bait',
              id: 'amber_bait',
              amount: 1,
            }),
            outcome(0, '船长摇摇头收起货箱，你付了靠船的缆绳费。', { type: 'coins', amount: -12 }),
          ],
          [54, 34, 12],
        ),
        action(
          'ask',
          '打听最近的鱼讯',
          '你收起钱袋，问船长最近哪片水域最安静。',
          [
            outcome(0, '他给了你一份准确的潮汐情报，附带鱼蛋谢礼。', { type: 'coins', amount: 32 }),
            outcome(0, '鱼讯换来一包雷息鱼饵，他说这东西最认潮声。', {
              type: 'bait',
              id: 'thunder_bait',
              amount: 1,
            }),
            outcome(0, '他把旧航图卖给你，摊开才发现是张空白纸。', { type: 'coins', amount: -24 }),
          ],
          [68, 24, 8],
        ),
      ],
    },
    {
      id: 'sunken_bell',
      title: '水下传来的钟声',
      intro: '船底传来一声悠长的钟响，甲板上的杯子跟着轻轻震动。',
      scene: '钟声每隔几秒响一次，方向却在不断改变；水面浮起一小圈银色泡沫。',
      actions: [
        action(
          'ring',
          '敲响船上的铜铃',
          '你拿起船铃，照着水下的节奏回敲了三下。',
          [
            outcome(0, '回声引来一艘货船，对方送来一袋鱼蛋作为问候。', {
              type: 'coins',
              amount: 44,
            }),
            outcome(0, '水面浮出一份乌贼鱼饵，像是有人隔空递来回礼。', {
              type: 'bait',
              id: 'squid_bait',
              amount: 1,
            }),
            outcome(0, '铃绳突然绷断，换绳和修铃花掉一些鱼蛋。', { type: 'coins', amount: -20 }),
          ],
          [64, 24, 12],
        ),
        action(
          'dive',
          '下水寻找钟源',
          '你顺着银泡沫放下探灯，在安全绳范围内向下查看。',
          [
            outcome(0, '钟声来自一只旧钱匣，里面的鱼蛋仍能使用。', { type: 'coins', amount: 68 }),
            outcome(0, '钱匣旁卡着一包深海鱼饵，你把它带回甲板。', {
              type: 'bait',
              id: 'deep_bait',
              amount: 1,
            }),
            outcome(0, '冷水压住胸口，在深海裂谷下潜让你损失了生命。', {
              type: 'health',
              amount: -12,
            }),
          ],
          [48, 34, 18],
        ),
        action(
          'listen',
          '留在船上听完钟声',
          '你关掉发动机，让船随浪漂着，安静听完剩下的钟声。',
          [
            outcome(0, '最后一声落下时，船边恰好漂来几枚鱼蛋。', { type: 'coins', amount: 28 }),
            outcome(0, '银色泡沫托着一份青苔鱼饵缓缓靠近。', {
              type: 'bait',
              id: 'moss_bait',
              amount: 1,
            }),
            outcome(0, '钟声震落了甲板上的小工具，补配花了些鱼蛋。', { type: 'coins', amount: -8 }),
          ],
          [80, 16, 4],
        ),
      ],
    },
    {
      id: 'cross_current',
      title: '突然反向的潮流',
      intro: '水流毫无预兆地掉头，浮漂朝着船尾飞快倒退。',
      scene: '海面出现一条狭长的平静带，平静带尽头却翻涌着一面深色水墙。',
      actions: [
        action(
          'ride',
          '顺着回流滑行',
          '你松开一点缆绳，让船头沿着平静带缓缓转向。',
          [
            outcome(0, '回流把船送到一处旧渔点，网边还挂着鱼蛋。', { type: 'coins', amount: 40 }),
            outcome(0, '一份香谷鱼饵被潮线卷上甲板，落在你的脚边。', {
              type: 'bait',
              id: 'special_bait',
              amount: 1,
            }),
            outcome(0, '船尾擦过暗礁，在深海裂谷被水压震伤了生命线。', {
              type: 'health',
              amount: -10,
            }),
          ],
          [58, 26, 16],
        ),
        action(
          'anchor',
          '立刻抛锚稳船',
          '你把锚链放到最短，等待船身不再随潮摆动。',
          [
            outcome(0, '潮水退去后，锚爪带回一小串鱼蛋。', { type: 'coins', amount: 34 }),
            outcome(0, '锚链挂住一只完整的鱼饵盒，里面有两份青苔鱼饵。', {
              type: 'bait',
              id: 'moss_bait',
              amount: 2,
            }),
            outcome(0, '锚钩卡进礁缝，收链时赔掉了维修费。', { type: 'coins', amount: -18 }),
          ],
          [76, 18, 6],
        ),
        action(
          'bait',
          '撒下一把鱼饵试流',
          '你向平静带撒下一小把鱼饵，观察水纹往哪边聚拢。',
          [
            outcome(0, '鱼群搅起的水纹围成一圈，几枚鱼蛋被浪推来。', { type: 'coins', amount: 30 }),
            outcome(0, '鱼群把一份沉流鱼饵顶回船边，像是在回应你的试探。', {
              type: 'bait',
              id: 'deep_bait',
              amount: 1,
            }),
            outcome(0, '暗流卷走了鱼饵，在深海裂谷还撞出一道生命缺口。', {
              type: 'health',
              amount: -7,
            }),
          ],
          [54, 32, 14],
        ),
      ],
    },
    {
      id: 'glowing_shell',
      title: '会发光的贝壳',
      intro: '一枚淡蓝色贝壳挂在钩尖上，壳内有微弱的光一明一灭。',
      scene: '贝壳边缘没有缺口，轻轻贴近耳边时，里面传出像浪花一样的呼吸声。',
      actions: [
        action(
          'open',
          '沿着纹路打开',
          '你用指甲顺着贝壳的纹路慢慢撬开一条缝。',
          [
            outcome(0, '贝壳里滚出一枚珍珠和几枚鱼蛋。', { type: 'coins', amount: 54 }),
            outcome(0, '夹层里包着一份银鳞鱼饵，外壳把它保存得很好。', {
              type: 'bait',
              id: 'silver_bait',
              amount: 1,
            }),
            outcome(0, '贝壳忽然合拢夹住手套，换新手套花掉了鱼蛋。', {
              type: 'coins',
              amount: -20,
            }),
          ],
          [56, 30, 14],
        ),
        action(
          'sell',
          '送去收购船鉴定',
          '你把贝壳装进软布袋，交给靠近的收购船查看。',
          [
            outcome(0, '鉴定师确认里面有天然珠层，付了你鱼蛋。', { type: 'coins', amount: 64 }),
            outcome(0, '贝壳本身不值钱，鉴定师补给你一份琥珀鱼饵。', {
              type: 'bait',
              id: 'amber_bait',
              amount: 1,
            }),
            outcome(0, '这只是普通贝壳，鉴定费比回收价还高。', { type: 'coins', amount: -14 }),
          ],
          [66, 24, 10],
        ),
        action(
          'return',
          '把它放回原处',
          '你没有惊扰壳里的微光，将贝壳顺着水纹轻轻送回海里。',
          [
            outcome(0, '微光沿着船身绕了一圈，留下几枚鱼蛋作为答谢。', {
              type: 'coins',
              amount: 36,
            }),
            outcome(0, '贝壳推来一份青苔鱼饵，随后沉回浪影之中。', {
              type: 'bait',
              id: 'moss_bait',
              amount: 1,
            }),
            outcome(0, '回流把贝壳带远，也卷走了一份你的备用鱼饵。', {
              type: 'bait',
              id: 'special_bait',
              amount: -1,
              fallbackCoins: -18,
            }),
          ],
          [72, 20, 8],
        ),
      ],
    },
  ].map(event =>
    Object.freeze({
      ...event,
      actions: Object.freeze(
        event.actions.map(item =>
          Object.freeze({ ...item, outcomes: Object.freeze(item.outcomes) }),
        ),
      ),
    }),
  ),
);

const STORY_BY_ID = new Map(FISHING_STORY_EVENTS.map(event => [event.id, event]));

export function getFishingStoryEvent(eventId) {
  return STORY_BY_ID.get(String(eventId || '').trim()) || null;
}

export function rollFishingStoryOutcome(event, actionId, random = Math.random) {
  const selectedAction = event?.actions?.find(item => item.id === String(actionId || ''));
  if (
    !selectedAction ||
    !Array.isArray(selectedAction.outcomes) ||
    selectedAction.outcomes.length === 0
  )
    return null;
  const weightTotal = selectedAction.outcomes.reduce(
    (sum, item) => sum + Math.max(0, Number(item.weight) || 0),
    0,
  );
  if (weightTotal <= 0) return null;
  let roll = Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * weightTotal;
  for (const result of selectedAction.outcomes) {
    roll -= Math.max(0, Number(result.weight) || 0);
    if (roll < 0) return { action: selectedAction, outcome: result };
  }
  return { action: selectedAction, outcome: selectedAction.outcomes.at(-1) };
}
