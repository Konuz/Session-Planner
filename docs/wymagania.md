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
| 20 | „Pozycja 3D” w oknie o wymiarach Obserwatorium (skale Droga Mleczna / Wszechświat lokalny, Esc, fokus), zdjęcie w Drodze Mlecznej jako linia widzenia, stożek pola i znaczniki, nurkowanie do rozłożonego zdjęcia i z powrotem | T (`frameBasis`, `spaceDive`) + P | ☑ |

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
- 6.11.2026: po otwarciu okna rozkładanie rusza samo od 0% i trwa 5 s (wcześniej 4 s, na przycisk; na M 51 pod swiftshaderem 5,17 s zegara, bo 10 klatek przekroczyło limit kroku 100 ms); kadr widoków liczony dla pełnego rozłożenia. Przelot kamery po sferze wokół celu: na M 51 kąt osi na ekranie przy przejściu Struktura → Z góry maleje płynnie z 70,7° do 0° (ostatnie klatki 0,2° → 0,1° → 0°), bez obrotu na końcu.

## Pozycja 3D w oknie i nurkowanie (6.11.2026)

Pomiary Playwrightem (Chromium, swiftshader) na zdjęciu IC 434 (zapisanego projektu M 42 nie było w tej sesji):
- Okno ma wymiary dawnego Obserwatorium: 1876 × 1044 px przy 1920 × 1080 i 1322 × 732 px przy 1366 × 768 (oba w x = y = 18). Esc i krzyżyk zamykają okno, fokus wraca na „Pozycja 3D”, płótno kopuły pod spodem jest to samo.
- Baza kadru: trzy gwiazdy Gaia z rogów kadru IC 434 trafiają przez bazę w swoje kierunki z RA/Dec z błędem < 2% szerokości pola; kadr odbity w poziomie także (test `frameBasis`).
- Droga Mleczna: linia widzenia biegnie od Ziemi przez pas Oriona (Alnitak, Alnilam), B 33 stoi 1,5 tys. lś od Ziemi. Przesunięcie okręgu w edycji zmienia położenie karty i celownika w Obserwatorium (x: 63,61% → 69,16% szerokości). Wszechświat lokalny ze zdjęciem M 51 ma te same kolumny, linie i podpisy co przed zmianą.
- Szew nurkowania: środek Ziemi różni się między scenami o 0,00 px, a kierunek linii widzenia na ekranie o 0,00°, naprzód i wstecz, przy obu rozdzielczościach.
- Po rozłożeniu przez 2 s żadna scena nie rysuje klatek (Obserwatorium 200 → 200, Droga Mleczna 108 → 108); w stanie zdjęcia płótno Drogi Mlecznej stoi.
- Pod swiftshaderem scena Obserwatorium (dekodowanie zdjęcia 2798 × 2827 i karty) bywa gotowa ok. 0,8 s po końcu fazy ustawienia; kamera czeka wtedy w pozie szwu. Klik w trakcie przejścia kończy je od razu po zbudowaniu sceny.
- Startowy JS: 153,3 KB gzip; okno z three.js to leniwy fragment 183,5 KB gzip (ze Space3D i Obserwatorium).
- Panele w fazie wejścia: rozmiar sceny idzie za krzywą przejścia CSS (17 wartości w 0,9 s, początek co ok. 16 ms); pod swiftshaderem zdarzają się pojedyncze klatki 150–280 ms, niesprawdzone na prawdziwej karcie graficznej. Przeglądarki bez `interpolate-size` (Firefox, Safari) przestawiają wysokość paneli od razu.
- Telefon (390 × 844): pasek zdjęcia i przełączniki zawijają się, w stanie zdjęcia okno przewija się (scena, lista, histogram, oś).

## Moje zdjęcie obiektu (5.11.2026)

- „Dodaj moje zdjęcie” w szczegółach obiektu: zdjęcie M 51 z konuzastro.pl rozwiązane lokalnie w 16 s. Środek siatki 17 × 17 z nowej komendy mostu `grid` leży 0,00025° od środka astrometrii. Zdjęcie trafia tylko do obiektu, dla którego je dodano. M 31 z tym samym zdjęciem dostaje „Obiektu M 31 nie ma na tym zdjęciu.”.
- Karta, szczegóły i Katalog pokazują zdjęcie w skali i środku domyślnej miniatury, z N u góry. Gwiazdy pokrywają się z DSS2, a przełącznik naprzeciw serca wraca do DSS2. Kadrowanie wkleja zdjęcie w tło DSS2 lub PanSTARRS bez szwów i ramki, a poziomy rozciągają całość.
- Czarne kliny zdjęcia obróconego o 25° są wycinane: kadr wygląda jak dla zdjęcia nieobróconego. Ciemne obszary we wnętrzu zostają (test jednostkowy).
- Wybór moje/domyślne przetrwa przeładowanie; „Usuń moje zdjęcie” przywraca domyślne i chowa przełącznik. Zdjęcia leżą w bazie `tracker-own-photos`; projekt Eksploratora zdjęć (`tracker-photo`) jest nietknięty.
- Startowy JS 152,4 KB gzip. Warstwa zdjęcia na mapie nieba jest osobnym, późniejszym zadaniem.

## Moje zdjęcia na mapie nieba (5.11.2026)

- Przełącznik „Moje zdjęcia” w „Warstwach” kopuły (domyślnie włączony) i pod nim suwak krycia 10–100%. Taki sam suwak ma „Kontury” (6.11.2026): działa na obrysy i wypełnienia, podpisy zostają w pełni czytelne; oba suwaki mieszczą się w liście (wiersze 194 px w panelu 220 px), wcięte pod podpis przełącznika. Na kopule leżą tylko zdjęcia z wyborem „moje” w karcie obiektu. Po przeładowaniu przełącznik, krycie (0,7) i trzy zdjęcia zostają.
- Zdjęcie leży na niebie przez siatkę WCS 17 × 17; wierzchołki rzutuje ta sama funkcja co kontury. Test jednostkowy: piksel we wnętrzu komórki trafia w rzut swojego RA/Dec w granicach 0,5 px (zenit, 12° nad horyzontem, obrót, zdjęcie 6° przy polu 30°, odbicie lustrzane, pełna kopuła, RA 0°/360°, Dec 88,5°). Przesunięcie UV o 0,02 komórki psuje 3 testy.
- IC 434 (zdjęcie z konuzastro.pl, pole 8°): ζ Ori na zdjęciu leży 0,46 px od gwiazdy kopuły (centroidy jasności, warstwa wyłączona i włączona). Elipsa NGC 2023 i kontur B 33 trafiają w HD 37903 i Koński Łeb na zdjęciu. M 51: galaktyka pod celownikiem obiektu. W polu M 51 nie ma gwiazd kopuły (granica 6,6 mag), więc tam zgodność gwiazd jest niesprawdzalna.
- Kontury, elipsy, etykiety i ziemia są nad zdjęciem. Droga Mleczna, siatka wysokości, południk i linie gwiazdozbiorów przeszły na płótno pod gwiazdami, więc zdjęcie je zasłania; gwiazdy kopuły też. Kopuła bez zdjęć: średnia różnica pikseli z wersją sprzed zmiany 0,02 (pełna kopuła) i 0,36 (Łabędź, gwiazdy są teraz nad smugą).
- Brak ramki i szwów (wspólne wierzchołki, krawędź wygładzona w shaderze na ok. 1 px), czarne kliny wycina maska jako druga tekstura (bez kopiowania pikseli w pełnej rozdzielczości).
- Zachodzenie: wycinek IC 434 przypięty do B 33 leży w pełnym zdjęciu IC 434; przy kryciu 50% nie widać krawędzi wycinka (krycie działa na całą warstwę). Zdjęcie wybranego obiektu idzie na wierzch. To samo zdjęcie przypięte do IC 434 i NGC 2024 rysowane jest raz.
- Wschód IC 434 (+0,3°): część zdjęcia pod horyzontem zakryta ziemią. Utrata i przywrócenie kontekstu WebGL (`WEBGL_lose_context`): zdjęcie wraca samo.
- Wydajność: rzut siatek 20 widocznych zdjęć zajmuje 1,06 ms na klatkę (Node). Tekstury mają 256–2048 px zależnie od wielkości zdjęcia na ekranie, limit 128 MB, dekodowanie po jednym zdjęciu i nie podczas odtwarzania nocy. Klatek w swiftshader nie mierzono (cała kopuła rysuje się tam 0,5–0,8 s z warstwą i bez niej).
- Startowy JS 152,3 KB gzip; warstwa WebGL zdjęć to leniwy fragment 3,5 KB, ładowany dopiero przy pierwszym zdjęciu „moje”.
- Drobiazgi z recenzji końcowej (6.11.2026): maska z progiem 0,5 (zdjęcie IC 434 obrócone o 25°: kliny wycięte bez ciemnej obwódki), biała tekstura 1 × 1 zamiast braku maski, błąd samej maski rysuje zdjęcie bez niej, usunięte zdjęcie nie jest dekodowane z kolejki, bufor poza ekranem wliczony do limitu pamięci i sprawdzany pod kątem kompletności, krycie z zapisu przycinane do 10–100% (test). Postacie gwiazdozbiorów mieszają się teraz zwykłą przezroczystością z Drogą Mleczną i liniami (leżą na innym płótnie); różnica jest niewidoczna przy ich kryciu, więc zostaje.
- Ograniczenie: najmocniejsze powiększenie kopuły to 8°, więc zdjęcie ok. 1° zajmuje ok. 10% widoku.
