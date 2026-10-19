# pobieranie-zdjec — Kolejność prób, limit czasu, pamięć podręczna i zapis offline

## Cel
Program pobiera zdjęcie nieba dla wycinka: najpierw szuka go w pamięci przeglądarki (Cache Storage), potem próbuje źródeł po kolei, każdego najwyżej 10 s. Zapamiętuje ostatnie działające źródło, pozwala wybrać źródło ręcznie i umie zapisać podgląd do pracy offline.

## Przykłady
Jeśli nie napisano inaczej: wycinek M 42 z `zrodla-zdjec` (warstwa DSS2 kolor, pole 1°, 800 px), tryb „automatycznie”, brak zapamiętanego źródła, pusta pamięć podręczna. Sieć, ładowanie obrazu, pamięć, `localStorage` i zegar to atrapy. Źródła: alaskybis, alasky, SkyView, STScI (kolejność Z28). „Zapytanie” to wywołanie `fetch` albo ładowania obrazu.

**Kolejność prób [T22]**

P1: alaskybis nie odpowiada, alasky zwraca 503, SkyView działa → obraz z podpisem „NASA SkyView”. Wycinek nie trafia do pamięci (SkyView: zapis offline „nie”). Zapamiętane źródło: SkyView.

P2: Wszystkie cztery źródła zawodzą → wynik „brak zdjęcia” z listą prób i powodów: alaskybis „limit czasu”, alasky „błąd 503”, SkyView „błąd obrazu”, STScI „błąd sieci”.

P3: Jak w P2, potem „Spróbuj ponownie” i działa alasky → obraz „CDS hips2fits (alasky)”. Ponowna próba przechodzi całą procedurę od pamięci.

P4: Za błąd, po którym program przechodzi do następnego źródła, uznaje się:
- odpowiedź spoza 200–299 (404, 503);
- odrzucone zapytanie (brak sieci);
- odpowiedź 200 z typem innym niż `image/…` (np. `text/html`);
- zdarzenie `error` obrazu SkyView.

**Limit 10 s**

P5: alaskybis milczy. Po 9,999 s nadal czekamy i alasky nie zostało jeszcze zapytane. Po 10 s sygnał przerwania pierwszego zapytania jest ustawiony, a zapytanie do alasky startuje.

P6: SkyView milczy (alaskybis i alasky zawiodły). Po 10 s od startu SkyView atrapa ładowania obrazu dostaje sygnał przerwania i startuje STScI.

P7: Wszystkie źródła milczą → „brak zdjęcia” po 40 s.

**Pamięć podręczna**

P8: [T22] alaskybis nie odpowiada, alasky działa → obraz trafia do pamięci pod kluczem z P14 w `zrodla-zdjec`. Ponowne otwarcie tego samego wycinka: zero zapytań, obraz z pamięci.

P9: Obraz z P8 otwarty z pamięci ma podpis „CDS hips2fits (alasky)” i oznaczenie „z pamięci”. Nazwa maszyny jest zapisana razem z obrazem; klucz jest wspólny dla alaskybis i alasky.

P10: W pamięci jest tylko wycinek STScI (klucz z P15 w `zrodla-zdjec`) → tryb automatyczny pokazuje go bez żadnego zapytania, choć STScI jest w kolejności ostatnie. W trybie automatycznym najpierw sprawdza się pamięć wszystkich źródeł, dopiero potem sieć.

P11: Przeglądarka nie ma Cache Storage → obraz z sieci pokazuje się normalnie, ale nie jest zapisany. Zapis do pamięci kończy się błędem (brak miejsca) → obraz też się pokazuje, bez awarii.

**Ostatnie działające źródło** (`localStorage`, klucz `astrophotography-planner-sky-source`)

P12: Zapamiętane STScI → kolejność prób: STScI, alaskybis, alasky, SkyView. Zapamiętane alasky → alasky, alaskybis, SkyView, STScI.

P13: Zapamiętana wartość nieznana (`"eso"`) albo pusta → kolejność Z28.

P14: Zapamiętane źródło zmienia tylko udane pobranie z sieci (także w trybie ręcznym). Obraz z pamięci go nie zmienia.

**Ręczny wybór źródła** (wybrane źródło idzie pierwsze, reszta w kolejności jak w trybie automatycznym)

P15: Wybrano SkyView, w pamięci jest wycinek hips2fits, sieć działa → obraz z SkyView. Wybór ręczny pomija pamięć innych źródeł, dopóki wybrane źródło nie zawiedzie.

P16: Wybrano SkyView, sieci nie ma, w pamięci jest wycinek hips2fits → SkyView zawodzi, potem obraz hips2fits z pamięci. Po porażce wybranego źródła reszta działa jak tryb automatyczny: najpierw pamięć, potem sieć.

P17: Wybrano alaskybis, w pamięci jest wycinek z alasky → obraz z pamięci bez zapytań (wspólny klucz), podpis „CDS hips2fits (alasky)”, „z pamięci”.

P18: Wybrano STScI i zawodzi → próbowane są alaskybis, alasky i SkyView. Gdy i one zawiodą → „brak zdjęcia”.

**Nowe pobranie przerywa poprzednie**

P19: Trwa pobieranie wycinka A, kadr przesunięto i zaczyna się pobieranie B → zapytanie A dostaje sygnał przerwania. Spóźniony wynik A jest ignorowany, a obraz B nie zostaje przez niego zastąpiony.

**„Zapisz podgląd do pracy offline”**

P20: Obraz pochodzi z alasky albo z pamięci → „zapisano” bez żadnego zapytania.

P21: Obraz pochodzi z SkyView → program pobiera ten sam wycinek ze źródeł z zapisem: alaskybis, alasky, STScI, każde z limitem 10 s. Działa STScI → wycinek trafia do pamięci, widok pokazuje obraz STScI z podpisem „STScI DSS”, a zapamiętane źródło to STScI.

P22: Jak w P21, ale alaskybis, alasky i STScI zawodzą → „nie udało się zapisać”. Widok dalej pokazuje obraz SkyView. Brak Cache Storage → od razu „nie udało się zapisać”, bez zapytań.

## Styk z resztą
- `src/services/skyImage/loader.ts`: kolejność prób, limit czasu, pamięć, zapis offline.
- `fetch`, ładowanie obrazu (`<img>` dla SkyView), Cache Storage, `localStorage` i zegar są przekazywane jako parametry; w testach to atrapy.
- Z `sources.ts` (`zrodla-zdjec`): lista źródeł i nazwy, informacja „zapis offline”, adresy i klucze pamięci. Klucze się nie zmieniają.
- Nazwa źródła (maszyny) zapisuje się razem z obrazem w pamięci, np. w nagłówku zapisanej odpowiedzi. Podpis bierze się z tej nazwy, nie z klucza.
- Wynik dla `zdjecie-w-kadrze`:
  - obraz: dane obrazu, źródło, informacja „z pamięci” i „zapisany”;
  - albo „brak zdjęcia” z listą prób.

## Poza zakresem
- Komunikat „Brak zdjęcia — pokazuję zarysy obiektów”, przyciski, podpisy licencji i wyświetlanie (`zdjecie-w-kadrze`).
- Adresy, klucze i decyzja o nowym wycinku (`zrodla-zdjec`).
- Zwalnianie adresów obrazów w przeglądarce, czyszczenie i limit wielkości pamięci, zapamiętywanie samego ręcznego wyboru.

## Pytania
- **Ręczny wybór:** przyjąłem, że wybrane źródło idzie pierwsze, a po jego porażce program próbuje pozostałych (P15–P18). Alternatywa: tylko wybrane źródło, a po porażce mapa zastępcza.
- **Pytanie 5 z `zrodla-zdjec` (rozstrzygnięte):** klucz zostaje wspólny, a nazwa maszyny jest zapisana z obrazem (P9, P17).
- **Zapis automatyczny:** 7B każe zapisywać każdy pobrany wycinek, więc przycisk zapisu offline działa naprawdę tylko po obrazie z SkyView (P21).
- **Typ odpowiedzi spoza `image/…`** traktuję jako błąd (P4).
- **Ostatnie źródło** jest pod osobnym kluczem w `localStorage`, poza stanem `plannerStore`, żeby nie zmieniać jego wersji.
- **Czas:** limit 10 s nie obejmuje odczytu z pamięci.
