import { randomUUID } from 'crypto';

import { applyHarborDonation } from './harbor.js';

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function ensurePendingTransactions(worldState) {
  if (!isPlainObject(worldState)) return null;
  if (!isPlainObject(worldState.pendingHarborDonations)) worldState.pendingHarborDonations = {};
  return worldState.pendingHarborDonations;
}

function createTransaction(worldState, values) {
  const pending = ensurePendingTransactions(worldState);
  if (!pending) return null;
  const transaction = {
    id: randomUUID(),
    createdAt: Date.now(),
    ...values
  };
  pending[transaction.id] = transaction;
  return transaction;
}

export function prepareHarborCoinDonation(worldState, options = {}) {
  const amount = Number(options.amount);
  const balanceBefore = Number(options.balanceBefore);
  const groupId = String(options.groupId || '').trim();
  const userId = String(options.userId || '').trim();
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  if (!Number.isSafeInteger(balanceBefore) || balanceBefore < amount) return null;
  if (!groupId || !userId) return null;
  return createTransaction(worldState, {
    type: 'coins',
    groupId,
    userId,
    amount,
    balanceBefore,
    balanceAfter: balanceBefore - amount
  });
}

export function prepareHarborFishDonation(worldState, options = {}) {
  const points = Number(options.points);
  const fishId = String(options.fishId || '').trim();
  const groupId = String(options.groupId || '').trim();
  const userId = String(options.userId || '').trim();
  if (!Number.isSafeInteger(points) || points <= 0 || !fishId || !groupId || !userId) return null;
  return createTransaction(worldState, {
    type: 'fish',
    groupId,
    userId,
    points,
    fishId
  });
}

export function cancelHarborDonation(worldState, transactionId) {
  const pending = ensurePendingTransactions(worldState);
  const id = String(transactionId || '').trim();
  if (!pending || !id || !Object.prototype.hasOwnProperty.call(pending, id)) return false;
  delete pending[id];
  return true;
}

export function commitHarborDonation(worldState, transactionId) {
  const pending = ensurePendingTransactions(worldState);
  const id = String(transactionId || '').trim();
  const transaction = pending?.[id];
  if (!isPlainObject(transaction)) return null;

  const donation = transaction.type === 'coins'
    ? { coins: transaction.amount, now: transaction.createdAt }
    : transaction.type === 'fish'
      ? { fishPoints: transaction.points, now: transaction.createdAt }
      : null;
  if (!donation) return null;

  const result = applyHarborDonation(
    worldState,
    transaction.groupId,
    transaction.userId,
    donation
  );
  if (!result || result.points <= 0) return null;
  delete pending[id];
  return { transaction, result };
}

function wasCoinDebitSaved(transaction, fishData) {
  const userData = fishData?.[transaction.userId];
  return Boolean(
    userData &&
    Number.isSafeInteger(Number(transaction.balanceAfter)) &&
    Number(userData.coins) === Number(transaction.balanceAfter)
  );
}

function wasFishRemovalSaved(transaction, fishData) {
  const fishId = String(transaction.fishId || '').trim();
  const userData = fishData?.[transaction.userId];
  if (!fishId || !userData || !Array.isArray(userData.fishTank)) return false;
  return !userData.fishTank.some(fish => String(fish?.fishId || '').trim() === fishId);
}

export function recoverPendingHarborDonations(worldState, fishData) {
  const pending = ensurePendingTransactions(worldState);
  const summary = { changed: false, applied: 0, cancelled: 0 };
  if (!pending) return summary;

  for (const [transactionId, transaction] of Object.entries(pending)) {
    if (!isPlainObject(transaction)) {
      delete pending[transactionId];
      summary.changed = true;
      summary.cancelled += 1;
      continue;
    }
    const resourceSaved = transaction.type === 'coins'
      ? wasCoinDebitSaved(transaction, fishData)
      : transaction.type === 'fish'
        ? wasFishRemovalSaved(transaction, fishData)
        : false;
    if (resourceSaved) {
      const committed = commitHarborDonation(worldState, transactionId);
      if (committed) summary.applied += 1;
      else {
        delete pending[transactionId];
        summary.cancelled += 1;
      }
    } else {
      delete pending[transactionId];
      summary.cancelled += 1;
    }
    summary.changed = true;
  }
  return summary;
}
