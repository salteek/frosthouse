// Hrimgar, the boss, stands on the snowbank beyond the far end of the sheet for the whole final,
// looming over the house. When he cracks (at the crack animation's shard burst) he turns to his broken pose.

import { SHEET } from '../config.js';
import { TAU } from '../geometry.js';
import { sx, SHEET_BOTTOM } from './camera.js';
import { drawSprite, hasSprite } from './sprites.js';
import { currentTeam } from '../match.js';

const SWAP_AT = 0.75; // seconds into the crack animation (render/crack.js BURST_AT)

export function drawBossFigure(ctx, scene) {
  const m = scene.match;
  const b = m.boss;
  // During the match intro he is shown in the intro band instead.
  if (!b || !hasSprite('boss_full') || scene.intro > 0) return;
  const x = sx(scene.cam, SHEET.end + 0.25) - 55;
  if (x > 1500) return;
  const feet = SHEET_BOTTOM + 6;
  const h = 390;
  const broken = b.cracked && (!scene.crack || scene.crack.t >= SWAP_AT);
  ctx.save();
  // A cold aura behind him, in his phase's colour; it dims once he is broken.
  const col = broken ? '120,150,190' : ['95,183,234', '184,240,255', '196,168,255'][b.phase - 1];
  const g = ctx.createRadialGradient(x, feet - h * 0.55, 20, x, feet - h * 0.55, h * 0.6);
  g.addColorStop(0, `rgba(${col},${broken ? 0.12 : 0.28})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, feet - h * 0.55, h * 0.6, 0, TAU);
  ctx.fill();
  // His shadow on the snow.
  ctx.fillStyle = 'rgba(4,10,30,0.45)';
  ctx.beginPath();
  ctx.ellipse(x - 10, feet - 6, 120, 20, 0, 0, TAU);
  ctx.fill();
  // Facing left, down the sheet toward the thrower. On his own turn (until he cracks) he takes up his
  // broom and raises a hand to call the line for his Frost Thralls.
  const calling = !broken && hasSprite('boss_sweep') && m.phase !== 'over' && m.phase !== 'endScore' && currentTeam(m) === 'rival'
    && (m.phase === 'aim' || (m.phase === 'running' && m.shot?.team === 'rival') || m.phase === 'skill');
  if (calling) drawSprite(ctx, 'boss_sweep', x + 10, feet, h * 0.96);
  else drawSprite(ctx, broken ? 'boss_cracked' : 'boss_full', x, feet, broken ? h * 0.96 : h);
  ctx.restore();
}
