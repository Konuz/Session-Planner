# Zdjęcia w widoku 3D

W oknie **Niebo → Pozycja 3D** (modal o wymiarach Obserwatorium, przełącznik skal Droga Mleczna i Wszechświat lokalny w pasku narzędzi; Esc zamyka okno) przycisk **Rozłóż zdjęcie** pozwala przesłać JPEG, PNG, WebP, TIFF lub FITS o rozmiarze do 40 MiB. Dla JPEG, PNG, WebP i TIFF obowiązuje też limit 64 mln pikseli. Obraz jest orientowany według EXIF i pomniejszany do maksymalnie 3200 pikseli dłuższego boku. Ten sam obraz otrzymuje rozwiązanie WCS i służy jako źródło wszystkich wycinków. FITS jest przedstawiany jako automatycznie rozciągnięty podgląd monochromatyczny.

Po imporcie sprawdź obiekty z rozwiązania i zaznacz, które pokazać w 3D. Okręgi pokazują położenie i rozmiar z rozwiązania astrometrycznego i nie da się ich przesuwać ani zmieniać ich promienia; obiekt wybiera się z listy albo kliknięciem obwódki okręgu. Edycja (przycisk **Edytuj wycinki**) to osobny widok okna w obu skalach: płaskie zdjęcie na całej scenie nad paskiem zdjęcia, panel wycinków w kolumnie z prawej, scena 3D wstrzymana. Na zdjęciu są okręgi wszystkich obiektów rozwiązania (mniejsze na wierzchu); obiekty spoza 3D (bez ustalonej odległości lub odznaczone) są bledsze.

- **Kamera w obu skalach:** patrzy z boku linii Ziemia–cel i znad płaszczyzny Galaktyki (dla każdego kierunku na niebie co najmniej 60° od linii widzenia), a odległość dobiera tak, żeby Ziemia, cel i znaczniki mieściły się w kadrze. Wybranie innego obiektu przestawia kamerę przelotem (0,9 s). Obie skale to jedna scena (od 14.11.2026): zakładka przelatuje kamerą bliżej albo dalej (1,6 s, odległość od celu zmienia się geometrycznie; przy ograniczonym ruchu cięcie), a zmiana obiektu, która przełącza też zakładkę, to jeden przelot. Zakładka ma swoje warstwy w pełni, jak dawna osobna scena. W Drodze Mlecznej pierścienie, kopuły, galaktyki i modele Grupy Lokalnej pojawiają się dopiero po oddaleniu kółkiem (kamera 600–1200 j. od centrum Galaktyki), a we Wszechświecie lokalnym punkty obiektów Galaktyki i Ziemia dopiero z bliska (500–250 j.). W przelocie zakładek krycia obu zakładek się przenikają, a nurkowanie wygasza te warstwy i ich podpisy tak jak resztę tła. Gwiazdozbiory 3D, filtr rodzajów, suwak galaktyk, podpisy i kliknięcia obiektów tła należą do swojej zakładki. Wybrany obiekt ma celownik z klamer L, linię od Ziemi, pion do płaszczyzny Galaktyki i linię w tej płaszczyźnie.
- **Sterowanie kamerą** (obie skale): lewy przycisk myszy obraca wokół celu, prawy rozgląda się z miejsca, środkowy przesuwa w płaszczyźnie ekranu, kółko zbliża do miejsca pod kursorem; WASD lub strzałki to lot, Q i E w dół i w górę, Shift cztery razy szybciej. Prędkość lotu (60% odległości na sekundę) i przesuwania zależy od odległości kamery do najbliższego obiektu: Ziemi, wybranego obiektu, środka skali albo punktów zdjęcia. Po wybraniu pojedynczego gwiazdozbioru przycisk **Pokaż gwiazdozbiór z Ziemi** (ikona aparatu na pasku narzędzi) przenosi kamerę za Ziemię i rzutuje gwiazdy tego gwiazdozbioru na płaszczyznę widoku z Ziemi; ponowne kliknięcie przywraca poprzednią pozę. Nazwy gwiazd wyświetlają się w nakładce DOM bez nakładania.
- **Droga Mleczna:** zdjęcie widać w scenie 3D jako przerywaną linię widzenia od Ziemi, stożek pola (cztery promienie do narożników kadru z półprzezroczystymi ściankami, w prawdziwym kącie zdjęcia) i znaczniki wycinków. Stożek kończy się tuż za najdalszym obiektem zdjęcia leżącym w Drodze Mlecznej, a kadr obejmuje sam stożek, więc obiekty nie zbijają się w jeden punkt przy Ziemi. Znaczniki to symbole jak w atlasach nieba (o stałym rozmiarze ekranowym niezależnie od pola widzenia), w kolorach adnotacji: elipsa (galaktyka), okrąg kropkowany (gromada otwarta), okrąg z krzyżem (gromada kulista), kwadrat (mgławica emisyjna i refleksyjna), kwadrat przerywany (mgławica ciemna), okrąg z wąsami (mgławica planetarna), okrąg z długimi kreskami (pozostałość po supernowej). Wycinki dalsze niż 150 tys. lś dzielą jeden podwójny grot za końcem stożka z podpisem „poza Drogą Mleczną”; wycinków bez odległości w scenie nie ma (gdy w tle działa regresor, pasek narzędzi pokazuje jego postęp dla bieżącego projektu). Każdy wycinek ma własny podpis przy znaczniku; podpisy, które na ekranie nachodzą na siebie (razem ze znacznikami), łączą się w plakietkę „N obiektów” z zakresem odległości, a znaczniki grupy się zmniejszają. Kliknięcie plakietki rozkłada wachlarz nazw według odległości z miniaturami wycinków (jak w Obserwatorium; do 40 ramion, nadmiar jako osobna etykieta): wskazanie ramienia powiększa znacznik, kliknięcie wybiera obiekt (jego podpis i znacznik stoją wtedy osobno), a Esc, kliknięcie na scenie, rolka myszy lub zmiana rozmiaru okna zamykają wachlarz. Kliknięcie znacznika też wybiera obiekt. Podpis bez miejsca przy znaczniku odsuwa się w kolumnę i dostaje odnośnik. Grupy przeliczają się razem z układem. Podczas ruchu kamery podpisy (w obu skalach) trzymają swoje miejsce względem punktu i jadą z nim sztywno, w całych pikselach; układ porządkuje się dopiero 0,2 s po zatrzymaniu kamery, płynnym przejściem. Kierunek i osie kadru wynikają z WCS (środek i macierz CD; kadr lustrzany dostaje obrót z odwróconą osią x). Pasek zdjęcia: **Rozłóż zdjęcie 3D**, **Edytuj wycinki**, **Zmień zdjęcie**, **Usuń**.
- **Wszechświat lokalny:** tak samo jak w Drodze Mlecznej: przerywana linia widzenia od Ziemi, stożek pola i znaczniki wycinków z podpisami, plakietkami grup i wachlarzem. Znacznik stoi na promieniu od Ziemi w kierunku obiektu, w odległości jego punktu w skali logarytmicznej (skala liczy się od centrum Galaktyki, więc samo położenie punktu mijałoby wąski stożek pola). Stożek kończy się tuż za najdalszym znacznikiem. W skali logarytmicznej obiekty zajmują końcowy odcinek linii, więc kadr zaczyna się tuż przed najbliższym z nich (obiekty Drogi Mlecznej stoją przy Ziemi i go nie wydłużają). Panel z prawej: liczba obiektów i zakres odległości, wyszukiwanie, wirtualizowana lista według odległości (wskazanie powiększa znacznik, kliknięcie wybiera), wybrany obiekt z wycinkiem, odległością i źródłem, **Przybliż** (przelot do znacznika) i **Źródło odległości**. Obiekty poza 3D mają licznik prowadzący do edytora; nie dostają sztucznej odległości. **Rozłóż zdjęcie 3D** nurkuje do Obserwatorium tą samą animacją co w Drodze Mlecznej, a zakładka **Wszechświat lokalny** wraca nurkowaniem wstecz. (Do 12.11.2026 była tu fotografia jako okno na odległości głównego planu z planami wysuniętymi na nitkach.)

**Nurkowanie** (Rozłóż zdjęcie 3D w obu skalach; opis dla Drogi Mlecznej) prowadzi jedną ciągłą sceną do Obserwatorium 3D (niżej), w ok. 3,1 s, prosto od bieżącej kamery Drogi Mlecznej (bez oddalania):
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
  - wirtualizowana lista po odległości z wyszukiwaniem i inspektorem obiektu (miniatura z wycinka zdjęcia przycięta do granic kadru, odległość, przedział, źródło); zaznaczony obiekt w Drodze Mlecznej oraz obiekt wskazany kursorem pokazują podgląd wycinka w pierścieniu zaznaczenia.
- **Powrót do skali** (aktywna zakładka skali **Droga Mleczna** lub **Wszechświat lokalny**, obok ścieżka ze skalą i nazwą zdjęcia): przejście wstecz (zwinięcie rozkładania do 0% i powrót do sceny danej skali); druga zakładka skali przełącza od razu.
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


### Okno zdjęcia: skalowanie i sprawdzenie (12.11.2026)

Okno zastąpiło atlas z 10.11.2026 (wycinki rozsunięte na dysku wokół kierunku zdjęcia, do 48 miniatur, lista po sześć wyników): dysk fałszował kierunek i gubił układ kadru, a przy ponad 100 podobnych galaktykach miniatury zasłaniały scenę.

Wszystkie obiekty okna to jedna siatka z jednym materiałem (koło z obrysem o stałej grubości na ekranie i wycinkiem zdjęcia ze wspólnej tekstury), nitki to jeden bufor odcinków, a lista jest wirtualizowana. Liczba obiektów sceny nie zależy od liczby galaktyk (test dla 10 000). Trafienie wskaźnika i układ podpisów liczą się tylko przy ruchu wskaźnika lub kamery; nieruchoma scena rysuje jedną klatkę kontrolną na sekundę.

Sprawdzone 12.11.2026 w Chromium (SwiftShader, 1440 × 900): zdjęcie M 51 z konuzastro.pl (9 obiektów: 2 w głównym planie, 7 w tle) i syntetyczne pole o geometrii Abell 1656 (131 obiektów: 122 w głównym planie, 3 w pierwszym, 6 w tle). Pole syntetyczne sprawdza gęstość, czytelność i zasoby, nie pomiary: prawdziwego zdjęcia Abell 1656 nie mieliśmy.

Ograniczenia: szerokość głównego planu jest stała, więc dwie gromady na jednej linii widzenia bliższe sobie niż 0,25 dex trafią do jednego planu; widok „Położenie” pokazuje okno małe, bo obejmuje też Drogę Mleczną.
