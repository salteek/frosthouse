// Tuning for Frosthouse. Distances are metres on the sheet, speeds metres per second.

export const VIEW = { w: 1280, h: 720 };

// The sheet runs left to right. A stone is released at x = 0 on the centre line.
export const SHEET = {
  width: 4.75,
  hogNear: 0,
  hogFar: 21.95,
  tee: 28.35,
  back: 30.18,
  end: 31.7,
  rings: [1.83, 1.22, 0.61, 0.15],
  stoneR: 0.19,           // a little larger than real granite, so stones read clearly and collide more
};

export const PHYS = {
  friction: 0.0815,       // deceleration on clean ice, m/s^2
  sweepFriction: 0.76,    // multiplier while the stone is swept
  curl: 0.0125,           // sideways pull, grows as the stone slows
  sweepCurl: 0.5,         // sweeping straightens the stone this much
  restitution: 0.92,
  dt: 1 / 120,
  timeScale: 2.6,         // the ice plays faster than real life so a throw takes seconds, not half a minute
  stopSpeed: 0.012,
};

export const THROW = {
  weights: [
    { upTo: 0.24, name: 'GUARD' },
    { upTo: 0.47, name: 'DRAW' },
    { upTo: 0.62, name: 'TAP' },
    { upTo: 0.84, name: 'TAKEOUT' },
    { upTo: 1.01, name: 'PEEL' },
  ],
  needlePeriod: 1.25,      // seconds for the release needle to swing across and back
  perfectZone: 0.09,
  aimError: 0.0105,        // radians of error at the worst release
  weightError: 0.055,      // fraction of speed at the worst release
  sweepStamina: 3.2,       // seconds of sweeping per stone
};

export const MATCH = { ends: 4, stonesPerTeam: 4, lossesAllowed: 2 };

export const CAMERA = { scale: 100, sheetTop: 138 };

export const PALETTE = {
  sky: '#cfe6f7',
  snow: '#f6fbff',
  snowShade: '#d7e6f3',
  ice: '#eaf4fb',
  iceLine: '#9fb7cc',
  pebble: 'rgba(120,150,180,0.10)',
  ringOuter: '#2f6fd6',
  ringMid: '#f6fbff',
  ringInner: '#e0383e',
  button: '#f6fbff',
  hog: '#d0334a',
  player: '#e0383e',
  playerDark: '#a3202a',
  rival: '#f2b53a',
  rivalDark: '#b07c12',
  granite: '#8a8f99',
  graniteLight: '#b9bec7',
  ink: '#1d2a3a',
  inkSoft: '#4f6075',
  panel: '#ffffff',
  panelEdge: '#c9d8e6',
  gold: '#f2b53a',
  good: '#2fa86b',
  bad: '#e0383e',
  accent: '#2f6fd6',
  pine: '#2f6b55',
  pineDark: '#214d3d',
};

export const SCORE = {
  pointPerStone: 100,
  matchWin: 600,
  champion: 3000,
  perfectRelease: 25,
  streakMax: 4,
};
