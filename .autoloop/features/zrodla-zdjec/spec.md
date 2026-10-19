# zrodla-zdjec — Adresy źródeł zdjęć, wycinek z zapasem i klucz pamięci podręcznej

## Cel
Program umie zbudować adres zdjęcia nieba w każdym z czterech źródeł, dobrać pole i rozmiar wycinka z zapasem na przesuwanie i obrót kadru, nadać wycinkowi klucz w pamięci podręcznej i rozstrzygnąć, czy po przesunięciu lub zmianie kadru trzeba pobrać nowy wycinek.

## Przykłady
Jeśli nie napisano inaczej: M 42 (RA 83,8221°, Dec −5,3911°), warstwa DSS2 kolor, wycinek kwadratowy 1000 px. W tekście liczby piszę z przecinkiem; w adresach i kluczach są z kropką.

**Źródła i adresy**

P1: [T21] pole 1°, 800 px daje dokładnie:
- alaskybis: `https://alaskybis.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FDSS2%2Fcolor&width=800&height=800&fov=1&ra=83.8221&dec=-5.3911&projection=TAN&format=jpg`
- alasky: ten sam adres z hostem `alasky.cds.unistra.fr`
- SkyView: `https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=dss2r&Position=83.8221,-5.3911&Size=1&Pixels=800&Return=JPG`
- STScI: `https://archive.stsci.edu/cgi-bin/dss_search?format=GIF&r=83.8221&d=-5.3911&e=J2000&w=60&h=60&v=1`

P2: Lista źródeł w stałej kolejności [Z28]. Każde ma nazwę i informację o zapisie offline: 1. „CDS hips2fits (alaskybis)” (zapis: tak), 2. „CDS hips2fits (alasky)” (tak), 3. „NASA SkyView” (nie), 4. „STScI DSS” (tak).

P3: Liczby w adresach mają kropkę dziesiętną, najwyżej 4 miejsca po przecinku i nie mają zbędnych zer.
- RA 10,68470833 → `10.6847`, Dec 41,269167 → `41.2692`, pole 3,75 → `3.75`.
- Przecinek nigdy nie oddziela części dziesiętnej. Jedyny przecinek to separator RA i Dec w `Position=` SkyView.

P4: Dec −0,00001 → `0` (nigdy `-0`).

P5: RA poza zakresem 0–360 jest sprowadzane do niego: RA −10 → `350`, RA 360 → `0`. Także RA 359,99999 daje `0`, bo po zaokrągleniu wyszłoby 360.

**Warstwy**

P6: Warstwa DSS2 czerwony daje w hips2fits `hips=CDS%2FP%2FDSS2%2Fred`, a Hα (Finkbeiner) daje `hips=CDS%2FP%2FFinkbeiner`. Adresy SkyView i STScI są takie same dla każdej warstwy.

P7: Lista dostępnych warstw zależy od pola wycinka:
- pole 5° → „DSS2 kolor”, „DSS2 czerwony”, „Hα (Finkbeiner)”;
- pole 3° → te same trzy warstwy;
- pole 2,5° → tylko „DSS2 kolor” i „DSS2 czerwony”.

P8: Wybrano Hα, a potem pole spadło do 2,5° → używana jest warstwa DSS2 kolor (adres i klucz z `CDS%2FP%2FDSS2%2Fcolor`).

**Pole wycinka (zapas 2× przekątnej kadru lub mozaiki, zaokrąglone do 0,01°)**

P9: Kadr 2,0° × 1,5° (przekątna 2,5°) daje pole wycinka 5°.

P10: Kadr 2,5° × 2,0° (przekątna 3,2016°) daje pole wycinka 6,4°.

P11: Mozaika 40° × 30° (przekątna 50°) dałaby 100°. Pole jest ograniczone do 60°.

**STScI**

P12: Przy polu wycinka 5° bok w STScI wynosi `w=60&h=60`, a obraz pokrywa naprawdę 1°. Przy polu 0,5° bok wynosi `w=30&h=30`, a obraz pokrywa 0,5°.

P13: Obraz STScI kładzie się na środku wycinka, bez obrotu, z N u góry. Skala to pole naprawdę pokryte podzielone przez naturalną szerokość obrazu:
- 60′ przy szerokości 1000 px → 3,6″/px;
- 30′ przy szerokości 500 px → 3,6″/px.

**Klucz pamięci podręcznej**

P14: Klucz wycinka z P1 (hips2fits) to `/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fcolor/83.8221/-5.3911/1/800`. Jest taki sam dla alaskybis i alasky.

P15: Klucz STScI dla pola 5° (i dla pola 1°) to `/sky-image-cache/stsci/dss/83.8221/-5.3911/1/0`. Pole w kluczu to pole po przycięciu, a rozmiar 0 oznacza, że wielkość obrazu ustala serwer.

P16: SkyView nie ma klucza, bo jego wycinek nie jest zapisywany.

P17: RA 83,82210001 i RA 83,8221 dają ten sam klucz i ten sam adres, bo liczby zaokrągla się tak samo.

**Czy trzeba pobrać nowy wycinek**

Dane do P18:
- wycinek ma pole 5° i środek RA 83,8221°, Dec 0°;
- kadr ma 2,0° × 1,5°, więc jego planowane pole to też 5°;
- granica przesunięcia to ¼ pola wycinka, czyli 1,25°;
- odległość liczy się po sferze, a różnica mniejsza niż 0,000001° liczy się jako równość.

P18: Środek kadru przy RA 83,8221° (jak wycinek):
- Dec 1,24° → nie trzeba;
- Dec 1,25° (dokładnie na granicy) → nie trzeba;
- Dec 1,26° → trzeba.

P19: Wycinek ma środek RA 359,5°, Dec 0°. Kadr przy RA 0,5° (odległość 1°) → nie trzeba. Przy RA 1,0° (odległość 1,5°) → trzeba.

P20: Wycinek ma środek RA 0°, Dec 89,5°. Kadr przy RA 180°, Dec 89,5°: różnica RA wynosi 180°, ale odległość tylko 1° → nie trzeba.

P21: Kadr powiększył się do 2,5° × 2,0° (planowane pole 6,4° > 5°) → trzeba, nawet bez przesunięcia.

P22: Kadr zmniejszył się do 1,0° × 0,75° (planowane pole 2,5°, czyli równo połowa) → nie trzeba. Przy kadrze 0,8° × 0,6° (pole 2,0°, mniej niż połowa) → trzeba, bo zdjęcie byłoby zbyt grube.

P23: Wycinek STScI z P12 (pole planowane 5°, pokryte 1°) i nieprzesunięty kadr 2,0° × 1,5° → nie trzeba. Decyzja porównuje pole planowane, a nie pokryte, więc program nie pobiera wycinka w kółko. Tak samo jest przy polu przyciętym do 60° (P11).

## Styk z resztą
- `src/services/skyImage/sources.ts`: czyste funkcje i dane bez sieci, zegara ani przeglądarki:
  - lista źródeł i warstw;
  - budowa adresu;
  - pole i rozmiar wycinka;
  - klucz pamięci podręcznej;
  - pole pokryte i skala STScI;
  - decyzja o nowym wycinku.
- Odległość: `angularSeparationDeg` z `services/astroMath.ts`. Przekątna kadru lub mozaiki pochodzi z `geometria-kadru`, a w przykładach jest podana wprost jako rozmiar kątowy.
- Rzut TAN na piksele wycinków hips2fits i SkyView (`2·tan(fov/2)/W`) jest w `geometria-kadru`, nie tutaj.
- `pobieranie-zdjec` korzysta z adresów, kluczy i informacji o zapisie offline. `zdjecie-w-kadrze` korzysta z nazw źródeł i warstw. Zmiana źródła lub warstwy daje inny adres i klucz.
- Klucz jest ścieżką pod adresem aplikacji (Cache Storage przyjmuje tylko adresy http/https).

## Poza zakresem
- Pobieranie zdjęć, limit 10 s, kolejność prób i wpływ ręcznego wyboru, Cache Storage i zapamiętanie ostatniego źródła (`pobieranie-zdjec`).
- Wyświetlanie zdjęć, podpisy i przyciski (`zdjecie-w-kadrze`).
- Źródła ESO i SDSS, wycinki FITS, wycinki prostokątne.

## Pytania
- **Zapas:** 7B pozwala na 1,5–2×. Przyjąłem 2× przekątnej kadru lub całej mozaiki.
  - Przekątna, a nie dłuższy bok, bo kadr obraca się z PA.
  - Wycinek jest kwadratowy, a pole zaokrąglone do 0,01°.
- **Rozmiar wycinka:** przyjąłem 1000 px (jak w T24). Adres przyjmuje dowolny rozmiar (T21: 800 px).
- **Hα (Finkbeiner):** jest dostępny dopiero od pola 3° (ok. 30 elementów rozdzielczości 6′); próg wybrałem sam. Poniżej progu wybrane Hα zastępuje DSS2 kolor (P8).
- **Limit 60°:** górny limit pola wybrałem sam, bo przy większym polu rzut TAN mocno zniekształca obraz. Po przycięciu reguła „¼ pola” nie gwarantuje, że cały kadr mieści się na zdjęciu. Przy tak wielkich mozaikach to akceptuję.
- **Wspólny klucz hips2fits:** obie maszyny mają ten sam klucz, bo to ta sama usługa i dają ten sam obraz. Wycinek z pamięci nie mówi, z której maszyny pochodzi. Proponuję, żeby podpis pokazywał wtedy „CDS hips2fits”, albo żeby nazwa źródła była zapisywana razem z obrazem. Decyzja należy do `pobieranie-zdjec` i `zdjecie-w-kadrze`.
- **Mniejszy kadr:** nowy wycinek po zmniejszeniu kadru poniżej połowy pola (P22) to mój dodatek; 7B o tym nie mówi.
- **Granice SkyView:** największe dopuszczalne `Size` i `Pixels` nie zostały sprawdzone.
- **STScI:** zakładam, że obraz jest kwadratowy, więc skalę liczę z szerokości.
- **Środek wycinka:** to środek kadru w chwili pobrania, zaokrąglony jak w adresie (4 miejsca po przecinku).
