import assert from 'node:assert/strict';
import { fishing } from '../Fish.js';
import { DUANWU_EVENT_CONFIG } from '../lib/constants.js';
import {
  createDefaultUserData,
  resolveOwnedEasterEggName,
  scheduleEasterEggSwitch,
  unlockEasterEgg
} from '../lib/user.js';

const duanwuName = DUANWU_EVENT_CONFIG.easterEggGift.fishName;

const userData = createDefaultUserData();
unlockEasterEgg(userData, '愿望锦鲤');
unlockEasterEgg(userData, duanwuName);
userData.activeEasterEgg = '愿望锦鲤';

assert.equal(resolveOwnedEasterEggName(userData, duanwuName), duanwuName);
assert.equal(resolveOwnedEasterEggName(userData, '端午'), duanwuName);
assert.equal(resolveOwnedEasterEggName(userData, '端午彩蛋鱼'), duanwuName);
assert.equal(resolveOwnedEasterEggName(userData, '粽叶鱼'), duanwuName);

const result = scheduleEasterEggSwitch(userData, '端午', '2026-07-02');
assert.deepEqual(result, {
  ok: true,
  activeName: '愿望锦鲤',
  pendingName: duanwuName
});
assert.equal(userData.pendingEasterEgg, duanwuName);

const alreadyPending = scheduleEasterEggSwitch(userData, '端午鱼', '2026-07-03');
assert.equal(alreadyPending.ok, false);
assert.equal(alreadyPending.reason, 'already_pending');
assert.equal(alreadyPending.name, duanwuName);

const commandRules = new fishing().rule || [];
assert.ok(commandRules.some(rule =>
  rule.fnc === 'scheduleActiveEasterEgg' &&
  new RegExp(rule.reg).test('#装备彩蛋端午')
));

console.log('duanwu easter switch aliases ok');
