// The painted sprites in game/assets (cut from the design sheets by tools/sprites.mjs): the curlers,
// the logo, the glow effects, the kit icons, medals, team crests, HUD icons, ice hazards and lake backdrops.

const NAMES = [
  'logo',
  'idle_blue', 'idle_yellow', 'thumbs_blue', 'idle_goggles', 'idle_red', 'idle_pink', 'idle_teal', 'idle_green', 'thumbs_navy',
  'cheer_blue', 'cheer_green', 'cheer_pink', 'cheer_green2', 'fist_green', 'crouch_yellow',
  'sweep_blue', 'sweep_blue2', 'sweep_red', 'sweep_red2', 'skip_red', 'skip_blue',
  'spark_a', 'spark_b', 'spark_star', 'ring_a', 'ring_b', 'confetti', 'snowflake', 'star', 'sparkles', 'shards',
  'trail_ice', 'trail_cyan', 'trail_gold', 'trail_violet',
  'kit_broom', 'kit_lungs', 'kit_hand', 'kit_eye', 'kit_granite', 'kit_grip', 'kit_silk', 'kit_mitten', 'kit_hammer',
  'kit_crowd', 'kit_nerves', 'kit_boots', 'kit_gloves', 'kit_tea',
  'grade_S', 'grade_A', 'grade_B', 'grade_C', 'grade_D', 'trophy_open', 'hammer_icon',
  'crest_player', 'crest_puffin', 'crest_ironwool', 'crest_ravens', 'crest_sleet', 'crest_pines', 'crest_glacier',
  'icon_eye', 'icon_broom', 'icon_turn_cw', 'icon_turn_ccw', 'aim_target', 'banner_open', 'hack',
  'hazard_drift_a', 'hazard_drift_b', 'hazard_drift_c', 'hazard_slush', 'hazard_wind',
  'skill_bolt', 'skill_thunder', 'skill_gale', 'skill_lock', 'el_fire', 'el_lightning', 'el_hail',
  'fx_lightning', 'fx_spear', 'fx_fireburst', 'fx_hailstone', 'fx_frostring',
  'wind_0', 'wind_1', 'wind_2', 'wind_3',
  'stone_ruby', 'stone_amber', 'stone_coral', 'stone_ivory', 'hero_ruby', 'hero_amber', 'hero_coral', 'hero_ivory',
  'bd_mirror.jpg', 'bd_pine.jpg', 'bd_windy.jpg', 'bd_thaw.jpg', 'bd_aurora.jpg',
];

const cache = {};

export function loadSprites(base = 'assets/') {
  return Promise.all(NAMES.map((file) => new Promise((done) => {
    const n = file.replace(/\.jpg$/, '');
    const im = new Image();
    im.onload = () => { cache[n] = im; done(); };
    im.onerror = () => done();
    im.src = `${base}${file.endsWith('.jpg') ? file : file + '.png'}`;
  })));
}

export const hasSprite = (name) => !!cache[name];

// A sprite pre-scaled once to `h` pixels tall (smooth downscale), for drawing many small copies fast.
const small = {};
export function spriteCanvas(name, h) {
  const key = `${name}@${h}`;
  if (small[key] !== undefined) return small[key];
  const im = cache[name];
  if (!im || typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.height = h;
  c.width = Math.max(1, Math.round((im.width * h) / im.height));
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  // Halve in steps so a large sprite stays crisp at crowd size.
  let src = im, w = im.width, hh = im.height;
  while (hh / 2 > h * 1.5) {
    const t = document.createElement('canvas');
    t.width = Math.round(w / 2); t.height = Math.round(hh / 2);
    t.getContext('2d').drawImage(src, 0, 0, t.width, t.height);
    src = t; w = t.width; hh = t.height;
  }
  g.drawImage(src, 0, 0, c.width, c.height);
  return (small[key] = c);
}

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
// Each rink's crest, and the colour of each kit icon's painted rim (cards glow to match).
export const crestFor = (rival) => `crest_${rival ? rival.id : 'player'}`;
export const KIT_RIM = { broom: '#5fb4ff', lungs: '#ffc23a', hand: '#ff4d6d', eye: '#5fb4ff', granite: '#ff4d6d', grip: '#ff4d6d', silk: '#5fb4ff', mitten: '#ffc23a', hammer: '#ffc23a', crowd: '#5fb4ff', nerves: '#ff4d6d', boots: '#5fb4ff', gloves: '#ffc23a', tea: '#ff4d6d' };

export const portraitFor = (rival) => PORTRAIT[rival?.id] ?? ['idle_yellow', 'idle_pink', 'idle_blue', 'idle_teal', 'idle_green', 'idle_goggles'][(rival?.index ?? 0) % 6];

// Stretch a sprite into a box centred on (cx, cy): ice hazards sized to the patch they mark.
export function drawSpriteBox(ctx, name, cx, cy, w, h, o = {}) {
  const im = cache[name];
  if (!im) return false;
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.flip) { ctx.translate(cx, cy); ctx.scale(-1, 1); ctx.translate(-cx, -cy); }
  ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  return true;
}

// Fill a box with an image cropped to fit (like CSS object-fit: cover); `fy` picks which band of a tall
// image stays in view (0 = its top, 1 = its bottom). Used for the lakes' painted backdrops.
export function drawCover(ctx, name, x, y, w, h, fy = 0.5, fx = 0.5) {
  const im = cache[name];
  if (!im) return false;
  const s = Math.max(w / im.width, h / im.height);
  const sw = w / s, sh = h / s;
  ctx.drawImage(im, (im.width - sw) * fx, (im.height - sh) * fy, sw, sh, x, y, w, h);
  return true;
}

// Like drawSpriteBox, but the left and right ends fade out over `fade` of the width, so a long strip
// (the slush lane) melts into the ice instead of ending in a hard edge. The faded copy is rendered once,
// masked by a smooth gradient, and cached by size.
const faded = {};
export function drawStripFaded(ctx, name, cx, cy, w, h, fade = 0.15, alpha = 1) {
  const im = cache[name];
  if (!im || typeof document === 'undefined') return false;
  const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h)), key = `${name}@${W}x${H}@${fade}`;
  let c = faded[key];
  if (!c) {
    c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0, W, H);
    const mask = g.createLinearGradient(0, 0, W, 0);
    mask.addColorStop(0, 'rgba(0,0,0,0)');
    mask.addColorStop(fade, 'rgba(0,0,0,1)');
    mask.addColorStop(1 - fade, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = mask;
    g.fillRect(0, 0, W, H);
    faded[key] = c;
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(c, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  return true;
}

// A sprite with all four edges feathered to nothing (for painted frames cropped tight to the cell),
// rendered once and cached. Returns a canvas, or null before the image has loaded.
const feathered = {};
export function featheredSprite(name, fx = 0.18, fy = 0.22) {
  const key = `${name}@${fx}@${fy}`;
  if (feathered[key]) return feathered[key];
  const im = cache[name];
  if (!im || typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  for (const [x1, y1, f] of [[c.width, 0, fx], [0, c.height, fy]]) {
    const m = g.createLinearGradient(0, 0, x1, y1);
    m.addColorStop(0, 'rgba(0,0,0,0)');
    m.addColorStop(f, 'rgba(0,0,0,1)');
    m.addColorStop(1 - f, 'rgba(0,0,0,1)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m;
    g.fillRect(0, 0, c.width, c.height);
  }
  return (feathered[key] = c);
}
