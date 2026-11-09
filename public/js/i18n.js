const STRINGS = {
  title: { zh: '消消乐', en: 'Match 3' },
  tagline: {
    zh: '滑动或点选相邻糖果，连成三个或更多。四连生成条纹，转角连消生成包装糖，五连召唤彩虹糖。',
    en: 'Swipe or tap neighboring candies to match three or more. Make four for a stripe, a corner for a wrapped candy, or five for a rainbow.',
  },
  start: { zh: '开始', en: 'Play' },
  levels: { zh: '选关', en: 'Levels' },
  levelsCaption: { zh: '16 张歪地图，水果们拒绝走直线。', en: '16 wonky maps. The fruit refuses to go straight.' },
  rulesButton: { zh: '怎么算分？', en: 'How scoring works' },
  rulesShort: { zh: '规则', en: 'Rules' },
  levelMoves: { zh: '{n} 步', en: '{n} moves' },
  levelPressure: { zh: '难度系数 {n}/5', en: 'Difficulty {n}/5' },
  scoreStars: { zh: '2★ {a} · 3★ {b}', en: '2★ {a} · 3★ {b}' },
  levelGoalScore: { zh: '攒到 {n} 分', en: 'Score {n} points' },
  levelGoalCollect: { zh: '收集{gem} × {n}', en: 'Collect {gem} × {n}' },
  levelGoalIce: { zh: '敲碎 {n} 层冰', en: 'Crack {n} ice layers' },
  rulesTitle: { zh: '糖果法庭 · 计分现场', en: 'The Candy Court · Scoring' },
  rulesIntro: { zh: '看动画就懂：分数怎么蹦出来，星星怎么发。', en: 'Watch the score pop, then see how stars are earned.' },
  rulesThree: { zh: '普通糖每颗 10 分，三连就是 30 分。', en: 'Each regular candy is 10 points. Three make 30.' },
  rulesCascade: { zh: '下一波连锁按 ×2 算；再连下去继续加倍。', en: 'The next cascade scores ×2. Keep cascading to multiply again.' },
  rulesFour: { zh: '四连得 40 分，还会留下条纹糖；触发特效另加 50 分。', en: 'Four make 40 points and leave a stripe. Triggering a special adds 50.' },
  rulesStars: { zh: '先完成本关目标得 1 星；达到卡片上的 2 星、3 星分数线再升星。', en: 'Finish the goal for 1 star. Reach the card’s 2-star and 3-star scores for more.' },
  rulesPressure: { zh: '压力指数 1–5：步数越少、地图缺口越多、冰层越厚、目标越重，数字越高。它只帮你挑关，不会偷偷改分。', en: 'Pressure is 1–5: fewer moves, more gaps, thicker ice, and heavier goals raise it. It helps compare levels; it never changes your score.' },
  rulesFormula: { zh: '给爱算账的人：1 + max(0,(30−步数)/10) + 缺格数/24 + 冰层数/12 + 目标负担，最高 5。目标负担=分数/(步数×40)、收集数/(步数×2.4) 或冰层数/(步数×0.75)。', en: 'For number lovers: 1 + max(0,(30−moves)/10) + gaps/24 + ice layers/12 + goal load, capped at 5. Goal load is score/(moves×40), collect count/(moves×2.4), or ice layers/(moves×0.75).' },
  rulesFormulaLabel: { zh: '给大人看的小算盘', en: 'Show the tiny math' },
  rulesClose: { zh: '知道啦，开消！', en: 'Got it. Let’s crush!' },
  voidMove: { zh: '那边是糖果黑洞，换个邻居试试！', en: 'Candy black hole! Try a different neighbor.' },
  daily: { zh: '每日挑战', en: 'Daily Challenge' },
  dailyTag: { zh: '每日一局 · 本机记录', en: 'One daily puzzle · local best' },
  guide: { zh: '玩法指南', en: 'How to Play' },
  guideTitle: { zh: '三消小指南', en: 'Match 3 Guide' },
  guideWatch: { zh: '看糖果动起来，跟着试一次！', en: 'Watch the candies move, then try it yourself!' },
  guideMatch: { zh: '滑动相邻糖果，连成三个就会消除。', en: 'Swipe a neighbor. Match three to clear them.' },
  guideSpecial: { zh: '四个连成一排，会变成条纹糖！', en: 'Match four in a row to make a stripe candy!' },
  demoScore: { zh: '+30', en: '+30' },
  guideClose: { zh: '开始玩', en: 'Let’s Play' },
  comboStripeStripe: { zh: '双条纹：横竖交叉清屏！', en: 'Stripe combo: cross-shaped blast!' },
  comboStripeWrap: { zh: '条纹包装组合：三行三列爆破！', en: 'Stripe + wrap: three rows and columns blasted!' },
  comboWrapWrap: { zh: '双包装：超大范围爆破！', en: 'Double wrap: huge area blast!' },
  comboRainbowRainbow: { zh: '双彩虹：清空整个棋盘！', en: 'Double rainbow: clear the whole board!' },
  comboRainbowh: { zh: '彩虹条纹：同色糖变成条纹！', en: 'Rainbow stripe: candies of that color become stripes!' },
  comboRainbowv: { zh: '彩虹条纹：同色糖变成条纹！', en: 'Rainbow stripe: candies of that color become stripes!' },
  comboRainbowwrap: { zh: '彩虹包装：同色糖触发范围爆破！', en: 'Rainbow wrap: blast around every candy of that color!' },
  comboRainbowCandy: { zh: '彩虹糖：清除同色糖果！', en: 'Rainbow candy: clear candies of one color!' },
  back: { zh: '返回', en: 'Back' },
  score: { zh: '分数', en: 'Score' },
  moves: { zh: '步数', en: 'Moves' },
  goal: { zh: '目标', en: 'Goal' },
  hint: { zh: '提示', en: 'Hint' },
  hintSwap: { zh: '交换两颗高亮糖果试试看', en: 'Try swapping the two highlighted candies' },
  winTitle: { zh: '过关了', en: 'Level clear' },
  loseTitle: { zh: '步数用完了', en: 'Out of moves' },
  retry: { zh: '再试一次', en: 'Retry' },
  next: { zh: '下一关', en: 'Next' },
  menu: { zh: '回首页', en: 'Home' },
  reshuffled: { zh: '没有可走的步，棋盘已重排。', en: 'No moves left, so the board was shuffled.' },
  locked: { zh: '未解锁', en: 'Locked' },
  best: { zh: '最高', en: 'Best' },
  invalidMove: { zh: '这步没有形成消除，再试一个相邻糖果吧。', en: 'No match there. Try swapping with another neighbor.' },
  chapter: { zh: '第 {n} 章', en: 'Chapter {n}' },
  level: { zh: '第 {n} 关', en: 'Level {n}' },
  muteOn: { zh: '音效：开', en: 'Sound: On' },
  muteOff: { zh: '音效：关', en: 'Sound: Off' },
};

const GEMS = [
  { zh: '樱桃', en: 'cherry' },
  { zh: '柠檬', en: 'lemon' },
  { zh: '葡萄', en: 'grape' },
  { zh: '苹果', en: 'apple' },
  { zh: '橙子', en: 'orange' },
  { zh: '蓝莓', en: 'blueberry' },
];

const SPECIALS = {
  h: { zh: '横条纹', en: 'row stripe' },
  v: { zh: '竖条纹', en: 'column stripe' },
  wrap: { zh: '包装', en: 'wrapped' },
  color: { zh: '彩虹', en: 'rainbow' },
};

let lang = 'zh';

export function getLang() {
  return lang;
}

export function setLang(next) {
  lang = next === 'en' ? 'en' : 'zh';
  return lang;
}

export function t(key) {
  return STRINGS[key][lang];
}

export function levelTitle(level) {
  return `${t('level').replace('{n}', String(level.id))} · ${level.name[lang]}`;
}

export function gemName(type) {
  if (type == null || !GEMS[type]) return lang === 'zh' ? '彩虹糖' : 'rainbow candy';
  return GEMS[type][lang];
}

export function gemLabel(cell) {
  const name = gemName(cell.type);
  const extra = [];
  if (cell.special && SPECIALS[cell.special]) extra.push(SPECIALS[cell.special][lang]);
  if (cell.ice > 0) extra.push(lang === 'zh' ? `${cell.ice} 层冰` : `${cell.ice} ice`);
  return extra.length ? `${name}, ${extra.join(', ')}` : name;
}

export function goalText(goal, stats) {
  if (goal.type === 'score') {
    return lang === 'zh' ? `达到 ${stats.score} / ${goal.target} 分` : `Reach ${stats.score} / ${goal.target}`;
  }
  if (goal.type === 'collect') {
    const name = gemName(goal.gem);
    const have = stats.collected[goal.gem] || 0;
    return lang === 'zh' ? `收集${name} ${have} / ${goal.count}` : `Collect ${name} ${have} / ${goal.count}`;
  }
  return lang === 'zh' ? `剩余冰块 ${stats.iceLeft}` : `Ice left ${stats.iceLeft}`;
}
