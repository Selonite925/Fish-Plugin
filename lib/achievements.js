import { ACHIEVEMENT_DEFS, BAIT_CATALOG, EASTER_EGG_RARITY, RARITY_ORDER } from './constants.js';

function ensureSlot(userData, id) {
  if (!userData.achievements[id]) {
    userData.achievements[id] = { unlocked: false, unlockedAt: null, rewardClaimed: false, rewardClaimedAt: null };
  }
  return userData.achievements[id];
}

function getRewardConfig(def) {
  return {
    coins: Number(def.rewardCoins || 0),
    tickets: Number(def.rewards?.tickets || 0),
    permanentDailyCasts: Number(def.rewards?.permanentDailyCasts || 0),
    catchRateBonus: Number(def.rewards?.catchRateBonus || 0),
    catchRateHint: def.rewards?.catchRateHint || '',
    baits: Array.isArray(def.rewards?.baits) ? def.rewards.baits : []
  };
}

export function describeAchievementReward(def) {
  const reward = getRewardConfig(def);
  const parts = [];

  if (reward.coins > 0) parts.push(`${reward.coins}鱼币`);
  if (reward.tickets > 0) parts.push(`${reward.tickets}张钓鱼券`);
  if (reward.permanentDailyCasts > 0) parts.push(`每日基础钓数+${reward.permanentDailyCasts}`);
  for (const baitReward of reward.baits) {
    const baitId = String(baitReward?.id || '').trim();
    const count = Number(baitReward?.count || 0);
    if (!baitId || count <= 0) continue;
    const baitName = BAIT_CATALOG[baitId]?.name || baitId;
    parts.push(`${baitName}x${count}`);
  }
  if (reward.catchRateBonus > 0) parts.push(reward.catchRateHint || '提竿手感更顺一点');

  return parts.join('、') || '无';
}

export function getAchievementCatchRateBonus(userData) {
  if (!userData?.achievements) return 0;

  return ACHIEVEMENT_DEFS.reduce((sum, def) => {
    const slot = userData.achievements?.[def.id];
    if (!slot?.rewardClaimed) return sum;
    return sum + Number(def.rewards?.catchRateBonus || 0);
  }, 0);
}

export function getAchievementDailyCastBonus(userData) {
  if (!userData?.achievements) return 0;

  // 后续添加永久加钓数成就时，只需要在 constants.js 的对应成就 rewards 里写 permanentDailyCasts: 1。
  // 这里会自动把已领奖成就的 permanentDailyCasts 计入玩家每日基础上限。
  // 注意：这是永久作用于玩家本人的基础钓数；不要用 tickets，tickets 只是临时突破上限的钓鱼券。
  return ACHIEVEMENT_DEFS.reduce((sum, def) => {
    const slot = userData.achievements?.[def.id];
    if (!slot?.rewardClaimed) return sum;
    return sum + Number(def.rewards?.permanentDailyCasts || 0);
  }, 0);
}

function syncAchievementBonuses(userData) {
  userData.achievementCatchRateBonus = getAchievementCatchRateBonus(userData);
  userData.achievementDailyCastBonus = getAchievementDailyCastBonus(userData);
}

function applyRewards(userData, def, slot) {
  const reward = getRewardConfig(def);

  if (reward.coins > 0) {
    userData.coins += reward.coins;
  }
  if (reward.tickets > 0) {
    userData.tickets += reward.tickets;
  }
  for (const baitReward of reward.baits) {
    const baitId = String(baitReward?.id || '').trim();
    const count = Number(baitReward?.count || 0);
    if (!baitId || count <= 0) continue;
    if (!userData.baitInventory?.[baitId]) userData.baitInventory[baitId] = 0;
    userData.baitInventory[baitId] += count;
  }

  slot.rewardClaimed = true;
  slot.rewardClaimedAt = Date.now();
}

function unlock(userData, def, unlocked) {
  const slot = ensureSlot(userData, def.id);

  if (!unlocked && !slot.unlocked) return null;

  const newlyUnlocked = unlocked && !slot.unlocked;
  if (newlyUnlocked) {
    slot.unlocked = true;
    slot.unlockedAt = Date.now();
  }

  const rewardDelivered = !slot.rewardClaimed && (unlocked || slot.unlocked);
  if (rewardDelivered) {
    applyRewards(userData, def, slot);
  }

  if (!newlyUnlocked && !rewardDelivered) return null;

  return {
    ...def,
    newlyUnlocked,
    rewardDelivered,
    rewardText: describeAchievementReward(def)
  };
}

export function scanAchievements(userData, fishTypes) {
  syncAchievementBonuses(userData);
  const unlocked = [];
  const fishHistory = Array.isArray(userData.allTimeFish) ? userData.allTimeFish : [];
  const raritySet = new Set(fishHistory.map(fish => fish.rarity));
  const nameSet = new Set(fishHistory.map(fish => fish.name));
  const totalCaught = fishHistory.length;
  const distinctSpecies = nameSet.size;
  const craftedLegendaryRodCount = Object.keys(userData.craftedLegendaryRods || {}).length;

  const commonNames = new Set((fishTypes.common || []).map(fish => fish.name));
  const hasAllCommon = [...commonNames].every(name => nameSet.has(name));

  for (const def of ACHIEVEMENT_DEFS) {
    let hit = false;
    switch (def.id) {
      case 'first_legendary':
        hit = raritySet.has('legendary');
        break;
      case 'rare_pathfinder':
        hit = raritySet.has('rare') || raritySet.has('epic') || raritySet.has('legendary') || raritySet.has(EASTER_EGG_RARITY);
        break;
      case 'epic_arrival':
        hit = raritySet.has('epic') || raritySet.has('legendary') || raritySet.has(EASTER_EGG_RARITY);
        break;
      case 'common_master':
        hit = hasAllCommon && commonNames.size > 0;
        break;
      case 'species_collector':
        hit = distinctSpecies >= 15;
        break;
      case 'encyclopedia_apprentice':
        hit = distinctSpecies >= 40;
        break;
      case 'thirty_catches':
        hit = totalCaught >= 30;
        break;
      case 'empty_streak_10':
        hit =
          Number(userData.stats?.bestConsecutiveEmpty || 0) >= 10 ||
          Number(userData.stats?.consecutiveEmpty || 0) >= 10 ||
          (Number(userData.today?.count || 0) >= 10 && Number(userData.today?.catches || 0) === 0);
        break;
      case 'market_first_trade':
        hit = Number(userData.marketTrades || 0) > 0;
        break;
      case 'market_regular':
        hit = Number(userData.marketTrades || 0) >= 10;
        break;
      case 'rod_collector':
        hit = (userData.rodsOwned || []).length >= 3;
        break;
      case 'tank_first_upgrade':
        hit = Number(userData.tankLevel || 0) >= 1;
        break;
      case 'legend_rod_smith':
        hit = craftedLegendaryRodCount >= 1;
        break;
      case 'signal_hunter':
        hit = Number(userData.stats?.signalFishCaught || 0) >= 5;
        break;
      default:
        hit = false;
    }
    const result = unlock(userData, def, hit);
    if (result) unlocked.push(result);
  }

  syncAchievementBonuses(userData);
  return unlocked;
}

export function formatAchievementList(userData) {
  return ACHIEVEMENT_DEFS.map(def => {
    const slot = ensureSlot(userData, def.id);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      rewardCoins: def.rewardCoins,
      rewardText: describeAchievementReward(def),
      unlocked: Boolean(slot.unlocked),
      unlockedAt: slot.unlockedAt || null
    };
  });
}

export function getCollectionStats(userData, fishTypes, rarities = RARITY_ORDER) {
  const visibleRarities = new Set(rarities);
  const allNames = new Set((userData.allTimeFish || [])
    .filter(fish => visibleRarities.has(fish.rarity))
    .map(fish => fish.name));
  const perRarity = {};
  for (const rarity of rarities) {
    const species = fishTypes[rarity] || [];
    perRarity[rarity] = {
      total: species.length,
      owned: species.filter(fish => allNames.has(fish.name)).length
    };
  }
  return perRarity;
}
