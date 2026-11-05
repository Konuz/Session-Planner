# KONUZASTRO Tracker: lista wymagań

Cel: alternatywa dla Telescopiusa, SkySafari i Stellarium. Ma być czytelniejsza i szybsza, wyglądać jak część strony konuzastro.pl (subdomena) i działać płynnie na słabych komputerach oraz wolnych łączach.

Każda linia ma dowód: test (T), sprawdzenie w przeglądarce przy 1440 px (P) albo sprawdzenie ruchu sieciowego (S).

| # | Wymaganie | Dowód | Stan |
|---|-----------|-------|------|
| 1 | Miniatury obiektów w katalogu, kolorowe (DSS2 kolor), pobierane i buforowane | P + S (Cache Storage, drugi raz bez sieci) | ☑ |
| 2 | Wybór i konfiguracja teleskopu, kamery i reduktora; pole widzenia | T (`equipment`) + P | ☑ |
| 3 | Kadrowanie (prostokąt matrycy na zdjęciu, obrót, przesuwanie) | T (`framing`) + P | ☑ |
| 4 | Przejście obiektu po kopule (tor na nocy) | P | ☑ |
| 5 | Faza Księżyca, oświetlenie, najbliższy nów i pełnia | T (`astro`) + P | ☑ |
| 6 | Wykres wysokości obiektu z podziałem na fazy nocy | T (`night`) + P | ☑ |
| 7 | Południk (górowanie, przejście przez południk) | T + P | ☑ |
| 8 | Własny horyzont (edytor, import pliku, użycie na wykresie i kopule) | T (`horizon`) + P | ☑ |
| 9 | Pogoda na noc (zachmurzenie, wilgotność, wiatr, temperatura) | S (Open-Meteo) + P | ☑ |
| 10 | Wybór miejscowości (wyszukiwarka, współrzędne, geolokalizacja) | S + P | ☑ |
| 11 | Położenie obiektu w przestrzeni 3D na podstawie internetowych baz | S + P | ☑ |
| 12 | Informacje o obiekcie i opis | S (Wikipedia) + P | ☑ |
| 13 | Planer sesji z eksportem do N.I.N.A. | T (`nina`) + P | ☑ |
| 14 | Animacja odnajdywania obiektu na kopule | P | ☑ |
| 15 | Zarysy postaci gwiazdozbiorów po najechaniu kursorem (półprzezroczysta nakładka) | P | ☑ |
| 16 | Filtry katalogu: M, NGC, IC, LDN, LBN, Sh2, SNR, B, vdB oraz typ obiektu (Collinder i Melotte: brak w danych, do dodania) | T (`filters`) + P | ☑ |
| 17 | Szybkość: JS na start < 200 KB gzip, 3D ładowane leniwie, obliczenia w workerze, `prefers-reduced-motion` | build + P | ☑ |
| 18 | Wygląd spójny ze stroną (tokeny, krój mono, klamry narożne, odnośnik do konuzastro.pl) | P | ☑ |
| 19 | Obserwatorium 3D zdjęcia: gwiazdy Gaia DR3 (odległości Bailer-Jones, ϖ/σ ≥ 5) i wycinki na osi linii widzenia, suwak zdjęcie ↔ przestrzeń, widoki Struktura / Z Ziemi / Z góry / Z boku, histogram z przedziałem, lista i inspektor, przejście do Drogi Mlecznej | T (`observatory`, `photoStarsServer`, `photo`) + P + S (GAVO) | ☑ |

## Stan na 22.10.2026

Wszystkie punkty zrealizowane i sprawdzone (22 testy Vitest, build, zrzuty Playwrighta przy 1536 px). Uwagi:
- Przejrzystości nie podaje żadne darmowe API z CORS (7Timer go nie ma), więc karta pogody pokazuje wyliczoną „ocenę nieba” (zachmurzenie, wilgotność, punkt rosy, widzialność) i tak ją nazywa.
- Odległości (6 628 obiektów) to mediana wartości z Wikidata; model Galaktyki w 3D jest poglądowy.
- Kopuła: N u góry i E po lewej (mapa trzymana nad głową). Prototyp miał E po prawej, jak mapa terenu.
- Miniatury i kadr: kafelki HiPS DSS2 i PanSTARRS z luster ESA, MAST, CASDA i CDS, składane w workerze (`hips.worker.ts`); wcześniej hips2fits (CDS), który 31.10–1.11.2026 nie odpowiadał. Pomiary 1.11.2026 (wersja produkcyjna, pusta pamięć podręczna):
  - szybkie łącze: ostry kadr 0,8 s, po przeładowaniu 0,07 s, 12 miniatur katalogu 0,55 s, przy awarii ESA kadr 1,6 s; przeciąganie kadru bez długich zadań;
  - wolne łącze (2 Mbit/s, 150 ms): podgląd kadru 2,6 s, ostry 4,9 s; 15 widocznych miniatur 4,5 s (604 KB), czyli powyżej celu 3 s.
  - 1.11.2026: miniatury kolorowe, 224 px z rzędem grubszym o 1 (wcześniej 128 px, grubszy o 2: widoczne romby pikseli HEALPix); transfer 12 miniatur ok. 1,5× większy, więc na wolnym łączu będą wolniejsze niż powyższe 4,5 s (niezmierzone); szybkie łącze: 15 miniatur 2,2 s.

## Obserwatorium 3D (5.11.2026)

- Zdjęcie testowe IC 434 z konuzastro.pl: rzut gwiazd Gaia mieści się w 0,78 px od wykryć solvera (mediana 0,16 px). Gwiazdy σ Ori wychodzą 362–405 pc (literatura 387,5 pc). Zdjęcia M42 na konuzastro.pl nie ma; M45 i M44 nie dały się rozwiązać w limicie 90 s.
- Galaktyki: zdjęcie M 51 z konuzastro.pl (10 galaktyk, 24,8 mln – 670 mln lś): rzut gwiazd w 0,82 px od wykryć solvera (mediana 0,14 px), oś obejmuje 9 dekad, „Droga Mleczna” przechodzi do skali Wszechświata lokalnego. 20 otwarć i zamknięć okna nie wypiera kontekstu WebGL Space3D.
- Przedział 998–2004 lś zostawia na liście i w scenie 363 obiekty o odległościach 999–1998 lś i żadnego bez odległości.
- Scena rysuje tylko przy ruchu: w spoczynku zero wywołań rysowania przez 3 s, także po przelocie kamery. Startowy JS ma 149,1 KB gzip, obserwatorium to leniwy fragment 10,6 KB.
- Eksport wideo pominięto (decyzja użytkownika).

## Moje zdjęcie obiektu (5.11.2026)

- „Dodaj moje zdjęcie” w szczegółach obiektu: zdjęcie M 51 z konuzastro.pl rozwiązane lokalnie w 16 s. Środek siatki 17 × 17 z nowej komendy mostu `grid` leży 0,00025° od środka astrometrii. Zdjęcie trafia tylko do obiektu, dla którego je dodano. M 31 z tym samym zdjęciem dostaje „Obiektu M 31 nie ma na tym zdjęciu.”.
- Karta, szczegóły i Katalog pokazują zdjęcie w skali i środku domyślnej miniatury, z N u góry. Gwiazdy pokrywają się z DSS2, a przełącznik naprzeciw serca wraca do DSS2. Kadrowanie wkleja zdjęcie w tło DSS2 lub PanSTARRS bez szwów i ramki, a poziomy rozciągają całość.
- Czarne kliny zdjęcia obróconego o 25° są wycinane: kadr wygląda jak dla zdjęcia nieobróconego. Ciemne obszary we wnętrzu zostają (test jednostkowy).
- Wybór moje/domyślne przetrwa przeładowanie; „Usuń moje zdjęcie” przywraca domyślne i chowa przełącznik. Zdjęcia leżą w bazie `tracker-own-photos`; projekt Eksploratora zdjęć (`tracker-photo`) jest nietknięty.
- Startowy JS 152,4 KB gzip. Warstwa zdjęcia na mapie nieba jest osobnym, późniejszym zadaniem.
