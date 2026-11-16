// Rival skips: list the shots worth trying, solve each one's aim and weight on this ice,
// play every candidate forward with the real physics, and pick the best by the house evaluation.

import { SHEET } from './config.js';
import { createStone, launch, simulate, cloneStones, weightFromSpeed, speedFromWeight } from './physics.js';
import { evaluate, inHouse, distToButton } from './scoring.js';

const R = SHEET.stoneR;

function probe(team, turn, mods) {
  return createStone(team, 0, 0, { turn, mass: mods.mass, frictionMul: mods.frictionMul, curlMul: mods.curlMul });
}

// Find the release (aim, speed) that brings a lone stone to rest at (tx, ty).
export function solveDraw(venue, tx, ty, turn, mods) {
  let lo = 1.7;
  let hi = 2.9;
  let aim = ty;
  let best = null;
  for (let pass = 0; pass < 2; pass++) {
    lo = 1.7;
    hi = 2.9;
    for (let i = 0; i < 14; i++) {
      const v = (lo + hi) / 2;
      const s = probe('ai', turn, mods);
      launch(s, aim, v);
      const r = simulate([s], venue, { maxT: 70 });
      const f = r.stones[0];
      if (f.out || f.x > tx) hi = v;
      else lo = v;
      best = { speed: v, endY: f.y, out: f.out };
    }
    aim += ty - best.endY;
  }
  return { aimY: aim, speed: (lo + hi) / 2 };
}

// Aim a stone of the given speed so its path passes through (tx, ty).
export function solveHit(venue, tx, ty, speed, turn, mods) {
  let aim = ty;
  for (let pass = 0; pass < 3; pass++) {
    const s = probe('ai', turn, mods);
    launch(s, aim, speed);
    const r = simulate([s], venue, { trackId: s.id, maxT: 40 });
    let yAt = null;
    for (let i = 1; i < r.path.length; i++) {
      const a = r.path[i - 1];
      const b = r.path[i];
      if (a.x <= tx && b.x >= tx) {
        yAt = a.y + ((tx - a.x) / (b.x - a.x || 1)) * (b.y - a.y);
        break;
      }
    }
    if (yAt == null) break;
    aim += ty - yAt;
  }
  return { aimY: aim, speed };
}

function candidates(match, team) {
  const list = [];
  const live = match.stones.filter((s) => !s.out);
  const theirs = live.filter((s) => s.team !== team);
  const ours = live.filter((s) => s.team === team);
  const T = SHEET.tee;
  const draws = [
    [T, 0], [T - 0.5, 0.35], [T - 0.5, -0.35], [T + 0.45, 0.4], [T + 0.45, -0.4], [T, 0.85], [T, -0.85],
  ];
  for (const [x, y] of draws) list.push({ kind: 'draw', x, y });
  // Freeze onto the front of stones in the house.
  for (const s of live.filter(inHouse)) list.push({ kind: 'freeze', x: s.x - 2 * R - 0.015, y: s.y });
  // Guards in front of the house, and in front of our own shot stone.
  list.push({ kind: 'guard', x: T - 3.4, y: 0 });
  list.push({ kind: 'guard', x: T - 3.1, y: 0.75 });
  list.push({ kind: 'guard', x: T - 3.1, y: -0.75 });
  for (const s of ours.filter(inHouse)) list.push({ kind: 'guard', x: T - 3.2, y: s.y });
  // Takeouts and peels on their stones; raises on ours sitting short.
  for (const s of theirs) {
    if (s.x < SHEET.hogFar) continue;
    list.push({ kind: inHouse(s) ? 'takeout' : 'peel', x: s.x, y: s.y, speed: inHouse(s) ? 2.95 : 3.4 });
  }
  for (const s of ours) {
    if (!inHouse(s) && s.x > SHEET.hogFar && s.x < T - SHEET.rings[0]) list.push({ kind: 'raise', x: s.x, y: s.y, speed: 2.45 });
  }
  return list;
}

const STYLE_BONUS = {
  draw: { draw: 1.2, freeze: 0.4 },
  guard: { guard: 2.2, draw: 0.4 },
  takeout: { takeout: 2.2, peel: 1.2 },
  freeze: { freeze: 2.4, draw: 0.5 },
  mixed: {},
};

export function chooseShot(match, team, rng) {
  const rival = match.rival;
  const mods = match.mods[team];
  const thrownUs = match.thrown[team];
  const other = team === 'player' ? 'rival' : 'player';
  const ctx = {
    stonesLeftUs: match.stonesPerTeam - thrownUs - 1,
    stonesLeftThem: match.stonesPerTeam - match.thrown[other],
    hammerUs: match.hammer === team,
    style: rival.style,
  };
  let best = null;
  for (const c of candidates(match, team)) {
    for (const turn of [1, -1]) {
      const sol = c.speed ? solveHit(match.venue, c.x, c.y, c.speed, turn, mods) : solveDraw(match.venue, c.x, c.y, turn, mods);
      const stones = cloneStones(match.stones);
      const s = probe(team, turn, mods);
      launch(s, sol.aimY, sol.speed);
      stones.push(s);
      const r = simulate(stones, match.venue, { maxT: 70 });
      const shooter = r.stones[r.stones.length - 1];
      if (!shooter.touched && shooter.x + R < SHEET.hogFar) shooter.out = true;
      let v = evaluate(r.stones, team, ctx);
      v += (STYLE_BONUS[rival.style][c.kind] ?? 0) * (1 - Math.min(1, (ctx.stonesLeftUs + ctx.stonesLeftThem) / 9)) + (STYLE_BONUS[rival.style][c.kind] ?? 0) * 0.6;
      // A wobble in the plan: weaker skips misjudge which shot is best.
      v += (rng.next() - 0.5) * (1 - rival.skill) * 6;
      if (!best || v > best.value) best = { value: v, kind: c.kind, target: c, turn, aimY: sol.aimY, speed: sol.speed };
    }
  }
  return best;
}

function gauss(rng) {
  const u = Math.max(1e-9, rng.next());
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Turn a chosen shot into an actual throw, with the misses a skip of this skill makes.
export function executeShot(shot, skill, nerves, rng) {
  const wobble = (1 - skill) * nerves;
  const aimY = shot.aimY + gauss(rng) * wobble * 0.32;
  const speed = shot.speed * (1 + gauss(rng) * wobble * 0.045);
  return { aimY, speed, turn: shot.turn, weight: weightFromSpeed(speed) };
}

// While its stone runs, a rival sweeps if the stone looks like stopping short of the target.
export function rivalWantsSweep(match, stone, shot) {
  if (!shot || shot.kind === 'takeout' || shot.kind === 'peel') return false;
  const alone = simulate([stone], match.venue, { maxT: 40 });
  const f = alone.stones[0];
  return f.x < shot.target.x - 0.12;
}

export { speedFromWeight, distToButton };
