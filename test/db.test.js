import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { getState, openDb, saveLevel, setLang } from '../lib/db.js';

function tempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xiaoxiaole-'));
  return openDb(dir);
}

test('progress unlocks the next level and keeps the best result', () => {
  const db = tempDb();
  assert.equal(getState(db).unlocked, 1);
  assert.deepEqual(saveLevel(db, { levelId: 2, score: 10, stars: 1 }, 8), { error: 'locked' });

  assert.deepEqual(saveLevel(db, { levelId: 1, score: 100, stars: 2 }, 8), { ok: true });
  assert.equal(getState(db).unlocked, 2);
  assert.equal(getState(db).levels[1].bestScore, 100);
  assert.equal(getState(db).levels[1].stars, 2);

  saveLevel(db, { levelId: 1, score: 40, stars: 1 }, 8);
  assert.equal(getState(db).levels[1].bestScore, 100);
  assert.equal(getState(db).levels[1].stars, 2);
  assert.equal(getState(db).levels[1].cleared, true);

  saveLevel(db, { levelId: 2, score: 80, stars: 1 }, 8);
  assert.equal(getState(db).unlocked, 3);
  assert.deepEqual(saveLevel(db, { levelId: 1, score: -1, stars: 1 }, 8), { error: 'bad score' });
});

test('language is remembered only after it is chosen', () => {
  const db = tempDb();
  assert.equal(getState(db).lang, null);
  assert.equal(setLang(db, 'en').ok, true);
  assert.equal(getState(db).lang, 'en');
  assert.deepEqual(setLang(db, 'fr'), { error: 'bad lang' });
  assert.equal(getState(db).lang, 'en');
});
