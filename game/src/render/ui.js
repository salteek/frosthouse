// Interface primitives in Frosthouse's "Rink Board" look, taken from a curling club rather than a
// phone game: chamfered board panels with an inner ice line and rime at the corners, headings marked
// by a hog-line tick and the house rings, solid granite buttons with a cut edge, notched end-card
// tags, and one condensed sports face for every label and number.

import { PALETTE } from '../config.js';

// Condensed caps for headings, labels and numbers; a plain grotesk for sentences.
export const FONT_DISPLAY = '"DIN Condensed", "Barlow Condensed", "Roboto Condensed", "Arial Narrow", sans-serif';
export const FONT_UI = '"DIN Alternate", "Barlow", Roboto, system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_TITLE = FONT_DISPLAY;

const RIME = 'rgba(232,246,255,0.8)';
const RULE = 'rgba(159,212,255,0.55)';
const BRASS = '#f2b544';

// A condensed face reads small at the same pixel size, so caps get set larger than asked.
const DISPLAY_SCALE = (size) => (size <= 26 ? 1.3 : 1.14);
const isCaps = (str) => !/[a-z]/.test(str);

// The font a label is drawn in: all-caps strings (and anything asking for FONT_TITLE) use the
// condensed display face, scaled up; sentences use the UI face. Returns the px size used.
export function setFont(ctx, str, size, weight = 700, font, italic = false) {
  const display = font === FONT_DISPLAY || (!font && isCaps(String(str)));
  const px = display ? Math.round(size * DISPLAY_SCALE(size) * 2) / 2 : size;
  const w = display ? 700 : Math.min(weight, 800);
  ctx.font = `${italic ? 'italic ' : ''}${w} ${px}px ${display ? FONT_DISPLAY : font ?? FONT_UI}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = display ? `${(px * 0.045).toFixed(1)}px` : '0px';
  return px;
}

// The board shape: a rectangle with its corners cut at 45°. A square asked for full rounding stays a disc.
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (Math.abs(w - h) < 0.5 && r >= w / 2 - 0.5) {
    ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    return;
  }
  const k = Math.max(0, Math.min(r * 0.72, w / 2, h / 2));
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.lineTo(x + w, y + k);
  ctx.lineTo(x + w, y + h - k);
  ctx.lineTo(x + w - k, y + h);
  ctx.lineTo(x + k, y + h);
  ctx.lineTo(x, y + h - k);
  ctx.lineTo(x, y + k);
  ctx.closePath();
}

// Lighten (k > 0) or darken (k < 0) a #rrggbb colour.
export function shade(hex, k) {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// The house rings as a small glyph: blue, white, red.
export function houseGlyph(ctx, cx, cy, r) {
  for (const [k, c] of [[1, PALETTE.ringOuter], [0.64, '#eef7ff'], [0.34, PALETTE.ringInner]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  }
}

// Frost hanging off a top corner: three short slanted ticks.
function rime(ctx, x, y, dir) {
  ctx.strokeStyle = RIME;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const L = 5 + i * 3;
    ctx.moveTo(x + dir * i * 5, y);
    ctx.lineTo(x + dir * (i * 5 + L * 0.4), y + L);
  }
  ctx.stroke();
}

// A rink-board panel. opts.glow tints the rim (selected cards, the boss); opts.title adds a heading
// with the hog-line tick, the house glyph and a rule under it.
export function panel(ctx, x, y, w, h, opts = {}) {
  const r = opts.radius ?? 14;
  ctx.save();
  if (opts.shadow !== false) {
    ctx.shadowColor = opts.glow ? shade(opts.glow, -0.1) : 'rgba(2,6,18,0.55)';
    ctx.shadowBlur = opts.glow ? 14 : 12;
    ctx.shadowOffsetY = opts.glow ? 0 : 5;
  }
  roundRect(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, opts.fillTop ?? PALETTE.glassTop);
  g.addColorStop(1, opts.fill ?? PALETTE.glass);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r);
  ctx.strokeStyle = opts.stroke ?? opts.glow ?? RULE;
  ctx.lineWidth = opts.lineWidth ?? (opts.glow ? 2.5 : 1.5);
  ctx.stroke();
  // The inner ice line, like the kick-board inside a rink.
  if (w > 60 && h > 40) {
    roundRect(ctx, x + 5, y + 5, w - 10, h - 10, Math.max(4, r - 4));
    ctx.strokeStyle = 'rgba(159,212,255,0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (w > 140 && h > 60 && opts.rime !== false) {
    rime(ctx, x + r * 0.72 + 4, y + 1.5, 1);
    rime(ctx, x + w - r * 0.72 - 4, y + 1.5, -1);
  }
  if (opts.title) panelTitle(ctx, opts.title, x + 16, y + 16, w - 32, opts.titleSize ?? 20, opts.titleColor);
}

// A panel heading: red hog-line tick, the house rings, condensed caps, a faint rule beneath.
export function panelTitle(ctx, str, x, y, w, size = 20, color) {
  const px = size * DISPLAY_SCALE(size);
  ctx.fillStyle = PALETTE.hog;
  ctx.fillRect(x, y, 4, px * 0.82);
  houseGlyph(ctx, x + 17, y + px * 0.41, px * 0.3);
  text(ctx, str.toUpperCase(), x + 32, y + px * 0.8, { size, color: color ?? PALETTE.text, font: FONT_DISPLAY });
  ctx.fillStyle = 'rgba(159,212,255,0.25)';
  ctx.fillRect(x, y + px + 4, w, 1);
  return y + px + 4;
}

// A section label: the hog-line tick and house rings ahead of condensed caps. align 'right' ends at x.
export function heading(ctx, str, x, y, opts = {}) {
  const size = opts.size ?? 12;
  const px = size * DISPLAY_SCALE(size);
  setFont(ctx, str, size, 700, FONT_DISPLAY);
  const tw = ctx.measureText(str).width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  const lead = px * 0.7 + 12;
  const x0 = opts.align === 'right' ? x - tw - lead : x;
  ctx.fillStyle = PALETTE.hog;
  ctx.fillRect(x0, y - px * 0.78, 3, px * 0.86);
  houseGlyph(ctx, x0 + 6 + px * 0.33, y - px * 0.35, px * 0.33);
  text(ctx, str, x0 + lead, y, { size, color: opts.color ?? PALETTE.textSoft, font: FONT_DISPLAY });
  return lead + tw;
}

// A hanging score plate from the club scoreboard: an off-white card on a brass peg, a colour band
// along its foot, the label small and the number large in dark condensed figures.
export function plate(ctx, label, value, x, y, w, h, accent, opts = {}) {
  ctx.fillStyle = BRASS;
  ctx.beginPath();
  ctx.arc(x + w / 2, y - 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y, w, h, 9);
  ctx.fillStyle = '#f1f6fb';
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, 9);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(x, y + h - 7, w, 7);
  ctx.restore();
  text(ctx, label, x + w / 2, y + 24, { size: opts.labelSize ?? 12, align: 'center', color: '#55657e', font: FONT_DISPLAY, raw: true });
  text(ctx, value, x + w / 2, y + h - 16, { size: opts.size ?? 28, align: 'center', color: '#14213a', font: FONT_DISPLAY, raw: true });
}

// Text. On the boards, "ink" means the light type: callers keep naming PALETTE.ink and get the right one.
export function text(ctx, str, x, y, opts = {}) {
  let color = opts.color ?? PALETTE.text;
  if (!opts.raw) {
    if (color === PALETTE.ink) color = PALETTE.text;
    else if (color === PALETTE.inkSoft) color = PALETTE.textSoft;
  }
  setFont(ctx, str, opts.size ?? 16, opts.weight ?? 700, opts.font, opts.italic);
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
    ctx.fillText(str, x + 1.5, y + 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  const w = ctx.measureText(str).width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return w;
}

// Dark ink for a light fill, white for a dark one.
function inkFor(hex) {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return '#ffffff';
  const n = parseInt(hex.slice(1), 16);
  const l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l > 170 ? '#14213a' : '#ffffff';
}

// An end-card tag: flat colour, square on the reading side, a notch cut into the far end.
export function chip(ctx, label, x, y, opts = {}) {
  const h = opts.h ?? 24;
  const notch = Math.max(5, h * 0.3);
  setFont(ctx, label, opts.size ?? 13, 800, FONT_DISPLAY);
  const w = ctx.measureText(label).width + (opts.pad ?? 18) + notch;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  const left = opts.align === 'right' ? x - w : opts.align === 'center' ? x - w / 2 : x;
  const top = y - h / 2;
  const base = opts.fill ?? PALETTE.accent;
  const flip = opts.align === 'right';
  ctx.save();
  ctx.beginPath();
  if (!flip) {
    ctx.moveTo(left, top); ctx.lineTo(left + w, top); ctx.lineTo(left + w - notch, y); ctx.lineTo(left + w, top + h); ctx.lineTo(left, top + h);
  } else {
    ctx.moveTo(left + w, top); ctx.lineTo(left, top); ctx.lineTo(left + notch, y); ctx.lineTo(left, top + h); ctx.lineTo(left + w, top + h);
  }
  ctx.closePath();
  ctx.fillStyle = base;
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(left + (flip ? notch : 0), top + h - 2, w - notch, 2);
  ctx.restore();
  const cx = left + (flip ? notch + (w - notch) / 2 : (w - notch) / 2);
  text(ctx, label, cx, y + h * 0.04, { size: opts.size ?? 13, align: 'center', baseline: 'middle', color: opts.color ?? inkFor(base), font: FONT_DISPLAY, raw: true });
  ctx.textBaseline = 'alphabetic';
  return w;
}

export function bar(ctx, x, y, w, h, frac, color, opts = {}) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = opts.track ?? 'rgba(5,10,24,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(159,212,255,0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    roundRect(ctx, x, y, Math.max(h, w * f), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x + h * 0.4, y + 2, Math.max(0, w * f - h * 0.8), Math.max(1, h * 0.18));
  }
}

// A keycap: a small cut-corner block of pale ice with dark condensed lettering.
export function keycap(ctx, label, x, y, opts = {}) {
  setFont(ctx, label, opts.size ?? 12, 800, FONT_DISPLAY);
  const w = Math.max(24, ctx.measureText(label).width + 14);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  roundRect(ctx, x, y - 16 + 2, w, 22, 6);
  ctx.fillStyle = '#7f98b6';
  ctx.fill();
  roundRect(ctx, x, y - 16, w, 22, 6);
  ctx.fillStyle = opts.fill ?? '#e8f4ff';
  ctx.fill();
  text(ctx, label, x + w / 2, y - 0.5, { size: opts.size ?? 12, align: 'center', color: '#14213a', font: FONT_DISPLAY, raw: true });
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

// A granite button: a flat face with cut corners on a darker solid base, an inner rule, and a short
// handle notch on top. Hovered it rises a little; chosen it wears a brass rim.
export function button(ctx, label, x, y, w, h, opts = {}) {
  const base = opts.fill ?? PALETTE.player;
  const lift = opts.hover ? 2 : 0;
  const r = opts.radius ?? 16;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y + 6 - lift, w, h, r);
  ctx.fillStyle = shade(base, -0.48);
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y - lift, w, h, r);
  const g = ctx.createLinearGradient(0, y - lift, 0, y + h - lift);
  g.addColorStop(0, shade(base, 0.08));
  g.addColorStop(1, shade(base, -0.08));
  ctx.fillStyle = g;
  ctx.fill();
  const rim = opts.glow || opts.hover ? BRASS : opts.stroke ?? 'rgba(255,255,255,0.5)';
  ctx.strokeStyle = rim;
  ctx.lineWidth = opts.glow ? 3 : opts.hover ? 2.5 : 1.5;
  ctx.stroke();
  roundRect(ctx, x + 6, y + 6 - lift, w - 12, h - 12, Math.max(4, r - 6));
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x + w / 2 - Math.min(26, w * 0.18), y + 6 - lift, Math.min(52, w * 0.36), 3);
  if (label) {
    const size = opts.size ?? 24;
    text(ctx, label, x + w / 2, y + h / 2 + size * DISPLAY_SCALE(size) * 0.36 - lift, {
      size, align: 'center', color: opts.color ?? inkFor(base), font: FONT_DISPLAY, raw: true,
      shadow: opts.color ? null : 'rgba(0,0,0,0.22)',
    });
  }
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
