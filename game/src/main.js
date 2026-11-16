// Boot: size the canvas, wire input, and run the fixed-step loop. `?shot=` stages a screenshot instead.

import { VIEW } from './config.js';
import { createInput } from './input.js';
import { createGame, updateGame, drawGame } from './game.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fit() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
  canvas.style.width = `${Math.floor(VIEW.w * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.h * scale)}px`;
  canvas.width = Math.floor(VIEW.w * scale * dpr);
  canvas.height = Math.floor(VIEW.h * scale * dpr);
  ctx.setTransform(canvas.width / VIEW.w, 0, 0, canvas.height / VIEW.h, 0, 0);
}
fit();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const game = createGame();

if (shot) {
  canvas.style.borderRadius = '0';
  canvas.style.boxShadow = 'none';
  stageShot(game, shot, Number(params.get('seed') ?? 1));
  drawGame(ctx, game);
  document.body.dataset.ready = '1';
  // Resizing clears the canvas, so a staged frame is drawn again at the new size.
  window.addEventListener('resize', () => {
    fit();
    drawGame(ctx, game);
  });
} else {
  window.addEventListener('resize', fit);
  const input = createInput(canvas);
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updateGame(game, dt, input);
    drawGame(ctx, game);
    input.endFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
