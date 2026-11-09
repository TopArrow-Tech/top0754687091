export const ROWS = 8;
export const COLS = 8;
export const TYPES = 6;

let nextId = 1;
const BLOCKED = Object.freeze({ blocked: true });

function isBoardCell(cell) {
  return Boolean(cell && !cell.blocked);
}

export function makeCell(type, special = null, ice = 0) {
  return { id: nextId++, type, special, ice };
}

export function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell?.blocked ? BLOCKED : cell ? { ...cell } : null)));
}

export function inBounds(r, c) {
  return r >= 0 && c >= 0 && r < ROWS && c < COLS;
}

export function isAdjacent(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function emptyCollected() {
  return { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function addCollected(into, extra) {
  for (const key of Object.keys(into)) into[key] += extra[key] || 0;
}

function canMatch(cell) {
  return Boolean(isBoardCell(cell) && cell.type != null && cell.ice <= 0);
}

function keyOf(r, c) {
  return `${r},${c}`;
}

function parseKey(key) {
  const [r, c] = key.split(',').map(Number);
  return { r, c };
}

function pickType(rng, forbidden) {
  const options = [];
  for (let type = 0; type < TYPES; type += 1) {
    if (!forbidden.has(type)) options.push(type);
  }
  const index = Math.floor(rng() * options.length);
  return options[Math.max(0, Math.min(options.length - 1, index))];
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellsOfRun(dir, fixed, start, end) {
  const cells = [];
  for (let i = start; i < end; i += 1) {
    cells.push(dir === 'h' ? { r: fixed, c: i } : { r: i, c: fixed });
  }
  return cells;
}

export function findRuns(board) {
  const runs = [];
  for (let r = 0; r < ROWS; r += 1) {
    let c = 0;
    while (c < COLS) {
      const cell = board[r][c];
      if (!canMatch(cell)) {
        c += 1;
        continue;
      }
      let end = c + 1;
      while (end < COLS && canMatch(board[r][end]) && board[r][end].type === cell.type) end += 1;
      if (end - c >= 3) runs.push({ dir: 'h', type: cell.type, cells: cellsOfRun('h', r, c, end) });
      c = end;
    }
  }
  for (let c = 0; c < COLS; c += 1) {
    let r = 0;
    while (r < ROWS) {
      const cell = board[r][c];
      if (!canMatch(cell)) {
        r += 1;
        continue;
      }
      let end = r + 1;
      while (end < ROWS && canMatch(board[end][c]) && board[end][c].type === cell.type) end += 1;
      if (end - r >= 3) runs.push({ dir: 'v', type: cell.type, cells: cellsOfRun('v', c, r, end) });
      r = end;
    }
  }
  return runs;
}

function eachAdjacent(board, fn) {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (!isBoardCell(board[r][c])) continue;
      if (c + 1 < COLS && isBoardCell(board[r][c + 1])) fn({ r, c }, { r, c: c + 1 });
      if (r + 1 < ROWS && isBoardCell(board[r + 1][c])) fn({ r, c }, { r: r + 1, c });
    }
  }
}

function swapCells(board, a, b) {
  const next = cloneBoard(board);
  const tmp = next[a.r][a.c];
  next[a.r][a.c] = next[b.r][b.c];
  next[b.r][b.c] = tmp;
  return next;
}

function isUsefulSwap(board, a, b) {
  const left = board[a.r][a.c];
  const right = board[b.r][b.c];
  if (!isBoardCell(left) || !isBoardCell(right)) return false;
  if (left.special && right.special) return true;
  if (left.special === 'color' || right.special === 'color') return true;
  return findRuns(swapCells(board, a, b)).length > 0;
}

export function findHint(board) {
  let found = null;
  eachAdjacent(board, (a, b) => {
    if (!found && isUsefulSwap(board, a, b)) found = { a, b };
  });
  return found;
}

function pickAnchor(run, preferred) {
  for (const spot of preferred || []) {
    if (run.cells.some((cell) => cell.r === spot.r && cell.c === spot.c)) return spot;
  }
  return run.cells[Math.floor((run.cells.length - 1) / 2)];
}

function planSpawns(runs, preferred) {
  const spawns = new Map();
  const byCell = new Map();
  for (const run of runs) {
    for (const spot of run.cells) {
      const key = keyOf(spot.r, spot.c);
      if (!byCell.has(key)) byCell.set(key, []);
      byCell.get(key).push(run);
    }
  }
  for (const run of runs) {
    if (run.cells.length === 4) {
      const anchor = pickAnchor(run, preferred);
      spawns.set(keyOf(anchor.r, anchor.c), {
        type: run.type,
        special: run.dir === 'h' ? 'v' : 'h',
      });
    }
  }
  for (const [key, list] of byCell) {
    const horizontal = list.some((run) => run.dir === 'h');
    const vertical = list.some((run) => run.dir === 'v');
    const hasFive = list.some((run) => run.cells.length >= 5);
    if (horizontal && vertical && !hasFive) {
      spawns.set(key, { type: list[0].type, special: 'wrap' });
    }
  }
  for (const run of runs) {
    if (run.cells.length >= 5) {
      const anchor = pickAnchor(run, preferred);
      spawns.set(keyOf(anchor.r, anchor.c), { type: null, special: 'color' });
    }
  }
  return spawns;
}

function mostCommonType(board) {
  const counts = emptyCollected();
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = board[r][c];
      if (cell && cell.type != null) counts[cell.type] += 1;
    }
  }
  let best = null;
  let bestCount = 0;
  for (let type = 0; type < TYPES; type += 1) {
    if (counts[type] > bestCount) {
      best = type;
      bestCount = counts[type];
    }
  }
  return best;
}

function effectCells(board, r, c, special) {
  const spots = [];
  const push = (rr, cc) => {
    if (inBounds(rr, cc) && isBoardCell(board[rr][cc])) spots.push({ r: rr, c: cc });
  };
  if (special === 'h') {
    for (let cc = 0; cc < COLS; cc += 1) push(r, cc);
  } else if (special === 'v') {
    for (let rr = 0; rr < ROWS; rr += 1) push(rr, c);
  } else if (special === 'wrap') {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) push(r + dr, c + dc);
    }
  } else if (special === 'color') {
    const type = mostCommonType(board);
    if (type == null) return spots;
    for (let rr = 0; rr < ROWS; rr += 1) {
      for (let cc = 0; cc < COLS; cc += 1) {
        if (board[rr][cc] && board[rr][cc].type === type) spots.push({ r: rr, c: cc });
      }
    }
  }
  return spots;
}

function expandClears(board, initial, skipTrigger) {
  const cleared = new Set(initial);
  const queue = [...initial];
  const triggered = [];
  const seen = new Set();
  while (queue.length) {
    const key = queue.pop();
    if (seen.has(key) || skipTrigger.has(key)) continue;
    seen.add(key);
    const { r, c } = parseKey(key);
    const cell = board[r][c];
    if (!cell || !cell.special || cell.ice > 0) continue;
    triggered.push(cell.special);
    for (const spot of effectCells(board, r, c, cell.special)) {
      const nextKey = keyOf(spot.r, spot.c);
      if (!cleared.has(nextKey)) {
        cleared.add(nextKey);
        queue.push(nextKey);
      }
    }
  }
  return { cleared, triggered };
}

function splashIce(board, removedKeys, cleared) {
  const done = new Set();
  for (const key of removedKeys) {
    const { r, c } = parseKey(key);
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr;
      const cc = c + dc;
      const neighbor = keyOf(rr, cc);
      if (!inBounds(rr, cc) || done.has(neighbor) || cleared.has(neighbor)) continue;
      const cell = board[rr][cc];
      if (cell && cell.ice > 0) {
        cell.ice -= 1;
        done.add(neighbor);
      }
    }
  }
}

function applyClears(board, cleared, spawns) {
  const next = cloneBoard(board);
  const collected = emptyCollected();
  const removedKeys = [];
  let gems = 0;
  for (const key of cleared) {
    const { r, c } = parseKey(key);
    const cell = next[r][c];
    if (!isBoardCell(cell)) continue;
    if (cell.ice > 0) {
      cell.ice -= 1;
      continue;
    }
    if (cell.type != null) collected[cell.type] += 1;
    gems += 1;
    if (spawns && spawns.has(key)) {
      const spawn = spawns.get(key);
      cell.type = spawn.type;
      cell.special = spawn.special;
      cell.ice = 0;
    } else {
      next[r][c] = null;
      removedKeys.push(key);
    }
  }
  splashIce(next, removedKeys, cleared);
  return { board: next, collected, gems };
}

function applyGravity(board, rng) {
  for (let c = 0; c < COLS; c += 1) {
    let start = 0;
    while (start < ROWS) {
      while (start < ROWS && board[start][c]?.blocked) start += 1;
      if (start >= ROWS) break;
      let end = start;
      while (end + 1 < ROWS && !board[end + 1][c]?.blocked) end += 1;
      const stack = [];
      for (let r = end; r >= start; r -= 1) if (isBoardCell(board[r][c])) stack.push(board[r][c]);
      while (stack.length < end - start + 1) stack.push(makeCell(pickType(rng, new Set())));
      for (let r = end; r >= start; r -= 1) board[r][c] = stack[end - r];
      start = end + 1;
    }
  }
  return board;
}

function burst(board, clearSet, rng, skipTrigger, spawns, cascade) {
  const before = cloneBoard(board);
  const { cleared, triggered } = expandClears(board, clearSet, skipTrigger);
  const applied = applyClears(board, cleared, spawns);
  applyGravity(applied.board, rng);
  const scoreGained = applied.gems * 10 * cascade + triggered.length * 50 * cascade;
  return {
    before,
    after: applied.board,
    collected: applied.collected,
    scoreGained,
  };
}

function resolve(board, rng, preferred) {
  let current = board;
  let score = 0;
  const collected = emptyCollected();
  const frames = [];
  let cascade = 1;
  for (let guard = 0; guard < 40; guard += 1) {
    const runs = findRuns(current);
    if (!runs.length) break;
    const matched = [];
    for (const run of runs) {
      for (const spot of run.cells) matched.push(keyOf(spot.r, spot.c));
    }
    const frame = burst(current, matched, rng, new Set(), planSpawns(runs, preferred), cascade);
    preferred = null;
    addCollected(collected, frame.collected);
    score += frame.scoreGained;
    frames.push(frame);
    current = frame.after;
    cascade += 1;
  }
  return { board: current, score, collected, frames };
}

function cellsOfType(board, type) {
  const spots = [];
  if (type == null) return spots;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (board[r][c] && board[r][c].type === type) spots.push({ r, c });
    }
  }
  return spots;
}

function addLine(set, board, spot, horizontal) {
  if (horizontal) {
    for (let c = 0; c < COLS; c += 1) if (isBoardCell(board[spot.r][c])) set.add(keyOf(spot.r, c));
  } else {
    for (let r = 0; r < ROWS; r += 1) if (isBoardCell(board[r][spot.c])) set.add(keyOf(r, spot.c));
  }
}

function activateColor(board, a, b, rng) {
  const left = board[a.r][a.c];
  const right = board[b.r][b.c];
  const clear = new Set();
  const skip = new Set();
  const bombs = [];
  if (left.special === 'color') bombs.push(a);
  if (right.special === 'color') bombs.push(b);
  for (const bomb of bombs) skip.add(keyOf(bomb.r, bomb.c));

  if (bombs.length === 2) {
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) if (isBoardCell(board[r][c])) clear.add(keyOf(r, c));
    }
  } else {
    const other = left.special === 'color' ? right : left;
    if (other.special === 'h' || other.special === 'v') {
      let horizontal = other.special === 'h';
      for (const spot of cellsOfType(board, other.type)) {
        addLine(clear, board, spot, horizontal);
        horizontal = !horizontal;
      }
    } else if (other.special === 'wrap') {
      for (const spot of cellsOfType(board, other.type)) {
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            const rr = spot.r + dr;
            const cc = spot.c + dc;
            if (inBounds(rr, cc) && isBoardCell(board[rr][cc])) clear.add(keyOf(rr, cc));
          }
        }
      }
    } else {
      for (const spot of cellsOfType(board, other.type)) clear.add(keyOf(spot.r, spot.c));
    }
    clear.add(keyOf(a.r, a.c));
    clear.add(keyOf(b.r, b.c));
  }

  const first = burst(board, clear, rng, skip, null, 1);
  const rest = resolve(first.after, rng, null);
  const collected = emptyCollected();
  addCollected(collected, first.collected);
  addCollected(collected, rest.collected);
  return {
    board: rest.board,
    score: first.scoreGained + rest.score,
    collected,
    frames: [first, ...rest.frames],
    comboName: bombs.length === 2 ? 'rainbowRainbow' : `rainbow${(left.special === 'color' ? right : left).special || 'Candy'}`,
  };
}

function activatePair(board, a, b, rng) {
  const left = board[a.r][a.c];
  const right = board[b.r][b.c];
  const clear = new Set();
  const addSquare = (center, radius) => {
    for (let dr = -radius; dr <= radius; dr += 1) {
      for (let dc = -radius; dc <= radius; dc += 1) {
        const r = center.r + dr;
        const c = center.c + dc;
        if (inBounds(r, c) && isBoardCell(board[r][c])) clear.add(keyOf(r, c));
      }
    }
  };
  const addBand = (center, horizontal, radius) => {
    for (let offset = -radius; offset <= radius; offset += 1) {
      const row = center.r + (horizontal ? offset : 0);
      const col = center.c + (horizontal ? 0 : offset);
      if (!inBounds(row, col)) continue;
      for (let i = 0; i < (horizontal ? COLS : ROWS); i += 1) {
        const r = horizontal ? row : i;
        const c = horizontal ? i : col;
        if (isBoardCell(board[r][c])) clear.add(keyOf(r, c));
      }
    }
  };

  if (left.special === 'wrap' && right.special === 'wrap') {
    addSquare(a, 2);
    addSquare(b, 2);
  } else if ((left.special === 'wrap' && ['h', 'v'].includes(right.special))
    || (right.special === 'wrap' && ['h', 'v'].includes(left.special))) {
    addBand(a, true, 1); addBand(a, false, 1);
    addBand(b, true, 1); addBand(b, false, 1);
  } else if (['h', 'v'].includes(left.special) && ['h', 'v'].includes(right.special)) {
    addBand(a, true, 0); addBand(a, false, 0);
    addBand(b, true, 0); addBand(b, false, 0);
  } else {
    return null;
  }

  const first = burst(board, clear, rng, new Set(), null, 1);
  const rest = resolve(first.after, rng, null);
  const collected = emptyCollected();
  addCollected(collected, first.collected);
  addCollected(collected, rest.collected);
  const comboName = left.special === 'wrap' && right.special === 'wrap'
    ? 'wrapWrap'
    : left.special === 'wrap' || right.special === 'wrap' ? 'stripeWrap' : 'stripeStripe';
  return { board: rest.board, score: first.scoreGained + rest.score, collected, frames: [first, ...rest.frames], comboName };
}

export function trySwap(board, a, b, rng) {
  if (!isAdjacent(a, b)) return { ok: false, board };
  const left = board[a.r]?.[a.c];
  const right = board[b.r]?.[b.c];
  if (!isBoardCell(left) || !isBoardCell(right)) return { ok: false, board };
  const swapped = swapCells(board, a, b);
  const landedA = swapped[a.r][a.c];
  const landedB = swapped[b.r][b.c];
  if (landedA.special === 'color' || landedB.special === 'color') {
    return { ok: true, ...activateColor(swapped, a, b, rng) };
  }
  if (landedA.special && landedB.special) {
    const combo = activatePair(swapped, a, b, rng);
    if (combo) return { ok: true, ...combo };
  }
  if (!findRuns(swapped).length) return { ok: false, board };
  return { ok: true, ...resolve(swapped, rng, [b, a]) };
}

export function createBoard(rng, iceList = [], layout = null) {
  let last = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (layout && layout[r]?.[c] !== '#') {
          board[r][c] = BLOCKED;
          continue;
        }
        const forbidden = new Set();
        if (c >= 2 && canMatch(board[r][c - 1]) && canMatch(board[r][c - 2])
          && board[r][c - 1].type === board[r][c - 2].type) forbidden.add(board[r][c - 1].type);
        if (r >= 2 && canMatch(board[r - 1][c]) && canMatch(board[r - 2][c])
          && board[r - 1][c].type === board[r - 2][c].type) forbidden.add(board[r - 1][c].type);
        board[r][c] = makeCell(pickType(rng, forbidden));
      }
    }
    for (const ice of iceList) {
      if (inBounds(ice.r, ice.c) && isBoardCell(board[ice.r][ice.c])) board[ice.r][ice.c].ice = ice.hp;
    }
    last = board;
    if (findHint(board)) return board;
  }
  return last;
}

function iceListFrom(board) {
  const list = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = board[r][c];
      if (cell && cell.ice > 0) list.push({ r, c, hp: cell.ice });
    }
  }
  return list;
}

export function reshuffle(board, rng) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const next = cloneBoard(board);
    const pool = [];
    const spots = [];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const cell = next[r][c];
        if (!isBoardCell(cell) || cell.special === 'color') continue;
        pool.push(cell.type);
        spots.push(cell);
      }
    }
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    spots.forEach((cell, index) => {
      cell.type = pool[index];
    });
    if (!findRuns(next).length && findHint(next)) return next;
  }
  const layout = board.map((row) => row.map((cell) => (cell?.blocked ? '.' : '#')).join(''));
  return createBoard(rng, iceListFrom(board), layout);
}

export function iceLeft(board) {
  let total = 0;
  for (const row of board) {
    for (const cell of row) if (cell && cell.ice > 0) total += cell.ice;
  }
  return total;
}

export function isGoalMet(goal, stats) {
  if (goal.type === 'score') return stats.score >= goal.target;
  if (goal.type === 'collect') return (stats.collected[goal.gem] || 0) >= goal.count;
  if (goal.type === 'ice') return stats.iceLeft === 0;
  return false;
}

export function starCount(level, stats) {
  if (!isGoalMet(level.goal, stats)) return 0;
  let stars = 1;
  if (stats.score >= level.stars[0]) stars = 2;
  if (stats.score >= level.stars[1]) stars = 3;
  return stars;
}
