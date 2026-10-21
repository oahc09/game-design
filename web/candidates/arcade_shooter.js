function createGame({ seed = 1, content = {} } = {}) {
  const DT = 1 / 60;
  const EPS = 1e-9;
  const DEFAULTS = {
    ruleset_version: 'arcade_shooter_v0.1.1',
    width: 100,
    height: 100,
    playerX: 50,
    playerY: 80,
    playerHP: 3,
    playerRadius: 2,
    playerSpeed: 24,
    projectileSpeed: 90,
    projectileRadius: 0.5,
    projectileDamage: 1,
    fireIntervalTicks: 8,
    enemyHP: 2,
    enemyRadius: 2.5,
    enemySpeed: 6,
    enemyFireIntervalTicks: 100,
    enemyProjectileSpeed: 30,
    enemyDamage: 1,
    contactIntervalTicks: 60,
    maxTicks: 7200,
    enemies: [{ x: 20, y: 20 }, { x: 50, y: 15 }, { x: 80, y: 20 }],
    spawns: []
  };
  const ACTION_SPACE = {
    type: 'composite',
    fields: {
      move: { type: 'continuous', shape: [2], min: -1, max: 1 },
      aim: { type: 'continuous', shape: [2], min: -1, max: 1 },
      fire: { type: 'discrete', values: [false, true] }
    }
  };
  const NOOP = { move: [0, 0], aim: [0, -1], fire: false };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const length = (x, y) => Math.sqrt(x * x + y * y);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const unit = (x, y, fallback = [0, -1]) => {
    const n = length(x, y);
    return n > EPS ? [x / n, y / n] : [...fallback];
  };
  const boundedVector = (value) =>
    Array.isArray(value) && value.length === 2 &&
    value.every((n) => Number.isFinite(n) && n >= -1 && n <= 1);
  const normalizeInput = (action) => {
    if (action === 'NOOP') return clone(NOOP);
    if (!action || typeof action !== 'object' || Array.isArray(action) ||
        Object.keys(action).some((key) => !['move', 'aim', 'fire'].includes(key))) return null;
    const input = { ...clone(NOOP), ...clone(action) };
    return boundedVector(input.move) && boundedVector(input.aim) && typeof input.fire === 'boolean'
      ? input
      : null;
  };
  const sweptCollision = (a0, a1, b0, b1, radius) => {
    const x = a0.x - b0.x;
    const y = a0.y - b0.y;
    const dx = (a1.x - a0.x) - (b1.x - b0.x);
    const dy = (a1.y - a0.y) - (b1.y - b0.y);
    const c = x * x + y * y - radius * radius;
    if (c <= EPS) return 0;
    const a = dx * dx + dy * dy;
    if (a <= EPS) return null;
    const b = 2 * (x * dx + y * dy);
    const disc = b * b - 4 * a * c;
    if (disc < -EPS) return null;
    const t = (-b - Math.sqrt(Math.max(0, disc))) / (2 * a);
    return t >= -EPS && t <= 1 + EPS ? clamp(t, 0, 1) : null;
  };

  let rngState = seed >>> 0;
  const rng = {
    nextFloat() {
      let t = rngState += 0x6D2B79F5;
      rngState >>>= 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    nextInt(min, max) {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max <= min) {
        throw new RangeError('RNG range must be nonempty integer interval');
      }
      return min + Math.floor(this.nextFloat() * (max - min));
    },
    snapshot() { return rngState >>> 0; }
  };

  const config = { ...clone(DEFAULTS), ...clone(content) };
  const { enemies, spawns, ...rules } = config;
  const state = {
    tick: 0,
    turn: 0,
    rngState: rng.snapshot(),
    terminal: null,
    rules,
    player: {
      id: 0,
      x: config.playerX,
      y: config.playerY,
      hp: config.playerHP,
      radius: config.playerRadius,
      cooldown: 0,
      aim: [0, -1]
    },
    enemies: [],
    projectiles: [],
    futureSpawns: clone(spawns).map((entry, index) => ({ ...entry, order: index }))
      .sort((a, b) => a.tick - b.tick || a.order - b.order),
    spawnIndex: 0,
    nextEntityId: 1,
    score: 0,
    kills: 0,
    shots: 0,
    hits: 0,
    damageTaken: 0,
    firstKillTick: null,
    killTimes: [],
    inputCount: 0,
    totalEnemies: enemies.length + spawns.length
  };

  const spawnEnemy = (entry, events) => {
    const id = state.nextEntityId++;
    const fire = entry.fireIntervalTicks ?? rules.enemyFireIntervalTicks;
    const enemy = {
      id,
      x: entry.x,
      y: entry.y,
      hp: entry.hp ?? rules.enemyHP,
      radius: entry.radius ?? rules.enemyRadius,
      speed: entry.speed ?? rules.enemySpeed,
      fireIntervalTicks: fire,
      fireCooldown: fire ? rng.nextInt(Math.max(1, Math.floor(fire / 2)), fire + 1) : 0,
      contactCooldown: 0,
      vx: 0,
      vy: 0,
      spawnTick: state.tick
    };
    state.enemies.push(enemy);
    if (events) events.push({ type: 'EnemySpawned', enemy: clone(enemy) });
  };
  const spawnProjectile = (owner, x, y, aim, speed, damage, events) => {
    const dir = unit(...aim);
    const projectile = {
      id: state.nextEntityId++,
      owner,
      x,
      y,
      vx: dir[0] * speed,
      vy: dir[1] * speed,
      radius: rules.projectileRadius,
      damage,
      spawnTick: state.tick
    };
    state.projectiles.push(projectile);
    events.push({ type: 'ProjectileSpawned', projectile: clone(projectile) });
  };

  for (const enemy of enemies) spawnEnemy(enemy, null);
  state.rngState = rng.snapshot();

  return {
    snapshot() { return clone(state); },
    step({ action = 'NOOP', tick } = {}) {
      if (state.terminal) return { accepted: false, events: [], terminal: clone(state.terminal) };
      if (tick !== undefined && tick !== state.tick) {
        return { accepted: false, events: [], terminal: clone(state.terminal ?? null) };
      }
      const input = normalizeInput(action);
      if (!input) return { accepted: false, events: [], terminal: clone(state.terminal ?? null) };

      const events = [];
      const r = state.rules;
      const p = state.player;
      const playerBefore = { x: p.x, y: p.y };
      let [mx, my] = input.move;
      const magnitude = length(mx, my);
      if (magnitude > 1) { mx /= magnitude; my /= magnitude; }
      p.x = clamp(p.x + mx * r.playerSpeed * DT, p.radius, r.width - p.radius);
      p.y = clamp(p.y + my * r.playerSpeed * DT, p.radius, r.height - p.radius);
      if (mx || my || input.fire) state.inputCount++;
      if (p.x !== playerBefore.x || p.y !== playerBefore.y) {
        events.push({ type: 'EntityMoved', id: p.id, x: p.x, y: p.y });
      }
      if (length(...input.aim) > EPS) p.aim = unit(...input.aim);
      p.cooldown = Math.max(0, p.cooldown - 1);
      if (input.fire && p.cooldown === 0) {
        p.cooldown = r.fireIntervalTicks;
        state.shots++;
        spawnProjectile('player', p.x, p.y, p.aim, r.projectileSpeed, r.projectileDamage, events);
      }

      while (state.spawnIndex < state.futureSpawns.length &&
             state.futureSpawns[state.spawnIndex].tick <= state.tick) {
        spawnEnemy(state.futureSpawns[state.spawnIndex++], events);
      }

      const oldEnemies = new Map();
      for (const enemy of state.enemies.slice().sort((a, b) => a.id - b.id)) {
        oldEnemies.set(enemy.id, { x: enemy.x, y: enemy.y });
        const [dx, dy] = unit(p.x - enemy.x, p.y - enemy.y, [0, 0]);
        enemy.vx = dx * enemy.speed;
        enemy.vy = dy * enemy.speed;
        enemy.x = clamp(enemy.x + enemy.vx * DT, enemy.radius, r.width - enemy.radius);
        enemy.y = clamp(enemy.y + enemy.vy * DT, enemy.radius, r.height - enemy.radius);
        if (enemy.vx || enemy.vy) events.push({ type: 'EntityMoved', id: enemy.id, x: enemy.x, y: enemy.y });
        enemy.contactCooldown = Math.max(0, enemy.contactCooldown - 1);
        if (enemy.fireIntervalTicks > 0) {
          enemy.fireCooldown--;
          if (enemy.fireCooldown <= 0) {
            spawnProjectile('enemy', enemy.x, enemy.y, [p.x - enemy.x, p.y - enemy.y],
              r.enemyProjectileSpeed, r.enemyDamage, events);
            enemy.fireCooldown = enemy.fireIntervalTicks;
          }
        }
      }

      const candidates = [];
      const oldProjectiles = new Map();
      for (const projectile of state.projectiles.slice().sort((a, b) => a.id - b.id)) {
        const previous = { x: projectile.x, y: projectile.y };
        oldProjectiles.set(projectile.id, previous);
        projectile.x += projectile.vx * DT;
        projectile.y += projectile.vy * DT;
        events.push({ type: 'ProjectileMoved', id: projectile.id, x: projectile.x, y: projectile.y });
        if (projectile.owner === 'player') {
          for (const enemy of state.enemies) {
            const time = sweptCollision(previous, projectile, oldEnemies.get(enemy.id), enemy,
              projectile.radius + enemy.radius);
            if (time !== null) candidates.push({ time, projectile, target: enemy });
          }
        } else {
          const time = sweptCollision(previous, projectile, playerBefore, p, projectile.radius + p.radius);
          if (time !== null) candidates.push({ time, projectile, target: p });
        }
      }
      candidates.sort((a, b) => a.time - b.time || a.projectile.id - b.projectile.id || a.target.id - b.target.id);
      const destroyedProjectiles = new Set();
      const destroyedEnemies = new Set();
      const applyDamage = (target, damage, source, time) => {
        if (target.hp <= 0) return;
        const actual = Math.min(target.hp, damage);
        target.hp = Math.max(0, target.hp - damage);
        events.push({ type: 'DamageApplied', targetId: target.id, sourceId: source, amount: actual, hp: target.hp, time });
        if (target.id === 0) state.damageTaken += actual;
        else if (target.hp === 0) {
          destroyedEnemies.add(target.id);
          state.kills++;
          state.score += 100;
          state.killTimes.push(state.tick + 1 - target.spawnTick);
          if (state.firstKillTick === null) state.firstKillTick = state.tick + 1;
        }
      };
      for (const collision of candidates) {
        const { projectile, target, time } = collision;
        if (destroyedProjectiles.has(projectile.id) || target.hp <= 0) continue;
        destroyedProjectiles.add(projectile.id);
        if (projectile.owner === 'player') state.hits++;
        applyDamage(target, projectile.damage, projectile.id, time);
      }
      for (const enemy of state.enemies.slice().sort((a, b) => a.id - b.id)) {
        if (enemy.hp > 0 && enemy.contactCooldown === 0 && p.hp > 0) {
          const time = sweptCollision(playerBefore, p, oldEnemies.get(enemy.id), enemy, p.radius + enemy.radius);
          if (time !== null) {
            applyDamage(p, r.enemyDamage, enemy.id, time);
            enemy.contactCooldown = r.contactIntervalTicks;
          }
        }
      }
      for (const projectile of state.projectiles) {
        if (projectile.x < -projectile.radius || projectile.x > r.width + projectile.radius ||
            projectile.y < -projectile.radius || projectile.y > r.height + projectile.radius) {
          destroyedProjectiles.add(projectile.id);
        }
      }
      for (const id of [...destroyedProjectiles].sort((a, b) => a - b)) {
        events.push({ type: 'EntityDestroyed', id, entityType: 'projectile' });
      }
      for (const id of [...destroyedEnemies].sort((a, b) => a - b)) {
        events.push({ type: 'EntityDestroyed', id, entityType: 'enemy' });
      }
      state.projectiles = state.projectiles.filter((projectile) => !destroyedProjectiles.has(projectile.id));
      state.enemies = state.enemies.filter((enemy) => !destroyedEnemies.has(enemy.id));

      state.tick++;
      state.turn++;
      if (p.hp === 0) {
        state.terminal = { status: 'LOSE', reason: 'PLAYER_DESTROYED' };
        events.push({ type: 'EntityDestroyed', id: 0, entityType: 'player' });
      } else if (state.enemies.length === 0 && state.spawnIndex === state.futureSpawns.length) {
        state.terminal = { status: 'WIN', reason: 'ALL_ENEMIES_DESTROYED' };
      } else if (state.tick >= r.maxTicks) {
        state.terminal = { status: 'LOSE', reason: 'TIME_LIMIT' };
      }
      if (state.terminal) events.push({ type: state.terminal.status === 'WIN' ? 'ObjectiveCompleted' : 'GameEnded', ...state.terminal });
      events.push({ type: 'StateAdvanced', tick: state.tick, score: state.score, shots: state.shots, hits: state.hits, playerCooldown: p.cooldown });
      state.rngState = rng.snapshot();
      return { accepted: true, events: clone(events), terminal: clone(state.terminal ?? null) };
    }
  };
}