# Obrazy nieba z kafelków HiPS: dokument projektu

Data: 31.10.2026. Status: zatwierdzony przez użytkownika 1.11.2026. Dotyczy aplikacji (`src/`), nie skryptów danych.

## 1. Cel i uzasadnienie

Zdjęcia nieba w kadrowaniu praktycznie się nie wczytują, a w katalogu często zostają puste. Użytkownik nie doczekał się obrazu przy kadrowaniu żadnego obiektu. Celem jest niezawodna i szybka baza obrazów, ostrzejsza przy przybliżeniu niż dzisiejsze wycinki.

Diagnoza z 31.10.2026:
- **Jedno źródło.** Wszystkie obrazy pochodzą z usługi hips2fits CDS w Strasburgu, która przycina i rzutuje obraz po stronie serwera. Usługa istnieje tylko w CDS. „Zapasowy” serwer `alaskybis` stoi w tej samej podsieci (`130.79.128.x`) co `alasky`, więc nie chroni przed awarią ośrodka. 31.10 CDS nie odpowiadał z czterech niezależnych sieci: z komputera użytkownika, WebFetch, Exa i Firecrawl.
- **Ostatnia rezerwa zawodzi.** NASA SkyView odpowiada w 0,7–11 s. Dla pola 4–6° przy 800 px zwraca stronę błędu HTML zamiast obrazu. Nie wysyła nagłówka CORS, więc nie trafia do Cache Storage.
- **Błędy w kodzie, naprawione doraźnie 31.10** (`src/lib/thumbs.ts`, `Thumb.tsx`, `FramingPanel.tsx`, testy w `src/lib/thumbs.test.ts`):
  - zapytanie nie miało limitu czasu i wisiało ok. 21 s na każdy serwer, a kolejka ma tylko 5 miejsc; teraz limit wynosi 8 s;
  - nieudany obrazek SkyView zostawał zepsutą grafiką; teraz pokazuje „BRAK ZDJĘCIA” albo komunikat;
  - w trybie deweloperskim `StrictMode` podwaja efekt kadrowania, więc drugi odbiorca dostawał z pamięci zapytanie już przerwane przez pierwszego i obraz kadru nie przychodził nigdy; teraz takie zapytanie zaczyna się od nowa.

Po poprawce aplikacja nie zawiesza się, ale przy awarii CDS nadal nie ma obrazów. Ten projekt usuwa zależność od hips2fits.

## 2. Pomiar źródeł (31.10.2026, sieć użytkownika)

Te same kafelki HiPS DSS2 color (512 × 512 px, JPEG, rząd do 9, czyli ok. 0,8″/px) są na kilku lustrach. Kafelek `Norder3/Dir0/Npix300.jpg` ma na każdym lustrze ten sam rozmiar, 33 396 B.

| Lustro DSS2 color | Adres bazowy | Czas kafelka | CORS |
|---|---|---|---|
| ESA CDN (CDN77) | `https://cdn.skies.esac.esa.int/DSSColor` | 0,15–0,65 s | tak |
| MAST, AWS S3 | `https://stpubdata.s3.us-east-1.amazonaws.com/mast/skybackgrounds/DSSColor` | 0,55–0,7 s | tak |
| CASDA (CSIRO, Australia) | `https://casda.csiro.au/hips/DSS2/color` | ok. 2 s | tak |
| IRSA (NASA/Caltech) | `https://irsa.ipac.caltech.edu/data/hips/CDS/DSS2/color` | ok. 2,3 s | **nie** |
| CDS | `https://alasky.cds.unistra.fr/DSS/DSSColor`, `https://alaskybis.cds.unistra.fr/DSS/DSSColor` | 31.10 i 1.11 nie odpowiadał | niesprawdzone |

Kafelki niskich rzędów sprawdzone 1.11 (wszystkie z CORS):
- `Norder0/Dir0/Npix0.jpg` na ESA: 48 KB, 0,2 s.
- `Norder3/Allsky.jpg` (podgląd całego nieba w jednym pliku):
  - DSS2 na ESA: 806 KB, 0,3 s;
  - DSS2 na MAST: 1 s;
  - PanSTARRS na MAST: 1,45 MB, 1,2 s.

PanSTARRS DR1 color (i, r, g; `ivo://CDS/P/PanSTARRS/DR1/color-i-r-g`):
- MAST S3 `https://stpubdata.s3.us-east-1.amazonaws.com/mast/skybackgrounds/PanSTARRS`: rząd do 11 (ok. 0,2″/px), kafelek 0,7 s, CORS tak, pokrycie od deklinacji −30° na północ.
- Ostrzejszy przy małych galaktykach i mgławicach planetarnych. Tło jest jednak odejmowane, więc rozległe mgławice prawie znikają (Welon był ledwo widoczny), a jasne gwiazdy dają kolorowe artefakty.

DSS2 red (czarno-biały) nie ma szybkiego lustra z CORS. Jest na IRSA, ale bez CORS, a na CASDA i ESA zwraca 404. Kanał R kafelków DSS2 color pochodzi z tych samych płyt (`hips_rgb_red = DSS2Merged`). Na M 27 wygląda prawie jak DSS2 red, tylko ma łagodniejsze rozciągnięcie.

Odrzucone źródła:
- DESI Legacy Survey: dla NGC 7000 zwraca pusty obraz (brak pokrycia Drogi Mlecznej), a M 51 ma artefakty.
- SkyView: wolny, zwraca błędy i nie ma CORS.
- Wycinki DSS ze STScI i ESO: GIF-y po 1–2 MB, małe pola.
- Własne lustro na konuzastro.pl: prawa do DSS (Caltech, AAO, PPARC: „distributed by agreement”), lista HiPS ESA zabrania kopiowania bez zgody, a danych są gigabajty.

## 3. Cele, nie-cele, anty-cele

**Cele**
- Wszystkie obrazy nieba w aplikacji pochodzą z kafelków HiPS rzutowanych w przeglądarce: kadrowanie, karty widoku Niebo, szczegóły obiektu, katalog i planer.
- Kilka niezależnych luster (różne instytucje i kontynenty), a CDS dopiero na końcu kolejki.
- Ostrzejszy obraz przy przybliżeniu: rząd kafelków dobrany do skali, do 0,8″/px dla DSS2.
- Trzy warstwy kadrowania:
  - Kolor (DSS2 color);
  - Czarno-biała (kanał R DSS2 color ze wzmocnionym kontrastem);
  - PanSTARRS, opcjonalna i tylko na północ od deklinacji −30°.
- Kryteria odbioru. To warunki, które muszą być spełnione, a nie cele orientacyjne. Obowiązują także na wolnym łączu (decyzja użytkownika z 1.11, punkt 4).
  - Na łączu użytkownika:
    - ostry obraz kadru przy pustej pamięci podręcznej w ≤ 3 s;
    - drugi raz w ≤ 0,5 s.
  - Na wolnym łączu (profil: ok. 2 Mbit/s pobierania i 150 ms opóźnienia; moja decyzja co do liczb):
    - pierwszy, miękki podgląd kadru w ≤ 3 s;
    - 12 widocznych miniatur katalogu w ≤ 3 s.
  - Przy niedostępnym pierwszym lustrze obraz z kolejnego przychodzi najwyżej o 3 s później.

**Nie-cele**
- Bez własnego serwera, pośrednika ani kopii HiPS.
- Bez Aladin Lite jako zależności. To moja decyzja: jest ciężki i przy starcie może pytać serwery CDS o listę przeglądów, a geometria TAN jest już w `src/lib/framing.ts`.
- Bez zmian w kopule nieba (`SkyDome`), mapie Drogi Mlecznej i zdjęciach z AstroBin.
- Bez zewnętrznego linku „Aladin Lite” w `ObjectDetails`: zostaje, jak jest.

**Anty-cele (porażka, nawet gdy obraz się wczytuje)**
- Obraz przesunięty, obrócony albo odbity względem prostokąta matrycy. Błąd geometrii jest gorszy niż brak obrazu.
- Rzutowanie w wątku głównym, które przycina interfejs przy przeciąganiu kadru.
- Startowy JS powyżej budżetu 200 KB gzip (dziś ok. 134 KB).
- Pobieranie przez sieć w czasie renderu, wbrew konwencji projektu.
- Masowe pobieranie kafelków na zapas (np. dla całego katalogu) z darmowych usług. Pobieramy tylko to, co jest potrzebne na ekranie.
- Zależność od jednej instytucji.

## 4. Decyzje użytkownika (31.10.2026)

- Kierunek: DSS2 z luster ESA i MAST składane w przeglądarce, ostrzejsze przy przybliżeniu, z PanSTARRS jako dodatkową warstwą.
- Poprawka doraźna (limit czasu i „BRAK ZDJĘCIA”) została zrobiona od razu, przed tym projektem.
- 1.11: czasy z punktu 3 obowiązują także na wolnym łączu, zgodnie z `docs/wymagania.md` („płynnie na słabych komputerach oraz wolnych łączach”). Kadr najpierw pokazuje miękki podgląd, który potem się wyostrza, a miniatury mogą być nieco mniej ostre. Odpowiedź użytkownika brzmiała „Ok” na pytanie z tym wariantem jako zalecanym.

## 5. Rozwiązanie

### 5.1 Format HiPS i lustra

- Adres kafelka: `{baza}/Norder{k}/Dir{⌊n/10000⌋·10000}/Npix{n}.jpg`, gdzie `n` to indeks HEALPix NESTED na rzędzie `k`. Kafelki mają 512 × 512 px i układ równikowy (`hips_frame = equatorial`). Rząd minimalny to 0.
- Kolejność luster:
  - DSS2: ESA CDN → MAST S3 → CASDA → CDS `alasky` → CDS `alaskybis`. IRSA pomijamy, bo bez CORS kafelka nie da się przerzutować na płótnie.
  - PanSTARRS: MAST S3 → CDS (`https://alasky.cds.unistra.fr/Pan-STARRS/DR1/color-i-r-g`; ścieżki 31.10 nie dało się sprawdzić).
- Jedno lustro czeka na kafelek najwyżej ok. 3 s, potem pytamy kolejne. Lustro, które zawiodło, spada na koniec kolejki do końca sesji. Nie wysyłamy jednego kafelka równolegle do wszystkich luster.
- Każde pobranie ma limit czasu i przerwanie (`AbortSignal`). Zostaje zachowanie z poprawki 31.10: zapytanie przerwane przez innego odbiorcę zaczyna się od nowa.

### 5.2 Rzutowanie na obraz TAN

- Wyjście ma tę samą geometrię co dzisiejsze wycinki hips2fits, więc reszta kodu (`tangentToPixel`, `pixelToTangent`, `frameCorners`) się nie zmienia:
  - rzut gnomoniczny (TAN) wokół środka obrazu;
  - N u góry, E po lewej;
  - skala `2·tan(fov/2)/W` rad/px;
  - środek obrazu w `x = W/2`.
- Dla każdego piksela wyjścia:
  1. współrzędne płaszczyzny stycznej → RA/Dec (`gnomonicInverse`);
  2. RA/Dec → indeks HEALPix NESTED na rzędzie `k + 9`;
  3. z indeksu: numer kafelka (`n >> 18`) i położenie piksela w kafelku (rozplot bitów 18 najmłodszych bitów);
  4. próbka koloru.
- **Ryzyko:** orientacja pikseli w kafelku (który rozplecony bit to kolumna, czy wiersze są odwrócone) wynika ze standardu HiPS IVOA. Trzeba ją potwierdzić testem na znanych gwiazdach (punkt 7), a nie zgadywać.
- Rząd kafelków to najmniejsze `k`, przy którym piksel kafelka nie jest większy niż piksel wyjścia, obcięte do rzędu maksymalnego przeglądu.
- Kadrowanie obejmuje pola od ok. 0,1° (przybliżenie ×4) do 60° (pole 30° przy przybliżeniu ×0,5). Liczba kafelków na obraz musi pozostać rozsądna, rzędu kilkunastu.
- **Podgląd jest obowiązkowy.** Kadr najpierw składa obraz z kafelków kilka rzędów niższych, o łącznym transferze ok. 300 KB, a potem podmienia go na ostry. `Allsky.jpg` (806 KB) jest za ciężki na pierwszy podgląd na wolnym łączu.
- **Miniatury mają ograniczony rząd kafelków.** Rząd jest grubszy niż wynika z reguły powyżej, tak by 12 widocznych miniatur zmieściło się w ok. 700 KB. Na wolnym łączu przekłada się to na ok. 3 s.
- Rzutowanie odbywa się w module workera ładowanym leniwie, poza startowym JS. Dekodowanie przez `createImageBitmap`, odczyt pikseli przez `OffscreenCanvas`, wynik jako blob JPEG albo `ImageBitmap` dla komponentu.
- Warstwa czarno-biała: kanał R kafelków DSS2 color z rozciągnięciem kontrastu w rendererze. Zastępuje dzisiejszy filtr CSS `grayscale(1) contrast(1.15)`, który uśrednia kanały.

### 5.3 Pamięć podręczna

- Kafelki trafiają do Cache Storage (nowy cache, np. `tracker-hips-v1`) i dzielą je sąsiednie obiekty oraz kolejne wizyty.
- Gotowe miniatury katalogu (128 px) też są zapisywane, jak dziś. Złożenie miniatury wymaga 1–4 kafelków po 30–200 KB.
- Stary cache `tracker-thumbs-v1` trzeba usunąć, bo jego klucze nie pasują do nowego mechanizmu.

### 5.4 Miejsca w interfejsie

| Miejsce | Plik | Rozmiar | Pole |
|---|---|---|---|
| Kadrowanie | `FramingPanel.tsx` | 800 px | 0,1–60° |
| Karty widoku Niebo | `SkyCards.tsx` przez `Thumb` | 480 px | 0,25–4° |
| Szczegóły obiektu | `ObjectDetails.tsx` przez `Thumb` | 560 px (16:9) | 0,3–4° |
| Katalog | `CatalogView.tsx` przez `Thumb` | 128 px | `thumbFovDeg` 0,2–4° |
| Planer | `PlannerView.tsx` przez `Thumb` | 128 px (rys. 52 px) | jw. |

- Kadrowanie dostaje przełącznik warstwy PanSTARRS. Dla obiektów na południe od deklinacji −30° przycisk jest wyłączony i podpisany.
- Podpisy źródła trzeba zmienić:
  - w kadrze dziś „CDS hips2fits”, potem np. „DSS2 · ESA/MAST” albo „PanSTARRS · MAST”;
  - atrybucję danych w `ObjectDetails.tsx` (linia „zdjęcia: … DSS2 przez CDS hips2fits”) uzupełnić o podziękowania wymagane przez DSS (`obs_ack` w `properties`: STScI, Palomar/Caltech, UK Schmidt/AAO) i Pan-STARRS1.
- W `docs/wymagania.md` trzeba zaktualizować uwagę o miniaturach z hips2fits.

### 5.5 Ustalenia projektanta (moje decyzje, do sprawdzenia przy czytaniu)

- Luki w obrazie wypełniamy z DSS2 albo oznaczamy wyraźnie (np. kreskowaniem), nigdy czystą czernią, która udaje ciemną mgławicę. Dotyczy to pól PanSTARRS przecinających deklinację −30° i kafelków, których nie zwróciło żadne lustro.
- Miniatury w katalogu, planerze, kartach i szczegółach zostają czarno-białe, jak w wymaganiu nr 1. Warstwy wybiera się tylko w kadrowaniu.
- PanSTARRS to trzecia, rozłączna warstwa w kadrowaniu, obok „Czarno-białej” i „Koloru”.
- Prawdziwe kafelki do testu geometrii leżą w ignorowanym przez git `scripts/.cache`, tak jak inne dane źródłowe projektu.
- Porównanie z hips2fits to kontrola po wdrożeniu, gdy CDS znów działa, a nie warunek odbioru. Geometrii pilnuje test na gwiazdach.

## 6. Zostawione budowniczemu

- Własna implementacja HEALPix (ok. 60 linii, bez zależności) albo mała biblioteka. Decyduje budżet i testy.
- Interpolacja: najbliższy sąsiad albo dwuliniowa; dwuliniowa jest lepsza, gdy piksel wyjścia jest mniejszy od piksela kafelka.
- Dokładny rząd podglądu kadru i rząd miniatur, w granicach transferu z punktu 5.2.
- Liczba workerów, kolejka i priorytety (to, co widać na ekranie, idzie pierwsze, jak dziś).
- Limit rozmiaru Cache Storage i sposób usuwania starych kafelków.
- Rzutowanie poza kadrowaniem: z kafelków za każdym razem czy przez zapisaną miniaturę.

## 7. Weryfikacja

- **Testy jednostkowe HEALPix:** ang2pix NESTED na kilku rzędach i punktach (biegun N i S, RA = 0°/360°, równik, granice ścian bazowych). Wartości wzorcowe z niezależnej implementacji (np. `astropy_healpix` lub `healpy` w skrypcie poza aplikacją), wpisane do testu.
- **Test geometrii:** na obrazie TAN złożonym z prawdziwych kafelków jasne gwiazdy wypadają w oczekiwanym pikselu ±1 px. Gwiazdy dobrane tak, by sprawdzić:
  - okolicę RA ≈ 0° (np. α And);
  - okolicę bieguna (Polaris);
  - równik (δ Ori);
  - południe (Fomalhaut);
  - lustrzane odbicie i obrót (gwiazda poza środkiem w znanym kierunku).
- **Test luster:** jak w `thumbs.test.ts`, na sztucznych zegarach: gdy pierwsze lustro wisi, obraz przychodzi z kolejnego w zakładanym czasie. Zapytanie przerwane przez innego odbiorcę zaczyna się od nowa.
- **Pomiar w aplikacji** (zrzuty Playwrightem, bo panel przeglądarki bywa ukryty), na łączu użytkownika i z ograniczeniem sieci do profilu wolnego łącza z punktu 3, przy pustej pamięci podręcznej i przy pamięci zapełnionej:
  - czas do obrazu kadru;
  - czas do 12 miniatur katalogu;
  - płynność przeciągania kadru.
- **Budżet:** `npm run build` i startowy JS < 200 KB gzip.
- **Porównanie z hips2fits,** gdy CDS znów działa: ten sam obiekt, pole i rozmiar; gwiazdy w tych samych pikselach ±1 px.
