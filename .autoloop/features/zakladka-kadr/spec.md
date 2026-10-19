# zakladka-kadr — Zakładka „Kadr”

## Cel
Nowa zakładka „Kadr” pokazuje, jak kadr aktywnego profilu sprzętu leży na niebie wokół wybranego obiektu. Ramka stoi w środku widoku, a użytkownik przesuwa niebo, obraca kadr (PA), ustawia mozaikę i widzi dane kadru (FOV, skala, próbkowanie). Wszystko działa bez sieci, na mapie zastępczej z zarysami obiektów.

## Przykłady
Jeśli nie napisano inaczej:
- profil „Mój zestaw” (Newton 150/600 + Ares-M Pro, bez OAG), mozaika 1×1, zakładka 20%, PA 0°;
- widok ma układ współrzędnych 1000 × 1000 jednostek (`viewBox`), a (500; 500) to jego środek;
- „widok 2°” to widok, któremu przekazano wprost pole 2°.

Liczby pikseli i kątów pochodzą z `geometria-kadru` (P9, P10, P14, P15, P17) i z T1/T2. Tolerancje są takie same jak tam.

**Nawigacja i obiekt**

P1: Nawigacja ma zakładki w kolejności Katalog, Noc, Kadr, Ustawienia. Kliknięcie „Kadr” pokazuje zakładkę Kadr. Zapamiętana zakładka Kadr zostaje po ponownym uruchomieniu.

P2: Nikt nie wybrał obiektu → zakładka pokazuje M 31, tak jak zakładka Noc. Lista obiektów jest ta sama co w Noc („Klasyki” plus bieżący obiekt).

P3: W Kadrze wybrano M 42 → środek kadru to współrzędne M 42 z katalogu, pokazane jako „RA 83,8187°, Dec −5,3897°”. Po przejściu do zakładki Noc wykres pokazuje M 42, bo wybór obiektu jest wspólny.

P4: Kadr M 42 przesunięty, PA 30°, mozaika 2×1. Użytkownik wybiera w Kadrze M 31 → środek przechodzi na M 31, a PA 30° i mozaika 2×1 zostają.

P5: Kadr M 42 przesunięty. Użytkownik przechodzi do Noc, wybiera tam M 31 i wraca do Kadru → środek jest na M 31. Gdy w Noc obiekt się nie zmienił, po powrocie środek, PA i mozaika są takie, jak je zostawiono.

P6: Ponowne uruchomienie aplikacji → kadr startuje od środka obiektu, z PA 0°, mozaiką 1×1 i zakładką 20%. Zapamiętany jest tylko obiekt i zakładka nawigacji.

P7: Katalog jeszcze się wczytuje → „Wczytywanie katalogu…”. Błąd wczytania → komunikat i „Spróbuj ponownie”. W obu przypadkach dane kadru z P17 są widoczne.

**Przesuwanie tła [Z11]** (widok 2°, środek RA 83,8221°, Dec −5,3911°)

P8: Przeciągnięcie tła o 100 jednostek w prawo → środek RA 84,023°, Dec −5,391°, czyli przesunięcie na wschód. W lewo → RA 83,621°, Dec −5,391° (zachód).

P9: Przeciągnięcie o 100 jednostek w dół → środek RA 83,822°, Dec −5,191° (północ). W górę → RA 83,822°, Dec −5,591° (południe).

P10: Ramka przed przeciągnięciem i po nim ma te same narożniki: (230; 230), (770; 230), (770; 770), (230; 770). Zmienia się tylko odczyt środka.

P11: Przesunięcie liczy się zawsze od środka z chwili, gdy przeciąganie się zaczęło. Ruch o 60 jednostek, a potem o kolejne 40 (bez puszczania) daje ten sam środek co P8.

P12: Widok narysowany na ekranie o szerokości 500 px → przeciągnięcie o 50 px ekranu w prawo daje 100 jednostek widoku, czyli wynik z P8.

P13: Środek Dec 89,9°, przeciągnięcie tła w dół o 300 jednostek (przez biegun) → Dec ≤ 90°, RA w [0°, 360°), PA bez zmian, w wyniku nie ma NaN.

P14: „Wyśrodkuj na obiekcie” po przesunięciu → środek wraca do współrzędnych obiektu, a PA i mozaika zostają.

**Kąt PA, mozaika i dane kadru**

P15: Suwak ma zakres 0–360° i krok 0,5°. W polu liczbowym:
- „30,5” i „30.5” dają PA 30,5°;
- „30,25” zostaje 30,25° (pole nie zaokrągla do kroku suwaka);
- „-30” daje 330°, a „360” daje 0°;
- „abc” albo puste pole daje komunikat „PA: wpisz liczbę”, a PA zostaje bez zmian.

P16: Mozaika:
- kolumny i wiersze to listy z wartościami 1, 2, 3, 4, 5;
- zakładka startuje od 20%;
- zakładkę wpisuje się liczbą z przecinkiem albo kropką; „35” daje 30%, a „5” daje 10% (przycięcie jak w P8 z `geometria-kadru`);
- „abc” daje komunikat „Zakładka: wpisz liczbę” i zakładka zostaje bez zmian.

P17: Dane kadru (bez sieci i bez katalogu):
- „Mój zestaw” → FOV „1,080° × 1,080° (64,8′ × 64,8′)”, skala „1,293″/px”, próbkowanie „podpróbkowanie” przy seeingu 2,5″ (T1, T2);
- RedCat 51 + ASI2600MC Pro → „5,380° × 3,597°”, „3,102″/px”, „podpróbkowanie” oraz uwaga OSC z `formularz-profilu` P14;
- ta sama RedCat w mozaice 2×1 z zakładką 20% → dodatkowo „Mozaika: 9,668° × 3,597°”, a przy 1×1 tego wiersza nie ma.

P18: Zmiana aktywnego profilu na górnym pasku → ramka i dane kadru zmieniają się od razu, a środek, PA i mozaika zostają.

P19: Zakładka przekazuje widokowi pole wycinka wyliczone funkcją z `zrodla-zdjec` dla bieżącego kadru albo mozaiki. Po zmianie mozaiki z 1×1 na 2×1 pole widoku jest równe nowemu wynikowi tej funkcji i jest większe niż przedtem.

**Rysunek (widok 2°, środek widoku = środek kadru)**

P20: [T24] Ramka w SVG ma narożniki (230; 230), (770; 230), (770; 770), (230; 770), ±1.

P21: Kierunek obrotu (sekcja 4) w narysowanym SVG:
- PA 30° → środek górnej krawędzi ramki w (365,0; 266,2);
- PA 330° → w (635,0; 266,2), więc ramka obraca się przeciwnie do ruchu wskazówek zegara;
- PA 90° → w (230; 500), czyli góra kadru wskazuje E, w lewo.

P22: Mozaika 2×1 → dwa prostokąty paneli z numerami „1” i „2”:
- panel „1” (wschodni) ma x 14,0–554,0;
- panel „2” ma x 446,0–986,0;
- oba panele mają y 230–770.

P23: Profil z OAG {8 × 4 mm, 8 mm, 0°} → prostokąt pryzmatu x 309,0–691,0, y 22,6–213,5. Przy PA 90° obraca się razem z kadrem: x 22,6–213,5, y 309,0–691,0. Profil z `oag: null` → brak prostokąta pryzmatu.

P24: [T24] Widok 2° wokół M 42:
- M 42, M 43 i NGC 1977 to wielokąty rysowane linią ciągłą;
- NGC 1973, NGC 1975 i NGC 1980 to elipsy lub okręgi rysowane linią przerywaną;
- każdy z tych obiektów ma etykietę z oznaczeniem.

Kształty i etykiety pochodzą z modelu `mapa-zastepcza`. Ta zakładka tylko je rysuje pod ramką.

**Red Mode**

P25: Red Mode włączony → kontener widoku ma `filter: url(#red-only)`, a na stronie jest filtr `red-only` z macierzą z sekcji 8. Red Mode wyłączony → kontener nie ma filtra.

W obu trybach żaden atrybut `fill`, `stroke` ani `style` w widoku nie ma koloru wpisanego na sztywno (`#rrggbb`, `rgb(…)`, `rgba(…)`). Kolory pochodzą tylko z klas tokenów. Odwołania typu `url(#…)` są dozwolone.

## Styk z resztą
- `src/features/framing/`:
  - kontener zakładki;
  - komponent widoku SVG (przyjmuje pole widoku, profil, kadr i kształty mapy);
  - czysty model (przeliczenie przeciągnięcia na środek, odczyt pól PA i mozaiki, dane kadru).
- Pole widoku to pole wycinka z `zrodla-zdjec` (2 × przekątna kadru lub mozaiki), więc wycinek wypełnia cały widok (P19).
- Geometria pochodzi z `services/framing.ts` (`geometria-kadru`): ramka, panele, OAG, rzut i piksel → niebo.
- Optyka: `computeOptics` i `assessSampling` (seeing z `PlanningSettings`); format jak w `formularz-profilu`; `formatDeg`; `parseDecimal`.
- Kształty mapy zastępczej pochodzą z `features/framing/fallbackMap.ts` (`mapa-zastepcza`).
- Warstwa zdjęcia leży pod warstwami tej funkcji i należy do `zdjecie-w-kadrze`.
- `src/state/plannerStore.ts`, zmiany tylko dodające:
  - `Tab` z `'framing'`;
  - stan kadru (`Framing` z `src/types.ts`) razem z uid obiektu, na którym go wyśrodkowano;
  - gdy pokazywany obiekt ma inny uid, środek przechodzi na ten obiekt, a PA i mozaika zostają (P4, P5);
  - stan kadru jest tylko w pamięci, bez zapisu między sesjami (P6); wersja zapisu zostaje 1;
  - wybór obiektu przez istniejące `objectUid` i `selectObject`.
- Obiekt: `selectFeatured`, `nightObjectOptions`, `loadCatalog`.
- `src/app/NavBar.tsx`: zakładka „Kadr” między Noc a Ustawienia. `src/App.tsx` wyświetla zakładkę Kadr.
- Zamrożony test `tests/features/zakladka-katalog/tabs.test.ts` (P1: „Katalog, Noc, Ustawienia”) orkiestrator poprawi osobnym commitem, zgodnie z decyzją w BACKLOG.

## Poza zakresem
- Zdjęcie w tle, wybór źródła, komunikat „Brak zdjęcia…”, przycisk offline, podpisy licencji (`zdjecie-w-kadrze`).
- Wyliczanie kształtów mapy zastępczej (`mapa-zastepcza`) i wzory geometrii (`geometria-kadru`).
- Zapis kadru w projekcie, eksport do N.I.N.A., otwieranie Kadru z karty katalogu.
- Przybliżanie i oddalanie widoku, przeciąganie samej ramki, obrót gestem dwoma palcami.

## Pytania
- **Liczby:** nie miałem narzędzia do uruchomienia programu (node), więc żadnej liczby nie policzyłem programem.
  - Prawie wszystkie liczby pochodzą z T1/T2, z katalogu i z `geometria-kadru`.
  - Nowe są tylko lustrzane odbicia P17 z `geometria-kadru` w P8 i P9: RA 83,621° i Dec −5,591°. Sprawdziłem je ręcznie (przesunięcie RA 0,2009°, Dec 0,2000°). Przed zamrożeniem testów trzeba je sprawdzić programem.
- **Zmiana obiektu** (P4, P5): środek przechodzi na nowy obiekt, a PA i mozaika zostają. Alternatywa: zerować też PA i mozaikę.
- **Bez zapisu kadru** (P6): kadr będzie się zapisywał dopiero w projektach.
- **Przycisk „Wyśrodkuj na obiekcie”** (P14) to mój dodatek. Bez niego po przesunięciu nie da się wrócić do obiektu inaczej niż przez wybór innego obiektu i powrót.
- **Pola PA i zakładki** (P15, P16): pole PA przyjmuje dowolną liczbę, a suwak ma krok 0,5°. Zakładkę spoza 10–30% przycinam zamiast zgłaszać błąd, tak jak `geometria-kadru`. Teksty komunikatów wybrałem sam.
- **Biegun:** P13 sprawdza same własności wyniku, bez konkretnych liczb.
- **Pole widoku:** `zrodla-zdjec` musi udostępniać planowane pole wycinka jako funkcję (P19). Przykłady rysunku podają pole 2° wprost, tak jak T24.
- **Mapa zastępcza:** spec `mapa-zastepcza` jeszcze nie istnieje, więc P24 opisuje jej wynik ogólnie, bez nazw funkcji.
