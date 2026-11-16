// Small vector and angle helpers shared by the beam, the keeper and the shades.

export const TAU = Math.PI * 2;

export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function wrapAngle(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

export function angleDiff(a, b) {
  return wrapAngle(b - a);
}

export function turnToward(current, target, maxStep) {
  const d = angleDiff(current, target);
  if (Math.abs(d) <= maxStep) return target;
  return wrapAngle(current + Math.sign(d) * maxStep);
}

// Is (px,py) inside the cone that starts at (ox,oy), points along `angle`, opens `half` each way and reaches `range`?
export function inCone(ox, oy, angle, half, range, px, py, pad = 0) {
  const dx = px - ox;
  const dy = py - oy;
  const d = Math.hypot(dx, dy);
  if (d > range + pad) return false;
  if (d < pad) return true;
  const slack = Math.asin(Math.min(1, pad / Math.max(d, 1)));
  return Math.abs(angleDiff(angle, Math.atan2(dy, dx))) <= half + slack;
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}
