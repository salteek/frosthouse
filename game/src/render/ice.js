// The frozen lake: snowbanks, pines and the crowd, the sheet with its pebble, lines and house, drifts, slush and wind.

import { SHEET, VIEW, PALETTE, CAMERA } from '../config.js';
import { createRng } from '../rng.js';
import { TAU } from '../geometry.js';
import { sx, sy, px, SHEET_BOTTOM } from './camera.js';
import { spriteCanvas, drawSprite, drawSpriteBox, drawCover, drawStripFaded } from './sprites.js';

// The fans in the stands: the painted curlers, calm until a great shot sets them jumping.
const FANS = ['idle_blue', 'idle_yellow', 'thumbs_blue', 'idle_goggles', 'idle_red', 'idle_pink', 'idle_teal', 'idle_green', 'thumbs_navy', 'fist_green'];
const CHEER = ['cheer_blue', 'cheer_green', 'cheer_pink', 'cheer_green2', 'fist_green', 'thumbs_blue'];

const scenery = (() => {
  const rng = createRng(2026);
  const pebble = [];
  for (let i = 0; i < 900; i++) pebble.push({ x: rng.range(-8, SHEET.end + 2), y: rng.range(-SHEET.width / 2, SHEET.width / 2), r: rng.range(0.6, 1.6) });
  const pines = [];
  const jewels = ['#1fae9a', '#d23d9b', '#d9a521', '#2f7be0', '#7b4fd6', '#1e8f62'];
  for (let i = 0; i < 70; i++) pines.push({ x: rng.range(-10, SHEET.end + 12), h: rng.range(44, 92), shade: rng.chance(0.5), col: rng.pick(jewels) });
  const crowd = [];
  const coats = ['#e0383e', '#2f6fd6', '#f2b53a', '#2fa86b', '#9b6ad6', '#ff7a45', '#1d2a3a', '#f6fbff'];
  for (let i = 0; i < 260; i++) crowd.push({ x: rng.range(-12, SHEET.end + 12), row: rng.int(0, 1), coat: rng.pick(coats), hat: rng.pick(coats), phase: rng.range(0, TAU), fan: rng.int(0, 9), cheer: rng.int(0, 5), flip: rng.chance(0.5) });
  crowd.sort((a, b) => a.row - b.row);
  const flakes = [];
  for (let i = 0; i < 90; i++) flakes.push({ x: rng.range(0, VIEW.w), y: rng.range(0, VIEW.h), s: rng.range(1, 2.6), v: rng.range(14, 34), d: rng.range(0, TAU) });
  // Skate-scratched night ice: long faint arcs, and glints that twinkle.
  const scratches = [];
  for (let i = 0; i < 140; i++) scratches.push({ x: rng.range(-6, SHEET.end), y: rng.range(-SHEET.width / 2, SHEET.width / 2), len: rng.range(0.6, 3.2), a: rng.range(-0.5, 0.5), bend: rng.range(-0.3, 0.3) });
  const glints = [];
  for (let i = 0; i < 260; i++) glints.push({ x: rng.range(-6, SHEET.end), y: rng.range(-SHEET.width / 2, SHEET.width / 2), ph: rng.range(0, TAU), s: rng.range(1.5, 3.5) });
  return { pebble, pines, crowd, flakes, scratches, glints };
})();

const SKIES = {
  morning: ['#bfe1f7', '#eaf6ff'],
  noon: ['#a9d7f5', '#e6f4ff'],
  afternoon: ['#b4d3ef', '#f3ead8'],
  dusk: ['#5b6fb5', '#f5b38a'],
};

export function drawBackdrop(ctx, cam, venue, time, excite = 0) {
  // Every match is played under lights on a winter night; dusk venues get the aurora too.
  const g = ctx.createLinearGradient(0, 0, 0, CAMERA.sheetTop);
  g.addColorStop(0, '#0a1630');
  g.addColorStop(1, '#1d3d6e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, CAMERA.sheetTop);
  // Each lake's own painted night scene, sliding gently with the camera for depth.
  const painted = drawCover(ctx, `bd_${venue.id}`, -60 - (cam.x - 20) * 4, 0, VIEW.w + 120, CAMERA.sheetTop - 4, 0.78);
  if (!painted && (venue.time === 'dusk' || venue.time === 'afternoon')) drawAurora(ctx, time);

  // Pines on the far shore (only when the lake's painting is missing).
  for (const p of painted ? [] : scenery.pines) {
    const x = (p.x - cam.x) * CAMERA.scale * 0.45 + VIEW.w / 2;
    if (x < -40 || x > VIEW.w + 40) continue;
    const base = 116;
    const tg = ctx.createLinearGradient(0, base - p.h, 0, base);
    tg.addColorStop(0, p.col);
    tg.addColorStop(1, p.shade ? '#0d1f3a' : '#16304f');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(x, base - p.h);
    ctx.lineTo(x + p.h * 0.36, base);
    ctx.lineTo(x - p.h * 0.36, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(235,245,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(x, base - p.h);
    ctx.lineTo(x + p.h * 0.1, base - p.h * 0.72);
    ctx.lineTo(x - p.h * 0.1, base - p.h * 0.72);
    ctx.closePath();
    ctx.fill();
  }

  // The snowbank and the crowd along it.
  const bank = ctx.createLinearGradient(0, 104, 0, CAMERA.sheetTop);
  bank.addColorStop(0, painted ? 'rgba(34,64,107,0.35)' : '#3a5f93');
  bank.addColorStop(1, painted ? 'rgba(20,40,72,0.85)' : '#22406b');
  ctx.fillStyle = bank;
  ctx.fillRect(0, 104, VIEW.w, CAMERA.sheetTop - 104);
  // Floodlight glow spilling over the crowd.
  const flood = ctx.createLinearGradient(0, 96, 0, CAMERA.sheetTop);
  flood.addColorStop(0, 'rgba(160,210,255,0)');
  flood.addColorStop(1, 'rgba(160,210,255,0.18)');
  ctx.fillStyle = flood;
  ctx.fillRect(0, 96, VIEW.w, CAMERA.sheetTop - 96);
  for (const c of scenery.crowd) {
    const x = (c.x - cam.x) * CAMERA.scale * 0.8 + VIEW.w / 2;
    if (x < -20 || x > VIEW.w + 20) continue;
    // Back row smaller and dimmer; when the crowd is excited, most jump and switch to a cheer.
    const back = c.row === 0;
    const h = back ? 30 : 38;
    const jumping = excite > 0 && Math.sin(c.phase * 7) > -0.6;
    const bounce = jumping ? Math.abs(Math.sin(time * 9 + c.phase)) * 9 * excite : Math.abs(Math.sin(time * 2 + c.phase)) * 1.2;
    const img = spriteCanvas(jumping ? CHEER[c.cheer] : FANS[c.fan], h);
    if (img) {
      const fy = (back ? 126 : CAMERA.sheetTop - 1) - bounce;
      ctx.save();
      if (back) ctx.globalAlpha = 0.8;
      ctx.translate(x, fy);
      if (c.flip) ctx.scale(-1, 1);
      ctx.drawImage(img, -img.width / 2, -img.height);
      ctx.restore();
      continue;
    }
    const y = 112 + c.row * 7 + Math.abs(Math.sin(time * 3 + c.phase)) * (time % 7 < 1.2 ? 3 : 0.6);
    ctx.fillStyle = c.coat;
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 5, 6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f3d2b5';
    ctx.beginPath();
    ctx.arc(x, y - 3, 3.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = c.hat;
    ctx.beginPath();
    ctx.arc(x, y - 5, 3.3, Math.PI, 0);
    ctx.fill();
  }
}

function drawAurora(ctx, time) {
  ctx.save();
  ctx.globalAlpha = 0.45;
  for (let band = 0; band < 3; band++) {
    ctx.strokeStyle = band === 1 ? '#7dffb5' : '#8fd8ff';
    ctx.lineWidth = 10 - band * 2;
    ctx.beginPath();
    for (let x = 0; x <= VIEW.w; x += 20) {
      const y = 30 + band * 14 + Math.sin(x * 0.006 + time * 0.4 + band) * 12;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSheet(ctx, cam, venue, time) {
  const top = sy(-SHEET.width / 2);
  const bottom = SHEET_BOTTOM;
  const left = sx(cam, -6);
  const right = sx(cam, SHEET.end);

  // Snow beyond the end of the sheet, banked up behind the hack with the Open's banner.
  ctx.fillStyle = '#152c4f';
  ctx.fillRect(0, top, VIEW.w, bottom - top);
  const bank = sx(cam, SHEET.end + 0.25);
  if (bank < VIEW.w) {
    const bg = ctx.createLinearGradient(bank, 0, bank + 90, 0);
    bg.addColorStop(0, '#1d3a64');
    bg.addColorStop(1, '#2b5285');
    ctx.fillStyle = bg;
    ctx.fillRect(bank, top - 6, VIEW.w - bank, bottom - top + 12);
    if (!drawSprite(ctx, 'banner_open', bank + 46, (top + bottom) / 2, bottom - top - 30, { ay: 0.5 })) {
      ctx.fillStyle = PALETTE.player;
      ctx.fillRect(bank + 26, top + 30, 34, bottom - top - 60);
      ctx.save();
      ctx.translate(bank + 43, (top + bottom) / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ FROST LAKE OPEN ★', 0, 0);
      ctx.restore();
    }
  }

  // Night ice: deep blue at the boards, lit along the centre line, the venue's tint washed over it.
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, '#123a6b');
  g.addColorStop(0.5, '#1f5a9c');
  g.addColorStop(1, '#0f3260');
  ctx.fillStyle = g;
  ctx.fillRect(left, top, right - left, bottom - top);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = venue.tint;
  ctx.fillRect(left, top, right - left, bottom - top);
  ctx.restore();
  // A sheen of floodlight across the ice.
  const sheen = ctx.createLinearGradient(0, top, VIEW.w, bottom);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.45, 'rgba(190,230,255,0.10)');
  sheen.addColorStop(0.55, 'rgba(190,230,255,0.02)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(left, top, right - left, bottom - top);

  ctx.fillStyle = 'rgba(220,240,255,0.10)';
  for (const p of scenery.pebble) {
    const x = sx(cam, p.x);
    if (x < -4 || x > VIEW.w + 4) continue;
    ctx.fillRect(x, sy(p.y), p.r, p.r);
  }
  ctx.strokeStyle = 'rgba(220,240,255,0.10)';
  ctx.lineWidth = 1;
  for (const k of scenery.scratches) {
    const x = sx(cam, k.x);
    if (x < -300 || x > VIEW.w + 40) continue;
    const y = sy(k.y);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + px(k.len) / 2, y + px(k.len) * k.bend, x + px(k.len), y + px(k.len) * k.a);
    ctx.stroke();
  }
  for (const k of scenery.glints) {
    const x = sx(cam, k.x);
    if (x < -10 || x > VIEW.w + 10) continue;
    const a = Math.max(0, Math.sin(time * 2 + k.ph));
    if (a < 0.3) continue;
    ctx.fillStyle = `rgba(255,255,255,${(a * 0.8).toFixed(2)})`;
    const y = sy(k.y), r = k.s * a;
    ctx.fillRect(x - r, y - 0.6, r * 2, 1.2);
    ctx.fillRect(x - 0.6, y - r, 1.2, r * 2);
  }

  // A painted sponsor logo under the ice, between the hog line and the house.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#bfe6ff';
  ctx.font = '900 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FROST LAKE OPEN', sx(cam, 15), sy(0));
  ctx.restore();

  drawPatches(ctx, cam, venue, time);
  drawHouse(ctx, cam, time);
  drawLines(ctx, cam);

  // Side boards.
  ctx.save();
  ctx.fillStyle = '#0c1d38';
  ctx.fillRect(left, top - 6, right - left, 6);
  ctx.fillRect(left, bottom, right - left, 6);
  ctx.shadowColor = '#5fd0ff';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#7fdcff';
  ctx.fillRect(left, top - 1.5, right - left, 1.5);
  ctx.fillRect(left, bottom, right - left, 1.5);
  ctx.restore();
  if (venue.wind) drawWind(ctx, venue, time);
}

// The house in neon: a soft glow under the ice and four lit rings, cold blue outside to gold at the button.
function drawHouse(ctx, cam, time = 0) {
  // The neon breathes: each ring pulses a little out of step with the others.
  const pulse = (i) => 0.75 + 0.25 * Math.sin(time * 2.2 + i * 1.3);
  const cx = sx(cam, SHEET.tee);
  const cy = sy(0);
  const [r12, r8, r4, rb] = SHEET.rings.map(px);
  const halo = ctx.createRadialGradient(cx, cy, r4, cx, cy, r12 * 1.25);
  halo.addColorStop(0, 'rgba(255,80,140,0.20)');
  halo.addColorStop(0.6, 'rgba(80,140,255,0.22)');
  halo.addColorStop(1, 'rgba(80,140,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r12 * 1.25, 0, TAU);
  ctx.fill();
  const disc = (r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); };
  disc(r12, 'rgba(40,110,255,0.22)');
  disc(r8, 'rgba(150,60,255,0.16)');
  disc(r4, 'rgba(255,50,90,0.38)');
  disc(rb, 'rgba(255,215,60,0.22)');
  let ringNo = 0;
  const neon = (r, color, w) => {
    const p = pulse(ringNo++);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 + 14 * p;
    ctx.globalAlpha = 0.7 + 0.3 * p;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = Math.max(1, w * 0.3);
    ctx.stroke();
    ctx.restore();
  };
  neon(r12, '#36b6ff', 8);
  neon(r12 - 11, '#7b5cff', 4);
  neon(r8, '#ff4fd8', 7);
  neon(r8 - 9, '#b14dff', 3);
  neon(r4, '#ff3b5c', 8);
  neon(rb, '#ffd93a', 6);
}

function drawLines(ctx, cam) {
  const top = sy(-SHEET.width / 2);
  const bottom = SHEET_BOTTOM;
  const vline = (x, w, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(sx(cam, x) - w / 2, top, w, bottom - top);
  };
  ctx.save();
  ctx.shadowColor = '#ff3b5c';
  ctx.shadowBlur = 12;
  vline(SHEET.hogFar, 6, '#ff4766');
  vline(SHEET.hogNear, 6, '#ff4766');
  ctx.restore();
  vline(SHEET.tee, 2, 'rgba(230,245,255,0.55)');
  vline(SHEET.back, 2, 'rgba(230,245,255,0.55)');
  ctx.fillStyle = 'rgba(230,245,255,0.35)';
  ctx.fillRect(sx(cam, SHEET.hogNear), sy(0) - 1, sx(cam, SHEET.back) - sx(cam, SHEET.hogNear), 2);
  // The hack at the far end.
  for (const hy of [-0.12, 0.12]) {
    if (!drawSprite(ctx, 'hack', sx(cam, SHEET.end - 0.45), sy(hy), 22, { ay: 0.5 })) {
      ctx.fillStyle = '#1d2a3a';
      ctx.fillRect(sx(cam, SHEET.end - 0.55), sy(hy - 0.06), px(0.2), px(0.12));
    }
  }
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,120,140,0.95)';
  ctx.fillText('HOG LINE', sx(cam, SHEET.hogFar), top + 14);
  ctx.fillStyle = 'rgba(220,240,255,0.7)';
  ctx.fillText('TEE', sx(cam, SHEET.tee), top + 14);
  ctx.fillText('BACK', sx(cam, SHEET.back), top + 14);
}

function drawPatches(ctx, cam, venue, time) {
  for (const p of venue.patches) {
    const x = sx(cam, p.x);
    const y = sy(p.y);
    const w = px(p.rx) * 2, h = px(p.ry) * 2;
    if (p.kind === 'snow') {
      // Wind-blown powder lying on the ice; the drift's shape is picked by how long it is.
      const r = p.rx / p.ry;
      const name = r > 3.3 ? 'hazard_drift_a' : r > 2 ? 'hazard_drift_b' : 'hazard_drift_c';
      if (drawSpriteBox(ctx, name, x, y, w * 1.25, h * 1.15)) continue;
      ctx.fillStyle = 'rgba(214,232,250,0.92)';
      ctx.beginPath();
      ctx.ellipse(x, y, px(p.rx), px(p.ry), 0, 0, TAU);
      ctx.fill();
    } else {
      // The slush lane: painted wet slush, with a slow shimmer running along it.
      if (drawStripFaded(ctx, 'hazard_slush', x, y, w, h * 1.1, 0.18, 0.72)) {
        const sh = ((time * 120) % (w + 200)) - 100;
        const g = ctx.createLinearGradient(x - w / 2 + sh - 80, 0, x - w / 2 + sh + 80, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(220,245,255,0.18)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - w / 2, y - h * 0.6, w, h * 1.2);
        continue;
      }
      ctx.fillStyle = 'rgba(110,200,220,0.22)';
      ctx.beginPath();
      ctx.ellipse(x, y, px(p.rx), px(p.ry), 0, 0, TAU);
      ctx.fill();
    }
  }
}

function drawWind(ctx, venue, time) {
  // Painted gusts sweeping horizontally across the sheet. Each one is born small, stretches out as it
  // races along, ripples, and thins away, then a new one starts elsewhere; they drift slowly toward
  // the bank the wind pushes the stones to.
  const dir = Math.sign(venue.wind) || 1;
  const top = sy(-SHEET.width / 2) + 30, span = sy(SHEET.width / 2) - 30 - top;
  for (let i = 0; i < 8; i++) {
    const period = 2.6 + (i % 4) * 0.45;
    const t = time / period + i * 0.37;
    const n = Math.floor(t), p = t - n;
    // A fresh random lane and start for every life of this gust.
    const h1 = Math.sin((n + 1) * 12.9898 + i * 78.233) * 43758.5453, r1 = h1 - Math.floor(h1);
    const h2 = Math.sin((n + 1) * 39.346 + i * 11.135) * 24634.6345, r2 = h2 - Math.floor(h2);
    const x = -160 + r1 * 500 + p * (VIEW.w + 200);
    const lane = top + r2 * span;
    const y = lane + dir * p * 40 + Math.sin(time * 3 + i * 1.7) * 6;
    const life = Math.sin(Math.PI * p);
    const stretch = 0.55 + 0.75 * life + Math.sin(time * 9 + i) * 0.06;
    const hgt = 30 + (i % 3) * 9;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(stretch, (1 - 0.25 * life) * (dir < 0 ? -1 : 1));
    ctx.rotate(Math.sin(time * 4 + i) * 0.04);
    if (!drawSprite(ctx, 'hazard_wind', 0, 0, hgt, { ay: 0.5, alpha: 0.65 * life, blend: 'lighter' })) {
      ctx.globalAlpha = 0.4 * life;
      ctx.strokeStyle = 'rgb(190,230,255)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.quadraticCurveTo(0, -8, 30, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawSnowfall(ctx, time) {
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (const f of scenery.flakes) {
    const y = (f.y + time * f.v) % VIEW.h;
    const x = (f.x + Math.sin(time * 0.8 + f.d) * 12 + VIEW.w) % VIEW.w;
    ctx.beginPath();
    ctx.arc(x, y, f.s, 0, TAU);
    ctx.fill();
  }
}
