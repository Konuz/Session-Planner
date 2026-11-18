# KONUZASTRO Tracker

**KONUZASTRO Tracker** to webowy planer sesji astrofotograficznych i interaktywne obserwatorium 3D stworzone dla serwisu [konuzastro.pl](https://konuzastro.pl) — zaprojektowane jako szybka, czytelna alternatywa dla narzędzi takich jak Telescopius, SkySafari czy Stellarium.

Aplikacja łączy interaktywną kopułę nieba (WebGL2 + Canvas 2D), bazę ponad **19 000 obiektów głębokiego nieba (DSO)** z wieloźródłowym łańcuchem odległości, symulator kadrowania z przeglądami HiPS (DSS2, PanSTARRS, NSNS), prognozę warunków obserwacyjnych i seeingu, planer nocy z eksportem do N.I.N.A. oraz **Obserwatorium 3D** z lokalnym solverem astrometrii (Skyshot) i rzutowaniem gwiazd Gaia DR3 w przestrzeni trójwymiarowej.

---

## Spis treści

1. [Główne funkcje](#główne-funkcje)
2. [Stos technologiczny](#stos-technologiczny)
3. [Szybki start (środowisko deweloperskie)](#szybki-start-środowisko-deweloperskie)
4. [Wdrożenie i uruchomienie produkcyjne](#wdrożenie-i-uruchomienie-produkcyjne)
5. [Skrypty i przebudowa danych](#skrypty-i-przebudowa-danych)
6. [Struktura projektu](#struktura-projektu)
7. [Źródła danych zewnętrznych i licencje](#źródła-danych-zewnętrznych-i-licencje)
   - [Katalog obiektów głębokiego nieba (DSO)](#1-katalog-obiektów-głębokiego-nieba-dso)
   - [Łańcuch odległości obiektów](#2-łańcuch-odległości-obiektów)
   - [Gwiazdy, gwiazdozbiory, ilustracje i Droga Mleczna](#3-gwiazdy-gwiazdozbiory-ilustracje-i-droga-mleczna)
   - [Kontury mgławic jasnych i ciemnych](#4-kontury-mgławic-jasnych-i-ciemnych)
   - [Przeglądy fotograficzne nieba (HiPS)](#5-przeglądy-fotograficzne-nieba-hips)
   - [Astrometria, gwiazdy pola i katalogi głębokie (Obserwatorium 3D)](#6-astrometria-gwiazdy-pola-i-katalogi-głębokie-obserwatorium-3d)
   - [Usługi pogodowe, geokodowanie, opisy i zdjęcia](#7-usługi-pogodowe-geokodowanie-opisy-i-zdjęcia)
   - [Tekstury i grafiki ciał niebieskich](#8-tekstury-i-grafiki-ciał-niebieskich)

---

## Główne funkcje

* **Kopuła nieba (`Niebo`)** — rzut stereograficzny (N u góry, E po lewej), gwiazdy i własne rozwiązane zdjęcia renderowane w WebGL2, tło przeglądów wąskopasmowych NSNS (DR0.1 true-color i DR0.2 bez Hα), pas Drogi Mlecznej, linie i półprzezroczyste ilustracje gwiazdozbiorów po najechaniu kursorem, wielopoziomowe kontury mgławic jasnych i ciemnych, tor ruchu wybranego obiektu, położenie Słońca i Księżyca oraz własny profil horyzontu.
* **Katalog obiektów (`Katalog`)** — błyskawiczne filtrowanie i wyszukiwanie (wirtualizowana lista) według katalogów (`M`, `NGC`, `IC`, `Sh2`, `LBN`, `LDN`, `B`, `vdB`, `SNR` oraz grupy `Inne`: gromady klasyczne i odkrycia amatorów, `Ced`, `RCW`, `Gum`, `Arp`, `HCG`, `WR`), typów obiektów, gwiazdozbioru, jasności, rozmiaru kątowego oraz widoczności w wybraną noc. Kolorowe miniatury z przeglądów HiPS (DSS2, NSNS) oraz integracja z galerią AstroBin i opisami z Wikipedii.
* **Kadrowanie i sprzęt (`Sprzęt`)** — konfiguracja teleskopów, kamer, reduktorów/korektorów, obrót i przesuwanie prostokąta matrycy na tle mozaiki HiPS składanej w Web Workerze (rzut styczny TAN), a także możliwość przypisania i wklejenia własnego rozwiązanego zdjęcia obiektu na kopułę i do panelu kadrowania.
* **Wykres wysokości, fazy nocy i pogoda** — krzywa wysokości obiektu i odległości kątowej od Księżyca, automatyczne wyznaczanie najciemniejszego okna nocy (do białych nocy i dni/nocy polarnych włącznie), przejście przez południk (górowanie) oraz wielomodelowa prognoza pogody (Open-Meteo: Auto, ECMWF IFS, DWD ICON, NOAA GFS, UK Met Office, CMC GEM oraz MET Norway) z wyliczeniem seeingu z pionowego profilu atmosfery ($C_n^2$: warstwa graniczna + swobodna atmosfera) lub prądu strumieniowego.
* **Planer sesji (`Planer`)** — układanie harmonogramu wielu celów na noc, automatyczny podział okna obserwacyjnego (`autoSchedule`), podsumowanie warunków na 7 kolejnych nocy i eksport planu do formatu CSV zgodnego z **N.I.N.A.** (format Telescopius).
* **Własny horyzont (`Horyzont`)** — interaktywny edytor profilu przeszkód terenowych (360°) z obsługą importu i eksportu plików horyzontu.
* **Pozycja 3D i Obserwatorium 3D zdjęcia** — trójwymiarowa wizualizacja położenia obiektu w skali **Drogi Mlecznej** (liniowo do 150 tys. lś) oraz **Wszechświata lokalnego** (skala logarytmiczna z modelami morfologicznymi galaktyk Grupy Lokalnej). Po wgraniu zdjęcia (JPEG, PNG, WebP, TIFF, FITS) lokalny solver astrometrii wyznacza WCS, pobiera do 1000 najjaśniejszych gwiazd pola z **Gaia DR3** (z odległościami Bailer-Jones) oraz dodatkowe katalogi głębokie (`PGC`, kwazary `SDSS DR16Q`, gromady `Abell/ACO`) i pozwala płynnie „zanurkować” kamerą od modelu Galaktyki wprost do rozłożonego w 3D zdjęcia z histogramem odległości i inspektorem źródeł (SIMBAD, NED, katalog, regresor ML).

---

## Stos technologiczny

* **Frontend:** React 19, TypeScript 6 (`strict`), Vite 8, Zustand (stan + `localStorage`), `astronomy-engine` (efemerydy), `three.js` (sceny 3D ładowane leniwie), `@tanstack/react-virtual`, WebGL2, Web Workers (`visibility.worker.ts`, `hips.worker.ts`), PWA (`vite-plugin-pwa` + Cache Storage + IndexedDB).
* **Style:** czysty CSS w `src/styles/app.css` oparty na tokenach kolorystycznych spójnych z [konuzastro.pl](https://konuzastro.pl) (bez Tailwinda i bez zewnętrznych fontów sieciowych).
* **Backend (`server/`):** natywny serwer HTTP w Node.js 24 (`node:http`, uruchamiający pliki `.ts` bez bundlera), `sharp` (przetwarzanie obrazów i konwersja kafelków HiPS), `fast-xml-parser` (odpowiedzi VOTable z NED), `worker_threads` (wyznaczanie maski czarnych brzegów zdjęcia poza pętlą zdarzeń).
* **Narzędzia lokalne (opcjonalne na serwerze):**
  * **Skyshot (`scripts/skyshot-bridge`)** — most w języku Rust do lokalnego solvera astrometrii `skyshot-solver`.
  * **Astro-Regressor (`astro-regressor-main`, `scripts/regressor/cut_distance.py`)** — proces roboczy w Pythonie (zarządzany przez `pixi`) szacujący w tle niezweryfikowane odległości obiektów bez pomiaru katalogowego.

---

## Szybki start (środowisko deweloperskie)

### Wymagania
* **Node.js 24** (natywna obsługa plików TypeScript oraz flagi `--env-file-if-exists`)
* Opcjonalnie dla lokalnej astrometrii zdjęć (`/api/photo/solve`, `/api/photo/stars`): **Git**, **Rust (`cargo`)** oraz **Python 3**
* Opcjonalnie dla regresora odległości ML (`/api/photo/regressor`): **Pixi** oraz katalog `astro-regressor-main`

### Instalacja i uruchomienie

1. Zainstaluj zależności:
   ```powershell
   npm install
   ```
2. *(Opcjonalnie)* Skopiuj plik `.env.example` do `.env.local` i uzupełnij klucze API AstroBin (używane wyłącznie po stronie serwera do pobierania zdjęć autora):
   ```powershell
   Copy-Item .env.example .env.local
   ```
3. *(Opcjonalnie)* Zainstaluj i skompiluj lokalny solver astrometrii Skyshot wraz z indeksami gwiazd (pobierane do `scripts/.cache/`):
   ```powershell
   npm run setup:skyshot
   ```
4. Uruchom serwer deweloperski Vite (domyślnie `http://localhost:5173`, zawiera również trasy `/api/*`):
   ```powershell
   npm run dev
   ```

---

## Wdrożenie i uruchomienie produkcyjne

Sam statyczny hosting ani `npm run preview` nie obsługują tras serwerowych (`/api/photo/*`, `/api/astrobin-photo`, `/api/hips/*`). W środowisku produkcyjnym aplikację uruchamia dedykowany serwer Node.js (`server/index.ts`).

```powershell
npm ci
npm run build
npm start
```

### Najważniejsze zmienne środowiskowe (`server/index.ts`)
* `HOST` — adres nasłuchu (domyślnie `127.0.0.1`).
* `PORT` — port serwera (domyślnie `4173`).
* `ALLOWED_HOSTS` — **wymagane przy publikacji pod domeną** (lista nazw hostów oddzielonych przecinkami, np. `ALLOWED_HOSTS=tracker.konuzastro.pl`). Serwer odrzuca kodem `403` żądania z nagłówkiem `Host` innym niż IP, `localhost` lub nazwa z `ALLOWED_HOSTS` (ochrona przed DNS rebinding).
* `ASTROBIN_API_KEY`, `ASTROBIN_API_SECRET` — klucze API AstroBin (bez prefiksu `VITE_`). W razie ich braku endpoint zwraca `503`, a interfejs automatycznie korzysta z przeglądów DSS2.
* `HIPS_CACHE_DIR` — katalog bufora kafelków NSNS na dysku (domyślnie `scripts/.cache/hips-proxy`).
* `SKYSHOT_BRIDGE`, `SKYSHOT_INDEX` — ścieżki do binarki `tracker-skyshot` i indeksów astrometrycznych (domyślnie w `scripts/.cache/`).
* `REGRESSOR_DIR`, `PIXI` — ścieżka do katalogu `astro-regressor-main` i pliku wykonywalnego `pixi` (jeśli brak, regresor jest bezpiecznie wyłączony).

### Jakie pliki są potrzebne na serwerze produkcyjnym?
Serwer udostępnia na zewnątrz wyłącznie zawartość katalogu `dist/`, ale w czasie działania proces Node.js potrzebuje obok `dist/`:
1. **`dist/`** — zbudowany frontend wraz z wygenerowanymi przy buildzie wariantami `.br` i `.gz`,
2. **`server/`** — kod serwera HTTP i endpointów API,
3. **`src/lib/`** — moduły logiki współdzielone z serwerem (`catalog.ts`, `blackBorderMask.ts`, `distance.ts`, `ownPhoto.ts`, `photo.ts`, `perf.ts`),
4. **`public/data/catalog.json`** — odczytywany bezpośrednio przez `server/photo.ts`,
5. **`package.json`**, **`package-lock.json`** i **`node_modules/`** (zależności wykonawcze, m.in. `sharp`, `fast-xml-parser`),
6. **Binarka Skyshota oraz bufor regresora** (`scripts/.cache/skyshot-build/release/tracker-skyshot.exe` wraz z bibliotekami `.dll` oraz `scripts/.cache/regressor/*.json`) — dołączone bezpośrednio do repozytorium Git.
7. **Duże paczki danych z GitHub Releases (`v0.1.0`)** — ze względu na limity rozmiaru plików w Git indeksy astrometryczne Skyshota (`skyshot-data.tar`, ~842 MB) oraz pełne kopie przeglądów HiPS NSNS (`hips-proxy-nsns-tc8.tar`, ~874 MB i `hips-proxy-nsns-rgb8.tar`, ~596 MB) są opublikowane w sekcji **Releases** repozytorium. Po pobraniu rozpakuj je w katalogu głównym projektu:
   ```powershell
   tar -xf skyshot-data.tar -C scripts/.cache
   mkdir -Force scripts/.cache/hips-proxy
   tar -xf hips-proxy-nsns-tc8.tar -C scripts/.cache/hips-proxy
   tar -xf hips-proxy-nsns-rgb8.tar -C scripts/.cache/hips-proxy
   ```

Szczegółowy opis konfiguracji produkcyjnej znajduje się w pliku [`docs/uruchomienie.md`](docs/uruchomienie.md).

---

## Skrypty i przebudowa danych

| Polecenie | Opis |
| :--- | :--- |
| `npm run dev` | Uruchamia serwer deweloperski Vite z middleware `/api/*`. |
| `npm run build` | Wykonuje `tsc --noEmit`, buduje aplikację i Service Workera (`vite build`), a następnie tworzy warianty `.br` i `.gz` (`scripts/compress-dist.ts`). |
| `npm start` | Uruchamia serwer produkcyjny (`server/index.ts`) z obsługą `.env.local`. |
| `npm test` | Uruchamia testy jednostkowe i integracyjne Vitest (`src/**/*.test.ts`). |
| `npm run typecheck` | Sprawdza typy TypeScript (`tsc --noEmit`) w `src`, `server` i `scripts`. |
| `npm run build:data` | Przebudowuje pliki w `public/data/` oraz `src/lib/constellations.ts` ze źródeł zewnętrznych (buforowanych w `scripts/.cache/`). Możliwe uruchomienie pojedynczego etapu: `node scripts/build-data.ts catalog\|sky\|outlines\|milkyway\|hips`. |
| `npm run setup:skyshot` | Klonuje i buduje w Rust most `tracker-skyshot` oraz pobiera indeksy astrometryczne do `scripts/.cache/`. |
| `node scripts/hips-mirror.ts` | Pobiera z góry pełną lokalną kopię zestawów kafelków NSNS (`nsns-tc8`, `nsns-rgb8`) do `HIPS_CACHE_DIR` (~0,9 GB JPEG na zestaw) i zapisuje znacznik `mirror-complete.json`. |

---

## Struktura projektu

* `src/` — kod źródłowy aplikacji klienckiej:
  * `src/components/` — komponenty UI, kopuła nieba (`SkyDome`), wykres wysokości (`AltitudeChart`), kadrowanie (`FramingPanel`), scena 3D (`space3d/`) oraz Obserwatorium 3D (`observatory/`),
  * `src/views/` — główne zakładki aplikacji (`SkyView`, `CatalogView`, `PlannerView`, `EquipmentView`, `HorizonView`),
  * `src/lib/` — czysta logika obliczeniowa (mechanika nieba, fazy nocy, rzutowanie, HEALPix/HiPS, seeing, parser katalogu, eksport N.I.N.A.) wraz z testami `*.test.ts`,
  * `src/workers/` — Web Workery (`visibility.worker.ts`, `hips.worker.ts`),
  * `src/state/` — magazyn stanu Zustand (`store.ts`) i hooki danych (`data.ts`).
* `server/` — serwer produkcyjny Node.js, pośrednik kafelków HiPS NSNS, obsługa AstroBin API, astrometrii Skyshot, zapytań SIMBAD/NED/Gaia oraz kolejka regresora.
* `public/` — zasoby statyczne kopiowane do `dist/` (`public/data/` z katalogiem, gwiazdami, obrysami i ilustracjami gwiazdozbiorów, `public/icons/`, `public/textures/`).
* `scripts/` — generator danych katalogowych (`build-data.ts` i moduły pomocnicze), kompresja `dist/`, most Rust `skyshot-bridge/`, wrapper `regressor/` oraz bufor `scripts/.cache/` (ignorowany przez Git).
* `docs/` — dokumentacja uruchomieniowa, lista wymagań, raporty z audytów i dokumentacja weryfikacji odległości.

---

## Źródła danych zewnętrznych i licencje

Aplikacja **KONUZASTRO Tracker** korzysta z otwartych katalogów astronomicznych, przeglądów nieba, baz naukowych oraz usług pogodowych i encyklopedycznych. Poniżej znajduje się pełne zestawienie źródeł danych wraz z warunkami licencyjnymi i wymaganymi atrybucjami.

### 1. Katalog obiektów głębokiego nieba (DSO)

Plik `public/data/catalog.json` powstaje w procesie `npm run build:data` z połączenia poniższych katalogów:

| Zbiór danych / Katalog | Autorzy / Źródło | Licencja / Warunki wykorzystania |
| :--- | :--- | :--- |
| **OpenNGC** (`NGC.csv`, `addendum.csv`) | Mattia Verga ([github.com/mattiaverga/OpenNGC](https://github.com/mattiaverga/OpenNGC)) | **CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike 4.0 International) |
| **Katalog obszarów H II Sharplessa (Sh2)** (`VII/20`) | S. Sharpless (1959), *ApJS* 4, 257 · CDS VizieR | Dane naukowe z serwisu **VizieR (CDS, Strasbourg)** — otwarty dostęp akademicki za podaniem źródła i cytowaniem autorów publikacji |
| **Katalog Ciemnych Mgławic Lyndsa (LDN)** (`VII/7A`) | B. T. Lynds (1962), *ApJS* 7, 1 · CDS VizieR | Dane z serwisu **VizieR (CDS)** — cytowanie autorki katalogu |
| **Katalog Jasnych Mgławic Lyndsa (LBN)** (`VII/9`) | B. T. Lynds (1965), *ApJS* 12, 163 · CDS VizieR | Dane z serwisu **VizieR (CDS)** — cytowanie autorki katalogu |
| **Katalog Mgławic Refleksyjnych van den Bergha (vdB)** (`VII/21`) | S. van den Bergh (1966), *AJ* 71, 990 · CDS VizieR | Dane z serwisu **VizieR (CDS)** — cytowanie autora katalogu |
| **Katalog Ciemnych Obiektów Barnarda (B)** (`VII/220A`) | E. E. Barnard (1927), *Carnegie Inst. Washington Publ.* 247 · CDS VizieR | Domena publiczna / Dane z serwisu **VizieR (CDS)** |
| **Katalog Galaktycznych Pozostałości po Supernowych (SNR)** (`VII/297`) | D. A. Green (2025), *J. Astrophys. Astron.* / Cavendish Laboratory · CDS VizieR | Dane z serwisu **VizieR (CDS)** — cytowanie D. A. Greena |
| **Strasbourg-ESO Catalogue of Galactic Planetary Nebulae** (`V/84`) | A. Acker i in. (1992), ESO · CDS VizieR | Dane z serwisu **VizieR (CDS)** — cytowanie autorów katalogu |
| **Gromady otwarte i kuliste w Gaia DR3** (`J/A+A/673/A114`) | E. L. Hunt, S. Reffert (2023), *A&A* 673, A114 · CDS VizieR | Dane z serwisu **VizieR (CDS)** / **CC BY 4.0** (publikacja A&A) |
| **Mgławice planetarne odkryte przez amatorów** (`J/A+A/666/A152`) | P. Le Dû i in. (2022), *A&A* 666, A152 · CDS VizieR | Dane z serwisu **VizieR (CDS)** / **CC BY 4.0** (publikacja A&A) |
| **Katalog jasnych mgławic dyfuzyjnych Cederblada (Ced)** (`VII/231`) | S. Cederblad (1946), *Lund Medd. Astron. Obs.* Ser. II, 119 · CDS VizieR | Dane z serwisu **VizieR (CDS)** — cytowanie autora katalogu |
| **Katalog obszarów emisji Hα południowej Drogi Mlecznej (RCW / Gum)** (`VII/216`) | A. W. Rodgers, C. T. Campbell, J. B. Whiteoak (1960), *MNRAS* 121, 103 · CDS VizieR | Dane z serwisu **VizieR (CDS)** — cytowanie autorów katalogu |
| **Atlas Galaktyk Osobliwych Arpa (Arp)** (`VII/192`) | H. Arp (1966), *ApJS* 14, 1 · CDS VizieR | Dane z serwisu **VizieR (CDS)** — cytowanie autora katalogu |
| **Zwarte Grupy Galaktyk Hicksona (HCG)** (`VII/213`) | P. Hickson (1982), *ApJ* 255, 382 · CDS VizieR | Dane z serwisu **VizieR (CDS)** — cytowanie autora katalogu |
| **Mgławice wokół gwiazd Wolfa-Rayeta (WR)** | J. A. Toalá i in. (2015), *A&A* 578, A66, Tabela 1 | Dane z publikacji naukowej — cytowanie autorów |
| **Ujednolicenie identyfikatorów ciemnych obłoków** (`J/A+A/383/631`) | C. M. Dutra, E. Bica (2002), *A&A* 383, 631 · CDS VizieR | Dane z serwisu **VizieR (CDS)** — cytowanie autorów |
| **Lista ręczna odkryć amatorskich** (`Zie 1`, `StDr 56`, `Ou 4`, `HFG 2`, `Simeis 57`, `SDSO 1`) | SIMBAD, [planetarynebulae.net](https://www.planetarynebulae.net), P. Ogle i in. (2025, arXiv:2507.15834), M. Drechsler i in. (2023, *RNAAS* 7, 1) | Dane faktograficzne z literatury naukowej i katalogu kandydatów PN (za podaniem źródła) |
| **Polskie i angielskie tytuły artykułów Wikipedii** | **Wikidata** Query Service (`schema:about`, właściwości katalogowe `P528`/`P972`) | **CC0 1.0 Universal** (Domena publiczna Wikidata) |

### 2. Łańcuch odległości obiektów

Odległości w katalogu i w inspektorze Obserwatorium 3D pochodzą z weryfikowanego względem **SIMBAD** łańcucha publikacji naukowych (pobieranych przez **VizieR**, **SIMBAD TAP** oraz **NED**):

* **Gromady gwiazd:** E. L. Hunt, S. Reffert (2023), *A&A* 673, A114 (`J/A+A/673/A114`, paralaksy Gaia DR3 członków gromad) — **CC BY 4.0** / CDS VizieR.
* **Obszary H II i mgławice emisyjne:**
  * L. D. Anderson i in. (2014), *ApJS* 212, 1 (`J/ApJS/212/1`, katalog H II WISE — paralaksy i odległości kinematyczne) — **CC BY 3.0 / 4.0** (AAS) / CDS VizieR.
  * T. Foster, C. M. Brunt (2015), *AJ* 150, 147 (`J/AJ/150/147`, odległości spektrofotometryczne i prędkości CO) — CDS VizieR.
  * D. Russeil (2003), *A&A* 397, 133 (`J/A+A/397/133`, prędkości radialne obszarów gwiazdotwórczych) — CDS VizieR.
  * M. J. Reid i in. (2019), *ApJ* 885, 131 (model krzywej rotacji Galaktyki A5 używany do wyliczania odległości kinematycznych Monte Carlo).
  * C. A. L. Bailer-Jones i in. (2021), *AJ* 161, 147 (odległość geometryczna gwiazdy jonizującej HD 227018 dla Sh2-101 z Gaia EDR3).
* **Galaktyki i grupy galaktyk:**
  * R. B. Tully i in. (2023), *ApJ* 944, 94 (`J/ApJ/944/94`, **Cosmicflows-4**) — **CC BY 4.0** (AAS) / CDS VizieR.
  * **SIMBAD Astronomical Database** (CDS, Strasbourg / lustro IDIA) — przesunięcia ku czerwieni ($z$) oraz bezpośrednie pomiary z tabeli `mesDistance` (otwarty dostęp badawczy CDS, wymaga cytowania Wexler i in. 2000, *A&AS* 143, 9).
  * **NASA/IPAC Extragalactic Database (NED)** (Jet Propulsion Laboratory, Caltech / NASA) — pomiary odległości (`DistancesOfObject`) i przesunięcia ku czerwieni (`ObjectLookup`); dane publiczne NASA/IPAC za podaniem atrybucji NED.
* **Mgławice planetarne:** N. Chornay, N. A. Walton (2021), *A&A* 656, A110 (`J/A+A/656/A110`, paralaksy gwiazd centralnych w Gaia EDR3) — **CC BY 4.0** / CDS VizieR.
* **Pozostałości po supernowych i ich składowe optyczne:**
  * S. Ranasinghe, D. Leahy (2022), *ApJ* 940, 63 (`J/ApJ/940/63`) — **CC BY 4.0** / CDS VizieR.
  * H. Zhao i in. (2020), *ApJ* 891, 137 (HB 9 / `SNR G160.9+02.6`) oraz E. M. Reynoso i in. (2017), *MNRAS* 464, 3029 (Puppis A / `SNR G260.4-03.4`).
* **Mgławice ciemne:** C. Zucker i in. (2020), *A&A* 633, A51 (`J/A+A/633/A51`, trójwymiarowe mapowanie skoku ekstynkcji pyłu z Gaia DR2) — **CC BY 4.0** / CDS VizieR.
* **Pojedyncze publikacje dla obiektów listy ręcznej:** P. Ogle i in. (2025, `arXiv:2507.15834` dla `Zie 1`), E. R. Oudshoorn i in. (2021, *A&A* 650, A171 dla `Simeis 57`).
* **Źródło zapasowe (oznaczane w interfejsie jako „niezweryfikowane”):** **Wikidata** (właściwość `P2583` — odległość od Ziemi) — **CC0 1.0 Universal**.

### 3. Gwiazdy, gwiazdozbiory, ilustracje i Droga Mleczna

Pliki `public/data/sky.json`, `public/data/constellations3d.json`, `public/data/milkyway.png`, `public/data/art/*.webp` oraz `src/lib/constellations.ts` korzystają z:

| Zasób | Źródło / Autorzy | Licencja |
| :--- | :--- | :--- |
| **Katalog gwiazd tła do 6,5 mag, nazwy gwiazd, środki etykiet gwiazdozbiorów oraz izofoty Drogi Mlecznej** (`stars.6.json`, `starnames.json`, `constellations.json`, `mw.json`) | **d3-celestial** — Olaf Frohn ([github.com/ofrohn/d3-celestial](https://github.com/ofrohn/d3-celestial)) | **Licencja BSD 3-klauzulowa** (`BSD-3-Clause`) |
| **Linie i definicje współczesnych gwiazdozbiorów** (`skycultures/modern/index.json`) | **Stellarium** (`modern` skyculture) ([github.com/Stellarium/stellarium](https://github.com/Stellarium/stellarium)) | **CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike 4.0) |
| **Ilustracje postaci gwiazdozbiorów** (`public/data/art/<IAU>.webp`, przetworzone do monochromatycznego obrysu z kanałem alfa) | **Stellarium** (`skycultures/modern/*.png`, Johan Meuris) | **Free Art License (FAL 1.3)** / Licencja Sztuki Wolnej |
| **Polskie nazwy gwiazdozbiorów IAU** (`po/stellarium-skycultures/pl.po`) | Zespół tłumaczy **Stellarium** | **GNU GPL v2+** / **CC BY-SA 4.0** (zgodnie z repozytorium Stellarium) |
| **Uzupełniające pozycje i paralaksy gwiazd linii gwiazdozbiorów (3D)** (`I/239/hip_main`) | **Katalog Hipparcos** (ESA, 1997) pobierany przez **CDS VizieR** | Dane publiczne **ESA / CDS VizieR** |

### 4. Kontury mgławic jasnych i ciemnych

Plik `public/data/outlines.json` zawiera wielopoziomowe obrysy mgławic:

* **Obrysy mgławic jasnych i dużych regionów emisyjnych:** **OpenNGC outlines** — Mattia Verga ([github.com/mattiaverga/OpenNGC/tree/v20260501/outlines](https://github.com/mattiaverga/OpenNGC/tree/v20260501/outlines)), wyrysowane na przeglądzie DSS2 w programie Aladin (CDS, Strasbourg). Licencja: **CC BY-SA 4.0** *(modyfikacje w aplikacji: wybrano poziomy 2 i 3 oraz poziom 1 dla obrysów o promieniu $\ge 2^\circ$, przypisano pierścienie regionów do obiektów katalogu i uproszczono polilinie algorytmem Douglasa-Peuckera do $0{,}005^\circ$)*.
* **Obrysy mgławic ciemnych (`LDN`, `B`) oraz wybrane kompleksy pyłowe (`scripts/data/dark-outlines.json`):** współrzędne konturów wyznaczone w ramach projektu metodami segmentacji hybrydowej i progowania ekstynkcji/emisji pyłu na podstawie publicznych przeglądów naukowych:
  * **Planck** (353 GHz / 857 GHz, ESA / Planck Collaboration, przez NASA SkyView) — dane publiczne ESA/NASA,
  * **IRIS** (100 µm, Miville-Deschênes & Lagache 2005, poprawione mapy IRAS) — otwarte dane naukowe,
  * **Atlas ciemnych obłoków Dobashiego** (K. Dobashi i in. 2005, *PASJ* 57, S1; K. Dobashi 2011, *PASJ* 63, S1 — mapy ekstynkcji DSS i 2MASS) — otwarte dane naukowe,
  * **DSS2** (Digitized Sky Survey 2).
  *(Zdjęcia referencyjne wykorzystane wyłącznie pomocniczo podczas lokalnej analizy nie są publikowane ani dołączane do repozytorium).*

### 5. Przeglądy fotograficzne nieba (HiPS)

Miniatury obiektów, tło panelu kadrowania oraz fotorealistyczne warstwy kopuły korzystają ze standardu **HiPS (Hierarchical Progressive Surveys, IVOA)**:

| Przegląd | Dostawca / Autorzy | Licencja i warunki wykorzystania |
| :--- | :--- | :--- |
| **DSS2 Color** (Digitized Sky Survey 2, lustra: ESA ESASky, STScI/MAST, CSIRO CASDA, CDS Alasky) | **STScI / NASA / ESA / POSS-II / UKSTU / AAO / Caltech / Royal Observatory Edinburgh** | Otwarty dostęp do zastosowań edukacyjnych, badawczych i niekomercyjnych za podaniem atrybucji **ESA/MAST/STScI** ([zasady copyright DSS STScI](https://archive.stsci.edu/dss/copyright.html)) |
| **Pan-STARRS DR1 Color (i-r-g)** (lustra: STScI/MAST, CDS Alasky) | **Pan-STARRS1 Science Consortium / IfA University of Hawaii / STScI MAST** | **CC BY 4.0** / otwarty dostęp naukowy MAST za podaniem atrybucji **Pan-STARRS1 / MAST** |
| **Northern Sky Narrowband Survey (NSNS)** — `DR0.1 true-color` (`tc8`) oraz `DR0.2 bez Hα` (`rgb8`) | **Stefan Ziegenbalg** ([www.simg.de](https://www.simg.de/nebulae3/)) | **CC BY-NC-SA 4.0** (Creative Commons Uznanie autorstwa – Użycie niekomercyjne – Na tych samych warunkach 4.0). Aplikacja pobiera kafelki o statusie `clonable` przez pośrednika `server/hipsProxy.ts`, przekodowuje je do JPEG z zachowaniem tej samej licencji **CC BY-NC-SA 4.0** i wyświetla podpis autora oraz licencji przy każdym obrazie. |

### 6. Astrometria, gwiazdy pola i katalogi głębokie (Obserwatorium 3D)

Podczas rozwiązywania zdjęć użytkownika i budowy sceny Obserwatorium 3D serwer oraz narzędzia pomocnicze korzystają z:

* **Lokalny solver astrometrii:** [**skyshot-solver**](https://github.com/ashtree74/skyshot-solver) (repozytorium `ashtree74/skyshot-solver`, wywoływane przez most `scripts/skyshot-bridge`) oraz jego indeksy gwiazdowe oparte na katalogu **Gaia DR3**.
* **Gwiazdy pola i odległości fotogeometryczne/geometryczne:**
  * **ESA Gaia DR3** (`gaia.dr3lite` / `gaiadr3.gaia_source`) — dane publiczne **Europejskiej Agencji Kosmicznej (ESA)** oraz **Gaia Data Processing and Analysis Consortium (DPAC)**, udostępniane na licencji **CC BY 4.0**.
  * **Odległości gwiazd Gaia EDR3:** C. A. L. Bailer-Jones i in. (2021), *AJ* 161, 147 (`gedr3dist.main` / `gedr3dist.litewithdist`), pobierane przez usługę TAP **GAVO Data Center** (ZAH, Uniwersytet w Heidelbergu) z lustrem zapasowym **XAO Data Center** (Xinjiang Astronomical Observatory) oraz archiwami **ARI Heidelberg** i **ESA Gaia Archive**.
* **Dodatkowe katalogi głębokie rzutowane na zdjęcie (`server/photoCatalogObjects.ts` przez CDS VizieR):**
  * **HYPERLEDA I. Catalog of galaxies (`PGC`)** (`VII/237/pgc`) — G. Paturel i in. (2003), *A&A* 412, 45.
  * **SDSS Quasar Catalog DR16Q (`QSO`)** (`VII/289/dr16q`) — B. W. Lyke i in. (2020), *ApJS* 250, 8 — dane **Sloan Digital Sky Survey IV** (**CC BY 4.0**).
  * **Gromady galaktyk Abella (`ACO` / `ACOS`)** (`VII/110A`) — G. O. Abell, H. G. Corwin Jr., R. P. Olowin (1989), *ApJS* 70, 1.
* **Widma przesunięć ku czerwieni w regresorze (`scripts/regressor/cut_distance.py`):**
  * **Sloan Digital Sky Survey (SDSS SkyServer)** przez `astroquery.sdss` — publiczne dane naukowe **SDSS** (**CC BY 4.0**).

### 7. Usługi pogodowe, geokodowanie, opisy i zdjęcia

Usługi odpytywane w czasie rzeczywistym bezpośrednio przez przeglądarkę (`src/lib/services.ts`) lub przez serwer (`server/astrobin.ts`):

| Usługa | Dostawca i modele źródłowe | Licencja / Warunki korzystania |
| :--- | :--- | :--- |
| **Prognoza pogody i profil pionowy atmosfery** (`api.open-meteo.com`) | **Open-Meteo** (dane modeli: **ECMWF IFS**, **DWD ICON**, **NOAA GFS**, **UK Met Office**, **CMC GEM**) | **CC BY 4.0** (Open-Meteo API do użytku niekomercyjnego; zawiera zmodyfikowane dane Copernicus/ECMWF, DWD, NOAA, UK Met Office i Environment Canada) |
| **Alternatywna prognoza pogody** (`api.met.no`) | **MET Norway** (Norwegian Meteorological Institute, Locationforecast 2.0) | **CC BY 4.0** / **NLOD 2.0** (Norwegian Licence for Open Government Data) |
| **Wyszukiwarka miejscowości (geokodowanie)** (`geocoding-api.open-meteo.com`) | **Open-Meteo Geocoding API** (na bazie danych **GeoNames.org**) | **CC BY 4.0** (Open-Meteo / GeoNames) |
| **Opisy obiektów astronomicznych** (`pl.wikipedia.org`, `en.wikipedia.org`) | **Wikipedia REST API** (Wikimedia Foundation i autorzy artykułów Wikipedii) | **CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike 4.0 International) |
| **Zdjęcia obiektów z galerii autora** (`www.astrobin.com/api/v1/image/`) | **AstroBin API** (wyszukiwanie zdjęć użytkownika `Konuz`) | Korzystanie przez oficjalne API AstroBin z kluczem autora; prawa autorskie do zdjęć należą do autora (**Michał Kania / KONUZASTRO**) |

### 8. Tekstury i grafiki ciał niebieskich

* **Fotografia tarczy Księżyca** (`public/icons/moon-phases/moon-full.webp`, `scripts/moon-full-reference.webp`): fotografia z sondy **Galileo** (**PIA00405**, *NASA / JPL / USGS*) — **Domena publiczna** (*NASA/JPL-Caltech/USGS public domain*).
* **Tekstura powierzchni Ziemi w widoku 3D** (`public/textures/earth.webp`): mapa Ziemi na bazie obrazowania **NASA Blue Marble / Earth Observatory** — **Domena publiczna** (*NASA public domain*; mapy reliefu, odbić oceanicznych oraz warstwa chmur fBm są wyliczane proceduralnie w przeglądarce przez `src/components/space3d/earthModel.ts`).
* **Grafiki interfejsu i logo** (`public/michal-kania-logo.jpg`, `public/icons/`): materiały własne **Michał Kania / KONUZASTRO**.
