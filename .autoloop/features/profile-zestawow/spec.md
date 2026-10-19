# profile-zestawow — Profile sprzętu zapisane w przeglądarce

## Cel
Użytkownik ma własną listę profili sprzętu (zestawów), która zapisuje się w przeglądarce. Na start dostaje 4 profile z 6.4, potem może je dodawać, duplikować, zapisywać i usuwać, a aktywny profil wybiera także z górnego paska.

## Przykłady
P1: Pierwsze uruchomienie, w bazie nie ma wpisu `profiles` → lista ma 4 profile w kolejności z 6.4: „Mój zestaw”, „RedCat 51 + ASI2600MC Pro”, „Newton 200/1000 + ASI533MM Pro”, „Esprit 100ED + ASI6200MM Pro” (wartości jak `DEMO_PROFILES`); aktywny jest „Mój zestaw”. Lista zostaje zapisana w tabeli `settings` pod kluczem `profiles`, a podwójne wczytanie jej nie dubluje.

P2: Użytkownik usuwa 3 profile demonstracyjne i ponownie otwiera aplikację → zostaje 1 profil; usunięte profile nie wracają.

P3: Dodaj → na końcu listy pojawia się profil „Nowy zestaw” z wartościami „Mój zestaw” z 6.4 (Newton 150/600, Player One Ares-M Pro, filtry L, R, G, B, Ha, OIII, SII) i nowym id, innym niż wszystkie istniejące. Drugie „Dodaj” daje „Nowy zestaw 2”. Aktywny profil się nie zmienia.

P4: Duplikuj „RedCat 51 + ASI2600MC Pro” → na końcu listy „RedCat 51 + ASI2600MC Pro (kopia)” z tymi samymi wartościami i nowym id. Ponowne duplikowanie oryginału daje „… (kopia 2)”. Zmiana filtrów kopii na tylko „Ha” nie zmienia filtrów oryginału (nadal OSC, DualBand). Aktywny profil się nie zmienia.

P5: Zapis profilu o istniejącym id ze zmienioną nazwą „Szeroki kadr” → profil zostaje na swoim miejscu w liście z nową nazwą, także po ponownym otwarciu aplikacji. Zapis profilu o nowym id → trafia na koniec listy.

P6: Zapis z aperturą 0 mm albo mnożnikiem 4 → odrzucony z komunikatem z `validateEquipment` (np. „Apertura: dozwolony zakres 5–1500 mm”); lista w stanie i w bazie bez zmian. Zapis z aperturą 500 mm i ogniskową 400 mm (f/0,8, tylko ostrzeżenie) → zapisany.

P7: Zapis z pustą nazwą albo samymi spacjami → odrzucony z komunikatem „Nazwa: wpisz nazwę”. Nazwa „  Szeroki kadr ” zapisuje się jako „Szeroki kadr”.

P8: Usunięcie nieaktywnego profilu → znika z listy i z bazy, aktywny bez zmian. Usunięcie aktywnego „Esprit 100ED + ASI6200MM Pro” → aktywny staje się „Mój zestaw”; gdy „Mój zestaw” już nie istnieje → pierwszy profil z listy.

P9: Lista ma 1 profil, próba usunięcia → nic się nie dzieje (jak przy lokalizacjach): lista i baza bez zmian.

P10: Wybór aktywnego profilu na górnym pasku: lista „Zestaw” pokazuje profile ze stanu w ich kolejności. Po dodaniu profilu „Szeroki kadr” pasek ma 5 pozycji, ostatnia to „Szeroki kadr”; wybranie jej ustawia ją jako aktywną.

P11: Aktywny jest własny profil „Szeroki kadr”, użytkownik ponownie otwiera aplikację → po wczytaniu listy z bazy „Szeroki kadr” jest nadal aktywny. Zapamiętane id aktywnego profilu nie jest nadpisywane, zanim lista się wczyta. Jeśli po wczytaniu id nie ma na liście, aktywny staje się „Mój zestaw”, a gdy go nie ma, to pierwszy profil.

P12: `activeProfileOf` ze stanem bez listy profili, np. `{ activeProfileId: 'demo-redcat51-asi2600mc' }` → profil „RedCat 51 + ASI2600MC Pro” z `DEMO_PROFILES`; `{ activeProfileId: 'nie-ma-takiego' }` → „Mój zestaw”. Ze stanem z listą bez `demo-moj-zestaw` i nieznanym id → pierwszy profil z listy.

P13: Wpis `profiles` jest uszkodzony: jeden z 3 profili nie ma ogniskowej → wczytują się 2 poprawne profile. Wpis nie jest listą (np. tekst) albo nie ma w nim żadnego poprawnego profilu → aplikacja używa 4 profili z 6.4 i działa dalej.

P14: Baza przeglądarki jest niedostępna → lista to 4 profile z 6.4 w pamięci, wybór aktywnego działa; dodanie, duplikowanie, zapis i usunięcie kończą się błędem, a lista w stanie zostaje bez zmian.

## Styk z resztą
- `src/data/repositories.ts`: nowe repozytorium profili (wczytanie z zapisem profili startowych, zapis, usunięcie) na tabeli `settings`, wpis `profiles`, wzorowane na `locationRepository` i `planningSettingsRepository`. Bez nowej wersji bazy (`db.verno` zostaje 3).
- `src/state/plannerStore.ts`: lista profili w stanie, wczytywana przy starcie razem z lokalizacjami; akcje dodaj, duplikuj, zapisz, usuń. `activeProfileOf` przyjmuje stan z opcjonalną listą (bez niej `DEMO_PROFILES`); zmiany typów i sygnatur tylko dodające. `activeProfileId` dalej w localStorage.
- `src/app/TopBar.tsx`: lista „Zestaw” z profili w stanie zamiast stałej `PROFILES`.
- Korzysta z `DEMO_PROFILES`, `DEFAULT_PROFILE_ID` (`data/demo.ts`) oraz `validateEquipment` i `hasErrors` (`services/equipment.ts`).

## Poza zakresem
- Lista profili i edytor w Ustawieniach (`zakladka-sprzet`, `formularz-profilu`), w tym nowe reguły dla binningu, przerzutu, filtrów i OAG.
- Własne wpisy teleskopów i kamer (`wlasny-sprzet`).
- Zmiany `DEMO_PROFILES` (sprawdza je `demo.test.ts`).
- Nowa wersja bazy Dexie, synchronizacja między kartami przeglądarki, eksport i import profili.

## Pytania
- Wzorem dla „Dodaj” są wartości profilu „Mój zestaw” z 6.4, bo model danych nie pozwala na puste pola. Nazwy domyślne („Nowy zestaw”, „Nowy zestaw 2”, „(kopia)”, „(kopia 2)”) wybrałem sam.
- Dodanie i duplikowanie nie zmieniają aktywnego profilu, bo 7F wymienia wybór aktywnego jako osobną czynność.
- Dwa profile mogą mieć tę samą nazwę (różnią się id); spec tego nie zabrania.
- Uszkodzony wpis: pomijam tylko złe profile, a profile z 6.4 biorę dopiero, gdy nie zostaje żaden poprawny. Nic nie zapisuję do bazy przy wczytaniu uszkodzonego wpisu; następny zapis nadpisze go bieżącą listą.
