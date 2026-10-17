// Gemeinsamer Zugriff auf Daten und Zustand für die Logik-Module.
// In der App liefern die Getter reaktive Svelte-Werte, in Tests einfache Objekte.
import type { AppState, Foods, Recipe } from './types.ts';

export interface Ctx {
  readonly F: Foods;
  readonly R: Recipe[];
  readonly byId: Map<string, Recipe>;
  readonly state: AppState;
}
export let ctx: Ctx = null as unknown as Ctx;
export function setCtx(c: Ctx): void { ctx = c; }
