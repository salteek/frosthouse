// The Frost Lake Open: a ladder of six rinks. Win to climb; two match losses and you are out.

import { MATCH, SCORE } from './config.js';
import { RIVALS } from './rivals.js';
import { venueById } from './venues.js';
import { freshKit, offerKit, KIT } from './kit.js';
import { createRng } from './rng.js';
import { skillOffer } from './skills.js';

export const DIFFICULTIES = [
  { id: 'casual', name: 'CASUAL', note: 'Full preview · 3 ends' },
  { id: 'club', name: 'CLUB', note: 'The real Open · 4 ends' },
  { id: 'champion', name: 'CHAMPION', note: 'Short preview · sharp rivals' },
];

export function createRun(difficulty, seed, stone = null) {
  return {
    stone,
    difficulty,
    seed,
    rng: createRng(seed),
    round: 0,
    losses: 0,
    results: [],
    kit: freshKit(stone),
    owned: [],
    score: 0,
    offer: null,
    outcome: null,      // 'champion' | 'eliminated'
    stats: { perfects: 0, takeouts: 0, buttons: 0, pointsFor: 0, pointsAgainst: 0, endsWon: 0, ends: 0, bestCall: null, hogged: 0, bestStreak: 0 },
  };
}

export const currentRival = (run) => RIVALS[Math.min(run.round, RIVALS.length - 1)];
export const currentVenue = (run) => venueById(currentRival(run).venue);
export const endsPerMatch = (run) => (run.difficulty === 'casual' ? 3 : MATCH.ends);
export const previewLength = (run) => (run.difficulty === 'casual' ? 1 : run.difficulty === 'champion' ? 0.32 : 0.55) * run.kit.preview;

export function recordMatch(run, match) {
  const p = match.scores.player.reduce((a, b) => a + b, 0);
  const r = match.scores.rival.reduce((a, b) => a + b, 0);
  const won = match.winner === 'player';
  const rival = currentRival(run);
  run.results.push({ rival: rival.id, won, p, r });
  const s = run.stats;
  const ms = match.stats;
  s.perfects += ms.perfects;
  s.takeouts += ms.takeouts;
  s.buttons += ms.buttons;
  s.pointsFor += ms.pointsFor;
  s.pointsAgainst += ms.pointsAgainst;
  s.hogged += ms.hogged;
  s.bestStreak = Math.max(s.bestStreak ?? 0, ms.bestStreak ?? 0);
  s.ends += match.scores.player.length;
  s.endsWon += match.scores.player.filter((x) => x > 0).length;
  if (ms.bestCall && (!s.bestCall || ms.bestCall.points > s.bestCall.points)) s.bestCall = ms.bestCall;

  if (won) {
    run.score += Math.round(SCORE.matchWin * run.kit.scoreMul);
    run.round++;
    if (run.round >= RIVALS.length) {
      run.outcome = 'champion';
      run.score += SCORE.champion;
    } else {
      run.offer = offerKit(run.owned, run.rng);
      // One card is always a skill: a new one, a level up, or a swap.
      const sk = skillOffer(run.kit, run.rng);
      if (sk) run.offer[Math.min(2, run.offer.length)] = sk;
    }
  } else {
    run.losses++;
    if (run.losses >= MATCH.lossesAllowed) run.outcome = 'eliminated';
  }
  return won;
}

export function takeKit(run, item) {
  item.apply(run.kit);
  if (!item.skill) run.owned.push(item.id);
  run.offer = null;
}

export function kitItems(run) {
  const seen = [];
  for (const id of run.owned) if (!seen.includes(id)) seen.push(id);
  return seen.map((id) => ({ item: KIT.find((k) => k.id === id), count: run.owned.filter((o) => o === id).length }));
}

// A letter grade for the results card.
export function grade(run) {
  const won = run.results.filter((r) => r.won).length;
  let g = run.outcome === 'champion' ? (run.losses === 0 ? 'S' : 'A') : won >= 4 ? 'B' : won >= 2 ? 'C' : 'D';
  if (g === 'A' && run.stats.pointsFor >= run.stats.pointsAgainst * 2.5) g = 'S';
  return g;
}
