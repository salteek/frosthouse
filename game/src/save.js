// Best score and trophies, kept in this browser. Every access is guarded: storage may be blocked.

const KEY = 'frosthouse.save.v1';

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
  return { best: d.best ?? 0, trophies: d.trophies ?? 0, runs: d.runs ?? 0, lastRuns: d.lastRuns ?? [] };
}

export function recordRun(run) {
  const d = loadSave();
  const newBest = run.score > d.best;
  const next = {
    best: Math.max(d.best, run.score),
    trophies: d.trophies + (run.outcome === 'champion' ? 1 : 0),
    runs: d.runs + 1,
    lastRuns: [{ outcome: run.outcome, round: run.round, score: run.score }, ...d.lastRuns].slice(0, 3),
  };
  write(next);
  return { ...next, newBest };
}
