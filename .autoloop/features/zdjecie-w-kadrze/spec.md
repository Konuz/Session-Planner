# zdjecie-w-kadrze — Zdjęcie w tle widoku kadru

## Cel
Użytkownik widzi w zakładce „Kadr” zdjęcie nieba pod ramką i wie, skąd ono pochodzi. Może ręcznie wybrać źródło i warstwę oraz zapisać podgląd do pracy offline, a gdy zdjęcia nie ma, dostaje jasny komunikat, zarysy obiektów i przycisk „Spróbuj ponownie”.

## Przykłady
Jeśli nie napisano inaczej: obiekt M 42, wycinek z `zrodla-zdjec` (pole 5°, 1000 px, warstwa DSS2 kolor), źródło „Automatycznie”. Pobieranie (`pobieranie-zdjec`) to atrapa, która liczy wywołania, zapisuje tryb (automatyczny albo ręczny ze źródłem) i zwraca podany wynik. „Podpis” to tekst pod widokiem. Widok ma układ 1000 × 1000 jednostek, a jego pole jest równe polu wycinka (jak w `zakladka-kadr`). Nazwa warstwy w podpisie i licencji zależy od źródła i warstwy zdjęcia, które naprawdę jest pokazane, a nie od wybranej warstwy.

**Podpis źródła**

P1: [T22] Pobieranie zwraca obraz z SkyView → podpis „Zdjęcie: NASA SkyView”, bez nazwy warstwy (SkyView to zawsze DSS2 czerwony).
P2: Obraz z alasky, warstwa DSS2 kolor → „Zdjęcie: CDS hips2fits (alasky), DSS2 kolor”. Obraz ze STScI → „Zdjęcie: STScI DSS”.
P3: Obraz z alasky wzięty z pamięci → „Zdjęcie: CDS hips2fits (alasky), DSS2 kolor, z pamięci”.
P4: Pierwsze pobieranie (jeszcze bez zdjęcia) → tekst „Pobieram zdjęcie…”, mapa zastępcza widoczna, warstwy zdjęcia brak, przycisku offline brak.
P5: Ponowne pobieranie, gdy zdjęcie już jest (nowy wycinek, inne źródło lub warstwa) → stare zdjęcie i jego podpis zostają, dochodzi tekst „Pobieram zdjęcie…”, przycisku offline brak.

**Brak zdjęcia [T22]**

P6: Wszystkie źródła zawodzą → warstwy zdjęcia nie ma (także starego zdjęcia z P5), jest tylko mapa zastępcza. Widać komunikat „Brak zdjęcia — pokazuję zarysy obiektów”, przycisk „Spróbuj ponownie” i listę prób: „CDS hips2fits (alaskybis): limit czasu”, „CDS hips2fits (alasky): błąd 503”, „NASA SkyView: błąd obrazu”, „STScI DSS: błąd sieci”.
P7: Jak w P6, potem „Spróbuj ponownie” → pobieranie wywołane drugi raz z tym samym wycinkiem; zwraca obraz z alasky → komunikat znika, podpis jak w P2.

**Ręczny wybór źródła i warstwy**

P8: Lista źródeł: „Automatycznie”, „CDS hips2fits (alaskybis)”, „CDS hips2fits (alasky)”, „NASA SkyView”, „STScI DSS”. Na starcie zaznaczone „Automatycznie”.
P9: Wybór „STScI DSS” → jedno nowe wywołanie pobierania w trybie ręcznym ze STScI. Po ponownym uruchomieniu aplikacji znów „Automatycznie” (wybór nie jest zapamiętywany).
P10: Lista warstw przy polu wycinka 5°: „DSS2 kolor”, „DSS2 czerwony”, „Hα (Finkbeiner)”. Przy polu 2,5° bez Hα. Wybrane Hα, a pole spada do 2,5° → zaznaczony „DSS2 kolor” (`zrodla-zdjec` P8).
P11: Zmiana warstwy na „DSS2 czerwony” → jedno nowe wywołanie pobierania (inny klucz i adres).
P12: Tryb wywołania pobierania zależy od wyboru:
- „Automatycznie” + DSS2 kolor → tryb automatyczny;
- „Automatycznie” + DSS2 czerwony albo Hα → tryb ręczny ze źródłem alaskybis i wybraną warstwą;
- źródło wybrane ręcznie (np. STScI) + dowolna warstwa → tryb ręczny z tym źródłem; wybór użytkownika wygrywa.
P13: W pamięci jest tylko wycinek STScI. Warstwa Hα, „Automatycznie” → pobieranie w trybie ręcznym z alaskybis, więc najpierw sprawdzana jest pamięć hips2fits z kluczem Hα, potem sieć hips2fits; obraz Hα z alasky → podpis „Zdjęcie: CDS hips2fits (alasky), Hα (Finkbeiner)”. Ta sama sytuacja, ale ręcznie wybrane „STScI DSS” → tryb ręczny ze STScI, obraz STScI z pamięci, podpis „Zdjęcie: STScI DSS, z pamięci”.
P14: Wybrana warstwa Hα, oba serwery hips2fits zawodzą, obraz przychodzi z SkyView → podpis „Zdjęcie: NASA SkyView”, licencja SkyView z P26, bez wzmianki o Finkbeinerze i ODbL.

**„Zapisz podgląd do pracy offline”**

P15: Przycisk jest widoczny przy każdym pokazanym zdjęciu, także już zapisanym, jeśli nic się nie pobiera. Nie ma go przy „Brak zdjęcia” ani w trakcie pobierania (P4, P5).
P16: Zdjęcie z alasky, klik → komunikat „Zapisano podgląd do pracy offline”; zdjęcie i podpis bez zmian.
P17: Zdjęcie z SkyView, klik → w trakcie przycisk nieaktywny z tekstem „Zapisuję…”. Zapis udany przez STScI → zdjęcie STScI, podpis „Zdjęcie: STScI DSS”, komunikat jak w P16 (`pobieranie-zdjec` P21).
P18: Jak w P17, ale zapis się nie udaje → komunikat „Nie udało się zapisać podglądu do pracy offline”; zostaje zdjęcie i podpis SkyView.

**Nowy wycinek po przesunięciu** (wycinek pole 5°, środek RA 83,8221°, Dec 0°, kadr 2,0° × 1,5°; liczby jak w `zrodla-zdjec` P18)

P19: Puszczenie tła ze środkiem kadru w Dec 1,25° → 0 nowych wywołań. W Dec 1,26° → 1 wywołanie dla wycinka ze środkiem w Dec 1,26°.
P20: W trakcie przeciągania, nawet przy Dec 3° → 0 wywołań; sprawdzenie następuje dopiero po puszczeniu.
P21: Zmiana obiektu na M 31 → 1 nowe wywołanie dla wycinka wokół M 31. Gdy nikt nie wybrał obiektu, zakładka pokazuje M 31 (`zakladka-kadr` P2) i pobiera dla niego.

**Położenie zdjęcia w widoku** (jednostki widoku, ±1)

P22: Środek kadru = środek wycinka, zdjęcie hips2fits lub SkyView 1000 × 1000 px → zajmuje cały widok: x 0–1000, y 0–1000.
P23: Kadr przesunięty po puszczeniu na Dec 1° (wycinek nadal ze środkiem w Dec 0°, ta sama RA) → zdjęcie przesuwa się w dół: x 0–1000, y ok. 200–1200. Środek zdjęcia leży w rzucie środka wycinka na widok; skala bez zmian, bez obrotu.
P24: Zdjęcie STScI pokrywające 60′ (1000 px naturalnej szerokości) przy planowanym polu 5°, bez przesunięcia → wyśrodkowany kwadrat ok. x 400–600, y 400–600 (szerokość ze skali TAN, `geometria-kadru` P11). Przy polu 0,5° (STScI pokrywa 0,5°) → cały widok 0–1000.

**Podpisy licencji**

P25: Zawsze, także bez zdjęcia: „Licencja: zarysy obiektów — Stellarium (GPL-2.0)”.
P26: Przy zdjęciu dodatkowa linia: hips2fits → „Licencja: zdjęcie — CDS Strasbourg (hips2fits), dane DSS © STScI/AURA”; SkyView → „Licencja: zdjęcie — NASA/GSFC SkyView, dane DSS © STScI/AURA”; STScI → „Licencja: zdjęcie — Digitized Sky Survey © STScI/AURA”. Przy zdjęciu hips2fits w warstwie Hα zamiast „dane DSS © STScI/AURA” jest „mapa Hα: Finkbeiner (ODbL)”. Przy „Brak zdjęcia” tej linii nie ma.

## Styk z resztą
- `src/features/framing/`: czysty model warstwy zdjęcia (podpisy, komunikaty, listy wyboru, tryb wywołania pobierania, przycisk offline, decyzja o nowym pobraniu, prostokąt zdjęcia w jednostkach widoku) oraz komponenty tylko renderujące; sprawdzane przez `renderToStaticMarkup`.
- `pobieranie-zdjec` (`services/skyImage/loader.ts`): pobieranie w trybie automatycznym i ręcznym, ponowna próba, zapis offline, przerwanie poprzedniego pobrania.
- `zrodla-zdjec` (`services/skyImage/sources.ts`): nazwy źródeł i warstw, warstwy dostępne dla pola, pole wycinka, decyzja „trzeba pobrać nowy wycinek”, skala STScI.
- `geometria-kadru` (`services/framing.ts`): rzut na płaszczyznę styczną i skala TAN.
- `zakladka-kadr`: kontener i widok SVG (układ 1000 × 1000, pole widoku = pole wycinka); warstwa zdjęcia leży pod mapą zastępczą i ramką. Od niej pochodzą obiekt, środek kadru i informacja „przeciąganie trwa”. Filtr Red Mode leży na całym kontenerze widoku, więc obejmuje też zdjęcie.

## Poza zakresem
- Sama logika prób, limitu czasu i pamięci (`pobieranie-zdjec`); adresy i klucze (`zrodla-zdjec`).
- Widok SVG, gesty, wybór obiektu, Red Mode, mapa zastępcza i ramka (`zakladka-kadr`, `mapa-zastepcza`).
- Ekran „Źródła i licencje” w Ustawieniach (etap 7).
- Zapamiętywanie ręcznie wybranego źródła i warstwy.

## Pytania
- **Teksty licencji (P25, P26)** to propozycja; w repozytorium nie ma gotowych sformułowań. Warunki cytowania CDS, NASA SkyView i STScI trzeba sprawdzić przed wydaniem. Pełny ekran „Źródła i licencje” jest w etapie 7.
- **Granica z `zakladka-kadr`:** dopasowana do jej specu. Ona nie podaje wprost, że udostępnia „przeciąganie trwa” (potrzebne w P20); zakładam, że tak, bo i tak śledzi przeciąganie (jej P8).
- **Położenie po przesunięciu (P23):** zdjęcie przesuwa się tak, by jego środek trafił w rzut środka wycinka, bez przeliczania obrazu na nową płaszczyznę styczną. Przy przesunięciu do ¼ pola różnica jest mała.
- **Teksty „Pobieram zdjęcie…”, „Zapisuję…”, komunikaty zapisu i format podpisu** to moje propozycje (7B ustala dosłownie tylko „Brak zdjęcia — pokazuję zarysy obiektów” i „Spróbuj ponownie”).
- **Przycisk offline** jest widoczny także przy zdjęciu już zapisanym (wtedy od razu „Zapisano”), a nie ma go bez zdjęcia ani w trakcie pobierania.
- **Stare zdjęcie** zostaje w trakcie pobierania nowego wycinka, ale znika po porażce (P5, P6), bo T22 każe wtedy pokazać samą mapę.
- **Wybór warstwy** dodałem, choć nie ma go w opisie w backlogu, bo bez niego warstwy DSS2 czerwony i Hα byłyby nieosiągalne. Reguła trybu (P12, P13) to rozstrzygnięcie orkiestratora.
