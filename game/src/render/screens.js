// Title sheet, clubhouse (ladder and kit picks), results card and pause overlay.
// Each screen records its clickable areas in `hits` so the scene can test the mouse against them.

import { VIEW, PALETTE, MATCH, SHEET } from '../config.js';
import { TAU } from '../geometry.js';
import { RIVALS } from '../rivals.js';
import { VENUES, venueById } from '../venues.js';
import { KIT } from '../kit.js';
import { DIFFICULTIES, kitItems, grade } from '../tournament.js';
import { panel, text, chip, button, hints, roundRect, inside, formatScore, FONT_TITLE, nightSky, callout, shade } from './ui.js';
import { drawSprite, hasSprite, portraitFor } from './sprites.js';
import { drawStone } from './stones.js';
import { drawKitIcon, trophy, star } from './icons.js';
import { drawBackdrop, drawSheet, drawSnowfall } from './ice.js';

function hit(hits, id, x, y, w, h) {
  hits.push({ id, x, y, w, h });
  return hits;
}

export function hovered(hits, mouse) {
  const h = hits.find((b) => inside(mouse.x, mouse.y, b.x, b.y, b.w, b.h));
  return h ? h.id : null;
}

function logo(ctx, x, y, size) {
  ctx.save();
  ctx.font = `900 ${size}px ${FONT_TITLE}`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.2;
  ctx.strokeStyle = PALETTE.ink;
  ctx.strokeText('FROSTHOUSE', x, y);
  const g = ctx.createLinearGradient(0, y - size, 0, y);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#bfe3ff');
  g.addColorStop(1, '#4fa3e8');
  ctx.fillStyle = g;
  ctx.fillText('FROSTHOUSE', x, y);
  ctx.restore();
}

// A fixed, pretty end in progress for the title background.
const DEMO = [
  ['player', 28.2, 0.12], ['rival', 27.75, -0.55], ['player', 28.9, 0.62], ['rival', 25.2, 0.05],
  ['player', 27.6, 0.35], ['rival', 29.3, -0.2], ['player', 24.9, -0.7],
];

export function drawTitle(ctx, state, time, save) {
  const hits = [];
  const cam = { x: 23.2 + Math.sin(time * 0.1) * 0.6 };
  const venue = VENUES[0];
  nightSky(ctx, VIEW.w, VIEW.h, time);
  drawSnowfall(ctx, time);
  // The home rink waits in the wings: a sweeper on the left, the skip calling the line on the right.
  drawSprite(ctx, 'sweep_red', 150, 190, 150);
  drawSprite(ctx, 'skip_red', 1128, 192, 160, { flip: true });

  if (!drawSprite(ctx, 'logo', VIEW.w / 2, 18, 112, { ay: 0 })) logo(ctx, VIEW.w / 2, 112, 92);
  text(ctx, 'A CURLING TOURNAMENT ON THE FROZEN LAKES', VIEW.w / 2, 154, { size: 17, weight: 900, align: 'center', color: '#8fd3ff' });
  text(ctx, '6 rival rinks · 5 frozen lakes · 14 kit upgrades · hot streaks to x4 · 3 difficulties', VIEW.w / 2, 178, { size: 15, weight: 700, align: 'center', color: PALETTE.inkSoft });

  // How the game works, as labelled rules.
  const rx = 40;
  const ry = 196;
  panel(ctx, rx, ry, 600, 300);
  const rules = [
    ['GOAL', PALETTE.accent, 'Win the Frost Lake Open: climb a ladder of six rinks.'],
    ['AIM', '#9b6ad6', 'Point the skip’s broom; pick a turn to bend the stone.'],
    ['WEIGHT', '#ff7a45', 'Guard, draw, tap, takeout or peel: set how hard.'],
    ['SWEEP', PALETTE.good, 'Hold to carry your stone farther and straighter.'],
    ['SCORE', PALETTE.gold, 'Your stones nearer the button than any of theirs count.'],
    ['WIN', PALETTE.good, 'Beat all six rinks, the Glacier last.'],
    ['LOSE', PALETTE.bad, `${MATCH.lossesAllowed} match losses and you are out of the Open.`],
  ];
  rules.forEach(([tag, col, line], i) => {
    const y = ry + 34 + i * 38;
    chip(ctx, tag, rx + 20, y, { fill: col, size: 12, h: 24, pad: 18 });
    text(ctx, line, rx + 116, y + 5, { size: 15, weight: 700 });
  });

  // Play, difficulty, records.
  const px0 = 664;
  panel(ctx, px0, ry, 576, 300);
  const hov = state.hover;
  button(ctx, 'PLAY', px0 + 24, ry + 22, 250, 76, { size: 40, hover: hov === 'play', fill: PALETTE.player });
  hit(hits, 'play', px0 + 24, ry + 22, 250, 76);
  text(ctx, 'CLICK PLAY OR PRESS ENTER', px0 + 150, ry + 122, { size: 12, weight: 900, align: 'center', color: PALETTE.inkSoft });
  chip(ctx, `BEST ${formatScore(save.best)}`, px0 + 300, ry + 44, { fill: PALETTE.ink, size: 14, h: 30 });
  chip(ctx, `TROPHIES ${save.trophies}`, px0 + 300, ry + 82, { fill: PALETTE.gold, color: PALETTE.ink, size: 14, h: 30 });
  if (save.runs) text(ctx, `${save.runs} runs played`, px0 + 450, ry + 87, { size: 12, weight: 700, color: PALETTE.inkSoft });
  DIFFICULTIES.forEach((d, i) => {
    const bx = px0 + 24 + i * 180;
    const by = ry + 146;
    const sel = state.difficulty === d.id;
    const face = ['#b8dcf5', '#2f6fd6', '#2a3a8c'][i];
    button(ctx, '', bx, by, 168, 64, { fill: face, hover: hov === `diff:${d.id}`, glow: sel, radius: 14 });
    const dark = i === 0;
    text(ctx, d.name, bx + 84, by + 30, { size: 21, weight: 900, align: 'center', color: dark ? '#14335c' : '#ffffff', font: FONT_TITLE, raw: true });
    text(ctx, d.note, bx + 84, by + 51, { size: 10, weight: 800, align: 'center', color: dark ? '#2b5684' : 'rgba(255,255,255,0.82)', raw: true });
    hit(hits, `diff:${d.id}`, bx, by, 168, 64);
  });
  text(ctx, 'LAST RUNS', px0 + 24, ry + 244, { size: 11, weight: 900, color: PALETTE.inkSoft });
  const last = save.lastRuns.length ? save.lastRuns : [{ outcome: null }];
  last.forEach((r, i) => {
    const label = r.outcome == null ? 'No runs yet: the lake is waiting' : r.outcome === 'champion' ? `CHAMPION · ${formatScore(r.score)}` : `OUT IN ROUND ${r.round + 1} · ${formatScore(r.score)}`;
    chip(ctx, label, px0 + 24 + i * 180, ry + 270, { fill: r.outcome === 'champion' ? PALETTE.good : r.outcome ? PALETTE.bad : '#3a4f78', size: 11, h: 24 });
  });

  // The rinks waiting on the ladder.
  panel(ctx, 40, 512, 1200, 120);
  text(ctx, 'THE LADDER', VIEW.w - 64, 538, { size: 12, weight: 900, color: PALETTE.inkSoft, align: 'right' });
  RIVALS.forEach((r, i) => {
    const cx = 120 + i * 196;
    if (!drawSprite(ctx, portraitFor(r), cx - 2, 628, 104)) drawStone(ctx, cx, 578, time * 0.5 + i, [r.colour, r.dark], { radius: 15 });
    drawStone(ctx, cx + 22, 612, time * 0.5 + i, [r.colour, r.dark], { radius: 10 });
    text(ctx, r.name, cx + 36, 572, { size: r.name.length > 16 ? 10.5 : 13, weight: 900 });
    text(ctx, `${venueById(r.venue).name} · ${r.style}`, cx + 36, 590, { size: 11, weight: 700, color: PALETTE.inkSoft });
    if (r.champion) trophy(ctx, cx + 150, 610, 22);
    for (let s = 0; s < 5; s++) {
      ctx.fillStyle = s < Math.round(r.skill * 5) ? '#ff9a2e' : 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.arc(cx + 40 + s * 12, 608, 4.5, 0, TAU);
      ctx.fill();
    }
  });

  hints(ctx, [['ENTER', 'play'], ['1-3', 'difficulty'], ['MOUSE', 'aim'], ['Q/E', 'turn'], ['W/S', 'weight'], ['HOLD CLICK', 'throw'], ['SPACE', 'sweep'], ['M', 'mute']], 44, 676, { size: 13 });
  return hits;
}

export function drawClubhouse(ctx, state, time, run) {
  const hits = [];
  nightSky(ctx, VIEW.w, VIEW.h, time);
  // Warm lamplight from the clubhouse windows over the cold night.
  const lamp = ctx.createRadialGradient(VIEW.w * 0.5, VIEW.h * 1.1, 40, VIEW.w * 0.5, VIEW.h * 1.1, VIEW.w * 0.75);
  lamp.addColorStop(0, 'rgba(255,170,80,0.22)');
  lamp.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  callout(ctx, 'THE CLUBHOUSE', 40, 66, 44, { align: 'left', tone: 'ice', sparkle: false });
  const lastWon = run.results[run.results.length - 1]?.won;
  drawSprite(ctx, lastWon ? 'cheer_blue' : 'crouch_yellow', 480, 112, 100);
  const last = run.results[run.results.length - 1];
  const sub = last ? (last.won ? `You beat ${RIVALS.find((r) => r.id === last.rival).name} ${last.p}–${last.r}.` : `Lost ${last.p}–${last.r}. One more loss and the Open is over.`) : '';
  text(ctx, sub, 40, 92, { size: 17, weight: 800, color: last?.won ? PALETTE.good : PALETTE.bad });
  chip(ctx, `SCORE ${formatScore(run.score)}`, VIEW.w - 40, 56, { align: 'right', fill: PALETTE.ink, size: 15, h: 32 });
  chip(ctx, `LOSSES ${run.losses} / ${MATCH.lossesAllowed}`, VIEW.w - 40, 94, { align: 'right', fill: run.losses ? PALETTE.bad : PALETTE.good, size: 13, h: 26 });

  // Ladder.
  panel(ctx, 40, 116, 400, 520);
  text(ctx, 'THE FROST LAKE OPEN', 60, 146, { size: 15, weight: 900, color: PALETTE.accent });
  RIVALS.forEach((r, i) => {
    const y = 178 + i * 76;
    const res = run.results.filter((x) => x.rival === r.id);
    const beaten = res.some((x) => x.won);
    const next = i === run.round;
    roundRect(ctx, 56, y - 14, 368, 64, 10);
    ctx.fillStyle = next ? 'rgba(80,150,255,0.28)' : beaten ? 'rgba(60,200,130,0.14)' : 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = next ? '#7cc4ff' : 'rgba(150,205,255,0.18)';
    ctx.lineWidth = next ? 3 : 1;
    if (next) { ctx.save(); ctx.shadowColor = '#4aa8ff'; ctx.shadowBlur = 14; ctx.stroke(); ctx.restore(); } else ctx.stroke();
    drawStone(ctx, 84, y + 18, i, [r.colour, r.dark], { radius: 15 });
    text(ctx, r.name, 110, y + 12, { size: 15, weight: 900 });
    text(ctx, `${venueById(r.venue).name} · ${r.style}`, 110, y + 32, { size: 12, weight: 700, color: PALETTE.inkSoft });
    const tag = beaten ? `WON ${res.find((x) => x.won).p}–${res.find((x) => x.won).r}` : next ? 'NEXT' : 'LOCKED';
    chip(ctx, tag, 412, y + 18, { align: 'right', fill: beaten ? PALETTE.good : next ? PALETTE.accent : '#4a5a78', size: 11, h: 22 });
    for (const lost of res.filter((x) => !x.won)) chip(ctx, `LOST ${lost.p}–${lost.r}`, 412, y + 44, { align: 'right', fill: PALETTE.bad, size: 9, h: 16 });
  });

  // Kit offer.
  panel(ctx, 464, 116, 776, 400);
  if (run.offer) {
    text(ctx, 'PICK YOUR KIT', 488, 150, { size: 22, weight: 900, font: FONT_TITLE });
    text(ctx, 'One upgrade for the rest of the Open. Click a card or press 1, 2 or 3.', 488, 174, { size: 14, weight: 700, color: PALETTE.inkSoft });
    run.offer.forEach((k, i) => {
      const x = 488 + i * 248;
      const y = 196;
      const hov = state.hover === `kit:${i}`;
      ctx.save();
      if (hov) ctx.translate(0, -6);
      const rim = ['#9fd0ff', '#ffc23a', '#ff4d6d'][i];
      panel(ctx, x, y, 232, 296, { glow: hov ? rim : shade(rim, -0.25), fillTop: 'rgba(70,90,130,0.92)', fill: 'rgba(30,40,66,0.94)' });
      const disc = ctx.createRadialGradient(x + 106, y + 60, 6, x + 116, y + 74, 52);
      disc.addColorStop(0, 'rgba(255,255,255,0.35)');
      disc.addColorStop(1, 'rgba(255,255,255,0.06)');
      roundRect(ctx, x + 66, y + 24, 100, 100, 50);
      ctx.fillStyle = disc;
      ctx.fill();
      drawKitIcon(ctx, k.icon, x + 116, y + 74, 64);
      text(ctx, k.name, x + 116, y + 160, { size: 20, weight: 900, align: 'center', font: FONT_TITLE });
      wrap(ctx, k.text, x + 116, y + 190, 196, 20, { size: 14, weight: 700, align: 'center', color: PALETTE.inkSoft });
      const owned = run.owned.filter((o) => o === k.id).length;
      chip(ctx, owned ? `LEVEL ${owned + 1} OF ${k.max}` : 'NEW', x + 116, y + 262, { align: 'center', fill: owned ? PALETTE.gold : PALETTE.good, color: owned ? PALETTE.ink : '#ffffff', size: 11 });
      text(ctx, String(i + 1), x + 18, y + 30, { size: 18, weight: 900, color: PALETTE.inkSoft });
      ctx.restore();
      hit(hits, `kit:${i}`, x, y, 232, 296);
    });
  } else {
    const rival = RIVALS[run.round];
    text(ctx, 'REMATCH', 488, 158, { size: 30, weight: 900, font: FONT_TITLE, color: PALETTE.bad });
    wrap(ctx, `The ${rival.name} are waiting on ${venueById(rival.venue).name}. Win it and the ladder opens again. Lose it and the Open is over.`, 488, 196, 700, 22, { size: 17, weight: 700 });
    drawStone(ctx, 860, 360, time, [rival.colour, rival.dark], { radius: 40 });
    text(ctx, `“${rival.motto}”`, 852, 420, { size: 16, weight: 600, align: 'center', font: 'Georgia, serif', color: PALETTE.inkSoft });
  }

  // Current kit.
  panel(ctx, 464, 532, 776, 104);
  text(ctx, 'YOUR KIT', 488, 560, { size: 12, weight: 900, color: PALETTE.inkSoft });
  const items = kitItems(run);
  if (!items.length) text(ctx, 'Nothing yet but a borrowed broom.', 488, 600, { size: 15, weight: 700, color: PALETTE.inkSoft });
  items.forEach(({ item, count }, i) => {
    const x = 500 + i * 92;
    drawKitIcon(ctx, item.icon, x + 16, 594, 34);
    text(ctx, item.name.split(' ')[0], x + 16, 626, { size: 10, weight: 800, align: 'center', color: PALETTE.inkSoft });
    if (count > 1) chip(ctx, `x${count}`, x + 40, 578, { fill: PALETTE.gold, color: PALETTE.ink, size: 10, h: 16, pad: 8 });
  });

  if (!run.offer) {
    const hov = state.hover === 'continue';
    button(ctx, 'NEXT MATCH', 900, 560, 320, 64, { size: 26, hover: hov, fill: PALETTE.player });
    hit(hits, 'continue', 900, 560, 320, 64);
  }
  hints(ctx, run.offer ? [['1/2/3', 'pick kit'], ['ESC', 'title']] : [['ENTER', 'next match'], ['ESC', 'title']], 44, 690, { size: 13 });
  return hits;
}

export function drawResults(ctx, state, time, run, saveInfo) {
  const hits = [];
  const champ = run.outcome === 'champion';
  nightSky(ctx, VIEW.w, VIEW.h, time);
  if (champ) {
    for (let i = 0; i < 6; i++) drawSprite(ctx, i % 2 ? 'confetti' : 'sparkles', 120 + i * 210, 40 + (i % 3) * 40, 150, { ay: 0, rot: i * 0.6, alpha: 0.9 });
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + time * 60) % VIEW.w;
      const y = (i * 53 + time * (40 + (i % 5) * 12)) % VIEW.h;
      star(ctx, x, y, 4 + (i % 3) * 2, ['#ff4d6d', '#4aa8ff', '#3ddc97', '#ffc23a'][i % 4]);
    }
  }

  const head = champ ? 'CHAMPIONS OF THE OPEN!' : `KNOCKED OUT IN ROUND ${run.round + 1}`;
  callout(ctx, head, VIEW.w / 2, 96, 66, { tone: champ ? 'gold' : 'ice' });

  // Left column: the trophy (or the rink that beat you) and your kit.
  panel(ctx, 24, 138, 330, 500);
  if (champ) {
    const glow = ctx.createRadialGradient(189, 230, 10, 189, 230, 130);
    glow.addColorStop(0, 'rgba(255,200,60,0.45)');
    glow.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(40, 140, 300, 220);
    trophy(ctx, 189, 240, 140);
    drawSprite(ctx, 'cheer_blue', 82, 330, 150);
    drawSprite(ctx, 'cheer_pink', 300, 330, 140);
    text(ctx, 'The Frost Lake Open is yours', 189, 340, { size: 17, weight: 900, align: 'center' });
  } else {
    const by = RIVALS[Math.min(run.round, RIVALS.length - 1)];
    if (!drawSprite(ctx, portraitFor(by), 189, 284, 140)) drawStone(ctx, 189, 230, time, [by.colour, by.dark], { radius: 44 });
    text(ctx, `Beaten by ${by.name}`, 189, 300, { size: 16, weight: 900, align: 'center' });
    text(ctx, `“${by.motto}”`, 189, 326, { size: 13, weight: 600, align: 'center', font: 'Georgia, serif', color: PALETTE.inkSoft });
  }
  text(ctx, `YOUR KIT (${run.owned.length} picked)`, 44, 376, { size: 12, weight: 900, color: PALETTE.inkSoft });
  const items = kitItems(run);
  if (!items.length) text(ctx, 'No kit picked this run', 44, 404, { size: 14, weight: 700, color: PALETTE.inkSoft });
  items.slice(0, 8).forEach(({ item, count }, i) => {
    const x = 44 + (i % 2) * 150;
    const y = 404 + Math.floor(i / 2) * 40;
    drawKitIcon(ctx, item.icon, x + 14, y, 26);
    text(ctx, item.name + (count > 1 ? ` x${count}` : ''), x + 34, y + 5, { size: 13, weight: 800 });
  });

  // Right: grade, score, tiles.
  panel(ctx, 370, 138, 886, 500);
  const gr = grade(run);
  ctx.fillStyle = gr === 'S' || gr === 'A' ? PALETTE.gold : PALETTE.accent;
  ctx.beginPath();
  ctx.arc(450, 214, 52, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#fff4c2';
  ctx.lineWidth = 4;
  ctx.save(); ctx.shadowColor = 'rgba(255,200,60,0.8)'; ctx.shadowBlur = 20; ctx.stroke(); ctx.restore();
  text(ctx, gr, 450, 236, { size: 62, weight: 900, align: 'center', color: '#ffffff', font: FONT_TITLE });
  text(ctx, 'SCORE', 524, 182, { size: 13, weight: 900, color: PALETTE.inkSoft });
  text(ctx, formatScore(run.score), 522, 246, { size: 64, weight: 900, color: PALETTE.ink, font: FONT_TITLE });
  if (saveInfo.newBest) chip(ctx, 'NEW BEST!', 1232, 196, { align: 'right', fill: PALETTE.good, size: 18, h: 36 });
  else chip(ctx, `BEST ${formatScore(saveInfo.best)}`, 1232, 196, { align: 'right', fill: PALETTE.ink, size: 14, h: 30 });

  const s = run.stats;
  const won = run.results.filter((r) => r.won).length;
  const tiles = [
    ['MATCHES', `${won} / ${run.results.length}`, PALETTE.accent],
    ['ENDS WON', `${s.endsWon} / ${s.ends}`, '#9b6ad6'],
    ['POINTS', `${s.pointsFor} – ${s.pointsAgainst}`, PALETTE.player],
    ['PERFECT RELEASES', String(s.perfects), PALETTE.good],
    ['TAKEOUTS', String(s.takeouts), '#ff7a45'],
    ['ON THE BUTTON', String(s.buttons), PALETTE.gold],
    ['BEST STREAK', `x${Math.min(4, Math.max(1, s.bestStreak ?? 0))}`, '#7f95ad'],
    ['BEST SHOT', s.bestCall ? s.bestCall.text.replace('!', '') : '—', PALETTE.ink],
  ];
  tiles.forEach(([label, value, col], i) => {
    const x = 394 + (i % 4) * 212;
    const y = 290 + Math.floor(i / 4) * 92;
    button(ctx, '', x, y, 200, 80, { fill: col === PALETTE.ink ? '#24345c' : col, radius: 12 });
    text(ctx, label, x + 100, y + 26, { size: 12, weight: 900, align: 'center', color: 'rgba(255,255,255,0.85)' });
    text(ctx, value, x + 100, y + 62, { size: value.length > 10 ? 18 : 28, weight: 900, align: 'center', color: '#ffffff' });
  });

  const hov = state.hover;
  button(ctx, 'R · PLAY AGAIN', 394, 484, 420, 76, { size: 32, hover: hov === 'again', fill: PALETTE.player });
  hit(hits, 'again', 394, 484, 420, 76);
  button(ctx, 'ESC · TITLE', 834, 484, 200, 76, { size: 22, hover: hov === 'title', fill: '#2a3a6c' });
  hit(hits, 'title', 834, 484, 200, 76);
  const goal = champ ? (run.difficulty === 'champion' ? 'NEXT GOAL: an S grade on CHAMPION' : 'NEXT GOAL: win on CHAMPION difficulty') : `NEXT GOAL: get past ${RIVALS[Math.min(run.round, RIVALS.length - 1)].name}`;
  text(ctx, goal, 1232, 600, { size: 13, weight: 900, color: '#ffb35c', align: 'right' });
  text(ctx, `${run.difficulty.toUpperCase()} · seed ${run.seed}`, 1232, 622, { size: 11, weight: 700, color: PALETTE.inkSoft, align: 'right' });
  text(ctx, 'M · MUTE', 1146, 528, { size: 13, weight: 900, color: PALETTE.inkSoft, align: 'center' });
  const lr = saveInfo.lastRuns ?? [];
  text(ctx, 'LAST RUNS', 394, 598, { size: 11, weight: 900, color: PALETTE.inkSoft });
  let lx = 470;
  lr.forEach((r) => {
    lx += chip(ctx, r.outcome === 'champion' ? `CHAMPION ${formatScore(r.score)}` : `OUT R${r.round + 1} · ${formatScore(r.score)}`, lx, 594, { fill: r.outcome === 'champion' ? PALETTE.good : PALETTE.bad, size: 11, h: 22 }) + 8;
  });

  // The road through the ladder, match by match.
  text(ctx, 'ROAD THROUGH THE OPEN', 44, 548, { size: 12, weight: 900, color: PALETTE.inkSoft });
  run.results.slice(-8).forEach((res, i) => {
    const rv = RIVALS.find((r) => r.id === res.rival);
    const x = 44 + (i % 2) * 150;
    const y = 572 + Math.floor(i / 2) * 22;
    chip(ctx, `${res.won ? 'W' : 'L'} ${res.p}–${res.r} ${rv.short}`, x, y, { fill: res.won ? PALETTE.good : PALETTE.bad, size: 10, h: 18, pad: 12 });
  });
  return hits;
}

export function drawPause(ctx, state) {
  const hits = [];
  ctx.fillStyle = 'rgba(29,42,58,0.55)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  panel(ctx, 390, 150, 500, 420);
  text(ctx, 'PAUSED', 640, 214, { size: 50, weight: 900, align: 'center', font: FONT_TITLE });
  const rows = [
    ['MOUSE', 'move the skip’s broom (your aim)'],
    ['W / S · WHEEL', 'set the weight · 1-5 presets'],
    ['Q / E · RIGHT CLICK', 'turn the stone'],
    ['HOLD CLICK · SPACE', 'start the release, let go on PERFECT'],
    ['HOLD SPACE · CLICK', 'sweep the running stone'],
    ['M', 'mute sound'],
  ];
  rows.forEach(([k, v], i) => {
    chip(ctx, k, 420, 262 + i * 36, { fill: PALETTE.ink, size: 11, h: 24 });
    text(ctx, v, 590, 267 + i * 36, { size: 14, weight: 700 });
  });
  button(ctx, 'RESUME', 420, 488, 210, 58, { size: 24, hover: state.hover === 'resume', fill: PALETTE.good });
  hit(hits, 'resume', 420, 488, 210, 58);
  button(ctx, 'QUIT RUN', 650, 488, 210, 58, { size: 24, hover: state.hover === 'quit', fill: PALETTE.bad });
  hit(hits, 'quit', 650, 488, 210, 58);
  return hits;
}

function wrap(ctx, str, x, y, maxW, lineH, opts) {
  ctx.font = `${opts.weight ?? 700} ${opts.size ?? 14}px system-ui, sans-serif`;
  const words = str.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      text(ctx, line, x, yy, opts);
      line = w;
      yy += lineH;
    } else line = test;
  }
  if (line) text(ctx, line, x, yy, opts);
}

export { KIT };
