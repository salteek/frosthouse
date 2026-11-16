// Kit upgrades: after every match won, the rink picks one of three. The build changes how you throw.

export const KIT = [
  { id: 'birch', name: 'Birch Broom', icon: 'broom', max: 2, text: 'Sweeping carries the stone 30% farther.',
    apply: (k) => { k.sweepPower *= 1.3; } },
  { id: 'lungs', name: 'Deep Lungs', icon: 'lungs', max: 2, text: '+45% sweeping stamina per stone.',
    apply: (k) => { k.stamina *= 1.45; } },
  { id: 'steady', name: 'Steady Hand', icon: 'hand', max: 2, text: 'The release needle swings 30% slower.',
    apply: (k) => { k.needle *= 1.3; } },
  { id: 'eye', name: "Skip's Eye", icon: 'eye', max: 2, text: 'The path preview reaches 35% farther.',
    apply: (k) => { k.preview *= 1.35; } },
  { id: 'granite', name: 'Ailsa Granite', icon: 'granite', max: 1, text: 'Your stones are 25% heavier: they hit hard and hold ground.',
    apply: (k) => { k.mass *= 1.25; } },
  { id: 'grip', name: 'Grippy Handle', icon: 'grip', max: 2, text: 'Your stones curl 20% more.',
    apply: (k) => { k.curl *= 1.2; } },
  { id: 'silk', name: 'Silk Slider', icon: 'silk', max: 1, text: 'Your stones glide 5% farther on any ice.',
    apply: (k) => { k.friction *= 0.95; } },
  { id: 'mitten', name: 'Lucky Mitten', icon: 'mitten', max: 1, text: 'Your first throw of every end is a perfect release.',
    apply: (k) => { k.mitten = true; } },
  { id: 'hammer', name: 'Hammer Charm', icon: 'hammer', max: 1, text: 'You start every match with the hammer (last stone).',
    apply: (k) => { k.startHammer = true; } },
  { id: 'crowd', name: 'Crowd Favourite', icon: 'crowd', max: 2, text: '+40% score from every point and shot call.',
    apply: (k) => { k.scoreMul *= 1.4; } },
  { id: 'nerves', name: 'Trash Talk', icon: 'nerves', max: 2, text: 'Rival throws wobble 15% more.',
    apply: (k) => { k.rivalNerves *= 1.15; } },
  { id: 'boots', name: 'Pebble Boots', icon: 'boots', max: 2, text: 'The perfect-release zone is 40% wider.',
    apply: (k) => { k.perfect *= 1.4; } },
  { id: 'gloves', name: 'Warm Gloves', icon: 'gloves', max: 1, text: 'Sweeping also straightens the curl 40% more.',
    apply: (k) => { k.sweepStraighten *= 0.6; } },
  { id: 'tea', name: 'Thermos of Tea', icon: 'tea', max: 1, text: 'Once per match, a lost end counts as a blank.',
    apply: (k) => { k.tea = true; } },
];

export function freshKit() {
  return {
    sweepPower: 1, stamina: 1, needle: 1, preview: 1, mass: 1, curl: 1, friction: 1,
    mitten: false, startHammer: false, scoreMul: 1, rivalNerves: 1, perfect: 1, sweepStraighten: 1, tea: false,
  };
}

export const kitCount = (owned, id) => owned.filter((o) => o === id).length;

export function offerKit(owned, rng) {
  const pool = KIT.filter((k) => kitCount(owned, k.id) < k.max);
  const offer = [];
  while (offer.length < 3 && offer.length < pool.length) {
    const k = rng.pick(pool);
    if (!offer.includes(k)) offer.push(k);
  }
  return offer;
}
