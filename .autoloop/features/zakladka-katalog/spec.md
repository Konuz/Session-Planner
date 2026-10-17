# zakladka-katalog — Zakładka „Katalog”

## Cel
Nowa zakładka „Katalog”, pierwsza w nawigacji, odpowiada na pytanie „Co fotografować tej nocy?”: panel filtrów i sortowania, przewijana lista kart, liczba wyników oraz komunikat o obniżonym progu albo braku okna. Widoczność liczy się w tle, więc interfejs w tym czasie reaguje.

## Przykłady
P1: Nawigacja ma zakładki w kolejności Katalog, Noc, Ustawienia. Nowy użytkownik (nic nie zapisano) zaczyna na zakładce Katalog; zapamiętana wcześniej zakładka (np. Noc) zostaje.

P2: Bez filtrów → „16 516 z 16 516 obiektów”. Liczby mają format pl-PL: „16 516” z odstępem, „2137” bez odstępu.

P3: Typ „mgławica ciemna” → „2137 z 16 516 obiektów”.

P4: Filtry, przy których nic nie zostaje → „0 z 16 516 obiektów” i komunikat „Żaden obiekt nie spełnia filtrów.”

P5: Lokalizacja 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski; noc 21/22.06.2026; próg −18° z obniżaniem → komunikat „Brak okna przy progu −18°; użyto progu −12°.” [T6, AC4]

P6: Ta sama noc na 54,83°N → komunikat „Brak okna ciemności nawet przy progu −12°.”, karty pokazują „brak okna przy progu −12°”, a „Widoczne w wybraną noc” daje 0 obiektów. [T6, AC4]

P7: Noc 16/17.10.2026 w tej samej lokalizacji (52,0°N) → brak komunikatu o progu.

P8: Worker jeszcze nie odpowiedział → zakładka pokazuje „Liczenie widoczności…”. Lista z filtrami katalogu, typu, gwiazdozbioru, jasności, rozmiaru i kadru działa od razu, a czasy efektywne pojawiają się po odpowiedzi. [AC7]

P9: Zmiana nocy, lokalizacji, horyzontu, progu, obniżania, h_min albo kroku katalogu wysyła jedno nowe żądanie do Workera. Zmiana minimum godzin, zakresu kadru, zestawu, filtrów albo sortowania nie wysyła żadnego.

P10: Włączenie „Polecane na miesiąc” przy nocy 24/25.10.2026 wysyła drugie żądanie, o noc 15/16.10.2026. Przy wyłączonym filtrze tego żądania nie ma.

P11: Katalog się wczytuje → „Wczytywanie katalogu…”; błąd wczytania → komunikat z przyczyną i przycisk „Spróbuj ponownie”. Odpowiedź Workera z błędem → „Nie udało się policzyć widoczności: …” z treścią błędu.

P12: Lista jest wirtualizowana: przy wysokości 800 px pierwszy ekran zawiera najwyżej 30 kart, a nie 16 516.

P13: Panel: sortowanie ma 5 opcji, domyślnie „czas efektywny”; gwiazdozbiory to 88 skrótów IAU alfabetycznie; katalogi i typy można wybierać po kilka naraz; „pokaż obiekty bez jasności” jest domyślnie zaznaczone.

## Styk z resztą
- `src/features/catalog/`: kontener zakładki, panel filtrów i sortowania oraz lista z `@tanstack/react-virtual` (pierwszy ekran przez `initialRect`). Lista i panel to komponenty prezentacyjne: obiekty, wyniki i stan dostają przez właściwości, a katalog i Worker wczytuje tylko kontener zakładki. Dzięki temu P12 i P13 renderują się w Node przez `renderToStaticMarkup`.
- Model widoku to czyste funkcje: liczba wyników, komunikat, stan liczenia, żądania do wysłania.
- `src/app/NavBar.tsx`: Katalog na pierwszym miejscu. `src/App.tsx`: wyświetla zakładkę. `src/state/plannerStore.ts`: `Tab` z `'catalog'` (domyślnie `'catalog'`); stan filtrów i sortowania bez zapisu między sesjami.
- Klient Workera i budowanie żądań z `obliczenia-w-tle`. W wątku głównym działają `catalogFilters.ts`, `catalogSort.ts`, `filterAdvice.ts` i model karty.
- Komunikat o progu: `darknessNote` bez zmiany tekstów. Można tylko poszerzyć typ argumentu do pól `darkness` i `requestedThresholdDeg`; istniejące testy dalej przekazują `NightFrame`.
- Katalog z `loadCatalog`. Pola i przyciski mają klasy `control` i `button` (co najmniej 44 px); kolory tylko z tokenów, więc działa Red Mode.

## Poza zakresem
- Otwieranie obiektu na wykresie nocy (`wybor-obiektu`).
- Wyszukiwarka tekstowa, widok szczegółów, import katalogu użytkownika, praca offline.

## Pytania
- Nowy użytkownik zaczyna na zakładce Katalog (pierwszej); dotychczasowym zostaje zapamiętana zakładka.
- Format liczby wyników „N z M obiektów” i komunikaty z P4, P8 i P11 to moja propozycja.
- Gwiazdozbiory pokazuję jako skróty IAU, bez polskich nazw.
- Filtry i sortowanie nie są zapamiętywane po zamknięciu aplikacji.
- W testach „bez blokowania” sprawdza się przez stan „Liczenie…” z atrapą Workera. Płynność trzeba sprawdzić ręcznie w przeglądarce.
