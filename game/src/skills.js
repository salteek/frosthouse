// Skills: two slots of active powers the player fires between throws (F and G, or the buttons on the ice).
// They run on FROST ENERGY: every match starts empty, and good shots fill it (a good call +1, a great one
// +2, a perfect release +1, up to 6). A skill costs energy and can be fired once per end. Skills level up
// to 3 (cheaper, stronger) and can be swapped at the clubhouse. The rivals that carry a power play by the
// same energy rules.

import { SHEET } from './config.js';
import { rivalPowers } from './boss.js';

export const SKILLS = {
  bolt: {
    id: 'bolt', name: 'Ice Bolt', color: '#6fd3ff', glow: '111,211,255',
    text: 'A frost bolt from the hack slams the rival stone nearest the button back out of the house.',
    cost: [3, 3, 2], power: [0.6, 0.75, 0.9],
    short: 'A frost bolt knocks the rival stone nearest the button out of the house.',
  },
  thunder: {
    id: 'thunder', name: 'Thunder', color: '#ffe05a', glow: '255,224,90',
    text: 'Lightning strikes the rival stone nearest the button and blasts it away. Level 3 chains to a second stone.',
    cost: [5, 4, 4], power: [0.7, 0.85, 1.0], chain: [0, 0, 1],
    short: 'Lightning blasts the rival stone nearest the button. Level 3 chains to a second.',
  },
  gale: {
    id: 'gale', name: 'Gale Horn', color: '#b8f0ff', glow: '184,240,255',
    text: 'A blast of wind pushes every rival stone in the house outward.',
    cost: [4, 4, 3], power: [0.38, 0.48, 0.58],
    short: 'A blast of wind shoves every rival stone in the house outward.',
  },
  lock: {
    id: 'lock', name: 'Frost Lock', color: '#a98bff', glow: '169,139,255',
    text: 'Freeze your stone nearest the button to the ice: it shrugs off hits for the rest of the end.',
    cost: [3, 2, 2], power: [5, 7, 9],
    short: 'Freeze your stone nearest the button: it shrugs off hits for the end.',
  },
};

export const SKILL_KEYS = ['KeyF', 'KeyG'];
export const SKILL_KEY_NAMES = ['F', 'G'];
export const MAX_SKILL_LEVEL = 3;
// The two skill buttons, bottom-left of the ice (the end you throw from, clear of the house).
export const SKILL_BUTTONS = [{ x: 62, y: 532, r: 30 }, { x: 138, y: 532, r: 30 }];

export const skillCost = (slot) => SKILLS[slot.id].cost[slot.level - 1];
export const MAX_ENERGY = 6;
export const energyOf = (m, team = 'player') => m.energy?.[team] ?? 0;
export const usedThisEnd = (m, id, team = 'player') => !!m.skillUsed?.[team]?.[id];

// Energy from a finished throw's call.
export function gainEnergy(m, team, call, perfect) {
  const e = (call.tone === 'great' ? 2 : call.tone === 'good' ? 1 : 0) + (perfect ? 1 : 0);
  if (!e) return 0;
  (m.energy ??= { player: 0, rival: 0 })[team] = Math.min(MAX_ENERGY, energyOf(m, team) + e);
  return e;
}

function spend(m, team, slot) {
  (m.energy ??= { player: 0, rival: 0 })[team] = energyOf(m, team) - skillCost(slot);
  ((m.skillUsed ??= {})[team] ??= {})[slot.id] = true;
}

const dist2 = (s) => (s.x - SHEET.tee) ** 2 + s.y ** 2;
const HOUSE = SHEET.rings[0];

// Stones ranked by distance to the button; a strike hits the enemy's closest one. `team` is who fires.
export function skillTargets(m, id, team = 'player') {
  const enemy = team === 'player' ? 'rival' : 'player';
  const stones = m.stones.filter((s) => !s.out && !s.moving);
  if (id === 'lock') {
    const mine = stones.filter((s) => s.team === team && !s.locked).sort((a, b) => dist2(a) - dist2(b));
    return mine.slice(0, 1);
  }
  const foes = stones.filter((s) => s.team === enemy).sort((a, b) => dist2(a) - dist2(b));
  if (id === 'gale') return foes.filter((s) => dist2(s) < (HOUSE + 0.8) ** 2);
  return foes;
}

// Why a skill can't fire right now ('' when it can).
export function skillBlock(m, slotIndex) {
  const slot = m.kit.skills?.[slotIndex];
  if (!slot) return 'empty';
  if (usedThisEnd(m, slot.id)) return 'used';
  if (energyOf(m) < skillCost(slot)) return 'energy';
  if (!skillTargets(m, slot.id).length) return 'target';
  return '';
}
export const canUseSkill = (m, slotIndex) => skillBlock(m, slotIndex) === '';

function start(m, team, slot) {
  const def = SKILLS[slot.id];
  const targets = skillTargets(m, slot.id, team);
  m.skill = { id: slot.id, level: slot.level, team, t: 0, hitAt: slot.id === 'bolt' ? 0.42 : slot.id === 'thunder' ? 0.32 : 0.36, applied: false,
    targets: slot.id === 'thunder' ? targets.slice(0, 1 + def.chain[slot.level - 1]) : slot.id === 'gale' || slot.id === 'lock' ? targets : targets.slice(0, 1) };
  m.phase = 'skill';
  m.events.push({ type: 'skill', id: slot.id, level: slot.level, team });
}

// Start a skill: the match pauses in phase 'skill' while the strike plays, then the push is applied
// (applySkillHit) and the stones run to rest before the turn carries on.
export function useSkill(m, slotIndex) {
  if (!canUseSkill(m, slotIndex)) return false;
  const slot = m.kit.skills[slotIndex];
  spend(m, 'player', slot);
  start(m, 'player', slot);
  return true;
}

// The stronger rinks carry one power of their own. They fire it before a throw when you are counting
// (or, for Frost Lock, when they are), paying energy like you; never on Casual.
export function rivalTrySkill(m) {
  if (m.difficulty === 'casual') return false;
  const all = m.stones.filter((s) => !s.out).sort((a, b) => dist2(a) - dist2(b));
  const shot = all[0];
  if (!shot || dist2(shot) > HOUSE * HOUSE) return false;
  for (const p of rivalPowers(m)) {
    if (usedThisEnd(m, p.id, 'rival') || energyOf(m, 'rival') < skillCost(p)) continue;
    const want = p.id === 'lock' ? shot.team === 'rival' && !shot.locked : shot.team === 'player';
    if (!want || !skillTargets(m, p.id, 'rival').length) continue;
    // Late in the end they are keener to spend it.
    const left = m.stonesPerTeam - m.thrown.rival;
    if (!m.rng.chance(left <= 2 ? 0.85 : 0.45)) return false;
    spend(m, 'rival', p);
    start(m, 'rival', p);
    return true;
  }
  return false;
}

export function applySkillHit(m) {
  const sk = m.skill;
  const def = SKILLS[sk.id];
  const p = def.power[sk.level - 1];
  sk.applied = true;
  sk.targets.forEach((s, i) => {
    if (sk.id === 'lock') {
      s.locked = true;
      s.mass *= p;
      s.frictionMul *= p * 1.5;
      return;
    }
    let dx = s.x - SHEET.tee, dy = s.y;
    if (sk.id === 'bolt') { dx = 1; dy = s.y * 0.15; }
    const d = Math.hypot(dx, dy);
    if (d < 0.05) { dx = 1; dy = 0; } else { dx /= d; dy /= d; }
    // A locked stone barely budges (its mass soaks the push).
    const speed = (p * (i > 0 ? 0.65 : 1)) / Math.sqrt(s.mass);
    s.vx += dx * speed;
    s.vy += dy * speed;
    s.moving = true;
    s.touched = true;
  });
  m.events.push({ type: 'skillHit', id: sk.id, targets: sk.targets, team: sk.team });
}

// ---- The clubhouse: a skill card among the kit offers.

export function skillOffer(kit, rng) {
  const slots = kit.skills ?? [];
  const opts = [];
  for (const s of slots) if (s.level < MAX_SKILL_LEVEL) opts.push({ id: s.id, kind: 'up', level: s.level + 1 });
  for (const id of Object.keys(SKILLS)) if (!slots.some((s) => s.id === id)) opts.push({ id, kind: 'new', level: 1 });
  if (!opts.length) return null;
  // New skills while a slot is free are the most exciting pick; otherwise anything goes.
  const pick = slots.length < 2 ? rng.pick(opts.filter((o) => o.kind === 'new')) ?? rng.pick(opts) : rng.pick(opts);
  const def = SKILLS[pick.id];
  const replaced = pick.kind === 'new' && slots.length >= 2 ? slots.slice().sort((a, b) => a.level - b.level)[0] : null;
  return {
    id: `skill:${pick.id}`, skill: pick.id, icon: `skill_${pick.id}`, name: def.name, max: MAX_SKILL_LEVEL,
    text: pick.kind === 'up' ? `Level ${pick.level}: more power${def.cost[pick.level - 1] < def.cost[pick.level - 2] ? ' and it costs less energy' : ''}${pick.id === 'thunder' && pick.level === 3 ? ', and it chains to a second stone' : ''}.` : def.short,
    chip: pick.kind === 'up' ? `SKILL LEVEL ${pick.level} OF 3` : replaced ? `NEW SKILL · REPLACES ${SKILLS[replaced.id].name.toUpperCase()}` : 'NEW SKILL',
    apply: (k) => {
      const list = (k.skills ??= []);
      const own = list.find((s) => s.id === pick.id);
      if (own) own.level = pick.level;
      else if (list.length < 2) list.push({ id: pick.id, level: 1 });
      else list[list.indexOf(list.find((s) => s.id === replaced.id))] = { id: pick.id, level: 1 };
    },
  };
}
