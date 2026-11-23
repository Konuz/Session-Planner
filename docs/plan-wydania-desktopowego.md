# Plan końcowego wydania desktopowego Trackera

> Plan realizacji. Przy wdrażaniu wykonuj i weryfikuj kolejne etapy w trybie `superpowers:executing-plans`.

**Cel**  
Użytkownik Windows x64 instaluje i uruchamia KONUZASTRO Tracker bez Dockera oraz bez osobnej instalacji Node.js, Pythona czy Rusta. Po dołączeniu paczki danych może oglądać mapy NSNS i rozwiązywać astrometrycznie zdjęcia bez internetu.

**Architektura**  
Electron otwiera zbudowany interfejs Vite w oknie i uruchamia obecny serwer Node.js na adresie `127.0.0.1`. Instalator programu i paczka danych są wydawane osobno. Dane użytkownika i pamięci podręczne trafiają do zapisywalnego katalogu profilu. Aktualizacja programu zachowuje mapy, indeks i zapisane ustawienia.

**Zakres**  
Electron, React/Vite, istniejące API Node.js, `sharp`, natywny Skyshot i środowisko Python z zależnościami Astro-Regressora. Punkty odniesienia w repozytorium to [instrukcja uruchomienia](uruchomienie.md), [README](../README.md) i [licencje danych](../LICENSE-ASSETS).

## 1. Uruchomienie aplikacji desktopowej

Pliki do utworzenia przy wdrażaniu to `desktop/main.ts` dla cyklu życia aplikacji i plik konfiguracji pakowania w `desktop/`. Istniejący punkt wejścia to `createAppServer` w `server/index.ts`.

- [ ] Uruchomić obecne API wyłącznie na pętli lokalnej, otworzyć jego adres w oknie Electron i zatrzymywać serwer wraz z aplikacją. Ustalić stabilny origin dla profilu Chromium, aby zapisane plany i zdjęcia były nadal dostępne po ponownym uruchomieniu.
- [ ] Zapakować działające zależności dla Windows x64, w tym `sharp`. Trzymać natywne pliki wykonywalne i duże dane poza archiwum ASAR. Wyznaczać ścieżki zasobów względem instalacji, a ścieżki zapisu względem profilu użytkownika.
- [ ] Sprawdzić na czystym Windows bez narzędzi deweloperskich, że aplikacja otwiera katalog, planer i scenę 3D, wykonuje lokalne wywołanie API, zachowuje plan po restarcie i zwalnia port przy zamknięciu. Sprawdzić instalację w ścieżce ze spacjami i polskimi znakami. [Zasoby Electron](https://www.electron.build/docs/contents/)

## 2. Paczka danych NSNS i Skyshot

Punkty integracji to `HIPS_CACHE_DIR` w `server/hipsProxy.ts` oraz `SKYSHOT_BRIDGE` i `SKYSHOT_INDEX` w `server/photo.ts`. Źródłem danych jest [wydanie GitHub v0.1.0](https://github.com/Konuz/Session-Planner/releases/tag/v0.1.0).

- [ ] Wykorzystać trzy istniejące zestawy `nsns-tc8`, `nsns-rgb8` i `nsns-ohs8`. OHS i SHO nadal współdzielą `nsns-ohs8` z kafelkami do rzędu 6. Dołączyć gotowy program Skyshot do instalatora i indeks `skyshot-data` do paczki danych. Obecne archiwa źródłowe zajmują łącznie około 5,5 GB.
- [ ] Umożliwić dołączenie wcześniej pobranej paczki przy instalacji lub później. Publikować rozmiary i SHA-256 części. Oznaczać kopię NSNS jako kompletną po sprawdzeniu i rozpakowaniu wszystkich jej części. Niepełna lub uszkodzona paczka ma dać się ponownie wczytać.
- [ ] Na czystej instalacji z odłączoną siecią sprawdzić wszystkie cztery warianty NSNS na kopule i w kadrowaniu, w tym przybliżenie OHS/SHO do rzędu 6. Rozwiązać przykładowe zdjęcie za pomocą dołączonego indeksu. Powtórzyć test dla uszkodzonej części archiwum i potwierdzić, że aplikacja zgłasza brak gotowych danych.
- [ ] Zachować przypisanie autorstwa Stefana Ziegenbalga, informację o przekodowaniu kafelków i warunki CC BY-NC-SA 4.0. [Licencja NSNS](https://creativecommons.org/licenses/by-nc-sa/4.0/)

## 3. Regresor i funkcje sieciowe

Punkty integracji to `server/regressor.ts` i `scripts/regressor/cut_distance.py`. Obecny proces roboczy komunikuje się z serwerem przez wejście i wyjście standardowe.

- [ ] Dostarczyć działające na Windows x64 środowisko Python wraz z zależnościami i uruchamiać istniejący proces roboczy z pakietu. Sprawdzić instalację bez Pythona i Pixi w systemie. Zapisywać wyniki do zapisywalnego katalogu profilu.
- [ ] Przy działającej sieci wykonać nowe obliczenie regresora od żądania do wyniku. Przy odłączonej sieci sprawdzić czytelny komunikat dla nowego obliczenia oraz odczyt zapisanego wyniku.
- [ ] W instrukcji rozróżnić lokalne funkcje od usług sieciowych. Prognozy, AstroBin, zdalne zapytania katalogowe i zebranie danych do nowych obliczeń regresora wymagają połączenia. DSS2 i Pan-STARRS w pierwszym wydaniu pozostają warstwami sieciowymi. Ich pełne kopie lokalne wymagają osobno ustalonego zakresu i sprawdzenia warunków dystrybucji. [Zdalne warstwy w konfiguracji Trackera](../src/lib/hips.ts)

## 4. Odbiór końcowy wydania

- [ ] Uruchomić `npm run build` i `npm test` w repozytorium, a potem przejść kontrolę instalacji na czystym Windows x64 z siecią i bez sieci zgodnie z powyższymi scenariuszami.
- [ ] Zainstalować nowszą wersję na profilu ze zdjęciem, zapisanym planem i pełną paczką map. Potwierdzić zachowanie danych i działanie Skyshot bez ponownego pobierania map.
- [ ] Przygotować instrukcję pierwszego uruchomienia z dwoma wariantami instalacji danych oraz opublikować instalator, paczkę danych i plik sum kontrolnych po potwierdzeniu testów. Windows x64 wyznacza zakres pierwszego wydania desktopowego.
