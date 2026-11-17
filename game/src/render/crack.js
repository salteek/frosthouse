// "THE GLACIER CRACKS!": glowing cracks race out through the ice from the button, shards burst off,
// her obstacles melt away, and a faint scar of the cracks stays in the ice for the rest of the final.
// The cracks are built once in sheet metres (so they sit still on the ice as the camera moves) and grow
// outward from the button. Kept local to the house: no screen shake and no full-screen flash.

import { SHEET } from '../config.js';
import { TAU } from '../geometry.js';
import { createRng } from '../rng.js';
import { sx, sy, px } from './camera.js';

const GROW = 3.4;        // metres of crack per second
const BURST_AT = 0.75;   // seconds in, when the shards fly
const BRIGHT = 1.6;      // seconds at full glow, before it settles to a scar
const SCAR = 0.28;

// Branches as polylines in sheet metres; `d0` is how far the crack front has travelled when a point appears.
function buildCracks(seed) {
  const rng = createRng(seed);
  const lines = [];
  const grow = (x, y, a, len, d0, depth) => {
    const pts = [{ x, y, d: d0 }];
    let d = d0;
    for (let s = 0; s < len; s += 0.16) {
      a += rng.range(-0.38, 0.38);
      x += Math.cos(a) * 0.16;
      y += Math.sin(a) * 0.16;
      d += 0.16;
      // Keep the cracks on the sheet.
      if (Math.abs(y) > SHEET.width / 2 - 0.05) break;
      pts.push({ x, y, d });
      if (depth < 2 && s > 0.3 && rng.chance(0.13)) grow(x, y, a + rng.pick([-1, 1]) * rng.range(0.5, 1.0), len * rng.range(0.3, 0.5), d, depth + 1);
    }
    lines.push({ pts, w: depth === 0 ? 1 : depth === 1 ? 0.65 : 0.4 });
  };
  const n = 8;
  for (let i = 0; i < n; i++) grow(SHEET.tee, 0, (i / n) * TAU + rng.range(-0.25, 0.25), rng.range(1.7, 2.7), 0, 0);
  return lines;
}

export function startCrack(scene) {
  scene.crack = { t: 0, lines: buildCracks(4242 + (scene.match.end ?? 0)), burst: false };
}

export function updateCrack(scene, dt) {
  if (scene.crack) scene.crack.t += dt;
}

export const crackBurstDue = (scene) => {
  const c = scene.crack;
  if (!c || c.burst || c.t < BURST_AT) return false;
  c.burst = true;
  return true;
};

// The cracks on the ice: under the stones, over the sheet.
export function drawCrack(ctx, scene) {
  const c = scene.crack;
  if (!c) return;
  const front = c.t * GROW;
  const glow = c.t < BRIGHT ? 1 : Math.max(SCAR, 1 - (c.t - BRIGHT) / 1.4);
  const cam = scene.cam;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // A dark seam first, then the light leaking out of it.
  const passes = [
    { style: `rgba(6,20,48,${(0.55 * Math.max(glow, 0.6)).toFixed(3)})`, width: 4.5, blend: 'source-over' },
    { style: `rgba(110,215,255,${(0.32 * glow).toFixed(3)})`, width: 9, blend: 'lighter' },
    { style: `rgba(235,250,255,${(0.95 * glow).toFixed(3)})`, width: 1.8, blend: 'lighter' },
  ];
  for (const p of passes) {
    ctx.globalCompositeOperation = p.blend;
    ctx.strokeStyle = p.style;
    for (const l of c.lines) {
      if (l.pts[0].d > front) continue;
      ctx.lineWidth = p.width * l.w;
      ctx.beginPath();
      ctx.moveTo(sx(cam, l.pts[0].x), sy(l.pts[0].y));
      for (let i = 1; i < l.pts.length && l.pts[i].d <= front; i++) ctx.lineTo(sx(cam, l.pts[i].x), sy(l.pts[i].y));
      ctx.stroke();
    }
  }
  // A cold glow at the button where it broke, fading out.
  if (c.t < 2.2) {
    const k = 1 - c.t / 2.2;
    const x = sx(cam, SHEET.tee), y = sy(0);
    const g = ctx.createRadialGradient(x, y, 0, x, y, px(1.4));
    g.addColorStop(0, `rgba(200,245,255,${(0.5 * k).toFixed(3)})`);
    g.addColorStop(1, 'rgba(120,210,255,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, px(1.4), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// The tips of the main cracks, in screen space, for the shard bursts.
export function crackTips(scene) {
  return (scene.crack?.lines ?? []).filter((l) => l.w === 1).map((l) => {
    const p = l.pts[l.pts.length - 1];
    return { x: sx(scene.cam, p.x), y: sy(p.y) };
  });
}
