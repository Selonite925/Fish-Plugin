import assert from 'node:assert/strict';
import { LOTTERY_ROD_PLUGINS, MAX_TANK_CAPACITY, MAX_TANK_LEVEL } from '../lib/constants.js';
import { resolveLotteryGrandPrizePlugin, performLotteryDraws } from '../lib/lottery.js';
import { applyTankUpgrade, getTankUpgradeRequiredPoints } from '../lib/tank.js';
import { createDefaultUserData, normalizeUserData } from '../lib/user.js';

const grandPrize = resolveLotteryGrandPrizePlugin('观测竿');
assert.equal(grandPrize?.id, 'tide_observer_rod');
assert.equal(grandPrize?.reward?.id, LOTTERY_ROD_PLUGINS.tide_observer.id);

const lotteryUser = createDefaultUserData();
lotteryUser.coins = 100;
const lotteryResult = performLotteryDraws(lotteryUser, 1, {
  grandPluginId: 'tide_observer_rod',
  forceGrandPrize: true
});
assert.equal(lotteryResult.ok, true);
assert.equal(lotteryResult.results[0].isGrandPrize, true);
assert.ok(lotteryUser.rodsOwned.includes(LOTTERY_ROD_PLUGINS.tide_observer.id));
assert.ok(lotteryUser.lotteryGrandPrizes.includes('tide_observer_rod'));

const maxTankUser = createDefaultUserData();
maxTankUser.tankLevel = 99;
maxTankUser.tankCapacity = 999;
maxTankUser.extraDailyLimit = 999;
maxTankUser.tankUpgradeProgress = { targetLevel: 100, requiredPoints: 300, submittedPoints: 10 };
normalizeUserData(maxTankUser);
assert.equal(maxTankUser.tankLevel, MAX_TANK_LEVEL);
assert.equal(maxTankUser.tankCapacity, MAX_TANK_CAPACITY);
assert.equal(maxTankUser.extraDailyLimit, MAX_TANK_LEVEL * 2);
assert.equal(maxTankUser.tankUpgradeProgress, null);
assert.equal(getTankUpgradeRequiredPoints(MAX_TANK_LEVEL).atMaxLevel, true);
assert.equal(applyTankUpgrade(maxTankUser), false);
assert.equal(maxTankUser.tankLevel, MAX_TANK_LEVEL);

console.log('lottery grand prize and tank limit ok');
