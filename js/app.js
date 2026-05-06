'use strict';

class GridRenderer {
  constructor(gridEl, wrapperEl) {
    this.gridEl   = gridEl;
    this.wrapperEl = wrapperEl;
  }

  computeCellSize(rows, cols) {
    const w = this.wrapperEl.clientWidth  - 12;
    const h = this.wrapperEl.clientHeight - 12;
    const gap = 3;
    const byW = Math.floor((w - gap * (cols - 1)) / cols);
    const byH = Math.floor((h - gap * (rows - 1)) / rows);
    return Math.max(20, Math.min(byW, byH, 58));
  }

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

  setLetter(row, col, letter) {
    const el = document.getElementById(`cell-${row}-${col}`);
    if (el) el.textContent = letter;
  }

  getCell(row, col) {
    return this.gridEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  }

  clearHighlights() {
    this.gridEl.querySelectorAll('.gcell.white:not(.correct)')
      .forEach(el => el.classList.remove('active-word', 'active-cursor'));
  }

  highlightWord(word) {
    this.clearHighlights();
    for (let i = 0; i < word.length; i++) {
      const r = word.direction === 'across' ? word.row       : word.row + i;
      const c = word.direction === 'across' ? word.col + i   : word.col;
      const el = this.getCell(r, c);
      if (el && !el.classList.contains('correct')) el.classList.add('active-word');
    }
  }

  setCursor(row, col) {
    this.gridEl.querySelectorAll('.gcell.active-cursor')
      .forEach(el => el.classList.remove('active-cursor'));
    const el = this.getCell(row, col);
    if (el && !el.classList.contains('correct')) {
      el.classList.remove('active-word');
      el.classList.add('active-cursor');
    }
  }

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

class SoundManager {
  constructor() {
    this._ctx = null;
  }

  _getCtx() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  // Лёгкий «тик» при нажатии клавиши
  playTick() {
    try {
      const ctx  = this._getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {}
  }

  // Короткий «динь» при угаданном слове
  playWord() {
    try {
      const ctx  = this._getCtx();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      // Два синуса: основной тон + лёгкая гармоника
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(ctx.currentTime + i * 0.03);
        osc.stop(ctx.currentTime  + i * 0.03 + 0.22);
      });

      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    } catch (e) { /* тихо игнорируем */ }
  }

  // Победная трель при решении всего кроссворда
  playWin() {
    try {
      const ctx  = this._getCtx();
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);

        const t = ctx.currentTime + i * 0.13;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch (e) { /* тихо игнорируем */ }
  }

  // Щелчок мыши при выборе карточки
  playSelect() {
    try {
      const ctx = this._getCtx();

      // Основной тон — быстрое падение частоты
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.025);
      oscGain.gain.setValueAtTime(0.5, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.03);

      // Микровсплеск шума — щелчок в начале
      const bufSize = Math.floor(ctx.sampleRate * 0.008);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 3000;
      noiseFilter.Q.value = 0.8;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.008);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(ctx.currentTime);
      noise.stop(ctx.currentTime + 0.01);
    } catch (e) {}
  }
}

class CrosswordApp {
  constructor() {
    this.currentCrossword = null;
    this.activeWord       = null;
    this.activeCell       = null;
    this.userAnswers      = {};
    this.correctWords     = new Set();
    this.activeWordIndex  = 0;
    this.sound = new SoundManager();

    this.$main        = document.getElementById('main-screen');
    this.$game        = document.getElementById('game-screen');
    this.$title       = document.getElementById('game-title');
    this.$backBtn     = document.getElementById('back-to-main');
    this.$cards       = document.getElementById('cards-container');

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

  _init() {
    this._renderCards();

    this.$backBtn.addEventListener('click', () => this._showMain());

    this.$winOverlay  = document.getElementById('win-modal-overlay');
    this.$winSubtitle = document.getElementById('win-subtitle');
    document.getElementById('win-restart').addEventListener('click', () => this._restartCrossword());
    document.getElementById('win-choose').addEventListener('click',  () => {
      this._hideWin();
      this._showMain();
    });
  }

  _renderCards() {
    this.$cards.innerHTML = '';
    crosswordsData.forEach((cw, idx) => {
      const svgId = `mg-${idx}`;
      const card = document.createElement('div');
      card.className = 'card';
      card.style.animationDelay = `${idx * 0.06}s`;
      card.innerHTML = `
        <div class="card-grid-preview">
          ${this._miniGrid(cw, svgId)}
        </div>
        <div class="card-footer">
          <div class="card-number">${cw.id}</div>
          <div class="difficulty-block">
            <span class="difficulty-label">Сложность:</span>
            <div class="stars">${this._stars(cw.difficulty)}</div>
          </div>
        </div>`;
      card.addEventListener('click', () => { this.sound.playSelect(); this._animateCardOpen(svgId, cw); });
      this.$cards.appendChild(card);
    });
  }

  _animateCardOpen(svgId, cw) {
    const svg = document.getElementById(svgId);
    if (!svg) { this._openCrossword(cw); return; }

    const whites = [...svg.querySelectorAll('rect[id]')];
    if (!whites.length) { this._openCrossword(cw); return; }

    const shuffled = whites.sort(() => Math.random() - 0.5);
    const step = Math.min(30, Math.floor(380 / shuffled.length));

    shuffled.forEach((rect, i) => {
      setTimeout(() => {
        rect.setAttribute('fill', '#059fdd');
        rect.setAttribute('stroke', '#0480b3');
      }, i * step);
    });

    // Сбрасываем обратно в белый сразу после завершения заполнения
    const resetAt = shuffled.length * step + 60;
    setTimeout(() => {
      whites.forEach(rect => {
        rect.setAttribute('fill', '#ffffff');
        rect.setAttribute('stroke', '#d0d1d4');
      });
    }, resetAt);

    setTimeout(() => this._openCrossword(cw), resetAt + 40);
  }

  _stars(n) {
    return [1,2,3].map(i =>
      `<span class="star ${i <= n ? 'filled' : 'empty'}">★</span>`
    ).join('');
  }

  _miniGrid(cw, svgId) {
    const rows = cw.grid.length, cols = cw.grid[0].length;
    const unit = 10, gap = 2;
    const vbW  = cols * unit + (cols - 1) * gap;
    const vbH  = rows * unit + (rows - 1) * gap;

    let rects = '';
    let wi = 0;
    cw.grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        const x = c * (unit + gap);
        const y = r * (unit + gap);
        const fill   = cell === '.' ? '#a0a2a8' : '#ffffff';
        const stroke = cell === '.' ? 'none'    : '#d0d1d4';
        const idAttr = cell !== '.' ? ` id="${svgId}-w${wi++}"` : '';
        rects += `<rect${idAttr} x="${x}" y="${y}" width="${unit}" height="${unit}" rx="1.5" ry="1.5" fill="${fill}" stroke="${stroke}" stroke-width="0.8"/>`;
      });
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" id="${svgId}" width="100%" height="100%" viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet" style="display:block">${rects}</svg>`;
  }

  _openCrossword(cw) {
    this.currentCrossword = cw;
    this.userAnswers  = {};
    this.correctWords = new Set();
    this.activeWord   = null;
    this.activeCell   = null;

    this.$title.textContent = cw.title;
    this.cluePanel.clear();
    this.keyboard.render();
    this._showGame();
  }

  _activateFirstWord() {
    if (!this.currentCrossword?.words.length) return;
    const first = this.currentCrossword.words[0];
    this._setActiveWord(first, first.row, first.col);
  }

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
    const startCell = this._firstFreeCell(word);
    this._setActiveWord(word, startCell.row, startCell.col);
  }

  _typeLetter(letter) {
    if (!this.activeCell || !this.activeWord) return;
    const { row, col } = this.activeCell;
    const cellEl = this.grid.getCell(row, col);

    if (cellEl?.classList.contains('correct')) {
      this._moveCursor(1);
      return;
    }

    this.sound.playTick();
    this.userAnswers[`${row}-${col}`] = letter;
    this.grid.setLetter(row, col, letter);
    this._checkAllWordsAtCell(row, col);
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
    const w = this.activeWord;

    let pos = w.direction === 'across'
      ? this.activeCell.col - w.col
      : this.activeCell.row - w.row;

    let newPos = pos + dir;
    while (newPos >= 0 && newPos < w.length) {
      const newRow = w.direction === 'across' ? w.row         : w.row + newPos;
      const newCol = w.direction === 'across' ? w.col + newPos : w.col;
      const cellEl = this.grid.getCell(newRow, newCol);
      if (!cellEl?.classList.contains('correct')) {
        this.activeCell = { row: newRow, col: newCol };
        this.grid.setCursor(newRow, newCol);
        return;
      }
      newPos += dir;
    }
  }

  _checkWord(word) {
    if (this.correctWords.has(word.number)) return;
    for (let i = 0; i < word.length; i++) {
      const r = word.direction === 'across' ? word.row       : word.row + i;
      const c = word.direction === 'across' ? word.col + i   : word.col;
      const cellEl = this.grid.getCell(r, c);
      if (cellEl?.classList.contains('correct')) continue;
      const typed    = (this.userAnswers[`${r}-${c}`] || '').toUpperCase();
      const expected = (word.answer[i] || '').toUpperCase();
      if (!typed || typed !== expected) return;
    }
    this.correctWords.add(word.number);
    this.grid.lockWord(word);

    if (this.correctWords.size === this.currentCrossword.words.length) {
      this.sound.playWord();
      setTimeout(() => { this.sound.playWin(); this._showWin(); }, 400);
    } else {
      this.sound.playWord();
      setTimeout(() => this._jumpToNextUnsolved(), 300);
    }
  }

  _jumpToNextUnsolved() {
    const list = this.currentCrossword.words;
    const total = list.length;
    const startIdx = this.activeWordIndex;
    for (let i = 1; i < total; i++) {
      const idx = (startIdx + i) % total;
      const candidate = list[idx];
      if (!this.correctWords.has(candidate.number)) {
        const startCell = this._firstFreeCell(candidate);
        this._setActiveWord(candidate, startCell.row, startCell.col);
        return;
      }
    }
  }

  _firstFreeCell(word) {
    for (let i = 0; i < word.length; i++) {
      const r = word.direction === 'across' ? word.row       : word.row + i;
      const c = word.direction === 'across' ? word.col + i   : word.col;
      const cellEl = this.grid.getCell(r, c);
      if (!cellEl?.classList.contains('correct')) return { row: r, col: c };
    }
    return { row: word.row, col: word.col };
  }

  _checkAllWordsAtCell(row, col) {
    const words = this.currentCrossword.words.filter(
      w => this._wordContainsCell(w, row, col)
    );
    words.forEach(w => this._checkWord(w));
  }

  _showWin() {
    this.$winSubtitle.textContent = `«${this.currentCrossword.title}» решён!`;
    this.$winOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  _hideWin() {
    this.$winOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  _restartCrossword() {
    this._hideWin();
    this._openCrossword(this.currentCrossword);
  }

  _showMain() {
    this.$game.classList.remove('active');
    this.$main.classList.add('active');
    window.scrollTo({ top: 0 });
  }

  _showGame() {
    this.$main.classList.remove('active');
    this.$game.classList.add('active');
    window.scrollTo({ top: 0 });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!this.currentCrossword) return;
      this.grid.render(this.currentCrossword, (r, c, num) => this._onCellClick(r, c));
      this._restoreState();
      this._activateFirstWord();
    }));
  }

  _restoreState() {
    for (const [key, letter] of Object.entries(this.userAnswers)) {
      const [r, c] = key.split('-').map(Number);
      this.grid.setLetter(r, c, letter);
    }
    for (const wordNum of this.correctWords) {
      const word = this.currentCrossword.words.find(w => w.number === wordNum);
      if (word) this.grid.lockWord(word);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new CrosswordApp();

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
      app._restoreState();
      if (app.activeWord) {
        app._setActiveWord(app.activeWord, app.activeCell.row, app.activeCell.col);
      }
    }, 120);
  });
});