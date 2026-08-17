import assert from 'node:assert/strict';
import { FISH_COMMAND_RULES } from '../lib/command-rules.js';
import {
  applyReleaseEcho,
  getReleaseEchoEffect,
  getReleaseEchoRepeatGift,
  getReleaseEchoStatus,
  RELEASE_ECHO_REPEAT_INTERVAL,
  RELEASE_ECHO_TIERS
} from '../lib/release-echo.js';
import { createDefaultUserData, getCatchRate, normalizeUserData } from '../lib/user.js';

const userData = createDefaultUserData();
normalizeUserData(userData);

const legacyUserData = {};
normalizeUserData(legacyUserData);
assert.deepEqual(legacyUserData.releaseEcho, {
  points: 0,
  releasedCount: 0,
  lastRarity: '',
  lastReleaseAt: 0,
  tier: 0
});

assert.equal(getReleaseEchoStatus(userData).tier.name, '静水');
assert.equal(getReleaseEchoEffect(userData).catchRateBonus, 0);

const tierResult = applyReleaseEcho(userData, Array.from({ length: 12 }, () => ({ rarity: 'legendary' })));
assert.equal(tierResult.tierBefore.name, '静水');
assert.equal(tierResult.tierAfter.name, '海歌');
assert.deepEqual(tierResult.promotedTiers.map(tier => tier.name), ['微澜', '回潮', '深流', '海歌']);
assert.equal(tierResult.repeatGiftCount, 0);
assert.equal(getReleaseEchoStatus(userData).nextTier, null);
assert.match(getReleaseEchoEffect(userData).summary, /鱼讯/);
const baselineUser = createDefaultUserData();
normalizeUserData(baselineUser);
assert.ok(getCatchRate(userData) > getCatchRate(baselineUser));

const repeatResult = applyReleaseEcho(userData, Array.from({ length: 8 }, () => ({ rarity: 'legendary' })));
assert.equal(userData.releaseEcho.points, RELEASE_ECHO_TIERS.at(-1).requiredPoints + RELEASE_ECHO_REPEAT_INTERVAL);
assert.equal(repeatResult.repeatGiftCount, 1);
assert.deepEqual(repeatResult.repeatGifts[0], getReleaseEchoRepeatGift(1));
assert.equal(repeatResult.repeatGifts[0].type, 'ticket');

const secondRepeatResult = applyReleaseEcho(userData, Array.from({ length: 8 }, () => ({ rarity: 'legendary' })));
assert.equal(secondRepeatResult.repeatGiftCount, 1);
assert.equal(secondRepeatResult.repeatGifts[0].type, 'bait');
assert.equal(secondRepeatResult.repeatGifts[0].baitId, 'deep_bait');

userData.releaseEcho = {
  points: 'not-a-number',
  releasedCount: '-4',
  lastRarity: 99,
  lastReleaseAt: Infinity,
  tier: 99
};
normalizeUserData(userData);
assert.deepEqual(userData.releaseEcho, {
  points: 0,
  releasedCount: 0,
  lastRarity: '',
  lastReleaseAt: 0,
  tier: 0
});

const echoRule = FISH_COMMAND_RULES.find(rule => rule.fnc === 'showReleaseEcho');
assert.ok(echoRule);
assert.ok(new RegExp(echoRule.reg).test('#放生回响'));

console.log('release echo progression and normalization ok');
