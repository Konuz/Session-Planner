# mapa-zastepcza — Mapa zastępcza z zarysami obiektów

## Cel
Gdy nie ma zdjęcia nieba (albo pod zdjęciem), program rysuje w zakładce Kadr mapę obiektów katalogu w polu wycinka. Obiekty z zarysem ze Stellarium mają wielokąt (linia ciągła), a pozostałe elipsę albo okrąg z rozmiaru (linia przerywana). Każdy ma etykietę „oznaczenie (nazwa)”. Gwiazd nie ma [Z29]. Wszystko działa bez sieci.

## Przykłady
Jeśli nie napisano inaczej: wycinek 1000 × 1000 px, pole 2°, środek RA 83,8221°, Dec −5,3911° (M 42). Piksele liczone jak w `geometria-kadru`: (0; 0) to lewy górny róg, środek w (500; 500), skala `2·tan(pole/2)/szerokość`, N u góry, E po lewej. Tolerancja ±1 px.

Reguły, które sprawdzają przykłady:
- Punkt nieba odległy o 90° lub więcej od środka wycinka nie ma położenia w pikselach. Dotyczy to pozycji obiektu, etykiety i punktów kształtu. Kształt z choćby jednym takim punktem jest pomijany.
- Obiekt jest na mapie, gdy jego pozycja z katalogu leży w wycinku (brzegi się liczą) albo gdy jego kontur przecina wycinek lub w nim leży. Przecięcie sprawdza się na odcinkach między kolejnymi punktami w pikselach, łącznie z odcinkiem od ostatniego punktu do pierwszego, a nie na samych punktach.
- Obiekt z wielokątem ma tylko wielokąt (linia ciągła), nawet gdy katalog podaje rozmiar.
  - Gdy obiekt nie ma wielokąta, a ma rozmiar mniejszy × większy, dostaje elipsę.
  - Gdy ma tylko średnicę albo obie osie są równe, dostaje okrąg.
  - Elipsa i okrąg mają linię przerywaną.
  - Obiekt bez rozmiaru i bez wielokąta nie jest rysowany.
- Wielokąt odrzucony regułą z P13 się nie liczy. Obiekt, któremu odrzucono wszystkie wielokąty, jest traktowany jak obiekt bez wielokąta.
- Elipsa i okrąg to 72 punkty (co 5°). Pierwszy punkt to koniec osi wielkiej w kierunku PA (od N przez E), a PA puste = 0° (oś wielka N–S).
- Etykieta stoi w pozycji obiektu z katalogu i jest tylko wtedy, gdy ta pozycja leży w wycinku. Obiekt ma jedną etykietę, nawet przy kilku wielokątach.

P1: [T24] Mapa w polu 2° wokół M 42 zawiera dokładnie 16 obiektów:
- linią ciągłą: M 42, M 43, NGC 1977 i LBN 963;
- linią przerywaną: NGC 1973, NGC 1975, NGC 1980, NGC 1981, Sh2-279, Sh2-281, IC 420, vdB 42, vdB 44, LDN 1640, LDN 1641, vdB 36.
P2: Etykiety mają postać `formatDesignation(primary)` i w nawiasie pierwszą nazwę zwyczajową, jak w zakładce Noc. Przykłady: „M 42 (Great Orion Nebula)”, „M 43 (Mairan's Nebula)”, „NGC 1977 (the Running Man Nebula)”, „NGC 1980 (Lower Sword)”. Obiekt bez nazwy ma samo oznaczenie: „NGC 1975”, „Sh2-279”, „vdB 42”.
P3: M 42 ma jeden wielokąt z 15 punktów, a nie elipsę 90′ × 60′. Pierwszy punkt to (680,1; 553,9). Etykieta stoi w (501,7; 499,3). NGC 1977 (rozmiar 10,2′) też ma tylko wielokąt (8 punktów).
P4: NGC 1975 (10′ × 5′, PA puste) to elipsa z linią przerywaną:
- środek i etykieta w (498,8; 147,1);
- pierwszy punkt, czyli północny koniec osi wielkiej, w (498,8; 105,4);
- zasięg x 478,0–519,6 i y 105,4–188,7.
P5: NGC 1973 (5′ × 5′) i NGC 1980 (9,3′, bez mniejszej osi) to okręgi. NGC 1980 ma środek w (482,0; 759,4) i zasięg y 720,6–798,1.
P6: Elipsa z PA. Wycinek 1000 px, pole 0,1°, środek w NGC 1924 (RA 82,00804°, Dec −5,31075°; 1,6′ × 1,15′, PA 133°). Pierwszy punkt to (402,5; 590,9), a punkt 37. (drugi koniec osi wielkiej) to (597,5; 409,1). Oś wielka biegnie więc od środka w lewo w dół (na wschód i południe), zgodnie z kierunkiem obrotu z `geometria-kadru` P14.
P7: Brzegi pola (sztuczne obiekty, okrąg 6′, RA 83,8221°):
- środek w Dec −4,36°, czyli y ≈ −15,6, poza wycinkiem: okrąg sięga do y ≈ 9,5, więc obiekt jest na mapie, ale bez etykiety;
- środek w Dec −4,30°: okrąg kończy się w y ≈ −20,6, więc obiektu nie ma na mapie.
P8: Prawdziwy obiekt przy brzegu: vdB 42 ma środek w (995,2; 656,7), w wycinku. Jego okrąg (promień ok. 23 px) wychodzi poza prawy brzeg. Jest na mapie z etykietą, a punkty okręgu poza wycinkiem nie są obcinane.
P9: Duże obiekty ze środkiem poza polem:
- LDN 1641 (169,5′, środek ok. (235; 1290)) i vdB 36 (820′) mają łuk w wycinku, więc są na mapie bez etykiet. Łuk vdB 36 zahacza tylko o róg wycinka, a jego punkty leżą co ok. 0,6°, więc wykrywa go dopiero sprawdzanie odcinków.
- Sh2-276 (1200′) i LBN 918 (1560′ × 600′) obejmują cały wycinek, ale ich kontur go nie przecina, więc ich nie ma.
P10: Obiekty bez rozmiaru. W wycinku 1° wokół IC 427 (RA 84,0751°, Dec −6,6164°) nie ma IC 427 ani IC 428, bo nie mają rozmiaru ani zarysu. Ten sam wycinek zawiera NGC 1999 jako wielokąt i vdB 46 jako okrąg.
P11: Kilka wielokątów. W wycinku 2° wokół NGC 6334 (RA 260,2071°, Dec −36,1027°) NGC 6334 ma 4 wielokąty z linią ciągłą i jedną etykietę „NGC 6334”.
P12: Zarysy bez obiektu katalogu (19 sztuk, np. „C 99”, „38”) nigdy nie są rysowane. Wycinek 5° wokół RA 188,4°, Dec −61,5° nie ma wielokąta „C 99”.
P13: Zarys niezgodny z katalogiem: wielokąt przypisany do obiektu, którego pozycja z katalogu leży dalej niż 10° od pierwszego punktu wielokąta, jest pomijany jako błąd danych.
- Zarys „NGC 1978” z pliku leży przy NGC 1977 (Dec −4,9°), a NGC 1978 w katalogu to gromada w LMC (Dec −66,2°). W P1 nie ma więc wielokąta NGC 1978.
- W wycinku 1° wokół NGC 1978 (RA 82,18804°, Dec −66,23592°) NGC 1978 jest elipsą 4′ × 2,7′ z PA 160° i ma etykietę.
P14: RA przez 0°. Wycinek ma środek RA 0,5°, Dec 0°, pole 2°, a sztuczny okrąg 6′ leży w RA 359,8°, Dec 0°. Środek okręgu wypada w (850,0; 500).
P15: Druga strona nieba. Obiekt w punkcie przeciwległym do środka wycinka (RA 263,8221°, Dec +5,3911°, 30′) nie ma położenia w pikselach. Nie jest więc na mapie, choć sam wzór rzutu dałby mu odbicie w (500; 500). W wyniku nie ma żadnego NaN ani nieskończoności.
P16: Mapa zależy tylko od wycinka i katalogu. Zmiana PA kadru, mozaiki albo OAG daje tę samą mapę.
P17: Kolejność wyniku: obiekty w kolejności katalogu, a wielokąty jednego obiektu w kolejności z pliku. Pusty katalog daje pustą mapę.

## Styk z resztą
- Nowy plik `src/features/framing/fallbackMap.ts` (czyste funkcje).
  - Wejście: obiekty katalogu (`loadCatalog`), zestawienie „uid → wielokąty” z `services/outlines.ts` (`zarysy-stellarium`) i wycinek (środek, pole, szerokość i wysokość w px).
  - Wyjście: lista obiektów. Każdy ma uid, rodzaj kształtu (wielokąt, elipsa, okrąg), styl linii (ciągła lub przerywana), punkty w pikselach i etykietę z pozycją albo bez niej.
- Rzut nieba na piksele bierze z `services/framing.ts` (`geometria-kadru`). Uwaga: `gnomonicProject` nie odrzuca punktów odległych o 90° i więcej, więc tę kontrolę dodaje mapa. Punkty elipsy wyznacza na płaszczyźnie stycznej w środku obiektu (`gnomonicUnproject`) i rzutuje tak samo jak wielokąty. Szybki odsiew odległości robi `angularSeparationDeg`.
- Kolory nie są częścią modelu. Widok (`zakladka-kadr`) rysuje wszystkie obiekty jednym kolorem z `theme/tokens.ts`, więc typ obiektu nie jest kodowany kolorem.

## Poza zakresem
- Rysowanie SVG, przerywana linia, położenie tekstu etykiety względem punktu i Red Mode (`zakladka-kadr`).
- Gwiazdy [Z29], zarysy `outlines.extra.dat` (etap 8).
- Dopasowanie mapy do obrazu STScI, który nie jest w TAN (`zrodla-zdjec`).
- Obcinanie kształtów do brzegu wycinka (robi to widok).

## Pytania
- **Nie liczyłem programem.** W tej sesji nie miałem powłoki, więc piksele w P3–P8 i P14 policzyłem ręcznie, wzorem `gnomonicProject`. Listę z P1 ustaliłem z rozmiarów i odległości w `catalog.v1.json`. Skrypt sprawdzający jest gotowy, ale nie był uruchomiony. Przed zamrożeniem testów trzeba nim sprawdzić P1, P3–P11 i P13–P15.
- **Błędny zarys „NGC 1978”.** To prawdopodobnie błąd w Stellarium: zarys obejmuje ten sam obszar co NGC 1977.
  - Regułę 10° z P13 dodałem tutaj, żeby mapa była poprawna. Lepiej jednak wyłączyć to przypisanie w `zarysy-stellarium` (spec niezatwierdzona). Zmieniłyby się wtedy jej liczby 81/19 i 75.
  - Ręcznie sprawdziłem kilkanaście zarysów i ich odległość od pozycji z katalogu. Tylko ten leży dalej niż kilka stopni. Pełnego sprawdzenia 81 zarysów nie zrobiłem.
- **vdB 36** ma w katalogu 820′ (13,7°), a mgławice van den Bergha mają zwykle kilka minut łuku. To wygląda na błąd katalogu. Po jego poprawieniu vdB 36 zniknie z P1.
- **Obiekty bez rozmiaru (IC 427, IC 428)** nie są rysowane, bo 7B wymienia tylko wielokąty, elipsy i okręgi. Alternatywą jest sama etykieta albo mały znacznik, ale to byłby dodatek.
- **Obiekt, który obejmuje cały wycinek** (Sh2-276, Pętla Barnarda), nie jest pokazany, bo nie ma czego narysować. Można by pokazać jego etykietę w rogu.
- PA puste przyjmuję jako 0°. NGC 1973 (5′ × 5′) liczę jako okrąg.
- Nazwy zwyczajowe są po angielsku i bywają z „the” („the Running Man Nebula”). Zostawiam je bez zmian.
- Etykieta stoi w pozycji z katalogu, a nie w środku wielokąta. Jeśli ta pozycja leży poza wycinkiem, etykiety nie ma (LDN 1641, vdB 36).
- Rozmiar 0 albo ujemny traktuję jak brak rozmiaru.
