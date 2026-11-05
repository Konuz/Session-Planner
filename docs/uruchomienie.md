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

Obrazy HiPS są zapisywane w ograniczonym Cache Storage (128 gotowych obrazów i 512 kafelków). Web Locks szereguje zapisy także między kartami aplikacji. W przeglądarce bez Web Locks działa odczyt istniejącego cache i pobieranie obrazów, lecz nowe obrazy nie są zapisywane w magazynie.
