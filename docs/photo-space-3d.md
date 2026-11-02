# Zdjęcia w widoku 3D

W widoku **Niebo → Pozycja 3D → Rozłóż zdjęcie** można przesłać JPEG, PNG, WebP, TIFF lub FITS (do 40 MB). Obraz jest orientowany według EXIF i pomniejszany do maksymalnie 3200 pikseli dłuższego boku. Ten sam obraz otrzymuje rozwiązanie WCS i służy jako źródło wszystkich wycinków. FITS jest przedstawiany jako automatycznie rozciągnięty podgląd monochromatyczny.

Po imporcie sprawdź propozycje katalogowe, zaznacz widoczne obiekty i popraw okręgi przez przeciąganie. Cyjanowy uchwyt zmienia promień. Pola X, Y i promienia tylko wyświetlają aktualne wartości. Korekta okręgu nie przesuwa pozycji astronomicznej. Suwak i przycisk odtwarzania pokazują przejście od fotografii do adnotacji na mapie. Mapa nadal obsługuje obrót i powiększanie. Gwiazdy służą tylko astrometrii.

Lista „Źródło odległości” pozwala wybrać wartość z katalogu aplikacji (Wikidata) lub konkretny opublikowany pomiar z SIMBAD i, dla galaktyk/grup galaktyk, NED. Każda opcja pokazuje odległość, źródło, kod publikacji i metodę, jeśli podano. Wybrany pomiar ustawia pozycję 3D i zapisuje się razem ze zdjęciem. Nie uśredniamy różnych publikacji ani automatycznie nie wybieramy najnowszej. Zakres pomiaru (obiekt/kompleks) nadal ustawiasz samodzielnie; nie przypisujemy odległości pobliskiego obiektu. Stare, zapisane wartości pozostają dostępne. Brak danych i awaria usługi mają odrębne komunikaty.

SIMBAD pobieramy przez oficjalną kopię IDIA (TAP/ADQL, tabela mesDistance), NED przez DistancesOfObject (VOTable). Jednostki pc/kpc/Mpc są przeliczane na lata świetlne. Granice/kwalifikowane pomiary SIMBAD nie są traktowane jako dokładna pozycja. Symetryczny błąd SIMBAD może być pokazany jako ±; błędy asymetryczne oraz błędy modułu odległości NED zachowujemy w opisie źródła, bez udawania symetrycznej niepewności w latach świetlnych. Odnośnik prowadzi do publikacji w ADS.

Brak odległości oznacza strzałkę kierunku; jej koniec nie jest pozycją obiektu. Obiekty poza wybraną skalą otrzymują odpowiedni opis. W skali Wszechświata pobliskie obiekty są opisane jako należące do Drogi Mlecznej. Karty nie przedstawiają fizycznego rozmiaru obiektów.

Ostatnie zdjęcie wraz z WCS, zaznaczeniami i korektami zapisuje się lokalnie w IndexedDB przeglądarki. Ponowne wejście nie uruchamia solvera. Fotografie nie są przesyłane do zewnętrznych usług; zapytania o pomiary zawierają tylko publiczne oznaczenie katalogowe obiektu. Zmieniony lub inaczej wykadrowany obraz należy przesłać ponownie.

## Przygotowanie serwera

Wymagane: Rust z narzędziami natywnego linkowania, Git, Python 3.11+ i istniejące zależności npm. Windows: standardowy Rust MSVC wymaga C++ Build Tools. Alternatywnie skrypt wykorzystuje Rust GNU i lokalny MinGW, jeśli znajduje się w `scripts/.cache/mingw/mingw64/bin`.

```
npm.cmd run setup:skyshot
npm.cmd run dev
```

Instalator buduje mały program `tracker-skyshot` z przypiętym Skyshot Solver `76f01812fe0fc0fcdcbeba1ab89b339b19e1bc9e` i pobiera oficjalny indeks Full learned (około 838 MB, miejsce z archiwum około 2 GB). Kod i dane pozostają w ignorowanym `scripts/.cache`. Na serwerze produkcyjnym używaj `npm.cmd run build`, następnie `npm.cmd start`; samo statyczne hostowanie `dist` nie uruchamia astrometrii.

Można wskazać istniejące instalacje przez `SKYSHOT_BRIDGE` (ścieżka programu tracker-skyshot) i `SKYSHOT_INDEX` (katalog indeksu). Endpointy `/api/photo/status`, `/api/photo/solve` i `/api/photo/distances?id=...` działają w Vite i serwerze produkcyjnym. Serwer rozwiązuje jedno zdjęcie naraz, ogranicza czas procesu i usuwa swoje pliki tymczasowe po zakończeniu. Pobieranie pomiarów nie wymaga solvera; potrzebuje połączenia z SIMBAD/NED. Każde źródło ma limit czasu 15 s, pomyślne odpowiedzi mogą być przechowywane przez przeglądarkę przez godzinę.

## Ograniczenia i źródła

Propozycja katalogowa nie dowodzi widoczności obiektu na ekspozycji. Nakładające się obiekty mają niezależne wycinki, zawierające te same fragmenty tła. RMS i dopasowania przy brzegach są diagnostyką solvera, a nie niezależną walidacją. Zdjęcie z niewystarczającą liczbą gwiazd lub poza zakresem indeksu może pozostać nierozwiązane; dla bardzo wąskich pól upstream oferuje dodatkowy indeks DEEP, którego ten instalator nie pobiera.

- [Skyshot Solver: kod i licencja Apache 2.0](https://github.com/ashtree74/skyshot-solver)
- [Indeksy i zakresy pól](https://skyshot.app/downloads/)
- [Pochodzenie i oddzielne warunki danych](https://github.com/ashtree74/skyshot-solver/blob/76f01812fe0fc0fcdcbeba1ab89b339b19e1bc9e/docs/DATA-PROVENANCE.md)
- [SIMBAD: format pomiarów i bibliografia](https://simbad.idia.ac.za/simbad/sim-display?data=meas)
- [NED: dokumentacja API](https://ned.ipac.caltech.edu/Docs::API/)

Licencja kodu nie zastępuje warunków katalogu, modelu i indeksu. Dane nie są dołączane do repozytorium ani paczki frontendowej. Przed publicznym rozpowszechnianiem indeksów trzeba sprawdzić ich odrębne warunki; obecna integracja służy lokalnemu użyciu osobistemu.
