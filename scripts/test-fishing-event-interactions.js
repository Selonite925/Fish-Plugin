import assert from 'node:assert/strict';

import { createDefaultUserData, normalizeUserData } from '../lib/user.js';
import {
  MAP_EVENT_INTERACTION_TTL_MS,
  queueMapEventInteraction,
  resolveMapEventInteraction,
  rollDeepSeaEventDamage
} from '../lib/maps.js';

const event = {
  message: '裂谷里传来一声回响。',
  effect: 'echo',
  healthDamage: { chance: 0.3, min: 5, max: 5 }
};

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

console.log('fishing event choices, expiry, and damage scaling ok');
