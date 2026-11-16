// Granite stones with coloured handles, the sweepers, the skip's broom and the predicted path.

import { SHEET, PALETTE } from '../config.js';
import { TAU } from '../geometry.js';
import { sx, sy, px } from './camera.js';

export function teamColours(team, rival) {
  return team === 'player' ? [PALETTE.player, PALETTE.playerDark] : [rival.colour, rival.dark];
}

export function drawStone(ctx, x, y, spin, colours, opts = {}) {
  const r = opts.radius ?? px(SHEET.stoneR);
  ctx.save();
  ctx.translate(x, y);
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.fillStyle = 'rgba(20,40,70,0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 3, r * 1.05, r, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, PALETTE.graniteLight);
  g.addColorStop(1, PALETTE.granite);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = colours[1];
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = colours[0];
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, TAU);
  ctx.fill();
  ctx.rotate(spin);
  ctx.fillStyle = colours[1];
  ctx.fillRect(-r * 0.15, -r * 0.55, r * 0.3, r * 1.1);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(-r * 0.08, -r * 0.5, r * 0.08, r * 0.6);
  ctx.restore();
}

export function drawStones(ctx, cam, match, time) {
  for (const s of match.stones) {
    if (s.out) continue;
    const x = sx(cam, s.x);
    const y = sy(s.y);
    if (x < -30 || x > 1310) continue;
    if (s.moving) {
      ctx.strokeStyle = 'rgba(160,190,220,0.45)';
      ctx.lineWidth = px(SHEET.stoneR) * 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - s.vx * 18, y - s.vy * 18);
      ctx.stroke();
    }
    drawStone(ctx, x, y, s.spin, teamColours(s.team, match.rival));
    if (s === match.shot && s.swept) drawSweepers(ctx, x, y, s, match, time);
  }
}

function drawSweepers(ctx, x, y, s, match, time) {
  const col = teamColours(s.team, match.rival)[0];
  const ahead = px(0.75);
  for (const side of [-1, 1]) {
    const bx = x + ahead + Math.sin(time * 22 + side) * 6;
    const by = y + side * px(0.42);
    ctx.strokeStyle = '#6b4a2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx, y + side * 4);
    ctx.lineTo(bx + 14, by);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(bx + 16, by + side * 10, 9, 11, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f3d2b5';
    ctx.beginPath();
    ctx.arc(bx + 16, by + side * 10, 4.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(bx + Math.sin(time * 30 + i * 2) * 8, y + side * 6 + i * side * 3, 1.6, 0, TAU);
      ctx.fill();
    }
  }
}

// The skip's broom marks where the thrower should aim; the skip stands just behind it.
export function drawSkipBroom(ctx, cam, aimY, turn, colour, time) {
  const x = sx(cam, SHEET.tee);
  const y = sy(aimY);
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(x + 40, y, 11, 13, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f3d2b5';
  ctx.beginPath();
  ctx.arc(x + 40, y, 5.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#6b4a2b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 34, y + 2);
  ctx.lineTo(x + 6, y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#1d2a3a';
  ctx.fillRect(x - 3, y - 9, 8, 18);
  const pulse = 1 + Math.sin(time * 5) * 0.12;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(x + 1, y, 16 * pulse, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  // Curved arrow showing the turn.
  const a0 = turn > 0 ? -2.4 : 2.4;
  const a1 = turn > 0 ? -0.6 : 0.6;
  ctx.beginPath();
  ctx.arc(x + 1, y, 26, Math.min(a0, a1), Math.max(a0, a1));
  ctx.stroke();
  const tip = turn > 0 ? a1 : a0;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x + 1 + Math.cos(tip) * 26, y + Math.sin(tip) * 26, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// The predicted path from the far hog line on. Lower difficulties reveal more of it, up to the resting spot.
export function drawPathPreview(ctx, cam, path, fraction, colour, showGhost) {
  if (!path || path.length < 2) return;
  let first = path.findIndex((p) => p.x >= SHEET.hogFar - 1.5);
  if (first < 0) first = path.length - 1;
  const span = path.length - first;
  const n = first + Math.max(2, Math.floor(span * Math.min(1, fraction)));
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  ctx.setLineDash([2, 10]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = Math.max(0, first - 1); i < Math.min(n, path.length); i++) {
    const x = sx(cam, path[i].x);
    const y = sy(path[i].y);
    if (i === Math.max(0, first - 1)) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const last = path[Math.min(n, path.length) - 1];
  if (showGhost && n >= path.length) {
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(sx(cam, last.x), sy(last.y), px(SHEET.stoneR), 0, TAU);
    ctx.stroke();
  } else {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(sx(cam, last.x), sy(last.y), 5, 0, TAU);
    ctx.fill();
    ctx.font = '900 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', sx(cam, last.x) + 14, sy(last.y) + 4);
  }
  ctx.restore();
}

// Rings round the stones that count when an end is measured.
export function drawCounting(ctx, cam, counting, colour, t) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  counting.forEach((s, i) => {
    const appear = Math.max(0, Math.min(1, t * 2.5 - i * 0.35));
    if (appear <= 0) return;
    ctx.globalAlpha = appear;
    ctx.beginPath();
    ctx.arc(sx(cam, s.x), sy(s.y), px(SHEET.stoneR) + 6 + (1 - appear) * 20, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = colour;
    ctx.font = '900 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), sx(cam, s.x), sy(s.y) - px(SHEET.stoneR) - 10);
  });
  ctx.restore();
}

// Who is sitting shot right now, as a skip would call it, with a marker on the shot stone.
export function drawSitting(ctx, cam, result, rival) {
  if (!result.team) return;
  const shot = result.counting[0];
  const colour = teamColours(result.team, rival)[0];
  const x = sx(cam, shot.x);
  const y = sy(shot.y);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(x, y, px(SHEET.stoneR) + 5, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  const label = `${result.team === 'player' ? 'YOU ARE' : rival.short + ' ARE'} SITTING ${result.points}`;
  ctx.font = '900 13px system-ui, sans-serif';
  const w = ctx.measureText(label).width + 20;
  const cx = sx(cam, SHEET.tee);
  const cy = sy(-SHEET.rings[0]) - 16;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - 12, w, 24, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 1);
  ctx.restore();
}
