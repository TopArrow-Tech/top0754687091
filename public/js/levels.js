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

const MAPS = [
  ['########', '########', '########', '########', '########', '########', '########', '########'],
  ['..####..', '.######.', '########', '########', '########', '########', '.######.', '..####..'],
  ['########', '########', '########', '###..###', '###..###', '########', '########', '########'],
  ['....####', '...#####', '..######', '.#######', '########', '#######.', '######..', '#####...'],
  ['########', '########', '##....##', '########', '########', '########', '.######.', '..####..'],
  ['##..##..', '########', '.######.', '########', '########', '.######.', '########', '..##..##'],
  ['########', '########', '##....##', '##....##', '##....##', '##....##', '########', '########'],
  ['########', '########', '########', '.#######', '..######', '...#####', '....####', '....####'],
  ['....####', '....####', '...#####', '..######', '.#######', '########', '########', '########'],
  ['##....##', '########', '.######.', '########', '########', '.######.', '########', '##....##'],
  ['########', '#.######', '########', '########', '########', '########', '######.#', '########'],
  ['##..####', '###..###', '####..##', '########', '########', '##..####', '###..###', '####..##'],
  ['...##...', '.######.', '########', '########', '########', '########', '.######.', '...##...'],
  ['########', '########', '#.######', '##.#####', '###.####', '####.###', '########', '########'],
  ['########', '#.######', '##.#####', '###.####', '####.###', '#####.##', '######.#', '########'],
  ['########', '.######.', '..####..', '##....##', '##....##', '..####..', '.######.', '########'],
];

function ice(list, hp, layout) {
  return list
    .filter(([r, c]) => layout[r]?.[c] === '#')
    .map(([r, c]) => ({ r, c, hp }));
}

export const CHAPTERS = [
  {
    id: 1,
    title: { zh: '水果董事会集体翘班', en: 'The Fruit Board Walks Out' },
    blurb: { zh: '董事长是一颗葡萄，会议纪要全是果汁。', en: 'The chair is a grape. The minutes are juice.' },
    sticker: '🍒',
  },
  {
    id: 2,
    title: { zh: '冰箱里的冰块开会', en: 'The Fridge Ice Union' },
    blurb: { zh: '它们坚称自己不是障碍，只是比较冷静。', en: 'They insist they are not obstacles, just very chill.' },
    sticker: '🧊',
  },
  {
    id: 3,
    title: { zh: '重力今天请了病假', en: 'Gravity Called in Sick' },
    blurb: { zh: '糖果们自行决定往哪儿掉，场面逐渐失控。', en: 'The candies choose where to fall. It gets weird.' },
    sticker: '🌀',
  },
  {
    id: 4,
    title: { zh: '外星厨房夜班事故', en: 'The Space Kitchen Incident' },
    blurb: { zh: '宇宙冰箱里，有人把“重力”放错抽屉了。', en: 'Someone put gravity in the wrong drawer.' },
    sticker: '👽',
  },
];

const thin = rect(2, 2, 4, 5);
const finale = rect(1, 1, 5, 6);
const finaleCore = rect(2, 2, 4, 5);

export const LEVELS = [
  { id: 1, chapter: 1, layout: MAPS[0], name: { zh: '初识糖果', en: 'First Taste' }, quip: { zh: '三颗就能开派对，两颗先别发邀请函。', en: 'Three make a party. Two need not send invites.' }, moves: 25, goal: { type: 'score', target: 700 }, stars: [1400, 2200], ice: [] },
  { id: 2, chapter: 1, layout: MAPS[1], name: { zh: '越消越甜', en: 'Sweeter Still' }, quip: { zh: '棋盘剪了圆角，脾气还是方的。', en: 'The board got round corners. Its mood did not.' }, moves: 22, goal: { type: 'score', target: 1100 }, stars: [2000, 3000], ice: [] },
  { id: 3, chapter: 1, layout: MAPS[2], name: { zh: '大丰收', en: 'Big Haul' }, quip: { zh: '正中间的洞说它只是想透透气。', en: 'The middle hole says it just needs fresh air.' }, moves: 20, goal: { type: 'score', target: 1500 }, stars: [2600, 3800], ice: [] },
  { id: 4, chapter: 1, layout: MAPS[3], name: { zh: '樱桃派对', en: 'Cherry Party' }, quip: { zh: '樱桃们正在向棋盘右下角搬家。', en: 'The cherries are moving to the southeast.' }, moves: 24, goal: { type: 'collect', gem: 0, count: 16 }, stars: [1200, 2200], ice: [] },
  { id: 5, chapter: 2, layout: MAPS[4], name: { zh: '橘子雨', en: 'Orange Rain' }, quip: { zh: '这不是下雨，是橘子在找出口。', en: 'Not rain. The oranges are looking for an exit.' }, moves: 24, goal: { type: 'collect', gem: 4, count: 16 }, stars: [1400, 2400], ice: [] },
  { id: 6, chapter: 2, layout: MAPS[5], name: { zh: '薄冰', en: 'Thin Ice' }, quip: { zh: '冰面很薄，蓝莓还穿着溜冰鞋。', en: 'Thin ice. The blueberries brought skates.' }, moves: 24, goal: { type: 'ice' }, stars: [1000, 2000], ice: ice(thin, 1, MAPS[5]) },
  { id: 7, chapter: 2, layout: MAPS[6], name: { zh: '厚冰', en: 'Thick Ice' }, quip: { zh: '冰块在开会，议题是“谁都别动”。', en: 'The ice is meeting about nobody moving.' }, moves: 26, goal: { type: 'ice' }, stars: [1400, 2600], ice: ice(except(rect(2, 1, 5, 1).concat(rect(2, 6, 5, 6)), [[3, 1], [4, 1], [3, 6], [4, 6]]), 1, MAPS[6]).concat(ice([[3, 1], [4, 1], [3, 6], [4, 6]], 2, MAPS[6])) },
  { id: 8, chapter: 2, layout: MAPS[7], name: { zh: '冰雪终章', en: 'Last Frost' }, quip: { zh: '请沿着斜坡下滑，冰块不负责刹车。', en: 'Slide down the slope. Ice does not do brakes.' }, moves: 28, goal: { type: 'ice' }, stars: [1800, 3200], ice: ice(except(finale, finaleCore), 1, MAPS[7]).concat(ice(finaleCore, 2, MAPS[7])) },
  { id: 9, chapter: 3, layout: MAPS[8], name: { zh: '冰封果园', en: 'Frozen Orchard' }, quip: { zh: '果园只在右上方营业，左边请自助。', en: 'The orchard is open top-right. DIY elsewhere.' }, moves: 25, goal: { type: 'collect', gem: 2, count: 20 }, stars: [1800, 2800], ice: ice(rect(1, 4, 2, 6), 1, MAPS[8]) },
  { id: 10, chapter: 3, layout: MAPS[9], name: { zh: '彩虹冲刺', en: 'Rainbow Rush' }, quip: { zh: '中间空一块？它去买彩虹了。', en: 'The middle gap went out to buy a rainbow.' }, moves: 20, goal: { type: 'score', target: 1800 }, stars: [2800, 3900], ice: [] },
  { id: 11, chapter: 3, layout: MAPS[10], name: { zh: '莓果篮', en: 'Berry Basket' }, quip: { zh: '左上角和右下角正在玩躲猫猫。', en: 'Top-left and bottom-right are playing hide-and-seek.' }, moves: 24, goal: { type: 'collect', gem: 5, count: 24 }, stars: [2000, 3200], ice: [] },
  { id: 12, chapter: 3, layout: MAPS[11], name: { zh: '碎冰小径', en: 'Crack the Ice' }, quip: { zh: '这条路会拐弯，但它坚决不承认。', en: 'The path turns. It refuses to admit it.' }, moves: 26, goal: { type: 'ice' }, stars: [1800, 2900], ice: ice(except(rect(1, 1, 6, 6), rect(2, 2, 5, 5)), 1, MAPS[11]) },
  { id: 13, chapter: 4, layout: MAPS[12], name: { zh: '水果嘉年华', en: 'Fruit Festival' }, quip: { zh: '中央舞台空着，主持人还没匹配出来。', en: 'The host is still waiting for a match.' }, moves: 28, goal: { type: 'collect', gem: 0, count: 28 }, stars: [2400, 3600], ice: [] },
  { id: 14, chapter: 4, layout: MAPS[13], name: { zh: '冰晶迷阵', en: 'Crystal Maze' }, quip: { zh: '斜着走也行，反正冰块不看地图。', en: 'Go diagonally. The ice cannot read maps.' }, moves: 28, goal: { type: 'ice' }, stars: [2200, 3400], ice: ice(except(rect(0, 2, 7, 5), rect(1, 3, 6, 4)), 1, MAPS[13]) },
  { id: 15, chapter: 4, layout: MAPS[14], name: { zh: '甜蜜收官', en: 'Sweet Finale' }, quip: { zh: '棋盘在左右摇摆，它说自己没喝果汁。', en: 'The board wobbles. It blames the juice.' }, moves: 24, goal: { type: 'score', target: 2300 }, stars: [3400, 4700], ice: [] },
  { id: 16, chapter: 4, layout: MAPS[15], name: { zh: '星光盛宴', en: 'Starlight Feast' }, quip: { zh: '宇宙冰箱停电了，请用糖果照明。', en: 'The space fridge lost power. Bring candy.' }, moves: 30, goal: { type: 'collect', gem: 4, count: 32 }, stars: [2800, 4200], ice: ice(except(rect(2, 1, 5, 6), rect(3, 2, 4, 5)), 1, MAPS[15]) },
];

export function playableCells(level) {
  return level.layout.reduce((sum, row) => sum + [...row].filter((cell) => cell === '#').length, 0);
}

export function iceLayers(level) {
  return level.ice.reduce((sum, cell) => sum + cell.hp, 0);
}

export function difficultyIndex(level) {
  const missing = 64 - playableCells(level);
  const moves = Math.max(1, level.moves);
  let targetPressure = 0;
  if (level.goal.type === 'score') targetPressure = level.goal.target / (moves * 40);
  if (level.goal.type === 'collect') targetPressure = level.goal.count / (moves * 2.4);
  if (level.goal.type === 'ice') targetPressure = iceLayers(level) / (moves * 0.75);
  const value = 1
    + Math.max(0, (30 - level.moves) / 10)
    + missing / 24
    + iceLayers(level) / 12
    + targetPressure;
  return Math.round(Math.min(5, value) * 10) / 10;
}
