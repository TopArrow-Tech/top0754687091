import {
  ensure as unlockAudio,
  isMuted,
  playFail,
  playHint,
  playIce,
  playLose,
  playMatch,
  playSelect,
  playShuffle,
  playSpecial,
  playSwap,
  playWin,
  toggleMuted,
} from './audio.js';
import { gemLabel, gemName, getLang, goalText, levelTitle, setLang, t } from './i18n.js';
import { CHAPTERS, difficultyIndex, LEVELS } from './levels.js';
import {
  createBoard,
  findHint,
  iceLeft,
  inBounds,
  isAdjacent,
  isGoalMet,
  mulberry32,
  reshuffle,
  starCount,
  trySwap,
} from './rules.js';
import {
  animateSwap,
  animateUnswap,
  bindBoardLayout,
  clearHint,
  floatScore,
  highlight,
  markPops,
  mountGems,
  renderBoard,
  renderSlots,
  setSelected,
  showToast,
} from './view.js';

const app = document.querySelector('#app');
let progress = { lang: null, unlocked: 1, levels: {} };
let screen = 'home';
let session = null;

function wait(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

function muteLabel() {
  return isMuted() ? t('muteOff') : t('muteOn');
}

function starsText(count) {
  return `${'★'.repeat(count)}${'☆'.repeat(3 - count)}`;
}

function levelGoalLine(level) {
  if (level.goal.type === 'score') return t('levelGoalScore').replace('{n}', String(level.goal.target));
  if (level.goal.type === 'collect') {
    return t('levelGoalCollect').replace('{gem}', gemName(level.goal.gem)).replace('{n}', String(level.goal.count));
  }
  return t('levelGoalIce').replace('{n}', String(level.ice.reduce((sum, cell) => sum + cell.hp, 0)));
}

function miniMap(level) {
  const frozen = new Set(level.ice.map((cell) => `${cell.r},${cell.c}`));
  let html = '';
  for (let r = 0; r < level.layout.length; r += 1) {
    for (let c = 0; c < level.layout[r].length; c += 1) {
      const open = level.layout[r][c] === '#';
      const classes = [open ? 'land' : 'void'];
      if (frozen.has(`${r},${c}`)) classes.push('frozen');
      html += `<i class="${classes.join(' ')}"></i>`;
    }
  }
  return `<span class="mini-map" aria-hidden="true">${html}</span>`;
}

function goalRatio(level, stats) {
  if (level.goal.type === 'score') return Math.min(1, stats.score / level.goal.target);
  if (level.goal.type === 'collect') return Math.min(1, (stats.collected[level.goal.gem] || 0) / level.goal.count);
  const total = level.ice.reduce((sum, cell) => sum + cell.hp, 0);
  if (!total) return 1;
  return Math.min(1, 1 - stats.iceLeft / total);
}

function currentStats() {
  return {
    score: session.score,
    collected: session.collected,
    iceLeft: iceLeft(session.board),
  };
}

function paintLang() {
  document.documentElement.lang = getLang() === 'zh' ? 'zh-CN' : 'en';
  document.title = t('title');
  for (const node of app.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const button of app.querySelectorAll('[data-lang]')) {
    button.classList.toggle('on', button.dataset.lang === getLang());
    button.setAttribute('aria-pressed', button.dataset.lang === getLang() ? 'true' : 'false');
  }
  for (const button of app.querySelectorAll('[data-action="mute"]')) {
    button.textContent = muteLabel();
    button.setAttribute('aria-pressed', isMuted() ? 'true' : 'false');
  }
}

function updateHud() {
  if (!session) return;
  const stats = currentStats();
  const score = app.querySelector('[data-field="score"]');
  const moves = app.querySelector('[data-field="moves"]');
  const goal = app.querySelector('[data-field="goal"]');
  const bar = app.querySelector('.bar > span');
  const hint = app.querySelector('[data-action="hint"]');
  const title = app.querySelector('[data-field="title"]');
  const quip = app.querySelector('[data-field="quip"]');
  const starNote = app.querySelector('[data-field="stars-note"]');
  if (score) score.textContent = String(session.score);
  if (moves) {
    moves.textContent = String(session.movesLeft);
    moves.classList.toggle('low', session.movesLeft <= 5);
  }
  if (goal) goal.textContent = goalText(session.level.goal, stats);
  if (bar) bar.style.width = `${goalRatio(session.level, stats) * 100}%`;
  if (hint) hint.textContent = `${t('hint')} (${session.hintsLeft})`;
  if (title) title.textContent = session.challenge ? `${t('daily')} · ${session.level.goal.target}` : levelTitle(session.level);
  if (quip) quip.textContent = session.level.quip?.[getLang()] || '';
  if (starNote) {
    starNote.textContent = t('scoreStars')
      .replace('{a}', String(session.level.stars[0]))
      .replace('{b}', String(session.level.stars[1]));
  }
  for (const gem of app.querySelectorAll('.gem')) {
    const cell = session.board[Number(gem.dataset.r)]?.[Number(gem.dataset.c)];
    if (cell) gem.setAttribute('aria-label', gemLabel(cell));
  }
  const modal = app.querySelector('.modal');
  if (modal && !modal.hidden) fillModal();
}

function fillModal() {
  const won = session.phase === 'won';
  const stats = currentStats();
  const stars = won ? starCount(session.level, stats) : 0;
  app.querySelector('.modal-title').textContent = won ? t('winTitle') : t('loseTitle');
  app.querySelector('.modal-stars').textContent = starsText(stars);
  const best = session.challenge ? ` · ${t('best')} ${session.dailyBest || 0}` : '';
  app.querySelector('.modal-score').textContent = `${t('score')} ${session.score}${best}`;
  const next = app.querySelector('[data-action="next"]');
  if (next) next.hidden = !(won && !session.challenge && session.level.id < LEVELS.length);
}

function langSwitch() {
  const on = getLang();
  return `<div class="lang" role="group" aria-label="language">
    <button type="button" data-action="lang" data-lang="zh" class="${on === 'zh' ? 'on' : ''}">中文</button>
    <button type="button" data-action="lang" data-lang="en" class="${on === 'en' ? 'on' : ''}">EN</button>
  </div>`;
}

function muteButton() {
  return `<button type="button" class="mute" data-action="mute" aria-pressed="${isMuted() ? 'true' : 'false'}">${muteLabel()}</button>`;
}

function showHome() {
  screen = 'home';
  session = null;
  app.innerHTML = `<main class="shell">
    <section class="panel home-panel">
      <header class="top">${langSwitch()}${muteButton()}</header>
      <div class="hero">
        <p class="eyebrow">16 ${getLang() === 'zh' ? '关 · 4 章' : 'levels · 4 chapters'}</p>
        <h1 data-i18n="title"></h1>
        <p class="lede" data-i18n="tagline"></p>
        <div class="preview" aria-hidden="true">
          <img src="assets/cherry.svg" alt="">
          <img src="assets/lemon.svg" alt="">
          <img src="assets/grape.svg" alt="">
          <img src="assets/apple.svg" alt="">
          <img src="assets/orange.svg" alt="">
          <img src="assets/blueberry.svg" alt="">
        </div>
        <div class="hero-actions">
          <button type="button" class="primary" data-action="start" data-i18n="start"></button>
          <button type="button" class="ghost" data-action="levels" data-i18n="levels"></button>
          <button type="button" class="ghost" data-action="daily" data-i18n="daily"></button>
        </div>
        <p class="daily-tag" data-i18n="dailyTag"></p>
        <button type="button" class="texty" data-action="guide" data-i18n="guide"></button>
      </div>
    </section>
  </main>`;
  paintLang();
  try {
    if (localStorage.getItem('xiaoxiaole-guide-seen') !== '1') showGuide();
  } catch { /* Browser storage may be unavailable. */ }
}

function showGuide() {
  if (app.querySelector('.guide-modal')) return;
  app.insertAdjacentHTML('beforeend', `<div class="guide-modal">
    <section class="dialog guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <h2 id="guide-title" data-i18n="guideTitle"></h2>
      <p class="guide-lede" data-i18n="guideWatch"></p>
      <div class="guide-scenes">
        <section class="guide-scene">
          <div class="demo-board" aria-hidden="true">
            <span class="demo-tile"><img src="assets/orange.svg" alt=""></span>
            <span class="demo-tile"><img src="assets/grape.svg" alt=""></span>
            <span class="demo-tile"><img src="assets/lemon.svg" alt=""></span>
            <span class="demo-tile demo-cherry-move"><img src="assets/cherry.svg" alt=""></span>
            <span class="demo-tile"><img src="assets/orange.svg" alt=""></span>
            <span class="demo-tile"><img src="assets/grape.svg" alt=""></span>
            <span class="demo-tile demo-blueberry-move"><img src="assets/blueberry.svg" alt=""></span>
            <span class="demo-tile demo-match"><img src="assets/cherry.svg" alt=""></span>
            <span class="demo-tile demo-match"><img src="assets/cherry.svg" alt=""></span>
            <span class="demo-hand" aria-hidden="true">👆</span>
            <span class="demo-score" data-i18n="demoScore"></span>
          </div>
          <p data-i18n="guideMatch"></p>
        </section>
        <section class="guide-scene special-scene">
          <div class="demo-four" aria-hidden="true">
            <img src="assets/cherry.svg" alt="">
            <img src="assets/cherry.svg" alt="">
            <img src="assets/cherry.svg" alt="">
            <span class="demo-stripe"><img src="assets/cherry.svg" alt=""><b>✦</b></span>
            <span class="demo-ray"></span>
          </div>
          <p data-i18n="guideSpecial"></p>
        </section>
      </div>
      <button type="button" class="primary" data-action="close-guide" data-i18n="guideClose"></button>
    </section>
  </div>`);
  paintLang();
}

function dailySeed() {
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  let seed = 2166136261;
  for (const char of key) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return { key, seed: seed >>> 0 };
}

function showDailyChallenge() {
  const { seed } = dailySeed();
  const mapLevel = LEVELS[seed % LEVELS.length];
  let dailyBest = 0;
  try { dailyBest = Number(localStorage.getItem(`xiaoxiaole-daily-${dailySeed().key}`) || 0); } catch { /* Optional local record. */ }
  const level = {
    id: 0,
    chapter: mapLevel.chapter,
    layout: mapLevel.layout,
    name: { zh: '每日挑战', en: 'Daily Challenge' },
    quip: { zh: '今天的糖果拒绝透露行踪。', en: 'Today’s candies refuse to reveal their whereabouts.' },
    moves: 22,
    goal: { type: 'score', target: 1800 },
    stars: [2400, 3400],
    ice: [],
  };
  showPlay(0, { level, rng: mulberry32(seed), challenge: true, dailyBest });
}

function showLevels() {
  screen = 'levels';
  session = null;
  const chapterPanels = CHAPTERS.map((chapter) => {
    const cards = LEVELS.filter((level) => level.chapter === chapter.id).map((level) => {
      const locked = level.id > progress.unlocked;
      const record = progress.levels[level.id];
      const pressure = difficultyIndex(level).toFixed(1);
      const stars = locked ? t('locked') : starsText(record?.stars || 0);
      const starLine = t('scoreStars').replace('{a}', String(level.stars[0])).replace('{b}', String(level.stars[1]));
      return `<button type="button" class="level-card${locked ? ' locked' : ''}" data-action="level" data-level="${level.id}" ${locked ? 'disabled' : ''}>
        ${miniMap(level)}
        <span class="card-copy">
          <span class="card-top"><span class="num">${level.id}</span><span class="moves-pill">⏱ ${t('levelMoves').replace('{n}', String(level.moves))}</span></span>
          <strong class="lname">${level.name[getLang()]}</strong>
          <span class="quip">${level.quip[getLang()]}</span>
          <span class="card-goal">🎯 ${levelGoalLine(level)}</span>
          <span class="card-bottom"><span class="pressure">${t('levelPressure').replace('{n}', pressure)}</span><span class="stars">${stars}</span></span>
          <span class="scoreline">${starLine}</span>
          ${record ? `<span class="best">🏆 ${t('best')} ${record.bestScore}</span>` : ''}
        </span>
      </button>`;
    }).join('');
    return `<section class="chapter-map chapter-${chapter.id}">
      <header class="chapter-heading">
        <span class="chapter-sticker" aria-hidden="true">${chapter.sticker}</span>
        <span class="chapter-copy"><small>${t('chapter').replace('{n}', String(chapter.id))}</small><strong>${chapter.title[getLang()]}</strong><em>${chapter.blurb[getLang()]}</em></span>
        <span class="chapter-count">${chapter.id === 1 ? '🍬' : chapter.id === 2 ? '🧊' : chapter.id === 3 ? '🌀' : '🚀'}</span>
      </header>
      <div class="level-grid">${cards}</div>
    </section>`;
  }).join('');
  app.innerHTML = `<main class="shell">
    <section class="panel levels-panel">
      <header class="top">
        <button type="button" class="texty" data-action="home" data-i18n="back"></button>
        ${langSwitch()}
      </header>
      <div class="levels-intro"><div><h1 class="page-title" data-i18n="levels"></h1><p data-i18n="levelsCaption"></p></div>
        <button type="button" class="rules-button" data-action="rules" data-i18n="rulesButton"></button>
      </div>
      <div class="chapter-list">${chapterPanels}</div>
    </section>
  </main>`;
  paintLang();
}

function showRules() {
  if (app.querySelector('.rules-modal')) return;
  app.insertAdjacentHTML('beforeend', `<div class="guide-modal rules-modal">
    <section class="dialog rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <h2 id="rules-title" data-i18n="rulesTitle"></h2>
      <p class="rules-intro" data-i18n="rulesIntro"></p>
      <div class="rule-scenes">
        <section class="rule-scene">
          <div class="rule-candies trio-demo" aria-hidden="true">
            <img src="assets/cherry.svg" alt=""><img src="assets/cherry.svg" alt=""><img src="assets/cherry.svg" alt="">
            <b>+30</b>
          </div>
          <p data-i18n="rulesThree"></p>
        </section>
        <section class="rule-scene">
          <div class="rule-cascade" aria-hidden="true">
            <div class="cascade-row first-wave"><img src="assets/lemon.svg" alt=""><img src="assets/lemon.svg" alt=""><img src="assets/lemon.svg" alt=""><b>+30</b></div>
            <div class="cascade-row second-wave"><img src="assets/grape.svg" alt=""><img src="assets/grape.svg" alt=""><img src="assets/grape.svg" alt=""><b>+60</b></div>
          </div>
          <p data-i18n="rulesCascade"></p>
        </section>
        <section class="rule-scene">
          <div class="four-demo" aria-hidden="true">
            <img src="assets/orange.svg" alt=""><img src="assets/orange.svg" alt=""><img src="assets/orange.svg" alt="">
            <span class="new-stripe"><img src="assets/orange.svg" alt=""><b>✦</b></span><strong>+40</strong>
          </div>
          <p data-i18n="rulesFour"></p>
        </section>
      </div>
      <div class="rule-summary">
        <p><span aria-hidden="true">⭐</span> <span data-i18n="rulesStars"></span></p>
        <p><span aria-hidden="true">🧮</span> <span data-i18n="rulesPressure"></span></p>
        <details><summary data-i18n="rulesFormulaLabel"></summary><p data-i18n="rulesFormula"></p></details>
      </div>
      <button type="button" class="primary" data-action="close-rules" data-i18n="rulesClose"></button>
    </section>
  </div>`);
  paintLang();
}

function showPlay(levelId, options = {}) {
  const level = options.level || LEVELS.find((item) => item.id === levelId) || LEVELS[0];
  session = {
    level,
    board: createBoard(options.rng || Math.random, level.ice, level.layout),
    rng: options.rng || Math.random,
    challenge: Boolean(options.challenge),
    dailyBest: options.dailyBest || 0,
    score: 0,
    movesLeft: level.moves,
    collected: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    hintsLeft: 3,
    busy: false,
    phase: 'play',
  };
  screen = 'play';
  app.innerHTML = `<main class="shell play">
    <div id="play-zone" class="play-layout">
      <aside class="side">
        <header class="top">
          <button type="button" class="texty" data-action="home" data-i18n="back"></button>
          ${langSwitch()}
        </header>
        <h1 class="level-heading" data-field="title"></h1>
        <p class="level-quip" data-field="quip"></p>
        <section class="hud">
          <div><span data-i18n="score"></span><strong data-field="score">0</strong></div>
          <div><span data-i18n="moves"></span><strong data-field="moves"></strong></div>
          <div class="goal-block">
            <span data-field="goal"></span>
            <div class="bar"><span></span></div>
          </div>
          <small class="star-note" data-field="stars-note"></small>
        </section>
        <div class="actions">
          <button type="button" class="ghost" data-action="hint"></button>
          <button type="button" class="ghost rules-short" data-action="rules" data-i18n="rulesShort"></button>
          ${muteButton()}
        </div>
      </aside>
      <div class="stage">
        <div class="board" data-chapter="${level.chapter || 1}">
          <div class="slots">${'<i></i>'.repeat(64)}</div>
          <div class="gems"></div>
        </div>
        <p id="toast" class="toast" hidden></p>
      </div>
    </div>
    <div class="modal" hidden>
      <div class="dialog" role="dialog" aria-modal="true">
        <h2 class="modal-title"></h2>
        <p class="modal-stars"></p>
        <p class="modal-score"></p>
        <div class="hero-actions">
          <button type="button" class="primary" data-action="retry" data-i18n="retry"></button>
          <button type="button" class="ghost" data-action="next" data-i18n="next"></button>
          <button type="button" class="texty" data-action="levels" data-i18n="levels"></button>
        </div>
      </div>
    </div>
  </main>`;
  mountGems(app.querySelector('.gems'));
  renderSlots(session.board);
  renderBoard(session.board);
  paintLang();
  updateHud();
  bindPlayZone(app.querySelector('#play-zone'));
  bindBoardLayout();
}

function bindPlayZone(zone) {
  zone.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  }, true);
  let drag = null;
  let selected = null;
  zone.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      event.preventDefault();
      return;
    }
    const gem = event.target.closest('.gem');
    if (!gem || !session || session.busy || session.phase !== 'play') return;
    drag = {
      r: Number(gem.dataset.r),
      c: Number(gem.dataset.c),
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
  });
  zone.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) < 14) return;
    const target = Math.abs(dx) > Math.abs(dy)
      ? { r: drag.r, c: drag.c + (dx > 0 ? 1 : -1) }
      : { r: drag.r + (dy > 0 ? 1 : -1), c: drag.c };
    const from = { r: drag.r, c: drag.c };
    drag = null;
    selected = null;
    setSelected(null);
    tryMove(from, target);
  });
  zone.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const from = { r: drag.r, c: drag.c };
    drag = null;
    if (selected && isAdjacent(selected, from)) {
      const origin = selected;
      selected = null;
      setSelected(null);
      tryMove(origin, from);
      return;
    }
    selected = from;
    setSelected(from);
    playSelect();
  });
  zone.addEventListener('pointercancel', () => { drag = null; });
}

async function tryMove(a, b) {
  if (!session || session.busy || session.phase !== 'play' || !inBounds(b.r, b.c)) return;
  if (!session.board[b.r]?.[b.c] || session.board[b.r][b.c].blocked) {
    showToast(t('voidMove'));
    return;
  }
  session.busy = true;
  clearHint();
  setSelected(null);
  playSwap();
  await animateSwap(a, b);
  const result = trySwap(session.board, a, b, session.rng);
  if (!result.ok) {
    playFail();
    await animateUnswap(a, b);
    showToast(t('invalidMove'));
    session.busy = false;
    return;
  }
  if (result.frames[0]) renderBoard(result.frames[0].before);
  if (result.comboName) {
    const label = result.comboName.replace(/[A-Z]/g, (char) => char.toUpperCase());
    showToast(t(`combo${label}`));
  }
  session.movesLeft -= 1;
  let combo = 0;
  for (const frame of result.frames) {
    combo += 1;
    const iceHits = markPops(frame.before, frame.after);
    if (frame.scoreGained >= 80 || combo >= 3) playSpecial();
    else playMatch(combo);
    if (iceHits) playIce();
    if (frame.scoreGained) floatScore(frame.scoreGained);
    await wait(180);
    session.score += frame.scoreGained;
    for (const key of Object.keys(session.collected)) session.collected[key] += frame.collected[key] || 0;
    session.board = frame.after;
    updateHud();
    renderBoard(frame.after, { fall: true });
    await wait(230);
  }
  session.board = result.board;
  updateHud();
  const stats = currentStats();
  if (isGoalMet(session.level.goal, stats)) {
    await finish(true);
    return;
  }
  if (session.movesLeft <= 0) {
    await finish(false);
    return;
  }
  if (!findHint(session.board)) {
    session.board = reshuffle(session.board, session.rng);
    renderBoard(session.board, { fall: true });
    playShuffle();
    showToast(t('reshuffled'));
    await wait(240);
  }
  session.busy = false;
}

async function finish(won) {
  session.phase = won ? 'won' : 'lost';
  session.busy = true;
  if (session.challenge) {
    const { key } = dailySeed();
    session.dailyBest = Math.max(session.dailyBest, session.score);
    try { localStorage.setItem(`xiaoxiaole-daily-${key}`, String(session.dailyBest)); } catch { /* Keep the result playable without storage. */ }
  }
  if (won) {
    playWin();
    const stats = currentStats();
    if (!session.challenge) {
      try {
        const response = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            levelId: session.level.id,
            score: session.score,
            stars: starCount(session.level, stats),
          }),
        });
        if (response.ok) progress = await response.json();
      } catch {
        // 存档失败时仍让这一局的结果留在屏幕上。
      }
    }
  } else {
    playLose();
  }
  fillModal();
  paintLang();
  app.querySelector('.modal').hidden = false;
}

function useHint() {
  if (!session || session.busy || session.phase !== 'play' || session.hintsLeft <= 0) return;
  const hint = findHint(session.board);
  if (!hint) return;
  session.hintsLeft -= 1;
  highlight(hint.a, hint.b);
  playHint();
  showToast(t('hintSwap'));
  updateHud();
}

function continueLevel() {
  const open = LEVELS.find((level) => level.id <= progress.unlocked && !progress.levels[level.id]?.cleared);
  const fallback = LEVELS[Math.min(progress.unlocked, LEVELS.length) - 1];
  showPlay((open || fallback).id);
}

async function changeLang(lang) {
  if (lang !== 'zh' && lang !== 'en') return;
  setLang(lang);
  try {
    await fetch('/api/lang', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang }),
    });
    progress.lang = lang;
  } catch {
    // 语言先在本地生效，下次能连上再写入。
  }
  if (screen === 'play') {
    paintLang();
    updateHud();
    if (session && !session.busy) renderBoard(session.board);
  } else if (screen === 'levels') showLevels();
  else showHome();
}

app.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'lang') changeLang(trigger.dataset.lang);
  if (action === 'start') continueLevel();
  if (action === 'levels') showLevels();
  if (action === 'daily') showDailyChallenge();
  if (action === 'guide') showGuide();
  if (action === 'rules') showRules();
  if (action === 'close-rules') app.querySelector('.rules-modal')?.remove();
  if (action === 'close-guide') {
    try { localStorage.setItem('xiaoxiaole-guide-seen', '1'); } catch { /* Guide can still be dismissed. */ }
    app.querySelector('.guide-modal')?.remove();
  }
  if (action === 'home') showHome();
  if (action === 'level') showPlay(Number(trigger.dataset.level));
  if (action === 'hint') useHint();
  if (action === 'mute') {
    toggleMuted();
    paintLang();
    return;
  }
  if (action === 'retry' && session) {
    if (session.challenge) showDailyChallenge();
    else showPlay(session.level.id);
  }
  if (action === 'next' && session) showPlay(session.level.id + 1);
});

document.addEventListener('pointerdown', unlockAudio, { once: true });

async function boot() {
  try {
    const response = await fetch('/api/progress');
    if (response.ok) progress = await response.json();
  } catch {
    progress = { lang: null, unlocked: 1, levels: {} };
  }
  if (progress.lang === 'zh' || progress.lang === 'en') setLang(progress.lang);
  else setLang((navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en');
  showHome();
}

boot();
