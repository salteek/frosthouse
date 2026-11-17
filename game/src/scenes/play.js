// The match scene: reads the player's aim, turn, weight and release, runs the throws, and paces the
// rival's turns, the shot calls and the end scores.

import { SHEET, THROW, PALETTE } from '../config.js';
import { createMatch, currentTeam, playerThrow, rivalThrow, updateRunning, updateSkill, nextEnd, teamMods } from '../match.js';
import { useSkill, rivalTrySkill, SKILL_KEYS, SKILL_BUTTONS } from '../skills.js';
import { createStone, launch, simulate, speedFromWeight } from '../physics.js';
import { currentRival, currentVenue, endsPerMatch, previewLength } from '../tournament.js';
import { createCamera, followStone, toSheet, SHEET_BOTTOM } from '../render/camera.js';
import { CAMERA } from '../config.js';
import { sfx, setIceSounds } from '../audio.js';
import { spawnBurst, addFloater, updateParticles } from '../particles.js';
import { impact, celebrate, sparkle, sweepSpray, updateFx, recordTrails, emitSnowSmoke, addFlash, burstSprites } from '../fx.js';
import { sx, sy } from '../render/camera.js';
import { updateBoss, BOSS_PHASES } from '../boss.js';
import { startCrack, updateCrack, crackBurstDue, crackTips } from '../render/crack.js';
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
    fx: { rng: run.rng, particles: [], floaters: [], flashes: [] },
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

const AIM_LIMIT = SHEET.width / 2 + 0.25;

export function weightName(w) {
  return THROW.weights.find((z) => w <= z.upTo).name;
}

export function updatePlay(scene, dt, input) {
  const m = scene.match;
  // Hit-stop: a big hit freezes the world for a beat (everything but the effects runs at a crawl).
  // The last stone of an end slows to a crawl as it reaches the house, so every one is a moment.
  const lastStone = m.phase === 'running' && m.shot && m.thrown.player + m.thrown.rival === m.stonesPerTeam * 2 - 1 && m.shot.x > SHEET.tee - 4.5;
  scene.slowmo = Math.max(0, Math.min(1, (scene.slowmo ?? 0) + (lastStone ? dt * 3 : -dt * 4)));
  dt *= 1 - 0.55 * scene.slowmo;
  updateFx(scene.fx, dt);
  if (scene.fx.hitstop > 0) { scene.fx.hitstop -= dt; dt *= 0.12; }
  updateParticles(scene.fx, dt);
  recordTrails(scene, dt);
  emitSnowSmoke(scene, dt);
  if (scene.skillBanner) scene.skillBanner.t += dt;
  updateBoss(scene.match, dt);
  updateCrack(scene, dt);
  if (crackBurstDue(scene)) {
    // Shards burst off the button and off the end of every main crack.
    const cx = sx(scene.cam, SHEET.tee), cy = sy(0);
    burstSprites(scene.fx, 'snowflake', cx, cy, { count: 22, speed: [140, 380], size: [12, 24], life: [0.6, 1.1], spin: 3 });
    spawnBurst(scene.fx, cx, cy, { count: 40, color: '#dff6ff', speed: 340, life: 0.9, size: 3.5, drag: 2 });
    addFlash(scene.fx, 'ring_a', cx, cy, 60, 0.7, { grow: 3, blend: 'lighter' });
    for (const p of crackTips(scene)) spawnBurst(scene.fx, p.x, p.y, { count: 10, color: '#9fe6ff', speed: 180, life: 0.6, size: 3, drag: 2 });
  }
  // Boss banners wait while the end's score is up, and are dropped if the match is over.
  const fls = scene.fx.floaters;
  for (let i = fls.length - 1; i >= 0; i--) {
    const f = fls[i];
    if (!f.waitEnd) continue;
    if (scene.match.phase === 'over') fls.splice(i, 1);
    else if (scene.match.phase === 'endScore') f.delay = Math.max(f.delay, 0.35);
  }
  for (const f of fls) if (f.onShow && !(f.delay > 0)) { f.onShow(); f.onShow = null; }
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

  // The crack cinematic: the camera stays on the house and nobody throws until it has played out
  // (it waits while the end's score is up, like the banner it goes with).
  if (scene.cinematic > 0 && m.phase !== 'endScore') scene.cinematic -= dt;
  const holding = scene.cinematic > 0 && m.phase !== 'endScore' && m.phase !== 'over';
  if (m.phase === 'aim' && holding) {
    scene.thinkTimer = Math.max(scene.thinkTimer, 0.6);
  } else if (m.phase === 'aim') {
    const team = currentTeam(m);
    if (team === 'player') handleAim(scene, dt, input);
    else {
      scene.thinkTimer -= dt;
      if (scene.thinkTimer <= 0) {
        // The rival may fire its power first; it throws once the strike has played out.
        if (rivalTrySkill(m)) scene.thinkTimer = 0.8;
        else {
          rivalThrow(m);
          scene.thinkTimer = 0.9;
        }
      }
    }
  } else if (m.phase === 'running') {
    const held = input.isDown('Space') || input.mouse.down;
    scene.sweeping = updateRunning(m, dt, held);
    if (scene.sweeping && m.shot && scene.fx.particles.length < 400) {
      const s = m.shot;
      sweepSpray(scene.fx, sx(scene.cam, s.x) + 66, sy(s.y) - 20);
      sweepSpray(scene.fx, sx(scene.cam, s.x) + 70, sy(s.y) + 80);
    }
  } else if (m.phase === 'skill') {
    updateSkill(m, dt);
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
  // Skills: F / G, or a click on their buttons. A click there never starts a throw.
  scene.skillHover = -1;
  if (!scene.charging) {
    for (let i = 0; i < SKILL_BUTTONS.length; i++) {
      const b = SKILL_BUTTONS[i];
      const over = Math.hypot(mouse.x - b.x, mouse.y - b.y) <= b.r + 4;
      if (over) scene.skillHover = i;
      if (input.wasPressed(SKILL_KEYS[i]) || (over && input.clicked)) {
        if (useSkill(match, i)) return;
        if (over) { sfx.buzzer(); return; }
      }
    }
  }
  // The broom may be held right out to the boards; on curly ice the best line starts there.
  const overSheet = mouse.y > CAMERA.sheetTop - 30 && mouse.y < SHEET_BOTTOM + 30;
  if (overSheet && !scene.charging) {
    const p = toSheet(scene.cam, mouse.x, mouse.y);
    aim.y = clamp(p.y, -AIM_LIMIT, AIM_LIMIT);
  }
  if (input.isDown('ArrowUp')) aim.y = clamp(aim.y - dt * 1.2, -AIM_LIMIT, AIM_LIMIT);
  if (input.isDown('ArrowDown')) aim.y = clamp(aim.y + dt * 1.2, -AIM_LIMIT, AIM_LIMIT);
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

  const startCharge = input.clicked || input.wasPressed('Space');
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

// Mark the last `n` floaters as boss banners that wait for the end-score popup to close.
function holdForEnd(scene, n) {
  const fl = scene.fx.floaters;
  for (let i = Math.max(0, fl.length - n); i < fl.length; i++) fl[i].waitEnd = true;
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
      impact(scene.fx, x, y, e.impulse);
    } else if (e.type === 'skill') {
      sfx[e.id]?.();
      scene.skillBanner = { id: e.id, t: 0, team: e.team };
    } else if (e.type === 'skillHit') {
      for (const s of e.targets) {
        const x = sx(scene.cam, s.x), y = sy(s.y);
        if (e.id === 'lock') {
          addFlash(scene.fx, 'ring_b', x, y, 30, 0.7, { grow: 2.4, blend: 'lighter' });
          burstSprites(scene.fx, 'snowflake', x, y, { count: 12, speed: [80, 220], size: [12, 22], life: [0.5, 0.9], spin: 3 });
        } else if (e.id === 'gale') {
          addFlash(scene.fx, 'ring_a', x, y, 34, 0.5, { grow: 2.4, blend: 'lighter' });
          burstSprites(scene.fx, 'snowflake', x, y, { count: 8, angle: 0, spread: 0.9, speed: [160, 360], size: [12, 22], life: [0.5, 0.9], spin: 4, blend: 'source-over' });
        } else {
          impact(scene.fx, x, y, 1.2);
          if (e.id === 'thunder') burstSprites(scene.fx, 'spark_star', x, y, { count: 10, speed: [200, 480], size: [14, 24], life: [0.25, 0.5], spin: 0, grow: -0.5 });
        }
      }
      scene.shake = Math.max(scene.shake, e.id === 'thunder' ? 12 : e.id === 'lock' ? 3 : 7);
    } else if (e.type === 'out' && e.bySkill && e.stone.team === 'player') {
      sfx.groan();
    } else if (e.type === 'out' && e.bySkill && e.stone.team === 'rival') {
      const x = clamp(sx(scene.cam, Math.min(e.stone.x, SHEET.back)), 120, 1160);
      addFloater(scene.fx, x, clamp(sy(e.stone.y) - 50, 170, 560), 'BLASTED OUT!', PALETTE.gold, 30);
      run.score += Math.round(150 * run.kit.scoreMul);
      sfx.cheer(0.6);
    } else if (e.type === 'energy') {
      if (e.gain > 0) addFloater(scene.fx, 250, 456, `+${e.gain} ENERGY`, '#6fd3ff', 18);
    } else if (e.type === 'spike') {
      sfx.clack(e.impulse);
      const x = sx(scene.cam, e.spike.x), y = sy(e.spike.y);
      impact(scene.fx, x, y, Math.min(1.2, e.impulse));
      burstSprites(scene.fx, 'snowflake', x, y, { count: 8, speed: [80, 220], size: [10, 18], life: [0.4, 0.7], spin: 3 });
      scene.shake = Math.max(scene.shake, Math.min(5, e.impulse * 3));
    } else if (e.type === 'bossObstacles') {
      addFloater(scene.fx, 640, 376, `THE GLACIER RAISES ${e.names.join(' + ')}`, '#b8f0ff', 26, 2.2, 1.1);
    } else if (e.type === 'bossPhase') {
      const ph = BOSS_PHASES[e.phase - 1];
      // Mid-end it waits for the shot call to clear; at the start of an end it comes straight in.
      const wait = m.thrown.player + m.thrown.rival === 0 && m.phase === 'aim' ? 0.3 : 1.5;
      addFloater(scene.fx, 640, 250, `PHASE ${e.phase}: ${ph.name}`, '#b8f0ff', 40, 2.4, wait);
      scene.fx.floaters[scene.fx.floaters.length - 1].onShow = () => sfx.thunder();
      addFloater(scene.fx, 640, 296, ph.note, '#eaf4ff', 20, 2.4, wait);
      holdForEnd(scene, 2);
    } else if (e.type === 'bossCracked') {
      sfx.cheer(1.4);
      scene.cinematic = 3.8; // nobody throws until the crack has played out (render/crack.js)
      addFloater(scene.fx, 640, 250, 'THE GLACIER CRACKS!', PALETTE.gold, 44, 2.4, 1.5);
      scene.fx.floaters[scene.fx.floaters.length - 1].onShow = () => { startCrack(scene); sfx.crack(); };
      addFloater(scene.fx, 640, 296, 'Her powers are gone', '#eaf4ff', 20, 2.4, 1.5);
      holdForEnd(scene, 2);
    } else if (e.type === 'combo') {
      const el = e.el;
      const x = sx(scene.cam, e.x ?? SHEET.tee), y = sy(e.y ?? 0);
      const mine = e.team === 'player';
      const pts = mine ? { fire: 100, lightning: 150, hail: 200 }[el] : 0;
      run.score += Math.round(pts * run.kit.scoreMul);
      const tag = (txt) => (mine ? `${txt}! +${pts}` : `${m.rival.short}: ${txt}!`);
      if (el === 'fire') {
        sfx.fire();
        addFlash(scene.fx, 'fx_fireburst', x, y, 170, 0.6, { spin: 1.2, grow: 0.9, blend: 'lighter' });
        spawnBurst(scene.fx, x, y, { count: 40, color: '#ff8a3d', speed: 420, life: 0.8, size: 4.5, drag: 2 });
        spawnBurst(scene.fx, x, y, { count: 24, color: '#ffd23f', speed: 300, life: 0.6, size: 3, drag: 2 });
        addFloater(scene.fx, clamp(x, 140, 1140), clamp(y - 70, 170, 540), tag('FIRE COMBO'), '#ff8a3d', 32);
      } else if (el === 'lightning') {
        sfx.thunder();
        (scene.fx.arcs ??= []).push({ x0: e.x, y0: e.y, x1: e.tx, y1: e.ty, life: 0.5, max: 0.5 });
        burstSprites(scene.fx, 'spark_star', sx(scene.cam, e.tx), sy(e.ty), { count: 10, speed: [200, 460], size: [14, 24], life: [0.25, 0.5], spin: 0, grow: -0.5 });
        scene.fx.flash = Math.max(scene.fx.flash ?? 0, 0.3);
        addFloater(scene.fx, clamp(x, 140, 1140), clamp(y - 110, 170, 540), tag('CHAIN LIGHTNING'), '#ffe05a', 32);
      } else {
        sfx.hail();
        for (const st of e.stones) {
          const hx = sx(scene.cam, st.x), hy = sy(st.y);
          for (let i = 0; i < 6; i++) burstSprites(scene.fx, i % 3 ? 'fx_hailstone' : 'snowflake', hx + scene.fx.rng.range(-40, 40), hy - scene.fx.rng.range(260, 380), { count: 1, angle: Math.PI / 2, spread: 0.15, speed: [900, 1100], size: [16, 26], life: [0.3, 0.38], spin: 4, drag: 0, blend: 'lighter' });
          addFlash(scene.fx, 'ring_a', hx, hy, 30, 0.5, { grow: 2, blend: 'lighter', delay: 0.3 });
        }
        addFloater(scene.fx, 640, 230, tag('HAILSTORM'), '#9fe6ff', 38);
      }
      scene.shake = Math.max(scene.shake, el === 'fire' ? 9 : 12);
    } else if (e.type === 'release') {
      sfx.release();
    } else if (e.type === 'hog') {
      sfx.buzzer();
    } else if (e.type === 'call') {
      run.score += e.points;
      if (e.call.tone === 'great') sfx.cheer(1);
      else if (e.call.tone === 'bad') sfx.groan();
      else sfx.cheer(0.3);
      if (e.points > 0) {
        const fx = e.x > -9 ? clamp(sx(scene.cam, e.x), 120, 1160) : 640;
        const fy = e.y > -9 ? clamp(sy(e.y) - 72, 170, 560) : 300;
        addFloater(scene.fx, fx, fy, e.mult > 1 ? `+${e.points}  x${e.mult}` : `+${e.points}`, e.mult > 1 ? PALETTE.gold : PALETTE.good, e.mult > 1 ? 34 : 26);
        if (e.call.tone === 'great') {
          // Confetti from the stands for a great shot: gold, red and blue flakes over the stone.
          for (const color of [PALETTE.gold, PALETTE.player, PALETTE.accent]) {
            spawnBurst(scene.fx, fx, fy + 72, { count: 18, color, speed: 280, life: 1.3, size: 5, drag: 1.6 });
          }
          celebrate(scene.fx, fx, fy + 72);
        } else if (e.call.tone === 'good') sparkle(scene.fx, fx, fy + 72);
      }
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
