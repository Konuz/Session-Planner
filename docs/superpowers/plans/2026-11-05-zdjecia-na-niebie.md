# Moje zdjęcia na mapie nieba: plan wykonania

> **Dla wykonawców:** wymagany skill: superpowers:subagent-driven-development (zalecany) albo superpowers:executing-plans. Kroki mają pola `- [ ]` do odhaczania.

**Cel:** przełącznik „Moje zdjęcia” w „Warstwach” kładzie zdjęcia z wyborem „moje” na kopule nieba we właściwym miejscu, skali i obrocie, pod konturami mgławic, z suwakiem krycia.

**Architektura:** zdjęcie to siatka 17 × 17 z teksturą rysowana w istniejącym kontekście WebGL2 gwiazd, po gwiazdach, do bufora poza ekranem nakładanego raz z kryciem warstwy. Pozycje wierzchołków liczy JS (`proj.eq`, ta sama funkcja co kontury), shader tylko interpoluje i mnoży przez maskę czarnych brzegów (druga tekstura). Droga Mleczna, siatka, południk i linie gwiazdozbiorów przechodzą na nowe płótno 2D pod WebGL; nakładka z konturami zostaje na wierzchu.

**Stos:** React 19, TypeScript strict, Zustand persist, WebGL2, Vitest (środowisko `node`).

**Projekt:** `docs/superpowers/specs/2026-11-05-zdjecia-na-niebie-design.md` (czytać razem z planem).

## Warunki globalne

- Bez średników, pojedyncze cudzysłowy, komentarze i teksty interfejsu po polsku, kolory tylko z tokenów `:root`, kwadratowe narożniki.
- Testy tylko `src/**/*.test.ts`; logika rzutu w `src/lib/` bez Reacta i bez WebGL.
- Startowy JS < 200 KB gzip (dziś 152,4 KB); moduł WebGL zdjęć ładowany leniwie (`import()`), dopiero gdy są zdjęcia do pokazania.
- Kod przy renderze nie używa sieci; IndexedDB i dekodowanie tylko w efektach i w ścieżce rysowania (jak `artCache`).
- Konwencje: kąty w stopniach, RA/Dec J2000, azymut od N przez E, ekran w px CSS (x w prawo, y w dół).
- Gałąź `feat/zdjecia-na-niebie`, commit po każdym zadaniu w stylu historii („Zdjęcia na niebie: …”), z linią `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Nie ruszać nieśledzonych `.codex-attachments/`, `astro-regressor-main/`, `docs/prompts/`; po subagentach `git status` (puste pliki w korzeniu po przekierowaniach).

## Na co uważać przy przeglądzie

1. **Zdjęcie na granicy RA 0°/360°** (punkty siatki z RA 359,9° i 0,1°): wektory jednostkowe są ciągłe, zdjęcie ma leżeć w całości, bez pasa przez kopułę. Test w zadaniu 2.
2. **Zdjęcie przy biegunie** (Dec 88,5°): środek i promień kątowy poprawne, interpolacja w granicach 0,5 px. Test w zadaniu 2.
3. **Punkt siatki niebędący liczbą** (NaN z mostu dla piksela poza rzutem): zdjęcie pomijane, a nie trójkąty przez cały ekran. Test w zadaniu 2.
4. **Utrata i przywrócenie kontekstu WebGL w trakcie dekodowania:** stara instancja nie wgrywa tekstur do nowego kontekstu, zdjęcia wracają po przywróceniu. Sprawdzenie w zadaniu 7 (`WEBGL_lose_context`).
5. **Zmiana lub usunięcie zdjęcia, ukrycie („domyślne”) albo wyłączenie warstwy w trakcie dekodowania:** brak wycieku tekstury i brak rysowania starego zdjęcia. Test zestawu w zadaniu 3, sprawdzenie w zadaniu 7.

---

### Zadanie 1: Stan warstwy i przełącznik z suwakiem w „Warstwach”

**Pliki:**
- Zmień: `src/state/store.ts` (typ `State` ok. 128–140, unia `toggle` w 182, wartości domyślne ok. 228–240, `partialize` ok. 398–410)
- Zmień: `src/views/SkyView.tsx` (`LayerKey`, `LAYERS`, `LayersMenu`)
- Zmień: `src/styles/app.css` (obok `.popover.layers-popover`, linia ok. 551)
- Test: `src/state/persistence.test.ts`

**Interfejsy:**
- Produkuje: `State.showOwnPhotos: boolean` (domyślnie `true`), `State.ownPhotosOpacity: number` (domyślnie `1`), `setOwnPhotosOpacity(value: number): void` (przycina do [0,1; 1]); `'showOwnPhotos'` w unii kluczy `toggle`.

- [ ] **Krok 1: Testy**

```ts
it('warstwa moich zdjęć: domyślnie włączona, krycie 100%, przycinane do 10–100%', async () => {
  const { useStore } = await import('./store')
  expect(useStore.getState().showOwnPhotos).toBe(true)
  expect(useStore.getState().ownPhotosOpacity).toBe(1)
  useStore.getState().toggle('showOwnPhotos')
  expect(useStore.getState().showOwnPhotos).toBe(false)
  useStore.getState().setOwnPhotosOpacity(0.02)
  expect(useStore.getState().ownPhotosOpacity).toBe(0.1)
  useStore.getState().setOwnPhotosOpacity(1.7)
  expect(useStore.getState().ownPhotosOpacity).toBe(1)
})

it('warstwa moich zdjęć trafia do zapisu, a stary zapis bez niej dostaje wartości domyślne', async () => {
  // jak test „zapis ze starszej wersji persist nie przepada (B17)”: stary zapis bez pól → true i 1;
  // po toggle('showOwnPhotos') i setOwnPhotosOpacity(0.4) ostatnie setItem zawiera "showOwnPhotos":false i "ownPhotosOpacity":0.4
})
```

- [ ] **Krok 2:** `npx vitest run src/state/persistence.test.ts`; oczekiwane: FAIL (brak pól).
- [ ] **Krok 3: Store.** Pola i setter jak w „Interfejsy”, oba pola w `partialize` (obok `showOutlines`). `merge` bez zmian (wartości domyślne przychodzą z `current`).
- [ ] **Krok 4: „Warstwy”.** W `LayerKey` i `LAYERS` po `showOutlines`: `{ key: 'showOwnPhotos', label: 'Moje zdjęcia' }`. Bezpośrednio pod tym przełącznikiem, tylko gdy warstwa jest włączona, wiersz `<label className="layers-range">` z tekstem „Krycie”, `Range` (`src/components/Range.tsx`, min 10, max 100, step 5, wartość `Math.round(opacity * 100)`, `onChange` → `setOwnPhotosOpacity(v / 100)`) i liczbą `{n}%` w `.mono`. Tylko lista kopuły (`THREE_D_LAYERS` bez zmian). Licznik sekcji liczy przełączniki jak dotąd.
- [ ] **Krok 5: CSS.** `.layers-range`: wiersz flex, odstęp 8 px, wcięcie do tekstu przełącznika (szerokość toru 34 px + 10 px), `font-size: 12px`, `color: var(--text-2)`; `input` z `flex: 1; min-width: 60px`.
- [ ] **Krok 6:** `npx vitest run src/state/persistence.test.ts` i `npm run typecheck`; oczekiwane: PASS.
- [ ] **Krok 7: Commit** „Zdjęcia na niebie: przełącznik warstwy i suwak krycia”.

### Zadanie 2: Siatka zdjęcia na kopule i jej rzut

**Pliki:**
- Utwórz: `src/lib/ownPhotoSky.ts`
- Test: `src/lib/ownPhotoSky.test.ts`

**Interfejsy:**
- Pobiera: `PhotoGrid` (`src/lib/ownPhoto.ts`), `Projector` i `makeProjector` (`src/lib/projection.ts`), `unitVector`, `mulVec`, `vecToHorizontal`, `Mat3`, `Vec3`, `DEG` (`src/lib/astro.ts`), `horizonAltitude`, `HorizonPoint` (`src/lib/horizon.ts`).
- Produkuje:
  - `interface SkyMesh { cols: number; rows: number; dirs: Vec3[]; uv: Float32Array; indices: Uint16Array; centre: Vec3; radiusDeg: number }`
  - `skyMesh(grid: PhotoGrid): SkyMesh | null`: `null`, gdy cols/rows < 2 albo któryś punkt nie jest skończony. Wierzchołki wierszami jak w siatce; `uv` = `[i/(cols−1), j/(rows−1)]`; indeksy na komórkę `k = j·cols + i`: `(k, k+1, k+cols+1)` i `(k, k+cols+1, k+cols)` (ten sam podział co `warpTriangles`); `centre` = znormalizowana średnia `dirs`; `radiusDeg` = największy kąt od `centre` do wierzchołka.
  - `interface ProjectedMesh { xy: Float32Array; alpha: Float32Array; longSidePx: number }`: `xy` po 2 liczby na wierzchołek w px CSS; `alpha` z horyzontu; `longSidePx` = najdłuższy z czterech boków zdjęcia na ekranie (cięciwa między narożnikami).
  - `projectMesh(mesh: SkyMesh, proj: Projector, horMatrix: Mat3, horizon: readonly HorizonPoint[], width: number, height: number): ProjectedMesh | null`: `null`, gdy środek jest za obserwatorem (`proj.eq(centre)` = `null`), środek leży poza ekranem o więcej niż 2 promienie w px (`radiusDeg · proj.scale · DEG`, jak przy konturach), którykolwiek wierzchołek ma `proj.eq` = `null` albo wszystkie `alpha` = 0.
  - `HORIZON_FADE_DEG = 0.5`: `alpha = clamp((alt − horizonAltitude(horizon, az)) / HORIZON_FADE_DEG + 0.5, 0, 1)`, wysokość i azymut z `vecToHorizontal(mulVec(horMatrix, dir))`.

- [ ] **Krok 1: Testy** (pomocnicze: `gridFromTan` jak w `src/lib/ownPhoto.test.ts`, z parametrem obrotu; `eqFromHor(horMatrix, altDeg, azDeg)` = transpozycja `horMatrix` razy `horizontalToVec`, potem RA/Dec; strona i czas jak `SITE` i `0` w `src/lib/core.test.ts`).

```ts
it('siatka 17 × 17: 289 wierzchołków, 1536 indeksów, UV narożników, promień obejmuje wszystkie punkty', () => {
  // mesh.dirs.length 289, mesh.indices.length 16·16·6, uv wierzchołków 0, 16, 272, 288 = (0,0), (1,0), (0,1), (1,1);
  // kąt(centre, dir) ≤ radiusDeg + 1e-9 dla każdego; dla zdjęcia 1,5° × 1,5° radiusDeg ≈ 1,06° (±0,02)
})

it('piksel wewnątrz komórki trafia w rzut swojego RA/Dec z dokładnością 0,5 px', () => {
  // dla każdego przypadku: siatka TAN o środku eqFromHor(...), rzut przez makeProjector(horMatrix, view, 500, 500, 480);
  // 40 punktów wewnątrz komórek (stała lista ułamków, nie na wierzchołkach): współrzędne barycentryczne w pikselach zdjęcia
  // w trójkącie z `indices` → interpolacja `xy`; oczekiwane: proj.eq(unitVector(gnomonicInverse(...))); odległość < 0,5
  // przypadki (alt, az, fov, pole zdjęcia, obrót, lustro):
  //   (85°, 0°, 8°, 1,5°, 0°, nie), (12°, 300°, 8°, 1,5°, 30°, nie), (45°, 135°, 30°, 6°, 110°, nie),
  //   (40°, 70°, 8°, 1,5°, 0°, tak), FULL_DOME ze zdjęciem 1,5° na (60°, 200°)
})

it('zdjęcie na granicy RA 0°/360° i przy biegunie leży w całości i w granicach 0,5 px', () => {
  // środek RA 0,1°, Dec 30° (punkty z RA ~359,4° i ~0,8°) oraz środek Dec 88,5°; widok na środek, fov 8°;
  // projectMesh nie jest null, longSidePx > 100, test interpolacji jak wyżej
})

it('punkt siatki niebędący liczbą odrzuca zdjęcie', () => {
  // grid.sky[100] = [NaN, 47] → skyMesh(grid) === null
})

it('krycie wierzchołków z własnego horyzontu', () => {
  // horyzont płaski 20°: zdjęcie 1,5° na wysokości 15° → projectMesh === null; na 30° → wszystkie alpha 1;
  // zdjęcie 3° ze środkiem na 20° → są wierzchołki z alpha 0 i z alpha 1
})

it('zdjęcie za obserwatorem albo daleko poza ekranem jest pomijane', () => {
  // widok (alt 10°, az 0°, fov 30°), zdjęcie na (alt 10°, az 180°) → null; zdjęcie na (alt 10°, az 60°) → null
})

it('długi bok zdjęcia na ekranie odpowiada skali rzutu', () => {
  // zdjęcie 1,5° × 1,0° w środku widoku fov 8°: longSidePx ≈ 4 · proj.scale · tan(0,375°) (rzut stereograficzny, ±2%)
})
```

- [ ] **Krok 2:** `npx vitest run src/lib/ownPhotoSky.test.ts`; oczekiwane: FAIL (brak modułu).
- [ ] **Krok 3:** zaimplementuj `skyMesh`, `projectMesh`, `HORIZON_FADE_DEG` w `src/lib/ownPhotoSky.ts` (komentarz nagłówkowy po polsku: po co moduł, konwencja pikseli siatki jak w `ownPhoto.ts`).
- [ ] **Krok 4:** `npx vitest run src/lib/ownPhotoSky.test.ts`; oczekiwane: PASS.
- [ ] **Krok 5: Commit** „Zdjęcia na niebie: siatka zdjęcia i jej rzut na kopułę”.

### Zadanie 3: Poziomy tekstur, limit pamięci, kolejność i zestaw zdjęć

**Pliki:**
- Zmień: `src/lib/ownPhotoSky.ts`
- Test: `src/lib/ownPhotoSky.test.ts`

**Interfejsy:**
- Pobiera: `OwnPhotoRecord` (`src/lib/ownPhoto.ts`), `skyMesh`, `SkyMesh` (zadanie 2).
- Produkuje:
  - `TEXTURE_LEVELS = [256, 512, 1024, 2048]`, `TEXTURE_BUDGET_BYTES = 128 * 1024 * 1024`
  - `textureLevel(neededPx: number, photoLongSide: number, maxTextureSize: number): number`: najmniejszy poziom ≥ `neededPx`, najwyżej 2048, potem `min(…, photoLongSide, maxTextureSize)`.
  - `textureBytes(width: number, height: number, hasMask: boolean): number` = `width · height · (4 + (hasMask ? 1 : 0)) · 4 / 3` (mipmapy).
  - `evictionOrder(entries: readonly { key: string; bytes: number; lastDrawn: number }[], budget: number, keep: ReadonlySet<string>): string[]`: klucze do zwolnienia od najdawniej rysowanego, aż suma ≤ `budget`; nigdy z `keep`.
  - `interface SkyPhoto { key: string; objectIds: string[]; record: OwnPhotoRecord; mesh: SkyMesh }`
  - `skyPhotos(records: readonly OwnPhotoRecord[]): SkyPhoto[]`: klucz = `photoId`; ten sam `photoId` u kilku obiektów → jeden wpis z wszystkimi `objectIds`; rekordy z `skyMesh` = `null` pomijane.
  - `drawOrder(photos: readonly SkyPhoto[], selectedId: string | null): SkyPhoto[]`: od dołu: malejąco po `mesh.radiusDeg`, zdjęcie z `selectedId` w `objectIds` na końcu (na wierzchu).

- [ ] **Krok 1: Testy**

```ts
it('poziom tekstury rośnie z wielkością na ekranie i nie przekracza zdjęcia ani GPU', () => {
  expect(textureLevel(5, 3000, 16384)).toBe(256)
  expect(textureLevel(300, 3000, 16384)).toBe(512)
  expect(textureLevel(1500, 3000, 16384)).toBe(2048)
  expect(textureLevel(9000, 9000, 16384)).toBe(2048)
  expect(textureLevel(1500, 900, 16384)).toBe(900)
  expect(textureLevel(1500, 3000, 1024)).toBe(1024)
  expect(textureLevel(5, 200, 16384)).toBe(200)
})

it('limit pamięci zwalnia najdawniej rysowane, nigdy rysowane w tej klatce', () => {
  const e = [{ key: 'a', bytes: 60, lastDrawn: 1 }, { key: 'b', bytes: 60, lastDrawn: 3 }, { key: 'c', bytes: 60, lastDrawn: 2 }]
  expect(evictionOrder(e, 130, new Set())).toEqual(['a'])
  expect(evictionOrder(e, 50, new Set(['a']))).toEqual(['c', 'b'])
  expect(evictionOrder(e, 500, new Set())).toEqual([])
})

it('to samo zdjęcie u dwóch obiektów rysowane raz; uszkodzona siatka pomijana', () => {
  // rekordy M 51 i NGC 5195 z tym samym photoId → jeden SkyPhoto z objectIds ['M 51', 'NGC 5195']; rekord z NaN w siatce → brak
})

it('wybrany obiekt na wierzchu, poza nim większe pole niżej', () => {
  // promienie 3°, 1°, 2° (klucze a, b, c): drawOrder(..., null) → a, c, b; drawOrder(..., obiekt z a) → c, b, a
})
```

- [ ] **Krok 2:** `npx vitest run src/lib/ownPhotoSky.test.ts`; oczekiwane: FAIL.
- [ ] **Krok 3:** zaimplementuj funkcje i stałe z „Interfejsy”.
- [ ] **Krok 4:** `npx vitest run src/lib/ownPhotoSky.test.ts`; oczekiwane: PASS.
- [ ] **Krok 5: Commit** „Zdjęcia na niebie: poziomy tekstur, limit pamięci i kolejność”.

### Zadanie 4: Płótno spodu pod gwiazdami

**Pliki:**
- Zmień: `src/components/SkyDome.tsx` (refy ok. 445–450, rozmiar płócien ok. 640–647, bloki rysowania ok. 666–725, JSX ok. 1397–1398)

**Interfejsy:** brak nowych; zmiana tylko kolejności warstw.

- [ ] **Krok 1: Zrzut „przed”.** Własny Chromium (CLAUDE.md, `--use-angle=swiftshader`), serwer `dev`; pełna kopuła i widok 30° na Łabędzia przy wyłączonych zdjęciach: `scratchpad/dome-before-*.png`.
- [ ] **Krok 2:** dodaj `underRef` i `<canvas ref={underRef} aria-hidden />` przed płótnem WebGL; rozmiar jak pozostałe płótna; w rysowaniu `uctx` z tym samym `setTransform(dpr, …)` i `clearRect`. Na `uctx` przenieś bez zmian: `drawMilkyWay`, pierścienie wysokości z podpisami, kierunki azymutu, południk, linie gwiazdozbiorów. Sprawdź, że nic dalej w nakładce nie polega na stanie ustawionym w przeniesionych blokach (`font`, `fillStyle`, `lineWidth`, `setLineDash`); jeśli polega, ustaw go jawnie w miejscu użycia.
- [ ] **Krok 3:** `npm run typecheck`; oczekiwane: PASS.
- [ ] **Krok 4: Zrzut „po”** w tych samych widokach: Droga Mleczna, siatka i linie wyglądają jak przed, gwiazdy są nad smugą, ziemia zakrywa wszystko pod horyzontem, kursor i kliknięcia działają (najechanie na gwiazdozbiór podświetla linie).
- [ ] **Krok 5: Commit** „Zdjęcia na niebie: Droga Mleczna, siatka i linie pod gwiazdami”.

### Zadanie 5: Warstwa WebGL zdjęć

**Pliki:**
- Utwórz: `src/lib/ownPhotoSkyGL.ts`

**Interfejsy:**
- Pobiera: `projectMesh`, `textureLevel`, `textureBytes`, `evictionOrder`, `drawOrder`, `skyPhotos`, `SkyPhoto`, `TEXTURE_BUDGET_BYTES` (zadania 2–3); `OwnPhotoRecord`; `Projector`; `Mat3`; `HorizonPoint`.
- Produkuje:
  - `interface SkyPhotoFrame { proj: Projector; horMatrix: Mat3; horizon: readonly HorizonPoint[]; width: number; height: number; dpr: number; opacity: number; selectedId: string | null; allowDecode: boolean }` (`width`, `height` w px CSS)
  - `interface SkyPhotoLayer { setPhotos(records: readonly OwnPhotoRecord[]): void; draw(frame: SkyPhotoFrame): void; dispose(): void }`
  - `createSkyPhotoLayer(gl: WebGL2RenderingContext, onLoaded: () => void): SkyPhotoLayer`

- [ ] **Krok 1: Program zdjęcia.** Atrybuty `a_xy` (px CSS), `a_uv`, `a_alpha`; `gl_Position = vec4(a_xy.x / u_res.x * 2.0 - 1.0, 1.0 - a_xy.y / u_res.y * 2.0, 0.0, 1.0)`. Fragment: krawędź wygładzona o ok. 1 px i maska:

```glsl
float e = min(min(v_uv.x, 1.0 - v_uv.x) / fwidth(v_uv.x), min(v_uv.y, 1.0 - v_uv.y) / fwidth(v_uv.y));
float a = v_alpha * clamp(e, 0.0, 1.0) * (u_hasMask ? texture(u_mask, v_uv).r : 1.0);
outColor = vec4(texture(u_img, v_uv).rgb * a, a);
```

- [ ] **Krok 2: Program złożenia.** Prostokąt na cały ekran, `outColor = texture(u_layer, v_uv) * u_opacity`, mieszanie `ONE, ONE_MINUS_SRC_ALPHA`.
- [ ] **Krok 3: Zdjęcia.** `setPhotos` → `skyPhotos(records)`; dla nowych kluczy VAO z buforami `uv` i indeksów (statyczne) oraz `xy` i `alpha` (`DYNAMIC_DRAW`); dla kluczy, których już nie ma, usuń VAO, bufory i tekstury (także po zakończeniu dekodowania, które było w toku).
- [ ] **Krok 4: Tekstury.** Na zdjęcie: `{ img, mask, level, bytes, lastDrawn, pending, failed }`. W `draw`: `needed = textureLevel(projected.longSidePx * dpr, max(W, H), gl.getParameter(MAX_TEXTURE_SIZE))`; gdy brak tekstury albo `level < needed`, `!pending`, `!failed` i `allowDecode` → do kolejki. Kolejka po jednym: `createImageBitmap(record.image, { resizeWidth, resizeHeight, resizeQuality: 'high' })` (dłuższy bok = poziom, proporcje zdjęcia), maska tak samo; `texImage2D` (obraz `RGBA8`, maska `R8`/`RED`), `LINEAR_MIPMAP_LINEAR`, `CLAMP_TO_EDGE`, `generateMipmap`, `bitmap.close()`; zastąp starą teksturę; potem `evictionOrder(…, TEXTURE_BUDGET_BYTES, klucze rysowane w ostatniej klatce)` i zwolnij wskazane; `onLoaded()`. Błąd dekodowania → `failed = true`, `console.warn('Kopuła: moje zdjęcie', key, e)`. Po `dispose` (albo utracie kontekstu: `gl.isContextLost()`) zakończone dekodowanie tylko zamyka bitmapy.
- [ ] **Krok 5: Rysowanie.** Framebuffer z teksturą `RGBA8` w rozmiarze `gl.drawingBufferWidth × Height` (odtwarzany przy zmianie rozmiaru). Wyczyść go, dla `drawOrder(…, selectedId)` z teksturą: `projectMesh(…)`; jeśli nie `null`, `bufferSubData` `xy` i `alpha`, `drawElements(TRIANGLES, …, UNSIGNED_SHORT)`, `lastDrawn` = licznik klatek. Gdy narysowano cokolwiek: domyślny framebuffer, `viewport` całego płótna, złożenie z `opacity`. Na końcu zawsze `bindFramebuffer(null)`; stan, którego gwiazdy nie ustawiają same, przywróć.
- [ ] **Krok 6:** `npm run typecheck`; oczekiwane: PASS.
- [ ] **Krok 7: Commit** „Zdjęcia na niebie: warstwa WebGL zdjęć z maską i pamięcią tekstur”.

### Zadanie 6: Zdjęcia na kopule

**Pliki:**
- Utwórz: `src/components/useSkyPhotoLayer.ts`
- Zmień: `src/components/SkyDome.tsx` (inicjalizacja WebGL ok. 511–536, rysowanie po `starGL.current?.draw` ok. 657)

**Interfejsy:**
- Pobiera: `createSkyPhotoLayer`, `SkyPhotoLayer` (zadanie 5, przez `import('../lib/ownPhotoSkyGL')`), `readOwnPhoto` (`src/lib/ownPhotoStorage.ts`), store: `showOwnPhotos`, `ownPhotosOpacity`, `ownPhotos`, `removeOwnPhoto`.
- Produkuje: `useSkyPhotoLayer(glRef: RefObject<HTMLCanvasElement | null>, glEpoch: number, redraw: () => void): RefObject<SkyPhotoLayer | null>`

- [ ] **Krok 1: Epoka kontekstu.** W `SkyDome` stan `glEpoch` zwiększany w `init` po udanym `createStarGL` i w obsłudze `webglcontextlost`.
- [ ] **Krok 2: Rekordy.** W haku: lista `[objectId, photoId]` wpisów z `shown` (stabilny klucz tekstowy do zależności efektu), tylko gdy `showOwnPhotos`. Efekt czyta `readOwnPhoto` dla każdego: `null` → `removeOwnPhoto(objectId)`; inny `photoId` → pomiń; wynik po anulowaniu efektu ignorowany. Pusta lista bez odczytu.
- [ ] **Krok 3: Warstwa.** Gdy są rekordy i `glEpoch > 0`: `import('../lib/ownPhotoSkyGL')`, `glRef.current.getContext('webgl2')` (ten sam kontekst co gwiazdy; pomiń, gdy `isContextLost()`), `createSkyPhotoLayer(gl, redraw)`, `setPhotos(records)`, `redraw()`. Sprzątanie: `dispose()`, ref na `null`. Zmiana rekordów przy istniejącej warstwie → `setPhotos` i `redraw`.
- [ ] **Krok 4: Rysowanie.** Bezpośrednio po `starGL.current?.draw(...)`: jeśli `starGL.current` i `showOwnPhotos`, `photoLayer.current?.draw({ proj, horMatrix, horizon, width: size.w, height: size.h, dpr, opacity: ownPhotosOpacity, selectedId: selected?.id ?? null, allowDecode: !playing })`. `ownPhotosOpacity`, `showOwnPhotos` i rekordy w zależnościach rysowania tak, by zmiana suwaka od razu przerysowała.
- [ ] **Krok 5:** `npm test` i `npm run typecheck`; oczekiwane: PASS.
- [ ] **Krok 6: Commit** „Zdjęcia na niebie: warstwa moich zdjęć na kopule”.

### Zadanie 7: Sprawdzenie na prawdziwych zdjęciach

**Pliki:** skrypty i zrzuty tylko w scratchpadzie; poprawki błędów w plikach zadań 2–6 (z testem, jeśli dotyczą `ownPhotoSky.ts`).

- [ ] **Krok 1:** `/api/photo/status` gotowy; własny Chromium, serwer `dev`; M 51 i IC 434 (`scripts/.cache/observatory-photos/M51.jpg`, `IC434.png`) dodane przez „Szczegóły obiektu” → `setInputFiles('aside.drawer input[type=file]', …)` (ok. 16 s każde).
- [ ] **Krok 2: M 51** (widok 8°, „Pokaż na niebie”, krycie 50%, „Okręgi obiektów” włączone): gwiazdy kopuły prześwitują w miejscu gwiazd zdjęcia; elipsa NGC 5195 leży na galaktyce towarzyszącej; brak ramki i szwów (przybliżenie zrzutu na krawędź i środek). Przy 100% gwiazdy kopuły zasłonięte.
- [ ] **Krok 3: IC 434** (widok 8°): kontury IC 434, B 33 i NGC 2024 nad zdjęciem i na mgławicach zdjęcia; Droga Mleczna i siatka nie leżą na zdjęciu; brak czarnych klinów.
- [ ] **Krok 4: Zachodzenie i duplikat:** wycinek IC 434 (prawa dolna ćwiartka przez `sharp`, zapisany w scratchpadzie, więc inny `photoId`) dodany do B 33: przy kryciu 50% w miejscu zachodzenia nie widać krawędzi dolnego zdjęcia, a wybór IC 434 albo B 33 przenosi jego zdjęcie na wierzch. To samo pełne zdjęcie IC 434 dodane też do NGC 2024: rysowane raz (bez ciemniejszego ani jaśniejszego obszaru).
- [ ] **Krok 5: Stan i zdarzenia:** wyłączenie „Moje zdjęcia” chowa zdjęcia; przełącznik w karcie na „domyślne” chowa jedno; przeładowanie zachowuje przełącznik i krycie; `WEBGL_lose_context` → `loseContext()` i `restoreContext()`: zdjęcia wracają bez błędów w konsoli; pełna kopuła i odtwarzanie nocy płynne (bez nowych dekodowań podczas odtwarzania); obiekt pod horyzontem: zdjęcie zakryte ziemią.
- [ ] **Krok 6:** przywróć stan profilu (usuń dodane zdjęcia, krycie 100%, warstwa włączona); zrzuty do `docs/wymagania.md` opisz liczbami, nie wklejaj.
- [ ] **Krok 7: Commit** poprawek, jeśli były („Zdjęcia na niebie: …”).

### Zadanie 8: Dokumentacja i bramki

**Pliki:**
- Zmień: `docs/wymagania.md` (nowa sekcja „Moje zdjęcia na mapie nieba (5.11.2026)” na końcu, styl poprzedniej sekcji), `CLAUDE.md` (sekcja „Architektura”: jedno zdanie o `ownPhotoSky.ts`/`ownPhotoSkyGL.ts`, płótnie spodu i kolejności warstw kopuły; jedno o `useSkyPhotoLayer`).

- [ ] **Krok 1:** `npm test`, `npm run typecheck`, `npm run build`; oczekiwane: PASS; startowy JS z wyniku `build` (gzip `index-*.js` z zależnościami startowymi, jak dotąd) < 200 KB, moduł `ownPhotoSkyGL` jako osobny fragment.
- [ ] **Krok 2:** sekcja wymagań z dowodami z zadania 7 (krycie, M 51, IC 434, zachodzenie, przeładowanie, utrata kontekstu, rozmiar startowego JS i fragmentu).
- [ ] **Krok 3: Commit** „Zdjęcia na niebie: wymagania i opis architektury”.
