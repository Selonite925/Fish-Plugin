import assert from 'node:assert/strict';

import { createDefaultUserData, normalizeUserData } from '../lib/user.js';
import {
  DEEP_SEA_EVENTS,
  MAP_EVENT_INTERACTION_TTL_MS,
  formatMapEventInteraction,
  getMapProfile,
  parseMapEventChoice,
  queueMapEventInteraction,
  resolveMapEventInteraction,
  rollDeepSeaEventDamage
} from '../lib/maps.js';

const event = {
  message: '裂谷里传来一声回响。',
  effect: 'echo',
  healthDamage: { chance: 0.3, min: 5, max: 5 }
};

assert.equal(DEEP_SEA_EVENTS.length, 12);
assert.equal(new Set(DEEP_SEA_EVENTS.map(item => item.id)).size, DEEP_SEA_EVENTS.length);
assert.strictEqual(getMapProfile('abyss').randomEvents, DEEP_SEA_EVENTS);
for (const deepSeaEvent of DEEP_SEA_EVENTS) {
  assert.ok(deepSeaEvent.title);
  assert.ok(deepSeaEvent.message);
  assert.ok(deepSeaEvent.followChoice);
  assert.ok(deepSeaEvent.holdChoice);
  assert.ok(deepSeaEvent.followStage);
  assert.ok(deepSeaEvent.holdStage);
  assert.ok(['echo', 'chart', 'heat'].includes(deepSeaEvent.effect));
  assert.ok(deepSeaEvent.healthDamage.chance >= 0 && deepSeaEvent.healthDamage.chance <= 0.35);
  assert.ok(deepSeaEvent.healthDamage.max <= 9);
  const prompt = formatMapEventInteraction(deepSeaEvent, 8);
  assert.ok(prompt.includes(deepSeaEvent.title));
  assert.ok(prompt.includes(`#钓鱼事件 1 ${deepSeaEvent.followChoice}`));
  assert.ok(prompt.includes(`#钓鱼事件 2 ${deepSeaEvent.holdChoice}`));
  assert.doesNotMatch(prompt, /获得|恢复|损失|受伤|惩罚/u);
  assert.equal(parseMapEventChoice(`#钓鱼事件 1 ${deepSeaEvent.followChoice}`, deepSeaEvent), 'follow');
  assert.equal(parseMapEventChoice(`#钓鱼事件 2 ${deepSeaEvent.holdChoice}`, deepSeaEvent), 'rest');
}
assert.equal(parseMapEventChoice('#钓鱼事件 追踪回声', event), 'follow');
assert.equal(parseMapEventChoice('#钓鱼事件 收竿休整', event), 'rest');
assert.equal(parseMapEventChoice('#钓鱼事件 留在甲板', { holdChoice: '稳住船身' }), 'rest');
assert.equal(parseMapEventChoice('#钓鱼事件 3'), '');

const tracker = createDefaultUserData();
const queued = queueMapEventInteraction(tracker, event, {
  mapId: 'abyss',
  groupId: '123',
  dayKey: '2026-09-30',
  now: 1000
});
assert.equal(queued.queued, true);
assert.equal(queued.pending.expiresAt, 1000 + MAP_EVENT_INTERACTION_TTL_MS);
assert.equal(queueMapEventInteraction(tracker, event, { now: 2000 }).reason, 'pending_exists');

const followed = resolveMapEventInteraction(tracker, 'follow', {
  now: 3000,
  dayKey: '2026-09-30',
  maxHealth: 200,
  random: () => 0.99
});
assert.equal(followed.ok, true);
assert.equal(followed.eventResult.effect, 'echo');
assert.equal(followed.pending.event.title, '');
assert.equal(followed.eventDamage.triggered, false);
assert.equal(tracker.mapState.abyss.echo, 1);
assert.equal(tracker.mapState.events.abyss, 1);
assert.equal(tracker.mapState.pendingEvent, null);

const hurtTracker = createDefaultUserData();
queueMapEventInteraction(hurtTracker, event, {
  mapId: 'abyss',
  dayKey: '2026-09-30',
  now: 1_500_000
});
const followedIntoDamage = resolveMapEventInteraction(hurtTracker, 'follow', {
  now: 1_501_000,
  dayKey: '2026-09-30',
  maxHealth: 200,
  damageMultiplier: 0.6,
  random: () => 0
});
assert.equal(followedIntoDamage.damage.amount, 3);
assert.equal(hurtTracker.health, 197);

const resting = createDefaultUserData();
resting.health = 100;
resting.healthDate = '2026-09-30';
queueMapEventInteraction(resting, event, { mapId: 'abyss', now: 2_000_000 });
const rested = resolveMapEventInteraction(resting, 'rest', {
  now: 2_001_000,
  dayKey: '2026-09-30',
  maxHealth: 200
});
assert.equal(rested.recovery.amount, 4);
assert.equal(resting.health, 104);
assert.equal(resting.mapState.abyss.echo, 0);

const nightShift = createDefaultUserData();
nightShift.health = 100;
nightShift.healthDate = '2026-09-30';
queueMapEventInteraction(nightShift, event, { mapId: 'abyss', dayKey: '2026-09-30', now: 2_500_000 });
const nightShiftRest = resolveMapEventInteraction(nightShift, 'rest', {
  now: 2_501_000,
  dayKey: '2026-09-30',
  maxHealth: 200,
  restRecoveryBonus: 8
});
assert.equal(nightShiftRest.recovery.amount, 12);
assert.equal(nightShift.health, 112);

const nextDay = createDefaultUserData();
nextDay.health = 50;
nextDay.healthDate = '2026-09-30';
queueMapEventInteraction(nextDay, event, {
  mapId: 'abyss',
  dayKey: '2026-09-30',
  now: 2_700_000
});
const staleDay = resolveMapEventInteraction(nextDay, 'rest', {
  now: 2_701_000,
  dayKey: '2026-10-01',
  maxHealth: 200
});
assert.equal(staleDay.reason, 'stale_day');
assert.equal(nextDay.mapState.pendingEvent, null);
assert.equal(nextDay.health, 50);

const stale = createDefaultUserData();
queueMapEventInteraction(stale, event, { mapId: 'abyss', now: 3_000_000 });
const expired = resolveMapEventInteraction(stale, 'follow', {
  now: 3_000_000 + MAP_EVENT_INTERACTION_TTL_MS,
  dayKey: '2026-09-30',
  maxHealth: 200
});
assert.equal(expired.reason, 'expired');
assert.equal(stale.mapState.pendingEvent, null);

const mitigated = rollDeepSeaEventDamage(event, {
  random: () => 0,
  damageMultiplier: 0.6
});
assert.equal(mitigated.damage, 3);

const normalized = createDefaultUserData();
normalized.mapState.pendingEvent = { event: { effect: 'invalid' }, expiresAt: 10, createdAt: 1 };
normalizeUserData(normalized);
assert.equal(normalized.mapState.pendingEvent, null);

const legacyPending = createDefaultUserData();
legacyPending.mapState.pendingEvent = {
  mapId: 'abyss',
  dayKey: '2026-09-30',
  createdAt: 4_000,
  expiresAt: 4_000 + MAP_EVENT_INTERACTION_TTL_MS,
  event: { message: '旧版回声还在。', effect: 'echo', healthDamage: { chance: 0.2, min: 2, max: 4 } }
};
normalizeUserData(legacyPending);
assert.equal(legacyPending.mapState.pendingEvent.event.message, '旧版回声还在。');
assert.equal(legacyPending.mapState.pendingEvent.event.title, '');
assert.ok(formatMapEventInteraction(legacyPending.mapState.pendingEvent.event, 5, { includeMessage: true }).includes('旧版回声还在。'));
assert.equal(parseMapEventChoice('#钓鱼事件 追随回声', legacyPending.mapState.pendingEvent.event), 'follow');

console.log('fishing event choices, expiry, and damage scaling ok');
