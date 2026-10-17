// Kleine Extras für mehr Energie und Eiweiß (Mengen pro Person).
export interface Booster { id: string; label: string; items: [string, number][] }
export const BOOSTERS: Booster[] = [
  { id: 'oil', label: '1 EL Olivenöl übers Essen', items: [['olive', 12]] },
  { id: 'nuts', label: 'Eine Handvoll Walnüsse (30 g)', items: [['walnuts', 30]] },
  { id: 'almonds', label: 'Eine Handvoll Mandeln (30 g)', items: [['almonds', 30]] },
  { id: 'pb', label: '2 EL Erdnussmus (30 g)', items: [['peanutbutter', 30]] },
  { id: 'milk', label: 'Ein großes Glas Milch (300 ml)', items: [['milk', 300]] },
  { id: 'yogurt', label: 'Joghurt mit Honig', items: [['yogurt', 200], ['honey', 15]] },
  { id: 'dates', label: '4 Datteln mit Mandeln', items: [['dates', 40], ['almonds', 15]] },
  { id: 'banana', label: 'Banane mit Erdnussmus', items: [['banana', 120], ['peanutbutter', 20]] },
  { id: 'cheese', label: 'Ein Stück Käse (40 g)', items: [['cheese', 40]] },
  { id: 'tahini', label: '1 EL Tahin übers Essen', items: [['tahini', 15]] },
];
