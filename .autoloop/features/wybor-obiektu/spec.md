# wybor-obiektu — Obiekt z katalogu na wykresie nocy

## Cel
Z karty w katalogu użytkownik otwiera obiekt na wykresie nocy. Zakładka Noc pokazuje każdy obiekt z katalogu, a nie tylko z listy „Klasyki”.

## Przykłady
P1: Karta M 13 w katalogu → przycisk „Pokaż na wykresie nocy” → aktywna jest zakładka Noc z obiektem M 13. Noc, lokalizacja i kursor czasu się nie zmieniają.

P2: Zakładka Noc z M 13 → nazwa „M 13 (Hercules Globular Cluster)”. Lista wyboru ma 27 pozycji: M 13 na górze, potem 26 obiektów z „Klasyki” w dotychczasowej kolejności; zaznaczony jest M 13.

P3: Następnie wybór M 42 z listy → lista ma znowu 26 pozycji, zaznaczony M 42.

P4: Karta M 31 (jest w „Klasyki”) → lista ma 26 pozycji, zaznaczony M 31.

P5: Ponowne uruchomienie aplikacji z zapamiętanym M 13 → zakładka Noc nadal pokazuje M 13.

P6: Zapamiętany obiekt, którego nie ma w katalogu (np. o kluczu „NGC9999”) → zakładka Noc pokazuje M 31.

P7: Etykieta pola wyboru brzmi „Obiekt” zamiast „Obiekt z listy „Klasyki””.

P8: Przycisk „Pokaż na wykresie nocy” ma ikonę, tekst i co najmniej 44 px wysokości.

## Styk z resztą
- Karta z `karta-obiektu` dostaje przycisk.
- `src/state/plannerStore.ts`: akcja otwarcia obiektu (uid trafia do `objectUid`, zakładka zmienia się na `'night'`). `objectUid` jest już zapamiętywany w `localStorage`.
- `src/data/featuredObjects.ts`: `selectFeatured` działa także na całym katalogu (zwraca obiekt o danym uid albo M 31). Lista opcji to „Klasyki” plus bieżący obiekt spoza tej listy, liczona czystą funkcją. Sygnatury `featuredObjects`, `selectFeatured` i `DEFAULT_OBJECT` zostają bez zmian, bo używa ich test w `src/data/locations.test.ts`.
- `src/features/night/useFeaturedObjects.ts`: hak zachowuje nazwę i kształt wyniku (stan `ready` z listą „Klasyki” oraz `retry`); cały katalog dochodzi jako dodatkowe pole. Nie zastępuj go nowym hakiem, bo wcześniejsze testy mogą go podmieniać.
- `src/features/night/NightTab.tsx`: wybiera obiekt z całego katalogu (`loadCatalog` już pobiera cały plik).

## Poza zakresem
- Wyszukiwarka obiektów w zakładce Noc.
- Historia oglądanych obiektów.
- Kilka obiektów na jednym wykresie.
- Widok sfery (7D).

## Pytania
- Obiekt spoza „Klasyki” jest dodatkową, pierwszą pozycją listy i znika po wybraniu innego obiektu.
- Tekst przycisku „Pokaż na wykresie nocy” to moja propozycja.
