import assert from 'node:assert/strict';
import { fishing } from '../Fish.js';

const sent = [];
const groups = new Map([
  ['100', {
    pickMember: () => ({ card: '已开启群玩家' }),
    sendMsg: async message => sent.push({ groupId: '100', message })
  }],
  ['200', {
    pickMember: () => ({ card: '未开启群玩家' }),
    sendMsg: async message => sent.push({ groupId: '200', message })
  }],
  ['300', {
    pickMember: () => ({ card: '兜底玩家' }),
    sendMsg: async message => sent.push({ groupId: '300', message })
  }]
]);

const oldBot = globalThis.Bot;
globalThis.Bot = {
  getGroupList: () => [...groups.keys()],
  pickGroup: groupId => groups.get(String(groupId)) || null
};

try {
  const plugin = new fishing();
  const returned = [
    { userId: '1', groupId: '100', displayName: '已开启群玩家' },
    { userId: '2', groupId: '200', displayName: '未开启群玩家' },
    { userId: '3', groupId: '', displayName: '没有历史群号的玩家' }
  ];
  const world = { deepSeaReturnPushGroups: ['100', '300'] };
  const result = await plugin.announceDeepSeaNightReturn(returned, world);

  assert.equal(result.sent, 2);
  assert.deepEqual(sent.map(item => item.groupId), ['100', '300']);
  assert.match(sent[0].message, /已开启群玩家/);
  assert.doesNotMatch(sent[0].message, /未开启群玩家/);
  assert.match(sent[1].message, /兜底玩家/);
  assert.equal(plugin.isDeepSeaReturnPushEnabled('100', world), true);
  assert.equal(plugin.isDeepSeaReturnPushEnabled('200', world), false);

  sent.length = 0;
  const disabledResult = await plugin.announceDeepSeaNightReturn(returned, { deepSeaReturnPushGroups: [] });
  assert.deepEqual(disabledResult, { sent: 0, groups: 0 });
  assert.equal(sent.length, 0);
} finally {
  globalThis.Bot = oldBot;
}

console.log('deep-sea return push group filtering ok');
