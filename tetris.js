const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const ROWS = 20;
const COLS = 12;

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

const arena = createMatrix(COLS, ROWS);

const colors = [
  null,
  '#00f0f0', // I
  '#0000f0', // J
  '#f0a000', // L
  '#f0f000', // O
  '#00f000', // S
  '#a000f0', // T
  '#f00000'  // Z
];

const pieces = {
  'I': [
    [0,0,0,0],
    [1,1,1,1],
    [0,0,0,0],
    [0,0,0,0],
  ],
  'J': [
    [2,0,0],
    [2,2,2],
    [0,0,0],
  ],
  'L': [
    [0,0,3],
    [3,3,3],
    [0,0,0],
  ],
  'O': [
    [4,4],
    [4,4],
  ],
  'S': [
    [0,5,5],
    [5,5,0],
    [0,0,0],
  ],
  'T': [
    [0,6,0],
    [6,6,6],
    [0,0,0],
  ],
  'Z': [
    [7,7,0],
    [0,7,7],
    [0,0,0],
  ]
};

function createPiece(type) {
  return pieces[type].map(row => row.slice());
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
        context.strokeStyle = '#000';
        context.lineWidth = 0.05;
        context.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
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

function playerReset() {
  const piecesTypes = 'TJLOSZI';
  player.matrix = createPiece(piecesTypes[(piecesTypes.length * Math.random()) | 0]);
  player.pos.y = 0;
  player.pos.x = ((COLS / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    score = 0;
    updateScore();
    dropInterval = 1000;
    pauseGame();
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
    ++y;
    rowCount++;
  }
  if (rowCount > 0) {
    score += rowCount * rowCount * 100;
    updateScore();
    dropInterval = Math.max(100, dropInterval - rowCount * 20);
  }
}

function draw() {
  context.fillStyle = '#222';
  context.fillRect(0, 0, canvas.width / 20, canvas.height / 20);
  drawMatrix(arena, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}

function update(time = 0) {
  if (!gameRunning) return;

  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
    dropCounter = 0;
  }

  draw();
  requestAnimationFrame(update);
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    playerReset();
  }
}

function updateScore() {
  document.getElementById('score').innerText = score;
}

function pauseGame() {
  gameRunning = false;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = 'Пауза';
}

function startGame() {
  gameRunning = true;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  pauseBtn.textContent = 'Пауза';
  score = 0;
  updateScore();
  dropInterval = 1000;
  dropCounter = 0;
  lastTime = performance.now();
  playerReset();
  update();
}

// Сенсорное управление (свайпы)
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
});

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  if (!gameRunning) return;
  const touch = e.changedTouches[0];
  touchEndX = touch.clientX;
  touchEndY = touch.clientY;

  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 20) {
      // свайп вправо
      moveRight();
    } else if (dx < -20) {
      // свайп влево
      moveLeft();
    }
  } else {
    if (dy > 20) {
      // свайп вниз (ускоренный сброс)
      playerDrop();
    } else if (dy < -20) {
      // свайп вверх (поворот)
      playerRotate(1);
    }
  }
});

function moveLeft() {
  player.pos.x--;
  if (collide(arena, player)) player.pos.x++;
}

function moveRight() {
  player.pos.x++;
  if (collide(arena, player)) player.pos.x--;
}

document.addEventListener('keydown', e => {
  if (!gameRunning) return;
  if (e.key === 'ArrowLeft') {
    moveLeft();
  } else if (e.key === 'ArrowRight') {
    moveRight();
  } else if (e.key === 'ArrowDown') {
    playerDrop();
  } else if (e.key === 'ArrowUp') {
    playerRotate(1);
  }
});

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');

startBtn.addEventListener('click', () => {
  if (!gameRunning) startGame();
});

pauseBtn.addEventListener('click', () => {
  if (gameRunning) {
    gameRunning = false;
    pauseBtn.textContent = 'Продолжить';
  } else {
    gameRunning = true;
    pauseBtn.textContent = 'Пауза';
    lastTime = performance.now();
    update();
  }
});

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let gameRunning = false;

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
};
