# Wspólna scena „Pozycja 3D”: Droga Mleczna i Wszechświat lokalny (projekt, 14.11.2026)

## Po co
Okno „Pozycja 3D” ma dziś dwie osobne sceny. Zmiana zakładki niszczy renderer WebGL, buduje scenę od nowa
i powtarza przelot startowy znad Galaktyki. Obie sceny używają tego samego modelu Drogi Mlecznej (`milkyWay`):
we Wszechświecie lokalnym w skali 0,12, z obiektami bliższymi niż 150 tys. lś ułożonymi liniowo jak w Drodze Mlecznej.
Użytkownik chce jednej sceny: zakładka zbliża albo oddala kamerę, zamiast przełączać światy.

## Decyzje użytkownika (14.11.2026)
1. Jedna scena; widok Wszechświata lokalnego służy też jako widok Drogi Mlecznej.
2. Przełączanie widoków przybliża albo oddala kamerę.
3. **Zakładka zmienia się tylko kliknięciem** (wariant A). Zoom kółkiem jej nie przełącza.

## Cele, nie-cele, anty-cele
- **Cele:** jedna scena i jeden renderer na całe życie okna; przelot kamery przy zmianie zakładki; płynny wygląd
  przy każdym oddaleniu (warstwy drugiej skali pojawiają się i znikają z odległością kamery).
- **Nie-cele:** automatyczna zmiana zakładki przy zoomie; nowe dane, modele czy filtry; zmiany w Obserwatorium.
- **Anty-cele:** widok Drogi Mlecznej wygląda inaczej niż dziś przy swoim kadrze; pierścienie, kopuły i dalekie
  galaktyki prześwitują w widoku Drogi Mlecznej; 16 tys. punktów Galaktyki zlewa się z daleka w jasną plamę;
  dwa przeloty kamery naraz.

## Kryterium sukcesu
Zakładka Droga Mleczna przy swoim kadrze wygląda jak dziś. Zakładka Wszechświat lokalny wygląda jak dziś,
tylko w jednolicie większej skali (×1/0,12). Sprawdzenie: test w `src/lib` i zrzuty Playwrightem.

## Podejścia
1. **Wybrane: jedna scena w jednostkach Drogi Mlecznej (1 j. = 1000 lś), część logarytmiczna rozciągnięta 1/0,12 ≈ 8,3 raza.**
   Wszystko, co dziś działa w tysiącach lś, zostaje bez zmian: położenia skali Galaktyki, Ziemia, gwiazdozbiory,
   widok gwiazdozbioru z Ziemi (near 0,001), most nurkowania (`END_SCALE`) i `milkyWayCone`.
   Przeliczenia wymaga tylko treść Wszechświata.
2. Odrzucone: scena w jednostkach Wszechświata (0,12). Gwiazda gwiazdozbioru o 300 lś leżałaby 0,036 j. od Ziemi,
   bliżej niż płaszczyzna near kamery (0,1). Trzeba by przeskalować całą Drogę Mleczną i dynamicznie zmieniać near
   albo włączyć logarytmiczny bufor głębi, który psuje własne shadery (`domeMaterial`).
3. Odrzucone: dwie sceny z przenikaniem w trakcie przelotu. Zostaje dublowanie i drugi kontekst WebGL, a scena
   nie jest wspólna.

## Projekt
### Układ współrzędnych (`src/lib/space3d.ts`)
- Jedna funkcja położenia bez parametru skali, `scenePosition(o, distLy)`:
  - d < 150 tys. lś: liniowo, jak dziś `'galaxy'`;
  - d ≥ 150 tys. lś: logarytmicznie od centrum Galaktyki, `r = LOG_UNIT · log10(d / 1e4)`, gdzie
    `LOG_UNIT = 22 / 0,12` (jedna stała zamiast literału 22 w czterech miejscach).
- To samo dla `scenePoint(dir, distLy)` i `sunPosition()` (dziś `'galaxy'`).
- Test: wynik równy dawnemu `'galaxy'` dla d < 150 tys. lś i dawnemu `'universe'` × 1/0,12 dla d ≥ 150 tys. lś.
- `SpaceScale` zostaje jako nazwa **zakładki** (widoku), już nie układu współrzędnych.

### Scena (`Space3D.tsx`)
- Scena powstaje raz. Zależność głównego efektu od `scale` znika; zakładka trafia do refa.
- Treść obu dzisiejszych scen w jednej:
  - model Drogi Mlecznej (52 tys. punktów, skala 1);
  - dwa obiekty `Points` tła:
    - galaktyczne (d < 150 tys. lś) z filtrem rodzajów `showTypes`;
    - pozagalaktyczne bez Grupy Lokalnej, z zakresem rysowania według suwaka galaktyk;
  - modele Grupy Lokalnej, pierścienie z kopułami i podpisami, gwiazdozbiory 3D, Ziemia ze światłem,
    podpisy „Centrum Galaktyki”, „Ziemia” i „Droga Mleczna”.
- Przeliczenie stałych Wszechświata ×1/0,12: `minSpan` (70 i 16), start kamery (y = 200), grubość pierścieni (±0,08),
  odstęp podpisu pierścienia, podpis „Droga Mleczna” (y = −4,2), współczynnik `UNIVERSE_GALAXY_SCALE` w `localGroupGalaxy`
  (wtedy `50 * model.scale.x` w wygaszaniu modeli skaluje się sam), promień linii samego kierunku, `CONE_DEFAULT`
  dla Wszechświata. Płaszczyzna far i `controls.maxDistance` mają objąć najdalsze galaktyki i zoom kółkiem.
- **Warstwy zależne od zakładki** (ich przełączniki są tylko w jednej zakładce):
  - gwiazdozbiory 3D i nazwy gwiazd (ich stan zostaje na powrót);
  - widok gwiazdozbioru z Ziemi (`skyView`), czyszczony przy zmianie zakładki;
  - podpisy i kliknięcia obiektów tła: w Drodze Mlecznej obiekty galaktyczne, we Wszechświecie galaktyki
    i Grupa Lokalna; zakładka wchodzi do klucza pamięci `drawLabels`;
  - podpisy „Ziemia” i „Centrum Galaktyki” albo „Droga Mleczna”;
  - linia, pion i celownik wybranego obiektu według dzisiejszych reguł zakładki (obiekt spoza 150 tys. lś
    w Drodze Mlecznej: tylko kierunek).
- **Warstwy wygaszane z odległością kamery od początku układu** (nie od celu orbity):
  - funkcja w `src/lib` z testem zwraca dwa krycia w zakresie 0–1: galaktyczne i pozagalaktyczne;
  - galaktyczne: punkty obiektów Galaktyki i Ziemia;
  - pozagalaktyczne: punkty galaktyk, pierścienie, kopuły, ich podpisy i modele Grupy Lokalnej;
  - warstwy pozagalaktyczne dostają `visible = false` przy kadrach zakładki Droga Mleczna;
  - model Drogi Mlecznej z daleka ciemnieje, żeby 52 tys. punktów nie dawało plamy (dziś Wszechświat ma 12 tys.);
  - progi (orientacyjnie: kadr Drogi Mlecznej do ok. 300 j., Wszechświata od ok. 600 j.) ustalić na zrzutach;
  - krycie mnoży się z dzisiejszym `override.layerFade` nurkowania.

### Kamera
- Jeden przelot na zmianę: zmiana obiektu, zakładki albo obu w jednym renderze (`useSpaceSettings` resetuje zakładkę
  przy zmianie obiektu) daje jedną pozę. Bez zdjęcia pozę liczy `showObject` dla bieżącej zakładki, ze zdjęciem
  `guide.frameCamera()`.
- Przelot przy zmianie zakładki interpoluje odległość kamery od celu geometrycznie (logarytmicznie), więc ruch
  ×8 nie pędzi na początku. To nowa opcja `fly`. `orbitOffset` (wspólne z Obserwatorium) bez zmian. Czas
  dłuższy niż `FLY_MS`, ok. 1,6 s. Przy ograniczonym ruchu: cięcie.
- Otwarcie okna: przelot startowy jak dziś, w zakładce wybranej automatycznie z odległości.

### Zdjęcie (`photoGuide.ts`, `Space3DModal.tsx`)
- Uchwyt sceny już się nie zmienia przy zmianie zakładki, więc `usePhotoGuide` dostaje zakładkę jawnie. Zakładka
  trafia do zależności przebudowy i do warunku ponownego kadru. `handle.scale` znika z `Space3DHandle`.
- Stożek, znaczniki i grot według zakładki jak dziś: `photoAnchorKind`, `milkyWayCone` w Drodze Mlecznej,
  `universeCone` i kadr od najbliższego obiektu we Wszechświecie.
- Nurkowanie bez zmian w logice. Z zakładki Wszechświat startuje ok. 8 razy dalej, a Ziemia jest teraz w scenie;
  sprawdzić szew (`__spaceDive.seam()`).
- `chooseScale` i dzisiejsze reguły stanu zdjęcia (ta sama zakładka nurkuje wstecz, druga przełącza od razu) bez zmian.

## Zostawione wykonawcy
- Dokładne progi wygaszania, czas przelotu, far i `maxDistance`: na zrzutach Playwrightem w obu zakładkach,
  z wybranym obiektem i ze zdjęciem.
- Czy `setObsAlive(false)` przy zmianie zakładki jest jeszcze potrzebne. Domyślnie zostaje (zmiana minimalna).
- Aktualizacja testów: `photoGuide.test.ts` (fixture z `sunPosition(scale)`), `galaxyModels.test.ts`,
  `spacePhoto.test.ts`, `spaceSettings.test.ts`; nowe testy: położenie, krycia warstw, interpolacja zoomu.
- Dokumentacja: `CLAUDE.md` („Scena powstaje raz na skalę”), `docs/photo-space-3d.md` (wiersz 7 i opisy skal).

## Ograniczenia
- Budżet startowego JS bez zmian: `Space3D` i three.js dalej ładowane leniwie.
- W drzewie roboczym są niezatwierdzone zmiany z innych prac, m.in. w `Space3DModal.tsx` i `photoSession.ts`.
  Nie cofać ich i nie łączyć z tą pracą w jednym commicie.
- Skok między częścią liniową a logarytmiczną przy 150 tys. lś zostaje taki jak dziś we Wszechświecie lokalnym.
