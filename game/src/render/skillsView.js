// Skills on screen: the two skill buttons (cooldown sweep, level pips, key), the strike itself (frost bolt,
// lightning, a gale across the house, frost locking a stone), the frozen crust on locked stones, and a
// target reticle on whatever the hovered skill would hit.

import { TAU } from '../geometry.js';
import { SKILLS, SKILL_BUTTONS, SKILL_KEY_NAMES, skillTargets, canUseSkill, skillCd } from '../skills.js';
import { currentTeam } from '../match.js';
import { sx, sy, px } from './camera.js';
import { SHEET } from '../config.js';
import { text, callout, keycap } from './ui.js';
import { drawSprite, hasSprite } from './sprites.js';
import { ELEMENTS, chargeFor } from '../combos.js';

// ---- Icons, drawn as vector shapes so they stay sharp from 18 px to 90 px.

export function drawSkillGlyph(ctx, id, x, y, r, alpha = 1) {
  const def = SKILLS[id];
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = def.color;
  ctx.shadowBlur = r * 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = def.color;
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  const s = r * 0.62;
  ctx.beginPath();
  if (id === 'bolt') {
    // An ice spear flying right.
    ctx.moveTo(s, 0); ctx.lineTo(s * 0.1, -s * 0.38); ctx.lineTo(-s * 0.15, -s * 0.12); ctx.lineTo(-s, -s * 0.2);
    ctx.lineTo(-s * 0.55, 0); ctx.lineTo(-s, s * 0.2); ctx.lineTo(-s * 0.15, s * 0.12); ctx.lineTo(s * 0.1, s * 0.38); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (id === 'thunder') {
    ctx.moveTo(s * 0.25, -s); ctx.lineTo(-s * 0.5, s * 0.1); ctx.lineTo(-s * 0.02, s * 0.1); ctx.lineTo(-s * 0.3, s);
    ctx.lineTo(s * 0.55, -s * 0.18); ctx.lineTo(s * 0.06, -s * 0.18); ctx.lineTo(s * 0.4, -s); ctx.closePath();
    ctx.fillStyle = '#fff6c0';
    ctx.fill(); ctx.stroke();
  } else if (id === 'gale') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, r * 0.16);
    for (const [yy, len, curl] of [[-0.45, 1.6, 1], [0.05, 1.9, -1], [0.5, 1.3, 1]]) {
      ctx.beginPath();
      ctx.moveTo(-s, yy * s);
      ctx.lineTo(-s + len * s * 0.75, yy * s);
      ctx.arc(-s + len * s * 0.75, yy * s - curl * s * 0.18, s * 0.18, Math.PI / 2 * curl, -Math.PI / 2 * curl, curl < 0);
      ctx.stroke();
    }
  } else if (id === 'lock') {
    // A snowflake.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, r * 0.13);
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / 6);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -s);
      ctx.moveTo(0, -s * 0.55); ctx.lineTo(-s * 0.25, -s * 0.78);
      ctx.moveTo(0, -s * 0.55); ctx.lineTo(s * 0.25, -s * 0.78);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

// A glossy round skill badge (button face, clubhouse card icon, HUD tray).
export function drawSkillBadge(ctx, id, x, y, r, o = {}) {
  const def = SKILLS[id];
  if (hasSprite(`skill_${id}`)) {
    // The painted badge (glass disc and rim included).
    ctx.save();
    if (o.glow) { ctx.shadowColor = def.color; ctx.shadowBlur = o.glow; }
    drawSprite(ctx, `skill_${id}`, x, y, r * 2.12, { ay: 0.5 });
    ctx.restore();
    return;
  }
  ctx.save();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.35, `rgba(${def.glow},0.75)`);
  g.addColorStop(1, 'rgba(14,22,48,0.95)');
  if (o.glow) { ctx.shadowColor = def.color; ctx.shadowBlur = o.glow; }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.strokeStyle = '#0b1330';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r - ctx.lineWidth, 0, TAU);
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.strokeStyle = `rgba(${def.glow},0.9)`;
  ctx.stroke();
  // Gloss.
  ctx.beginPath();
  ctx.ellipse(x - r * 0.15, y - r * 0.5, r * 0.55, r * 0.25, -0.3, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fill();
  ctx.restore();
  drawSkillGlyph(ctx, id, x, y, r);
}

// ---- The skill buttons in a match.

export function drawSkillButtons(ctx, scene, time) {
  const m = scene.match;
  const slots = m.kit.skills ?? [];
  const myTurn = m.phase === 'aim' && currentTeam(m) === 'player' && scene.intro <= 0;
  SKILL_BUTTONS.forEach((b, i) => {
    const slot = slots[i];
    ctx.save();
    if (!slot) {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fillStyle = 'rgba(10,18,40,0.55)';
      ctx.fill();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(160,200,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, '+', b.x, b.y + 8, { size: 24, weight: 900, align: 'center', color: '#cfe4ff' });
      text(ctx, 'WIN TO', b.x, b.y + b.r + 14, { size: 9, weight: 900, align: 'center', color: '#cfe4ff' });
      text(ctx, 'UNLOCK', b.x, b.y + b.r + 25, { size: 9, weight: 900, align: 'center', color: '#cfe4ff' });
      ctx.restore();
      return;
    }
    const cd = m.skillCd?.[slot.id] ?? 0;
    const max = skillCd(slot);
    const ready = canUseSkill(m, i);
    const live = ready && myTurn;
    const hov = scene.skillHover === i;
    const pulse = 0.5 + 0.5 * Math.sin(time * 5 + i);
    if (live) {
      // A ready skill breathes and throws off a rotating ring of light.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${SKILLS[slot.id].glow},${(0.35 + 0.4 * pulse).toFixed(2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 6 + pulse * 3, time * 3, time * 3 + TAU * 0.7);
      ctx.stroke();
      ctx.restore();
    }
    const r = b.r * (hov && live ? 1.08 : 1);
    ctx.globalAlpha = live ? 1 : cd > 0 ? 0.75 : 0.6;
    drawSkillBadge(ctx, slot.id, b.x, b.y, r, { glow: live ? 14 + pulse * 10 : 0 });
    if (cd > 0) {
      // The cooldown: a dark sweep that clears a slice for each of your throws.
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.arc(b.x, b.y, r, -Math.PI / 2, -Math.PI / 2 + TAU * (cd / max));
      ctx.closePath();
      ctx.fillStyle = 'rgba(6,10,26,0.68)';
      ctx.fill();
      callout(ctx, String(cd), b.x, b.y + 9, 26, { tone: 'ice' });
    }
    ctx.globalAlpha = 1;
    keycap(ctx, SKILL_KEY_NAMES[i], b.x - 9, b.y - b.r - 4, { size: 10 });
    // Level pips.
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(b.x - 10 + k * 10, b.y + b.r + 9, 3.4, 0, TAU);
      ctx.fillStyle = k < slot.level ? SKILLS[slot.id].color : 'rgba(255,255,255,0.18)';
      ctx.fill();
      ctx.strokeStyle = '#0b1330';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  });

  // Hovering a ready skill: name it, say what it does, and mark what it would hit.
  const hi = scene.skillHover ?? -1;
  const slot = slots[hi];
  if (slot && myTurn) {
    const def = SKILLS[slot.id];
    const b = SKILL_BUTTONS[hi];
    const cd = m.skillCd?.[slot.id] ?? 0;
    const tx = 24, ty = b.y - b.r - 112, tw = 300;
    ctx.save();
    ctx.fillStyle = 'rgba(10,16,38,0.92)';
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, 84, 12);
    ctx.fill();
    ctx.stroke();
    text(ctx, `${def.name.toUpperCase()}  ·  LEVEL ${slot.level}`, tx + 14, ty + 22, { size: 13, weight: 900, color: def.color });
    wrapSmall(ctx, def.text, tx + 14, ty + 42, tw - 28);
    text(ctx, cd > 0 ? `Ready in ${cd} of your throws` : skillTargets(m, slot.id).length ? `Press ${SKILL_KEY_NAMES[hi]} or click · cooldown ${skillCd(slot)} throws` : 'No target in play', tx + 14, ty + 76, { size: 11, weight: 800, color: cd > 0 ? '#ffb070' : '#bfe6ff' });
    ctx.restore();
    if (cd === 0) for (const s of skillTargets(m, slot.id).slice(0, slot.id === 'gale' ? 8 : slot.id === 'thunder' ? 1 + def.chain[slot.level - 1] : 1)) reticle(ctx, sx(scene.cam, s.x), sy(s.y), def, time);
  }
}

function wrapSmall(ctx, str, x, y, w) {
  ctx.save();
  ctx.font = '700 11px system-ui, sans-serif';
  const words = str.split(' ');
  let line = '', yy = y;
  for (const wd of words) {
    const t = line ? `${line} ${wd}` : wd;
    if (ctx.measureText(t).width > w && line) { text(ctx, line, x, yy, { size: 11, weight: 700, color: '#d8e6ff' }); line = wd; yy += 14; }
    else line = t;
  }
  if (line) text(ctx, line, x, yy, { size: 11, weight: 700, color: '#d8e6ff' });
  ctx.restore();
}

function reticle(ctx, x, y, def, time) {
  const r = px(SHEET.stoneR) * 1.9;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 1.6);
  ctx.strokeStyle = def.color;
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, r, i * TAU / 4 + 0.25, i * TAU / 4 + TAU / 4 - 0.25);
    ctx.stroke();
  }
  ctx.restore();
}

// ---- Locked stones wear a crust of frost.

export function drawLocks(ctx, scene, time) {
  for (const s of scene.match.stones) {
    if (!s.locked || s.out) continue;
    const x = sx(scene.cam, s.x), y = sy(s.y), r = px(SHEET.stoneR);
    if (drawSprite(ctx, 'fx_frostring', x, y, r * 3.6 * (1 + Math.sin(time * 3) * 0.03), { ay: 0.5, rot: time * 0.3, blend: 'lighter', alpha: 0.95 })) continue;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(169,139,255,${(0.55 + 0.25 * Math.sin(time * 4)).toFixed(2)})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#a98bff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = (i * TAU) / 6 + time * 0.4;
      const rr = r * 1.45;
      i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.stroke();
    ctx.restore();
    drawSkillGlyph(ctx, 'lock', x + r * 1.1, y - r * 1.1, 9, 0.9);
  }
}

// ---- The strike playing out.

export function drawSkillStrike(ctx, scene, time) {
  const m = scene.match;
  const sk = m.skill;
  if (sk) {
    const def = SKILLS[sk.id];
    const k = Math.min(1, sk.t / sk.hitAt);
    if (sk.id === 'bolt') bolt(ctx, scene, sk, k);
    else if (sk.id === 'thunder') thunder(ctx, scene, sk, time);
    else if (sk.id === 'gale') gale(ctx, scene, sk, time);
    else if (sk.id === 'lock') frostLock(ctx, scene, sk, k);
    void def;
  }
  const b = scene.skillBanner;
  if (b && b.t < 1.2) {
    const def = SKILLS[b.id];
    const pop = Math.min(1, b.t * 6), a = Math.min(1, (1.2 - b.t) * 3);
    ctx.save();
    ctx.globalAlpha = a;
    callout(ctx, b.team === 'rival' ? `${scene.match.rival.short}: ${def.name.toUpperCase()}!` : `${def.name.toUpperCase()}!`, 640, 210 - (1 - pop) * 20, 46 * (0.7 + 0.3 * pop), { tone: b.id === 'thunder' ? 'gold' : b.id === 'lock' ? 'violet' : 'ice', sparkle: true });
    ctx.restore();
  }
}

function bolt(ctx, scene, sk, k) {
  const s = sk.targets[0];
  if (!s) return;
  const tx = sx(scene.cam, s.x), ty = sy(s.y);
  const ox = -40, oy = ty + 30;
  if (sk.applied) {
    // After the hit, the spear's wake fades out.
    const f = Math.max(0, 1 - (sk.t - sk.hitAt) * 3);
    if (f <= 0) return;
    ctx.save();
    ctx.globalAlpha = f;
    ctx.globalCompositeOperation = 'lighter';
    streak(ctx, ox, oy, tx, ty, 1, '111,211,255');
    ctx.restore();
    return;
  }
  const e = k * k;
  const hx = ox + (tx - ox) * e, hy = oy + (ty - oy) * e;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  streak(ctx, ox + (hx - ox) * 0.2, oy + (hy - oy) * 0.2, hx, hy, 1, '111,211,255');
  ctx.restore();
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(Math.atan2(ty - oy, tx - ox));
  if (!drawSprite(ctx, 'fx_spear', 0, 0, 46, { ax: 0.9, ay: 0.5, blend: 'lighter' })) drawSkillGlyph(ctx, 'bolt', 0, 0, 52);
  ctx.restore();
}

function streak(ctx, x0, y0, x1, y1, a, rgb) {
  for (const [w, al] of [[26, 0.12], [12, 0.35], [4, 0.9]]) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(1, `rgba(${rgb},${al * a})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

// A jagged bolt from the sky; seeded by the strike time so it flickers between a few shapes.
function lightning(ctx, x0, y0, x1, y1, seed, width) {
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280) - 0.5;
  const pts = [[x0, y0]];
  const n = 9;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push([x0 + (x1 - x0) * t + rnd() * 60, y0 + (y1 - y0) * t + rnd() * 20]);
  }
  pts.push([x1, y1]);
  ctx.shadowColor = '#ffd84a';
  ctx.shadowBlur = 24;
  for (const [w, c] of [[width * 7, 'rgba(255,200,60,0.22)'], [width * 3, 'rgba(255,236,140,0.7)'], [width, '#ffffff']]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
}

function thunder(ctx, scene, sk, time) {
  const [a, b] = sk.targets;
  if (!a) return;
  const ax = sx(scene.cam, a.x), ay = sy(a.y);
  // The sky darkens as it gathers, then the bolt cracks down and flickers.
  const gather = Math.min(1, sk.t / sk.hitAt);
  if (!sk.applied) {
    ctx.fillStyle = `rgba(4,6,20,${(0.35 * gather).toFixed(3)})`;
    ctx.fillRect(0, 0, 1280, 720);
    reticle(ctx, ax, ay, SKILLS.thunder, time * 3);
    return;
  }
  const since = sk.t - sk.hitAt;
  if (since > 0.45) return;
  const seed = Math.floor(time * 24) * 31 + 7;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, 1 - since / 0.45);
  if (hasSprite('fx_lightning')) {
    // The painted strike, stretched from the sky to the stone; it flickers by flipping each few frames.
    const h = Math.max(260, ay - 90);
    drawSprite(ctx, 'fx_lightning', ax, ay + 30, h, { ay: 1, flip: Math.floor(time * 18) % 2 === 1 });
  } else lightning(ctx, ax + 40, 120, ax, ay, seed, 5);
  if (b) lightning(ctx, ax, ay, sx(scene.cam, b.x), sy(b.y), seed + 13, 3);
  ctx.restore();
}

function gale(ctx, scene, sk, time) {
  const t = sk.t;
  if (t > 1.1) return;
  const top = sy(-SHEET.width / 2), bot = sy(SHEET.width / 2);
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const p = (t * 1.3 + i * 0.07) % 1.2;
    const x = -200 + p * 1700;
    const y = top + 20 + ((i * 97) % (bot - top - 40));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.6 + (i % 3) * 0.4, 1);
    drawSprite(ctx, 'hazard_wind', 0, 0, 34 + (i % 3) * 10, { ay: 0.5, alpha: Math.min(1, (1.1 - t) * 2) * 0.8, blend: 'lighter' });
    ctx.restore();
  }
  ctx.restore();
  void time;
}

function frostLock(ctx, scene, sk, k) {
  const s = sk.targets[0];
  if (!s || sk.applied) return;
  const x = sx(scene.cam, s.x), y = sy(s.y);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6 + k * 2;
    const d = (1 - k) * 120 + 10;
    drawSkillGlyph(ctx, 'lock', x + Math.cos(a) * d, y + Math.sin(a) * d, 12, 0.9);
  }
  ctx.restore();
}

// ---- Elemental combos.


export function drawElementGlyph(ctx, id, x, y, r, alpha = 1) {
  if (drawSprite(ctx, `el_${id}`, x, y, r * 2.25, { ay: 0.5, alpha })) return;
  const el = ELEMENTS.find((e) => e.id === id);
  if (id === 'lightning') { ctx.save(); ctx.globalAlpha *= alpha; drawSkillGlyph(ctx, 'thunder', x, y, r); ctx.restore(); return; }
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= alpha;
  ctx.shadowColor = el.color;
  ctx.shadowBlur = r * 0.6;
  const s = r * 0.7;
  if (id === 'fire') {
    const g = ctx.createLinearGradient(0, -s, 0, s);
    g.addColorStop(0, '#ffe36a');
    g.addColorStop(0.6, '#ff7a2a');
    g.addColorStop(1, '#e0383e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.8, s * 0.9, 0, s);
    ctx.bezierCurveTo(-s * 0.8, s * 0.9, -s * 0.9, -s * 0.1, -s * 0.2, -s * 0.35);
    ctx.bezierCurveTo(-s * 0.1, -s * 0.1, s * 0.05, -s * 0.5, 0, -s);
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.45, s * 0.3, s * 0.4, 0, 0, TAU);
    ctx.fill();
  } else {
    // Hail: a cluster of ice balls.
    for (const [dx, dy, rr] of [[-0.35, -0.3, 0.38], [0.4, -0.15, 0.32], [0, 0.4, 0.42]]) {
      const g = ctx.createRadialGradient(dx * s - rr * s * 0.3, dy * s - rr * s * 0.3, 1, dx * s, dy * s, rr * s);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#7cc8f0');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, rr * s, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// The combo track: which elements your next stone carries, lit as the hot streak climbs.
export function drawComboTrack(ctx, scene, time) {
  const m = scene.match;
  const live = m.shot && m.shot.team === 'player' ? m.shot.charge ?? [] : chargeFor(m.streak);
  const x0 = 26, y0 = 420;
  ctx.save();
  ctx.fillStyle = 'rgba(8,14,34,0.62)';
  ctx.strokeStyle = live.length ? 'rgba(255,170,80,0.7)' : 'rgba(150,200,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x0, y0, 150, 54, 12);
  ctx.fill();
  ctx.stroke();
  text(ctx, live.length ? 'STONE CHARGED' : 'STREAK COMBO', x0 + 10, y0 + 14, { size: 9, weight: 900, color: live.length ? '#ffc070' : '#9fb4d8' });
  ELEMENTS.forEach((el, i) => {
    const on = live.includes(el.id);
    const cx = x0 + 28 + i * 47, cy = y0 + 35;
    if (i) text(ctx, '›', cx - 26, cy + 5, { size: 14, weight: 900, color: on ? el.color : 'rgba(255,255,255,0.3)' });
    const pulse = on ? 1 + Math.sin(time * 8 + i) * 0.08 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 14 * pulse, 0, TAU);
    ctx.fillStyle = on ? `rgba(${el.glow},0.25)` : 'rgba(255,255,255,0.05)';
    ctx.fill();
    drawElementGlyph(ctx, el.id, cx, cy, 13 * pulse, on ? 1 : 0.28);
    text(ctx, `x${el.streak}`, cx + 10, cy + 15, { size: 8, weight: 900, color: on ? '#ffffff' : 'rgba(255,255,255,0.35)' });
  });
  ctx.restore();
}

// A charged stone in flight wears its elements: a flame halo, crackling arcs, orbiting hail.
export function drawChargedStone(ctx, scene, time) {
  const s = scene.match.shot;
  if (!s || !s.moving || !s.charge?.length || s.comboDone) return;
  const x = sx(scene.cam, s.x), y = sy(s.y), r = px(SHEET.stoneR);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (s.charge.includes('fire')) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + time * 3;
      const fl = 1 + Math.sin(time * 20 + i * 2) * 0.25;
      const g = ctx.createRadialGradient(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, 1, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * fl);
      g.addColorStop(0, 'rgba(255,220,120,0.45)');
      g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * fl, 0, TAU);
      ctx.fill();
    }
  }
  if (s.charge.includes('lightning')) {
    ctx.strokeStyle = 'rgba(255,240,150,0.9)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffe05a';
    ctx.shadowBlur = 10;
    const k = Math.floor(time * 20);
    for (let j = 0; j < 2; j++) {
      const a0 = ((k * 7 + j * 3) % 12) / 12 * TAU;
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const a = a0 + i * 0.28, rr = r * (1.35 + (((k + i * 5 + j) % 3) - 1) * 0.18);
        i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
  if (s.charge.includes('hail')) for (let i = 0; i < 4; i++) {
    const a = time * 5 + (i * TAU) / 4;
    if (!drawSprite(ctx, 'fx_hailstone', x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9, 13, { ay: 0.5, blend: 'lighter' })) drawElementGlyph(ctx, 'hail', x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9, 7);
  }
}

// Lightning arcs left by a chain combo.
export function drawArcs(ctx, scene, time) {
  const A = scene.fx.arcs;
  if (!A?.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const a of A) {
    ctx.globalAlpha = Math.max(0, a.life / a.max);
    lightning(ctx, sx(scene.cam, a.x0), sy(a.y0), sx(scene.cam, a.x1), sy(a.y1), Math.floor(time * 24) * 17 + 3, 3.5);
  }
  ctx.restore();
}
