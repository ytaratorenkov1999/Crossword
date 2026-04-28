// =============================================
// CROSSWORD APP
// =============================================

class CrosswordApp {
  constructor() {
    this.currentCrossword = null;
    this.activeWord = null;
    this.activeCell = null;
    this.userAnswers = {};
    this.correctWords = new Set();
    this.activeWordIndex = 0;

    this.mainScreen  = document.getElementById('main-screen');
    this.gameScreen  = document.getElementById('game-screen');
    this.gridEl      = document.getElementById('crossword-grid');
    this.clueText    = document.getElementById('clue-text');
    this.gameTitle   = document.getElementById('game-title');
    this.gameStars   = document.getElementById('game-stars');
    this.keyboardEl  = document.getElementById('keyboard');
    this.backBtn     = document.getElementById('back-to-main');
    this.arrowLeft   = document.getElementById('clue-arrow-left');
    this.arrowRight  = document.getElementById('clue-arrow-right');
    this.closeMain   = document.getElementById('close-main');

    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalNum     = document.getElementById('modal-num');
    this.modalClue    = document.getElementById('modal-clue');
    this.modalClose   = document.getElementById('modal-close');
    this.modalOk      = document.getElementById('modal-ok');

    this.init();
  }

  init() {
    this.renderCards();

    this.backBtn.addEventListener('click', () => this.showMain());
    this.arrowLeft.addEventListener('click', () => this.navigateClue(-1));
    this.arrowRight.addEventListener('click', () => this.navigateClue(1));

    this.clueText.addEventListener('click', () => {
      if (this.activeWord) this.showModal(this.activeWord);
    });

    this.closeMain.addEventListener('click', () => {
      if (window.history.length > 1) window.history.back();
      else window.close();
    });

    this.modalClose.addEventListener('click', () => this.hideModal());
    this.modalOk.addEventListener('click', () => this.hideModal());
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.hideModal();
    });
  }

  // ---- MAIN SCREEN ----

  renderCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    crosswordsData.forEach((cw, idx) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.animationDelay = `${idx * 0.07}s`;

      card.innerHTML = `
        <div class="card-grid-preview">${this.buildMiniGrid(cw)}</div>
        <div class="card-footer">
          <div class="card-title">${cw.title}</div>
          <div class="card-meta">
            <div class="stars">${this.buildStars(cw.difficulty)}</div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => this.openCrossword(cw));
      container.appendChild(card);
    });
  }

  buildStars(n) {
    let html = '';
    for (let i = 1; i <= 3; i++) {
      html += `<span class="star ${i <= n ? 'filled' : 'empty'}">★</span>`;
    }
    return html;
  }

  buildMiniGrid(cw) {
    const rows = cw.grid.length;
    const cols = cw.grid[0].length;
    let html = `<div class="mini-grid" style="--cols:${cols};--rows:${rows}">`;
    cw.grid.forEach(row => {
      row.forEach(cell => {
        html += `<div class="mini-cell ${cell === '.' ? 'black' : 'white'}"></div>`;
      });
    });
    html += '</div>';
    return html;
  }

  // ---- GAME SCREEN ----

  openCrossword(cw) {
    this.currentCrossword = cw;
    this.userAnswers = {};
    this.correctWords = new Set();
    this.activeWord = null;
    this.activeCell = null;

    this.gameTitle.textContent = cw.title;
    this.gameStars.innerHTML = this.buildStars(cw.difficulty);
    this.clueText.textContent = '';

    this.renderGrid(cw);
    this.renderKeyboard();
    this.showGame();
  }

  computeCellSize(cw) {
    const wrapper = document.getElementById('crossword-wrapper');
    const wrapW = wrapper.clientWidth - 16;
    const wrapH = wrapper.clientHeight - 16;
    const rows = cw.grid.length;
    const cols = cw.grid[0].length;
    const gap = 3;
    const byW = Math.floor((wrapW - gap * (cols - 1)) / cols);
    const byH = Math.floor((wrapH - gap * (rows - 1)) / rows);
    return Math.max(22, Math.min(byW, byH, 58));
  }

  renderGrid(cw) {
    const rows = cw.grid.length;
    const cols = cw.grid[0].length;
    this.gridEl.innerHTML = '';

    const cellSize = this.computeCellSize(cw);
    const numSize  = Math.max(7, Math.round(cellSize * 0.22)) + 'px';
    const letSize  = Math.max(11, Math.round(cellSize * 0.42)) + 'px';

    this.gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    this.gridEl.style.gridTemplateRows    = `repeat(${rows}, ${cellSize}px)`;
    this.gridEl.style.gap = '3px';

    const wordStartMap = {};
    cw.words.forEach(w => { wordStartMap[`${w.row}-${w.col}`] = w.number; });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellVal = cw.grid[r][c];
        const div = document.createElement('div');
        div.dataset.row = r;
        div.dataset.col = c;
        div.style.width  = cellSize + 'px';
        div.style.height = cellSize + 'px';

        if (cellVal === '.') {
          div.className = 'gcell black';
        } else {
          div.className = 'gcell white';
          const num = wordStartMap[`${r}-${c}`];
          if (num !== undefined) {
            const numSpan = document.createElement('span');
            numSpan.className = 'cell-num';
            numSpan.textContent = num;
            numSpan.style.fontSize = numSize;
            div.appendChild(numSpan);
          }
          const letterSpan = document.createElement('span');
          letterSpan.className = 'cell-letter';
          letterSpan.id = `cell-${r}-${c}`;
          letterSpan.style.fontSize = letSize;
          div.appendChild(letterSpan);
          div.addEventListener('click', () => this.onCellClick(r, c, div, num));
        }
        this.gridEl.appendChild(div);
      }
    }
  }

  _activateFirstWord() {
    if (!this.currentCrossword || !this.currentCrossword.words.length) return;
    const first = this.currentCrossword.words[0];
    this.setActiveWord(first, first.row, first.col);
  }

  onCellClick(row, col, div, numOnCell) {
    const cw = this.currentCrossword;
    const matchingWords = cw.words.filter(w => this.wordContainsCell(w, row, col));
    if (!matchingWords.length) return;

    let word;
    if (this.activeCell && this.activeCell.row === row && this.activeCell.col === col) {
      const idx = matchingWords.findIndex(w => w === this.activeWord);
      word = matchingWords[(idx + 1) % matchingWords.length];
    } else {
      word = matchingWords.find(w => w.direction === 'across') || matchingWords[0];
    }
    this.setActiveWord(word, row, col);
  }

  setActiveWord(word, row, col) {
    this.activeWord = word;
    this.activeCell = { row, col };

    document.querySelectorAll('.gcell.white:not(.correct)').forEach(el => {
      el.classList.remove('active-word', 'active-cursor');
    });

    for (let i = 0; i < word.length; i++) {
      const r = word.direction === 'across' ? word.row       : word.row + i;
      const c = word.direction === 'across' ? word.col + i   : word.col;
      const el = this.gridEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
      if (el && !el.classList.contains('correct')) el.classList.add('active-word');
    }

    const cursorEl = this.gridEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cursorEl && !cursorEl.classList.contains('correct')) {
      cursorEl.classList.remove('active-word');
      cursorEl.classList.add('active-cursor');
    }

    const dir = word.direction === 'across' ? '→' : '↓';
    this.clueText.textContent = `${word.number}. ${dir} ${word.clue}`;
    this.activeWordIndex = this.currentCrossword.words.indexOf(word);
  }

  wordContainsCell(word, row, col) {
    if (word.direction === 'across') {
      return row === word.row && col >= word.col && col < word.col + word.length;
    } else {
      return col === word.col && row >= word.row && row < word.row + word.length;
    }
  }

  navigateClue(dir) {
    const list = this.currentCrossword.words;
    this.activeWordIndex = (this.activeWordIndex + dir + list.length) % list.length;
    const word = list[this.activeWordIndex];
    this.setActiveWord(word, word.row, word.col);
  }

  // ---- MODAL ----

  showModal(word) {
    const dir = word.direction === 'across' ? 'По горизонтали' : 'По вертикали';
    this.modalNum.textContent  = `${word.number}. ${dir}`;
    this.modalClue.textContent = word.clue;
    this.modalOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  hideModal() {
    this.modalOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  // ---- KEYBOARD ----

  renderKeyboard() {
    const rows = ['ЙЦУКЕНГШЩЗХ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮ'];
    this.keyboardEl.innerHTML = '';

    rows.forEach((row, ri) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'kb-row';
      [...row].forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'kb-key';
        btn.textContent = letter;
        btn.addEventListener('click', () => this.typeLetter(letter));
        rowDiv.appendChild(btn);
      });
      if (ri === rows.length - 1) {
        const bsp = document.createElement('button');
        bsp.className = 'kb-key kb-backspace';
        bsp.innerHTML = '⌫';
        bsp.addEventListener('click', () => this.typeBackspace());
        rowDiv.appendChild(bsp);
      }
      this.keyboardEl.appendChild(rowDiv);
    });
  }

  typeLetter(letter) {
    if (!this.activeCell || !this.activeWord) return;
    const { row, col } = this.activeCell;
    const el = this.gridEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (el && el.classList.contains('correct')) return;

    this.userAnswers[`${row}-${col}`] = letter;
    const letterEl = document.getElementById(`cell-${row}-${col}`);
    if (letterEl) letterEl.textContent = letter;

    this.checkWord(this.activeWord);
    this.moveCursor(1);
  }

  typeBackspace() {
    if (!this.activeCell || !this.activeWord) return;
    const { row, col } = this.activeCell;
    const key = `${row}-${col}`;
    const el = this.gridEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (el && el.classList.contains('correct')) { this.moveCursor(-1); return; }

    if (this.userAnswers[key]) {
      delete this.userAnswers[key];
      const letterEl = document.getElementById(`cell-${row}-${col}`);
      if (letterEl) letterEl.textContent = '';
    } else {
      this.moveCursor(-1);
    }
  }

  moveCursor(dir) {
    if (!this.activeWord || !this.activeCell) return;
    const w = this.activeWord;
    const pos = w.direction === 'across' ? this.activeCell.col - w.col : this.activeCell.row - w.row;
    const newPos = pos + dir;
    if (newPos < 0 || newPos >= w.length) return;

    const newRow = w.direction === 'across' ? w.row       : w.row + newPos;
    const newCol = w.direction === 'across' ? w.col + newPos : w.col;

    this.activeCell = { row: newRow, col: newCol };
    document.querySelectorAll('.gcell.active-cursor').forEach(el => el.classList.remove('active-cursor'));
    const el = this.gridEl.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
    if (el && !el.classList.contains('correct')) el.classList.add('active-cursor');
  }

  // ---- CHECK ANSWER ----

  checkWord(word) {
    if (this.correctWords.has(word.number)) return;
    for (let i = 0; i < word.length; i++) {
      const r = word.direction === 'across' ? word.row       : word.row + i;
      const c = word.direction === 'across' ? word.col + i   : word.col;
      const typed    = (this.userAnswers[`${r}-${c}`] || '').toUpperCase();
      const expected = (word.answer[i] || '').toUpperCase();
      if (!typed || typed !== expected) return;
    }
    this.correctWords.add(word.number);
    for (let i = 0; i < word.length; i++) {
      const r = word.direction === 'across' ? word.row       : word.row + i;
      const c = word.direction === 'across' ? word.col + i   : word.col;
      const el = this.gridEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
      if (el) {
        el.classList.remove('active-word', 'active-cursor');
        el.classList.add('correct');
      }
    }
  }

  // ---- SCREEN NAV ----

  showMain() {
    this.gameScreen.classList.remove('active');
    this.mainScreen.classList.add('active');
    window.scrollTo({ top: 0 });
  }

  showGame() {
    this.mainScreen.classList.remove('active');
    this.gameScreen.classList.add('active');
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.currentCrossword) {
        this.renderGrid(this.currentCrossword);
        this._activateFirstWord();
      }
    }));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new CrosswordApp();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (app.currentCrossword &&
          document.getElementById('game-screen').classList.contains('active')) {
        app.renderGrid(app.currentCrossword);
        if (app.activeWord) {
          app.setActiveWord(app.activeWord, app.activeCell.row, app.activeCell.col);
        }
      }
    }, 150);
  });
});