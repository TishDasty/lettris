const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const SPEEDS = [1000, 800, 600, 400, 300, 200, 100]; // ms per drop by level

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const scoreboard = document.getElementById('scoreboard');

let grid;
let currentPiece;
let currentX, currentY;
let dropCounter = 0;
let dropInterval = SPEEDS[0];
let lastTime = 0;
let score = 0;
let level = 1;
let linesCleared = 0;
let animationId;
let paused = false;
let gameOver = false;

const COLORS = [
  null,
  '#00f0f0', // I
  '#0000f0', // J
  '#f0a000', // L
  '#f0f000', // O
  '#00f000', // S
  '#a000f0', // T
  '#f00000'  // Z
];

// Все фигуры с поворотами
const PIECES = {
  'I': [
    [
      [0,0,0,0],
      [1,1,1,1],
      [0,0,0,0],
      [0,0,0,0]
    ],
    [
      [0,0,1,0],
      [0,0,1,0],
      [0,0,1,0],
      [0,0,1,0]
    ]
  ],
  'J': [
    [
      [2,0,0],
      [2,2,2],
      [0,0,0]
    ],
    [
      [0,2,2],
      [0,2,0],
      [0,2,0]
    ],
    [
      [0,0,0],
      [2,2,2],
      [0,0,2]
    ],
    [
      [0,2,0],
      [0,2,0],
      [2,2,0]
    ]
  ],
  'L': [
    [
      [0,0,3],
      [3,3,3],
      [0,0,0]
    ],
    [
      [0,3,0],
      [0,3,0],
      [0,3,3]
    ],
    [
      [0,0,0],
      [3,3,3],
      [3,0,0]
    ],
    [
      [3,3,0],
      [0,3,0],
      [0,3,0]
    ]
  ],
  'O': [
    [
      [4,4],
      [4,4]
    ]
  ],
  'S': [
    [
      [0,5,5],
      [5,5,0],
      [0,0,0]
    ],
    [
      [0,5,0],
      [0,5,5],
      [0,0,5]
    ]
  ],
  'T': [
    [
      [0,6,0],
      [6,6,6],
      [0,0,0]
    ],
    [
      [0,6,0],
      [0,6,6],
      [0,6,0]
    ],
    [
      [0,0,0],
      [6,6,6],
      [0,6,0]
    ],
    [
      [0,6,0],
      [6,6,0],
      [0,6,0]
    ]
  ],
  'Z': [
    [
      [7,7,0],
      [0,7,7],
      [0,0,0]
    ],
    [
      [0,0,7],
      [0,7,7],
      [0,7,0]
    ]
  ]
};

function createGrid() {
  return Array.from({length: ROWS}, () => Array(COLS).fill(0));
}

function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawGrid() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for(let y = 0; y < ROWS; y++) {
    for(let x = 0; x < COLS; x++) {
      if(grid[y][x] !== 0) {
        drawBlock(x, y, COLORS[grid[y][x]]);
      }
    }
  }
}

function drawPiece(piece, xPos, yPos) {
  const matrix = piece.rotations[piece.rotationIndex];
  for(let y = 0; y < matrix.length; y++) {
    for(let x = 0; x < matrix[y].length; x++) {
      if(matrix[y][x] !== 0) {
        drawBlock(x + xPos, y + yPos, COLORS[matrix[y][x]]);
      }
    }
  }
}

function collide(piece, xPos, yPos) {
  const matrix = piece.rotations[piece.rotationIndex];
  for(let y = 0; y < matrix.length; y++) {
    for(let x = 0; x < matrix[y].length; x++) {
      if(matrix[y][x] !== 0) {
        let newX = xPos + x;
        let newY = yPos + y;
        if(newX < 0 || newX >= COLS || newY >= ROWS) return true;
        if(newY >= 0 && grid[newY][newX] !== 0) return true;
      }
    }
  }
  return false;
}

function merge(piece, xPos, yPos) {
  const matrix = piece.rotations[piece.rotationIndex];
  for(let y = 0; y < matrix.length; y++) {
    for(let x = 0; x < matrix[y].length; x++) {
      if(matrix[y][x] !== 0) {
        if(yPos + y < 0) {
          // Game Over
          gameOver = true;
          return;
        }
        grid[yPos + y][xPos + x] = matrix[y][x];
      }
    }
  }
}

function rotate(piece) {
  const len = piece.rotations.length;
  const oldIndex = piece.rotationIndex;
  piece.rotationIndex = (piece.rotationIndex + 1) % len;

  // Проверим столкновение, если есть - сдвинем в сторону
  let offset = 0;
  while(collide(piece, currentX + offset, currentY)) {
    offset = offset > 0 ? -offset : 1 - offset;
    if(offset > matrixWidth(piece)) {
      piece.rotationIndex = oldIndex;
      return;
    }
  }
  currentX += offset;
}

function matrixWidth(piece) {
  return piece.rotations[piece.rotationIndex][0].length;
}

function matrixHeight(piece) {
  return piece.rotations[piece.rotationIndex].length;
}

function clearLines() {
  let lines = 0;
  for(let y = ROWS -1; y >=0; y--) {
    if(grid[y].every(cell => cell !== 0)) {
      grid.splice(y, 1);
      grid.unshift(new Array(COLS).fill(0));
      lines++;
      y++;
    }
  }
  if(lines > 0) {
    linesCleared += lines;
    score += (lines * 100) * level;
    if(linesCleared >= level * 10) {
      level++;
      dropInterval = SPEEDS[Math.min(level - 1, SPEEDS.length - 1)];
    }
    updateScoreboard();
  }
}

function updateScoreboard() {
  scoreboard.textContent = `Очки: ${score} | Уровень: ${level}`;
}

function newPiece() {
  const types = Object.keys(PIECES);
  const type = types[Math.floor(Math.random() * types.length)];
  const rotations = PIECES[type];
  return {
    type,
    rotations,
    rotationIndex: 0
  };
}

function resetGame() {
  grid = createGrid();
  currentPiece = newPiece();
  currentX = Math.floor(COLS / 2) - Math.floor(matrixWidth(currentPiece) / 2);
  currentY = -matrixHeight(currentPiece);
  dropCounter = 0;
  dropInterval = SPEEDS[0];
  score = 0;
  level = 1;
  linesCleared = 0;
  paused = false;
  gameOver = false;
  updateScoreboard();
}

function drop() {
  if(paused || gameOver) return;
  if(!collide(currentPiece, currentX, currentY + 1)) {
    currentY++;
  } else {
    merge(currentPiece, currentX, currentY);
    clearLines();
    currentPiece = newPiece();
    currentX = Math.floor(COLS / 2) - Math.floor(matrixWidth(currentPiece) / 2);
    currentY = -matrixHeight(currentPiece);
    if(collide(currentPiece, currentX, currentY)) {
      gameOver = true;
      alert('Игра окончена!');
      cancelAnimationFrame(animationId);
      pauseBtn.disabled = true;
      startBtn.disabled = false;
      return;
    }
  }
}

function update(time = 0) {
  if(paused || gameOver) return;

  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;

  if(dropCounter > dropInterval) {
    drop();
    dropCounter = 0;
  }
  drawGrid();
  drawPiece(currentPiece, currentX, currentY);

  animationId = requestAnimationFrame(update);
}

// Управление

function move(dir) {
  if(paused || gameOver) return;
  if(!collide(currentPiece, currentX + dir, currentY)) {
    currentX += dir;
  }
}

function hardDrop() {
  while(!collide(currentPiece, currentX, currentY +1)) {
    currentY++;
  }
  drop();
}

function rotatePiece() {
  if(paused || gameOver) return;
  rotate(currentPiece);
}

startBtn.addEventListener('click', () => {
  if(gameOver) resetGame();
  paused = false;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  lastTime = 0;
  update();
});

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  if(!paused) {
    lastTime = 0;
    update();
  }
});

window.addEventListener('keydown', (e) => {
  if(gameOver || paused) return;
  switch(e.key) {
    case 'ArrowLeft': move(-1); break;
    case 'ArrowRight': move(1); break;
    case 'ArrowDown': drop(); break;
    case 'ArrowUp': rotatePiece(); break;
    case ' ': hardDrop(); break;
  }
});

// Сенсорное управление (свайпы и тап)
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

canvas.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
  e.preventDefault();
});
canvas.addEventListener('touchend', e => {
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const dt = Date.now() - touchStartTime;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const TAP_MAX_TIME = 200;
  const TAP_MAX_DISTANCE = 10;

  if(absDx < TAP_MAX_DISTANCE && absDy < TAP_MAX_DISTANCE && dt < TAP_MAX_TIME) {
    rotatePiece();
  } else if(absDx > absDy) {
    // горизонтальный свайп
    if(dx > 0) move(1);
    else move(-1);
  } else {
    // вертикальный свайп
    if(dy > 0) drop();
  }

  e.preventDefault();
});

