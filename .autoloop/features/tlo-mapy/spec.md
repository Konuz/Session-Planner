# tlo-mapy — Gwiazdy i siatka RA/Dec w tle kadru

## Cel
W tle okna kadru widać gwiazdy z katalogu Tycho-2 (`katalog-gwiazd`) jako kropki, większe dla jaśniejszych, oraz siatkę RA/Dec z opisanymi liniami [Z29]. Tło leży pod zdjęciem i pod zarysami, więc widać je tam, gdzie zdjęcia nie ma albo gdzie nie sięga (np. wokół kwadratu STScI). Działa bez sieci i w Red Mode.

## Przykłady
Jeśli nie napisano inaczej: wycinek widoku 1000 × 1000 jednostek, (0; 0) to lewy górny róg, N u góry, E po lewej, skala `2·tan(pole/2)/1000` jak w `geometria-kadru`. Gwiazdy podaje się parametrem (RA, Dec, V), bez pliku danych. Tolerancja ±1 jednostki.

Reguły, które sprawdzają przykłady:
- Gwiazda jest w tle, gdy jej punkt leży w widoku (brzegi się liczą). Punkt odległy o 90° lub więcej od środka nie ma położenia i nie jest rysowany.
- Promień kropki to `1 + 0,6·(10 − V)` jednostek widoku, najmniej 1 i najwyżej 8. Nie zależy od pola widoku.
- Rysuje się najwyżej 3000 najjaśniejszych gwiazd w widoku. Przy równej jasności decyduje kolejność wejścia. Kropki idą od najsłabszej do najjaśniejszej, więc jaśniejsze leżą na wierzchu.
- Krok siatki Dec to najmniejsza wartość z listy 1′, 2′, 5′, 10′, 15′, 30′, 1°, 2°, 5°, 10°, 15°, 30°, która jest ≥ pole/6.
- Krok RA to najmniejsza wartość z listy 5s, 10s, 15s, 30s, 1m, 2m, 5m, 10m, 15m, 30m, 1h, 2h, dla której krok w stopniach × cos(Dec środka) ≥ pole/6. Gdy żadna nie wystarcza (okolice bieguna), krok wynosi 2h.
- Rysuje się każdą linię będącą wielokrotnością kroku, jeśli choć część jej przebiegu wypada w widoku. Nie ma równoleżników ±90°.
- Opisy RA mają postać „Hh MMm”, np. „0h 00m”, „22h 00m”. Przy kroku poniżej 1m dochodzą sekundy: „5h 35m 10s”. RA 360° to „0h 00m”.
- Opisy Dec mają znak „+” albo „−” (U+2212). Przy kroku ≥ 1° wyglądają tak: „+5°”, „−5°”, „0°”. Przy kroku < 1° tak: „+0°30′”, „−5°00′”, „0°00′”.
- Model podaje punkt zaczepienia opisu. Dla południka to punkt, w którym linia wchodzi w widok, idąc z południa na północ. Dla równoleżnika to punkt wejścia, idąc ze wschodu na zachód (zwykle z lewej). Widok może przesunąć tekst do wnętrza, żeby był czytelny.

Gwiazdy:
P1: Środek RA 0°, Dec 0°, pole 2°. Gwiazda (0°; 0°) ma kropkę w (500; 500). Gwiazda (0°; +0,5°) leży w (500; 250,0), a gwiazda (359,5°; 0°) w (750,0; 500).
P2: Brzeg pola, ten sam widok. Gwiazda w Dec +0,99° (y ≈ 5) jest w tle, a gwiazda w Dec +1,01° (y ≈ −5) nie jest.
P3: Przejście przez RA 0°. Środek RA 0,5°, Dec 0°, pole 2°. Gwiazda w RA 359,8°, Dec 0° ma kropkę w (850,0; 500), jak w `mapa-zastepcza` P14.
P4: Druga strona nieba. Gwiazda w punkcie przeciwległym do środka z P1 (RA 180°, Dec 0°) nie ma kropki, choć sam wzór rzutu dałby jej odbicie w (500; 500). W wyniku nie ma NaN ani nieskończoności.
P5: Promienie: V 10 → 1; V 5 → 4; V 0 → 7; V −1,46 → 7,9; V −2 → 8 (przycięte); V 10,5 → 1 (przycięte).
P6: Limit. W widoku jest 3000 gwiazd z V 9,0 i 5 gwiazd z V 9,5, podanych w tej kolejności. Wynik to 3000 kropek, wszystkie z V 9,0. Bez gwiazd wynik jest pusty.
P7: Kolejność. Gwiazdy V 3, V 8, V 5 dają kropki w kolejności V 8, V 5, V 3.

Siatka:
P8: Kroki przy Dec środka 0°:
- pole 0,5° → Dec 5′, RA 30s;
- pole 2° → 30′ i 2m;
- pole 20° → 5° i 15m;
- pole 60° → 10° i 1h.
P9: Kroki tuż przy progach (Dec 0°):
- pole 2,9° → RA 2m, a 3,1° → 5m;
- pole 5,9° → Dec 1°, a 6,1° → 2°.
P10: Wysokie Dec. Środek Dec 60°, pole 2° → krok RA 5m (2m × cos 60° daje tylko 0,25°).
P11: Środek RA 0°, Dec 0°, pole 2,4° (krok 30′ i 2m):
- Południki RA 359°, 359,5°, 0°, 0,5° i 1° to pionowe linie w x ≈ 916,6, 708,3, 500, 291,7 i 83,4. Mają opisy „23h 56m”, „23h 58m”, „0h 00m”, „0h 02m” i „0h 04m”.
- Opis południka 0h 00m ma punkt zaczepienia (500; 1000).
- Równoleżniki: −1°, −0,5°, 0°, +0,5° i +1°. Równik to linia y = 500 z opisem „0°00′” zaczepionym w (0; 500). Równoleżnik +0,5° ma opis „+0°30′” i przecina środkową kolumnę w y ≈ 291,7.
- Równoleżnika ±1,5° nie ma.
P12: Biegun w widoku. Środek Dec +90°, pole 10° (krok 2° i 2h):
- 12 południków (RA 0°, 30°, …, 330°, opisy „0h 00m” … „22h 00m”) zbiega się w (500; 500);
- są równoleżniki +84°, +86° i +88° z opisami „+84°”, „+86°”, „+88°”, czyli okręgi wokół (500; 500) o promieniach ok. 600,7, 399,6 i 199,6;
- równoleżnika +82° (ok. 803 > 707) nie ma, a równoleżnika +90° też nie ma;
- w wyniku nie ma NaN.
P13: Gęstość. Gdy dwa kolejne punkty linii leżą oba w widoku, dzieli je najwyżej 20 jednostek.

Niezależność i rysunek:
P14: Tło zależy tylko od wycinka widoku i listy gwiazd. Zmiana PA, mozaiki albo OAG daje te same kropki i linie. Zmiana pola widoku (np. z `zoom-kadru`) daje nowe kroki, a promienie kropek zostają takie same.
P15: Kolejność warstw w SVG widoku: tło, siatka `data-role="grid"`, gwiazdy `data-role="stars"`, zdjęcie `data-role="photo"`, obiekty mapy `data-map-uid`, panele, pryzmat OAG.
- Przy zdjęciu STScI (kwadrat 1° w widoku 3°) gwiazdy i siatka są w znacznikach przed zdjęciem.
- Żaden element tła nie ma `data-map-uid`, `data-panel`, `data-role="oag"` ani `transform`.
P16: `FramingView` bez listy gwiazd rysuje samą siatkę i nie pokazuje komunikatu. Tak jest przy starym sposobie wywołania, gdy katalog gwiazd jeszcze się wczytuje i gdy jego wczytanie się nie udało. Reszta widoku działa jak dotąd.
P17: Kolory i Red Mode:
- kropki mają klasę tokenu `foreground`, linie `border`, a opisy `muted`;
- żaden `fill`, `stroke` ani `style` nie ma koloru wpisanego na sztywno;
- w Red Mode tło jest pod tym samym filtrem `red-only` co reszta widoku (`zakladka-kadr` P25).
P18: Wczytanie gwiazd. Render `FramingTab` w Node nie pobiera pliku gwiazd, bo wczytanie odbywa się w efekcie. Zakładka prosi `katalog-gwiazd` o gwiazdy wokół środka kadru, w promieniu równym połowie przekątnej widoku.

## Styk z resztą
- Nowy czysty model w `src/features/framing/` (proponowana nazwa `mapBackground.ts`).
  - Wejście: lista gwiazd (RA, Dec, V) i wycinek widoku (`viewCutout`).
  - Wyjście, w jednostkach widoku: kropki (x, y, promień) oraz linie siatki (rodzaj, wartość, opis, punkty, punkt zaczepienia opisu).
  - Rzut przez `skyToCutout` (`services/framing.ts`). Kontrolę 90° dodaje model, jak w `mapa-zastepcza`.
- Gwiazdy dostarcza `katalog-gwiazd` (`services/stars.ts`): jednorazowe wczytanie pliku i wybór gwiazd „środek + promień”, od najjaśniejszej.
- `FramingView.tsx` dostaje opcjonalny parametr z gwiazdami, a siatkę liczy z `fovDeg` i `framing`. Zmiany są tylko dodające, bo zamrożone testy `zakladka-kadr` i `zdjecie-w-kadrze` renderują widok bez gwiazd.
- `FramingTab.tsx` wczytuje katalog gwiazd w efekcie (jak `useSkyImage`) i podaje gwiazdy do widoku.
- Kolory z `theme/tokens.ts`.

## Poza zakresem
- Plik gwiazd, jego budowa, odczyt i wybór gwiazd (`katalog-gwiazd`).
- Przybliżanie i zmiana pola widoku (`zoom-kadru`). Tło tylko korzysta z pola, które dostanie.
- Przełącznik siatki i zmiana granicy jasności. Z29 podaje je jako alternatywy, nie jako funkcje.
- Cytowanie Tycho-2 na ekranie „Źródła i licencje” (etap 7). `licenseLines` w podpisie zdjęcia się nie zmienia.
- Nazwy gwiazd, kolory gwiazd (B−V), precesja i ruch własny.
- Dopasowanie siatki do obrazu STScI, który nie jest w TAN.

## Pytania
- **Nie liczyłem programem.** Nie miałem powłoki.
  - Część liczb wynika z budowy przykładu: „500”, „y = 500”, „(500; 1000)” i „(0; 500)”.
  - (850,0; 500) pochodzi z zatwierdzonego `mapa-zastepcza` P14.
  - Te liczby policzyłem ręcznie i przed zamrożeniem testów trzeba je sprawdzić programem:
    - 250,0 i 750,0 (P1);
    - y ≈ ±5 (P2);
    - 916,6 / 708,3 / 291,7 / 83,4 (P11);
    - promienie 600,7 / 399,6 / 199,6 i 803 (P12).
- **Wzór wielkości kropki** `1 + 0,6·(10 − V)` w zakresie 1–8 wybrałem sam. 7B mówi tylko, że kropka rośnie z jasnością (jak w Stellarium). Wielkość jest stała w jednostkach widoku, więc na wąskim ekranie telefonu najsłabsze gwiazdy mają ok. 0,5 px.
- **Limit 3000 gwiazd** to mój dodatek.
  - Przy V ≤ 10 wypada ok. 8–9 gwiazd na stopień kwadratowy.
  - W polu 60° (granica `zoom-kadru`) to ok. 30 tys. kółek SVG, przeliczanych przy każdej klatce przesuwania.
  - Alternatywą jest granica jasności zależna od pola, jak w Stellarium.
- **RA w godzinach** („5h 35m”), choć odczyt środka kadru podaje RA w stopniach („RA 83,8187°”). Tak opisuje się mapy nieba, ale można też opisywać RA w stopniach.
- **Krok „pole/6”** daje ok. 3–6 linii w każdym kierunku. Listy kroków wybrałem sam.
- **Brak komunikatu**, gdy plik gwiazd się nie wczyta (P16). Tło jest tylko pomocą. Można dodać cichy napis pod widokiem.
- **Siatkę pod gwiazdami** ustawiłem sam. 7B mówi tylko, że obie warstwy leżą pod zarysami i pod zdjęciem.
- **Nazwy typów gwiazd** z `katalog-gwiazd` nie są jeszcze ustalone. Spec opisuje wejście ogólnie: RA, Dec, V.
