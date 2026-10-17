# obliczenia-w-tle — Obliczenia w Web Workerze z pamięcią podręczną

## Cel
Widoczność całego katalogu liczy się w tle (Web Worker), więc interfejs nie zamiera. Wynik dla tych samych parametrów jest zapamiętany i nie liczy się drugi raz, a zmiana lokalizacji, horyzontu, nocy, progu, h_min albo kroku liczy od nowa.

## Przykłady
Żądanie bazowe: 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski, noc 16/17.10.2026, próg −18° z obniżaniem, h_min 30°, krok katalogu 5 min. Katalog: w P1–P2 cały katalog aplikacji, od P3 pięć obiektów z T9 (M 31, NGC 7000, IC 1396, M 42, M 45), bo działanie pamięci nie zależy od liczby obiektów.

P1: Przekazanie całego katalogu (16 516 obiektów) → odpowiedź „gotowy” z liczbą 16 516.

P2: Cały katalog, żądanie bazowe nr 1 → odpowiedź nr 1, policzona (nie z pamięci), z wynikiem dla 16 516 obiektów; M 31 ma 9 h 39 min (±5 min). [AC1]

P3: Pięć obiektów z T9: żądanie bazowe nr 1, a potem to samo jako nr 2 → odpowiedź nr 1 policzona, odpowiedź nr 2 z pamięci z identycznym wynikiem; liczenie odbyło się tylko raz. [AC7]

P4: Każda z tych zmian osobno daje nowe liczenie: szerokość 52,0° → 52,5°; długość 19,0° → 20,0°; wysokość 150 → 300 m; strefa Europe/Warsaw → Europe/London; horyzont płaski → demonstracyjny; noc 16.10 → 17.10; próg −18° → −15°; obniżanie włączone → wyłączone; h_min 30° → 20°; krok 5 → 1 min. [AC7]

P5: Te same punkty horyzontu przekazane jako nowa lista albo ta sama lokalizacja pod inną nazwą → wynik z pamięci.

P6: Zmiana minimum godzin (3 → 2 h), zakresu „Pasuje do kadru”, progów Księżyca, seeingu, kroku wykresu nocy, aktywnego zestawu albo kursora czasu daje to samo żądanie → bez ponownego liczenia.

P7: Noce 16.10 → 17.10 → 16.10: trzecie żądanie jest z pamięci. Noc D i noc z 15. dnia miesiąca są pamiętane osobno i obie są potem dostępne bez liczenia.

P8: Odpowiedź niesie stan nocy: 21/22.06.2026 na 52,0°N próg −12° obniżony z −18° i okno 23:15–02:16 CEST (±1 min); na 54,83°N „brak okna przy progu −12°”. [T6]

P9: Klient w wątku głównym wysyła żądanie nr 1 (noc 16.10), potem nr 2 (noc 17.10). Odpowiedź nr 1 przychodzi już po wysłaniu nr 2 → jest pomijana, a przyjęta zostaje odpowiedź nr 2.

P10: Ponowne przekazanie katalogu czyści pamięć: kolejne żądanie bazowe liczy się od nowa.

P11: Żądanie wysłane przed przekazaniem katalogu → odpowiedź „błąd” z tym samym numerem i komunikatem „Katalog nie jest wczytany”; Worker przyjmuje dalsze komunikaty.

## Styk z resztą
- `src/workers/catalogEngine.ts`: czysty silnik „komunikat → odpowiedź” z pamięcią podręczną, liczy przez `services/catalogNight.ts`. Klucz: szerokość, długość, wysokość n.p.m., strefa czasowa, skrót horyzontu (z punktów, nie z nazwy lokalizacji), noc D, próg i obniżanie, h_min, krok katalogu.
- `src/workers/catalog.worker.ts`: cienki adapter (`onmessage` → silnik → `postMessage`) bez własnej logiki. Testy sprawdzają silnik bezpośrednio.
- `src/workers/catalogClient.ts` (wątek główny): tworzy Worker, numeruje żądania i przyjmuje tylko odpowiedź na ostatnie. W testach zamiast Workera działa atrapa z `postMessage`.
- Typy komunikatów (np. `src/workers/catalogMessages.ts`): „katalog” (uid i współrzędne J2000 obiektów), „gotowy”, „licz” (numer żądania i parametry), „wynik” (numer, czy z pamięci, stan nocy, wyniki w kolejności obiektów), „błąd”.
- Funkcja budująca żądanie ze stanu aplikacji (lokalizacja, noc D, `PlanningSettings`). Używa jej zakładka Katalog.

## Poza zakresem
- Kolory rekomendacji, filtry i sortowanie: działają w wątku głównym na wynikach Workera.
- Przerywanie liczenia w toku: starsze żądanie liczy się do końca, pomijany jest tylko jego wynik.
- Limit pamięci podręcznej i zapis wyników między sesjami.

## Pytania
- Do klucza dodałem strefę czasową: noc D (od południa do południa) zależy od strefy, a 7A mówi ogólnie „lokalizacja”.
- Pamięć nie ma limitu (rzędu kilku MB na noc). Czy ograniczyć ją, np. do 8 ostatnich wyników?
- Worker dostaje tylko uid i współrzędne obiektów; pozostałe dane katalogu zostają w wątku głównym.
- Komunikat błędu z P11 to moja propozycja.
