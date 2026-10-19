# zarysy-stellarium — Zarysy obiektów ze Stellarium

## Cel
Program czyta plik zarysów ze Stellarium (`src/data/outlines.dat`) i zamienia go na listę wielokątów na niebie. Każdy wielokąt przypisuje do obiektu katalogu aplikacji, żeby mapa zastępcza w zakładce Kadr mogła narysować prawdziwy kształt mgławicy zamiast elipsy.

## Przykłady
Zasady: współrzędne w pliku to RA w godzinach i Dec w stopniach (J2000). Punktami wielokąta są kolejne linie `start`, `vertex` i `end`, w tej kolejności, bez usuwania powtórzonego punktu zamykającego. RA w stopniach = RA w godzinach × 15. Oznaczenie to tekst po `start` bez spacji na początku i na końcu.

P1: Plik `src/data/outlines.dat` ma 3491 niepustych linii (końce LF, bez pustych linii), a ostatnia to `20.11484 +37.19802 end`. Test pilnuje tego, żeby wykryć podmianę pliku.

P2: Cały plik → dokładnie 100 zarysów, każdy ma co najmniej 3 punkty. [T23]

P3: Pierwszy zarys ma oznaczenie „LBN 933” (bez spacji na końcu) i 65 punktów. Pierwszy punkt to RA 05,66984 h = 85,0476° (±0,0001°), Dec +2,76126°. Ostatni punkt to RA 05,68207 h, Dec +2,55104°. [T23]

P4: Dwie linie `# Need a check` są pominięte. Zarys „LBN 342” zaczyna się zaraz po takiej linii i ma 10 punktów (linie 812–821); komentarz nie jest punktem ani zarysem.

P5: Ten sam plik z końcami linii CRLF (`\r\n`) → ten sam wynik co w P2 i P3: 100 zarysów, oznaczenie „LBN 933” bez `\r`, te same współrzędne.

P6: RA zapisane bez zera wiodącego: zarys „NGC 292” zaczyna się w RA 0,866875 h = 13,0031° (±0,0001°), Dec −73,64761°.

P7: Linie z kilkoma spacjami i spacją na końcu, np. `18.29533 -18.83000 start  44  ` → oznaczenie „44”.

P8: Przypisanie przez wyszukanie oznaczenia w katalogu (pole `designations`), a nie przez przepisanie tekstu: „M 42” → `NGC1976`; „M 43” → `NGC1982`; „NGC 1977” → `NGC1977`; „M 1” → `NGC1952`; „IC 2118” → `NGC1909`.

P9: Inny zapis przedrostka w pliku: „SH 2-275” → `Sh2-275`; „VDB 23” → `vdB23`; „B 44” → `B44`; „LBN 933” → `LBN933`; „LDN 1235” → `LDN1235`. Wielkość liter w przedrostku nie ma znaczenia. [T23]

P10: Oznaczenia, których nie ma w katalogu aplikacji: same liczby („38”–„49”), „RCW 27”, „RCW 32”, „RCW 33”, „Ced 30”, „C 99”, „C 100”, „PGC 17223”. Takie zarysy zostają w wyniku parsera z oznaczeniem, ale bez obiektu (uid puste), i nie trafiają do żadnego obiektu. Cały plik: 81 zarysów przypisanych, 19 bez obiektu.

P11: Jeden obiekt może mieć kilka wielokątów: `NGC6334` → 4; `NGC3372` → 2; `IC2177` → 2. Dwa różne oznaczenia tego samego obiektu łączą się: „M 8” i „NGC 6523” → oba do `NGC6523`, razem 2 wielokąty. Cały plik daje wielokąty dla 75 różnych obiektów.

P12: Obiekt katalogu bez zarysu (np. `NGC1973`) → pusta lista wielokątów.

P13: Tekst z zarysem, który ma tylko 2 punkty (`start` i `end`) → ten zarys jest pominięty, następne czyta się normalnie.

P14: Tekst kończy się w środku zarysu (jest `start` i dwa `vertex`, brak `end`) → ten niedokończony zarys jest pominięty; wcześniejsze zostają. Nowy `start`, zanim poprzedni zarys dostał `end` → poprzedni jest pominięty, a nowy czyta się normalnie.

P15: Puste linie i linie z innym poleceniem niż `start`/`vertex`/`end` są pominięte. Pusty tekst → zero zarysów.

## Styk z resztą
- Nowy plik `src/services/outlines.ts` (czyste funkcje, bez Reacta):
  - parser: tekst pliku → lista zarysów (oznaczenie z pliku, punkty RA/Dec w stopniach);
  - przypisanie: lista zarysów + obiekty katalogu (`DsoObject[]` z `loadCatalog`) → ten sam zarys z `uid` albo bez niego oraz zestawienie „uid → lista wielokątów” dla mapy zastępczej.
- Oznaczenie z pliku zamienia się na `Designation` (przedrostki M, NGC, IC, Sh2 z zapisu „SH 2-”, VdB, LDN, LBN, B) i szuka po kluczu jak `designationKey` z `services/catalog/records.ts`. Inne przedrostki (RCW, Ced, C, PGC) i same liczby nie mają odpowiednika.
- Dane: `src/data/outlines.dat` (Stellarium, GPL-2.0, commit 48e4f35). Aplikacja dostaje go jako tekst (np. import surowego pliku w Vite), testy czytają go z dysku.
- Korzysta z tego `mapa-zastepcza` (`features/framing/fallbackMap.ts`).

## Poza zakresem
- Rysowanie wielokątów, etykiety, elipsy i okręgi (`mapa-zastepcza`).
- Plik `outlines.extra.dat` i pierwszeństwo zarysów Stellarium (etap 8, T25).
- Podpis licencji GPL-2.0 na ekranie (`zdjecie-w-kadrze`).
- Tłumaczenie numerów Caldwella („C 99”, „C 100”) na inne oznaczenia i przypisywanie samych liczb.

## Pytania
- Zakładam, że jedno oznaczenie występuje w katalogu tylko w jednym obiekcie. Sprawdziłem to dla wszystkich 76 oznaczeń z pliku, które są w katalogu. Gdyby w innym pliku było inaczej, biorę pierwszy obiekt w kolejności katalogu.
- Zarysy bez obiektu (P10) pomijam po cichu, bez komunikatu dla użytkownika. Mapa zastępcza pokazuje tylko obiekty katalogu, więc i tak by ich nie narysowała.
- Punkt `end` jest ostatnim punktem wielokąta (tak czyta to Stellarium). Powtórzonego punktu zamykającego nie usuwam, bo na rysunek nie wpływa.
- „C 100” to w Caldwellu IC 2944, a „C 99” (Worek Węgla) nie ma numeru NGC ani IC. Nie przypisuję żadnego z nich, bo backlog każe szukać oznaczenia w katalogu, a nie tłumaczyć tekstu. Czy C 100 ma jednak trafić do IC 2944?
