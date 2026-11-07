# Prompt: Obserwatorium 3D zdjęcia (wzór: SyQon Studio „3D Observatory”)

> Prompt do wklejenia w nową sesję Claude Code w tym repozytorium. Napisany 5.11.2026 na podstawie filmu
> https://www.youtube.com/watch?v=gRR2_9r1DJo (od 0:47), jego transkrypcji i miniatur storyboardu (320 × 180 px).
> Elementy odczytane z miniatur są **wstępne**: przed pracą nad wyglądem poproś użytkownika o zrzuty w pełnej rozdzielczości.

---

## Cel

Rozbuduj istniejący tryb „Rozłóż zdjęcie” w widoku 3D (`Niebo → Pozycja 3D`) do pełnego **obserwatorium przestrzennego zdjęcia**, jak w SyQon Studio od 0:47 filmu: po astrometrii użytkownik otwiera widok 3D, w którym **gwiazdy i galaktyki rozpoznane na jego zdjęciu** stoją w swoich rzeczywistych odległościach wzdłuż linii widzenia; może je przeglądać, filtrować zakresem odległości i wyeksportować animację jako film.

Integracja z tym, co już mamy:
- **wycinki obiektów** (`PhotoCut`, `PhotoExplorer.tsx`) pozostają drugą warstwą obok gwiazd: mgławice i galaktyki lecą do swoich odległości tak jak dziś;
- **widok Drogi Mlecznej / Wszechświata lokalnego** (`Space3D.tsx`) pozostaje kontekstem: z widoku linii widzenia da się płynnie oddalić do istniejących skal.

Wszystko inne (układ okna, sterowanie, panel informacji, oś odległości, eksport) wzoruj na SyQon.

## Co pokazuje film (0:47–3:30)

Z transkrypcji i miniatur. Przy 0:47–1:10 autor uruchamia astrometrię, potem klika przycisk „3D” obok przycisku adnotacji.
1. Okno „3D distances”: nagłówek „SYQON | SPATIAL OBSERVATORY”, podtytuł w rodzaju „Beyond the image”, zakładki odczytane jako **All distances / Structure / Earth View** (wstępnie). W transkrypcji „Heartfield” to błąd rozpoznawania mowy: chodzi o porównanie skali w stylu **Hubble Deep Field** („how tiny we are compared to the universe”).
2. Ciemnogranatowe płótno 3D. Gwiazdy rozciągnięte wzdłuż jednej osi (linia widzenia), z cienką linią osi i znacznikami.
3. **Suwak u dołu**: płynne przejście od płaskiego zdjęcia (gwiazdy na swoich pikselach, ciemne prostokąty etykiet) do rozłożenia w głąb. Pokazuje, że gwiazdy nie leżą na jednej płaszczyźnie.
4. **Histogram odległości** (cyjanowe słupki) nad osią czasu/odległości. Zaznaczenie zakresu izoluje obiekty z tego przedziału („especially useful for taking measurements and comparing objects”).
5. Prawa kolumna: karta wybranego obiektu (miniatura, nazwa, odległość) i **lista obiektów z odległościami**. Gwiazdę można kliknąć w 3D.
6. Lewy dolny róg: **miniatura zdjęcia źródłowego**.
7. Przyciski widoku **z góry i z boku** („top and side controls”). Selektor **tylko gwiazdy / tylko galaktyki / oba**. Gdy w kategorii nie ma obiektów, komunikat, że nie ma czego konfigurować.
8. **Zapis → Wideo**: format poziomy (YouTube), pionowy (rolki), kwadratowy (Instagram). Potem eksport z paskiem postępu.

### Skąd brać zrzuty z wyglądem

Źródło wyglądu: **https://www.youtube.com/watch?v=gRR2_9r1DJo** (film ma 3:29, wersja 4K). Kluczowe momenty:
[0:47 astrometria i przycisk 3D](https://www.youtube.com/watch?v=gRR2_9r1DJo&t=47s),
[1:05 okno obserwatorium](https://www.youtube.com/watch?v=gRR2_9r1DJo&t=65s),
[1:30 suwak płasko ↔ przestrzeń](https://www.youtube.com/watch?v=gRR2_9r1DJo&t=90s),
[2:10 widoki z góry/boku i porównanie skali](https://www.youtube.com/watch?v=gRR2_9r1DJo&t=130s),
[2:40 selektor i zakres odległości](https://www.youtube.com/watch?v=gRR2_9r1DJo&t=160s),
[3:00 eksport wideo](https://www.youtube.com/watch?v=gRR2_9r1DJo&t=180s) (czasy przybliżone, z transkrypcji).

Klatki w pełnej rozdzielczości pobieraj w przeglądarce **Comet** przez plugin Claude in Chrome (`mcp__claude-in-chrome__*`, rozszerzenie działa w Comet), **nie Playwrightem** (osadzony odtwarzacz w Playwright zwraca błąd 153). Sposób sprawdzony 5.11.2026: na stronie filmu `movie_player.setPlaybackQualityRange('highres')` (dostępne `hd2160`, klatka 3840 × 2160), pauza, `video.currentTime = t`, po `seeked` `drawImage` na płótno i `toBlob('image/jpeg', 0.9)` (płótno nie jest skażone). Comet ma włączone pytanie o miejsce zapisu (`prompt_for_download: true`), więc pobieranie przez `<a download>` otwiera okno zapisu: albo poproś użytkownika o zgodę na wiele pobrań i folder, albo prześlij dane obrazu inną drogą. Klatek z cudzego filmu nie dodawaj do repozytorium (tylko scratchpad lub `scripts/.cache`).

## Stan obecny (sprawdź, zanim zaczniesz)

- `src/components/Space3D.tsx` (~1350 linii): scena three.js, skale `galaxy` (liniowa, 1 j. = 1000 lś) i `universe` (log.), renderowanie na żądanie (`sceneDirty`, `sameMatrix`), `photoFrameRef` i `photoFitRef` łączą scenę z `PhotoExplorer`.
- `src/components/PhotoExplorer.tsx`: upload, propozycje katalogowe, okręgi wycinków, suwak `progress` i odtwarzanie (5 s), nakładka SVG nad płótnem, zapis w IndexedDB (`photoStorage`).
- `src/lib/photo.ts`: `PhotoCut`, `PhotoProject` (z `astrometry.wcs`), `photoAnchorKind`, `photoPose`, `photoColumns`.
- `server/photo.ts` i `scripts/skyshot-bridge/src/main.rs`: solver działa z `keep_matches: true`, ale na wyjście trafiają tylko **liczby** dopasowań (`matches`, `edgeMatches`). Pozycje gwiazd nie są dziś zwracane. `docs/photo-space-3d.md`: „Gwiazdy służą tylko astrometrii”.
- `server/photoDistances.ts`: odległości obiektów z SIMBAD (IDIA TAP) i NED, limit 15 s.

## Decyzje do potwierdzenia z użytkownikiem przed kodem

1. **Wygląd (rozstrzygnięte przez użytkownika 5.11.2026):** od SyQon bierzemy układ, interakcje, ruch i hierarchię paneli; **kolory i krój są nasze** (tokeny `:root`, cyjan #00E0FF, klamry L, systemowy mono), nie zielono-morskie tony SyQon. Nie kopiujemy logo, nazw („Spatial Observatory”) ani zasobów SyQon. Nazwa robocza: „Obserwatorium 3D”.
2. **Zasięg gwiazd:** ile gwiazd (np. najjaśniejsze 300–2000 w polu do limitu jasności), z jakim progiem jakości paralaksy.
3. **Eksport wideo:** WebM (MediaRecorder, bez zależności) czy także MP4 (np. WebCodecs + muxer, większy koszt). Domyślnie WebM, MP4 tylko gdy przeglądarka natywnie nagrywa `video/mp4`.

## Ograniczenia

- Reguły z CLAUDE.md: React 19 + TS strict, bez średników, pojedyncze cudzysłowy, interfejs i komentarze po polsku, kod przy renderze bez sieci (pobieranie w efektach), `prefers-reduced-motion`, budżet startowego JS < 200 KB gzip (obserwatorium ładowane leniwie razem z `Space3D`).
- `Space3D.tsx` nie rośnie: nowy kod w osobnych modułach (np. `src/components/observatory/*`, `src/lib/observatory.ts`). Czysta logika w `src/lib` z testami `*.test.ts` (bez testów `.tsx`).
- Prywatność jak w `docs/photo-space-3d.md`: zdjęcie nie opuszcza serwera. Do zewnętrznych usług trafiają tylko współrzędne środka i promień pola.
- Nowa zmiana sceny poza `tick` ustawia `sceneDirty.current = true`.

## Etapy

### 1. Gwiazdy ze zdjęcia z odległościami (serwer)
- Ustal, co zawiera `solution.matches` w Skyshot (piksel, identyfikator katalogowy? czy to Gaia?). Jeśli ma identyfikatory Gaia, zwróć je z mostu. Jeśli nie, użyj samego WCS.
- Nowy endpoint, np. `/api/photo/stars?ra=&dec=&radius=`: wyszukiwanie stożkowe Gaia DR3 (ESA Gaia Archive TAP albo VizieR) do limitu jasności. Odległości: **sprawdź** i wybierz między `1/paralaksa` z progiem `parallax_over_error ≥ 5` a odległościami Bailer-Jones et al. 2021 (VizieR `I/352`, `rgeo`/`rpgeo` z przedziałami). Paralaksy ujemne i słabej jakości oznacz jako „brak odległości”, nie odrzucaj gwiazdy z widoku 2D. Limit czasu i bajtów jak w `readResponseText.ts`, bufor odpowiedzi.
- Rzut gwiazd na piksele przez zapisany WCS, odrzucenie spoza kadru.
- → weryfikuj: test `src/lib/*Server.test.ts` z zamockowaną odpowiedzią TAP; dla zapisanego zdjęcia M42 kilka znanych gwiazd (np. gwiazdy Trapezu) ma odległości zgodne z katalogiem ±10% i trafia w swoje piksele ±2 px.

### 2. Model danych i logika (czysta, w `src/lib`)
- `PhotoStar` (id Gaia, piksel, jasność, kolor BP−RP, `distLy`, przedział) zapisywany w `PhotoProject` (podnieś `version`, migracja starych zapisów).
- Oś odległości: **skala logarytmiczna wzdłuż linii widzenia** (gwiazdy 10 lś – kilka tys. lś, mgławice, galaktyki do mld lś). Funkcje: pozycja 3D z (piksel, odległość, `progress`), histogram w koszykach log, filtr zakresu, kategorie gwiazdy/galaktyki/mgławice.
- → weryfikuj: testy jednostkowe dla `progress = 0` (wszystko na płaszczyźnie zdjęcia, zgodnie z pikselami), `progress = 1` (głębia monotoniczna z odległością), histogramu i filtra zakresu.

### 3. Widok linii widzenia (`Space3D` + nowy komponent)
- Po astrometrii przycisk „3D” otwiera obserwatorium. Zdjęcie jako płaszczyzna-tekstura, gwiazdy jako punkty z kolorem z BP−RP i rozmiarem z jasności. Wycinki (`PhotoCut`) jako karty z teksturą wycinka w swoich odległościach. Jedna wspólna oś log.
- Suwak „płasko ↔ przestrzeń” zastępuje lub rozszerza obecny `progress` w `PhotoExplorer` (bez dwóch konkurujących suwaków).
- Przyciski kamery: widok z Ziemi (wzdłuż osi), z boku, z góry. Płynne oddalenie do istniejących skal Drogi Mlecznej / Wszechświata lokalnego, z linią widzenia w ich układzie (`galacticVector`).
- Porównanie skali w stylu „Deep Field”: pokazuje, jak mały kąt pola zajmuje zdjęcie na tle nieba lub głębi Wszechświata. Zaproponuj użytkownikowi dokładny kształt.
- → weryfikuj: Playwright, zrzuty przy `progress` 0 / 0,5 / 1 i w trzech widokach kamery. Brak błędów konsoli. Klatki tylko przy ruchu (render na żądanie nadal działa).

### 4. Panele jak w SyQon
- Nagłówek z zakładkami (Wszystkie odległości / Struktura / Widok z Ziemi, nazwy po potwierdzeniu), prawa kolumna: karta wybranego obiektu (miniatura z wycinka zdjęcia, nazwa, odległość ± niepewność, źródło) i wirtualizowana lista (`@tanstack/react-virtual`) posortowana po odległości. Klik w liście ↔ podświetlenie w 3D (raycasting punktów).
- Dół: histogram odległości + zakres (dwa uchwyty) izolujący obiekty. Selektor gwiazdy / galaktyki / mgławice / wszystko z komunikatem dla pustej kategorii. Miniatura zdjęcia w lewym dolnym rogu.
- Klawiatura i dostępność: etykiety ARIA, fokus, WASD jak dziś.
- → weryfikuj: drzewo elementów lub test logiki filtrów; ręcznie w Playwright: zakres 1000–2000 lś zostawia tylko obiekty z tego przedziału na liście i w scenie.

### 5. Eksport wideo
- „Zapisz → Wideo”: 16:9 (1920 × 1080), 9:16 (1080 × 1920), 1:1 (1080 × 1080). Scenariusz kamery: płaskie zdjęcie → rozłożenie → przelot boczny → powrót (deterministyczny w czasie, niezależny od FPS).
- Pułapki: `canvas.captureStream()` nagrywa tylko płótno WebGL. Nakładka SVG `PhotoExplorer`, pinezka DOM i etykiety HTML **nie trafią** do filmu, więc podpisy w eksporcie rysuj na płótnie (sprite'y lub osobny przebieg 2D składany do jednego płótna). W czasie nagrywania wymuś ciągłe renderowanie (render na żądanie by zgubił klatki), renderuj poza ekranem w docelowej rozdzielczości, pokaż postęp i pozwól przerwać.
- → weryfikuj: nagranie 10 s w każdym formacie ma właściwe wymiary i czas (sprawdź metadane `ffprobe` lub elementem `<video>`), etykiety są widoczne w klatkach.

### 6. Dokumentacja i porządek
- Zaktualizuj `docs/photo-space-3d.md` (źródła Gaia, licencje, ograniczenia paralaks), `docs/wymagania.md`, wpis w CLAUDE.md o nowych modułach.
- `npm test`, `npm run typecheck`, `npm run build`, rozmiar startowego JS. Po subagentach `git status` (puste pliki w korzeniu). Przywróć stan profilu Playwrighta.

## Definicja ukończenia

Na zapisanym zdjęciu (np. M42) użytkownik: otwiera „3D”, widzi gwiazdy i wycinki w ich odległościach, przesuwa suwak od płaskiego zdjęcia do przestrzeni, zawęża zakres histogramem, klika gwiazdę i widzi jej kartę, przełącza widok z boku/z góry, oddala do Drogi Mlecznej i eksportuje 10-sekundowy film w trzech formatach. Wszystkie testy i build przechodzą, startowy JS nadal < 200 KB gzip.
