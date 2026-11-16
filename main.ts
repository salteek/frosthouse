// Frosthouse hand-in for make.fun's best-game-01 (Node 22, standard library only).
// The game is game/: static files that open in a desktop browser with no network request.
// This program copies game/ and screenshots/ to the output folder and writes dossier.json,
// the summary the judge reads, with the vendored make.fun library (vendor/makefun-game.ts, unchanged).
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// To play locally: serve game/ with any static file server and open index.html in desktop Chrome.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The same caps the make.fun scorer enforces, so a bad hand-in fails here first.
const LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(name: string): void {
  const from = join(root, name);
  const to = join(output, name);
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(output, { recursive: true });
copyTree('game');
copyTree('screenshots');

// Check the screenshots against the gate before writing the dossier: 3 or 4 JPEG/PNG files,
// each at most 256 KiB, named with letters, digits and . _ - only. The first by name is the cover.
const shots = readdirSync(join(output, 'screenshots')).filter((f) => !f.startsWith('.')).sort();
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}
for (const name of shots) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name) || !/\.(png|jpe?g)$/i.test(name)) {
    throw new Error(`screenshot name not accepted by the gate: ${name}`);
  }
  const bytes = statSync(join(output, 'screenshots', name)).size;
  if (bytes > LIMITS.screenshots.max_bytes) throw new Error(`${name} is ${bytes} bytes, over 256 KiB`);
}
if (!existsSync(join(output, 'game', 'index.html'))) throw new Error('game/index.html is missing');

writeFileSync(join(output, 'dossier.json'), buildDossier(output, LIMITS));
console.log(`Frosthouse handed in: game/, ${shots.length} screenshots and dossier.json in ${output}`);
