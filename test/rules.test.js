import assert from 'node:assert/strict';
import test from 'node:test';
import { LEVELS } from '../public/js/levels.js';
import {
  COLS,
  ROWS,
  createBoard,
  findHint,
  findRuns,
  iceLeft,
  isGoalMet,
  makeCell,
  mulberry32,
  reshuffle,
  starCount,
  trySwap,
} from '../public/js/rules.js';

function grid(fill) {
  const board = [];
  for (let r = 0; r < ROWS; r += 1) {
    board[r] = [];
    for (let c = 0; c < COLS; c += 1) board[r][c] = fill(r, c);
  }
  return board;
}

function checker(r, c) {
  return makeCell((r + c) % 2 === 0 ? 2 : 4);
}

function rngOf(values) {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

function cycleRng(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

function specials(board, kind) {
  const found = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = board[r][c];
      if (cell?.special === kind) found.push({ r, c, cell });
    }
  }
  return found;
}

function cellById(board, id) {
  for (const row of board) {
    for (const cell of row) if (cell?.id === id) return cell;
  }
  return null;
}

test('new boards have no match and at least one move', () => {
  for (let seed = 1; seed <= 12; seed += 1) {
    const board = createBoard(mulberry32(seed), []);
    assert.equal(findRuns(board).length, 0);
    assert.ok(findHint(board));
  }
});

test('every level starts playable', () => {
  for (const level of LEVELS) {
    const board = createBoard(mulberry32(level.id * 17), level.ice);
    assert.equal(board.length, ROWS);
    assert.equal(findRuns(board).length, 0);
    assert.ok(findHint(board));
    assert.equal(iceLeft(board), level.ice.reduce((sum, cell) => sum + cell.hp, 0));
    for (const ice of level.ice) assert.ok(ice.r >= 0 && ice.c >= 0 && ice.r < ROWS && ice.c < COLS);
  }
});

test('a match of three scores the cleared gems and rejects a useless swap', () => {
  const board = grid((r, c) => checker(r, c));
  board[0][0] = makeCell(0);
  board[0][1] = makeCell(0);
  board[0][2] = makeCell(1);
  board[0][3] = makeCell(0);
  board[0][4] = makeCell(2);
  board[0][5] = makeCell(3);
  board[0][6] = makeCell(4);
  board[0][7] = makeCell(5);
  const missed = trySwap(board, { r: 0, c: 0 }, { r: 1, c: 0 }, rngOf([0.2]));
  assert.equal(missed.ok, false);
  assert.equal(missed.board[0][0].type, 0);

  const moved = trySwap(board, { r: 0, c: 2 }, { r: 0, c: 3 }, rngOf([0, 0.5, 0.99]));
  assert.equal(moved.ok, true);
  assert.equal(moved.score, 30);
  assert.equal(moved.collected[0], 3);
  assert.equal(findRuns(moved.board).length, 0);
});

test('ice blocks a match and nearby clears crack it', () => {
  const blocked = grid((r, c) => checker(r, c));
  blocked[0][0] = makeCell(0);
  blocked[0][1] = makeCell(0, null, 1);
  blocked[0][2] = makeCell(0);
  assert.equal(findRuns(blocked).length, 0);

  const board = grid((r, c) => checker(r, c));
  board[0][0] = makeCell(0);
  board[0][1] = makeCell(0);
  board[0][2] = makeCell(1);
  board[0][3] = makeCell(0);
  for (let c = 4; c < COLS; c += 1) board[0][c] = makeCell(c - 2);
  const near = makeCell(4, null, 1);
  const deep = makeCell(3, null, 2);
  const far = makeCell(5, null, 1);
  board[1][0] = near;
  board[1][1] = deep;
  board[0][7] = far;
  const moved = trySwap(board, { r: 0, c: 2 }, { r: 0, c: 3 }, rngOf([0.15, 0.55, 0.8]));
  assert.equal(moved.ok, true);
  assert.equal(cellById(moved.board, near.id).ice, 0);
  assert.equal(cellById(moved.board, deep.id).ice, 1);
  assert.equal(cellById(moved.board, far.id).ice, 1);
});

test('four in a row becomes a stripe, five becomes a color bomb, a T becomes wrapped', () => {
  const four = grid((r, c) => checker(r, c));
  [0, 0, 0, 1, 0, 2, 3, 4].forEach((type, c) => { four[0][c] = makeCell(type); });
  const striped = trySwap(four, { r: 0, c: 3 }, { r: 0, c: 4 }, rngOf([0.2, 0.5, 0.9]));
  assert.equal(striped.ok, true);
  assert.equal(specials(striped.frames[0].after, 'v').length, 1);

  const five = grid((r, c) => checker(r, c));
  [0, 0, 0, 0, 1, 0, 2, 3].forEach((type, c) => { five[0][c] = makeCell(type); });
  const bomb = trySwap(five, { r: 0, c: 4 }, { r: 0, c: 5 }, rngOf([0.2, 0.5, 0.7, 0.9]));
  assert.equal(bomb.ok, true);
  const colors = specials(bomb.frames[0].after, 'color');
  assert.equal(colors.length, 1);
  assert.equal(colors[0].cell.type, null);

  const tee = grid((r, c) => checker(r, c));
  tee[0][2] = makeCell(0);
  tee[1][0] = makeCell(0);
  tee[1][1] = makeCell(0);
  tee[1][2] = makeCell(1);
  tee[1][3] = makeCell(0);
  tee[2][2] = makeCell(0);
  const wrapped = trySwap(tee, { r: 1, c: 2 }, { r: 1, c: 3 }, rngOf([0.4, 0.4, 0.4, 0.4]));
  assert.equal(wrapped.ok, true);
  assert.equal(specials(wrapped.frames[0].after, 'wrap').length, 1);
});

test('a stripe blasts ice, and a color bomb clears its partner color', () => {
  const board = grid((r, c) => checker(r, c));
  board[0][0] = makeCell(0, 'v');
  board[0][1] = makeCell(0);
  board[0][2] = makeCell(1);
  board[0][3] = makeCell(0);
  for (let c = 4; c < COLS; c += 1) board[0][c] = makeCell((c % 2) + 2);
  const frozen = makeCell(4, null, 1);
  board[4][0] = frozen;
  const blasted = trySwap(board, { r: 0, c: 2 }, { r: 0, c: 3 }, cycleRng([0.05, 0.22, 0.4, 0.57, 0.74, 0.91]));
  assert.equal(blasted.ok, true);
  assert.equal(cellById(blasted.frames[0].after, frozen.id).ice, 0);

  const plain = grid((r, c) => checker(r, c));
  const bomb = makeCell(null, 'color');
  plain[0][0] = bomb;
  plain[0][1] = makeCell(0);
  plain[3][6] = makeCell(0);
  plain[5][2] = makeCell(0);
  plain[7][4] = makeCell(0);
  const cleared = trySwap(plain, { r: 0, c: 0 }, { r: 0, c: 1 }, rngOf(Array(12).fill(0.9)));
  assert.equal(cleared.ok, true);
  assert.equal(cleared.frames[0].collected[0], 4);
  assert.equal(cellById(cleared.frames[0].after, bomb.id), null);
});

test('reshuffle removes matches and leaves a move', () => {
  const board = grid(() => makeCell(0));
  const next = reshuffle(board, mulberry32(4));
  assert.equal(findRuns(next).length, 0);
  assert.ok(findHint(next));
});

test('stars follow the goal, then the score thresholds', () => {
  const level = {
    goal: { type: 'score', target: 100 },
    stars: [200, 300],
  };
  const base = { collected: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, iceLeft: 0 };
  assert.equal(starCount(level, { ...base, score: 40 }), 0);
  assert.equal(starCount(level, { ...base, score: 100 }), 1);
  assert.equal(starCount(level, { ...base, score: 200 }), 2);
  assert.equal(starCount(level, { ...base, score: 300 }), 3);
  assert.equal(isGoalMet({ type: 'collect', gem: 2, count: 4 }, { ...base, score: 0, collected: { ...base.collected, 2: 4 } }), true);
  assert.equal(isGoalMet({ type: 'ice' }, { ...base, score: 0, iceLeft: 1 }), false);
});

function mergedCollected(base, extra) {
  const next = { ...base };
  for (const key of Object.keys(next)) next[key] += extra[key] || 0;
  return next;
}

function bestMove(board, level, score, collected) {
  let best = null;
  let bestValue = -Infinity;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const neighbors = c + 1 < COLS ? [[{ r, c }, { r, c: c + 1 }]] : [];
      if (r + 1 < ROWS) neighbors.push([{ r, c }, { r: r + 1, c }]);
      for (const [a, b] of neighbors) {
        const preview = trySwap(board, a, b, mulberry32(1));
        if (!preview.ok) continue;
        const nextCollected = mergedCollected(collected, preview.collected);
        const nextScore = score + preview.score;
        const nextStats = { score: nextScore, collected: nextCollected, iceLeft: iceLeft(preview.board) };
        let value = preview.score;
        if (level.goal.type === 'ice') value = (iceLeft(board) - nextStats.iceLeft) * 5000 + preview.score;
        if (level.goal.type === 'collect') value = (preview.collected[level.goal.gem] || 0) * 5000 + preview.score;
        if (isGoalMet(level.goal, nextStats)) value += 1_000_000;
        if (value > bestValue) {
          bestValue = value;
          best = { a, b };
        }
      }
    }
  }
  return best;
}

function play(level, seed) {
  const rng = mulberry32(seed);
  let board = createBoard(rng, level.ice);
  let score = 0;
  let collected = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let moves = level.moves;
  let shuffles = 0;
  while (moves > 0 && shuffles < 8) {
    const stats = { score, collected, iceLeft: iceLeft(board) };
    if (isGoalMet(level.goal, stats)) return true;
    const move = bestMove(board, level, score, collected);
    if (!move) {
      board = reshuffle(board, rng);
      shuffles += 1;
      continue;
    }
    const result = trySwap(board, move.a, move.b, rng);
    if (!result.ok) return false;
    board = result.board;
    score += result.score;
    collected = mergedCollected(collected, result.collected);
    moves -= 1;
  }
  return isGoalMet(level.goal, { score, collected, iceLeft: iceLeft(board) });
}

test('score, collect, and ice levels are winnable', { timeout: 120_000 }, () => {
  for (const level of [LEVELS[0], LEVELS[3], LEVELS[5]]) {
    let wins = 0;
    for (let seed = 1; seed <= 4; seed += 1) if (play(level, seed * 19 + level.id)) wins += 1;
    assert.ok(wins >= 3, `${level.name.en} won ${wins}/4`);
  }
});
