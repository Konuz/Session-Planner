# Uruchomienie produkcyjne

Repozytorium zawiera frontend Vite i serwer Node obsługujący `dist/` oraz `GET /api/astrobin-photo`. Sam statyczny hosting i `npm run preview` nie udostępniają tego endpointu. W repozytorium nie ma konfiguracji zewnętrznego hostingu ani odwrotnego serwera proxy.

Wymagany Node.js 24. Skopiuj `.env.example` do `.env.local` i ustaw `ASTROBIN_API_KEY` oraz `ASTROBIN_API_SECRET` uzyskane z AstroBin. Plik `.env.local` jest ignorowany przez Git. W środowisku produkcyjnym można zamiast pliku przekazać te zmienne do procesu. Nie stosuj prefiksu `VITE_`: te klucze są przeznaczone wyłącznie dla serwera.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Domyślnie serwer słucha na `http://127.0.0.1:4173`. `HOST` i `PORT` zmieniają adres nasłuchu. Serwer odpowiada tylko na żądania z nagłówkiem `Host` będącym adresem IP, `localhost` albo nazwą z `ALLOWED_HOSTS` (lista po przecinku, np. `ALLOWED_HOSTS=tracker.konuzastro.pl`); inne dostają 403. Chroni to przed atakiem DNS rebinding. Przy publikacji pod własną domeną ustaw `ALLOWED_HOSTS`, chyba że reverse proxy przekazuje `Host: 127.0.0.1`. Przy publikacji skonfiguruj istniejący hosting tak, aby kierował ruch HTTPS do tego procesu, w tym ścieżkę `/api/astrobin-photo`. Serwer udostępnia wyłącznie katalog `dist/`, nie katalog repozytorium. Pliki `server/` muszą być dostępne obok `dist/`.

Bez kluczy endpoint zwraca 503; jeśli AstroBin nie zwróci zdjęcia, zwraca 204; błąd lub przekroczenie czasu API daje 502. Interfejs korzysta wtedy z DSS2. W trybie `npm.cmd run dev` działa ten sam kod endpointu. Test `src/lib/productionServer.test.ts` uruchamia rzeczywisty serwer HTTP z atrapą API AstroBin; nie wymaga prawdziwych kluczy ani połączenia z AstroBin.

Niebo NSNS (kopuła, kadrowanie, miniatury) przechodzi przez pośrednika `/api/hips/<zestaw>/…` (`server/hipsProxy.ts`, ten sam kod w `npm.cmd run dev`). Jedynym źródłem jest prywatny serwer autora (www.simg.de); każdy kafelek PNG (650–800 KB) jest pobierany raz, przekodowany do JPEG (ok. 70–95 KB) i zapisany w katalogu `HIPS_CACHE_DIR` (domyślnie `scripts/.cache/hips-proxy`). Kafelek spoza pokrycia (404 źródła) serwer pamięta do restartu, błąd źródła daje 502. Najwyżej 4 równoczesne pobrania ze źródła. Przy publikacji kieruj do procesu także ścieżkę `/api/hips/`. Trasa `/api/hips/` jest rejestrowana przy starcie serwera: serwer dev uruchomiony przed jej dodaniem odpowiada na nią stroną HTML i trzeba go uruchomić ponownie.

Pełna kopia zestawu z góry: `node scripts/hips-mirror.ts [nsns-tc8] [nsns-rgb8]` (bez argumentów oba). Skrypt pobiera Allsky i kafelki od rzędu 0 w dół, schodząc tylko pod istniejące kafelki (ok. 7 GB PNG na zestaw ze źródła, ok. 0,9 GB JPEG na dysku), w tym samym katalogu i formacie co pośrednik; przerwany można powtórzyć. Bez błędów zapisuje `mirror-complete.json` w katalogu zestawu: od tej chwili brak pliku oznacza brak kafelka i pośrednik nie pyta źródła wcale (usunięcie znacznika przywraca pytanie źródła). Na serwerze produkcyjnym uruchom skrypt z tym samym `HIPS_CACHE_DIR` albo skopiuj katalog. Dane: Northern Sky Narrowband Survey, S. Ziegenbalg, CC BY-NC-SA 4.0; podpis jest wyświetlany przy każdym obrazie, a przekodowane kafelki zostają na tej samej licencji.

Obrazy HiPS są zapisywane w ograniczonym Cache Storage (128 gotowych obrazów i 512 kafelków). Web Locks szereguje zapisy także między kartami aplikacji. W przeglądarce bez Web Locks działa odczyt istniejącego cache i pobieranie obrazów, lecz nowe obrazy nie są zapisywane w magazynie.
