# KONUZASTRO Tracker: lista wymagań

Cel: alternatywa dla Telescopiusa, SkySafari i Stellarium. Ma być czytelniejsza i szybsza, wyglądać jak część strony konuzastro.pl (subdomena) i działać płynnie na słabych komputerach oraz wolnych łączach.

Każda linia ma dowód: test (T), sprawdzenie w przeglądarce przy 1440 px (P) albo sprawdzenie ruchu sieciowego (S).

| # | Wymaganie | Dowód | Stan |
|---|-----------|-------|------|
| 1 | Miniatury obiektów w katalogu, czarno-białe, pobierane i buforowane | P + S (Cache Storage, drugi raz bez sieci) | ☑ |
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

## Stan na 22.10.2026

Wszystkie punkty zrealizowane i sprawdzone (22 testy Vitest, build, zrzuty Playwrighta przy 1536 px). Uwagi:
- Przejrzystości nie podaje żadne darmowe API z CORS (7Timer go nie ma), więc karta pogody pokazuje wyliczoną „ocenę nieba” (zachmurzenie, wilgotność, punkt rosy, widzialność) i tak ją nazywa.
- Odległości (6 628 obiektów) to mediana wartości z Wikidata; model Galaktyki w 3D jest poglądowy.
- Kopuła: N u góry i E po lewej (mapa trzymana nad głową). Prototyp miał E po prawej, jak mapa terenu.
- Miniatury: hips2fits (CDS) odpowiada w 1,5–7 s na pierwsze zapytanie; potem są w Cache Storage.
