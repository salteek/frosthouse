// Composes one frame of a match: lake, sheet, aim guides, stones, effects and the HUD.

import { PALETTE, VIEW } from '../config.js';
import { TAU } from '../geometry.js';
import { currentTeam } from '../match.js';
import { previewLength } from '../tournament.js';
import { drawBackdrop, drawSheet, drawSnowfall } from './ice.js';
import { drawStones, drawSkipBroom, drawPathPreview, drawCounting, drawSitting, teamColours } from './stones.js';
import { countEnd } from '../scoring.js';
import { drawMatchHud } from './hud.js';
import { drawSprite } from './sprites.js';
import { callout } from './ui.js';

export function drawMatch(ctx, scene, time, best) {
  const m = scene.match;
  ctx.save();
  if (scene.shake > 0) ctx.translate((Math.random() - 0.5) * scene.shake, (Math.random() - 0.5) * scene.shake);
  drawBackdrop(ctx, scene.cam, m.venue, time);
  drawSheet(ctx, scene.cam, m.venue, time);

  const aiming = m.phase === 'aim' && currentTeam(m) === 'player' && scene.intro <= 0;
  if (aiming) {
    drawPathPreview(ctx, scene.cam, scene.preview.path, previewLength(scene.run), 'rgba(224,56,62,0.85)', true);
    drawSkipBroom(ctx, scene.cam, scene.aim.y, scene.aim.turn, PALETTE.player, time);
  } else if (m.phase === 'aim' && currentTeam(m) === 'rival') {
    drawSkipBroom(ctx, scene.cam, Math.sin(time * 1.3) * 0.5, 1, m.rival.colour, time);
  }
  drawStones(ctx, scene.cam, m, time);
  const calling = m.phase === 'settle' && m.lastCall && m.lastCall.t < 1.6;
  if (m.phase === 'aim' || (m.phase === 'settle' && !calling)) drawSitting(ctx, scene.cam, countEnd(m.stones), m.rival);
  if (m.phase === 'endScore' && m.endResult?.team) {
    drawCounting(ctx, scene.cam, m.endResult.counting, teamColours(m.endResult.team, m.rival)[0], m.endResult.t);
  }
  drawFx(ctx, scene.fx);
  if (m.venue.id === 'pine' || m.venue.id === 'aurora') drawSnowfall(ctx, time);
  ctx.restore();
  drawMatchHud(ctx, scene, time, best);
}

function drawFx(ctx, fx) {
  for (const p of fx.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of fx.flashes ?? []) {
    const k = 1 - f.life / f.max;
    drawSprite(ctx, f.name, f.x, f.y, f.size * (0.6 + 0.6 * Math.min(1, k * 3)), { ay: 0.5, rot: f.rot * (f.name === 'confetti' ? 0.2 : 1), alpha: Math.min(1, (f.life / f.max) * 2) });
  }
  for (const f of fx.floaters) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (f.life / f.max) * 1.6);
    callout(ctx, f.text, f.x, f.y, f.size * 1.15, { tone: f.size > 30 ? 'fire' : 'gold', sparkle: f.size > 30 });
    ctx.restore();
  }
}

export { VIEW };
