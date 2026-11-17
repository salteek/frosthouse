// The final is a boss match. The Glacier carries a RESOLVE bar: every point you score and every good
// shot chips it. As it falls she escalates through three phases, and at zero she cracks.
//   Phase 1, COLD OPEN    (100–67): her Thunder power; a frost ridge slows stones that cross it.
//   Phase 2, WHITEOUT     (66–34): a blizzard wind pushes every stone, hers too; snow drifts blow onto the sheet.
//   Phase 3, FROZEN HEART (33–1): she also carries Frost Lock, paid with energy like yours; ice spikes guard the house.
//   CRACKED               (0): her powers are gone, the obstacles melt and her throws go shaky.
// The obstacles are laid at the start of each end (never mid-throw), stack up phase by phase, hit her stones
// as hard as yours, and never sit on the centre line, so a straight draw to the button is always there.
// Her Resolve also wears down as the final goes on (at most 66 from end 2, 33 from end 3), so every final
// reaches all three phases; good play gets there sooner and cracks her.
// You still win the match on points; breaking her Resolve is how you take her tricks away.

export const BOSS_PHASES = [
  { n: 1, name: 'COLD OPEN', note: 'Her Thunder strikes · a frost ridge slows stones', obstacle: 'FROST RIDGE' },
  { n: 2, name: 'WHITEOUT', note: 'Blizzard wind · snow drifts blow onto the sheet', obstacle: 'SNOW DRIFTS' },
  { n: 3, name: 'FROZEN HEART', note: 'She Frost Locks · ice spikes guard the house', obstacle: 'ICE SPIKES' },
];

export const RESOLVE_PER_POINT = 14;
export const RESOLVE_PER_CALL = { great: 5, good: 2 };
const WHITEOUT_WIND = -0.0028;

export function createBoss(rival, venue) {
  if (!rival.boss) return null;
  return { resolve: 100, phase: 1, cracked: false, hitT: 9, baseVenue: venue, obstacles: null, laidPhase: 0 };
}

export const SPIKE_R = 0.18;

// Lay the end's obstacles for the current phase, each phase adding to the last. Called at the start of
// every end. Returns the names of obstacles new this end (for the announcement).
export function layObstacles(m) {
  const b = m.boss;
  if (!b) return [];
  if (b.cracked) { b.obstacles = null; applyPhase(m); return []; }
  const cap = m.end >= 3 ? 33 : m.end >= 2 ? 66 : 100;
  if (b.resolve > cap) hurtBoss(m, b.resolve - cap);
  const rng = m.rng;
  const side = rng.chance(0.5) ? 1 : -1;
  const patches = [];
  const spikes = [];
  // Phase 1: a frost ridge across one side of the sheet between the hog line and the house.
  patches.push({ x: rng.range(23.4, 24.3), y: side * rng.range(1.2, 1.45), rx: 0.2, ry: 0.85, kind: 'ridge', drag: 2.4 });
  if (b.phase >= 2) {
    // Phase 2: two drifts, one each side, staggered down the sheet.
    patches.push({ x: rng.range(22.6, 23.2), y: -side * rng.range(1.0, 1.5), rx: rng.range(0.75, 0.95), ry: 0.38, kind: 'snow', drag: 2.6 });
    patches.push({ x: rng.range(25.0, 25.5), y: side * rng.range(0.95, 1.4), rx: rng.range(0.6, 0.8), ry: 0.34, kind: 'snow', drag: 2.6 });
  }
  if (b.phase >= 3) {
    // Phase 3: two ice spikes standing guard in front of the house, one each side of the centre line.
    const sx = rng.range(25.7, 26.0);
    spikes.push({ x: sx, y: rng.range(0.72, 1.0), r: SPIKE_R });
    spikes.push({ x: sx + rng.range(-0.25, 0.25), y: -rng.range(0.72, 1.0), r: SPIKE_R });
  }
  b.obstacles = { patches, spikes };
  const fresh = BOSS_PHASES.filter((ph) => ph.n <= b.phase && ph.n > b.laidPhase).map((ph) => ph.obstacle);
  b.laidPhase = b.phase;
  applyPhase(m);
  return fresh;
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
    b.obstacles = null;
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
  if (b.cracked) { m.venue = b.baseVenue; return; }
  const o = b.obstacles;
  m.venue = {
    ...b.baseVenue,
    ...(b.phase >= 2 ? { wind: WHITEOUT_WIND, whiteout: true } : {}),
    patches: [...b.baseVenue.patches, ...(o?.patches ?? [])],
    spikes: o?.spikes ?? [],
  };
}

// The powers the rival may fire right now (skills.js reads this).
export function rivalPowers(m) {
  const p = m.rival.power;
  if (!m.boss) return p ? [p] : [];
  if (m.boss.cracked) return [];
  return m.boss.phase >= 3 ? [p, { id: 'lock', level: 1 }] : [p];
}

// A cracked boss throws worse.
export const bossSkillMod = (m) => (m.boss?.cracked ? -0.14 : 0);

export function updateBoss(m, dt) {
  if (m.boss) m.boss.hitT += dt;
}
