# Odległości obszarów H II: plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Cel:** obszary H II (EN, CN) dostają odległość z Foster & Brunt 2015, katalogu WISE (Anderson i in. 2014) albo
z prędkości radialnej. Wszystkie obiekty z σ ≤ 50 % trafiają do 3D.

**Architektura:**
- Czysta logika w `scripts/kinematicDistance.ts` (krzywa rotacji Reid 2019 A5, Monte Carlo).
- Czysta logika w `scripts/hiiDistances.ts` (parsery VizieR, dopasowanie, wybór prędkości, kolejność kroków H II).
- `scripts/build-data.ts` pobiera tabele przez istniejące `vizier()` i wpina krok H II do `planDistances`.
- Próg w `src/lib/distance.ts`.

**Stos:** TypeScript 6 strict, Node (uruchamia `.ts` bez bundlera), Vitest. Bez nowych zależności.

**Projekt:** `docs/superpowers/specs/2026-11-14-odleglosci-h-ii-design.md`

## Ograniczenia globalne
- `MAX_RELATIVE_UNCERTAINTY = 0.5` dla wszystkich obiektów (decyzja użytkownika 14.11.2026).
- Model Reid i in. 2019, A5:
  - R₀ = 8,15 ± 0,15 kpc;
  - U⊙ = 10,6 ± 1,2, V⊙ = 10,7 ± 6,0, W⊙ = 7,6 ± 0,7 km/s;
  - Ūs = 6,0 ± 1,4, V̄s = −4,3 ± 5,6 km/s;
  - a₂ = 0,96 ± 0,05, a₃ = 1,62 ± 0,02;
  - korelacja V⊙ z V̄s: −0,99.
- LSR według definicji IAU: U = 10,27, V = 15,32, W = 7,74 km/s.
- σ prędkości: 5 km/s.
- Monte Carlo: 2000 próbek, PRNG ze stałym ziarnem z oznaczenia obiektu. Wynik: mediana, σ = (p84 − p16)/2.
  Powyżej połowy próbek bez rozwiązania wynik to null.
- Tracery prędkości: linie rekombinacyjne → molekularne → Hα, bez HI. Rozbieżność innego tracera od głównego
  > 10 km/s daje brak wartości kinematycznej.
- Kolejność dla EN i CN po dotychczasowych krokach (Sh2-101, Hunt & Reffert):
  1. WISE z `Meth` = Parallax,
  2. Foster & Brunt,
  3. WISE pozostałe,
  4. własna kinematyka.
  Krok z σ > 50 % przechodzi do następnego. Na końcu `withWikidataFallback`.
- Własna kinematyka: `verified: false`, zakres `object`. WISE i Foster & Brunt: `verified: true`, zakres `object`.
- Nowe wpisy tabeli `sources` dopisywane po dotychczasowych (mechanizm z `buildCatalog`, linie 217–220).
- Kod: bez średników, pojedyncze cudzysłowy, komentarze po polsku. Kodu pakietu `kd` (GPL-3) nie kopiujemy.
- Bez commitów (użytkownik decyduje o commicie).

## Na co zwrócić uwagę w przeglądzie
1. **Antycentrum** (|l − 180°| < 15°, np. Sh2-252 przy +7,4 km/s): wynik ma σ > 50 % albo null, nigdy pewna
   wartość. Test w zadaniu 2.
2. **Prędkość dodatnia w II ćwiartce** (zabroniona przy rotacji): null, nie odległość z wartości bezwzględnej.
   Test w zadaniu 2.
3. **Prędkość poza punktem stycznym** w wewnętrznej Galaktyce: odległość punktu stycznego, nie null. Test w zadaniu 2.
4. **`HIIName` z kilkoma nazwami** („G189.971+00.395; S252”) i **`HaName` z „=”** („M8=S25”): dopasowanie
   działa po rozbiciu. Test w zadaniu 3.
5. **Wiersz WISE z `Dist` bez `e_Dist`:** σ = null; wartość trafia do 3D tak jak dziś (`hasDistance`). Test w zadaniu 3.

---

### Task 1: Próg 50 %

**Pliki:**
- Zmiana: `src/lib/distance.ts:31-38` (stała, komentarz `hasDistance`), `:22-24` (opis pola `verified`: „false:
  wartość niesprawdzona lub pośrednia (Wikidata, odległość kinematyczna)”), `:198` (komentarz regresora „ponad 50 %”).
- Zmiana: `src/lib/photo.ts:97` (komentarz „σ ≤ 50 %”).
- Zmiana: `scripts/catalogDistances.ts:247-248` (komentarz „σ > 50 %”).
- Zmiana: `scripts/build-data.ts:286,334` (licznik „Wikidata zamiast σ > 50 %”).
- Testy: `src/lib/photo.test.ts:131-137`, `src/lib/distance.test.ts:105`, `src/lib/catalogDistances.test.ts:77-86`.

**Interfejsy:** `MAX_RELATIVE_UNCERTAINTY` i `hasDistance` bez zmian sygnatur.

- [ ] **Krok 1: Zmień testy na nowy próg**
  - `photo.test.ts`: nazwa „(σ ≤ 50 %)”; cięcia `cut('c', 1000, 500)` i `cut('d', 1000, 501)`; oczekiwane `['a', 'c']`.
  - `distance.test.ts:105`: wynik CF4 z σ 26,5 % (55,08e6, 42,36e6–71,61e6) zwraca wartość:
    `expect(regressorDistance({...}, 0, 0)?.distLy).toBeCloseTo(55.08e6 * 3.26156, -4)`.
    Dodać przypadek z σ > 50 % (np. `distance_pc: 1000, lo_pc: 400, hi_pc: 1500`), który zwraca null.
  - `catalogDistances.test.ts` (test „Wikidata zastępuje…”):
    - NGC 5169 (σ ≈ 26 %) teraz zostaje: `expect(withWikidataFallback(ngc5169, 156554880)).toBe(ngc5169)`.
    - Nowy przypadek σ > 50 %: `cf4Choice({... eDm: 1.2 ...})` z Wikidata daje Wikidata.
    - Nazwa testu: „σ > 50 %”.
- [ ] **Krok 2:** `npx vitest run src/lib/photo.test.ts src/lib/distance.test.ts src/lib/catalogDistances.test.ts`.
  Oczekiwane: FAIL w zmienionych asercjach.
- [ ] **Krok 3:** Zmień `MAX_RELATIVE_UNCERTAINTY` na `0.5` i komentarze wymienione wyżej.
  Sprawdź `grep -rn "20 %" src scripts server`: zostają tylko niezwiązane miejsca (Zucker „> 20 % mediany”).
- [ ] **Krok 4:** ta sama komenda; oczekiwane: PASS. `src/lib/distancePilot.test.ts` może już nie przechodzić.
  Poprawia go zadanie 4 po przebudowie katalogu, bo test czyta `public/data/catalog.json`.

### Task 2: Odległość kinematyczna

**Pliki:**
- Nowy: `scripts/kinematicDistance.ts`
- Test: `src/lib/kinematicDistance.test.ts`

**Interfejsy (produkuje):**
```ts
export interface RotationModel { R0: number; Usun: number; Vsun: number; Wsun: number; Us: number; Vs: number; a2: number; a3: number }
export const REID19_A5: RotationModel          // wartości nominalne z ograniczeń globalnych
export function circularSpeed(rKpc: number, m: RotationModel): number                     // km/s, krzywa uniwersalna Persic 1996
export function modelVlsr(lDeg: number, bDeg: number, dKpc: number, m: RotationModel): number  // km/s, LSR IAU
export function solveKinematic(lDeg: number, bDeg: number, vlsr: number, m: RotationModel): { near: number; far: number | null } | null
export type Kda = 'N' | 'F' | 'T' | null
export function kinematicDistance(o: { seed: string; lDeg: number; bDeg: number; vlsr: number; kda: Kda }, samples?: number): { kpc: number; sigmaKpc: number } | null
```

Model fizyczny (zweryfikowany prototypem 14.11):
- Układ heliocentryczny: X do centrum (l = 0°), Y w kierunku l = 90°.
- Pozycja względem centrum: p = (X − R₀, Y).
- Kierunek rotacji: (p_y, −p_x)/R; kierunek do centrum: −p/R.
- Prędkość obszaru: (Θ(R) + V̄s) w kierunku rotacji plus Ūs w kierunku centrum.
- Prędkość Słońca: (U⊙, Θ(R₀) + V⊙, W⊙).
- Rzut różnicy na linię widzenia daje v_hel; v_LSR = v_hel + (10,27 cos l + 15,32 sin l) cos b + 7,74 sin b.

`solveKinematic`:
- Gdy cos l > 0 (wewnętrzna Galaktyka):
  - punkt styczny d_t = R₀ cos l / cos b;
  - prędkość poza styczną daje `{ near: d_t, far: d_t }`;
  - w przeciwnym razie bisekcja (≥ 40 kroków) na [0,001; d_t] i [d_t; 25].
- W zewnętrznej Galaktyce: bisekcja na [0,001; 25], `far: null`.
- Brak zmiany znaku daje null.

`kinematicDistance`:
- Próbki: parametry z rozkładów normalnych, V⊙ i V̄s z korelacją −0,99, prędkość N(v, 5).
- Wybór rozwiązania: `kda === 'F'` → far, inaczej near (także `'T'`, wtedy near = far).

- [ ] **Krok 1: Testy (wartości z prototypu i Russeil 2003, tabela 3)**
```ts
it('bliska odległość w I ćwiartce zgodna z Russeil 2003 (≤ 7 %)', () => {
  expect(solveKinematic(10.4, 0, 63, REID19_A5)!.near).toBeCloseTo(5.5, 0)        // Russeil 5,5; model 5,52
  expect(Math.abs(solveKinematic(13.2, 0, 52, REID19_A5)!.near / 4.5 - 1)).toBeLessThan(0.07)
})
it('daleka odległość w I ćwiartce zgodna z Russeil 2003 (≤ 7 %)', () => {
  expect(Math.abs(solveKinematic(30.6, 0, 48, REID19_A5)!.far! / 11.4 - 1)).toBeLessThan(0.07)
})
it('II ćwiartka: jedno rozwiązanie, model A5 (Sh2-180 według prędkości z Russeil)', () => {
  const s = solveKinematic(122.6, 0.1, -42.3, REID19_A5)!
  expect(s.far).toBeNull()
  expect(s.near).toBeCloseTo(2.89, 1)   // płaska krzywa Russeil: 3,8 kpc; A5 z ruchami własnymi daje mniej
})
it('obieg: v(d) i rozwiązanie z powrotem', () => {
  for (const [l, d] of [[40, 3], [40, 12], [140, 4], [250, 2]]) {
    const s = solveKinematic(l, 0, modelVlsr(l, 0, d, REID19_A5), REID19_A5)!
    expect(Math.min(Math.abs(s.near - d), Math.abs((s.far ?? s.near) - d))).toBeLessThan(0.01)
  }
})
it('prędkość dodatnia w II ćwiartce nie ma rozwiązania', () => {
  expect(solveKinematic(120, 0, 30, REID19_A5)).toBeNull()
})
it('prędkość poza punktem stycznym daje punkt styczny', () => {
  const s = solveKinematic(30, 0, 200, REID19_A5)!
  expect(s.near).toBeCloseTo(8.15 * Math.cos(30 * Math.PI / 180), 2)
  expect(s.far).toBe(s.near)
})
it('Monte Carlo: Sh2-181 ok. 2,5 kpc z σ < 50 %, antycentrum niepewne, wynik powtarzalny', () => {
  const sh181 = kinematicDistance({ seed: 'Sh2-181', lDeg: 122.92, bDeg: 2.39, vlsr: -38.8, kda: null })!
  expect(sh181.kpc).toBeGreaterThan(2.2); expect(sh181.kpc).toBeLessThan(2.8)
  expect(sh181.sigmaKpc / sh181.kpc).toBeLessThan(0.5)
  expect(kinematicDistance({ seed: 'Sh2-181', lDeg: 122.92, bDeg: 2.39, vlsr: -38.8, kda: null })).toEqual(sh181)
  const anti = kinematicDistance({ seed: 'Sh2-252', lDeg: 190.0, bDeg: 0.5, vlsr: 7.4, kda: null })
  expect(anti === null || anti.sigmaKpc / anti.kpc > 0.5).toBe(true)
})
it('Monte Carlo: KDA F wybiera daleką odległość', () => {
  const far = kinematicDistance({ seed: 'x', lDeg: 30.6, bDeg: 0, vlsr: 48, kda: 'F' })!
  expect(far.kpc).toBeGreaterThan(9)
})
```
- [ ] **Krok 2:** `npx vitest run src/lib/kinematicDistance.test.ts`. Oczekiwane: FAIL (brak modułu).
- [ ] **Krok 3:** Zaimplementuj interfejsy w `scripts/kinematicDistance.ts`:
  - bez importów wartości;
  - PRNG mulberry32 z ziarnem z hasza FNV-1a oznaczenia;
  - normalne z Boxa–Mullera.
- [ ] **Krok 4:** Test PASS. Zmierz czas jednego `kinematicDistance` (powinien wynosić ≤ 30 ms). Jeśli jest
  wolniej, najpierw przyspiesz bisekcję, a dopiero potem zmniejszaj liczbę próbek do 1000 (zapisz w komentarzu).

### Task 3: Źródła H II i kolejność kroków

**Pliki:**
- Nowy: `scripts/hiiDistances.ts`
- Test: `src/lib/hiiDistances.test.ts` (krótkie fragmenty TSV w formacie asu-tsv jak w `catalogDistances.test.ts`)

**Interfejsy:**
- Pobiera: `parseVizierTsv`, `separationDeg`, `Choice`, `Entry` z `scripts/catalogDistances.ts`;
  `kinematicDistance`, `Kda` z zadania 2; `galactic` z `src/lib/astro.ts`; `hasDistance` z `src/lib/distance.ts`.
- Produkuje:
```ts
export interface FbRegion { name: string; kpc: number | null; sigmaKpc: number | null; vCO: number | null }
export function parseFosterBrunt(text: string): Map<string, FbRegion>            // klucz: 'Sh2-155' (kolumna HII)
export interface WiseRegion { names: string[]; raDeg: number; decDeg: number; radiusDeg: number; vRrl: number | null; vMol: number | null; kda: Kda; kpc: number | null; sigmaKpc: number | null; method: string }
export function parseWise(text: string): WiseRegion[]                              // names: HIIName rozbite po /[;,]/
export interface RusseilVelocities { ha: number | null; rrl: number | null; co: number | null }
export function parseRusseil(text: string): Map<string, RusseilVelocities>        // klucz 'S25' z HaName rozbitego po '='; CO lub H2CO
export function sharplessKey(designation: string): string | null                  // 'Sh2-25' → 'S25'
export function findWise(e: Entry, designations: string[], regions: WiseRegion[]): WiseRegion | null
export function pickVelocity(v: { rrl: number[]; mol: number[]; ha: number[] }): { vlsr: number; tracer: 'rrl' | 'mol' | 'ha' } | null
export interface HiiSources { fb: Map<string, FbRegion>; wise: WiseRegion[]; russeil: Map<string, RusseilVelocities> }
export function hiiChoice(e: Entry, designations: string[], src: HiiSources): { key: string; choice: Choice } | null
```
- Klucze `key`: `'WISE paralaksa' | 'Foster & Brunt' | 'WISE' | 'kinematyczna'`.

Szczegóły:
- `findWise`: najpierw `HIIName` zawiera `sharplessKey` któregoś oznaczenia. Potem najbliższy region, którego
  środek leży w `min(max(radiusDeg, majArcmin/120), 0.25)`.
- Prędkości dla `pickVelocity`:
  - rrl = [WISE `Vi1`, Russeil RR];
  - mol = [WISE `Vm1`, Russeil CO, Foster & Brunt vCO];
  - ha = [Russeil Hα];
  - pomijamy null.
  - Główna = pierwsza wartość pierwszej niepustej grupy. Każda inna wartość różna o > 10 km/s daje null.
- Opisy źródeł:
  - WISE: metoda `odległość: ${method} (katalog H II WISE)`, źródło „Anderson i in. 2014, ApJS 212, 1”,
    ref `2014ApJS..212....1A`.
  - Foster & Brunt: jak dzisiejszy wpis Sh2-155 w `build-data.ts:311-315`.
  - Kinematyka: metoda `odległość kinematyczna: v_LSR z ${tracer} (${katalog prędkości}), krzywa rotacji Reid i in. 2019 (A5), Monte Carlo`,
    źródło „Reid i in. 2019, ApJ 885, 131”, ref `2019ApJ...885..131R`, `verified: false`.
    Tracer po polsku: „linii rekombinacyjnych”, „CO”, „Hα”.
- `hiiChoice` działa tylko dla `e.type` EN i CN. Zwraca pierwszy krok, którego wynik spełnia `hasDistance`.
  Gdy żaden nie spełnia, zwraca pierwszy znaleziony (σ > 50 %), żeby `withWikidataFallback` mógł wybrać Wikidata
  i zachował się jak dziś.

- [ ] **Krok 1: Testy**
  - `parseFosterBrunt` na wierszu Sh2-155 (0.84, 0.04, vCO −8.88) daje `{ kpc: 0.84, sigmaKpc: 0.04, vCO: -8.88 }`.
  - `parseWise` na wierszu z `HIIName` „G189.971+00.395; S252”: `names` zawiera 'S252'. Pusty `e_Dist` daje `sigmaKpc: null`.
  - `parseRusseil`: „M8=S25” daje klucz 'S25'.
  - `pickVelocity({ rrl: [-62.6], mol: [-10.3], ha: [] })` daje null.
  - `pickVelocity({ rrl: [], mol: [-36.6], ha: [-38.8] })` daje `{ vlsr: -36.6, tracer: 'mol' }`.
  - Kolejność:
    - wpis z WISE Parallax i Foster & Brunt daje 'WISE paralaksa';
    - sam Foster & Brunt daje 'Foster & Brunt' (Sh2-155: ly ≈ 0.84 × 3261.56);
    - Foster & Brunt z σ > 50 % i WISE Kin daje 'WISE';
    - tylko prędkość Russeil daje 'kinematyczna' z `source.verified === false`;
    - typ RN daje null.
- [ ] **Krok 2:** `npx vitest run src/lib/hiiDistances.test.ts`. Oczekiwane: FAIL.
- [ ] **Krok 3:** Zaimplementuj interfejsy.
- [ ] **Krok 4:** Test PASS.

### Task 4: Wpięcie w budowę, przebudowa i dokumentacja

**Pliki:**
- Zmiana: `scripts/build-data.ts`:
  - `planDistances`: pobranie trzech tabel przez `vizier()`;
  - usunąć wyjątek Sh2-155 (`:310-316`);
  - wywołać `hiiChoice` po `findHr23` i przed CF4;
  - liczniki;
  - lista ref w `:218` uzupełniona o `2014ApJS..212....1A` i `2019ApJ...885..131R`.
- Zmiana: `src/lib/distancePilot.test.ts`, `docs/odleglosci/stan.md`, `CLAUDE.md` (lista źródeł łańcucha w opisie
  `npm run build:data`).

**Interfejsy:** pobiera `parseFosterBrunt`, `parseWise`, `parseRusseil`, `hiiChoice` z zadania 3.

Zapytania VizieR (nazwy plików bufora):
- `vizier('fb15-table2', '-source=J/AJ/150/147/table2&-out.all')`
- `vizier('wise14-hii', '-source=J/ApJS/212/1/wisecat&-out.all')`
- `vizier('russeil03-v', '-source=J/A%2BA/397/133/table1&-out.all')`

- [ ] **Krok 1:** Wpięcie, potem `npm run typecheck`. Oczekiwane: bez błędów.
- [ ] **Krok 2:** `node scripts/build-data.ts catalog`. Log ma pokazać liczniki:
  - 'WISE paralaksa', 'Foster & Brunt', 'WISE', 'kinematyczna';
  - 'Wikidata zamiast σ > 50 %'.
  Zapisz liczby i czas etapu.
- [ ] **Krok 3:** Wartości kontrolne w nowym `catalog.json` (skrypt w scratchpadzie). Oczekiwane:
  - Sh2-180 ≈ 17 645 lś (Foster & Brunt);
  - Sh2-183 ≈ 21 530 lś (WISE 6,6);
  - Sh2-187 ≈ 5153 lś (Foster & Brunt, σ 20,3 %);
  - Sh2-252 ≈ 7273 lś (Foster & Brunt);
  - Sh2-155 ≈ 2740 lś;
  - Sh2-181: wartość kinematyczna, zapisać i porównać z regresorem (2,2 kpc);
  - SNR G127.1+00.5 nadal poza 3D (σ 52 %).
- [ ] **Krok 4:** `src/lib/distancePilot.test.ts`:
  - asercja „W 3D” liczona progiem 50 % z `o.pilot.sigmaPct` (null = brak σ, jak w `hasDistance`);
  - nowe liczby w teście pokrycia;
  - każda nowa różnica z notatką `note`.
  Potem `npm test`; oczekiwane: wszystkie PASS.
- [ ] **Krok 5:** `docs/odleglosci/stan.md`:
  - sekcja z datą 14.11.2026: próg 50 %, nowe źródła, liczniki;
  - uwaga o ruchach strumieniowych (W3(OH): 3,1 kpc kinematycznie wobec 1,95 kpc z paralaksy);
  - Sh2-181: wartość kinematyczna i wynik regresora.
  W `CLAUDE.md` uzupełnij łańcuch źródeł.
- [ ] **Krok 6:** `npm run build`. Oczekiwane: sukces, startowy JS bez zmian (< 200 KB gzip).
  Potem `git status` (bez pustych plików w korzeniu).
