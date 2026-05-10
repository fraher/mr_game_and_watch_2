const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WORLD_WIDTH = 4200;
const GROUND_Y = 438;
const GRAVITY = 0.72;
const MAX_FALL = 16;
const keys = new Set();
const pressed = new Set();

const palette = {
  ink: '#0b0f1e',
  black: '#111111',
  white: '#f8f4e3',
  cream: '#fff1b8',
  red: '#ef476f',
  orange: '#f77f00',
  gold: '#ffd166',
  green: '#06d6a0',
  blue: '#118ab2',
  sky: '#5dd6ff',
  purple: '#7b2cbf',
  navy: '#16213e',
  gray: '#6c757d',
};

const game = {
  state: 'start',
  cameraX: 0,
  score: 0,
  best: Number(localStorage.getItem('mgw-best') || 0),
  lives: 3,
  time: 0,
  levelComplete: false,
  messageTimer: 0,
  message: '',
};

const player = {
  x: 72,
  y: 260,
  w: 34,
  h: 58,
  vx: 0,
  vy: 0,
  dir: 1,
  onGround: false,
  invuln: 0,
  anim: 0,
};

const platforms = [
  { x: 0, y: GROUND_Y, w: WORLD_WIDTH, h: 90, kind: 'ground' },
  { x: 330, y: 350, w: 180, h: 22, kind: 'brick' },
  { x: 660, y: 300, w: 150, h: 22, kind: 'brick' },
  { x: 980, y: 365, w: 230, h: 22, kind: 'metal' },
  { x: 1360, y: 316, w: 150, h: 22, kind: 'brick' },
  { x: 1680, y: 360, w: 250, h: 22, kind: 'metal' },
  { x: 2120, y: 318, w: 140, h: 22, kind: 'brick' },
  { x: 2400, y: 270, w: 180, h: 22, kind: 'metal' },
  { x: 2860, y: 350, w: 260, h: 22, kind: 'brick' },
  { x: 3290, y: 300, w: 170, h: 22, kind: 'metal' },
  { x: 3640, y: 362, w: 250, h: 22, kind: 'brick' },
];

const decorations = Array.from({ length: 36 }, (_, i) => ({
  x: i * 130 + (i % 3) * 28,
  y: GROUND_Y - 38 - (i % 4) * 9,
  type: i % 5,
}));

const enemies = [
  { x: 520, y: 390, w: 38, h: 38, vx: 1.1, min: 430, max: 720, type: 'chef', alive: true, anim: 0 },
  { x: 1040, y: 325, w: 38, h: 38, vx: 1.4, min: 990, max: 1180, type: 'octo', alive: true, anim: 0 },
  { x: 1510, y: 396, w: 38, h: 38, vx: 1.2, min: 1330, max: 1740, type: 'spark', alive: true, anim: 0 },
  { x: 2030, y: 396, w: 38, h: 38, vx: 1.7, min: 1930, max: 2240, type: 'chef', alive: true, anim: 0 },
  { x: 2550, y: 230, w: 38, h: 38, vx: 1.1, min: 2400, max: 2570, type: 'octo', alive: true, anim: 0 },
  { x: 3090, y: 396, w: 38, h: 38, vx: 1.8, min: 2860, max: 3230, type: 'spark', alive: true, anim: 0 },
  { x: 3730, y: 322, w: 38, h: 38, vx: 1.4, min: 3640, max: 3880, type: 'chef', alive: true, anim: 0 },
];

const items = [
  ...[360, 410, 460, 700, 750, 1000, 1090, 1415, 1720, 1810, 2160, 2460, 2520, 2900, 2990, 3335, 3710, 3830].map((x, i) => ({
    x, y: (i % 3 === 0 ? 308 : i % 3 === 1 ? 258 : 392), w: 24, h: 24, type: 'coin', taken: false, anim: i * 0.3,
  })),
  { x: 1220, y: 394, w: 28, h: 28, type: 'heart', taken: false, anim: 0 },
  { x: 2670, y: 394, w: 28, h: 28, type: 'clock', taken: false, anim: 0 },
  { x: 3970, y: 368, w: 36, h: 46, type: 'bell', taken: false, anim: 0 },
];

function resetGame() {
  Object.assign(player, { x: 72, y: 260, vx: 0, vy: 0, dir: 1, onGround: false, invuln: 0, anim: 0 });
  Object.assign(game, { state: 'playing', cameraX: 0, score: 0, lives: 3, time: 0, levelComplete: false, messageTimer: 0, message: '' });
  enemies.forEach((enemy) => { enemy.alive = true; enemy.vx = Math.abs(enemy.vx) || 1.2; });
  items.forEach((item) => { item.taken = false; });
}

function retryAfterFall() {
  Object.assign(player, { x: Math.max(72, game.cameraX + 70), y: 180, vx: 0, vy: 0, invuln: 110 });
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function solidAt(entity) {
  return platforms.filter((platform) => rectsOverlap(entity, platform));
}

function updatePlayer() {
  const left = keys.has('ArrowLeft');
  const right = keys.has('ArrowRight');
  const jump = pressed.has('Space') || pressed.has('ArrowUp');
  const accel = player.onGround ? 0.75 : 0.45;

  if (left) {
    player.vx -= accel;
    player.dir = -1;
  }
  if (right) {
    player.vx += accel;
    player.dir = 1;
  }
  if (!left && !right) player.vx *= player.onGround ? 0.78 : 0.94;
  player.vx = Math.max(-6.3, Math.min(6.3, player.vx));

  if (jump && player.onGround) {
    player.vy = -14.8;
    player.onGround = false;
    blip(520, 0.04);
  }

  player.vy = Math.min(MAX_FALL, player.vy + GRAVITY);
  player.x += player.vx;
  for (const platform of solidAt(player)) {
    if (player.vx > 0) player.x = platform.x - player.w;
    if (player.vx < 0) player.x = platform.x + platform.w;
    player.vx = 0;
  }

  player.y += player.vy;
  player.onGround = false;
  for (const platform of solidAt(player)) {
    if (player.vy > 0) {
      player.y = platform.y - player.h;
      player.onGround = true;
    } else if (player.vy < 0) {
      player.y = platform.y + platform.h;
    }
    player.vy = 0;
  }

  player.x = Math.max(0, Math.min(WORLD_WIDTH - player.w, player.x));
  player.anim += Math.abs(player.vx) * 0.18 + (player.onGround ? 0.06 : 0.12);
  player.invuln = Math.max(0, player.invuln - 1);

  if (player.y > HEIGHT + 80) hurtPlayer(true);
}

function updateEnemies() {
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    enemy.x += enemy.vx;
    if (enemy.x < enemy.min || enemy.x > enemy.max) enemy.vx *= -1;
    enemy.anim += 0.12;
    if (!rectsOverlap(player, enemy) || player.invuln) return;
    const stomp = player.vy > 2 && player.y + player.h - enemy.y < 22;
    if (stomp) {
      enemy.alive = false;
      player.vy = -9.4;
      addScore(175, '+175 STOMP!');
      blip(220, 0.06);
    } else {
      hurtPlayer(false);
    }
  });
}

function updateItems() {
  items.forEach((item) => {
    if (item.taken) return;
    item.anim += 0.08;
    if (!rectsOverlap(player, item)) return;
    item.taken = true;
    if (item.type === 'coin') addScore(50, '+50 BONUS');
    if (item.type === 'heart') {
      game.lives = Math.min(5, game.lives + 1);
      addScore(100, 'EXTRA LIFE!');
    }
    if (item.type === 'clock') addScore(300, 'TIME BONUS!');
    if (item.type === 'bell') finishLevel();
    blip(item.type === 'bell' ? 880 : 720, 0.06);
  });
}

function addScore(points, message) {
  game.score += points;
  game.message = message;
  game.messageTimer = 90;
}

function hurtPlayer(fell) {
  if (player.invuln) return;
  game.lives -= 1;
  game.message = fell ? 'WATCH YOUR STEP!' : 'OUCH!';
  game.messageTimer = 90;
  blip(120, 0.1);
  if (game.lives <= 0) {
    endGame();
  } else {
    retryAfterFall();
  }
}

function finishLevel() {
  game.levelComplete = true;
  game.score += Math.max(0, 1000 - Math.floor(game.time / 8));
  game.best = Math.max(game.best, game.score);
  localStorage.setItem('mgw-best', String(game.best));
  game.state = 'win';
}

function endGame() {
  game.best = Math.max(game.best, game.score);
  localStorage.setItem('mgw-best', String(game.best));
  game.state = 'retry';
}

function updateCamera() {
  const target = player.x - WIDTH * 0.42;
  game.cameraX += (target - game.cameraX) * 0.08;
  game.cameraX = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, game.cameraX));
}

function update() {
  if (game.state === 'start') {
    if (pressed.has('Space') || pressed.has('Enter')) resetGame();
  } else if (game.state === 'retry' || game.state === 'win') {
    if (pressed.has('Space') || pressed.has('Enter')) resetGame();
  } else if (game.state === 'playing') {
    if (pressed.has('KeyP')) game.state = 'pause';
    game.time += 1;
    updatePlayer();
    updateEnemies();
    updateItems();
    updateCamera();
    if (game.messageTimer > 0) game.messageTimer -= 1;
  } else if (game.state === 'pause') {
    if (pressed.has('KeyP') || pressed.has('Space')) game.state = 'playing';
  }
  pressed.clear();
}

function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function text(label, x, y, size = 24, color = palette.white, align = 'left') {
  ctx.save();
  ctx.font = `${size}px Courier New, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  ctx.fillText(label, x + 3, y + 3);
  ctx.fillStyle = color;
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawBackground() {
  const t = game.time * 0.004;
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#13294b');
  gradient.addColorStop(0.55, '#37205c');
  gradient.addColorStop(1, '#101828');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < 60; i += 1) {
    const x = (i * 173 - game.cameraX * 0.18) % (WIDTH + 60) - 30;
    const y = 28 + (i * 47) % 190;
    px(x, y, 3 + (i % 3), 3 + (i % 3), i % 5 === 0 ? palette.gold : '#dff7ff');
  }

  drawMoon(WIDTH - 145 - Math.sin(t) * 10, 54, 72);
  drawParallaxHills(0.22, '#263c73', 300, 80);
  drawParallaxHills(0.42, '#1b6b83', 350, 58);

  decorations.forEach((d) => {
    const x = d.x - game.cameraX * 0.65;
    if (x < -80 || x > WIDTH + 80) return;
    if (d.type === 0) drawSign(x, d.y);
    else if (d.type === 1) drawShrub(x, d.y);
    else if (d.type === 2) drawAntenna(x, d.y);
    else drawCloudMachine(x, d.y);
  });
}

function drawMoon(x, y, r) {
  px(x - r / 2, y, r, r, palette.cream);
  px(x - r / 3, y + 8, 12, 12, '#d9c98b');
  px(x + 14, y + 34, 10, 10, '#d9c98b');
  px(x + 34, y + 14, 8, 8, '#d9c98b');
}

function drawParallaxHills(speed, color, base, amplitude) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let x = -80; x <= WIDTH + 80; x += 80) {
    const worldX = x + game.cameraX * speed;
    const y = base + Math.sin(worldX / 180) * amplitude;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawPlatform(platform) {
  const x = platform.x - game.cameraX;
  if (x + platform.w < -20 || x > WIDTH + 20) return;
  const c = platform.kind === 'ground' ? '#44321f' : platform.kind === 'metal' ? '#345' : '#7f4f24';
  px(x, platform.y, platform.w, platform.h, c);
  px(x, platform.y, platform.w, 6, platform.kind === 'metal' ? palette.sky : palette.gold);
  for (let tx = x; tx < x + platform.w; tx += 32) {
    px(tx + 2, platform.y + 8, 24, 4, 'rgba(255,255,255,0.18)');
    if (platform.kind === 'ground') px(tx, platform.y + 28, 18, 6, '#2f251c');
  }
}

function drawPlayer() {
  const x = player.x - game.cameraX;
  const y = player.y;
  if (player.invuln && Math.floor(game.time / 5) % 2) return;
  const step = Math.floor(player.anim) % 2;
  const armOffset = player.onGround ? step * 3 : -5;
  const face = player.dir;

  px(x + 8, y + 4, 20, 20, palette.black);
  px(x + 12, y + 8, 12, 12, palette.white);
  px(x + (face > 0 ? 22 : 9), y + 12, 4, 4, palette.black);
  px(x + 2, y + 24, 30, 22, palette.black);
  px(x + 7, y + 29, 20, 10, palette.white);
  px(x - 6 * face, y + 28 + armOffset, 10, 8, palette.black);
  px(x + 30 * face, y + 27 - armOffset, 10, 8, palette.black);
  px(x + 7, y + 46, 8, 12 + step * 4, palette.black);
  px(x + 20, y + 46, 8, 16 - step * 4, palette.black);
  px(x + 3, y + 56 + step * 4, 14, 5, palette.white);
  px(x + 17, y + 60 - step * 4, 14, 5, palette.white);
}

function drawEnemy(enemy) {
  if (!enemy.alive) return;
  const x = enemy.x - game.cameraX;
  const y = enemy.y;
  if (x < -60 || x > WIDTH + 60) return;
  const flap = Math.floor(enemy.anim * 6) % 2;
  if (enemy.type === 'chef') {
    px(x + 7, y + 8, 24, 24, palette.red);
    px(x + 12, y, 14, 10, palette.white);
    px(x + 4, y + 16, 30, 10, palette.white);
    px(x + 13, y + 16, 4, 4, palette.black);
    px(x + 23, y + 16, 4, 4, palette.black);
    px(x + 6, y + 31, 9, 7 + flap * 3, palette.black);
    px(x + 23, y + 31, 9, 10 - flap * 3, palette.black);
  } else if (enemy.type === 'octo') {
    px(x + 6, y + 3, 26, 24, palette.purple);
    px(x + 10, y + 10, 6, 6, palette.white);
    px(x + 22, y + 10, 6, 6, palette.white);
    for (let i = 0; i < 4; i += 1) px(x + 4 + i * 8, y + 28 + (i % 2) * flap * 4, 6, 10, palette.purple);
  } else {
    px(x + 8, y + 8, 22, 22, palette.gold);
    px(x + 12, y + 3, 14, 32, palette.orange);
    px(x + 3, y + 15, 32, 8, palette.gold);
    px(x + 13, y + 14, 4, 4, palette.black);
    px(x + 23, y + 14, 4, 4, palette.black);
  }
}

function drawItem(item) {
  if (item.taken) return;
  const x = item.x - game.cameraX;
  const y = item.y + Math.sin(item.anim) * 4;
  if (x < -50 || x > WIDTH + 50) return;
  if (item.type === 'coin') {
    px(x + 5, y + 2, 14, 20, palette.gold);
    px(x + 9, y + 6, 6, 12, palette.cream);
    px(x + 2, y + 8, 20, 6, palette.orange);
  } else if (item.type === 'heart') {
    px(x + 4, y + 7, 8, 8, palette.red);
    px(x + 16, y + 7, 8, 8, palette.red);
    px(x + 2, y + 13, 24, 9, palette.red);
    px(x + 8, y + 22, 12, 7, palette.red);
  } else if (item.type === 'clock') {
    px(x + 4, y + 4, 20, 20, palette.sky);
    px(x + 8, y + 8, 12, 12, palette.white);
    px(x + 14, y + 9, 3, 9, palette.black);
    px(x + 14, y + 15, 7, 3, palette.black);
  } else {
    px(x + 5, y + 4, 26, 28, palette.gold);
    px(x + 1, y + 10, 34, 14, palette.cream);
    px(x + 14, y + 30, 8, 12, palette.orange);
  }
}

function drawSign(x, y) {
  px(x + 13, y + 20, 6, 32, '#4a2f1b');
  px(x, y, 34, 24, '#7f4f24');
  px(x + 4, y + 5, 26, 4, palette.gold);
  px(x + 7, y + 13, 18, 4, palette.gold);
}

function drawShrub(x, y) {
  px(x, y + 18, 50, 16, '#074f3d');
  px(x + 8, y + 7, 20, 20, palette.green);
  px(x + 25, y + 12, 18, 18, '#08a77f');
}

function drawAntenna(x, y) {
  px(x + 16, y, 4, 54, palette.gray);
  px(x, y + 12, 36, 4, palette.sky);
  px(x + 5, y + 4, 26, 4, palette.sky);
}

function drawCloudMachine(x, y) {
  px(x + 10, y + 20, 40, 22, '#243b55');
  px(x + 16, y + 11, 12, 12, palette.sky);
  px(x + 30, y + 8, 16, 16, palette.sky);
  px(x + 44, y + 15, 12, 12, palette.sky);
}

function drawHud() {
  px(18, 16, 360, 68, 'rgba(7, 7, 17, 0.78)');
  text(`SCORE ${String(game.score).padStart(5, '0')}`, 34, 28, 22, palette.gold);
  text(`BEST ${String(game.best).padStart(5, '0')}`, 34, 56, 18, palette.sky);
  for (let i = 0; i < game.lives; i += 1) {
    px(262 + i * 26, 34, 18, 18, palette.red);
    px(266 + i * 26, 38, 10, 10, palette.cream);
  }
  px(WIDTH - 260, 16, 232, 46, 'rgba(7, 7, 17, 0.78)');
  text(`TIME ${Math.floor(game.time / 60).toString().padStart(3, '0')}`, WIDTH - 244, 28, 22, palette.white);
  if (game.messageTimer > 0) text(game.message, WIDTH / 2, 86, 24, palette.gold, 'center');
}

function drawOverlay(title, subtitle, details) {
  px(0, 0, WIDTH, HEIGHT, 'rgba(6, 8, 18, 0.72)');
  px(150, 86, WIDTH - 300, 344, '#11182f');
  px(166, 102, WIDTH - 332, 312, '#22315d');
  px(182, 118, WIDTH - 364, 280, '#11182f');
  text(title, WIDTH / 2, 150, 42, palette.gold, 'center');
  text(subtitle, WIDTH / 2, 212, 22, palette.white, 'center');
  details.forEach((line, index) => text(line, WIDTH / 2, 270 + index * 32, 20, index === details.length - 1 ? palette.green : palette.sky, 'center'));
}

function draw() {
  drawBackground();
  platforms.forEach(drawPlatform);
  items.forEach(drawItem);
  enemies.forEach(drawEnemy);
  drawPlayer();
  drawHud();

  if (game.state === 'start') {
    drawOverlay('PIXEL RESCUE', 'A Game & Watch-inspired 8-bit side-scroller', [
      '← → move    ↑ / SPACE jump',
      'Stomp enemies, collect bonuses, ring the bell.',
      'PRESS SPACE TO START',
    ]);
  } else if (game.state === 'retry') {
    drawOverlay('TRY AGAIN?', `FINAL SCORE ${game.score}`, [
      `BEST SCORE ${game.best}`,
      'The clockwork critters got you this time.',
      'PRESS SPACE TO RETRY',
    ]);
  } else if (game.state === 'win') {
    drawOverlay('LEVEL CLEAR!', `FINAL SCORE ${game.score}`, [
      `BEST SCORE ${game.best}`,
      'You rang the golden bell and saved the stage!',
      'PRESS SPACE TO PLAY AGAIN',
    ]);
  } else if (game.state === 'pause') {
    drawOverlay('PAUSED', 'Take a quick handheld break.', ['PRESS P OR SPACE TO RESUME']);
  }
}

let audioCtx;
function blip(freq, duration) {
  try {
    audioCtx ||= new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = freq;
    gain.gain.value = 0.035;
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch {
    // Audio can be blocked until user interaction; gameplay continues silently.
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
  if (!keys.has(event.code)) pressed.add(event.code);
  keys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

loop();
