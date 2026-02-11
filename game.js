const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreNode = document.getElementById('score');
const livesNode = document.getElementById('lives');
const enemiesNode = document.getElementById('enemies');

const state = {
  score: 0,
  lives: 3,
  gameOver: false,
  player: {
    x: canvas.width / 2,
    y: canvas.height - 48,
    width: 36,
    height: 24,
    speed: 4.2,
    fireCooldown: 0,
  },
  bullets: [],
  enemyBullets: [],
  enemies: [],
  time: 0,
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnEnemies(amount, tier) {
  const tierMap = {
    1: { hp: 1, speed: 1.05, points: 10, color: '#7cc6ff' },
    2: { hp: 2, speed: 1.5, points: 25, color: '#ffcd70' },
    3: { hp: 3, speed: 1.9, points: 45, color: '#ff7a7a' },
  };

  const config = tierMap[tier] ?? tierMap[1];

  for (let i = 0; i < amount; i += 1) {
    state.enemies.push({
      x: rand(30, canvas.width - 30),
      y: rand(35, 180),
      vx: (Math.random() > 0.5 ? 1 : -1) * config.speed,
      width: 28,
      height: 18,
      hp: config.hp,
      points: config.points,
      fireChance: 0.0025 + tier * 0.001,
      color: config.color,
    });
  }
}

function resetWave() {
  state.enemies.length = 0;
  spawnEnemies(20, 1);
}

function drawPlayer() {
  const p = state.player;
  ctx.fillStyle = '#5ce1e6';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - p.height / 2);
  ctx.lineTo(p.x - p.width / 2, p.y + p.height / 2);
  ctx.lineTo(p.x + p.width / 2, p.y + p.height / 2);
  ctx.closePath();
  ctx.fill();
}

function drawEnemy(enemy) {
  ctx.fillStyle = enemy.color;
  ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
  ctx.fillStyle = '#111';
  ctx.fillRect(enemy.x - 4, enemy.y - 3, 8, 6);
}

function updateAI() {
  const p = state.player;
  if (state.enemies.length === 0) {
    return;
  }

  const target = state.enemies.reduce((best, enemy) => {
    const currentDistance = Math.abs(enemy.x - p.x);
    if (!best || currentDistance < best.distance) {
      return { enemy, distance: currentDistance };
    }
    return best;
  }, null)?.enemy;

  if (!target) {
    return;
  }

  const dx = target.x - p.x;
  if (Math.abs(dx) > 6) {
    p.x += Math.sign(dx) * p.speed;
  }

  p.x = Math.max(p.width / 2, Math.min(canvas.width - p.width / 2, p.x));

  if (Math.abs(dx) < 16 && p.fireCooldown <= 0) {
    state.bullets.push({ x: p.x, y: p.y - p.height / 2, vy: -7.5, width: 4, height: 10 });
    p.fireCooldown = 14;
  }
}

function updateBullets() {
  state.bullets = state.bullets.filter((bullet) => {
    bullet.y += bullet.vy;

    for (const enemy of state.enemies) {
      if (
        bullet.x >= enemy.x - enemy.width / 2 &&
        bullet.x <= enemy.x + enemy.width / 2 &&
        bullet.y >= enemy.y - enemy.height / 2 &&
        bullet.y <= enemy.y + enemy.height / 2
      ) {
        enemy.hp -= 1;
        bullet.hit = true;
        if (enemy.hp <= 0) {
          enemy.dead = true;
          state.score += enemy.points;
        }
        break;
      }
    }

    return !bullet.hit && bullet.y > -20;
  });

  state.enemyBullets = state.enemyBullets.filter((bullet) => {
    bullet.y += bullet.vy;
    const p = state.player;

    if (
      bullet.x >= p.x - p.width / 2 &&
      bullet.x <= p.x + p.width / 2 &&
      bullet.y >= p.y - p.height / 2 &&
      bullet.y <= p.y + p.height / 2
    ) {
      state.lives -= 1;
      bullet.hit = true;
      if (state.lives <= 0) {
        state.gameOver = true;
      }
    }

    return !bullet.hit && bullet.y < canvas.height + 20;
  });

  state.enemies = state.enemies.filter((enemy) => !enemy.dead);
}

function updateEnemies() {
  for (const enemy of state.enemies) {
    enemy.x += enemy.vx;
    if (enemy.x < enemy.width / 2 || enemy.x > canvas.width - enemy.width / 2) {
      enemy.vx *= -1;
      enemy.y += 18;
    }

    if (enemy.y > canvas.height - 80) {
      state.gameOver = true;
    }

    if (Math.random() < enemy.fireChance) {
      state.enemyBullets.push({
        x: enemy.x,
        y: enemy.y + enemy.height / 2,
        vy: 3.2,
        width: 4,
        height: 10,
      });
    }
  }
}

function drawBullets() {
  ctx.fillStyle = '#8eff88';
  for (const bullet of state.bullets) {
    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
  }

  ctx.fillStyle = '#ff9aa2';
  for (const bullet of state.enemyBullets) {
    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const stars = 80;
  for (let i = 0; i < stars; i += 1) {
    const x = (i * 73 + state.time * 0.4) % canvas.width;
    const y = (i * 41 + state.time * 0.8) % canvas.height;
    ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 10) / 10})`;
    ctx.fillRect(x, y, 2, 2);
  }
}

function updateHud() {
  scoreNode.textContent = `Puntaje: ${state.score}`;
  livesNode.textContent = `Vidas: ${state.lives}`;
  enemiesNode.textContent = `Enemigos: ${state.enemies.length}`;
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(2, 4, 15, 0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '22px system-ui';
  ctx.fillText(`Puntaje final: ${state.score}`, canvas.width / 2, canvas.height / 2 + 30);
}

function tick() {
  state.time += 1;
  if (!state.gameOver) {
    updateAI();
    updateEnemies();
    updateBullets();

    if (state.player.fireCooldown > 0) {
      state.player.fireCooldown -= 1;
    }

    if (state.enemies.length === 0) {
      spawnEnemies(10, 1);
    }
  }

  drawBackground();
  drawPlayer();
  for (const enemy of state.enemies) {
    drawEnemy(enemy);
  }
  drawBullets();
  updateHud();

  if (state.gameOver) {
    drawGameOver();
  }

  requestAnimationFrame(tick);
}

document.addEventListener('keydown', (event) => {
  if (event.key === '1') {
    spawnEnemies(10, 1);
  } else if (event.key === '2') {
    spawnEnemies(10, 2);
  } else if (event.key === '3') {
    spawnEnemies(10, 3);
  } else if (event.key === '4') {
    state.lives += 1;
  }
});

resetWave();
tick();
