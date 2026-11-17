// Your rink's stones: chosen before each run. Each set has its own look, how it plays, and a signature
// skill. Stones level up across runs (kept in this browser): every match won earns them experience, and
// each level raises the signature skill's level (more power, less energy).

export const STONES = [
  {
    id: 'ruby', name: 'Ruby Classic', colour: '#e0383e', dark: '#8f1d22', skill: 'bolt',
    blurb: 'Balanced granite that does what you ask.',
    mods: { mass: 1, friction: 1, curl: 1 },
  },
  {
    id: 'amber', name: 'Amber Storm', colour: '#ff8a2a', dark: '#a5501a', skill: 'thunder',
    blurb: 'Heavy and hard-hitting; slides a little shorter.',
    mods: { mass: 1.18, friction: 1.04, curl: 0.95 },
  },
  {
    id: 'coral', name: 'Coral Glider', colour: '#ff4fa8', dark: '#9c2c64', skill: 'gale',
    blurb: 'Glides far and runs straight; light in a collision.',
    mods: { mass: 0.92, friction: 0.93, curl: 0.88 },
  },
  {
    id: 'ivory', name: 'Ivory Spinner', colour: '#f4efe2', dark: '#9b927f', skill: 'lock',
    blurb: 'Bends around guards with a huge curl.',
    mods: { mass: 0.97, friction: 1, curl: 1.22 },
  },
];

export const stoneById = (id) => STONES.find((s) => s.id === id) ?? STONES[0];

// Experience to reach level 2 and level 3.
export const LEVEL_XP = [0, 3, 8];
export const stoneLevel = (xp = 0) => (xp >= LEVEL_XP[2] ? 3 : xp >= LEVEL_XP[1] ? 2 : 1);
// Experience earned by a run: one per match won, three more for the trophy.
export const runXp = (run) => run.results.filter((r) => r.won).length + (run.outcome === 'champion' ? 3 : 0);
