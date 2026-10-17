# sortowanie — Sortowanie listy katalogu

## Cel
Użytkownik ustawia kolejność listy katalogu według czasu efektywnego (domyślnie), godziny górowania, rozmiaru, jasności albo dopasowania do kadru aktywnego zestawu.

## Przykłady
Jeśli nie napisano inaczej: noc 16/17.10.2026; 52,0°N, 19,0°E, 150 m, horyzont płaski; próg −18°, h_min 30°, krok 5 min; Mój zestaw; parametry domyślne.

P1: Domyślnie czas efektywny od najdłuższego: M 31, IC 1396, M 45, NGC 7000, M 42.

P2: Godzina górowania w kolejności nocy, od wieczora: NGC 7000 (20:03), IC 1396 (20:42), M 31 (23:46), M 45 (02:50), M 42 (04:38). M 101 góruje w dzień, więc jest na końcu. Godzina 02:50 następnego dnia wypada po 23:46.

P3: Rozmiar od największego (wielka oś) wśród NGC 6960, Simeis 147, M 31, NGC 1499, M 45, M 1 i obiektu bez rozmiaru: NGC 6960 (210′), Simeis 147 (180′), M 31 (177,83′), NGC 1499 (160′), M 45 (150′), M 1 (8′), a na końcu obiekt bez rozmiaru.

P4: Jasność od najjaśniejszego (najmniejsza wartość mag) w „Klasyki”: M 45 (1,2), M 31 (3,44), M 42 (4), M 33 (5,79), IC 1805 (6,5), IC 1848 (6,5), M 81 (6,92), M 101 (7,9), M 1 (8,4), a potem 17 obiektów bez jasności.

P5: Remis i brak wartości rozstrzyga oznaczenie główne w porządku naturalnym (liczby rosnąco): IC 1805 przed IC 1848. Obiekty bez jasności z P4 idą w kolejności B 33, IC 1396, LDN 1235, LDN 1251, NGC 281, NGC 1499, …, vdB 152 (NGC 281 przed NGC 1499).

P6: Dopasowanie do kadru: najlepiej, gdy wielka oś jest najbliżej środka zakresu „Pasuje do kadru”, czyli 52,5% krótszego boku (dla Mojego zestawu 34,02′). Kolejność wśród NGC 281, LDN 1251, IC 1848, M 101, Sh2-155 i M 31: NGC 281 (35′), LDN 1251 (29,9′), IC 1848 (40′), M 101 (23,99′), Sh2-155 (50′), M 31 (177,83′). Obiekt bez rozmiaru idzie na koniec.

P7: Dla RedCat 51 + ASI2600MC Pro (środek zakresu 113,3′) kolejność wśród M 1, M 31 i NGC 7000: NGC 7000 (120′), M 31 (177,83′), M 1 (8′).

P8: Wyniki widoczności jeszcze się liczą albo noc nie ma okna → przy sortowaniu po czasie efektywnym wszystkie obiekty są „bez wartości” i idą w porządku oznaczeń z P5. Obiekt z czasem 0 min stoi przed obiektami bez wartości.

## Styk z resztą
- `src/services/catalogSort.ts`: czysta funkcja: obiekty, klucz sortowania, wyniki nocy D, aktywny zestaw (FOV z `computeOptics`) i `fitRange` z parametrów → nowa lista; wejście się nie zmienia.
- Porządek oznaczeń: `formatDesignation(primary)` porównywane przez `Intl.Collator('pl', { numeric: true })`.
- Czas efektywny i górowanie z `widocznosc-katalogu`. Górowanie porównuje się jako chwilę w czasie, więc kolejność nocy wychodzi sama.

## Poza zakresem
- Odwracanie kierunku, sortowanie po kilku kluczach wybranych przez użytkownika, zapamiętywanie wyboru między sesjami.
- Interfejs wyboru sortowania (`zakladka-katalog`).

## Pytania
- 7A nie podaje kierunków. Przyjąłem: czas efektywny malejąco, górowanie od wieczora, rozmiar malejąco, jasność od najjaśniejszego, dopasowanie od najlepszego.
- 7A nie definiuje miary „dopasowania do kadru”. Przyjąłem odległość wielkiej osi od środka zakresu „Pasuje do kadru” (P6).
- Remisy i brak wartości rozstrzyga porządek naturalny oznaczenia głównego; obiekty bez wartości są zawsze na końcu.
