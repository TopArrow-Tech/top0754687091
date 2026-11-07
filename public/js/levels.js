function ice(list, hp) {
  return list.map(([r, c]) => ({ r, c, hp }));
}

function rect(r0, c0, r1, c1) {
  const cells = [];
  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) cells.push([r, c]);
  }
  return cells;
}

function except(cells, skip) {
  const ban = new Set(skip.map(([r, c]) => `${r},${c}`));
  return cells.filter(([r, c]) => !ban.has(`${r},${c}`));
}

const thin = rect(2, 2, 4, 5);
const thick = rect(2, 2, 5, 5);
const thickCore = rect(3, 3, 4, 4);
const finale = rect(1, 1, 5, 5);
const finaleCore = rect(2, 2, 4, 4);

export const LEVELS = [
  {
    id: 1,
    name: { zh: '初识糖果', en: 'First Taste' },
    moves: 25,
    goal: { type: 'score', target: 700 },
    stars: [1400, 2200],
    ice: [],
  },
  {
    id: 2,
    name: { zh: '越消越甜', en: 'Sweeter Still' },
    moves: 22,
    goal: { type: 'score', target: 1100 },
    stars: [2000, 3000],
    ice: [],
  },
  {
    id: 3,
    name: { zh: '大丰收', en: 'Big Haul' },
    moves: 20,
    goal: { type: 'score', target: 1500 },
    stars: [2600, 3800],
    ice: [],
  },
  {
    id: 4,
    name: { zh: '樱桃派对', en: 'Cherry Party' },
    moves: 24,
    goal: { type: 'collect', gem: 0, count: 16 },
    stars: [1200, 2200],
    ice: [],
  },
  {
    id: 5,
    name: { zh: '橘子雨', en: 'Orange Rain' },
    moves: 24,
    goal: { type: 'collect', gem: 4, count: 16 },
    stars: [1400, 2400],
    ice: [],
  },
  {
    id: 6,
    name: { zh: '薄冰', en: 'Thin Ice' },
    moves: 24,
    goal: { type: 'ice' },
    stars: [1000, 2000],
    ice: ice(thin, 1),
  },
  {
    id: 7,
    name: { zh: '厚冰', en: 'Thick Ice' },
    moves: 26,
    goal: { type: 'ice' },
    stars: [1400, 2600],
    ice: ice(except(thick, thickCore), 1).concat(ice(thickCore, 2)),
  },
  {
    id: 8,
    name: { zh: '冰雪终章', en: 'Last Frost' },
    moves: 28,
    goal: { type: 'ice' },
    stars: [1800, 3200],
    ice: ice(except(finale, finaleCore), 1).concat(ice(finaleCore, 2)),
  },
];
