# wlasny-sprzet — Własne teleskopy i kamery w katalogu sprzętu

## Cel
Użytkownik zapisuje teleskop albo kamerę z formularza profilu jako własny wpis katalogu („Zapisz jako mój teleskop / moją kamerę”), a potem wybiera ten wpis w kolejnych profilach. Własne wpisy może poprawiać i usuwać, a wbudowane tylko skopiować jako własne. Profile przy tym nie zmieniają swoich wartości [Z26].

## Przykłady
P1: Formularz: teleskop „Mój Newton 80/480”, apertura 80, ogniskowa 480, mnożnik 0,8 → „Zapisz jako mój teleskop” → nowy wpis `origin: 'user'` z aperturą 80 mm i ogniskową 480 mm (ogniskowa natywna, nie 384). Id wpisu różni się od wszystkich wpisów wbudowanych i własnych. Wpis jest zapisany w bazie i widoczny po ponownym otwarciu aplikacji.
P2: Formularz: kamera „Moja 294”, 4144 × 2822 px, piksel „4.63”, OSC, binning 2 → „Zapisz jako moją kamerę” → wpis z pikselem 4,63 µm i typem OSC. Binning nie należy do wpisu.
P3: Zapis teleskopu udaje się, nawet gdy pole piksela kamery ma błąd „abc”. Zapis kamery udaje się, nawet gdy apertura ma błąd. Sprawdzane są tylko pola zapisywanego wpisu.
P4: Apertura „0” → zapis odrzucony z komunikatem „Apertura: dozwolony zakres 5–1500 mm”, w bazie nic nowego. Apertura 500 i ogniskowa 400 (f/0,8, tylko ostrzeżenie) → wpis zapisany.
P5: Nazwa pusta albo same spacje → „Nazwa teleskopu: wpisz nazwę” / „Nazwa kamery: wpisz nazwę”, nic nie zapisane. Nazwa „  Mój Newton ” zapisuje się jako „Mój Newton”.
P6: Po zapisie z P1 profil w formularzu wskazuje nowy wpis (`specId` = id wpisu), jego etykieta to dokładnie „Mój Newton 80/480” (bez spacji na początku) i nie ma oznaczeń „zmienione względem katalogu”.
P7: Profil wskazuje już własny wpis „Mój Newton 80/480”. Ponowne „Zapisz jako mój teleskop” z nazwą „Mój Newton 2” → powstaje drugi, nowy wpis. Pierwszy zostaje bez zmian.
P8: W innym profilu wyszukiwarka teleskopu z frazą „mój newton” pokazuje „Mój Newton 80/480” (wyszukiwarka z `formularz-profilu` P6). Własny wpis o nazwie „Esprit 100ED” pojawia się obok wbudowanego „Sky-Watcher Esprit 100ED”.
P9: (T18, edycja) profil „Szeroki kadr” powstał z własnego wpisu z ogniskową 600 mm. Zmiana wpisu na 610 mm i nazwy na „Newton po kolimacji” → wpis ma to samo id i `origin: 'user'`, nowy wpis nie powstaje. Profil ma dalej 600 mm i dawną etykietę. W edytorze profilu przy ogniskowej pojawia się „zmienione względem katalogu” (600 ≠ 610). Edycja z aperturą „0” albo pustą nazwą jest odrzucona z tymi samymi komunikatami co w P4 i P5, a wpis w bazie zachowuje poprzednie wartości.
P10: (T18, usunięcie) usunięcie wpisu z P9 → profil ma dalej 600 mm i swoje wartości. Teleskop jest pokazany jako „Własny”, bez oznaczeń „zmienione”. Zapisany `specId` profilu nie jest przepisywany, a wpis `profiles` w tabeli `settings` się nie zmienia.
P11: „Duplikuj jako własny” na wbudowanym „Sky-Watcher Esprit 100ED” → własny wpis „Sky-Watcher Esprit 100ED (kopia)” z tymi samymi wartościami (100 / 550, konstrukcja refraktor). Kolejne duplikowanie daje „(kopia 2)”. Kamera „ZWO ASI6200MM Pro” → kopia z tym samym modelem matrycy IMX455. Wpis wbudowany zostaje bez zmian.
P12: Edycja albo usunięcie wpisu wbudowanego (np. `skywatcher-esprit-100ed`) → odrzucone z komunikatem „Wpis wbudowany jest tylko do odczytu: możesz go zduplikować”. Listy wpisów bez zmian.
P13: Lista własnych wpisów jest posortowana po nazwie według polskich zasad: „Ćma 50”, „Mój Newton 80/480”, „Żuraw 70”. „Ćma” stoi przed „Mój”, choć zwykłe porównanie kodów znaków postawiłoby ją po „Mój”.
P14: Baza przeglądarki jest niedostępna → zapis, edycja, duplikowanie i usunięcie kończą się błędem, a listy wpisów i profil w formularzu zostają bez zmian.

## Styk z resztą
- Nowy plik `src/features/equipment/userEquipment.ts` (czyste funkcje i cienkie akcje na bazie): wartości formularza → wpis teleskopu / kamery, kopia wpisu wbudowanego, etykieta wpisu, lista własnych wpisów, sprawdzenie „wpis wbudowany”.
- Korzysta z gotowych `telescopeRepository` i `cameraRepository` (`data/repositories.ts`, tabele `userTelescopes` i `userCameras`, bez nowej wersji bazy). Ich komunikat błędu z id wpisu zostaje bez zmian (sprawdza go `repositories.test.ts`). Przyjazny komunikat z P12 powstaje w nowym pliku.
- Używa `validateEquipment`, `hasErrors`, `findSpec`, `changedTelescopeFields`, `changedCameraFields` (`services/equipment.ts`), `BUILTIN_TELESCOPES`, `BUILTIN_CAMERAS` oraz teksty nazw z `formularz-profilu` (P17).

## Poza zakresem
- Wygląd przycisków i listy własnych wpisów (`zakladka-sprzet`).
- Zapis i lista profili (`profile-zestawow`), czytanie pól i podgląd formularza (`formularz-profilu`).
- Przepisywanie `specId` w profilach, zmiany `DEMO_PROFILES`, nowa wersja bazy, synchronizacja między kartami, eksport i import.

## Pytania
- Formularz ma tylko nazwę, a wpis ma markę, model i konstrukcję (kamera: model matrycy). Przyjmuję: marka pusta, model = nazwa, konstrukcja „inna” (`other`), model matrycy `null`. Etykieta wpisu to marka i model rozdzielone spacją, a przy pustej marce sam model (P6). Kopie wbudowanych zachowują swoje prawdziwe wartości.
- Po „Zapisz jako…” profil w formularzu od razu wskazuje nowy wpis (P6). Sam profil zapisuje się dopiero przyciskiem zapisu profilu.
- „Zapisz jako…” zawsze dodaje nowy wpis (P7); poprawianie istniejącego wpisu to osobna czynność „Edytuj”.
- Usunięcie wpisu wbudowanego to błąd z komunikatem, a nie cicha bezczynność (dziś repozytorium nic nie robi). Teksty komunikatu i dopisku „(kopia)” wybrałem sam, wzorem `profile-zestawow`.
- Sortowanie po nazwie zamiast kolejności dodania, bo baza oddaje wiersze według id. Dwa wpisy mogą mieć tę samą nazwę.
- Usunięcie wpisu nie pyta, ile profili z niego korzysta; to ewentualnie zadanie `zakladka-sprzet`.
