// Drucken: Wochenplan, Einkaufsliste, Rezept – als schlichtes HTML in #printArea (Druck-CSS in app.css).
import { app, db } from './app.svelte.ts';
import { activeSlots, getEntry, recipeOf } from './core/plan.ts';
import { prepTasks } from './core/prep.ts';
import { GROUP_ORDER, SLOT_LABEL } from './core/recipes.ts';
import { fmtQty, packHint, shopping } from './core/shopping.ts';
import type { Recipe } from './core/types.ts';
import { DAYS, DAYS_SHORT, dayIndex, esc, fmtMinutes, shortDate, weekDates, weekLabel } from './core/util.ts';

function printHTML(html: string): void {
  let area = document.getElementById('printArea');
  if (!area) {
    area = document.createElement('section');
    area.id = 'printArea';
    document.body.appendChild(area);
  }
  area.innerHTML = html;
  setTimeout(() => window.print(), 50);
}

function shoppingPrint(monday: string): string {
  const F = db.F;
  const list = shopping(monday);
  return GROUP_ORDER.map(g => {
    const items = list.filter(i => F[i.k].group === g);
    if (!items.length) return '';
    return `<div class="pg"><h3>${esc(g)}</h3>${items.map(i => {
      const hint = packHint(i.k, i.q);
      return `<div><span class="box"></span>${esc(fmtQty(i.k, i.q))} ${esc(F[i.k].name)}${hint ? ` <small>(${esc(hint)})</small>` : ''}</div>`;
    }).join('')}</div>`;
  }).join('');
}

export function printWeek(monday: string): void {
  const slots = activeSlots();
  const persons = app.settings.persons;
  const rows = weekDates(monday).map((d, i) => `<tr><th>${DAYS[i]}<br><small>${esc(shortDate(d))}</small></th>${slots.map(sl => {
    const e = getEntry(d, sl), r = recipeOf(e);
    if (!e) return '<td>–</td>';
    const name = r ? r.title : 't' in e ? e.t : '';
    return `<td>${esc(name)}${'lo' in e && e.lo ? ' <small>(Rest)</small>' : ''}</td>`;
  }).join('')}</tr>`).join('');
  const tasks = prepTasks(monday);
  printHTML(`<h1>Woche ${esc(weekLabel(monday))}</h1><p>${persons} ${persons === 1 ? 'Person' : 'Personen'}</p>
  <h2>Plan</h2><table><thead><tr><th></th>${slots.map(s => `<th>${esc(SLOT_LABEL[s])}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
  ${tasks.length ? `<h2>Vorkochen</h2>${tasks.map(t => `<div class="pg"><span class="box"></span><b>${DAYS_SHORT[dayIndex(t.date)]} ${esc(t.when)}:</b> ${esc(t.title)}</div>`).join('')}` : ''}
  <h2>Einkauf</h2><div class="cols">${shoppingPrint(monday)}</div>`);
}

export function printShopping(monday: string): void {
  printHTML(`<h1>Einkaufsliste ${esc(weekLabel(monday))}</h1><div class="cols">${shoppingPrint(monday)}</div>`);
}

export function printRecipe(r: Recipe, portions: number): void {
  const F = db.F, p = portions;
  printHTML(`<h1>${esc(r.title)}</h1><p>${esc(r.subtitle)}</p><p>${esc(fmtMinutes(r.time.total))}, ${p} ${p === 1 ? 'Portion' : 'Portionen'}. Pro Portion ${r.nutrition.kcal} kcal und ${Math.round(r.nutrition.protein)} g Eiweiß.</p>
  <h2>Zutaten</h2><div class="cols">${r.ingredients.map(i => `<div><span class="box"></span>${esc(fmtQty(i.k, i.q * p))} ${esc(F[i.k]?.name ?? i.k)}</div>`).join('')}</div>
  <h2>Zubereitung</h2><ol>${r.steps.map(s => `<li class="pg"><b>${esc(s.title)}.</b> ${esc(s.text)}</li>`).join('')}</ol>
  ${r.tips?.length ? `<h2>Gut zu wissen</h2><ul>${r.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}<p><small>Du brauchst: ${esc(r.tools.join(', '))}. Lagern: ${esc(r.storage.note || '')}</small></p>`);
}
