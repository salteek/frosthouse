// Interface primitives in Frosthouse's look: white enamel panels, navy ink, bold chips and keycaps.

import { PALETTE } from '../config.js';

export const FONT_TITLE = '"Trebuchet MS", "Avenir Next", Verdana, sans-serif';
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

export function panel(ctx, x, y, w, h, opts = {}) {
  ctx.save();
  if (opts.shadow !== false) {
    ctx.shadowColor = 'rgba(29,42,58,0.18)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
  }
  roundRect(ctx, x, y, w, h, opts.radius ?? 12);
  ctx.fillStyle = opts.fill ?? 'rgba(255,255,255,0.94)';
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, w, h, opts.radius ?? 12);
  ctx.strokeStyle = opts.stroke ?? PALETTE.panelEdge;
  ctx.lineWidth = opts.lineWidth ?? 2;
  ctx.stroke();
}

export function text(ctx, str, x, y, opts = {}) {
  ctx.font = `${opts.weight ?? 700} ${opts.size ?? 16}px ${opts.font ?? FONT_UI}`;
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
  ctx.fillStyle = opts.color ?? PALETTE.ink;
  ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}

export function chip(ctx, label, x, y, opts = {}) {
  ctx.font = `800 ${opts.size ?? 13}px ${FONT_UI}`;
  const w = ctx.measureText(label).width + (opts.pad ?? 16);
  const h = opts.h ?? 24;
  const left = opts.align === 'right' ? x - w : opts.align === 'center' ? x - w / 2 : x;
  roundRect(ctx, left, y - h / 2, w, h, h / 2);
  ctx.fillStyle = opts.fill ?? PALETTE.accent;
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
  ctx.fillStyle = opts.track ?? 'rgba(29,42,58,0.1)';
  ctx.fill();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    roundRect(ctx, x, y, Math.max(h, w * f), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

export function keycap(ctx, label, x, y, opts = {}) {
  ctx.font = `800 ${opts.size ?? 12}px ${FONT_UI}`;
  const w = Math.max(22, ctx.measureText(label).width + 12);
  roundRect(ctx, x, y - 15, w, 21, 5);
  ctx.fillStyle = opts.fill ?? '#ffffff';
  ctx.fill();
  ctx.strokeStyle = PALETTE.inkSoft;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y);
  return w;
}

// A row of "KEY action" hints; returns the x where it ended.
export function hints(ctx, list, x, y, opts = {}) {
  let cx = x;
  for (const [key, label] of list) {
    cx += keycap(ctx, key, cx, y) + 5;
    cx += text(ctx, label, cx, y, { size: opts.size ?? 12, weight: 700, color: opts.color ?? PALETTE.inkSoft }) + 14;
  }
  return cx;
}

export function button(ctx, label, x, y, w, h, opts = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(29,42,58,0.25)';
  ctx.shadowOffsetY = opts.hover ? 6 : 4;
  ctx.shadowBlur = 0;
  roundRect(ctx, x, y - (opts.hover ? 2 : 0), w, h, opts.radius ?? 14);
  ctx.fillStyle = opts.fill ?? PALETTE.player;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y - (opts.hover ? 2 : 0), w, h, opts.radius ?? 14);
  ctx.strokeStyle = opts.stroke ?? 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + (opts.size ?? 24) * 0.36 - (opts.hover ? 2 : 0), {
    size: opts.size ?? 24, weight: 900, align: 'center', color: opts.color ?? '#ffffff', font: FONT_TITLE,
  });
}

export const inside = (mx, my, x, y, w, h) => mx >= x && mx <= x + w && my >= y && my <= y + h;

export function formatScore(n) {
  return Math.round(n).toLocaleString('en-US');
}
