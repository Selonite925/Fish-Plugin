const HARBOR_DEFAULT = {
  level: 0,
  constructionPoints: 0,
  contributors: {}
};

export const HARBOR_LEVELS = [
  { level: 0, requiredPoints: 0, name: '浅滩码头', catchRateBonus: 0, signalBonusCoins: 0, rarityBias: {} },
  { level: 1, requiredPoints: 2000, name: '木桩渔港', catchRateBonus: 0.003, signalBonusCoins: 0, rarityBias: {} },
  { level: 2, requiredPoints: 7000, name: '潮汐渔港', catchRateBonus: 0.006, signalBonusCoins: 5, rarityBias: {} },
  { level: 3, requiredPoints: 16000, name: '繁盛渔港', catchRateBonus: 0.008, signalBonusCoins: 10, rarityBias: { rare: 0.003, epic: 0.002, legendary: 0.001 } },
  { level: 4, requiredPoints: 32000, name: '星灯渔港', catchRateBonus: 0.01, signalBonusCoins: 15, rarityBias: { rare: 0.004, epic: 0.003, legendary: 0.0015 } }
];

function normalizeGroupId(groupId) {
  return String(groupId || '').trim();
}

export function ensureHarborState(worldState, groupId) {
  const normalizedGroupId = normalizeGroupId(groupId);
  if (!normalizedGroupId) return null;
  if (!worldState.harbors || typeof worldState.harbors !== 'object') worldState.harbors = {};
  const current = worldState.harbors[normalizedGroupId];
  if (!current || typeof current !== 'object') {
    worldState.harbors[normalizedGroupId] = structuredClone(HARBOR_DEFAULT);
  }
  const harbor = worldState.harbors[normalizedGroupId];
  harbor.constructionPoints = Math.max(0, Number(harbor.constructionPoints || 0));
  harbor.contributors = harbor.contributors && typeof harbor.contributors === 'object' ? harbor.contributors : {};
  harbor.level = getHarborLevel(harbor.constructionPoints).level;
  return harbor;
}

export function getHarborLevel(points = 0) {
  const normalizedPoints = Math.max(0, Number(points || 0));
  return [...HARBOR_LEVELS].reverse().find(item => normalizedPoints >= item.requiredPoints) || HARBOR_LEVELS[0];
}

export function getNextHarborLevel(level = 0) {
  return HARBOR_LEVELS.find(item => item.level > Number(level || 0)) || null;
}

export function getHarborEffect(worldState, groupId) {
  const harbor = ensureHarborState(worldState, groupId);
  if (!harbor) return { level: 0, name: '无群渔港', catchRateBonus: 0, signalBonusCoins: 0, rarityBias: {} };
  const level = getHarborLevel(harbor.constructionPoints);
  return { ...level, rarityBias: { ...(level.rarityBias || {}) } };
}

function ensureContributor(harbor, userId) {
  const key = String(userId || '').trim();
  if (!key) return null;
  const current = harbor.contributors[key];
  if (!current || typeof current !== 'object') harbor.contributors[key] = { coins: 0, fishPoints: 0 };
  return harbor.contributors[key];
}

export function applyHarborDonation(worldState, groupId, userId, donation = {}) {
  const harbor = ensureHarborState(worldState, groupId);
  if (!harbor) return null;
  const coins = Math.max(0, Math.floor(Number(donation.coins || 0)));
  const fishPoints = Math.max(0, Math.floor(Number(donation.fishPoints || 0)));
  const points = coins + fishPoints;
  if (points <= 0) return { harbor, points: 0, levelBefore: harbor.level, levelAfter: harbor.level };

  const levelBefore = harbor.level;
  harbor.constructionPoints += points;
  harbor.level = getHarborLevel(harbor.constructionPoints).level;
  const contributor = ensureContributor(harbor, userId);
  if (contributor) {
    contributor.coins += coins;
    contributor.fishPoints += fishPoints;
  }
  return { harbor, points, levelBefore, levelAfter: harbor.level };
}

export function getHarborProgressText(harbor) {
  const current = getHarborLevel(harbor?.constructionPoints);
  const next = getNextHarborLevel(current.level);
  const points = Math.max(0, Number(harbor?.constructionPoints || 0));
  if (!next) return `${current.name} Lv.${current.level}（${points}建设值，已满级）`;
  return `${current.name} Lv.${current.level}（${points}/${next.requiredPoints}建设值，距${next.name}还差${Math.max(0, next.requiredPoints - points)}）`;
}

export function getHarborFishPoints(fish) {
  return ({ common: 20, uncommon: 50, rare: 120, epic: 350, legendary: 1000 }[fish?.rarity] || 0);
}
