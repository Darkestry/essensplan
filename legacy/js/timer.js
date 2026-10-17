// Mehrere parallele Kochtimer mit Ton, Vibration und optionaler Benachrichtigung.
import { $, esc, toast } from './util.js';

const timers = [];
let tick = null, audio = null;
let nextId = 1;

function ctx() {
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { audio = null; }
  return audio;
}
// Kurzer Dreiklang, dreimal wiederholt – gut hörbar über Dunstabzug.
function chime() {
  const a = ctx(); if (!a) return;
  const t0 = a.currentTime;
  for (let rep = 0; rep < 3; rep++) [880, 1108, 1320].forEach((f, i) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t = t0 + rep * .9 + i * .16;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .5);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + .55);
  });
}

export function startTimer(seconds, label) {
  ctx(); // Audio im Klick-Kontext freischalten (iOS)
  if (timers.some(t => t.label === label && t.remaining > 0)) { toast('Dieser Timer läuft bereits.'); return; }
  timers.push({ id: nextId++, label, total: seconds, remaining: seconds, deadline: Date.now() + seconds * 1000, running: true, done: false });
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* optional */ }
  ensureTick(); render();
}
function ensureTick() { if (!tick) tick = setInterval(update, 250); }
function update() {
  let changed = false;
  for (const t of timers) {
    if (!t.running) continue;
    const r = Math.max(0, Math.ceil((t.deadline - Date.now()) / 1000));
    if (r !== t.remaining) { t.remaining = r; changed = true; }
    if (r === 0 && !t.done) {
      t.done = true; t.running = false; chime();
      try { navigator.vibrate?.([300, 120, 300, 120, 300]); } catch { /* egal */ }
      try { if (document.hidden && Notification.permission === 'granted') new Notification('Timer abgelaufen', { body: t.label, tag: 'mw-timer-' + t.id }); } catch { /* egal */ }
    }
  }
  if (!timers.some(t => t.running)) { clearInterval(tick); tick = null; }
  if (changed) render();
}
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
export function render() {
  const el = $('#timers');
  el.hidden = !timers.length;
  el.innerHTML = timers.map(t => `<div class="timer ${t.done ? 'done' : ''}" role="timer" aria-live="${t.done ? 'assertive' : 'off'}">
    <div class="tl2"><small>${t.done ? 'Zeit um · ' : ''}${esc(t.label)}</small><b>${mmss(t.remaining)}</b></div>
    ${t.done ? '' : `<button type="button" data-action="timerToggle" data-id="${t.id}">${t.running ? 'Pause' : 'Weiter'}</button>`}
    ${t.done ? '' : `<button type="button" data-action="timerAdd" data-id="${t.id}" aria-label="Eine Minute dazu">+1</button>`}
    <button type="button" data-action="timerStop" data-id="${t.id}" aria-label="Timer beenden">${t.done ? 'OK' : '×'}</button></div>`).join('');
}
export function timerAction(action, id) {
  const t = timers.find(x => x.id === Number(id)); if (!t) return;
  if (action === 'timerToggle') { t.running = !t.running; if (t.running) { t.deadline = Date.now() + t.remaining * 1000; ensureTick(); } }
  if (action === 'timerAdd') { t.remaining += 60; t.deadline += 60000; }
  if (action === 'timerStop') timers.splice(timers.indexOf(t), 1);
  render();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
