# Moje zdjęcia na mapie nieba: projekt

Data: 5.11.2026. Status: do akceptacji użytkownika. Gałąź: `feat/zdjecia-na-niebie`.

## Po co

Użytkownik przypina do obiektów własne zdjęcia z astrometrią (funkcja „Moje zdjęcie obiektu”, `docs/superpowers/specs/2026-11-05-moje-zdjecie-obiektu-design.md`). Teraz chce zobaczyć je na kopule nieba (`SkyDome`), na swoim miejscu wśród gwiazd, **pod konturami mgławic**, żeby porównać obrysy z katalogu (OpenNGC, mgławice ciemne) z tym, co naprawdę wyszło na zdjęciu.

## Decyzje użytkownika

- Zdjęcie leży na niebie we właściwym miejscu, skali i obrocie: gwiazdy zdjęcia pokrywają się z gwiazdami kopuły.
- Kontury mgławic są warstwą wierzchnią, nad zdjęciem.
- Bez ramki wokół zdjęcia.
- Przełącznik warstwy na liście „Warstwy” (obok „Linie”, „Kontury”, „Okręgi obiektów”…), stan trwały jak `showOutlines`.
- Na kopule leżą **tylko zdjęcia z wyborem „moje”** (`ownPhotos[id].shown === true`). Przełącznik w karcie obiektu ukrywa zdjęcie także na kopule.
- **Krycie: suwak** w „Warstwach”, zapamiętywany po przeładowaniu.
- **Gwiazdy kopuły są zasłonięte zdjęciem** (na zdjęciu widać jego własne gwiazdy; przy kryciu < 100% kropki kopuły prześwitują).
- **Droga Mleczna, siatka wysokości, południk i linie gwiazdozbiorów leżą pod zdjęciem** (po pytaniu recenzenta projektu). Nad zdjęciem zostają tylko kontury, elipsy, etykiety, ziemia, tor i znaczniki. Skutek uboczny przyjęty przez użytkownika: Droga Mleczna także pod gwiazdami całej kopuły.

## Cele

- Przełącznik „Moje zdjęcia” włącza i wyłącza warstwę; stan przetrwa przeładowanie.
- Zdjęcie wpasowane przez zapisaną siatkę WCS (17 × 17 punktów) z dokładnością ok. 1 px ekranu przy każdym kierunku widoku, powiększeniu (pełna kopuła do `MIN_FOV` = 8°) i czasie; także zdjęcie odbite lustrzanie.
- Płynne obracanie, powiększanie i odtwarzanie nocy z kilkoma–kilkudziesięcioma zdjęciami.
- Pamięć: bez stałych dziesiątek MB na zdjęcie; rozdzielczość dobrana do wielkości zdjęcia na ekranie.

## Poza zakresem

- Głębsze powiększenie kopuły niż 8° (przy 8° zdjęcie ok. 1° zajmuje ok. 10% widoku). Jeśli to za mało do porównywania obrysów, to osobne zadanie.
- Kliknięcie lub najechanie na zdjęcie (wybór obiektu, podpowiedź): kliknięcia działają jak dziś, zdjęcie ich nie przechwytuje.
- Zdjęcia w widoku 3D (`Space3D`) i na liście „Warstwy 3D”.
- Zmiany serwera, mostu Skyshota i formatu rekordów w IndexedDB.

## Antycele (porażka, nawet jeśli „działa”)

- Szwy, siatka trójkątów, ramka, ciemna obwódka po masce lub poszarpana (schodkowa) krawędź zdjęcia.
- Zdjęcie przesunięte, obrócone lub odbite względem gwiazd kopuły.
- Zdjęcie nad konturami, etykietami lub nad ziemią (pod horyzontem, także własnym).
- Zacinanie przy przeciąganiu kopuły; dekodowanie pełnych zdjęć przy każdej klatce; stałe trzymanie pełnej rozdzielczości w pamięci.
- Błąd jednego zdjęcia (brak rekordu w IndexedDB, uszkodzony plik) psuje kopułę albo inne zdjęcia.

## Ograniczenia

- Stos i styl projektu (CLAUDE.md): React 19, Zustand, TypeScript strict, bez średników, pojedyncze cudzysłowy, komentarze i interfejs po polsku, kolory tylko z tokenów `:root`.
- Startowy JS < 200 KB gzip (dziś 152,4 KB). Kopuła jest w startowym pakiecie, więc kod warstwy ma być mały; dane zdjęć ładowane tylko, gdy warstwa jest włączona i są zdjęcia „moje”.
- Testy tylko w `src/**/*.test.ts`; logika rzutu w `src/lib/` bez Reacta i bez WebGL (testowalna w Node).
- Rysowanie kopuły jest synchroniczne w `useLayoutEffect` (gwiazdy WebGL2, potem nakładka 2D). Sieć przy renderze zakazana; odczyt IndexedDB i dekodowanie uruchamiane z rysowania są dopuszczalne tak jak ładowanie postaci gwiazdozbiorów (`artCache`, `img.onload → setFrame`).

## Jak (decyzje techniczne; moje, do sprawdzenia przy czytaniu)

### 1. Zdjęcie jako siatka z teksturą w istniejącym kontekście WebGL2 gwiazd

Płótno gwiazd (`glRef`, WebGL2) leży pod nakładką 2D. Zdjęcia rysuje ten sam kontekst, **po gwiazdach** w tej samej klatce. Pod płótnem gwiazd dochodzi trzecie płótno 2D („spód”). Kolejność warstw `.sky-stage` od dołu:

1. tło sceny (gradient CSS, jak dziś);
2. **spód** (nowe płótno 2D): smuga Drogi Mlecznej, siatka wysokości z podpisami, kierunki azymutu, południk, linie gwiazdozbiorów, czyli dokładnie te fragmenty rysowania, które dziś idą do nakładki przed konturami; kod przenosi się bez zmian poza kontekstem, na którym rysuje;
3. **WebGL**: `clear → gwiazdy → zdjęcia`;
4. **nakładka** (jak dziś, bez przeniesionych fragmentów): kontury, elipsy, etykiety, ziemia, Księżyc, postacie, tor, plan, celownik.

Dzięki temu:

- zdjęcie zasłania gwiazdy kopuły i warstwy spodu (decyzje użytkownika), a przy kryciu < 100% prześwitują;
- wszystko z nakładki jest nad zdjęciem; to spełnia wymaganie „kontury na wierzchu”. Ziemia z nakładki zakrywa jak dziś także Drogę Mleczną i siatkę pod horyzontem;
- Droga Mleczna jest odtąd pod gwiazdami; tryb `screen` działa na spodzie tak samo jak dziś na nakładce (na przezroczystym płótnie), więc jej wygląd się nie zmienia, tylko gwiazdy nie są już przez nią przymglone;
- koszt: jedno płótno więcej w rozmiarze sceny (pamięć jak nakładka);
- wspólne wierzchołki trójkątów: brak szwów bez poszerzania trójkątów (`expandTriangle` niepotrzebne);
- mipmapy tekstury: brak aliasingu przy pełnej kopule.

### 1a. Nakładające się zdjęcia i krycie

Zdjęcia sąsiednich obiektów mogą na siebie zachodzić (np. IC 434 i NGC 2024, M 81 i M 82).

- **Suwak krycia działa na całą warstwę**, nie na każde zdjęcie z osobna: zdjęcia rysowane są w pełni kryjące (z maską i wygładzoną krawędzią) do bufora poza ekranem (framebuffer z teksturą w rozmiarze płótna), a bufor jest nakładany na gwiazdy raz, z kryciem z suwaka. Dzięki temu w miejscu zachodzenia krycie się nie sumuje i nie widać krawędzi dolnego zdjęcia przez górne. Moja decyzja.
- **Kolejność:** zdjęcie wybranego obiektu na wierzchu; pozostałe od największego pola do najmniejszego (mniejsze pole, zwykle więcej szczegółów, wyżej). Zmiana wyboru obiektu zmienia kolejność. Moja decyzja.
- To samo zdjęcie (ten sam `photoId`) przypięte do dwóch obiektów rysowane jest raz, z jedną teksturą.

Brak WebGL2 (albo utrata kontekstu) oznacza brak gwiazd i brak zdjęć; po przywróceniu kontekstu tekstury ładują się od nowa. Rysunek 2D jako zapas nie jest przewidziany.

### 2. Rzut liczony w JS, shader tylko interpoluje

- Z rekordu (`OwnPhotoRecord.grid`) raz na zdjęcie: wektory jednostkowe J2000 wszystkich 289 punktów, współrzędne tekstury `u = i/(cols−1)`, `v = j/(rows−1)` (ta sama konwencja pikseli co `warpTriangles`: punkt (i, j) leży w pikselu `(i·W/(cols−1), j·H/(rows−1))`, krawędź zdjęcia = 0 i W), indeksy 2 trójkątów na komórkę, środek i promień kątowy zdjęcia (do odrzucania poza ekranem).
- Co klatkę dla każdego widocznego zdjęcia: `proj.eq(v)` dla 289 punktów → pozycje ekranu (px CSS) w buforze wierzchołków (`bufferSubData`). Ta sama funkcja rzutu co kontury i gwiazdy, więc to, co testują testy jednostkowe, jest dokładnie tym, co rysuje GPU. Wzoru stereograficznego nie powielamy w GLSL.
- Wierzchołek za obserwatorem (`proj.eq` = `null`): całe zdjęcie pomijane w tej klatce (zdarza się tylko daleko poza ekranem).
- Odrzucanie: środek zdjęcia poza ekranem o więcej niż jego promień w px → bez rzutu wierzchołków.
- Krawędź zdjęcia wygładzana w shaderze (`fwidth` od `u`, `v`, ok. 1 px), bo kontekst ma `antialias: false`; inaczej obrócony brzeg byłby schodkowy. To nie jest ramka: nic nie jest dorysowane.

### 3. Horyzont

- Każdy wierzchołek dostaje krycie z wysokości względem horyzontu (własnego, `horizonAltitude`, jeśli ustawiony): 1 nad, 0 pod, łagodne przejście ok. 0,5°. Ziemia z nakładki (krycie 92–98%) rysuje się i tak nad zdjęciem; krycie wierzchołków usuwa prześwit zdjęcia pod gruntem.

### 4. Maska czarnych brzegów

- Maska (PNG w odcieniach szarości, jasność = zostaw) ładowana jako druga tekstura `R8`; shader mnoży krycie przez jej kanał czerwony. Brak maski = `uniform` „bez maski”.
- Nie używamy `maskedPhoto` z `ownPhotoCompose.ts` (kopiowanie alfy piksel po pikselu w pełnej rozdzielczości, ok. 160 MB chwilowo) i nie zmieniamy serwera: stare rekordy działają bez migracji.

### 5. Rozdzielczość, pamięć i ładowanie

- Rekordy czytane z IndexedDB (`readOwnPhoto`) dla zdjęć „moje”, gdy warstwa jest włączona; przy zmianie `ownPhotos` (dodanie, zmiana `photoId`, ukrycie, usunięcie) zestaw jest uzgadniany, tekstury usuniętych zwalniane. Brak rekordu: zdjęcie pomijane, a wpis indeksu usuwany (`removeOwnPhoto`, jak w `Thumb` i `FramingPanel` przy `OwnPhotoMissingError`). Rekord z innym `photoId` niż indeks (wyścig przy zmianie zdjęcia): pomijany bez usuwania wpisu. Uszkodzony plik (błąd dekodowania): zdjęcie pomijane do przeładowania, ostrzeżenie w konsoli.
- Poziomy tekstury: dłuższy bok 256, 512, 1024 lub 2048 px, najwyżej rozmiar zdjęcia i `MAX_TEXTURE_SIZE`. Poziom = najmniejszy, który pokrywa dłuższy bok zdjęcia na ekranie w pikselach urządzenia. Przy pełnej kopule zdjęcie ma kilka px → 256 px (ok. 0,3 MB); przy 8° zdjęcie ok. 3° → 1024 px.
- Dekodowanie `createImageBitmap(blob, { resizeWidth, resizeHeight, resizeQuality: 'high' })` wprost do wybranego rozmiaru, kolejno po jednym (szczyt pamięci = jedno zdekodowane zdjęcie), potem `texImage2D`, `generateMipmap` i `bitmap.close()`. Bitmap nie trzymamy w JS: po utracie kontekstu zdjęcia dekodują się ponownie z `Blob`.
- Podniesienie poziomu, gdy zdjęcie urośnie na ekranie: stara tekstura rysuje się, dopóki nowa nie jest gotowa. Obniżania przy oddaleniu nie ma; zamiast tego limit łącznej pamięci tekstur (ok. 128 MB z mipmapami): po przekroczeniu zwalniane są tekstury zdjęć najdawniej rysowanych (wrócą w potrzebnym poziomie, gdy zdjęcie znów będzie widoczne).
- Podczas odtwarzania nocy (`playing`) nie rusza nowe dekodowanie; rysowane są już załadowane tekstury.
- Po załadowaniu tekstury kopuła rysuje się ponownie (`setFrame`).

### 6. Stan i interfejs

- Store (`src/state/store.ts`): `showOwnPhotos: boolean` (domyślnie **włączone**: bez zdjęć „moje” nic się nie pokazuje, a kto dodał zdjęcie, od razu je widzi; moja decyzja) i `ownPhotosOpacity: number` (0,1–1, domyślnie **1**; moja decyzja) z `setOwnPhotosOpacity`. Oba w `partialize`. `showOwnPhotos` dopisane do unii kluczy `toggle(...)`.
- „Warstwy” (`src/views/SkyView.tsx`): `LayerKey` i `LAYERS` dostają `{ key: 'showOwnPhotos', label: 'Moje zdjęcia' }` (po „Kontury”). Pod przełącznikiem, gdy warstwa jest włączona, suwak krycia (`Range`, 10–100%, krok 5) z etykietą „Krycie” i wartością w %. Tylko w liście kopuły, nie w „Warstwach 3D”.
- Jasność zdjęcia nie zależy od pory dnia (gwiazdy kopuły w dzień przygasają, zdjęcie nie, tak jak kontury): to warstwa do porównań, a planuje się zwykle za dnia. Moja decyzja.

### 7. Pliki

- `src/lib/ownPhotoSky.ts` (czysta logika, testy w `ownPhotoSky.test.ts`): siatka → wierzchołki, UV, indeksy, środek i promień; rzut wierzchołków przez `Projector` z kryciem horyzontu; wybór poziomu tekstury; kolejność zwalniania przy limicie pamięci.
- `src/lib/ownPhotoSkyGL.ts`: program WebGL2, bufory i tekstury zdjęć, kolejka dekodowania. Bez Reacta; nietestowane jednostkowo (wymaga GPU), sprawdzane wizualnie.
- `src/components/SkyDome.tsx`: płótno spodu i przeniesienie Drogi Mlecznej, siatki, południka i linii na nie; tworzy renderer zdjęć razem z `createStarGL` (te same zdarzenia utraty i przywrócenia kontekstu), uzgadnia zestaw zdjęć, wywołuje rysowanie po gwiazdach.

## Zostawione budowniczemu

- Dokładne progi: szerokość przejścia na horyzoncie, limit pamięci, poziomy tekstury, szerokość wygładzenia krawędzi (kryteria: antycele wyżej).
- Podział kodu między `ownPhotoSkyGL.ts` a `SkyDome.tsx` i nazwy.
- Czy suwak jest widoczny także przy wyłączonej warstwie (wyszarzony), czy tylko przy włączonej.

## Weryfikacja

- Testy jednostkowe (`src/lib/ownPhotoSky.test.ts`):
  - syntetyczna siatka TAN (jak `gridFromTan` w `ownPhoto.test.ts`): piksel we wnętrzu komórki, interpolowany liniowo w trójkącie z rzutowanych wierzchołków, ląduje w granicach 0,5 px od dokładnego rzutu jego RA/Dec przez `proj.eq`, dla widoku w zenit, nisko nad horyzontem, przy obróconym azymucie, przy pełnej kopule i przy 8°, także dla zdjęcia odbitego;
  - liczba wierzchołków, indeksów, UV narożników, środek i promień obejmują wszystkie punkty;
  - krycie horyzontu (pod własnym horyzontem 0, nad 1);
  - odrzucanie zdjęcia za obserwatorem i poza ekranem;
  - wybór poziomu tekstury (minimum, maksimum, ograniczenie rozmiarem zdjęcia i `MAX_TEXTURE_SIZE`);
  - kolejność zwalniania tekstur przy limicie.
- Store: domyślne wartości nowych pól, przełączanie, zapis w `partialize` i odczyt starego zapisu bez nich (`persistence.test.ts`).
- Ręcznie (własny Chromium przez `playwright`, swiftshader, zdjęcia z `scripts/.cache/observatory-photos`):
  - M 51: piksel zdjęcia o znanym RA/Dec (z siatki) leży w punkcie `proj.eq` tego RA/Dec; elipsa NGC 5195 (osobny obiekt, nie Messier) leży na galaktyce towarzyszącej;
  - IC 434: kontury IC 434, B 33 i NGC 2024 rysują się nad zdjęciem i pokrywają z mgławicami na zdjęciu; Droga Mleczna i siatka nie leżą na zdjęciu;
  - dwa zachodzące zdjęcia przy kryciu < 100%: w miejscu zachodzenia nie widać krawędzi dolnego; wybór obiektu przenosi jego zdjęcie na wierzch;
  - kopuła bez zdjęć wygląda jak przed zmianą (poza gwiazdami nad Drogą Mleczną);
  - brak ramki, szwów i czarnych klinów; przełącznik i suwak działają i przetrwają przeładowanie; przełącznik „domyślne” w karcie ukrywa zdjęcie;
  - po teście przywrócony stan profilu.
- `npm test`, `npm run typecheck`, `npm run build`; startowy JS < 200 KB gzip.
- `docs/wymagania.md`: nowa sekcja z dowodami.
