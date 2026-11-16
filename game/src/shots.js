// Stages the game in a given state for its screenshots (?shot=play|title|clubhouse|results).
// Every frame is drawn by the game's own code from a real run, played forward by the rival AI on both sides.

import { createRun, recordMatch, takeKit } from './tournament.js';
import { createPlayScene, updatePlay } from './scenes/play.js';
import { currentTeam, deliver, rivalThrow, updateRunning, nextEnd } from './match.js';
import { chooseShot, executeShot } from './ai.js';
import { KIT } from './kit.js';
import { RIVALS } from './rivals.js';

const quietInput = {
  mouse: { x: 900, y: 380, down: false },
  clicked: false, rightClicked: false, wheel: 0, held: new Set(),
  isDown: () => false, wasPressed: () => false, anyPressed: () => false, endFrame() {},
};

// Play one throw to rest, with the player's side thrown by the AI at a given skill.
function autoThrow(scene, skill) {
  const m = scene.match;
  if (currentTeam(m) === 'rival') rivalThrow(m);
  else deliver(m, 'player', executeShot(chooseShot(m, 'player', m.rng), skill, 1, m.rng));
  let guard = 0;
  while (m.phase === 'running' && guard++ < 6000) updateRunning(m, 1 / 60, false);
  m.events.length = 0;
  if (m.phase === 'settle') m.phase = 'aim';
}

function giveKit(run, ids) {
  for (const id of ids) takeKit(run, KIT.find((k) => k.id === id));
}

function winMatches(run, n) {
  for (let i = 0; i < n; i++) {
    const scene = createPlayScene(run);
    const m = scene.match;
    m.scores.player = [2, 0, 1, 2];
    m.scores.rival = [0, 1, 0, 0];
    m.winner = 'player';
    m.stats.perfects = 3 + i;
    m.stats.takeouts = 2 + (i % 3);
    m.stats.buttons = 1 + (i % 2);
    m.stats.pointsFor = 5;
    m.stats.pointsAgainst = 1;
    m.stats.bestStreak = 2 + i;
    m.stats.bestCall = { text: i === 2 ? 'DOUBLE TAKEOUT!' : 'ON THE BUTTON!', points: i === 2 ? 250 : 200 };
    recordMatch(run, m);
    run.offer = null;
  }
}

export function stageShot(game, shot, seed) {
  game.time = 7.3;
  if (shot === 'title') {
    game.mode = 'title';
    game.save = { best: 0, trophies: 0, runs: 0, lastRuns: [] };
    game.hover = 'play';
    return;
  }
  const run = createRun('club', 4000 + seed);
  game.run = run;
  if (shot === 'play') {
    // The cover: the moment after a big hit. Try seeded ends until the player's throw (thrown by
    // the AI at a high skill, on a hot streak) clears stones from the house, then hold that frame.
    const rank = (c) => (c.text.startsWith('TRIPLE') || c.text.startsWith('DOUBLE') ? 3 : c.text.startsWith('HIT') ? 2 : c.tone === 'great' ? 1 : 0);
    let best = null;
    for (let k = 0; k < 60; k++) {
      const r = createRun('club', 4100 + seed * 31 + k);
      winMatches(r, 1);
      giveKit(r, ['birch', 'eye']);
      r.score = 2740;
      const scene = createPlayScene(r);
      scene.intro = 0;
      const m = scene.match;
      m.hammer = 'player';
      m.scores.player = [2, 0];
      m.scores.rival = [0, 1];
      m.end = 3;
      for (let i = 0; i < 5; i++) autoThrow(scene, 0.85);
      m.streak = 2;
      deliver(m, 'player', executeShot(chooseShot(m, 'player', m.rng), 0.97, 1, m.rng));
      let guard = 0;
      while (m.phase === 'running' && guard++ < 6000) updatePlay(scene, 1 / 60, quietInput);
      if (!m.lastCall || m.phase !== 'settle') continue;
      const score = rank(m.lastCall) * 3 + m.stones.length * 2;
      if (!best || score > best.score) best = { score, rank: rank(m.lastCall), scene, run: r };
    }
    const { scene, run: r } = best;
    game.run = r;
    // Hold the frame a third of a second after the call, while the confetti is still in the air.
    for (let i = 0; i < 20; i++) updatePlay(scene, 1 / 60, quietInput);
    game.play = scene;
    game.mode = 'play';
    game.save = { best: 18240, trophies: 1, runs: 6, lastRuns: [] };
    return;
  }
  if (shot === 'run') {
    // A throw in flight: the player's stone swept down the sheet, sweepers and frost trail in view.
    winMatches(run, 1);
    const scene = createPlayScene(run);
    scene.intro = 0;
    const m = scene.match;
    m.hammer = 'player';
    for (let i = 0; i < 4; i++) autoThrow(scene, 0.85);
    m.streak = 2;
    deliver(m, 'player', executeShot(chooseShot(m, 'player', m.rng), 0.97, 1, m.rng));
    const sweep = { ...quietInput, isDown: (k) => k === 'Space' };
    let guard = 0;
    while (m.phase === 'running' && m.shot && m.shot.x < 24.2 && guard++ < 6000) updatePlay(scene, 1 / 60, m.shot.x > 21 ? sweep : quietInput);
    game.play = scene;
    game.mode = 'play';
    game.save = { best: 18240, trophies: 1, runs: 6, lastRuns: [] };
    return;
  }
  if (shot === 'clubhouse') {
    winMatches(run, 3);
    giveKit(run, ['birch', 'eye', 'steady']);
    run.losses = 1;
    run.results.splice(2, 0, { rival: RIVALS[2].id, won: false, p: 3, r: 4 });
    run.score = 4210;
    run.offer = ['granite', 'mitten', 'grip'].map((id) => KIT.find((k) => k.id === id));
    game.mode = 'clubhouse';
    game.hover = 'kit:1';
    return;
  }
  if (shot === 'results') {
    giveKit(run, []);
    const picks = ['birch', 'eye', 'steady', 'granite', 'grip'];
    winMatches(run, 6);
    run.owned = [];
    run.kit = { ...run.kit };
    giveKit(run, picks);
    run.score = 15890;
    run.stats.hogged = 1;
    game.saveInfo = { best: 15890, newBest: true, lastRuns: [{ outcome: 'champion', round: 6, score: 15890 }, { outcome: 'eliminated', round: 3, score: 6120 }, { outcome: 'eliminated', round: 1, score: 2210 }] };
    game.mode = 'results';
    game.hover = 'again';
  }
}

export { nextEnd };
