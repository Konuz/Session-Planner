# ARCHITECTURE (mapa programu)
Krótki opis tego, z czego składa się program. Agenci czytają go przed pracą, a retro uzupełnia po każdej gotowej funkcji. Maksymalnie około jednej strony.

Planer sesji astrofotograficznych: React 19 + Vite + TypeScript (strict), stan w zustand, dane w IndexedDB (Dexie), astronomia przez astronomy-engine. Pełna specyfikacja: `prompt-astro-planner.md`.

## Pliki i moduły
- `src/services/`: czyste funkcje, bez Reacta. `astroMath.ts` to jedyne miejsce importu astronomy-engine (pilnuje linter). `visibility.ts` (noc, okno ciemności, siatka próbek, czas efektywny, górowanie), `nightChart.ts` (dane wykresu nocy), `catalogNight.ts` (widoczność całego katalogu w noc), `catalogFilters.ts`, `catalogSort.ts`, `filterAdvice.ts` (rekomendacje filtrów wg Księżyca), `planningSettings.ts`, `equipment.ts`, `location.ts`, `horizonFile.ts`, `time.ts`, `format.ts`, `catalog/` (parsery i scalanie katalogu przy budowie).
- `src/workers/`: `catalogEngine.ts` (czysty silnik z pamięcią podręczną, testowany bezpośrednio), `catalog.worker.ts` (cienki adapter), `catalogMessages.ts` (typy komunikatów i `buildCatalogRequest`), `catalogClient.ts` (strona wątku głównego).
- `src/state/plannerStore.ts`: stan aplikacji (zakładka, noc D, aktywna lokalizacja i profil, wybrany obiekt, parametry planowania).
- `src/data/`: Dexie (`db.ts`, `appDb.ts`), repozytoria, dane wbudowane (lokalizacje, demo, sprzęt, „Klasyki”), `featuredObjects.ts` (`loadCatalog`).
- `src/features/<zakładka>/`: `catalog/`, `night/`, `settings/`. Logika widoku w plikach `*Model.ts` / `*Form.ts` (czyste funkcje), komponenty `.tsx` tylko renderują.
- `src/app/` (NavBar, TopBar), `src/theme/` (tokeny kolorów, Red Mode), `src/ui/` (drobne hooki).
- `public/catalog/catalog.v1.json`: zbudowany katalog (≈16,5 tys. obiektów, 6,9 MB w jednej linii; nie czytać w całości).

## Publiczne funkcje
- Widoczność: `nightRange`, `darknessWindow`, `sampleGrid`, `effectiveMinutes`, `transitMs`, `highestPoint`, `meridianFlipMs` (`visibility.ts`).
- Katalog w noc: `prepareCatalogNight` (raz na noc) → `summarizeObject` (na obiekt) / `computeCatalogNight` (całość, budżet ≤ 3 s).
- Silnik i Worker: `createCatalogEngine`, `createCatalogClient`, `buildCatalogRequest`.
- Lista: `filterCatalog` (+ `DEFAULT_CATALOG_FILTERS`, `referenceNightDate` dla „Polecane na miesiąc”), `sortCatalog`, `moonConditions` + `filterAdvice`.
- Widoki: `catalogView`, `requestsToSend`, `objectCardModel`, `nightObjectOptions`, `planningSettingsToForm` / `readPlanningSettingsForm` / `submitPlanningSettingsForm`.
- Parametry: `DEFAULT_PLANNING_SETTINGS`, `DEFAULT_MOON_RULES`, `validatePlanningSettings`, `planningSettingLabel`.
- Formatowanie pl-PL: `formatDeg`, `formatPercent`, `formatCount` (`format.ts`), `formatLocalTime`, `formatDuration` (`time.ts`), `formatDesignation` (`catalog/records.ts`).

## Dane i formaty
- `PlanningSettings`, `MoonRuleThresholds`, `ObserverLocation` w `src/types.ts` (zgodnie z sekcją 5 specyfikacji).
- Czas: znaczniki ms UTC; noc identyfikuje data lokalna wieczoru w strefie lokalizacji.
- Worker: żądanie `catalog` (uid + RA/Dec J2000) i `compute` (numer żądania + parametry nocy); odpowiedzi `ready` / `result` / `error`. Klucz pamięci: lokalizacja, skrót horyzontu, noc, próg i obniżanie, h_min, krok.
- `ObjectNightSummary`: czas efektywny, górowanie, najwyższy punkt, przerzut, warunki Księżyca w oknie efektywnym.

## Decyzje (co i dlaczego)
- Worker liczy tylko widoczność; filtry atrybutów i sortowanie działają w wątku głównym na jego wynikach (proste, szybkie, łatwe do testowania).
- Precesja i LST liczone raz na noc / krok, nie na obiekt, żeby zmieścić się w 3 s.
- Jasność tylko `magV`; obiekty bez niej domyślnie pokazywane („pokaż obiekty bez jasności”).
- Rekomendacje filtrów liczone tylko z okna efektywnego obiektu; obiekt bez czasu efektywnego nie ma rekomendacji.
- Testy w Node bez DOM: modele jako czyste funkcje + `renderToStaticMarkup`; lista wirtualizowana renderuje pierwszy ekran przez `initialRect`.
- Kolory tylko z tokenów (`theme/tokens.ts`, także Red Mode); typ obiektu zawsze ikoną i tekstem; bez nowych zależności (`package.json` chroniony).
