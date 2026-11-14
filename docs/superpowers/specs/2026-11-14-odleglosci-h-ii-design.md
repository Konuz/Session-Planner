# Odległości obszarów H II: prędkość radialna i Foster & Brunt (projekt, 14.11.2026)

## Po co
Na zdjęciach Drogi Mlecznej prawie żaden obszar H II nie ma odległości. Bez odległości obszaru nie ma w 3D:
dziś 301 z 305 obiektów Sh2 i ok. 1490 z 1522 mgławic emisyjnych (EN). Literatura ma dla nich odległości: z widm
gwiazd wzbudzających (Foster & Brunt 2015), z paralaks maserów i odległości kinematyczne (Anderson i in. 2014,
katalog WISE). Ma też prędkości radialne gazu, z których odległość kinematyczną policzymy sami. Użytkownik chce
pokazywać najlepszą dostępną wiedzę, także gdy niepewność przekracza 20 %.

Przykład z kadru Sh2-181: Sh2-180 ma u Foster & Brunt 5,41 ± 1,08 kpc, a Sh2-183 ma w WISE 6,6 ± 1,3 kpc.
Sh2-181 ma prędkości −38,8 km/s (Hα) i −36,6 km/s (CO) według Russeil 2003. Żadna z tych wartości nie trafia dziś do aplikacji.

## Decyzje użytkownika (14.11.2026)
1. **Próg niepewności 50 % dla wszystkich obiektów.** `MAX_RELATIVE_UNCERTAINTY` = 0,5 zamiast 0,2.
   - Odległość z σ ≤ 50 % trafia do 3D.
   - W łańcuchu katalogu taki pomiar wygrywa z Wikidata (`withWikidataFallback` z nowym progiem).
   - Dotyczy też galaktyk, pozostałości po supernowych i wyników regresora.
2. **Odległość kinematyczną liczymy własnym kodem TypeScript** w `build:data` (podejście A): krzywa rotacji
   Reid i in. 2019 (model A5), niepewność metodą Monte Carlo jak u Wenger i in. 2018. Bez Pythona i bez nowych zależności.
3. **Foster & Brunt 2015** wchodzi do łańcucha jako źródło ogólne. Dzisiejszy wyjątek na sztywno dla Sh2-155
   w `scripts/build-data.ts` zastępuje dopasowanie po nazwie.
4. **Regresor bez zmian.** Nie liczy odległości kinematycznych: v_LSR służy w nim tylko do dopasowania obłoków
   z wbudowanego rejestru, który `scripts/regressor/cut_distance.py` wyłącza. Nadal uzupełnia wycinki bez
   żadnej odległości, teraz z progiem 50 %.

## Cele, nie-cele, anty-cele
- **Cele:**
  - odległość dla możliwie wielu obszarów H II (EN i CN) z rzetelną niepewnością;
  - źródło i metoda widoczne jak dotąd (podpowiedź, inspektor);
  - liczby w logu budowy.
- **Nie-cele:**
  - nowy interfejs;
  - zmiany w regresorze;
  - rozstrzyganie niejednoznaczności bliżej/dalej własnymi danymi (absorpcja HI, ekstynkcja);
  - mgławice refleksyjne (bez zjonizowanego gazu) i ciemne (mają Zuckera);
  - zmiana progu CST dla Hunt & Reffert (np. NGC 2175 z CST 4,35): osobna decyzja.
- **Anty-cele:**
  - wartość pokazana jako pewniejsza niż jest: σ musi zawierać niepewność krzywej rotacji i prędkości;
  - po cichu zmienione dane bez śladu w logu;
  - przesunięte indeksy dotychczasowych wpisów tabeli `sources` w `catalog.json`. Nowe źródła dopisujemy
    na końcu, tak jak robi to już dzisiejsza zmiana w `buildCatalog`.

## Podejścia (rozważone)
- **A (wybrane):** własna implementacja w TS. Testowalna w Vitest, deterministyczna, bez zależności.
  Ryzyko błędu w matematyce zmniejszają testy (niżej).
- **B:** pakiet `kd` (Wenger, GPL-3) przez pixi. Sprawdzony, ale `build:data` zależałby od Pythona i środowiska
  spoza repozytorium.
- **C:** tylko gotowe odległości z literatury. Najmniej pracy, ok. połowa zasięgu, nie spełnia prośby.

Kodu `kd` nie kopiujemy (GPL-3). Wzór krzywej rotacji pochodzi z publikacji: Persic i in. 1996 w postaci
Reid i in. 2019.

## Źródła danych (VizieR, lustro CfA/NAO jak dotąd, bufor `scripts/.cache/vizier`)
| Tabela | Co daje | Dopasowanie |
|---|---|---|
| `J/AJ/150/147/table2` Foster & Brunt 2015 | `r ± dr` [kpc] z widm gwiazd, `vCO`, `vHI` | nazwa `HII` = „Sh2-N” |
| `J/ApJS/212/1/wisecat` Anderson i in. 2014 (WISE) | `Dist ± e_Dist`, `Meth` (Parallax, Kin, OG/Kin…), `KDA` (N/F/T), `Vi1` (linie rekombinacyjne), `Vm1` (molekularne), `Rad` | `HIIName` zawiera „S<N>”; bez tego pozycja w promieniu regionu `Rad` lub obiektu |
| `J/A+A/397/133/table1` Russeil 2003 | prędkości Hα, linii rekombinacyjnych, CO, H₂CO, OH, HI | `HaName` po rozbiciu na „=” zawiera „S<N>” |

Zasięg dla 301 Sh2 bez odległości:
- Foster & Brunt: 91;
- WISE z odległością: 108;
- jakakolwiek prędkość: 264;
- nic: 37.

## Łańcuch dla EN i CN (kolejność)
1. Bez zmian: wyjątek Sh2-101 (gwiazda jonizująca) i Hunt & Reffert dla CN po nazwie.
2. **WISE z `Meth` = Parallax** (paralaksa maserów): zakres `object`, `verified: true`.
3. **Foster & Brunt 2015** (`r ± dr`): zakres `object`, metoda „odległość spektrofotometryczna gwiazd regionu H II”,
   `verified: true`. Zastępuje wyjątek Sh2-155; test sprawdza, że Sh2-155 dostaje 0,84 ± 0,04 kpc.
4. **WISE, pozostałe metody** (`Dist ± e_Dist`, `Meth`, `KDA` w opisie metody): zakres `object`,
   `verified: true`. Jeśli `e_Dist` jest puste, σ jest nieznana (null) i wartość przechodzi `hasDistance` tak jak dziś.
5. **Własna odległość kinematyczna** (niżej): zakres `object`, `verified: false`.
   - Dzięki temu gwiazda oświetlająca z pola zdjęcia (Gaia) ma pierwszeństwo w `cutDistance`.
   - W opisie pola `verified` w `distance.ts` dopisać: „false: wartość niesprawdzona lub pośrednia
     (Wikidata, odległość kinematyczna)”.
6. Na końcu `withWikidataFallback` z progiem 50 %, a w aplikacji regresor dla wycinków nadal bez odległości.

Poprawki po przeglądzie 14.11.2026:
- Własnej kinematyki z σ > 50 % nie zapisujemy: w katalogu blokowałaby regresor wycinka i nadpisywała jego wynik.
- Region WISE bez nazwy dobieramy tylko wtedy, gdy środek obiektu leży w promieniu regionu.
- Własnej kinematyki nie liczymy dla |l| < 15°.
Szczegóły w `docs/odleglosci/stan.md`.

Pomiar z σ > 50 % z kroku 2–5 nie kończy łańcucha: sprawdzamy kolejny krok. Dopiero gdy żaden nie da σ ≤ 50 %,
działa reguła Wikidata. (Dziś łańcuch kończy się na pierwszym trafieniu; dla H II zmieniamy to świadomie, bo kroki
mają bardzo różną jakość.)

## Odległość kinematyczna (scripts/kinematicDistance.ts, czysta logika)
- **Prędkość:**
  - Tracery w kolejności: linie rekombinacyjne (WISE `Vi1`, Russeil RR) → molekularne (WISE `Vm1`,
    Russeil CO/H₂CO, Foster & Brunt `vCO`) → Hα (Russeil). Tabeli 1 Foster & Brunt (Hα) nie pobieramy: Russeil
    ma Hα dla tych samych obszarów. Prędkość główna to pierwsza dostępna.
  - Gdy inne tracery tego obiektu różnią się od głównej o więcej niż 10 km/s, odległości nie liczymy
    (licznik „niezgodne prędkości”, np. Sh2-183: −62,6 vs −10,3 km/s). *[decyzja wykonawcy]*
  - HI pomijamy: jego prędkość w kierunku obszaru często nie należy do obszaru. *[decyzja wykonawcy]*
- **Model:**
  - Reid i in. 2019, tabela 3, dopasowanie A5:
    - R₀ = 8,15 ± 0,15 kpc;
    - U⊙ = 10,6 ± 1,2, V⊙ = 10,7 ± 6,0, W⊙ = 7,6 ± 0,7 km/s;
    - Ūs = 6,0 ± 1,4, V̄s = −4,3 ± 5,6 km/s;
    - a₂ = 0,96 ± 0,05, a₃ = 1,62 ± 0,02;
    - Z⊙ = 5,5 pc pomijamy: przechylenie płaszczyzny o 0,04° zmienia prędkość o mniej niż 0,1 km/s.
  - Uniwersalna krzywa rotacji (Persic i in. 1996). Prędkość LSR według definicji IAU. Ruch własny obszarów
    gwiazdotwórczych (Ūs, V̄s) wliczony, bo obszary H II do nich należą.
  - Wartości potwierdzone 14.11.2026: tabela 3 publikacji (IOP) i streszczenie arXiv:1910.03357 (R₀).
  - Z każdej kolumny Russeil 2003 bierzemy pierwszą wartość danego tracera (np. `HaVLSR`, a nie `HaVLSR2`).
- **Monte Carlo:**
  - 2000 próbek z ziarnem stałym (np. mulberry32 z ziarnem z oznaczenia obiektu), żeby `catalog.json` był
    powtarzalny między budowami.
  - Parametry losowane z rozkładów normalnych. V⊙ i V̄s losowane razem z korelacją −0,99 (Reid 2019, §4);
    pozostałe korelacje pomijamy (uproszczenie względem jądra KDE z Wenger i in. 2020).
  - Prędkość obiektu: N(v, 5 km/s). *[decyzja wykonawcy: rozrzut ruchów własnych gazu; sprawdzić, czy Reid 2014/2019
    lub Wenger 2018 podają lepszą wartość, i wpisać źródło w komentarzu]*
- **Rozwiązanie:**
  - Odległość wzdłuż linii widzenia, dla której model daje v. Bisekcja na przedziałach, na których prędkość
    zmienia się monotonicznie: [0, punkt styczny] i [punkt styczny, 25 kpc] w wewnętrznej Galaktyce, [0, 25 kpc]
    w zewnętrznej. Przeszukiwanie siatki w prototypie (14.11) dawało ok. 0,4 s na obiekt przy 2000 próbkach,
    za wolno dla ponad 1000 obiektów.
  - Prototyp potwierdził geometrię: przy płaskiej krzywej 220 km/s i R₀ = 8,5 kpc wynik zgadza się ze wzorem
    analitycznym. Uwaga: w II ćwiartce (ramię Perseusza) wartości wychodzą o ok. 25–30 % mniejsze niż u Russeil
    2003 (płaska krzywa), bo model A5 uwzględnia ruchy własne obszarów. Mimo to dla W3(OH) dają 3,1 kpc przy
    paralaksie 1,95 kpc. Ruchy strumieniowe w ramionach to znane ograniczenie metody, dlatego jest ona na końcu kolejności.
  - Zewnętrzna Galaktyka (90° < l < 270°): jedno rozwiązanie.
  - Wewnętrzna Galaktyka: dwa rozwiązania.
    - Wybór: `KDA` z WISE (N, F; T = punkt styczny), bez niego bliższe. Obszary widoczne optycznie są prawie
      zawsze bliższe.
    - Prędkość poza punktem stycznym daje odległość punktu stycznego.
  - Próbka bez rozwiązania odpada. Gdy odpada ponad połowa, odległości nie ma.
- **Wynik:** mediana i σ = (p84 − p16)/2.
- **Opis źródła:** wspólne wpisy tabeli `sources` dla par (tracer, katalog prędkości), np.
  „odległość kinematyczna: v_LSR z Hα (Russeil 2003), krzywa rotacji Reid i in. 2019 (A5), Monte Carlo” i źródło
  „Reid i in. 2019, ApJ 885, 131”, ref `2019ApJ...885..131R`. Bez wartości prędkości w tekście (inaczej setki wpisów).
- **Czas:** ok. 300–1500 obiektów × 2000 próbek. Jeśli budowa wyraźnie się wydłuży (> 30 s), zmniejszyć liczbę próbek
  albo przyspieszyć szukanie; decyzja wykonawcy z pomiarem.

## Próg 50 % (zmiany poza H II)
- `src/lib/distance.ts`: `MAX_RELATIVE_UNCERTAINTY = 0.5`, komentarze „20 %” → „50 %”.
- `withWikidataFallback` i licznik „Wikidata zamiast σ > 20 %” → „σ > 50 %”.
- Teksty w UI biorą wartość ze stałej (`PhotoEditing.tsx`); sprawdzić inne miejsca z „20 %” (`grep`).
- Testy z progiem 20 % (`distance`, `photo`, `distancePilot`, `auditRegression` i inne) zaktualizować.
  Różnice w fixture pilotażu (np. NGC 5169: CF4 z σ 26 % zamiast Wikidata) opisać powodem.
- `docs/odleglosci/stan.md`: nowa decyzja z datą, nowe źródła i liczby z logu. `CLAUDE.md`: lista źródeł łańcucha.

## Testy (src/lib, Vitest)
- **Kinematyka:**
  - Obieg: v(d) z parametrami nominalnymi i rozwiązanie z powrotem daje d (zewnętrzna Galaktyka, oba rozwiązania wewnętrznej).
  - Porównanie z opublikowanymi odległościami kinematycznymi w tolerancji ok. 15 %: kilka obszarów WISE z `Meth`
    Kin, które liczono krzywą Reid 2014 (bardzo bliską A5), albo przykłady z Wenger i in. 2018. Wybór przypadków
    należy do wykonawcy.
  - Powtarzalność: dwa wywołania z tym samym obiektem dają identyczny wynik.
  - Brak rozwiązania (prędkość niezgodna z kierunkiem) daje null.
- **Parsowanie i dopasowanie** na krótkich fragmentach TSV: Foster & Brunt po nazwie, WISE po `HIIName` i pozycji,
  Russeil po `HaName` z „=”.
- **Kolejność łańcucha:**
  - Parallax przed Foster & Brunt przed WISE Kin przed własną kinematyką.
  - Pomiar z σ > 50 % przechodzi do kolejnego kroku.
  - Niezgodne prędkości dają brak wartości kinematycznej.
- **Wartości kontrolne po przebudowie** (test lub wpis w stan.md):
  - Sh2-180 ≈ 5,41 kpc (Foster & Brunt);
  - Sh2-183 6,6 kpc (WISE);
  - Sh2-252 2,23 kpc (Foster & Brunt);
  - Sh2-187 1,58 kpc (Foster & Brunt, σ 20,3 %, teraz w 3D);
  - Sh2-181 z kinematyki (wynik do zapisania, porównać z regresorem 2,2 kpc).

## Zostawione wykonawcy
- Dokładna funkcja PRNG i liczba próbek po pomiarze czasu.
- Promień dopasowania pozycji do WISE (propozycja: `max(Rad, majArcmin/2)`, nie więcej niż 0,25°, najbliższy region).
- Czy CN bez Hunt & Reffert dostaje kroki H II (propozycja: tak).
- Nazwy liczników w logu budowy.
