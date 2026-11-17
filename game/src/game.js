// The game's state machine: title → match → clubhouse → match … → results, plus pause and mute.

import { createRun, recordMatch, takeKit, DIFFICULTIES } from './tournament.js';
import { createPlayScene, updatePlay } from './scenes/play.js';
import { drawMatch } from './render/matchView.js';
import { drawTitle, drawClubhouse, drawResults, drawPause, hovered } from './render/screens.js';
import { loadSave, recordRun } from './save.js';
import { unlockAudio, toggleMute, sfx, setIceSounds } from './audio.js';

export function createGame() {
  return {
    mode: 'title',
    difficulty: 'club',
    run: null,
    play: null,
    hits: [],
    hover: null,
    paused: false,
    save: loadSave(),
    saveInfo: null,
    time: 0,
  };
}

export function startRun(game, seed = (Date.now() % 100000) | 0) {
  game.run = createRun(game.difficulty, seed);
  // Dev/test shortcut: ?round=1..6 starts the run at that rival (and lake) instead of the first.
  const round = Number(new URLSearchParams(globalThis.location?.search ?? '').get('round'));
  if (round >= 1 && round <= 6) game.run.round = round - 1;
  game.play = createPlayScene(game.run);
  game.mode = 'play';
  game.paused = false;
}

function finishMatch(game) {
  const run = game.run;
  const won = recordMatch(run, game.play.match);
  game.play = null;
  if (run.outcome) {
    game.saveInfo = recordRun(run);
    game.save = loadSave();
    game.mode = 'results';
    if (run.outcome === 'champion') sfx.fanfare();
    else sfx.sad();
  } else {
    game.mode = 'clubhouse';
    if (won) sfx.cheer(0.8);
  }
}

export function updateGame(game, dt, input) {
  game.time += dt;
  if (input.clicked || input.held.size) unlockAudio();
  if (input.wasPressed('KeyM')) toggleMute();
  const prevHover = game.hover;
  game.hover = hovered(game.hits, input.mouse);
  if (game.hover && game.hover !== prevHover) sfx.hover();
  const click = input.clicked ? game.hover : null;

  if (game.mode === 'title') {
    DIFFICULTIES.forEach((d, i) => {
      if (input.wasPressed(`Digit${i + 1}`) || click === `diff:${d.id}`) {
        game.difficulty = d.id;
        sfx.click();
      }
    });
    if (click === 'play' || input.wasPressed('Enter')) {
      sfx.click();
      startRun(game);
    }
  } else if (game.mode === 'play') {
    if (input.wasPressed('Escape') || input.wasPressed('KeyP')) game.paused = !game.paused;
    if (game.paused) {
      setIceSounds(0, false);
      if (click === 'resume') game.paused = false;
      if (click === 'quit') {
        game.paused = false;
        game.mode = 'title';
        game.play = null;
      }
      return;
    }
    updatePlay(game.play, dt, input);
    if (game.play.done) finishMatch(game);
  } else if (game.mode === 'clubhouse') {
    const run = game.run;
    if (run.offer) {
      run.offer.forEach((k, i) => {
        if (click === `kit:${i}` || input.wasPressed(`Digit${i + 1}`)) {
          takeKit(run, k);
          sfx.perfect();
        }
      });
    } else if (click === 'continue' || input.wasPressed('Enter') || input.wasPressed('Space')) {
      sfx.click();
      game.play = createPlayScene(run);
      game.mode = 'play';
    }
    if (input.wasPressed('Escape')) game.mode = 'title';
  } else if (game.mode === 'results') {
    if (click === 'again' || input.wasPressed('KeyR') || input.wasPressed('Enter')) {
      sfx.click();
      startRun(game);
    } else if (click === 'title' || input.wasPressed('Escape')) {
      game.mode = 'title';
    }
  }
}

export function drawGame(ctx, game) {
  const t = game.time;
  if (game.mode === 'title') game.hits = drawTitle(ctx, game, t, game.save);
  else if (game.mode === 'play') {
    drawMatch(ctx, game.play, t, game.save.best);
    game.hits = game.paused ? drawPause(ctx, game) : [];
  } else if (game.mode === 'clubhouse') game.hits = drawClubhouse(ctx, game, t, game.run);
  else if (game.mode === 'results') game.hits = drawResults(ctx, game, t, game.run, game.saveInfo);
}
