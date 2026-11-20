# Audyt galaktycznych mgławic planetarnych

Porównanie z 20.11.2026 objęło wszystkie wpisy Session Plannera oraz publiczną tabelę PNcat v1 z MAST. Dotychczasowy zbiór opierał się m.in. na OpenNGC, katalogu V/84 z 1992 r. i wybranych późniejszych odkryciach. To wyjaśnia brak Ju 1 i wielu innych potwierdzonych mgławic. [Źródło V/84](https://heasarc.gsfc.nasa.gov/W3Browse/nebula-catalog/plnebulae.html) · [PNcat v1](https://archive.stsci.edu/hlsp/guvpncat)

## Źródła i wynik

- **MAST PNcat v1** zawiera 3 869 wierszy, w tym 2 704 oznaczone `T`. Pięć powtórzeń pozycji i identyfikatora daje 2 699 unikalnych oznaczeń `T`. SHA-256 pliku wejściowego `31e74ca0ce1dcac8d8e4eb83ad170b93123531413265834ba64b343531f30b6e`. [PNcat, CC BY 4.0](https://doi.org/10.17909/gbsn-h871)
- **Wyciąg HASH z 28.09.2026 z AnnotateImageExt** obejmuje obiekty ze zmierzonym rozmiarem. Po zestawieniu nazw, oznaczeń PN G i pozycji pozostało 128 brakujących propozycji ze statusem `T` bez statusu `T` w MAST. Weryfikacja nazwy lub oznaczenia w SIMBAD dała 56 jednoznacznych obiektów typu `PN` w granicy 10″, jeden dalszy wynik i 71 przypadków bez takiego potwierdzenia. [Wyciąg HASH w repozytorium autora](https://api.github.com/repos/scottstirling/AnnotateImageExt/git/blobs/3ca3ed6101c95168c944108d62695866e9e5a16e) · [SIMBAD TAP](https://simbad.cds.unistra.fr/simbad/sim-tap)
- **Uzupełnienie** zawiera te 56 zweryfikowanych wpisów i dwa obiekty potwierdzone spektroskopowo w publikacji z 2026 r. Plik zachowuje numery obiektów SIMBAD lub DOI, pozycje, a także średnice z MAST lub SIMBAD, gdy są dostępne. [Publikacja spektroskopowa](https://doi.org/10.1093/mnras/stag892)
- **Import 2 757 oznaczeń** dopisał 1 602 mgławice i 155 aliasów PN G. Kolejne 970 oznaczeń było już przypisanych. Po imporcie aplikacja zawiera 2 913 wpisów typu PN, 79 nowych obiektów ma pozycję bez zmierzonej średnicy, a 205 nowych ma średnicę co najmniej 1′. Dotychczasowe indeksy, pozycje, typy i odległości zachowano. Ju 1 ma średnicę 4′ według PNcat. [Identyfikacja Ju 1](https://simbad.u-strasbg.fr/simbad/sim-id?Ident=Soap+Bubble+Nebula)

## Reguły dopasowania

Import porównuje najpierw sygnaturę PN G i znane nazwy, zachowując znaki współrzędnych galaktycznych. Ta sama nazwa i bliska pozycja pozwalają dopisać alias do istniejącej mgławicy. Przy dwóch różnych sygnaturach akceptuje dopasowanie do 5″ albo potwierdzoną zgodność identyfikatorów w SIMBAD. Sama pozycja w promieniu 10″ od innego wpisu PN wymaga rozstrzygnięcia. Ponowne uruchomienie importu na wyniku nie dodaje wierszy ani aliasów.

15 rekordów MAST ze statusem `T` ma status `L` w nowszym wyciągu. Dotyczy to m.in. MWP 1, którego wcześniejszy wpis zachowano. 35 istniejących sygnatur wskazuje pozycje różniące się bardziej niż tolerancja importu. Przykłady to Pe 1-19 (896″), K 3-80 (785″) i Vd 1-5 (694″). Aktualizacja ich współrzędnych wymaga sprawdzenia geometrii obiektów. Wynik obejmuje wymienione źródła i nie jest pełnym eksportem bieżącego HASH. [Definicje statusów HASH](https://doi.org/10.3389/fspas.2022.895287)

## Weryfikacja dopasowań

Weryfikacja rozstrzygnęła 15 konfliktów. Pięć mgławic dopisano na końcu, siedem wpisów zmieniło typ z EN na PN i jeden z PN na RN. Katalog zawiera teraz 2 924 wpisy PN. Zachowano indeksy istniejących obiektów i przypisane do nich odległości. Wcześniej zapisane dane korzystające z błędnej nazwy (Te 5, Vo 3, Wray 17-75, Al 2-I, Al 2-K lub Al 2-O) mogą wymagać ponownego powiązania z właściwym obiektem.

| Sygnatura | Wynik weryfikacji | Źródło |
| --- | --- | --- |
| PN G013.3+01.1 | Sh2-42 jest PN. SIMBAD wiąże z nim LBN 56, który w katalogu aplikacji ma pozycję odległą o około 1,4°. Zachowano oba wpisy. | [MASH](https://doi.org/10.1111/j.1365-2966.2006.10950.x), [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Sh+2-42) |
| PN G091.0-06.3 | Sh2-123 = StDr 17. Widmo mgławicy potwierdza PN mimo starszego wpisu H II w SIMBAD. | [Le Dû i in.](https://doi.org/10.1051/0004-6361/202243393), [obserwacje StDr 17](https://planetarynebulae.net/EN/page_np.php?id=739) |
| PN G094.5-00.8a | LDu 1 jest osobną PN, około 3,4′ od K 3-83. | [Widma GTC](https://planetarynebulae.net/documentation/publications/PNnet%20-%20Grantecan%20spectroscopic%20observations.pdf), [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=%407892280) |
| PN G120.2-05.3 | Sh2-176 jest PN. Zachowano historyczny wpis LBN 597 z jego dotychczasową geometrią. | [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=%40105794) |
| PN G138.1+04.1 | Sh2-200 = HDW 2 jest PN. Zachowano historyczny wpis LBN 674 z jego dotychczasową geometrią. | [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=%40242747) |
| PN G150.0-00.3 | Te 5 jest osobną PN. Dotychczasowy wiersz PN G002.3+02.2 otrzymał nazwę K 5-11. | [IPHAS](https://doi.org/10.1093/mnras/stu1404), [K 5-11 w SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=%405417931) |
| PN G158.3-05.6a | Sh2-215 = Pa 167. Widmo potwierdza PN mimo starszego wpisu H II w SIMBAD. | [Obserwacje Pa 167](https://planetarynebulae.net/FR/page_np.php?id=770) |
| PN G258.5-01.3 | RCW 24 jest PN. | [Frew i Parker](https://academic.oup.com/mnras/article/372/3/1081/973056) |
| PN G260.1+00.2 | Vo 3 = IRAS 08355-4027 jest osobną PN. Błędnie utożsamiony wpis BRAN 174 zachowano pod nazwą PK 260+00 1, z typem RN według SIMBAD. | [Kimeswenger, sekcja 5](https://arxiv.org/abs/astro-ph/0105072), [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=%402973701) |
| PN G289.6-01.6a | St 52 jest osobną PN, około 1,5′ od He 2-57. | [Obserwacje St 52](https://planetarynebulae.net/EN/page_np.php?id=688) |
| PN G302.1+00.3 | RCW 69 = Gum 45 jest PN. | [Frew i Parker](https://academic.oup.com/mnras/article/372/3/1081/973056) |
| PN G330.7-02.0 | Wray 17-75 jest osobną PN. Dotychczasowy wiersz PN G329.5-02.2 otrzymał nazwę HeFa 1 i zachował swoją odległość. | [Wray 17-75 w SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=%403478011), [HeFa 1 w SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=%403460241) |
| PN G358.5-02.5 | Widma ESO rozstrzygają konflikt. Escudero i in. obserwowali M 4-7 przy deklinacji −31°36′00″, a Al 2-O przy −32°03′04″. W aplikacji skorygowano nazwę mylnie opisanego wiersza na M 4-7. Drugi obiekt był już w katalogu jako PN Al 2-O (PN G358.0-02.7). Starsze oznaczenie PN G358.3-02.5 wycofano z wiersza M 4-7. | [Escudero i in., tabela 1](https://doi.org/10.1051/0004-6361:20031625), [M 4-7 w SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=%402386542) |
| PN G359.5+02.6 | Właściwa nazwa to Al 2-I. | [Astrometria Kimeswengera](https://arxiv.org/abs/astro-ph/0105072), [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=%402492028) |
| PN G359.6+02.2 | Właściwa nazwa to Al 2-K. | [Astrometria Kimeswengera](https://arxiv.org/abs/astro-ph/0105072), [SIMBAD](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=%402410318) |

## Weryfikacja rozbieżności statusu

Wszystkie 15 obiektów ma `T` w PNcat MAST v1 i `L` w publicznym wyciągu HASH z 28.09.2026. Zapytanie SIMBAD według sygnatur i nazw dało jedenaście wpisów typu `PN`, jeden `PN?` i trzy bez jednoznacznego wyniku. Sam typ SIMBAD może pochodzić z wcześniejszego katalogu i nie rozstrzyga przyczyny rozbieżności. Zachowano pięć dotychczasowych rekordów, a dziesięciu pozostałych nie dopisano do importu potwierdzonych PN. [SIMBAD TAP](https://simbad.cds.unistra.fr/simbad/sim-tap) · [Znaczenie statusów HASH](https://doi.org/10.3389/fspas.2022.895287)

| Sygnatura | Obiekt | Weryfikacja | W katalogu |
| --- | --- | --- | --- |
| PN G000.4+02.2 | PM 1-165 | SIMBAD `PN`, 2493246 | — |
| PN G004.0-03.0 | M 2-29 | SIMBAD `PN`, 2497475. Obserwacje HST i VLT opisują mgławicę jako PN. [Gesicki i in.](https://doi.org/10.1051/0004-6361/200913543) | Tak |
| PN G019.7-10.7 | MPA J1906-1634 | SIMBAD `PN`, 4700935 | — |
| PN G020.2-01.9 | Kan 4 | Brak jednoznacznego wpisu w SIMBAD. [Katalog odkrywców podaje `L`](https://planetarynebulae.net/EN/page_np.php?id=88) | Tak |
| PN G021.0+01.9 | Pa 101 | Brak jednoznacznego wpisu w SIMBAD | — |
| PN G022.1+03.0 | PHR J1820-0810 | SIMBAD `PN`, 3878385 | — |
| PN G022.1-02.4 | M 1-57 | SIMBAD `PN`, 2600505 | Tak |
| PN G028.8-00.2 | PHR J1845-0343 | SIMBAD `PN?`, 3878436 | — |
| PN G034.1-01.6 | MPA J1859+0017 | SIMBAD `PN`, 4700932 | — |
| PN G039.0-04.0 | IPHASX J191716.4+033447 | SIMBAD `PN`, 10113706. [Tabela badania ZTF z 2025 r. podaje `L`](https://api.repository.cam.ac.uk/server/api/core/bitstreams/7a22fcc8-3a9b-4962-a3c3-76df63047ee3/content) | — |
| PN G053.1-02.1 | WOW 1 | SIMBAD `PN`, 2754428. [Obrazowanie Hα z 2026 r.](https://doi.org/10.1093/mnras/stag1980) | — |
| PN G080.3-10.4 | MWP 1 | SIMBAD `PN`, 1550045. [Obrazowanie Hα i [O III] opisuje PN](https://aas.aanda.org/articles/aas/pdf/1999/06/ds8208.pdf) | Tak |
| PN G155.5+05.1 | SuFe 1 | Brak jednoznacznego wpisu w SIMBAD. [Katalog odkrywców podaje `L`](https://planetarynebulae.net/EN/page_np.php?id=325) | Tak |
| PN G216.0+07.4 | PHR J0723+0036 | SIMBAD `PN`, 3877720 | — |
| PN G357.4-07.2 | SB 51 | SIMBAD `PN`, 2370043. Ta sama skrócona nazwa występuje też przy osobnej gwieździe, 1239485 | — |
