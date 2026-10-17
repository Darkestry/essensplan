// Vektor-Illustrationen: Gerichte, Kochschritte und Edelstahl-Geschirr. Keine externen Bilder.
import { ctx } from '../core/context.ts';
import type { Recipe, Step } from '../core/types.ts';
import { esc, seeded } from '../core/util.ts';

type Rnd = () => number;
type Look = [shape: string, color: string];
const F = new Proxy({} as typeof ctx.F, { get: (_t, k: string) => ctx.F[k] });

let uid = 0;
const f1 = (n: number): number => Math.round(n * 10) / 10;

// Gemeinsame Verläufe (Edelstahl, Teller, Flammen …)
const DEFS = `<defs>
  <linearGradient id="g-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f8f9"/><stop offset=".35" stop-color="#c2cad0"/><stop offset=".55" stop-color="#eef1f3"/><stop offset=".8" stop-color="#8f9aa1"/><stop offset="1" stop-color="#d6dce0"/></linearGradient>
  <linearGradient id="g-steelv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8b959c"/><stop offset=".18" stop-color="#e9edf0"/><stop offset=".4" stop-color="#b3bcc2"/><stop offset=".7" stop-color="#f3f5f6"/><stop offset="1" stop-color="#7f8a91"/></linearGradient>
  <radialGradient id="g-steelin" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="#eef1f3"/><stop offset=".55" stop-color="#c3cbd1"/><stop offset="1" stop-color="#97a2a9"/></radialGradient>
  <radialGradient id="g-plate" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fffdf8"/><stop offset=".85" stop-color="#f3ede0"/><stop offset="1" stop-color="#e2d9c6"/></radialGradient>
  <linearGradient id="g-bowl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d8cdb6"/><stop offset=".3" stop-color="#f7f2e7"/><stop offset="1" stop-color="#cfc3aa"/></linearGradient>
  <radialGradient id="g-shadow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1d2b24" stop-opacity=".28"/><stop offset="1" stop-color="#1d2b24" stop-opacity="0"/></radialGradient>
  <radialGradient id="g-gloss" cx=".35" cy=".3" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="g-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b483"/><stop offset="1" stop-color="#c39b68"/></linearGradient>
  <radialGradient id="g-flame" cx=".5" cy=".8" r=".8"><stop offset="0" stop-color="#ffe08a"/><stop offset=".5" stop-color="#f08a3c"/><stop offset="1" stop-color="#d4462a"/></radialGradient>
  <radialGradient id="g-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb54a" stop-opacity=".9"/><stop offset="1" stop-color="#ff7a2a" stop-opacity="0"/></radialGradient>
  </defs>`;

/** Für Inline-SVGs: Verläufe einmal ins Dokument legen. */
export function injectDefs(): void {
  if (document.getElementById('mw-defs')) return;
  const d = document.createElement('div');
  d.innerHTML = `<svg id="mw-defs" width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}</svg>`;
  document.body.prepend(d.firstChild!);
}

// ---------- Bild-Cache ----------
// Jede Zeichnung wird einmal als eigenständiges SVG erzeugt und als Blob-URL wiederverwendet.
// Statt tausender SVG-Knoten im DOM steht dort nur ein <img>; der Browser dekodiert jedes Bild einmal.
const urlCache = new Map<string, string>();
/** SVG-String als eigenständiges Dokument (Namespace + Verläufe) */
export const standalone = (svg: string): string => svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/>/, '>' + DEFS);
export function svgUrl(key: string, make: () => string): string {
  let u = urlCache.get(key);
  if (!u) {
    const svg = standalone(make());
    u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    urlCache.set(key, u);
  }
  return u;
}
// Mitgelieferte Rezepte: beim Build vorgerenderte WebP-Bilder (tools/render-art.ts). Eigene Rezepte: live gezeichnet.
export const dishUrl = (r: Recipe): string => r.custom ? svgUrl(`d:${r.id}:${r.nutrition.kcal}:${r.art.base.color}:${r.ingredients.length}`, () => dishArt(r, { label: false })) : `./art/${r.id}.webp`;
export const stepUrl = (r: Recipe, st: Step, i: number): string => r.custom ? svgUrl(`s:${r.id}:${i}:${st.action}:${st.items.join(',')}:${st.text.length}`, () => stepArt(r, st, i)) : `./art/${r.id}-${i}.webp`;

// ---------- Farben ----------
function hex(c: string): number[] { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(a: string, b: string, t: number): string { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const dark = (c: string, t = .25): string => mix(c, '#2a1a10', t);
const light = (c: string, t = .3): string => mix(c, '#ffffff', t);

// Zutat → [Form, Farbe]
const LOOK: Record<string, Look> = {
  potato: ['tuber', '#dfbd76'], floury: ['tuber', '#e3c587'], sweetpotato: ['tuber', '#d88b47'],
  onion: ['onion', '#e7c4a2'], redonion: ['onion', '#9b4a6b'], garlic: ['garlic', '#f1e9da'], ginger: ['root', '#d9b77c'],
  spring: ['stalk', '#7fa65a'], leek: ['stalk', '#9cbf6e'], celery: ['stalk', '#a9c77c'], chives: ['stalk', '#5f8f4a'],
  mushroom: ['mushroom', '#c9b59a'], avocado: ['avocado', '#7d9a4a'], lemon: ['citrus', '#e8c75a'], lime: ['citrus', '#93b05a'],
  pepper: ['pepper', '#c9463a'], tomato: ['tomato', '#d24b35'], cucumber: ['long', '#5f8a4f'], zucchini: ['long', '#4f7d3f'],
  aubergine: ['long', '#5b3a5e'], carrot: ['carrot', '#e07b39'], broccoli: ['floret', '#4f8a46'], cauliflower: ['floret', '#efe6cf'],
  pumpkinflesh: ['pumpkin', '#e08a3a'], cabbage: ['cabbage', '#bcd58f'], lettuce: ['cabbage', '#93be62'],
  rocket: ['leaves', '#5f8f4a'], babyspinach: ['leaves', '#4f7d3f'], spinach: ['leaves', '#3f6e3a'],
  parsley: ['leaves', '#4f8a3a'], basil: ['leaves', '#3f8a3f'], coriander: ['leaves', '#5a9a46'], dill: ['leaves', '#6f9a4a'],
  apple: ['apple', '#c9503c'], banana: ['banana', '#ecd06a'], berries: ['berries', '#7a2f4f'], dates: ['berries', '#7b4a2a'], beetroot: ['tuber', '#8a2a45'],
  quark: ['tub', '#f7f4ec'], yogurt: ['tub', '#f7f4ec'], creme: ['tub', '#f8f3e6'], schmand: ['tub', '#f8f3e6'], creamcheese: ['tub', '#f8f3e6'],
  milk: ['carton', '#f7f7f2'], cream: ['carton', '#f8f3e6'], butter: ['block', '#f2d98a'], feta: ['block', '#f6f1e2'], halloumi: ['block', '#efe3c4'],
  tofu: ['block', '#efe7d2'], mozzarella: ['ball', '#fbf8ef'], parmesan: ['wedge', '#e9cf86'], cheese: ['wedge', '#efd27a'],
  chicken: ['meat', '#e8b9a0'], chickenthigh: ['meat', '#d9967a'], turkey: ['meat', '#e8bfa8'], beef: ['meat', '#a8443a'], beefmince: ['mince', '#b5524a'],
  salmon: ['fish', '#ef9a72'], whitefish: ['fish', '#f1ece2'], shrimp: ['shrimp', '#f0a083'], tuna: ['can', '#9fb0b8'],
  oats: ['pile', '#d8bf8a'], flour: ['pile', '#f3eee3'], buckwheat: ['pile', '#b89a7a'], chickpeaflour: ['pile', '#e9d08f'], starch: ['pile', '#fbfaf5'],
  semolina: ['pile', '#efd99a'], polenta: ['pile', '#eac35a'], rice: ['grains', '#f6f3ea'], risotto: ['grains', '#f3eedf'], bulgur: ['grains', '#c9a46a'],
  couscous: ['grains', '#e3c27a'], quinoa: ['grains', '#e7d7b0'], redlentils: ['grains', '#e08a4a'], lentils: ['grains', '#7a6a4a'], pasta: ['pasta', '#e9c66e'],
  whitebeans: ['beans', '#efe8d6'], blackbeans: ['beans', '#3a3235'], kidney: ['beans', '#8b2f2f'], chickpeas: ['beans', '#e3c48d'], peas: ['beans', '#7aa652'],
  greenbeans: ['greenbeans', '#6c9a4a'], corn: ['beans', '#efc843'],
  passata: ['can', '#b8362a'], cannedtomato: ['can', '#c2402e'], paste: ['tube', '#b8362a'], coconut: ['can', '#e9eee9'],
  walnuts: ['nuts', '#9a6b3e'], almonds: ['nuts', '#b07a4a'], peanuts: ['nuts', '#c99a5e'], cashews: ['nuts', '#e2c99a'], pumpkin: ['nuts', '#5f7d3a'],
  pine: ['nuts', '#ecd9a6'], sesame: ['seeds', '#efe2c0'], peanutbutter: ['jar', '#b9844a'], tahini: ['jar', '#d9c08f'], honey: ['jar', '#e0a83a'],
  olive: ['bottle', '#b9b34a'], rapeseed: ['bottle', '#e9cf5a'], sesameoil: ['bottle', '#8a5a2a'], soy: ['bottle', '#3a2418'], vinegar: ['bottle', '#e8e0c0'],
  paprika: ['spice', '#c0392b'], smoked: ['spice', '#8e2c1f'], cumin: ['spice', '#9b6a35'], curry: ['spice', '#d9a12a'], turmeric: ['spice', '#e0a019'],
  garam: ['spice', '#7a4a2a'], oregano: ['spice', '#6b7a3a'], thyme: ['spice', '#7d8a5a'], cinnamon: ['spice', '#9a5a2e'], chili: ['spice', '#c0392b'],
  blackpepper: ['spice', '#3a3330'], salt: ['spice', '#ffffff'], broth: ['spice', '#d9b25a'], baking: ['spice', '#ffffff'], mustard: ['jar', '#d9b22a'],
  water: ['drop', '#9cc9e0'],
};
const GROUP_LOOK: Record<string, Look> = { 'Obst & Gemüse': ['tuber', '#9cbf6e'], 'Kühlregal': ['tub', '#f7f4ec'], 'Fleisch & Fisch': ['meat', '#d9967a'], 'Tiefkühlfach': ['beans', '#7aa652'], 'Trockenwaren': ['pile', '#e3d2a5'], 'Dosen & Gläser': ['can', '#c2402e'], 'Nüsse & Kerne': ['nuts', '#b07a4a'], 'Vorrat & Gewürze': ['spice', '#b98a4a'] };
export function look(k: string): Look { return LOOK[k] || GROUP_LOOK[F[k]?.group] || ['tuber', '#c9b38a']; }

// ---------- Zutaten-Icons (für Kochschritte) ----------
function leaf(x: number, y: number, s: number, c: string, rot = 0): string { return `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})" d="M-10 3Q-10-13 5-9Q15-7 9 4Q1 12-10 3Z" fill="${c}" stroke="${dark(c, .35)}" stroke-width="1"/><path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})" d="M-8 2Q0-2 9-5" stroke="${light(c, .35)}" fill="none"/>`; }
export function ingredientIcon(k: string, x: number, y: number, s = 1): string {
  const [shape, c] = look(k);
  const d = dark(c, .3), l = light(c, .45);
  let p = '';
  switch (shape) {
    case 'tuber': p = `<ellipse rx="19" ry="13" fill="${c}" stroke="${d}" stroke-width="1.5"/><circle cx="-6" cy="-3" r="1.4" fill="${d}"/><circle cx="7" cy="3" r="1.2" fill="${d}"/><ellipse cx="-5" cy="-6" rx="7" ry="3" fill="${l}" opacity=".5"/>`; break;
    case 'onion': p = `<path d="M0-20Q-21-9-18 6Q-12 21 0 16Q14 21 18 6Q21-9 0-20Z" fill="${c}" stroke="${d}" stroke-width="1.5"/><path d="M0-17Q-9-2 0 15M0-17Q9-2 0 15" fill="none" stroke="${d}" opacity=".6"/><path d="M0-20l-2-6m2 6l3-5" stroke="#7b9a4a" stroke-width="2"/>`; break;
    case 'garlic': p = `<path d="M0-18Q-17-6-15 6Q-9 18 0 14Q9 18 15 6Q17-6 0-18Z" fill="${c}" stroke="#bba98a" stroke-width="1.5"/><path d="M-6-10Q-9 3-4 13M6-10Q9 3 4 13M0-17V14" fill="none" stroke="#cbbca0"/>`; break;
    case 'root': p = `<path d="M-20 4Q-18-8-6-6Q2-14 10-6Q20-8 20 2Q12 12 0 8Q-12 14-20 4Z" fill="${c}" stroke="${d}" stroke-width="1.5"/>`; break;
    case 'stalk': p = [0, 1, 2].map(i => `<path d="M${-12 + i * 10} 16Q${-14 + i * 10} -2 ${-6 + i * 12} -20" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M${-12 + i * 10} 16l0-6" stroke="#f1ecd9" stroke-width="5" stroke-linecap="round"/>`).join(''); break;
    case 'mushroom': p = `<path d="M-5 0h10l3 16H-8z" fill="#efe6d4" stroke="#a89780"/><path d="M-20 2Q-18-21 0-21Q18-21 20 2Q1 8-20 2Z" fill="${c}" stroke="${d}" stroke-width="1.5"/><ellipse cx="-6" cy="-12" rx="6" ry="3" fill="${l}" opacity=".6"/>`; break;
    case 'avocado': p = `<path d="M0-24C-11-24-22 0-21 11C-19 29 21 29 21 11C22 0 11-24 0-24Z" fill="#4a6b35" stroke="#33502a" stroke-width="2"/><path d="M0-19C-8-19-16 0-15 10C-14 23 14 23 15 10C16 0 8-19 0-19Z" fill="#cfd98f"/><circle cy="8" r="7" fill="#8a5a33"/>`; break;
    case 'citrus': p = `<path d="M-22-2Q0 28 22-2Z" fill="${c}" stroke="${d}" stroke-width="1.5"/><path d="M-17 0Q0 20 17 0Z" fill="${l}"/><path d="M0 0v14M0 0l-10 9M0 0l10 9" stroke="${c}" stroke-width="1.5"/>`; break;
    case 'pepper': p = `<path d="M-3-14Q-20-22-21-2Q-23 20-9 21Q0 17 7 21Q25 22 21-2Q17-21 3-14Z" fill="${c}" stroke="${d}" stroke-width="1.5"/><path d="M0-14q-2-7 3-10" stroke="#5f8a3f" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M-12-6q-2 10 2 18" stroke="${l}" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>`; break;
    case 'tomato': p = `<circle r="17" fill="${c}" stroke="${d}" stroke-width="1.5"/><path d="M0-17l-6-4m6 4l6-4m-6 4l0-6" stroke="#4f7d3f" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="-6" cy="-6" rx="5" ry="3" fill="#fff" opacity=".35"/>`; break;
    case 'long': p = `<rect x="-26" y="-9" width="52" height="18" rx="9" transform="rotate(-20)" fill="${c}" stroke="${d}" stroke-width="1.5"/><rect x="-20" y="-6" width="34" height="4" rx="2" transform="rotate(-20)" fill="${l}" opacity=".45"/>`; break;
    case 'carrot': p = `<path d="M-24 10L18-8Q26-8 22 2Z" fill="${c}" stroke="${d}" stroke-width="1.5"/><path d="M-8 2l3 3M2-2l3 3" stroke="${d}"/><path d="M21-6q6-8 4-14M23-4q9-4 12-9" stroke="#5f8a3f" stroke-width="2.5" fill="none" stroke-linecap="round"/>`; break;
    case 'floret': p = `<path d="M-4 4h8l3 16h-14z" fill="${shape === 'floret' && c === '#efe6cf' ? '#dfe5c9' : '#7aa05a'}"/>` + [[-10, -4, 10], [8, -5, 10], [0, -13, 11], [-2, 2, 9]].map(([a, b, r]) => `<circle cx="${a}" cy="${b}" r="${r}" fill="${c}" stroke="${d}" stroke-width="1.2"/>`).join(''); break;
    case 'pumpkin': p = `<ellipse rx="22" ry="16" fill="${c}" stroke="${d}" stroke-width="1.5"/><path d="M-8-15Q-14 0-8 15M8-15Q14 0 8 15" fill="none" stroke="${d}" opacity=".6"/><path d="M0-16q2-6 6-7" stroke="#6b5a3a" stroke-width="3" fill="none"/>`; break;
    case 'cabbage': p = `<circle r="19" fill="${c}" stroke="${d}" stroke-width="1.5"/><path d="M-14-6Q0-2 14-8M-15 6Q0 2 15 4M0-18Q-5 0 0 18" fill="none" stroke="${d}" opacity=".5"/>`; break;
    case 'leaves': p = leaf(-8, 3, .95, c, -10) + leaf(7, -5, 1, c, 20) + leaf(8, 10, .75, c, 70); break;
    case 'apple': p = `<path d="M0-12Q-20-20-20 2Q-18 20 0 18Q18 20 20 2Q20-20 0-12Z" fill="${c}" stroke="${d}" stroke-width="1.5"/><path d="M0-12q1-7 5-9" stroke="#6b4a2a" stroke-width="2" fill="none"/><ellipse cx="-8" cy="-4" rx="4" ry="6" fill="#fff" opacity=".3"/>`; break;
    case 'banana': p = `<path d="M-24-6Q0 22 24-8Q20 4 0 10Q-14 10-24-6Z" fill="${c}" stroke="${d}" stroke-width="1.5"/>`; break;
    case 'berries': p = [[-8, -4], [7, -6], [0, 7], [-12, 9], [12, 8]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="7.5" fill="${c}" stroke="${d}"/><circle cx="${a - 2}" cy="${b - 2}" r="2" fill="#fff" opacity=".35"/>`).join(''); break;
    case 'tub': p = `<path d="M-20-10h40l-4 26h-32z" fill="#fbfaf6" stroke="#a9b0a2" stroke-width="1.5"/><ellipse cy="-10" rx="20" ry="6" fill="${c}" stroke="#a9b0a2" stroke-width="1.5"/><rect x="-14" y="0" width="28" height="9" rx="2" fill="#8fb0c9"/>`; break;
    case 'carton': p = `<path d="M-13-22h26v38h-26z" fill="${c}" stroke="#9aa59c" stroke-width="1.5"/><path d="M-13-22l13-8 13 8" fill="#dfe7ee" stroke="#9aa59c" stroke-width="1.5"/><rect x="-13" y="-6" width="26" height="12" fill="#5d8bbd"/>`; break;
    case 'block': p = `<path d="M-20-6l14-9h26l-14 9z" fill="${light(c, .3)}" stroke="${dark(c, .35)}"/><path d="M-20-6h26v18h-26z" fill="${c}" stroke="${dark(c, .35)}"/><path d="M6-6l14-9v18l-14 9z" fill="${dark(c, .1)}" stroke="${dark(c, .35)}"/>`; break;
    case 'ball': p = `<circle r="17" fill="${c}" stroke="#d6d0c0" stroke-width="1.5"/><ellipse cx="-5" cy="-6" rx="7" ry="4" fill="#fff"/>`; break;
    case 'wedge': p = `<path d="M-20 10L18-12L20 10Z" fill="${c}" stroke="${d}" stroke-width="1.5"/><circle cx="8" cy="2" r="2.5" fill="${d}" opacity=".3"/><circle cx="-4" cy="6" r="2" fill="${d}" opacity=".3"/>`; break;
    case 'meat': p = `<path d="M-24 8Q-29-6-12-16Q8-25 24-8Q34 10 10 17Q-12 24-24 8Z" fill="${c}" stroke="${dark(c, .3)}" stroke-width="1.5"/><path d="M-12-6Q4-10 16-2" stroke="${light(c, .4)}" stroke-width="3" fill="none" stroke-linecap="round"/>`; break;
    case 'mince': p = `<ellipse rx="22" ry="14" fill="${c}" stroke="${dark(c, .3)}" stroke-width="1.5"/>` + Array.from({ length: 14 }, (_, i) => `<circle cx="${f1(Math.sin(i * 2.4) * 15)}" cy="${f1(Math.cos(i * 2.4) * 8)}" r="2.2" fill="${light(c, .35)}"/>`).join(''); break;
    case 'fish': p = `<path d="M-28 10L-18-16L26-11L32 14Z" fill="${c}" stroke="${dark(c, .3)}" stroke-width="1.5"/><path d="M-15-12l8 24M-3-12l7 25M10-11l6 24" stroke="${light(c, .5)}" stroke-width="2"/>`; break;
    case 'shrimp': p = `<path d="M-14 12Q-24-4-8-14Q10-20 18-6Q10-8 2-4Q-6 2-2 12Z" fill="${c}" stroke="${dark(c, .3)}" stroke-width="1.5"/><path d="M-10-8l4 6M-2-12l3 7M7-12l1 7" stroke="${light(c, .4)}" stroke-width="2"/>`; break;
    case 'pile': p = `<path d="M-24 12L-12-10L0-15L11-8L24 12Z" fill="${c}" stroke="${dark(c, .25)}" stroke-width="1.5"/><path d="M-8-4l4 3M5 0l3 3M-14 6l3 2" stroke="${dark(c, .2)}"/>`; break;
    case 'grains': p = Array.from({ length: 16 }, (_, i) => `<ellipse cx="${(i % 5) * 8 - 16}" cy="${Math.floor(i / 5) * 7 - 10}" rx="${shape === 'grains' && (c === '#e08a4a' || c === '#7a6a4a') ? 3.5 : 5}" ry="2.4" transform="rotate(${(i * 37) % 90 - 45} ${(i % 5) * 8 - 16} ${Math.floor(i / 5) * 7 - 10})" fill="${c}" stroke="${dark(c, .3)}" stroke-width=".6"/>`).join(''); break;
    case 'pasta': p = Array.from({ length: 6 }, (_, i) => `<rect x="-6" y="-14" width="12" height="28" rx="4" transform="translate(${(i % 3) * 13 - 13} ${Math.floor(i / 3) * 10 - 4}) rotate(${i * 31 - 40})" fill="${c}" stroke="${dark(c, .3)}"/>`).join(''); break;
    case 'beans': p = Array.from({ length: 8 }, (_, i) => { const a = i * 2.39, x = Math.cos(a) * (5 + i * 1.8), y = Math.sin(a) * (4 + i * 1.3); return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="7" ry="5" transform="rotate(${i * 40} ${f1(x)} ${f1(y)})" fill="${c}" stroke="${dark(c, .3)}"/>`; }).join(''); break;
    case 'greenbeans': p = [0, 1, 2, 3].map(i => `<path d="M-22 ${-8 + i * 5}Q0 ${-14 + i * 6} 22 ${-4 + i * 5}" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join(''); break;
    case 'nuts': p = Array.from({ length: 8 }, (_, i) => `<ellipse cx="${f1(Math.sin(i * 2.4) * 15)}" cy="${f1(Math.cos(i * 2.4) * 10)}" rx="6.5" ry="4.5" transform="rotate(${i * 33})" fill="${c}" stroke="${dark(c, .35)}"/>`).join(''); break;
    case 'seeds': p = Array.from({ length: 22 }, (_, i) => `<ellipse cx="${f1(Math.sin(i * 2.4) * (4 + i))}" cy="${f1(Math.cos(i * 2.4) * (3 + i * .6))}" rx="2.6" ry="1.5" transform="rotate(${i * 47})" fill="${c}" stroke="${dark(c, .4)}" stroke-width=".5"/>`).join(''); break;
    case 'can': p = `<rect x="-16" y="-20" width="32" height="38" rx="3" fill="url(#g-steelv)" stroke="#7f8a91"/><rect x="-16" y="-10" width="32" height="18" fill="${c}"/><ellipse cy="-20" rx="16" ry="4" fill="#dfe4e7" stroke="#7f8a91"/>`; break;
    case 'tube': p = `<path d="M-24 6L16-6L22 2L-18 14Z" fill="#f2f2ee" stroke="#9aa59c"/><path d="M-10 2L10-4L12 0L-8 6Z" fill="${c}"/><rect x="18" y="-6" width="8" height="8" rx="2" fill="${c}" transform="rotate(-17 22 -2)"/>`; break;
    case 'jar': p = `<rect x="-15" y="-14" width="30" height="32" rx="5" fill="${c}" stroke="${dark(c, .3)}"/><rect x="-16" y="-20" width="32" height="8" rx="2" fill="#6b5a3a"/><rect x="-10" y="-4" width="20" height="10" rx="2" fill="#fbf8ef" opacity=".85"/>`; break;
    case 'bottle': p = `<path d="M-5-26h10v8q8 4 8 12v26h-26v-26q0-8 8-12z" fill="${c}" stroke="${dark(c, .35)}" opacity=".9"/><rect x="-6" y="-30" width="12" height="6" rx="1" fill="#3a3a3a"/><rect x="-9" y="0" width="18" height="10" rx="1" fill="#fbf8ef" opacity=".8"/>`; break;
    case 'spice': p = `<rect x="-11" y="-14" width="22" height="30" rx="4" fill="#f4f1ea" stroke="#9aa59c"/><rect x="-11" y="-19" width="22" height="7" rx="2" fill="#5a6b62"/><rect x="-8" y="-2" width="16" height="13" rx="2" fill="${c}"/>`; break;
    case 'drop': p = `<path d="M0-18Q14 2 10 9Q6 18 0 18Q-6 18-10 9Q-14 2 0-18Z" fill="${c}" stroke="#6f9fb8"/><ellipse cx="-3" cy="6" rx="3" ry="5" fill="#fff" opacity=".5"/>`; break;
    default: p = `<circle r="14" fill="${c}"/>`;
  }
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${p}</g>`;
}

// ---------- Speisen-Texturen ----------
// Farben aus den "sichtbaren" Zutaten eines Rezepts ableiten.
export function chunkColors(r: Recipe): string[] {
  const skip = new Set(['spice', 'bottle', 'drop', 'tub', 'carton', 'can', 'tube', 'jar', 'pile']);
  const out = [];
  for (const i of [...r.ingredients].sort((a, b) => b.q - a.q)) {
    const [shape, c] = look(i.k);
    if (skip.has(shape) || F[i.k]?.staple) continue;
    if (['rice', 'risotto', 'pasta', 'oats'].includes(i.k)) continue;
    let col = c;
    if (i.k === 'potato' || i.k === 'floury') col = '#e8c77e';
    if (i.k === 'avocado') col = '#b9c96a';
    if (i.k === 'chicken' || i.k === 'chickenthigh' || i.k === 'turkey') col = '#d9a173';
    if (i.k === 'beef' || i.k === 'beefmince') col = '#7a3a2a';
    if (i.k === 'salmon') col = '#ee9068';
    out.push(col);
    if (out.length >= 5) break;
  }
  return out.length ? out : ['#c9a46a', '#7aa652'];
}

function texture(type: string, color: string, cx: number, cy: number, rx: number, ry: number, rnd: Rnd, cols: string[]): string {
  const c = color, d = dark(c, .22), l = light(c, .35);
  const pick = () => cols[Math.floor(rnd() * cols.length)];
  const pt = (k = 1) => { const a = rnd() * Math.PI * 2, m = Math.sqrt(rnd()) * k; return [cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]; };
  let s = '';
  const fill = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}"/>`;
  switch (type) {
    case 'soup':
      s = fill + `<ellipse cx="${cx - rx * .15}" cy="${cy - ry * .2}" rx="${rx * .6}" ry="${ry * .45}" fill="${l}" opacity=".35"/>`;
      s += `<path d="M${cx - rx * .5} ${cy}q${rx * .25} ${-ry * .35} ${rx * .5} 0t${rx * .5} 0" fill="none" stroke="${l}" stroke-width="3" opacity=".6" stroke-linecap="round"/>`;
      for (let i = 0; i < 8; i++) { const [x, y] = pt(.85); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.2 + rnd() * 1.6)}" fill="${d}" opacity=".5"/>`; }
      break;
    case 'stew': case 'curry': case 'porridge': {
      s = fill;
      if (type === 'curry') s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#g-gloss)"/>`;
      if (type === 'porridge') { for (let i = 0; i < 40; i++) { const [x, y] = pt(.92); s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="3.2" ry="2" transform="rotate(${Math.round(rnd() * 180)} ${f1(x)} ${f1(y)})" fill="${rnd() > .5 ? l : d}" opacity=".55"/>`; } }
      const n = type === 'porridge' ? 0 : 26;
      for (let i = 0; i < n; i++) {
        const [x, y] = pt(.88), w = 6 + rnd() * 9, h = 5 + rnd() * 7, col = pick();
        s += rnd() > .45
          ? `<rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="2.5" transform="rotate(${Math.round(rnd() * 90)} ${f1(x)} ${f1(y)})" fill="${col}" stroke="${dark(col, .3)}" stroke-width=".7"/>`
          : `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(w / 2)}" ry="${f1(h / 2.4)}" fill="${col}" stroke="${dark(col, .3)}" stroke-width=".7"/>`;
      }
      if (type === 'curry') for (let i = 0; i < 6; i++) { const [x, y] = pt(.8); s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="4" ry="2" fill="#f2b33a" opacity=".55"/>`; }
      break;
    }
    case 'mash':
      s = fill;
      for (let i = 0; i < 5; i++) { const y = cy - ry * .6 + i * ry * .3; s += `<path d="M${f1(cx - rx * .7)} ${f1(y)}q${f1(rx * .35)} ${f1(-ry * .25)} ${f1(rx * .7)} 0t${f1(rx * .7)} 0" fill="none" stroke="${i % 2 ? d : l}" stroke-width="3" opacity=".45" stroke-linecap="round"/>`; }
      s += `<ellipse cx="${cx - rx * .2}" cy="${cy - ry * .3}" rx="${rx * .35}" ry="${ry * .2}" fill="#fff" opacity=".25"/>`;
      break;
    case 'rice': case 'grain':
      s = fill;
      for (let i = 0; i < (type === 'rice' ? 90 : 120); i++) {
        const [x, y] = pt(.95);
        s += type === 'rice'
          ? `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="4.4" ry="1.9" transform="rotate(${Math.round(rnd() * 180)} ${f1(x)} ${f1(y)})" fill="${rnd() > .3 ? l : '#ffffff'}" stroke="${d}" stroke-width=".35"/>`
          : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.6 + rnd())}" fill="${rnd() > .5 ? l : d}"/>`;
      }
      break;
    case 'pasta':
      for (let i = 0; i < 22; i++) {
        const [x, y] = pt(.85), a = Math.round(rnd() * 180);
        s += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${a})"><rect x="-13" y="-4.5" width="26" height="9" rx="3" fill="${c}" stroke="${d}" stroke-width=".8"/><path d="M-9-4.5l-3 9M-3-4.5l-3 9M3-4.5l-3 9M9-4.5l-3 9" stroke="${d}" stroke-width=".6" opacity=".6"/></g>`;
      }
      break;
    case 'beans':
      s = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${d}" opacity=".35"/>`;
      for (let i = 0; i < 46; i++) { const [x, y] = pt(.92), col = rnd() > .3 ? c : pick(); s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="6" ry="4.2" transform="rotate(${Math.round(rnd() * 180)} ${f1(x)} ${f1(y)})" fill="${col}" stroke="${dark(col, .35)}" stroke-width=".7"/><ellipse cx="${f1(x - 1.5)}" cy="${f1(y - 1.2)}" rx="2" ry="1" fill="#fff" opacity=".35"/>`; }
      break;
    case 'slices':
      for (let i = 0; i < 13; i++) { const [x, y] = pt(.8), r = 12 + rnd() * 5; s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(r * .78)}" fill="${c}" stroke="${dark(c, .4)}" stroke-width="2.4"/><ellipse cx="${f1(x - 2)}" cy="${f1(y - 2)}" rx="${f1(r * .5)}" ry="${f1(r * .3)}" fill="${l}" opacity=".5"/>`; }
      break;
    case 'cubes': case 'roastveg':
      for (let i = 0; i < 26; i++) {
        const [x, y] = pt(.86), w = 13 + rnd() * 6, col = type === 'roastveg' ? pick() : c;
        s += `<rect x="${f1(x - w / 2)}" y="${f1(y - w / 2)}" width="${f1(w)}" height="${f1(w * .85)}" rx="3.5" transform="rotate(${Math.round(rnd() * 90)} ${f1(x)} ${f1(y)})" fill="${col}" stroke="${dark(col, .4)}" stroke-width="1.2"/><circle cx="${f1(x + 2)}" cy="${f1(y + 1)}" r="2" fill="${dark(col, .55)}" opacity=".55"/>`;
      }
      break;
    case 'patties':
      for (let i = 0; i < 4; i++) {
        const x = cx + (i % 2 ? 1 : -1) * rx * .42, y = cy + (i < 2 ? -1 : 1) * ry * .36, r = Math.min(rx, ry) * .52;
        s += `<ellipse cx="${f1(x)}" cy="${f1(y + 3)}" rx="${f1(r)}" ry="${f1(r * .82)}" fill="${dark(c, .4)}"/><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(r * .82)}" fill="${c}" stroke="${dark(c, .35)}" stroke-width="2"/>`;
        for (let j = 0; j < 10; j++) s += `<circle cx="${f1(x + (rnd() - .5) * r * 1.4)}" cy="${f1(y + (rnd() - .5) * r)}" r="${f1(1 + rnd() * 1.8)}" fill="${dark(c, .45)}" opacity=".6"/>`;
      }
      break;
    case 'pancakes':
      for (let i = 0; i < 4; i++) { const y = cy + ry * .35 - i * 7; s += `<ellipse cx="${cx}" cy="${f1(y + 3)}" rx="${rx * .8}" ry="${ry * .55}" fill="${dark(c, .35)}"/><ellipse cx="${cx}" cy="${f1(y)}" rx="${rx * .8}" ry="${ry * .55}" fill="${c}" stroke="${dark(c, .3)}" stroke-width="1.5"/>`; }
      s += `<ellipse cx="${cx}" cy="${cy - ry * .2}" rx="${rx * .45}" ry="${ry * .25}" fill="${dark(c, .2)}" opacity=".5"/>`;
      break;
    case 'fillet': {
      const w = rx * .85, h = ry * .7;
      s = `<path d="M${f1(cx - w)} ${f1(cy + h * .2)}Q${f1(cx - w * .9)} ${f1(cy - h)} ${f1(cx)} ${f1(cy - h * .9)}Q${f1(cx + w)} ${f1(cy - h * .8)} ${f1(cx + w)} ${f1(cy + h * .1)}Q${f1(cx + w * .8)} ${f1(cy + h)} ${f1(cx)} ${f1(cy + h * .85)}Q${f1(cx - w * .8)} ${f1(cy + h)} ${f1(cx - w)} ${f1(cy + h * .2)}Z" fill="${c}" stroke="${dark(c, .35)}" stroke-width="2"/>`;
      for (let i = -2; i <= 2; i++) s += `<path d="M${f1(cx + i * w * .32 - 8)} ${f1(cy - h * .7)}q10 ${f1(h * .7)} 2 ${f1(h * 1.4)}" fill="none" stroke="${l}" stroke-width="2.4" opacity=".7"/>`;
      s += `<path d="M${f1(cx - w * .7)} ${f1(cy - h * .3)}Q${f1(cx)} ${f1(cy - h * 1.1)} ${f1(cx + w * .7)} ${f1(cy - h * .4)}" fill="none" stroke="${dark(c, .45)}" stroke-width="4" opacity=".35" stroke-linecap="round"/>`;
      break;
    }
    case 'strips':
      for (let i = 0; i < 16; i++) { const [x, y] = pt(.8), col = rnd() > .35 ? c : pick(); s += `<rect x="${f1(x - 15)}" y="${f1(y - 4.5)}" width="30" height="9" rx="4.5" transform="rotate(${Math.round(rnd() * 160)} ${f1(x)} ${f1(y)})" fill="${col}" stroke="${dark(col, .35)}" stroke-width="1"/>`; }
      break;
    case 'salad':
      for (let i = 0; i < 22; i++) { const [x, y] = pt(.85); s += leaf(x, y, .9 + rnd() * .6, ['#7fae55', '#5f8f4a', '#9cc46a', '#4f7d3f'][i % 4], rnd() * 360); }
      for (let i = 0; i < 12; i++) { const [x, y] = pt(.75), col = pick(); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(4 + rnd() * 3)}" fill="${col}" stroke="${dark(col, .3)}"/>`; }
      break;
    case 'gratin':
      s = fill;
      for (let i = 0; i < 18; i++) { const [x, y] = pt(.85); s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(5 + rnd() * 9)}" ry="${f1(3 + rnd() * 5)}" fill="${dark(c, .25 + rnd() * .2)}" opacity=".55"/>`; }
      for (let i = 0; i < 8; i++) { const [x, y] = pt(.8); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="2" fill="#fff" opacity=".35"/>`; }
      break;
    case 'bites':
      for (let i = 0; i < 9; i++) { const [x, y] = pt(.7), r = 10 + rnd() * 2; s += `<circle cx="${f1(x)}" cy="${f1(y + 2)}" r="${f1(r)}" fill="${dark(c, .4)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${c}" stroke="${dark(c, .3)}"/><circle cx="${f1(x - 3)}" cy="${f1(y - 3)}" r="3" fill="#fff" opacity=".3"/>`; }
      break;
    case 'dip':
      s = fill + `<path d="M${f1(cx - rx * .55)} ${cy}a${f1(rx * .55)} ${f1(ry * .5)} 0 1 1 ${f1(rx * .9)} ${f1(ry * .1)}" fill="none" stroke="${d}" stroke-width="5" opacity=".35" stroke-linecap="round"/>`;
      s += `<ellipse cx="${cx + rx * .05}" cy="${cy}" rx="${rx * .22}" ry="${ry * .16}" fill="#c9b43a" opacity=".75"/>`;
      break;
    case 'fruit':
      for (let i = 0; i < 7; i++) { const [x, y] = pt(.7), a = Math.round(rnd() * 360), col = pick(); s += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${a})"><path d="M-14 0A14 14 0 0 0 14 0Z" fill="#f7efd8" stroke="${col}" stroke-width="3"/></g>`; }
      for (let i = 0; i < 10; i++) { const [x, y] = pt(.85); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5" fill="#7a2f4f"/><circle cx="${f1(x - 1.5)}" cy="${f1(y - 1.5)}" r="1.4" fill="#fff" opacity=".4"/>`; }
      break;
    default:
      s = fill;
  }
  return s;
}

function sauce(sc: { style: string; color: string } | undefined, cx: number, cy: number, rx: number, ry: number): string {
  if (!sc) return '';
  const c = sc.color;
  if (sc.style === 'dollop') {
    const x = cx + rx * .35, y = cy - ry * .25;
    return `<path d="M${x - 22} ${y + 4}Q${x - 24} ${y - 14} ${x - 4} ${y - 15}Q${x + 20} ${y - 18} ${x + 22} ${y + 1}Q${x + 20} ${y + 15} ${x} ${y + 14}Q${x - 18} ${y + 16} ${x - 22} ${y + 4}Z" fill="${c}" stroke="${dark(c, .15)}"/><path d="M${x - 10} ${y - 4}q8-6 16 0" stroke="#fff" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>`;
  }
  if (sc.style === 'drizzle') {
    let p = `M${cx - rx * .75} ${cy - ry * .4}`;
    for (let i = 0; i < 6; i++) p += ` q${f1(rx * .14)} ${f1((i % 2 ? -1 : 1) * ry * .55)} ${f1(rx * .25)} ${f1(ry * .14)}`;
    return `<path d="${p}" fill="none" stroke="${c}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>`;
  }
  return '';
}

function garnish(keys: string[] | undefined, cx: number, cy: number, rx: number, ry: number, rnd: Rnd): string {
  let s = '';
  const pt = (k = .85) => { const a = rnd() * Math.PI * 2, m = Math.sqrt(rnd()) * k; return [cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]; };
  for (const k of keys || []) {
    const [shape, c] = look(k);
    if (shape === 'leaves' || shape === 'stalk') {
      for (let i = 0; i < 16; i++) { const [x, y] = pt(); s += shape === 'stalk' ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.3" fill="none" stroke="${c}" stroke-width="1.6"/>` : `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${Math.round(rnd() * 360)})" d="M-4 0q4-5 8 0q-4 5-8 0z" fill="${c}"/>`; }
    } else if (shape === 'nuts' || shape === 'seeds') {
      for (let i = 0; i < (shape === 'seeds' ? 30 : 12); i++) { const [x, y] = pt(); const r = shape === 'seeds' ? 2 : 4.5; s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${r}" ry="${r * .65}" transform="rotate(${Math.round(rnd() * 180)} ${f1(x)} ${f1(y)})" fill="${c}" stroke="${dark(c, .4)}" stroke-width=".6"/>`; }
    } else if (shape === 'spice') {
      for (let i = 0; i < 22; i++) { const [x, y] = pt(); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(.9 + rnd() * .9)}" fill="${c}" opacity=".85"/>`; }
    } else if (shape === 'citrus') {
      const x = cx + rx * .8, y = cy + ry * .55;
      s += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(-25)"><path d="M-15 0A15 15 0 0 0 15 0Z" fill="${c}" stroke="${dark(c, .3)}" stroke-width="1.5"/><path d="M-11 1A11 11 0 0 0 11 1Z" fill="${light(c, .45)}"/></g>`;
    } else if (k === 'avocado') {
      const x = cx + rx * .35, y = cy + ry * .2;
      for (let i = 0; i < 4; i++) s += `<path transform="translate(${f1(x + i * 7)} ${f1(y - i * 3)}) rotate(${-30 + i * 8})" d="M-16 0Q-8-9 16-4Q6 7-16 0Z" fill="#c4d47c" stroke="#4a6b35" stroke-width="2"/>`;
    } else if (shape === 'tub' || shape === 'carton') {
      s += sauce({ style: 'dollop', color: '#f8f5ec' }, cx, cy, rx, ry);
    } else if (shape === 'block' || shape === 'wedge' || shape === 'ball') {
      for (let i = 0; i < 10; i++) { const [x, y] = pt(.75); s += `<rect x="${f1(x - 4)}" y="${f1(y - 4)}" width="8" height="7" rx="1.5" transform="rotate(${Math.round(rnd() * 90)} ${f1(x)} ${f1(y)})" fill="${c}" stroke="${dark(c, .2)}" stroke-width=".6"/>`; }
    } else if (shape === 'tomato' || shape === 'pepper') {
      for (let i = 0; i < 6; i++) { const [x, y] = pt(.8); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5" fill="${c}" stroke="${dark(c, .3)}"/>`; }
    } else if (shape === 'onion') {
      for (let i = 0; i < 8; i++) { const [x, y] = pt(.8); s += `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${Math.round(rnd() * 360)})" d="M-7 0a7 5 0 0 1 14 0" fill="none" stroke="${k === 'redonion' ? '#9b4a6b' : '#b07a3a'}" stroke-width="2.4" stroke-linecap="round"/>`; }
    } else if (shape === 'jar' || shape === 'bottle') {
      s += sauce({ style: 'drizzle', color: c }, cx, cy, rx, ry);
    } else {
      for (let i = 0; i < 8; i++) { const [x, y] = pt(.8); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.5" fill="${c}" stroke="${dark(c, .3)}" stroke-width=".6"/>`; }
    }
  }
  return s;
}

// ---------- Geschirr ----------
const handle = (x: number, y: number, rot: number): string => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="0" y="-7" width="96" height="14" rx="7" fill="url(#g-steelv)" stroke="#7f8a91" stroke-width="1.2"/><rect x="74" y="-3" width="14" height="6" rx="3" fill="#8f9aa1"/><circle cx="8" cy="0" r="2.6" fill="#a7b0b6" stroke="#6f7a81"/></g>`;
export function panShape(cx: number, cy: number, rx: number, ry: number, withHandle = true): string {
  return `<ellipse cx="${cx}" cy="${cy + ry * .12}" rx="${rx * 1.02}" ry="${ry * 1.02}" fill="url(#g-shadow)"/>` +
    (withHandle ? handle(cx + rx * .92, cy - ry * .15, -14) : '') +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#g-steel)" stroke="#7f8a91" stroke-width="1.5"/>` +
    `<ellipse cx="${cx}" cy="${cy + 2}" rx="${rx * .86}" ry="${ry * .84}" fill="url(#g-steelin)" stroke="#9aa4aa"/>` +
    `<path d="M${cx - rx * .6} ${cy - ry * .55}Q${cx - rx * .1} ${cy - ry * .85} ${cx + rx * .45} ${cy - ry * .6}" fill="none" stroke="#fff" stroke-width="3" opacity=".55" stroke-linecap="round"/>`;
}
export function potShape(cx: number, top: number, w: number, h: number, surface: string): string {
  const rx = w / 2, ry = w * .16;
  return `<ellipse cx="${cx}" cy="${top + h + 4}" rx="${rx * 1.05}" ry="${ry * 1.1}" fill="url(#g-shadow)"/>` +
    `<rect x="${cx - rx - 16}" y="${top + 10}" width="22" height="9" rx="4.5" fill="#9aa4aa"/><rect x="${cx + rx - 6}" y="${top + 10}" width="22" height="9" rx="4.5" fill="#9aa4aa"/>` +
    `<path d="M${cx - rx} ${top}V${top + h}Q${cx - rx} ${top + h + ry} ${cx} ${top + h + ry}Q${cx + rx} ${top + h + ry} ${cx + rx} ${top + h}V${top}Z" fill="url(#g-steelv)" stroke="#7f8a91" stroke-width="1.5"/>` +
    `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="#d5dbdf" stroke="#7f8a91" stroke-width="1.5"/>` +
    `<ellipse cx="${cx}" cy="${top + 3}" rx="${rx * .9}" ry="${ry * .78}" fill="${surface}"/>` +
    `<ellipse cx="${cx - rx * .3}" cy="${top + 1}" rx="${rx * .3}" ry="${ry * .25}" fill="#fff" opacity=".22"/>`;
}
export function jarShape(cx: number, cy: number, s = 1, open = true, surface = '#c96a3a'): string {
  // Thermobox (Speisegefäß) aus Edelstahl
  const w = 70 * s, h = 92 * s, ry = 14 * s;
  return `<g><ellipse cx="${cx}" cy="${cy + h / 2 + 4}" rx="${w * .62}" ry="${ry}" fill="url(#g-shadow)"/>` +
    `<path d="M${cx - w / 2} ${cy - h / 2}V${cy + h / 2}Q${cx} ${cy + h / 2 + ry * 1.4} ${cx + w / 2} ${cy + h / 2}V${cy - h / 2}Z" fill="url(#g-steelv)" stroke="#6f7a81" stroke-width="1.5"/>` +
    `<rect x="${cx - w / 2}" y="${cy - h * .05}" width="${w}" height="${h * .24}" fill="#3f5a4c" opacity=".9"/>` +
    `<path d="M${cx - w / 2} ${cy - h * .05}Q${cx} ${cy + ry * .6 - h * .05} ${cx + w / 2} ${cy - h * .05}" fill="none" stroke="#2c4136" opacity=".6"/>` +
    (open
      ? `<ellipse cx="${cx}" cy="${cy - h / 2}" rx="${w / 2}" ry="${ry}" fill="#dfe4e7" stroke="#6f7a81" stroke-width="1.5"/><ellipse cx="${cx}" cy="${cy - h / 2 + 2}" rx="${w / 2 - 6 * s}" ry="${ry - 4 * s}" fill="${surface}"/>`
      : `<ellipse cx="${cx}" cy="${cy - h / 2}" rx="${w / 2}" ry="${ry}" fill="#3f5a4c" stroke="#2c4136"/><rect x="${cx - w / 2}" y="${cy - h / 2 - 16 * s}" width="${w}" height="${16 * s}" fill="#3f5a4c"/><ellipse cx="${cx}" cy="${cy - h / 2 - 16 * s}" rx="${w / 2}" ry="${ry}" fill="#5a7a68" stroke="#2c4136"/>`) +
    `</g>`;
}

// Hintergründe passend zur Palette „Gartenmorgen“: Butter, Sellerie, Radieschen-Rosé, Lavendel
const MEAL_BG: Record<string, string> = { breakfast: '#f7edc6', lunch: '#e2ecd6', dinner: '#f4e2e4', snack: '#ebe5f1' };

// ---------- Gerichts-Illustration ----------
export function dishArt(r: Recipe, { w = 360, h = 220, label = true } = {}): string {
  const a = r.art || { dish: 'plate', base: { type: 'stew', color: '#c96a3a' } };
  const rnd = seeded(r.id);
  const cols = chunkColors(r);
  const id = 'c' + (++uid);
  const bg = MEAL_BG[r.meals[0]] || '#ece4d6';
  let s = `<rect width="360" height="220" fill="${bg}"/>`;
  // Tischtextur: Leinen-Serviette
  s += `<rect x="${rnd() > .5 ? 236 : 8}" y="150" width="118" height="80" rx="6" fill="#fffaf0" opacity=".55" transform="rotate(${rnd() > .5 ? 6 : -8} 290 190)"/>`;
  let cx = 180, cy = 112, rx = 108, ry = 64, clip = '';
  if (a.dish === 'plate') {
    s += `<ellipse cx="180" cy="126" rx="150" ry="84" fill="url(#g-shadow)"/><ellipse cx="180" cy="112" rx="142" ry="84" fill="url(#g-plate)" stroke="#d6ccb8" stroke-width="1.5"/><ellipse cx="180" cy="114" rx="108" ry="62" fill="#f7f2e6" stroke="#e5dccb"/>`;
    clip = `<ellipse cx="180" cy="114" rx="104" ry="59"/>`;
  } else if (a.dish === 'bowl') {
    s += `<ellipse cx="180" cy="178" rx="120" ry="30" fill="url(#g-shadow)"/><path d="M58 98Q66 186 180 190Q294 186 302 98Z" fill="url(#g-bowl)" stroke="#bfb196" stroke-width="1.5"/><ellipse cx="180" cy="98" rx="122" ry="62" fill="#f8f3e8" stroke="#bfb196" stroke-width="1.5"/>`;
    cy = 100; rx = 110; ry = 54; clip = `<ellipse cx="180" cy="100" rx="110" ry="54"/>`;
  } else if (a.dish === 'pan') {
    s += panShape(160, 116, 122, 78);
    cx = 160; cy = 118; rx = 102; ry = 63; clip = `<ellipse cx="160" cy="118" rx="102" ry="63"/>`;
  } else if (a.dish === 'tray') {
    s += `<rect x="40" y="58" width="280" height="138" rx="26" fill="#1d2b24" opacity=".14"/><rect x="34" y="40" width="292" height="146" rx="26" fill="#f4efe6" stroke="#c9bfa9" stroke-width="2"/><rect x="18" y="96" width="26" height="30" rx="10" fill="#f4efe6" stroke="#c9bfa9" stroke-width="2"/><rect x="316" y="96" width="26" height="30" rx="10" fill="#f4efe6" stroke="#c9bfa9" stroke-width="2"/><rect x="52" y="56" width="256" height="114" rx="18" fill="#efe6d4"/>`;
    cx = 180; cy = 113; rx = 125; ry = 56; clip = `<rect x="54" y="58" width="252" height="110" rx="16"/>`;
  } else if (a.dish === 'jar') {
    s += jarShape(276, 128, 1.05, false);
    s += `<ellipse cx="146" cy="168" rx="112" ry="26" fill="url(#g-shadow)"/><path d="M40 104Q46 172 146 176Q246 172 252 104Z" fill="url(#g-steelv)" stroke="#6f7a81" stroke-width="1.5"/><ellipse cx="146" cy="104" rx="106" ry="56" fill="#dfe4e7" stroke="#6f7a81" stroke-width="1.5"/>`;
    cx = 146; cy = 106; rx = 96; ry = 49; clip = `<ellipse cx="146" cy="106" rx="96" ry="49"/>`;
  }
  let food = '';
  const base = a.base, side = a.side;
  if (a.sauce?.style === 'pool') food += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${a.sauce.color}"/>`;
  if (side && a.dish !== 'pan') {
    const split = a.dish === 'tray' ? .58 : .6;
    const bx = cx - rx * (1 - split) * .9, srx = rx * (1 - split) * 1.05;
    food += texture(side.type, side.color, cx + rx * .58, cy - ry * .05, srx, ry * .78, rnd, cols);
    food += texture(base.type, base.color, bx, cy + ry * .02, rx * split * 1.05, ry * .92, rnd, cols);
  } else {
    if (side) food += texture(side.type, side.color, cx + rx * .45, cy, rx * .5, ry * .75, rnd, cols);
    food += texture(base.type, base.color, side ? cx - rx * .18 : cx, cy, side ? rx * .78 : rx * .96, ry * .94, rnd, cols);
  }
  if (a.sauce && a.sauce.style !== 'pool') food += sauce(a.sauce, cx - (side ? rx * .2 : 0), cy, rx * .8, ry);
  food += garnish(a.garnish, cx - (side ? rx * .15 : 0), cy, rx * .78, ry * .8, rnd);
  s += `<clipPath id="${id}">${clip}</clipPath><g clip-path="url(#${id})">${food}</g>`;
  if (a.dish === 'bowl' || a.dish === 'jar') s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="6"/>`;
  return `<svg viewBox="0 0 360 220" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" role="img"${label ? ` aria-label="${esc('Illustration: ' + r.title)}"` : ' aria-hidden="true"'}>${s}</svg>`;
}

// ---------- Kochschritt-Illustration ----------
function heat(text: string): number {
  const t = text.toLowerCase();
  if (/(starke|hohe|mittelhohe|kräftig|scharf an)/.test(t)) return 3;
  if (/(mittlere|mittel)/.test(t)) return 2;
  if (/(kleine|schwache|niedrige|sanft|leise|ziehen)/.test(t)) return 1;
  return 2;
}
function burner(cx: number, y: number, level: number): string {
  let s = `<ellipse cx="${cx}" cy="${y}" rx="96" ry="18" fill="#2f3a35"/><ellipse cx="${cx}" cy="${y - 2}" rx="78" ry="13" fill="none" stroke="#56635c" stroke-width="2"/>`;
  s += `<ellipse cx="${cx}" cy="${y - 2}" rx="${40 + level * 14}" ry="${8 + level * 2}" fill="url(#g-glow)" opacity="${.35 + level * .2}"/>`;
  return s;
}
function heatBadge(level: number): string {
  const flames = Array.from({ length: 3 }, (_, i) => `<path transform="translate(${18 + i * 14} 22)" d="M0 8Q-6 2 0-8Q6 2 0 8Z" fill="${i < level ? 'url(#g-flame)' : '#cfd6cf'}"/>`).join('');
  return `<g><rect x="6" y="8" width="58" height="28" rx="14" fill="#fff" opacity=".85"/>${flames}</g>`;
}
function steam(cx: number, y: number, n = 3): string {
  return Array.from({ length: n }, (_, i) => `<path d="M${cx - 24 + i * 24} ${y}q-8-10 0-20t0-20" fill="none" stroke="#fff" stroke-width="3.5" opacity=".75" stroke-linecap="round"/>`).join('');
}
function board(x: number, y: number, w: number, h: number): string { return `<rect x="${x + 4}" y="${y + 6}" width="${w}" height="${h}" rx="16" fill="#1d2b24" opacity=".14"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="url(#g-wood)" stroke="#a9845a" stroke-width="2"/><circle cx="${x + w - 18}" cy="${y + 18}" r="6" fill="#a9845a"/>`; }
const knife = (x: number, y: number, rot: number): string => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0L86-6Q96 0 86 8L0 8Z" fill="url(#g-steelv)" stroke="#6f7a81"/><rect x="-46" y="-2" width="48" height="12" rx="5" fill="#2f3a35"/></g>`;

function pieces(k: string, cx: number, cy: number, rx: number, ry: number, rnd: Rnd, n = 14): string {
  const [shape, c] = look(k);
  let col = c;
  if (k === 'potato' || k === 'floury') col = '#e8c77e';
  if (['spice', 'bottle', 'drop', 'tub', 'carton', 'can', 'tube', 'jar'].includes(shape)) return '';
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, m = Math.sqrt(rnd()) * .85, x = cx + Math.cos(a) * rx * m, y = cy + Math.sin(a) * ry * m;
    if (shape === 'leaves') s += leaf(x, y, .7, c, rnd() * 360);
    else if (shape === 'grains' || shape === 'pile') s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="${c}" stroke="${dark(c, .3)}" stroke-width=".5"/>`;
    else if (shape === 'beans' || shape === 'nuts' || shape === 'seeds') s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${shape === 'seeds' ? 2.5 : 6}" ry="${shape === 'seeds' ? 1.6 : 4}" transform="rotate(${Math.round(rnd() * 180)} ${f1(x)} ${f1(y)})" fill="${c}" stroke="${dark(c, .35)}" stroke-width=".7"/>`;
    else if (shape === 'meat' || shape === 'fish' || shape === 'mince' || shape === 'shrimp') s += `<rect x="${f1(x - 9)}" y="${f1(y - 6)}" width="18" height="12" rx="4" transform="rotate(${Math.round(rnd() * 90)} ${f1(x)} ${f1(y)})" fill="${dark(col, .12)}" stroke="${dark(col, .4)}" stroke-width="1"/>`;
    else if (shape === 'stalk') s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="none" stroke="${c}" stroke-width="2"/>`;
    else s += `<rect x="${f1(x - 6)}" y="${f1(y - 5)}" width="12" height="10" rx="3" transform="rotate(${Math.round(rnd() * 90)} ${f1(x)} ${f1(y)})" fill="${col}" stroke="${dark(col, .35)}" stroke-width=".9"/>`;
  }
  return s;
}

export function stepArt(r: Recipe, step: Step, i: number): string {
  const rnd = seeded(r.id + '-' + i);
  const items = (step.items || []).filter(k => F[k]);
  const bg = '#ebe4d6';
  let s = `<rect width="360" height="190" fill="${bg}"/><rect y="150" width="360" height="40" fill="#e1d8c6"/>`;
  const act = step.action;
  const lvl = heat(step.text);

  if (act === 'plate') return dishArt(r, { w: 360, h: 190, label: true }).replace('viewBox="0 0 360 220"', 'viewBox="0 15 360 190"');
  if (['cut', 'shape', 'grate', 'squeeze'].includes(act)) {
    s += board(40, 40, 250, 116);
    if (act === 'cut') { s += knife(214, 136, -18); items.forEach((k, j) => { s += ingredientIcon(k, 82 + j * 46, 78, .95); s += pieces(k, 150 + j * 26, 116, 34, 16, rnd, 10); }); }
    if (act === 'grate') { s += `<path d="M196 54L246 42L268 136L192 146Z" fill="url(#g-steel)" stroke="#6f7a81" stroke-width="2"/>` + Array.from({ length: 12 }, (_, j) => `<path d="M${206 + (j % 3) * 14} ${64 + Math.floor(j / 3) * 18}l7-2" stroke="#4d565c" stroke-width="2.4" stroke-linecap="round"/>`).join(''); items.forEach((k, j) => { s += ingredientIcon(k, 90 + j * 44, 76, .9); s += pieces(k, 120, 120, 50, 16, rnd, 16); }); }
    if (act === 'squeeze') { s += `<path d="M84 64Q150 50 218 66L232 110Q168 140 98 116Z" fill="#fbf8ec" stroke="#b6b9a6" stroke-width="2"/><path d="M128 72q20 20 52 4M110 98q40 18 90-4" stroke="#d8d6c2" stroke-width="2" fill="none"/>` + Array.from({ length: 5 }, (_, j) => `<path transform="translate(${134 + j * 16} ${136 + (j % 2) * 6})" d="M0-6Q5 0 3 3Q1 6 0 6Q-1 6-3 3Q-5 0 0-6Z" fill="#9cc9e0"/>`).join(''); items.forEach(k => { s += pieces(k, 160, 92, 50, 18, rnd, 12); }); }
    if (act === 'shape') { for (let j = 0; j < 6; j++) { const x = 84 + (j % 3) * 56, y = 74 + Math.floor(j / 3) * 46, c = items[0] ? look(items[0])[1] : '#d9b36a'; s += `<ellipse cx="${x}" cy="${y + 3}" rx="22" ry="15" fill="${dark(c, .4)}" opacity=".5"/><ellipse cx="${x}" cy="${y}" rx="22" ry="15" fill="${light(c, .1)}" stroke="${dark(c, .3)}" stroke-width="1.5"/>`; } }
  } else if (['mix', 'mash'].includes(act)) {
    const surf = items.some(k => ['quark', 'yogurt', 'creme', 'schmand', 'creamcheese', 'milk'].includes(k)) ? '#f7f3e9' : items[0] ? light(look(items[0])[1], .2) : '#e9d9b6';
    s += `<ellipse cx="170" cy="152" rx="104" ry="22" fill="url(#g-shadow)"/><path d="M72 84Q80 156 170 158Q260 156 268 84Z" fill="url(#g-bowl)" stroke="#bfb196" stroke-width="1.5"/><ellipse cx="170" cy="84" rx="98" ry="38" fill="#f8f3e8" stroke="#bfb196" stroke-width="1.5"/><ellipse cx="170" cy="88" rx="84" ry="29" fill="${surf}"/>`;
    s += `<path d="M120 88q25-18 50 0t50 0" stroke="${dark(surf, .15)}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`;
    items.slice(1).forEach(k => { s += pieces(k, 170, 88, 70, 22, rnd, 9); });
    s += act === 'mash'
      ? `<g transform="translate(232 30) rotate(28)"><rect x="-4" y="0" width="8" height="58" rx="4" fill="#2f3a35"/><rect x="-22" y="56" width="44" height="10" rx="4" fill="url(#g-steelv)" stroke="#6f7a81"/></g>`
      : `<g transform="translate(236 20) rotate(32)"><rect x="-4" y="0" width="8" height="46" rx="4" fill="#2f3a35"/><path d="M0 44q-16 18 0 42q16-24 0-42M0 44q-8 20 0 42q8-22 0-42" fill="none" stroke="#8f9aa1" stroke-width="2.2"/></g>`;
    if (items[0]) s += ingredientIcon(items[0], 318, 60, .8);
    if (items[1]) s += ingredientIcon(items[1], 318, 118, .8);
  } else if (['pan', 'flip', 'toast', 'deglaze'].includes(act)) {
    s += burner(160, 148, lvl);
    s += panShape(160, 104, 118, 56);
    const fillRx = 96, fillRy = 42;
    if (act !== 'toast') s += `<ellipse cx="160" cy="106" rx="${fillRx * .9}" ry="${fillRy * .85}" fill="#e9c66e" opacity=".22"/>`;
    const id = 'c' + (++uid);
    let inside = '';
    const its = items.filter(k => !['olive', 'rapeseed', 'butter', 'salt', 'blackpepper', 'water'].includes(look(k)[0] === 'spice' ? '' : k) && look(k)[0] !== 'spice' && look(k)[0] !== 'bottle');
    if (its.length) its.forEach((k, j) => { inside += pieces(k, 160 + (j - (its.length - 1) / 2) * 30, 106, fillRx * .75, fillRy * .7, rnd, its.length > 1 ? 12 : 18); });
    else inside += pieces('potato', 160, 106, fillRx * .7, fillRy * .7, rnd, 14);
    s += `<clipPath id="${id}"><ellipse cx="160" cy="106" rx="${fillRx}" ry="${fillRy}"/></clipPath><g clip-path="url(#${id})">${inside}</g>`;
    if (act === 'flip') s += `<g transform="translate(222 46) rotate(-28)"><rect x="-26" y="-12" width="52" height="24" rx="5" fill="url(#g-steelv)" stroke="#6f7a81"/><rect x="24" y="-4" width="60" height="8" rx="4" fill="#2f3a35"/></g><path d="M110 40q30-30 60 0" fill="none" stroke="#bd4d2d" stroke-width="3" stroke-linecap="round" marker-end=""/><path d="M166 34l5 7 6-6" fill="none" stroke="#bd4d2d" stroke-width="3" stroke-linecap="round"/>`;
    if (act === 'deglaze') s += `<g transform="translate(232 16) rotate(28)"><path d="M0 0h34l-4 38H4z" fill="#eef3f5" stroke="#8f9aa1" stroke-width="1.5" opacity=".9"/><path d="M4 22h27l-2 14H6z" fill="#c9a46a" opacity=".7"/></g>` + steam(170, 78, 3);
    if (act === 'pan' && lvl === 3) s += steam(160, 70, 2);
    s += heatBadge(lvl);
    items.filter(k => look(k)[0] === 'spice' || look(k)[0] === 'bottle').slice(0, 2).forEach((k, j) => { s += ingredientIcon(k, 322, 50 + j * 54, .8); });
  } else if (['pot', 'blend'].includes(act)) {
    s += burner(170, 160, lvl);
    const main = items.find(k => !['water', 'salt', 'broth', 'blackpepper'].includes(k));
    let surf = main ? look(main)[1] : '#c96a3a';
    if (['rice', 'risotto', 'oats', 'semolina', 'polenta', 'quark', 'milk'].includes(main ?? '')) surf = '#efe6cf';
    if (['passata', 'cannedtomato', 'paste'].includes(main ?? '')) surf = '#b8452e';
    s += potShape(170, 70, 170, 74, light(surf, .1));
    const id = 'c' + (++uid);
    s += `<clipPath id="${id}"><ellipse cx="170" cy="73" rx="76" ry="21"/></clipPath><g clip-path="url(#${id})">${items.filter(k => k !== main).map(k => pieces(k, 170, 73, 64, 16, rnd, 10)).join('')}</g>`;
    if (act === 'blend') s += `<g transform="translate(206 0) rotate(14)"><rect x="-11" y="0" width="22" height="58" rx="9" fill="#2f3a35"/><rect x="-4" y="56" width="8" height="30" fill="url(#g-steelv)"/><path d="M-12 86h24l-4 8h-16z" fill="url(#g-steelv)" stroke="#6f7a81"/></g>`;
    else s += steam(170, 52, lvl >= 2 ? 3 : 2);
    s += heatBadge(lvl);
  } else if (act === 'oven') {
    const temp = (step.text.match(/(\d{3})\s?°C/) || [])[1];
    s += `<rect x="60" y="14" width="240" height="160" rx="16" fill="#3b4842" stroke="#26302b" stroke-width="2"/><rect x="60" y="14" width="240" height="26" rx="12" fill="#56635c"/><circle cx="90" cy="27" r="7" fill="#c9d0d4"/><circle cx="270" cy="27" r="7" fill="#c9d0d4"/>`;
    s += `<rect x="80" y="52" width="200" height="106" rx="12" fill="#261a12"/><rect x="80" y="52" width="200" height="106" rx="12" fill="url(#g-glow)" opacity=".75"/>`;
    s += `<rect x="96" y="104" width="168" height="34" rx="6" fill="#8f9aa1"/><rect x="100" y="98" width="160" height="30" rx="5" fill="#f4efe6"/>`;
    const id = 'c' + (++uid);
    s += `<clipPath id="${id}"><rect x="102" y="100" width="156" height="26" rx="4"/></clipPath><g clip-path="url(#${id})">${(items.length ? items : ['potato']).map(k => pieces(k, 180, 113, 70, 11, rnd, 12)).join('')}</g>`;
    if (temp) s += `<rect x="146" y="20" width="68" height="16" rx="8" fill="#26302b"/><text x="180" y="32.5" text-anchor="middle" font-size="12" font-weight="700" fill="#ffb54a" font-family="system-ui,sans-serif">${temp} °C</text>`;
  } else if (act === 'jar') {
    const main = items.find(k => !['water', 'salt'].includes(k));
    const surf = main ? look(main)[1] : '#c96a3a';
    s += burner(110, 160, 3) + potShape(110, 82, 130, 62, light(surf, .05)) + steam(110, 66, 3);
    s += jarShape(262, 104, .95, true, surf);
    s += `<path d="M176 60q36-34 70 6" fill="none" stroke="#bd4d2d" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 6"/><path d="M240 58l7 9 4-11" fill="none" stroke="#bd4d2d" stroke-width="3" stroke-linecap="round"/>`;
    s += `<g transform="translate(316 150)"><rect x="-22" y="-8" width="44" height="18" rx="4" fill="#3f5a4c"/><ellipse cy="-8" rx="22" ry="6" fill="#5a7a68"/></g>`;
  } else {
    items.forEach((k, j) => { s += ingredientIcon(k, 90 + j * 80, 95, 1.2); });
  }
  return `<svg viewBox="0 0 360 190" role="img" aria-label="${esc(`Schritt ${i + 1}: ${step.title}`)}">${s}</svg>`;
}

// ---------- Startseite & Wissen ----------
export function heroArt() {
  const rnd = seeded('hero');
  let s = '';
  s += panShape(92, 100, 78, 46, false) + handle(160, 92, -14);
  const id = 'c' + (++uid);
  s += `<clipPath id="${id}"><ellipse cx="92" cy="102" rx="64" ry="37"/></clipPath><g clip-path="url(#${id})">${texture('slices', '#d9a85a', 92, 102, 64, 37, rnd, ['#e8c77e'])}${garnish(['chives'], 92, 102, 50, 28, rnd)}</g>`;
  s += jarShape(232, 96, .7, false);
  s += `<path d="M196 40q-8-10 0-20t0-20" fill="none" stroke="#66756b" stroke-width="2.5" opacity=".35" stroke-linecap="round" transform="translate(40 10)"/>`;
  return `<svg viewBox="0 0 270 150" aria-hidden="true">${s}</svg>`;
}
export function waterTestArt() {
  let s = `<rect width="360" height="200" fill="#ebe4d6"/>` + burner(170, 168, 2) + panShape(170, 112, 130, 66);
  const beads = [[130, 104, 7], [168, 118, 9], [205, 100, 6], [150, 128, 5], [190, 132, 4]];
  s += beads.map(([x, y, r]) => `<ellipse cx="${x}" cy="${y + r * .6}" rx="${r}" ry="${r * .35}" fill="#000" opacity=".12"/><circle cx="${x}" cy="${y}" r="${r}" fill="#bfe0f0" stroke="#6f9fb8"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .3}" fill="#fff"/>`).join('');
  s += `<path d="M120 112l-14 4M216 104l14-4" stroke="#6f9fb8" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 4"/>`;
  return `<svg viewBox="0 0 360 200" role="img" aria-label="Wassertropfen perlen als Kugeln über den heißen Edelstahlboden">${s}</svg>`;
}
export function thermosArt() {
  let s = `<rect width="360" height="200" fill="#dfe7d6"/>`;
  s += `<g transform="translate(70 40)"><path d="M0 40Q0 0 40 0h30q14 0 14 14v6h-74v20z" fill="#5d676d"/><rect x="-6" y="40" width="96" height="100" rx="14" fill="url(#g-steelv)" stroke="#6f7a81"/><path d="M84 60q30 0 30 30t-30 30" fill="none" stroke="#5d676d" stroke-width="10"/></g>`;
  s += steam(130, 32, 2);
  s += jarShape(258, 112, 1.1, true, '#c4552f');
  s += `<g font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#243e33"><text x="214" y="190">≥ 75 °C einfüllen</text><text x="52" y="190">5–10 Min. vorheizen</text></g>`;
  return `<svg viewBox="0 0 360 200" role="img" aria-label="Thermobox mit kochendem Wasser vorheizen und heißes Essen einfüllen">${s}</svg>`;
}

// beim Build vorgerendert (tools/render-art.ts)
export const heroUrl = (): string => './art/hero.webp';
export const waterTestUrl = (): string => './art/watertest.webp';
export const thermosUrl = (): string => './art/thermos.webp';
