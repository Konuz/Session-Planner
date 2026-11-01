# Obrazy nieba z kafelków HiPS: plan budowy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Cel:** Wszystkie obrazy nieba w aplikacji (kadrowanie, karty, szczegóły, katalog, planer) składane w przeglądarce z kafelków HiPS DSS2 i PanSTARRS pobieranych z kilku luster zamiast usługi hips2fits (CDS).

**Architektura:**
- Czysta logika w `src/lib/`:
  - `healpix.ts`: indeks HEALPix;
  - `hips.ts`: przeglądy i lustra, wybór rzędu, układ i malowanie obrazu TAN;
  - `hipsTiles.ts`: pobieranie kafelka z kolejnymi lustrami i Cache Storage.
- Leniwy worker `src/workers/hips.worker.ts` dekoduje kafelki i koduje JPEG.
- `src/lib/thumbs.ts` zostaje kolejką i pamięcią podręczną gotowych obrazów, ale zamiast hips2fits i SkyView woła worker.

**Technologie:** React 19, TypeScript 6 (strict), Vite 8 (worker `type: 'module'`), Vitest 5 (środowisko `node`), `sharp` (już w devDependencies, tylko w teście na prawdziwych kafelkach), OffscreenCanvas i `createImageBitmap` w workerze.

**Projekt:** `docs/superpowers/specs/2026-10-31-obrazy-nieba-hips-design.md` (zatwierdzony 1.11.2026). Wykonawca czyta oba dokumenty.

**Stan wyjściowy:** poprawka doraźna z 31.10 nie jest zatwierdzona w git. Obejmuje `src/lib/thumbs.ts`, `src/lib/thumbs.test.ts`, `src/components/Thumb.tsx` i `src/components/FramingPanel.tsx`, a obok leży projekt w `docs/superpowers/specs/`. Przed zadaniem 1 zatwierdzić je jednym commitem: `Limit czasu miniatur, BRAK ZDJĘCIA, projekt HiPS`.

## Ograniczenia globalne

- Styl kodu: bez średników, pojedyncze cudzysłowy, komentarze i teksty interfejsu po polsku.
- Kod przy renderze nie używa sieci; pobieranie odbywa się w efektach albo w workerze.
- Startowy JS < 200 KB gzip (dziś ok. 134 KB). Worker i jego moduły ładujemy leniwie.
- Kolory w danych pikseli to wartości tokenów z `:root`: `#0B0D17` (karta) i `#15192B` (ramka). W komentarzu podajemy nazwę tokenu, bo CSS-owych zmiennych nie da się użyć w pikselach.
- Kolejność luster DSS2:
  1. `https://cdn.skies.esac.esa.int/DSSColor`
  2. `https://stpubdata.s3.us-east-1.amazonaws.com/mast/skybackgrounds/DSSColor`
  3. `https://casda.csiro.au/hips/DSS2/color`
  4. `https://alasky.cds.unistra.fr/DSS/DSSColor`
  5. `https://alaskybis.cds.unistra.fr/DSS/DSSColor`
- Kolejność luster PanSTARRS:
  1. `https://stpubdata.s3.us-east-1.amazonaws.com/mast/skybackgrounds/PanSTARRS`
  2. `https://alasky.cds.unistra.fr/Pan-STARRS/DR1/color-i-r-g`
- IRSA pomijamy (brak CORS) i nie dodajemy Aladin Lite.
- Jedno lustro czeka na kafelek najwyżej 3000 ms. Jeden kafelek pytamy po kolei, nigdy równolegle u wszystkich luster.
- Nie pobieramy kafelków na zapas (np. dla całego katalogu), tylko te potrzebne na ekranie.
- Luka w obrazie (brak kafelka albo pole PanSTARRS na południe od −30°) to paski, nigdy czysta czerń.
- Geometria wyjścia jest taka jak dziś:
  - rzut TAN, N u góry, E po lewej;
  - skala `2·tan(fov/2)/W` rad/px;
  - środek piksela `(i, j)` w `pixelToTangent(i + 0.5, j + 0.5, fov, W)` z `src/lib/framing.ts`.
- Kryteria odbioru, które muszą być spełnione:
  - na łączu użytkownika: ostry kadr przy pustej pamięci podręcznej ≤ 3 s, drugi raz ≤ 0,5 s;
  - na wolnym łączu (2 Mbit/s, 150 ms): podgląd kadru ≤ 3 s i 12 widocznych miniatur katalogu ≤ 3 s;
  - przy awarii pierwszego lustra obraz najwyżej 3 s później.

## Na co uważać przy przeglądzie

1. Bardzo szerokie pole (30–60°) wokół bieguna albo przez RA 0°: obraz ma być ciągły, bez luk i szwów, z rozsądną liczbą kafelków. Test w zadaniu 2.
2. Lustro odpowiada 200 ze stroną HTML albo pustym ciałem (tak robił SkyView). To porażka tego lustra i trzeba zapytać kolejne. Test w zadaniu 4.
3. Podgląd kadru, który przyjdzie po ostrym obrazie, nie może go zastąpić. Przy szybkim przełączaniu obiektów widać tylko obraz bieżącego obiektu. Sprawdzenie Playwrightem w zadaniu 6.
4. Pole PanSTARRS przecinające −30°: część południowa w paski, a nie czarna. Test w zadaniu 2.
5. Wszystkie lustra niedostępne (np. brak sieci): komunikat „BRAK ZDJĘCIA” albo błąd, a nie obraz z samych pasków. Testy w zadaniach 2 i 5.

---

### Zadanie 1: HEALPix NESTED

**Pliki:**
- Utwórz: `src/lib/healpix.ts`
- Test: `src/lib/healpix.test.ts`

**Interfejsy:**
- Dostarcza:
  - `healpixFaceXY(order: number, raDeg: number, decDeg: number): [face: number, ix: number, iy: number]`, czyli ściana bazowa 0–11 i współrzędne `ix`, `iy` w `[0, 2^order)`; działa dla `order` ≤ 20;
  - `nestIndex(order: number, face: number, ix: number, iy: number): number`, indeks NESTED = `face·4^order` + przeplot (bity `ix` na pozycjach parzystych, `iy` na nieparzystych); dla `order` ≤ 15, bez przepełnienia 32-bitowych operacji bitowych.

- [ ] **Krok 1: Napisz test, który nie przechodzi**

Wartości wzorcowe pochodzą z `astropy_healpix` 2.0.1. Algorytm sprawdzono na 200 tys. losowych punktów przy rzędach 0, 3, 12, 18 i 20, bez żadnej niezgodności.

```ts
import { describe, expect, it } from 'vitest'
import { healpixFaceXY, nestIndex } from './healpix'

// [rząd, RA, Dec, ściana, ix, iy] z astropy_healpix (punkty z dala od granic pikseli)
const REF: [number, number, number, number, number, number][] = [
  [5, 279.23473, 38.78369, 3, 2, 27], // Vega
  [5, 37.95456, 89.26411, 0, 31, 31], // Polaris
  [5, 123.4, -89.95, 9, 0, 0], // biegun S
  [5, 1e-5, 0.5, 4, 16, 16], // RA 0
  [5, 359.9999, 10, 4, 20, 20],
  [5, 90, 41.82, 1, 0, 31], // nad granicą z = 2/3
  [5, 90, 41.8, 5, 31, 31], // pod granicą z = 2/3
  [5, 344.41269, -29.62224, 11, 30, 9], // Fomalhaut
  [5, 95.98796, -52.69566, 9, 1, 23], // Kanopus
  [18, 279.23473, 38.78369, 3, 18977, 227325],
  [18, 37.95456, 89.26411, 0, 259759, 260405],
  [18, 123.4, -89.95, 9, 103, 176],
  [18, 1e-5, 0.5, 4, 132787, 132787],
  [18, 359.9999, 10, 4, 165212, 165212],
  [18, 90, 41.82, 1, 49, 262143],
  [18, 90, 41.8, 5, 262117, 262117],
  [18, 344.41269, -29.62224, 11, 250635, 79294],
  [18, 95.98796, -52.69566, 9, 13663, 191700],
  [18, 299.9016, 22.721, 3, 31961, 119915], // M 27
  [20, 279.23473, 38.78369, 3, 75911, 909302],
  [20, 37.95456, 89.26411, 0, 1039037, 1041620],
  [20, 359.9999, 10, 4, 660849, 660851],
  [20, 344.41269, -29.62224, 11, 1002541, 317176],
  [20, 299.9016, 22.721, 3, 127845, 479663],
]

describe('HEALPix', () => {
  it('ściana i współrzędne zgodne z astropy_healpix', () => {
    for (const [order, ra, dec, face, ix, iy] of REF) expect(healpixFaceXY(order, ra, dec), `${order} ${ra} ${dec}`).toEqual([face, ix, iy])
  })
  it('indeks kafelka na rzędzie 7 dla M 27 (ESA: Norder7/Dir50000/Npix51933.jpg)', () => {
    const [face, ix, iy] = healpixFaceXY(16, 299.9016, 22.721)
    expect(nestIndex(7, face, ix >> 9, iy >> 9)).toBe(51933)
    expect(nestIndex(7, 3, 15, 58)).toBe(51933)
  })
})
```

- [ ] **Krok 2: Uruchom test i upewnij się, że nie przechodzi**

Polecenie: `npx vitest run src/lib/healpix.test.ts`
Oczekiwane: FAIL („Failed to resolve import ./healpix”).

- [ ] **Krok 3: Zaimplementuj `healpixFaceXY` i `nestIndex` w `src/lib/healpix.ts`**

Algorytm to `loc2pix` z HEALPix C++ (`healpix_base.cc`). Czapki polarne liczą `tmp` przez `cos δ`, co jest dokładne także tuż przy biegunie.

```ts
// HEALPix NESTED (Górski i in. 2005): ściana bazowa i współrzędne piksela na rzędzie `order` (nside = 2^order).
import { DEG } from './astro'

export function healpixFaceXY(order: number, raDeg: number, decDeg: number): [number, number, number] {
  const nside = 2 ** order
  const z = Math.sin(decDeg * DEG)
  const za = Math.abs(z)
  const tt = (((raDeg % 360) + 360) % 360) / 90
  if (za <= 2 / 3) {
    const t1 = nside * (0.5 + tt)
    const t2 = nside * z * 0.75
    const jp = Math.floor(t1 - t2)
    const jm = Math.floor(t1 + t2)
    const ifp = Math.floor(jp / nside)
    const ifm = Math.floor(jm / nside)
    const face = ifp === ifm ? ifp | 4 : ifp < ifm ? ifp : ifm + 8
    return [face, jm % nside, nside - (jp % nside) - 1]
  }
  const ntt = Math.min(3, Math.floor(tt))
  const tp = tt - ntt
  const tmp = (nside * Math.cos(decDeg * DEG)) / Math.sqrt((1 + za) / 3)
  const jp = Math.min(nside - 1, Math.floor(tp * tmp))
  const jm = Math.min(nside - 1, Math.floor((1 - tp) * tmp))
  return z > 0 ? [ntt, nside - jm - 1, nside - jp - 1] : [ntt + 8, jp, jm]
}
```

`nestIndex`: pętla po bitach `b < order` (bit `b` z `ix` na pozycję `2b`, z `iy` na `2b + 1`), plus `face * 4 ** order`.

- [ ] **Krok 4: Uruchom test i upewnij się, że przechodzi**

Polecenie: `npx vitest run src/lib/healpix.test.ts`
Oczekiwane: PASS (2 testy).

- [ ] **Krok 5: Commit**

```bash
git add src/lib/healpix.ts src/lib/healpix.test.ts
git commit -m "HEALPix NESTED do kafelków HiPS"
```

---

### Zadanie 2: Przeglądy, wybór rzędu, układ i malowanie obrazu TAN

**Pliki:**
- Utwórz: `src/lib/hips.ts`
- Test: `src/lib/hips.test.ts`

**Interfejsy:**
- Korzysta z:
  - `healpixFaceXY`, `nestIndex` (zadanie 1);
  - `pixelToTangent`, `gnomonicInverse` z `src/lib/framing.ts`.
- Dostarcza:
  - `type SurveyId = 'dss2' | 'ps1'`
  - `type ImageMode = 'color' | 'red'`
  - `interface Survey { id: SurveyId; label: string; credit: string; maxOrder: number; minDecDeg: number; mirrors: string[] }`
  - `SURVEYS: Record<SurveyId, Survey>`:
    - `dss2`: `label 'DSS2'`, `credit 'ESA/MAST'`, `maxOrder 9`, `minDecDeg -90`, lustra jak w „Ograniczeniach globalnych”;
    - `ps1`: `label 'PanSTARRS'`, `credit 'MAST'`, `maxOrder 11`, `minDecDeg -30`.
  - `tileUrl(base: string, order: number, npix: number): string` → `${base}/Norder${order}/Dir${⌊npix/10000⌋·10000}/Npix${npix}.jpg`
  - `arcsecPerPixel(fovDeg: number, sizePx: number): number`, czyli `2·tan(fov/2)/size` w sekundach łuku
  - `tileOrderFor(arcsecPerPx: number, maxOrder: number, coarser = 0): number`
  - `interface TanRequest { raDeg: number; decDeg: number; fovDeg: number; sizePx: number; order: number }`
  - `interface TanLayout { sizePx: number; order: number; tiles: number[]; tileOfPixel: Int32Array; colRow: Uint32Array }`:
    - `tiles` to posortowane, unikalne `npix`;
    - `tileOfPixel[j·W + i]` to `npix` albo `-1` poza pokryciem przeglądu;
    - `colRow` = `row·512 + col`.
  - `interface TilePixels { data: Uint8ClampedArray }`, czyli RGBA kafelka 512 × 512
  - `layoutTan(req: TanRequest, survey: Survey): TanLayout`
  - `paintTan(layout: TanLayout, tiles: Map<number, TilePixels | null>, mode: ImageMode): Uint8ClampedArray | null`, czyli RGBA `W·W·4`; `null`, gdy brakuje wszystkich kafelków z `layout.tiles`
  - `type HipsRequest = { id: number; raDeg: number; decDeg: number; fovDeg: number; sizePx: number; survey: SurveyId; mode: ImageMode; coarser: number }`
  - `type HipsReply = { id: number; blob: Blob } | { id: number; error: string }`

- [ ] **Krok 1: Napisz testy, które nie przechodzą**

```ts
import { describe, expect, it } from 'vitest'
import { arcsecPerPixel, layoutTan, paintTan, SURVEYS, tileOrderFor, tileUrl } from './hips'

describe('HiPS', () => {
  it('adres kafelka', () => {
    expect(tileUrl(SURVEYS.dss2.mirrors[0], 7, 51933)).toBe('https://cdn.skies.esac.esa.int/DSSColor/Norder7/Dir50000/Npix51933.jpg')
    expect(tileUrl('b', 3, 300)).toBe('b/Norder3/Dir0/Npix300.jpg')
  })
  it('rząd kafelków: piksel kafelka nie większy niż piksel obrazu', () => {
    expect(arcsecPerPixel(0.4, 300)).toBeCloseTo(4.8, 3)
    expect(tileOrderFor(4.8, 9)).toBe(7)
    expect(tileOrderFor(13.5, 9)).toBe(5)
    expect(tileOrderFor(0.45, 9)).toBe(9)
    expect(tileOrderFor(0.45, 11)).toBe(10)
    expect(tileOrderFor(270, 9)).toBe(1)
    expect(tileOrderFor(1000, 9)).toBe(0)
    expect(tileOrderFor(4.8, 9, 1)).toBe(6)
    expect(tileOrderFor(13.5, 9, 2)).toBe(3)
  })
  it('kafelki dla M 27 (0,4°, 300 px, rząd 7) jak w niezależnym rzucie z astropy', () => {
    const l = layoutTan({ raDeg: 299.9016, decDeg: 22.721, fovDeg: 0.4, sizePx: 300, order: 7 }, SURVEYS.dss2)
    expect(l.tiles).toEqual([51927, 51932, 51933, 51935, 52104])
    expect(l.tileOfPixel.every((t) => t >= 0)).toBe(true)
  })
  it('pole 60° wokół Polaris: ciągłe, najwyżej 16 kafelków', () => {
    const order = tileOrderFor(arcsecPerPixel(60, 800), 9)
    const l = layoutTan({ raDeg: 37.95456, decDeg: 89.26411, fovDeg: 60, sizePx: 800, order }, SURVEYS.dss2)
    expect(order).toBe(1)
    expect(l.tileOfPixel.every((t) => t >= 0)).toBe(true)
    expect(l.tiles.length).toBeLessThanOrEqual(16)
  })
  it('PanSTARRS: piksele na południe od −30° poza pokryciem', () => {
    const l = layoutTan({ raDeg: 100, decDeg: -30, fovDeg: 2, sizePx: 200, order: 6 }, SURVEYS.ps1)
    expect(l.tileOfPixel[0 * 200 + 100]).toBeGreaterThanOrEqual(0) // górny wiersz, δ ≈ −29°
    expect(l.tileOfPixel[199 * 200 + 100]).toBe(-1) // dolny wiersz, δ ≈ −31°
  })
  it('malowanie: kanał R z kontrastem 1,15, paski w lukach, null bez kafelków', () => {
    const l = { sizePx: 16, order: 0, tiles: [5], tileOfPixel: new Int32Array(256).fill(5), colRow: new Uint32Array(256) }
    l.tileOfPixel[0] = -1
    l.tileOfPixel[8] = -1
    const tile = { data: new Uint8ClampedArray(512 * 512 * 4) }
    tile.data.set([200, 50, 10, 255], 0) // piksel (col 0, row 0) kafelka
    const red = paintTan(l, new Map([[5, tile]]), 'red')!
    expect([...red.slice(4, 8)]).toEqual([211, 211, 211, 255]) // round((200 − 128)·1,15 + 128) = round(210,8)
    expect([...red.slice(0, 4)]).toEqual([0x0b, 0x0d, 0x17, 255]) // (0,0): pasek --card
    expect([...red.slice(32, 36)]).toEqual([0x15, 0x19, 0x2b, 255]) // (8,0): pasek --border
    const color = paintTan(l, new Map([[5, tile]]), 'color')!
    expect([...color.slice(4, 8)]).toEqual([200, 50, 10, 255])
    expect(paintTan(l, new Map([[5, null]]), 'color')).toBeNull()
  })
})
```

- [ ] **Krok 2: Uruchom testy i upewnij się, że nie przechodzą**

Polecenie: `npx vitest run src/lib/hips.test.ts`
Oczekiwane: FAIL („Failed to resolve import ./hips”).

- [ ] **Krok 3: Zaimplementuj `src/lib/hips.ts`**

- `tileOrderFor` = `clamp(ceil(log2(211076 / (512 · a))) − coarser, 0, maxOrder)`. Stała 211076″ to bok piksela HEALPix przy nside = 1 (`√(π/3)` rad), więc piksel kafelka na rzędzie `k` ma `211076 / 2^(k+9)`″, np. 0,805″ przy k = 9.
- `layoutTan`, dla każdego piksela `(i, j)`:
  1. `gnomonicInverse(center, pixelToTangent(i + 0.5, j + 0.5, fov, W))`;
  2. jeśli `dec < survey.minDecDeg`, to `-1`;
  3. w przeciwnym razie `[face, ix, iy] = healpixFaceXY(order + 9, …)`, `npix = nestIndex(order, face, ix >> 9, iy >> 9)`.
- Orientacja kafelka: **kolumna obrazu = `iy & 511`, wiersz = `ix & 511`.** Ustalono 1.11.2026 porównaniem rzutu z kafelków ESA z SkyView DSS2 red w 5 polach (M 27, NGC 188 przy biegunie, NGC 253, NGC 7814 przy RA ≈ 0°, NGC 2070 przy δ −69°). Ten wariant dał korelację 0,81–0,98 i przesunięcie 0 px; pozostałe 7 wariantów najwyżej 0,45.
- `paintTan`:
  - najbliższy sąsiad;
  - `red`: `v = clamp(round((R − 128)·1.15 + 128))` do R, G i B;
  - luka: `((i + j) >> 3) & 1` ? `#15192B` (`--border`) : `#0B0D17` (`--card`);
  - alfa zawsze 255.

- [ ] **Krok 4: Uruchom testy i upewnij się, że przechodzą**

Polecenie: `npx vitest run src/lib/hips.test.ts`
Oczekiwane: PASS (6 testów).

- [ ] **Krok 5: Commit**

```bash
git add src/lib/hips.ts src/lib/hips.test.ts
git commit -m "Rzut TAN z kafelków HiPS: rząd, układ, malowanie"
```

---

### Zadanie 3: Test geometrii na prawdziwych kafelkach

**Pliki:**
- Zmień: `scripts/build-data.ts` (nowy etap `hips`, uruchamiany tylko jawnie)
- Test: `src/lib/hips.real.test.ts`
- Zmień: `CLAUDE.md` (lista etapów w opisie `npm run build:data`)

**Interfejsy:**
- Korzysta z: `layoutTan`, `paintTan`, `SURVEYS` (zadanie 2).

Zamiast pozycji pojedynczych gwiazd (projekt, punkt 7) test porównuje cały obraz z niezależnym rzutem SkyView: korelacja i przesunięcie 0 px. Przy pikselu 4,8″ to warunek co najmniej tak mocny jak gwiazdy ±1 px. Dane trafiają do ignorowanego przez git `scripts/.cache/hips/`, więc test bez nich jest pomijany.

- [ ] **Krok 1: Dodaj etap `hips` do `scripts/build-data.ts`**

Etap uruchamia się tylko przez `only === 'hips'` i nie wchodzi do pełnego przebiegu:
- tworzy `scripts/.cache/hips/`;
- pobiera przez `cachedBinary` kafelki `hips/dss2-7-{npix}.jpg` z `https://cdn.skies.esac.esa.int/DSSColor/Norder7/Dir{…}/Npix{npix}.jpg`;
- pobiera wzorce `hips/skyview-{nazwa}.jpg` z `https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=DSS2+Red&Position={ra},{dec}&Size=0.4&Pixels=300&Return=JPG&Scaling=Linear`;
- plik, który nie zaczyna się od `FF D8`, usuwa i pobiera ponownie, najwyżej 3 razy (SkyView zwraca czasem HTML).

| nazwa | RA | Dec | kafelki rzędu 7 |
|---|---|---|---|
| m27 | 299.9016 | 22.721 | 51927, 51932, 51933, 51935, 52104 |
| ngc188 | 12.11 | 85.255 | 16301, 16306, 16307, 16312, 16313 |
| ngc253 | 11.888 | -25.288 | 66615, 66621, 66658, 66664 |
| ngc7814 | 0.8125 | 16.145 | 78789, 78791, 78797, 78802, 78808 |
| ngc2070 | 84.676 | -69.101 | 132377, 132378, 132379, 132382 |

Uruchom: `node scripts/build-data.ts hips`
Oczekiwane: w `scripts/.cache/hips/` jest 23 kafelki i 5 wzorców.

- [ ] **Krok 2: Napisz test `src/lib/hips.real.test.ts`**

Test `describe.skipIf(!existsSync('scripts/.cache/hips'))('geometria na kafelkach DSS2', …)`, dla każdego pola z tabeli:
- `layoutTan` z `fovDeg 0.4`, `sizePx 300`, `order 7`; asercja: `layout.tiles` równe kolumnie „kafelki rzędu 7”;
- kafelki wczytane przez `sharp(path).ensureAlpha().raw().toBuffer()`;
- `paintTan(…, 'red')`;
- wzorzec wczytany przez `sharp(path).greyscale().raw().toBuffer()`;
- współczynnik korelacji Pearsona na wycinku `[5, 295)²` ≥ 0,75;
- najlepsze przesunięcie z siatki dx, dy ∈ [−3, 3] to `(0, 0)`.

- [ ] **Krok 3: Uruchom test**

Polecenie: `npx vitest run src/lib/hips.real.test.ts`
Oczekiwane: PASS (5 pól). Jeśli korelacja jest niska, a najlepsze jest inne przesunięcie albo inny wariant osi, błąd leży w `layoutTan`, a nie w progu.

- [ ] **Krok 4: Dopisz etap do `CLAUDE.md`**

W zdaniu „Pojedynczy etap: `node scripts/build-data.ts catalog|sky|outlines|milkyway`” dodaj `|hips` z dopiskiem: „(tylko dane testu geometrii kafelków, `scripts/.cache/hips`)”.

- [ ] **Krok 5: Commit**

```bash
git add scripts/build-data.ts src/lib/hips.real.test.ts CLAUDE.md
git commit -m "Test geometrii HiPS na prawdziwych kafelkach DSS2"
```

---

### Zadanie 4: Pobieranie kafelka z kolejnymi lustrami

**Pliki:**
- Utwórz: `src/lib/hipsTiles.ts`
- Test: `src/lib/hipsTiles.test.ts`

**Interfejsy:**
- Korzysta z: `Survey`, `tileUrl` (zadanie 2).
- Dostarcza:
  - `fetchTile(survey: Survey, order: number, npix: number): Promise<Blob>`
  - `TILE_TIMEOUT_MS = 3000`

Zasady:
- Cache Storage `tracker-hips-v1`, klucz `/hips/${survey.id}/${order}/${npix}`; bez `caches` (np. w Node) bez pamięci.
- Sukces to odpowiedź `ok`, `Content-Type` zaczynający się od `image/` i rozmiar ≥ 200 B.
- 404 oznacza, że trzeba zapytać kolejne lustro, ale bez degradacji.
- Przekroczenie limitu czasu, błąd sieci, 5xx albo nie-obraz: lustro spada na koniec kolejki tego przeglądu do końca sesji (stan w module), potem pytamy kolejne.
- Wszystkie zawiodły: odrzucenie z `Error('brak kafelka')`.
- Równoległe prośby o ten sam kafelek dzielą jedno pobranie.
- `fetchTile` celowo nie przyjmuje `AbortSignal`. Kafelek zawsze kończy się wynikiem albo limitem czasu i trafia do Cache Storage, więc przerwanie jednego obrazu nie psuje drugiego, który czeka na ten sam kafelek.

- [ ] **Krok 1: Napisz testy, które nie przechodzą**

Każdy test robi `vi.resetModules()` i `await import('./hipsTiles')`, żeby stan luster był świeży. Sztuczne zegary i `vi.stubGlobal('fetch', …)` działają jak w `src/lib/thumbs.test.ts`. Zawieszone lustro zwraca obietnicę odrzucaną dopiero przez `abort` sygnału. Obraz to `new Response(new Blob([new Uint8Array(500)]), { headers: { 'Content-Type': 'image/jpeg' } })`.

- `'gdy ESA wisi, kafelek przychodzi z MAST po 3 s'`:
  - ESA wisi, MAST odpowiada obrazem;
  - po `advanceTimersByTimeAsync(2999)` wynik jeszcze nie przyszedł, po kolejnych 2 ms tak;
  - adresy wywołań zaczynają się od luster DSS2 nr 1, potem nr 2.
- `'lustro, które zawiodło, idzie na koniec kolejki'`: w tym samym teście (stan modułu trwa do `resetModules`) najpierw scenariusz z wiszącym ESA, potem drugie `fetchTile` z innym `npix`. Drugie pyta najpierw MAST, a ESA na końcu.
- `'404 przechodzi do kolejnego lustra bez degradacji'`:
  - ESA odpowiada 404, MAST obrazem;
  - kolejne `fetchTile` znowu zaczyna od ESA.
- `'HTML albo puste ciało to porażka lustra'`:
  - ESA odpowiada 200 z `Content-Type: text/html`, MAST obrazem: wynik z MAST, ESA zdegradowane;
  - osobno ESA z obrazem o rozmiarze 50 B: to samo.
- `'wszystkie lustra zawodzą: odrzucenie'`: każde lustro odpowiada 500, więc `rejects.toThrow('brak kafelka')`, a `fetch` wywołano 5 razy.
- `'ten sam kafelek naraz: jedno pobranie'`: dwa równoległe `fetchTile(SURVEYS.dss2, 7, 1)`, więc `fetch` wywołano raz, a obie obietnice zwracają ten sam `Blob`.

- [ ] **Krok 2: Uruchom testy i upewnij się, że nie przechodzą**

Polecenie: `npx vitest run src/lib/hipsTiles.test.ts`
Oczekiwane: FAIL („Failed to resolve import ./hipsTiles”).

- [ ] **Krok 3: Zaimplementuj `fetchTile` w `src/lib/hipsTiles.ts`**

Limit czasu przez `AbortController` i `setTimeout` (nie `AbortSignal.timeout`, bo sztuczne zegary go nie obsługują). Licznik kasujemy w `finally`.

- [ ] **Krok 4: Uruchom testy i upewnij się, że przechodzą**

Polecenie: `npx vitest run src/lib/hipsTiles.test.ts`
Oczekiwane: PASS (6 testów).

- [ ] **Krok 5: Commit**

```bash
git add src/lib/hipsTiles.ts src/lib/hipsTiles.test.ts
git commit -m "Kafelki HiPS z kolejnych luster, z limitem czasu i Cache Storage"
```

---

### Zadanie 5: Worker i nowe `thumbs.ts`

**Pliki:**
- Utwórz: `src/workers/hips.worker.ts`
- Zmień: `src/lib/thumbs.ts` (cały mechanizm hips2fits i SkyView zastąpiony workerem)
- Test: `src/lib/thumbs.test.ts` (przepisany)

**Interfejsy:**
- Korzysta z:
  - `HipsRequest`, `HipsReply`, `SURVEYS`, `arcsecPerPixel`, `tileOrderFor`, `layoutTan`, `paintTan` (zadanie 2);
  - `fetchTile` (zadanie 4).
- Dostarcza (z `src/lib/thumbs.ts`):
  - `interface SkyImageOptions { survey?: SurveyId; mode?: ImageMode; coarser?: number }`; domyślnie `'dss2'`, `'red'`, `0`;
  - `getSkyImage(raDeg: number, decDeg: number, fovDeg: number, sizePx: number, signal?: AbortSignal, opts?: SkyImageOptions): Promise<string>`, czyli adres `blob:`;
  - `getThumb(o: DSO, signal?: AbortSignal): Promise<string>` = `getSkyImage(o.raDeg, o.decDeg, thumbFovDeg(o), 128, signal, { coarser: 1 })`;
  - `thumbFovDeg` bez zmian.

Worker na `HipsRequest`:
1. `order = tileOrderFor(arcsecPerPixel(fovDeg, sizePx), survey.maxOrder, coarser)`;
2. `layoutTan`;
3. dla każdego kafelka `fetchTile`, potem `createImageBitmap` i `OffscreenCanvas(512, 512)` z `getImageData`; błąd dekodowania albo pobrania daje `null`;
4. `paintTan`; jeśli `null`, odpowiedź `{ id, error: 'brak kafelków' }`;
5. `OffscreenCanvas(W, W)`, `putImageData`, `convertToBlob({ type: 'image/jpeg', quality: 0.9 })`, odpowiedź `{ id, blob }`.

`thumbs.ts`:
- zostają: kolejka LIFO z `MAX_PARALLEL = 5`, odrzucanie przerwanych zadań w `pump`, pamięć obietnic i ponowienie po obcym przerwaniu (komentarz o StrictMode zostaje), Cache Storage gotowych obrazów;
- Cache Storage zmienia nazwę na `tracker-thumbs-v2`, a przy pierwszym otwarciu robimy `caches.delete('tracker-thumbs-v1')`;
- klucz: `/thumb/${survey}/${mode}/${coarser}/${ra.toFixed(4)}/${dec.toFixed(4)}/${fov}/${size}`;
- worker to leniwy singleton `new Worker(new URL('../workers/hips.worker.ts', import.meta.url), { type: 'module' })`, a odpowiedzi rozdziela się po `id`;
- zadanie przerwane w trakcie: odpowiedź workera jest ignorowana, zadanie kończy się `AbortError`;
- usuwamy `hips2fitsUrl`, `SERVERS`, `TIMEOUT_MS`, adres SkyView i limit 8 s, bo obsługuje to teraz `fetchTile`.

- [ ] **Krok 1: Przepisz `src/lib/thumbs.test.ts`**

Usuń test „po limicie czasu przechodzi do SkyView” (to zachowanie znika). Sztuczny worker:
- `class FakeWorker`, zapamiętuje `postMessage(msg)` w statycznej tablicy `posted`;
- w `queueMicrotask` odpowiada przez `onmessage({ data: reply(msg) })`;
- `reply` ustawia test, domyślnie `{ id, blob: new Blob([new Uint8Array(500)]) }`.

Rejestracja przez `vi.stubGlobal('Worker', FakeWorker)`. Każdy test robi `vi.resetModules()` i `await import('./thumbs')`.

- `'drugi odbiorca dostaje obraz, gdy pierwszy przerwał wspólne zapytanie (podwójny efekt w StrictMode)'`: jak dziś; `a` odrzucone, `b` zwraca `/^blob:/`.
- `'domyślnie DSS2 czarno-białe; getThumb prosi o 128 px i rząd grubszy o 1'`: `posted[0]` zawiera `{ survey: 'dss2', mode: 'red', coarser: 0, sizePx: 800 }` dla `getSkyImage(…, 800)`, a `getThumb({ raDeg: 1, decDeg: 2, majArcmin: 10 } as DSO)` daje `{ sizePx: 128, coarser: 1, fovDeg: 0.283 }`.
- `'błąd workera odrzuca obietnicę'`: `reply` zwraca `{ id, error: 'brak kafelków' }`, więc `rejects.toThrow('brak kafelków')`.

- [ ] **Krok 2: Uruchom testy i upewnij się, że nie przechodzą**

Polecenie: `npx vitest run src/lib/thumbs.test.ts`
Oczekiwane: FAIL (posted jest puste, bo kod woła jeszcze `fetch` do hips2fits).

- [ ] **Krok 3: Zaimplementuj `src/workers/hips.worker.ts` i nowe `src/lib/thumbs.ts`**

- [ ] **Krok 4: Uruchom testy, typecheck i build**

Polecenia: `npm test`, `npm run typecheck`, `npm run build`
Oczekiwane:
- wszystkie testy PASS (`hips.real` PASS albo pominięty bez danych);
- typecheck bez błędów;
- w wyniku `vite build` worker jest osobnym plikiem `hips.worker-*.js`;
- plik wejściowy `index-*.js` ma < 200 KB gzip.

- [ ] **Krok 5: Commit**

```bash
git add src/workers/hips.worker.ts src/lib/thumbs.ts src/lib/thumbs.test.ts
git commit -m "Obrazy nieba składane w workerze z kafelków HiPS zamiast hips2fits"
```

---

### Zadanie 6: Kadrowanie z warstwami i podglądem, podpisy źródeł

**Pliki:**
- Zmień: `src/components/FramingPanel.tsx`
- Zmień: `src/components/ObjectDetails.tsx:157`

**Interfejsy:**
- Korzysta z: `getSkyImage`, `SkyImageOptions` (zadanie 5); `SURVEYS` (zadanie 2).

- [ ] **Krok 1: Warstwy w `FramingPanel`**
  - `layer: 'red' | 'color' | 'ps1'`; opcje:
    - `red` → `{ survey: 'dss2', mode: 'red' }`;
    - `color` → `{ survey: 'dss2', mode: 'color' }`;
    - `ps1` → `{ survey: 'ps1', mode: 'color' }`.
  - Trzeci przycisk `toggle-chip` „PanSTARRS”, wyłączony (`disabled`), gdy `imageDec < SURVEYS.ps1.minDecDeg`, z `title` „PanSTARRS obejmuje niebo na północ od −30°”. Jeśli wybrano `ps1`, a obiekt leży na południe od −30°, warstwa przełącza się na `color`.
  - Z `<img>` znika filtr CSS `grayscale(1) contrast(1.15)`, bo kontrast robi renderer.

- [ ] **Krok 2: Podgląd, potem ostry obraz**
  - Efekt pobierania prosi najpierw o `{ ...opts, coarser: 2 }`, a o ostry obraz (`coarser: 0`) dopiero, gdy podgląd się skończy (sukcesem albo błędem), z tym samym `AbortController`.
  - Stan `img` dostaje pole `sharp: boolean`. Podgląd nie nadpisuje ostrego obrazu o tym samym kluczu. Ostry zawsze zastępuje podgląd.
  - Błąd pokazujemy tylko wtedy, gdy zawiodły oba, z tekstem: `Nie udało się złożyć zdjęcia z kafelków HiPS`. Dotyczy to także `onError` na `<img>`.

- [ ] **Krok 3: Podpisy**
  - W kadrze: `pole zdjęcia {fov}° · {SURVEYS[s].label}{s === 'dss2' ? (layer === 'red' ? ' czerwony' : ' kolor') : ''} · {SURVEYS[s].credit}`, a dopóki widać podgląd, z dopiskiem ` · podgląd`.
  - W `ObjectDetails.tsx` fragment „zdjęcia: AstroBin API użytkownika Konuz lub DSS2 przez CDS hips2fits.” zamienić na: „zdjęcia: AstroBin API użytkownika Konuz lub kafelki HiPS (ESA ESASky, MAST/STScI): Digitized Sky Survey (STScI/NASA; Palomar Observatory/Caltech, UK Schmidt Telescope/AAO) i Pan-STARRS1 (PS1 Surveys).”

- [ ] **Krok 4: Sprawdź w aplikacji (Playwright, nie panel przeglądarki)**

Serwer: `preview_start` z konfiguracją `dev`, a potem Playwright na podany port. Oczekiwane:
- kadr M 27 pokazuje najpierw „· podgląd”, potem ostry obraz;
- w warstwie „Czarno-biała” obraz jest szary, a w „Kolor” kolorowy;
- dla obiektu na południe od −30° (np. NGC 2070, δ −69°) przycisk „PanSTARRS” jest wyłączony;
- szybkie przełączenie trzech obiektów w kadrze kończy się obrazem i podpisem ostatniego (punkt 3 „Na co uważać”).

- [ ] **Krok 5: Uruchom testy i typecheck, potem commit**

Polecenia: `npm test`, `npm run typecheck` (PASS).

```bash
git add src/components/FramingPanel.tsx src/components/ObjectDetails.tsx
git commit -m "Kadrowanie: warstwy DSS2 i PanSTARRS, podgląd, podpisy źródeł"
```

---

### Zadanie 7: Pomiar kryteriów odbioru i dokumentacja

**Pliki:**
- Zmień: `docs/wymagania.md:34`
- Zmień: `CLAUDE.md`:
  - opis `src/lib/` (zamiast `thumbs.ts` „(kolejka hips2fits + Cache Storage)”);
  - lista workerów.

- [ ] **Krok 1: Pomiar na łączu użytkownika**

Playwright, pusta pamięć podręczna (nowy kontekst, `caches` puste). Oczekiwane:
- ostry kadr M 27 ≤ 3 s od kliknięcia „Kadruj”;
- po przeładowaniu ten sam kadr ≤ 0,5 s;
- przy przeciąganiu prostokąta kadru brak długich zadań > 50 ms (`PerformanceObserver` typu `longtask`).

- [ ] **Krok 2: Pomiar na wolnym łączu**

`page.context().newCDPSession(page)` i `Network.emulateNetworkConditions({ offline: false, latency: 150, downloadThroughput: 250000, uploadThroughput: 93750 })`. Oczekiwane, przy pustej pamięci podręcznej:
- podgląd kadru ≤ 3 s;
- 12 widocznych miniatur katalogu ≤ 3 s.

- [ ] **Krok 3: Awaria pierwszego lustra**

`page.route('https://cdn.skies.esac.esa.int/**', (r) => r.abort())`. Oczekiwane: ostry kadr najwyżej 3 s później niż w kroku 1.

- [ ] **Krok 4: Dokumentacja**
  - `docs/wymagania.md:34`: „Miniatury i kadr: kafelki HiPS DSS2 i PanSTARRS z luster ESA, MAST, CASDA i CDS, składane w workerze (`hips.worker.ts`); wcześniej hips2fits (CDS), który 31.10–1.11.2026 nie odpowiadał.” Dopisz zmierzone czasy z kroków 1–3.
  - `CLAUDE.md`:
    - `thumbs.ts` (kolejka obrazów + Cache Storage), `healpix.ts`, `hips.ts` (przeglądy, lustra, rzut TAN z kafelków), `hipsTiles.ts` (lustra, limit czasu, Cache Storage);
    - w `src/workers/` dopisz `hips.worker.ts`: składanie obrazów z kafelków.

- [ ] **Krok 5: Commit**

```bash
git add docs/wymagania.md CLAUDE.md
git commit -m "Dokumentacja obrazów HiPS i pomiary"
```
