// The painted sprites in game/assets (cut from the design sheets by tools/sprites.mjs): the curlers,
// the logo and the glow effects. Everything else in Frosthouse is drawn in code.

const NAMES = [
  'logo',
  'idle_blue', 'idle_yellow', 'thumbs_blue', 'idle_goggles', 'idle_red', 'idle_pink', 'idle_teal', 'idle_green', 'thumbs_navy',
  'cheer_blue', 'cheer_green', 'cheer_pink', 'cheer_green2', 'fist_green', 'crouch_yellow',
  'sweep_blue', 'sweep_blue2', 'sweep_red', 'sweep_red2', 'skip_red', 'skip_blue',
  'spark_a', 'spark_b', 'spark_star', 'ring_a', 'ring_b', 'confetti', 'snowflake', 'star', 'sparkles', 'shards',
  'trail_ice', 'trail_cyan', 'trail_gold', 'trail_violet',
];

const cache = {};

export function loadSprites(base = 'assets/') {
  return Promise.all(NAMES.map((n) => new Promise((done) => {
    const im = new Image();
    im.onload = () => { cache[n] = im; done(); };
    im.onerror = () => done();
    im.src = `${base}${n}.png`;
  })));
}

export const hasSprite = (name) => !!cache[name];

// Draw a sprite `h` pixels tall. Anchor (ax, ay) is a fraction of its box: the default is its feet.
export function drawSprite(ctx, name, x, y, h, o = {}) {
  const im = cache[name];
  if (!im) return false;
  const w = (im.width * h) / im.height;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.flip) ctx.scale(-1, 1);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.blend) ctx.globalCompositeOperation = o.blend;
  ctx.drawImage(im, -w * (o.ax ?? 0.5), -h * (o.ay ?? 1), w, h);
  ctx.restore();
  return true;
}

// Each rink on the ladder has a skip you can see; the player's own is the red jacket.
export const PORTRAIT = { player: 'idle_red', puffin: 'idle_yellow', ironwool: 'idle_pink', ravens: 'idle_blue', sleet: 'idle_teal', pines: 'idle_green', glacier: 'idle_goggles' };
export const portraitFor = (rival) => PORTRAIT[rival?.id] ?? ['idle_yellow', 'idle_pink', 'idle_blue', 'idle_teal', 'idle_green', 'idle_goggles'][(rival?.index ?? 0) % 6];
