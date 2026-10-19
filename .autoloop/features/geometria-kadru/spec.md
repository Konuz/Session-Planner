# geometria-kadru — Geometria kadru, mozaiki i OAG

## Cel
Program wylicza, gdzie na niebie leżą kadr, panele mozaiki i pryzmat OAG, oraz w którym miejscu wycinka zdjęcia trzeba je narysować. Te same wyniki służą zdjęciu i mapie zastępczej. Liczy się wszystko bez sieci, z aktywnego profilu sprzętu i ustawień kadru (środek, PA, mozaika).

## Przykłady
Jeśli nie napisano inaczej: RedCat 51 + ASI2600MC Pro (matryca 23,49 × 15,70 mm, F 250 mm), mozaika 2×1, zakładka 20%, PA 0°, środek RA 30°. „Wycinek 2°” to 1000 × 1000 px, pole 2°. Współrzędne na wycinku: (0; 0) to lewy górny róg obrazu, x rośnie w prawo, y w dół, środek wycinka jest w (500; 500). Tolerancje: kąty ±0,002°, PA ±0,01°, piksele ±1 px. PA porównuje się z zawinięciem, więc 359,999° zalicza się jako 0°.

P1: [T12] Odległość środków paneli wynosi 4,305° przy Dec 0°, 60° i 85°. Różnica RA środków to odpowiednio 4,305°, 8,598° i 46,659°. Lokalny PA panelu wschodniego wynosi 0°, 3,72° i 23,24°, a zachodniego 0°, 356,28° i 336,76°.
P2: Przy Dec −60° znak się odwraca: panel wschodni ma PA 356,28°, a zachodni 3,72°.
P3: Kolejność paneli: wierszami od góry, w wierszu od lewej (lewa strona i góra kadru, nie ekranu). Przy PA 0° pierwszy panel mozaiki 2×1 jest wschodni (większe RA), a drugi zachodni.
P4: PA 90°, Dec 0°: mozaika 2×1 układa się w osi N–S. Pierwszy panel ma Dec −2,153°, drugi +2,153°, oba RA 30°.
P5: Środek RA 359°, Dec 0° → panel wschodni ma RA 1,153° (nie 361,153°), a zachodni 356,847°.
P6: Środek w biegunie (Dec 90°, RA 30°) → pierwszy panel ma RA 120°, drugi 300°, oba Dec 87,847°. Odległość środków wynosi 4,305°, a w wynikach nie ma żadnego NaN.
P7: Rozmiar całej mozaiki liczymy tak:
- szerokość na płaszczyźnie stycznej = szerokość kadru · (1 + (kolumny − 1) · (1 − zakładka)); wysokość tak samo, z wierszami;
- kąt = `2·atan(wymiar/2)`.
Przy 1×1 daje to 5,380° × 3,597° (jak w T1), a przy 2×1 z zakładką 20% 9,668° × 3,597°, nie 5,380° × 1,8 = 9,684°.
P8: Wartości spoza zakresu są przycinane, a PA sprowadzany do [0°, 360°). Mozaika 0×1 daje 1×1, mozaika 6×1 daje 5×1. Zakładka 5% daje 10%, a 40% daje 30%. PA −30° daje 330°, a PA 360° daje 0°.
P9: [T24] Wycinek 2°, środek RA 30°, Dec 0°, środek wycinka = środek kadru, PA 0°, Newton 150/600 + Ares-M Pro, 1×1. Narożniki ramki wypadają w kolejności: lewy górny (230; 230), prawy górny (770; 230), prawy dolny (770; 770), lewy dolny (230; 770).
P10: Ten sam zestaw i wycinek, mozaika 2×1 z zakładką 20%:
- panel 1 (wschodni) ma x 14,0–554,0;
- panel 2 (zachodni) ma x 446,0–986,0;
- oba panele mają y 230–770;
- pas zakładki 446–554 ma 108 px, czyli 20% z 540 px.
P11: Skala wycinka TAN wynosi `2·tan(pole/2) / szerokość_px` [rad/px] i zastępuje „fov / szerokość” z 7B. Wycinek 20° (1000 px), środek RA 30°, Dec 0°:
- punkt RA 40°, Dec 0° wypada w x = 0, y = 500, czyli dokładnie na lewym brzegu (wzór z 7B dałby x ≈ −5,1);
- punkt RA 30°, Dec −10° wypada w x = 500, y = 1000.
P12: Wycinek prostokątny: pole dotyczy dłuższego boku, jak w hips2fits. Wycinek 2000 × 1000 px, pole 20°, środek RA 30°, Dec 0° → punkt RA 40°, Dec 0° wypada w x = 0, y = 500.
P13: Wycinek nie musi mieć środka w środku kadru. Narożniki są punktami na niebie, więc po przesunięciu kadru da się je rzutować na stary wycinek. Przykład: kadr z P9 przesunięty na Dec +0,2° i rzutowany na wycinek o starym środku (Dec 0°) ma górną krawędź przy y = 130 zamiast 230, a dolną przy y = 670.
P14: Kierunek obrotu (sekcja 4): na ekranie ramka obraca się przeciwnie do ruchu wskazówek zegara. Kadr z P9 przy PA 30° ma środek górnej krawędzi w (365,0; 266,2), a przy PA 330° w (635,0; 266,2). Przy PA 90° góra ramki wskazuje w lewo (E): środek górnej krawędzi jest w (230; 500).
P15: Profil z P9 z OAG {pryzmat 8 × 4 mm, odsunięcie 8 mm, kąt 0°}, PA 0°: prostokąt pryzmatu ma x 309,0–691,0 i y 22,6–213,5. Kąt 90° przesuwa pryzmat na prawo od matrycy: x 786,5–977,4, y 309,0–691,0. Przy kącie 0° i PA 90° pryzmat obraca się z kadrem na lewo: x 22,6–213,5, y 309,0–691,0.
P16: Profil z `oag: null` nie ma prostokąta pryzmatu. Mozaika z P10 z OAG z P15 ma dwa pryzmaty, po jednym przy każdym panelu: x 93,0–475,0 i x 525,0–907,0, oba y 22,6–213,5.
P17: Przesuwanie tła na wycinku 2° ze środkiem M 42 (RA 83,8221°, Dec −5,3911°):
- piksel (400; 500) daje nowy środek RA 84,023°, Dec −5,391°, więc przeciągnięcie tła o 100 px w prawo przesuwa środek na wschód;
- piksel (500; 400) daje RA 83,822°, Dec −5,191°, więc przeciągnięcie o 100 px w dół przesuwa środek na północ.

## Styk z resztą
- `src/services/framing.ts` (nowy plik, czyste funkcje):
  - panele mozaiki (środek, lokalny PA, 4 narożniki jako RA/Dec);
  - pryzmat OAG;
  - rozmiar całej mozaiki;
  - rzut punktu z nieba na piksele wycinka TAN;
  - przeliczenie piksela wycinka na punkt nieba.
- Wzory:
  - rzut odwrotny z 7B (gotowe `gnomonicProject` i `gnomonicUnproject` z `astroMath.ts`); nie dodajemy przesunięć do RA/Dec;
  - wymiary w radianach to wymiar w mm podzielony przez F_eff (`computeOptics`);
  - narożniki paneli i pryzmatu leżą na płaszczyźnie stycznej środka kadru, czyli środek ± pół szerokości w kierunku „prawo” ± pół wysokości w kierunku „góra”.
- Typ `Framing` z sekcji 5 dopisany do `src/types.ts`. W tym typie `overlapPct` = 20 oznacza 20%. Pole `oag` z `EquipmentProfile` jest już w typach.
- Dalsze użycie: `zakladka-kadr` rysuje te wyniki i liczy przesuwanie tła z P17. `mapa-zastepcza` rzutuje zarysy tym samym rzutem, a `zrodla-zdjec` dobiera pole wycinka z rozmiaru mozaiki.

## Poza zakresem
- Rysowanie SVG, suwak, pola i gesty (`zakladka-kadr`).
- Ułożenie obrazu STScI, który nie jest w TAN, oraz rozmiar i zapas wycinka (`zrodla-zdjec`).
- Zarysy i elipsy obiektów (`mapa-zastepcza`).
- Zapis kadru w projekcie i eksport do N.I.N.A. (etap projektów).

## Pytania
- Wartości w P2, P4–P8 i P10–P17 policzyłem ręcznie, każdą dwiema drogami, bez kalkulatora. Jeśli kod da inny wynik przy poprawnym wzorze, trzeba to zgłosić zamiast naginać kod.
- Środek wycinka przyjmuję w (W/2; H/2) w ciągłych współrzędnych. Nagłówek FITS hips2fits (`CRPIX = W/2`, liczony od 1) daje środek o pół piksela dalej. Ta różnica mieści się w tolerancji.
- Narożniki paneli wyznaczam na płaszczyźnie stycznej środka kadru, a nie na płaszczyźnie każdego panelu. Wybrałem prostszy sposób, zgodny z wzorem z 7B. Różnica jest niewielka; P10 i P16 utrwalają ten wybór.
- Pryzmat OAG [Z20]: zakładam, że „szerokość” biegnie wzdłuż krawędzi matrycy, przy której leży pryzmat, a „wysokość” w stronę od środka matrycy. Kąt liczę zgodnie z ruchem wskazówek zegara od góry matrycy. W mozaice pryzmat jest przy każdym panelu.
- Wartości spoza zakresu przycinam (P8) zamiast zgłaszać błąd, bo pola wejściowe i tak mają te zakresy.
