# Moje zdjęcie obiektu: plan wykonania

> **Dla wykonawców:** wymagany skill: superpowers:subagent-driven-development (zalecany) albo superpowers:executing-plans. Kroki mają pola `- [ ]` do odhaczania.

**Cel:** użytkownik dodaje w szczegółach obiektu własne zdjęcie. Solver Skyshot je rozwiązuje, a zdjęcie wpasowane przez WCS zastępuje domyślne w karcie, szczegółach, Katalogu, Planerze i kadrowaniu. Przełącznik moje/domyślne jest w karcie.

**Architektura:** serwer rozwiązuje zdjęcie, liczy maskę czarnych brzegów i siatkę 17 × 17 punktów kontrolnych (piksel → RA/Dec) nową komendą mostu `grid`, a potem sprawdza, czy obiekt jest w kadrze. Przeglądarka trzyma zdjęcie w IndexedDB, a indeks z wyborem moje/domyślne w Zustand. Wspólny kompozytor wkleja zdjęcie trójkątami afinicznymi w obraz tła z `getSkyImage` (ten sam rzut TAN) i zwraca jeden `Blob`. Dzięki temu `Thumb` i `FramingPanel` podmieniają tylko źródło obrazu, a przesuwanie, podgląd i histogram działają bez zmian.

**Stos:** React 19, TypeScript strict, Zustand persist, Vitest (środowisko `node`), Node `http` + `sharp`, Rust (`scripts/skyshot-bridge`, Skyshot Solver), Canvas 2D.

**Projekt:** `docs/superpowers/specs/2026-11-05-moje-zdjecie-obiektu-design.md` (czytać razem z planem).

## Warunki globalne

- Bez średników, pojedyncze cudzysłowy, komentarze i teksty interfejsu po polsku, kolory tylko z tokenów `:root`, kwadratowe narożniki.
- Testy tylko `src/**/*.test.ts`; logika bez Reacta w `src/lib/`; serwer testowany z `src/lib/*Server.test.ts`.
- Startowy JS < 200 KB gzip (sprawdzić `npm run build`; dziś ok. 153 KB).
- Kod przy renderze nie używa sieci; pobieranie i IndexedDB tylko w efektach i obsłudze zdarzeń.
- Projekt Eksploratora zdjęć (`tracker-photo`, klucz `current`) nietknięty: własne zdjęcia trafiają do osobnej bazy.
- Zmiana `scripts/skyshot-bridge` wymaga `npm run setup:skyshot`.
- Praca na gałęzi `feat/moje-zdjecie`, commit po każdym zadaniu, w stylu historii repozytorium (polskie zdanie opisowe) i z linią `Co-Authored-By` z ustawień sesji.

## Na co uważać przy przeglądzie

1. **Zdjęcie na granicy RA 0°/360°:** siatka ma punkty z RA 359,9° i 0,1°. Trójkąty mają być ciągłe, bez pasa przez cały obraz. Test w zadaniu 2.
2. **Zdjęcie lustrzane** (parzystość odwrócona przez WCS): ma być odbite tak jak niebo, a nie „poprawione”. Test w zadaniu 2.
3. **Szerokie pole kadrowania** (do 30°) ze zdjęciem daleko od środka albo za płaszczyzną styczną (cos c ≤ 0): takie trójkąty są pomijane, bez artefaktów na całym płótnie. Test w zadaniu 2.
4. **Zmiana obiektu lub zamknięcie szczegółów w trakcie rozwiązywania:** żądanie przerwane, a zdjęcie nie trafia do innego obiektu, bo rekord bierze `objectId` z odpowiedzi serwera. Test w zadaniach 3 i 4.
5. **Indeks w Zustand wskazuje zdjęcie, którego nie ma w IndexedDB** (wyczyszczone dane witryny): miniatura wraca do domyślnej, wpis indeksu znika. Test w zadaniu 5.

---

### Zadanie 1: Maska czarnych brzegów

**Pliki:**
- Utwórz: `src/lib/blackBorderMask.ts`
- Test: `src/lib/blackBorderMask.test.ts`

**Interfejsy:**
- Tworzy: `blackBorderMask(pixels: Uint8Array, width: number, height: number, channels: number, opts?: { threshold?: number; erodePx?: number }): Uint8Array | null`. Wynik ma 1 kanał (`width·height` bajtów): 255 = zostaw, 0 = wytnij. `null`, gdy nic nie wycięto. Domyślnie `threshold = 8` (piksel czarny, gdy każdy kanał ≤ 8) i `erodePx = 2`.

- [ ] **Krok 1: Testy**

`blackBorderMask.test.ts`, obrazy syntetyczne RGB (3 kanały), szare tło 120:
- `'klin w narożniku jest wycięty'`: 40 × 30, trójkąt czarny (0) w lewym górnym rogu o przyprostokątnych 10 px. Oczekiwane: `mask[0] === 0`, `mask[idx(5, 2)] === 0`, `mask[idx(20, 15)] === 255`.
- `'czarny obszar we wnętrzu zostaje'`: 40 × 30, czarny kwadrat 6 × 6 w środku, niestykający się z krawędzią. Oczekiwane: wynik `null`.
- `'obraz bez czarnych brzegów daje null'`: jednolite tło 120. Oczekiwane: `null`.
- `'erozja wcina się w zdjęcie o erodePx'`: czarny pas 5 px przy lewej krawędzi, `erodePx: 2`. Oczekiwane: kolumny 0–6 = 0, kolumna 7 = 255 (wiersz w połowie).
- `'szum JPEG do progu też jest tłem'`: pas przy krawędzi z wartościami 0–8 → 0; piksel 9 we wnętrzu pasa przerywa zalewanie dalej (sprawdzić jedną kolumnę).
- `'kanał alfa jest ignorowany'`: 4 kanały, alfa 255; wynik jak dla przypadku z klinem.

- [ ] **Krok 2:** `npx vitest run src/lib/blackBorderMask.test.ts` → FAIL (brak modułu).
- [ ] **Krok 3: Implementacja**

Zalewanie wszerz (kolejka na `Int32Array`) od wszystkich pikseli krawędzi, które są „czarne”, po sąsiadach 4-spójnych. Potem erozja maski „zostaw” o `erodePx` (odległość szachownicowa: `erodePx` przebiegów 8-sąsiedztwa). Bez rekurencji: obrazy mają do 3200 × 3200.

- [ ] **Krok 4:** ten sam test → PASS.
- [ ] **Krok 5:** commit „Zdjęcie obiektu: maska czarnych brzegów po stackowaniu”.

### Zadanie 2: Geometria wklejania

**Pliki:**
- Utwórz: `src/lib/ownPhoto.ts`
- Test: `src/lib/ownPhoto.test.ts`

**Interfejsy:**
- Zużywa: `gnomonic`, `tangentToPixel` z `src/lib/framing.ts`; `PhotoProject['astrometry']` z `src/lib/photo.ts`.
- Tworzy:
  - `OWN_PHOTO_GRID = 17`
  - `interface PhotoGrid { cols: number; rows: number; sky: [number, number][] }`: wiersze po kolei; punkt `(i, j)` leży w pikselu `(i·width/(cols−1), j·height/(rows−1))`; `[raDeg, decDeg]`.
  - `interface OwnPhotoSolved { objectId: string; photoId: string; name: string; image: string; mask: string | null; width: number; height: number; createdAt: number; astrometry: PhotoProject['astrometry']; grid: PhotoGrid }`: odpowiedź serwera; `image` i `mask` jako adresy `data:`.
  - `interface OwnPhotoRecord extends Omit<OwnPhotoSolved, 'image' | 'mask'> { image: Blob; mask: Blob | null }`
  - `interface TanView { raDeg: number; decDeg: number; fovDeg: number; sizePx: number }`
  - `type Pt = [number, number]`; `interface WarpTriangle { src: [Pt, Pt, Pt]; dst: [Pt, Pt, Pt] }`
  - `warpTriangles(grid: PhotoGrid, width: number, height: number, view: TanView): WarpTriangle[]`
  - `affineFromTriangles(src: [Pt, Pt, Pt], dst: [Pt, Pt, Pt]): [number, number, number, number, number, number]`: kolejność `setTransform(a, b, c, d, e, f)`.
  - `expandTriangle(t: [Pt, Pt, Pt], px: number): [Pt, Pt, Pt]`: każdy wierzchołek odsunięty od środka ciężkości o `px`.

- [ ] **Krok 1: Testy**

Pomocnik w teście: `gridFromTan(center, scaleDegPerPx, width, height, flip = false)` buduje `PhotoGrid` z idealnego TAN (przez `gnomonicInverse`), a `flip` odwraca oś x.
- `'idealny TAN zgodny z widokiem daje tożsamość skali'`: widok o środku i polu równym zdjęciu 200 × 200, `sizePx = 200`. Każdy `dst` ≈ `src` (±0,01 px), 2·16·16 = 512 trójkątów.
- `'afiniczne przekształcenie odtwarza wierzchołki'`: dla losowego trójkąta `affineFromTriangles` wysyła 3 `src` w 3 `dst` (±1e−9).
- `'lustrzane zdjęcie ma ujemny wyznacznik'`: `flip = true`, wyznacznik `a·d − b·c < 0` dla wszystkich trójkątów.
- `'granica RA 0/360 bez pasa'`: środek RA 0,05°, pole 1°. Szerokość bbox `dst` każdego trójkąta < 3 × szerokość komórki.
- `'trójkąty za płaszczyzną styczną pominięte'`: zdjęcie po przeciwnej stronie nieba niż widok → `[]`.
- `'trójkąty poza obrazem pominięte'`: zdjęcie 5° obok widoku o polu 1° → `[]`.
- `'biegun'`: środek Dec 89,9°, pole 2°; wszystkie `dst` skończone, liczba trójkątów 512.
- `'expandTriangle powiększa o px'`: odległość wierzchołka od środka ciężkości rośnie dokładnie o `px`.

- [ ] **Krok 2:** `npx vitest run src/lib/ownPhoto.test.ts` → FAIL.
- [ ] **Krok 3: Implementacja** w `src/lib/ownPhoto.ts`. Wierzchołek: `cos c` jak w `gnomonic` (≤ 0 → wierzchołek nieważny, trójkąt pomijany), potem `tangentToPixel(gnomonic(view, p), view.fovDeg, view.sizePx)`. Pomija trójkąty, których bbox `dst` nie przecina `[0, sizePx]²`. Każda komórka daje trójkąty `(00, 10, 11)` i `(00, 11, 01)`.
- [ ] **Krok 4:** test → PASS.
- [ ] **Krok 5:** commit „Zdjęcie obiektu: siatka i trójkąty wklejania w rzut TAN”.

### Zadanie 3: Most `grid` i tryb obiektu w `/api/photo/solve`

**Pliki:**
- Zmień: `scripts/skyshot-bridge/src/main.rs` (komenda `grid` obok `project`, komunikat użycia w `run`)
- Zmień: `server/photo.ts` (gałąź `/solve`)
- Test: `src/lib/photoServer.test.ts`

**Interfejsy:**
- Zużywa: `blackBorderMask` (zad. 1), `OWN_PHOTO_GRID`, `OwnPhotoSolved` (zad. 2).
- Tworzy:
  - Komendę mostu `grid <request.json>`: wejście `{ wcs, width, height, cols, rows }`, wyjście `{"sky": [[ra, dec], ...]}` (stopnie, wiersze po kolei, `wcs.pixel_to_sky(i·width/(cols−1), j·height/(rows−1))`). `ensure!(cols >= 2 && rows >= 2 && cols * rows <= 10_000)`.
  - `POST /api/photo/solve?object=<id katalogu>`: odpowiedź 200 `OwnPhotoSolved`. Bez parametru odpowiedź zostaje `PhotoProject` (bez zmian).

- [ ] **Krok 1: Testy** w `photoServer.test.ts`. Atrapa `solve` rozróżnia komendę po `args[0]`: `'solve'` → `{ stdout: JSON }` z `width`, `height`, `wcs: {}`, `objects: []` i polami astrometrii; `'grid'` → 289 punktów; `'project'` → `{ pixels: [[16, 16]] }` albo `{ pixels: [null] }`. Obraz testowy: 32 × 32 szary (120) z czarną ramką 3 px.
  - `'tryb obiektu: nieznany obiekt to 404 bez solvera'`: `?object=XYZ`, 404, `solve` niewywołany.
  - `'tryb obiektu: zwraca siatkę, maskę i objectId'`: `?object=M%2031`, 200, `objectId === 'M 31'`, `grid.cols === 17`, `grid.sky.length === 289`, `mask` zaczyna się od `data:image/png;base64,`, `image` od `data:image/jpeg;base64,`; nie ma `cuts` ani `objects`.
  - `'tryb obiektu: obiekt poza kadrem to 422'`: `project` → `[null]`, 422, `error` zawiera `'M 31 nie ma na tym zdjęciu'`.
  - `'tryb obiektu: zdjęcie bez czarnych brzegów ma mask null'`: obraz jednolicie szary, `mask === null`.
  - `'bez parametru odpowiedź jak dotąd'`: klucze odpowiedzi to dokładnie klucze `PhotoProject`.
- [ ] **Krok 2:** `npx vitest run src/lib/photoServer.test.ts` → nowe testy FAIL.
- [ ] **Krok 3: Implementacja serwera.**
  - Obiekt z `getCatalogById()` sprawdzany przed odbiorem pliku i przed `busy` (404 „Nieznany obiekt katalogowy.”).
  - Wspólny potok `sharp` (`autoOrient → resize 3200 inside → flatten #000`), z niego JPEG 95 i w trybie obiektu `raw()` dla `blackBorderMask` → PNG 1-kanałowy przez `sharp(..., { raw: { width, height, channels: 1 } }).png()`.
  - Po `solve`: plik żądania w tym samym `temp`, potem `grid` i `project` z `stars: [[raDeg, decDeg]]` (czas 20 s, `signal` z `abort`).
  - W kadrze, gdy piksel nie jest `null` i `0 ≤ x ≤ width`, `0 ≤ y ≤ height`; inaczej 422 „Obiektu {id} nie ma na tym zdjęciu.”.
  - `photoId` = SHA-256 JPEG-a, jak `PhotoProject.id`. Błędy, limity i `busy` jak dziś.
- [ ] **Krok 4:** test → PASS; `npm run typecheck` bez błędów.
- [ ] **Krok 5: Most.** Dodaj komendę `grid` w `main.rs`, uruchom `npm run setup:skyshot` → kończy się sukcesem. Sprawdzenie: plik `{ wcs: astrometry.wcs, width, height, cols: 17, rows: 17 }` z `scripts/.cache/observatory-photos/M51.project.json`, `tracker-skyshot grid <plik>` (plik żądania w scratchpadzie) → 289 punktów, punkt środkowy (8, 8) w odległości < 0,01° od `astrometry.raDeg/decDeg`.
- [ ] **Krok 6:** commit „Zdjęcie obiektu: siatka punktów kontrolnych, maska i sprawdzenie obiektu w solverze”.

### Zadanie 4: Zapis zdjęć i indeks w Zustand

**Pliki:**
- Utwórz: `src/lib/ownPhotoStorage.ts`
- Zmień: `src/state/store.ts` (pole, akcje, `partialize`, `merge`)
- Test: `src/lib/ownPhotoStorage.test.ts`, `src/state/persistence.test.ts`

**Interfejsy:**
- Zużywa: `OwnPhotoSolved`, `OwnPhotoRecord` (zad. 2).
- Tworzy:
  - `readOwnPhoto(objectId: string): Promise<OwnPhotoRecord | null>`, `writeOwnPhoto(record: OwnPhotoRecord): Promise<void>`, `deleteOwnPhoto(objectId: string): Promise<void>`. Baza `tracker-own-photos` v1, magazyn `photos`, klucz `objectId`.
  - `recordFromSolved(solved: OwnPhotoSolved): Promise<OwnPhotoRecord>`: adresy `data:` → `Blob` przez `fetch(dataUrl).then((r) => r.blob())`; `objectId` z odpowiedzi.
  - W store: `ownPhotos: Record<string, { photoId: string; shown: boolean }>` (domyślnie `{}`); `setOwnPhoto(objectId: string, photoId: string): void` (ustawia `shown: true`); `toggleOwnPhotoShown(objectId: string): void`; `removeOwnPhoto(objectId: string): void`.

- [ ] **Krok 1: Testy.**
  - `ownPhotoStorage.test.ts`: atrapa `indexedDB` na `Map`, wzorowana na `photoStorage.test.ts`:
    - `'zapis i odczyt zwraca ten sam rekord'`;
    - `'odczyt nieznanego obiektu to null'`;
    - `'usunięcie kasuje rekord'`;
    - `'baza tworzy magazyn photos'` (`onupgradeneeded` woła `createObjectStore('photos')`);
    - `'recordFromSolved bierze objectId z odpowiedzi i zachowuje mask null'`.
  - `persistence.test.ts`:
    - `'stary zapis bez ownPhotos daje pusty indeks'`;
    - `'ownPhotos przetrwa zapis i odczyt'`;
    - `'setOwnPhoto włącza, toggle przełącza, remove usuwa'`.
- [ ] **Krok 2:** `npx vitest run src/lib/ownPhotoStorage.test.ts src/state/persistence.test.ts` → FAIL.
- [ ] **Krok 3: Implementacja.** W `partialize` dopisz `ownPhotos`. W `merge` dopisz `ownPhotos: { ...p?.ownPhotos }`, tak jak `framingStretch`.
- [ ] **Krok 4:** testy → PASS.
- [ ] **Krok 5:** commit „Zdjęcie obiektu: zapis w IndexedDB i wybór moje/domyślne”.

### Zadanie 5: Kompozytor i obrazy z własnym zdjęciem

**Pliki:**
- Utwórz: `src/lib/ownPhotoCompose.ts` (tylko `composeOwnPhoto`, płótno), `src/lib/ownPhotoImage.ts` (klucz, błąd, `getOwnSkyImage`)
- Test: `src/lib/ownPhotoImage.test.ts`

**Interfejsy:**
- Zużywa: `warpTriangles`, `affineFromTriangles`, `expandTriangle`, `TanView`, `OwnPhotoRecord` (zad. 2); `readOwnPhoto` (zad. 4); `getSkyImage`, `SkyImageOptions` z `src/lib/thumbs.ts`; `imageCache` z `src/lib/imageCache.ts`.
- Tworzy:
  - `class OwnPhotoMissingError extends Error`
  - `ownImageKey(photoId: string, view: TanView, opts: SkyImageOptions): string`: `/own/${photoId}/${survey}/${mode}/${coarser}/${ra.toFixed(4)}/${dec.toFixed(4)}/${fov}/${size}`, domyślne `dss2/color/0` jak w `getSkyImage`.
  - `composeOwnPhoto(background: Blob | null, record: OwnPhotoRecord, view: TanView): Promise<Blob>` w `ownPhotoCompose.ts`
  - `getOwnSkyImage(objectId: string, photoId: string, view: TanView, signal?: AbortSignal, opts?: SkyImageOptions): Promise<Blob>`

- [ ] **Krok 1: Testy** (bez płótna):
  - `'klucz zawiera photoId i parametry widoku'`;
  - `'różne zdjęcia nie dzielą klucza'`;
  - `'brak rekordu lub inny photoId rzuca OwnPhotoMissingError'`: `getOwnSkyImage` z `vi.mock('./ownPhotoStorage')` i `vi.mock('./thumbs')`; `composeOwnPhoto` nie jest wołane.
  - `'błąd tła nie blokuje zdjęcia, a wynik nie trafia do bufora'`: `getSkyImage` rzuca `Error('brak kafelków')`, `composeOwnPhoto` dostaje `null`, `cache.put` niewywołane (`vi.mock('./ownPhotoCompose')`, `vi.mock('./imageCache')`).
  - `'przerwanie przez signal przechodzi jako AbortError'`.
- [ ] **Krok 2:** `npx vitest run src/lib/ownPhotoImage.test.ts` → FAIL.
- [ ] **Krok 3: Implementacja.**
  - Bufor: `imageCache('tracker-own-thumbs-v1', 64)`.
  - `composeOwnPhoto`:
    1. Płótno `sizePx²` (`OffscreenCanvas`, a bez niego `document.createElement('canvas')`): tło `drawImage(bitmapa tła)` albo wypełnienie `#000`.
    2. Zdjęcie: `createImageBitmap(record.image)`, z maską przez `globalCompositeOperation = 'destination-in'` na płótnie pośrednim. Pośrednie płótno pomniejszone o `k = min(1, 2·s)`, gdzie `s` to mediana `√|det|` przekształceń trójkątów; współrzędne `src` mnożone przez `k`.
    3. Dla każdego trójkąta: `save` → ścieżka `expandTriangle(dst, 1)` → `clip` → `setTransform(...affineFromTriangles(src·k, dst))` → `drawImage(pośrednie, 0, 0)` → `restore`.
    4. Wynik `convertToBlob`/`toBlob` jako `image/jpeg`, jakość 0,92.
  - `getOwnSkyImage`: bufor → tło (`getSkyImage` z `opts`; `AbortError` przepuszcza, inny błąd → `null`) → `readOwnPhoto` (brak albo inny `photoId` → `OwnPhotoMissingError`) → `composeOwnPhoto` → `cache.put` tylko przy tle różnym od `null`.
  - Pamięć podręczna zdekodowanych bitmap zdjęć: najwyżej 2 (po `photoId`).
- [ ] **Krok 4:** test → PASS.
- [ ] **Krok 5:** commit „Zdjęcie obiektu: kompozytor wklejający zdjęcie w obraz nieba”.

### Zadanie 6: Szczegóły, karta i miniatury

**Pliki:**
- Utwórz: `src/components/OwnPhotoActions.tsx`, `src/components/OwnPhotoButton.tsx`
- Zmień:
  - `src/components/ObjectDetails.tsx` (rząd przycisków, linia ~94)
  - `src/components/SkyCards.tsx:33-36` (`.object-photo`)
  - `src/components/Thumb.tsx`
  - `src/styles/app.css:704-705` (obok `.favorite-button`)

**Interfejsy:**
- Zużywa: `recordFromSolved`, `writeOwnPhoto`, `deleteOwnPhoto`, akcje store (zad. 4); `getOwnSkyImage`, `OwnPhotoMissingError` (zad. 5); `thumbFovDeg` z `thumbs.ts`.
- Tworzy: `<OwnPhotoActions objectId={o.id} key={o.id} />` i `<OwnPhotoButton objectId={o.id} />`.

- [ ] **Krok 1: `OwnPhotoActions`.**
  - Przy montowaniu `GET /api/photo/status` → `ready`.
  - Ukryty `input type="file"` z `accept="image/jpeg,image/png,image/webp,image/tiff,.fits,.fit,.fts"`.
  - Brak zdjęcia: przycisk „Dodaj moje zdjęcie”. Jest zdjęcie: „Zmień moje zdjęcie” i „Usuń moje zdjęcie”.
  - Wysyłka jak w `PhotoExplorer.upload`: nagłówki `Content-Type`, `X-Photo-Name`, adres `/api/photo/solve?object=${encodeURIComponent(objectId)}`, `AbortController` przerywany przy odmontowaniu.
  - W trakcie przycisk ma tekst „Rozwiązywanie…” i jest wyłączony.
  - Sukces: `recordFromSolved` → `writeOwnPhoto` → `setOwnPhoto(rekord.objectId, rekord.photoId)`.
  - Błąd: `<span role="alert">` z `error` serwera, w stylu komunikatu z `FramingPanel` (`color: var(--warn)`).
  - Solver niegotowy: „Dodaj/Zmień” wyłączone, `title` „Wymaga lokalnego solvera Skyshot (npm run setup:skyshot)”.
  - Usuń: `deleteOwnPhoto` → `removeOwnPhoto`.
- [ ] **Krok 2: `ObjectDetails`.**
  - `OwnPhotoActions` wstawiony w rząd przycisków po „Do planu”, a przed „AstroBin”.
  - `Thumb` w szczegółach dostaje `preferAstroBin={!ownShown}`.
- [ ] **Krok 3: `OwnPhotoButton` i CSS.**
  - Renderuje `null`, gdy `ownPhotos[objectId]` nie istnieje.
  - Przycisk z ikoną `Image` z `lucide-react`, rozmiar 14, `fill` jak w `FavoriteButton`.
  - Klasa `own-photo-button`, a w CSS selektory `.favorite-button, .own-photo-button` dzielą reguły; `.own-photo-button { right: auto; left: 6px }`, `.own-photo-button.active` jak `.favorite-button.active`.
  - `aria-pressed={shown}`, `aria-label`/`title`: „Pokaż zdjęcie domyślne” (gdy `shown`), w przeciwnym razie „Pokaż moje zdjęcie”.
  - `onClick`: `stopPropagation`, potem `toggleOwnPhotoShown`.
  - Wstawiony w `.object-photo` w `SkyCards.tsx` obok `FavoriteButton`.
- [ ] **Krok 4: `Thumb`.**
  - `own = useStore((s) => s.ownPhotos[object.id])`. Klucz efektu i `key` dostają `own?.shown ? own.photoId : ''`.
  - Gdy `own?.shown`: `getOwnSkyImage(object.id, own.photoId, view, signal, opts)`. `view = fovDeg ? { o.raDeg, o.decDeg, fovDeg, sizePx ?? 400 } : { o.raDeg, o.decDeg, thumbFovDeg(o), 224 }`, a `opts = fovDeg ? {} : { coarser: 1 }`, czyli parametry `getSkyImage`/`getThumb`. Gałąź AstroBin pomijana.
  - `OwnPhotoMissingError` → `useStore.getState().removeOwnPhoto(object.id)` (po zmianie store efekt ładuje domyślne).
  - Tekst `alt`: „zdjęcie użytkownika wpasowane w DSS2”.
  - Działa także w `PlannerView` (miniatura 52 px), bez zmian w tym pliku.
- [ ] **Krok 5:** `npm run typecheck` i `npm test` → bez błędów.
- [ ] **Krok 6:** commit „Zdjęcie obiektu: dodawanie w szczegółach, przełącznik w karcie, miniatury”.

### Zadanie 7: Kadrowanie

**Pliki:**
- Zmień: `src/components/FramingPanel.tsx` (stan `img`, `imageKey`, efekt ładowania ok. linii 98–117, podpis ok. linii 279–284)

**Interfejsy:**
- Zużywa: `getOwnSkyImage` (zad. 5), `ownPhotos` (zad. 4).

- [ ] **Krok 1:**
  - `own = useStore((s) => o ? s.ownPhotos[o.id] : undefined)`, a `ownId = own?.shown ? own.photoId : ''`.
  - `imageKey` dostaje `:${ownId}`.
  - W efekcie oba wywołania (podgląd `coarser: 2` i ostry) idą przez funkcję `load(coarser?)`: przy `ownId` jest to `getOwnSkyImage(o.id, ownId, { raDeg: imageRa, decDeg: imageDec, fovDeg: imageFov, sizePx: SIZE }, ctrl.signal, { ...opts, coarser })`, a w przeciwnym razie `getSkyImage` jak dziś.
  - `OwnPhotoMissingError` → `removeOwnPhoto(o.id)`.
  - Zależności efektu dostają `ownId`.
  - W podpisie po `credit` dopisek `' · moje zdjęcie'`, gdy `ownId` i pokazany obraz pochodzi z tego klucza.
- [ ] **Krok 2:** `npm run typecheck`, `npm test` → bez błędów.
- [ ] **Krok 3:** commit „Kadrowanie: własne zdjęcie wpasowane w tło przeglądu”.

### Zadanie 8: Sprawdzenie w przeglądarce i dokumentacja

**Pliki:**
- Zmień: `docs/wymagania.md` (nowa sekcja „Moje zdjęcie obiektu (5.11.2026)” w formacie istniejących sekcji)
- Zmień: `CLAUDE.md` (Architektura: jedna linia o `ownPhoto*.ts`, `blackBorderMask.ts`, komendzie mostu `grid`)

- [ ] **Krok 1:**
  - `npm run build` → sukces, startowy JS < 200 KB gzip (zanotować wartość).
  - `npm run dev` (konfiguracja `dev` z `.claude/launch.json`).
- [ ] **Krok 2: Scenariusz** (Playwright według CLAUDE.md, zdjęcia z `scripts/.cache/observatory-photos`):
  1. M 51: Szczegóły → „Dodaj moje zdjęcie” → `M51.jpg` → przełącznik w karcie się pojawia.
  2. Miniatury w karcie, szczegółach, Katalogu i Planerze pokazują zdjęcie, a gwiazdy pokrywają się z DSS2 (zrzut z przełącznikiem w obu stanach).
  3. Kadrowanie:
     - zdjęcie bez szwów i ramki, reszta pola z DSS2;
     - po przeciągnięciu, zmianie warstwy na PanSTARRS i powiększeniu zdjęcie zostaje wpasowane;
     - histogram rozciąga całość.
  4. Zdjęcie z czarnymi brzegami (np. `IC434.png`, jeśli ma brzegi; inaczej obrócona kopia M51 z czarnymi narożnikami przygotowana w scratchpadzie): kliny wycięte, bez ciemnej linii.
  5. Obiekt spoza zdjęcia (np. M 31 z `M51.jpg`): komunikat „Obiektu M 31 nie ma na tym zdjęciu.”.
  6. Przeładowanie strony: wybór i zdjęcie zostają. „Usuń moje zdjęcie” przywraca domyślne, przełącznik znika.
  7. Projekt Eksploratora zdjęć (`tracker-photo`/`current`) bez zmian.
  8. Na koniec przywrócić stan profilu Playwrighta i usunąć dodane zdjęcia.
- [ ] **Krok 3:**
  - Dokumentacja jak wyżej.
  - `git status`: brak pustych plików w korzeniu po subagentach.
  - Commit „Zdjęcie obiektu: wymagania i opis architektury”.
