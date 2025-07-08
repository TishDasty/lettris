const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20); // Each block = 20px

const scoreEl = document.getElementById('score');

const matrix = [
  [[1,1,1],[0,1,0]],      // T
  [[0,2,2],[2,2,0]],      // S
  [[3,3,0],[0,3,3]],      // Z
  [[4,0,0],[4,4,4]],      // J
  [[0,0,5],[5,5,5]],      // L
  [[6,6],[6,6]],          // O
  [[0,0,0,0],[7,7,7,7]]   // I
];

const colors = [
  null,
  '#ff0d72', // T
  '#0dc2ff', // S
  '#0dff72', // Z
  '#f538ff', // J
  '#ff8e0d', // L
  '#ffe138', // O
  '#3877ff'  // I
];

const arena = createMatrix(12, 20);
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;

function createMatrix(w, h) {
  return Array.from({length: h}, () => Array(w).fill(0));
}

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  return m.some((row, y) =>
    row.some((val, x) => val !== 0 && (arena[y + o.y]?.[x + o.x] ?? 1) !== 0)
  );
}

function merge(arena, player) {
  player.matrix.forEach((row, y) =>
    row.forEach((val, x) => {
      if (val) arena[y + player.pos.y][x + player.pos.x] = val;
    })
  );
}

function rotate(matrix, dir) {
  const m = matrix.map((_, i) => matrix.map(r => r[i]));
  if (dir > 0) return m.map(row => row.reverse());
  return m.reverse();
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
  }
  dropCounter = 0;
}

function playerMove(offset) {
  player.pos.x += offset;
  if (collide(arena, player)) player.pos.x -= offset;
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotateMatrix(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotateMatrix(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function rotateMatrix(matrix, dir) {
  const m = matrix.map((_, i) => matrix.map(r => r[i]));
  if (dir > 0) {
    for (let row of m) row.reverse();
  } else {
    m.reverse();
  }
  player.matrix = m;
}

function playerReset() {
  const pieces = 'TJZSLOI';
  const type = pieces[Math.floor(Math.random() * pieces.length)];
  player.matrix = createPiece(type);
  player.pos.y = 0;
  player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    score = 0;
    dropInterval = 1000;
    updateScore();
  }
}

function createPiece(type) {
  switch (type) {
    case 'T': return [[0,1,0],[1,1,1]];
    case 'O': return [[2,2],[2,2]];
    case 'L': return [[0,0,3],[3,3,3]];
    case 'J': return [[4,0,0],[4,4,4]];
    case 'I': return [[5,5,5,5]];
    case 'S': return [[0,6,6],[6,6,0]];
    case 'Z': return [[7,7,0],[0,7,7]];
  }
}

function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length - 1; y >= 0; y--) {
    if (arena[y].every(val => val !== 0)) {
      const row = arena.splice(y, 1)[0].fill(0);
      arena.unshift(row);
      score += rowCount * 10;
      rowCount *= 2;
      dropInterval = Math.max(100, dropInterval - 25); // ускоряем игру
      y++;
    }
  }
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) =>
    row.forEach((val, x) => {
      if (val) {
        context.fillStyle = colors[val];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    })
  );
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(arena, {x: 0, y: 0});
  drawMatrix(player.matrix, player.pos);
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if (dropCounter > dropInterval) playerDrop();
  draw();
  requestAnimationFrame(update);
}

function updateScore() {
  scoreEl.innerText = `Счёт: ${score}`;
}

document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') playerMove(-1);
  else if (event.key === 'ArrowRight') playerMove(1);
  else if (event.key === 'ArrowDown') playerDrop();
  else if (event.key === 'ArrowUp') playerRotate(1);
});

// Touch controls (for Telegram WebApp)
let touchStartX = null;
document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
});
document.addEventListener('touchend', e => {
  const deltaX = e.changedTouches[0].clientX - touchStartX;
  if (deltaX < -30) playerMove(-1);
  else if (deltaX > 30) playerMove(1);
});

const player = {
  pos: {x: 0, y: 0},
  matrix: null
};

playerReset();
updateScore();
update();
