// PWA i praca offline (sekcja 10): aplikacja i dane z public/catalog zapisane wstępnie w pamięci podręcznej (Workbox).
// Importy z rozszerzeniem .ts, bo plik wczytuje też konfiguracja Vite.
// Zdjęć nieba nie obsługuje service worker: loader sam czyta i zapisuje Cache Storage `sky-images-v1` (etap 5).
import type { VitePWAOptions } from 'vite-plugin-pwa'
import { darkCosmos } from './theme/tokens.ts'

/** Największy plik zapisywany wstępnie; katalog obiektów ma ok. 6,9 MB, katalog gwiazd ok. 3,5 MB. */
export const PRECACHE_MAX_BYTES = 12 * 1024 * 1024

/** Pliki z katalogu budowy zapisywane wstępnie: kod, style, kroje, ikony, katalogi (json, bin) i manifest. */
export const PRECACHE_GLOB = '**/*.{js,css,html,woff2,svg,png,json,bin,webmanifest}'

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  // Rejestracja skryptem dołączanym do index.html, bez importu `virtual:pwa-register` w kodzie aplikacji.
  injectRegister: 'script-defer',
  manifest: {
    name: 'Astrophotography Planner',
    short_name: 'Astro Planner',
    description: 'Planowanie sesji astrofotograficznych: cele na noc, kadr, horyzont i eksport do N.I.N.A.',
    lang: 'pl',
    display: 'standalone',
    theme_color: darkCosmos.background,
    background_color: darkCosmos.background,
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: [PRECACHE_GLOB],
    maximumFileSizeToCacheInBytes: PRECACHE_MAX_BYTES,
    cleanupOutdatedCaches: true,
  },
}
