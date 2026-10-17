// Kleiner Benchmark: Wie teuer ist das Erzeugen der Illustrationen? (node --experimental-strip-types tests/art-bench.ts)
import { readFileSync, readdirSync } from 'node:fs';
import { setCtx } from '../src/lib/core/context.ts';
import { buildRecipes } from '../src/lib/core/recipes.ts';
import { defaultState } from '../src/lib/core/state.ts';
import type { Foods, RecipeSource } from '../src/lib/core/types.ts';
import { dishArt, stepArt } from '../src/lib/art/art.ts';

const DATA = new URL('../data/', import.meta.url);
const F: Foods = JSON.parse(readFileSync(new URL('foods.json', DATA), 'utf8'));
for (const f of readdirSync(DATA).filter(f => /^foods-new-.*\.json$/.test(f))) Object.assign(F, JSON.parse(readFileSync(new URL(f, DATA), 'utf8')));
const BASE: RecipeSource[] = readdirSync(DATA).filter(f => /^recipes-.*\.json$/.test(f)).flatMap(f => JSON.parse(readFileSync(new URL(f, DATA), 'utf8')));
const R = buildRecipes(BASE, [], F, 'cow');
setCtx({ F, R, byId: new Map(R.map(r => [r.id, r])), state: defaultState() });

let t = performance.now(), bytes = 0;
for (const r of R) bytes += dishArt(r, { label: false }).length;
console.log(`dishArt ×${R.length}: ${(performance.now() - t).toFixed(1)} ms, Ø ${(bytes / R.length / 1024).toFixed(1)} KB`);
t = performance.now(); bytes = 0; let n = 0;
for (const r of R) r.steps.forEach((s, i) => { bytes += stepArt(r, s, i).length; n++; });
console.log(`stepArt ×${n}: ${(performance.now() - t).toFixed(1)} ms, Ø ${(bytes / n / 1024).toFixed(1)} KB`);
