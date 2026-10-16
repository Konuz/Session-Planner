# Astrophotography Planner — specyfikacja dla agenta budującego (wersja 2)

Zbuduj kompletną, działającą aplikację webową PWA do planowania sesji astrofotograficznych: wyboru celów na wybraną noc (także słabych obiektów z katalogów VdB, Sh2, LDN, LBN, Barnard i SNR), kadrowania z podglądem nieba, symulacji widoczności nad własnym horyzontem oraz eksportu kadru do N.I.N.A.

**Jak czytać ten dokument**
- `[Z…]` oznacza założenie przyjęte domyślnie. Wszystkie są zebrane w sekcji 0; zmiana założenia nie wymaga przepisywania reszty tekstu.
- `[T…]` to wektor testowy z załącznika A. Testy są częścią wymagań, a nie dodatkiem.
- Załącznik B zawiera wbudowany katalog teleskopów i kamer.

**Sposób pracy agenta**
- Buduj etapami z sekcji 12. Etap jest skończony dopiero wtedy, gdy przechodzą testy, kontrola typów, linter i budowanie.
- Nie zostawiaj zaślepek ani komentarzy typu `TODO`.
- Jeśli wymagania są sprzeczne albo czegoś nie da się zrobić zgodnie z opisem, zatrzymaj się i zapytaj, zamiast zgadywać.

---

## 0. Założenia do potwierdzenia

| ID | Założenie | Co zmienić, jeśli nie pasuje |
|---|---|---|
| Z1 | Rozstrzygnięte 16.10.2026: eksport do ASIAIR jest wykluczony; aplikacja eksportuje CSV dla N.I.N.A. i JSON | — |
| Z2 | Rozstrzygnięte 16.10.2026: profil aktywny domyślnie: Newton 150/600 (f/4), korektor 1,0×, montaż paralaktyczny niemiecki (GEM) | Wpisz rzeczywistą ogniskową i współczynnik korektora |
| Z3 | Dane startowe to pełne katalogi pobrane skryptem plus lista „Klasyki” (zamiast „min. 40 obiektów z każdego katalogu”) | Ogranicz skrypt do wybranych obiektów |
| Z4 | Interfejs po polsku; formaty pl-PL (zegar 24 h, przecinek dziesiętny) | Zmień język i formaty |
| Z5 | Lokalizacja domyślna: „Polska centralna (demo)”, 52,0°N, 19,0°E, 150 m n.p.m., strefa `Europe/Warsaw` | Wpisz własne miejsce |
| Z6 | Próg ciemności −18°; gdy w nocy nie ma takiego okna, automatyczne obniżenie do −15°, potem do −12° | Zmień próg albo wyłącz obniżanie |
| Z7 | Minimalna wysokość h_min = 30°; „widoczny” = łącznie co najmniej 3 h czasu efektywnego (nie musi być ciągiem) | Zmień progi lub wymagaj ciągłości |
| Z8 | Krok próbkowania: 5 min dla całego katalogu, 1 min dla widoku jednego obiektu | Zmień krok |
| Z9 | Seeing do oceny próbkowania: 2,5″ | Zmień wartość |
| Z10 | Przerzut przez południk (meridian flip): 10 min po górowaniu | Wpisz wartość z ustawień N.I.N.A. |
| Z11 | Kadrowanie: ramka stała w środku widoku, przesuwa się niebo (zamiast przeciągania ramki) | Wróć do przeciągania ramki |
| Z12 | Progi rekomendacji filtrów z sekcji 7A są heurystyką do kalibracji w praktyce | Zmień progi w ustawieniach |
| Z13 | Horyzont demonstracyjny z sekcji 6.4 | Podmień na własny plik |
| Z14 | Nawigacja: 5 zakładek (sekcja 9) | Zmień układ |
| Z15 | Kolory mgławic planetarnych (turkus) i gromad (żółty), których nie było w pierwotnym prompcie | Zmień kolory |
| Z16 | Biblioteki pomocnicze: Zustand, Dexie, d3-scale, date-fns-tz, @tanstack/react-virtual, vite-plugin-pwa, Vitest | Podmień na inne |
| Z17 | Widok sfery: rzut azymutalny równoodległościowy | Zmień na stereograficzny |
| Z18 | Kolejność etapów budowy z sekcji 12 | Zmień kolejność |
| Z19 | Bortle i SQM są tylko informacyjne i nie wpływają na obliczenia | Określ, na co mają wpływać |
| Z20 | Konwencja położenia pryzmatu OAG z sekcji 5 | Dopasuj do swojego OAG |
| Z21 | „Pasuje do kadru” = wielka oś obiektu wynosi 25–80% krótszego boku kadru | Zmień zakres |
| Z22 | „Polecane na miesiąc” = obiekt widoczny (Z7) w nocy z 15. dnia miesiąca | Zmień dzień lub regułę |
| Z23 | Oznaczenia łączone automatycznie tylko przez krzyżowe identyfikatory ze źródeł i tabelę aliasów; bez łączenia po pozycji | Dopuść łączenie po pozycji |
| Z24 | Zawartość wbudowanego katalogu sprzętu i lista mnożników do szybkiego wyboru (sekcja 6.5) | Dodaj lub usuń modele |
| Z25 | Zakresy walidacji wartości wpisywanych ręcznie (sekcja 7F) | Zmień zakresy |
| Z26 | Profil przechowuje kopię wartości teleskopu i kamery; późniejsza zmiana wpisu w katalogu nie zmienia istniejących profili | Wiąż profil z wpisem katalogu na stałe |

---

## 1. Cel i użytkownik

- **Użytkownik:** astrofotograf z Polski (~52°N), kamera mono z filtrami L, R, G, B oraz Ha, OIII, SII (3 nm). Sesjami steruje w N.I.N.A. Aplikacja tylko planuje i nie steruje sprzętem.
- **Pytania, na które aplikacja odpowiada:**
  1. Co warto fotografować wybranej nocy?
  2. Jak wykadrować obiekt moim zestawem?
  3. Ile czasu realnie zbiorę nad moim horyzontem?
  4. Jak przenieść kadr do N.I.N.A.?
- **Warunki użycia:** telefon albo tablet w terenie, w ciemności (Red Mode), często bez internetu (PWA offline).

## 2. Zakres

- **Pierwsza wersja:** moduły A–F z sekcji 7, kontekst globalny, Red Mode, praca offline.
- **Faza 2:** zapisywanie kafli podglądu nieba do pracy offline.
- **Poza zakresem:** eksport do ASIAIR [Z1], sterowanie sprzętem, plate solving, prognoza pogody.

## 3. Stos technologiczny (decyzje, bez alternatyw)

- React + TypeScript (`strict`, bez `any`) + Vite; ESLint.
- Tailwind CSS z kolorami zdefiniowanymi jako tokeny w zmiennych CSS (sekcja 8); ikony Lucide React.
- `astronomy-engine` 2.x (sprawdzone na 2.1.19) — Słońce, Księżyc, zmierzchy, precesja i nutacja, gwiazdozbiory.
- `aladin-lite` 3.x — podgląd nieba. Przypnij dokładną wersję. Ładuj dynamicznie (`import()`) dopiero w zakładce Kadr. Licencja GPL-3.0.
- Wykresy: własne komponenty SVG + `d3-scale` [Z16].
- Stan aplikacji: Zustand. Dane użytkownika: IndexedDB przez Dexie. `localStorage` tylko na drobne preferencje interfejsu [Z16].
- Czas: obliczenia w UTC (milisekundy). Prezentacja przez `Intl.DateTimeFormat` z `timeZone` lokalizacji. Przeliczenie „lokalne południe → UTC” przez `date-fns-tz` [Z16].
- Obliczenia katalogowe w Web Workerze (zwykły `postMessage` z typowanymi komunikatami).
- Lista wirtualizowana: `@tanstack/react-virtual` [Z16].
- PWA: `vite-plugin-pwa` (aplikacja i pliki katalogu zapisane wstępnie w pamięci podręcznej).
- Testy: Vitest (+ `fake-indexeddb` do repozytoriów danych).

## 4. Konwencje

| Wielkość | Konwencja |
|---|---|
| Współrzędne katalogowe | J2000; `raDeg` w [0, 360), `decDeg` w [−90, +90] |
| Współrzędne do Alt/Az | J2000 → równik i równonoc daty przez `Rotation_EQJ_EQD` (przesunięcie rzędu 0,15–0,37°, dla M31 w 2026 r. 0,314° [T7]) |
| RA w API astronomy-engine | godziny gwiazdowe: `raDeg / 15` (`Horizon`, `DefineStar`, `Constellation`) |
| Szerokość geograficzna | N dodatnia |
| Długość geograficzna | E dodatnia (19°E = +19), jak w `Observer` z astronomy-engine |
| Azymut | N = 0°, E = 90°, S = 180°, W = 270°; [0, 360) |
| Wysokość obiektów | geometryczna, bez refrakcji. Wschody i zachody Słońca i Księżyca według standardowej definicji `SearchRiseSet` |
| Kąt pozycyjny kadru (PA) | kierunek „w górę” obrazu (oś Y matrycy) mierzony od N przez E, [0, 360). Zgodny z N.I.N.A. ≥ 3.0 („counter-clockwise notation”, „East of North”) i z kolumną `Position Angle (East)` w CSV. Na podglądzie z N u góry i E po lewej PA rośnie przeciwnie do ruchu wskazówek zegara |
| PA osi wielkiej obiektu | od N przez E (jak `PosAng` w OpenNGC) |
| Płaszczyzna styczna | rzut gnomoniczny; ξ w stronę E, η w stronę N w środku kadru |
| Czas wewnętrzny | UTC; wyświetlanie w strefie IANA lokalizacji, ze skrótem strefy (CEST/CET) |
| „Noc D” | od lokalnego południa dnia D do lokalnego południa dnia D+1 |
| Ciemność | wysokość Słońca < próg (domyślnie −18° [Z6]) |
| Jednostki | w nazwach pól: `Deg`, `Arcmin`, `Arcsec`, `Mm`, `Um`, `M`, `S`, `Px` |

**Widoczność (definicja obowiązująca we wszystkich modułach):**

```
okno            = [początekOkna, koniecOkna]   // zejście i wzejście Słońca przez próg, z SearchAltitude dla nocy D
tᵢ              = początekOkna + i·Δt          // i = 0, 1, 2, … dopóki tᵢ < koniecOkna
ok(t)           = h(t) > max(h_min, horyzont(az(t)))
czasEfektywny   = Σ długość([tᵢ, min(tᵢ + Δt, koniecOkna)))  po wszystkich tᵢ z ok(tᵢ), zaokrąglone do pełnych minut
```

- Siatka próbek zaczyna się dokładnie na początku okna ciemności, z krokiem Δt [Z8]. Ostatni przedział jest przycinany do końca okna.
- Oś wykresu nocy (7C) jest szersza od okna, ale czas efektywny liczy się tylko w oknie.
- Jeśli dla progu −18° w nocy D nie ma okna, próg spada do −15°, a potem do −12° [Z6]. Gdy i przy −12° okna nie ma, wynikiem jest stan „brak okna przy progu −12°” [T6]. Użyty próg jest zawsze pokazywany obok czasu efektywnego.

**Górowanie obiektu katalogowego** liczone jest analitycznie: to moment, w którym lokalny czas gwiazdowy (`SiderealTime` · 15 + długość) równa się RA na epokę daty:

```
t_gór = t₀ + ((α_daty − LST(t₀)) mod 360°) / 360,9856° na dobę,   t₀ = zachód Słońca − 1 h
```

Jeśli `t_gór` wypada po końcu osi wykresu, obiekt góruje w dzień i jego maksymalna wysokość w nocy przypada na brzeg okna. `DefineStar` i `SearchHourAngle` służą tylko jako referencja w testach [T7], [T8]; iteracyjne wyszukiwanie dla ~18 tys. obiektów nie zmieści się w budżecie czasu z 7A.

## 5. Model danych (TypeScript)

Wielkości pochodne (wymiary matrycy w mm, FOV, skala, oznaczenia tekstowe) są zawsze wyliczane, nigdy zapisywane.

```ts
export type CatalogId =
  | 'M' | 'NGC' | 'IC' | 'Sh2' | 'VdB' | 'LDN' | 'LBN' | 'B' | 'Simeis' | 'SNR-G' | 'Other';

export interface Designation {
  catalog: CatalogId;
  id: string;                        // '1976', '240', 'G180.0-01.7'
}
// Wyświetlanie: M 42, NGC 1976, IC 1396, Sh2-240, vdB 141, LDN 1235, LBN 437, B 33, Simeis 147, G180.0-01.7

export type DsoType =
  | 'galaxy' | 'galaxy_group'
  | 'emission_nebula' | 'reflection_nebula' | 'dark_nebula'
  | 'planetary_nebula' | 'supernova_remnant'
  | 'open_cluster' | 'globular_cluster' | 'cluster_nebula'
  | 'other';

export interface DsoObject {
  uid: string;                       // stabilny klucz, np. 'NGC1976'
  primary: Designation;
  designations: Designation[];       // wszystkie oznaczenia, łącznie z primary
  commonNames: string[];
  type: DsoType;
  raDeg: number;                     // J2000
  decDeg: number;                    // J2000
  sizeMajorArcmin: number | null;
  sizeMinorArcmin: number | null;
  positionAngleDeg: number | null;   // oś wielka, od N przez E
  magV: number | null;               // null, gdy katalog nie podaje jasności
  surfaceBrightness: number | null;  // mag/arcsec² (w OpenNGC tylko galaktyki)
  ldnOpacity: number | null;         // LDN: 1–6
  sh2Brightness: number | null;      // Sh2: 1–3, 1 = najsłabsze
  lbnBrightness: number | null;      // LBN: 1–6
  vdbStarMagV: number | null;        // VdB: jasność gwiazdy oświetlającej
  constellation: string;             // skrót IAU z Constellation()
  sources: string[];                 // np. ['OpenNGC', 'VizieR VII/20']
}

export interface HorizonPoint { azDeg: number; altDeg: number }

export interface ObserverLocation {
  id: string;
  name: string;
  latDeg: number;
  lonDegEast: number;
  elevationM: number;
  timezone: string;                  // IANA, np. 'Europe/Warsaw'
  horizon: HorizonPoint[];           // posortowane po azDeg; [] = horyzont 0°
  bortle: number | null;             // 1–9, informacyjnie [Z19]
  sqm: number | null;                // mag/arcsec², informacyjnie [Z19]
}

export type FilterId = 'L' | 'R' | 'G' | 'B' | 'Ha' | 'OIII' | 'SII' | 'OSC' | 'DualBand';

export type TelescopeDesign =
  | 'refractor' | 'newtonian' | 'sct' | 'rasa' | 'ritchey_chretien' | 'camera_lens' | 'other';

export interface TelescopeSpec {     // wpis katalogu sprzętu (6.5)
  id: string;                        // np. 'skywatcher-esprit-100ed'
  brand: string;
  model: string;
  design: TelescopeDesign;
  apertureMm: number;
  focalLengthMm: number;             // natywna, bez reduktora
  origin: 'builtin' | 'user';        // wbudowany (tylko do odczytu) albo dodany przez użytkownika
}

export interface CameraSpec {        // wpis katalogu sprzętu (6.5)
  id: string;                        // np. 'zwo-asi2600mm-pro'
  brand: string;
  model: string;
  sensorModel: string | null;        // np. 'IMX571'
  sensor: 'mono' | 'osc';
  resolutionXPx: number;
  resolutionYPx: number;
  pixelSizeUm: number;
  origin: 'builtin' | 'user';
}

// Profil przechowuje kopię wartości [Z26]; specId mówi tylko, z którego wpisu katalogu powstał.
export interface EquipmentProfile {
  id: string;
  name: string;
  telescope: {
    specId: string | null;           // null = wartości wpisane ręcznie
    label: string;                   // np. 'Sky-Watcher Esprit 100ED' albo nazwa własna
    apertureMm: number;
    focalLengthMm: number;
  };
  reducerFactor: number;             // 1.0 = bez zmiany; < 1 reduktor; > 1 ekstender lub soczewka Barlowa
  camera: {
    specId: string | null;
    label: string;
    sensor: 'mono' | 'osc';
    resolutionXPx: number;
    resolutionYPx: number;
    pixelSizeUm: number;
    binning: 1 | 2 | 3 | 4;
  };
  mount: { type: 'gem' | 'fork' | 'altaz'; flipMinutesAfterMeridian: number };
  filters: FilterId[];
  oag: {
    prismWidthMm: number;
    prismHeightMm: number;
    offsetFromCenterMm: number;      // od środka matrycy do środka pryzmatu
    angleDeg: number;                // 0° = nad górną krawędzią matrycy, rośnie zgodnie
                                     // z ruchem wskazówek zegara w układzie matrycy [Z20]
  } | null;
}

export interface Framing {
  centerRaDeg: number;               // J2000
  centerDecDeg: number;              // J2000
  paDeg: number;                     // konwencja z sekcji 4
  mosaic: { cols: number; rows: number; overlapPct: number };   // 1×1 = pojedynczy kadr
}

export interface AcquisitionEntry {
  nightDate: string;                 // 'RRRR-MM-DD' = noc D
  filter: FilterId;
  subs: number;
  exposureS: number;
}

export interface Project {
  id: string;
  name: string;
  objectUid: string;
  equipmentId: string;
  framing: Framing;
  log: AcquisitionEntry[];
  goalMinutes: Partial<Record<FilterId, number>>;
  notes: string;
  createdAtIso: string;
}

export interface PlanningSettings {
  darknessThresholdDeg: -18 | -15 | -12;   // [Z6]
  autoLowerThreshold: boolean;              // [Z6]
  minAltitudeDeg: number;                   // [Z7]
  minEffectiveHours: number;                // [Z7]
  catalogStepMin: number;                   // [Z8]
  detailStepMin: number;                    // [Z8]
  seeingArcsec: number;                     // [Z9]
  fitRange: [number, number];               // [Z21]
  moonRules: MoonRuleThresholds;            // [Z12], sekcja 7A
}
```

## 6. Dane

### 6.1 Katalogi (pobierane skryptem, potem dołączone do aplikacji) [Z3]

Skrypt `scripts/build-catalog.ts` (Node) pobiera źródła, mapuje je na `DsoObject`, łączy oznaczenia i zapisuje `public/catalog/catalog.v1.json` oraz `public/catalog/meta.json` (źródła, wersje, daty, licencje). Wynik jest commitowany do repozytorium; aplikacja nie pobiera katalogów w czasie działania. Parsery są wspólne dla skryptu i importu w aplikacji (6.3).

| Katalog | Źródło (sprawdzone 16.10.2026) | Liczba wierszy | Uwagi do mapowania |
|---|---|---|---|
| NGC, IC, M | OpenNGC: `database_files/NGC.csv` i `database_files/addendum.csv` z `github.com/mattiaverga/OpenNGC` | 13 970 + 64 | Separator `;`. RA `HH:MM:SS.ss`, Dec `±DD:MM:SS.s`. `MajAx`/`MinAx` w arcmin, `PosAng` od N przez E, `SurfBr` tylko dla galaktyk. Krzyżowe ID w kolumnach `M`, `NGC`, `IC`, `Identifiers`, `Common names`. Nazwy z zerami wiodącymi (`NGC0224` → NGC 224). Pomiń typy `*`, `**`, `Nova`, `NonEx`. `Dup` scal z obiektem głównym |
| Sh2 | VizieR VII/20 (Sharpless 1959) | 313 | Pozycje oryginalne są z epoki B1900, więc użyj wyliczonych przez VizieR `_RAJ2000`/`_DEJ2000`. `Diam` w arcmin, `Bright` 1–3 |
| LDN | VizieR VII/7A (Lynds 1962) | 1 791 | `Opacity` 1–6. `Area` w stopniach kwadratowych → średnica równoważna w arcmin: `60 · 2·√(Area/π)`. `Barn` = krzyżowe ID Barnarda |
| LBN | VizieR VII/9 (Lynds 1965) | 1 125 | `Diam1`/`Diam2` w arcmin, `Bright` 1–6 |
| VdB | VizieR VII/21 (van den Bergh 1966) | 158 | `Vmag` = gwiazda oświetlająca. Rozmiar = 2 × większy z promieni `BRadMax`/`RRadMax` |
| Barnard | VizieR VII/220A (Barnard 1927) | 349 | `Diam` w arcmin |
| SNR | VizieR VII/297 (Green, wersja 2024-10) | 310 | Oznaczenie z kolumny `SNR` (`G…`), nazwy z `Names`, `MajDiam`/`MinDiam` w arcmin |

**Mapowanie typów OpenNGC → `DsoType`:**

| Kody OpenNGC | `DsoType` |
|---|---|
| `G` | `galaxy` |
| `GPair`, `GTrpl`, `GGroup` | `galaxy_group` |
| `HII`, `EmN`, `Neb` | `emission_nebula` |
| `RfN` | `reflection_nebula` |
| `DrkN` | `dark_nebula` |
| `PN` | `planetary_nebula` |
| `SNR` | `supernova_remnant` |
| `OCl`, `*Ass` | `open_cluster` |
| `GCl` | `globular_cluster` |
| `Cl+N` | `cluster_nebula` |
| `Other` | `other` |

Katalogi VizieR mają typ ustalony przez katalog: Sh2 → emisyjna, LDN i B → ciemna, VdB → refleksyjna, Green → SNR. LBN → emisyjna to uproszczenie, bo LBN zawiera też mgławice refleksyjne; jeśli obiekt ma krzyżowe ID z VdB, pierwszeństwo ma typ z VdB.

Jednostki kolumn VizieR potwierdź w liniach `#Column` odpowiedzi TSV (VizieR podaje je dla każdej kolumny), zanim zapiszesz mapowanie.

**Pobieranie z VizieR:** zapytanie TSV bez limitu wierszy, ze współrzędnymi J2000 w stopniach:

```
https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=<ID>&-out.max=unlimited&-out.all&-out.add=_RAJ,_DEJ&-oc.form=d
```

Serwery CDS mają ochronę przed botami: narzędzia udające przeglądarkę dostają odmowę, a zwykłe zapytanie HTTP z Node z własnym nagłówkiem `User-Agent` działa. Pojedyncze zapytanie trwa do kilkudziesięciu sekund. Gwiazdozbiór licz przez `Constellation(raDeg / 15, decDeg)` z astronomy-engine.

### 6.2 Łączenie oznaczeń [Z23]

- Oznaczenia są łączone tylko przez krzyżowe identyfikatory ze źródeł oraz ręczną tabelę `src/data/aliases.json`.
- Identyczne oznaczenia z różnych źródeł to ten sam obiekt (np. B 33 występuje w `addendum.csv` OpenNGC i w VII/220A).
- Pierwszeństwo pól przy łączeniu: współrzędne, rozmiar i typ z OpenNGC, potem kolejno Sh2, VdB, LBN, LDN, B, Green. Pola specyficzne dla katalogu (`ldnOpacity`, `sh2Brightness` itd.) zawsze pochodzą z własnego katalogu.
- Przykładowe wpisy tabeli aliasów:
  - Simeis 147 = Sh2-240
  - IC 1396 = Sh2-131
  - IC 1805 = Sh2-190
  - IC 1848 = Sh2-199
  - NGC 7635 = Sh2-162
  - NGC 281 = Sh2-184
  - NGC 6888 = Sh2-105
  - vdB 141 = Sh2-136
- Bliskość pozycji nie łączy obiektów; widok szczegółów pokazuje ją tylko jako listę „Pokrewne obiekty”.

### 6.3 Import w aplikacji

- Obsługiwane formaty: CSV w formacie OpenNGC i TSV z VizieR (te same parsery co w skrypcie).
- Podgląd przed zapisem: liczba wierszy przyjętych, liczba odrzuconych z podaniem przyczyn, liczba duplikatów.
- Zaimportowane dane trafiają do IndexedDB jako osobna warstwa katalogu użytkownika.

### 6.4 Dane demonstracyjne

- **Lista „Klasyki”** (`src/data/featured.json`) zawiera tylko oznaczenia; dane pochodzą z katalogu:
  - vdB 141, vdB 152
  - Sh2-155, Sh2-129, Simeis 147
  - NGC 6960, NGC 6992
  - LDN 1251, LDN 1235
  - NGC 7000, IC 1396
  - M 31, M 42, M 45, M 33, M 101, M 81, M 1
  - IC 1805, IC 1848, NGC 7635, NGC 281, NGC 6888
  - B 33, NGC 1499, NGC 2237
- **Lokalizacja** [Z5] z horyzontem demonstracyjnym [Z13]: drzewa na N i NE, budynek na SE, otwarte południe. Punkty (az°: wysokość°):
  - 0: 12, 15: 14, 30: 18, 45: 22, 60: 25, 75: 20
  - 90: 15, 105: 12, 120: 28, 135: 35, 150: 30, 165: 10
  - 180: 8, 195: 6, 210: 9, 225: 14, 240: 20, 255: 24
  - 270: 18, 285: 15, 300: 11, 315: 9, 330: 10, 345: 11
- **Profile sprzętu** (teleskopy i kamery z katalogu 6.5):

| Profil | Teleskop | Mnożnik | Kamera | Filtry |
|---|---|---|---|---|
| Mój zestaw (aktywny) [Z2] | Newton 150/600 (wpis ręczny, `specId: null`) | 1,0× | Player One Ares-M Pro | L, R, G, B, Ha, OIII, SII |
| RedCat 51 + ASI2600MC Pro | William Optics RedCat 51 | 1,0× | ZWO ASI2600MC Pro | OSC, DualBand |
| Newton 200/1000 + ASI533MM Pro | Sky-Watcher Explorer 200PDS | 1,0× | ZWO ASI533MM Pro | L, R, G, B, Ha, OIII, SII |
| Esprit 100ED + ASI6200MM Pro | Sky-Watcher Esprit 100ED | 1,0× | ZWO ASI6200MM Pro | L, R, G, B, Ha, OIII, SII |

Wszystkie profile: binning 1, montaż GEM, przerzut 10 min po południku [Z10], bez OAG.

### 6.5 Katalog sprzętu [Z24]

Pliki `src/data/equipment/telescopes.json` i `src/data/equipment/cameras.json` są dołączone do aplikacji i tylko do odczytu. Wpisy dodane przez użytkownika trafiają do IndexedDB (`origin: 'user'`) i są widoczne razem z wbudowanymi. Lista nie jest wyczerpująca: brakujący sprzęt wpisuje się ręcznie (7F).

Wartości pochodzą ze stron producentów i sklepów, a w części przypadków z jednego źródła wtórnego (stan na 16.10.2026); takie wpisy mają w załączniku B oznaczenie ¹. Przy rozbieżnościach źródeł przyjęto:
- RedCat 71: 350 mm (obecna wersja WIFD; starsze opisy podają 348 mm);
- GT81 IV: 478 mm (jedno źródło podaje 480 mm);
- Quattro 200P: apertura 200 mm (sklepy podają 200–205 mm);
- GSO RC 6": apertura 152 mm (spotykane też 154 mm).

Tabele teleskopów i kamer są w załączniku B.

**Uwagi do katalogu:**
- Ta sama matryca może mieć u różnych producentów inną liczbę pikseli (IMX571: ZWO 6248 × 4176, Player One i QHY 6252 × 4176; IMX585: ZWO 3840 × 2160, Player One 3856 × 2180). Katalog zawiera zawsze wartość producenta danej kamery.
- QHY podaje też obszar z pikselami maskowanymi i nadmiarowymi (np. QHY268: 6280 × 4210); katalog zawiera obszar aktywny.
- W lustrzankach i bezlusterkowcach rozmiar piksela jest wyliczony z wymiarów matrycy; niepewność wpływa na FOV w granicach ok. 0,5%.
- Kamery z kilkoma trybami rozdzielczości (np. ZWO ASI294MM Pro) nie są w katalogu; wpisuje się je ręcznie w trybie, którego się używa.

**Mnożniki do szybkiego wyboru** [Z24]:
- 0,63× — reduktor-korektor f/6,3 do teleskopów SCT;
- 0,7× — np. reduktor Celestron do EdgeHD;
- 0,73× — np. reduktor Takahashi do FSQ-85;
- 0,8×;
- 0,85× — np. reduktor-spłaszczacz Sky-Watcher do Evostar 80ED/100ED;
- 1,0× — spłaszczacz lub korektor komy bez zmiany ogniskowej;
- 2,0× — soczewka Barlowa.

## 7. Moduły

### 7.0 Kontekst globalny (górny pasek)

- Pasek zawiera: lokalizację, noc (datę D), aktywny zestaw, kursor czasu (suwak + przycisk „Teraz”) i przełącznik Red Mode.
- Jeden globalny kursor czasu steruje kartami katalogu, wykresem nocy i widokiem sfery.
- Tryb „Teraz”:
  - kursor podąża za zegarem i odświeża się co 60 s;
  - noc to bieżąca noc D (przed lokalnym południem jest to noc z poprzedniej daty).
- Zmiana nocy ustawia kursor na środek okna ciemności, a gdy okna nie ma, na lokalną północ.

### 7A. Katalog — „Co fotografować tej nocy?”

**Filtry:**
- Katalog (wielokrotny wybór z `CatalogId`), typ (wielokrotny wybór), gwiazdozbiór.
- Jasność, z opcją „pokaż obiekty bez jasności” (domyślnie włączona).
- Rozmiar w arcmin.
- „Widoczne w wybraną noc”: czas efektywny ≥ `minEffectiveHours` [Z7].
- „Polecane na miesiąc” [Z22].
- „Pasuje do kadru” aktywnego zestawu [Z21]; dotyczy tylko obiektów ze znanym rozmiarem.

**Sortowanie:** czas efektywny (domyślnie), godzina górowania, rozmiar, jasność, dopasowanie do kadru.

**Karta obiektu:**
- Oznaczenie główne i pozostałe, nazwa zwyczajowa, typ (ikona + etykieta tekstowa).
- Alt/Az w kursorze czasu.
- Maksymalna wysokość i godzina górowania w oknie nocy; godzina przerzutu dla montażu GEM.
- Czas efektywny wraz z użytym progiem ciemności.
- Separacja od Księżyca w kursorze czasu i minimalna w oknie efektywnym.
- Odznaki rekomendacji filtrów.

**Rekomendacje filtrów** [Z12]. Dane wejściowe:
- `illum` — oświetlenie Księżyca w środku okna efektywnego;
- `sep` — minimalna topocentryczna separacja w oknie;
- czy Księżyc jest nad horyzontem.

| Warunek (sprawdzaj od góry) | L, R, G, B, OSC | Ha, SII | OIII, DualBand |
|---|---|---|---|
| 1. Księżyc pod horyzontem przez ≥ 80% okna | zielony | zielony | zielony |
| 2. Księżyc obecny; mgławica refleksyjna lub ciemna | zielony: `illum` < 0,15; czerwony: reszta | jak w wierszu 3 | jak w wierszu 3 |
| 3. Księżyc obecny; pozostałe obiekty | zielony: `illum` < 0,15; żółty: `illum` < 0,5 i `sep` ≥ 90°; czerwony: reszta | zielony: `sep` ≥ 50°; żółty: 25° ≤ `sep` < 50°; czerwony: `sep` < 25° | zielony: `sep` ≥ 70° i `illum` < 0,75; żółty: `sep` ≥ 40°; czerwony: reszta |

Progi są edytowalne w ustawieniach. Pokazuj tylko filtry z aktywnego profilu.

**Wydajność:**
- Filtr widoczności liczy się w Web Workerze. Czas gwiazdowy i pozycje Słońca liczysz raz na krok czasu, a macierz precesji raz na noc.
- Wynik trafia do pamięci podręcznej z kluczem: lokalizacja, skrót horyzontu, noc, próg, h_min.
- Pełny katalog (~18 tys. obiektów) liczy się w ≤ 3 s w Chrome na typowym laptopie, bez blokowania interfejsu.

**Kryteria akceptacji:**
- [T9]: czasy efektywne pięciu obiektów zgodne z wektorem.
- Przy ustawieniach z [T9] i minimum 3 h filtr „Widoczne” odrzuca M 42, a pozostałe cztery obiekty przyjmuje.
- Filtr jasności 0–10 mag z włączoną opcją „pokaż obiekty bez jasności” nie ukrywa LDN 1235.
- [T6]: w nocy 21/22.06.2026 próg spada do −12°, interfejs pokazuje komunikat, a okno to 23:15–02:16 CEST. Na 54,83°N stan „brak okna”.
- Noc 16/17.10.2026, M 31: Księżyc zachodzi o 20:25 CEST, czyli jest nad horyzontem przez około 8% okna, więc wszystkie filtry są zielone [T4], [T7].
- Noc 24/25.10.2026, M 31: Księżyc świeci całą noc przy oświetleniu ≈ 98% [T5], więc L/R/G/B są czerwone.

### 7B. Kadr — FOV i podgląd nieba

**Wzory** (z pierwotnego promptu; poprawne). Wartości wejściowe pochodzą z aktywnego profilu sprzętu (7F):
- `F_eff = focalLengthMm × reducerFactor`
- `f/ = F_eff / apertureMm`
- `sensorWidthMm = resolutionXPx × pixelSizeUm / 1000` (analogicznie wysokość)
- `FOV = 2·atan(sensorDim / (2·F_eff)) · 180/π`
- `scale = pixelSizeUm × binning / F_eff × 206,265` [″/px]

**Ocena próbkowania** (seeing domyślnie 2,5″ [Z9]):
- idealne, gdy `seeing/3 ≤ scale ≤ seeing/2`;
- nadpróbkowanie poniżej tego zakresu, podpróbkowanie powyżej.

Dla kamer OSC dodaj informację, że efektywna rozdzielczość jest niższa, niż wynika ze skali.

**Podgląd (Aladin Lite v3):**
- **Warstwy HiPS:**
  - `CDS/P/DSS2/color` (domyślna);
  - `CDS/P/DSS2/red`;
  - `CDS/P/Finkbeiner` (Hα) — z opisem „rozdzielczość ok. 6′, przydatna tylko w szerokich polach”. W polu 0,65° daje ok. 6 elementów rozdzielczości na bok kadru.
- **Ramka:** stała w środku widoku; przesuwanie nieba zmienia środek kadru [Z11]. Kąt ustawiasz suwakiem 0–360° (krok 0,5°) albo polem liczbowym.
- **Mozaika:**
  - kolumny × wiersze 1–5, zakładka 10–30% (domyślnie 20%);
  - ramki paneli rysuj jako wielokąty we współrzędnych nieba przez API nakładek graficznych Aladin Lite, nie na osobnym Canvasie (nazwy funkcji sprawdź w dokumentacji przypiętej wersji).
- **OAG:** prostokąt pryzmatu według pól `oag`, obracany razem z kadrem.
- **Offline:** w miejscu podglądu pokaż komunikat; obliczenia FOV działają dalej.

**Geometria mozaiki:**

```
W = sensorWidthMm / F_eff,  H = sensorHeightMm / F_eff          // [rad] w płaszczyźnie stycznej
u = (sin θ, cos θ),  r = (−cos θ, sin θ)                        // góra i prawa strona obrazu w (ξ, η), θ = PA
panel (i, j), i = 0…cols−1 od lewej, j = 0…rows−1 od góry:
  dx = (i − (cols−1)/2)·(1 − overlap)·W
  dy = ((rows−1)/2 − j)·(1 − overlap)·H
  (ξ, η) = dx·r + dy·u
rzut odwrotny ze środka (α₀, δ₀):
  δ = asin((sin δ₀ + η·cos δ₀) / √(1 + ξ² + η²))
  α = α₀ + atan2(ξ, cos δ₀ − η·sin δ₀)
lokalny PA panelu = kąt pozycyjny (od N przez E) odcinka od (ξ, η) do (ξ, η) + ε·u, ε = 1e−6, po rzucie na sferę
```

Przesuwanie środków paneli przez dodawanie przesunięć do RA/Dec jest błędne i psuje się przy wysokich deklinacjach [T12].

**Kryteria akceptacji:** [T1], [T2], [T12], [T16], a także zgodność kierunku obrotu z konwencją z sekcji 4.

### 7C. Własny horyzont i wykres nocy

**Plik horyzontu:**
- Każda linia zawiera parę `az alt`. Separatory: spacje, tabulatory, `,` lub `;`.
- `#` rozpoczyna komentarz; puste linie są pomijane. Rozszerzenie pliku dowolne (`.hrz`, `.txt`).
- Walidacja: azymut normalizowany do [0, 360) (360 → 0), wysokość w [−5, 90].
- Punkty są sortowane; przy duplikacie azymutu wygrywa ostatni wpis. Wymagane są co najmniej 2 punkty.
- Interpolacja liniowa po azymucie, z zawinięciem 360 → 0 [T10].
- Eksport w tym samym formacie, z nagłówkiem-komentarzem. Jest zgodny z plikiem horyzontu N.I.N.A., który też przyjmuje pary azymut–wysokość i komentarze `#`.

**Edytor horyzontu:**
- Wykres 0–360° z etykietami N, E, S, W.
- Kliknięcie dodaje punkt, przeciągnięcie go przesuwa, podwójne kliknięcie lub długie przytrzymanie usuwa.

**Wykres nocy:**
- **Osie:**
  - X: od zachodu Słońca − 1 h do wschodu + 1 h, w czasie lokalnym ze skrótem strefy. Wewnętrznie oś jest w UTC, więc w noc zmiany czasu powtórzona godzina ma etykiety CEST i CET [T5].
  - Y: 0–90°.
- **Tło:** pasy dnia, zmierzchu cywilnego, żeglarskiego i astronomicznego oraz nocy.
- **Krzywe i linie:**
  - wysokość obiektu (linia ciągła);
  - horyzont lokalny wzdłuż azymutu obiektu, `horyzont(az(t))`;
  - linia h_min;
  - wysokość Księżyca (linia przerywana) z ikoną fazy i procentem oświetlenia.
- **Wyróżnienie fragmentów niewidocznych:** krzywa obiektu poniżej `max(h_min, horyzont)` jest zacieniona. Odróżnij „za przeszkodą” (poniżej horyzontu) od „za nisko” (poniżej h_min).
- **Linie pionowe:** górowanie, przerzut (górowanie + `flipMinutesAfterMeridian`, tylko GEM) i przeciągany kursor czasu.
- **Podsumowanie:** czas efektywny w formacie hh:mm, okno ciemności i użyty próg.

**Kryteria akceptacji:** [T3], [T4], [T5], [T6], [T10], [T11].

### 7D. Widok sfery (All-Sky)

**Rzut** [Z17]: azymutalny równoodległościowy.
- `r = R·(90° − h)/90°`, `x = cx − r·sin(az)`, `y = cy − r·cos(az)`.
- Zenit w środku, N u góry, E po lewej (widok jak przy patrzeniu w niebo).

**Elementy:**
- okręgi 0°, 30° i 60°;
- południk N–S przez zenit;
- wypełniony wielokąt własnego horyzontu;
- okrąg h_min;
- Księżyc z fazą;
- trajektoria obiektu w oknie nocy ze znacznikami pełnych godzin;
- znacznik obiektu w kursorze czasu;
- suwak czasu, czyli globalny kursor.

**Kryteria akceptacji:** [T16].

### 7E. Projekty i eksport

**Projekt:**
- Zapisuje obiekt, kadr (środek, PA, mozaika) i zestaw.
- Ma dziennik akwizycji: noc, filtr, liczba klatek, czas ekspozycji.
- Sumy w h:mm na filtr; opcjonalne cele w minutach na filtr pokazywane jako paski postępu.
- Współrzędne są pokazywane jako HMS/DMS i w stopniach dziesiętnych.

**Eksport:**

1. **CSV dla N.I.N.A.** (pierwsza wersja) — format planu mozaiki Telescopius. Zasady sprawdzone w kodzie źródłowym N.I.N.A. (`NINA/ViewModel/Sequencer/SimpleSequence/SimpleSequenceVM.cs`, gałąź `develop`, czyli wersja rozwojowa 3.3, stan na 16.10.2026). Import tego formatu istnieje od wersji 1.10 HF1; w używanym wydaniu stabilnym potwierdź go testem ręcznym z kryteriów akceptacji:
   - Import jest w prostym sekwencerze N.I.N.A.: import celów, filtr „Telescopius”, pliki `*.csv`.
   - Nagłówki są dopasowywane bez względu na wielkość liter i spacje na brzegach.
   - Ustawienia regionalne niezależne od systemu (`InvariantCulture`): separator kolumn `,`, separator dziesiętny `.`.
   - Wymagane kolumny: `Pane`, `RA`, `DEC`, `Position Angle (East)`. Kąt musi być liczbą i nie może być pusty.
   - Współrzędne są traktowane jako J2000. Liczby są wyciągane wyrażeniem regularnym, a znak minus wykrywany w dowolnym miejscu pola, więc w polach współrzędnych nie może być przecinków.
   - Format pól: RA `HH:MM:SS.ss`, DEC `+DD:MM:SS.s` (znak zawsze).
   - Jeden wiersz na panel; kadr 1×1 to jeden wiersz.
   - Nie używaj wariantu listy obserwacyjnej (kolumny `Familiar Name`…): przy nagłówku bez sufiksu obecny kod N.I.N.A. czyta deklinację z kolumny RA.

   ```
   Pane,RA,DEC,Position Angle (East)
   M 31,00:42:44.30,+41:16:09.0,30.0
   ```

2. **JSON** — pełny projekt; służy też do kopii zapasowej i ponownego importu.
3. **Plik horyzontu** zgodny z N.I.N.A. (7C).

**Kryteria akceptacji:**
- [T14].
- Test ręczny (wizualny): kadr z asymetrycznym PA (np. 30°) po imporcie do N.I.N.A. 3.x ma w Framing Assistant tę samą orientację na niebie co w aplikacji. Sama zgodność liczby nic nie dowodzi, bo N.I.N.A. zapisuje kąt z pliku bez zmian (modulo 360°).
- Uwaga dla użytkownika w interfejsie eksportu: import w N.I.N.A. czyści bieżącą listę celów prostego sekwencera.

### 7F. Sprzęt — profile, katalog i dane wpisywane ręcznie

**Lista profili:** dodawanie, duplikowanie, usuwanie i wybór aktywnego profilu (także z górnego paska).

**Edytor profilu:**
- **Teleskop:**
  - wyszukiwarka po marce i modelu w katalogu (6.5) albo opcja „Własny”;
  - wybór z katalogu kopiuje aperturę i ogniskową do pól, które pozostają edytowalne;
  - wartość różna od wpisu katalogu ma oznaczenie „zmienione względem katalogu” (wyliczane przez porównanie, nie zapisywane).
- **Mnożnik reduktora/korektora:** pole liczbowe i przyciski szybkiego wyboru [Z24].
- **Kamera:** wyszukiwarka w katalogu albo „Własna”. Pola: rozdzielczość X i Y [px], rozmiar piksela [µm], typ (mono/OSC), binning.
- **Montaż, filtry, OAG:** zgodnie z modelem danych (sekcja 5).
- **Podgląd na żywo** (te same funkcje co w 7B): F_eff, f/, wymiary i przekątna matrycy w mm, FOV w stopniach i minutach kątowych, skala w ″/px, ocena próbkowania.
- **„Zapisz jako mój teleskop / moją kamerę”:**
  - dodaje wpis `origin: 'user'` do katalogu, dostępny w kolejnych profilach;
  - wpisy własne można edytować i usuwać;
  - wpisy wbudowane można tylko zduplikować jako własne;
  - usunięcie wpisu nie zmienia profili: zachowują swoje wartości, a `specId` bez odpowiadającego wpisu jest traktowany jak `null`.

**Walidacja pól** [Z25] (błąd blokuje zapis, ostrzeżenie nie blokuje):

| Pole | Dozwolony zakres (inaczej błąd) | Ostrzeżenie |
|---|---|---|
| Apertura | 5–1500 mm | — |
| Ogniskowa | 5–10 000 mm | f/ < 1 lub f/ > 30 |
| Mnożnik | 0,3–3,0 | — |
| Rozdzielczość X, Y | 100–20 000 px, liczby całkowite | — |
| Rozmiar piksela | 1,0–30,0 µm | dłuższy bok matrycy > 60 mm |

Pola liczbowe przyjmują przecinek i kropkę dziesiętną („3,76” = „3.76”).

**Kryteria akceptacji:** [T17], [T18], [T19], [T20].

## 8. Design system i Red Mode

Inspiracja: SkySafari, czyli ciemny, czytelny interfejs z dolnym paskiem zakładek na telefonie. Nie kopiuj elementów graficznych ani nazw.

**Tokeny** (`src/theme/tokens.ts`, z nich generowane są zmienne CSS i z nich korzystają testy):

| Token | Dark Cosmos | Red Mode |
|---|---|---|
| tło | `#07090E` | `#000000` |
| karta | `rgba(15,23,42,0.7)` + rozmycie tła 12 px | `#140000`, bez przezroczystości i rozmycia |
| obramowanie | `rgba(30,41,59,0.8)` | `#4D0000` |
| tekst | `#E2E8F0` | `#CC0000` |
| tekst wyróżniony / akcent | `#60A5FA` | `#FF0000` |
| tekst pomocniczy | `#94A3B8` | `#800000` |
| mgławica refleksyjna | `#60A5FA` (błękit) | `#FF0000` |
| mgławica emisyjna, SNR | `#F43F5E` (szkarłat) | `#FF0000` |
| mgławica ciemna | `#F59E0B` (bursztyn) | `#CC0000` |
| galaktyka | `#A78BFA` (fiolet) | `#CC0000` |
| mgławica planetarna [Z15] | `#2DD4BF` (turkus) | `#CC0000` |
| gromada [Z15] | `#FACC15` (żółty) | `#CC0000` |

**Red Mode:**
- Klasa `red-mode` na `<html>` przełącza wszystkie tokeny.
- W palecie czerwonej każdy kolor ma G = 0 i B = 0 [T15].
- Ponieważ w czerwieni kolory się zlewają, typy obiektów są zawsze rozróżniane także ikoną i etykietą tekstową.
- Podgląd nieba i zdjęcia przechodzą przez filtr SVG (luminancja → kanał R):

  ```html
  <svg width="0" height="0" style="position:absolute">
    <filter id="red-only" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
    </filter>
  </svg>
  ```

  Na kontenerze podglądu ustaw `filter: url(#red-only)`.
- `<meta name="theme-color">` zmienia się na `#000000`.
- Jednorazowa podpowiedź: „Obniż jasność ekranu” (aplikacja nie steruje podświetleniem).

**Ergonomia:**
- Cele dotykowe ≥ 44 × 44 px (obsługa w rękawiczkach).
- Dolny pasek zakładek poniżej 768 px szerokości, boczny pasek od 768 px.

## 9. Nawigacja [Z14]

| Zakładka | Zawartość |
|---|---|
| Katalog | moduł A |
| Noc | wykres nocy (C) i widok sfery (D) dla wybranego obiektu |
| Kadr | moduł B |
| Projekty | moduł E z eksportem |
| Ustawienia | lokalizacje i edytor horyzontu, sprzęt (7F), parametry planowania (`PlanningSettings`), kopia zapasowa, „Źródła i licencje” |

## 10. Wymagania niefunkcjonalne

- **Offline:** aplikacja i katalog są zapisane wstępnie w pamięci podręcznej; wszystkie obliczenia działają bez sieci, podgląd HiPS wymaga sieci. Wywołaj `navigator.storage.persist()`. Eksport i import kopii wszystkich danych użytkownika w JSON.
- **Język:** interfejs po polsku, formaty pl-PL, zegar 24 h [Z4].
- **Dostępność:** informacja nigdy nie jest przekazywana wyłącznie kolorem; obsługa klawiatury na komputerze.
- **Licencje** (ekran „Źródła i licencje”):
  - OpenNGC: CC BY-SA 4.0 (uznanie autorstwa, dane pochodne na tej samej licencji);
  - katalogi VizieR: cytowanie autorów;
  - Aladin Lite: GPL-3.0;
  - astronomy-engine: MIT;
  - HiPS Finkbeiner: ODbL.

## 11. Struktura kodu

```
src/
  services/astroMath.ts        // jedyne miejsce wzorów astronomicznych: czas gwiazdowy, kąt godzinny,
                               // Alt/Az, precesja (przez astronomy-engine), separacja (haversine),
                               // rzut gnomoniczny, interpolacja horyzontu, FOV i skala
  services/visibility.ts       // okna ciemności, obniżanie progu, czas efektywny, górowanie, przerzut
  services/framing.ts          // mozaika, lokalny PA paneli, OAG
  services/equipment.ts        // walidacja wartości sprzętu, porównanie z wpisem katalogu
  services/horizonFile.ts      // parser i eksport pliku horyzontu
  services/export/ninaCsv.ts   // eksport CSV dla N.I.N.A.
  services/catalog/parsers/    // OpenNGC, VizieR (wspólne ze skryptem)
  workers/catalog.worker.ts
  data/                        // repozytoria Dexie, aliases.json, featured.json
  data/equipment/              // telescopes.json, cameras.json
  state/                       // Zustand
  features/{catalog,night,framing,projects,equipment,settings}/
  theme/tokens.ts
scripts/build-catalog.ts
public/catalog/
```

**Zasady:**
- Komponenty interfejsu nie importują astronomy-engine bezpośrednio, tylko przez `astroMath.ts`.
- Funkcje w `services/` są czyste i mają testy jednostkowe.

## 12. Etapy budowy i kryteria ukończenia [Z18]

| Etap | Zakres | Musi przejść |
|---|---|---|
| 1 | Szkielet projektu, tokeny, `astroMath.ts`, `visibility.ts` | T1–T8, T13, T15 |
| 2 | Skrypt katalogu, dane, parsery, repozytoria; katalog sprzętu (6.5) i `services/equipment.ts` | testy parserów (przykładowe wiersze z każdego źródła, łączenie aliasów), T19, T20 |
| 3 | Kontekst globalny, horyzont, wykres nocy (7.0, 7C) | T9–T11 |
| 4 | Katalog, Web Worker, filtry, rekomendacje (7A) | kryteria 7A |
| 5 | Kadr, Aladin, mozaika, OAG (7B); edytor sprzętu (7F) | T12, T17, T18 i kryteria 7B, 7F |
| 6 | Widok sfery (7D) | T16 |
| 7 | Projekty, eksport, PWA, dopracowanie Red Mode (7E, 8, 10) | T14, test offline (tryb samolotowy), ręczny import do N.I.N.A. |

**Po każdym etapie:**
- przechodzą `npm test`, `tsc --noEmit`, linter i `npm run build`;
- w kodzie nie ma `TODO` ani zaślepek.

---

## Załącznik A. Wektory testowe

Dane z 16.10.2026, policzone skryptem z astronomy-engine 2.1.19. Wysokości obiektów są bez refrakcji. Tolerancje: czasy ±1 min, wysokości ±0,01°, azymut ±0,05° (dla h < 80°), chyba że podano inaczej. Lokalizacja: 52,0°N, 19,0°E, 150 m, `Europe/Warsaw`, o ile nie zaznaczono inaczej.

| ID | Wejście | Oczekiwany wynik |
|---|---|---|
| T1 | FOV i skala (binning 1, reduktor 1,0×) | RedCat 51 + ASI2600MC: matryca 23,49 × 15,70 mm, FOV 5,380° × 3,597°, 3,102″/px, f/4,90 · Newton 200/1000 + ASI533MM: 0,648° × 0,648° (38,9′), 0,776″/px, f/5,00 · Esprit 100 + ASI6200MM: 3,750° × 2,502°, 1,410″/px, f/5,50 · Newton 150/750 + Ares-M Pro: 0,864° × 0,864° (51,8′), 1,034″/px, f/5,00 |
| T2 | Próbkowanie, seeing 2,5″ (zakres idealny 0,833–1,25″/px) | RedCat → podpróbkowanie; Newton 200 → nadpróbkowanie; Esprit → podpróbkowanie; Newton 150 + Ares → idealne |
| T3 | Minimalna wysokość Słońca, noc 21/22.06.2026, 19°E | 49°N: −17,57°; 52°N: −14,57°; 54,5°N: −12,07°; 54,83°N: −11,74° (o 00:46 CEST). W całej Polsce w przesileniu nie ma nocy astronomicznej |
| T4 | Noc 16/17.10.2026 | zachód Słońca 17:47 CEST; −6° 18:22; −12° 19:01; −18° od 19:40 do 05:19 CEST (noc astronomiczna 9 h 39 min); wschód 07:12 CEST. Księżyc: zachód 16.10 o 20:25 CEST; o 00:00 CEST 17.10 oświetlenie 33,8%, wysokość −27,7° |
| T5 | Noc 24/25.10.2026 (zmiana czasu) | zachód Słońca 17:31 CEST; −18° od 19:24 CEST do 04:32 CET; wschód 06:26 CET. Księżyc nad horyzontem całą noc (wschód 16:28 CEST, zachód 05:29 CET), oświetlenie 98,0% o 01:00 CEST. Oś wykresu ma powtórzoną godzinę oznaczoną CEST/CET |
| T6 | Noc 21/22.06.2026, okna ciemności | −18°: brak; −15°: brak; −12°: 23:15–02:16 CEST (3 h 01 min). Na 54,83°N brak okna nawet przy −12° |
| T7 | M 31: RA 00:42:44.3, Dec +41:16:09 (J2000), noc 16/17.10.2026 | górowanie 23:46 CEST, h_max 79,42°; o 00:00 CEST 17.10: h = 79,17°, az = 193,58°; przesunięcie J2000 → data 0,314°; separacja od Księżyca (topocentrycznie) 112,82° |
| T8 | Szybki wzór Alt/Az z `astroMath.ts` porównany z astronomy-engine (`DefineStar` → `Equator(ofdate = true, aberration = true)` → `Horizon` bez refrakcji), M 31 przez dobę co 7 min | maks. różnica wysokości ≤ 0,01° (zmierzono 0,0056°); azymut ≤ 0,05° dla h < 80° |
| T9 | Czas efektywny, noc 16/17.10.2026, próg −18°, h_min 30°, horyzont płaski, krok 1 min | M 31: 9 h 39 min · NGC 7000 (20:59:17, +44:31:44): 6 h 50 min · IC 1396 (21:39:06, +57:30:00): 9 h 02 min · M 42 (05:35:17.3, −05:23:28): 2 h 03 min · M 45 (03:47:24, +24:07:00): 7 h 14 min. Przy kroku 5 min tolerancja ±5 min |
| T10 | Interpolacja horyzontu | horyzont demonstracyjny: az 127,5° → 31,5°; az 352,5° → 11,5° (zawinięcie 345 → 0). Punkty {350: 10, 10: 20} → az 0° → 15°. Plik z linią `# Az Alt` i pustymi liniami parsuje się poprawnie |
| T11 | Horyzont w czasie efektywnym, noc 16/17.10.2026 | M 42, h_min 20°: horyzont płaski 3 h 49 min, demonstracyjny 2 h 22 min. Ściana z punktów (0: 0), (89: 0), (90: 60), (180: 60), (181: 0), h_min 30°: M 31 9 h 20 min, M 42 0 h 39 min, M 45 3 h 34 min |
| T12 | Mozaika 2×1, zakładka 20%, PA 0°, RedCat + ASI2600MC, środek RA 30° | odległość środków paneli 4,305° przy Dec 0°, 60° i 85°; różnica RA: 4,305° / 8,598° / 46,659°; lokalny PA paneli: 0° / ±3,72° / ±23,24° (panel wschodni dodatni, zachodni = 360° − x) |
| T13 | Separacja kątowa | (0°, 0°)–(90°, 0°) = 90°; (0°, 89,9°)–(180°, 89,9°) = 0,2° |
| T14 | Eksport CSV dla N.I.N.A. | plik odczytany parserem z regułami N.I.N.A. (nagłówki małymi literami i bez spacji na brzegach; liczby wyrażeniem `[0-9.]+`; minus w dowolnym miejscu pola = znak ujemny) daje współrzędne zgodne co do 0,2″ i ten sam kąt; Dec −0°30′ zapisuje się jako `-00:30:00.0` i odczytuje jako −0,5° |
| T15 | Red Mode | każdy token palety czerwonej ma G = 0, B = 0 i pełne krycie |
| T16 | Widok sfery | az 0° → góra, 90° → lewo, 180° → dół, 270° → prawo, h = 90° → środek; M 31 z T7 leży w odległości 0,12·R od środka, nieco na prawo od pionu w dół |
| T17 | Zestaw wpisany ręcznie: teleskop 80 mm / 480 mm, mnożnik 0,8×, kamera 4144 × 2822 px, 4,63 µm | F_eff 384 mm; f/4,80; matryca 19,19 × 13,07 mm (przekątna 23,21 mm); FOV 2,862° × 1,949° (171,7′ × 117,0′); skala 2,487″/px przy binningu 1 i 4,974″/px przy binningu 2, FOV bez zmian |
| T18 | Sky-Watcher Esprit 100ED + ZWO ASI6200MM Pro wybrane z katalogu | wynik jak w T1 (3,750° × 2,502°, 1,410″/px). Zmiana ogniskowej w profilu pokazuje „zmienione względem katalogu” i nie zmienia wpisu katalogu. Edycja ani usunięcie własnego wpisu katalogu nie zmienia profili, które z niego powstały; po usunięciu profil pokazuje teleskop lub kamerę jako wpis ręczny [Z26] |
| T19 | Walidacja pól (7F) | apertura 0 → błąd; rozmiar piksela 0,5 µm → błąd; mnożnik 4 → błąd; rozdzielczość 1000,5 px → błąd; ogniskowa 400 mm przy aperturze 500 mm (f/0,8) → ostrzeżenie, zapis możliwy; „3,76” i „3.76” dają 3,76 µm |
| T20 | Katalog sprzętu (6.5) | identyfikatory unikalne; wszystkie wartości w zakresach z 7F; wyliczone f/ i wymiary matrycy zgadzają się z tabelami w załączniku B po zaokrągleniu do 0,01 |

## Załącznik B. Katalog sprzętu

Zasady, rozbieżności źródeł i uwagi są w sekcji 6.5.

¹ Wartość potwierdzona tylko jednym źródłem wtórnym (agregator, baza AstroBin) albo przyjęta z modelu bliźniaczego (EOS Ra = matryca EOS R; C8 = ogniskowa EdgeHD 8). Sprawdź ją na stronie producenta przed wydaniem.

**Teleskopy** (ogniskowa natywna, bez reduktora; f/ wyliczone). Kolumna „Typ” odpowiada polu `design`: refraktor → `refractor`, Newton → `newtonian`, SCT → `sct`, RASA → `rasa`, Ritchey-Chrétien → `ritchey_chretien`, obiektyw → `camera_lens`.

| Marka | Model | Typ | Apertura [mm] | Ogniskowa [mm] | f/ |
|---|---|---|---|---|---|
| William Optics | RedCat 51 | refraktor | 51 | 250 | 4,90 |
| William Optics | RedCat 61 | refraktor | 61 | 300 | 4,92 |
| William Optics | RedCat 71 | refraktor | 71 | 350 | 4,93 |
| William Optics | Zenithstar 61 II | refraktor | 61 | 360 | 5,90 |
| William Optics | Zenithstar 73 III | refraktor | 73 | 430 | 5,89 |
| William Optics | GT81 IV¹ | refraktor | 81 | 478 | 5,90 |
| William Optics | FLT 91 | refraktor | 91 | 540 | 5,93 |
| Sky-Watcher | Evostar 72ED¹ | refraktor | 72 | 420 | 5,83 |
| Sky-Watcher | Evostar 80ED¹ | refraktor | 80 | 600 | 7,50 |
| Sky-Watcher | Evostar 100ED | refraktor | 100 | 900 | 9,00 |
| Sky-Watcher | Esprit 80ED¹ | refraktor | 80 | 400 | 5,00 |
| Sky-Watcher | Esprit 100ED¹ | refraktor | 100 | 550 | 5,50 |
| Sky-Watcher | Esprit 120ED | refraktor | 120 | 840 | 7,00 |
| Sky-Watcher | Esprit 150ED¹ | refraktor | 150 | 1050 | 7,00 |
| Sky-Watcher | Explorer 130PDS | Newton | 130 | 650 | 5,00 |
| Sky-Watcher | Explorer 150PDS | Newton | 150 | 750 | 5,00 |
| Sky-Watcher | Explorer 200PDS | Newton | 200 | 1000 | 5,00 |
| Sky-Watcher | Quattro 200P | Newton | 200 | 800 | 4,00 |
| Askar | FRA400 | refraktor | 72 | 400 | 5,56 |
| Askar | FRA500 | refraktor | 90 | 500 | 5,56 |
| Askar | FRA600 | refraktor | 108 | 600 | 5,56 |
| Celestron | RASA 8 | RASA | 203 | 400 | 1,97 |
| Celestron | RASA 11 | RASA | 279 | 620 | 2,22 |
| Celestron | C8¹ | SCT | 203 | 2032 | 10,01 |
| Celestron | EdgeHD 8¹ | SCT | 203 | 2032 | 10,01 |
| Celestron | EdgeHD 11¹ | SCT | 279 | 2800 | 10,04 |
| Takahashi | FSQ-85ED (EDX/EDP) | refraktor | 85 | 450 | 5,29 |
| Takahashi | FSQ-106EDX4 | refraktor | 106 | 530 | 5,00 |
| Takahashi | Epsilon-130D¹ | Newton (astrograf) | 130 | 430 | 3,31 |
| GSO | RC 6" | Ritchey-Chrétien | 152 | 1370 | 9,01 |
| GSO | RC 8"¹ | Ritchey-Chrétien | 203 | 1624 | 8,00 |
| Samyang | 135 mm f/2 | obiektyw | 67,5 | 135 | 2,00 |

**Kamery:**

| Marka | Model | Matryca | Typ | Rozdzielczość [px] | Piksel [µm] | Wymiary matrycy [mm] |
|---|---|---|---|---|---|---|
| ZWO | ASI2600MC Pro | IMX571 | OSC | 6248 × 4176 | 3,76 | 23,49 × 15,70 |
| ZWO | ASI2600MM Pro | IMX571 | mono | 6248 × 4176 | 3,76 | 23,49 × 15,70 |
| ZWO | ASI533MC Pro | IMX533 | OSC | 3008 × 3008 | 3,76 | 11,31 × 11,31 |
| ZWO | ASI533MM Pro | IMX533 | mono | 3008 × 3008 | 3,76 | 11,31 × 11,31 |
| ZWO | ASI294MC Pro | IMX294 | OSC | 4144 × 2822 | 4,63 | 19,19 × 13,07 |
| ZWO | ASI183MC Pro | IMX183 | OSC | 5496 × 3672 | 2,40 | 13,19 × 8,81 |
| ZWO | ASI183MM Pro | IMX183 | mono | 5496 × 3672 | 2,40 | 13,19 × 8,81 |
| ZWO | ASI1600MM Pro | MN34230 | mono | 4656 × 3520 | 3,80 | 17,69 × 13,38 |
| ZWO | ASI6200MC Pro | IMX455 | OSC | 9576 × 6388 | 3,76 | 36,01 × 24,02 |
| ZWO | ASI6200MM Pro | IMX455 | mono | 9576 × 6388 | 3,76 | 36,01 × 24,02 |
| ZWO | ASI071MC Pro | IMX071 | OSC | 4944 × 3284 | 4,78 | 23,63 × 15,70 |
| ZWO | ASI585MC Pro | IMX585 | OSC | 3840 × 2160 | 2,90 | 11,14 × 6,26 |
| ZWO | ASI2400MC Pro¹ | IMX410 | OSC | 6072 × 4042 | 5,94 | 36,07 × 24,01 |
| Player One | Ares-C Pro | IMX533 | OSC | 3008 × 3008 | 3,76 | 11,31 × 11,31 |
| Player One | Ares-M Pro | IMX533 | mono | 3008 × 3008 | 3,76 | 11,31 × 11,31 |
| Player One | Poseidon-C Pro | IMX571 | OSC | 6252 × 4176 | 3,76 | 23,51 × 15,70 |
| Player One | Poseidon-M Pro | IMX571 | mono | 6252 × 4176 | 3,76 | 23,51 × 15,70 |
| Player One | Uranus-C Pro | IMX585 | OSC | 3856 × 2180 | 2,90 | 11,18 × 6,32 |
| QHYCCD | QHY268C | IMX571 | OSC | 6252 × 4176 | 3,76 | 23,51 × 15,70 |
| QHYCCD | QHY268M | IMX571 | mono | 6252 × 4176 | 3,76 | 23,51 × 15,70 |
| QHYCCD | QHY533C | IMX533 | OSC | 3008 × 3008 | 3,76 | 11,31 × 11,31 |
| QHYCCD | QHY533M | IMX533 | mono | 3008 × 3008 | 3,76 | 11,31 × 11,31 |
| QHYCCD | QHY600M¹ | IMX455 | mono | 9576 × 6388 | 3,76 | 36,01 × 24,02 |
| Canon | EOS 6D | — | OSC | 5472 × 3648 | 6,54 | 35,79 × 23,86 |
| Canon | EOS R / EOS Ra¹ | — | OSC | 6720 × 4480 | 5,36 | 36,02 × 24,01 |
| Nikon | Z6 II | — | OSC | 6048 × 4024 | 5,94 | 35,93 × 23,90 |
| Sony | A7 III | — | OSC | 6000 × 4000 | 5,93 | 35,58 × 23,72 |
