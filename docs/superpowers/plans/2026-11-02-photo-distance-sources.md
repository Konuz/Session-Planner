# Wybór pomiaru odległości dla wycinka

**Cel:** X, Y i promień tylko do odczytu, bez ręcznych pól odległości i niepewności; wybór rzeczywistego pomiaru z katalogu aplikacji, SIMBAD lub NED. Zakres pomiaru pozostaje edytowalny.

**Uzgodnienia:** użytkownik poprosił o wdrożenie źródeł w odpowiedzi z 2026-11-02. Kontynuujemy istniejący widok i zapis IndexedDB. Snapshot `d5d3b0151c6007d02acc040e851489095f8ceb2b` sprawdzony przed zmianami.

**Podejście:** pobieramy pomiary dla aktywnego obiektu przez istniejące API zdjęć. Lista zawiera konkretne publikacje i wartości, bez automatycznego uśredniania ani przypisywania odległości sąsiadującego obiektu. NED tylko dla galaktyk/grup; SIMBAD przez działającą oficjalną kopię IDIA. Serwer przesyła tylko oznaczenie katalogowe, zdjęcie pozostaje lokalne. Zachowujemy zapisane wcześniej wartości, jeśli nie występują w aktualnych odpowiedziach. Nieudane pobranie nie zmienia aktywnej odległości.

## Kroki

- [x] `src/lib/photoDistanceServer.test.ts`: testy rzeczywistych formatów JSON SIMBAD i VOTable NED, jednostek pc/kpc/Mpc, braku błędu, odrzuconych pomiarów granicznych, częściowej awarii i znanych identyfikatorów. Uruchomić przed implementacją; oczekiwany brak nowego endpointu.
- [x] `server/photoDistances.ts`: importer źródeł. `server/photo.ts` i `server/index.ts`: GET `/api/photo/distances?id=...`, wspólny dla Vite i serwera produkcyjnego. `src/lib/photo.ts`: wspólny typ wyniku. Parser XML wyłącznie po stronie serwera.
- [x] `src/components/PhotoExplorer.tsx`: pola geometrii readOnly, usunięte ręczne pola odległości i niepewności, lista źródeł/publikacji i odnośnik do publikacji; pobieranie anulowane po zmianie obiektu/zdjęcia; zapis wybranego pomiaru przez istniejący updateCut. Zakres bez zmian.
- [x] `docs/photo-space-3d.md`: aktualne zachowanie i źródła.
- [x] Weryfikacja: testy, typecheck/build, żywe odpowiedzi M101 i B33 oraz widok przeglądarki: pola tylko do odczytu, wybór pomiaru, zapis, brak awarii przy zmianie obiektu. Zachować zdjęcie i geometrię użytkownika.

## Kontrola jakości

- Nie zamieniać pustej komórki w zero ani granicy odległości w pomiar.
- Nie przedstawiać asymetrycznego błędu jako symetrycznego ±; oryginalne błędy i metody pozostają przy źródle i w publikacji.
- Nie przedstawiać awarii usługi jako braku opublikowanych danych; ostrzeżenie per źródło.
- Nie zmieniać obiektu odpowiedzią zakończoną po zmianie zaznaczenia.
- Nie przebudowywać ani masowo uzupełniać głównego katalogu.
