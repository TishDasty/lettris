'use strict';
const blockImages = {};

['I', 'J', 'L', 'O', 'S', 'T', 'Z'].forEach(type => {
  const img = new Image();
  img.src = `img/${type}.png`; // путь к картинке
  blockImages[type] = img;
});

// Получаем элементы
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20); // масштабируем для удобства

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

// Игровое поле (арена)
function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

const arena = createMatrix(arenaWidth, arenaHeight);

function playerHardDrop() {
  while(!collide(arena, player)){
    player.pos.y++;
  }
  player.pos.y--; // отступаем назад на 1, чтобы не было коллизии
  merge(arena, player);
  arenaSweep();
  playerReset();
  dropCounter = 0;
}


// Фигуры: 7 классических
const pieces = {
  'I': [
    [0,0,0,0],
    [1,1,1,1],
    [0,0,0,0],
    [0,0,0,0]
  ],
  'J': [
    [2,0,0],
    [2,2,2],
    [0,0,0]
  ],
  'L': [
    [0,0,3],
    [3,3,3],
    [0,0,0]
  ],
  'O': [
    [4,4],
    [4,4]
  ],
  'S': [
    [0,5,5],
    [5,5,0],
    [0,0,0]
  ],
  'T': [
    [0,6,0],
    [6,6,6],
    [0,0,0]
  ],
  'Z': [
    [7,7,0],
    [0,7,7],
    [0,0,0]
  ]
};

const pieceNames = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

// Отрисовка матрицы (игрового поля или фигуры)
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

function drawPlayer(player) {
  const matrix = player.matrix;
  const value = matrix.flat().find(v => v !== 0); // Получаем число: 1–7
  const type = getTypeByValue(value);
  const img = blockImages[type];
  if (img && img.complete) {
    const w = matrix[0].length;
    const h = matrix.length;
    context.drawImage(
      img,
      player.pos.x * 20,
      player.pos.y * 20,
      w * 20,
      h * 20
    );
  } else {
    drawArena(matrix, player.pos); // fallback
  }
}


function getTypeByValue(value) {
  switch(value) {
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


// Цвета для фигур (индекс — номер фигуры)
const colors = [
  null,
  '#00ffff', // I — голубой
  '#0000ff', // J — синий
  '#ffa500', // L — оранжевый
  '#ffff00', // O — желтый
  '#00ff00', // S — зеленый
  '#800080', // T — фиолетовый
  '#ff0000'  // Z — красный
];

let dropCounter = 0;
let dropInterval = 1000; // начальная скорость — 1 секунда
let lastTime = 0;
let gameRunning = false;
let paused = false;

let score = 0;
let level = 1;
let linesCleared = 0;

// Игрок (фигура)
const player = {
  pos: {x: 0, y: 0},
  matrix: null,
  score: 0
};

// Очистка канваса
function clear() {
  context.fillStyle = '#111';
  context.fillRect(0, 0, canvas.width, canvas.height);
}

// Отрисовка сцены
function draw() {
  clear();
  drawArena(arena, { x: 0, y: 0 });
  drawPlayer(player);
}

// Проверка столкновений
function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for(let y = 0; y < m.length; ++y){
    for(let x = 0; x < m[y].length; ++x){
      if(m[y][x] !== 0 &&
        (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0){
          return true;
        }
    }
  }
  return false;
}

// Слияние фигуры с ареной после падения
function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if(value !== 0){
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

// Очистка заполненных линий и подсчет очков
function arenaSweep() {
  let rowCount = 0;
  outer: for(let y = arena.length -1; y >= 0; --y){
    for(let x = 0; x < arena[y].length; ++x){
      if(arena[y][x] === 0){
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    y++;
    rowCount++;
  }
  if(rowCount > 0){
    linesCleared += rowCount;
    score += calculateScore(rowCount, level);
    updateLevel();
    updateScore();
    // Увеличиваем скорость
    dropInterval = Math.max(100, 1000 - (level - 1)*100);
  }
}

// Подсчет очков по числу линий и уровню
function calculateScore(rows, level) {
  const scoring = [0, 40, 100, 300, 1200];
  return scoring[rows] * level;
}

// Обновление уровня и скорости
function updateLevel() {
  level = Math.floor(linesCleared / 10) + 1;
}

// Обновление текста счета
function updateScore() {
  scoreElem.textContent = `Очки: ${score} (Уровень: ${level})`;
}

// Вращение матрицы (фигуры)
function rotate(matrix, dir) {
  for(let y = 0; y < matrix.length; ++y){
    for(let x = 0; x < y; ++x){
      [
        matrix[x][y],
        matrix[y][x]
      ] = [
        matrix[y][x],
        matrix[x][y]
      ];
    }
  }
  if(dir > 0){
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

// Попытка повернуть фигуру с учётом коллизий (wall kicks)
function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while(collide(arena, player)){
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if(offset > player.matrix[0].length){
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

// Создание новой фигуры
function createPiece(type) {
  return pieces[type];
}

// Сброс фигуры игрока в верхнее положение с новой фигурой
function playerReset() {
  const piecesTypes = 'TJLOSZI';
  player.matrix = createPiece(piecesTypes[Math.floor(Math.random() * piecesTypes.length)]);
  player.pos.y = 0;
  player.pos.x = Math.floor((arenaWidth / 2) - Math.floor(player.matrix[0].length / 2));
  if(collide(arena, player)){
    arena.forEach(row => row.fill(0)); // Очистка поля — конец игры
    alert('Игра окончена! Твой счёт: ' + score);
    gameRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }
}

// Движение фигуры вниз (с падением)
function playerDrop() {
  player.pos.y++;
  if(collide(arena, player)){
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    playerReset();
  }
  dropCounter = 0;
}

// Движение фигуры влево или вправо
function playerMove(dir) {
  player.pos.x += dir;
  if(collide(arena, player)){
    player.pos.x -= dir;
  }
}

// Основной цикл игры с анимацией
function update(time = 0) {
  if(!gameRunning || paused){
    lastTime = time;
    requestAnimationFrame(update);
    return;
  }
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if(dropCounter > dropInterval){
    playerDrop();
  }

  draw();
  requestAnimationFrame(update);
}

// Управление кнопками и клавиатурой
startBtn.addEventListener('click', () => {
  if(!gameRunning){
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
  if(!gameRunning) return;
  paused = !paused;
  pauseBtn.textContent = paused ? 'Продолжить' : 'Пауза';
});

leftBtn.addEventListener('click', () => {
  if(gameRunning && !paused) playerMove(-1);
});

rightBtn.addEventListener('click', () => {
  if(gameRunning && !paused) playerMove(1);
});

downBtn.addEventListener('click', () => {
  if(gameRunning && !paused) playerDrop();
});

rotateBtn.addEventListener('click', () => {
  if(gameRunning && !paused) playerRotate(1);
});

document.addEventListener('keydown', event => {
  if(!gameRunning || paused) return;
  if(event.key === 'ArrowLeft'){
    playerMove(-1);
  } else if(event.key === 'ArrowRight'){
    playerMove(1);
  } else if(event.key === 'ArrowDown'){
    playerDrop();
  } else if(event.key === 'ArrowUp'){
    playerRotate(1);
  }
});

hardDropBtn.addEventListener('click', () => {
  if(gameRunning && !paused){
    playerHardDrop();
  }
});

// Сенсорное управление — свайпы и тап
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        e.preventDefault(); // запрет масштабирования
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

        const minSwipeDistance = 20; // минимальный порог свайпа

        if (Math.max(absDx, absDy) > minSwipeDistance) {
            if (absDx > absDy) {
                if (dx > 0) {
                    playerMove(1); // свайп вправо
                } else {
                    playerMove(-1); // свайп влево
                }
            } else {
                if (dy > 0) {
                    playerDrop(); // свайп вниз — ускорить падение
                } else {
                    playerRotate(1); // свайп вверх — поворот
                }
            }
        } else {
            // Это короткий тап — поворот
            playerRotate(1);
        }
    }
}, { passive: false });

// Запрет масштабирования страницы двойным тапом
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, false);

