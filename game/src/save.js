// Best score and trophies, kept in this browser. Every access is guarded: storage may be blocked.

import { runXp } from './stones.js';

const KEY = 'frosthouse.save.v1';

// Remember the stone set picked last, for the next visit.
export function savePicked(id) {
  const d = read();
  d.picked = id;
  write(d);
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: the run still plays */
  }
}

export function loadSave() {
  const d = read();
  return { best: d.best ?? 0, trophies: d.trophies ?? 0, runs: d.runs ?? 0, lastRuns: d.lastRuns ?? [], stones: d.stones ?? {}, picked: d.picked ?? 'ruby' };
}

export function recordRun(run) {
  const d = loadSave();
  const newBest = run.score > d.best;
  const next = {
    best: Math.max(d.best, run.score),
    trophies: d.trophies + (run.outcome === 'champion' ? 1 : 0),
    runs: d.runs + 1,
    lastRuns: [{ outcome: run.outcome, round: run.round, score: run.score }, ...d.lastRuns].slice(0, 3),
    stones: { ...d.stones },
    picked: d.picked,
  };
  // The stone set earns experience from the run.
  let gained = 0, before = 0;
  if (run.stone) {
    before = d.stones[run.stone.id] ?? 0;
    gained = runXp(run);
    next.stones[run.stone.id] = before + gained;
  }
  write(next);
  return { ...next, newBest, stoneXp: run.stone ? { id: run.stone.id, before, gained } : null };
}
