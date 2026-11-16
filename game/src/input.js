// Keyboard and mouse, translated into the game's 1280x720 logical space.

import { VIEW } from './config.js';

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const state = {
    mouse: { x: VIEW.w / 2, y: VIEW.h / 4, down: false, right: false },
    clicked: false,
    rightClicked: false,
    wheel: 0,
    held,
    isDown: (code) => held.has(code),
    wasPressed: (code) => pressed.has(code),
    anyPressed: (...codes) => codes.some((c) => pressed.has(c)),
    endFrame() {
      pressed.clear();
      state.clicked = false;
      state.rightClicked = false;
      state.wheel = 0;
    },
  };

  const toLogical = (ev) => {
    const r = canvas.getBoundingClientRect();
    state.mouse.x = ((ev.clientX - r.left) / r.width) * VIEW.w;
    state.mouse.y = ((ev.clientY - r.top) / r.height) * VIEW.h;
  };

  const blocked = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  window.addEventListener('keydown', (ev) => {
    if (blocked.has(ev.code)) ev.preventDefault();
    if (!held.has(ev.code)) pressed.add(ev.code);
    held.add(ev.code);
  });
  window.addEventListener('keyup', (ev) => held.delete(ev.code));
  window.addEventListener('blur', () => {
    held.clear();
    state.mouse.down = false;
    state.mouse.right = false;
  });

  canvas.addEventListener('mousemove', toLogical);
  canvas.addEventListener('mousedown', (ev) => {
    toLogical(ev);
    if (ev.button === 0) {
      state.mouse.down = true;
      state.clicked = true;
    } else if (ev.button === 2) {
      state.mouse.right = true;
      state.rightClicked = true;
    }
  });
  window.addEventListener('mouseup', (ev) => {
    if (ev.button === 0) state.mouse.down = false;
    if (ev.button === 2) state.mouse.right = false;
  });
  canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    state.wheel += Math.sign(ev.deltaY) * Math.min(4, Math.abs(ev.deltaY) / 25 + 1);
  }, { passive: false });

  return state;
}
