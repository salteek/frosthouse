// Measuring the house: who is shot stone, how many count, and how good a position is.

import { SHEET } from './config.js';

const HOUSE = SHEET.rings[0];

export const distToButton = (s) => Math.hypot(s.x - SHEET.tee, s.y);
export const inHouse = (s) => !s.out && distToButton(s) - SHEET.stoneR <= HOUSE;
export const inPlay = (s) => !s.out;

// A guard sits between the far hog line and the house, in front of the rings.
export const isGuard = (s) => !s.out && s.x > SHEET.hogFar && s.x < SHEET.tee - HOUSE && !inHouse(s);

// The end's count: the team with the stone nearest the button scores one for each of its stones
// in the house nearer than the opponent's nearest.
export function countEnd(stones) {
  const house = stones.filter(inHouse).sort((a, b) => distToButton(a) - distToButton(b));
  if (house.length === 0) return { team: null, points: 0, counting: [], ranked: house };
  const team = house[0].team;
  const counting = [];
  for (const s of house) {
    if (s.team !== team) break;
    counting.push(s);
  }
  return { team, points: counting.length, counting, ranked: house };
}

// How good the stones look for `team`, used by rival skips to choose a shot.
export function evaluate(stones, team, ctx) {
  const { stonesLeftUs, stonesLeftThem, hammerUs, style } = ctx;
  const live = stones.filter(inPlay);
  const result = countEnd(live);
  const remaining = stonesLeftUs + stonesLeftThem;
  const late = 1 - Math.min(1, remaining / 8);
  let v = 0;
  if (result.team === team) v += result.points * (6 + late * 10);
  else if (result.team) v -= result.points * (6 + late * 12);

  for (const s of live) {
    const mine = s.team === team;
    const sign = mine ? 1 : -1;
    if (inHouse(s)) {
      const d = distToButton(s);
      v += sign * (2.2 + (HOUSE - d) * 1.6);
    } else if (isGuard(s)) {
      // Guards help the side without hammer early, and the side with hammer only in the corners.
      const centre = Math.abs(s.y) < 0.6;
      let g = 0.8 * (1 - late);
      if (centre && !hammerUs) g += 1.2 * (1 - late);
      if (!centre && hammerUs) g += 0.6 * (1 - late);
      if (style === 'guard') g *= 1.8;
      v += sign * g;
    }
  }
  if (style === 'takeout') v -= live.filter((s) => s.team !== team && inHouse(s)).length * 1.4;
  if (style === 'freeze') {
    for (const s of live) {
      if (s.team !== team || !inHouse(s)) continue;
      const shelter = live.some((o) => o !== s && Math.hypot(o.x - s.x, o.y - s.y) < SHEET.stoneR * 2.3 && o.x < s.x);
      if (shelter) v += 1.6;
    }
  }
  return v;
}
