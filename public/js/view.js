import { gemLabel } from './i18n.js';

const GEM_SRC = [
  'assets/cherry.svg',
  'assets/lemon.svg',
  'assets/grape.svg',
  'assets/apple.svg',
  'assets/orange.svg',
  'assets/blueberry.svg',
];

const BOARD_MAX = 528;
let gemsEl = null;
let layoutObs = null;

function wait(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

function gemSrc(cell) {
  if (cell.type == null || cell.special === 'color') return 'assets/rainbow.svg';
  return GEM_SRC[cell.type] || GEM_SRC[0];
}

function extraSvg(cell) {
  const marks = [];
  if (cell.special === 'h') {
    marks.push('<path d="M8 20h32M8 28h32" stroke="rgba(255,255,255,.95)" stroke-width="3.2" stroke-linecap="round"/>');
    marks.push('<path d="M8 20h32M8 28h32" stroke="#ffe08a" stroke-width="1.4" stroke-linecap="round"/>');
  }
  if (cell.special === 'v') {
    marks.push('<path d="M20 8v32M28 8v32" stroke="rgba(255,255,255,.95)" stroke-width="3.2" stroke-linecap="round"/>');
    marks.push('<path d="M20 8v32M28 8v32" stroke="#ffe08a" stroke-width="1.4" stroke-linecap="round"/>');
  }
  if (cell.special === 'wrap') {
    marks.push('<circle cx="24" cy="24" r="16" fill="none" stroke="#ffe28a" stroke-width="3.2"/>');
  }
  if (cell.ice) {
    marks.push('<rect x="7" y="7" width="34" height="34" rx="10" fill="rgba(214,240,255,.48)" stroke="#f7fcff" stroke-width="2"/>');
    if (cell.ice > 1) {
      marks.push('<rect x="13" y="13" width="22" height="22" rx="7" fill="rgba(255,255,255,.38)" stroke="#e8f7ff"/>');
    }
  }
  if (!marks.length) return '';
  return `<svg class="gem-extra" viewBox="0 0 48 48" aria-hidden="true">${marks.join('')}</svg>`;
}

export function mountGems(element) {
  gemsEl = element;
}

export function renderSlots(board) {
  const slots = document.querySelector('.slots');
  if (!slots) return;
  slots.replaceChildren();
  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board[r].length; c += 1) {
      const slot = document.createElement('i');
      slot.className = board[r][c]?.blocked ? 'void' : '';
      slot.style.gridRow = String(r + 1);
      slot.style.gridColumn = String(c + 1);
      slots.appendChild(slot);
    }
  }
}

export function layoutBoard() {
  const layout = document.querySelector('.play-layout');
  const stage = document.querySelector('.stage');
  const side = document.querySelector('.side');
  if (!layout || !stage || !side) return;
  const stacked = window.matchMedia('(max-width: 860px)').matches;
  const gap = Number.parseFloat(getComputedStyle(layout).gap) || 24;
  let availW;
  let availH;
  if (stacked) {
    availW = layout.clientWidth;
    availH = layout.clientHeight - side.offsetHeight - gap;
  } else {
    availW = layout.clientWidth - side.offsetWidth - gap;
    availH = layout.clientHeight;
  }
  const size = Math.floor(Math.max(220, Math.min(BOARD_MAX, availW, availH)));
  stage.style.width = `${size}px`;
  stage.style.height = `${size}px`;
}

export function bindBoardLayout() {
  layoutObs?.disconnect();
  const shell = document.querySelector('.shell.play');
  if (!shell) return;
  layoutObs = new ResizeObserver(() => layoutBoard());
  layoutObs.observe(shell);
  layoutBoard();
}

function gemAt(pos) {
  return gemsEl?.querySelector(`.gem[data-r="${pos.r}"][data-c="${pos.c}"]`) || null;
}

export function renderBoard(board, { fall = false } = {}) {
  const previous = new Map();
  for (const gem of gemsEl.querySelectorAll('.gem')) {
    previous.set(gem.dataset.id, { el: gem, r: Number(gem.dataset.r), c: Number(gem.dataset.c) });
  }
  const seen = new Set();
  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board[r].length; c += 1) {
      const cell = board[r][c];
      if (!cell || cell.blocked) continue;
      const id = String(cell.id);
      seen.add(id);
      const old = previous.get(id);
      const el = old?.el || document.createElement('button');
      el.type = 'button';
      el.className = old ? 'gem' : 'gem spawn';
      el.dataset.id = id;
      el.dataset.r = String(r);
      el.dataset.c = String(c);
      el.dataset.type = cell.type == null ? '' : String(cell.type);
      el.dataset.ice = String(cell.ice);
      el.style.gridRow = String(r + 1);
      el.style.gridColumn = String(c + 1);
      el.innerHTML = `<img src="${gemSrc(cell)}" alt="" draggable="false">${extraSvg(cell)}`;
      el.setAttribute('aria-label', gemLabel(cell));
      if (!old) gemsEl.appendChild(el);
      const fromR = old ? old.r : -1;
      const dy = fromR - r;
      if (fall && dy !== 0) {
        el.style.transition = 'none';
        el.style.transform = `translateY(${dy * 100}%)`;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = 'transform 220ms cubic-bezier(.2,.8,.2,1)';
            el.style.transform = '';
          });
        });
      } else {
        el.style.transition = '';
        el.style.transform = '';
        el.style.zIndex = '';
      }
    }
  }
  for (const [id, item] of previous) {
    if (!seen.has(id)) item.el.remove();
  }
}

export function markPops(before, after) {
  const afterIds = new Set();
  const afterIce = new Map();
  for (const row of after) {
    for (const cell of row) {
      if (!cell) continue;
      afterIds.add(String(cell.id));
      afterIce.set(String(cell.id), cell.ice);
    }
  }
  let iceHits = 0;
  for (const gem of gemsEl.querySelectorAll('.gem')) {
    if (!afterIds.has(gem.dataset.id)) gem.classList.add('pop');
    else if (Number(gem.dataset.ice) > (afterIce.get(gem.dataset.id) ?? 0)) {
      gem.classList.add('ice-hit');
      iceHits += 1;
    }
  }
  return iceHits;
}

export function animateSwap(a, b) {
  const elA = gemAt(a);
  const elB = gemAt(b);
  if (!elA || !elB) return Promise.resolve();
  const ra = elA.getBoundingClientRect();
  const rb = elB.getBoundingClientRect();
  const dx = rb.left - ra.left;
  const dy = rb.top - ra.top;
  [[elA, dx, dy, '3'], [elB, -dx, -dy, '2']].forEach(([el, x, y, z]) => {
    el.style.zIndex = z;
    el.style.transition = 'transform 160ms ease';
    el.style.transform = `translate(${x}px, ${y}px)`;
  });
  return wait(170);
}

export function animateUnswap(a, b) {
  for (const pos of [a, b]) {
    const el = gemAt(pos);
    if (!el) continue;
    el.style.transition = 'transform 160ms ease';
    el.style.transform = '';
    el.style.zIndex = '';
  }
  return wait(170);
}

export function highlight(a, b) {
  clearHint();
  gemAt(a)?.classList.add('hint');
  gemAt(b)?.classList.add('hint');
}

export function clearHint() {
  gemsEl?.querySelectorAll('.hint').forEach((el) => el.classList.remove('hint'));
}

export function setSelected(pos) {
  gemsEl?.querySelectorAll('.selected').forEach((el) => el.classList.remove('selected'));
  if (pos) gemAt(pos)?.classList.add('selected');
}

export function floatScore(score) {
  const node = document.createElement('div');
  node.className = 'float-score';
  node.textContent = `+${score}`;
  gemsEl?.appendChild(node);
  setTimeout(() => node.remove(), 700);
}

export function showToast(text) {
  const host = document.querySelector('#toast');
  if (!host) return;
  host.textContent = text;
  host.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { host.hidden = true; }, 1600);
}
