# Prompt: „Pozycja 3D” w modalu i nurkowanie z Drogi Mlecznej do rozłożonego zdjęcia

> Prompt do wklejenia w nową sesję Claude Code w tym repozytorium. Napisany 6.11.2026 po rozmowie z użytkownikiem.
> Decyzje oznaczone **(użytkownik)** wybrał użytkownik; oznaczone **(propozycja, zatwierdzona)** zaproponował autor promptu,
> a użytkownik przyjął je wszystkie 6.11.2026. Nie pytaj o nie ponownie; pytaj tylko o to, czego prompt nie rozstrzyga.

---

## Cel

1. Cały widok 3D (`Space3D`: skale **Droga Mleczna** i **Wszechświat lokalny**) przenosimy do **modala o tych samych wymiarach i powłoce co Obserwatorium 3D** (`.observatory` / `.obs-window`). Przełącznik skal jest w modalu.
2. Widok Drogi Mlecznej łączymy z nowym rozkładaniem zdjęcia (Obserwatorium, `src/components/observatory/`). Stary sposób (nakładka SVG, w której okręgi wycinków wylatują ze zdjęcia do kolumn z liniami do położeń w galaktyce) **znika tylko z Drogi Mlecznej**. We Wszechświecie lokalnym zostaje bez zmian. Ze starego mechanizmu w Drodze Mlecznej zostaje tylko to, czego używa nowy.
3. Płynna animacja „nurkowania” z Drogi Mlecznej do siatki z rozłożonym zdjęciem i z powrotem.

## Decyzje

1. **(użytkownik) Wejście.** „Pozycja 3D” (pasek karty środkowej Nieba i przycisk w szczegółach obiektu) **otwiera modal**. Karta środkowa zostaje na kopule, a zamknięcie (przycisk, Esc) wraca do Nieba. Tryb `'3d'` znika z `CenterMode`.
2. **(użytkownik) Układ modala.** Przełącznik ma dwie pozycje: [Droga Mleczna | Wszechświat lokalny]. Rozłożone zdjęcie jest **stanem Drogi Mlecznej**: wchodzi się do niego nurkowaniem po kliknięciu „Rozłóż zdjęcie 3D”. Panele Obserwatorium (inspektor, wyszukiwarka i lista obiektów, histogram, oś rozkładania, legenda) są **tylko w tym stanie**.
   **(propozycja, zatwierdzona)** W skalach Droga Mleczna i Wszechświat lokalny scena zajmuje całą szerokość okna, a filtry i przełączniki Space3D przechodzą do paska narzędzi modala.
3. **(użytkownik) Wycinki zostają jak dziś.** Zostają propozycje z katalogu, edytor, przeciąganie i zmiana promienia okręgów, wybór źródła odległości, zapis w IndexedDB i astrometria. To wspólna część starego i nowego mechanizmu: Obserwatorium buduje z wycinków karty (`observatoryItems`).
4. **(użytkownik) Droga Mleczna ze zdjęciem.** Nakładka SVG i suwak „Zdjęcie ↔ Mapa 3D” znikają z Drogi Mlecznej. Zamiast nich w scenie 3D pojawiają się:
   - **linia widzenia** zdjęcia od Ziemi (jak przerywana linia `objectGuide` wybranego obiektu);
   - **stożek pola**: cztery promienie do narożników kadru;
   - **znaczniki wycinków** w ich położeniach.

   **(propozycja, zatwierdzona)** Rozmieszczenie znaczników według dzisiejszej klasyfikacji `photoAnchorKind(…, 'galaxy')`:
   - `'position'`: w położeniu z odległości;
   - `'outside'` (≥ 150 tys. lś): na końcu linii widzenia z podpisem „poza skalą”;
   - `'direction'` (bez odległości): na linii widzenia w stałej odległości od Ziemi (jak dziś kotwica 0,35 kadru), z przerywanym obrysem i podpisem „odległość nieznana”.
5. **(użytkownik) Animacja.** Nurkowanie działa w obie strony, w jednej ciągłej scenie, w około 3–4 s (opis niżej). Przycisk „Droga Mleczna” w stanie zdjęcia odtwarza je wstecz.
6. **(propozycja) Edycja wycinków w Drodze Mlecznej.** Przycisk edycji (`Settings2`) pokazuje nad sceną płaskie zdjęcie z okręgami i panel edytora, jak dziś przy `progress = 0`, ale bez kolumn, suwaka i linii. Wyjście z edycji wraca do sceny 3D z linią widzenia. Bez płaskiego widoku nie ma gdzie przeciągać okręgów.
7. **(propozycja) Wszechświat lokalny.** Zostaje automatyczny wybór skali przy wczytaniu zdjęcia (`Space3D.tsx:452`: same galaktyki → Wszechświat lokalny). Przycisk „3D” w starym pasku zdjęcia prowadzi tam do Drogi Mlecznej (przełączenie skali bez animacji, jak dziś), a potem do nurkowania.
8. **(propozycja) Zakładki w stanie zdjęcia.** Zakładka „Droga Mleczna” jest podświetlona, a obok niej widnieje ścieżka „Droga Mleczna › nazwa zdjęcia”. Kliknięcie „Droga Mleczna” uruchamia nurkowanie wstecz. „Wszechświat lokalny” przełącza od razu, bez nurkowania. **Esc zamyka cały modal**, a fokus wraca do przycisku, który go otworzył.
9. **(propozycja) Gwiazdy Gaia** pobieramy, gdy zdjęcie pojawia się w Drodze Mlecznej, a nie dopiero w Obserwatorium. Dzięki temu scena zdjęcia jest kompletna, zanim zacznie się nurkowanie.

## Stan obecny (sprawdź, zanim zaczniesz)

- `src/views/SkyView.tsx:130` (`MODES`), `:200` (leniwy `Space3D` w karcie), `:211` (`LayersMenu threeD` w pasku karty, komponent nieeksportowany). `ObjectDetails.tsx:79` (`go('3d')`). `store.ts:102` `CenterMode = 'dome' | 'framing' | '3d'`. `centerMode` **nie jest** w `partialize`, więc migracja zapisu nie jest potrzebna.
- `src/components/Space3D.tsx` (~1360 linii):
  - jeden wielki efekt sceny z zależnościami `[o, dist, scale, outOfScale, withDistance, select, constellations, typeRGB]`; każda zmiana przebudowuje scenę i zwalnia kontekst przez `forceContextLoss`;
  - kamera FOV **50°**, near 0,1, far 5000 (`:491`);
  - skala Drogi Mlecznej jest liniowa (1 j. = 1000 lś), Słońce leży w `(-26,7, 0, 0)` w układzie galaktycznym (`toThree`, `position`: funkcje prywatne, `:66–77`);
  - ze zdjęciem: `PhotoExplorer` nad sceną (`:1259`), `photoFitRef` (`:727`), rzut kotwic do `photoFrameRef` (`:927`), `objectGuide.visible = !photo` (`:855`), `minHeight` sceny z `photoStageHeight`;
  - render na żądanie (`sceneDirty`, `sameMatrix`), klatka kontrolna co 1 s, a przy Ziemi 10 kl./s.
- `src/components/PhotoExplorer.tsx`: stan zdjęcia, upload, zapis, edytor, pobieranie odległości. W tym samym komponencie siedzą stara nakładka SVG (`photoPose`, `photoColumns`, kotwice), suwak (`:259`), przycisk „3D” (`:260`) i `zoomOutFromObservatory` (`:186`, dzisiejszy most do Drogi Mlecznej).
- `src/components/observatory/Observatory.tsx`:
  - własna powłoka okna (`role="dialog"`, `:145`), własna obsługa Esc (`:126`);
  - pobieranie gwiazd Gaia (`:73`);
  - samoczynny start rozkładania po wczytaniu obrazu (`:121`);
  - przycisk „Droga Mleczna” w nagłówku (`:158`).
- `src/components/observatory/scene.ts`:
  - `FOV = 40` (`:12`), `EARTH_Z = 70`, siatka `GridHelper` (`:139`), `zoomOut()` (`:411`);
  - widok `'earth'` (`:369`): kamera za Ziemią wzdłuż osi;
  - przy każdej zmianie zbioru obiektów scena powstaje od nowa (`Observatory.tsx:90`).
- `src/lib/observatory.ts`: oś log. (`PLANE_WIDTH = 100`, `AXIS_LENGTH = 400`), `observatoryPosition`, `orbitOffset`, `fieldOfView` (macierz `cd` z zapisanego WCS).
- `src/lib/photo.ts`: `photoAnchorKind` z gałęziami dla obu skal, `photoPose`, `photoColumns`, `photoStageHeight`. Wszystkie zostają: Wszechświat lokalny używa starej nakładki, a nowe znaczniki w Drodze Mlecznej używają klasyfikacji `photoAnchorKind(…, 'galaxy')` (decyzja 4).
- `src/styles/app.css:895`: `.observatory { position: fixed; inset: 0; padding: 18px }` i siatka `.obs-window`. Przy wąskim ekranie (`:984`) bez marginesu.

## Ograniczenia

- Obowiązują reguły z CLAUDE.md:
  - React 19 + TS strict, bez średników, pojedyncze cudzysłowy, interfejs i komentarze po polsku;
  - przy renderze bez sieci;
  - `prefers-reduced-motion` respektowane;
  - kolory tylko z tokenów `:root`;
  - startowy JS < 200 KB gzip: modal i three.js ładowane leniwie, `Space3D` nie trafia do paczki startowej.
- `Space3D.tsx` **nie rośnie**. Nowy kod idzie do osobnych modułów:
  - czysta matematyka do `src/lib/` z testami `*.test.ts` (bez testów `.tsx`);
  - komponenty do np. `src/components/space3d/`;
  - `toThree` i `position` przenieś do `src/lib`, jeśli potrzebuje ich nowy kod.
- Zmiana sceny poza pętlą ustawia `sceneDirty.current = true` (Space3D) albo `dirty = true` (ObservatoryScene). W trakcie przejścia rób to w każdej klatce, a po nim obie sceny wracają do renderu na żądanie.
- Projektuj najpierw na szerokość komputera, potem telefonu. Przyciski w jednym wierszu mają tę samą wysokość.
- Prywatność jak w `docs/photo-space-3d.md`: zdjęcie nie opuszcza serwera.

## Projekt animacji (punkt 3)

**Idea:** jeden **wirtualny kamerzysta** prowadzi dwie sceny naraz. Szwem jest widok Obserwatorium `'earth'`: zza Ziemi, wzdłuż linii widzenia, zdjęcie płasko (`progress = 0`). Na szwie obie sceny pokazują to samo: Ziemię, linię widzenia i stożek pola.

**Most układów.** W układzie Obserwatorium Ziemia leży w `(0, 0, EARTH_Z)`, linia widzenia biegnie wzdłuż −z, +x to piksele w prawo, a +y to piksele w górę. Do Drogi Mlecznej przechodzimy wzorem
`p_DM = sunPos + R · (p_obs − Ziemia_obs) · u`:
- `R` to obrót z bazy kadru: kierunki środka, „prawo” i „góra” zdjęcia na niebie, policzone z RA/Dec przez `galacticVector` i `toThree`;
- `u` to tysiące lś na jednostkę Obserwatorium.

Bazę licz z `astrometry.raDeg/decDeg` (środek) i macierzy `cd` jako przybliżenie styczne bez dystorsji. Działa to także dla zapisanych projektów.

**Parzystość:** gdy kadr jest lustrzany (znak wyznacznika `cd`), `R` musi pozostać obrotem (wyznacznik +1). Sprawdź to na gwiazdach Gaia z projektu, które mają zarówno piksel, jak i RA/Dec.

**Nurkowanie** to logarytmiczna zmiana `u`: `u(e) = u0^(1−e) · u1^e`, jak w „potęgach dziesięciu”. Kamera Obserwatorium stoi w pozie szwu, a kamera Drogi Mlecznej to `most(kamera_obs, u(e))`. Punkt wyjścia do strojenia:
- `u0`: kamera ok. 40 tys. lś za Słońcem, widać dysk;
- `u1`: ok. 1 lś, sąsiednie obiekty rozlatują się poza kadr.

| Faza | Czas (start) | Droga Mleczna | Obserwatorium |
|---|---|---|---|
| 1. Ustawienie | 1,0 s | Przelot `orbitOffset` z bieżącej pozy do `most(poza szwu, u0)`, FOV 50° → 40° | Scena zbudowana, niewidoczna |
| 2. Nurkowanie | 1,6 s | `u` maleje log.; od e ≈ 0,5 warstwy gasną; stożek rozchyla się do kąta ostrosłupa | Od e ≈ 0,4 Ziemia, ostrosłup i oś; od 0,6 płaskie zdjęcie; od 0,8 siatka |
| 3. Wejście | 0,9 s | Ukryta, nie renderuje | `setView('structure')`; panele wsuwają się w trakcie przelotu; potem samo rusza rozkładanie 0 → 100% (dziś 5 s) |

Powrót („Droga Mleczna”) przebiega odwrotnie:
1. przelot do pozy szwu przy jednoczesnym zwijaniu `progress` do 0;
2. nurkowanie wstecz;
3. przelot kamery Drogi Mlecznej do pozy sprzed wejścia.

**Pułapki:**
- **Kąty się nie zgadzają.** Ostrosłup Obserwatorium jest umowny (70 j. do płaszczyzny szerokiej na 100 j., ok. 71°), a prawdziwe pole to zwykle 0,5–5°. Stożek Drogi Mlecznej rozchyla się więc w fazie 2 od prawdziwego kąta do kąta ostrosłupa i gaśnie, gdy kąty się zrównają. To zabieg poglądowy: nie opisuj go jako fizycznego.
- **Synchronizacja.** Dwa płótna (Droga Mleczna pod spodem, przezroczyste Obserwatorium nad nim, ten sam rozmiar) albo jeden renderer z dwiema scenami i `autoClear = false`: wybierz i uzasadnij. Przy dwóch płótnach obie pętle liczą pozę z **argumentu `requestAnimationFrame`** (w jednej klatce ten sam znacznik czasu), nie z `performance.now()`. Inaczej na szwie widać drganie o klatkę.
- **Płaszczyzny near i far.** W fazie 2 kamera Drogi Mlecznej podchodzi do Słońca na ułamki jednostki. Near ustawiaj względem odległości od Słońca, bo inaczej Ziemia zostanie odcięta. Po powrocie przywróć wartości.
- **Ziemia na szwie.** Znacznik Ziemi w Drodze Mlecznej ma promień ≤ 16 px. Ziemia Obserwatorium w pozie szwu ma szacunkowo 10–20 px (zależnie od wysokości okna; zmierz). Wystarczy więc krótkie przenikanie w połowie fazy 2, ewentualnie z dopasowaniem rozmiaru znacznika.
- **Rozmiar płótna.** Nurkowanie odbywa się w pełnej szerokości sceny. Panele pojawiają się dopiero w fazie 3, gdy kamera i tak się porusza: zmiana proporcji nie może dać skoku.
- **Przebudowy sceny.** Scena Obserwatorium musi stać przed fazą 2. Gdy obraz albo scena nie są gotowe pod koniec fazy 1, kamera czeka w pozie szwu. Gwiazdy Gaia, które przyjdą w trakcie przejścia, zastosuj po nim. Przebudowa sceny Space3D w trakcie przejścia przeskakuje do stanu końcowego.
- **Rozkładanie po wczytaniu obrazu** (`Observatory.tsx:121`) rusza dopiero po fazie 3.
- **Przelot startowy Space3D.** Przełączenie na Drogę Mleczną przebudowuje scenę, a ta zaczyna własny przelot (`flying`, 2,2 s) i obrót. Nurkowanie, także uruchomione z Wszechświata lokalnego (decyzja 7), najpierw go wyłącza, tak jak dziś `photoFitRef` (`flying = false`, `autoRotate = false`).
- **Sterowanie.** W trakcie przejścia `OrbitControls` obu scen są wyłączone. Kliknięcie albo klawisz przeskakuje do stanu końcowego. Esc zamyka modal i sprząta przejście.
- **Ograniczony ruch:** bez nurkowania, od razu stan zdjęcia z `progress = 1` (jak dziś Obserwatorium) i z powrotem.
- **Stan zdjęcia.** Płótno Drogi Mlecznej nie renderuje, ani klatek kontrolnych, ani obrotu Ziemi. Kopuła Nieba pod modalem nie powinna renderować w pętli (sprawdź `SkyDome` i zatrzymaj odtwarzanie nocy przy otwarciu).

## Etapy

### 1. Modal i wejście
- Wydziel powłokę okna z `Observatory` (nagłówek z kickerem i tytułem, akcje, `CloseButton`, Esc, fokus, `role="dialog"`). Wymiary i klasy mają być takie jak dziś `.observatory` / `.obs-window`. Obserwatorium staje się treścią stanu zdjęcia, bez własnego dialogu i bez własnej obsługi Esc.
- Stan `space3DOpen` (nietrwały) w store, akcja otwarcia z `SkyView` i `ObjectDetails`. Usuń `'3d'` z `CenterMode` i `MODES`. Przycisk „Pozycja 3D” zostaje w pasku karty jako przycisk otwierający modal.
- Pasek narzędzi modala w skalach Droga Mleczna i Wszechświat lokalny:
  - przełącznik skal;
  - „Gwiazdozbiory 3D”, wybór gwiazdozbioru, „Nazwy gwiazd”, „Obiekty x/y” (Droga Mleczna);
  - suwak liczby galaktyk (Wszechświat lokalny);
  - przycisk „i” z opisem skali;
  - `LayersMenu threeD` (wyeksportuj go albo przenieś).
- Stan zdjęcia przenieś z `Space3D` do modala: wspólny moduł sesji zdjęcia z uploadem, odczytem i zapisem, odległościami i gwiazdami Gaia (decyzja 9).
- → weryfikuj: **przed zmianami** zapisz `getBoundingClientRect` okna `.obs-window` dzisiejszego Obserwatorium przy 1920 × 1080 i 1366 × 768 (po etapie 1 nie będzie już z czym porównać). Okno modala przy tych rozdzielczościach ma te same wymiary. Esc i przycisk zamykają modal, a fokus wraca na „Pozycja 3D”. Przełączanie skal działa. Kopuła pod spodem nie traci stanu. Brak błędów konsoli. Startowy JS < 200 KB gzip.

### 2. Droga Mleczna ze zdjęciem
- Rozdziel `PhotoExplorer` na dwie części:
  - **wspólną**: upload, edytor wycinków, płaski widok edycji, źródła odległości, komunikaty;
  - **starą nakładkę z rozkładaniem** (kolumny, kotwice, suwak, odtwarzanie), montowaną tylko we Wszechświecie lokalnym.
- W Drodze Mlecznej pokaż w scenie 3D linię widzenia, stożek pola i znaczniki wycinków (decyzja 4), w kolorach typów z `annotationColors`. Pasek zdjęcia ma te same miejsce i wymiary co dzisiejszy `.photo-controls`, ale bez suwaka. Przyciski: [Rozłóż zdjęcie 3D] [Edytuj wycinki] [Zmień zdjęcie] [Usuń].
- Usuń połączenia starej nakładki z Drogą Mleczną: gałąź `'galaxy'` w `photoFitRef`, rzut kotwic do `photoFrameRef` w tej skali, `zoomOutFromObservatory` i `ObservatoryScene.zoomOut`. Klasyfikacja `photoAnchorKind` i jej testy zostają (decyzja 4). Wszechświat lokalny działa jak dziś.
- → weryfikuj:
  - test w `src/lib`: baza kadru jest ortonormalna i ma wyznacznik +1; kierunek środka zgadza się z `galacticVector` środka; dla zapisanego zdjęcia M42 kierunki 3 gwiazd Gaia z RA/Dec i z pikseli przez bazę różnią się o < 2% szerokości pola;
  - Playwright, Droga Mleczna ze zdjęciem M42: linia i stożek wychodzą z Ziemi w stronę Oriona, znaczniki M42 i M43 leżą ok. 1,3–1,4 tys. lś od Ziemi;
  - edycja okręgu w Drodze Mlecznej zmienia kartę w Obserwatorium;
  - Wszechświat lokalny ze zdjęciem M51 wygląda jak przed zmianą (zrzut przed i po).

### 3. Nurkowanie
- Czysta logika w `src/lib` (np. `spaceDive.ts`): oś czasu faz z wygładzeniem, `u(e)`, most pozy kamery, kąt stożka, krycia warstw. Kierunek wsteczny to `t → 1 − t`.
- Pokrywa kamery i warstw:
  - w `Space3D` (przez ref, jak dziś `photoFitRef`): poza, FOV, near/far, krycie warstw, kąt stożka, wstrzymanie renderu;
  - w `ObservatoryScene`: poza, krycie siatki, osi, ostrosłupa, Ziemi, zdjęcia, kart i gwiazd, włączanie sterowania.
- W trybie dev (`import.meta.env.DEV`) uchwyt do zatrzymania przejścia w chwili `t`, do zrzutów. Nie trafia do produkcji.
- → weryfikuj:
  - testy: końce osi czasu; `u(0,5) = √(u0·u1)`; most w e = 1 daje pozę szwu; ruch wstecz jest lustrem ruchu naprzód; kąt stożka jest ciągły;
  - Playwright: zrzuty przy t = 0; 0,25; 0,5; 0,75; 1 w obie strony;
  - na szwie środek Ziemi różni się między scenami o ≤ 2 px, a kierunek linii widzenia na ekranie o ≤ 1°;
  - po zakończeniu rozkładania (albo przy wstrzymanym) przez 2 s brak klatek poza kontrolnymi (licznik `renderer.info.render.frame`), a płótno Drogi Mlecznej nie renderuje wcale;
  - przy `prefers-reduced-motion` cięcie bez animacji.

### 4. Dokumentacja i porządek
- Zaktualizuj `docs/photo-space-3d.md`, `docs/wymagania.md` i opis architektury w CLAUDE.md: modal, brak trybu `'3d'`, nowe moduły, pułapka z czasem `requestAnimationFrame`.
- Uruchom `npm test`, `npm run typecheck`, `npm run build` i zmierz rozmiar startowego JS.
- Po subagentach sprawdź `git status` (puste pliki w korzeniu). Przywróć stan profilu Playwrighta.

## Definicja ukończenia

Na zapisanym zdjęciu M42 użytkownik:
1. klika „Pozycja 3D” i dostaje modal tej samej wielkości co dzisiejsze Obserwatorium;
2. przełącza Drogę Mleczną i Wszechświat lokalny;
3. w Drodze Mlecznej widzi linię widzenia, stożek pola i znaczniki wycinków;
4. edytuje wycinek;
5. klika „Rozłóż zdjęcie 3D” i bez szwu nurkuje do siatki, po czym zdjęcie samo się rozkłada;
6. klika „Droga Mleczna” i wraca tą samą drogą.

Wszechświat lokalny z galaktykami działa po staremu. Esc zamyka modal. Testy, typecheck i build przechodzą, a startowy JS nadal ma < 200 KB gzip.
