# Zdjęcia w widoku 3D

W oknie **Niebo → Pozycja 3D** (modal o wymiarach Obserwatorium, przełącznik skal Droga Mleczna i Wszechświat lokalny w pasku narzędzi; Esc zamyka okno) przycisk **Rozłóż zdjęcie** pozwala przesłać JPEG, PNG, WebP, TIFF lub FITS o rozmiarze do 40 MiB. Dla JPEG, PNG, WebP i TIFF obowiązuje też limit 64 mln pikseli. Obraz jest orientowany według EXIF i pomniejszany do maksymalnie 3200 pikseli dłuższego boku. Ten sam obraz otrzymuje rozwiązanie WCS i służy jako źródło wszystkich wycinków. FITS jest przedstawiany jako automatycznie rozciągnięty podgląd monochromatyczny.

Po imporcie sprawdź propozycje katalogowe, zaznacz widoczne obiekty i popraw okręgi przez przeciąganie. Cyjanowy uchwyt zmienia promień. Pola X, Y i promienia tylko wyświetlają aktualne wartości. Korekta okręgu nie przesuwa pozycji astronomicznej. Edycja (przycisk **Edytuj wycinki**) to osobny widok okna w obu skalach: płaskie zdjęcie na całej scenie nad paskiem zdjęcia, panel wycinków w kolumnie z prawej, scena 3D wstrzymana.

- **Droga Mleczna:** zdjęcie widać w scenie 3D jako przerywaną linię widzenia od Ziemi, stożek pola (cztery promienie do narożników kadru z półprzezroczystymi ściankami, w prawdziwym kącie zdjęcia) i znaczniki wycinków w kolorach typów. Wycinek z odległością stoi w swoim położeniu; dalszy niż 150 tys. lś leży na końcu linii z podpisem „poza skalą”, a bez odległości na linii 28 tys. lś od Ziemi z przerywanym obrysem i podpisem „odległość nieznana” (takie wycinki dzielą jeden znacznik i podpis). Podpis stoi przy swoim znaczniku: z prawej, z lewej, nad nim albo pod nim, w pierwszym miejscu bez nakładania. Kierunek i osie kadru wynikają z WCS (środek i macierz CD; kadr lustrzany dostaje obrót z odwróconą osią x). Pasek zdjęcia: **Rozłóż zdjęcie 3D**, **Edytuj wycinki**, **Zmień zdjęcie**, **Usuń**.
- **Wszechświat lokalny:** bez zmian: suwak i przycisk odtwarzania pokazują przejście od fotografii do kolumn z liniami do położeń w scenie. Przycisk **3D** przełącza na Drogę Mleczną i od razu nurkuje do Obserwatorium. Skala po wczytaniu zdjęcia wynika z jego wycinków (same galaktyki: Wszechświat lokalny).

**Nurkowanie** (Rozłóż zdjęcie 3D) prowadzi jedną ciągłą sceną do Obserwatorium 3D (niżej), w ok. 3,1 s, prosto od bieżącej kamery Drogi Mlecznej (bez oddalania):
1. nurkowanie (2,2 s): kamera zbliża się logarytmicznie do Ziemi, do ok. 1 lś na jednostkę Obserwatorium, i w pierwszej części obraca się wokół Ziemi do skośnego widoku Struktura (pole widzenia 50° → 40°, znacznik Ziemi płynnie do wielkości Ziemi Obserwatorium); napisy w scenie gasną od razu, tło Drogi Mlecznej później, stożek rozchyla się do kąta ostrosłupa Obserwatorium (zabieg poglądowy: ostrosłup jest umowny, ok. 71°, pole zdjęcia zwykle 0,5–5°), pojawiają się Ziemia, ostrosłup, oś, płaskie zdjęcie i siatka;
2. wejście (0,9 s): kamera zostaje w widoku Struktura, panele wsuwają się, potem samo rusza rozkładanie (5 s).

Szwem jest widok Obserwatorium „Struktura” (płaskie zdjęcie, Ziemia, oś), bez przelotu przez widok „Z Ziemi”: most układów `p_DM = Ziemia + R · (p_obs − Ziemia_obs) · u` (R z bazy kadru, u w tys. lś na jednostkę) daje w obu scenach tę samą Ziemię (położenie i wielkość) i linię widzenia. Przycisk **Droga Mleczna** w stanie zdjęcia odtwarza nurkowanie wstecz (zwijając rozkładanie do 0%) i wraca do pozy kamery sprzed wejścia. Klik albo klawisz w trakcie przejścia przeskakuje do stanu końcowego. Przy ograniczonym ruchu (`prefers-reduced-motion`) przejście jest cięciem: od razu rozłożone zdjęcie (100%) i z powrotem.

Lista „Źródło odległości” pozwala wybrać wartość z katalogu aplikacji (Wikidata) lub konkretny opublikowany pomiar z SIMBAD i, dla galaktyk/grup galaktyk, NED. Każda opcja pokazuje odległość, źródło, kod publikacji i metodę, jeśli podano. Wybrany pomiar ustawia pozycję 3D i zapisuje się razem ze zdjęciem. Nie uśredniamy różnych publikacji ani automatycznie nie wybieramy najnowszej. Zakres pomiaru (obiekt/kompleks) nadal ustawiasz samodzielnie; nie przypisujemy odległości pobliskiego obiektu. Stare, zapisane wartości pozostają dostępne. Brak danych i awaria usługi mają odrębne komunikaty.

SIMBAD pobieramy przez oficjalną kopię IDIA (TAP/ADQL, tabela mesDistance), NED przez DistancesOfObject (VOTable). Jednostki pc/kpc/Mpc są przeliczane na lata świetlne. Granice/kwalifikowane pomiary SIMBAD nie są traktowane jako dokładna pozycja. Symetryczny błąd SIMBAD może być pokazany jako ±; błędy asymetryczne oraz błędy modułu odległości NED zachowujemy w opisie źródła, bez udawania symetrycznej niepewności w latach świetlnych. Odnośnik prowadzi do publikacji w ADS.

Brak odległości oznacza strzałkę kierunku; jej koniec nie jest pozycją obiektu. Obiekty poza wybraną skalą otrzymują odpowiedni opis. W skali Wszechświata pobliskie obiekty są opisane jako należące do Drogi Mlecznej. Karty nie przedstawiają fizycznego rozmiaru obiektów.

Ostatnie zdjęcie wraz z WCS, zaznaczeniami i korektami zapisuje się lokalnie w IndexedDB przeglądarki. Ponowne wejście nie uruchamia solvera. Fotografie nie są przesyłane do zewnętrznych usług; zapytania o pomiary zawierają tylko publiczne oznaczenie katalogowe obiektu. Zmieniony lub inaczej wykadrowany obraz należy przesłać ponownie.

## Obserwatorium 3D

Stan zdjęcia w oknie „Pozycja 3D” (po nurkowaniu), w którym gwiazdy z kadru i włączone wycinki stoją w swoich odległościach wzdłuż linii widzenia. Układ i interakcje wzorowaliśmy na oknie „3D distances” SyQon Studio; kolory, krój i nazwy są własne.

- **Gwiazdy:** 1000 najjaśniejszych gwiazd Gaia DR3 w kadrze. Pozycje przenosimy ruchem własnym na epokę 2025,0 (tę samą co katalog solvera) i rzutujemy na piksele tym samym WCS i tą samą funkcją mostu (`tracker-skyshot project`) co wycinki. Barwa punktu wynika z BP−RP, rozmiar z jasności G.
- **Odległości gwiazd:** geometryczne odległości Bailer-Jones i in. (2021) z paralaks Gaia EDR3 (mediana i przedział 16.–84. percentyla). Podajemy je tylko przy ϖ/σ ≥ 5, czyli błędzie względnym paralaksy do 20%. Słabsze, ujemne i brakujące paralaksy dają gwiazdę bez odległości: zostaje na zdjęciu, nie dostaje fikcyjnej głębi.
- **Oś:** logarytmiczna, w pełnych dekadach od najbliższego do najdalszego obiektu, wspólna dla gwiazd i wycinków. Ziemia stoi umownie przed płaszczyzną zdjęcia, bo zero nie ma miejsca na osi logarytmicznej. Ostrosłup od Ziemi do narożników kadru pokazuje pole widzenia, a widok „Z Ziemi” podaje jego prawdziwy rozmiar w stopniach i w tarczach Księżyca (31 minut kątowych).
- **Sterowanie:**
  - suwak rozłożenia: przy 0% płaskie zdjęcie, przy 100% głębia z odległości; przyciski początku i końca po lewej skaczą do 0% i 100%, „Rozłóż zdjęcie” odtwarza przejście;
  - widoki Struktura, Z Ziemi, Z góry i Z boku, „Dopasuj”, „Leć do zaznaczenia”, klawisze WASD;
  - grupy obiektów (wszystko, gwiazdy, mgławice i gromady, galaktyki) z komunikatem przy pustej grupie;
  - histogram odległości w skali logarytmicznej: przeciągnięcie wybiera przedział, dwuklik go usuwa, a dwa suwaki pod spodem obsługują klawiaturę;
  - wirtualizowana lista po odległości z wyszukiwaniem i inspektorem obiektu (miniatura z wycinka zdjęcia, odległość, przedział, źródło).
- **Droga Mleczna** (zakładka skali, obok ścieżka „Droga Mleczna › nazwa zdjęcia”): nurkowanie wstecz do sceny Drogi Mlecznej z linią widzenia; **Wszechświat lokalny** przełącza od razu, bez nurkowania.
- **Brak eksportu wideo:** zdecydował tak użytkownik 5.11.2026.

Gwiazdy pobieramy raz, gdy zdjęcie pojawi się w skali Drogi Mlecznej (scena Obserwatorium jest wtedy kompletna przed nurkowaniem), i zapisujemy w projekcie (IndexedDB, `PhotoProject` w wersji 2). Starsze zapisy przechodzą migrację z `stars: null` i pobierają gwiazdy przy pierwszym otwarciu. Serwer dodatkowo buforuje udane odpowiedzi według WCS. Prywatność bez zmian: do GAVO trafiają tylko środek i promień pola, a zdjęcie i WCS nie opuszczają serwera.

Sprawdzenie na zdjęciu IC 434 z konuzastro.pl (2798 × 2827 px, 1,28″/px):
- 510 z 580 gwiazd wykrytych przez solver dopasowano do Gaia (≤ 1″);
- rzut Gaia różni się od wykrycia o 0,16 px w medianie, 0,48 px w 95. percentylu i najwyżej o 0,78 px;
- 900 z 1000 gwiazd ma odległość;
- jasne gwiazdy gromady σ Ori wychodzą 362–405 pc (literatura: 387,5 pc).

### Ograniczenia obserwatorium

- Gaia nie zawiera części najjaśniejszych gwiazd (około G < 3). Na przykład Alnitak w kadrze IC 434 nie ma odpowiednika w DR3, więc na liście go brakuje.
- Odległości Bailer-Jones zależą od modelu Galaktyki (prior). Przy ϖ/σ ≥ 5 ten wpływ jest mały, ale nie zerowy. Gwiazdy tła w mgławicach mogą mieć zawyżoną odległość, gdy ekstynkcja zaburza fotometrię.
- Oś jest logarytmiczna, a położenie poprzeczne wynika z piksela zdjęcia. Scena nie pokazuje fizycznych odstępów poprzecznych ani kątów, a karty nie oddają rozmiarów obiektów.
- Pole o promieniu ponad 10° odrzucamy, bo zapytanie stożkowe byłoby zbyt duże.

## Przygotowanie serwera

Wymagane: Rust z narzędziami natywnego linkowania, Git, Python 3.11+ i istniejące zależności npm. Windows: standardowy Rust MSVC wymaga C++ Build Tools. Alternatywnie skrypt wykorzystuje Rust GNU i lokalny MinGW, jeśli znajduje się w `scripts/.cache/mingw/mingw64/bin`.

```
npm.cmd run setup:skyshot
npm.cmd run dev
```

Instalator buduje mały program `tracker-skyshot` z przypiętym Skyshot Solver `76f01812fe0fc0fcdcbeba1ab89b339b19e1bc9e` i pobiera oficjalny indeks Full learned (około 838 MB, miejsce z archiwum około 2 GB). Kod i dane pozostają w ignorowanym `scripts/.cache`. Na serwerze produkcyjnym używaj `npm.cmd run build`, następnie `npm.cmd start`; samo statyczne hostowanie `dist` nie uruchamia astrometrii.

Można wskazać istniejące instalacje przez `SKYSHOT_BRIDGE` (ścieżka programu tracker-skyshot) i `SKYSHOT_INDEX` (katalog indeksu). Endpointy `/api/photo/status`, `/api/photo/solve`, `/api/photo/distances?id=...` i `POST /api/photo/stars` (JSON z `wcs`, `width`, `height`) działają w Vite i serwerze produkcyjnym. Po aktualizacji kodu mostu uruchom ponownie `npm.cmd run setup:skyshot` (podkomenda `project`). Serwer rozwiązuje jedno zdjęcie naraz, ogranicza czas procesu i usuwa swoje pliki tymczasowe po zakończeniu. Pobieranie pomiarów nie wymaga solvera; potrzebuje połączenia z SIMBAD/NED. Gwiazdy wymagają mostu (rzut przez WCS) i połączenia z GAVO DC, z limitem 30 s na zapytanie. Każde źródło ma limit czasu 15 s, pomyślne odpowiedzi mogą być przechowywane przez przeglądarkę przez godzinę.

## Ograniczenia i źródła

Propozycja katalogowa nie dowodzi widoczności obiektu na ekspozycji. Nakładające się obiekty mają niezależne wycinki, zawierające te same fragmenty tła. RMS i dopasowania przy brzegach są diagnostyką solvera, a nie niezależną walidacją. Zdjęcie z niewystarczającą liczbą gwiazd lub poza zakresem indeksu może pozostać nierozwiązane; dla bardzo wąskich pól upstream oferuje dodatkowy indeks DEEP, którego ten instalator nie pobiera.

- [Skyshot Solver: kod i licencja Apache 2.0](https://github.com/ashtree74/skyshot-solver)
- [Indeksy i zakresy pól](https://skyshot.app/downloads/)
- [Pochodzenie i oddzielne warunki danych](https://github.com/ashtree74/skyshot-solver/blob/76f01812fe0fc0fcdcbeba1ab89b339b19e1bc9e/docs/DATA-PROVENANCE.md)
- [SIMBAD: format pomiarów i bibliografia](https://simbad.idia.ac.za/simbad/sim-display?data=meas)
- [NED: dokumentacja API](https://ned.ipac.caltech.edu/Docs::API/)
- [Gaia DR3: Gaia Collaboration, Vallenari i in. 2023, A&A 674, A1](https://ui.adsabs.harvard.edu/abs/2023A%26A...674A...1G/abstract); [instrukcje cytowania i podziękowania DR3](https://gea.esac.esa.int/archive/documentation/GDR3/Miscellaneous/sec_credit_and_citation_instructions/). Dane Gaia: licencja [CC BY-NC 3.0 IGO](https://www.cosmos.esa.int/web/gaia-users/license), czyli użytek niekomercyjny; do użytku komercyjnego obowiązują warunki ESA. Właściciel potwierdził 5.11.2026, że aplikacja na konuzastro.pl jest niekomercyjna; zmiana tego statusu wymaga ponownej oceny danych Gaia. Uznanie autorstwa „ESA/Gaia/DPAC” stoi w legendzie obserwatorium.
- [Odległości: Bailer-Jones, Rybizki, Fouesneau, Demleitner, Andrae 2021, AJ 161, 147](https://ui.adsabs.harvard.edu/abs/2021AJ....161..147B/abstract), licencja CC BY 4.0.
- [GAVO Data Center (Heidelberg): TAP z tabelami `gaia.dr3lite` i `gedr3dist.main`](https://dc.zah.uni-heidelberg.de/). ESA Gaia Archive i CDS 5.11.2026 nie odpowiadały z sieci, w której testowaliśmy.

Licencja kodu nie zastępuje warunków katalogu, modelu i indeksu. Dane nie są dołączane do repozytorium ani paczki frontendowej. Przed publicznym rozpowszechnianiem indeksów trzeba sprawdzić ich odrębne warunki; obecna integracja służy lokalnemu użyciu osobistemu.
