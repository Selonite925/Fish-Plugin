export function normalizeCoinAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(numeric));
}

export function scaleCoinReward(value, multiplier = 1) {
  const numericMultiplier = Number(multiplier);
  if (!Number.isFinite(numericMultiplier) || numericMultiplier <= 0) return 0;
  return normalizeCoinAmount(Number(value) * numericMultiplier);
}
