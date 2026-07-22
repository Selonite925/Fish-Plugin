import assert from 'node:assert/strict';

import { parseMarketCommand } from '../lib/command-parsers.js';
import { FISH_COMMAND_RULES } from '../lib/command-rules.js';
import { parseSellTarget } from '../lib/economy.js';

function getMatches(command) {
  return FISH_COMMAND_RULES
    .filter(rule => new RegExp(rule.reg).test(command))
    .map(rule => rule.fnc);
}

function assertRoute(command, expectedHandler) {
  assert.deepEqual(getMatches(command), [expectedHandler], `${command} should only route to ${expectedHandler}`);
}

for (const rule of FISH_COMMAND_RULES) {
  assert.doesNotThrow(() => new RegExp(rule.reg), `invalid command rule: ${rule.reg}`);
}

assertRoute('#鱼市 自定义鱼饵 仙桃', 'handleMarketCommand');
assertRoute('#鱼市购买 自定义鱼饵 仙桃', 'handleMarketCommand');
assertRoute('#鱼市售鱼 common', 'handleMarketCommand');
assertRoute('#售鱼 1', 'handleMarketCommand');
assertRoute('#鱼竿详情 鱼竿1', 'showRodDetailsCommand');
assertRoute('#鱼竿属性', 'showRodDetailsCommand');
assertRoute('#鱼饵详情 鱼饵1', 'showBaitDetailsCommand');
assertRoute('#鱼饵属性', 'showBaitDetailsCommand');
assertRoute('#鱼饵自动续 开', 'toggleAutoRenewBait');
assertRoute('#换饵自动续 关闭', 'toggleAutoRenewBait');
assertRoute('#炼竿预览 1', 'previewLegendaryRod');
assertRoute('#炼竿 1', 'craftLegendaryRod');
assertRoute('#打窝 仙桃', 'addBait');
assertRoute('#补鱼 @123456 rare 鳗鱼', 'compensateFish');
assertRoute('#渔港建设 2000', 'donateHarborCoins');
assertRoute('#渔港捐蛋 2000', 'donateHarborCoins');
assertRoute('#渔港捐鱼 1', 'donateHarborFish');
assertRoute('#渔港捐鱼 虹鳟2', 'donateHarborFish');

assert.deepEqual(getMatches('#鱼市场'), []);
assert.deepEqual(getMatches('#打窝棚'), []);
assert.deepEqual(getMatches('#补鱼蛋 100'), []);
assert.deepEqual(getMatches('#查看鱼获榜'), []);

assert.deepEqual(parseMarketCommand('#鱼市'), {
  action: 'show',
  keyword: '',
  shorthand: false
});
assert.deepEqual(parseMarketCommand('#鱼市 自定义鱼饵 仙桃'), {
  action: 'buy',
  keyword: '自定义鱼饵 仙桃',
  shorthand: true
});
assert.deepEqual(parseMarketCommand('#鱼市购买 自定义鱼饵 仙桃'), {
  action: 'buy',
  keyword: '自定义鱼饵 仙桃',
  shorthand: false
});
assert.deepEqual(parseMarketCommand('#鱼市售鱼 uncommon'), {
  action: 'sell',
  keyword: 'uncommon',
  shorthand: false
});
assert.deepEqual(parseMarketCommand('#售鱼 1'), {
  action: 'sell',
  keyword: '1',
  shorthand: false
});

assert.equal(parseSellTarget('uncommon').rarity, 'uncommon');
assert.equal(parseSellTarget('common').rarity, 'common');
assert.deepEqual(parseSellTarget('common 3').explicitIndexes, [2]);
assert.deepEqual(parseSellTarget('1 2 3').explicitIndexes, [0, 1, 2]);
assert.equal(parseSellTarget('鱼缸').mode, 'all');
assert.equal(parseSellTarget('鱼缸3').mode, 'tank_index');
assert.equal(parseSellTarget('鱼缸 uncommon 1 2').source, 'tank');
assert.deepEqual(parseSellTarget('鱼缸 uncommon 1 2').explicitIndexes, [0, 1]);
assert.equal(parseSellTarget('鱼缸虹鳟2').fishName, '虹鳟');
assert.equal(parseSellTarget('鱼缸虹鳟2').duplicateIndex, 1);
assert.equal(parseSellTarget('自定义鱼饵 仙桃').error?.length > 0, true);
assert.equal(parseSellTarget('common鱼饵').error?.length > 0, true);
assert.equal(parseSellTarget('common 0').error?.length > 0, true);
assert.equal(parseSellTarget('').error?.length > 0, true);

console.log('command routing and strict market parsing ok');
