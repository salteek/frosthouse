// Maps sheet metres to screen pixels, and glides along with the running stone.

import { SHEET, VIEW, CAMERA } from '../config.js';

export const REST_X = SHEET.tee - 2.3;
const HALF_VIEW = VIEW.w / 2 / CAMERA.scale;

export function createCamera() {
  return { x: REST_X, target: REST_X };
}

export function followStone(cam, stone, dt) {
  if (stone && stone.moving) cam.target = Math.max(HALF_VIEW - 1.5, Math.min(REST_X, stone.x + 3.2));
  else cam.target = REST_X;
  cam.x += (cam.target - cam.x) * (1 - Math.exp(-dt * 4));
}

export const sx = (cam, x) => (x - cam.x) * CAMERA.scale + VIEW.w / 2;
export const sy = (y) => CAMERA.sheetTop + (y + SHEET.width / 2) * CAMERA.scale;
export const px = (m) => m * CAMERA.scale;

export function toSheet(cam, screenX, screenY) {
  return {
    x: (screenX - VIEW.w / 2) / CAMERA.scale + cam.x,
    y: (screenY - CAMERA.sheetTop) / CAMERA.scale - SHEET.width / 2,
  };
}

export const SHEET_BOTTOM = CAMERA.sheetTop + SHEET.width * CAMERA.scale;
