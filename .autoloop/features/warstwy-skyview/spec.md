# warstwy-skyview — Warstwa ma pierwszeństwo przed zastępstwem

## Cel
Gdy użytkownik wybierze warstwę DSS2 czerwony albo Hα, aplikacja najpierw próbuje dostać tę warstwę z alaskybis, alasky i NASA SkyView. Dopiero gdy żadne z nich jej nie da, pokazuje zdjęcie STScI i mówi wprost, że wybranej warstwy nie ma (7B, 20.10.2026).

## Przykłady
Jeśli nie napisano inaczej: M 42 (RA 83,8221°, Dec −5,3911°), wycinek 5°, 1000 px, źródło „Automatycznie”, limity aplikacji: 30 s na każdy serwer hips2fits, 10 s na SkyView i STScI [Z28]. W grupie warstwy SkyView ma 30 s (decyzja użytkownika 20.10.2026). „Grupa warstwy” to alaskybis, alasky i SkyView w tej kolejności. „Pamięć warstwy” to zapisany wycinek hips2fits w tej warstwie; jest jeden, wspólny dla alaskybis i alasky. SkyView nie ma pamięci. Sieć, pamięć i zegar to atrapy. Czasy policzyłem ręcznie (dodawanie limitów).

**Adres SkyView w warstwie**

P1: Hα, SkyView w grupie warstwy → `https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=H-Alpha%20Comp&Position=83.8221,-5.3911&Size=5&Pixels=1000&Return=JPG`.
P2: DSS2 czerwony, SkyView w grupie warstwy → adres z `Survey=dss2r`, taki sam jak dziś. Dotychczasowy adres SkyView (`dss2r` dla każdej warstwy, `zrodla-zdjec` P6) się nie zmienia; adres Hα to osobna, nowa możliwość.

**Kolejność prób**

P3: (błąd z 20.10.2026) Hα, w pamięci jest tylko wycinek STScI, alaskybis milczy, alasky działa. Wynik: obraz Hα z alasky po 30 s, podpis „Zdjęcie: CDS hips2fits (alasky), Hα (Finkbeiner)”. Pamięć STScI nie jest nawet czytana. Dziś w tej sytuacji pokazuje się STScI z pamięci.
P4: Hα, w pamięci tylko wycinek STScI, alaskybis i alasky milczą, SkyView odpowiada po 2 s → obraz z SkyView po 62 s (30 + 30 + 2), podpis „Zdjęcie: NASA SkyView, Hα (Finkbeiner)”, licencja „Licencja: zdjęcie — NASA/GSFC SkyView, mapa Hα: Finkbeiner (ODbL)”. Gdy zamiast milczenia alasky od razu zwraca 503 → obraz po 32 s (30 + 0 + 2).
P5: DSS2 czerwony, obraz z SkyView w grupie warstwy → podpis „Zdjęcie: NASA SkyView, DSS2 czerwony”, licencja SkyView jak dziś.
P6: Pełna kolejność dla „Automatycznie” + Hα albo DSS2 czerwony: pamięć warstwy, sieć alaskybis, sieć alasky, sieć SkyView, a dopiero potem pamięć STScI i sieć STScI. Zapamiętane ostatnie źródło (np. STScI) tej kolejności nie zmienia.
P7: Cała grupa milczy → zapytanie do STScI startuje po 90 s (30 + 30 + 30).

**Warstwa niedostępna**

P8: Hα, cała grupa zawodzi, STScI działa → podpis „Warstwa Hα (Finkbeiner) niedostępna — pokazuję STScI DSS”, licencja STScI.
P9: Jak w P8, ale STScI pochodzi z pamięci → „Warstwa Hα (Finkbeiner) niedostępna — pokazuję STScI DSS, z pamięci”. Dla DSS2 czerwonego: „Warstwa DSS2 czerwony niedostępna — pokazuję STScI DSS”.
P10: Wszystko zawodzi → jak dziś „Brak zdjęcia — pokazuję zarysy obiektów” z listą prób w kolejności: alaskybis, alasky, SkyView, STScI.

**Ręczny wybór źródła wygrywa**

P11: Ręcznie „STScI DSS” + Hα, wycinek STScI w pamięci → obraz STScI z pamięci bez zapytań, podpis „Zdjęcie: STScI DSS, z pamięci”, bez „niedostępna”. Gdy STScI zawiedzie: pamięć warstwy, alaskybis, alasky, SkyView; potem „Brak zdjęcia”.
P12: Ręcznie „NASA SkyView” + Hα → najpierw SkyView z adresem z P1. Gdy zawiedzie: pamięć warstwy, alaskybis, alasky, potem STScI (pamięć, sieć).
P13: Ręcznie „CDS hips2fits (alasky)” + DSS2 czerwony → pamięć warstwy, sieć alasky, sieć alaskybis, SkyView, potem STScI. Obraz STScI na końcu dostaje podpis „niedostępna”, bo STScI nie było wybrane.

**Bez zmian**

P14: DSS2 kolor (automatycznie i ręcznie) → kolejność, pamięć wszystkich źródeł, adresy i podpisy dokładnie jak w `pobieranie-zdjec` i `zdjecie-w-kadrze`.
P15: Wybrane Hα przy polu 2,5° (używany DSS2 kolor, `zrodla-zdjec` P8) → zachowanie jak DSS2 kolor, adres SkyView z `dss2r`.
P16: Pobieranie bez nowej opcji „warstwa ma pierwszeństwo”: wycinek M 31 w warstwie DSS2 czerwony, ręcznie alasky, zapamiętane STScI, wszystko zawodzi → zapytania jak dziś: alasky, STScI, alaskybis, SkyView. Z tą opcją: alasky, alaskybis, SkyView, STScI.
P17: „Spróbuj ponownie” po P10 i nowe pobranie po przesunięciu kadru w warstwie Hα → ta sama kolejność co w P6.

**Limit SkyView w grupie warstwy**

P18: Hα, alaskybis i alasky od razu zwracają 503, SkyView milczy. Po 29,999 s od startu SkyView jego zapytanie nie jest przerwane, a STScI nie zostało zapytane. Po 30 s SkyView dostaje sygnał przerwania („limit czasu”) i startuje STScI.
P19: DSS2 kolor, alaskybis i alasky od razu zwracają 503, SkyView milczy → SkyView przerwane po 10 s, potem STScI (jak dziś). Tak samo SkyView poza grupą warstwy, np. bez nowej opcji.

**Zapamiętane źródło**

P20: Zapamiętane jest alasky. Hα: alaskybis i alasky zawodzą, obraz przychodzi z SkyView z sieci → zapamiętane nadal alasky. Potem zmiana warstwy na DSS2 kolor („Automatycznie”) → kolejność prób: alasky, alaskybis, SkyView, STScI. Pobranie z sieci z opcją „warstwa ma pierwszeństwo” nigdy nie zmienia zapamiętanego źródła (także obraz z alasky w P3 i STScI w P8). Zmieniają je tylko pobrania bez tej opcji, jak dziś.

## Styk z resztą
- `services/skyImage/sources.ts`: nowy adres SkyView dla warstwy (Hα → `H-Alpha%20Comp`, DSS2 czerwony → `dss2r`). Obecne funkcje adresu i klucza bez zmian.
- `services/skyImage/loader.ts`: nowa, opcjonalna opcja pobierania „warstwa ma pierwszeństwo”. Bez niej kolejność, limity i zapamiętywanie źródła są stare. Z nią SkyView w grupie warstwy ma limit 30 s, a zapamiętane źródło się nie zmienia. Obraz dostaje nową, opcjonalną informację: „w warstwie” (z grupy warstwy) albo „zastępstwo” (spoza grupy i niewybrany ręcznie). Tabela limitów z `limit-hips2fits` (SkyView 10 s) zostaje bez zmian.
- `features/framing/photoModel.ts`: opcję włącza tylko dla warstwy naprawdę używanej DSS2 czerwony albo Hα. Dla DSS2 kolor tryb pobierania ma dokładnie dotychczasową postać, bez dodatkowych pól. Podpis i licencja według tej informacji; obraz bez niej ma stary podpis (zamrożone P1 i P14 w `zdjecie-w-kadrze`).

## Poza zakresem
- Zmiana limitów czasu i kolejności dla DSS2 kolor.
- „Zapisz podgląd do pracy offline” działa jak dziś (alaskybis, alasky, STScI).
- Pamięć innych warstw jako zastępstwo (np. DSS2 kolor zamiast Hα).
- Zapamiętywanie wybranej warstwy.

## Pytania
- **Zastępstwo = tylko STScI** (pamięć, potem sieć). Nie próbuję SkyView `dss2r` po porażce SkyView Hα ani pamięci innych warstw.
- **Zapis offline po obrazie Hα z SkyView** może dać STScI DSS bez komunikatu „niedostępna”. Proponuję osobną poprawkę: zapis w trybie warstwy tylko przez hips2fits.
- **Podpis SkyView z nazwą warstwy** (P4, P5) to mój dodatek. Obraz bez nowej informacji (atrapy w zamrożonych testach) ma stary podpis „Zdjęcie: NASA SkyView”.
- **Teksty licencji SkyView dla Hα** (P4) to propozycja. Warunki mapy Finkbeinera w SkyView trzeba sprawdzić przed wydaniem.
- **Limit STScI po grupie warstwy** zostaje 10 s, więc w najgorszym przypadku „Brak zdjęcia” pojawia się po 100 s (90 + 10).
