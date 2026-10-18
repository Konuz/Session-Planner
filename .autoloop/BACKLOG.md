# BACKLOG
Jedna funkcja to mały kawałek programu, który da się sprawdzić przykładami.
Status: do zrobienia | spec | zatwierdzona | w toku | gotowa | zatrzymana

Etap 4 specyfikacji `prompt-astro-planner.md` (sekcja 12, wiersz 4): katalog, Web Worker, filtry, rekomendacje (sekcja 7A). Kolejność wierszy = kolejność zależności.

| id | funkcja (po ludzku) | czego dotyka | status |
|----|---------------------|--------------|--------|
| parametry-planowania | Parametry planowania (`PlanningSettings`, `MoonRuleThresholds`): wartości domyślne ze specyfikacji, sprawdzanie poprawności i zapis w przeglądarce (IndexedDB). Wykres nocy bierze próg, obniżanie, krok i h_min z parametrów zamiast ze stałych | `types.ts`, `services/planningSettings.ts`, `data/db.ts`, `data/repositories.ts`, `state/plannerStore.ts`, `features/night/NightTab.tsx` | gotowa |
| widocznosc-katalogu | Widoczność całego katalogu w noc D: czas efektywny z krokiem katalogowym (5 min), górowanie, najwyższe położenie w oknie, przerzut (GEM), użyty próg ciemności albo „brak okna”. Pełny katalog liczy się w ≤ 3 s | `services/catalogNight.ts` | gotowa |
| obliczenia-w-tle | Obliczenia w Web Workerze z pamięcią podręczną: te same parametry nie liczą się drugi raz; zmiana lokalizacji, horyzontu, nocy, progu, h_min albo kroku liczy od nowa | `workers/catalogEngine.ts`, `workers/catalog.worker.ts`, typy komunikatów | gotowa |
| filtry-katalogu | Filtry: katalog (wiele), typ (wiele), gwiazdozbiór, jasność z opcją „pokaż obiekty bez jasności” (domyślnie włączona), rozmiar, „Widoczne w wybraną noc”, „Pasuje do kadru” aktywnego zestawu | `services/catalogFilters.ts` | gotowa |
| polecane-na-miesiac | Filtr „Polecane na miesiąc” [Z22]: obiekt widoczny (≥ `minEffectiveHours`) w nocy z 15. dnia miesiąca nocy D | `services/catalogFilters.ts`, druga noc z `obliczenia-w-tle` | gotowa |
| sortowanie | Sortowanie: czas efektywny (domyślnie), godzina górowania, rozmiar, jasność, dopasowanie do kadru | `services/catalogSort.ts` | gotowa |
| rekomendacje-filtrow | Rekomendacje filtrów (zielony, żółty, czerwony) według tabeli z 7A i progów `MoonRuleThresholds`, tylko dla filtrów aktywnego profilu; warunki Księżyca liczone w oknie efektywnym obiektu | `services/filterAdvice.ts`, rozszerzenie `services/catalogNight.ts` | gotowa |
| karta-obiektu | Karta obiektu z polami z 7A: oznaczenie główne i pozostałe, nazwa, typ (ikona + etykieta), Alt/Az w kursorze, maks. wysokość i górowanie, przerzut (GEM), czas efektywny z progiem, separacja od Księżyca (w kursorze i minimalna), odznaki filtrów | `features/catalog/` (model karty i komponent) | gotowa |
| zakladka-katalog | Zakładka „Katalog” (pierwsza w nawigacji): panel filtrów i sortowania, lista wirtualizowana, liczba wyników, komunikat o obniżonym progu albo braku okna [T6]; liczenie w Workerze bez blokowania interfejsu | `features/catalog/`, `app/NavBar.tsx`, `App.tsx`, `state/plannerStore.ts` | w toku |
| wybor-obiektu | Z karty w katalogu można otworzyć obiekt na wykresie nocy; zakładka Noc pokazuje każdy obiekt z katalogu, a nie tylko z listy „Klasyki” | `features/night/NightTab.tsx`, `data/featuredObjects.ts`, `state/plannerStore.ts` | zatwierdzona |
| edytor-parametrow | Ustawienia → „Parametry planowania”: edycja progu ciemności, obniżania, h_min, minimum godzin, kroków, seeingu, zakresu „Pasuje do kadru” i progów Księżyca; komunikaty błędów, zapis, „Przywróć domyślne” | `features/settings/`, `services/planningSettings.ts` | zatwierdzona |

## Kryteria akceptacji 7A → funkcje (każde musi być przykładem P…)
1. [T9] czasy efektywne pięciu obiektów → `widocznosc-katalogu` (krok 5 min: ±5 min; krok 1 min: ±1 min).
2. Przy ustawieniach z [T9] i minimum 3 h filtr „Widoczne” odrzuca M 42, a M 31, NGC 7000, IC 1396 i M 45 przyjmuje → `filtry-katalogu`.
3. Filtr jasności 0–10 mag z włączoną opcją „pokaż obiekty bez jasności” nie ukrywa LDN 1235 → `filtry-katalogu`.
4. [T6] noc 21/22.06.2026: próg spada do −12°, okno 23:15–02:16 CEST; na 54,83°N „brak okna” → `widocznosc-katalogu`; komunikat w interfejsie → `zakladka-katalog`.
5. Noc 16/17.10.2026, M 31: Księżyc zachodzi o 20:25 CEST, jest nad horyzontem przez ok. 8% okna, więc wszystkie filtry zielone → `rekomendacje-filtrow`.
6. Noc 24/25.10.2026, M 31: Księżyc świeci całą noc przy oświetleniu ≈ 98%, więc L, R, G, B czerwone → `rekomendacje-filtrow`.
7. Wydajność (7A): pełny katalog w ≤ 3 s → `widocznosc-katalogu` (świadomie przykład z pomiarem czasu, bo wymaga go 7A); pamięć podręczna z kluczem „lokalizacja, skrót horyzontu, noc, próg, h_min” → `obliczenia-w-tle`; bez blokowania interfejsu → `zakladka-katalog` (sprawdzane też ręcznie w przeglądarce).

## Decyzje użytkownika (17.10.2026)
- **Jasność:** tylko `magV`. Obiekty bez `magV` (12 319 z 16 516) są „bez jasności”; bez jasności B i bez przebudowy katalogu.
- **Edytor parametrów planowania** w Ustawieniach wchodzi do etapu 4 (`edytor-parametrow`).
- **Księżyc w rekomendacjach:** liczy się tylko czas widoczności obiektu. „Okno efektywne” = próbki okna ciemności, w których ok(tᵢ) z sekcji 4. Z niego: udział czasu z Księżycem pod horyzontem, oświetlenie w środku tego okna, najmniejsza separacja. Obiekt bez czasu efektywnego nie ma rekomendacji.

## Wskazówki techniczne dla agentów
- **Źródła w `prompt-astro-planner.md`:** 7A (całość), sekcja 4 (definicja widoczności, górowanie analityczne), sekcja 5 (`PlanningSettings`, `MoonRuleThresholds` z wartościami domyślnymi w komentarzach), Z6–Z8, Z12, Z21, Z22, sekcja 8 (kolory typów, Red Mode), sekcja 9 (zakładki), sekcja 11 (struktura kodu), załącznik A (T4–T7, T9, T11).
- **Testy funkcji:** `tests/features/<id>/*.test.ts(x)`; Vitest w Node, bez DOM i bez prawdziwego Workera. Regresja przy każdej próbie to `tsc --noEmit`, `vite build`, `eslint --max-warnings 0` i wszystkie pozostałe testy.
- **Bez nowych zależności:** `package.json` i `package-lock.json` są chronione. `@tanstack/react-virtual` 3.14.13 jest już zainstalowany [Z16].
- **Testy interfejsu:** logika jako czyste funkcje (model widoku, zmiany stanu filtrów) plus `renderToStaticMarkup` z `react-dom/server`. Lista wirtualizowana nie ma układu w Node; pierwszy ekran można wyrenderować dzięki `initialRect` wirtualizatora.
- **Web Worker:** cienki adapter `src/workers/catalog.worker.ts` nad czystym silnikiem (żądanie → odpowiedź z pamięcią podręczną), który testuje się bezpośrednio. Zwykły `postMessage` z typowanymi komunikatami (sekcja 3).
- **TypeScript:** `strict`, `noUnusedLocals`, `noUnusedParameters`, więc parametry zaślepek mają nazwy z `_` na początku. Bez `any`, bez `TODO`.
- **Zasady projektu:** czyste funkcje w `src/services/` (sekcja 11); astronomy-engine tylko przez `src/services/astroMath.ts` (pilnuje tego linter); interfejs po polsku, formaty pl-PL (przecinek dziesiętny, znak „−”, zegar 24 h ze skrótem strefy: `formatDeg`, `formatPercent`, `formatLocalTime`, `formatDuration`); kolory tylko z tokenów (`src/theme/tokens.ts`); typ obiektu zawsze także ikoną i tekstem (sekcja 8); cele dotykowe ≥ 44 px.
- **Istniejące API do użycia:**
  - `services/visibility.ts`: `nightRange`, `nightSun`, `darknessWindow`, `sampleGrid` (LST raz na krok), `effectiveMinutes`, `transitMs`, `highestPoint`, `meridianFlipMs`;
  - `services/astroMath.ts`: `precessionMatrix`, `toEquatorOfDate`, `horizontalFromHourAngle`, `horizontalAt`, `horizonAltitudeDeg`, `angularSeparationDeg`, `bodyPosition`, `moonIlluminatedFraction`, `computeOptics`;
  - `services/nightChart.ts`: `darknessNote` (teksty komunikatów T6), `cursorReadout`;
  - `data/featuredObjects.ts`: `loadCatalog`, `featuredObjects`, `selectFeatured`; `services/catalog/records.ts`: `formatDesignation`;
  - `state/plannerStore.ts`: stałe `NIGHT_SETTINGS` i `MIN_ALTITUDE_DEG` do zastąpienia parametrami planowania; `PROFILES` (profile z 6.4).
- **Szkic architektury** (proponowane nazwy; spec może je doprecyzować, ale kolejne funkcje mają ich używać):
  - `src/types.ts`: `PlanningSettings`, `MoonRuleThresholds` dokładnie jak w sekcji 5;
  - `src/services/planningSettings.ts`: `DEFAULT_MOON_RULES`, `DEFAULT_PLANNING_SETTINGS`, sprawdzanie poprawności;
  - `src/services/catalogNight.ts`: przygotowanie nocy raz (okno ciemności, siatka co `catalogStepMin`, macierz precesji raz na noc, później także Księżyc na każdy krok) i podsumowanie każdego obiektu; funkcja dla całego katalogu. `rekomendacje-filtrow` rozszerza to samo podsumowanie, więc budżet 3 s obejmuje całość;
  - `src/workers/catalogEngine.ts`, `src/workers/catalog.worker.ts` i typy komunikatów; klucz pamięci: szerokość, długość, wysokość n.p.m., skrót horyzontu, noc, próg i obniżanie, h_min, krok;
  - `src/services/catalogFilters.ts`, `src/services/catalogSort.ts`, `src/services/filterAdvice.ts`;
  - `src/features/catalog/`: model karty, karta, lista wirtualizowana, panel filtrów, zakładka;
  - Worker liczy widoczność; filtry atrybutów i sortowanie mogą działać w wątku głównym na wynikach Workera.
- **Poza etapem 4:** kadr i Aladin (7B), edytor sprzętu (7F), widok sfery (7D), projekty i eksport (7E), PWA i offline, import katalogu użytkownika (6.3).

## Fakty do przykładów
Lokalizacja wektorów: 52,0°N, 19,0°E, 150 m, `Europe/Warsaw`, horyzont płaski. Wartości z `public/catalog/catalog.v1.json` (spec-writer nie musi czytać tego pliku: ma 6,9 MB w jednej linii) i z astronomy-engine 2.1.19.

**Lista „Klasyki”** („—” = brak wartości w katalogu):

| obiekt | uid | typ | V [mag] | rozmiar [′] | gwiazdozbiór | wszystkie oznaczenia | nazwy zwyczajowe |
|---|---|---|---|---|---|---|---|
| vdB 141 | Sh2-136 | reflection_nebula | — | 5 | Cep | vdB 141, Sh2-136 | — |
| vdB 152 | vdB152 | reflection_nebula | — | 13,6 | Cep | vdB 152 | — |
| Sh2-155 | C9 | emission_nebula | — | 50 × 30 | Cep | Sh2-155, LBN 529, C 9 | Cave Nebula |
| Sh2-129 | Sh2-129 | emission_nebula | — | 140 | Cep | Sh2-129 | — |
| Simeis 147 | Sh2-240 | supernova_remnant | — | 180 | Tau | Simeis 147, Sh2-240, G180.0-01.7 | S147 |
| NGC 6960 | NGC6960 | supernova_remnant | — | 210 × 160 | Cyg | NGC 6960, LBN 191 | Veil Nebula; Filamentary Nebula; Western Veil |
| NGC 6992 | NGC6992 | supernova_remnant | — | 60 × 8 | Cyg | NGC 6992 | Eastern Veil; Network Nebula |
| LDN 1251 | LDN1251 | dark_nebula | — | 29,9 | Cep | LDN 1251 | — |
| LDN 1235 | LDN1235 | dark_nebula | — | 13,02 | Cep | LDN 1235 | — |
| NGC 7000 | NGC7000 | emission_nebula | — | 120 × 30 | Cyg | NGC 7000, LBN 373 | North America Nebula |
| IC 1396 | IC1396 | cluster_nebula | — | 14 × 4 (rozmiar gromady z OpenNGC: nie używaj w przykładach rozmiaru i kadru) | Cep | IC 1396, Sh2-131 | — |
| M 31 | NGC224 | galaxy | 3,44 | 177,83 × 69,66 | And | M 31, NGC 224 | Andromeda Galaxy |
| M 42 | NGC1976 | cluster_nebula | 4 | 90 × 60 | Ori | M 42, NGC 1976, LBN 974 | Great Orion Nebula; Orion Nebula |
| M 45 | Mel22 | open_cluster | 1,2 | 150 × 150 | Tau | M 45, Mel 22 | Pleiades |
| M 33 | NGC598 | galaxy | 5,79 | 62,09 × 36,73 | Tri | M 33, NGC 598 | Triangulum Galaxy; Triangulum Pinwheel |
| M 101 | NGC5457 | galaxy | 7,9 | 23,99 × 23,07 | UMa | M 101, M 102, NGC 5457 | — |
| M 81 | NGC3031 | galaxy | 6,92 | 21,63 × 11,25 | UMa | M 81, NGC 3031 | Bode's Galaxy |
| M 1 | NGC1952 | supernova_remnant | 8,4 | 8 × 4 | Tau | M 1, NGC 1952, LBN 833, G184.6-05.8 | Crab Nebula; 3C144; SN1054 |
| IC 1805 | IC1805 | cluster_nebula | 6,5 | 60 × 60 | Cas | IC 1805, Sh2-190, LBN 654 | — |
| IC 1848 | IC1848 | cluster_nebula | 6,5 | 40 × 10 | Cas | IC 1848, Sh2-199, LBN 667 | — |
| NGC 7635 | NGC7635 | emission_nebula | — | 15 × 8 | Cas | NGC 7635, Sh2-162, LBN 548 | Bubble Nebula |
| NGC 281 | NGC281 | emission_nebula | — | 35 × 30 | Cas | NGC 281, IC 11, Sh2-184, LBN 616 | — |
| NGC 6888 | NGC6888 | emission_nebula | — | 20 × 10 | Cyg | NGC 6888, Sh2-105, LBN 203 | Crescent Nebula |
| B 33 | B33 | dark_nebula | — | 6 × 4 | Ori | B 33 | Horsehead Nebula |
| NGC 1499 | NGC1499 | emission_nebula | — | 160 × 40 | Per | NGC 1499, LBN 756 | California Nebula |
| NGC 2237 | NGC2237 | emission_nebula | — | 80 × 50 | Mon | NGC 2237 | Rosette A |

**Cały katalog:** 16 516 obiektów, 88 gwiazdozbiorów; bez `magV` 12 319 (w tym 7 184 z 10 522 galaktyk i wszystkie 2 137 mgławic ciemnych); bez rozmiaru 573.

**„Pasuje do kadru” [Z21]** (25–80% krótszego boku kadru):
- Mój zestaw (Newton 150/600 + Ares-M Pro): kadr 1,080° × 1,080°, krótszy bok 64,8′, zakres 16,2′–51,84′. Pasują: NGC 6888 (20′), M 81 (21,63′), M 101 (23,99′), Sh2-155 (50′). Nie pasują: NGC 7635 (15′), M 33 (62,09′), M 31, M 1.
- RedCat 51 + ASI2600MC Pro: krótszy bok 3,597° = 215,8′, zakres 53,96′–172,7′ (M 31: 177,83′, nie pasuje; NGC 7000: 120′, pasuje).
- Newton 200/1000 + ASI533MM Pro: krótszy bok 38,9′, zakres 9,72′–31,1′.
- Esprit 100ED + ASI6200MM Pro: krótszy bok 2,502° = 150,1′, zakres 37,5′–120,1′.

**Noc 16/17.10.2026** (T4, T7, T9):
- Okno ciemności −18°: 19:40–05:19 CEST (579 min). Księżyc zachodzi o 20:25 CEST; o 00:00 CEST oświetlenie 33,8%.
- Czas efektywny przy h_min 30° (krok 1 min; przy kroku 5 min ±5 min): M 31 9 h 39 min, IC 1396 9 h 02 min, M 45 7 h 14 min, NGC 7000 6 h 50 min, M 42 2 h 03 min.
- Górowanie: NGC 7000 20:03, IC 1396 20:42, M 31 23:46 (h 79,42°), M 45 02:50, M 42 04:38 CEST; M 101 góruje w dzień (13:04 CEST).
- Separacja od Księżyca o 00:00 CEST: M 31 112,82° (T7), NGC 7000 81,6°, IC 1396 95,6°, M 42 145,1°, M 45 146,6°.
- T11 (krok 1 min): M 42 przy h_min 20°: horyzont płaski 3 h 49 min, demonstracyjny 2 h 22 min.

**Noc 24/25.10.2026** (T5): okno −18° od 19:24 CEST do 04:32 CET; Księżyc nad horyzontem całą noc (wschód 16:28 CEST, zachód 05:29 CET), oświetlenie 98,0% o 01:00 CEST; separacja M 31–Księżyc o 01:00 CEST ok. 32,6°; górowanie M 31 23:15 CEST.

**Noc 21/22.06.2026** (T6): przy 52°N brak okna przy −18° i −15°; przy −12° okno 23:15–02:16 CEST (3 h 01 min). Na 54,83°N brak okna nawet przy −12°. Teksty z `darknessNote`: „Brak okna przy progu −18°; użyto progu −12°.” oraz „Brak okna ciemności nawet przy progu −12°.”
