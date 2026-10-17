import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Morgenwerk · Essensplan',
        short_name: 'Morgenwerk',
        description: 'Wochenplan für Frühstück, Thermobox-Mittag, Abendessen und Snacks – mit Einkaufsliste und Meal-Prep-Ablauf.',
        lang: 'de',
        start_url: './#/heute',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3f6ee',
        theme_color: '#f3f6ee',
        categories: ['food', 'lifestyle', 'health'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
        shortcuts: [
          { name: 'Heute', url: './#/heute' },
          { name: 'Einkaufsliste', url: './#/einkauf' },
          { name: 'Wochenplan', url: './#/plan' },
        ],
      },
      // Manifest und Icons nimmt das Plugin selbst in den Vorab-Cache
      includeManifestIcons: true,
      workbox: {
        // Schlanker Vorab-Cache: nur die App-Hülle (~30 Dateien). Viele gleichzeitige Downloads
        // beim Installieren ließen die Installation auf GitHub Pages scheitern.
        globPatterns: ['**/*.{js,css,html}', '**/*-latin-*.woff2', 'art/{hero,watertest,thermos}.webp'],
        // Rezeptbilder: beim ersten Ansehen cachen; die App lädt sie danach im Leerlauf nach (src/lib/warm.ts)
        runtimeCaching: [{
          urlPattern: /\/art\/[a-z]\d+(-\d+)?\.webp$/,
          handler: 'CacheFirst',
          options: { cacheName: 'recipe-art', expiration: { maxEntries: 800 } },
        }],
        clientsClaim: true,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    cssMinify: true,
    rollupOptions: {
      output: {
        // Rezeptdaten in einen eigenen, langfristig cachebaren Chunk
        manualChunks: id => (id.includes('/data/') && id.endsWith('.json') ? 'recipes' : undefined),
      },
    },
  },
});
