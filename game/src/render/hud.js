// The match HUD: scoreboard, the Open's win/lose line, rival card, the shot panel (weight, turn,
// release needle, sweep), the full-sheet map, shot calls and the end summary.

import { VIEW, SHEET, THROW, PALETTE, MATCH, SCORE } from '../config.js';
import { TAU } from '../geometry.js';
import { RIVALS } from '../rivals.js';
import { currentTeam, stonesLeft, total } from '../match.js';
import { weightName } from '../scenes/play.js';
import { kitItems } from '../tournament.js';
import { panel, text, chip, bar, keycap, roundRect, formatScore, FONT_TITLE } from './ui.js';
import { drawStone, teamColours } from './stones.js';
import { drawKitIcon, trophy } from './icons.js';

const BOTTOM = 620;

export function drawMatchHud(ctx, scene, time, best) {
  const m = scene.match;
  drawScoreboard(ctx, m);
  drawOpenStrip(ctx, scene.run, m);
  drawScorePanel(ctx, scene.run, best, m);
  drawRivalCard(ctx, m);
  drawShotPanel(ctx, scene, time);
  drawSheetMap(ctx, m);
  if (m.lastCall && m.phase === 'settle') drawCall(ctx, m.lastCall, m);
  if (m.phase === 'endScore' && m.endResult) drawEndSummary(ctx, m, time);
  if (m.phase === 'over') drawMatchOver(ctx, scene, time);
  if (scene.intro > 0) drawIntro(ctx, scene);
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
    drawStone(ctx, x + 22, ry - 5, 0.4, [c0, c1], { radius: 11 });
    text(ctx, teamName(m, team), x + 40, ry, { size: 15, weight: 900, color: PALETTE.ink });
    if (m.hammer === team && m.phase !== 'over') drawHammer(ctx, x + 146, ry - 6);
    m.scores[team].forEach((pts, i) => {
      const cx = x + 168 + i * cell + cell / 2;
      text(ctx, String(pts), cx, ry, { size: 18, weight: 900, align: 'center', color: pts > 0 ? c0 : 'rgba(29,42,58,0.3)' });
    });
    roundRect(ctx, x + w - 50, ry - 21, 40, 28, 8);
    ctx.fillStyle = c0;
    ctx.fill();
    text(ctx, String(total(m, team)), x + w - 30, ry, { size: 20, weight: 900, align: 'center', color: '#ffffff' });
  });
}

function drawHammer(ctx, x, y) {
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
  text(ctx, `MATCH ${run.round + 1} OF ${RIVALS.length} · ${m.venue.name.toUpperCase()}`, x + 16, 32, { size: 13, weight: 900, color: PALETTE.accent });
  chip(ctx, 'WIN', x + 16, 55, { fill: PALETTE.good, size: 11, h: 20 });
  text(ctx, 'beat all 6 rinks and take the Open', x + 64, 60, { size: 13, weight: 700 });
  chip(ctx, 'LOSE', x + 16, 81, { fill: PALETTE.bad, size: 11, h: 20 });
  text(ctx, `${MATCH.lossesAllowed} match losses`, x + 68, 86, { size: 13, weight: 700 });
  for (let i = 0; i < MATCH.lossesAllowed; i++) {
    const cx = x + 184 + i * 20;
    ctx.fillStyle = i < run.losses ? PALETTE.bad : 'rgba(29,42,58,0.15)';
    ctx.beginPath();
    ctx.arc(cx, 81, 7, 0, TAU);
    ctx.fill();
  }
  text(ctx, run.losses ? `${run.losses} used` : 'none yet', x + 230, 86, { size: 12, weight: 800, color: run.losses ? PALETTE.bad : PALETTE.inkSoft });
}

function drawScorePanel(ctx, run, best, m) {
  const x = 734;
  const w = 150;
  panel(ctx, x, 10, w, 90);
  if (m.streak >= 2) {
    chip(ctx, `HOT STREAK x${Math.min(SCORE.streakMax, m.streak)}`, x + w / 2, 30, { align: 'center', fill: PALETTE.player, size: 11, h: 20 });
  } else {
    text(ctx, 'SCORE', x + w / 2, 32, { size: 12, weight: 900, align: 'center', color: PALETTE.inkSoft });
  }
  text(ctx, formatScore(run.score), x + w / 2, 66, { size: 30, weight: 900, align: 'center', color: PALETTE.ink, font: FONT_TITLE });
  text(ctx, `BEST ${formatScore(Math.max(best, run.score))}`, x + w / 2, 88, { size: 11, weight: 800, align: 'center', color: PALETTE.inkSoft });
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
  chip(ctx, r.style.toUpperCase(), x + w - 12, 49, { align: 'right', fill: r.dark, size: 10, h: 18 });
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
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(tx + 16, BOTTOM + 56, 12, -2.4, 0.9, t < 0);
  ctx.stroke();
  text(ctx, t > 0 ? 'CLOCKWISE' : 'COUNTER', tx + 36, BOTTOM + 54, { size: 12, weight: 900, color: PALETTE.accent });
  text(ctx, t > 0 ? 'curls down' : 'curls up', tx + 36, BOTTOM + 70, { size: 11, weight: 700, color: PALETTE.inkSoft });

  // Release needle (while aiming) or sweep stamina (while running).
  const nx = 580;
  const cw = 268;
  if (m.phase === 'running') {
    text(ctx, 'SWEEP', nx, BOTTOM + 22, { size: 12, weight: 900, color: PALETTE.inkSoft });
    keycap(ctx, 'HOLD SPACE', nx + 52, BOTTOM + 23, { size: 10 });
    const max = THROW.sweepStamina * (m.shot?.team === 'player' ? m.kit.stamina : 1.2);
    bar(ctx, nx, BOTTOM + 42, cw, 20, m.stamina / max, scene.sweeping ? '#2fa86b' : '#6fa8dc');
    text(ctx, scene.sweeping ? 'SWEEPING! farther and straighter' : m.shot?.team === 'player' ? 'Hold SPACE or the mouse to sweep' : `${m.rival.short} sweepers ready`, nx, BOTTOM + 84, { size: 12, weight: 800, color: scene.sweeping ? PALETTE.good : PALETTE.inkSoft });
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
  ctx.fillStyle = '#eef6fc';
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
  const scale = 1 + Math.max(0, 0.25 - t) * 1.6;
  const colour = call.tone === 'great' ? PALETTE.gold : call.tone === 'good' ? PALETTE.accent : call.tone === 'bad' ? PALETTE.bad : PALETTE.inkSoft;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(640, 200);
  ctx.scale(scale, scale);
  const who = call.team === 'player' ? '' : `${m.rival.short}: `;
  text(ctx, who + call.text, 0, 0, { size: 46, weight: 900, align: 'center', color: colour, outline: '#ffffff', outlineWidth: 10, font: FONT_TITLE });
  text(ctx, call.sub + (call.perfect ? ' · PERFECT RELEASE' : ''), 0, 30, { size: 16, weight: 800, align: 'center', color: PALETTE.ink, outline: '#ffffff', outlineWidth: 6 });
  if (call.team === 'player' && call.streak > 1) {
    chip(ctx, `HOT STREAK x${call.streak} · POINTS x${call.streak}`, 0, 62, { align: 'center', fill: PALETTE.player, size: 14, h: 26 });
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
  panel(ctx, x, y, w, 120, { stroke: r.team ? teamColours(r.team, m.rival)[0] : PALETTE.panelEdge, lineWidth: 4 });
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
  ctx.fillStyle = 'rgba(29,42,58,0.35)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const w = 560;
  const x = (VIEW.w - w) / 2;
  const y = 190;
  panel(ctx, x, y, w, 230, { stroke: won ? PALETTE.good : PALETTE.bad, lineWidth: 4 });
  if (won) trophy(ctx, VIEW.w / 2, y + 52, 54);
  text(ctx, won ? 'MATCH WON!' : 'MATCH LOST', VIEW.w / 2, y + (won ? 120 : 80), { size: 48, weight: 900, align: 'center', color: won ? PALETTE.good : PALETTE.bad, font: FONT_TITLE });
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
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(0, 230, VIEW.w, 190);
  text(ctx, `MATCH ${scene.run.round + 1}${m.rival.champion ? ' · THE FINAL' : ''}`, VIEW.w / 2, 272, { size: 18, weight: 900, align: 'center', color: PALETTE.accent });
  text(ctx, `vs ${m.rival.name}`, VIEW.w / 2, 324, { size: 46, weight: 900, align: 'center', color: PALETTE.ink, font: FONT_TITLE });
  text(ctx, `${m.venue.name} · ${m.venue.note}`, VIEW.w / 2, 358, { size: 17, weight: 700, align: 'center', color: PALETTE.inkSoft });
  text(ctx, m.hammer === 'player' ? 'You have the hammer: last stone of the end' : `${m.rival.short} have the hammer. You throw first.`, VIEW.w / 2, 392, { size: 15, weight: 800, align: 'center', color: m.hammer === 'player' ? PALETTE.good : PALETTE.player });
  ctx.restore();
}
