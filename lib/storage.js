import fs from 'fs';
import path from 'path';
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

export function readJson(file, defaultValue) {
  ensureBaseDirs();
  if (!fs.existsSync(file)) {
    writeJson(file, defaultValue);
    return structuredClone(defaultValue);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, data) {
  ensureBaseDirs();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function loadConfig() {
  return readJson(CONFIG_FILE, { dailyLimit: 10 });
}

export function saveConfig(config) {
  writeJson(CONFIG_FILE, config);
}

export function loadFishData() {
  return readJson(FISH_DATA_FILE, {});
}

export function saveFishData(data) {
  writeJson(FISH_DATA_FILE, data);
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
  writeJson(WORLD_STATE_FILE, data);
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
