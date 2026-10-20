# katalog-gwiazd — Katalog gwiazd Tycho-2 do V ≤ 10

## Cel
Program ma własny, zwarty plik gwiazd do jasności V ≤ 10 (Tycho-2 z suplementem 1, 6.7), zbudowany raz skryptem i commitowany. Zakładka Kadr może go wczytać i szybko dostać gwiazdy w polu widoku, które `tlo-mapy` narysuje jako kropki.

## Przykłady
Reguły, które sprawdzają przykłady:
- Jasność V liczy się wzorem z 6.7: `V = VT − 0,090·(BT − VT)`. Gdy brakuje BT, `V = VT`, a gdy brakuje VT, `V = BT`. Gwiazda bez obu jasności jest pomijana. Do pliku trafiają gwiazdy z `V ≤ 10` (brzeg się liczy).
- Zapytanie TAP nazywa kolumny stałymi nazwami: `ra`, `dec`, `bt` i `vt` (pozycja J2000 i jasności Tycho). Program czyta je po nazwach, więc kolejność kolumn nie ma znaczenia. Puste pole oznacza brak wartości. Końce linii mogą być LF albo CRLF.
- Ograniczenie jasności w zapytaniu jest luźniejsze niż V ≤ 10 i nie gubi wierszy z pustym BT albo VT. Ostateczny odsiew robi program.
- Wybór gwiazd zwraca gwiazdy odległe od środka o najwyżej r (brzeg się liczy, z tolerancją 1e-6°), od najjaśniejszej. Przy równej jasności decyduje kolejność w pliku.

Jasność i dane z VizieR:
P1: VT 9,00, BT 10,00 → V 8,91. VT 6,00, BT 5,00 → V 6,09.
P2: Brak BT, VT 9,50 → V 9,50. Brak VT, BT 9,80 → V 9,80. Gwiazda bez BT i VT jest pominięta i doliczona do pominiętych.
P3: Granica. VT 10,00 i BT 10,00 → V 10,00, gwiazda jest w pliku. VT 10,00 i BT 9,00 → V 10,09, gwiazdy nie ma. VT 10,10 i BT 12,10 → V 9,92, gwiazda jest w pliku, choć VT > 10.
P4: Odpowiedź CSV z nagłówkiem `vt,bt,dec,ra` (inna kolejność kolumn), końcami CRLF i 4 wierszami daje 2 gwiazdy:
- `5.10,5.30,-5.3897,83.8186` → RA 83,8186°, Dec −5,3897°;
- `9.50,,10,20` → RA 20°, Dec 10°, V 9,50;
- `9.00,10.00,abc,30` (zła liczba) jest pominięty;
- `,,1,40` jest pominięty (brak obu jasności).
Pominięte: 2. Pusta linia na końcu nie liczy się jako wiersz.
P5: Obcięta odpowiedź. Pobrano 2000 wierszy z `I/259/tyc2`, a zapytanie COUNT dla tego samego warunku podało 355 360. Skrypt kończy się błędem, który zawiera nazwę tabeli i obie liczby. Nie zapisuje przy tym ani pliku gwiazd, ani `meta.json`.

Plik binarny:
P6: Zapis i odczyt trzech gwiazd zwracają te same trzy gwiazdy w tej samej kolejności. Pozycja różni się najwyżej o 0,1″, a jasność najwyżej o 0,01 mag:
- (RA 0°, Dec −90°, V −1,46), czyli jaśniej niż 0 mag;
- (RA 83,8186°, Dec −5,3897°, V 5,13);
- (RA 359,99999°, Dec +90°, V 10,00).
RA po odczycie leży zawsze w [0, 360).
P7: Plik z 0 gwiazd też się zapisuje i odczytuje (pusta lista).
P8: Plik ze 357 147 gwiazdami (sztucznymi) ma najwyżej 3 571 534 B, czyli 10 B na gwiazdę i 64 B na nagłówek.
P9: Złe pliki dają błąd z komunikatem:
- inny znacznik na początku → „To nie jest plik katalogu gwiazd”;
- wersja 2 → „Nieobsługiwana wersja pliku gwiazd: 2”;
- nagłówek podaje 3 gwiazdy, a danych starcza na 2, albo plik krótszy od nagłówka → „Plik katalogu gwiazd jest niepełny”.

Skrypt bez sieci:
P10: Katalog podręczny zawiera przykładowe odpowiedzi dla obu tabel: 3 gwiazdy z tabeli głównej, 1 z suplementu i 1 wiersz pominięty. Katalog wynikowy jest tymczasowy i już ma `meta.json` z danymi katalogu obiektów. Skrypt nie pobiera niczego z sieci. Zapisuje plik z 4 gwiazdami: najpierw tabela główna, potem suplement.
P11: W `meta.json` z P10 wszystkie dotychczasowe pola są bez zmian. Dochodzi wpis `stars` z liczbą gwiazd (4), datą budowy, cytowaniem „Høg i in. 2000 (ESA, CDS)” i listą tabel. Przy każdej tabeli jest jej nazwa, zapytanie, liczba wierszy, liczba gwiazd w pliku i liczba pominiętych. Drugie uruchomienie podmienia wpis `stars`, a nie dopisuje drugiego.

Wybór gwiazd w polu:
P12: Środek RA 10°, Dec 0°, r = 1°. W wyniku są gwiazdy w Dec 0,5° i 1,0° (brzeg), a gwiazdy w Dec 1,01° nie ma.
P13: Przejście przez RA 0°. Środek RA 0,5°, Dec 0°, r = 1°. Gwiazda w RA 359,8° (0,7°) jest w wyniku, a w RA 1,6° (1,1°) nie.
P14: Biegun.
- Środek Dec +90°, r = 1°: gwiazdy w Dec 89,5° przy RA 0°, 120° i 240° są w wyniku, a gwiazda w Dec 88,9° nie.
- Środek RA 0°, Dec 89,5°: gwiazda w RA 180°, Dec 89,6° (0,9° przez biegun) jest w wyniku, a gwiazda w RA 180°, Dec 89,4° (1,1°) nie.
P15: Wysokie Dec. Środek RA 0°, Dec 60°, r = 1°. Gwiazda w RA 1,9°, Dec 60° (ok. 0,95°) jest w wyniku, choć różnica RA przekracza 1°. Gwiazda w RA 2,1° (ok. 1,05°) nie jest.
P16: Zgodność z przeglądem wszystkich gwiazd. Sztuczny katalog to 357 147 gwiazd losowanych ze stałym ziarnem. Dla środków (0°; 0°), (359,9°; 45°), (180°; −89,9°) i (83,8221°; −5,3911°) oraz promieni 0,1°, 1°, 30° i 180° wynik jest dokładnie taki sam jak przy sprawdzeniu każdej gwiazdy `angularSeparationDeg`. Dotyczy to zbioru i kolejności. Przy r = 180° wynik zawiera wszystkie gwiazdy.
P17: Kolejność: gwiazdy V 7,0, V 3,0, V 7,0 (w tej kolejności w pliku) wracają jako V 3,0, pierwsza V 7,0, druga V 7,0. Katalog bez gwiazd daje pustą listę.
P18: Szybkość. Na katalogu z P16 indeks przygotowuje się raz, a potem 1000 wyborów z r = 1° trwa łącznie poniżej 1 s.

Wczytanie w aplikacji:
P19: Pierwsze wczytanie pobiera `catalog/stars.v1.bin` (pod adresem bazowym aplikacji). Drugie nie pobiera pliku ponownie, tylko zwraca ten sam katalog.
P20: Odpowiedź HTTP 404 daje błąd „Nie udało się wczytać katalogu gwiazd (HTTP 404)”. Następne wczytanie próbuje pobrać plik od nowa.

Prawdziwy plik (T27; sprawdza orchestrator po zbudowaniu pliku, nie test bez sieci):
P21: `stars.v1.bin` ma 357 147 gwiazd: 355 360 z `I/259/tyc2` i 1 787 z `I/259/suppl_1`. Wszystkie mają V ≤ 10. W polu r = 1° wokół M 42 (RA 83,8221°, Dec −5,3911°) są gwiazdy w odległości najwyżej 5″ od θ¹ Ori C (RA 83,8186°, Dec −5,3897°) i od ι Ori (RA 83,8583°, Dec −5,9099°).

## Styk z resztą
- `src/services/stars.ts` (nowy plik, czyste funkcje, bez sieci): jasność V, odczyt odpowiedzi CSV, zapis i odczyt pliku binarnego, przygotowanie indeksu i wybór gwiazd. Korzysta z `angularSeparationDeg` i `EquatorialDeg` (`astroMath.ts`).
- Wczytanie pliku w aplikacji (raz, przez `fetch`, jak `loadCatalog`) używa tylko zakładka Kadr, a dokładnie `tlo-mapy`.
- `scripts/build-stars.ts` (nowy plik, Node, styl `build-catalog.ts`) odpowiada za część z siecią:
  - zapytania TAP do `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync` z własnym User-Agent i zapytanie COUNT dla każdej tabeli;
  - odpowiedzi w `scripts/.cache` (`--refresh` pobiera je od nowa);
  - zapis `stars.v1.bin` i wpisu `stars` w `meta.json`.
- Katalogi podręczny i wynikowy są parametrami, więc testy piszą do folderu tymczasowego (`public/catalog/*` jest chroniony). Uruchomienie: `node scripts/build-stars.ts`. Bez skryptu w `package.json`, bo ten plik jest chroniony.

## Poza zakresem
- Rysowanie gwiazd i siatki RA/Dec, wielkość kropek i Red Mode (`tlo-mapy`).
- Przeliczanie ruchu własnego i precesja: pozycje zostają takie, jak podaje VizieR.
- Ekran „Źródła i licencje” (etap 7). Cytowanie trafia na razie tylko do `meta.json`.
- Zbudowanie i commit prawdziwego `public/catalog/stars.v1.bin` (robi to orchestrator po PASS).

## Pytania
- **Nie liczyłem programem.** Nie miałem powłoki, więc dane przykładów dobrałem tak, żeby wyniki dało się policzyć w pamięci. Odległości w P15 są przybliżone, ale mają duży zapas.
- **Kolumny pozycji.** W `I/259/tyc2` część gwiazd nie ma średniej pozycji J2000, tylko pozycję obserwowaną. Zakładam, że wtedy zapytanie bierze pozycję obserwowaną jako `ra`/`dec`, a dla suplementu jego własne kolumny. Bez tego liczba 355 360 by się nie zgadzała. Autor skryptu powinien to sprawdzić zapytaniem COUNT.
- **Pominięcia.** Gwiazdy bez obu jasności i wiersze ze złymi liczbami są pomijane i liczone, a nie zatrzymują budowy. 6.7 tego nie rozstrzyga.
- **`build-catalog.ts` nadpisuje cały `meta.json`**, więc jego ponowne uruchomienie usunie wpis `stars`. Trzeba wtedy uruchomić też `build-stars`, albo w osobnej funkcji zmienić `build-catalog`, żeby zachowywał wpis `stars`.
- **P21 przed zbudowaniem pliku.** Jeśli P21 trafi do testów, to przy braku pliku test się pomija, inaczej regresja padnie przed PASS.
- **Szybkość.** P18 ma szeroki próg (1 ms na wybór), żeby nie zawodził na wolnej maszynie. Przegląd wszystkich gwiazd zająłby kilka sekund.
- Wynik wyboru ma postać „środek + promień”, a nie wycinek. `tlo-mapy` poda promień równy połowie przekątnej widoku i sam rzutuje gwiazdy na piksele.
- Błąd wczytania nie zostaje zapamiętany (P20), inaczej niż w `loadCatalog`.
