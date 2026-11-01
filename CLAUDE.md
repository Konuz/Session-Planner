# CLAUDE.md

KONUZASTRO Tracker: planer sesji astrofotograficznych (alternatywa dla Telescopiusa, SkySafari, Stellarium), docelowo na subdomenie konuzastro.pl. Projekt przebudowany od zera 22.10.2026; stara aplikacja (etapy 1–7) jest tylko w historii git (commit 6c2fb33). Interfejs i komentarze po polsku.

Stos: React 19 + Vite 8 + TypeScript 6 (strict), Zustand (stan i localStorage), astronomy-engine, three.js (tylko widok 3D, ładowany leniwie), @tanstack/react-virtual. Bez Tailwinda: style w `src/styles/app.css`.

## Polecenia

- `npm run dev`: serwer (konfiguracje podglądu w `.claude/launch.json`: `dev` 5173, `preview` 4173).
- `npm test`: Vitest (`src/**/*.test.ts`), `npm run typecheck`, `npm run build` (typecheck + Vite + service worker).
- `npm run build:data`: przebudowa `public/data/` i `src/lib/constellations.ts` ze źródeł buforowanych w `scripts/.cache` (ignorowany przez git). Katalog obiektów pochodzi z `scripts/.cache/old-catalog.json` = `git show 6c2fb33:public/catalog/catalog.v1.json` (OpenNGC + VizieR); odległości i tytuły Wikipedii z Wikidata SPARQL; gwiazdy z d3-celestial; linie, ilustracje i polskie nazwy gwiazdozbiorów ze Stellarium (ilustracje: Free Art License). Kontury mgławic (`outlines.json`) z OpenNGC `outlines/objects` (tag v20260501, CC BY-SA 4.0): poziom 2 (bez niego 3, potem 1) plus poziom 1 regionów i obrysów o promieniu ≥ 2°; pierścienie regionów przypisane do największej mgławicy katalogu w środku (bez niej podpis regionu). Mgławice ciemne (LDN, B) dołączane z `scripts/data/dark-outlines.json` (dane źródłowe w repozytorium: kandydat z Planck 857 GHz przez NASA SkyView jako podpowiedź dla SAM 3 na zdjęciach z AstroBin, wybór ręczny; zdjęć nie publikujemy). Droga Mleczna (`milkyway.png`, siatka RA/Dec 720 × 360) z konturów d3-celestial `mw.json`. Pojedynczy etap: `node scripts/build-data.ts catalog|sky|outlines|milkyway|hips` (`hips` tylko jawnie: dane testu geometrii kafelków, `scripts/.cache/hips`).
- Weryfikacja wizualna: panel przeglądarki aplikacji bywa ukryty (wtedy animacje i WebGL stoją); zrzuty rób Playwrightem.

## Architektura

- `src/lib/`: czysta logika bez Reacta: `astro.ts` (jedyny import astronomy-engine; macierze J2000 → horyzont, Słońce, Księżyc, optyka, współrzędne galaktyczne), `night.ts` (fazy zmierzchu, ciemne okno, tory i widoczność), `projection.ts` (rzut stereograficzny kopuły, N u góry, E po lewej), `framing.ts` (TAN, narożniki kadru), `horizon.ts`, `nina.ts` (CSV Telescopius dla N.I.N.A.), `planner.ts`, `catalog.ts`, `sky.ts`, `thumbs.ts` (kolejka obrazów + Cache Storage), `healpix.ts`, `hips.ts` (przeglądy, lustra, rzut TAN z kafelków), `hipsTiles.ts` (lustra, limit czasu, Cache Storage), `services.ts` (Open-Meteo, geokodowanie, Wikipedia).
- `src/workers/visibility.worker.ts`: widoczność 16,5 tys. obiektów w nocy; `hips.worker.ts`: składanie obrazów nieba z kafelków HiPS.
- `src/state/store.ts` (Zustand, persist) i `src/state/data.ts` (katalog, noc, czas, widoczność, pogoda jako hooki).
- `src/components/`: `SkyDome` (gwiazdy w WebGL2 + nakładka 2D: linie, kontury mgławic z podpisami, elipsy obiektów i grupy katalogów M/NGC/IC/pozostałe z listy „Warstwy”, postacie gwiazdozbiorów przy najechaniu, horyzont, tor, animacja „znajdź obiekt”), `AltitudeChart`, `FramingPanel`, `Space3D` (lazy), karty widoku Niebo, `ObjectDetails`.
- `src/views/`: Niebo, Katalog, Planer, Sprzęt, Horyzont (wszystkie oprócz Nieba ładowane leniwie).
- `docs/wymagania.md`: lista wymagań z dowodami.

## Konwencje

- Czas w ms UTC; noc identyfikuje data lokalnego wieczoru w strefie IANA lokalizacji. Kąty w stopniach, azymut od N przez E, długość E dodatnia, RA/Dec J2000, wysokości bez refrakcji.
- Wygląd jak konuzastro.pl: tło #000, karty #0B0D17, ramki #15192B/#232942, cyjan #00E0FF (gradient do #0080FF), kwadratowe narożniki z klamrami L, systemowy krój mono dla etykiet i liczb (żadnych pobieranych fontów). Kolory tylko z tokenów `:root`.
- Budżet: startowy JS < 200 KB gzip (teraz ok. 134 KB), ciężkie rzeczy leniwie, `prefers-reduced-motion` respektowane.
- Kod przy renderze nie używa sieci; pobieranie w efektach. Styl: bez średników, pojedyncze cudzysłowy.
- W poleceniach Bash z `$` w treści (szablony JS) zapisuj skrypt do pliku w scratchpadzie zamiast `node -e`.
