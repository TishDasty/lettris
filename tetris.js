<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Tetris WebApp</title>
  <style>
    html, body {
      height: 100%;
      margin: 0;
      background: #111;
      color: white;
      font-family: sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    canvas {
      image-rendering: pixelated;
      border: 2px solid white;
      background-color: #222;
    }
  </style>
</head>
<body>
<canvas id="tetris" width="200" height="400"></canvas>
<script>
  const canvas = document.getElementById('tetris');
  const context = canvas.getContext('2d');
  context.scale(20, 20);

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

  const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

  const blockImages = {};

  function loadBlockImages() {
    return Promise.all(
      types.map(type => {
        return new Promise(resolve => {
          const img = new Image();
          img.src = `img/${type}.png`;
          img.onload = () => {
            blockImages[type] = img;
            resolve();
          };
        });
      })
    );
  }

  const arenaWidth = 10;
  const arenaHeight = 20;

  function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
      matrix.push(new Array(w).fill(0));
    }
    return matrix;
  }

  function createPiece(type) {
    switch (type) {
      case 'T': return [[0, 0, 0], [1, 1, 1], [0, 1, 0]];
      case 'O': return [[2, 2], [2, 2]];
      case 'L': return [[0, 3, 0], [0, 3, 0], [0, 3, 3]];
      case 'J': return [[0, 4, 0], [0, 4, 0], [4, 4, 0]];
      case 'I': return [[0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0]];
      case 'S': return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
      case 'Z': return [[7, 7, 0], [0, 7, 7], [0, 0, 0]];
    }
  }

  function drawMatrix(matrix, offset, type = null) {
    const img = blockImages[type];
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          if (img && img.complete) {
            context.drawImage(
              img,
              (x + offset.x) * 1,
              (y + offset.y) * 1,
              1,
              1
            );
          } else {
            context.fillStyle = colors[value];
            context.fillRect(x + offset.x, y + offset.y, 1, 1);
          }
        }
      });
    });
  }

  function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos, player.type);
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
        if (m[y][x] !== 0 &&
          (arena[y + o.y] &&
            arena[y + o.y][x + o.x]) !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  function arenaSweep() {
    outer: for (let y = arena.length - 1; y >= 0; --y) {
      for (let x = 0; x < arena[y].length; ++x) {
        if (arena[y][x] === 0) {
          continue outer;
        }
      }
      const row = arena.splice(y, 1)[0].fill(0);
      arena.unshift(row);
      ++y;
      player.score += 10;
    }
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

  function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
      player.pos.x -= dir;
    }
  }

  function playerReset() {
    const type = types[Math.floor(Math.random() * types.length)];
    player.matrix = createPiece(type);
    player.type = type;
    player.pos.y = 0;
    player.pos.x =
      ((arenaWidth / 2) | 0) -
      ((player.matrix[0].length / 2) | 0);

    if (collide(arena, player)) {
      arena.forEach(row => row.fill(0));
      player.score = 0;
      updateScore();
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

  let dropCounter = 0;
  let dropInterval = 1000;
  let lastTime = 0;

  function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      playerDrop();
    }

    draw();
    requestAnimationFrame(update);
  }

  function updateScore() {
    document.title = `Tetris — Score: ${player.score}`;
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      playerMove(-1);
    } else if (event.key === 'ArrowRight') {
      playerMove(1);
    } else if (event.key === 'ArrowDown') {
      playerDrop();
    } else if (event.key === 'q') {
      playerRotate(-1);
    } else if (event.key === 'w') {
      playerRotate(1);
    }
  });

  const arena = createMatrix(arenaWidth, arenaHeight);
  const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    type: null,
    score: 0,
  };

  loadBlockImages().then(() => {
    playerReset();
    updateScore();
    update();
  });
</script>
</body>
</html>
