# karta-obiektu — Karta obiektu w katalogu

## Cel
Każdy obiekt na liście katalogu ma kartę z danymi na wybraną noc: oznaczenia i nazwa, typ (ikona i tekst), położenie w kursorze czasu, górowanie i najwyższe położenie, przerzut dla GEM, czas efektywny z progiem, odległość od Księżyca oraz odznaki filtrów.

## Przykłady
Jeśli nie napisano inaczej: 52,0°N, 19,0°E, 150 m, horyzont płaski; noc 16/17.10.2026; próg −18°, h_min 30°; Mój zestaw (GEM, przerzut 10 min po południku); kursor 00:00 CEST 17.10.

P1: M 31 → oznaczenie główne „M 31”, pozostałe „NGC 224”, nazwa „Andromeda Galaxy”, typ „galaktyka” z ikoną.

P2: Sh2-155 → pozostałe „LBN 529, C 9”, nazwa „Cave Nebula”. M 45 → pozostałe „Mel 22”, nazwa „Pleiades”. LDN 1235 → bez wiersza nazwy i bez wiersza pozostałych oznaczeń.

P3: NGC 6960 ma trzy nazwy zwyczajowe; karta pokazuje pierwszą, „Veil Nebula”.

P4: Kursor 00:00 CEST: M 31 „wysokość 79,2°, azymut 193,6°”, separacja od Księżyca „112,8°”. [T7]

P5: M 31 → „górowanie 23:46 CEST, 79,4°” i „przerzut 23:56 CEST” (±1 min). [T7]

P6: M 101 → „góruje w dzień”, najwyżej o 19:40 CEST (początek okna), bez przerzutu. Zestaw z montażem widłowym → karta nie ma wiersza przerzutu.

P7: Czas efektywny z podsumowania podanego wprost: 579 min przy progu −18° → „09:39, próg −18°”; 181 min przy progu obniżonym do −12° → „03:01, próg −12° (obniżony)”; stan „brak okna” → „brak okna przy progu −12°”.

P8: Najmniejsza separacja w oknie efektywnym z podsumowania: 47,26° → „47,3°”. Obiekt bez czasu efektywnego → „—”.

P9: Odznaki Mojego zestawu idą w kolejności L, R, G, B, Ha, OIII, SII. Każda ma nazwę filtra, znak stanu (✓ zielony, ! żółty, ✗ czerwony) i opis tekstowy, np. „Ha: średnie warunki” (zielony to „dobre warunki”, czerwony „złe warunki”), więc stan nie zależy tylko od koloru. Obiekt bez rekomendacji → brak odznak.

P10: Etykiety typów: galaktyka, grupa galaktyk, mgławica emisyjna, mgławica refleksyjna, mgławica ciemna, mgławica planetarna, pozostałość po supernowej, gromada otwarta, gromada kulista, gromada z mgławicą, inny obiekt. Na przykład Simeis 147 → „pozostałość po supernowej”, M 42 → „gromada z mgławicą”.

P11: Kolor typu z tokenów sekcji 8: galaktyka i grupa galaktyk fiolet; mgławica emisyjna, pozostałość po supernowej i gromada z mgławicą szkarłat; mgławica refleksyjna błękit; mgławica ciemna bursztyn; mgławica planetarna turkus; gromada otwarta i kulista żółty; inny obiekt kolor tekstu pomocniczego. W Red Mode wszystkie kolory karty pochodzą z palety czerwonej. [T15]

## Styk z resztą
- `src/features/catalog/`: model karty i komponent karty. Model to czysta funkcja: obiekt, podsumowanie nocy z Workera, aktywny zestaw, kursor, położenie Księżyca w kursorze i kolory rekomendacji → gotowe teksty.
- Obliczenia na karcie: Alt/Az w kursorze przez `toEquatorOfDate` (macierz precesji nocy) i `horizontalAt`; Księżyc w kursorze przez `bodyPosition('moon', …)`, raz na zmianę kursora dla wszystkich kart; separacja przez `angularSeparationDeg`; przerzut przez funkcję z `widocznosc-katalogu` (górowanie i montaż zestawu).
- Teksty: `formatDesignation`, `formatDeg`, `formatLocalTime`, `formatDuration`; kolory odznak z `rekomendacje-filtrow`.
- `src/theme/tokens.ts`: trzy nowe tokeny odznak (zielony, żółty, czerwony) w obu paletach. W Red Mode mają G = 0 i B = 0, bo test T15 sprawdza każdy token.
- Ikony z Lucide. Komponent nie importuje astronomy-engine.

## Poza zakresem
- Lista i przewijanie (`zakladka-katalog`), przycisk „Pokaż na wykresie nocy” (`wybor-obiektu`).
- Widok szczegółów, „Pokrewne obiekty”, podgląd nieba, faza Księżyca na karcie.

## Pytania
- Kolory typów spoza tabeli sekcji 8 dobrałem sam: grupa galaktyk jak galaktyka, gromada z mgławicą (M 42, IC 1396) jak mgławica emisyjna, inny obiekt w kolorze tekstu pomocniczego.
- Paleta nie ma zieleni, więc dodaję trzy tokeny odznak. Etykiety typów, znaki ✓ ! ✗ i opisy stanów to moja propozycja.
- Karta pokazuje tylko pierwszą nazwę zwyczajową.
