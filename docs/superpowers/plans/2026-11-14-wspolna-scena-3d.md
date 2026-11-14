# Wspólna scena „Pozycja 3D”: plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Cel:** jedna scena three.js w oknie „Pozycja 3D”. Zakładki Droga Mleczna i Wszechświat lokalny tylko przelatują
kamerą (bliżej, dalej), bez przebudowy renderera.

**Architektura:**
- Układ współrzędnych bez parametru skali w `src/lib/space3d.ts`: liniowo do 150 tys. lś, dalej logarytmicznie z `LOG_UNIT = 22 / 0,12`.
- `Space3D.tsx` buduje treść obu dzisiejszych scen raz. Zakładka (ref) decyduje o warstwach z przełącznikami,
  podpisach, linii obiektu i kadrze. Warstwy drugiej skali wygasza odległość kamery od początku układu (`layerFades`).
- Przelot przy zmianie zakładki z geometryczną interpolacją promienia (`zoomPose`).

**Stos:** React 19, TypeScript 6 strict, three.js, Vitest, Playwright (zrzuty).

**Projekt:** `docs/superpowers/specs/2026-11-14-wspolna-scena-3d-design.md`

## Ograniczenia globalne
- Zakładka zmienia się tylko kliknięciem (decyzja użytkownika 14.11.2026); zoom kółkiem jej nie przełącza.
- Kryterium: Droga Mleczna przy swoim kadrze jak dziś; Wszechświat lokalny jak dziś × 1/0,12.
- `UNIVERSE_GALAXY_SCALE = 0.12` zostaje jako definicja rozciągnięcia; `LOG_UNIT = 22 / UNIVERSE_GALAXY_SCALE`.
- `orbitOffset` i `lerpPose` bez zmian (wspólne z Obserwatorium i nurkowaniem).
- Kod: bez średników, pojedyncze cudzysłowy, komentarze po polsku; testy tylko `src/**/*.test.ts`.
- Bez commitów bez prośby użytkownika. W drzewie są cudze niezatwierdzone zmiany (m.in. `Space3DModal.tsx`,
  `photoSession.ts`): nie cofać ich i nie łączyć z tą pracą.
- Zrzuty: własny Chromium według pamięci `playwright-pozycja-3d-weryfikacja` (biblioteka z bufora npx 1.60,
  swiftshader, 7–9 s na przelot startowy, zakładki to `role="tab"`). Skrypty w scratchpadzie, uruchamiane `node plik`.

## Na co uważać przy przeglądzie
1. Zmiana obiektu, która resetuje zakładkę (np. z M 31 na M 42 we Wszechświecie): jeden przelot, bez szarpnięcia (Zadanie 2, krok 7).
2. Zdjęcie wczytane, zmiana zakładki: stożek przebudowany według nowej zakładki, kamera kadruje go ponownie (Zadanie 3, krok 4).
3. Oddalenie kółkiem z Drogi Mlecznej do granicy `maxDistance`: scena nie znika (far), warstwy galaktyk pojawiają się płynnie (Zadanie 2, krok 7).
4. Widok gwiazdozbioru z Ziemi włączony, potem Wszechświat lokalny i powrót: rzut gwiazd wyczyszczony, gwiazdozbiory
   ukryte we Wszechświecie i znów widoczne po powrocie (Zadanie 2, krok 7).
5. Nurkowanie z zakładki Wszechświat lokalny: start ok. 8 razy dalej i z Ziemią w scenie, szew bez skoku (Zadanie 3, krok 4).

---

### Zadanie 1: Układ współrzędnych, krycia warstw i przelot ze zmianą skali

**Pliki:**
- Modyfikacja: `src/lib/space3d.ts`, `src/lib/spaceDive.ts` (nowa funkcja obok `lerpPose`)
- Modyfikacja (podpisy wywołań): `src/components/space3d/galaxyModels.ts:48-51`, `src/components/space3d/photoGuide.ts:169`,
  `src/components/Space3D.tsx` (wywołania `position`, `sunPosition`), `src/components/space3d/photoGuide.test.ts:41,67`
- Test (nowy): `src/lib/space3d.test.ts`; dopisany do `src/lib/spaceDive.test.ts`

**Interfejsy (produkuje):**
- `LOG_UNIT: number` (= 22 / 0,12)
- `sunPosition(): Vec3`
- `scenePosition(o: { raDeg: number; decDeg: number }, distLy: number): Vec3`
- `scenePoint(dir: Vec3, distLy: number): Vec3`
- `layerFades(cameraDistance: number): { galactic: number; extragalactic: number }`, stałe `FADE_NEAR = 250`, `FADE_FAR = 500`
  (j. sceny, do strojenia w Zadaniu 2)
- `zoomPose(a: Pose, b: Pose, t: number): Pose` w `spaceDive.ts`
- `position(o, distLy): THREE.Vector3` w `galaxyModels.ts` (bez skali)
- `SpaceScale` zostaje jako typ zakładki

- [ ] **Krok 0: Zrzuty bazowe przed zmianami** (scratchpad, `baseline/`): Droga Mleczna i Wszechświat lokalny dla
  M 42 i M 31 po przelocie startowym, plus Wszechświat lokalny ze zdjęciem M 51
  (`scripts/.cache/observatory-photos/M51.project.json`). Te pliki służą do porównań w Zadaniach 2 i 3.

- [ ] **Krok 1: Testy, które nie przechodzą** (`src/lib/space3d.test.ts`). Stare wzory wpisane w teście jako wartości odniesienia:
  ```ts
  const old = (o, d, scale) => /* dawne scenePosition z parametrem skali, skopiowane do testu */
  it('poniżej 150 tys. lś położenie jak dawna skala Drogi Mlecznej', () => {
    for (const d of [8, 1500, 26_700, 149_999]) expect(scenePosition(M42, d)).toEqual(old(M42, d, 'galaxy'))
  })
  it('od 150 tys. lś położenie jak dawny Wszechświat lokalny × 1/0,12', () => {
    for (const d of [150_000, 2.5e6, 3.2e8, 1e10]) old(M31, d, 'universe').forEach((v, i) => expect(scenePosition(M31, d)[i]).toBeCloseTo(v / 0.12, 9))
  })
  it('scenePoint dla d < 150 tys. lś leży na promieniu od Słońca w d/1000 j.', ...)
  it('Słońce 26,7 j. od centrum Galaktyki', () => expect(sunPosition()).toEqual([-26.7, 0, -0]))
  it('krycia: blisko tylko Galaktyka, daleko tylko galaktyki, przejście monotoniczne', () => {
    expect(layerFades(120)).toEqual({ galactic: 1, extragalactic: 0 })
    expect(layerFades(FADE_NEAR)).toEqual({ galactic: 1, extragalactic: 0 })
    expect(layerFades(1667)).toEqual({ galactic: 0, extragalactic: 1 })
    // w połowie przejścia suma 1, a wartości rosną i maleją bez skoków
  })
  ```
  W `spaceDive.test.ts`: `zoomPose` na końcach równa `a` i `b` (pozycja i cel); w połowie od r = 10 do r = 1000
  odległość kamery od celu = 100 (± 1e-9); kierunek z kamery do celu jak w `lerpPose` przy tym samym t.
- [ ] **Krok 2: Uruchom i potwierdź błąd.** `npx vitest run src/lib/space3d.test.ts src/lib/spaceDive.test.ts`.
  Oczekiwane: FAIL (brak eksportów i zła liczba argumentów).
- [ ] **Krok 3: Implementacja w `space3d.ts`.** Gałąź `scale === 'galaxy' || distLy < GALACTIC_LIMIT_LY` → `distLy < GALACTIC_LIMIT_LY`
  z czynnikiem 1. Część logarytmiczna: `Math.max(0, Math.log10(distLy / 1e4)) * LOG_UNIT`.
  `layerFades` przez `smoothstep` między `FADE_NEAR` i `FADE_FAR`, zapisany bez three.js (moduł jest bez three.js).
- [ ] **Krok 4: `zoomPose` w `spaceDive.ts`.** Kierunek, cel i `up` z `lerpPose(a, b, t)`. Długość przesunięcia
  kamery względem celu: `ra^(1−t) · rb^t`.
- [ ] **Krok 5: Wywołania.** Usunąć argument skali w `galaxyModels.position`, w `photoGuide.ts:169` (`scenePoint`),
  w `Space3D.tsx` (`position(...)`, `sunPosition()`) i w fixture `photoGuide.test.ts`. Pliki muszą tylko się kompilować;
  scena Wszechświata jest do czasu Zadania 2 w nowych jednostkach bez przeliczonych stałych.
- [ ] **Krok 6: Weryfikacja.** `npx vitest run src/lib src/components/space3d` → PASS; `npm run typecheck` → bez błędów.

### Zadanie 2: Jedna scena w `Space3D.tsx`

**Pliki:**
- Modyfikacja: `src/components/Space3D.tsx`, `src/components/space3d/galaxyModels.ts:228`
  (bez `UNIVERSE_GALAXY_SCALE *`; usunąć osierocony re-eksport `UNIVERSE_GALAXY_SCALE`)

**Interfejsy:**
- Pobiera: `scenePosition`, `sunPosition`, `layerFades`, `LOG_UNIT`, `zoomPose`, `position` (Zadanie 1)
- Produkuje: `Space3DHandle` z polem `scale` jako getterem `scaleRef.current` (usuwa je Zadanie 3). Uchwyt nie zmienia się przy zmianie zakładki. Główny efekt sceny zależy od
  `[hasObject, withDistance, select, typeRGB]`. Zakładka w `scaleRef`, zmiana `[o, scale]` w jednym efekcie.

- [ ] **Krok 1: Treść jednej sceny.**
  - Dwa obiekty `Points` z osobnymi materiałami i własnymi strukturami w miejsce `bgRef`:
    - `galacticRef` (d < 150 tys. lś, 5 px), przez `showTypes`;
    - `extragalacticRef` (d > 150 tys. lś bez `LOCAL_GROUP_SHAPES`, 2,5 px, posortowane), z `counts` per `GALAXY_LEVELS` i `setDrawRange`.
  - Model `milkyWay(52000, stars)` w skali 1. Pierścienie z kopułami w promieniach `Math.log10(ly / 1e4) * LOG_UNIT`,
    o grubości `±0.08 / UNIVERSE_GALAXY_SCALE`; podpis w `r + 2 / UNIVERSE_GALAXY_SCALE`.
  - Modele Grupy Lokalnej w `position(c, c.distLy!)`. Gwiazdozbiory, Ziemia ze światłami, „Centrum Galaktyki”.
  - Podpisy „Ziemia” (przy `sunPos`) i „Droga Mleczna” (y = `-4.2 / UNIVERSE_GALAXY_SCALE`).
  - Kamera: far 20 000, `controls.maxDistance = 6000`; start y = 120 albo `200 / UNIVERSE_GALAXY_SCALE` według zakładki przy budowie.
- [ ] **Krok 2: Zakładka bez przebudowy.** `scaleRef` zamiast `scale` w zależnościach głównego efektu.
  - Funkcja `applyScale()` ustawia:
    - widoczność gwiazdozbiorów: `showConstellations && galaxy`;
    - podpisy: „Ziemia” i „Centrum Galaktyki” w Drodze Mlecznej, „Droga Mleczna” we Wszechświecie.
  - `applyScale()` czyści `skyView` (`clearSkyView`), zeruje `constellationReturn`, ustawia `textLayoutDirty` i `sceneDirty`.
  - `drawLabels` dostaje zakładkę w kluczu pamięci (`lastLabelScale`). Kandydaci podpisów i kliknięć:
    - w Drodze Mlecznej obiekty galaktyczne bez ukrytych rodzajów;
    - we Wszechświecie galaktyki do poziomu suwaka i Grupa Lokalna.
  - Efekty `galaxyLevel` i `hiddenTypes` działają na swoich `Points` niezależnie od zakładki.
  - Efekt `showConstellations` uwzględnia zakładkę.
- [ ] **Krok 3: `showObject(object, scale, ms, zoom)`.** Reguły zakładki jak dziś, w nowych jednostkach:
  - `minSpan`: Droga Mleczna 8; Wszechświat `16 / UNIVERSE_GALAXY_SCALE` (`insideMilkyWay`) albo `70 / UNIVERSE_GALAXY_SCALE`;
  - promień linii samego kierunku: we Wszechświecie `MILKY_WAY_DIAMETER_LY / 2000` (`insideMilkyWay`) albo `Math.log10(1e9 / 1e4) * LOG_UNIT`;
  - `placed` jak dziś (obiekt dalszy niż 150 tys. lś w Drodze Mlecznej: tylko kierunek);
  - przezroczystość pionu (`0.6` albo `0.35`) według zakładki.
  - Ze zdjęciem bez przelotu, jak dziś.
- [ ] **Krok 4: Jeden przelot na zmianę.** Efekt `[o, scale]` zastępuje efekt `[o]` (linia 1063):
  - zmiana zakładki (z obiektem albo bez) → `applyScale()` i `showObject(o, scale, SWITCH_MS = 1600, zoom = true)`;
  - sama zmiana obiektu → `showObject(o, scale, FLY_MS)`.
  - `fly(...)` dostaje parametr `zoom`; `step` używa wtedy `zoomPose` zamiast `lerpPose`. Ograniczony ruch → cięcie jak dziś.
- [ ] **Krok 5: Wygaszanie w `step`.** `const fades = layerFades(camera.position.length())`:
  - punkty galaktyczne: `opacity = 0.8 * fades.galactic`;
  - punkty pozagalaktyczne, pierścienie, kopuły, ich podpisy i modele Grupy Lokalnej: krycie × `fades.extragalactic`,
    `visible = fades.extragalactic > 0` (kopuły: uniform krycia w `domeMaterial`, jeśli jest; inaczej `visible`);
  - Ziemia: promień znacznika × `fades.galactic` przed nadpisaniem nurkowania;
  - model Drogi Mlecznej: dzisiejsza formuła × `lerp(1, MW_FAR_OPACITY, fades.extragalactic)`. Start z
    `MW_FAR_OPACITY = 0.14` (12 tys. / 52 tys. punktów × 0,1 / 0,17), strojenie na zrzutach;
  - `sceneDirty` przy zmianie krycia, żeby klatka nie czekała na kontrolną.
  - Modele Grupy Lokalnej w `galaxyModels.ts:228`: `diameterLy / MILKY_WAY_DIAMETER_LY` bez czynnika 0,12.
- [ ] **Krok 6: Weryfikacja automatyczna.** `npm run typecheck`, `npm test` → PASS.
- [ ] **Krok 7: Zrzuty i porównanie z bazą.**
  - Droga Mleczna M 42 = baza; Wszechświat M 31 ≈ baza (te same proporcje).
  - Klatki przelotu M 42 → Wszechświat i z powrotem (co 0,3 s): ruch płynny, bez pierścieni w Drodze Mlecznej.
  - Wybór M 42 we Wszechświecie (reset zakładki): jeden przelot (pozycje kamery z `window.__spaceFrames` lub klatek bez skoku wstecz).
  - Kółkiem do `maxDistance` z Drogi Mlecznej: scena widoczna.
  - Gwiazdozbiory: Orion z Ziemi → Wszechświat → Droga Mleczna.
  - Ograniczony ruch (`emulateMedia({ reducedMotion: 'reduce' })`): cięcie.
  - Dostroić `FADE_NEAR`, `FADE_FAR` i `MW_FAR_OPACITY`, jeśli zrzuty tego wymagają (zmiana stałych w `space3d.ts`
    wymaga poprawienia testu z Zadania 1).

### Zadanie 3: Zdjęcie według zakładki

**Pliki:**
- Modyfikacja: `src/components/space3d/photoGuide.ts:355-390` (`usePhotoGuide`), `src/components/space3d/Space3DModal.tsx:82`,
  `src/components/Space3D.tsx` (pole `scale` uchwytu), `src/lib/spacePhoto.ts:24-27`
- Test: `src/lib/spacePhoto.test.ts:33-34`

**Interfejsy:**
- Pobiera: `Space3DHandle` bez `scale` (Zadanie 2)
- Produkuje: `usePhotoGuide(handle, project, scale: SpaceScale, visible, selected, onPick)`

- [ ] **Krok 1: `usePhotoGuide` z zakładką.** `createPhotoGuide(handle, project, scale, …)` zamiast `handle.scale`.
  `scale` trafia do zależności efektu i do `framed` (`{ handle, id, scale }`), więc zmiana zakładki kadruje stożek ponownie.
- [ ] **Krok 2: `Space3DModal.tsx`.** Przekazać `settings.scale` do `usePhotoGuide`. Usunąć pole `scale` ze `Space3DHandle`.
  Reszta `chooseScale`, `settle` i `setObsAlive(false)` przy zmianie zakładki bez zmian.
- [ ] **Krok 3: Stożek domyślny we Wszechświecie.** W `src/lib/spacePhoto.ts` `universeCone` zwraca bez znaczników
  `CONE_DEFAULT / UNIVERSE_GALAXY_SCALE`. Test `spacePhoto.test.ts:33-34`: oczekiwane `4 / 0.12`.
  Potem `npx vitest run src/lib/spacePhoto.test.ts src/components/space3d` i `npm run typecheck` → PASS.
- [ ] **Krok 4: Zrzuty ze zdjęciem.**
  - M 51 we Wszechświecie ≈ baza.
  - IC 434 w Drodze Mlecznej = dzisiejszy stożek.
  - Przełączanie zakładek ze zdjęciem: stożek według zakładki, jeden przelot.
  - Nurkowanie i powrót z obu zakładek: `window.__spaceDive.seam()` w szwie — ten sam punkt Ziemi
    (± 2 px) i ten sam promień Ziemi (± 2 px) w obu scenach; 0 białych klatek.

### Zadanie 4: Dokumentacja i porządek

**Pliki:**
- Modyfikacja: `CLAUDE.md` (punkt `Space3D` renderuje na żądanie: „Scena powstaje raz na skalę”), `docs/photo-space-3d.md`
  (wiersz 3, wiersz 7 i opisy obu skal), `docs/wymagania.md` (wiersz 20, dowód: nowe zrzuty)

- [ ] **Krok 1:** Opisać w dokumentacji jedną scenę, przelot zakładek i wygaszanie warstw. Bez historii zmian w CLAUDE.md.
- [ ] **Krok 2:** `npm run build` → bez błędów, startowy JS < 200 KB gzip. `git status`: brak pustych plików w korzeniu
  repozytorium, a zmiany tylko w plikach z tego planu (plus cudze sprzed pracy).
