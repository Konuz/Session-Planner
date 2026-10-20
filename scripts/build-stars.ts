// Buduje stars.v1.bin i wpis `stars` w meta.json z Tycho-2 (I/259/tyc2 i I/259/suppl_1) przez TAP VizieR (6.7).
// Uruchomienie: node scripts/build-stars.ts [--cache <katalog>] [--out <katalog>] [--refresh]
// ZAŚLEPKA: skrypt kończy się błędem NotImplementedError; implementację dopisuje implementer.
//
// Umowa sprawdzana przez testy (nazwy wybrał test-author; testy uruchamiają ten plik przez `node` w osobnym procesie
// z podmienionym globalnym `fetch`, katalogi tymczasowe):
// - `--cache <katalog>` – katalog podręczny (domyślnie scripts/.cache), `--out <katalog>` – katalog wynikowy
//   (domyślnie public/catalog), `--refresh` – pobierz odpowiedzi od nowa, nawet gdy są w katalogu podręcznym.
// - Odpowiedzi danych leżą w katalogu podręcznym jako surowy tekst CSV z TAP: `I_259_tyc2.csv` i `I_259_suppl_1.csv`
//   (nazwa tabeli z `/` zamienionym na `_`). Gdy oba pliki są i nie ma `--refresh`, skrypt nie używa sieci (COUNT też
//   nie). Brakujący plik jest pobierany: zapytanie danych i zapytanie COUNT z tym samym warunkiem, oba `fetch` do
//   https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync (GET z parametrem QUERY albo POST z polem QUERY, FORMAT csv)
//   z własnym nagłówkiem User-Agent. Wynik COUNT to pierwsza wartość pierwszego wiersza danych odpowiedzi CSV.
//   Tabele po kolei: najpierw I/259/tyc2, potem I/259/suppl_1.
// - Gdy liczba pobranych wierszy ≠ wynik COUNT: błąd (kod wyjścia ≠ 0) z nazwą tabeli i obiema liczbami;
//   ani stars.v1.bin, ani meta.json nie są wtedy zapisywane.
// - Wynik: `<out>/stars.v1.bin` (`encodeStarFile`, najpierw gwiazdy tabeli głównej, potem suplementu) i wpis `stars`
//   w `<out>/meta.json` (pozostałe pola bez zmian; ponowne uruchomienie podmienia wpis):
//     { count, builtAt (data ISO), citation: 'Høg i in. 2000 (ESA, CDS)',
//       tables: [{ table, query, rows, stars, skipped }, …] }  – `table` np. 'I/259/tyc2', `query` = zapytanie danych.
// - Zapytania ADQL testy wykonują na małym symulatorze TAP (tests/features/katalog-gwiazd/tapSimulator.ts) z prawdziwymi
//   wierszami VizieR. TAPVizieR nie zna COALESCE ani CASE (sprawdzone), więc symulator też ich nie przyjmuje.
throw new Error('NotImplementedError: build-stars')
