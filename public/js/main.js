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
import { gemLabel, getLang, goalText, levelTitle, setLang, t } from './i18n.js';
import { LEVELS } from './levels.js';
import {
  createBoard,
  findHint,
  iceLeft,
  inBounds,
  isAdjacent,
  isGoalMet,
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
  if (score) score.textContent = String(session.score);
  if (moves) {
    moves.textContent = String(session.movesLeft);
    moves.classList.toggle('low', session.movesLeft <= 5);
  }
  if (goal) goal.textContent = goalText(session.level.goal, stats);
  if (bar) bar.style.width = `${goalRatio(session.level, stats) * 100}%`;
  if (hint) hint.textContent = `${t('hint')} (${session.hintsLeft})`;
  if (title) title.textContent = levelTitle(session.level);
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
  app.querySelector('.modal-score').textContent = `${t('score')} ${session.score}`;
  const next = app.querySelector('[data-action="next"]');
  if (next) next.hidden = !(won && session.level.id < LEVELS.length);
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
        <p class="eyebrow">8 × 8</p>
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
        </div>
      </div>
    </section>
  </main>`;
  paintLang();
}

function showLevels() {
  screen = 'levels';
  session = null;
  const cards = LEVELS.map((level) => {
    const locked = level.id > progress.unlocked;
    const record = progress.levels[level.id];
    const stars = starsText(record?.stars || 0);
    return `<button type="button" class="level-card${locked ? ' locked' : ''}" data-action="level" data-level="${level.id}" ${locked ? 'disabled' : ''}>
      <span class="num">${level.id}</span>
      <span class="lname">${level.name[getLang()]}</span>
      <span class="stars">${locked ? t('locked') : stars}</span>
      <span class="best">${record ? `${t('best')} ${record.bestScore}` : ''}</span>
    </button>`;
  }).join('');
  app.innerHTML = `<main class="shell">
    <section class="panel levels-panel">
      <header class="top">
        <button type="button" class="texty" data-action="home" data-i18n="back"></button>
        ${langSwitch()}
      </header>
      <h1 class="page-title" data-i18n="levels"></h1>
      <div class="level-grid">${cards}</div>
    </section>
  </main>`;
  paintLang();
}

function showPlay(levelId) {
  const level = LEVELS.find((item) => item.id === levelId) || LEVELS[0];
  session = {
    level,
    board: createBoard(Math.random, level.ice),
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
        <section class="hud">
          <div><span data-i18n="score"></span><strong data-field="score">0</strong></div>
          <div><span data-i18n="moves"></span><strong data-field="moves"></strong></div>
          <div class="goal-block">
            <span data-field="goal"></span>
            <div class="bar"><span></span></div>
          </div>
        </section>
        <div class="actions">
          <button type="button" class="ghost" data-action="hint"></button>
          ${muteButton()}
        </div>
      </aside>
      <div class="stage">
        <div class="board">
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
  session.busy = true;
  clearHint();
  setSelected(null);
  playSwap();
  await animateSwap(a, b);
  const result = trySwap(session.board, a, b, Math.random);
  if (!result.ok) {
    playFail();
    await animateUnswap(a, b);
    session.busy = false;
    return;
  }
  if (result.frames[0]) renderBoard(result.frames[0].before);
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
    session.board = reshuffle(session.board, Math.random);
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
  if (won) {
    playWin();
    const stats = currentStats();
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
  if (action === 'home') showHome();
  if (action === 'level') showPlay(Number(trigger.dataset.level));
  if (action === 'hint') useHint();
  if (action === 'mute') {
    toggleMuted();
    paintLang();
    return;
  }
  if (action === 'retry' && session) showPlay(session.level.id);
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
