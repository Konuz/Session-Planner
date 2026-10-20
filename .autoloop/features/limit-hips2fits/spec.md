# limit-hips2fits — Osobny limit czasu dla każdego źródła zdjęć

## Cel
Zakładka Kadr czeka na każdy serwer hips2fits (alaskybis, alasky) do 30 s, a na SkyView i STScI do 10 s [Z28]. Dzięki temu warstwy DSS2 czerwony i Hα, które hips2fits liczy 9–21 s, nie są już ucinane. Pobieranie bez podanych limitów działa jak dotąd (10 s na każde źródło).

## Przykłady
Jeśli nie napisano inaczej: jak w `pobieranie-zdjec` (wycinek M 42, tryb „automatycznie”, brak zapamiętanego źródła, pusta pamięć, atrapy sieci, obrazu i zegara). „Limity aplikacji” to tabela: alaskybis 30 s, alasky 30 s, SkyView 10 s, STScI 10 s. Czasy „po … s” liczy się od startu danej próby, chyba że napisano „od początku”.

**Bez podanych limitów (zgodność wstecz)**

P1: Pobieranie utworzone bez limitów, alaskybis milczy → po 9,999 s nadal czekamy, po 10 s pierwsze zapytanie dostaje sygnał przerwania i startuje alasky (jak P5 w `pobieranie-zdjec`).

P2: Pobieranie bez limitów, wszystkie źródła milczą → „brak zdjęcia” po 40 s od początku, każda próba z powodem „limit czasu”.

**Limity aplikacji**

P3: Tabela limitów, której używa zakładka Kadr, ma dokładnie: alaskybis 30 s, alasky 30 s, SkyView 10 s, STScI 10 s. Zakładka przekazuje tę tabelę do pobierania.

P4: alaskybis milczy → po 10 s i po 29,999 s nadal czekamy, a alasky nie zostało zapytane. Po 30 s zapytanie do alaskybis dostaje sygnał przerwania (powód „limit czasu”) i startuje alasky.

P5: alaskybis od razu zwraca 503, alasky odpowiada obrazem po 21 s → obraz z podpisem „CDS hips2fits (alasky)”, trafia do pamięci, zapamiętane źródło: alasky. Ta sama sytuacja w pobieraniu bez limitów (jak w P1) → alasky „limit czasu” po 10 s i próbowany jest SkyView.

P6: alaskybis i alasky od razu zawodzą, SkyView milczy → po 10 s ładowanie obrazu SkyView dostaje sygnał przerwania i startuje STScI (SkyView nie dostaje 30 s).

P7: Wszystkie źródła milczą → „brak zdjęcia” po 80 s od początku (30 + 30 + 10 + 10), każda próba z powodem „limit czasu”.

P8: Ręcznie wybrano STScI, wszystkie źródła milczą → STScI przerwane po 10 s, potem alaskybis czeka 30 s, alasky 30 s, SkyView 10 s; „brak zdjęcia” po 80 s od początku.

P9: Zapamiętane jest STScI, STScI milczy → po 10 s startuje alaskybis i czeka do 30 s. Limit należy do źródła, a nie do miejsca w kolejności.

P10: „Zapisz podgląd do pracy offline” po obrazie z SkyView; alaskybis i alasky milczą, STScI działa → alaskybis przerwane po 30 s, alasky po 30 s, potem obraz STScI zapisany („zapisano”).

P11: Jak w P10, ale STScI też milczy → „nie udało się zapisać” po 70 s od kliknięcia (30 + 30 + 10). Widok dalej pokazuje obraz SkyView.

**Niepełna tabela**

P12: Pobieranie z limitem podanym tylko dla alasky (30 s) → alaskybis milczy i jest przerywane po 10 s; alasky milczy i jest przerywane po 30 s; SkyView i STScI po 10 s. Źródło bez wpisu w tabeli dostaje 10 s.

P13: Odczyt z pamięci podręcznej nie ma limitu, także z limitami aplikacji: wycinek alasky w pamięci → obraz bez zapytań i bez czekania.

## Styk z resztą
- `src/services/skyImage/loader.ts`: `createSkyImageLoader` dostaje nowy, opcjonalny parametr z limitami dla poszczególnych źródeł. Stała `SKY_IMAGE_TIMEOUT_MS` = 10 000 i zachowanie domyślne zostają (zamrożone testy `pobieranie-zdjec` i `zdjecie-w-kadrze` tworzą pobieranie bez limitów). Limity działają w każdej próbie sieciowej: przy pobieraniu i przy „Zapisz podgląd do pracy offline”. Zdanie „każde z limitem 10 s” w P21 `pobieranie-zdjec` dotyczy już tylko pobierania bez limitów.
- Tabela limitów aplikacji: zwykła stała do sprawdzenia w teście bez przeglądarki (P3).
- `src/features/framing/useSkyImage.ts`: tworzy pobieranie z tą tabelą. Render nadal nie dotyka zależności przeglądarki.
- Przerwanie po limicie dalej naprawdę zatrzymuje zapytanie (sygnał przerwania), jak dotąd.

## Poza zakresem
- Zmiana kolejności źródeł, adresów, kluczy pamięci i powodów prób.
- Ustawianie limitów przez użytkownika (w interfejsie limitów nie ma).
- Sprawdzanie dziwnych wartości w tabeli (0, ujemne, nie-liczba): tabela pochodzi z kodu, nie od użytkownika.
- Komunikat „trwa pobieranie” albo licznik czasu w panelu zdjęcia.

## Pytania
- **Dłuższe czekanie przy padniętym alaskybis:** 19.10.2026 alaskybis nie odpowiedział ani w 40 s, ani w 120 s. Przy pierwszym otwarciu (bez zapamiętanego źródła) alasky startuje dopiero po 30 s, a najgorszy przypadek do „brak zdjęcia” rośnie z 40 s do 80 s (P7). Po pierwszym udanym pobraniu pomaga zapamiętane źródło. To decyzja użytkownika z Z28, więc tylko sygnalizuję.
- **Źródło bez wpisu w tabeli** dostaje 10 s (P12) — przyjąłem, żeby niepełna tabela działała jak dotychczas.
- **Limit liczony od startu każdej próby**, a nie łącznie dla całego pobierania (jak w `pobieranie-zdjec`).
