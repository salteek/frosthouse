// The left column's side panels: the end's bounty, and in the final what Hrimgar does next end.

import { TAU } from '../geometry.js';
import { text } from './ui.js';
import { bountyDef, BOUNTY_SCORE } from '../bounties.js';
import { BOSS_PHASES, phaseFor } from '../boss.js';

const X0 = 26, W = 150;

function glass(ctx, x, y, w, h, edge) {
  ctx.fillStyle = 'rgba(8,14,34,0.7)';
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
}

export function drawBountyPanel(ctx, scene, time) {
  const m = scene.match;
  const b = m.bounty;
  if (!b) return;
  const def = bountyDef(b.id);
  const y0 = 292, h = 80;
  const gold = '#ffc23a';
  const edge = b.done ? 'rgba(255,194,58,0.9)' : b.failed ? 'rgba(150,170,200,0.25)' : 'rgba(255,194,58,0.45)';
  ctx.save();
  if (b.done && b.t < 0.6) { ctx.shadowColor = gold; ctx.shadowBlur = 18 * (1 - b.t / 0.6); }
  glass(ctx, X0, y0, W, h, edge);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = b.failed ? 0.55 : 1;
  text(ctx, 'END BOUNTY', X0 + 10, y0 + 15, { size: 9, weight: 900, color: gold });
  const pay = Math.round(BOUNTY_SCORE * m.kit.scoreMul);
  text(ctx, `+${pay}`, X0 + W - 10, y0 + 15, { size: 10, weight: 900, color: gold, align: 'right' });
  text(ctx, def.name, X0 + 10, y0 + 35, { size: 15, weight: 900, color: '#ffffff' });
  text(ctx, def.text, X0 + 10, y0 + 51, { size: 10, weight: 700, color: '#b9cbe6' });
  // Progress pips, then the reward line or its outcome.
  for (let i = 0; i < def.goal; i++) {
    const cx = X0 + W - 14 - (def.goal - 1 - i) * 14, cy = y0 + 66, on = i < b.progress || b.done;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, TAU);
    ctx.fillStyle = on ? gold : 'rgba(255,255,255,0.14)';
    ctx.fill();
  }
  const status = b.done ? 'PAID ✓' : b.failed ? 'MISSED' : def.when === 'end' ? 'at the count' : `${b.progress}/${def.goal}`;
  const reward = '+1 energy';
  text(ctx, b.done || b.failed ? status : reward, X0 + 10, y0 + 70, { size: 9, weight: 900, color: b.done ? gold : '#9fb4d8' });
  ctx.restore();
}

// Hrimgar's next move: the phase he will be in when the next end is laid out, and what it brings.
export function drawBossIntent(ctx, scene, time) {
  const m = scene.match;
  const bs = m.boss;
  if (!bs) return;
  const y0 = 182, h = bs.cracked ? 88 : 102;
  const violet = '#c4a8ff';
  ctx.save();
  glass(ctx, X0, y0, W, h, bs.cracked ? 'rgba(150,170,200,0.3)' : 'rgba(196,168,255,0.6)');
  text(ctx, bs.cracked ? 'HRIMGAR · BROKEN' : 'INCOMING · NEXT END', X0 + 10, y0 + 15, { size: 9, weight: 900, color: violet });
  if (bs.cracked) {
    text(ctx, 'NO MORE TRICKS', X0 + 10, y0 + 38, { size: 14, weight: 900, color: '#ffffff' });
    text(ctx, bs.shatter === 'paid' ? '+1 SHATTER POINT PAID' : '+1 SHATTER POINT', X0 + 10, y0 + 56, { size: 10, weight: 900, color: '#ffc23a' });
    text(ctx, 'Your hammer · he throws shaky', X0 + 10, y0 + 72, { size: 10, weight: 700, color: '#b9cbe6' });
    ctx.restore();
    return;
  }
  const last = m.end >= m.ends;
  const cap = m.end + 1 >= 3 ? 33 : m.end + 1 >= 2 ? 66 : 100;
  const np = phaseFor(Math.min(bs.resolve, cap));
  const ph = BOSS_PHASES[np - 1];
  const fresh = np > bs.phase;
  text(ctx, last ? 'ONLY IN AN EXTRA END' : fresh ? `PHASE ${np} · ${ph.name}` : `STAYS IN PHASE ${np}`, X0 + 10, y0 + 31, { size: 9, weight: 900, color: fresh ? '#ffd27a' : '#9fb4d8' });
  text(ctx, `${fresh ? '+ ' : ''}${ph.obstacle}`, X0 + 10, y0 + 50, { size: 14, weight: 900, color: fresh ? '#ffd27a' : '#ffffff' });
  const extra = np >= 3 ? 'Frost Lock · spikes' : np >= 2 ? 'Blizzard wind' : 'Thunder strike';
  text(ctx, extra, X0 + 10, y0 + 64, { size: 10, weight: 700, color: '#b9cbe6' });
  text(ctx, `${Math.ceil(bs.resolve)} RESOLVE TO CRACK HIM`, X0 + 10, y0 + 80, { size: 9, weight: 900, color: violet });
  text(ctx, 'BREAK EITHER: +1 & HAMMER', X0 + 10, y0 + 95, { size: 9, weight: 900, color: '#ffc23a' });
  ctx.restore();
}
