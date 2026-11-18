// End bounties: every end posts one side goal for your rink. Land it and the crowd pays out: score,
// one frost energy. Miss it and nothing is lost,
// so a bounty is a reason to try the harder shot, never a penalty for playing the end safe.
// Some are settled live (they tick the moment you do them); the rest are judged when the end is counted.

import { SHEET } from './config.js';
import { createRng, seedFromString } from './rng.js';
import { distToButton } from './scoring.js';
import { MAX_ENERGY, energyOf } from './skills.js';

export const BOUNTY_SCORE = 250;

const FOUR_FOOT = SHEET.rings[2];

export const BOUNTIES = [
  { id: 'big', name: 'BIG END', text: 'Score 2+ points this end', goal: 1, when: 'end', hammer: 'player',
    judge: (m, res) => res.team === 'player' && res.points >= 2 },
  { id: 'steal', name: 'STEAL IT', text: 'Score without the hammer', goal: 1, when: 'end', hammer: 'rival',
    judge: (m, res) => res.team === 'player' },
  { id: 'bull', name: 'BULLSEYE', text: 'A stone in the 4-foot', goal: 1, when: 'end',
    judge: (m) => m.stones.some((s) => s.team === 'player' && !s.out && distToButton(s) - SHEET.stoneR <= FOUR_FOOT) },
  { id: 'clear', name: 'CLEAR OUT', text: 'Knock 2 of theirs out', goal: 2, when: 'live' },
  { id: 'sure', name: 'SURE HAND', text: '2 perfect releases', goal: 2, when: 'live' },
  { id: 'fire', name: 'ON FIRE', text: 'Reach a x3 hot streak', goal: 3, when: 'live' },
  { id: 'full', name: 'FULL HOUSE', text: '3 stones in the house', goal: 1, when: 'end',
    judge: (m) => m.stones.filter((s) => s.team === 'player' && !s.out && distToButton(s) - SHEET.stoneR <= SHEET.rings[0]).length >= 3 },
];

export const bountyDef = (id) => BOUNTIES.find((b) => b.id === id);

// Post the end's bounty. It has its own seeded stream so it never changes the throws or the obstacles.
export function postBounty(m) {
  m.bountyRng ??= createRng(seedFromString(`${m.rival.id}:${m.rng.next()}`));
  const pool = BOUNTIES.filter((b) => !b.hammer || b.hammer === m.hammer).filter((b) => b.id !== m.bounty?.id && !(b.id === 'fire' && m.streak >= 2));
  const def = m.bountyRng.pick(pool);
  m.bounty = { id: def.id, progress: def.id === 'fire' ? m.streak : 0, done: false, failed: false, t: 0 };
  m.stats.bountiesPosted = (m.stats.bountiesPosted ?? 0) + 1;
}

// Live progress: a perfect release, stones knocked out, the streak.
export function bountyProgress(m, kind, n = 1) {
  const b = m.bounty;
  if (!b || b.done || b.failed) return;
  const def = bountyDef(b.id);
  if (def.when !== 'live') return;
  if (kind === 'perfect' && b.id === 'sure') b.progress += n;
  else if (kind === 'out' && b.id === 'clear') b.progress += n;
  else if (kind === 'streak' && b.id === 'fire') b.progress = Math.max(b.progress, Math.min(def.goal, n));
  else return;
  b.progress = Math.min(def.goal, b.progress);
  if (b.progress >= def.goal) complete(m);
}

// The end is counted: settle any bounty still open.
export function judgeBounty(m, res) {
  const b = m.bounty;
  if (!b || b.done || b.failed) return;
  const def = bountyDef(b.id);
  if (def.when === 'end' && def.judge(m, res)) { b.progress = def.goal; complete(m); return; }
  b.failed = true;
  m.events.push({ type: 'bountyMissed', id: b.id });
}

function complete(m) {
  const b = m.bounty;
  b.done = true;
  b.t = 0;
  m.stats.bounties = (m.stats.bounties ?? 0) + 1;
  (m.energy ??= { player: 0, rival: 0 }).player = Math.min(MAX_ENERGY, energyOf(m) + 1);
  // Bounties pay score and energy only: Resolve in the final moves by the same rules for both sides.
  m.events.push({ type: 'bounty', id: b.id, points: Math.round(BOUNTY_SCORE * m.kit.scoreMul), resolve: 0 });
}

export function updateBounty(m, dt) {
  if (m.bounty) m.bounty.t += dt;
}
