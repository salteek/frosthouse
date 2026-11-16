// The frozen lakes of the Frost Lake Open. Each plays differently: drifts, wind, slush, glassy ice.

export const VENUES = [
  {
    id: 'mirror', name: 'Mirror Lake', note: 'Clean, honest ice. Learn the curl here.',
    friction: 1, curl: 1, wind: 0, patches: [], tint: '#eaf4fb', time: 'morning',
  },
  {
    id: 'pine', name: 'Pine Hollow', note: 'Snow drifts slow any stone that crosses them.',
    friction: 1, curl: 1.05, wind: 0,
    patches: [
      { x: 17.5, y: 1.15, rx: 1.6, ry: 0.55, kind: 'snow', drag: 2.6 },
      { x: 24.6, y: -1.35, rx: 1.2, ry: 0.5, kind: 'snow', drag: 2.6 },
    ],
    tint: '#e8f2f8', time: 'noon',
  },
  {
    id: 'windy', name: 'Windy Point', note: 'A crosswind pushes every stone toward the far bank.',
    friction: 0.97, curl: 0.95, wind: 0.0022, patches: [], tint: '#e5f1fa', time: 'afternoon',
  },
  {
    id: 'thaw', name: 'Thawing Bay', note: 'A slush lane down the middle. Heavy, grabby ice.',
    friction: 1.06, curl: 1.25, wind: 0,
    patches: [{ x: 14, y: 0, rx: 6.5, ry: 0.42, kind: 'slush', drag: 1.9 }],
    tint: '#e6f0f3', time: 'afternoon',
  },
  {
    id: 'aurora', name: 'Aurora Basin', note: 'Glass-fast ice under the evening sky. Huge curl.',
    friction: 0.9, curl: 1.4, wind: -0.0012, patches: [], tint: '#eef0fb', time: 'dusk',
  },
];

export const venueById = (id) => VENUES.find((v) => v.id === id);
