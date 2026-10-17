# filtry-katalogu — Filtry katalogu

## Cel
Użytkownik zawęża katalog filtrami: katalog i typ (wiele naraz), gwiazdozbiór, jasność z opcją „pokaż obiekty bez jasności”, rozmiar, „Widoczne w wybraną noc” i „Pasuje do kadru” aktywnego zestawu.

## Przykłady
Jeśli nie napisano inaczej: obiekty z listy „Klasyki” (26), wyniki widoczności z nocy 16/17.10.2026 (52,0°N, 19,0°E, 150 m, horyzont płaski, próg −18°, h_min 30°, krok 5 min), zestaw „Mój zestaw”, parametry domyślne.

P1: Żaden filtr nie jest włączony (stan domyślny, „pokaż obiekty bez jasności” zaznaczone) → przechodzą wszystkie obiekty: 26 z „Klasyki”, 16 516 z całego katalogu. Pusty wybór katalogów albo typów też niczego nie ogranicza.

P2: „Widoczne w wybraną noc” przy minimum 3 h → odrzuca M 42 (2 h 03 min), przyjmuje M 31, NGC 7000, IC 1396 i M 45. Przy minimum 1,5 h przyjmuje też M 42. [AC2]

P3: Granica włącznie: przy minimum 3 h obiekt ze 180 min przechodzi, ze 179 min nie. Obiekt bez wyniku widoczności (stan „brak okna” albo wynik jeszcze się liczy) nie przechodzi.

P4: Jasność 0–10 mag z włączoną opcją „pokaż obiekty bez jasności” nie ukrywa LDN 1235, który nie ma jasności [AC3]. Po wyłączeniu opcji LDN 1235 znika.

P5: Jasność 5–7 mag, opcja wyłączona → przechodzą dokładnie M 33 (5,79), M 81 (6,92), IC 1805 i IC 1848 (6,5). Jasność 4–6 mag → M 42 (dokładnie 4) przechodzi, bo granice są włącznie.

P6: Cały katalog, jasność 0–10 mag: z włączoną opcją zostają wszystkie 12 319 obiektów bez jasności, po wyłączeniu nie zostaje żaden z nich.

P7: Katalog Sh2 → 10 obiektów, bo liczy się każde oznaczenie, nie tylko główne: Sh2-155, Sh2-129, vdB 141 (Sh2-136), Simeis 147 (Sh2-240), IC 1396 (Sh2-131), IC 1805, IC 1848, NGC 7635, NGC 281 i NGC 6888. NGC 7000 i M 42 nie przechodzą.

P8: Katalogi M i LDN naraz (w obrębie jednego filtra obowiązuje „lub”) → 9 obiektów: M 31, M 42, M 45, M 33, M 101, M 81, M 1, LDN 1251, LDN 1235.

P9: Typ „mgławica ciemna” → LDN 1251, LDN 1235, B 33; w całym katalogu 2137 obiektów. Ten typ razem z gwiazdozbiorem Cep (różne filtry łączą się przez „i”) → LDN 1251 i LDN 1235.

P10: Gwiazdozbiór Cep → 7 obiektów: vdB 141, vdB 152, Sh2-155, Sh2-129, LDN 1251, LDN 1235, IC 1396.

P11: Rozmiar 100–180′ (wielka oś, granice włącznie) wśród M 31, M 42, NGC 7000, NGC 6960 i Simeis 147 → przechodzą M 31 (177,83′), NGC 7000 (120′) i Simeis 147 (180′); odpadają NGC 6960 (210′) i M 42 (90′). Cały katalog, rozmiar 0–10 000′ → odpadają dokładnie 573 obiekty bez rozmiaru.

P12: „Pasuje do kadru”, Mój zestaw (krótszy bok 64,8′, zakres 16,2′–51,84′) → przechodzą NGC 6888 (20′), M 81 (21,63′), M 101 (23,99′) i Sh2-155 (50′); odpadają NGC 7635 (15′), M 33 (62,09′), M 31 (177,83′) i M 1 (8′). [Z21]

P13: Ten sam filtr po zmianie zestawu na RedCat 51 + ASI2600MC Pro (zakres 53,96′–172,7′) → NGC 7000 (120′) zaczyna pasować, a Sh2-155 (50′) i M 31 (177,83′) nie pasują.

P14: Zakres „Pasuje do kadru” zmieniony w parametrach na 25–100% → dla Mojego zestawu pasuje też M 33 (62,09′). W całym katalogu ten filtr zawsze pomija 573 obiekty bez rozmiaru.

## Styk z resztą
- `src/services/catalogFilters.ts`: czysta funkcja: obiekty, stan filtrów, wyniki nocy D z Workera, parametry (minimum godzin, `fitRange`) i aktywny zestaw → obiekty, które przechodzą, w kolejności wejścia. Do tego stała ze stanem domyślnym filtrów.
- Kadr: `computeOptics` z `astroMath.ts` (krótszy bok FOV w arcmin) i `fitRange` z `parametry-planowania`.
- Dane obiektu: `designations` (wszystkie oznaczenia), `type`, `constellation`, `magV`, `sizeMajorArcmin`; wyniki widoczności z `widocznosc-katalogu`.
- W tym samym pliku `polecane-na-miesiac` dołoży filtr „Polecane na miesiąc”.

## Poza zakresem
- Panel filtrów i interfejs (`zakladka-katalog`), sortowanie, zapamiętywanie filtrów między sesjami.
- Wyszukiwanie po nazwie, jasność powierzchniowa, jasność B i inne pola jasności (decyzja z 17.10: tylko `magV`).

## Pytania
- Filtr katalogu bierze pod uwagę wszystkie oznaczenia obiektu (IC 1396 przechodzi jako Sh2-131), nie tylko główne.
- Rozmiar to wielka oś. Przy filtrze rozmiaru obiekty bez rozmiaru odpadają; 7A mówi to wprost tylko o „Pasuje do kadru”.
- Wszystkie granice są włącznie: jasność, rozmiar, minimum godzin i „Pasuje do kadru”.
- Gwiazdozbiór wybiera się jeden (7A nie mówi o wielu).
- Na start wszystkie filtry są wyłączone, także „Widoczne w wybraną noc”. Czy ten filtr ma być włączony domyślnie?
