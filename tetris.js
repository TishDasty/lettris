'use strict';

const canvas = document.getElementById('tetrisCanvas');
const context = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const scoreElem = document.getElementById('score');

context.scale(24, 24); // масштабируем для удобства рисования (24px — размер клетки)

const arenaWidth = 10;
const arenaHeight = 20;

let arena = createMatrix(arenaWidth, arenaHeight);

let colors = [
  null,
  '#FF0D72', // T
  '#0DC2FF', // I
  '#0DFF72', // S
  '#F538FF', // Z
  '#FF8E0D', // L
  '#FFE138', // J
  '#3877FF', // O
];

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let gameOver = false;

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
};

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function createPiece(type) {
  switch (type) {
    case 'T':
      return [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ];
    case 'O':
      return [
        [2, 2],
        [2, 2],
      ];
    case 'L':
      return [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0],
      ];
    case 'J':
      return [
        [4, 0, 0],
        [4, 4, 4],
        [0, 0, 0],
      ];
    case 'I':
      return [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
      ];
    case 'S':
      return [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0],
      ];
    case 'Z':
      return [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
      ];
  }
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
        // обводка для красоты
        context.strokeStyle = '#222';
        context.lineWidth = 0.05;
        context.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function draw() {
  context.fillStyle = '#111';
  context.fillRect(0, 0, canvas.width / 24, canvas.height / 24);

  drawMatrix(arena, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (
        m[y][x] !== 0 &&
        (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0
      ) {
        return true;
      }
    }
  }
  return false;
}

function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }

    // Удаляем заполненную линию
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;

    rowCount++;
  }
  if (rowCount > 0) {
    score += rowCount * 10 * rowCount;
    updateScore();
    // Ускоряем игру при наборе очков
    dropInterval = Math.max(100, dropInterval - rowCount * 50);
  }
}

function updateScore() {
  scoreElem.textContent = 'Очки: ' + score;
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    resetPlayer();
    arenaSweep();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  rotate(player.matrix, dir);
  let offset = 1;
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function resetPlayer() {
  const pieces = 'TJLOSZI';
  player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0]);
  player.pos.y = 0;
  player.pos.x = ((arenaWidth / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    score = 0;
    updateScore();
    dropInterval = 1000;
    gameOver = true;
    alert('Игра окончена! Нажмите "Старт" для новой игры.');
  }
}

function update(time = 0) {
  if (gameOver) return;
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

// Обработчики клавиатуры
document.addEventListener('keydown', event => {
  if (gameOver) return;
  if (event.key === 'ArrowLeft') {
    playerMove(-1);
  } else if (event.key === 'ArrowRight') {
    playerMove(1);
  } else if (event.key === 'ArrowDown') {
    playerDrop();
  } else if (event.key === 'ArrowUp') {
    playerRotate(1);
  }
});

// Сенсорное управление (для мобил)
let touchStartX = 0;
let touchStartY = 0;
const swipeThreshold = 30;

canvas.addEventListener('touchstart', e => {
  if (gameOver) return;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  e.preventDefault();
});

canvas.addEventListener('touchmove', e => {
  if (gameOver) return;
  const touch = e.touches[0];
  const diffX = touch.clientX - touchStartX;
  const diffY = touch.clientY - touchStartY;

  if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 0) {
      playerMove(1);
    } else {
      playerMove(-1);
    }
    touchStartX = touch.clientX;
  } else if (
    Math.abs(diffY) > swipeThreshold &&
    Math.abs(diffY) > Math.abs(diffX)
  ) {
    if (diffY > 0) {
      playerDrop();
      touchStartY = touch.clientY;
    }
  }
  e.preventDefault();
});

canvas.addEventListener('touchend', e => {
  if (gameOver) return;
  // Если был тап (без большого движения) — вращаем фигуру
  playerRotate(1);
  e.preventDefault();
});

// Кнопка Старт
startBtn.addEventListener('click', () => {
  if (!gameOver) {
    // Если игра идёт, сбросить и начать заново
    arena.forEach(row => row.fill(0));
    score = 0;
    updateScore();
    dropInterval = 1000;
  }
  gameOver = false;
  resetPlayer();
  dropCounter = 0;
  lastTime = 0;
  update();
});
