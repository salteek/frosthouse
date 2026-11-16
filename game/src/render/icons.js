// Small vector icons for kit upgrades, so the game ships no image files.

import { TAU } from '../geometry.js';

const C = {
  wood: '#a8743f', woodDark: '#6b4a2b', red: '#e0383e', blue: '#2f6fd6', gold: '#f2b53a',
  ink: '#1d2a3a', grey: '#8a8f99', light: '#d5dbe3', green: '#2fa86b', skin: '#f3d2b5', white: '#ffffff',
};

export function drawKitIcon(ctx, icon, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.08);
  switch (icon) {
    case 'broom':
      line(ctx, -s * 0.8, s * 0.8, s * 0.35, -s * 0.35, C.wood);
      ctx.fillStyle = C.red;
      ctx.save();
      ctx.translate(s * 0.45, -s * 0.45);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(-s * 0.55, -s * 0.18, s * 1.1, s * 0.4);
      ctx.restore();
      break;
    case 'lungs':
      blob(ctx, -s * 0.32, 0, s * 0.3, s * 0.55, C.red);
      blob(ctx, s * 0.32, 0, s * 0.3, s * 0.55, C.red);
      line(ctx, 0, -s * 0.8, 0, -s * 0.2, C.ink);
      break;
    case 'hand':
      blob(ctx, 0, s * 0.15, s * 0.5, s * 0.55, C.skin);
      for (let i = 0; i < 4; i++) line(ctx, -s * 0.3 + i * s * 0.2, -s * 0.2, -s * 0.3 + i * s * 0.2, -s * 0.8, C.skin);
      line(ctx, -s * 0.85, -s * 0.1, -s * 0.55, -s * 0.1, C.blue);
      line(ctx, s * 0.55, -s * 0.1, s * 0.85, -s * 0.1, C.blue);
      break;
    case 'eye':
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.85, s * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      dot(ctx, 0, 0, s * 0.3, C.blue);
      dot(ctx, 0, 0, s * 0.13, C.ink);
      break;
    case 'granite':
      dot(ctx, 0, s * 0.1, s * 0.75, C.grey);
      dot(ctx, 0, s * 0.1, s * 0.45, C.red);
      ctx.fillStyle = C.ink;
      ctx.fillRect(-s * 0.12, -s * 0.25, s * 0.24, s * 0.7);
      break;
    case 'grip':
      ctx.strokeStyle = C.blue;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.65, -2.6, 0.9);
      ctx.stroke();
      dot(ctx, Math.cos(0.9) * s * 0.65, Math.sin(0.9) * s * 0.65, s * 0.15, C.blue);
      dot(ctx, 0, 0, s * 0.25, C.red);
      break;
    case 'silk':
      ctx.strokeStyle = '#9b6ad6';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.85, -s * 0.4 + i * s * 0.4);
        ctx.quadraticCurveTo(0, -s * 0.7 + i * s * 0.4, s * 0.85, -s * 0.4 + i * s * 0.4);
        ctx.stroke();
      }
      break;
    case 'mitten':
      blob(ctx, 0, s * 0.1, s * 0.5, s * 0.65, C.red);
      blob(ctx, -s * 0.5, -s * 0.05, s * 0.18, s * 0.3, C.red);
      ctx.fillStyle = C.white;
      ctx.fillRect(-s * 0.5, s * 0.55, s, s * 0.22);
      star(ctx, 0, 0, s * 0.22, C.gold);
      break;
    case 'hammer':
      ctx.fillStyle = C.grey;
      ctx.fillRect(-s * 0.6, -s * 0.75, s * 1.2, s * 0.45);
      line(ctx, 0, -s * 0.3, 0, s * 0.85, C.wood);
      break;
    case 'crowd':
      for (let i = 0; i < 3; i++) {
        const cx = -s * 0.55 + i * s * 0.55;
        dot(ctx, cx, -s * 0.2, s * 0.2, C.skin);
        blob(ctx, cx, s * 0.35, s * 0.26, s * 0.3, [C.red, C.blue, C.gold][i]);
      }
      star(ctx, 0, -s * 0.75, s * 0.18, C.gold);
      break;
    case 'nerves':
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const xx = -s * 0.85 + i * s * 0.21;
        const yy = (i % 2 ? -1 : 1) * s * 0.35;
        if (i === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      break;
    case 'boots':
      ctx.fillStyle = C.woodDark;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.8);
      ctx.lineTo(s * 0.1, -s * 0.8);
      ctx.lineTo(s * 0.1, s * 0.2);
      ctx.lineTo(s * 0.8, s * 0.35);
      ctx.lineTo(s * 0.8, s * 0.7);
      ctx.lineTo(-s * 0.5, s * 0.7);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 4; i++) dot(ctx, -s * 0.35 + i * s * 0.33, s * 0.82, s * 0.07, C.light);
      break;
    case 'gloves':
      blob(ctx, -s * 0.3, 0, s * 0.35, s * 0.55, C.blue);
      blob(ctx, s * 0.3, 0, s * 0.35, s * 0.55, C.blue);
      ctx.fillStyle = C.white;
      ctx.fillRect(-s * 0.7, s * 0.4, s * 1.4, s * 0.2);
      break;
    case 'tea':
      ctx.fillStyle = C.green;
      ctx.fillRect(-s * 0.35, -s * 0.55, s * 0.7, s * 1.3);
      ctx.fillStyle = C.ink;
      ctx.fillRect(-s * 0.3, -s * 0.8, s * 0.6, s * 0.25);
      for (let i = 0; i < 2; i++) {
        ctx.strokeStyle = 'rgba(120,140,160,0.8)';
        ctx.beginPath();
        ctx.moveTo(-s * 0.1 + i * s * 0.25, -s * 0.85);
        ctx.quadraticCurveTo(s * 0.1 + i * s * 0.25, -s * 1.05, -s * 0.05 + i * s * 0.25, -s * 1.2);
        ctx.stroke();
      }
      break;
    default:
      dot(ctx, 0, 0, s * 0.5, C.gold);
  }
  ctx.restore();
}

function line(ctx, x0, y0, x1, y1, color) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function dot(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function blob(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

export function star(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

export function trophy(ctx, x, y, size, color = C.gold) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-s * 0.6, -s * 0.8);
  ctx.lineTo(s * 0.6, -s * 0.8);
  ctx.quadraticCurveTo(s * 0.6, s * 0.1, 0, s * 0.2);
  ctx.quadraticCurveTo(-s * 0.6, s * 0.1, -s * 0.6, -s * 0.8);
  ctx.fill();
  ctx.fillRect(-s * 0.1, s * 0.15, s * 0.2, s * 0.4);
  ctx.fillRect(-s * 0.45, s * 0.55, s * 0.9, s * 0.25);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.14);
  ctx.beginPath();
  ctx.arc(-s * 0.62, -s * 0.45, s * 0.25, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(s * 0.62, -s * 0.45, s * 0.25, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.restore();
}
