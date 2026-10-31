# Automat v2: kontury ciemnych mgławic — dokument projektu

Data: 30.10.2026. Status: do akceptacji użytkownika. Projekt badawczy poza aplikacją (katalog `output/`, ignorowany przez git).

## 1. Cel i uzasadnienie

Poprawić automatyczne wyznaczanie warstw L1/L2/L3 (L3 ⊆ L2 ⊆ L1) ciemnych mgławic względem kryterium użytkownika: **wyższe IoU z zaakceptowanymi konturami = lepiej**. Użytkownik świadomie przyjmuje, że to zgodność z wyborem redakcyjnym, a nie z niezależną granicą fizyczną.

Najlepszy dotąd jest automat z 29.10 (`output/kontury-2026-10-29-automat/`). Na 8 celach porównania z 30.10 daje IoU L1 0,66, L2 0,60 i L3 0,51. Wszystkie późniejsze przebiegi go porzuciły i wypadły gorzej: kalibracja E, PF/SCIMES, AKARI/WSSA, CDD + LCC + Higra (L1 ≤ 0,44, L2 ok. 0,35). Szczegóły: `output/kontury-2026-10-30-higra-cdd-lcc/raport_higra_cdd_lcc.md`, `recon_automat_eval.json`, `diag_argon*.json`.

Diagnoza uzgodniona z niezależnym agentem-weryfikatorem:
- Przewagę automatu daje częściowo wspólny generator. Zaakceptowane kontury powstały tą samą funkcją `run_hybrid_target` (ręczne konfiguracje odtwarzają je z IoU 0,96–1,00).
- Rozlewaniu zapobiegają dwa człony odległościowe w `automat.isolate()`:
  - miękki priorytet `geo = exp(−d²/2R²)` (w `iso = lp·(0,36 + 0,64·geo)`);
  - twardy znacznik tła dla `d > 2,2R`.

  Tu `d` to odległość euklidesowa od szkieletu obiektu.
- Te same człony **ucinają wyrostki** przy globalnym R = 18′. Dotyczy to części Ducha (vdB 141), płatów Gekona (LBN 437) oraz płatów SE i NW B 22. Przyczyną nie są siodła ani próg 0,24. Scalanie po siodłach odrzucono: powiększało pola ×1,4–33.

Użytkownik zdecydował (30.10): **limit zasięgu od szkieletu, liczony wzdłuż grzbietów pyłu, może być głównym hamulcem rozlewania.**

## 2. Cele, nie-cele, anty-cele

**Cele**
- Sprawdzić w jednej rundzie dwie zmiany członu odległościowego automatu:
  - (A) siatkę globalnego R i podłogi geo;
  - (B) odległość geodezyjną zamiast euklidesowej.
- Raportować L1, L2 i L3 oraz zagnieżdżenie po eksporcie.

**Nie-cele**
- Bez nowych danych z sieci.
- Bez AKARI, WSSA, Guided Filter, CDD, LCC, progów w σ i zamiany p353 na τ353.
- Bez scalania maksimów po siodłach (I1).
- Bez zmian w aplikacji ani w `scripts/data/dark-outlines.json`. Wdrożenie tylko na osobną prośbę.

**Anty-cele (porażka, nawet gdy IoU wzrośnie)**
- Rozlewanie: duże przyrosty pól w polach, które były dobre.
- Użycie zaakceptowanej geometrii jako wejścia predykcji (także pośrednio: kadr, punkty, wybór pól do bramki).
- Parametry dobierane dla pojedynczego obiektu.
- Druga runda strojenia po obejrzeniu wyników.

## 3. Ograniczenia

- **Interpreter:** `output/kontury-2026-10-29-mto-higra/.venv/Scripts/python.exe`, z `PYTHONDONTWRITEBYTECODE=1` i lokalnym `MPLCONFIGDIR`.
- **Dane:** istniejące pamięci podręczne pól automatu (`kontury-2026-10-29-automat/cache/*.npz`) oraz maski CO z `kontury-2026-10-30-pf-scimes/<cel>/maps.npz` (tylko dla kroku 4).
- **Zapisy:** wyłącznie w nowym katalogu `output/kontury-2026-10-3x-automat-v2/`. Moduły automatu tylko importowane, nie modyfikowane.
- **Weryfikacja:** sumy SHA-256 plików aplikacji (`public/data`, `scripts/data`, `src/lib/constellations.ts`) przed i po pracy, zapisane w `verification.json`.
- **Protokół:** `protocol.json` zamrożony przed jakąkolwiek oceną względem wzorca. Każda zmiana po ocenie jest jawną poprawką z uzasadnieniem.

## 4. Decyzje podjęte (użytkownik + uzgodnienie z weryfikatorem)

1. **Baza.** Konfiguracja końcowa automatu z 29.10 (`run_final.py`):
   - prominencja `translucent`, okno maksimów 10′ (≥ 0,75), most MST ≥ 0,25;
   - przyciąganie 6′, R = 18′, t = 0,24;
   - reguła pola ze zdjęciem: R 13′, t 0,21, domieszka 0,3;
   - `nmode='tlo'`.

   Siatka natywna pól automatu (~0,6′). **Bez PRESERVE i bez BiRefNet** w selekcji i LOO; Żyrafa z BiRefNet tylko w raporcie osobnym.
2. **Grupy.** Do oceny IoU służą grupy sprzed reguły kadru (`id + also`, bez `EXTRA_GROUP`). Wariant z regułą kadru tylko raportowany, bez IoU dla 6 obiektów z nieaktualnym wzorcem (NGC 1333, LDN 1448, LDN 1503, LDN 800, LDN 1317, LDN 1089).
3. **Odtworzenie bazy przed czymkolwiek.** Punktem odniesienia jest `auto_kontury_przed_birefnet.json` (20:49), ostatni wynik obecnego kodu, bo `automat.py` i `foto.py` zmieniono po `proba5.json`. Pole `iou` każdego z 13 obiektów (sam automat, grupy z regułą kadru) musi się zgadzać z tolerancją ±0,005. Niezgodność zatrzymuje pracę. *[moja decyzja]*
   - Odchylenie od `proba5.json` tylko raportujemy.
   - Dopiero po odtworzeniu przełączamy grupy na sprzed reguły kadru (pkt 2).
4. **Warianty (jedna runda):**
   - A: R ∈ {18, 21, 24}′ × podłoga geo ∈ {0,36; 0,55}, czyli 6 konfiguracji (baza = 18′ / 0,36).
     - Reguła pola ze zdjęciem (R 13′, t 0,21) bez zmian, więc R nie działa w polach ze zdjęciem (vdB 141, LDN 1295, LDN 1296, LDN 1317).
     - Wśród 7 obiektów wyboru R zmienia LBN 437, B 22, LDN 717 i LDN 1245. Zmienia też 5 pól spoza wyboru (NGC 1333, LDN 1448, LDN 1503, LDN 800, LDN 1089); dlatego bramka obejmuje także A (pkt 5).
     - **Podłoga geo 0,55 działa we wszystkich polach, także ze zdjęciem.** Zmienia tylko podłogę `iso` w `isolate()`; podłoga L3 w `inner_layers` (0,42 + 0,58·geo) zostaje. *[moja decyzja, zgodna z uzgodnieniem z weryfikatorem]*
   - B: odległość geodezyjna w `geo` i w znaczniku 2,2R, przy parametrach bazy. Koszt jak w `automat.skeleton_from`: `clip(1 − 0,88·lp^0,75 + 0,02, 0,02, 2)`, w jednostkach odległości kątowej. W tle (lp ≈ 0) koszt ≈ 1, więc odległość ≈ euklidesowa.
5. **Bramka dla każdego kandydata (A i B) przed oceną IoU.** Liczona bez wzorca, na maskach z samych map, na grupach sprzed reguły kadru:
   - mediana stosunku pól kandydat/baza po 13 obiektach ∈ [0,8; 1,3];
   - żaden obiekt < 0,5 ani > 2,0.

   Kandydat, który nie przejdzie, odpada przed LOO. Rozlewanie jest anty-celem także dla A, więc bramka nie dotyczy tylko B. *[moja decyzja]*

   Kontrola zapisana z góry na 7 polach „OK na zdjęciu” z 29.10 (NGC 1333, LDN 1448, LDN 800, LDN 1317, LDN 1089, LDN 717, LDN 1245):
   - Sprawdza dwie rzeczy: stosunek pól 0,8–1,25 i to, czy żaden punkt katalogowy, który baza miała w L1, nie wypada.
   - Warunek punktów jest względny wobec bazy, na grupach sprzed reguły kadru.
   - Kontrola jest **tylko raportem**: nie odrzuca kandydata i nie uruchamia hamulca CO. *[moja decyzja]*
6. **Hamulec CO (warunkowy).** Tylko jeśli B nie przejdzie górnej bramki. Wtedy jedna próba: B + znaczniki tła z maski CO poszerzonej o 15′, ta sama bramka, bez dalszych prób.
   - Maska: `co_0.3` z `pf-scimes/<cel>/maps.npz`, gdy niepusta, w przeciwnym razie `co_0.6`. Przeniesiona na siatkę automatu.
   - Znaczniki tylko dalej niż R od szkieletu, z odległością liczoną geodezyjnie, spójnie z B.
   - Hamulec działa tylko tam, gdzie maska istnieje. Nie obejmuje LBN 437, LDN 717, LDN 1245 i LDN 1503 (brak masek), więc nie ochroni plateau LDN 717.

   *[moja decyzja]*
7. **Wybór i LOO.**
   - Zbiór kandydatów: 6 konfiguracji A + B, jeśli przeszło bramkę.
   - Kryterium: średnie IoU_L1 po eksporcie na 7 porównywalnych obiektach (LBN 437, B 22, vdB 141, LDN 717, LDN 1245, LDN 1295, LDN 1296).
   - Remis (< 0,03) rozstrzyga mediana, potem IoU_L2.
   - Zagnieżdżone LOO na tych 7; 6 pozostałych z grupami sprzed reguły kadru raportowanych osobno.
   - Jeśli wygra krawędź siatki (R 24), siatki nie rozszerzamy.
8. **L2 i L3.** Z `automat.inner_layers` (0,44 / 0,64 względem szczytu `iso`).
   - Rozdział wspólnych L2/L3 osobnych wpisów zlewnią (pary LDN 1295/1296 i NGC 1333/LDN 1448), jak w `run_final.py`, zostaje we wszystkich wariantach. *[moja decyzja]*
   - Raport: IoU_L2, pokrycie L2, IoU_L3.
   - Zagnieżdżenie L3 ⊆ L2 ⊆ L1 po eksporcie to warunek twardy: przycięcie po eksporcie, z raportem naruszeń przed przycięciem.
   - L2/L3 Żyrafy liczone z map, bez przycinania BiRefNet.
9. **Kontrola na zdjęciach** (vdB 141, LDN 1295, LDN 1296, LDN 1317).
   - Nakładki przez macierz dopasowania gwiazd i kompas z WCS.
   - Kryteria zapisane przed oceną: punkty katalogowe w L1; werdykt OK / ucina X / rozlewa się w Y.
   - Werdykty raportowane, nie służą do wyboru.
10. **Metryki tylko raportowane.**
    - Dziury zaakceptowanego L1 (LBN 437, LDN 1317): udział wyłączony i czy dziura jest zamknięta.
    - Odległość krawędzi (′) i pole (arcmin²).
    - Różnice parami z bazą i minimum.

## 5. Oczekiwania i ryzyka (do protokołu)

- **Mały i mieszany zysk.** Weryfikator szacuje B 22 przy R 27 na 0,73 → 0,87 (surowo) i LBN 437 przy R 25 na 0,77 → 0,69.
- **Szum.** Przy 7 obiektach różnice < 0,03 to szum. Zagnieżdżone LOO ma dużą wariancję.
- **Wspólny generator.** IoU faworyzuje warianty z rodziny `run_hybrid_target`.
- **Granice danych:**
  - zachodnia część Ducha (lp ≈ 0,18; brak sygnału submm/NIR) — zysku nie przewidujemy, a R z siatki nie obejmuje Ducha (pole ze zdjęciem);
  - LDN 1296 (IoU ≈ 0,29).
- **Plateau.** Odległość geodezyjna może rozlewać się po jasnym plateau (LDN 717, LDN 800, pole Żyrafy); bramka ma to wyłapać.
- **Sprzężenie z regułą kadru.** Normalizacja `iso/max` łączy ją z progami: jaśniejszy dołączony obiekt ścina słabsze części grupy.
- **Eksport.** Wszystko oceniane po eksporcie; różnica między maską surową a eksportem wynosi 0,01–0,03.

## 6. Wyniki (artefakty)

- `protocol.json`, `verification.json` (SHA-256 przed i po), `metrics.csv` (wiersz = obiekt × wariant × warstwa), `summary.json` (bramka, LOO, pary, zagnieżdżenie).
- Plansze porównawcze baza vs wybrany wariant na 6 mapach automatu oraz `photo_new.png` dla 4 pól ze zdjęciem.
- Raport `raport_automat_v2.md` w stylu poprzednich raportów (tabele, źródła, werdykty, ograniczenia).

## 7. Pozostawione wykonawcy

- Implementacja odległości geodezyjnej (np. `skimage.graph.MCP_Geometric` od pikseli szkieletu), przy zachowaniu kosztu z pkt 4.4.
- Organizacja kodu, plansz i testów, w tym test syntetyczny: na jednorodnym tle odległość geodezyjna = euklidesowa z dokładnością do dyskretyzacji.
- Kolejność wewnątrz kroków, o ile ocena względem wzorca następuje po zamrożeniu predykcji.

## 8. Poza zakresem tej rundy

Tryb półautomatyczny, w którym użytkownik wybiera R spośród 3 poziomów dla obiektu, to uczciwa alternatywa wobec luki do wyroczni (0,74 → 0,90). To decyzja produktowa użytkownika, nie część eksperymentu.
