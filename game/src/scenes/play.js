// The match scene: reads the player's aim, turn, weight and release, runs the throws, and paces the
// rival's turns, the shot calls and the end scores.

import { SHEET, THROW, PALETTE } from '../config.js';
import { createMatch, currentTeam, playerThrow, rivalThrow, updateRunning, nextEnd, teamMods } from '../match.js';
import { createStone, launch, simulate, speedFromWeight } from '../physics.js';
import { currentRival, currentVenue, endsPerMatch, previewLength } from '../tournament.js';
import { createCamera, followStone, toSheet, SHEET_BOTTOM } from '../render/camera.js';
import { CAMERA } from '../config.js';
import { sfx, setIceSounds } from '../audio.js';
import { spawnBurst, addFloater, updateParticles } from '../particles.js';
import { sx, sy } from '../render/camera.js';
import { clamp } from '../geometry.js';

export function createPlayScene(run) {
  const rival = currentRival(run);
  const venue = currentVenue(run);
  const match = createMatch({ rival, venue, kit: run.kit, difficulty: run.difficulty, rng: run.rng, ends: endsPerMatch(run) });
  return {
    run,
    match,
    cam: createCamera(),
    aim: { y: 0.6, weight: 0.36, turn: 1 },
    charging: false,
    chargeT: 0,
    needle: 0,
    preview: { key: '', path: [] },
    thinkTimer: 0.9,
    settleTimer: 0,
    endTimer: 0,
    overTimer: 0,
    intro: 2.6,
    fx: { rng: run.rng, particles: [], floaters: [] },
    sweeping: false,
    shake: 0,
    done: false,
  };
}

function previewPath(scene) {
  const { match, aim } = scene;
  const key = `${aim.y.toFixed(2)}|${aim.weight.toFixed(3)}|${aim.turn}`;
  if (key === scene.preview.key) return scene.preview.path;
  const mods = teamMods(match.kit, 'player');
  const s = createStone('player', 0, 0, { turn: aim.turn, mass: mods.mass, frictionMul: mods.frictionMul, curlMul: mods.curlMul });
  launch(s, aim.y, speedFromWeight(aim.weight));
  const r = simulate([s], match.venue, { trackId: s.id, maxT: 70 });
  scene.preview = { key, path: r.path };
  return r.path;
}

export function weightName(w) {
  return THROW.weights.find((z) => w <= z.upTo).name;
}

export function updatePlay(scene, dt, input) {
  const m = scene.match;
  updateParticles(scene.fx, dt);
  scene.shake = Math.max(0, scene.shake - dt * 20);
  followStone(scene.cam, m.shot, dt);

  if (scene.intro > 0) {
    scene.intro -= dt;
    if (input.clicked || input.anyPressed('Enter', 'Space')) scene.intro = 0;
    setIceSounds(0, false);
    return;
  }

  let fastest = 0;
  for (const s of m.stones) if (s.moving) fastest = Math.max(fastest, Math.hypot(s.vx, s.vy));

  if (m.phase === 'aim') {
    const team = currentTeam(m);
    if (team === 'player') handleAim(scene, dt, input);
    else {
      scene.thinkTimer -= dt;
      if (scene.thinkTimer <= 0) {
        rivalThrow(m);
        scene.thinkTimer = 0.9;
      }
    }
  } else if (m.phase === 'running') {
    const held = input.isDown('Space') || input.mouse.down;
    scene.sweeping = updateRunning(m, dt, held);
    if (scene.sweeping && m.shot && scene.fx.particles.length < 400) {
      const s = m.shot;
      spawnBurst(scene.fx, sx(scene.cam, s.x) + 40, sy(s.y), { count: 2, color: '#ffffff', speed: 70, life: 0.4, size: 2 });
    }
  } else if (m.phase === 'settle') {
    scene.settleTimer += dt;
    if (scene.settleTimer > (m.lastCall?.team === 'player' ? 1.5 : 1.1) || input.clicked) {
      scene.settleTimer = 0;
      m.phase = 'aim';
    }
  } else if (m.phase === 'endScore') {
    scene.endTimer += dt;
    if (m.endResult) m.endResult.t = scene.endTimer;
    if (scene.endTimer > 3.4 || (scene.endTimer > 0.8 && (input.clicked || input.anyPressed('Enter', 'Space')))) {
      scene.endTimer = 0;
      nextEnd(m);
      scene.thinkTimer = 1.2;
    }
  } else if (m.phase === 'over') {
    scene.overTimer += dt;
    if (scene.overTimer > 0.6 && (input.clicked || input.anyPressed('Enter', 'Space')) || scene.overTimer > 4.5) scene.done = true;
  }
  if (m.lastCall) m.lastCall.t += dt;
  setIceSounds(fastest, scene.sweeping && m.phase === 'running');
  consumeEvents(scene);
}

function handleAim(scene, dt, input) {
  const { aim, match } = scene;
  const mouse = input.mouse;
  const overSheet = mouse.y > CAMERA.sheetTop && mouse.y < SHEET_BOTTOM;
  if (overSheet && !scene.charging) {
    const p = toSheet(scene.cam, mouse.x, mouse.y);
    aim.y = clamp(p.y, -SHEET.width / 2 + 0.3, SHEET.width / 2 - 0.3);
  }
  if (input.isDown('ArrowUp')) aim.y = clamp(aim.y - dt * 1.2, -2, 2);
  if (input.isDown('ArrowDown')) aim.y = clamp(aim.y + dt * 1.2, -2, 2);
  const step = input.isDown('ShiftLeft') ? 0.004 : 0.01;
  if (input.wasPressed('KeyW') || input.wasPressed('ArrowRight')) aim.weight = clamp(aim.weight + step, 0, 1);
  if (input.wasPressed('KeyS') || input.wasPressed('ArrowLeft')) aim.weight = clamp(aim.weight - step, 0, 1);
  if (input.isDown('KeyW') && !input.wasPressed('KeyW')) aim.weight = clamp(aim.weight + dt * 0.18, 0, 1);
  if (input.isDown('KeyS') && !input.wasPressed('KeyS')) aim.weight = clamp(aim.weight - dt * 0.18, 0, 1);
  if (input.wheel) aim.weight = clamp(aim.weight - input.wheel * 0.006, 0, 1);
  const presets = { Digit1: 0.12, Digit2: 0.36, Digit3: 0.55, Digit4: 0.74, Digit5: 0.93 };
  for (const [code, w] of Object.entries(presets)) if (input.wasPressed(code)) { aim.weight = w; sfx.tick(); }
  if (input.anyPressed('KeyQ', 'KeyE') || input.rightClicked) {
    aim.turn = input.wasPressed('KeyQ') ? -1 : input.wasPressed('KeyE') ? 1 : -aim.turn;
    sfx.toggle();
  }

  const startCharge = (input.clicked && overSheet) || input.wasPressed('Space');
  if (!scene.charging && startCharge) {
    scene.charging = true;
    scene.chargeT = 0;
  }
  if (scene.charging) {
    scene.chargeT += dt;
    const period = THROW.needlePeriod * match.kit.needle;
    // The needle starts at the far left, so a quick tap is the worst release, not the best.
    scene.needle = -Math.cos((scene.chargeT / period) * Math.PI * 2);
    const released = !input.mouse.down && !input.isDown('Space');
    if (released && scene.chargeT > 0.05) {
      scene.charging = false;
      playerThrow(match, { aimY: aim.y, weight: aim.weight, turn: aim.turn, releaseError: scene.needle });
      if (match.perfect) sfx.perfect();
    }
  }
  previewPath(scene);
}

function consumeEvents(scene) {
  const m = scene.match;
  const run = scene.run;
  for (const e of m.events) {
    if (e.type === 'hit') {
      sfx.clack(e.impulse);
      const x = sx(scene.cam, (e.a.x + e.b.x) / 2);
      const y = sy((e.a.y + e.b.y) / 2);
      spawnBurst(scene.fx, x, y, { count: 8 + Math.min(20, e.impulse * 10), color: '#ffffff', speed: 120 + e.impulse * 80, life: 0.5, size: 2.5 });
      scene.shake = Math.max(scene.shake, Math.min(8, e.impulse * 4));
    } else if (e.type === 'release') {
      sfx.release();
    } else if (e.type === 'hog') {
      sfx.buzzer();
    } else if (e.type === 'call') {
      run.score += e.points;
      if (e.call.tone === 'great') sfx.cheer(1);
      else if (e.call.tone === 'bad') sfx.groan();
      else sfx.cheer(0.3);
      if (e.points > 0) addFloater(scene.fx, 640, 238, `+${e.points}`, PALETTE.good, 26);
    } else if (e.type === 'rivalCall') {
      if (e.call.tone === 'great') sfx.groan();
    } else if (e.type === 'endScored') {
      sfx.horn();
      if (e.result.team === 'player') sfx.cheer(1.4);
    } else if (e.type === 'points') {
      run.score += e.points;
    }
  }
  m.events.length = 0;
}
