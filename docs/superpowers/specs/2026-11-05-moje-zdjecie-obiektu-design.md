# Moje zdjęcie obiektu: projekt

Data: 5.11.2026. Status: do akceptacji użytkownika.

## Po co

Użytkownik chce przypiąć do obiektu katalogu własne zdjęcie i używać go zamiast domyślnego (DSS2 / AstroBin):

1. **Ładniejsza miniatura** w karcie obiektu, w szczegółach i w Katalogu.
2. **Porównanie** własnego zdjęcia z poprzedniej sesji (być może z innego teleskopu) z nowym kadrem: w kadrowaniu zdjęcie leży we właściwej skali, położeniu i obrocie, a prostokąt matrycy obecnego sprzętu jest nad nim.

Zdjęcie przechodzi przez nasz solver astrometrii (Skyshot, `/api/photo/solve`), więc jego położenie na niebie wynika z WCS, a nie z ręcznego dopasowania.

Później (osobne zadanie, poza tym zakresem) zdjęcie pojawi się jako warstwa na mapie nieba pod konturami mgławic. Dlatego już teraz zapisujemy pełny WCS i wymiary zdjęcia.

## Decyzje użytkownika

- **Dodawanie:** w szczegółach obiektu (`ObjectDetails`), w rzędzie przycisków („Pokaż na niebie”, „Pozycja 3D”, „Do planu”, „AstroBin”), przycisk „Dodaj moje zdjęcie”. Otwiera systemowe okno wyboru pliku, po wyborze od razu rusza solver.
- **Przełącznik:** w karcie obiektu (`ObjectCard` w `SkyCards.tsx`), w lewym górnym rogu zdjęcia, naprzeciw serca, kwadratowy przycisk z ikoną obrazu tej samej wielkości co serce (26 × 26 px, ikona 14 px). Przełącza tylko między „moje” a „domyślne”.
- **Jedno zdjęcie = jeden obiekt:** zdjęcie przypina się wyłącznie do obiektu, dla którego kliknięto „Dodaj moje zdjęcie”, nawet jeśli w kadrze są inne obiekty katalogu.
- **Miniatura 1:1:** środek, pole i rozmiar takie same jak domyślnej miniatury w danym miejscu, N u góry, E po lewej. Własne zdjęcie wpasowane przez WCS; część pola, której nie obejmuje, pochodzi z domyślnego DSS2. Bez ramki wokół zdjęcia.
- **Kadrowanie:** tak samo jak miniatura: zdjęcie wpasowane w obraz tła bez ramki, reszta pola z tła. Histogram i poziomy (`StretchDialog`) rozciągają całość, czyli zdjęcie razem z tłem, tak jak dziś DSS2.
- **Mapa nieba:** w tym zadaniu nic się na niej nie zmienia.
- **Czarne brzegi po stackowaniu** (kliny tam, gdzie klatki się nie pokrywały, i puste pasy po obrocie) są wycinane: w ich miejscu widać tło z przeglądu, tak jak poza zdjęciem. Krawędź jest ostra, bez rozmywania.

## Cele

- Dodanie, zmiana i usunięcie własnego zdjęcia obiektu z poziomu szczegółów.
- Przełącznik moje/domyślne w karcie; wybór działa wszędzie: karta, szczegóły, Katalog, kadrowanie.
- Zdjęcie wpasowane w obraz nieba z dokładnością astrometrii (gwiazdy zdjęcia pokrywają się z gwiazdami DSS2 w granicach ok. 1 px miniatury), także dla zdjęć szerokokątnych ze zniekształceniem (SIP).
- Dane zapisane lokalnie i trwale (przeładowanie strony, zamknięcie przeglądarki).

## Poza zakresem

- Warstwa zdjęcia na mapie nieba (`SkyDome`) i przycisk tej warstwy: osobne zadanie.
- Kilka zdjęć jednego obiektu, galeria, porównanie dwóch własnych zdjęć.
- Automatyczne przypinanie zdjęcia do innych obiektów w kadrze.
- Synchronizacja między urządzeniami, konta, wysyłanie zdjęć poza lokalny serwer.
- Edycja zdjęcia (kadrowanie, obrót, kolory).

## Antycele (porażka, nawet jeśli „działa”)

- Widoczne szwy, siatka trójkątów, ramka lub poświata na krawędzi zdjęcia.
- Zdjęcie przesunięte lub obrócone względem tła (gwiazdy się rozjeżdżają) albo odbite lustrzanie.
- Utrata lub nadpisanie projektu Eksploratora zdjęć (`photoStorage`, klucz `current`).
- Zacinanie się interfejsu: Katalog z tysiącami wierszy nie może czytać IndexedDB dla każdego wiersza ani składać obrazów w wątku głównym w sposób blokujący przewijanie.
- Sieć wywoływana przy renderze (konwencja projektu: pobieranie tylko w efektach).

## Ograniczenia

- Stos i styl projektu (CLAUDE.md): React 19, Zustand, TypeScript strict, bez średników, pojedyncze cudzysłowy, komentarze i interfejs po polsku, kolory tylko z tokenów `:root`, kwadratowe narożniki.
- Budżet startowego JS < 200 KB gzip (teraz ok. 153 KB): kod składania obrazów jest mały, ale jeśli urośnie, ładować leniwie.
- Testy tylko w `src/**/*.test.ts` (bez `.tsx`); logika w `src/lib/` bez Reacta. Serwer testowany przez `src/lib/*Server.test.ts`.
- Solver działa tylko z lokalną instalacją Skyshota (`npm run setup:skyshot`); `/api/photo/status` mówi, czy jest gotowy.
- `prefers-reduced-motion` respektowane (animacje pojawiania jak w `Thumb`).

## Jak (decyzje techniczne; moje, do sprawdzenia przy czytaniu)

### 1. Odwzorowanie zdjęcie ↔ niebo liczy serwer, przeglądarka tylko je interpoluje

WCS Skyshota (`scripts/.cache/skyshot-solver/src/types.rs`, `struct Wcs`) ma SIP, inne rzuty niż TAN (`proj`, `native_pole`) i `local_grid`. Nie przenosimy tego do TypeScriptu, a samo CD (bez SIP) jest za mało dokładne dla zdjęć szerokokątnych.

- Przy rozwiązywaniu serwer wylicza **siatkę punktów kontrolnych w pikselach zdjęcia** (regularna siatka np. 17 × 17 od krawędzi do krawędzi, także narożniki) i ich RA/Dec przez `wcs.pixel_to_sky` mostu Skyshota.
- Do tego potrzebna jest nowa komenda mostu `scripts/skyshot-bridge` (pixel → niebo, np. `grid`), bo obecna `project` liczy tylko niebo → piksel i obcina punkty dalej niż 1,05 promienia pola (narożne komórki siatki nieba by wypadały). **Zmiana mostu wymaga ponownego `npm run setup:skyshot`.**
- Ten sam krok sprawdza, czy **wybrany obiekt jest na zdjęciu**: jego RA/Dec przez istniejące `sky_to_pixel` (`project`), wynik w granicach `[0, width] × [0, height]`. Jeśli nie, zdjęcie nie zostaje przypięte, a użytkownik widzi komunikat (np. „Obiektu M 31 nie ma na tym zdjęciu”).
- Siatka jest zapisana razem ze zdjęciem; przeglądarka nie potrzebuje serwera, żeby je potem wyświetlać.

### 2. Jeden obraz złożony zamiast nakładki

Wspólny kompozytor w `src/lib/` (czysta logika + canvas): dostaje obraz tła z `getSkyImage` (środek RA/Dec, pole, rozmiar w px, czyli dokładnie jego płaszczyznę TAN) i własne zdjęcie z siatką, i zwraca jeden `Blob`.

- Wierzchołki siatki: RA/Dec → `gnomonic` → `tangentToPixel` z `src/lib/framing.ts` (te same konwencje co prostokąt kadru: N u góry, E po lewej). Każda komórka = 2 trójkąty; każdy trójkąt rysowany przekształceniem afinicznym źródło → cel z przycinaniem do trójkąta. Przycięcie poszerzone o ok. 1 px, żeby nie było szwów.
- Przed nakładaniem zdjęcie dostaje maskę czarnych brzegów (punkt 2a), np. `destination-in`.
- Zdjęcie przed nakładaniem pomniejszone do skali docelowej (gdy skala < 1/2), żeby nie było aliasingu w małych miniaturach.
- Parzystość (lustrzane odbicie) wynika z siatki, bez osobnej obsługi.
- Komórki całkowicie poza obrazem docelowym są pomijane.

Skoro wynik to zwykły `Blob` w miejscu obrazu z przeglądu, w kadrowaniu bez zmian działają: przesuwanie (`translate`), podmiana podglądu na ostry obraz, filtr SVG poziomów i histogram `StretchDialog` (czyta `imgRef`/`imgUrl`). „Histogram rozciąga wszystko” wychodzi samo.

### 2a. Maska czarnych brzegów

- Liczy ją serwer przy rozwiązywaniu, z rastra po `sharp` (po pomniejszeniu, przed kompresją JPEG, bo artefakty JPEG zaszumiają czerń przy krawędzi).
- Algorytm: zalewanie od krawędzi zdjęcia po pikselach prawie czarnych we wszystkich kanałach. Czarne obszary we wnętrzu zdjęcia, np. ciemne mgławice albo czarne niebo niestykające się z brzegiem, zostają. Potem mała erozja (1–2 px) w głąb zdjęcia, żeby nie było ciemnej obwódki.
- Zapisana obok zdjęcia jako osobny obraz maski (PNG w odcieniach szarości lub 1-bitowy; dobrze się kompresuje), a nie jako PNG/WebP z kanałem alfa (zdjęcie zostaje JPEG-iem).
- Brak czarnych brzegów oznacza brak maski: pole może być puste.
- Ta sama maska posłuży przyszłej warstwie na mapie nieba.
- Próg „prawie czarnego” i wielkość erozji ustala budowniczy. Kryterium: na zdjęciu testowym z obróconymi klatkami nie widać ani czarnych klinów, ani ciemnej linii na granicy z tłem.

### 3. Miejsca użycia

| Miejsce | Tło (gdy „moje”) | Pole i rozmiar |
|---|---|---|
| Karta obiektu (`SkyCards.tsx`) | DSS2 kolor | jak dziś: `fovDeg = min(4, max(0.25, max(maj, 3)·2.2/60))`, 480 px |
| Szczegóły (`ObjectDetails.tsx`) | DSS2 kolor (zamiast AstroBin) | jak dziś: współczynnik 2.6, 560 px |
| Katalog (`CatalogView.tsx`, `getThumb`) | DSS2 kolor, `coarser: 1` | `thumbFovDeg`, 224 px |
| Kadrowanie (`FramingPanel.tsx`) | wybrana warstwa (DSS2 cz-b, kolor, PanSTARRS) | środek, pole i rozmiar załadowanego obrazu (`imageRa`, `imageDec`, `imageFov`, 800 px), podgląd i ostry |

- Gdy wybór to „domyślne” albo obiekt nie ma zdjęcia: wszystko jak dziś (w szczegółach dalej AstroBin, jeśli jest).
- Gdy tła nie da się złożyć (brak kafelków HiPS, błąd sieci): własne zdjęcie i tak się pokazuje, a resztę pola wypełnia czarne tło. Błąd tła nie może ukryć zdjęcia użytkownika (moja decyzja). Taki wynik nie trafia do trwałego bufora, żeby przy następnej próbie tło mogło się doczytać.
- W kadrowaniu podpis w prawym dolnym rogu dostaje dopisek „· moje zdjęcie”, gdy jest wpasowane.
- `Thumb` dostaje tryb „moje”; obraz złożony buforowany pod kluczem zawierającym identyfikator zdjęcia (np. skrót SHA z solvera), pole, rozmiar i warstwę, nie w kluczach tła zależnych tylko od współrzędnych (`tracker-thumbs-v2`). Usunięcie lub zmiana zdjęcia unieważnia jego obrazy.

### 4. Zapis

- **IndexedDB:** nowy magazyn w bazie `tracker-photo` (podbicie wersji 1 → 2 w `onupgradeneeded`, magazyn `projects` zostaje nietknięty) albo osobna baza; klucz = identyfikator obiektu (`o.id`). To ten sam klucz co ulubione (`favoriteIds`) i plan (`objectId`), więc stabilność identyfikatorów między wersjami katalogu jest taka sama jak dla nich. Osobna migracja nie jest potrzebna. Rekord: identyfikator zdjęcia, nazwa pliku, obraz jako `Blob` JPEG (nie base64 z odpowiedzi solvera), maska czarnych brzegów jako `Blob` lub `null`, szerokość, wysokość, data dodania, astrometria z pełnym WCS (dla przyszłej warstwy mapy), siatka punktów kontrolnych.
- **Zustand (persist):** mały indeks `ownPhotos: Record<objectId, { photoId, shown }>`. Dzięki niemu karta i wirtualizowane wiersze Katalogu wiedzą od razu, czy obiekt ma zdjęcie i co pokazać, bez czytania IndexedDB. Nowe pole z wartością domyślną `{}`; sprawdzić `persistence.test.ts` (migracja starego zapisu bez pola).
- Spójność: jeśli indeks wskazuje zdjęcie, którego nie ma w IndexedDB (np. wyczyszczone dane witryny), miniatura wraca do domyślnej, a wpis indeksu jest usuwany.

### 5. Interfejs

**Szczegóły obiektu, rząd przycisków:**
- Brak zdjęcia: „Dodaj moje zdjęcie”.
- Jest zdjęcie: „Zmień moje zdjęcie” i „Usuń moje zdjęcie”.
- Ukryty `<input type="file">` z typami jak w Eksploratorze zdjęć (JPEG, PNG, WebP, TIFF, FITS).
- W trakcie rozwiązywania przycisk pokazuje stan („Rozwiązywanie…”) i jest wyłączony; zamknięcie szczegółów przerywa żądanie (`AbortController`).
- Błędy (413, 415, 422, brak rozwiązania, obiektu nie ma w kadrze) jako komunikat `role="alert"` pod przyciskami; teksty z serwera, jak w `PhotoExplorer`.
- Solver niedostępny (`/api/photo/status` ≠ gotowy): „Dodaj moje zdjęcie” wyłączony z podpowiedzią „Wymaga lokalnego solvera Skyshot (npm run setup:skyshot)”. Przełączanie i usuwanie istniejących zdjęć działa dalej.

**Karta obiektu:**
- Przycisk z ikoną `Image` (lucide-react) w lewym górnym rogu `.object-photo`, styl jak `.favorite-button` (lustrzane położenie: `left: 6px`), `aria-pressed`, `title`/`aria-label`: „Pokaż moje zdjęcie” / „Pokaż zdjęcie domyślne”. Aktywny („moje”) w kolorze akcentu, jak aktywne serce.

**Moje decyzje (do potwierdzenia):**
- Po udanym dodaniu wybór ustawia się na „moje”.
- „Zmień” zastępuje poprzednie zdjęcie (zawsze najwyżej jedno na obiekt).
- „Usuń” bez okna potwierdzenia (oryginalny plik zostaje u użytkownika).
- Przełącznik w karcie jest ukryty, gdy obiekt nie ma zdjęcia.
- W Katalogu nie ma przełącznika; Katalog pokazuje to, co wybrano w karcie.
- W kadrowaniu nie ma osobnego przycisku; kadrowanie słucha przełącznika z karty, która jest widoczna obok.

### 6. Serwer

- Ścieżka rozwiązywania dla Eksploratora zdjęć zostaje bez zmian w zachowaniu (ten sam format odpowiedzi `PhotoProject`).
- Dla własnego zdjęcia obiektu: osobny adres albo rozszerzenie żądania o RA/Dec obiektu. Odpowiedź zawiera maskę czarnych brzegów (punkt 2a) i obraz (JPEG po `sharp`, maks. 3200 px, jak dziś: FITS przechodzi przez `preview` Skyshota, a JPEG, PNG, WebP i TIFF trafiają bez rozciągania, tak jak w Eksploratorze zdjęć; liniowy TIFF będzie ciemny, co jest moją świadomą decyzją, bo zwykle wgrywa się zdjęcie już obrobione), wymiary, astrometrię z WCS, siatkę punktów kontrolnych i wynik sprawdzenia obiektu. Limity rozmiaru i pikseli jak w `server/photo.ts`.

## Zostawione budowniczemu

- Gęstość siatki (17 × 17 to punkt wyjścia; ma wystarczyć, żeby SIP nie dawał widocznych załamań na krawędziach trójkątów przy 800 px kadrowania).
- Czy kompozytor działa w wątku głównym (canvas), czy w workerze (`OffscreenCanvas`); warunek: brak zacięć przy przewijaniu Katalogu.
- Gdzie dokładnie trzymać bufor obrazów złożonych (Cache Storage z limitem jak `imageCache`, czy pamięć).
- Nazwy plików, typów i adresu API.

## Weryfikacja

- Testy jednostkowe: maska (klin w narożniku wycięty, czarny obszar we wnętrzu zostaje, zdjęcie bez brzegów = brak maski), budowa siatki trójkątów i przekształceń afinicznych (znane WCS → znane piksele), parzystość, pomijanie komórek poza kadrem, klucz bufora, migracja zapisu Zustand, magazyn IndexedDB (dodaj, zmień, usuń, brak rekordu), serwer: obiekt w kadrze / poza kadrem, błędy wejścia.
- Ręcznie (Playwright, zdjęcia testowe w `scripts/.cache/observatory-photos`: M44, M45, M51, IC434): gwiazdy własnego zdjęcia pokrywają się z DSS2 w karcie, w szczegółach, w Katalogu i w kadrowaniu (także po przesunięciu, zmianie warstwy, powiększeniu i z rozciągniętym histogramem); brak szwów i ramki; przełącznik działa i przetrwa przeładowanie; usunięcie przywraca domyślne.
- Projekt Eksploratora zdjęć (`current`) nienaruszony po migracji bazy.
- Po teście przywrócić stan profilu Playwrighta (CLAUDE.md).
