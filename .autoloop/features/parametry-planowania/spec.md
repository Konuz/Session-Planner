# parametry-planowania — Parametry planowania

## Cel
Aplikacja ma jeden zestaw parametrów planowania (próg ciemności, obniżanie progu, h_min, minimum godzin, kroki próbkowania, seeing, zakres „Pasuje do kadru”, progi Księżyca) z wartościami domyślnymi ze specyfikacji. Parametry są sprawdzane, zapisują się w przeglądarce i sterują wykresem nocy zamiast stałych wpisanych w kod.

## Przykłady
P1: Pierwsze uruchomienie, nic nie zapisano → parametry domyślne: próg −18°, obniżanie progu włączone, h_min 30°, minimum 3 h czasu efektywnego, krok katalogu 5 min, krok wykresu nocy 1 min, seeing 2,5″, „Pasuje do kadru” 25–80% krótszego boku kadru. [Z6–Z9, Z21]

P2: Domyślne progi Księżyca [sekcja 5]: wszystkie filtry zielone, gdy Księżyc jest pod horyzontem przez co najmniej 80% okna; L, R, G, B, OSC: zielony przy oświetleniu poniżej 15%, żółty poniżej 50% przy separacji od 90°; mgławice refleksyjne i ciemne: zielony poniżej 15%; Ha, SII: zielony od 50°, żółty od 25°; OIII, DualBand: zielony od 70° przy oświetleniu poniżej 75%, żółty od 40°.

P3: Zapis h_min 25° i minimum 2,5 h → po ponownym otwarciu aplikacji (ta sama baza przeglądarki) h_min 25° i minimum 2,5 h, a pozostałe parametry bez zmian.

P4: Dozwolone zakresy, granice włącznie: h_min 0–90°; minimum 0,5–24 h; oba kroki to liczby całkowite 1–30 min; seeing 0,5–10″; „Pasuje do kadru” 0–100%, dolna granica mniejsza od górnej; oświetlenie i udział czasu w progach Księżyca 0–100%; separacje 0–180°. Przechodzą np. h_min 0° i 90°, krok 1 i 30 min, minimum 0,5 h.

P5: h_min 95° → błąd „h_min: dozwolony zakres 0–90°”; h_min −5° → ten sam błąd.

P6: Krok katalogu 2,5 min → błąd „Krok katalogu: wpisz liczbę całkowitą”; krok 0 min → błąd „Krok katalogu: dozwolony zakres 1–30 min”.

P7: Minimum 0 h → błąd „Minimum czasu efektywnego: dozwolony zakres 0,5–24 h”.

P8: „Pasuje do kadru” od 80% do 25% → błąd „Pasuje do kadru: dolna granica musi być mniejsza od górnej”; od 50% do 50% → ten sam błąd.

P9: Próg Księżyca z oświetleniem 120% → błąd kończący się słowami „dozwolony zakres 0–100%”; separacja 200° → błąd kończący się słowami „dozwolony zakres 0–180°”.

P10: Próba zapisu parametrów z błędem jest odrzucana, a w bazie zostają poprzednio zapisane wartości.

P11: Zapisany wpis jest uszkodzony (np. h_min zapisane jako tekst) → aplikacja używa wszystkich wartości domyślnych i działa dalej.

P12: Lokalizacja 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski; noc 21/22.06.2026; zapisany próg −15° z obniżaniem → zakładka Noc pokazuje „Brak okna przy progu −15°; użyto progu −12°.” [T6]

P13: Ta sama lokalizacja i noc, próg −18°, obniżanie wyłączone → zakładka Noc pokazuje „Brak okna ciemności przy progu −18°.”, a po wybraniu tej nocy kursor czasu staje na lokalnej północy, 00:00 CEST. Z obniżaniem włączonym kursor staje w środku okna 23:15–02:16 CEST, ok. 00:45 CEST (±1 min). [T6, 7.0]

P14: Ta sama lokalizacja, noc 16/17.10.2026, zapisane h_min 20° → zakładka Noc podpisuje czas efektywny „próg −18°, h_min 20°” (podpis jest widoczny także bez wybranego obiektu).

P15: Model wykresu nocy zbudowany z zapisanych parametrów, ta sama lokalizacja i noc: przy h_min 20° M 42 ma 3 h 49 min (±1 min) [T11]; przy kroku wykresu 10 min punkty toru obiektu są co 10 min, a przy domyślnym co 1 min.

## Styk z resztą
- `src/types.ts`: `PlanningSettings` i `MoonRuleThresholds` dokładnie jak w sekcji 5; `fitRange` jako części całości (domyślnie 0,25 i 0,8), tak jak oświetlenie w progach Księżyca.
- `src/services/planningSettings.ts`: `DEFAULT_MOON_RULES`, `DEFAULT_PLANNING_SETTINGS` i `validatePlanningSettings` (lista problemów: pole i komunikat; korzysta z niej `edytor-parametrow`).
- `src/data/db.ts`: wersja 3 bazy z tabelą `settings` (klucz `id`), parametry w jednym wpisie `planning`. `src/data/repositories.ts`: `planningSettingsRepository` (`load` zwraca zapisane albo domyślne, `save` odrzuca parametry z błędem).
- `src/state/plannerStore.ts`: stan `planningSettings`, wczytanie przy starcie obok lokalizacji (gdy baza jest niedostępna, wartości domyślne, jak przy lokalizacjach) i akcja zapisu. Stałe `NIGHT_SETTINGS` i `MIN_ALTITUDE_DEG` znikają; kursor po zmianie nocy liczy się z progu i obniżania z parametrów.
- `src/features/night/NightTab.tsx`: przekazuje parametry ze stanu wprost do modelu wykresu (`buildNightFrame`, `buildObjectTrack`, `cursorReadout`). Testy sprawdzają podpis i komunikat w wyrenderowanej zakładce, a liczby (P15) na modelu, bez wczytywania obiektu w zakładce.
- Bez zmian sygnatur używanych przez istniejące testy: `NightSettings`, `buildNightFrame`, `darknessWindow`, `effectiveMinutes`, `sampleGrid`, `darknessNote`. `PlanningSettings` ma pasować tam, gdzie dziś trafia `NightSettings`.

## Poza zakresem
- Formularz w Ustawieniach (`edytor-parametrow`).
- Użycie kroku katalogu, minimum godzin, zakresu kadru i progów Księżyca (kolejne funkcje etapu 4) oraz seeingu (Kadr, etap 5).
- Osobne parametry dla lokalizacji albo zestawu.
- Przesuwanie kursora po zmianie samych parametrów (kursor zmienia się przy zmianie nocy, 7.0).

## Pytania
- Specyfikacja nie podaje zakresów walidacji parametrów (Z25 dotyczy tylko sprzętu). Zakresy z P4 przyjąłem sam.
- `fitRange` zapisuję jako części całości (0–1), nie jako procenty; interfejs pokazuje procenty.
- Uszkodzony zapis zastępuję w całości wartościami domyślnymi, bez ratowania poprawnych pól.
- Nie sprawdzam zależności między progami Księżyca: próg żółty wyższy od zielonego jest dozwolony, wtedy stan żółty po prostu nie występuje.
