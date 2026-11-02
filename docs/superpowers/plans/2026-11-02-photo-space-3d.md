# Fotografia w przestrzeni 3D — plan wykonania

**Cel:** dowolne zdjęcie użytkownika otrzymuje rozwiązanie astrometryczne, edytowalne okręgi galaktyk, mgławic i gromad oraz odwracalne przejście do adnotacji na istniejącej mapie 3D.

**Uzgodnienia:** rozmowa i recenzja Astra High z 2026-11-02. Gwiazdy służą astrometrii; ich wycinki pozostają poza zakresem. Oddzielamy pozycję astronomiczną, okrąg w obrazie i pozycję karty na ekranie. Odległości przybliżone mają źródło; brak odległości oznacza tylko kierunek. Nie modyfikujemy istniejącego katalogu ani mechanizmu gwiazdozbiorów.

**Architektura:** mały program Rust korzysta z przypiętej wersji Skyshot Solver i jego funkcji WCS. Endpoint Node przyjmuje obraz, normalizuje orientację i rozmiar, uruchamia solver lokalnie i zwraca obraz odniesienia z propozycjami okręgów. Frontend przechowuje projekt w IndexedDB. Warstwa SVG utrzymuje te same wycinki przez całe przejście i łączy je z rzutami kotwic istniejącej sceny Three.js. Postęp animacji nie przebudowuje sceny.

**Warunki:** Windows/PowerShell, istniejący stos React/TypeScript/Three.js, polskie etykiety, kolory projektu, reduced-motion, brak zewnętrznego przesyłania zdjęć. Gałąź `feat/photo-space-3d`; migawka przed zmianami `d5d3b0151c6007d02acc040e851489095f8ceb2b`.

## Zadania

- [x] 1. Import: program `scripts/skyshot-bridge`, instalator `scripts/setup-skyshot.mjs`, endpoint `server/photo.ts` w produkcji i Vite. Weryfikacja: błędne pliki, limity, brak solvera, rzeczywiste rozwiązanie zdjęcia użytkownika.
- [x] 2. Geometria i zapis: `src/lib/photo.ts`, `src/lib/photoStorage.ts`. Testy: przecinanie granicy kadru, odwracalność interpolacji, brak fikcyjnej głębokości, niezależna korekta okręgu.
- [x] 3. Interfejs: `PhotoExplorer.tsx`, integracja `Space3D.tsx`, style. Import, zaznaczanie, przesuwanie i rozmiary okręgów, korekta odległości ze źródłem, suwak i odtwarzanie, zapis/odczyt projektu.
- [x] 4. Weryfikacja: testy, typecheck, build, rzeczywisty import zdjęcia, przeglądarka (początek/połowa/koniec, cofnięcie, obrót, mały ekran), niezależna recenzja zmian.

## Przypadki wymagające sprawdzenia

Obrót EXIF, nakładające się okręgi, obiekt poza środkiem kadru, nieznana odległość, obiekt poza skalą, nieudane rozwiązanie, ponowny import podczas pracy, przywrócenie projektu bez kolejnego rozwiązywania, zmiana rozmiaru panelu, brak skoku lub rozciągania wycinka.

## Postęp

- Start: istniejące pliki śledzone zgodne z `b0db25a`; pliki nieśledzone użytkownika pozostają nietknięte. Brak dostępnych narzędzi grafu MCP; rozpoznanie przez odczyt źródeł.

- Zakończenie: 132 testy w 24 plikach, kontrola typów i build PASS. Import przez Vite i serwer produkcyjny: 493 dopasowania, RMS 0,206 px dla załączonego zdjęcia. Sprawdzone obrót, odbicie, pomniejszenie, EXIF, TIFF i FITS. IAB: korekta i przeciąganie okręgów, wybór 5/10 obiektów, postęp 0/0,5/1, odtwarzanie, dokładny powrót, obrót kamery i szerokość 390 px. Recenzja Astra High po poprawkach: zaakceptowana. Migawka sprzed zmian zachowana.
