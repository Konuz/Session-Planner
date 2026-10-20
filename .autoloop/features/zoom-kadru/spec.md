# zoom-kadru — Przybliżanie i oddalanie widoku kadru

## Cel
Użytkownik przybliża i oddala niebo w oknie kadru przyciskami „+”, „−” i „Dopasuj”, kółkiem myszy i szczypaniem dwoma palcami. Ramka zostaje w środku. Po każdej zmianie pola aplikacja pobiera wycinek zdjęcia dokładnie dla nowego pola, więc zdjęcie jest ostre i pokrywa widok.

## Przykłady
Jeśli nie napisano inaczej:
- zakładka Kadr, obiekt M 42, profil „Mój zestaw” (Newton 150/600 + Ares-M Pro), mozaika 1×1, PA 0°;
- pole „Dopasuj” = pole wycinka z `zrodla-zdjec`, jak dotąd: 3,05° przy 1×1 i 4,45° przy 2×1 (wartości z zamrożonych testów `zakladka-kadr`);
- przekątna kadru = przekątna jednego kadru, liczona jak w `zrodla-zdjec` (dla „Mój zestaw” 1,5274°), więc najmniejsze pole widoku to 1,2 × 1,5274° ≈ 1,833°;
- pola porównuje się z tolerancją ±0,001°;
- „pobranie” oznacza wywołanie pobierania zdjęcia (atrapa jak w `zdjecie-w-kadrze`);
- na starcie jest pokazany wycinek 3,05° wokół środka kadru.

**Przyciski i granice**

P1: Start zakładki → pole widoku 3,05°, odczyt „Pole widoku: 3,05°”. Widok, ramka, mapa i zdjęcie są takie same jak dotąd, a zamrożone testy `zakladka-kadr` i `zdjecie-w-kadrze` przechodzą bez zmian.
P2: „+” → 2,0333° („Pole widoku: 2,03°”). Drugie „+” → 1,3556° jest poniżej granicy, więc pole wynosi ok. 1,833°, a „+” staje się nieaktywny.
P3: Z 3,05° siedem razy „−” → 52,112°. Ósme „−” (78,17°) daje 60°, a „−” staje się nieaktywny.
P4: Po dowolnej serii „+”/„−” przycisk „Dopasuj” → znów 3,05°. Przy 2×1 „Dopasuj” daje 4,45°.
P5: Środek kadru (odczyt RA/Dec), PA i mozaika po „+”, „−”, „Dopasuj”, kółku i szczypaniu są bez zmian. Środek widoku zostaje w miejscu nawet przy kółku obracanym z kursorem w rogu widoku.

**Kółko myszy i szczypanie**

P6: Jeden ząbek kółka to jeden krok ×1,5:
- obrót od siebie (deltaY −100 px) przybliża (3,05° → 2,0333°), a do siebie (+100) oddala (→ 4,575°);
- w trybie linii (Firefox, deltaY −3) wynik jest ten sam co przy −100 px;
- gładzik (deltaY −50 px) daje pół kroku: 3,05° / √1,5 ≈ 2,4903°.
P7: Kółko nad widokiem nie przewija strony. Kółko poza widokiem przewija stronę jak dotąd.
P8: Szczypanie: odległość palców rośnie z 200 do 300 px → pole 3,05° / 1,5 = 2,0333°. Odległość maleje z 200 do 100 px → 6,1°. Wyniki poza granicami są przycinane jak w P2 i P3.
P9: Drugi palec dotyka widoku w trakcie przeciągania jednym palcem. Od tej chwili przesuwanie ustaje i zmienia się tylko pole, a środek zostaje taki, jaki był w chwili dotknięcia. Po oderwaniu palców nic się nie przesuwa.

**Przeciąganie przy zmienionym polu**

P10: Pole 4,575°, przeciągnięcie tła o 100 jednostek w prawo → nowy środek to punkt nieba pod pikselem (400; 500) widoku o polu 4,575° (ok. RA 84,28°, Dec −5,391°). Ten sam ruch przy 3,05° przesuwa środek mniej.
P11: Przy „+” z 3,05° ramka i zarysy rysują się w skali widoku o polu 2,0333°, więc ramka jest ok. 1,5 raza większa niż przy „Dopasuj”. Jej położenie jest takie, jak rzut z `geometria-kadru` dla tego pola (±1 jednostka).

**Nowy wycinek po zoomie**

Reguła: po zakończeniu zmiany pola aplikacja pobiera nowy wycinek, gdy pole widoku różni się od pola, dla którego zaplanowano bieżący wycinek. Zmiana pola kończy się kliknięciem „+”, „−” albo „Dopasuj”, oderwaniem palców po szczypaniu albo 300 ms bez ruchu kółka. Pole nowego wycinka = pole widoku, a środek = bieżący środek kadru.

P12: Wycinek 3,05°, „+” → 2,0333° → 1 pobranie wycinka o polu 2,0333°. Do jego nadejścia stary wycinek zostaje (`zdjecie-w-kadrze` P5), a jego prostokąt rośnie do ok. −250…1250 w x i y. Drugie „+” (ok. 1,833°) → kolejne pobranie z tym polem.
P13: „+” przy minimum (nieaktywny), „Dopasuj” przy polu 3,05° i szczypanie, które kończy się na tym samym polu → 0 pobrań.
P14: Wycinek 3,05°, „−” → 4,575° → 1 pobranie o polu 4,575°. Potem „+” (3,05°) → 1 pobranie o polu 3,05° (ten sam klucz co na starcie, więc zwykle z pamięci). Potem „Dopasuj” (nadal 3,05°) → 0 pobrań.
P15: W trakcie szczypania i obracania kółkiem → 0 pobrań. Trzy ząbki kółka w odstępach krótszych niż 300 ms (3,05° → 0,9037°, przycięte do ok. 1,833°) → po 300 ms ciszy 1 pobranie o polu ok. 1,833°.
P16: Lista warstw zależy od pola widoku. Przy 3,05° nie ma Hα. Po „−” (4,575°) Hα jest na liście. Wybrane Hα, potem „+” (3,05°) → zaznaczone „DSS2 kolor” i 1 pobranie o polu 3,05° w tej warstwie (`zdjecie-w-kadrze` P10).
P17: Przesuwanie działa jak dotąd, według ¼ pola pokazanego wycinka (`zrodla-zdjec` P18). Mozaika 2×1, „+” dwa razy (4,45° → 1,9778°) daje wycinek 1,9778°. Nowe pobranie przychodzi dopiero po puszczeniu tła przesuniętego o więcej niż ok. 0,494°.
P18: Bez zoomu, czyli przy „Dopasuj”, decyzje są takie jak dotąd (`zrodla-zdjec` P18–P23, `zdjecie-w-kadrze` P19–P21).

**Co zeruje zoom**

P19: Zmiana mozaiki albo profilu → „Dopasuj”, czyli pole nowego kadru (1×1 → 2×1 daje 4,45°, jak w `zakladka-kadr` P19). Zmiana PA, zmiana obiektu i „Wyśrodkuj na obiekcie” nie zmieniają pola. Ponowne uruchomienie aplikacji → „Dopasuj”.
P20: Red Mode obejmuje też przyciski zoomu. Ich kolory pochodzą tylko z klas tokenów.

## Styk z resztą
- `src/features/framing/framingModel.ts`: czyste funkcje zoomu, czyli krok, granice, kółko (piksele i linie), szczypanie i odczyt pola.
- `src/features/framing/FramingTab.tsx`:
  - przyciski i odczyt pola widoku;
  - kółko przez nasłuch niepasywny, bo `onWheel` z Reacta jest pasywny i `preventDefault` w nim nie zatrzyma strony;
  - drugi wskaźnik w `onPointerDown` (dziś ignorowany);
  - przerwa 300 ms po kółku;
  - stan zoomu tylko w pamięci.
- `src/features/framing/photoModel.ts` i `useSkyImage.ts`:
  - opcjonalne pole widoku; bez niego wszystko działa jak dotąd (`cutoutFovDeg(size)`);
  - pole widoku zastępuje `cutoutFovDeg(size)` w `frameFov()` (lista warstw, próg Hα), w `nextPhotoRequest` i w `reload`;
  - nowy wycinek, gdy po zakończonym zoomie pole widoku ≠ pole bieżącego wycinka (różnica ≥ 0,000001°).
- `src/services/skyImage/sources.ts`: `planCutout` i `needsNewCutout` dostają opcjonalne pole planowane. Domyślne zachowanie zostaje.
- `FramingView`, `dragFraming`, `photoRect` i `viewMapObjects` już przyjmują pole widoku. Nie zmieniają się, dostają tylko inną wartość.

## Poza zakresem
- Zoom do punktu pod kursorem albo między palcami (zawsze zoom wokół środka).
- Obrót gestem, przeciąganie ramki, zapis zoomu między sesjami i w projekcie.
- Gwiazdy i siatka RA/Dec (`tlo-mapy`); dopasują się same, bo korzystają z pola widoku.
- Limity czasu pobierania (`limit-hips2fits`).

## Pytania
- **Decyzje użytkownika (20.10.2026):**
  - nowe zdjęcie po każdej zmianie pola;
  - dolna granica 1,2 × przekątna jednego kadru (przy mozaice da się przybliżyć do panelu);
  - reset zoomu przy zmianie mozaiki i profilu (utrzymuje zamrożony P19 z `zakladka-kadr`);
  - zoom wokół środka;
  - przerwa 300 ms.
- **Kółko:** ząbek = 100 px albo 3 linie, a gładzik działa proporcjonalnie. To mój wybór.
- **Szybkie klikanie „+”/„−”:** każde kliknięcie zaczyna pobranie, a poprzednie jest przerywane (`pobieranie-zdjec`). Pokazane zostaje zdjęcie dla ostatniego pola. Przy hips2fits (9–21 s na wycinek) częsty zoom oznacza dłuższe czekanie na ostre zdjęcie.
- **Pole wycinka przy zoomie** to pole widoku bez zaokrąglania do 0,01°. W adresie jest najwyżej 4 miejsca po przecinku, jak zawsze. Odczyt „Pole widoku” ma 2 miejsca.
- **Liczby:** nie miałem narzędzia do uruchomienia programu.
  - 3,05° i 4,45° pochodzą z zamrożonych testów; pozostałe pola to ich iloczyny i ilorazy przez 1,5.
  - Ręcznie policzyłem: 1,5274° i 1,833°, 52,112°, 2,4903°, 0,9037°, P10 (ok. 84,28°), prostokąt −250…1250 w P12 i 0,494° w P17.
- **Ekran nie przewija się (P7):** tego nie sprawdzi `renderToStaticMarkup`. Potrzebny test zdarzeń (np. sprawdzenie, czy wywołano `preventDefault` w nasłuchu niepasywnym) albo przegląd w przeglądarce.
