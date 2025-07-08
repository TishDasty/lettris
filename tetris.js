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
  return
