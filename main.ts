// Kestrel Post — Island Mail Run: the hand-in program for make.fun's best
// flight game bounty. The game itself is the static site under game/ (open
// game/index.html in a desktop browser and fly). This program's one job is
// to hand it in: copy game/ and the screenshots into the output directory
// and write the dossier the judge reads, using the kit's own library so the
// bytes match what the scorer rebuilds.
//
// Run it the way the grader does:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// It uses only the Node 22 standard library, and two runs write the same
// bytes.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

// The screenshots reach the output as real JPEG files. The repository
// carries each one as a base64 text companion named <file>.jpg.b64, because
// the channel that pushes this repository transports text only; a genuine
// .jpg or .png sitting in screenshots/ is copied across untouched.
const shotsIn = join(repoRoot, 'screenshots');
const shotsOut = join(outputDir, 'screenshots');
mkdirSync(shotsOut, { recursive: true });
if (existsSync(shotsIn)) {
  for (const name of readdirSync(shotsIn).sort()) {
    if (name.startsWith('.')) continue;
    const from = join(shotsIn, name);
    if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) {
      cpSync(from, join(shotsOut, name));
    } else if (name.endsWith('.b64')) {
      const targetName = name.slice(0, -'.b64'.length);
      const bytes = Buffer.from(readFileSync(from, 'utf8').trim(), 'base64');
      writeFileSync(join(shotsOut, targetName), bytes);
    }
  }
}

// The caps are the scorer's own (see the kit's RULES.txt): the dossier text
// is capped, screenshots are at most 4 files of 256 KiB, and game/ holds at
// most 993 entries and 48 MiB with no path over 1000 bytes.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
