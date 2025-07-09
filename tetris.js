'use strict';
const blockImages = {};

['I', 'J', 'L', 'O', 'S', 'T', 'Z'].forEach(type => {
  const img = new Image();
  img.src = `img/${type}.png`;
  img.onload = () => console.log(`✅ Картинка ${type}.png загружена`);
  img.onerror = () => console.error(`❌ Ошибка загрузки img/${type}.png`);
  blockImages[type] = img;
});

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const downBtn = document.getElementById('downBtn');
const rotateBtn = document.getElementById('rotateBtn');
const scoreElem = document.getElementById('score');
const hardDropBtn = document.getElementById('hardDropBtn');

const arenaWidth = 12;
const arenaHeight = 20;

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

const arena = createMatrix(arenaWidth, arenaHeight);

function playerHardDrop() {
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  arenaSweep();
  playerReset();
  dropCounter = 0;
}

const pieces = {
  'I': [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  'J': [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0]
  ],
  'L': [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0]
  ],
  'O': [
    [4, 4],
    [4, 4]
  ],
  'S': [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0]
  ],
  'T': [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0]
  ],
  'Z': [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0]
  ]
};

const colors = [
  null,
  '#00ffff', // I
  '#0000ff', // J
  '#ffa500', // L
  '#ffff00', // O
  '#00ff00', // S
  '#800080', // T
  '#ff0000'  // Z
];

function getTypeByValue(value) {
  switch (value) {
    case 1: return 'I';
    case 2: return 'J';
    case 3: return 'L';
    case 4: return 'O';
    case 5: return 'S';
    case 6: return 'T';
    case 7: return 'Z';
    default: return null;
  }
}

function drawArena(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const type = getTypeByValue(value);
        if (blockImages[type] && blockImages[type].complete) {
          context.drawImage(
            blockImages[type],
            (x + offset.x) * 20,
            (y + offset.y) * 20,
            20,
            20
          );
        } else {
          context.fillStyle = colors[value];
          context.fillRect(x + offset.x, y + offset.y, 1, 1);
          context.strokeStyle = '#222';
          context.lineWidth = 0.05;
          context.strokeRect(x + offset.x, y + offset.y, 1, 1);
        }
      }
    });
  });
}

// ✅ Обновлённая отрисовка игрока (без искажения)
function drawPlayer(player) {
  const matrix = player.matrix;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const type = getTypeByValue(value);
        const img = blockImages[type];
        if (img && img.complete) {
          context.drawImage(
            img,
            (player.pos.x + x) * 20,
            (player.pos.y + y) * 20,
            20,
            20
          );
        } else {
          context.fillStyle = colors[value];
          context.fillRect(player.pos.x + x, player.pos.y + y, 1, 1);
          context.strokeStyle = '#222';
          context.lineWidth = 0.05;
          context.strokeRect(player.pos.x + x, player.pos.y + y, 1, 1);
        }
      }
    });
  });
}

function clear() {
  context.fillStyle = '#111';
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function draw() {
  clear();
  drawArena(arena, { x: 0, y: 0 });
  drawPlayer(player);
}

function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 &&
        (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
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

function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    y++;
    rowCount++;
  }
  if (rowCount > 0) {
    linesCleared += rowCount;
    score += calculateScore(rowCount, level);
    updateLevel();
    updateScore();
    dropInterval = Math.max(100, 1000 - (level - 1) * 100);
  }
}

function calculateScore(rows, level) {
  const scoring = [0, 40, 100, 300, 1200];
  return scoring[rows] * level;
}

function updateLevel() {
  level = Math.floor(linesCleared / 10) + 1;
}

function updateScore() {
  scoreElem.textContent = `Очки: ${score} (Уровень: ${level})`;
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
  let offset = 1;
  rotate(player.matrix, dir);
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

function createPiece(type) {
  return pieces[type];
}

function playerReset() {
  const types = 'TJLOSZI';
  player.matrix = createPiece(types[Math.floor(Math.random() * types.length)]);
  player.pos.y = 0;
  player.pos.x = Math.floor((arenaWidth / 2) - (player.matrix[0].length / 2));
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    alert('Игра окончена! Твой счёт: ' + score);
    gameRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    playerReset();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameRunning = false;
let paused = false;

let score = 0;
let level = 1;
let linesCleared = 0;

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0
};

function update(time = 0) {
  if (!gameRunning || paused) {
    lastTime = time;
    requestAnimationFrame(update);
    return;
  }
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }

  draw();
  requestAnimationFrame(update);
}

// Кнопки управления
startBtn.addEventListener('click', () => {
  if (!gameRunning) {
    gameRunning = true;
    paused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Пауза';
    score = 0;
    linesCleared = 0;
    level = 1;
    dropInterval = 1000;
    updateScore();
    arena.forEach(row => row.fill(0));
    playerReset();
    update();
  }
});

pauseBtn.addEventListener('click', () => {
  if (!gameRunning) return;
  paused = !paused;
  pauseBtn.textContent = paused ? 'Продолжить' : 'Пауза';
});

leftBtn.addEventListener('click', () => {
  if (gameRunning && !paused) playerMove(-1);
});

rightBtn.addEventListener('click', () => {
  if (gameRunning && !paused) playerMove(1);
});

downBtn.addEventListener('click', () => {
  if (gameRunning && !paused) playerDrop();
});

rotateBtn.addEventListener('click', () => {
  if (gameRunning && !paused) playerRotate(1);
});

hardDropBtn.addEventListener('click', () => {
  if (gameRunning && !paused) {
    playerHardDrop();
  }
});

document.addEventListener('keydown', event => {
  if (!gameRunning || paused) return;
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

// Сенсорное управление
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  if (e.changedTouches.length === 1) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const minSwipeDistance = 20;

    if (Math.max(absDx, absDy) > minSwipeDistance) {
      if (absDx > absDy) {
        if (dx > 0) playerMove(1);
        else playerMove(-1);
      } else {
        if (dy > 0) playerDrop();
        else playerRotate(1);
      }
    } else {
      playerRotate(1); // короткий тап = поворот
    }
  }
}, { passive: false });

// Блокировка масштабирования
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, false);
