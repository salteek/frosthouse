// One match of curling: ends, the order of throws, the hammer, the hog rule, sweeping and the score.

import { SHEET, PHYS, THROW, MATCH, SCORE } from './config.js';
import { createStone, launch, stepStones, anyMoving, cloneStones, speedFromWeight } from './physics.js';
import { countEnd } from './scoring.js';
import { callShot } from './callouts.js';
import { chooseShot, executeShot, rivalWantsSweep } from './ai.js';
import { applySkillHit, gainEnergy } from './skills.js';
import { chargeFor, comboOnHit } from './combos.js';
import { createBoss, hurtBoss, RESOLVE_PER_POINT, RESOLVE_PER_CALL, bossSkillMod } from './boss.js';

const R = SHEET.stoneR;

export function teamMods(kit, team) {
  if (team === 'player') {
    return { mass: kit.mass, frictionMul: kit.friction, curlMul: kit.curl };
  }
  return { mass: 1, frictionMul: 1, curlMul: 1 };
}

export function createMatch({ rival, venue, kit, difficulty, rng, ends = MATCH.ends }) {
  const m = {
    rival, venue, kit, rng, difficulty,
    ends,
    end: 1,
    stonesPerTeam: MATCH.stonesPerTeam,
    scores: { player: [], rival: [] },
    hammer: kit.startHammer ? 'player' : rng.chance(0.5) ? 'player' : 'rival',
    stones: [],
    thrown: { player: 0, rival: 0 },
    mods: { player: teamMods(kit, 'player'), rival: teamMods(kit, 'rival') },
    phase: 'aim',          // aim | running | settle | endScore | over
    shot: null,
    rivalShot: null,
    before: null,
    stamina: 0,
    sweepTimer: 0,
    sweepCheck: 0,
    lastCall: null,
    endResult: null,
    teaUsed: false,
    mittenReady: kit.mitten,
    perfect: false,
    events: [],
    stats: { perfects: 0, calls: [], bestCall: null, takeouts: 0, buttons: 0, pointsFor: 0, pointsAgainst: 0, hogged: 0, bestStreak: 0 },
    energy: { player: 0, rival: 0 }, // frost energy for skills (skills.js)
    skillUsed: {},         // team -> skill id -> fired this end
    skill: null,           // the skill being played out (phase 'skill')
    streak: 0,             // the player's run of good shots in a row; it multiplies shot-call points
    winner: null,
    clock: 0,
    boss: createBoss(rival, venue), // the final's boss state (boss.js), or null
  };
  return m;
}

export const total = (m, team) => m.scores[team].reduce((a, b) => a + b, 0);

// Whose throw is it? The side without the hammer throws first in each end.
export function currentTeam(m) {
  const n = m.thrown.player + m.thrown.rival;
  const first = m.hammer === 'player' ? 'rival' : 'player';
  const second = m.hammer;
  return n % 2 === 0 ? first : second;
}

export function stonesLeft(m, team) {
  return m.stonesPerTeam - m.thrown[team];
}

export function deliver(m, team, { aimY, speed, turn }) {
  const mods = m.mods[team];
  const stone = createStone(team, 0, 0, { turn, mass: mods.mass, frictionMul: mods.frictionMul, curlMul: mods.curlMul });
  if (team === 'player') {
    stone.sweepFriction = 1 - (1 - PHYS.sweepFriction) * m.kit.sweepPower;
    stone.sweepCurl = PHYS.sweepCurl * m.kit.sweepStraighten;
  }
  // A hot streak charges the stone with an element (combos.js), once per end per side.
  if (!m.comboUsed?.[team] && (team === 'player' || m.difficulty !== 'casual')) stone.charge = chargeFor(team === 'player' ? m.streak : m.rivalStreak ?? 0);
  m.before = cloneStones(m.stones);
  launch(stone, aimY, speed);
  m.stones.push(stone);
  m.shot = stone;
  m.phase = 'running';
  m.stamina = THROW.sweepStamina * (team === 'player' ? m.kit.stamina : 1.2);
  m.sweepCheck = 0;
  m.events.push({ type: 'release', team });
  return stone;
}

// The player's throw from the shot panel: weight slider, broom position, turn and release error (-1..1).
export function playerThrow(m, { aimY, weight, turn, releaseError }) {
  let err = releaseError;
  if (m.mittenReady) {
    err = 0;
    m.mittenReady = false;
  }
  const perfect = Math.abs(err) <= THROW.perfectZone * m.kit.perfect;
  if (perfect) err = 0;
  m.perfect = perfect;
  if (perfect) m.stats.perfects++;
  const aim = aimY + err * THROW.aimError * SHEET.tee;
  const speed = speedFromWeight(weight) * (1 + err * THROW.weightError);
  return deliver(m, 'player', { aimY: aim, speed, turn });
}

export function rivalThrow(m) {
  const shot = chooseShot(m, 'rival', m.rng);
  const skill = m.rival.skill + bossSkillMod(m) + (m.difficulty === 'casual' ? -0.14 : m.difficulty === 'champion' ? 0.05 : 0);
  const exec = executeShot(shot, Math.min(0.97, skill), m.kit.rivalNerves, m.rng);
  m.rivalShot = shot;
  return deliver(m, 'rival', exec);
}

// Advance a running throw by `dt` seconds of wall time. `sweeping` is whether the player holds the sweep key.
export function updateRunning(m, dt, sweeping) {
  const steps = Math.max(1, Math.round((dt * PHYS.timeScale) / PHYS.dt));
  const s = m.shot;
  let swept = false;
  if (s.moving && !s.out && m.stamina > 0) {
    if (s.team === 'player') swept = sweeping;
    else {
      m.sweepCheck -= dt;
      if (m.sweepCheck <= 0) {
        m.sweepCheck = 0.3;
        m.rivalSweeping = rivalWantsSweep(m, { ...s, swept: false }, m.rivalShot);
      }
      swept = m.rivalSweeping;
    }
  }
  if (swept) m.stamina = Math.max(0, m.stamina - dt);
  m.sweepTimer = swept ? m.sweepTimer + dt : 0;
  for (let i = 0; i < steps; i++) {
    for (const st of m.stones) st.swept = st === s && swept && st.moving;
    for (const e of stepStones(m.stones, m.venue, PHYS.dt)) {
      if (e.type === 'out') e.stone.outWhy = e.why;
      m.events.push(e);
      if (e.type === 'hit') { const c = comboOnHit(m, e); if (c) m.events.push(...c); }
    }
  }
  m.clock += dt;
  if (!anyMoving(m.stones)) finishThrow(m);
  return swept;
}

// A skill plays out between throws: the strike lands, the shoved stones run to rest, the turn goes on.
export function updateSkill(m, dt) {
  const sk = m.skill;
  sk.t += dt;
  if (!sk.applied) {
    if (sk.t >= sk.hitAt) applySkillHit(m);
    return;
  }
  const steps = Math.max(1, Math.round((dt * PHYS.timeScale) / PHYS.dt));
  for (let i = 0; i < steps; i++) {
    for (const e of stepStones(m.stones, m.venue, PHYS.dt)) {
      if (e.type === 'out') { e.stone.outWhy = e.why; e.bySkill = sk.id; }
      m.events.push(e);
    }
  }
  if (anyMoving(m.stones)) { sk.rest = 0; return; }
  sk.rest = (sk.rest ?? 0) + dt;
  if (sk.rest < 0.35) return;
  const out = m.stones.filter((st) => st.out && st.team !== sk.team).length;
  m.stones = m.stones.filter((st) => !st.out);
  m.events.push({ type: 'skillDone', id: sk.id, out });
  m.skill = null;
  m.phase = 'aim';
}

function finishThrow(m) {
  const s = m.shot;
  s.swept = false;
  if (!s.out && !s.touched && s.x + R < SHEET.hogFar) {
    s.out = true;
    s.hogged = true;
    m.events.push({ type: 'hog', stone: s });
  }
  const call = callShot(m.before, m.stones, s.id, s.team);
  m.lastCall = { ...call, team: s.team, t: 0, perfect: s.team === 'player' && m.perfect, streak: 1 };
  if (s.team === 'player') {
    m.events.push({ type: 'energy', team: 'player', gain: gainEnergy(m, 'player', call, m.perfect) });
    // A hot streak: every good shot in a row raises the multiplier, up to x4; a poor one breaks it.
    m.streak = call.tone === 'great' || call.tone === 'good' ? m.streak + 1 : 0;
    const mult = Math.min(SCORE.streakMax, Math.max(1, m.streak));
    m.lastCall.streak = mult;
    m.stats.bestStreak = Math.max(m.stats.bestStreak, m.streak);
    m.stats.calls.push(call.text);
    if (!m.stats.bestCall || call.points > m.stats.bestCall.points) m.stats.bestCall = call;
    if (call.text.includes('TAKEOUT') || call.text.includes('HIT')) m.stats.takeouts++;
    if (call.text === 'ON THE BUTTON!') m.stats.buttons++;
    if (s.hogged) m.stats.hogged++;
    hurtBoss(m, RESOLVE_PER_CALL[call.tone] ?? 0);
    m.events.push({ type: 'call', call, mult, points: Math.round((call.points + (m.perfect ? SCORE.perfectRelease : 0)) * m.kit.scoreMul * mult), x: s.x, y: s.y });
  } else {
    gainEnergy(m, 'rival', call, false);
    m.rivalStreak = call.tone === 'great' || call.tone === 'good' ? (m.rivalStreak ?? 0) + 1 : 0;
    m.events.push({ type: 'rivalCall', call });
  }
  m.thrown[s.team]++;
  m.stones = m.stones.filter((st) => !st.out);
  m.shot = null;
  m.phase = m.thrown.player + m.thrown.rival >= m.stonesPerTeam * 2 ? 'endScore' : 'settle';
  if (m.phase === 'endScore') scoreEnd(m);
}

function scoreEnd(m) {
  let res = countEnd(m.stones);
  let tea = false;
  if (res.team === 'rival' && m.kit.tea && !m.teaUsed) {
    m.teaUsed = true;
    tea = true;
    res = { ...res, team: null, points: 0 };
  }
  m.scores.player.push(res.team === 'player' ? res.points : 0);
  m.scores.rival.push(res.team === 'rival' ? res.points : 0);
  if (res.team === 'player') m.stats.pointsFor += res.points;
  if (res.team === 'rival') m.stats.pointsAgainst += res.points;
  // The hammer goes to the side that did not score; a blank end keeps it where it was.
  const stolen = res.team && res.team !== m.hammer;
  if (res.team) m.hammer = res.team === 'player' ? 'rival' : 'player';
  m.endResult = { ...res, tea, stolen, t: 0 };
  m.events.push({ type: 'endScored', result: m.endResult });
  if (res.team === 'player') hurtBoss(m, res.points * RESOLVE_PER_POINT);
  if (res.team === 'player') m.events.push({ type: 'points', points: Math.round(res.points * SCORE.pointPerStone * m.kit.scoreMul) });
}

// Called after the end's score has been shown. Starts the next end, an extra end, or ends the match.
export function nextEnd(m) {
  const p = total(m, 'player');
  const r = total(m, 'rival');
  if (m.end >= m.ends && p !== r) {
    m.phase = 'over';
    m.winner = p > r ? 'player' : 'rival';
    return false;
  }
  m.end++;
  m.stones = [];
  m.thrown = { player: 0, rival: 0 };
  m.mittenReady = m.kit.mitten;
  m.comboUsed = {};
  m.skillUsed = {};
  m.phase = 'aim';
  m.endResult = null;
  return true;
}
