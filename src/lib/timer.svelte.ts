// Mehrere parallele Kochtimer mit Ton, Vibration und optionaler Benachrichtigung.
import { toast } from './ui.svelte.ts';

export interface Timer { id: number; label: string; remaining: number; deadline: number; running: boolean; done: boolean }
export const timers = $state<Timer[]>([]);
let tick: ReturnType<typeof setInterval> | null = null;
let audio: AudioContext | null = null;
let nextId = 1;

function ctx(): AudioContext | null {
  try {
    audio ||= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audio.state === 'suspended') void audio.resume();
  } catch { audio = null; }
  return audio;
}
// Kurzer Dreiklang, dreimal wiederholt – gut hörbar über Dunstabzug.
function chime(): void {
  const a = ctx(); if (!a) return;
  const t0 = a.currentTime;
  for (let rep = 0; rep < 3; rep++) [880, 1108, 1320].forEach((f, i) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t = t0 + rep * 0.9 + i * 0.16;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.55);
  });
}
function update(): void {
  for (const t of timers) {
    if (!t.running) continue;
    const r = Math.max(0, Math.ceil((t.deadline - Date.now()) / 1000));
    if (r !== t.remaining) t.remaining = r;
    if (r === 0 && !t.done) {
      t.done = true; t.running = false; chime();
      try { navigator.vibrate?.([300, 120, 300, 120, 300]); } catch { /* egal */ }
      try { if (document.hidden && Notification.permission === 'granted') new Notification('Timer abgelaufen', { body: t.label, tag: 'mw-timer-' + t.id }); } catch { /* egal */ }
    }
  }
  if (!timers.some(t => t.running) && tick) { clearInterval(tick); tick = null; }
}
const ensureTick = () => { tick ??= setInterval(update, 250); };

export function startTimer(seconds: number, label: string): void {
  ctx(); // Audio im Klick-Kontext freischalten
  if (timers.some(t => t.label === label && t.remaining > 0)) { toast('Dieser Timer läuft bereits.'); return; }
  timers.push({ id: nextId++, label, remaining: seconds, deadline: Date.now() + seconds * 1000, running: true, done: false });
  try { if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission(); } catch { /* optional */ }
  ensureTick();
}
export function toggleTimer(t: Timer): void { t.running = !t.running; if (t.running) { t.deadline = Date.now() + t.remaining * 1000; ensureTick(); } }
export function addMinute(t: Timer): void { t.remaining += 60; t.deadline += 60000; }
export function stopTimer(t: Timer): void { const i = timers.findIndex(x => x.id === t.id); if (i >= 0) timers.splice(i, 1); }
export const mmss = (s: number): string => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
