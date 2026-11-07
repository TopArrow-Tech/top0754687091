import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'xiaoxiaole.sqlite'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS level_progress (
      level_id INTEGER PRIMARY KEY,
      best_score INTEGER NOT NULL DEFAULT 0,
      stars INTEGER NOT NULL DEFAULT 0,
      cleared INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

function getMeta(db, key) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setMeta(db, key, value) {
  db.prepare(`
    INSERT INTO meta (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

export function getState(db) {
  const lang = getMeta(db, 'lang');
  const unlocked = Number(getMeta(db, 'unlocked') || '1');
  const rows = db.prepare('SELECT level_id, best_score, stars, cleared FROM level_progress').all();
  const levels = {};
  for (const row of rows) {
    levels[row.level_id] = {
      bestScore: row.best_score,
      stars: row.stars,
      cleared: row.cleared === 1,
    };
  }
  return {
    lang: lang === 'zh' || lang === 'en' ? lang : null,
    unlocked: Number.isInteger(unlocked) && unlocked > 0 ? unlocked : 1,
    levels,
  };
}

export function setLang(db, lang) {
  if (lang !== 'zh' && lang !== 'en') return { error: 'bad lang' };
  setMeta(db, 'lang', lang);
  return { ok: true };
}

export function saveLevel(db, body, maxLevel) {
  const levelId = Number(body.levelId);
  const score = Number(body.score);
  const stars = Number(body.stars);
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > maxLevel) return { error: 'bad level' };
  if (!Number.isInteger(score) || score < 0 || score > 1_000_000) return { error: 'bad score' };
  if (!Number.isInteger(stars) || stars < 1 || stars > 3) return { error: 'bad stars' };
  const unlocked = Number(getMeta(db, 'unlocked') || '1');
  if (levelId > unlocked) return { error: 'locked' };

  const prev = db.prepare('SELECT best_score, stars FROM level_progress WHERE level_id = ?').get(levelId);
  const bestScore = Math.max(prev?.best_score ?? 0, score);
  const bestStars = Math.max(prev?.stars ?? 0, stars);
  db.prepare(`
    INSERT INTO level_progress (level_id, best_score, stars, cleared, updated_at)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(level_id) DO UPDATE SET
      best_score = excluded.best_score,
      stars = excluded.stars,
      cleared = 1,
      updated_at = excluded.updated_at
  `).run(levelId, bestScore, bestStars, new Date().toISOString());

  if (levelId === unlocked && levelId < maxLevel) setMeta(db, 'unlocked', String(levelId + 1));
  return { ok: true };
}
