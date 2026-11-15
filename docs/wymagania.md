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
| 20 | „Pozycja 3D” w oknie o wymiarach Obserwatorium (skale Droga Mleczna / Wszechświat lokalny, Esc, fokus), zdjęcie w Drodze Mlecznej jako linia widzenia, stożek pola i znaczniki, nurkowanie do rozłożonego zdjęcia i z powrotem; od 14.11.2026 jedna scena dla obu zakładek | T (`frameBasis`, `spaceDive`, `space3d`, `photoGuide`) + P | ☑ |

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

Pomiary Playwrightem (Chromium, swiftshader) na zdjęciu IC 434 (Orion, obiekty 1,3–1,6 tys. lś) zamiast M 42 z promptu, bo projektu M 42 nie ma; Wszechświat lokalny i nurkowanie z niego na M 51:
- Okno ma wymiary dawnego Obserwatorium: 1876 × 1044 px przy 1920 × 1080 i 1322 × 732 px przy 1366 × 768 (oba w x = y = 18). Esc i krzyżyk zamykają okno, fokus wraca na „Pozycja 3D”, płótno kopuły pod spodem jest to samo.
- Baza kadru: trzy gwiazdy Gaia z rogów kadru IC 434 trafiają przez bazę w swoje kierunki z RA/Dec z błędem < 2% szerokości pola; kadr odbity w poziomie także (test `frameBasis`).
- Droga Mleczna: linia widzenia biegnie od Ziemi przez pas Oriona (Alnitak, Alnilam), B 33 stoi 1,5 tys. lś od Ziemi. Przesunięcie okręgu w edycji zmienia położenie karty i celownika w Obserwatorium (x: 63,61% → 69,16% szerokości). Wszechświat lokalny ze zdjęciem M 51 ma te same kolumny, linie i podpisy co przed zmianą.
- Szew nurkowania (od 6.11.2026 widok Struktura, bez przelotu przez „Z Ziemi” i bez oddalania na starcie): środek Ziemi różni się między scenami o 0,00 px, a kierunek linii widzenia na ekranie o 0,00°, naprzód i wstecz, przy obu rozdzielczościach. Nurkowanie zaczyna się w bieżącej kamerze Drogi Mlecznej: jej odległość od Ziemi tylko maleje (przykład: 2,42 → 0,44 tys. lś), wstecz tylko rośnie. Promień Ziemi Drogi Mlecznej przechodzi płynnie od znacznika (15,3 px przy kamerze blisko Ziemi) do 4,18 px i od połowy nurkowania równa się promieniowi Ziemi Obserwatorium. W trakcie wsuwania paneli płótno Obserwatorium rysuje się przy każdej zmianie rozmiaru (wcześniej było puste).
- Edycja wycinków jako osobny widok okna: zdjęcie na scenie nad paskiem (1920 × 1080: 783 × 791 px), panel wycinków 330 px z prawej, scena 3D bez klatek w czasie edycji; na zdjęciu okręgi wszystkich obiektów rozwiązania, bez przesuwania i zmiany promienia, wybór z listy albo kliknięciem obwódki (test `Space3DModal.test.ts`). W Obserwatorium obiekty bez odległości nie mają podpisów (tylko po zaznaczeniu).
- Po rozłożeniu przez 2 s żadna scena nie rysuje klatek (Obserwatorium 200 → 200, Droga Mleczna 108 → 108); w stanie zdjęcia płótno Drogi Mlecznej stoi.
- Pod swiftshaderem scena Obserwatorium (dekodowanie zdjęcia 2798 × 2827 i karty) bywa gotowa ok. 0,8 s po końcu fazy ustawienia; kamera czeka wtedy w pozie szwu. Klik w trakcie przejścia kończy je od razu po zbudowaniu sceny.
- Startowy JS: 153,3 KB gzip; okno z three.js to leniwy fragment 183,5 KB gzip (ze Space3D i Obserwatorium).
- Panele w fazie wejścia: rozmiar sceny idzie za krzywą przejścia CSS (17 wartości w 0,9 s, początek co ok. 16 ms); pod swiftshaderem zdarzają się pojedyncze klatki 150–280 ms, niesprawdzone na prawdziwej karcie graficznej. Przeglądarki bez `interpolate-size` (Firefox, Safari) przestawiają wysokość paneli od razu.
- Telefon (390 × 844): pasek zdjęcia i przełączniki zawijają się, w stanie zdjęcia okno przewija się (scena, lista, histogram, oś).

### Płynność nurkowania na GPU (6.11.2026)

Chromium headless z ANGLE D3D11 na NVIDIA GeForce RTX 5070 (renderer z `WEBGL_debug_renderer_info`), 1920 × 1080, IC 434, odstępy klatek `requestAnimationFrame`, długie klatki (`long-animation-frame`), screencast CDP z jasnością sceny w każdej klatce:
- Przed poprawką (aeb051b): pierwsze nurkowanie miało klatki 83–150 ms na starcie (budowa Obserwatorium, kamera jeszcze stała) i 100–136 ms w ruchu po ok. 1,3 s, także w kolejnych nurkowaniach: pierwsza widoczna klatka płaskiego zdjęcia wysyłała na GPU teksturę 2798 × 2827 (`texSubImage2D` 125 ms) i kompilowała shadery (`getProgramInfoLog` 92 ms); czas animacji z zegara przeskakiwał wtedy o całą klatkę. Na końcu części powrotów jedna klatka całej sceny była biała: `forceContextLoss()` przy odmontowaniu Obserwatorium (bez niego 0 białych klatek w 10 przejściach).
- Po poprawce: Obserwatorium powstaje w bezczynności po pokazaniu zdjęcia w Drodze Mlecznej i zostaje między nurkowaniami (jeden kontekst WebGL, nowe dane podmieniają zawartość); płaszczyzna zdjęcia to bitmapa 2048 px z obiektu Blob (dekodowanie poza głównym wątkiem), shadery przez `compileAsync`, krok czasu przejścia najwyżej 33 ms. Pięć cykli naprzód i wstecz: p50 16,7 ms, p95 16,8 ms, max 33,4 ms, zero klatek > 50 ms (także w pierwszym nurkowaniu), zero białych klatek i skoków jasności.
- Koszt przeniesiony na otwarcie okna: budowa Obserwatorium w bezczynności dodaje 3 klatki 83–183 ms ok. 1,4–1,8 s po otwarciu (kamera Drogi Mlecznej wtedy stoi); samo otwarcie okna już wcześniej miało klatki 400, 100, 67 i 250–267 ms (fragment z three.js, budowa sceny Space3D).
- Czasy: nurkowanie 2,2 s i wejście 0,9 s (razem ok. 3,1 s, od zmiany z d26e5f3 bez osobnego ustawienia kamery); prompt zakładał 1,0 + 1,6 + 0,9 s. Nie zmienione.
- Niesprawdzone: inne karty graficzne i przeglądarki, okno przeglądarki w trybie z oknem (headful), zegar 120 Hz.

### Biała klatka, płynna zamiana scen i dłuższe wejście (6.11.2026)

Chromium 148 z oknem (headful) z ANGLE D3D11 na NVIDIA GeForce RTX 5070 (renderer z `WEBGL_debug_renderer_info`), 1920 × 1080 przy DPR 1, IC 434. Obraz ze screencastu CDP (wyjście kompozytora, ok. 35–47 z 60 klatek/s), klatki pominięte ze śladu CDP Tracing. W czasie pomiarów na pierwszym planie działała pełnoekranowa gra na tej samej karcie. Zasłaniała okno przeglądarki, które renderowało dalej, więc zrzutu samego ekranu nie było.
- Biała klatka na końcu powrotu:
  - aeb051b (`main`): całkowicie białe klatki (jasność 255) 22–35 ms po końcu powrotu w 2 z 4 powrotów.
  - bceedc9: 0 białych i 0 odstających klatek w 10 powrotach, w 2 powrotach po zmianie zdjęcia, przy samej zmianie zdjęcia, przy przełączeniu na Wszechświat lokalny i przy zamknięciu okna.
  - Wniosek: biała klatka (`forceContextLoss()` przy odmontowaniu Obserwatorium) była na `main`, a bceedc9 ją usuwa.
  - Po zmianach poniżej: Chromium 0/10, te same zdarzenia 0, Chrome 156 i Edge 156 po 0/5, DPR 1,25 (1728 × 1002) 0/5.
- Zamiana scen przed zmianą: krycia szły za wygładzonym e (sześcienne ease).
  - Zdjęcie pojawiało się w ok. 0,2 s.
  - Ziemia, ostrosłup i oś Obserwatorium pojawiały się, zanim kamera skończyła obrót, czyli zanim sceny się pokrywały.
  - Potem przez ok. 0,5 s obraz stał bez zmian.
  - Obrót kamery do pozy mostu i rozchylenie stożka z ok. 0,5° do 71° wypadały w najszybszej części zbliżania (środkowe 80 % obrotu: 0,41 s z wzoru) i urywały się w 4 klatkach tuż przed przenikaniem.
- Zamiana scen po zmianie: krycia, obrót i stożek idą za liniowym czasem k.
  - Obrót i stożek kończą się w `ALIGN_K` = 0,6 (środkowe 80 % obrotu: 1,0 s naprzód, 0,8 s wstecz).
  - Od tej chwili Ziemia (4,2 px, ten sam środek) i linia widzenia (−19,3°) pokrywają się w obu scenach: `seam()` przy k 0,6–0,99, naprzód i wstecz.
  - Elementy Obserwatorium pojawiają się dopiero od k = 0,6. Każde przenikanie trwa ≥ 0,23 czasu nurkowania (test: ≥ 0,5 s i ≤ 0,05 krycia na klatkę w obu kierunkach).
  - Samo zdjęcie pojawia się przez 0,83 s naprzód i 0,66 s wstecz; całe okno przenikania trwa 1,1 s naprzód i 0,87 s wstecz.
- Kryterium płynności: średnia bezwzględna różnica pikseli sceny między kolejnymi klatkami screencastu. Największa różnica w oknie przenikania podzielona przez medianę różnic części nurkowania z ruchem kamery (od k = 0,1 do początku okna):
  - przed: naprzód 2,08 (1,94 / 0,93), wstecz 1,95;
  - po (3 przebiegi w każdą stronę): naprzód 0,26–0,48, wstecz 0,24–0,44.
  - Szczyt różnic w całym nurkowaniu spadł z 1,94 do 1,80. Wyhamowanie ruchu przed przenikaniem (od 80 do 20 % ponad poziom przenikania) wydłużyło się z 76–83 ms do 167–192 ms.
- Czasy faz z klas okna (3 przebiegi):
  - naprzód: nurkowanie 2,23 → 2,77 s, wejście 0,91 → 1,13 s, razem 3,13 → 3,90 s (× 1,25);
  - wstecz bez zmian: 3,11 s;
  - przejścia CSS paneli trwają tyle co faza wejścia kierunku (`--dive-enter` z `DIVE_PHASE_MS`);
  - rozkładanie zdjęcia (5 s) bez zmian.
- Ślad wydajności całego przejścia:
  - naprzód: 1 pominięta klatka tuż przed wejściem paneli i 1 klatka głównego wątku 32 ms (synchroniczne `GetGLError` przy zmianie rozmiaru płótna w czasie rasteryzacji paneli);
  - wstecz: 1 pominięta klatka na starcie;
  - przerwa ok. 250 ms w screencaście na początku wejścia to artefakt screencastu, bo kompozytor rysował co 16,7 ms.
- Zostaje w jednej klatce (DOM poza sceną): pasek zdjęcia znika na starcie nurkowania i wraca na końcu powrotu; tytuł okna i pasek narzędzi zmieniają się na początku wejścia.
- Niesprawdzone: obraz na ekranie po kompozycji DWM (screencast pokazuje wyjście kompozytora Chromium), inne karty graficzne, Firefox i Safari, zegar 120 Hz, praca bez innej aplikacji obciążającej GPU.

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

## Wspólna scena Pozycji 3D (14.11.2026)

Pomiary Playwrightem (Chromium, swiftshader, 1600 × 900) na M 42, M 31 i zdjęciach M 51 i IC 434, porównane ze zrzutami sprzed zmiany:
- Droga Mleczna (M 42, M 31, IC 434, M 51) i Wszechświat lokalny (M 42, M 31, M 51) wyglądają jak przed zmianą. Zdjęcie samej Drogi Mlecznej (IC 434) we Wszechświecie ma kadr dawnej sceny w skali × 1/0,12 (test `photoGuide`).
- Położenia: poniżej 150 tys. lś jak dawna skala Drogi Mlecznej, dalej jak dawny Wszechświat × 1/0,12 (test `space3d`).
- Przelot zakładek w obie strony (klatki co 0,2 s czasu strony) bez skoków; pierścienie i galaktyki nie pojawiają się w kadrze Drogi Mlecznej. Zmiana obiektu z M 31 na M 42, która przełącza zakładkę, daje jeden przelot. Przy ograniczonym ruchu zmiana zakładki jest cięciem. Oddalenie kółkiem do granicy zoomu nie gubi sceny.
- Gwiazdozbiór z Ziemi (Orion) czyści się przy przejściu do Wszechświata; po powrocie gwiazdozbiory 3D są znów widoczne.
- Po recenzji: obiekt bez odległości (NGC 1432) we Wszechświecie pokazuje galaktyki i Grupę Lokalną, gromada 136 tys. lś (NGC 4147) w Drodze Mlecznej nie ma pierścieni ani galaktyk, w nurkowaniu (k = 0,15 i 0,4) podpisy i pierścienie gasną z tłem, a zmiana zakładki ze zdjęciem M 51 to ten sam przelot co bez zdjęcia.
- Szew nurkowania z obu zakładek (M 51, IC 434): środek Ziemi, kierunek linii widzenia i promień Ziemi w obu scenach zgodne do 1e-8 px. Cztery kolejne nurkowania tam i z powrotem, także po zmianie zakładki, wracają do sceny.

## Niebo NSNS: kopuła, kadrowanie, miniatury (15.11.2026)

- Źródło: Northern Sky Narrowband Survey, S. Ziegenbalg, CC BY-NC-SA 4.0. Kopuła i miniatury: DR0.1 „(Almost) true color” bez odejmowania gwiazd i Hα (HiPS `tc8`); kadrowanie dodatkowo DR0.2 `rgb8` (kontinuum RGB bez Hα, gwiazdy częściowo odjęte), bo DR0.1 nie ma kolorowego HiPS dla wersji bez Hα. Rząd 5 (12,9″/px), pokrycie 65 % nieba do δ ≈ −16° (na −16° kafelki mają 1–2 % pustych pikseli, na −18° ich nie ma).
- Lustra CDS zgłaszane w MocServer zwracają 404, więc kafelki idą przez pośrednika `/api/hips/` (PNG 650–800 KB → JPEG 66–95 KB). Poza Vite: nowy kafelek 0,14–0,33 s, z dysku 7 ms, Allsky 0,8 s. W `npm run dev` w czasie optymalizacji zależności (2 min na dysku F:) ten sam pośrednik odpowiadał po 6–35 s, część żądań dostała 502.
- Zrzuty Playwrighta (1600 × 1000, GPU): cała kopuła z podkładem Allsky (linie i podpisy nad obrazem, na południe od −16° gwiazdy katalogu), pole 8° z kafelkami rzędu 4, lista „Wygląd nieba” na górze „Warstwy”, kadr NGC 7000 z listy źródeł („NSNS bez Hα (DR0.2)”), katalog z miniaturami NSNS (obiekty południowe, np. Wielki Obłok Magellana, z DSS2). Bez błędów w konsoli.
- Zimne kafelki: klient czeka na nagłówki pośrednika do 20 s (DSS2 i PanSTARRS dalej 3 s na lustro), kopuła po porażce ponawia kafelki po 20 s bez ruchu widoku. Sprawdzone przy 8° wokół NGC 1535 (δ −12,7°) z pustym buforem pośrednika i przeglądarki: kafelki rzędu 4 doszły same, kafelki spoza pokrycia dają 404 (widoczne w konsoli jako nieudane zasoby).
- Miniatury: NSNS przy skali ≥ 15″/px i całym polu na północ od −16°; mniejsze pola (np. M 51 w karcie: 5″/px) z DSS2. Kadr na najwyższym rzędzie przeglądu malowany w rozdzielczości kafelka i powiększany z wygładzaniem (bez rombów HEALPix).
