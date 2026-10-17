# edytor-parametrow — Edytor parametrów planowania w Ustawieniach

## Cel
W Ustawieniach, w sekcji „Parametry planowania”, użytkownik zmienia wszystkie parametry planowania, widzi błędy przy polach, zapisuje zmiany albo wraca do wartości domyślnych.

## Przykłady
P1: Bez zapisanych zmian sekcja pokazuje wartości domyślne: próg ciemności −18°; obniżanie progu zaznaczone; h_min „30”; minimum „3”; krok katalogu „5”; krok wykresu nocy „1”; seeing „2,5”; „Pasuje do kadru” od „25” do „80” %; Księżyc pod horyzontem „80” %; L/R/G/B/OSC zielony poniżej „15” %, żółty poniżej „50” % i od „90”°; mgławice refleksyjne i ciemne zielony poniżej „15” %; Ha/SII zielony od „50”°, żółty od „25”°; OIII/DualBand zielony od „70”° i poniżej „75” %, żółty od „40”°.

P2: Próg ciemności wybiera się z listy: −18°, −15°, −12°. Obniżanie progu to pole wyboru.

P3: Przecinek i kropka są równoważne: seeing „3,5” i „3.5” → 3,5″; minimum „2,5” → 2,5 h.

P4: Procenty zapisują się jako części całości: „15” → 0,15; „15,5” → 0,155; kadr od „20” do „90” → 0,2–0,9.

P5: h_min puste albo „abc” → przy polu komunikat „h_min: wpisz liczbę”, a „Zapisz zmiany” jest nieaktywny.

P6: h_min „95” → „h_min: dozwolony zakres 0–90°”; kadr od „80” do „25” → „Pasuje do kadru: dolna granica musi być mniejsza od górnej”. Zapis jest zablokowany. Zakresy i komunikaty są takie same jak w funkcji „Parametry planowania”.

P7: h_min „25” i „Zapisz zmiany” → „Zapisano parametry.”. Po ponownym otwarciu aplikacji pole pokazuje „25”, a zakładka Noc podpisuje „h_min 25°”.

P8: Zmiana bez zapisu → napis „Niezapisane zmiany”; „Odrzuć zmiany” wraca do zapisanych wartości.

P9: „Przywróć domyślne” przy zapisanym h_min 25 → formularz pokazuje wartości domyślne (h_min „30”) jako niezapisane zmiany; zapisują się dopiero po „Zapisz zmiany”. Gdy formularz ma już same wartości domyślne, przycisk jest nieaktywny.

P10: Zapis się nie udaje (baza przeglądarki niedostępna) → komunikat „Nie udało się zapisać: …” z przyczyną, a formularz zachowuje wpisane wartości.

## Styk z resztą
- `src/features/settings/SettingsTab.tsx`: nowa sekcja „Parametry planowania” pod lokalizacjami (komponent np. `PlanningSettingsEditor.tsx`).
- Model formularza jako czyste funkcje (np. `src/features/settings/planningSettingsForm.ts`): parametry → tekst pól (części całości jako procenty) oraz tekst → parametry albo lista błędów. Liczby czyta `parseDecimal` z `services/equipment.ts`.
- Zakresy i komunikaty: `validatePlanningSettings` z `services/planningSettings.ts`. Zapis przez akcję w `plannerStore` (IndexedDB, `parametry-planowania`); wartości domyślne z `DEFAULT_PLANNING_SETTINGS`.
- Wygląd i zachowanie jak w edytorze lokalizacji: klasy `control` i `button` (co najmniej 44 px), przyciski „Zapisz zmiany” i „Odrzuć zmiany”.

## Poza zakresem
- Osobne parametry dla lokalizacji albo zestawu.
- Eksport i import parametrów (kopia zapasowa, 7E).
- Podgląd skutków zmiany przed zapisem.
- Edycja sprzętu (7F).

## Pytania
- „Przywróć domyślne” tylko wypełnia formularz i wymaga „Zapisz zmiany”, tak jak reszta edytora. Czy ma zapisywać od razu?
- Oświetlenie, udział czasu i zakres kadru pokazuję w procentach, choć zapisują się jako części całości.
- Seeing można edytować już teraz, choć używa go dopiero Kadr (etap 5).
- Teksty „Zapisano parametry.” i „wpisz liczbę” to moja propozycja, wzorowana na edytorze lokalizacji.
