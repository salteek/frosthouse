// The match's spectacle: glowing frost ribbons behind running stones, sprite particles that spin and
// swell (ice shards, sparks, stars), confetti that flutters down, fireworks and a hit-stop on big hits.
// All of it lives in scene.fx and is stepped with the match, so a frame can be staged and reproduced.

import { drawSprite } from './render/sprites.js';
import { TAU } from './geometry.js';

const rnd = (w, [a, b]) => w.rng.range(a, b);

// A painted sprite that pops in, swells (grow), spins and fades: sparks, rings, confetti flashes.
export function addFlash(w, name, x, y, size, life, o = {}) {
  (w.flashes ??= []).push({ name, x, y, size, life, max: life, rot: w.rng.range(0, TAU), spin: o.spin ?? 0, grow: o.grow ?? 0.6, blend: o.blend, delay: o.delay ?? 0 });
}

// Sprite particles flung from a point.
export function burstSprites(w, name, x, y, o = {}) {
  const n = o.count ?? 8;
  for (let i = 0; i < n; i++) {
    const a = o.angle != null ? o.angle + w.rng.range(-(o.spread ?? 0.6), o.spread ?? 0.6) : w.rng.range(0, TAU);
    const s = rnd(w, o.speed ?? [120, 300]);
    const life = rnd(w, o.life ?? [0.4, 0.8]);
    (w.sprites ??= []).push({
      name, x, y, vx: Math.cos(a) * s + (o.vx ?? 0), vy: Math.sin(a) * s + (o.vy ?? 0),
      rot: w.rng.range(0, TAU), vr: w.rng.range(-1, 1) * (o.spin ?? 4), size: rnd(w, o.size ?? [14, 26]),
      grow: o.grow ?? 0, life, max: life, gravity: o.gravity ?? 0, drag: o.drag ?? 2.2, blend: o.blend ?? 'lighter',
    });
  }
}

// Paper confetti: flat flakes that flip as they fall and sway on the air.
const CONFETTI = ['#ff4d6d', '#ffd23f', '#3ddc97', '#4aa8ff', '#b46bff', '#ff8a3d', '#ffffff'];
export function confettiRain(w, x0, x1, y, n) {
  for (let i = 0; i < n; i++) {
    const life = w.rng.range(1.6, 2.8);
    (w.confetti ??= []).push({
      x: w.rng.range(x0, x1), y: y + w.rng.range(-90, 30), vx: w.rng.range(-90, 90), vy: w.rng.range(-260, -40),
      w: w.rng.range(5, 10), h: w.rng.range(8, 15), color: CONFETTI[i % CONFETTI.length], flip: w.rng.range(0, TAU),
      flipV: w.rng.range(6, 14), rot: w.rng.range(0, TAU), vr: w.rng.range(-5, 5), sway: w.rng.range(0, TAU), life, max: life,
    });
  }
}

// Granite on granite: a white-hot spark, two shockwave rings, ice shards and snow thrown out, a hit-stop.
export function impact(w, x, y, impulse) {
  const k = Math.min(1.6, impulse);
  addFlash(w, 'spark_a', x, y, 60 + k * 90, 0.32, { spin: 2.5, grow: 0.9, blend: 'lighter' });
  addFlash(w, 'ring_a', x, y, 36 + k * 30, 0.5, { grow: 2.6, blend: 'lighter' });
  if (k > 0.45) addFlash(w, 'ring_b', x, y, 26, 0.65, { grow: 4.2, blend: 'lighter', delay: 0.06 });
  burstSprites(w, 'shards', x, y, { count: 5 + Math.round(k * 9), speed: [200, 520], size: [14, 28], life: [0.35, 0.75], spin: 9 });
  burstSprites(w, 'snowflake', x, y, { count: 2 + Math.round(k * 4), speed: [70, 240], size: [12, 22], life: [0.6, 1.1], spin: 3 });
  burstSprites(w, 'spark_star', x, y, { count: 3 + Math.round(k * 3), speed: [260, 460], size: [12, 22], life: [0.2, 0.4], spin: 0, grow: -0.6 });
  w.flash = Math.max(w.flash ?? 0, 0.1 + 0.12 * k);
  w.hitstop = Math.max(w.hitstop ?? 0, Math.min(0.11, 0.035 + k * 0.05));
}

// A great shot: fireworks over the house, a ring wave from the stone, confetti from the stands.
export function celebrate(w, x, y) {
  confettiRain(w, 160, 1120, 150, 150);
  addFlash(w, 'ring_b', x, y, 40, 0.9, { grow: 5, blend: 'lighter' });
  addFlash(w, 'spark_b', x, y, 130, 0.5, { spin: 1.5, grow: 0.7, blend: 'lighter' });
  for (let i = 0; i < 4; i++) {
    const fx = x + w.rng.range(-300, 300);
    const fy = Math.max(170, y - w.rng.range(60, 200));
    addFlash(w, i % 2 ? 'spark_star' : 'star', fx, fy, 90, 0.55, { grow: 1.2, blend: 'lighter', delay: i * 0.12 });
    burstSprites(w, 'star', fx, fy, { count: 10, speed: [180, 340], size: [12, 22], life: [0.7, 1.1], spin: 2, gravity: 160, drag: 1.4 });
  }
  burstSprites(w, 'sparkles', x, y - 30, { count: 6, speed: [60, 200], size: [30, 50], life: [0.6, 1.0], spin: 1 });
}

// A good shot: a smaller glitter of stars.
export function sparkle(w, x, y) {
  addFlash(w, 'sparkles', x, y, 90, 0.7, { grow: 0.8, blend: 'lighter' });
  burstSprites(w, 'star', x, y, { count: 7, speed: [120, 260], size: [10, 18], life: [0.5, 0.8], spin: 2, gravity: 90 });
}

// Ice kicked up by the brooms, flying back past the stone.
export function sweepSpray(w, x, y) {
  burstSprites(w, w.rng.chance(0.5) ? 'shards' : 'snowflake', x, y, { count: 1, angle: Math.PI, spread: 0.9, speed: [90, 260], size: [8, 15], life: [0.3, 0.55], spin: 6 });
}

export function updateFx(w, dt) {
  for (const list of [w.flashes, w.sprites, w.confetti]) {
    if (!list) continue;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      if ((p.life -= dt) <= 0) { list.splice(i, 1); continue; }
      if (p.vx !== undefined) {
        if (p.flip !== undefined) {
          // Confetti: air drag pulls it to a slow flutter, sway pushes it side to side.
          p.vy += 320 * dt;
          p.vx *= Math.exp(-1.6 * dt);
          p.vy = Math.min(p.vy, 120);
          p.x += (p.vx + Math.sin(p.sway + p.life * 4) * 40) * dt;
          p.y += p.vy * dt;
          p.flip += p.flipV * dt;
          p.rot += p.vr * dt;
        } else {
          const d = Math.exp(-p.drag * dt);
          p.vx *= d;
          p.vy = p.vy * d + p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
        }
      }
    }
  }
  if (w.flash) w.flash = Math.max(0, w.flash - dt * 1.6);
}

export function drawFxLayer(ctx, w) {
  for (const f of w.flashes ?? []) {
    if (f.delay > 0) continue;
    const k = 1 - f.life / f.max;
    const pop = Math.min(1, k * 4);
    drawSprite(ctx, f.name, f.x, f.y, f.size * (0.5 + 0.5 * pop + f.grow * k), { ay: 0.5, rot: f.rot + f.spin * k, alpha: Math.min(1, (f.life / f.max) * 2.2), blend: f.blend });
  }
  for (const p of w.sprites ?? []) {
    const k = 1 - p.life / p.max;
    drawSprite(ctx, p.name, p.x, p.y, p.size * Math.max(0.1, 1 + p.grow * k), { ay: 0.5, rot: p.rot, alpha: Math.min(1, (p.life / p.max) * 1.8), blend: p.blend });
  }
  for (const c of w.confetti ?? []) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (c.life / c.max) * 2.5);
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.scale(Math.cos(c.flip), 1);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * 0.3);
    ctx.restore();
  }
}

// ---- Frost ribbons: each running stone leaves a glowing trail along the path it really took.

export function recordTrails(scene, dt) {
  const T = (scene.trails ??= new Map());
  for (const s of scene.match.stones) {
    if (!s.moving || s.out) continue;
    let t = T.get(s.id);
    if (!t) T.set(s.id, (t = { pts: [], fade: 1 }));
    t.fade = 1;
    t.hot = s.team === 'player' && scene.match.streak >= 2;
    const last = t.pts[t.pts.length - 1];
    if (!last || Math.hypot(last.x - s.x, last.y - s.y) > 0.06) t.pts.push({ x: s.x, y: s.y, swept: !!s.swept });
    if (t.pts.length > 46) t.pts.shift();
  }
  for (const [id, t] of T) {
    const s = scene.match.stones.find((x) => x.id === id);
    if (s && s.moving && !s.out) continue;
    t.fade -= dt * 1.4;
    if (t.pts.length > 1) t.pts.shift();
    if (t.fade <= 0) T.delete(id);
  }
}

export function drawTrails(ctx, scene, sx, sy, time) {
  if (!scene.trails) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const t of scene.trails.values()) {
    const P = t.pts;
    if (P.length < 2) continue;
    // A hot streak burns gold; otherwise the frost glows cyan, brighter where it was swept.
    const outer = t.hot ? '255,150,40' : '70,190,255';
    const inner = t.hot ? '255,220,120' : '170,235,255';
    const pts = P.map((p) => [sx(p.x), sy(p.y)]);
    const [hx, hy] = pts[pts.length - 1], [tx, ty] = pts[0];
    // Each layer is one smooth stroke, fading from nothing at the tail to full at the stone,
    // and the layers get shorter toward the head so the ribbon tapers.
    const layer = (from, width, rgb, alpha) => {
      const seg = pts.slice(Math.floor(from * (pts.length - 1)));
      if (seg.length < 2) return;
      const g = ctx.createLinearGradient(seg[0][0], seg[0][1], hx, hy);
      g.addColorStop(0, `rgba(${rgb},0)`);
      g.addColorStop(1, `rgba(${rgb},${(alpha * t.fade).toFixed(3)})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      seg.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    };
    const flick = 1 + Math.sin(time * 30) * 0.06;
    layer(0, 30 * flick, outer, 0.22);
    layer(0.35, 18 * flick, outer, 0.3);
    layer(0.1, 9, inner, 0.55);
    layer(0.5, 4, '255,255,255', 0.85);
    void tx; void ty;
  }
  ctx.restore();
}
