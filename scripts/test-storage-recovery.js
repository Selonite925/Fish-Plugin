import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { readJson, writeJson } from '../lib/storage.js';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fish-storage-recovery-'));

try {
  const worldFile = path.join(tempDir, 'worldState.json');
  const backupFile = path.join(tempDir, 'worldState.backup.json');
  const olderBackupFile = path.join(tempDir, 'worldState.backup-1.json');

  writeJson(worldFile, { version: 1, harbors: { group: { constructionPoints: 100 } } }, { backupIntervalMs: 0 });
  writeJson(worldFile, { version: 2, harbors: { group: { constructionPoints: 200 } } }, { backupIntervalMs: 0 });
  writeJson(worldFile, { version: 3, harbors: { group: { constructionPoints: 300 } } }, { backupIntervalMs: 0 });

  assert.equal(JSON.parse(fs.readFileSync(worldFile, 'utf8')).version, 3);
  assert.equal(JSON.parse(fs.readFileSync(backupFile, 'utf8')).version, 2);
  assert.equal(JSON.parse(fs.readFileSync(olderBackupFile, 'utf8')).version, 1);

  fs.writeFileSync(worldFile, Buffer.alloc(256));
  const recoveredFromBackup = readJson(worldFile, {});
  assert.equal(recoveredFromBackup.version, 2);
  assert.equal(JSON.parse(fs.readFileSync(worldFile, 'utf8')).version, 2);
  assert.ok(fs.readdirSync(tempDir).some(name => name.startsWith('worldState.corrupt-')));

  fs.writeFileSync(worldFile, Buffer.alloc(128));
  const completedTempFile = path.join(tempDir, 'worldState.tmp-manual.json');
  fs.writeFileSync(completedTempFile, JSON.stringify({ version: 4, harbors: {} }, null, 2), 'utf8');
  const futureTime = new Date(Date.now() + 2000);
  fs.utimesSync(completedTempFile, futureTime, futureTime);
  const recoveredFromTemp = readJson(worldFile, {});
  assert.equal(recoveredFromTemp.version, 4);
  assert.equal(JSON.parse(fs.readFileSync(worldFile, 'utf8')).version, 4);
  assert.equal(fs.existsSync(completedTempFile), false);

  const unchangedMtime = fs.statSync(worldFile).mtimeMs;
  assert.equal(writeJson(worldFile, recoveredFromTemp, { backupIntervalMs: 0 }), false);
  assert.equal(fs.statSync(worldFile).mtimeMs, unchangedMtime);

  const unrecoverableFile = path.join(tempDir, 'unrecoverable.json');
  fs.writeFileSync(unrecoverableFile, '\0\0\0', 'utf8');
  assert.deepEqual(readJson(unrecoverableFile, { clean: true }), { clean: true });
  assert.deepEqual(JSON.parse(fs.readFileSync(unrecoverableFile, 'utf8')), { clean: true });
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('atomic JSON write and corruption recovery ok');
