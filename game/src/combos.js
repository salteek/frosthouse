// Elemental combos: a hot streak charges the next stone with ONE element, by how long the streak is:
// two good shots in a row → FIRE (its first hit on an enemy stone strikes harder), three → LIGHTNING (the
// hit chains a bolt to the next enemy stone), four or more → HAILSTORM (hail pounds every enemy stone in
// the house). Unleashing it spends the streak (the score multiplier starts over), and each side gets at
// most one combo per end. The rivals build streaks and combos by the same rules (not on Casual).

import { SHEET } from './config.js';

export const ELEMENTS = [
  { id: 'fire', name: 'Fire', streak: 2, color: '#ff7a2a', glow: '255,122,42', text: 'Your first hit on a rival stone strikes harder.' },
  { id: 'lightning', name: 'Lightning', streak: 3, color: '#ffe05a', glow: '255,224,90', text: 'The hit chains a bolt to the next rival stone.' },
  { id: 'hail', name: 'Hailstorm', streak: 4, color: '#9fe6ff', glow: '159,230,255', text: 'Hail pounds every rival stone in the house.' },
];

// The element a stone thrown on this streak carries (none, or one).
export function chargeFor(streak) {
  const el = [...ELEMENTS].reverse().find((e) => streak >= e.streak);
  return el ? [el.id] : [];
}

const d2 = (s) => (s.x - SHEET.tee) ** 2 + s.y ** 2;

function shove(s, dx, dy, speed) {
  const d = Math.hypot(dx, dy) || 1;
  s.vx += (dx / d) * speed / Math.sqrt(s.mass);
  s.vy += (dy / d) * speed / Math.sqrt(s.mass);
  s.moving = true;
  s.touched = true;
}

// Called with each collision while a throw runs. The charged stone's first hit on an enemy stone
// unleashes its element; returns the combo events to show.
export function comboOnHit(m, hit) {
  const shot = m.shot;
  if (!shot?.charge?.length || shot.comboDone) return null;
  const other = hit.a === shot ? hit.b : hit.b === shot ? hit.a : null;
  if (!other || other.team === shot.team) return null;
  shot.comboDone = true;
  const team = shot.team;
  (m.comboUsed ??= {})[team] = true;
  // The streak is spent.
  if (team === 'player') m.streak = 0; else m.rivalStreak = 0;
  const el = shot.charge[0];
  const foes = m.stones.filter((s) => s.team !== team && !s.out);
  const out = [];
  if (el === 'fire') {
    shove(other, other.x - shot.x, other.y - shot.y, 0.4);
    out.push({ type: 'combo', el, team, x: other.x, y: other.y });
  } else if (el === 'lightning') {
    shove(other, other.x - shot.x, other.y - shot.y, 0.2);
    const next = foes.filter((s) => s !== other).sort((a, b) => ((a.x - other.x) ** 2 + (a.y - other.y) ** 2) - ((b.x - other.x) ** 2 + (b.y - other.y) ** 2))[0];
    if (next) shove(next, next.x - SHEET.tee || 1, next.y, 0.55);
    out.push({ type: 'combo', el, team, x: other.x, y: other.y, tx: next?.x ?? other.x, ty: next?.y ?? other.y });
  } else if (el === 'hail') {
    const hit = foes.filter((s) => d2(s) < (SHEET.rings[0] + 0.5) ** 2);
    for (const s of hit) shove(s, s.x - SHEET.tee || 0.3, s.y || 0.2, 0.3);
    out.push({ type: 'combo', el, team, stones: hit.map((s) => ({ x: s.x, y: s.y })) });
  }
  if (team === 'player') m.stats.combos = (m.stats.combos ?? 0) + 1;
  return out;
}
