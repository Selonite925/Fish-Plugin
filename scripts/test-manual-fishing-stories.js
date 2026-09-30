import assert from 'node:assert/strict';

import { fishing } from '../Fish.js';
import { BAIT_CATALOG } from '../lib/constants.js';
import { createDefaultUserData, normalizeUserData } from '../lib/user.js';
import {
  FISHING_STORY_EVENTS,
  FISHING_STORY_TRIGGER_CHANCE,
  FISHING_STORY_TTL_MS,
  formatFishingStoryEvent,
  isFishingStoryReplyFailure,
  isFishingStoryReplyLikelyDelivered,
  parseFishingStoryChoice,
  rollFishingStoryOutcome,
  sendFishingStoryMessage,
} from '../lib/fishing-interactions.js';
import { queueFishingStoryInteraction, resolveMapEventInteraction } from '../lib/maps.js';

assert.equal(FISHING_STORY_EVENTS.length, 10);
assert.equal(new Set(FISHING_STORY_EVENTS.map(event => event.id)).size, 10);
assert.equal(FISHING_STORY_TRIGGER_CHANCE, 0.12);
assert.match(fishing.prototype.startFishing.toString(), /playRandomFishingStory/);
assert.doesNotMatch(fishing.prototype.startFastFishing.toString(), /playRandomFishingStory/);
const manualSource = fishing.prototype.startFishing.toString();
const duanwuBranch = /if \(duanwuEvent\) \{([\s\S]*?)\n\s{6}\}/u.exec(manualSource)?.[1] || '';
assert.match(duanwuBranch, /playRandomFishingStory/);

for (const event of FISHING_STORY_EVENTS) {
  assert.ok(event.intro.length > 0);
  assert.ok(event.scene.length > 0);
  assert.equal(event.actions.length, 3, `${event.id} should have three choices`);
  for (const choice of event.actions) {
    assert.ok(choice.stage.length > 0);
    assert.ok(choice.outcomes.length >= 3, `${event.id}/${choice.id} should have multiple endings`);
    assert.equal(
      choice.outcomes.reduce((sum, result) => sum + result.weight, 0),
      100,
    );
    assert.equal(new Set(choice.outcomes.map(result => result.text)).size, choice.outcomes.length);
    for (const result of choice.outcomes) {
      if (result.effect.type === 'coins') assert.ok(Math.abs(result.effect.amount) <= 68);
      if (result.effect.type === 'bait') assert.ok(BAIT_CATALOG[result.effect.id]);
      if (result.effect.type === 'health') assert.ok(Math.abs(result.effect.amount) <= 12);
    }
    assert.equal(rollFishingStoryOutcome(event, choice.id, () => 0).outcome, choice.outcomes[0]);
    assert.equal(rollFishingStoryOutcome(event, choice.id, () => 0.8).outcome, choice.outcomes[1]);
    assert.equal(rollFishingStoryOutcome(event, choice.id, () => 0.99).outcome, choice.outcomes[2]);
  }
  const presentation = formatFishingStoryEvent(event, 9);
  assert.ok(presentation.length < 500, `${event.id} should fit in one ordinary chat message`);
  assert.ok(presentation.includes(event.title));
  assert.ok(presentation.includes(event.intro));
  assert.ok(presentation.includes(event.scene));
  for (const [index, choice] of event.actions.entries()) {
    assert.ok(presentation.includes(`#钓鱼事件 ${index + 1} ${choice.label}`));
    assert.equal(parseFishingStoryChoice(event, `#钓鱼事件 ${index + 1} ${choice.label}`), choice.id);
    assert.equal(parseFishingStoryChoice(event, choice.label), choice.id);
  }
  assert.equal(parseFishingStoryChoice(event, '#钓鱼事件 4'), '');
}

assert.equal(isFishingStoryReplyFailure(undefined), true);
assert.equal(isFishingStoryReplyFailure(false), true);
assert.equal(isFishingStoryReplyFailure({ error: [new Error('send failed')] }), true);
assert.equal(isFishingStoryReplyFailure({ error: [] }), false);
assert.equal(isFishingStoryReplyFailure({ message_id: 'message-1' }), false);
assert.equal(
  isFishingStoryReplyLikelyDelivered({
    error: [new Error('Timeout: NTEvent serviceAndMethod:NodeIKernelMsgService/sendMsg')],
  }),
  true,
);
assert.equal(isFishingStoryReplyLikelyDelivered({ error: [new Error('send failed')] }), false);
let sendCalls = 0;
let fallbackCalls = 0;
const fallbackDelivery = await sendFishingStoryMessage('story text', {
  send: async () => {
    sendCalls += 1;
    return false;
  },
  fallbackSend: async message => {
    fallbackCalls += 1;
    assert.equal(message, 'story text');
    return { message_id: 'fallback-message' };
  },
  sleep: async () => {},
});
assert.equal(fallbackDelivery.ok, true);
assert.equal(sendCalls, 2);
assert.equal(fallbackCalls, 1);
let timeoutSendCalls = 0;
const timeoutDelivery = await sendFishingStoryMessage('story text', {
  send: async () => {
    timeoutSendCalls += 1;
    return { error: [new Error('Timeout: NTEvent serviceAndMethod:NodeIKernelMsgService/sendMsg')] };
  },
  fallbackSend: async () => assert.fail('a possibly delivered timeout should not send twice'),
  sleep: async () => {},
});
assert.equal(timeoutDelivery.ok, true);
assert.equal(timeoutSendCalls, 1);

const noEncounter = createDefaultUserData();
assert.equal(
  queueFishingStoryInteraction(noEncounter, {
    mapId: 'pond',
    now: 1000,
    random: () => 0.5,
  }).reason,
  'not_triggered',
);
assert.equal(noEncounter.mapState.pendingEvent, null);

const storyUser = createDefaultUserData();
const queued = queueFishingStoryInteraction(storyUser, {
  mapId: 'pond',
  groupId: 'group-1',
  dayKey: '2026-09-30',
  now: 2000,
  random: () => 0,
});
assert.equal(queued.queued, true);
assert.equal(queued.event.id, 'sealed_bottle');
assert.equal(queued.pending.expiresAt, 2000 + FISHING_STORY_TTL_MS);
let randomCalls = 0;
assert.equal(
  queueFishingStoryInteraction(storyUser, {
    now: 3000,
    random: () => {
      randomCalls += 1;
      return 0;
    },
  }).reason,
  'pending_exists',
);
assert.equal(randomCalls, 0);

const normalized = JSON.parse(JSON.stringify(storyUser));
normalizeUserData(normalized);
assert.equal(normalized.mapState.pendingEvent.kind, 'story');
assert.equal(normalized.mapState.pendingEvent.storyId, 'sealed_bottle');

const commonOutcome = resolveMapEventInteraction(storyUser, 'read', {
  now: 4000,
  dayKey: '2026-09-30',
  random: () => 0,
});
assert.equal(commonOutcome.ok, true);
assert.equal(commonOutcome.kind, 'story');
assert.equal(commonOutcome.event.id, 'sealed_bottle');
assert.equal(commonOutcome.outcome.effect.amount, 42);
assert.equal(storyUser.coins, 42);
assert.equal(storyUser.mapState.events.pond, 1);
assert.equal(storyUser.mapState.pendingEvent, null);

const baitOutcomeUser = createDefaultUserData();
queueFishingStoryInteraction(baitOutcomeUser, { mapId: 'pond', now: 5000, random: () => 0 });
const baitOutcome = resolveMapEventInteraction(baitOutcomeUser, 'read', {
  now: 6000,
  dayKey: '2026-09-30',
  random: () => 0.8,
});
assert.equal(baitOutcome.effectText, '获得 香谷鱼饵 x1。');
assert.equal(baitOutcomeUser.baitInventory.special_bait, 1);

const deepSeaUser = createDefaultUserData();
deepSeaUser.health = 50;
deepSeaUser.healthDate = '2026-09-30';
deepSeaUser.mapState.pendingEvent = {
  kind: 'story',
  storyId: 'broken_beacon',
  mapId: 'abyss',
  groupId: 'group-deep',
  dayKey: '2026-09-30',
  createdAt: 7000,
  expiresAt: 7000 + FISHING_STORY_TTL_MS,
};
const deepDamage = resolveMapEventInteraction(deepSeaUser, 'follow', {
  now: 8000,
  dayKey: '2026-09-30',
  maxHealth: 200,
  random: () => 0.99,
});
assert.equal(deepDamage.effectText, '生命值减少 9 点。');
assert.equal(deepSeaUser.health, 41);

const pondHealthFallbackUser = createDefaultUserData();
pondHealthFallbackUser.coins = 100;
pondHealthFallbackUser.mapState.pendingEvent = {
  kind: 'story',
  storyId: 'broken_beacon',
  mapId: 'pond',
  dayKey: '2026-09-30',
  createdAt: 9000,
  expiresAt: 9000 + FISHING_STORY_TTL_MS,
};
const pondFallback = resolveMapEventInteraction(pondHealthFallbackUser, 'follow', {
  now: 10000,
  dayKey: '2026-09-30',
  random: () => 0.99,
});
assert.equal(pondFallback.effectText, '这片水域没有深海生命线，替代损失为 22 鱼蛋。');
assert.equal(pondHealthFallbackUser.health, 200);
assert.equal(pondHealthFallbackUser.coins, 78);

const expiredUser = createDefaultUserData();
expiredUser.mapState.pendingEvent = {
  kind: 'story',
  storyId: 'sealed_bottle',
  mapId: 'pond',
  dayKey: '2026-09-30',
  createdAt: 11000,
  expiresAt: 11000 + FISHING_STORY_TTL_MS,
};
const expired = resolveMapEventInteraction(expiredUser, 'read', {
  now: 11000 + FISHING_STORY_TTL_MS,
  dayKey: '2026-09-30',
  random: () => 0,
});
assert.equal(expired.reason, 'expired');
assert.equal(expiredUser.mapState.pendingEvent, null);

const staleUser = createDefaultUserData();
staleUser.mapState.pendingEvent = {
  kind: 'story',
  storyId: 'sealed_bottle',
  mapId: 'pond',
  dayKey: '2026-09-30',
  createdAt: 12000,
  expiresAt: 12000 + FISHING_STORY_TTL_MS,
};
const stale = resolveMapEventInteraction(staleUser, 'read', {
  now: 13000,
  dayKey: '2026-10-01',
  random: () => 0,
});
assert.equal(stale.reason, 'stale_day');
assert.equal(staleUser.mapState.pendingEvent, null);

console.log('manual fishing story catalog, choices, random outcomes, and rewards ok');
