/* =============================================
   CROSSWORD APP — class-based architecture
   =============================================
   Classes:
   - GridRenderer   — builds and manages the grid DOM
   - Keyboard       — renders on-screen keyboard
   - CluePanel      — clue text + arrow navigation
   - Modal          — simple modal with clue text
   - CrosswordApp   — main controller
   ============================================= */

'use strict';

// ─────────────────────────────────────────────
// GridRenderer
// ─────────────────────────────────────────────
class GridRenderer {
  constructor(gridEl, wrapperEl) {
    this.gridEl   = gridEl;
    this.wrapperEl = wrapperEl;
  }

  /** Compute optimal cell size based on wrapper dimensions */
  computeCellSize(rows, cols) {
    const w = this.wrapperEl.clientWidth  - 12;
    const h = this.wrapperEl.clientHeight - 12;
    const gap = 3;
    const byW = Math.floor((w - gap * (cols - 1)) / cols);
    const byH = Math.floor((h - gap * (rows - 1)) / rows);
    return Math.max(20, Math.min(byW, byH, 58));
  }

  /** Render full grid for a crossword, returns wordStartMap */
  render(cw, onCellClick) {
    const rows = cw.grid.length;
    const cols = cw.grid[0].length;
    const cellSize = this.computeCellSize(rows, cols);
    const numSize  = Math.max(7,  Math.round(cellSize * 0.22)) + 'px';
    const letSize  = Math.max(10, Math.round(cellSize * 0.40)) + 'px';

    this.gridEl.innerHTML = '';
    this.gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    this.gridEl.style.gridTemplateRows    = `repeat(${rows}, ${cellSize}px)`;
    this.gridEl.style.gap = '3px';

    // Build word-start lookup
    const wordStartMap = {};
    cw.words.forEach(w => { wordStartMap[`${w.row}-${w.col}`] = w.number; });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = cw.grid[r][c];
        const div = document.createElement('div');
        div.dataset.row = r;
        div.dataset.col = c;
        div.style.width  = cellSize + 'px';
        div.style.height = cellSize + 'px';

        if (val === '.') {
          div.className = 'gcell black';
        } else {
          div.className = 'gcell white';
          const num = wordStartMap[`${r}-${c}`];
          if (num !== undefined) {
            const ns = document.createElement('span');
            ns.className   = 'cell-num';
            ns.textContent = num;
            ns.style.fontSize = numSize;
            div.appendChild(ns);
          }
          const ls = document.createElement('span');
          ls.className  = 'cell-letter';
          ls.id         = `cell-${r}-${c}`;
          ls.style.fontSize = letSize;
          div.appendChild(ls);
          div.addEventListener('click', () => onCellClick(r, c, num));
        }
        this.gridEl.appendChild(div);
      }
    }
    return wordStartMap;
  }

  /** Update a single cell's displayed letter */
  setLetter(row, col, letter) {
    const el = document.getElementById(`cell-${row}-${col}`);
    if (el) el.textContent = letter;
  }

  /** Get a cell element by coordinates */
  getCell(row, col) {
    return this.gridEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  }

  /** Clear active-word and active-cursor from all non-correct cells */
  clearHighlights() {
    this.gridEl.querySelectorAll('.gcell.white:not(.correct)')
      .forEach(el => el.classList.remove('active-word', 'active-cursor'));
  }

  /** Mark cells of a word as active (highlight) */
  highlightWord(word) {
    this.clearHighlights();
    for (let i = 0; i < word.length; i++) {
      const r = word.direction === 'across' ? word.row       : word.row + i;
      const c = word.direction === 'across' ? word.col + i   : word.col;
      const el = this.getCell(r, c);
      if (el && !el.classList.contains('correct')) el.classList.add('active-word');
    }
  }

  /** Set cursor on a specific cell */
  setCursor(row, col) {
    this.gridEl.querySelectorAll('.gcell.active-cursor')
      .forEach(el => el.classList.remove('active-cursor'));
    const el = this.getCell(row, col);
    if (el && !el.classList.contains('correct')) {
      el.classList.remove('active-word');
      el.classList.add('active-cursor');
    }
  }

  /** Lock correct word cells */
  lockWord(word) {
    for (let i = 0; i < word.length; i++) {
      const r = word.direction === 'across' ? word.row       : word.row + i;
      const c = word.direction === 'across' ? word.col + i   : word.col;
      const el = this.getCell(r, c);
      if (el) {
        el.classList.remove('active-word', 'active-cursor');
        el.classList.add('correct');
      }
    }
  }
}

// ─────────────────────────────────────────────
// Keyboard
// ─────────────────────────────────────────────
class Keyboard {
  static ROWS = ['ЙЦУКЕНГШЩЗХ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮ'];

  constructor(el) {
    this.el = el;
    this.onLetter    = null;
    this.onBackspace = null;
  }

  render() {
    this.el.innerHTML = '';
    Keyboard.ROWS.forEach((row, ri) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'kb-row';

      [...row].forEach(letter => {
        const btn = document.createElement('button');
        btn.className   = 'kb-key';
        btn.textContent = letter;
        btn.addEventListener('click', () => this.onLetter?.(letter));
        rowDiv.appendChild(btn);
      });

      if (ri === Keyboard.ROWS.length - 1) {
        const bsp = document.createElement('button');
        bsp.className = 'kb-key kb-backspace';
        bsp.innerHTML = '⌫';
        bsp.addEventListener('click', () => this.onBackspace?.());
        rowDiv.appendChild(bsp);
      }

      this.el.appendChild(rowDiv);
    });
  }
}

// ─────────────────────────────────────────────
// CluePanel
// ─────────────────────────────────────────────
class CluePanel {
  constructor({ textEl, arrowLeftEl, arrowRightEl }) {
    this.textEl      = textEl;
    this.arrowLeftEl = arrowLeftEl;
    this.arrowRightEl = arrowRightEl;
    this.onPrev  = null;
    this.onNext  = null;
    this.onClick = null;

    if (arrowLeftEl)  arrowLeftEl.addEventListener('click',  () => this.onPrev?.());
    if (arrowRightEl) arrowRightEl.addEventListener('click', () => this.onNext?.());
    if (textEl) textEl.addEventListener('click', () => this.onClick?.());
  }

  setClue(word) {
    if (!word) { this.textEl.textContent = ''; return; }
    const dir = word.direction === 'across' ? '→' : '↓';
    this.textEl.textContent = `${word.number}. ${dir} ${word.clue}`;
  }

  clear() { this.textEl.textContent = ''; }
}

// ─────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────
class Modal {
  constructor({ overlayEl, clueEl, okEl }) {
    this.overlayEl = overlayEl;
    this.clueEl    = clueEl;
    this.okEl      = okEl;

    okEl?.addEventListener('click', () => this.hide());
    overlayEl?.addEventListener('click', e => {
      if (e.target === overlayEl) this.hide();
    });
  }

  show(clueText) {
    this.clueEl.textContent = clueText;
    this.overlayEl.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  hide() {
    this.overlayEl.classList.remove('visible');
    document.body.style.overflow = '';
  }
}

// ─────────────────────────────────────────────
// CrosswordApp — main controller
// ─────────────────────────────────────────────
class CrosswordApp {
  constructor() {
    // State
    this.currentCrossword = null;
    this.activeWord       = null;
    this.activeCell       = null;
    this.userAnswers      = {};   // "row-col" → letter
    this.correctWords     = new Set();
    this.activeWordIndex  = 0;

    // DOM refs
    this.$main     = document.getElementById('main-screen');
    this.$game     = document.getElementById('game-screen');
    this.$title    = document.getElementById('game-title');
    this.$stars    = document.getElementById('game-stars');
    this.$backBtn  = document.getElementById('back-to-main');
    this.$closeBtn = document.getElementById('close-main');
    this.$cards    = document.getElementById('cards-container');

    // Sub-modules
    this.grid = new GridRenderer(
      document.getElementById('crossword-grid'),
      document.getElementById('crossword-wrapper')
    );

    this.keyboard = new Keyboard(document.getElementById('keyboard'));
    this.keyboard.onLetter    = letter => this._typeLetter(letter);
    this.keyboard.onBackspace = ()     => this._typeBackspace();

    this.cluePanel = new CluePanel({
      textEl:       document.getElementById('clue-text'),
      arrowLeftEl:  document.getElementById('clue-arrow-left'),
      arrowRightEl: document.getElementById('clue-arrow-right'),
    });
    this.cluePanel.onPrev  = () => this._navigateClue(-1);
    this.cluePanel.onNext  = () => this._navigateClue(1);
    this.cluePanel.onClick = () => {
      if (this.activeWord) this.modal.show(this.activeWord.clue);
    };

    this.modal = new Modal({
      overlayEl: document.getElementById('modal-overlay'),
      clueEl:    document.getElementById('modal-clue'),
      okEl:      document.getElementById('modal-ok'),
    });

    this._init();
  }

  // ── Init ──────────────────────────────────

  _init() {
    this._renderCards();

    this.$backBtn.addEventListener('click', () => this._showMain());
    this.$closeBtn.addEventListener('click', () => {
      if (window.history.length > 1) window.history.back();
      else window.close();
    });
  }

  // ── Main screen ───────────────────────────

  _renderCards() {
    this.$cards.innerHTML = '';
    crosswordsData.forEach((cw, idx) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.animationDelay = `${idx * 0.06}s`;
      card.innerHTML = `
        <div class="card-grid-preview">${this._miniGrid(cw)}</div>
        <div class="card-footer">
          <div class="card-title">${cw.title}</div>
          <div class="card-meta">
            <div class="stars">${this._stars(cw.difficulty)}</div>
          </div>
        </div>`;
      card.addEventListener('click', () => this._openCrossword(cw));
      this.$cards.appendChild(card);
    });
  }

  _stars(n) {
    return [1,2,3].map(i =>
      `<span class="star ${i <= n ? 'filled' : 'empty'}">★</span>`
    ).join('');
  }

  _miniGrid(cw) {
    const rows = cw.grid.length, cols = cw.grid[0].length;
    let h = `<div class="mini-grid" style="--cols:${cols};--rows:${rows}">`;
    cw.grid.forEach(row => row.forEach(cell =>
      h += `<div class="mini-cell ${cell === '.' ? 'black' : 'white'}"></div>`
    ));
    return h + '</div>';
  }

  // ── Game screen ───────────────────────────

  _openCrossword(cw) {
    this.currentCrossword = cw;
    this.userAnswers  = {};
    this.correctWords = new Set();
    this.activeWord   = null;
    this.activeCell   = null;

    this.$title.textContent = cw.title;
    this.$stars.innerHTML   = this._stars(cw.difficulty);
    this.cluePanel.clear();
    this.keyboard.render();
    this._showGame();
  }

  _activateFirstWord() {
    if (!this.currentCrossword?.words.length) return;
    const first = this.currentCrossword.words[0];
    this._setActiveWord(first, first.row, first.col);
  }

  // ── Cell interaction ──────────────────────

  _onCellClick(row, col) {
    const cw       = this.currentCrossword;
    const matching = cw.words.filter(w => this._wordContainsCell(w, row, col));
    if (!matching.length) return;

    let word;
    if (this.activeCell?.row === row && this.activeCell?.col === col) {
      const idx = matching.indexOf(this.activeWord);
      word = matching[(idx + 1) % matching.length];
    } else {
      word = matching.find(w => w.direction === 'across') || matching[0];
    }
    this._setActiveWord(word, row, col);
  }

  _setActiveWord(word, row, col) {
    this.activeWord  = word;
    this.activeCell  = { row, col };
    this.activeWordIndex = this.currentCrossword.words.indexOf(word);

    this.grid.highlightWord(word);
    this.grid.setCursor(row, col);
    this.cluePanel.setClue(word);
  }

  _wordContainsCell(word, row, col) {
    return word.direction === 'across'
      ? row === word.row && col >= word.col && col < word.col + word.length
      : col === word.col && row >= word.row && row < word.row + word.length;
  }

  _navigateClue(dir) {
    const list = this.currentCrossword.words;
    this.activeWordIndex = (this.activeWordIndex + dir + list.length) % list.length;
    const word = list[this.activeWordIndex];
    this._setActiveWord(word, word.row, word.col);
  }

  // ── Typing ────────────────────────────────

  _typeLetter(letter) {
    if (!this.activeCell || !this.activeWord) return;
    const { row, col } = this.activeCell;
    const cellEl = this.grid.getCell(row, col);
    if (cellEl?.classList.contains('correct')) return;

    this.userAnswers[`${row}-${col}`] = letter;
    this.grid.setLetter(row, col, letter);
    this._checkWord(this.activeWord);
    this._moveCursor(1);
  }

  _typeBackspace() {
    if (!this.activeCell || !this.activeWord) return;
    const { row, col } = this.activeCell;
    const cellEl = this.grid.getCell(row, col);
    if (cellEl?.classList.contains('correct')) { this._moveCursor(-1); return; }

    const key = `${row}-${col}`;
    if (this.userAnswers[key]) {
      delete this.userAnswers[key];
      this.grid.setLetter(row, col, '');
    } else {
      this._moveCursor(-1);
    }
  }

  _moveCursor(dir) {
    if (!this.activeWord || !this.activeCell) return;
    const w   = this.activeWord;
    const pos = w.direction === 'across'
      ? this.activeCell.col - w.col
      : this.activeCell.row - w.row;
    const newPos = pos + dir;
    if (newPos < 0 || newPos >= w.length) return;

    const newRow = w.direction === 'across' ? w.row           : w.row + newPos;
    const newCol = w.direction === 'across' ? w.col + newPos  : w.col;

    this.activeCell = { row: newRow, col: newCol };
    this.grid.setCursor(newRow, newCol);
  }

  // ── Answer check ──────────────────────────

  _checkWord(word) {
    if (this.correctWords.has(word.number)) return;
    for (let i = 0; i < word.length; i++) {
      const r = word.direction === 'across' ? word.row       : word.row + i;
      const c = word.direction === 'across' ? word.col + i   : word.col;
      const typed    = (this.userAnswers[`${r}-${c}`] || '').toUpperCase();
      const expected = (word.answer[i] || '').toUpperCase();
      if (!typed || typed !== expected) return;
    }
    this.correctWords.add(word.number);
    this.grid.lockWord(word);
  }

  // ── Screen navigation ─────────────────────

  _showMain() {
    this.$game.classList.remove('active');
    this.$main.classList.add('active');
    window.scrollTo({ top: 0 });
  }

  _showGame() {
    this.$main.classList.remove('active');
    this.$game.classList.add('active');
    window.scrollTo({ top: 0 });

    // Double rAF: ensure layout painted before measuring wrapper
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!this.currentCrossword) return;
      this.grid.render(this.currentCrossword, (r, c, num) => this._onCellClick(r, c));
      this._activateFirstWord();
    }));
  }
}

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const app = new CrosswordApp();

  // Re-render on resize (orientation change etc.)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!app.currentCrossword) return;
      if (!document.getElementById('game-screen').classList.contains('active')) return;
      app.grid.render(
        app.currentCrossword,
        (r, c) => app._onCellClick(r, c)
      );
      if (app.activeWord) {
        app._setActiveWord(app.activeWord, app.activeCell.row, app.activeCell.col);
      }
    }, 120);
  });
});