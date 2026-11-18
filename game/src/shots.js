// Stages the game in a given state for its screenshots (?shot=play|title|clubhouse|results).
// Every frame is drawn by the game's own code from a real run, played forward by the rival AI on both sides.

import { createRun, recordMatch, takeKit } from './tournament.js';
import { createPlayScene, updatePlay } from './scenes/play.js';
import { currentTeam, deliver, rivalThrow, updateRunning, nextEnd } from './match.js';
import { chooseShot, executeShot } from './ai.js';
import { KIT } from './kit.js';
import { RIVALS } from './rivals.js';
import { useSkill, skillOffer } from './skills.js';
import { stoneById } from './stones.js';
import { setPlayerStone } from './render/stones.js';
import { createStone } from './physics.js';
import { SHEET } from './config.js';
import { layObstacles, hurtBoss } from './boss.js';

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
  // The screenshots show the Ruby Classic set's painted stones.
  setPlayerStone(stoneById('ruby'));
  game.time = 7.3;
  if (shot === 'stones') {
    game.mode = 'stones';
    game.stoneId = 'amber';
    game.save = { best: 18240, trophies: 1, runs: 6, lastRuns: [], stones: { ruby: 9, amber: 4, coral: 1 }, picked: 'amber' };
    game.hover = null;
    return;
  }
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
      // The final against the boss: last end, a one-point lead, his Resolve in its last phase.
      const r = createRun('club', 4100 + seed * 31 + k);
      winMatches(r, 5);
      giveKit(r, ['birch', 'eye', 'steady', 'granite']);
      r.kit.skills = [{ id: 'bolt', level: 2 }, { id: 'thunder', level: 3 }];
      r.losses = 1;
      r.score = 15420;
      const scene = createPlayScene(r);
      scene.intro = 0;
      const m = scene.match;
      m.hammer = 'player';
      m.scores.player = [2, 0, 1];
      m.scores.rival = [0, 2, 0];
      m.end = 4;
      // Phase 3 from the first stone of the end, so its ice spikes are already standing.
      m.boss.resolve = 33;
      m.boss.phase = 3;
      layObstacles(m);
      for (let i = 0; i < 5; i++) autoThrow(scene, 0.85);
      m.boss.resolve = 33;
      m.energy = { player: 4, rival: 2 };
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
    // The end's bounty has just paid out: two of theirs knocked out.
    scene.match.bounty = { id: 'clear', progress: 2, done: true, failed: false, t: 2 };
    // Hold the frame a third of a second after the call, while the confetti is still in the air.
    for (let i = 0; i < 20; i++) updatePlay(scene, 1 / 60, quietInput);
    game.play = scene;
    game.mode = 'play';
    game.save = { best: 18240, trophies: 1, runs: 6, lastRuns: [] };
    return;
  }
  if (shot === 'endscore') {
    // The end-score popup in the boss final: the last stone of an end played live, then held ?at= seconds
    // (default 2.2) into the score, so the phase banners that land with it are in view.
    winMatches(run, 5);
    const scene = createPlayScene(run);
    scene.intro = 0;
    const m = scene.match;
    m.hammer = 'player';
    for (let i = 0; i < 7; i++) autoThrow(scene, 0.85);
    m.boss.resolve = 70;
    deliver(m, 'player', executeShot(chooseShot(m, 'player', m.rng), 0.97, 1, m.rng));
    const at = Number(new URLSearchParams(globalThis.location?.search ?? '').get('at') ?? 2.2);
    let guard = 0, t = 0;
    while (guard++ < 9000 && (m.phase !== 'endScore' || t < at)) {
      updatePlay(scene, 1 / 60, quietInput);
      if (m.phase === 'endScore') t += 1 / 60;
    }
    game.play = scene;
    game.mode = 'play';
    game.save = { best: 18240, trophies: 1, runs: 6, lastRuns: [] };
    return;
  }
  if (shot === 'intro') {
    // The final's match intro, ?at= seconds before it fades (default 1.6).
    winMatches(run, 5);
    const scene = createPlayScene(run);
    scene.intro = Number(new URLSearchParams(globalThis.location?.search ?? '').get('at') ?? 1.6);
    game.play = scene;
    game.mode = 'play';
    game.save = { best: 18240, trophies: 1, runs: 6, lastRuns: [] };
    return;
  }
  if (shot === 'crack') {
    // The Glacier cracking: a phase-3 end with stones in the house, his last Resolve broken by a shot call;
    // held ?at= seconds after the crack starts (default 0.5).
    winMatches(run, 5);
    const scene = createPlayScene(run);
    scene.intro = 0;
    const m = scene.match;
    m.hammer = 'player';
    m.end = 3;
    m.scores.player = [1, 0];
    m.scores.rival = [0, 1];
    m.boss.resolve = 33;
    m.boss.phase = 3;
    layObstacles(m);
    for (let i = 0; i < 4; i++) autoThrow(scene, 0.85);
    m.boss.resolve = 3;
    hurtBoss(m, 5);
    const at = Number(new URLSearchParams(globalThis.location?.search ?? '').get('at') ?? 0.5);
    let guard = 0;
    while (guard++ < 2000 && !(scene.crack && scene.crack.t >= at)) updatePlay(scene, 1 / 60, quietInput);
    game.play = scene;
    game.mode = 'play';
    game.save = { best: 18240, trophies: 1, runs: 6, lastRuns: [] };
    return;
  }
  if (shot === 'run') {
    // A throw in flight: the player's stone swept down the sheet, sweepers and frost trail in view.
    // ?seed=0..5 picks the rival, and so the lake (Mirror, Pine, Windy, Thaw, Pine, Aurora).
    winMatches(run, 1);
    run.round = ((seed % 6) + 6) % 6;
    const scene = createPlayScene(run);
    scene.intro = 0;
    const m = scene.match;
    m.hammer = 'player';
    // &n= stones already thrown this end (default 4; 7 makes this the end's last stone, in slow motion).
    const thrown = Number(new URLSearchParams(globalThis.location?.search ?? '').get('n') ?? 4);
    for (let i = 0; i < thrown; i++) autoThrow(scene, 0.85);
    m.streak = 2;
    deliver(m, 'player', executeShot(chooseShot(m, 'player', m.rng), 0.97, 1, m.rng));
    const sweep = { ...quietInput, isDown: (k) => k === 'Space' };
    let guard = 0;
    const stopAt = Number(new URLSearchParams(globalThis.location?.search ?? '').get('at') ?? 24.2);
    while (m.phase === 'running' && m.shot && m.shot.x < stopAt && guard++ < 6000) updatePlay(scene, 1 / 60, m.shot.x > 21 ? sweep : quietInput);
    game.play = scene;
    game.mode = 'play';
    game.save = { best: 18240, trophies: 1, runs: 6, lastRuns: [] };
    return;
  }
  if (shot === 'skill') {
    // A skill mid-strike: ?seed=0 bolt, 1 thunder, 2 gale, 3 frost lock; &at= seconds into it.
    const id = ['bolt', 'thunder', 'gale', 'lock'][((seed % 4) + 4) % 4];
    winMatches(run, 2);
    run.kit.skills = [{ id: 'bolt', level: 2 }, { id: id === 'bolt' ? 'thunder' : id, level: 3 }];
    const scene = createPlayScene(run);
    scene.intro = 0;
    const m = scene.match;
    m.hammer = 'player';
    // A crowded house: two rival stones sitting, one of yours biting, a rival guard out front.
    const put = (team, x, y) => { const st = createStone(team, x, y); st.spin = x * 3; m.stones.push(st); };
    put('rival', SHEET.tee + 0.15, 0.22);
    put('rival', SHEET.tee - 0.9, -0.75);
    put('player', SHEET.tee + 0.75, 0.55);
    put('rival', SHEET.tee - 4.2, 0.35);
    put('player', SHEET.tee - 1.4, 1.0);
    m.thrown = { player: 2, rival: 3 };
    m.streak = 2;
    const at = Number(new URLSearchParams(globalThis.location?.search ?? '').get('at') ?? 0.42);
    m.phase = 'aim';
    m.energy = { player: 6, rival: 0 };
    if (useSkill(m, id === 'bolt' ? 0 : 1)) {
      let t = 0;
      while (t < at && (m.phase === 'skill' || m.phase === 'aim')) { updatePlay(scene, 1 / 60, quietInput); t += 1 / 60; }
    }
    scene.skillHover = -1;
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
    run.kit.skills = [{ id: 'bolt', level: 2 }];
    run.offer = ['granite', 'mitten'].map((id) => KIT.find((k) => k.id === id));
    run.offer.splice(1, 0, skillOffer(run.kit, { pick: (l) => l.find((o) => o.id === 'thunder') ?? l[0] }));
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
    Object.assign(run.stats, { bounties: 14, bountiesPosted: 24, glacierBroken: true });
    game.saveInfo = { best: 15890, newBest: true, lastRuns: [{ outcome: 'champion', round: 6, score: 15890 }, { outcome: 'eliminated', round: 3, score: 6120 }, { outcome: 'eliminated', round: 1, score: 2210 }] };
    game.mode = 'results';
    game.hover = 'again';
  }
}

export { nextEnd };
