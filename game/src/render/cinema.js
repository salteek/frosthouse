// The Glacier breaks: a short cinematic around the crack (render/crack.js), timed off scene.crack.t.
//   0.00–0.75 s  a low tremor builds as the cracks race out; letterbox bars slide in; the camera pushes in on the house
//   0.75 s       the shards burst: one heavy jolt, a slow-motion beat (play.js sets the hit-stop)
//   0.75–2.0 s   the jolt settles as a smooth, damped shake (no random jitter)
//   3.2–3.9 s    the bars slide out and the camera eases back
// Players who ask their system for reduced motion get the bars and the vignette but no shake or zoom.

import { SHEET } from '../config.js';
import { sx, sy } from './camera.js';
import { text, FONT_TITLE } from './ui.js';

const BURST = 0.75, END = 3.9;
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

// How far into the cinematic we are, 0..1 (eases in and out).
export function cinemaAmount(scene) {
  const t = scene.crack?.t;
  if (t == null || t > END) return 0;
  return Math.min(ease(t / 0.45), ease((END - t) / 0.7));
}

// Apply the push-in and the shake to the world layer (call inside the world's save/restore).
export function applyCinemaCamera(ctx, scene) {
  const t = scene.crack?.t;
  if (t == null || t > END || reduced) return;
  const k = cinemaAmount(scene);
  // Push in on the button, 12% at the peak.
  const z = 1 + 0.12 * k;
  const cx = sx(scene.cam, SHEET.tee), cy = sy(0);
  // The shake: a building tremor, then a heavy jolt that rings down. Sines, not random noise.
  let amp;
  if (t < BURST) amp = 2.5 * (t / BURST);
  else amp = 18 * Math.exp(-(t - BURST) * 3.4);
  const dx = amp * Math.sin(t * 2 * Math.PI * 9);
  const dy = amp * 0.65 * Math.sin(t * 2 * Math.PI * 7 + 1.3);
  ctx.translate(cx + dx, cy + dy);
  ctx.scale(z, z);
  ctx.translate(-cx, -cy);
}

// Over everything: a dark vignette that pulls the eye to the house, and letterbox bars with captions.
export function drawCinemaOverlay(ctx, scene) {
  const k = cinemaAmount(scene);
  if (k <= 0.001) return;
  const t = scene.crack.t;
  const cx = sx(scene.cam, SHEET.tee), cy = sy(0);
  const v = ctx.createRadialGradient(cx, cy, 160, cx, cy, 820);
  v.addColorStop(0, 'rgba(2,6,20,0)');
  v.addColorStop(1, `rgba(2,6,20,${(0.62 * k).toFixed(3)})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1280, 720);
  const bar = 70 * k;
  ctx.fillStyle = '#02040c';
  ctx.fillRect(0, 0, 1280, bar);
  ctx.fillRect(0, 720 - bar, 1280, bar);
  // Captions fade in once the bars are mostly in.
  const a = Math.max(0, Math.min(1, (k - 0.6) / 0.4));
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha = a;
    text(ctx, `THE FINAL · END ${scene.match.end}`, 640, bar - 26, { size: 13, weight: 900, align: 'center', color: '#8fa6cc' });
    const line = t < BURST ? 'THE ICE GIVES WAY…' : 'HRIMGAR IS BROKEN';
    text(ctx, line, 640, 720 - bar + 36, { size: 26, weight: 900, align: 'center', color: '#dff6ff', font: FONT_TITLE });
    if (t >= BURST) text(ctx, '+2 shatter points · your hammer next end · full energy · his powers are gone', 640, 720 - bar + 58, { size: 12, weight: 800, align: 'center', color: '#8fa6cc' });
    ctx.restore();
  }
}
