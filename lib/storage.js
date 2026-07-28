import fs from 'fs';
import path from 'path';
import { isDeepStrictEqual } from 'node:util';
import {
  BACKGROUND_DIR,
  BAIT_DATA_FILE,
  CONFIG_FILE,
  DATA_DIR,
  FISH_DATA_FILE,
  GENERATED_DIR,
  LOST_ITEMS_FILE,
  RESOURCE_DIR,
  TEMPLATE_DIR,
  WORLD_STATE_FILE
} from './constants.js';

const DEFAULT_BACKUP_INTERVAL_MS = 60 * 1000;
let temporaryFileCounter = 0;
// Delayed commands keep their read baseline so saving one player cannot overwrite newer players.
const fishDataSnapshots = new WeakMap();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureBaseDirs() {
  ensureDir(DATA_DIR);
  ensureDir(RESOURCE_DIR);
  ensureDir(BACKGROUND_DIR);
  ensureDir(GENERATED_DIR);
  ensureDir(TEMPLATE_DIR);
}

export function ensureGeneratedDir() {
  ensureBaseDirs();
  return GENERATED_DIR;
}

function getJsonFileParts(file) {
  const extension = path.extname(file) || '.json';
  return {
    directory: path.dirname(file),
    extension,
    stem: path.basename(file, extension)
  };
}

function getBackupFiles(file) {
  const { directory, extension, stem } = getJsonFileParts(file);
  return [
    path.join(directory, `${stem}.backup${extension}`),
    path.join(directory, `${stem}.backup-1${extension}`)
  ];
}

function getTemporaryFile(file, kind = 'tmp') {
  const { directory, extension, stem } = getJsonFileParts(file);
  temporaryFileCounter += 1;
  return path.join(
    directory,
    `${stem}.${kind}-${process.pid}-${Date.now()}-${temporaryFileCounter}${extension}`
  );
}

function getRecoveryArtifactFiles(file) {
  const { directory, extension, stem } = getJsonFileParts(file);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter(name => (
      (name.startsWith(`${stem}.tmp-`) || name.startsWith(`${stem}.replace-`)) &&
      name.endsWith(extension)
    ))
    .map(name => path.join(directory, name));
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function mergeChangedRecords(snapshot, localData, latestData) {
  const baseline = isPlainObject(snapshot) ? snapshot : {};
  const local = isPlainObject(localData) ? localData : {};
  const merged = structuredClone(isPlainObject(latestData) ? latestData : {});
  const keys = new Set([...Object.keys(baseline), ...Object.keys(local)]);

  for (const key of keys) {
    const existedBefore = Object.hasOwn(baseline, key);
    const existsLocally = Object.hasOwn(local, key);
    const changedLocally = existedBefore !== existsLocally || (
      existedBefore && existsLocally && !isDeepStrictEqual(baseline[key], local[key])
    );
    if (!changedLocally) continue;

    if (existsLocally) merged[key] = structuredClone(local[key]);
    else delete merged[key];
  }

  return merged;
}

function isCompatibleJsonValue(value, defaultValue) {
  if (Array.isArray(defaultValue)) return Array.isArray(value);
  if (isPlainObject(defaultValue)) return isPlainObject(value);
  if (defaultValue === null) return value === null;
  return typeof value === typeof defaultValue;
}

function parseJsonContent(content, defaultValue) {
  const raw = String(content || '').replace(/^\uFEFF/, '');
  if (!raw.trim()) throw new Error('JSON file is empty');
  if (raw.includes('\0')) throw new Error('JSON file contains NUL bytes');
  const parsed = JSON.parse(raw);
  if (!isCompatibleJsonValue(parsed, defaultValue)) {
    throw new Error('JSON root type does not match the expected data shape');
  }
  return parsed;
}

function readJsonCandidate(file, defaultValue) {
  if (!fs.existsSync(file)) return null;
  try {
    const content = fs.readFileSync(file, 'utf8');
    return {
      file,
      content,
      data: parseJsonContent(content, defaultValue),
      modifiedAt: fs.statSync(file).mtimeMs
    };
  } catch {
    return null;
  }
}

function logStorageWarning(message) {
  globalThis.logger?.warn?.(`[Fish-plugin] ${message}`);
}

function writeFileDurably(file, content) {
  const descriptor = fs.openSync(file, 'wx');
  try {
    fs.writeFileSync(descriptor, content, 'utf8');
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function replaceFile(tempFile, targetFile) {
  try {
    fs.renameSync(tempFile, targetFile);
    return;
  } catch (directRenameError) {
    if (!fs.existsSync(targetFile)) throw directRenameError;
  }

  const displacedFile = getTemporaryFile(targetFile, 'replace');
  fs.renameSync(targetFile, displacedFile);
  try {
    fs.renameSync(tempFile, targetFile);
    fs.rmSync(displacedFile, { force: true });
  } catch (error) {
    if (!fs.existsSync(targetFile) && fs.existsSync(displacedFile)) {
      fs.renameSync(displacedFile, targetFile);
    }
    throw error;
  }
}

function writeRawAtomically(file, content) {
  ensureDir(path.dirname(file));
  const tempFile = getTemporaryFile(file);
  try {
    writeFileDurably(tempFile, content);
    replaceFile(tempFile, file);
  } finally {
    if (fs.existsSync(tempFile)) fs.rmSync(tempFile, { force: true });
  }
}

function removeRecoveryArtifacts(file) {
  for (const artifact of getRecoveryArtifactFiles(file)) {
    try {
      fs.rmSync(artifact, { force: true });
    } catch {
      // A stale recovery file is harmless; leave it for the next successful save.
    }
  }
}

function preserveCorruptFile(file) {
  if (!fs.existsSync(file)) return '';
  const { directory, extension, stem } = getJsonFileParts(file);
  const quarantineFile = path.join(directory, `${stem}.corrupt-${Date.now()}${extension}`);
  try {
    fs.copyFileSync(file, quarantineFile);
    return quarantineFile;
  } catch {
    return '';
  }
}

function refreshBackups(file, current, defaultValue, backupIntervalMs) {
  const [latestBackup, olderBackup] = getBackupFiles(file);
  const existingBackup = readJsonCandidate(latestBackup, defaultValue);
  const interval = Math.max(0, Number(backupIntervalMs || 0));
  const backupIsFresh = existingBackup && Date.now() - existingBackup.modifiedAt < interval;
  if (existingBackup?.content === current.content || backupIsFresh) return;

  if (existingBackup) {
    writeRawAtomically(olderBackup, existingBackup.content);
  }
  writeRawAtomically(latestBackup, current.content);
}

export function readJson(file, defaultValue) {
  ensureBaseDirs();
  const primary = readJsonCandidate(file, defaultValue);
  if (primary) {
    removeRecoveryArtifacts(file);
    return primary.data;
  }

  const recovery = [
    ...getRecoveryArtifactFiles(file),
    ...getBackupFiles(file)
  ]
    .map(candidate => readJsonCandidate(candidate, defaultValue))
    .filter(Boolean)
    .sort((left, right) => right.modifiedAt - left.modifiedAt)[0];

  const corruptCopy = preserveCorruptFile(file);
  if (recovery) {
    logStorageWarning(
      `${path.basename(file)} 损坏，已从 ${path.basename(recovery.file)} 自动恢复` +
      (corruptCopy ? `，损坏副本保存在 ${path.basename(corruptCopy)}` : '')
    );
    writeJson(file, recovery.data, { backupIntervalMs: 0 });
    removeRecoveryArtifacts(file);
    return recovery.data;
  }

  if (fs.existsSync(file)) {
    logStorageWarning(
      `${path.basename(file)} 损坏且没有有效备份，已使用默认数据` +
      (corruptCopy ? `，损坏副本保存在 ${path.basename(corruptCopy)}` : '')
    );
  }
  const fallback = structuredClone(defaultValue);
  writeJson(file, fallback, { backupIntervalMs: 0 });
  return fallback;
}

export function writeJson(file, data, options = {}) {
  ensureBaseDirs();
  const content = JSON.stringify(data, null, 2);
  if (typeof content !== 'string') throw new TypeError('JSON data must be serializable');
  parseJsonContent(content, data);

  const current = readJsonCandidate(file, data);
  if (current) {
    refreshBackups(
      file,
      current,
      data,
      options.backupIntervalMs ?? DEFAULT_BACKUP_INTERVAL_MS
    );
    if (current.content === content) return false;
  }

  writeRawAtomically(file, content);
  removeRecoveryArtifacts(file);
  return true;
}

export function loadConfig() {
  return readJson(CONFIG_FILE, {
    dailyLimit: 10,
    dailyResetHour: 0,
    segmentedCastReturnEnabled: false,
    dailyTicketUseLimitEnabled: true,
    dailyTicketUseLimit: 10
  });
}

export function saveConfig(config) {
  writeJson(CONFIG_FILE, config);
}

export function loadFishData() {
  const data = readJson(FISH_DATA_FILE, {});
  fishDataSnapshots.set(data, structuredClone(data));
  return data;
}

export function saveFishData(data) {
  const snapshot = fishDataSnapshots.get(data);
  if (!snapshot) return writeJson(FISH_DATA_FILE, data);

  const latestData = readJson(FISH_DATA_FILE, {});
  const mergedData = mergeChangedRecords(snapshot, data, latestData);
  const changed = writeJson(FISH_DATA_FILE, mergedData);
  fishDataSnapshots.set(data, structuredClone(data));
  return changed;
}

export function loadBaitData() {
  return readJson(BAIT_DATA_FILE, {});
}

export function saveBaitData(data) {
  writeJson(BAIT_DATA_FILE, data);
}

export function loadLostItems() {
  return readJson(LOST_ITEMS_FILE, {});
}

export function saveLostItems(data) {
  writeJson(LOST_ITEMS_FILE, data);
}

export function loadWorldState() {
  return readJson(WORLD_STATE_FILE, {});
}

export function saveWorldState(data) {
  writeJson(WORLD_STATE_FILE, data, { backupIntervalMs: 0 });
}

export function getBackgroundFiles() {
  ensureBaseDirs();
  const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  return fs.existsSync(BACKGROUND_DIR)
    ? fs.readdirSync(BACKGROUND_DIR)
      .filter(name => allowed.has(path.extname(name).toLowerCase()))
      .map(name => path.join(BACKGROUND_DIR, name))
    : [];
}
