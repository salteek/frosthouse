// Granite stones with coloured handles, the sweepers, the skip's broom and the predicted path.

import { SHEET, PALETTE } from '../config.js';
import { TAU } from '../geometry.js';
import { sx, sy, px } from './camera.js';
import { drawSprite, hasSprite } from './sprites.js';

// The player's stone colours follow the stone set chosen for the run.
let mine = null, mineSprite = null;
export function setPlayerStone(stone) {
  mine = stone ? [stone.colour, stone.dark] : null;
  mineSprite = stone ? `stone_${stone.id}` : null;
}
// The painted top-down sprite for a team's stones, when its set has one.
export const teamSprite = (team) => (team === 'player' && mineSprite && hasSprite(mineSprite) ? mineSprite : null);
export function teamColours(team, rival) {
  return team === 'player' ? mine ?? [PALETTE.player, PALETTE.playerDark] : [rival.colour, rival.dark];
}

// A polished granite stone seen from above, with a neon band in its team's colour (the glow reads at a
// glance on white ice) and a candy-coloured handle whose angle shows the spin.
export function drawStone(ctx, x, y, spin, colours, opts = {}) {
  const r = opts.radius ?? px(SHEET.stoneR);
  if (opts.sprite && hasSprite(opts.sprite)) {
    // A painted stone: a soft glow in its colour (brighter while it runs), a shadow, then the
    // sprite turned by the spin so the handle shows it.
    ctx.save();
    ctx.translate(x, y);
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    const boost = opts.boost ?? 1;
    const glow = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * (1.5 + 0.25 * boost));
    glow.addColorStop(0, `${colours[0]}${Math.round(Math.min(1, 0.35 * boost) * 255).toString(16).padStart(2, '0')}`);
    glow.addColorStop(1, `${colours[0]}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.5 + 0.25 * boost), 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(10,20,40,0.35)';
    ctx.beginPath();
    ctx.ellipse(2, 4, r * 1.05, r, 0, 0, TAU);
    ctx.fill();
    drawSprite(ctx, opts.sprite, 0, 0, r * 2.12, { ay: 0.5, rot: spin });
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.fillStyle = 'rgba(20,40,70,0.28)';
  ctx.beginPath();
  ctx.ellipse(2, 4, r * 1.08, r * 1.02, 0, 0, TAU);
  ctx.fill();
  // Granite body.
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r);
  g.addColorStop(0, '#e2e6ec');
  g.addColorStop(0.55, '#9aa2ae');
  g.addColorStop(1, '#5d6572');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  // Speckle, fixed to the stone so it turns with the spin.
  ctx.save();
  ctx.rotate(spin);
  ctx.fillStyle = 'rgba(40,46,58,0.35)';
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39, d = r * (0.3 + ((i * 37) % 10) / 16);
    ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1.4, 1.4);
  }
  ctx.restore();
  // The neon band.
  ctx.save();
  ctx.shadowColor = colours[0];
  ctx.shadowBlur = r * 0.9 * (opts.boost ?? 1);
  ctx.strokeStyle = colours[0];
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.84, 0, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.84, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  // Cap and handle.
  const cap = ctx.createRadialGradient(-r * 0.15, -r * 0.2, r * 0.05, 0, 0, r * 0.55);
  cap.addColorStop(0, '#ffffff');
  cap.addColorStop(0.25, colours[0]);
  cap.addColorStop(1, colours[1]);
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.52, 0, TAU);
  ctx.fill();
  ctx.rotate(spin);
  ctx.fillStyle = colours[1];
  roundBar(ctx, -r * 0.16, -r * 0.62, r * 0.32, r * 1.05, r * 0.16);
  ctx.fillStyle = colours[0];
  roundBar(ctx, -r * 0.1, -r * 0.6, r * 0.2, r * 0.95, r * 0.1);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(-r * 0.05, -r * 0.52, r * 0.06, r * 0.5);
  ctx.restore();
}

function roundBar(ctx, x, y, w, h, rr) {
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.fill();
}

export function drawStones(ctx, cam, match, time) {
  for (const s of match.stones) {
    if (s.out) continue;
    const x = sx(cam, s.x);
    const y = sy(s.y);
    if (x < -30 || x > 1310) continue;
    // Behind a running stone: the frost ribbon and snow smoke (fx.js), drawn under the stones.
    drawStone(ctx, x, y, s.spin, teamColours(s.team, match.rival), { boost: s.moving ? 1.8 + Math.sin(time * 18) * 0.4 : 1, sprite: teamSprite(s.team) });
    if (s === match.shot && s.swept) drawSweepers(ctx, x, y, s, match, time);
  }
}

// Two sweepers run ahead of the stone, brooms flying, one on each side of its path.
function drawSweepers(ctx, x, y, s, match, time) {
  const mine = s.team === 'player';
  // In the final, the boss's stones are swept by his Frost Thralls (unless he has cracked: then they are gone
  // and two shaken rink-mates sweep for him).
  const thralls = !mine && match.boss && !match.boss.cracked;
  // The painted thralls if they loaded, else the blue rink's sweepers tinted to ice.
  const names = thralls && hasSprite('thrall_sweep_a') ? ['thrall_sweep_a', 'thrall_sweep_b']
    : (mine ? ['sweep_red', 'sweep_red2'] : ['sweep_blue', 'sweep_blue2']).map((n) => (thralls ? `thrall:${n}` : n));
  const tall = thralls && names[0] === 'thrall_sweep_a' ? 112 : 80;
  if (hasSprite(mine ? 'sweep_red' : 'sweep_blue')) {
    const bob = Math.sin(time * 22) * 3;
    if (thralls) {
      // Dark shadows under their feet so the pale ice figures stand off the ice, and a cold mist behind them.
      ctx.fillStyle = 'rgba(4,10,30,0.35)';
      for (const [dx, dy] of [[44, -20], [48, 82]]) { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, 34, 8, 0, 0, TAU); ctx.fill(); }
      for (const [dx, dy] of [[44, -50], [48, 50]]) {
        const g = ctx.createRadialGradient(x + dx, y + dy, 4, x + dx, y + dy, 58);
        g.addColorStop(0, 'rgba(170,230,255,0.32)');
        g.addColorStop(1, 'rgba(170,230,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - 60, y + dy - 60, 120, 120);
      }
    }
    drawSprite(ctx, names[0], x + 44 + bob, y - 18, tall);
    for (let i = 0; i < 3; i++) drawSprite(ctx, 'shards', x + 46 + Math.sin(time * 30 + i) * 10, y + i * 3 - 4, 14, { ay: 0.5, alpha: 0.7, rot: time * 9 + i });
    drawSprite(ctx, names[1], x + 48 - bob, y + 84, tall);
    return;
  }
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
  }
}

// The skip's broom marks where the thrower should aim; the skip stands just behind it.
export function drawSkipBroom(ctx, cam, aimY, turn, colour, time, skip = null) {
  const x = sx(cam, SHEET.tee);
  const y = sy(aimY);
  ctx.save();
  // The skip stands behind the broom, facing back down the sheet at the thrower.
  const ours = colour === PALETTE.player;
  const big = skip === 'thrall_skip';
  if (big) { ctx.fillStyle = 'rgba(4,10,30,0.35)'; ctx.beginPath(); ctx.ellipse(x + 58, y + 34, 30, 7, 0, 0, TAU); ctx.fill(); }
  if (!drawSprite(ctx, skip ?? (ours ? 'skip_red' : 'skip_blue'), x + 58, y + 34, big ? 104 : 82, { flip: true })) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.ellipse(x + 40, y, 11, 13, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#1d2a3a';
  ctx.fillRect(x - 3, y - 9, 8, 18);
  const pulse = 1 + Math.sin(time * 5) * 0.12;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.5;
  // The neon aim target, breathing; a dashed ring if the sprite did not load.
  if (!drawSprite(ctx, 'aim_target', x + 1, y, 46 * pulse, { ay: 0.5, blend: 'lighter', rot: time * 0.6 })) {
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x + 1, y, 16 * pulse, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
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
export function drawSitting(ctx, cam, result, rival, below = false) {
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
  // In the final the boss panel covers the top of the house, so the label drops just below the panel.
  const cy = Math.max(sy(-SHEET.rings[0]) - 16, below ? 202 : 0);
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
