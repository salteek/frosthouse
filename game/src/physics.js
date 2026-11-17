// Stone physics on the sheet: sliding friction, curl from the stone's turn, sweeping, wind, drifts, and collisions.
// Pure and deterministic, so the AI and the path preview can run the same rules ahead of time.

import { PHYS, SHEET } from './config.js';

let nextStoneId = 1;

export function createStone(team, x, y, opts = {}) {
  return {
    id: nextStoneId++,
    team,
    x, y,
    vx: 0, vy: 0,
    turn: opts.turn ?? 1,
    mass: opts.mass ?? 1,
    frictionMul: opts.frictionMul ?? 1,
    curlMul: opts.curlMul ?? 1,
    moving: false,
    out: false,
    touched: false,
    swept: false,
    spin: 0,
  };
}

export function launch(stone, aimY, speed) {
  // The skip holds the broom on the tee line at aimY; the stone sets off toward it.
  const dx = SHEET.tee;
  const dy = aimY;
  const len = Math.hypot(dx, dy);
  stone.vx = (dx / len) * speed;
  stone.vy = (dy / len) * speed;
  stone.moving = true;
}

export function cloneStones(stones) {
  return stones.map((s) => ({ ...s }));
}

export function patchAt(venue, x, y) {
  for (const p of venue.patches) {
    const u = (x - p.x) / p.rx;
    const v = (y - p.y) / p.ry;
    if (u * u + v * v <= 1) return p;
  }
  return null;
}

// Advance every stone by dt seconds of sheet time. Returns the collisions and the stones that went out.
export function stepStones(stones, venue, dt) {
  const events = [];
  const R = SHEET.stoneR;
  for (const s of stones) {
    if (!s.moving || s.out) continue;
    const speed = Math.hypot(s.vx, s.vy);
    if (speed < PHYS.stopSpeed) {
      s.vx = 0;
      s.vy = 0;
      s.moving = false;
      continue;
    }
    const patch = patchAt(venue, s.x, s.y);
    let friction = PHYS.friction * venue.friction * s.frictionMul;
    let curl = PHYS.curl * venue.curl * s.curlMul;
    if (patch) {
      friction *= patch.drag;
      if (patch.kind === 'slush') curl *= 1.3;
    }
    if (s.swept) {
      friction *= s.sweepFriction ?? PHYS.sweepFriction;
      curl *= s.sweepCurl ?? PHYS.sweepCurl;
    }
    const ux = s.vx / speed;
    const uy = s.vy / speed;
    // Curl pushes sideways, more as the stone slows; a struck stone that lost its spin curls little.
    const lateral = (curl * s.turn * (s.touched ? 0.35 : 1)) / (speed + 0.35);
    let ax = -ux * friction + -uy * lateral;
    let ay = -uy * friction + ux * lateral + venue.wind;
    const nvx = s.vx + ax * dt;
    const nvy = s.vy + ay * dt;
    // Friction never reverses a stone.
    if (nvx * s.vx + nvy * s.vy <= 0) {
      s.vx = 0;
      s.vy = 0;
      s.moving = false;
    } else {
      s.vx = nvx;
      s.vy = nvy;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.spin += s.turn * dt * (1.5 + speed);
  }

  for (let i = 0; i < stones.length; i++) {
    const a = stones[i];
    if (a.out) continue;
    for (let j = i + 1; j < stones.length; j++) {
      const b = stones[j];
      if (b.out || (!a.moving && !b.moving)) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= 4 * R * R || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      // Push apart so they no longer overlap, weighted by mass.
      const overlap = 2 * R - d;
      const ma = a.mass;
      const mb = b.mass;
      a.x -= nx * overlap * (mb / (ma + mb));
      a.y -= ny * overlap * (mb / (ma + mb));
      b.x += nx * overlap * (ma / (ma + mb));
      b.y += ny * overlap * (ma / (ma + mb));
      if (rel <= 0) continue;
      const j2 = ((1 + PHYS.restitution) * rel) / (1 / ma + 1 / mb);
      a.vx -= (j2 / ma) * nx;
      a.vy -= (j2 / ma) * ny;
      b.vx += (j2 / mb) * nx;
      b.vy += (j2 / mb) * ny;
      a.moving = true;
      b.moving = true;
      a.touched = true;
      b.touched = true;
      events.push({ type: 'hit', a, b, impulse: j2 });
    }
  }

  const half = SHEET.width / 2;
  for (const s of stones) {
    if (s.out) continue;
    let why = null;
    if (Math.abs(s.y) + R > half) why = 'side';
    else if (s.x - R > SHEET.back) why = 'back';
    if (why) {
      s.out = true;
      s.moving = false;
      events.push({ type: 'out', stone: s, why });
    }
  }
  return events;
}

export function anyMoving(stones) {
  return stones.some((s) => s.moving && !s.out);
}

// Run a copy of the stones to rest. `sweep(stone, t)` decides sweeping; `track` records one stone's path.
export function simulate(stones, venue, opts = {}) {
  const sim = cloneStones(stones);
  const track = opts.trackId != null ? sim.find((s) => s.id === opts.trackId) : null;
  const path = [];
  const events = [];
  let t = 0;
  const maxT = opts.maxT ?? 60;
  let sample = 0;
  while (anyMoving(sim) && t < maxT) {
    if (opts.sweep) for (const s of sim) s.swept = s.moving && opts.sweep(s, t);
    const ev = stepStones(sim, opts.venue ?? venue, PHYS.dt);
    for (const e of ev) events.push(e);
    t += PHYS.dt;
    if (track && (sample++ % 6 === 0)) path.push({ x: track.x, y: track.y });
    if (opts.stopOnHit && ev.some((e) => e.type === 'hit')) break;
  }
  if (track) path.push({ x: track.x, y: track.y });
  return { stones: sim, path, events, time: t };
}

// The weight slider is not linear: most of its travel is spent where touch matters, between a guard and the back of the house.
const WEIGHT_KNOTS = [
  [0, 1.9],
  [0.24, 2.035],
  [0.47, 2.225],
  [0.62, 2.6],
  [0.84, 3.2],
  [1, 3.75],
];

export function speedFromWeight(w) {
  const t = Math.max(0, Math.min(1, w));
  for (let i = 1; i < WEIGHT_KNOTS.length; i++) {
    const [w1, v1] = WEIGHT_KNOTS[i];
    const [w0, v0] = WEIGHT_KNOTS[i - 1];
    if (t <= w1) return v0 + ((t - w0) / (w1 - w0)) * (v1 - v0);
  }
  return WEIGHT_KNOTS[WEIGHT_KNOTS.length - 1][1];
}

export function weightFromSpeed(v) {
  for (let i = 1; i < WEIGHT_KNOTS.length; i++) {
    const [w1, v1] = WEIGHT_KNOTS[i];
    const [w0, v0] = WEIGHT_KNOTS[i - 1];
    if (v <= v1) return w0 + ((v - v0) / (v1 - v0)) * (w1 - w0);
  }
  return 1;
}
