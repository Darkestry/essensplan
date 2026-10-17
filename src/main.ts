// Schriften gebündelt (offline): Fraunces mit weicher Achse für Überschriften, Figtree für Text
import '@fontsource-variable/fraunces/soft.css';
import '@fontsource-variable/figtree';
import './app.css';
import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import { toast } from './lib/ui.svelte.ts';
import './lib/install.svelte.ts';

mount(App, { target: document.getElementById('app')! });

// Offline-Fähigkeit + Hinweis bei neuer Version
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const update = registerSW({
    onNeedRefresh() { toast('Neue Version verfügbar', { label: 'Neu laden', run: () => void update(true) }); },
  });
}
