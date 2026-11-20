# Uruchomienie produkcyjne

Repozytorium łączy frontend Vite oraz serwer Node.js obsługujący statyczny katalog `dist/` i API (`/api/astrobin-photo`, `/api/hips/*`, `/api/photo/*`). Sam hosting statyczny i `npm run preview` nie udostępniają endpointów API ani zapisu kafelków/zdjęć; repozytorium nie zawiera też gotowej konfiguracji reverse proxy.

Wymagany jest **Node.js 24**. Skopiuj `.env.example` do `.env.local` i uzupełnij `ASTROBIN_API_KEY` oraz `ASTROBIN_API_SECRET` z AstroBin (w środowisku produkcyjnym możesz też przekazać te zmienne wprost do procesu). Nigdy nie dodawaj prefiksu `VITE_` — klucze muszą zostać wyłącznie po stronie serwera.

```bash
npm ci
npm run build
npm start
```

Domyślnie serwer nasłuchuje na `http://127.0.0.1:4173` (zmienne `HOST` i `PORT`). W celu ochrony przed atakami DNS rebinding odpowiada wyłącznie na żądania z nagłówkiem `Host` będącym adresem IP, `localhost` albo domeną z `ALLOWED_HOSTS` (lista po przecinku, np. `ALLOWED_HOSTS=tracker.konuzastro.pl`); pozostałe dostają `403`. Jeśli reverse proxy nie przepisuje `Host` na `127.0.0.1`, ustaw `ALLOWED_HOSTS` i kieruj pod HTTPS cały ruch aplikacji oraz ścieżki `/api/astrobin-photo`, `/api/hips/` i `/api/photo/` (z limitem rozmiaru żądania co najmniej `40 MB` dla wysyłanych zdjęć).

Poza samym katalogiem `dist/` (jedynym udostępnianym przez HTTP) proces Node.js musi mieć obok dostęp do `server/`, współdzielonych modułów `src/lib/`, `public/data/catalog.json`, `package.json`, `package-lock.json` oraz produkcyjnych zależności w `node_modules/`.

Bez kluczy AstroBin endpoint `/api/astrobin-photo` zwraca `503`, brak zdjęcia dla obiektu daje `204`, a błąd lub timeout API daje `502` — w każdym z tych przypadków interfejs przełącza się automatycznie na `DSS2`. W trybie `npm run dev` działa ten sam kod backendu. Testy w `src/lib/productionServer.test.ts` sprawdzają serwer HTTP na lokalnym gnieździe z atrapą AstroBin.

Warstwy **NSNS** (kopuła nieba, kadrowanie, miniatury) przechodzą przez proxy `/api/hips/<zestaw>/…` w `server/hipsProxy.ts`. Źródłem jest serwer autora (`www.simg.de`): serwer pobiera kafelek PNG (650–800 KB) raz, przekodowuje go do JPEG (ok. 70–95 KB) i zapisuje w `HIPS_CACHE_DIR` (domyślnie `scripts/.cache/hips-proxy`), ograniczając ruch do 4 równoległych pobrań. Odpowiedzi `404` poza pokryciem są pamiętane do restartu.

Pełną kopię lokalną obu zestawów można pobrać z góry poleceniem `node scripts/hips-mirror.ts [nsns-tc8] [nsns-rgb8]` (~7 GB PNG przy pobraniu, ~0,9 GB JPEG na zestaw na dysku) albo rozpakować z paczek wydania (`hips-proxy-nsns-tc8.tar`, `hips-proxy-nsns-rgb8.tar`). Po bezbłędnym zakończeniu powstaje plik `mirror-complete.json` — od tego momentu brak pliku na dysku oznacza brak kafelka bez odpytywania serwera źródłowego. Dane NSNS autorstwa S. Ziegenbalga podlegają licencji **CC BY-NC-SA 4.0** (podpis wyświetlany w interfejsie).

W przeglądarce obrazy HiPS trafiają do ograniczonego magazynu Cache Storage (128 gotowych obrazów i 512 kafelków), z zapisem serializowanym przez Web Locks między kartami. W przeglądarkach bez Web Locks odczyt istniejącego bufora oraz pobieranie działają normalnie, bez zapisu nowych wpisów.
