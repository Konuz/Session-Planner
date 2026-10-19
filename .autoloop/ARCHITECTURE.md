# ARCHITECTURE (mapa programu)
Krótki opis tego, z czego składa się program. Agenci czytają go przed pracą, a retro uzupełnia po każdej gotowej funkcji. Maksymalnie około jednej strony.

Planer sesji astrofotograficznych: React 19 + Vite + TypeScript (strict), stan w zustand, dane w IndexedDB (Dexie), astronomia przez astronomy-engine. Pełna specyfikacja: `prompt-astro-planner.md`.

## Pliki i moduły
- `src/services/`: czyste funkcje, bez Reacta. `astroMath.ts` to jedyne miejsce importu astronomy-engine (pilnuje linter). `visibility.ts` (noc, okno ciemności, siatka próbek, czas efektywny, górowanie), `nightChart.ts` (dane wykresu nocy), `catalogNight.ts` (widoczność całego katalogu w noc), `catalogFilters.ts`, `catalogSort.ts`, `filterAdvice.ts` (rekomendacje filtrów wg Księżyca), `planningSettings.ts`, `equipment.ts`, `location.ts`, `horizonFile.ts`, `time.ts`, `format.ts`, `catalog/` (parsery i scalanie katalogu przy budowie).
- `src/workers/`: `catalogEngine.ts` (czysty silnik z pamięcią podręczną, testowany bezpośrednio), `catalog.worker.ts` (cienki adapter), `catalogMessages.ts` (typy komunikatów i `buildCatalogRequest`), `catalogClient.ts` (strona wątku głównego).
- `src/state/plannerStore.ts`: stan aplikacji (zakładka, noc D, lokalizacje i aktywna lokalizacja, lista profili i aktywny profil, wybrany obiekt, parametry planowania). Akcje profili: `addProfile`, `duplicateProfile`, `saveProfile`, `removeProfile`, `selectProfile`.
- `src/data/`: Dexie (`db.ts`, `appDb.ts`, wersja bazy 3), `repositories.ts` (`locationRepository`, `planningSettingsRepository`, `profileRepository`, repozytoria sprzętu i katalogu użytkownika), dane wbudowane (lokalizacje, demo, sprzęt, „Klasyki”), `featuredObjects.ts` (`loadCatalog`).
- `src/features/<zakładka>/`: `catalog/`, `night/`, `settings/`, `equipment/` (na razie tylko modele `profileForm.ts` i `userEquipment.ts`, bez komponentów; zakładka „Sprzęt” to `zakladka-sprzet`). Logika widoku w plikach `*Model.ts` / `*Form.ts` (czyste funkcje), komponenty `.tsx` tylko renderują.
- `src/app/` (NavBar, TopBar; lista „Zestaw” na TopBar bierze profile ze stanu), `src/theme/` (tokeny kolorów, Red Mode), `src/ui/` (drobne hooki).
- `public/catalog/catalog.v1.json`: zbudowany katalog (≈16,5 tys. obiektów, 6,9 MB, jedna linia; nie czytać).

## Publiczne funkcje
- Widoczność: `nightRange`, `darknessWindow`, `sampleGrid`, `effectiveMinutes`, `transitMs`, `highestPoint`, `meridianFlipMs` (`visibility.ts`).
- Katalog w noc: `prepareCatalogNight` (raz na noc) → `summarizeObject` (na obiekt) / `computeCatalogNight` (całość, budżet ≤ 3 s).
- Silnik i Worker: `createCatalogEngine`, `createCatalogClient`, `buildCatalogRequest`.
- Lista: `filterCatalog` (+ `DEFAULT_CATALOG_FILTERS`, `referenceNightDate` dla „Polecane na miesiąc”), `sortCatalog`, `moonConditions` + `filterAdvice`.
- Widoki: `catalogView`, `requestsToSend`, `objectCardModel`, `nightObjectOptions`, `planningSettingsToForm` / `readPlanningSettingsForm` / `submitPlanningSettingsForm`.
- Parametry: `DEFAULT_PLANNING_SETTINGS`, `DEFAULT_MOON_RULES`, `validatePlanningSettings`, `planningSettingLabel`.
- Profile sprzętu: `activeProfileOf(state)` (aktywny profil z listy w stanie albo z `DEMO_PROFILES`; nieznane id → „Mój zestaw”, a bez niego pierwszy), `profileErrors` (pusta nazwa + błędy `validateEquipment`), `isEquipmentProfile` (strażnik kształtu przy wczytaniu), `uniqueName` („Nowy zestaw 2”, „(kopia 2)”), `newProfileId` (`profil-<uuid>`) w `equipment.ts`; `profileRepository.load(db, defaults)` / `save(db, profiles)`.
- Formularz profilu (`profileForm.ts`): `profileToForm` (profil → tekst pól), `readProfileForm` (tekst → profil albo null + lista `{field, severity, message}`), `profilePreview(form, seeingArcsec)` (teksty pl-PL F_eff, f/, matryca, FOV, skala, próbkowanie, uwaga OSC; „—” przy błędnym polu), `searchTelescopes` / `searchCameras` (lista wpisów jako parametr, „Własny”/„Własna” na początku, każde słowo w marce+modelu), `selectTelescope` / `selectCamera` (wpis → nazwa i wartości; null → wpis ręczny z tymi samymi wartościami), `formSources` / `changedFields` (oznaczenia „zmienione względem katalogu”), `reducerButtons` (z `REDUCER_PRESETS`, z zaznaczeniem).
- Własny sprzęt (`userEquipment.ts`): `equipmentLabel` (marka + model, przy pustej marce sam model; używa jej też `profileForm.ts`), `isBuiltinTelescope` / `isBuiltinCamera`, `listUserTelescopes` / `listUserCameras` (sort `localeCompare(…, 'pl')`), `saveAsMyTelescope` / `saveAsMyCamera(db, form)` (nowy wpis z pól formularza → `{spec, form}` z formularzem wskazującym wpis), `editUserTelescope` / `editUserCamera` (to samo id), `removeUserTelescope` / `removeUserCamera`, `duplicateTelescope` / `duplicateCamera` („(kopia)”, „(kopia 2)”), `READ_ONLY_MESSAGE`.
- Formatowanie pl-PL: `formatDeg`, `formatPercent`, `formatCount` (`format.ts`), `formatLocalTime`, `formatDuration` (`time.ts`), `formatDesignation` (`catalog/records.ts`).

## Dane i formaty
- `PlanningSettings`, `MoonRuleThresholds`, `ObserverLocation` w `src/types.ts` (zgodnie z sekcją 5 specyfikacji).
- Czas: znaczniki ms UTC; noc identyfikuje data lokalna wieczoru w strefie lokalizacji.
- Worker: żądanie `catalog` (uid + RA/Dec J2000) i `compute` (numer żądania + parametry nocy); odpowiedzi `ready` / `result` / `error`. Klucz pamięci: lokalizacja, skrót horyzontu, noc, próg i obniżanie, h_min, krok.
- Tabela `settings` (klucz → wartość): `planning` z parametrami, `profiles` z całą listą `EquipmentProfile[]` w kolejności użytkownika. Do localStorage (persist zustand) trafiają tylko id aktywnej lokalizacji i profilu, Red Mode, zakładka i wybrany obiekt.
- `ProfileForm`: pola liczbowe jako tekst (przecinek albo kropka; zapis bez spacji tysięcy, z przecinkiem), `telescopeSpecId`/`cameraSpecId` null = „Własny”/„Własna”.
- Własne wpisy sprzętu: tabele `userTelescopes` / `userCameras` (przez `telescopeRepository` / `cameraRepository`), `origin: 'user'`, id `teleskop-<uuid>` / `kamera-<uuid>`. Wpis z formularza: marka pusta, model = nazwa po `trim`, konstrukcja `other`, `sensorModel: null`, bez binningu i mnożnika (ogniskowa natywna).
- `ObjectNightSummary`: czas efektywny, górowanie, najwyższy punkt, przerzut, warunki Księżyca w oknie efektywnym.

## Decyzje (co i dlaczego)
- Worker liczy tylko widoczność; filtry atrybutów i sortowanie działają w wątku głównym na jego wynikach (proste, szybkie, łatwe do testowania).
- Precesja i LST liczone raz na noc / krok, nie na obiekt, żeby zmieścić się w 3 s.
- Jasność tylko `magV`; obiekty bez niej domyślnie pokazywane („pokaż obiekty bez jasności”).
- Rekomendacje filtrów liczone tylko z okna efektywnego obiektu; obiekt bez czasu efektywnego nie ma rekomendacji.
- Profile: brak wpisu → zapis 4 profili z 6.4; uszkodzony wpis → tylko poprawne profile (bez żadnego → 6.4), bez zapisu. Akcje najpierw zapisują listę w bazie, potem ustawiają stan, więc przy niedostępnej bazie lista w stanie zostaje bez zmian. Profil przechowuje kopię wartości sprzętu; kopie przez `structuredClone`. Nie usuwa się ostatniego profilu (jak lokalizacji). Aktywny profil poprawia się dopiero po wczytaniu listy.
- Formularz profilu: zakresy i ostrzeżenie o f/ z `validateEquipment` (f/ bez mnożnika); „—” tylko w wartościach zależnych od pola z błędem, ostrzeżenia nie wyłączają podglądu. Tekst bez liczby nie dostaje „zmienione”; binning i mnożnik nigdy. Nieznany `specId` → brak źródła i oznaczeń, ale zapis zachowuje `specId`. Filtry zapisywane w kolejności L…DualBand; przerzut 0–60 min dla każdego montażu. Seeing i listy wpisów przychodzą jako argumenty (model nie czyta stanu ani bazy).
- Własny sprzęt: akcje najpierw sprawdzają (pusta nazwa + błędy `validateEquipment`, tylko pola zapisywanego wpisu; ostrzeżenia nie blokują), potem zapisują; błąd to odrzucona obietnica z `Error` (komunikaty łączone „; ”). Wpis wbudowany: edycja i usunięcie → `READ_ONLY_MESSAGE`, wolno tylko duplikować. Zmiana i usunięcie wpisu nie dotykają profili (kopie wartości [Z26]); `specId` zostaje, a brak wpisu daje „Własny” bez oznaczeń.
- Testy w Node bez DOM: modele jako czyste funkcje + `renderToStaticMarkup`; lista wirtualizowana renderuje pierwszy ekran przez `initialRect`.
- Kolory tylko z tokenów (`theme/tokens.ts`, także Red Mode); typ obiektu zawsze ikoną i tekstem; bez nowych zależności (`package.json` chroniony).
