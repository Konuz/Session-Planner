# zakladka-sprzet — Sekcja „Sprzęt” w Ustawieniach (7F)

## Cel
W Ustawieniach, w sekcji „Sprzęt”, użytkownik zarządza listą zestawów: dodaje, duplikuje, usuwa i ustawia aktywny. Aktywny zestaw edytuje w formularzu z wyszukiwarkami, przyciskami mnożnika, komunikatami i podglądem na żywo. Tu też zapisuje, przegląda, poprawia, duplikuje i usuwa własne wpisy teleskopów i kamer.

## Przykłady
Liczby, komunikaty walidacji, wyniki wyszukiwania i oznaczenia „zmienione” liczy model z `formularz-profilu`. Reguły własnych wpisów pochodzą z `wlasny-sprzet`. Ta funkcja sprawdza, że to wszystko widać w interfejsie, przy właściwym polu.

P1: Pierwsze uruchomienie → sekcja „Sprzęt” stoi między edycją lokalizacji a „Parametrami planowania”. Ma podsekcje „Zestawy”, „Edycja zestawu: Mój zestaw” i „Mój sprzęt”. W „Zestawach” są 4 przyciski zestawów w kolejności z 6.4, każdy z atrybutem `aria-pressed`, i przyciski „Dodaj zestaw”, „Duplikuj zestaw”, „Usuń zestaw” bez `aria-pressed`. Wciśnięty jest tylko „Mój zestaw”. Gdy aktywny jest „Newton 200/1000 + ASI533MM Pro”, wciśnięty jest tylko on, a nagłówek to „Edycja zestawu: Newton 200/1000 + ASI533MM Pro”.
P2: Klik „RedCat 51 + ASI2600MC Pro” na liście → ten zestaw staje się aktywny, także na górnym pasku. Edytor pokazuje 51 / 250, 6248 × 4176, „3,76”, OSC. Wybór „Esprit 100ED + ASI6200MM Pro” na górnym pasku → edytor pokazuje ten zestaw.
P3: „Dodaj zestaw” → na końcu listy przycisk „Nowy zestaw”; aktywny zestaw i edytor bez zmian. „Duplikuj zestaw” przy aktywnym „RedCat 51 + ASI2600MC Pro” → na końcu „RedCat 51 + ASI2600MC Pro (kopia)”. Baza niedostępna → komunikat „Nie udało się dodać zestawu: <przyczyna>” albo „Nie udało się zduplikować zestawu: <przyczyna>”; lista bez zmian.
P4: „Usuń zestaw” przy aktywnym „Esprit 100ED + ASI6200MM Pro” → pytanie „Usunąć „Esprit 100ED + ASI6200MM Pro”?” z przyciskami „Usuń” i „Anuluj”. „Anuluj” nic nie zmienia. „Usuń” usuwa zestaw i aktywnym staje się „Mój zestaw”. Przy 1 zestawie „Usuń zestaw” jest nieaktywny, z podpowiedzią (`title`) „Ostatniego zestawu nie można usunąć”. Błąd bazy → „Nie udało się usunąć: <przyczyna>”.
P5: (T18) „esprit” w polu „Szukaj teleskopu” → lista „Wyniki: teleskopy” z dokładnie 5 przyciskami:
- „Własny”;
- „Sky-Watcher Esprit 80ED — 80/400 mm”;
- „Sky-Watcher Esprit 100ED — 100/550 mm”;
- „Sky-Watcher Esprit 120ED — 120/840 mm”;
- „Sky-Watcher Esprit 150ED — 150/1050 mm”.

Klik na 100ED ustawia Nazwę teleskopu „Sky-Watcher Esprit 100ED”, Aperturę „100” i Ogniskową „550”. Nad polami pojawia się „Z katalogu: Sky-Watcher Esprit 100ED”, a pole szukania się czyści. „asi6200mm” w „Szukaj kamery” → „Własna” i jeden wynik „ZWO ASI6200MM Pro — 9576 × 6388 px, 3,76 µm, mono”. Klik → pola 9576, 6388, „3,76”, typ mono. Podgląd: „f/5,50”, „3,750° × 2,502° (225,0′ × 150,1′)”, „1,410″/px”.
P6: Pusta wyszukiwarka i „xyz123” → tylko „Własny” (kamera: „Własna”). Własny wpis „Mój Newton 80/480” pasuje do „mój newton” jako „Mój Newton 80/480 — 80/480 mm (mój)”. Klik „Własny” → nad polami „Własny (wpis ręczny)”, a wartości pól zostają. Zestaw z własnym wpisem → „Mój wpis: Mój Newton 80/480”.
P7: (T18) Zestaw z P5, Ogniskowa „600” → pod polem Ogniskowa napis „zmienione względem katalogu”, a pod Aperturą go nie ma. W wynikach wyszukiwania Esprit 100ED dalej ma „100/550 mm”. Powrót do „550” usuwa napis. Typ kamery mono → OSC daje ten napis przy polu „Typ”.
P8: Przyciski mnożnika „0,63×”, „0,7×”, „0,73×”, „0,8×”, „0,85×”, „1,0×”, „2,0×”. Przy mnożniku 1 wciśnięty (`aria-pressed="true"`) jest tylko „1,0×”. Klik „0,85×” → Mnożnik „0,85” i wciśnięty tylko „0,85×”. Wpisane „0,9” → żaden.
P9: Błąd stoi pod polem, które ma `aria-invalid="true"`; „Zapisz zestaw” jest wtedy nieaktywny.
- Apertura „0” → „Apertura: dozwolony zakres 5–1500 mm”.
- Rozdzielczość X „1000,5” → „Rozdzielczość X: wpisz liczbę całkowitą”.
- Pusta „Nazwa profilu” → „Nazwa profilu: wpisz nazwę”.
- Pusta „Nazwa kamery” → „Nazwa kamery: wpisz nazwę”.
P10: (T19) Apertura „500”, Ogniskowa „400” → pod Ogniskową ostrzeżenie „Nietypowa światłosiła f/0,8: sprawdź ogniskową i aperturę”, bez `aria-invalid`. „Zapisz zestaw” jest aktywny i zapis się udaje. Kamera 9576 px, piksel „7” → pod Rozmiarem piksela „Dłuższy bok matrycy ma 67,03 mm: sprawdź rozmiar piksela i rozdzielczość”; zapis też jest możliwy.
P11: Podgląd to lista `<dl>`: każdy `<dt>` („F_eff”, „Światłosiła”, „Matryca”, „Pole widzenia”, „Skala”, „Próbkowanie”) ma swój `<dd>`. Zestaw T17 (80/480, „0,8”, 4144 × 2822, „4,63”, OSC, binning 1) → „384 mm”, „f/4,80”, „19,19 × 13,07 mm, przekątna 23,21 mm”, „2,862° × 1,949° (171,7′ × 117,0′)”, „2,487″/px”. Pod listą jest uwaga „Kamera kolorowa (OSC): efektywna rozdzielczość jest niższa, niż wynika ze skali.” Binning 2 → „4,974″/px”, a pole widzenia bez zmian. Typ mono → bez uwagi.
P12: Piksel „abc” → „—” w Matrycy, Polu widzenia, Skali i Próbkowaniu; F_eff i Światłosiła zostają. Apertura „abc” → „—” tylko w Światłosile.
P13: Seeing pochodzi z parametrów planowania:
- Newton 150/600 + Ares-M Pro, seeing 2,5″ → Próbkowanie „podpróbkowanie (seeing 2,5″)”;
- po zapisaniu seeingu 3 → „idealne (seeing 3″)”;
- Newton 200/1000 + ASI533MM, 2,5″ → „nadpróbkowanie (seeing 2,5″)”.
P14: Pola formularza:
- Nazwa profilu;
- teleskop: Nazwa teleskopu, Apertura [mm], Ogniskowa [mm];
- Mnożnik [×];
- kamera: Nazwa kamery, Rozdzielczość X [px], Rozdzielczość Y [px], Rozmiar piksela [µm], Typ (mono, OSC), Binning (1, 2, 3, 4);
- Montaż (GEM, widłowy, alt-az), Przerzut [min];
- 9 pól wyboru filtrów L, R, G, B, Ha, OIII, SII, OSC, DualBand.

„Mój zestaw” ma zaznaczone L, R, G, B, Ha, OIII, SII, a „RedCat 51 + ASI2600MC Pro” tylko OSC i DualBand. Pole wyboru „OAG” jest odznaczone przy `oag: null`. Po zaznaczeniu pojawiają się puste pola „Szerokość pryzmatu [mm]”, „Wysokość pryzmatu [mm]”, „Odległość od środka matrycy [mm]”, „Kąt OAG [°]”.
P15: Bez zmian → „Zapisz zestaw” i „Odrzuć zmiany zestawu” są nieaktywne i nie ma napisu „Niezapisane zmiany”. Ogniskowa 600 → 610 → „Niezapisane zmiany” i oba przyciski aktywne. „Odrzuć zmiany zestawu” → pole wraca do „600” i nic się nie zapisuje.
P16: Ogniskowa „610” i „Zapisz zestaw” → komunikat „Zapisano zestaw.”, a stan i baza mają 610. Nazwa „Szeroki kadr” → przycisk na liście, nagłówek edytora i górny pasek pokazują „Szeroki kadr”. Baza niedostępna → „Nie udało się zapisać: <przyczyna>”, a formularz zachowuje „610”.
P17: Niezapisane zmiany w „Mój zestaw”, potem wybór innego zestawu na liście albo na górnym pasku → zmiany przepadają bez pytania. Powrót do „Mój zestaw” pokazuje wartości zapisane.
P18: „Zapisz jako mój teleskop” stoi pod polami teleskopu, a „Zapisz jako moją kamerę” pod polami kamery. Nazwa teleskopu „Mój Newton 80/480”, 80/480, mnożnik „0,8”, klik „Zapisz jako mój teleskop”:
- komunikat „Zapisano „Mój Newton 80/480” jako mój teleskop.”;
- „Mój sprzęt” pokazuje „Mój Newton 80/480 — 80/480 mm” (natywna ogniskowa, nie 384);
- nad polami pojawia się „Mój wpis: Mój Newton 80/480”, bez „zmienione”;
- pojawia się „Niezapisane zmiany”: zestaw zapisuje dopiero „Zapisz zestaw”.

Ponowny klik z nazwą „Mój Newton 2” tworzy drugi wpis. Przycisk teleskopu jest nieaktywny przy błędzie w polach teleskopu (np. Apertura „0” albo pusta Nazwa teleskopu). Błąd tylko w polach kamery (np. piksel „abc”) go nie blokuje, i odwrotnie dla przycisku kamery. Baza niedostępna → „Nie udało się zapisać wpisu: <przyczyna>”, a formularz bez zmian.
P19: Przy „Z katalogu: Sky-Watcher Esprit 100ED” jest przycisk „Duplikuj jako własny”. Klik → w „Mój sprzęt” pojawia się „Sky-Watcher Esprit 100ED (kopia) — 100/550 mm”. Drugi klik → „… (kopia 2)”. Formularz i wpis wbudowany zostają bez zmian. Przy „Mój wpis: …” i „Własny (wpis ręczny)” tego przycisku nie ma. Tak samo działa kamera: „ZWO ASI6200MM Pro (kopia)”.
P20: „Mój sprzęt” przed wczytaniem wpisów → „Wczytywanie własnych wpisów…”. Bez własnych wpisów → „Brak własnych wpisów. Użyj „Zapisz jako mój teleskop” albo „Zapisz jako moją kamerę”.”. Z wpisami → listy „Teleskopy” i „Kamery” tylko z wpisami `origin: 'user'`, w kolejności z `wlasny-sprzet` (P13: „Ćma 50”, „Mój Newton 80/480”, „Żuraw 70”). Każdy wpis ma przyciski „Edytuj” i „Usuń”. Wpisów wbudowanych tu nie ma. Gdy akcja zwróci błąd, np. „Wpis wbudowany jest tylko do odczytu: możesz go zduplikować”, ten komunikat pojawia się pod listą.
P21: (T18) Własny „Mój Newton” 150/600 i zestaw „Szeroki kadr” z niego zapisany.
- „Edytuj” → pod wpisem pola Nazwa teleskopu, Apertura, Ogniskowa i przyciski „Zapisz wpis” i „Anuluj”.
- Ogniskowa 610, nazwa „Newton po kolimacji” i „Zapisz wpis” → lista pokazuje „Newton po kolimacji — 150/610 mm”. Zestaw dalej ma 600 i dawną etykietę, a przy jego Ogniskowej jest „zmienione względem katalogu”.
- Apertura „0” → pod polem wpisu „Apertura: dozwolony zakres 5–1500 mm”, a „Zapisz wpis” nieaktywny.
- „Usuń” → pytanie „Usunąć wpis „Newton po kolimacji”? Zestawy zachowają swoje wartości.” z „Usuń” i „Anuluj”. „Usuń” → wpis znika z listy i z wyników wyszukiwania.
- Edytor „Szeroki kadr” pokazuje „Własny (wpis ręczny)”, 150/600 i żadnego „zmienione”.
P22: Pola i przyciski mają klasy `control` i `button` (co najmniej 44 px), a kolory pochodzą tylko z tokenów (Red Mode). Błąd, ostrzeżenie i „zmienione” różnią się tekstem, nie samym kolorem.

## Styk z resztą
- `src/features/settings/SettingsTab.tsx`: `<EquipmentSection />` z nagłówkiem h2 „Sprzęt”, po edycji lokalizacji i przed „Parametrami planowania”. Podsekcje mają nagłówki h3.
  - Nagłówek edytora zaczyna się od „Edycja zestawu:”, a nie „Edycja:”.
  - Przyciski nie nazywają się „Zapisz zmiany” ani „Odrzuć zmiany”.
  - Powód: zamrożone testy `edytor-parametrow` szukają nagłówka „Edycja:” i przycisków sekcji parametrów.
- `src/features/equipment/` — komponenty prezentacyjne, sterowane przez właściwości, żeby każdy stan dało się wyrenderować w Node:
  - `EquipmentSection.tsx` (kontener): łączy stan aplikacji i akcje. Trzyma stan lokalny: formularz, frazy szukania, potwierdzenia, edytowany wpis, listę wpisów i komunikaty. Własne wpisy wczytuje przez `userEquipment.ts` po otwarciu sekcji i po każdej zmianie; do tego czasu ma tylko wbudowane.
  - `ProfileList.tsx`: `profiles`, `activeId`, `canRemove`, `confirmRemove`, `error`, `onSelect`, `onAdd`, `onDuplicate`, `onRemoveRequest`, `onRemoveConfirm`, `onRemoveCancel`.
  - `ProfileEditor.tsx`:
    - dane: `form`, `saved`, `telescopes`, `cameras` (wbudowane i własne), `seeingArcsec`, `telescopeQuery`, `cameraQuery`, `message`;
    - zdarzenia: `onFormChange`, `onQueryChange`, `onSave`, `onDiscard`, `onSaveTelescope`, `onSaveCamera`, `onDuplicateBuiltin`.
  - `OwnEquipmentList.tsx`: `telescopes`, `cameras` (tylko własne, `null` = wczytywanie), `editing`, `editForm`, `confirmRemove`, `message`, `onEdit`, `onEditChange`, `onEditSave`, `onEditCancel`, `onRemoveRequest`, `onRemoveConfirm`, `onRemoveCancel`.
  - `equipmentSectionModel.ts`: czyste funkcje widoku, np. czy są niezapisane zmiany i napis źródła („Z katalogu: …”, „Mój wpis: …”, „Własny (wpis ręczny)”).
- Edytor edytuje aktywny zestaw. Klucz komponentu to id i zapisane wartości zestawu, więc zmiana aktywnego zestawu albo zapis ustawia formularz na nowo.
- Stan aplikacji (`plannerStore`): `activeProfileId`, `selectProfile`, lista zestawów oraz akcje dodaj, duplikuj, zapisz i usuń z `profile-zestawow`. Seeing to `planningSettings.seeingArcsec`.
- `profileForm.ts` (`formularz-profilu`) daje formularz, walidację, podgląd, wyszukiwarkę i oznaczenia „zmienione”. Przyciski mnożnika pochodzą z `REDUCER_PRESETS`.
- `userEquipment.ts` (`wlasny-sprzet`) daje zapis jako własny, edycję, duplikowanie, usuwanie, etykietę (marka i model), listę własnych wpisów i komunikaty.

## Poza zakresem
- Zapis zestawów w bazie, reguły dodawania i usuwania, zmiana `TopBar.tsx` (`profile-zestawow`).
- Obliczenia, walidacja i wyszukiwanie (`formularz-profilu`); logika, walidacja i kolejność własnych wpisów (`wlasny-sprzet`).
- Zmiana kolejności zestawów, eksport i import, pytanie o niezapisane zmiany przy zmianie zestawu, liczba zestawów korzystających z usuwanego wpisu.

## Pytania
- Edytor edytuje aktywny zestaw, tak jak przy lokalizacjach. Klik na liście ustawia zestaw jako aktywny, więc nie ma osobnego „Ustaw jako aktywny”. „Duplikuj zestaw” kopiuje aktywny zestaw.
- „Duplikuj jako własny” stoi przy napisie „Z katalogu: …” i nie zmienia formularza (P19). `wlasny-sprzet` nie mówi, czy formularz ma wtedy wskazać kopię.
- Pola edycji wpisu to Nazwa i wartości liczbowe. Kopia wpisu wbudowanego ma markę, a przy edycji nazwy to `userEquipment.ts` rozstrzyga, jak nazwa dzieli się na markę i model.
- Pusta wyszukiwarka nie pokazuje wyników. Teksty wyników, dopisek „(mój)”, napisy źródła, „Wczytywanie własnych wpisów…”, „Nie udało się zapisać wpisu: …” i pytania o usunięcie to moja propozycja.
- Niezapisane zmiany przepadają bez pytania przy zmianie zestawu, jak przy lokalizacjach.
