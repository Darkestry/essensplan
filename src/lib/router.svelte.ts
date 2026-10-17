// Hash-Router: #/name/a/b. Rezepte (#/r/…) öffnen als Overlay über der zuletzt gezeigten Seite.
export interface Route { name: string; a?: string; b?: string }

function parse(): Route {
  const [name = 'heute', a, b] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { name, a, b };
}
const OVERLAY = new Set(['r']);

export const router = $state({
  route: parse(),
  /** Seite unter einem Overlay */
  base: OVERLAY.has(parse().name) ? { name: 'rezepte' } as Route : parse(),
  /** Overlay wurde aus der App heraus geöffnet → "Zurück" = history.back() */
  overlayFromApp: false,
});

window.addEventListener('hashchange', () => {
  const r = parse();
  const wasOverlay = OVERLAY.has(router.route.name);
  if (OVERLAY.has(r.name)) { if (!wasOverlay) router.overlayFromApp = true; }
  else router.base = r;
  router.route = r;
});

export const isOverlay = (): boolean => OVERLAY.has(router.route.name);
export function go(hash: string): void { location.hash = hash; }
export function closeOverlay(): void {
  if (router.overlayFromApp) { router.overlayFromApp = false; history.back(); }
  else { const b = router.base; location.hash = `#/${b.name}${b.a ? '/' + b.a : ''}${b.b ? '/' + b.b : ''}`; }
}
