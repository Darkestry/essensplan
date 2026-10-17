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
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png'],
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
      workbox: {
        // App + Gerichtsbilder vorab; Schrittbilder beim ersten Ansehen (danach offline)
        globPatterns: ['**/*.{js,css,html,svg,png,webp,webmanifest}', '**/*-latin-*.woff2'],
        globIgnores: ['art/*-*.webp'],
        runtimeCaching: [{
          urlPattern: /\/art\/[a-z]\d+-\d+\.webp$/,
          handler: 'CacheFirst',
          options: { cacheName: 'step-art', expiration: { maxEntries: 600 } },
        }],
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
