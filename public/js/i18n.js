const STRINGS = {
  title: { zh: '消消乐', en: 'Match 3' },
  tagline: {
    zh: '交换相邻糖果，连成三个或更多。',
    en: 'Swap neighboring candies to line up three or more.',
  },
  start: { zh: '开始', en: 'Play' },
  levels: { zh: '选关', en: 'Levels' },
  back: { zh: '返回', en: 'Back' },
  score: { zh: '分数', en: 'Score' },
  moves: { zh: '步数', en: 'Moves' },
  goal: { zh: '目标', en: 'Goal' },
  hint: { zh: '提示', en: 'Hint' },
  winTitle: { zh: '过关了', en: 'Level clear' },
  loseTitle: { zh: '步数用完了', en: 'Out of moves' },
  retry: { zh: '再试一次', en: 'Retry' },
  next: { zh: '下一关', en: 'Next' },
  menu: { zh: '回首页', en: 'Home' },
  reshuffled: { zh: '没有可走的步，棋盘已重排。', en: 'No moves left, so the board was shuffled.' },
  locked: { zh: '未解锁', en: 'Locked' },
  best: { zh: '最高', en: 'Best' },
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
