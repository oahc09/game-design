export function createGame({ content = {}, seed = 1 } = {}) {
  const defaults = {
    player: { position: [50, 80], health: 3 },
    enemies: [{ id: 'e1', position: [50, 20], health: 2 }, { id: 'e2', position: [25, 30], health: 1 }],
    projectiles: [],
  };
  const base = content.initial_snapshot ?? {};
  const initial = {
    player: structuredClone(content.player ?? base.player ?? defaults.player),
    enemies: structuredClone(content.enemies ?? base.enemies ?? defaults.enemies),
    projectiles: structuredClone(content.projectiles ?? base.projectiles ?? defaults.projectiles).map((p,i)=>({id:p.id??`p${i+1}`,position:[...p.position],damage:Number.isFinite(p.damage)?p.damage:1})),
    tick: Number.isInteger(base.tick) ? base.tick : 0,
    terminal: base.terminal ?? null,
    cooldown: Number.isInteger(base.cooldown) ? base.cooldown : 0,
    paused: false,
  };
  let s;
  let seq;
  const copy = (v) => JSON.parse(JSON.stringify(v));
  function reset() { s = copy(initial); seq = 0; return snapshot(); }
  function snapshot() { return {...copy(s),bounds:copy(content.bounds??[0,0,100,100])}; }
  function step({ action } = {}) {
    const events = [];
    const raw = typeof action === 'string' ? action : (action?.action ?? action?.key ?? action?.direction ?? action?.type);
    if (raw === 'restart' || raw === 'r' || raw === 'R') { reset(); return { accepted: true, events, terminal: null }; }
    if (raw === 'pause' || raw === 'p' || raw === 'P') { s.paused = !s.paused; return { accepted: true, events, terminal: s.terminal }; }
    if (s.paused || s.terminal) return { accepted: false, events, terminal: s.terminal };
    const input = typeof action === 'object' && action !== null ? action : {};
    let [dx, dy] = Array.isArray(input.move) ? input.move : [0, 0];
    const key = String(raw ?? '');
    if (!dx) dx = (key === 'ArrowRight' || key === 'right' ? 1 : 0) - (key === 'ArrowLeft' || key === 'left' ? 1 : 0);
    if (!dy) dy = (key === 'ArrowDown' || key === 'down' ? 1 : 0) - (key === 'ArrowUp' || key === 'up' ? 1 : 0);
    const length = Math.hypot(dx, dy);
    if (length > 1) { dx /= length; dy /= length; }
    const bounds = content.bounds ?? [0, 0, 100, 100];
    const [x, y] = s.player.position;
    s.player.position = [Math.max(bounds[0], Math.min(bounds[2], x + dx)), Math.max(bounds[1], Math.min(bounds[3], y + dy))];
    const fire = input.fire === true || raw === 'fire' || raw === ' ' || raw === 'Space';
    s.tick++;
    if (fire && s.cooldown === 0) {
      let id; do { id = `p${++seq}`; } while (s.projectiles.some(p => p.id === id));
      s.projectiles.push({ id, position: [s.player.position[0], s.player.position[1] - 3], damage: 1 });
      s.cooldown = 10;
    }
    if (s.cooldown > 0) s.cooldown--;
    for (const p of [...s.projectiles]) {
      const target = s.enemies.find(e => Array.isArray(e?.position) && e.position.length >= 2 && Number.isFinite(e.position[0]) && Number.isFinite(e.position[1]) && Math.hypot(e.position[0] - p.position[0], e.position[1] - p.position[1]) < 4);
      if (!target) continue;
      target.health -= p.damage;
      events.push({ type: 'DAMAGE', target: target.id, projectile: p.id });
      s.projectiles = s.projectiles.filter(q => q !== p);
      if (target.health <= 0) {
        events.push({ type: 'DESTROY', target: target.id });
        s.enemies = s.enemies.filter(e => e !== target);
      }
    }
    for (const p of s.projectiles) p.position[1] -= 4;
    s.projectiles = s.projectiles.filter(p => p.position[1] >= 0);
    if (!s.enemies.length) s.terminal = { status: 'won', reason: 'all_enemies_destroyed' };
    return { accepted: true, events, terminal: s.terminal };
  }
  reset();
  return { snapshot, step, reset };
}



