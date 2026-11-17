// The match HUD: scoreboard, the Open's win/lose line, rival card, the shot panel (weight, turn,
// release needle, sweep), the full-sheet map, shot calls and the end summary.

import { VIEW, SHEET, THROW, PALETTE, MATCH, SCORE } from '../config.js';
import { TAU } from '../geometry.js';
import { RIVALS } from '../rivals.js';
import { currentTeam, stonesLeft, total } from '../match.js';
import { weightName } from '../scenes/play.js';
import { kitItems } from '../tournament.js';
import { panel, text, chip, bar, keycap, roundRect, formatScore, FONT_TITLE, callout, twinkle } from './ui.js';
import { drawSprite, portraitFor, crestFor, drawCover } from './sprites.js';
import { drawStone, teamColours } from './stones.js';
import { drawKitIcon, trophy } from './icons.js';
import { BOSS_PHASES, bossPhase } from '../boss.js';

const BOTTOM = 620;

export function drawMatchHud(ctx, scene, time, best) {
  const m = scene.match;
  drawScoreboard(ctx, m);
  drawOpenStrip(ctx, scene.run, m);
  drawScorePanel(ctx, scene.run, best, m, time);
  drawRivalCard(ctx, m);
  drawShotPanel(ctx, scene, time);
  drawSheetMap(ctx, m);
  if (m.boss) drawBossBar(ctx, m, time);
  // The controls stay on screen between throws, not only while aiming, so the scheme is always in view.
  if ((m.phase === 'aim' || m.phase === 'settle') && scene.intro <= 0) drawHintPills(ctx);
  if (m.lastCall && m.phase === 'settle') drawCall(ctx, m.lastCall, m);
  if (m.phase === 'endScore' && m.endResult) drawEndSummary(ctx, m, time);
  if (m.phase === 'over') drawMatchOver(ctx, scene, time);
  if (scene.intro > 0) drawIntro(ctx, scene);
}

// Flames licking up around a box: taller and faster the hotter the streak.
function flames(ctx, x, y, w, h, time, heat) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const n = 16;
  for (let i = 0; i < n; i++) {
    const bx = x + 6 + (i / (n - 1)) * (w - 12);
    const flick = Math.sin(time * (11 + (i % 3) * 3) + i * 1.9) * 0.5 + 0.5;
    const fh = (16 + heat * 6) * (0.55 + 0.6 * flick);
    const fw = 9 + (i % 2) * 4;
    const g = ctx.createRadialGradient(bx, y + 6, 1, bx, y + 2 - fh * 0.4, fh);
    g.addColorStop(0, 'rgba(255,240,170,0.95)');
    g.addColorStop(0.35, 'rgba(255,150,40,0.75)');
    g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx - fw, y + 8);
    ctx.quadraticCurveTo(bx - fw * 0.6, y - fh * 0.4, bx + Math.sin(time * 7 + i) * 4, y - fh);
    ctx.quadraticCurveTo(bx + fw * 0.6, y - fh * 0.4, bx + fw, y + 8);
    ctx.fill();
  }
  // Embers rising off the box.
  for (let i = 0; i < 10; i++) {
    const t = (time * 0.8 + i * 0.37) % 1;
    const ex = x + 10 + ((i * 53) % (w - 20)) + Math.sin(time * 3 + i) * 6;
    ctx.fillStyle = `rgba(255,${180 - i * 6},60,${(1 - t).toFixed(2)})`;
    ctx.fillRect(ex, y - t * (30 + heat * 8), 2.5, 2.5);
  }
  ctx.restore();
}

// Three glass pills over the near end of the sheet: the whole control scheme while you line up a throw.
function drawHintPills(ctx) {
  const pills = [['MOUSE', 'aim the broom'], ['W/S', 'set the weight'], ['F/G', 'fire a skill']];
  let x = 420;
  for (const [key, label] of pills) {
    ctx.font = `800 14px ${'system-ui, sans-serif'}`;
    const w = 46 + ctx.measureText(label).width + key.length * 9;
    panel(ctx, x, 570, w, 36, { radius: 18, glow: '#5fd0ff', fillTop: 'rgba(14,26,52,0.9)', fill: 'rgba(14,26,52,0.9)' });
    const kw = keycap(ctx, key, x + 10, 594);
    text(ctx, label, x + 18 + kw, 594, { size: 14, weight: 800 });
    x += w + 14;
  }
}

function teamName(m, team) {
  return team === 'player' ? 'YOUR RINK' : m.rival.short;
}

function drawScoreboard(ctx, m) {
  const x = 14;
  const y = 10;
  const ends = Math.max(m.ends, m.scores.player.length + (m.phase === 'over' ? 0 : 1));
  const cell = ends > 4 ? 28 : 34;
  const w = 168 + ends * cell + 56;
  panel(ctx, x, y, w, 90);
  text(ctx, 'END', x + 150, y + 22, { size: 11, weight: 800, color: PALETTE.inkSoft, align: 'right' });
  for (let i = 0; i < ends; i++) {
    const cx = x + 168 + i * cell + cell / 2;
    const current = i === m.end - 1 && m.phase !== 'over';
    if (current) {
      roundRect(ctx, cx - cell / 2 + 2, y + 8, cell - 4, 78, 7);
      ctx.fillStyle = 'rgba(47,111,214,0.12)';
      ctx.fill();
    }
    text(ctx, i >= m.ends ? 'EE' : String(i + 1), cx, y + 22, { size: 12, weight: 900, align: 'center', color: current ? PALETTE.accent : PALETTE.inkSoft });
  }
  text(ctx, 'TOTAL', x + w - 30, y + 22, { size: 11, weight: 900, align: 'center', color: PALETTE.inkSoft });
  ['player', 'rival'].forEach((team, row) => {
    const ry = y + 48 + row * 30;
    const [c0, c1] = teamColours(team, m.rival);
    if (!drawSprite(ctx, crestFor(team === 'player' ? null : m.rival), x + 22, ry - 5, 28, { ay: 0.5 })) drawStone(ctx, x + 22, ry - 5, 0.4, [c0, c1], { radius: 11 });
    text(ctx, teamName(m, team), x + 40, ry, { size: 15, weight: 900, color: PALETTE.ink });
    if (m.hammer === team && m.phase !== 'over') drawHammer(ctx, x + 146, ry - 6);
    m.scores[team].forEach((pts, i) => {
      const cx = x + 168 + i * cell + cell / 2;
      text(ctx, String(pts), cx, ry, { size: 18, weight: 900, align: 'center', color: pts > 0 ? c0 : 'rgba(255,255,255,0.28)', raw: true });
    });
    roundRect(ctx, x + w - 50, ry - 21, 40, 28, 8);
    ctx.fillStyle = c0;
    ctx.fill();
    text(ctx, String(total(m, team)), x + w - 30, ry, { size: 20, weight: 900, align: 'center', color: '#ffffff' });
  });
}

// The final's boss bar, hung under the top panels: The Glacier's RESOLVE, split into her three phases.
function drawBossBar(ctx, m, time) {
  const b = m.boss;
  const x = 392, y = 106, w = 492, h = 62;
  const col = b.cracked ? '#9fb4d8' : ['#5fb7ea', '#b8f0ff', '#c4a8ff'][b.phase - 1];
  panel(ctx, x, y, w, h, { radius: 12, glow: b.cracked ? undefined : col, fillTop: 'rgba(16,22,52,0.95)', fill: 'rgba(10,14,36,0.95)' });
  chip(ctx, 'BOSS', x + 12, y + 17, { fill: '#7a2bd6', size: 10, h: 18 });
  text(ctx, 'THE GLACIER · RESOLVE', x + 64, y + 22, { size: 13, weight: 900, color: '#eaf4ff' });
  const tag = b.cracked ? 'CRACKED · powers gone' : `PHASE ${b.phase}/3 · ${bossPhase(b).name}`;
  text(ctx, tag, x + w - 12, y + 22, { size: 13, weight: 900, align: 'right', color: col });
  // The bar: three segments, notched at the phase thresholds; it flashes white for a moment when hit.
  const bx = x + 12, by = y + 30, bw = w - 24, bh = 14;
  roundRect(ctx, bx, by, bw, bh, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();
  const frac = b.resolve / 100;
  if (frac > 0) {
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#a98bff');
    g.addColorStop(0.5, '#b8f0ff');
    g.addColorStop(1, '#5fb7ea');
    roundRect(ctx, bx, by, Math.max(bh, bw * frac), bh, 7);
    ctx.fillStyle = g;
    ctx.fill();
    if (b.hitT < 0.35) {
      ctx.globalAlpha = 1 - b.hitT / 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  for (const t of [1 / 3, 2 / 3]) {
    ctx.fillStyle = 'rgba(10,14,36,0.95)';
    ctx.fillRect(bx + bw * t - 1.5, by - 2, 3, bh + 4);
  }
  text(ctx, `${Math.ceil(b.resolve)}`, bx + Math.max(bh, bw * frac) - 6, by + 11, { size: 11, weight: 900, align: 'right', color: '#0a1024' });
  // The three phases named under their thirds of the bar (the bar drains right to left, so phase 1 is on the right).
  BOSS_PHASES.forEach((ph, i) => {
    const cx = bx + bw * (1 - (i + 0.5) / 3);
    const on = !b.cracked && b.phase === ph.n;
    text(ctx, `${ph.n} · ${ph.name}`, cx, y + 56, { size: 9, weight: 900, align: 'center', color: on ? col : 'rgba(200,215,240,0.4)' });
  });
}

function drawHammer(ctx, x, y) {
  if (drawSprite(ctx, 'hammer_icon', x, y, 24, { ay: 0.5 })) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(-1.5, -2, 3, 14);
  ctx.fillStyle = '#4f6075';
  ctx.fillRect(-7, -7, 14, 7);
  ctx.restore();
}

function drawOpenStrip(ctx, run, m) {
  const x = 392;
  const w = 330;
  panel(ctx, x, 10, w, 90);
  const final = !!m.boss;
  text(ctx, final ? `MATCH ${RIVALS.length} OF ${RIVALS.length} · THE FINAL · ${m.venue.name.toUpperCase()}` : `MATCH ${run.round + 1} OF ${RIVALS.length} · ${m.venue.name.toUpperCase()}`, x + 16, 32, { size: 13, weight: 900, color: final ? PALETTE.gold : PALETTE.accent });
  chip(ctx, 'WIN', x + 16, 55, { fill: PALETTE.good, size: 11, h: 20 });
  text(ctx, final ? 'outscore The Glacier and take the Open' : 'beat all 6 rinks and take the Open', x + 64, 60, { size: 13, weight: 700 });
  chip(ctx, 'LOSE', x + 16, 81, { fill: PALETTE.bad, size: 11, h: 20 });
  text(ctx, `${MATCH.lossesAllowed} match losses`, x + 68, 86, { size: 13, weight: 700 });
  for (let i = 0; i < MATCH.lossesAllowed; i++) {
    const cx = x + 184 + i * 20;
    ctx.fillStyle = i < run.losses ? PALETTE.bad : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(cx, 81, 7, 0, TAU);
    ctx.fill();
  }
  text(ctx, run.losses ? `${run.losses} used` : 'none yet', x + 230, 86, { size: 12, weight: 800, color: run.losses ? PALETTE.bad : PALETTE.inkSoft });
}

function drawScorePanel(ctx, run, best, m, time = 0) {
  const x = 734;
  const w = 150;
  panel(ctx, x, 10, w, 90, m.streak >= 2 ? { glow: '#ff6a1f', fillTop: 'rgba(120,40,20,0.92)', fill: 'rgba(60,18,14,0.92)' } : {});
  if (m.streak >= 2) {
    // Fire inside the box, rising from its floor behind the score.
    ctx.save();
    roundRect(ctx, x, 10, w, 90, 14);
    ctx.clip();
    flames(ctx, x, 100, w, 90, time, Math.min(SCORE.streakMax, m.streak));
    ctx.restore();
  }
  if (m.streak >= 2) {
    chip(ctx, `HOT STREAK x${Math.min(SCORE.streakMax, m.streak)}`, x + w / 2, 30, { align: 'center', fill: PALETTE.player, size: 11, h: 20 });
  } else {
    text(ctx, 'SCORE', x + w / 2, 32, { size: 12, weight: 900, align: 'center', color: PALETTE.inkSoft });
  }
  const hot = m.streak >= 2 ? { outline: 'rgba(60,10,6,0.9)', outlineWidth: 5 } : {};
  text(ctx, formatScore(run.score), x + w / 2, 66, { size: 30, weight: 900, align: 'center', color: PALETTE.ink, font: FONT_TITLE, ...hot });
  text(ctx, `BEST ${formatScore(Math.max(best, run.score))}`, x + w / 2, 88, { size: 11, weight: 800, align: 'center', color: m.streak >= 2 ? '#fff4d6' : PALETTE.inkSoft, ...hot });
}

function drawRivalCard(ctx, m) {
  const x = 896;
  const w = VIEW.w - x - 14;
  const r = m.rival;
  panel(ctx, x, 10, w, 90);
  roundRect(ctx, x, 10, 10, 90, 5);
  ctx.fillStyle = r.colour;
  ctx.fill();
  text(ctx, 'VS', x + 22, 33, { size: 12, weight: 900, color: PALETTE.inkSoft });
  text(ctx, r.name, x + 46, 33, { size: 15, weight: 900, color: PALETTE.ink });
  text(ctx, r.skip, x + 22, 53, { size: 12, weight: 700, color: PALETTE.inkSoft });
  drawSprite(ctx, portraitFor(r), x + w - 30, 99, 88);
  chip(ctx, r.style.toUpperCase(), x + w - 62, 49, { align: 'right', fill: r.dark, size: 10, h: 18 });
  text(ctx, `“${r.motto}”`, x + 22, 72, { size: 11, weight: 600, color: PALETTE.inkSoft, font: 'Georgia, serif' });
  // Stones left for each side.
  ['player', 'rival'].forEach((team, i) => {
    const left = stonesLeft(m, team);
    const cols = teamColours(team, m.rival);
    const bx = x + 22 + i * 172;
    text(ctx, team === 'player' ? 'YOU' : r.short, bx, 93, { size: 10, weight: 900, color: PALETTE.inkSoft });
    for (let k = 0; k < m.stonesPerTeam; k++) {
      ctx.globalAlpha = k < left ? 1 : 0.18;
      ctx.fillStyle = cols[0];
      ctx.beginPath();
      ctx.arc(bx + 76 + k * 14, 89, 5, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

function drawShotPanel(ctx, scene, time) {
  const m = scene.match;
  const team = currentTeam(m);
  panel(ctx, 14, BOTTOM, 850, VIEW.h - BOTTOM - 8);
  const yourTurn = m.phase === 'aim' && team === 'player';

  // Whose throw.
  const label = m.phase === 'running'
    ? (m.shot?.team === 'player' ? 'YOUR STONE IS RUNNING' : `${m.rival.short} THROWING`)
    : m.phase === 'aim'
      ? (yourTurn ? `YOUR THROW · STONE ${m.thrown.player + 1} OF ${m.stonesPerTeam}` : `${m.rival.short} IS READING THE ICE…`)
      : `END ${m.end} OF ${m.ends}`;
  text(ctx, label, 30, BOTTOM + 22, { size: 13, weight: 900, color: yourTurn ? PALETTE.player : PALETTE.ink });

  // Weight slider with its named zones written inside.
  const sx0 = 30;
  const sw = 390;
  const sy0 = BOTTOM + 42;
  let prev = 0;
  const zoneCol = ['#6fa8dc', '#2fa86b', '#e3a21a', '#ff7a45', '#e0383e'];
  THROW.weights.forEach((z, i) => {
    const a = sx0 + prev * sw;
    const b = sx0 + Math.min(1, z.upTo) * sw;
    roundRect(ctx, a, sy0, b - a - 2, 20, 4);
    ctx.fillStyle = zoneCol[i];
    ctx.fill();
    text(ctx, z.name, (a + b) / 2, sy0 + 14, { size: 10, weight: 900, align: 'center', color: '#ffffff' });
    prev = z.upTo;
  });
  const wx = sx0 + scene.aim.weight * sw;
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.moveTo(wx, sy0 - 1);
  ctx.lineTo(wx - 7, sy0 - 11);
  ctx.lineTo(wx + 7, sy0 - 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(wx - 2, sy0 - 2, 4, 26);
  let hx = sx0 + sw - 168;
  hx += keycap(ctx, 'W/S', hx, BOTTOM + 23, { size: 10 }) + 4;
  hx += keycap(ctx, 'WHEEL', hx, BOTTOM + 23, { size: 10 }) + 4;
  keycap(ctx, '1-5', hx, BOTTOM + 23, { size: 10 });
  text(ctx, `WEIGHT: ${weightName(scene.aim.weight)}`, sx0, BOTTOM + 84, { size: 12, weight: 900, color: PALETTE.ink });
  text(ctx, 'aim with the MOUSE on the ice', sx0 + sw, BOTTOM + 84, { size: 11, weight: 700, align: 'right', color: PALETTE.inkSoft });

  // Turn.
  const tx = 446;
  text(ctx, 'TURN', tx, BOTTOM + 22, { size: 12, weight: 900, color: PALETTE.inkSoft });
  keycap(ctx, 'Q/E', tx + 40, BOTTOM + 23, { size: 10 });
  const t = scene.aim.turn;
  if (!drawSprite(ctx, t > 0 ? 'icon_turn_cw' : 'icon_turn_ccw', tx + 16, BOTTOM + 58, 32, { ay: 0.5 })) {
    ctx.strokeStyle = PALETTE.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tx + 16, BOTTOM + 56, 12, -2.4, 0.9, t < 0);
    ctx.stroke();
  }
  text(ctx, t > 0 ? 'CLOCKWISE' : 'COUNTER', tx + 36, BOTTOM + 54, { size: 12, weight: 900, color: PALETTE.accent });
  text(ctx, t > 0 ? 'curls down' : 'curls up', tx + 36, BOTTOM + 70, { size: 11, weight: 700, color: PALETTE.inkSoft });

  // Release needle (while aiming) or sweep stamina (while running).
  const nx = 580;
  const cw = 268;
  if (m.phase === 'running') {
    text(ctx, 'SWEEP', nx, BOTTOM + 22, { size: 12, weight: 900, color: PALETTE.inkSoft });
    keycap(ctx, 'HOLD SPACE', nx + 52, BOTTOM + 23, { size: 10 });
    const max = THROW.sweepStamina * (m.shot?.team === 'player' ? m.kit.stamina : 1.2);
    const frac = m.stamina / max, mine = m.shot?.team === 'player';
    const low = frac < 0.28, empty = frac <= 0.001;
    // The bar burns down while sweeping: a shimmer races along it, and it throbs red when nearly spent.
    const throb = low && !empty ? 0.5 + 0.5 * Math.sin(time * 16) : 0;
    bar(ctx, nx, BOTTOM + 42, cw, 20, frac, empty ? '#5b6b85' : low ? (throb > 0.5 ? '#ff4d4d' : '#e3a21a') : scene.sweeping ? '#2fa86b' : '#6fa8dc');
    if (scene.sweeping && frac > 0.02) {
      ctx.save();
      roundRect(ctx, nx, BOTTOM + 42, Math.max(20, cw * frac), 20, 10);
      ctx.clip();
      const sx0 = nx + ((time * 420) % (cw + 80)) - 40;
      const g = ctx.createLinearGradient(sx0 - 40, 0, sx0 + 40, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(nx, BOTTOM + 42, cw, 20);
      ctx.restore();
    }
    if (low && !empty) {
      ctx.save();
      ctx.shadowColor = '#ff4d4d';
      ctx.shadowBlur = 14 * throb;
      ctx.strokeStyle = `rgba(255,90,90,${(0.35 + 0.5 * throb).toFixed(2)})`;
      ctx.lineWidth = 2;
      roundRect(ctx, nx - 2, BOTTOM + 40, cw + 4, 24, 12);
      ctx.stroke();
      ctx.restore();
    }
    const msg = empty ? (mine ? 'OUT OF BREATH! the stone runs free' : `${m.rival.short} sweepers are spent`)
      : scene.sweeping ? (low ? 'ALMOST SPENT! sweep only if it needs it' : 'SWEEPING! farther and straighter')
      : mine ? 'Hold SPACE or the mouse to sweep' : `${m.rival.short} sweepers ready`;
    text(ctx, msg, nx, BOTTOM + 84, { size: 12, weight: 800, color: empty || (low && scene.sweeping) ? '#ff8080' : scene.sweeping ? PALETTE.good : PALETTE.inkSoft });
  } else {
    text(ctx, 'RELEASE', nx, BOTTOM + 22, { size: 12, weight: 900, color: PALETTE.inkSoft });
    keycap(ctx, 'HOLD CLICK', nx + 66, BOTTOM + 23, { size: 10 });
    const zone = THROW.perfectZone * m.kit.perfect;
    roundRect(ctx, nx, BOTTOM + 42, cw, 20, 8);
    const g = ctx.createLinearGradient(nx, 0, nx + cw, 0);
    g.addColorStop(0, '#e0383e');
    g.addColorStop(0.5 - zone, '#e3a21a');
    g.addColorStop(0.5, '#2fa86b');
    g.addColorStop(0.5 + zone, '#e3a21a');
    g.addColorStop(1, '#e0383e');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(nx + cw / 2 - (zone * cw) / 2, BOTTOM + 42, zone * cw, 20);
    text(ctx, 'PERFECT', nx + cw / 2, BOTTOM + 56, { size: 9, weight: 900, align: 'center', color: PALETTE.good });
    if (scene.charging) {
      const p = nx + cw / 2 + (scene.needle * cw) / 2;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(p - 2, BOTTOM + 36, 4, 32);
    }
    text(ctx, scene.charging ? 'Let go on PERFECT!' : yourTurn ? 'Hold on the ice, let go on PERFECT' : 'Wait for your turn', nx, BOTTOM + 84, { size: 12, weight: 800, color: scene.charging ? PALETTE.player : PALETTE.inkSoft });
  }
  if (scene.run.owned.length) {
    kitItems(scene.run).slice(0, 6).forEach(({ item }, i) => drawKitIcon(ctx, item.icon, 846 - i * 24, BOTTOM + 84, 18));
  }
}

function drawSheetMap(ctx, m) {
  const x = 876;
  const w = VIEW.w - x - 14;
  const y = BOTTOM;
  panel(ctx, x, y, w, VIEW.h - BOTTOM - 8);
  text(ctx, 'THE SHEET', x + 14, y + 20, { size: 11, weight: 900, color: PALETTE.inkSoft });
  const k = (w - 28) / (SHEET.end + 1);
  const mx = (sxm) => x + 14 + (sxm + 1) * k;
  const my = (sym) => y + 52 + sym * k;
  ctx.fillStyle = '#1f4f86';
  ctx.fillRect(mx(-1), my(-SHEET.width / 2), (SHEET.end + 1) * k, SHEET.width * k);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.strokeRect(mx(-1), my(-SHEET.width / 2), (SHEET.end + 1) * k, SHEET.width * k);
  ctx.fillStyle = PALETTE.hog;
  ctx.fillRect(mx(SHEET.hogFar), my(-SHEET.width / 2), 2, SHEET.width * k);
  ctx.fillRect(mx(0), my(-SHEET.width / 2), 2, SHEET.width * k);
  for (const [r, c] of [[1.83, PALETTE.ringOuter], [1.22, '#ffffff'], [0.61, PALETTE.ringInner]]) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(mx(SHEET.tee), my(0), r * k, 0, TAU);
    ctx.fill();
  }
  for (const p of m.venue.patches) {
    ctx.fillStyle = p.kind === 'snow' ? 'rgba(150,170,190,0.6)' : 'rgba(110,140,160,0.4)';
    ctx.beginPath();
    ctx.ellipse(mx(p.x), my(p.y), p.rx * k, p.ry * k, 0, 0, TAU);
    ctx.fill();
  }
  for (const s of m.stones) {
    if (s.out) continue;
    ctx.fillStyle = teamColours(s.team, m.rival)[0];
    ctx.beginPath();
    ctx.arc(mx(s.x), my(s.y), Math.max(2.5, SHEET.stoneR * k * 1.4), 0, TAU);
    ctx.fill();
  }
  text(ctx, m.venue.note, x + 14, y + 88, { size: 11, weight: 700, color: PALETTE.inkSoft });
  let hx = x + w - 112;
  hx += keycap(ctx, 'ESC', hx, y + 21, { size: 9 }) + 3;
  hx += text(ctx, 'pause', hx, y + 20, { size: 10, weight: 800, color: PALETTE.inkSoft }) + 6;
  hx += keycap(ctx, 'M', hx, y + 21, { size: 9 }) + 3;
  text(ctx, 'mute', hx, y + 20, { size: 10, weight: 800, color: PALETTE.inkSoft });
}

function drawCall(ctx, call, m) {
  const t = call.t;
  const a = Math.min(1, t * 5) * Math.min(1, Math.max(0, (1.6 - t) * 3));
  if (a <= 0) return;
  // A springy pop: overshoots, settles, then keeps a faint living wobble.
  const u = Math.min(1, t / 0.3), v = u - 1;
  const scale = t < 0.3 ? Math.max(0.05, 1 + 2.7 * v * v * v + 1.7 * v * v) : 1 + 0.018 * Math.sin(t * 8);
  const tilt = -0.07 * (1 - Math.min(1, t / 0.4)) + 0.012 * Math.sin(t * 5);
  const colour = call.tone === 'great' ? PALETTE.gold : call.tone === 'good' ? PALETTE.accent : call.tone === 'bad' ? PALETTE.bad : PALETTE.inkSoft;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(640, m.boss ? 226 : 200);
  ctx.scale(scale, scale);
  ctx.rotate(tilt);
  const who = call.team === 'player' ? '' : `${m.rival.short}: `;
  // Great shots burn, good ones glow ice-blue, the rival's and the bad ones go cold violet.
  const tone = call.team !== 'player' ? 'violet' : call.tone === 'great' ? 'fire' : call.tone === 'bad' ? 'violet' : 'ice';
  callout(ctx, who + call.text, 0, 0, call.tone === 'great' ? 58 : 46, { tone, sparkle: call.tone === 'great' });
  if (call.tone === 'great') {
    // Two sparkles orbit the words.
    for (let i = 0; i < 2; i++) {
      const a = t * 3 + i * Math.PI;
      twinkle(ctx, Math.cos(a) * 230, -20 + Math.sin(a) * 34, 7 + Math.sin(t * 9 + i) * 2);
    }
  }
  text(ctx, call.sub + (call.perfect ? ' · PERFECT RELEASE' : ''), 0, 34, { size: 17, weight: 800, align: 'center', color: '#ffffff', outline: 'rgba(12,24,52,0.85)', outlineWidth: 6, raw: true });
  if (call.team === 'player' && call.streak > 1) {
    chip(ctx, `HOT STREAK x${call.streak} · POINTS x${call.streak}`, 0, 68, { align: 'center', fill: '#ff5a1f', size: 15, h: 28 });
  }
  ctx.restore();
}

function drawEndSummary(ctx, m, time) {
  const r = m.endResult;
  const t = r.t;
  const a = Math.min(1, t * 4);
  ctx.save();
  ctx.globalAlpha = a;
  const w = 460;
  const x = (VIEW.w - w) / 2;
  const y = 168;
  panel(ctx, x, y, w, 120, { glow: r.team ? teamColours(r.team, m.rival)[0] : undefined });
  text(ctx, `END ${m.end} OF ${m.ends}`, VIEW.w / 2, y + 26, { size: 13, weight: 900, align: 'center', color: PALETTE.inkSoft });
  let head;
  if (r.tea) head = 'THERMOS OF TEA: END BLANKED';
  else if (!r.team) head = 'BLANK END · NO SCORE';
  else head = `${teamName(m, r.team)} ${r.stolen ? 'STEALS' : 'SCORES'} ${r.points}`;
  text(ctx, head, VIEW.w / 2, y + 66, { size: 34, weight: 900, align: 'center', color: r.team ? teamColours(r.team, m.rival)[0] : PALETTE.ink, font: FONT_TITLE });
  text(ctx, `${total(m, 'player')} – ${total(m, 'rival')}   ·   hammer to ${teamName(m, m.hammer)}`, VIEW.w / 2, y + 98, { size: 14, weight: 800, align: 'center', color: PALETTE.inkSoft });
  ctx.restore();
}

function drawMatchOver(ctx, scene, time) {
  const m = scene.match;
  const won = m.winner === 'player';
  ctx.fillStyle = 'rgba(6,12,28,0.5)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const w = 560;
  const x = (VIEW.w - w) / 2;
  const y = 190;
  panel(ctx, x, y, w, 230, { glow: won ? PALETTE.good : PALETTE.bad });
  if (won) { trophy(ctx, VIEW.w / 2, y + 52, 54); drawSprite(ctx, 'cheer_blue', x - 10, y + 232, 190); drawSprite(ctx, 'cheer_green2', x + w + 10, y + 232, 190); }
  else drawSprite(ctx, 'crouch_yellow', x - 6, y + 232, 150);
  callout(ctx, won ? 'MATCH WON!' : 'MATCH LOST', VIEW.w / 2, y + (won ? 124 : 84), 50, { tone: won ? 'gold' : 'violet' });
  text(ctx, `${total(m, 'player')} – ${total(m, 'rival')} vs ${m.rival.name}`, VIEW.w / 2, y + (won ? 154 : 116), { size: 18, weight: 800, align: 'center' });
  const run = scene.run;
  const note = won
    ? (run.round + 1 >= RIVALS.length ? 'That was the final…' : 'Next: pick a kit upgrade in the clubhouse')
    : `${run.losses + 1} of ${MATCH.lossesAllowed} losses · ${run.losses + 1 >= MATCH.lossesAllowed ? 'your Open is over' : 'rematch to stay alive'}`;
  text(ctx, note, VIEW.w / 2, y + (won ? 184 : 150), { size: 15, weight: 700, align: 'center', color: PALETTE.inkSoft });
  text(ctx, 'Click or press ENTER to continue', VIEW.w / 2, y + 212, { size: 13, weight: 800, align: 'center', color: PALETTE.accent });
}

function drawIntro(ctx, scene) {
  const m = scene.match;
  const a = Math.min(1, scene.intro * 2);
  ctx.save();
  ctx.globalAlpha = a;
  const band = ctx.createLinearGradient(0, 230, 0, 420);
  band.addColorStop(0, 'rgba(8,16,38,0.92)');
  band.addColorStop(1, 'rgba(22,40,80,0.92)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 230, VIEW.w, 190);
  // The lake you are about to play, painted behind the matchup.
  if (drawCover(ctx, `bd_${m.venue.id}`, 0, 230, VIEW.w, 190, 0.55)) {
    ctx.fillStyle = 'rgba(8,16,38,0.45)';
    ctx.fillRect(0, 230, VIEW.w, 190);
  }
  drawSprite(ctx, 'idle_red', 200, 420, 200);
  drawSprite(ctx, portraitFor(m.rival), 1080, 420, 200, { flip: true });
  text(ctx, `MATCH ${scene.run.round + 1}${m.rival.champion ? ' · THE FINAL' : ''}`, VIEW.w / 2, 272, { size: 18, weight: 900, align: 'center', color: PALETTE.accent });
  callout(ctx, `vs ${m.rival.name}`, VIEW.w / 2, 326, 46, { tone: 'ice', sparkle: false });
  text(ctx, m.boss ? 'BOSS MATCH · her Resolve falls each end and with every point you score: three phases, then she cracks' : `${m.venue.name} · ${m.venue.note}`, VIEW.w / 2, 358, { size: 17, weight: 700, align: 'center', color: PALETTE.inkSoft });
  text(ctx, m.hammer === 'player' ? 'You have the hammer: last stone of the end' : `${m.rival.short} have the hammer. You throw first.`, VIEW.w / 2, 392, { size: 15, weight: 800, align: 'center', color: m.hammer === 'player' ? PALETTE.good : PALETTE.player });
  ctx.restore();
}
