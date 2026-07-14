import assert from 'node:assert/strict';

import { scanAchievements } from '../lib/achievements.js';
import { ACHIEVEMENT_DEFS } from '../lib/constants.js';
import { createDefaultUserData } from '../lib/user.js';
import { fishTypes } from '../fishdata/fishpool.js';

function markOtherAchievementsClaimed(userData, achievementId) {
  for (const def of ACHIEVEMENT_DEFS) {
    if (def.id === achievementId) continue;
    userData.achievements[def.id] = {
      unlocked: true,
      unlockedAt: 1,
      rewardClaimed: true,
      rewardClaimedAt: 1
    };
  }
}

function toHistory(rarity, fishList) {
  return fishList.map(fish => ({ rarity, name: fish.name }));
}

const permanentCommon = fishTypes.common.filter(fish => !fish.seasonal);
const seasonalCommon = fishTypes.common.filter(fish => fish.seasonal);
assert.ok(permanentCommon.length > 0);
assert.ok(seasonalCommon.length > 0);

const collector = createDefaultUserData();
markOtherAchievementsClaimed(collector, 'common_master');
collector.coins = 10;
collector.allTimeFish = toHistory('common', permanentCommon);

const firstScan = scanAchievements(collector, fishTypes);
const commonUnlock = firstScan.find(item => item.id === 'common_master');
assert.equal(commonUnlock?.newlyUnlocked, true);
assert.equal(commonUnlock?.rewardDelivered, true);
assert.equal(collector.coins, 170);
assert.equal(collector.tickets, 1);
assert.equal(collector.achievements.common_master.rewardClaimed, true);

const balancesAfterReward = {
  coins: collector.coins,
  tickets: collector.tickets,
  baitInventory: JSON.stringify(collector.baitInventory)
};
assert.deepEqual(scanAchievements(collector, fishTypes), []);
assert.equal(collector.coins, balancesAfterReward.coins);
assert.equal(collector.tickets, balancesAfterReward.tickets);
assert.equal(JSON.stringify(collector.baitInventory), balancesAfterReward.baitInventory);

const incompleteCollector = createDefaultUserData();
markOtherAchievementsClaimed(incompleteCollector, 'common_master');
incompleteCollector.allTimeFish = toHistory('common', permanentCommon.slice(1));
assert.equal(scanAchievements(incompleteCollector, fishTypes).some(item => item.id === 'common_master'), false);
assert.equal(incompleteCollector.achievements.common_master?.unlocked, false);

const unclaimedLegacy = createDefaultUserData();
markOtherAchievementsClaimed(unclaimedLegacy, 'common_master');
unclaimedLegacy.achievements.common_master = {
  unlocked: true,
  unlockedAt: 1,
  rewardClaimed: false,
  rewardClaimedAt: null
};
const legacyScan = scanAchievements(unclaimedLegacy, fishTypes);
assert.equal(legacyScan.find(item => item.id === 'common_master')?.rewardDelivered, true);
assert.equal(unclaimedLegacy.coins, 160);
assert.equal(unclaimedLegacy.tickets, 1);
assert.deepEqual(scanAchievements(unclaimedLegacy, fishTypes), []);

const advancedUser = createDefaultUserData();
advancedUser.allTimeFish = Object.entries(fishTypes).flatMap(([rarity, fishList]) =>
  toHistory(rarity, fishList.filter(fish => !fish.seasonal))
);
advancedUser.allTimeFish.push(...Array.from({ length: 1000 - advancedUser.allTimeFish.length }, () => ({
  rarity: 'common',
  name: permanentCommon[0].name
})));
advancedUser.marketTrades = 50;
advancedUser.tankLevel = 10;
advancedUser.tankCapacity = 999;
advancedUser.rodsOwned = ['rod-1', 'rod-2', 'rod-3', 'rod-4', 'rod-5', 'rod-6'];
advancedUser.craftedLegendaryRods = { a: {}, b: {}, c: {} };
advancedUser.stats.signalFishCaught = 20;
advancedUser.everCaughtEasterEgg = true;
advancedUser.easterEggCollection = ['彩蛋一', '彩蛋二', '彩蛋三'];
advancedUser.lotteryGrandPrizes = ['大奖一', '大奖二'];

const advancedIds = new Set(scanAchievements(advancedUser, fishTypes).map(item => item.id));
for (const id of [
  'uncommon_master',
  'rare_master',
  'legendary_scholar',
  'encyclopedia_veteran',
  'encyclopedia_complete',
  'hundred_catches',
  'three_hundred_catches',
  'thousand_catches',
  'market_veteran',
  'rod_arsenal',
  'tank_level_five',
  'tank_level_ten',
  'master_rod_smith',
  'signal_expert',
  'first_easter_egg',
  'easter_egg_collector',
  'lottery_grand_prize',
  'lottery_grand_collector'
]) {
  assert.equal(advancedIds.has(id), true, `expected ${id} to unlock`);
}

const advancedBalances = JSON.stringify({
  coins: advancedUser.coins,
  tickets: advancedUser.tickets,
  baitInventory: advancedUser.baitInventory
});
assert.deepEqual(scanAchievements(advancedUser, fishTypes), []);
assert.equal(JSON.stringify({
  coins: advancedUser.coins,
  tickets: advancedUser.tickets,
  baitInventory: advancedUser.baitInventory
}), advancedBalances);

console.log('achievement unlocks and one-time rewards ok');
