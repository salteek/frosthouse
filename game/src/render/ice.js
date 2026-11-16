// The frozen lake: snowbanks, pines and the crowd, the sheet with its pebble, lines and house, drifts, slush and wind.

import { SHEET, VIEW, PALETTE, CAMERA } from '../config.js';
import { createRng } from '../rng.js';
import { TAU } from '../geometry.js';
import { sx, sy, px, SHEET_BOTTOM } from './camera.js';

const scenery = (() => {
  const rng = createRng(2026);
  const pebble = [];
  for (let i = 0; i < 900; i++) pebble.push({ x: rng.range(-8, SHEET.end + 2), y: rng.range(-SHEET.width / 2, SHEET.width / 2), r: rng.range(0.6, 1.6) });
  const pines = [];
  for (let i = 0; i < 70; i++) pines.push({ x: rng.range(-10, SHEET.end + 12), h: rng.range(26, 48), shade: rng.chance(0.5) });
  const crowd = [];
  const coats = ['#e0383e', '#2f6fd6', '#f2b53a', '#2fa86b', '#9b6ad6', '#ff7a45', '#1d2a3a', '#f6fbff'];
  for (let i = 0; i < 160; i++) crowd.push({ x: rng.range(-10, SHEET.end + 10), row: rng.int(0, 2), coat: rng.pick(coats), hat: rng.pick(coats), phase: rng.range(0, TAU) });
  const flakes = [];
  for (let i = 0; i < 90; i++) flakes.push({ x: rng.range(0, VIEW.w), y: rng.range(0, VIEW.h), s: rng.range(1, 2.6), v: rng.range(14, 34), d: rng.range(0, TAU) });
  return { pebble, pines, crowd, flakes };
})();

const SKIES = {
  morning: ['#bfe1f7', '#eaf6ff'],
  noon: ['#a9d7f5', '#e6f4ff'],
  afternoon: ['#b4d3ef', '#f3ead8'],
  dusk: ['#5b6fb5', '#f5b38a'],
};

export function drawBackdrop(ctx, cam, venue, time) {
  const sky = SKIES[venue.time] ?? SKIES.morning;
  const g = ctx.createLinearGradient(0, 0, 0, CAMERA.sheetTop);
  g.addColorStop(0, sky[0]);
  g.addColorStop(1, sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, CAMERA.sheetTop);

  if (venue.time === 'dusk') drawAurora(ctx, time);

  // Pines on the far shore, drifting slowly with the camera for depth.
  for (const p of scenery.pines) {
    const x = (p.x - cam.x) * CAMERA.scale * 0.45 + VIEW.w / 2;
    if (x < -40 || x > VIEW.w + 40) continue;
    const base = 112;
    ctx.fillStyle = p.shade ? PALETTE.pineDark : PALETTE.pine;
    ctx.beginPath();
    ctx.moveTo(x, base - p.h);
    ctx.lineTo(x + p.h * 0.36, base);
    ctx.lineTo(x - p.h * 0.36, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(x, base - p.h);
    ctx.lineTo(x + p.h * 0.12, base - p.h * 0.66);
    ctx.lineTo(x - p.h * 0.12, base - p.h * 0.66);
    ctx.closePath();
    ctx.fill();
  }

  // The snowbank and the crowd along it.
  ctx.fillStyle = PALETTE.snow;
  ctx.fillRect(0, 104, VIEW.w, CAMERA.sheetTop - 104);
  ctx.fillStyle = PALETTE.snowShade;
  ctx.fillRect(0, CAMERA.sheetTop - 8, VIEW.w, 8);
  for (const c of scenery.crowd) {
    const x = (c.x - cam.x) * CAMERA.scale * 0.8 + VIEW.w / 2;
    if (x < -20 || x > VIEW.w + 20) continue;
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
  ctx.fillStyle = PALETTE.snow;
  ctx.fillRect(0, top, VIEW.w, bottom - top);
  const bank = sx(cam, SHEET.end + 0.25);
  if (bank < VIEW.w) {
    const bg = ctx.createLinearGradient(bank, 0, bank + 90, 0);
    bg.addColorStop(0, '#dfeaf4');
    bg.addColorStop(1, '#ffffff');
    ctx.fillStyle = bg;
    ctx.fillRect(bank, top - 6, VIEW.w - bank, bottom - top + 12);
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

  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, venue.tint);
  g.addColorStop(0.5, '#f7fbff');
  g.addColorStop(1, venue.tint);
  ctx.fillStyle = g;
  ctx.fillRect(left, top, right - left, bottom - top);

  ctx.fillStyle = PALETTE.pebble;
  for (const p of scenery.pebble) {
    const x = sx(cam, p.x);
    if (x < -4 || x > VIEW.w + 4) continue;
    ctx.fillRect(x, sy(p.y), p.r, p.r);
  }

  // A painted sponsor logo under the ice, between the hog line and the house.
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = PALETTE.accent;
  ctx.font = '900 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FROST LAKE OPEN', sx(cam, 15), sy(0));
  ctx.restore();

  drawPatches(ctx, cam, venue, time);
  drawHouse(ctx, cam);
  drawLines(ctx, cam);

  // Side boards.
  ctx.fillStyle = '#2f6fd6';
  ctx.fillRect(left, top - 5, right - left, 5);
  ctx.fillRect(left, bottom, right - left, 5);
  ctx.fillStyle = '#ffffff';
  for (let x = Math.ceil(cam.x - 8); x < SHEET.end; x += 2) {
    ctx.fillRect(sx(cam, x), top - 5, px(0.6), 5);
    ctx.fillRect(sx(cam, x), bottom, px(0.6), 5);
  }
  if (venue.wind) drawWind(ctx, venue, time);
}

function drawHouse(ctx, cam) {
  const cx = sx(cam, SHEET.tee);
  const cy = sy(0);
  const [r12, r8, r4, rb] = SHEET.rings.map(px);
  const ring = (r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
  };
  ring(r12, PALETTE.ringOuter);
  ring(r8, PALETTE.ringMid);
  ring(r4, PALETTE.ringInner);
  ring(rb, PALETTE.button);
  ctx.strokeStyle = 'rgba(29,42,58,0.25)';
  ctx.lineWidth = 1;
  for (const r of [r12, r8, r4, rb]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
  }
}

function drawLines(ctx, cam) {
  const top = sy(-SHEET.width / 2);
  const bottom = SHEET_BOTTOM;
  const vline = (x, w, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(sx(cam, x) - w / 2, top, w, bottom - top);
  };
  vline(SHEET.hogFar, 7, PALETTE.hog);
  vline(SHEET.hogNear, 7, PALETTE.hog);
  vline(SHEET.tee, 2, PALETTE.ink);
  vline(SHEET.back, 2, PALETTE.ink);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(sx(cam, SHEET.hogNear), sy(0) - 1, sx(cam, SHEET.back) - sx(cam, SHEET.hogNear), 2);
  // The hack at the far end.
  ctx.fillStyle = '#1d2a3a';
  ctx.fillRect(sx(cam, SHEET.end - 0.55), sy(-0.18), px(0.2), px(0.12));
  ctx.fillRect(sx(cam, SHEET.end - 0.55), sy(0.06), px(0.2), px(0.12));
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(208,51,74,0.85)';
  ctx.fillText('HOG LINE', sx(cam, SHEET.hogFar), top + 14);
  ctx.fillStyle = 'rgba(29,42,58,0.55)';
  ctx.fillText('TEE', sx(cam, SHEET.tee), top + 14);
  ctx.fillText('BACK', sx(cam, SHEET.back), top + 14);
}

function drawPatches(ctx, cam, venue, time) {
  for (const p of venue.patches) {
    const x = sx(cam, p.x);
    const y = sy(p.y);
    if (p.kind === 'snow') {
      ctx.fillStyle = 'rgba(160,185,210,0.35)';
      ctx.beginPath();
      ctx.ellipse(x + 4, y + 5, px(p.rx), px(p.ry), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * px(p.rx) * 0.45, y + Math.sin(a) * px(p.ry) * 0.4, px(p.rx) * 0.55, px(p.ry) * 0.6, 0, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#7f95ad';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SNOW DRIFT', x, y + 4);
    } else {
      ctx.fillStyle = 'rgba(120,150,170,0.28)';
      ctx.beginPath();
      ctx.ellipse(x, y, px(p.rx), px(p.ry), 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,120,145,0.35)';
      ctx.setLineDash([8, 10]);
      ctx.lineDashOffset = -time * 6;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(70,95,120,0.7)';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SLUSH LANE', x, y + 4);
    }
  }
}

function drawWind(ctx, venue, time) {
  const dir = Math.sign(venue.wind);
  ctx.save();
  ctx.strokeStyle = 'rgba(47,111,214,0.35)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = ((i * 157 + time * 40) % (VIEW.w + 100)) - 50;
    const yBase = sy(0) + dir * (((time * 60 + i * 53) % 380) - 190);
    ctx.beginPath();
    ctx.moveTo(x, yBase);
    ctx.lineTo(x + 6, yBase + dir * 30);
    ctx.stroke();
  }
  ctx.restore();
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
