# CLAUDE.md

KONUZASTRO Tracker: planer sesji astrofotograficznych (alternatywa dla Telescopiusa, SkySafari, Stellarium), docelowo na subdomenie konuzastro.pl. Projekt przebudowany od zera 22.10.2026; stara aplikacja (etapy 1–7) jest tylko w historii git (commit 6c2fb33). Interfejs i komentarze po polsku.

Stos: React 19 + Vite 8 + TypeScript 6 (strict), Zustand (stan i localStorage), astronomy-engine, three.js (tylko widok 3D, ładowany leniwie), @tanstack/react-virtual. Bez Tailwinda: style w `src/styles/app.css`.

## Polecenia

- `npm run dev`: serwer (konfiguracje podglądu w `.claude/launch.json`: `dev` 5173, `preview` 4173).
- `npm test`: Vitest (`src/**/*.test.ts`), `npm run typecheck`, `npm run build` (typecheck + Vite + service worker).
- `npm run build:data`: przebudowa `public/data/` i `src/lib/constellations.ts` ze źródeł buforowanych w `scripts/.cache` (ignorowany przez git). Katalog obiektów pochodzi z `scripts/.cache/old-catalog.json` = `git show 6c2fb33:public/catalog/catalog.v1.json` (OpenNGC + VizieR); odległości i tytuły Wikipedii z Wikidata SPARQL; gwiazdy z d3-celestial; linie, ilustracje i polskie nazwy gwiazdozbiorów ze Stellarium (ilustracje: Free Art License). Kontury mgławic (`outlines.json`) z OpenNGC `outlines/objects` (tag v20260501, CC BY-SA 4.0): poziom 2 (bez niego 3, potem 1) plus poziom 1 regionów i obrysów o promieniu ≥ 2°; pierścienie regionów przypisane do największej mgławicy katalogu w środku (bez niej podpis regionu). Mgławice ciemne (LDN, B) dołączane z `scripts/data/dark-outlines.json` (dane źródłowe w repozytorium: kandydat z Planck 857 GHz przez NASA SkyView jako podpowiedź dla SAM 3 na zdjęciach z AstroBin, wybór ręczny; zdjęć nie publikujemy). Droga Mleczna (`milkyway.png`, siatka RA/Dec 720 × 360) z konturów d3-celestial `mw.json`. Pojedynczy etap: `node scripts/build-data.ts catalog|sky|outlines|milkyway|hips` (`hips` tylko jawnie: dane testu geometrii kafelków, `scripts/.cache/hips`).
- `npm start`: serwer produkcyjny `server/index.ts` (statyki `dist/` + API); `HOST`, `PORT`, `ALLOWED_HOSTS` (nazwy dla nagłówka `Host` poza IP i localhost), opis w `docs/uruchomienie.md`. `npm run setup:skyshot`: lokalny solver astrometrii w `scripts/.cache`.
- Weryfikacja wizualna: panel przeglądarki aplikacji bywa ukryty (wtedy animacje i WebGL stoją); zrzuty rób Playwrightem. Profil Playwrighta ma zapisany plan, filtry i lokalizację z wcześniejszych prób: po teście przywróć stan.
- Pomiary na `preview` (4173): service worker potrafi podać starą kompilację; przed pomiarem porównaj załadowany `assets/index-*.js` z `dist/assets`.
- Store w dev z konsoli przeglądarki: `import(performance.getEntriesByType('resource').map(e => e.name).find(n => n.includes('/src/state/store.ts')))` (adres z `?t=`, inaczej osobna instancja).
- Po subagentach sprawdź `git status`: przekierowania w ich poleceniach powłoki zostawiały puste pliki w korzeniu repozytorium.
- Audyty i ich stan wdrożenia: `docs/audits/` (seria A z 4.11, B z 5.11.2026).

## Architektura

- `src/lib/`: czysta logika bez Reacta: `astro.ts` (jedyny import astronomy-engine; macierze J2000 → horyzont, Słońce, Księżyc, optyka, współrzędne galaktyczne), `night.ts` (fazy zmierzchu, ciemne okno, tory i widoczność), `projection.ts` (rzut stereograficzny kopuły, N u góry, E po lewej), `framing.ts` (TAN, narożniki kadru), `horizon.ts`, `nina.ts` (CSV Telescopius dla N.I.N.A.), `planner.ts`, `catalog.ts`, `sky.ts`, `thumbs.ts` (kolejka obrazów + Cache Storage), `healpix.ts`, `hips.ts` (przeglądy, lustra, rzut TAN z kafelków), `hipsTiles.ts` (lustra, limit czasu, Cache Storage), `services.ts` (Open-Meteo, geokodowanie, Wikipedia).
- `night.ts`: `darkWindow` schodzi kolejno: noc astronomiczna → żeglarska → cywilna → zachód–wschód (białe noce) → puste okno w dniu polarnym (`polarDay`) → cały wykres w nocy polarnej bez zmierzchów. `planner.ts` `autoSchedule`: granica w połowie drogi między najlepszymi chwilami celów, a gdy cel dostałby < 30 min, w połowie wspólnego czasu.
- `src/workers/visibility.worker.ts`: widoczność 16,5 tys. obiektów w nocy; `hips.worker.ts`: składanie obrazów nieba z kafelków HiPS.
- `server/`: `index.ts` (statyki, 403 dla obcego `Host`), `photo.ts` (astrometria Skyshot, limity uploadu i pikseli), `astrobin.ts`, `photoDistances.ts` (SIMBAD/NED), `readResponseText.ts` (limit bajtów odpowiedzi). `scripts/download.ts`: `cachedText`/`cachedBytes` zapisują do `scripts/.cache` tylko poprawne odpowiedzi; `run-command.ts`: limity czasu i zabijanie drzewa procesów.
- `src/state/store.ts` (Zustand, persist) i `src/state/data.ts` (katalog, noc, czas, widoczność, pogoda jako hooki).
- `src/components/`: `SkyDome` (gwiazdy w WebGL2 + nakładka 2D: linie, kontury mgławic z podpisami, elipsy obiektów i grupy katalogów M/NGC/IC/pozostałe z listy „Warstwy”, postacie gwiazdozbiorów przy najechaniu, horyzont, tor, animacja „znajdź obiekt”), `AltitudeChart`, `FramingPanel`, `Space3D` (lazy), karty widoku Niebo, `ObjectDetails`.
- `Space3D` renderuje na żądanie: zmiana sceny poza pętlą `tick` musi ustawić `sceneDirty.current = true` (inaczej pojawi się dopiero w klatce kontrolnej po ≤ 1 s); ruch kamery porównuje `sameMatrix` z tolerancją. `SkyDome` koduje maskę Księżyca tylko przy styku z ziemią (`overlapsGround`).
- `src/views/`: Niebo, Katalog, Planer, Sprzęt, Horyzont (wszystkie oprócz Nieba ładowane leniwie).
- Testy: tylko `src/**/*.test.ts` (bez testów `.tsx`); `server/` i `scripts/` testowane z `src/lib/*Server.test.ts`, `buildCache.test.ts`, `scriptDeadlines.test.ts`; widok Planera przez drzewo elementów w `plannerRegression.test.ts`.
- `docs/wymagania.md`: lista wymagań z dowodami.

## Konwencje

- Czas w ms UTC; noc identyfikuje data lokalnego wieczoru w strefie IANA lokalizacji. Kąty w stopniach, azymut od N przez E, długość E dodatnia, RA/Dec J2000, wysokości bez refrakcji.
- Wygląd jak konuzastro.pl: tło #000, karty #0B0D17, ramki #15192B/#232942, cyjan #00E0FF (gradient do #0080FF), kwadratowe narożniki z klamrami L, systemowy krój mono dla etykiet i liczb (żadnych pobieranych fontów). Kolory tylko z tokenów `:root`.
- Budżet: startowy JS < 200 KB gzip (teraz ok. 153 KB), ciężkie rzeczy leniwie, `prefers-reduced-motion` respektowane.
- Kod przy renderze nie używa sieci; pobieranie w efektach. Styl: bez średników, pojedyncze cudzysłowy.
- W poleceniach Bash z `$` w treści (szablony JS) zapisuj skrypt do pliku w scratchpadzie zamiast `node -e`.
