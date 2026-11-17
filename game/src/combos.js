// Elemental combos: a hot streak charges your next stone. Two good shots in a row and it burns (FIRE: its
// first hit on a rival stone strikes extra hard); three and it also crackles (LIGHTNING: the hit chains to
// the next rival stone); four and it calls a HAILSTORM down on every rival stone in the house.

import { SHEET } from './config.js';

export const ELEMENTS = [
  { id: 'fire', name: 'Fire', streak: 2, color: '#ff7a2a', glow: '255,122,42', text: 'Your first hit on a rival stone strikes harder.' },
  { id: 'lightning', name: 'Lightning', streak: 3, color: '#ffe05a', glow: '255,224,90', text: 'The hit chains a bolt to the next rival stone.' },
  { id: 'hail', name: 'Hailstorm', streak: 4, color: '#9fe6ff', glow: '159,230,255', text: 'Hail pounds every rival stone in the house.' },
];

// The elements a stone thrown on this streak carries.
export const chargeFor = (streak) => ELEMENTS.filter((e) => streak >= e.streak).map((e) => e.id);

const d2 = (s) => (s.x - SHEET.tee) ** 2 + s.y ** 2;

function shove(s, dx, dy, speed) {
  const d = Math.hypot(dx, dy) || 1;
  s.vx += (dx / d) * speed / Math.sqrt(s.mass);
  s.vy += (dy / d) * speed / Math.sqrt(s.mass);
  s.moving = true;
  s.touched = true;
}

// Called with each collision while a throw runs. The charged stone's first hit on a rival stone
// unleashes its elements; returns the combo events to show.
export function comboOnHit(m, hit) {
  const shot = m.shot;
  if (!shot?.charge?.length || shot.comboDone) return null;
  const other = hit.a === shot ? hit.b : hit.b === shot ? hit.a : null;
  if (!other || other.team !== 'rival') return null;
  shot.comboDone = true;
  const out = [];
  if (shot.charge.includes('fire')) {
    shove(other, other.x - shot.x, other.y - shot.y, 0.4);
    out.push({ type: 'combo', el: 'fire', x: other.x, y: other.y });
  }
  if (shot.charge.includes('lightning')) {
    const next = m.stones.filter((s) => s !== other && s.team === 'rival' && !s.out).sort((a, b) => ((a.x - other.x) ** 2 + (a.y - other.y) ** 2) - ((b.x - other.x) ** 2 + (b.y - other.y) ** 2))[0];
    if (next) {
      shove(next, next.x - SHEET.tee || 1, next.y, 0.6);
      out.push({ type: 'combo', el: 'lightning', x: other.x, y: other.y, tx: next.x, ty: next.y });
    }
  }
  if (shot.charge.includes('hail')) {
    const hit = m.stones.filter((s) => s.team === 'rival' && !s.out && d2(s) < (SHEET.rings[0] + 0.5) ** 2);
    for (const s of hit) shove(s, s.x - SHEET.tee || 0.3, s.y || 0.2, 0.32);
    out.push({ type: 'combo', el: 'hail', stones: hit.map((s) => ({ x: s.x, y: s.y })) });
  }
  m.stats.combos = (m.stats.combos ?? 0) + 1;
  return out;
}
