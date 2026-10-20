# BACKLOG
Jedna funkcja to mały kawałek programu, który da się sprawdzić przykładami.
Status: do zrobienia | spec | zatwierdzona | w toku | gotowa | zatrzymana

Etap 5 specyfikacji `prompt-astro-planner.md` (sekcja 12, wiersz 5): Kadr — własny widok, źródła zdjęć z kolejnością prób, mapa zastępcza z zarysami, mozaika, OAG (7B); edytor sprzętu (7F). Etap 4 (katalog, 11 funkcji) jest gotowy; jego backlog jest w historii git (commit 17049c4). Kolejność wierszy = kolejność zależności.

| id | funkcja (po ludzku) | czego dotyka | status |
|----|---------------------|--------------|--------|
| profile-zestawow | Profile sprzętu zapisane w przeglądarce: przy pierwszym uruchomieniu 4 profile z 6.4; dodawanie, duplikowanie, zapis, usuwanie (nie ostatniego) i wybór aktywnego profilu, także z górnego paska | `data/repositories.ts` (wpis `profiles` w tabeli `settings`), `state/plannerStore.ts`, `app/TopBar.tsx` | gotowa |
| formularz-profilu | Model edytora profilu (7F): teleskop i kamera z wyszukiwarki katalogu albo „Własny”, wartości edytowalne, „zmienione względem katalogu”, mnożnik z szybkim wyborem, binning, montaż, filtry, OAG; walidacja (błąd blokuje zapis, ostrzeżenie nie); podgląd na żywo: F_eff, f/, matryca i przekątna, FOV w ° i ′, skala, ocena próbkowania, uwaga dla OSC | `features/equipment/profileForm.ts` (czyste funkcje) | gotowa |
| wlasny-sprzet | „Zapisz jako mój teleskop / moją kamerę”: wpis `origin: 'user'` z wartości formularza, edycja i usuwanie własnych wpisów, duplikowanie wbudowanych jako własne; profile zachowują swoje wartości, a po usunięciu wpisu pokazują go jako wpis ręczny | `features/equipment/`, istniejące repozytoria sprzętu | gotowa |
| zakladka-sprzet | Ustawienia → „Sprzęt”: lista profili (dodaj, duplikuj, usuń, ustaw aktywny), edytor profilu z polami, wyszukiwarkami, przyciskami mnożnika, komunikatami i podglądem; lista własnych wpisów | `features/equipment/*.tsx`, `features/settings/SettingsTab.tsx` | gotowa |
| geometria-kadru | Geometria kadru: środki i lokalny PA paneli mozaiki 1–5 × 1–5 z zakładką 10–30% (rzut odwrotny, nie dodawanie do RA/Dec), narożniki ramek, prostokąt pryzmatu OAG [Z20], rozmiar całej mozaiki; rzut z płaszczyzny stycznej na piksele wycinka TAN; kierunek obrotu PA na ekranie | `services/framing.ts` | gotowa |
| zarysy-stellarium | Parser `src/data/outlines.dat` (start/vertex/end, linie `#` pomijane, `\r` usuwane) i przypisanie oznaczeń do obiektów katalogu (`SH 2-275` → Sh2-275, `VDB 23` → vdB 23, M 42 → NGC1976) | `services/outlines.ts` | gotowa |
| mapa-zastepcza | Model mapy zastępczej: obiekty katalogu w polu widzenia jako wielokąty ze Stellarium (linia ciągła), elipsy z rozmiaru i PA albo okręgi z samej średnicy (linia przerywana), etykiety „oznaczenie + nazwa”; bez gwiazd [Z29] | `features/framing/fallbackMap.ts` | gotowa |
| zrodla-zdjec | Adresy czterech źródeł zdjęć (T21), warstwy hips2fits, rozmiar i pole wycinka z zapasem, limit 60′ dla STScI, klucz pamięci podręcznej, decyzja „trzeba pobrać nowy wycinek” po przesunięciu | `services/skyImage/sources.ts` | gotowa |
| pobieranie-zdjec | Kolejność prób z limitem 10 s na źródło i przejściem do następnego po błędzie; najpierw Cache Storage; ręczny wybór źródła; zapamiętanie ostatniego działającego; „Zapisz podgląd do pracy offline”; SkyView bez zapisu offline | `services/skyImage/loader.ts` | gotowa |
| zakladka-kadr | Zakładka „Kadr” (nawigacja: Katalog, Noc, Kadr, Ustawienia): obiekt jak w zakładce Noc, widok SVG z mapą zastępczą, ramką, panelami i OAG; ramka stała w środku, przesuwanie tła zmienia środek kadru; suwak i pole PA; mozaika; dane kadru (FOV, skala, próbkowanie) także bez sieci; Red Mode | `features/framing/`, `app/NavBar.tsx`, `App.tsx`, `state/plannerStore.ts` | gotowa |
| zdjecie-w-kadrze | Zdjęcie w tle widoku kadru: podpis źródła, ręczny wybór źródła, „Brak zdjęcia — pokazuję zarysy obiektów” z „Spróbuj ponownie”, przycisk „Zapisz podgląd do pracy offline”, nowy wycinek po przesunięciu poza zapas, podpisy licencji (zdjęcia, Stellarium GPL-2.0) | `features/framing/` | gotowa |


### Poprawki po przeglądzie w przeglądarce (20.10.2026)

Użytkownik sprawdził zakładkę Kadr i poprosił o zmiany; specyfikacja zmieniona commitem 8fa8bf6 (Z28, Z29, 6.7, 7.0, 7B, T27).

| id | funkcja (po ludzku) | czego dotyka | status |
|----|---------------------|--------------|--------|
| limit-hips2fits | Limit czasu ustawiany osobno dla każdego źródła; aplikacja daje 30 s każdemu serwerowi hips2fits, 10 s SkyView i STScI [Z28]. Domyślne 10 s w `createSkyImageLoader` zostaje (zamrożone testy `pobieranie-zdjec` liczą na nie) | `services/skyImage/loader.ts`, `features/framing/useSkyImage.ts` | gotowa |
| pasek-czasu-kadr | W zakładce Kadr górny pasek nie pokazuje kursora czasu (suwak, godzina, „Teraz”); lokalizacja, noc, zestaw i Red Mode zostają. W innych zakładkach bez zmian (7.0) | `app/TopBar.tsx` | gotowa |
| katalog-gwiazd | Katalog gwiazd Tycho-2 do V ≤ 10 (6.7): skrypt `scripts/build-stars.ts` (zapytanie TAP, jasność V, zapis zwartego pliku binarnego), odczyt pliku w aplikacji i szybki wybór gwiazd w polu widoku. Testy na danych przykładowych, bez sieci; prawdziwy plik `public/catalog/stars.v1.bin` buduje orkiestrator po PASS (katalog `public/catalog/*` jest chroniony) | `scripts/build-stars.ts`, `services/stars.ts` | gotowa |
| zoom-kadru | Przybliżanie w oknie kadru: „+”, „−” (×1,5), „Dopasuj”, kółko myszy i szczypanie tylko nad widokiem; pole widoku od ok. 1,2× przekątnej kadru do 60°; po zmianie pola nowy wycinek zdjęcia według zasad „nowy wycinek” (7B) | `features/framing/` (model, zakładka, warstwa zdjęcia) | gotowa |
| tlo-mapy | Tło okna kadru [Z29]: gwiazdy z `katalog-gwiazd` jako kropki (większe dla jaśniejszych) i siatka RA/Dec z opisami; pod zarysami i pod zdjęciem, więc widoczne tam, gdzie zdjęcia nie ma; Red Mode | `features/framing/` (model tła, `FramingView.tsx`) | gotowa |
| warstwy-skyview | Warstwa ma pierwszeństwo (7B, 20.10.2026): dla DSS2 czerwonego i Hα kolejno alaskybis, alasky i SkyView w tej samej warstwie (SkyView: `dss2r`, `H-Alpha%20Comp`), najpierw ich pamięć, potem sieć, a dopiero potem inne źródła i pamięć; podpis „Warstwa … niedostępna — pokazuję …”; ręczny wybór źródła nadal wygrywa | `services/skyImage/sources.ts`, `loader.ts`, `features/framing/photoModel.ts` | zatwierdzona |

Wskazówki do poprawek:
- `warstwy-skyview` (20.10.2026, po sprawdzeniu w Comet): przy wolnym CDS (oba serwery > 90 s na wycinek 1000 px) zmiana warstwy dawała zapisane zdjęcie STScI, bo po porażce alaskybis tryb ręczny przechodził do pamięci wszystkich źródeł przed alasky (`pobieranie-zdjec` P16). SkyView `H-Alpha%20Comp` odpowiedziało w ok. 2 s, `DSS2%20Red` w ok. 20 s. Zmiany tylko dodające: zamrożone testy `pobieranie-zdjec`, `zrodla-zdjec`, `zdjecie-w-kadrze`, `limit-hips2fits`, `zoom-kadru` dotyczą warstwy DSS2 kolor i trybu bez warstwy — tam bez zmian.
- Zamrożone testy etapów 1–5 (2103) są w regresji. Zmiany tylko dodające: nowe parametry opcjonalne z dotychczasowym zachowaniem domyślnym (np. limit czasu, pole widoku = pole wycinka z `zrodla-zdjec`, gdy zoom = „Dopasuj”).
- Pomiary 20.10.2026: hips2fits 9–21 s na wycinek 3,05°/1000 px (`curl`), SkyView 1–4 s, STScI ok. 1,4 s (z przeglądarki Comet). W panelu przeglądarki Claude STScI jest zablokowane.
- Tycho-2 (TAP VizieR, 20.10.2026): `I/259/tyc2` z V ≤ 10 → 355 360 gwiazd; `I/259/suppl_1` → 1 787; razem 357 147 [T27]. Adres TAP: `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync` (REQUEST=doQuery, LANG=ADQL, FORMAT=csv; działa z `curl` z własnym User-Agent).
- `TopBar` renderują helpery testów `profile-zestawow` i `zakladka-sprzet` — zmiana ma ich nie popsuć.

## Kryteria akceptacji → funkcje (każde musi być przykładem P…)
1. [T12] mozaika 2×1 RedCat, odległość środków 4,305°, różnica RA i lokalny PA przy Dec 0°, 60°, 85° → `geometria-kadru`.
2. [T17] zestaw wpisany ręcznie (80/480, 0,8×, 4144 × 2822, 4,63 µm, binning 1 i 2) → `formularz-profilu`.
3. [T18] Esprit 100ED + ASI6200MM z katalogu = T1; zmiana ogniskowej → „zmienione względem katalogu”, wpis katalogu bez zmian → `formularz-profilu`; edycja i usunięcie własnego wpisu nie zmienia profili, po usunięciu profil pokazuje wpis ręczny → `wlasny-sprzet`; to samo widoczne w interfejsie → `zakladka-sprzet`.
4. [T19] walidacja pól w formularzu (błędy blokują zapis, ostrzeżenie f/0,8 nie blokuje, „3,76” = „3.76”) → `formularz-profilu` (reguły są już w `services/equipment.ts`).
5. [T21] adresy dla M 42, pole 1°, 800 px → `zrodla-zdjec`.
6. [T22] kolejność prób z atrapami (limit czasu → 503 → działa, podpis „NASA SkyView”; wszystkie zawodzą → mapa zastępcza z komunikatem i „Spróbuj ponownie”; ponowne otwarcie z Cache Storage bez sieci) → logika: `pobieranie-zdjec`; podpis, komunikat i przycisk: `zdjecie-w-kadrze`. Decyzja użytkownika: SkyView nie zapisuje się offline, więc część „ponowne otwarcie z Cache Storage” sprawdza się na źródle z zapisem (hips2fits albo STScI).
7. [T23] parser: pierwszy zarys LBN 933 w RA 05,66984 h (85,0476°), Dec +2,76126°; 100 zarysów, każdy ≥ 3 punkty; `SH 2-275` → Sh2-275, `VDB 23` → vdB 23 → `zarysy-stellarium`.
8. [T24] wycinek 1000 × 1000 px, pole 2°, PA 0°, Newton 150/600 + Ares-M Pro: ramka od ok. 230 do 770 px (±1 px) → `geometria-kadru`; mapa zastępcza w polu 2° wokół M 42: wielokąty M 42, M 43, NGC 1977 linią ciągłą, NGC 1973, NGC 1975, NGC 1980 jako elipsy lub okręgi linią przerywaną, z etykietami → `mapa-zastepcza`; to samo w widoku → `zakladka-kadr`.
9. Zgodność kierunku obrotu z konwencją z sekcji 4 (N u góry, E po lewej, PA rośnie przeciwnie do ruchu wskazówek zegara) → `geometria-kadru` (wzór) i `zakladka-kadr` (rysunek).
10. 7B: ramka stała, przesuwanie tła zmienia środek [Z11]; suwak 0–360° z krokiem 0,5° i pole PA; mozaika 1–5, zakładka 10–30% (domyślnie 20%); OAG obracany razem z kadrem; FOV bez sieci → `zakladka-kadr` (z funkcjami z `geometria-kadru`).
11. 7B: źródło obrazu widoczne, wybór ręczny, zapamiętanie ostatniego działającego, Cache Storage, przycisk offline → `pobieranie-zdjec` i `zdjecie-w-kadrze`.
12. 7F: lista profili (dodaj, duplikuj, usuń, aktywny także z górnego paska) → `profile-zestawow`, `zakladka-sprzet`.

## Decyzje użytkownika (19.10.2026)
- **SkyView** (3. źródło) zostaje jako rezerwa online, ale jego zdjęcie nie zapisuje się do pracy offline: serwer nie wysyła nagłówka `Access-Control-Allow-Origin`, więc przeglądarka nie może odczytać ani zapisać obrazu. Przycisk „Zapisz podgląd do pracy offline” pobiera wtedy wycinek ze źródła z zapisem (hips2fits albo STScI).
- **Zakładka Kadr** stoi w nawigacji między Noc a Ustawienia. Zamrożony test etapu 4 (`tests/features/zakladka-katalog/tabs.test.ts`, P1: dokładnie „Katalog, Noc, Ustawienia”) orkiestrator poprawi osobnym commitem tuż przed zamrożeniem testów `zakladka-kadr`, za zgodą użytkownika.

## Wskazówki techniczne dla agentów
- **Źródła w `prompt-astro-planner.md`:** 7B (całość), 7F, sekcja 4 (PA, płaszczyzna styczna), sekcja 5 (`EquipmentProfile`, `TelescopeSpec`, `CameraSpec`, `Framing`, `oag` [Z20]), 6.4 (profile demonstracyjne), 6.5 (katalog sprzętu, mnożniki), sekcja 8 (Red Mode, filtr SVG `red-only`), sekcja 9 (zakładki), Z11, Z24–Z29, załącznik A: T1, T2, T12, T17–T24; T25 tylko w części „linie `#` pominięte”. Etapu 8 (`outlines.extra.dat`) nie realizujemy.
- **Gotowe klocki — używaj, nie pisz od nowa:** `computeOptics`, `assessSampling`, `gnomonicProject`, `gnomonicUnproject`, `angularSeparationDeg` (`services/astroMath.ts`); `parseDecimal`, `validateEquipment`, `hasErrors`, `findSpec`, `changedTelescopeFields`, `changedCameraFields` (`services/equipment.ts`); `telescopeRepository`, `cameraRepository` (`data/repositories.ts`); `BUILTIN_TELESCOPES`, `BUILTIN_CAMERAS`, `REDUCER_PRESETS` (`data/equipmentCatalog.ts`); `DEMO_PROFILES`, `DEFAULT_PROFILE_ID` (`data/demo.ts`); `formatDesignation` (`services/catalog/records.ts`); `loadCatalog` (`data/featuredObjects.ts`).
- **Zamrożone testy etapów 1–4 sprawdzane są w każdej próbie (regresja, ok. 1270 testów, także `tsc` na `tests/`):**
  - `tests/features/parametry-planowania/repository.test.ts` wymaga `db.verno === 3`. Nie dodawaj wersji bazy Dexie. Profile zapisz w istniejącej tabeli `settings` pod kluczem `profiles` (jak parametry planowania pod `planning`).
  - Testy etapu 4 importują `DEMO_PROFILES` i przekazują do funkcji stan bez listy profili (np. `{ activeProfileId: 'demo-redcat51-asi2600mc', … }` w `tests/features/obliczenia-w-tle/request.test.ts`). `activeProfileOf` ma działać dalej z takim stanem: lista profili w stanie jest opcjonalna, a bez niej obowiązują `DEMO_PROFILES`. Zmiany typów i sygnatur tylko dodające.
  - `tests/features/zakladka-katalog/tabs.test.ts` P1 wymaga dziś zakładek „Katalog, Noc, Ustawienia” (patrz decyzje użytkownika).
- **`outlines.dat`:** plik jest już w `src/data/outlines.dat` (commit 48e4f35; Stellarium e8f5283a, SHA-256 8043e77a…37f7, 3491 linii, końce LF, `.gitattributes`: `src/data/*.dat -text`). Fakty z pliku:
  - 100 odcinków `start`…`end`; dwie linie `# Need a check`; linie mają 3–5 pól (`RA[h] Dec[°] polecenie [oznaczenie z ewentualną spacją]`, np. `05.66984 +02.76126 start  LBN 933 ` ze spacją na końcu).
  - Jeden obiekt może mieć kilka wielokątów: NGC 6334 ×4; NGC 3372, IC 2177 i „38” po 2.
  - Oznaczenia, których nie ma w katalogu aplikacji: same liczby 38–49, `RCW 27/32/33`, `Ced 30`, `C 99`, `C 100`, `PGC 17223`. Spec musi podać regułę i przykład P dla takich zarysów.
  - Przypisanie do `uid` przez wyszukanie oznaczenia w katalogu (`designations`), a nie przez przepisanie tekstu: M 42 → `NGC1976`, M 43 → `NGC1982`, NGC 1977 → `NGC1977`.
  - Parser ma usuwać `\r` (plik po pobraniu może mieć CRLF) — z własnym przykładem P.
  - Plik nie jest na liście chronionych, więc testy niech sprawdzają jego liczbę linii albo sumę SHA-256.
- **Rzut na wycinek (T24):** wycinki hips2fits i SkyView są w TAN z N u góry i E po lewej. Sprawdzone na nagłówkach FITS (`experiments/outlines/RAPORT.md`, punkt 5): `CRPIX = W/2` i `CDELT = 2·tan(fov/2)/W` [rad/px], a nie `fov/W`, jak pisze dosłownie 7B. Spec ma podać `2·tan(fov/2)/W` wprost i zaznaczyć, że zastępuje „fov / szerokość” z 7B. Przy 2° oba wzory dają ok. 230–770 px, więc dodaj przykład P z szerokim wycinkiem (15–20°, np. mozaika RedCat) i punktem przy brzegu, gdzie wzory różnią się o ≥ 3 px. Ustal jedną konwencję środka piksela; tolerancje ≥ 1 px.
- **Źródła zdjęć — fakty sprawdzone 19.10.2026 (`curl` z nagłówkiem `Origin`):**
  - `alasky.cds.unistra.fr` hips2fits: 200, `Access-Control-Allow-Origin: *` (obraz można pobrać `fetch` i zapisać).
  - `alaskybis.cds.unistra.fr`: nie odpowiedział w 40 s ani w 120 s (przeciążony — dokładnie przypadek z 7B); to ta sama usługa co alasky, więc zakładamy te same nagłówki.
  - SkyView: 200, `image/jpeg`, **bez** `Access-Control-Allow-Origin` → tylko `<img>`; błąd (np. 503) wykrywa się zdarzeniem `error` obrazu, bo `fetch` w trybie `no-cors` go ukrywa. Bez zapisu offline (decyzja użytkownika).
  - STScI: 200, `image/gif`, `Access-Control-Allow-Origin: *`. Formularz STScI ogranicza bok do 60′, ale serwer tego nie pilnuje (120′ dało 13,5 MB GIF), więc `w` i `h` trzeba przyciąć do 60′. Obraz STScI nie jest w TAN: spec ma ustalić, jak go położyć (skala z naturalnego rozmiaru obrazu, wyśrodkowany, bez obrotu).
  - Limit 10 s ma naprawdę przerywać zapytanie (`AbortController`), a nie tylko przestać czekać.
- **Testy bez sieci i bez przeglądarki:** Vitest w Node nie ma `caches`, `Image` ani sieci. `fetch`, ładowanie obrazu, Cache Storage, `localStorage` i zegar (limit czasu) wstrzykuj jako parametry; w testach atrapy. Widoki: czyste funkcje modeli + `renderToStaticMarkup`.
- **Zachowanie, którego Node nie sprawdzi w przeglądarce, ma mieć czystą funkcję i przykłady P po obu stronach każdej granicy:** kierunek przesuwania (przeciągnięcie tła w prawo przesuwa środek kadru na wschód), kierunek obrotu PA na ekranie, próg pobrania nowego wycinka, kolejność „najpierw pamięć podręczna wszystkich źródeł, potem sieć” (albo inna — do ustalenia w spec), wpływ ręcznego wyboru źródła na kolejność prób; w mapie zastępczej: NGC 1975 10 × 5 z PA null, obiekty bez rozmiaru, obiekt z wielokątem bez elipsy, obiekty na brzegu pola.
- **Bez nowych zależności** (`package.json` i `package-lock.json` chronione). Kolory tylko z tokenów (`theme/tokens.ts`); typ obiektu zawsze też tekstem.
- Sprawdzenie prawdziwych źródeł zdjęć i mapy zastępczej w przeglądarce robi orkiestrator raz, po etapie, na serwerze deweloperskim.

## Sprawy na później (poza etapem 5)
- vdB 36 ma w katalogu 820′ (13,7°); to prawdopodobnie błąd danych z etapu 2 (mgławice vdB mają zwykle kilka minut łuku). Do sprawdzenia w VizieR VII/21 (`BRadMax`/`RRadMax`).
- Zarys „NGC 1978” w `outlines.dat` (Stellarium) leży przy NGC 1977, a nie przy gromadzie NGC 1978 w LMC; mapa odrzuca go regułą 10° (`mapa-zastepcza` P13).
- Ekran „Źródła i licencje” w Ustawieniach (sekcja 10) — etap 7; teksty licencji z `zdjecie-w-kadrze` P25–P26 do sprawdzenia przed wydaniem.
- `fallbackMap` liczy się po całym katalogu (16 516 obiektów) przy każdej klatce przeciągania: ok. 8 ms w Chrome na komputerze (20.10.2026); na telefonie do sprawdzenia, ewentualnie liczyć mapę dla większego wycinka i tylko ją przesuwać.
- Źródła zdjęć sprawdzone 20.10.2026 w przeglądarce Comet (rozszerzenie Claude): alaskybis, alasky, SkyView i STScI dają obraz w zakładce Kadr; STScI kładzie się jako kwadrat 1° pośrodku. W panelu przeglądarki Claude STScI jest zablokowane przez sam panel. „Zapisz podgląd do pracy offline” po zdjęciu z SkyView pobiera z sieci, choć wycinek hips2fits tego kadru bywa już w pamięci (wtedy wystarczyłoby go pokazać) — możliwe usprawnienie.
- Po powrocie do zakładki Kadr wybór źródła wraca do „Automatycznie”, a obiekty URL zdjęć nie są zwalniane przy wyjściu z zakładki (drobny wyciek, zgłoszony przez implementer `zdjecie-w-kadrze`).
