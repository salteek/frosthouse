// Naming the shot that was just played, the way a skip would shout it, and what it is worth.

import { SHEET } from './config.js';
import { inHouse, distToButton, isGuard } from './scoring.js';

const R = SHEET.stoneR;

export function callShot(before, after, shooterId, team) {
  const shooter = after.find((s) => s.id === shooterId);
  const prev = new Map(before.map((s) => [s.id, s]));
  const removedThem = after.filter((s) => s.team !== team && s.out && prev.get(s.id) && !prev.get(s.id).out).length;
  const removedUs = after.filter((s) => s.id !== shooterId && s.team === team && s.out && prev.get(s.id) && !prev.get(s.id).out).length;
  const raised = after.some((s) => s.id !== shooterId && s.team === team && inHouse(s) && prev.get(s.id) && !inHouse(prev.get(s.id)));

  if (shooter.hogged) return { text: 'HOGGED!', sub: 'Too light: it never crossed the far hog line', tone: 'bad', points: 0 };
  if (removedThem >= 3) return { text: 'TRIPLE TAKEOUT!', sub: 'Three stones cleared at once', tone: 'great', points: 400 };
  if (removedThem === 2) return { text: 'DOUBLE TAKEOUT!', sub: 'Two of theirs gone', tone: 'great', points: 250 };
  if (removedUs > 0 && removedThem === 0) return { text: 'OWN GOAL', sub: 'Knocked out one of your own', tone: 'bad', points: 0 };
  if (removedThem === 1 && inHouse(shooter)) return { text: 'HIT & STAY!', sub: 'Took theirs out and held the house', tone: 'great', points: 150 };
  if (removedThem === 1) return { text: 'TAKEOUT', sub: 'One of theirs removed', tone: 'good', points: 80 };
  if (raised) return { text: 'RAISE!', sub: 'Promoted your own stone into the house', tone: 'great', points: 140 };
  if (shooter.out) return { text: 'THROUGH THE HOUSE', sub: shooter.outWhy === 'side' ? 'Off the side of the sheet' : 'Over the back line', tone: 'bad', points: 0 };
  if (inHouse(shooter)) {
    const d = distToButton(shooter);
    const frozen = after.some((s) => s.id !== shooterId && !s.out && Math.hypot(s.x - shooter.x, s.y - shooter.y) < R * 2 + 0.03);
    if (d < 0.2) return { text: 'ON THE BUTTON!', sub: 'Dead centre', tone: 'great', points: 200 };
    if (frozen) return { text: 'FREEZE!', sub: 'Tucked right up against a stone', tone: 'great', points: 130 };
    if (d < 0.61) return { text: 'IN THE FOUR-FOOT', sub: 'A fine draw', tone: 'good', points: 90 };
    return { text: 'IN THE HOUSE', sub: 'A draw into the rings', tone: 'good', points: 50 };
  }
  if (isGuard(shooter)) {
    const centre = Math.abs(shooter.y) < 0.6;
    return { text: centre ? 'CENTRE GUARD' : 'CORNER GUARD', sub: 'Protection in front of the house', tone: 'good', points: 40 };
  }
  return { text: 'SHORT', sub: 'Stopped short of the house', tone: 'meh', points: 0 };
}
