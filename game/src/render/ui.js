// Interface primitives in Frosthouse's look: dark frosted-glass panels with a cold rim light, glossy
// candy buttons and pills, frosted keycaps, and hot shot-call lettering that burns on the ice.

import { PALETTE } from '../config.js';

export const FONT_TITLE = '"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", "Avenir Next", sans-serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Lighten (k > 0) or darken (k < 0) a #rrggbb colour.
export function shade(hex, k) {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// A frosted-glass panel. opts.glow tints the rim and casts it outward (selected cards, gold scores).
export function panel(ctx, x, y, w, h, opts = {}) {
  const r = opts.radius ?? 14;
  ctx.save();
  if (opts.shadow !== false) {
    ctx.shadowColor = opts.glow ?? 'rgba(4,10,24,0.55)';
    ctx.shadowBlur = opts.glow ? 22 : 18;
    ctx.shadowOffsetY = opts.glow ? 0 : 6;
  }
  roundRect(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, opts.fillTop ?? PALETTE.glassTop);
  g.addColorStop(1, opts.fill ?? PALETTE.glass);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  // A cold sheen across the top third, like light on ice.
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const sheen = ctx.createLinearGradient(x, y, x + w * 0.5, y + h * 0.6);
  sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.02)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.strokeStyle = opts.stroke ?? opts.glow ?? PALETTE.glassEdge;
  ctx.lineWidth = opts.lineWidth ?? (opts.glow ? 3 : 1.5);
  ctx.stroke();
}

// Text. On the glass, "ink" means the light type: callers keep naming PALETTE.ink and get the right one.
export function text(ctx, str, x, y, opts = {}) {
  let color = opts.color ?? PALETTE.text;
  if (!opts.raw) {
    if (color === PALETTE.ink) color = PALETTE.text;
    else if (color === PALETTE.inkSoft) color = PALETTE.textSoft;
  }
  ctx.font = `${opts.italic ? 'italic ' : ''}${opts.weight ?? 700} ${opts.size ?? 16}px ${opts.font ?? FONT_UI}`;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = opts.baseline ?? 'alphabetic';
  if (opts.outline) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = opts.outlineWidth ?? 6;
    ctx.strokeStyle = opts.outline;
    ctx.strokeText(str, x, y);
  }
  if (opts.shadow) {
    ctx.fillStyle = opts.shadow;
    ctx.fillText(str, x + 2, y + 3);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}

// A glossy candy pill: lit from above, a darker lip below, a white catch-light.
export function chip(ctx, label, x, y, opts = {}) {
  ctx.font = `800 ${opts.size ?? 13}px ${FONT_UI}`;
  const w = ctx.measureText(label).width + (opts.pad ?? 18);
  const h = opts.h ?? 24;
  const left = opts.align === 'right' ? x - w : opts.align === 'center' ? x - w / 2 : x;
  const top = y - h / 2;
  const base = opts.fill ?? PALETTE.accent;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  roundRect(ctx, left, top, w, h, h / 2);
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, shade(base, 0.28));
  g.addColorStop(0.55, base);
  g.addColorStop(1, shade(base, -0.25));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, left + 3, top + 2, w - 6, h * 0.42, h * 0.2);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fill();
  ctx.fillStyle = opts.color ?? '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, left + w / 2, y + 1);
  ctx.textBaseline = 'alphabetic';
  return w;
}

export function bar(ctx, x, y, w, h, frac, color, opts = {}) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = opts.track ?? 'rgba(8,16,34,0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,205,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    roundRect(ctx, x, y, Math.max(h, w * f), h, h / 2);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, shade(color, 0.3));
    g.addColorStop(1, shade(color, -0.15));
    ctx.fillStyle = g;
    ctx.fill();
  }
}

// A frosted keycap, light on the dark glass so the controls read at a glance.
export function keycap(ctx, label, x, y, opts = {}) {
  ctx.font = `800 ${opts.size ?? 12}px ${FONT_UI}`;
  const w = Math.max(24, ctx.measureText(label).width + 14);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 2;
  roundRect(ctx, x, y - 16, w, 22, 6);
  const g = ctx.createLinearGradient(0, y - 16, 0, y + 6);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, opts.fill ?? '#c9d9ec');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#1d2a3a';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y);
  return w;
}

// A row of "KEY action" hints; returns the x where it ended.
export function hints(ctx, list, x, y, opts = {}) {
  let cx = x;
  for (const [key, label] of list) {
    cx += keycap(ctx, key, cx, y) + 6;
    cx += text(ctx, label, cx, y, { size: opts.size ?? 12, weight: 700, color: opts.color ?? PALETTE.textSoft }) + 16;
  }
  return cx;
}

// A glossy 3-D button: a darker lip underneath, a lit face, a catch-light, a glow when hovered or chosen.
export function button(ctx, label, x, y, w, h, opts = {}) {
  const base = opts.fill ?? PALETTE.player;
  const lift = opts.hover ? 2 : 0;
  const r = opts.radius ?? 16;
  ctx.save();
  ctx.shadowColor = opts.hover || opts.glow ? shade(base, 0.2) : 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = opts.hover || opts.glow ? 22 : 10;
  ctx.shadowOffsetY = opts.hover || opts.glow ? 0 : 5;
  roundRect(ctx, x, y + 5 - lift, w, h, r);
  ctx.fillStyle = shade(base, -0.45);
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y - lift, w, h, r);
  const g = ctx.createLinearGradient(0, y - lift, 0, y + h - lift);
  g.addColorStop(0, shade(base, 0.32));
  g.addColorStop(0.5, base);
  g.addColorStop(1, shade(base, -0.22));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = opts.stroke ?? (opts.glow ? PALETTE.gold : 'rgba(255,255,255,0.35)');
  ctx.lineWidth = opts.glow ? 3 : 1.5;
  ctx.stroke();
  roundRect(ctx, x + 6, y + 4 - lift, w - 12, h * 0.38, r * 0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.26)';
  ctx.fill();
  text(ctx, label, x + w / 2, y + h / 2 + (opts.size ?? 24) * 0.36 - lift, {
    size: opts.size ?? 24, weight: 900, align: 'center', color: opts.color ?? '#ffffff', font: FONT_TITLE, raw: true,
    shadow: opts.color ? null : 'rgba(0,0,0,0.25)',
  });
}

// Hot lettering for shot calls and big moments: italic, a gold-to-flame fill, a deep maroon outline
// and a soft outer glow. `tone` picks the flame: fire (default), violet, ice or gold.
const FLAMES = {
  fire: ['#fff3a6', '#ffc23a', '#ff6a1f', '#7a1410', 'rgba(255,120,40,0.7)'],
  violet: ['#ffe9ff', '#e6a6ff', '#a24dff', '#3a0f6e', 'rgba(190,110,255,0.7)'],
  ice: ['#ffffff', '#bdf0ff', '#3fb4ff', '#0c2f66', 'rgba(90,190,255,0.75)'],
  gold: ['#fffbe0', '#ffe27a', '#f2a51a', '#5c3608', 'rgba(255,200,60,0.7)'],
};
export function callout(ctx, str, x, y, size, opts = {}) {
  const [c0, c1, c2, edge, glow] = FLAMES[opts.tone ?? 'fire'];
  ctx.save();
  ctx.font = `italic 900 ${size}px ${FONT_TITLE}`;
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.shadowColor = glow;
  ctx.shadowBlur = size * 0.45;
  ctx.lineWidth = size * 0.26;
  ctx.strokeStyle = edge;
  ctx.strokeText(str, x, y);
  ctx.shadowBlur = 0;
  ctx.lineWidth = size * 0.12;
  ctx.strokeStyle = shade(c2, -0.35);
  ctx.strokeText(str, x, y);
  const g = ctx.createLinearGradient(0, y - size * 0.85, 0, y + size * 0.1);
  g.addColorStop(0, c0);
  g.addColorStop(0.45, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillText(str, x, y);
  ctx.restore();
  if (opts.sparkle !== false) {
    const w = ctx.measureText(str).width;
    const left = (opts.align ?? 'center') === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x;
    twinkle(ctx, left - size * 0.15, y - size * 0.75, size * 0.16);
    twinkle(ctx, left + w + size * 0.12, y - size * 0.2, size * 0.12);
  }
}

export function twinkle(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255,255,220,0.9)';
  ctx.shadowBlur = r * 2;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2);
  ctx.quadraticCurveTo(x, y, x + r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y + r * 2);
  ctx.quadraticCurveTo(x, y, x - r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y - r * 2);
  ctx.fill();
  ctx.restore();
}

// The night over the frozen lakes: deep blue, a ribbon of aurora and a few stars, for the menus.
export function nightSky(ctx, w, h, time) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#071026');
  g.addColorStop(0.55, '#10264a');
  g.addColorStop(1, '#1d4a78');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const sx = (i * 173.3) % w;
    const sy = (i * 97.7) % (h * 0.55);
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.3 + i);
    ctx.fillStyle = '#dff1ff';
    ctx.fillRect(sx, sy, 1.6, 1.6);
  }
  ctx.globalAlpha = 1;
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 20) {
      const yy = 120 + k * 50 + Math.sin(x * 0.006 + time * 0.25 + k) * 40 + Math.sin(x * 0.013 - time * 0.4) * 16;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.lineTo(w, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    const a = ctx.createLinearGradient(0, 0, 0, 220);
    a.addColorStop(0, 'rgba(60,255,190,0)');
    a.addColorStop(0.7, k ? 'rgba(150,110,255,0.14)' : 'rgba(60,255,190,0.16)');
    a.addColorStop(1, 'rgba(60,255,190,0)');
    ctx.fillStyle = a;
    ctx.fill();
  }
  // Far mountains and the frozen lake's edge.
  ctx.fillStyle = 'rgba(8,20,44,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h * 0.62 - Math.abs(Math.sin(x * 0.011) * 70) - Math.sin(x * 0.031) * 18);
  ctx.lineTo(w, h);
  ctx.fill();
  const ice = ctx.createLinearGradient(0, h * 0.7, 0, h);
  ice.addColorStop(0, 'rgba(120,190,255,0.25)');
  ice.addColorStop(1, 'rgba(200,235,255,0.45)');
  ctx.fillStyle = ice;
  ctx.fillRect(0, h * 0.74, w, h * 0.26);
}

export const inside = (mx, my, x, y, w, h) => mx >= x && mx <= x + w && my >= y && my <= y + h;

export function formatScore(n) {
  return Math.round(n).toLocaleString('en-US');
}
