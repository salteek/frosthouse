// Cuts sprites out of the design sheets in "game design/" (flat dark background) into transparent PNGs.
// Dev-time only: needs ffmpeg to decode the JPEGs; the game itself loads the PNGs it writes.
//
//   node tools/sprites.mjs scan <sheet.jpeg> <out-dir>            find every sprite, write each + an index sheet
//   node tools/sprites.mjs cut <sheet.jpeg> <out.png> x y w h mode [scale]   one region; mode = solid | glow
//
// solid: background removed by flood fill from the region's edges (dark outlines inside a sprite stay opaque).
// glow:  every pixel un-blended from the background colour, so soft light keeps its fade (draw it with 'lighter').

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, crc32 } from 'node:zlib';

function decode(file) {
  const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim();
  const [w, h] = probe.split(',').map(Number);
  const data = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 30 });
  return { w, h, data };
}

function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy ? rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4) : raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  const chunk = (type, body) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
    const tb = Buffer.concat([Buffer.from(type), body]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(tb) >>> 0);
    return Buffer.concat([len, tb, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// The background: the median colour of the sheet's border pixels.
function background(img) {
  const rs = [], gs = [], bs = [];
  for (let x = 0; x < img.w; x += 7) for (const y of [2, img.h - 3]) { const i = (y * img.w + x) * 4; rs.push(img.data[i]); gs.push(img.data[i + 1]); bs.push(img.data[i + 2]); }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  return [med(rs), med(gs), med(bs)];
}

const dist = (d, i, bg) => Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2]));

// Background mask: flood fill from the edges through pixels near the background colour.
function bgMask(img, bg, x0, y0, w, h, tol) {
  const m = new Uint8Array(w * h), stack = [];
  const push = (x, y) => { const k = y * w + x; if (m[k]) return; if (dist(img.data, ((y0 + y) * img.w + x0 + x) * 4, bg) > tol) return; m[k] = 1; stack.push(k); };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const k = stack.pop(), x = k % w, y = (k / w) | 0;
    if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
  }
  return m;
}

function cut(img, bg, x0, y0, w, h, spec) {
  // 'solid' or 'solid:<tol>' (a lower tolerance keeps dark clothing that sits near the sheet's background colour).
  const [mode, tolStr] = String(spec).split(':');
  const out = Buffer.alloc(w * h * 4);
  const m = mode === 'solid' ? bgMask(img, bg, x0, y0, w, h, Number(tolStr ?? 26)) : null;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y0 + y) * img.w + x0 + x) * 4, o = (y * w + x) * 4, d = img.data;
    if (mode === 'solid') {
      if (m[y * w + x]) continue;
      // Feather the edge: a pixel touching the background takes alpha from how far it is from it.
      const edge = (x > 0 && m[y * w + x - 1]) || (x < w - 1 && m[y * w + x + 1]) || (y > 0 && m[(y - 1) * w + x]) || (y < h - 1 && m[(y + 1) * w + x]);
      out[o] = d[i]; out[o + 1] = d[i + 1]; out[o + 2] = d[i + 2]; out[o + 3] = edge ? Math.min(255, dist(d, i, bg) * 5) : 255;
    } else {
      let a = 0;
      for (let c = 0; c < 3; c++) a = Math.max(a, d[i + c] > bg[c] ? (d[i + c] - bg[c]) / (255 - bg[c]) : (bg[c] - d[i + c]) / bg[c]);
      if (a < 0.1) continue; // JPEG noise in the flat background reads as faint speckle below this
      for (let c = 0; c < 3; c++) out[o + c] = Math.max(0, Math.min(255, Math.round(bg[c] + (d[i + c] - bg[c]) / a)));
      out[o + 3] = Math.round(a * 255);
    }
  }
  return trim(out, w, h);
}

function trim(buf, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (buf[(y * w + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return { w: 1, h: 1, data: Buffer.alloc(4) };
  const tw = x1 - x0 + 1, th = y1 - y0 + 1, out = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++) buf.copy(out, y * tw * 4, ((y0 + y) * w + x0) * 4, ((y0 + y) * w + x1 + 1) * 4);
  return { w: tw, h: th, data: out, ox: x0, oy: y0 };
}

// Box-filter downscale of an RGBA buffer (premultiplied, so edges do not darken).
function scaleDown(img, f) {
  if (f >= 1) return img;
  const w = Math.max(1, Math.round(img.w * f)), h = Math.max(1, Math.round(img.h * f)), out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx0 = Math.floor(x / f), sx1 = Math.min(img.w, Math.floor((x + 1) / f)), sy0 = Math.floor(y / f), sy1 = Math.min(img.h, Math.floor((y + 1) / f));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) { const i = (yy * img.w + xx) * 4, al = img.data[i + 3]; r += img.data[i] * al; g += img.data[i + 1] * al; b += img.data[i + 2] * al; a += al; n++; }
    const o = (y * w + x) * 4;
    if (a) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; out[o + 3] = a / n; }
  }
  return { w, h, data: out };
}

// Connected blobs of non-background pixels on a coarse grid (cells of `cell` px), merged when close.
function scan(img, bg, cell) {
  const gw = Math.ceil(img.w / cell), gh = Math.ceil(img.h / cell), g = new Uint8Array(gw * gh);
  for (let y = 0; y < img.h; y += 2) for (let x = 0; x < img.w; x += 2) if (dist(img.data, (y * img.w + x) * 4, bg) > 30) g[((y / cell) | 0) * gw + ((x / cell) | 0)] = 1;
  const seen = new Int32Array(gw * gh).fill(-1), boxes = [];
  for (let k = 0; k < g.length; k++) {
    if (!g[k] || seen[k] >= 0) continue;
    const stack = [k]; seen[k] = boxes.length; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    while (stack.length) {
      const c = stack.pop(), cx = c % gw, cy = (c / gw) | 0; n++;
      x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const nk = ny * gw + nx; if (g[nk] && seen[nk] < 0) { seen[nk] = boxes.length; stack.push(nk); }
      }
    }
    boxes.push({ x: x0 * cell, y: y0 * cell, w: (x1 - x0 + 1) * cell, h: (y1 - y0 + 1) * cell, n });
  }
  return boxes.filter((b) => b.n > 6).sort((a, b) => (Math.round(a.y / 150) - Math.round(b.y / 150)) || a.x - b.x);
}

const [cmd, file, ...rest] = process.argv.slice(2);
const img = cmd === 'batch' ? null : decode(file);
const bg = img && background(img);
if (cmd === 'scan') {
  const dir = rest[0]; mkdirSync(dir, { recursive: true });
  const boxes = scan(img, bg, Number(rest[1] ?? 12));
  boxes.forEach((b, i) => console.log(i, b.x, b.y, b.w, b.h));
  writeFileSync(join(dir, 'boxes.json'), JSON.stringify({ bg, boxes }));
} else if (cmd === 'cut') {
  const [out, x, y, w, h, mode, scale] = rest;
  let s = cut(img, bg, +x, +y, +w, +h, mode);
  s = scaleDown(s, Number(scale ?? 1));
  writeFileSync(out, png(s.w, s.h, s.data));
  console.log(out, s.w, s.h);
} else if (cmd === 'batch') {
  // node tools/sprites.mjs batch tools/sprites.json game/assets : every sprite of the list, by sheet.
  const spec = JSON.parse(readFileSync(file, 'utf8')), dir = rest[0], sheets = {}, meta = {};
  mkdirSync(dir, { recursive: true });
  for (const sp of spec) {
    const sheet = (sheets[sp.sheet] ??= (() => { const im = decode(sp.sheet); return { im, bg: background(im) }; })());
    const s = scaleDown(cut(sheet.im, sheet.bg, ...sp.box, sp.mode), sp.scale);
    writeFileSync(join(dir, sp.name + '.png'), png(s.w, s.h, s.data));
    meta[sp.name] = [s.w, s.h, sp.mode];
  }
  writeFileSync(join(dir, 'sprites.json'), JSON.stringify(meta));
  console.log(Object.keys(meta).length, 'sprites');
} else {
  console.error('usage: scan <sheet> <dir> [cell] | cut <sheet> <out.png> x y w h solid|glow [scale]');
  process.exit(2);
}
