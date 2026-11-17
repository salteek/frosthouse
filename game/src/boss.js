// The final is a boss match. The Glacier carries a RESOLVE bar: every point you score and every good
// shot chips it. As it falls she escalates through three phases, and at zero she cracks.
//   Phase 1, COLD OPEN    (100–67): her Thunder power, as usual.
//   Phase 2, WHITEOUT     (66–34): a blizzard wind pushes every stone, hers too.
//   Phase 3, FROZEN HEART (33–1): she also carries Frost Lock, paid with energy like yours.
//   CRACKED               (0): her powers are gone and her throws go shaky.
// You still win the match on points; breaking her Resolve is how you take her tricks away.

export const BOSS_PHASES = [
  { n: 1, name: 'COLD OPEN', note: 'Her Thunder strikes your shot stone' },
  { n: 2, name: 'WHITEOUT', note: 'Blizzard wind pushes every stone' },
  { n: 3, name: 'FROZEN HEART', note: 'She can Frost Lock her shot stone' },
];

export const RESOLVE_PER_POINT = 14;
export const RESOLVE_PER_CALL = { great: 5, good: 2 };
const WHITEOUT_WIND = -0.0028;

export function createBoss(rival, venue) {
  if (!rival.boss) return null;
  return { resolve: 100, phase: 1, cracked: false, hitT: 9, baseVenue: venue };
}

export const phaseFor = (resolve) => (resolve > 66 ? 1 : resolve > 33 ? 2 : 3);
export const bossPhase = (boss) => BOSS_PHASES[boss.phase - 1];

// Chip the boss's Resolve. Pushes 'bossPhase' / 'bossCracked' events when a threshold falls.
export function hurtBoss(m, amount) {
  const b = m.boss;
  if (!b || b.cracked || amount <= 0) return;
  b.resolve = Math.max(0, b.resolve - amount);
  b.hitT = 0;
  m.events.push({ type: 'bossHurt', amount });
  if (b.resolve <= 0) {
    b.cracked = true;
    m.venue = b.baseVenue;
    m.events.push({ type: 'bossCracked' });
    return;
  }
  const p = phaseFor(b.resolve);
  if (p !== b.phase) {
    b.phase = p;
    applyPhase(m);
    m.events.push({ type: 'bossPhase', phase: p });
  }
}

// Set the match up for the boss's current phase (also used when a screenshot stages a phase directly).
export function applyPhase(m) {
  const b = m.boss;
  m.venue = b.phase >= 2 && !b.cracked ? { ...b.baseVenue, wind: WHITEOUT_WIND, whiteout: true } : b.baseVenue;
}

// The powers the rival may fire right now (skills.js reads this).
export function rivalPowers(m) {
  const p = m.rival.power;
  if (!m.boss) return p ? [p] : [];
  if (m.boss.cracked) return [];
  return m.boss.phase >= 3 ? [p, { id: 'lock', level: 2 }] : [p];
}

// A cracked boss throws worse.
export const bossSkillMod = (m) => (m.boss?.cracked ? -0.14 : 0);

export function updateBoss(m, dt) {
  if (m.boss) m.boss.hitT += dt;
}
