# widocznosc-katalogu — Widoczność całego katalogu w noc D

## Cel
Dla wybranej nocy aplikacja liczy naraz dla każdego obiektu katalogu: czas efektywny (z krokiem katalogowym, domyślnie 5 min), godzinę górowania, najwyższe położenie w oknie ciemności i użyty próg ciemności albo stan „brak okna”. Cały katalog liczy się w najwyżej 3 s.

## Przykłady
Jeśli nie napisano inaczej: 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski; noc 16/17.10.2026; próg −18° z obniżaniem; h_min 30°; krok 5 min; obiekty z katalogu aplikacji.

P1: Czas efektywny przy kroku 5 min (±5 min): M 31 9 h 39 min, IC 1396 9 h 02 min, M 45 7 h 14 min, NGC 7000 6 h 50 min, M 42 2 h 03 min. [T9, AC1]

P2: Te same obiekty przy kroku 1 min: te same wartości z tolerancją ±1 min. [T9, AC1]

P3: Każdy wynik tej nocy podaje próg −18° bez obniżenia i okno 19:40–05:19 CEST (±1 min). [T4]

P4: Górowanie (±1 min): NGC 7000 20:03, IC 1396 20:42, M 31 23:46, M 45 02:50, M 42 04:38 CEST. M 31 jest najwyżej w górowaniu: 79,42° (±0,01°). [T7]

P5: M 101 góruje w dzień (13:04 CEST, poza nocą) → wynik nie ma górowania w nocy, a najwyższe położenie w oknie przypada na jego początek, 19:40 CEST (±1 min).

P6: Przerzut dla montażu GEM z przerzutem 10 min po południku: M 31 23:56 CEST (±1 min). Montaż widłowy → brak przerzutu. M 101 (góruje w dzień) → brak przerzutu.

P7: Obiekt przy biegunie (deklinacja +89°) jest widoczny przez całe okno: 9 h 39 min (±1 min) także przy kroku 5 min, bo ostatni przedział przycina się do końca okna.

P8: Obiekt na deklinacji −60° nigdy nie wschodzi: czas efektywny 0 min (to nie jest „brak okna”), a najwyższe położenie w oknie jest poniżej 0°.

P9: M 42 przy h_min 20° i kroku 1 min: horyzont płaski 3 h 49 min, horyzont demonstracyjny z 6.4 2 h 22 min (±1 min). [T11]

P10: Noc 21/22.06.2026: wynik podaje próg −12° obniżony z −18° i okno 23:15–02:16 CEST (±1 min); żaden obiekt nie ma więcej niż 3 h 01 min (±1 min). [T6, AC4]

P11: Ta sama noc na 54,83°N: każdy obiekt ma stan „brak okna przy progu −12°”, czyli nie ma czasu efektywnego ani najwyższego położenia. Górowanie jest nadal podane (np. NGC 7000 góruje w nocy). [T6, AC4]

P12: Noc 21/22.06.2026 na 52,0°N z wyłączonym obniżaniem → „brak okna przy progu −18°”.

P13: Pełny katalog (16 516 obiektów), noc 16/17.10.2026, krok 5 min: wynik dla wszystkich obiektów w czasie do 3 s, mierzonym w teście. [7A, AC7]

## Styk z resztą
- Nowy `src/services/catalogNight.ts` (czyste funkcje):
  - przygotowanie nocy raz: okno ciemności (`darknessWindow`), oś nocy (`nightSun`), siatka co krok katalogowy (`sampleGrid`, czas gwiazdowy raz na krok), macierz precesji raz na noc (`precessionMatrix`);
  - podsumowanie obiektu: `effectiveMinutes`, `transitMs` (t₀ = zachód − 1 h; po końcu osi znaczy „w dzień”), `highestPoint`;
  - funkcja dla całego katalogu (wyniki w kolejności obiektów, z uid).
- Wejście: położenie (szerokość, długość, wysokość), strefa czasowa, horyzont, noc D oraz z `parametry-planowania` próg, obniżanie, h_min i krok katalogu.
- Przerzut: osobna, tania funkcja z górowania i montażu (`meridianFlipMs`), liczona poza Workerem, bo montaż nie należy do klucza pamięci podręcznej (`obliczenia-w-tle`). Używa jej karta obiektu.
- `rekomendacje-filtrow` rozszerzy to samo podsumowanie o dane Księżyca; budżet 3 s obejmie wtedy całość.
- Bez zmian w `visibility.ts`, `nightChart.ts` i `astroMath.ts`, bo używają ich istniejące testy.

## Poza zakresem
- Web Worker i pamięć podręczna (`obliczenia-w-tle`), filtry, sortowanie, karta i zakładka.
- Alt/Az i separacja od Księżyca w kursorze czasu (liczy je karta) oraz dane Księżyca (`rekomendacje-filtrow`).
- Refrakcja (wysokości są geometryczne, sekcja 4) i iteracyjne wyszukiwanie górowania.

## Pytania
- Przerzut przeniosłem do osobnej funkcji poza wynikiem Workera. Backlog przypisuje go tej funkcji, ale montaż nie jest w kluczu pamięci.
- Przykłady używają współrzędnych z katalogu aplikacji. IC 1396 i M 45 różnią się od T9 o kilka sekund RA, co mieści się w tolerancji.
- Górowanie w osi nocy, ale przed początkiem okna, jest podawane; najwyższe położenie przypada wtedy na brzeg okna. Przy „brak okna” górowanie też jest podawane, jak na wykresie nocy.
