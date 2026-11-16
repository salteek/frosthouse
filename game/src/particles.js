// Sparks, embers, spray and floating score text: short-lived feedback for every action.

export function spawnBurst(world, x, y, opts = {}) {
  const { count = 14, color = '#ffd98a', speed = 160, life = 0.6, size = 3, drag = 2.4, glow = true } = opts;
  const rng = world.rng;
  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const s = rng.range(speed * 0.3, speed);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rng.range(life * 0.6, life),
      max: life,
      size: rng.range(size * 0.6, size * 1.3),
      color, drag, glow,
    });
  }
}

export function spawnSpray(world, x, y, angle, count = 8) {
  const rng = world.rng;
  for (let i = 0; i < count; i++) {
    const a = angle + rng.range(-0.7, 0.7);
    const s = rng.range(60, 190);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rng.range(0.3, 0.7),
      max: 0.7,
      size: rng.range(1.5, 3),
      color: '#9fd6ff',
      drag: 3,
      glow: false,
    });
  }
}

export function addFloater(world, x, y, text, color = '#f4ead5', size = 18) {
  world.floaters.push({ x, y, text, color, size, life: 1.1, max: 1.1 });
}

// A painted sprite that pops in, swells a little and fades: sparks, rings, confetti.
export function addFlash(world, name, x, y, size, life) {
  (world.flashes ??= []).push({ name, x, y, size, life, max: life, rot: world.rng.range(0, Math.PI * 2) });
}

export function updateParticles(world, dt) {
  const fl = world.flashes ?? [];
  for (let i = fl.length - 1; i >= 0; i--) if ((fl[i].life -= dt) <= 0) fl.splice(i, 1);
  const ps = world.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.life -= dt;
    if (p.life <= 0) {
      ps[i] = ps[ps.length - 1];
      ps.pop();
      continue;
    }
    const k = Math.exp(-p.drag * dt);
    p.vx *= k;
    p.vy *= k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  if (ps.length > 900) ps.splice(0, ps.length - 900);

  const fs = world.floaters;
  for (let i = fs.length - 1; i >= 0; i--) {
    const f = fs[i];
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) fs.splice(i, 1);
  }
}
