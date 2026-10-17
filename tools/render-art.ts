// Rendert die Illustrationen der mitgelieferten Rezepte beim Build als WebP nach public/art/.
// Grund: komplexe SVGs muss der Browser im Hauptthread rastern; WebP dekodiert er nebenher.
// Aufruf: node --experimental-strip-types tools/render-art.ts  (überspringt unveränderte Bilder)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { setCtx } from '../src/lib/core/context.ts';
import { buildRecipes } from '../src/lib/core/recipes.ts';
import { defaultState } from '../src/lib/core/state.ts';
import type { Foods, RecipeSource } from '../src/lib/core/types.ts';
import { dishArt, heroArt, standalone, stepArt, thermosArt, waterTestArt } from '../src/lib/art/art.ts';

const ROOT = new URL('../', import.meta.url);
const DATA = new URL('data/', ROOT);
const OUT = new URL('public/art/', ROOT);
const F: Foods = JSON.parse(readFileSync(new URL('foods.json', DATA), 'utf8'));
for (const f of readdirSync(DATA).filter(f => /^foods-new-.*\.json$/.test(f))) Object.assign(F, JSON.parse(readFileSync(new URL(f, DATA), 'utf8')));
const BASE: RecipeSource[] = readdirSync(DATA).filter(f => /^recipes-.*\.json$/.test(f)).flatMap(f => JSON.parse(readFileSync(new URL(f, DATA), 'utf8')));
const R = buildRecipes(BASE, [], F, 'cow');
setCtx({ F, R, byId: new Map(R.map(r => [r.id, r])), state: defaultState() });
mkdirSync(OUT, { recursive: true });

// Manifest mit Hash je Bild: nur Geändertes neu rendern
const manifestUrl = new URL('manifest.json', OUT);
const old: Record<string, string> = existsSync(manifestUrl) ? JSON.parse(readFileSync(manifestUrl, 'utf8')) : {};
const next: Record<string, string> = {};
const jobs: { name: string; svg: string; width: number }[] = [
  { name: 'hero.webp', svg: standalone(heroArt()), width: 540 },
  { name: 'watertest.webp', svg: standalone(waterTestArt()), width: 720 },
  { name: 'thermos.webp', svg: standalone(thermosArt()), width: 720 },
];
for (const r of R) {
  jobs.push({ name: `${r.id}.webp`, svg: standalone(dishArt(r, { label: false })), width: 720 });
  r.steps.forEach((s, i) => jobs.push({ name: `${r.id}-${i}.webp`, svg: standalone(stepArt(r, s, i)), width: 720 }));
}
let rendered = 0, bytes = 0;
const started = performance.now();
await Promise.all(jobs.map(async j => {
  const hash = createHash('sha1').update(j.svg).digest('hex').slice(0, 12);
  next[j.name] = hash;
  const file = new URL(j.name, OUT);
  if (old[j.name] === hash && existsSync(file)) return;
  const buf = await sharp(Buffer.from(j.svg), { density: 144 }).resize({ width: j.width }).webp({ quality: 82, effort: 5 }).toBuffer();
  writeFileSync(file, buf);
  rendered++; bytes += buf.length;
}));
writeFileSync(manifestUrl, JSON.stringify(next));
console.log(`Illustrationen: ${jobs.length} gesamt, ${rendered} neu gerendert${rendered ? ` (Ø ${(bytes / rendered / 1024).toFixed(1)} KB)` : ''} in ${((performance.now() - started) / 1000).toFixed(1)} s`);
