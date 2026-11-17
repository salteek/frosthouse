// Composes one frame of a match: lake, sheet, aim guides, stones, effects and the HUD.

import { PALETTE, VIEW } from '../config.js';
import { TAU } from '../geometry.js';
import { currentTeam } from '../match.js';
import { previewLength } from '../tournament.js';
import { drawBackdrop, drawSheet, drawSnowfall, drawSpikes } from './ice.js';
import { drawStones, drawSkipBroom, drawPathPreview, drawCounting, drawSitting, teamColours } from './stones.js';
import { countEnd } from '../scoring.js';
import { drawMatchHud } from './hud.js';
import { drawSprite } from './sprites.js';
import { drawFxLayer, drawTrails, drawSnowSmoke } from '../fx.js';
import { sx as toX, sy as toY } from './camera.js';
import { callout } from './ui.js';
import { drawSkillButtons, drawSkillStrike, drawLocks, drawComboTrack, drawChargedStone, drawArcs } from './skillsView.js';

export function drawMatch(ctx, scene, time, best) {
  const m = scene.match;
  ctx.save();
  if (scene.shake > 0) ctx.translate((Math.random() - 0.5) * scene.shake, (Math.random() - 0.5) * scene.shake);
  // The stands go wild for your good shots, an end you score and a match you win.
  const call = m.lastCall;
  let excite = call && call.team === 'player' && call.tone !== 'bad' && call.tone !== 'meh' && call.t < 2.6 ? (call.tone === 'great' ? 1 : 0.6) : 0;
  if ((m.phase === 'endScore' && m.endResult?.team === 'player') || (m.phase === 'over' && m.winner === 'player')) excite = 1;
  drawBackdrop(ctx, scene.cam, m.venue, time, excite);
  drawSheet(ctx, scene.cam, m.venue, time);

  const aiming = m.phase === 'aim' && currentTeam(m) === 'player' && scene.intro <= 0;
  if (aiming) {
    drawPathPreview(ctx, scene.cam, scene.preview.path, previewLength(scene.run), 'rgba(224,56,62,0.85)', true);
    drawSkipBroom(ctx, scene.cam, scene.aim.y, scene.aim.turn, PALETTE.player, time);
  } else if (m.phase === 'aim' && currentTeam(m) === 'rival') {
    drawSkipBroom(ctx, scene.cam, Math.sin(time * 1.3) * 0.5, 1, m.rival.colour, time);
  }
  drawSnowSmoke(ctx, scene, (x) => toX(scene.cam, x), toY);
  drawTrails(ctx, scene, (x) => toX(scene.cam, x), toY, time);
  drawSpikes(ctx, scene.cam, m.venue, time);
  drawStones(ctx, scene.cam, m, time);
  drawLocks(ctx, scene, time);
  drawChargedStone(ctx, scene, time);
  const calling = m.phase === 'settle' && m.lastCall && m.lastCall.t < 1.6;
  if (m.phase === 'aim' || (m.phase === 'settle' && !calling)) drawSitting(ctx, scene.cam, countEnd(m.stones), m.rival);
  if (m.phase === 'endScore' && m.endResult?.team) {
    drawCounting(ctx, scene.cam, m.endResult.counting, teamColours(m.endResult.team, m.rival)[0], m.endResult.t);
  }
  drawFx(ctx, scene.fx);
  drawSkillStrike(ctx, scene, time);
  drawArcs(ctx, scene, time);
  if (m.venue.id === 'pine' || m.venue.id === 'aurora') drawSnowfall(ctx, time);
  ctx.restore();
  if (scene.slowmo > 0.01) {
    // Slow motion: the edges darken and the moment is named.
    const v = ctx.createRadialGradient(640, 380, 220, 640, 380, 760);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(2,6,20,${(0.6 * scene.slowmo).toFixed(3)})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.save();
    ctx.globalAlpha = scene.slowmo;
    callout(ctx, 'LAST STONE', 640, 186, 34, { tone: 'violet' });
    ctx.restore();
  }
  drawMatchHud(ctx, scene, time, best);
  if (scene.intro <= 0 && m.phase !== 'over') {
    drawComboTrack(ctx, scene, time);
    drawSkillButtons(ctx, scene, time);
  }
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
  drawFxLayer(ctx, fx);
  // The white flash of a big hit, over the whole ice.
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(220,240,255,${fx.flash.toFixed(3)})`;
    ctx.fillRect(0, 0, 1280, 720);
  }
  for (const f of fx.floaters) {
    if (f.delay > 0) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (f.life / f.max) * 1.6);
    callout(ctx, f.text, f.x, f.y, f.size * 1.15, { tone: f.size > 30 ? 'fire' : 'gold', sparkle: f.size > 30 });
    ctx.restore();
  }
}

export { VIEW };
