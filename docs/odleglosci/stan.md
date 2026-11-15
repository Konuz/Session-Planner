# Odległości obiektów zdjęcia: stan wdrożenia (6.11.2026)

Wdrożenie rekomendacji pilotażu `output/odleglosci-pilotaz-2026-11-06/raport.md` (sekcja 8) i decyzji użytkownika
(Wikidata, także zamiast pomiaru z σ > 20 %, i regresor jako wartości niezweryfikowane):
obiekty bez ustalonej odległości nie pojawiają się w 3D ani na liście wyboru; bez nowych wykresów; źródło i zakres
tylko jako podpowiedź i wiersz w inspektorze obserwatorium.

## Co działa
- **Model** (`src/lib/distance.ts`, `src/lib/photo.ts`): wycinek ma wartość, σ, zakres (`object`, `population`,
  `illuminator`, `cloud`, `redshift`), metodę, źródło, bibcode i pochodzenie (`catalog`, `stars`, `user`).
  `PhotoProject.version = 3`; migracja v1/v2: wartość „Wikidata — katalog aplikacji” i brak odległości odświeża nowy
  katalog, wybór z SIMBAD/NED zostaje (`distanceOrigin: 'user'`), „cały kompleks” → `population`.
- **Warunek 3D** (`hasDistance`, `cutsInThreeD`): odległość dodatnia i σ ≤ 20 % (jak `usable3D` pilotażu).
  Dotyczy Obserwatorium, linii widzenia w Drodze Mlecznej, starej nakładki we Wszechświecie lokalnym i okręgów edycji.
  Gwiazdy Gaia bez odległości (ϖ/σ < 5) też nie trafiają do sceny ani listy. W liście wyboru wycinków obiekt bez
  odległości ma wyłączone pole; nazwę można kliknąć, żeby wybrać pomiar z SIMBAD/NED.
- **Katalog** (`npm run build:data` → `scripts/catalogDistances.ts`): Hunt & Reffert 2023 (463 gromady, po nazwie
  i pozycji), Cosmicflows-4 (3008 galaktyk, pozycja ≤ 0,5′ jeden do jednego), z z SIMBAD (4820, cz_CMB ≥ 3000 km/s,
  H₀ = 70), Zucker i in. 2020 (90 mgławic ciemnych, linie widzenia w obrysie), Wikidata na końcu jako
  „niezweryfikowane” (975 bez innego źródła). Decyzja 7.11.2026: gdy pomiar z łańcucha ma σ > 20 % (nie trafiłby
  do 3D), a Wikidata ma wartość, bierzemy Wikidata (1048 obiektów, głównie galaktyki CF4 z TF i płaszczyzną
  podstawową, np. NGC 5169); `withWikidataFallback`. Pomiar zostaje do wyboru w edycji wycinka (SIMBAD/NED).
  Pozostałości po supernowych (8.11.2026): Ranasinghe & Leahy 2022 (J/ApJ/940/63, 180 SNR katalogu, po oznaczeniu
  Greena z pozycją w obrysie; odległość zrewidowana przez autorów, a bez niej z literatury; granice pomijane).
  Razem 10 584 obiekty z odległością (wcześniej 6628, wszystkie z Wikidata).
- **Mgławice planetarne spoza OpenNGC** (8.11.2026, `scripts/planetaryNebulae.ts`): 964 pewne PN ze Strasbourg-ESO
  (Acker i in. 1992, VizieR V/84) dopisane na końcu katalogu (indeksy dawnych obiektów bez zmian), z oznaczeniem
  „PN G…” jako aliasem i średnicą optyczną z V/84/diam; pominięte, gdy oznaczenie lub mgławica katalogu w promieniu
  max(1′, połowa średnicy) już jest. „A N” → „Abell N” (w SIMBAD „PN A66 N”); `catalogOf` uznaje za Messiera tylko
  „M N” (nie „M 2-19”). Na zdjęciu HFG1 wykrywane są teraz HFG 1 i Abell 6.
- **Odległości mgławic planetarnych** (8.11.2026): Chornay & Walton 2021 (J/A+A/656/A110, gwiazdy centralne Gaia
  EDR3, odległość łączona z priorem statystycznym; Rel ≥ 0,5, RUWE < 1,4), po „PN G…” albo pozycji w promieniu
  mgławicy: 416 PN, np. HFG 1 706 pc ± 1 %, Abell 6 1224 pc ± 16 %, M 57 790 pc, NGC 7293 199 pc.
  `catalog.json` v2: tabela `sources` + kolumny 16–18 tylko w wierszach z odległością lub gwiazdą oświetlającą;
  1,37 → 1,48 MB, gzip 367 → 412 KB. Startowy JS bez zmian (157,3 KB gzip; HEAD 157,1 KB).
- **Gwiazda oświetlająca** (182 obiekty): vdB z gwiazdą z VII/21 (HD/BD), NGC/IC RN/EN/CN ≤ 1′ od gwiazdy vdB.
  Odległość po pobraniu gwiazd Gaia pola (`useCutDistances` → `refreshCutDistances`): gwiazda ≤ 20″ i |G − V| ≤ 1,5;
  gwiazda w gromadzie HR23 z katalogu (w promieniu pływowym, odległość zgodna w 3σ lub 10 %) dostaje odległość gromady.
- **Kontrola tożsamości** (`docs/odleglosci/tozsamosc.json`, generowany): 247 obiektów z pozycją SIMBAD > 0,25° od
  katalogu (bez odległości, pozycji nie zmieniamy), 30 aliasów należących do innych obiektów (pomijane przy szukaniu
  odległości), 243 rozbieżności typów (tylko do przeglądu). Znane z pilotażu: Sh2-277 (0,67°), LBN 773 → IC 336
  (1,56°), alias LBN 953 przy IC 434 (Mgławica Płomień), NGC 2024 (gromada w SIMBAD); NGC 1432 i NGC 1435
  (refleksyjne, w SIMBAD HII i ISM, więc automat ich nie wykrywa) są wpisane ręcznie w `known`.
- **Edycja wycinka** (`server/photoDistances.ts`): wiersz SIMBAD przypisany do gwiazdy (vdB 20–23, vdB 57) ma zakres
  „gwiazda oświetlająca”; galaktyka bez pomiaru dostaje odległość z z (SIMBAD i NED ObjectLookup) jako oszacowanie
  pośrednie; identyfikatory w zapisie SIMBAD (`Barnard 33`, `SH 2-277`, `VDB 52`).
- **Test referencyjny** (`src/lib/distancePilot.test.ts`, fixture 40 wycinków): 20 obiektów ze sprawdzoną odległością
  zgodną z pilotażem (w 2σ, min. 2 %), 3 z Wikidata; kandydaci i obiekty bez danych zawsze bez odległości.

## Znane różnice względem pilotażu (w fixture z powodem)
Wymagały literatury: IC 434 i B 33 (σ Ori), NGC 2024 (VLBA), NGC 1435 (Merope 11′ od mgławicy). B 33 pokazuje
Wikidata 1500 lś (niezweryfikowane). vdB 23: Alcyone bez paralaksy w Gaia DR3. IC 4278: z tylko w NED (dostępne
w edycji). IC 4282, NGC 5198 i NGC 5169 (zamiast CF4 z σ 26 %): Wikidata (niezweryfikowane).

## Regresor (krok 6): oszacowania niezweryfikowane dla obiektów bez odległości
Decyzja użytkownika 7.11.2026: regresor uzupełnia wycinki, które nie mają żadnej odległości, z dopiskiem
„niezweryfikowane” i metodą modelu (np. „regresor, niezweryfikowane: grupa 44 gwiazd Gaia DR3 (HDBSCAN 5D + MLE
paralaks), stożek 0,45°”).
- **Kiedy**: wycinek bez odległości z łańcucha, nie wybór użytkownika, tożsamość rozstrzygnięta (`unresolved` w
  `catalog.json`), typ EN, RN, CN, OC, GC, G lub GG. Bez mgławic ciemnych (skok ekstynkcji ma w regresorze stałe
  ±7 %), planetarnych, pozostałości po supernowych i „innych”. Wartość pokazujemy, gdy jest sensowna: grupa ≥ 5 gwiazd,
  σ ≤ 20 %, z galaktyki z widma SDSS przeliczane tak jak w katalogu (CMB, H₀ = 70, cz_CMB ≥ 3000 km/s).
- **Przepływ**: klient (`useRegressor`) zgłasza wycinki w tle po astrometrii (`POST /api/photo/regressor`, pozycja
  i promień wycinka z WCS) i odpytuje w odstępach z `regressorPollDelay`; serwer (`server/regressor.ts`) wysyła zadania
  po jednym do stałego procesu `pixi run … python scripts/regressor/cut_distance.py --serve` (od 14.11.2026: importy raz,
  1–5 s na wycinek gwiazdowy; limit 90 s, galaktyki 2 min; zabicie drzewa procesów po limicie, awarii i 10 min
  bezczynności). Galaktyki pytają tylko o widma SDSS i Cosmicflows-4 (wcześniej 14 katalogów, 200–400 s). Wyniki „ok” i odmowy
  w `scripts/.cache/regressor/<klucz>.json` (klucz z wersją wrappera); awarie usług (np. 503 Gaia) nie są zapamiętywane.
  Bez pixi lub `astro-regressor-main` usługa jest wyłączona (produkcja). Katalog lub gwiazda oświetlająca zastępują
  wartość regresora przy odświeżeniu.
- **Zmiany w `astro-regressor-main` (katalog poza git; kopie oryginałów w notatkach sesji)**:
  - `catalogs.py`: `EXTENDED_OTYPES` + `RefNeb`, `GalNeb`, `GNe`, `EmissionNeb`.
  - `estimators.py`: galaktyka po jawnej liście typów `GALAXY_OTYPES` (dawny test `"G" in obj_type` łapał GalNeb,
    GlC, GNe i gubił Seyfert2); pusta tabela CF4 z lustra VizieR bez TypeError (konwersja na liczby);
    `use_registry` (wyłącza `CURATED_CLOUDS`, których wartości nie da się odtworzyć z Zucker 2020); `prefer_nearest`
    w `synthesize_region_distance` (lokalne szczyty KDE od najbliższego, pierwszy z grupą spójną kinematycznie;
    pilotaż: IC 1990 dostał tło 1139 pc zamiast Plejad) z progiem dyspersji prędkości poprzecznej grupy
    `MAX_GROUP_VT_KMS = 5` (σv z MAD ruchów własnych × odległość). Kalibracja na grupach pilotażu: gromady i asocjacje
    0,2–1,4 km/s (Plejady, Praesepe, σ Ori, NGC 2024), grupy tła 8,6 km/s (LBN 774) i 12,5 km/s (IC 1990).
- **Wrapper** (`scripts/regressor/cut_distance.py`, w repozytorium): pozycja i promień zamiast nazwy (bez resolvera
  MAST), bez rejestru, `prefer_nearest` dla mgławic, błąd zapytania Gaia/SDSS/CF4 → `error` zamiast odmowy.
- **Przebiegi kontrolne** (wiersz poleceń, 7.11.2026, 2–6 min na obiekt): LBN 950 → 395,7 pc, σv 0,8 km/s (region
  σ Ori 387–407 pc); LBN 770 → 135,5 pc (Plejady); LBN 774 → odmowa (bez filtra σv: tło 1167 pc); IC 1990 → odmowa
  (σv 9,6 km/s; pilotaż: tło 1139 pc); IC 4278 → błąd (SkyServer SDSS nie odpowiadał), do ponowienia.
- **W aplikacji** (serwer + przeglądarka, Playwright, zrzuty `*-regresor-*`):
  - IC 434: 9/10 w 3D. Regresor dodał IC 434 395 pc (57 gwiazd, σv 0,6 km/s), LBN 950 396 pc (44, σv 0,8 km/s)
    i NGC 2024 391 pc (75, σv 1,3 km/s; VLBA 403 ± 5 pc). Sh2-277 bez odległości (tożsamość).
  - M51: 8/10 w 3D (9/10 po decyzji o Wikidata: NGC 5169). IC 4278: z = 0,01672 z widma SDSS → 241 mln lś
    (pilotaż z NED: −1,9 %). IC 4277: odmowa (brak z i CF4).
  - Pasek pokazuje „Regresor: N w toku”, liczba obiektów w 3D rośnie po wyniku; zapis w IndexedDB z `distanceOrigin: 'regressor'`.

## Obszary H II i próg 50 % (14.11.2026)
Projekt: `docs/superpowers/specs/2026-11-14-odleglosci-h-ii-design.md`, plan: `docs/superpowers/plans/2026-11-14-odleglosci-h-ii.md`.
- **Próg:** decyzja użytkownika 14.11.2026. Do 3D trafia odległość z σ ≤ 50 % (`MAX_RELATIVE_UNCERTAINTY = 0.5`,
  wcześniej 20 %), dla wszystkich obiektów i regresora. Pomiar w progu wygrywa z Wikidata. „Wikidata zamiast σ > 50 %”:
  7 obiektów (wcześniej 1048 przy 20 %), np. NGC 5169 ma teraz CF4 z σ 26 %.
- **Krok H II** (`scripts/hiiDistances.ts`, dla EN i CN po Hunt & Reffert). Zwraca pierwszy krok z σ ≤ 50 %, a gdy
  żaden go nie ma, pierwszą wartość z literatury (dalej reguła Wikidata):
  1. paralaksa z katalogu H II WISE (Anderson i in. 2014, J/ApJS/212/1, `Meth` = Parallax): 34 obiekty;
  2. Foster & Brunt 2015 (J/AJ/150/147, widma gwiazd, po nazwie Sh2): 84;
  3. pozostałe odległości WISE (kinematyczne autorów z rozstrzygnięciem bliżej/dalej): 111;
  4. własna odległość kinematyczna (`scripts/kinematicDistance.ts`): 29, tylko z σ ≤ 50 % (mediana σ 36 %).
     Wartości z σ > 50 % odrzucamy, bo w katalogu blokowałyby regresor wycinka. Nie liczymy jej w kierunku centrum
     Galaktyki (|l| < 15°): ruchy niekołowe, a prędkość poza punktem stycznym dawała 8 kpc z σ 2 % (LBN 1, LBN 3).
  - Region WISE dobierany po nazwie Sharplessa, a bez niej, gdy środek obiektu leży w promieniu regionu. Promień
    obiektu się nie liczy: przy nim duże mgławice przejmowały małe regiony w tle (LBN 159 → 12,7 kpc, LBN 249 → 10 kpc).
     - Model: krzywa Reid i in. 2019 (A5), Monte Carlo jak Wenger i in. 2018 (2000 próbek, stałe ziarno,
       korelacja V⊙–V̄s −0,99, σ prędkości 5 km/s); `verified: false`.
     - Prędkości z WISE, Russeil 2003 i Foster & Brunt. Tracery mają pierwszeństwo w kolejności: linie rekombinacyjne,
       molekularne, Hα; HI pomijamy.
     - Przy rozbieżności tracerów > 10 km/s odległości nie liczymy.
     - W wewnętrznej Galaktyce bierzemy rozwiązanie bliższe, chyba że WISE podaje KDA.
  Wyjątek na sztywno dla Sh2-155 zastąpiło ogólne dopasowanie Foster & Brunt (ta sama wartość 0,84 ± 0,04 kpc).
- **Zasięg:**
  - Sh2: z odległością 4 → 163 z 305, w 3D 4 → 162;
  - EN + CN z odległością 59 → 302, w 3D 300;
  - cały katalog w 3D 10 188 → 11 148.
- **Wartości kontrolne:**
  - Sh2-252: 2,1 ± 0,1 kpc, paralaksa WISE (Foster & Brunt: 2,23 kpc);
  - Sh2-180: 5,41 kpc (Foster & Brunt);
  - Sh2-183: 6,6 kpc (WISE);
  - Sh2-187: 1,58 kpc (σ 20,3 %, teraz w 3D);
  - Sh2-181: 2,43 kpc ± 32 %, kinematycznie z CO Russeil 2003 (regresor: 2,2 kpc).
  - NGC 2174 i IC 2159: bez odległości. Środek NGC 2174 leży poza regionami WISE z odległością, a kierunek blisko
    antycentrum daje zbyt niepewną kinematykę. Regresor odmówił.
- **Ograniczenie metody:** ruchy strumieniowe w ramionach spiralnych.
  - W3(OH): model daje 3,1 kpc przy paralaksie 1,95 kpc.
  - W II ćwiartce wartości A5 są o ok. 25–30 % mniejsze niż z płaskiej krzywej Russeil 2003.
  - Dlatego własna kinematyka stoi na końcu kolejności, po pomiarach.
  - Dopasowanie po pozycji może przypisać optycznej mgławicy region WISE leżący za nią. Przykład: LBN 76 → 12,8 kpc,
    środek w obrysie regionu G021.143−00.298.
- **Poza zakresem:** próg CST Hunt & Reffert (NGC 2175: CST 4,35, 1769 pc z Gaia, w katalogu Wikidata 7273 lś).

## Weryfikacja
`npm test`, `npm run typecheck`, `npm run build`; zrzuty Playwright (IC 434, M51) w
`output/odleglosci-wdrozenie-2026-11-06/` po ponownej astrometrii przez `/api/photo/solve` i pobraniu gwiazd.
Ścieżka migracji na zapisanych projektach (`scripts/.cache/observatory-photos/`: IC 434 w wersji 1, M51 w wersji 2,
bez gwiazd; zrzuty `*-zapisany-*`): ten sam wynik (6/10 i 7/10 w 3D), wartości z Wikidata zastąpione katalogiem
(M 51: 24,8 → 27,2 mln lś), gwiazdy pobrane, gwiazdy oświetlające przypisane, w IndexedDB zapis w wersji 3.
