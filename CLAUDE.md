# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

PWA do planowania sesji astrofotograficznych: React 19 + Vite + TypeScript 6 (strict), Tailwind 4, Zustand, Dexie (IndexedDB), astronomy-engine. Interfejs, specyfikacja i dokumentacja są po polsku.

Źródła prawdy (przeczytaj przed zmianami):
- `prompt-astro-planner.md` — specyfikacja:
  - założenia `[Z…]` (sekcja 0), konwencje (4), model danych (5), moduły 7A–7F, etapy budowy (12);
  - wektory testowe `[T…]` (załącznik A), katalog sprzętu (załącznik B);
  - etapy 1–7 i przebudowa wyglądu są na `main` (etapy 6 i 7 zrobione bez pętli: widok sfery 7D; projekty, eksport do N.I.N.A., PWA i Red Mode); został etap 8 (zarysy uzupełniające ze zdjęć).
- `.autoloop/ARCHITECTURE.md` — aktualna mapa modułów, publicznych funkcji, formatów danych i decyzji projektowych. Uzupełniaj ją, gdy zmieniasz architekturę.
- `.autoloop/LESSONS.md` — reguły wyciągnięte z wcześniejszych przebiegów pętli, m.in. pułapki powłoki i testów.

## Polecenia

- `npm run dev` — serwer deweloperski (port 5173; konfiguracje podglądu w `.claude/launch.json`).
- `npm test` — wszystkie testy (Vitest).
- `npx vitest run <ścieżka>` albo `npx vitest run -t "<nazwa testu>"` — pojedynczy plik lub test.
- `npm run typecheck` — `tsc --noEmit`. Nie używaj `tsc -b`: przepisuje śledzony plik `tsconfig.tsbuildinfo`.
- `npm run lint` — ESLint z `--max-warnings 0`.
- `npm run build` — typecheck i build Vite z service workerem (`vite-plugin-pwa`, opcje w `src/pwaOptions.ts`). Serwer dev działa bez service workera; tryb offline sprawdza się po buildzie przez `npm run preview` (konfiguracja `preview-4182` w `.claude/launch.json`).
- Przed oddaniem pracy muszą przechodzić wszystkie cztery: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Projekt nie ma Prettiera ani innego formatera; pisz w stylu otaczającego kodu (bez średników, pojedyncze cudzysłowy, długie linie).

Budowa danych (Node uruchamia pliki `.ts` bezpośrednio):
- `npm run build:catalog` — pobiera OpenNGC i katalogi VizieR, zapisuje `public/catalog/catalog.v1.json` i nadpisuje cały `public/catalog/meta.json`.
- `node scripts/build-stars.ts [--cache <katalog>] [--out <katalog>] [--refresh]` — Tycho-2 do V ≤ 10 → `public/catalog/stars.v1.bin` i wpis `stars` w `meta.json`. Po `build:catalog` uruchom go ponownie.
- Odpowiedzi serwerów są buforowane w `scripts/.cache` (ignorowany przez git). Serwery CDS odrzucają narzędzia udające przeglądarkę; skrypty używają zwykłego HTTP.

## Architektura

- `src/services/` — czyste funkcje bez Reacta.
  - `astroMath.ts` jest jedynym miejscem importu `astronomy-engine`; pilnuje tego reguła `no-restricted-imports` w `eslint.config.js` (testy mogą go importować jako referencję).
  - Widoczność i noc (`visibility.ts`), geometria kadru i rzut TAN (`framing.ts`), filtry, sortowanie i rekomendacje filtrów katalogu, sprzęt, zarysy Stellarium (`outlines.ts`), gwiazdy tła (`stars.ts`).
  - `skyImage/` — adresy źródeł zdjęć (hips2fits alaskybis → alasky → NASA SkyView → STScI) i loader z wstrzykiwanymi zależnościami przeglądarki (fetch, Cache Storage, zegar).
  - `catalog/` — parsery katalogów, wspólne dla skryptów budowy i importu w aplikacji.
- `src/workers/` — widoczność całego katalogu (ok. 16,5 tys. obiektów) w Web Workerze. `catalogEngine.ts` to czysty silnik testowany bezpośrednio; worker i klient są cienkimi adapterami.
- `src/state/plannerStore.ts` — stan Zustand (zakładka, noc D, lokalizacje, profile sprzętu, wybrany obiekt, parametry planowania, kadr trzymany tylko w pamięci). Do `localStorage` trafiają tylko drobne preferencje.
- `src/data/` — Dexie (`db.ts`, `appDb.ts`; wersja bazy 4 z tabelą `projects`), repozytoria, kopia zapasowa (`backup.ts`), dane wbudowane (lokalizacje, profile demo, katalog sprzętu w `equipment/`, „Klasyki”) oraz `outlines.dat` ze Stellarium (GPL-2.0, wczytywany importem `?raw`).
- `src/features/<zakładka>/` (`catalog`, `night`, `framing`, `projects`, `equipment`, `settings`) — logika widoku w czystych modułach `*Model.ts` / `*Form.ts`; komponenty `.tsx` tylko renderują.
- `src/app/` — NavBar i TopBar.
- `src/theme/tokens.ts` — wszystkie kolory, także Red Mode.
- `public/catalog/` — zbudowane dane: `catalog.v1.json` (6,9 MB w jednej linii, nie wczytuj go w całości), `meta.json`, `stars.v1.bin`.

Konwencje, które łatwo złamać (szczegóły w sekcji 4 specyfikacji i w `ARCHITECTURE.md`):
- Czas wewnętrznie w ms UTC; noc identyfikuje data lokalnego wieczoru w strefie IANA lokalizacji.
- Współrzędne katalogu: J2000 w stopniach. API astronomy-engine przyjmuje RA w godzinach; do Alt/Az potrzebna jest precesja na datę.
- PA kadru mierzony od N przez E; azymut N = 0°, E = 90°; długość geograficzna E dodatnia; wysokości obiektów bez refrakcji.
- Wycinki zdjęć są w rzucie TAN, N u góry, E po lewej. Dla hips2fits skala wynosi `2·tan(fov/2)/W`, nie `fov/W`.
- Kolory tylko z tokenów; typ obiektu zawsze ikoną i tekstem; w Red Mode każdy kolor ma G = 0 i B = 0.

## Testy

- `tests/features/<funkcja>/` — testy zamrożone przez pętlę tdd-autoloop (część ukryta w `hidden/`). Testy etapów 1–3 i 6 leżą obok kodu jako `src/**/*.test.ts` (i `*.test.tsx`), z danymi pomocniczymi w `src/test/`.
- Testy działają w Node bez DOM:
  - modele testuje się jako czyste funkcje;
  - komponenty renderuje się przez `renderToStaticMarkup`;
  - IndexedDB zapewnia `fake-indexeddb`.

  Dlatego kod wykonywany przy renderze nie może używać `fetch`, `caches`, `Image` ani `URL`; to należy do efektów.
- Zamrożone testy przypinają m.in. kolory typów obiektów w `tokens.ts`, klasy `control` i `button` w `index.css`, strukturę `TopBar`, listę 5 zakładek nawigacji, wersję bazy (`db.verno` = 4) i 5 kluczy zapisu stanu w `localStorage` (nowe preferencje dostają osobny klucz). Sprawdź je, zanim zmienisz wygląd.

## Pętla tdd-autoloop (`.autoloop/`)

- Etapy 4 i 5 zbudowała pętla ze skilla `tdd-autoloop`. Jej pliki:
  - `BACKLOG.md`;
  - `features/<id>/spec.md`;
  - `config.json` z poleceniami testów i listą chronionych plików (testy, konfiguracje, `package.json`, `public/catalog/*`, `src/data/*.json`).
- Hak ochronny blokuje edycję plików chronionych; nowych zależności nie dodaje się.
- Gdy funkcja jest w toku, nie zmieniaj historii git, bo pętla sama commituje i cofa próby.

## Inne

- Interfejs projektuj najpierw dla ekranu komputera (1280–1600 px). Telefon musi nadal działać: cele dotykowe ≥ 44 px, dolny pasek zakładek poniżej 768 px.
- `experiments/` (próby, m.in. wyznaczanie zarysów modelem SAM 3) jest w `.git/info/exclude` i poza ESLint.
- `.claude/worktrees/` zawiera worktree innych sesji; nie edytuj ich z tego katalogu. Folder `.claude/` jest wyłączony z Vitesta (`vite.config.ts`) i ESLinta.
- W poleceniach PowerShell nie wklejaj tekstu ze znakami `>` i `` ` `` ani z polskimi cudzysłowami „ ”. Zapisz skrypt do pliku i uruchom plik (szczegóły w `LESSONS.md`).
