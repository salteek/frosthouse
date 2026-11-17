// The six rinks between you and the Frost Lake Open trophy, weakest first.
// skill sets how cleanly they throw; style sets which shots they prefer.

export const RIVALS = [
  {
    id: 'puffin', name: 'Puffin Point Juniors', short: 'PUFFINS', skip: 'Skip Aila, age 12',
    skill: 0.22, style: 'draw', colour: '#f2b53a', dark: '#b07c12', venue: 'mirror',
    motto: 'Enthusiastic. Wildly inaccurate.',
  },
  {
    id: 'ironwool', name: 'Ironwool Knitting Circle', short: 'IRONWOOL', skip: 'Skip Marta Ness',
    skill: 0.36, style: 'guard', colour: '#9b6ad6', dark: '#62409a', venue: 'pine',
    motto: 'Clutter the front of the house. Never hurry.',
    power: { id: 'lock', level: 1 },
  },
  {
    id: 'ravens', name: 'Ridgewater Ravens', short: 'RAVENS', skip: 'Skip Odd Brekke',
    skill: 0.48, style: 'takeout', colour: '#3c4656', dark: '#1d232c', venue: 'windy',
    motto: 'If it is in the house, it is getting hit.',
    power: { id: 'thunder', level: 1 },
  },
  {
    id: 'sleet', name: 'Sisters of the Sleet', short: 'SLEET', skip: 'Skip Inga & Signe',
    skill: 0.58, style: 'freeze', colour: '#2fa8a0', dark: '#1b6f69', venue: 'thaw',
    motto: 'Freeze to your stones. Steal your ends.',
    power: { id: 'gale', level: 2 },
  },
  {
    id: 'pines', name: 'Old Fjell & the Pines', short: 'FJELL', skip: 'Skip Old Fjell',
    skill: 0.68, style: 'mixed', colour: '#3e8a4f', dark: '#245a31', venue: 'pine',
    motto: 'Fifty winters on this lake. Reads every pebble.',
    power: { id: 'bolt', level: 2 },
  },
  {
    id: 'glacier', name: 'The Glacier', short: 'GLACIER', skip: 'Champion Halla Vik',
    skill: 0.72, style: 'mixed', colour: '#5fb7ea', dark: '#2b78a8', venue: 'aurora', champion: true, boss: true,
    motto: 'Undefeated in eleven Opens. Cold as the lake bed.',
    power: { id: 'thunder', level: 3 },
  },
];

export const rivalById = (id) => RIVALS.find((r) => r.id === id);
