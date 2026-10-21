# pasek-czasu-kadr — Górny pasek bez kursora czasu w zakładce Kadr

## Cel
W zakładce Kadr górny pasek nie pokazuje kursora czasu (suwaka, godziny i przycisku „Teraz”), bo kadr nie zależy od czasu (7.0). Lokalizacja, noc, zestaw i Red Mode zostają na pasku, a w pozostałych zakładkach pasek wygląda i działa jak dotąd.

**Zmiana 22.10.2026 (decyzja użytkownika):** wiersza kursora nie ma też w zakładce Noc, bo kursorem jest tam wykres nocy, a przycisk „Teraz” stoi w nagłówku wykresu. Przykłady P3 i P6–P8, które wcześniej używały zakładki Noc jako „innej zakładki z kursorem”, używają teraz zakładki Katalog; testy zmieniono tak samo (dochodzi `test_p1_no_cursor_row_in_night`).

## Przykłady
Jeśli nie napisano inaczej: lokalizacja domyślna, noc 20/21.10.2026, tryb „Teraz” wyłączony, kursor 23:00 czasu lokalnego.

P1: Aktywna zakładka Kadr → na górnym pasku nie ma suwaka „Kursor czasu”, nie ma pola z godziną „23:00” i nie ma przycisku „Teraz”.

P2: Aktywna zakładka Kadr → na pasku są: lista „Lokalizacja”, pole „Noc” z datą 2026-10-20, lista „Zestaw” i przycisk „Red Mode”, w tej kolejności co dotąd.

P3: Aktywna zakładka Katalog albo Ustawienia (każda osobno) → pasek ma suwak „Kursor czasu” z wartością 23:00, pole z godziną „23:00” i przycisk „Teraz”, tak jak przed tą zmianą.

P4: Kadr → zmiana zestawu na pasku na inny profil → aktywny profil się zmienia (ramka w Kadrze też, jak w `zakladka-kadr` P18). Tak samo działa zmiana lokalizacji.

P5: Kadr → przycisk „Red Mode” → Red Mode się włącza (przycisk ma `aria-pressed="true"`); drugie kliknięcie go wyłącza.

P6: Kadr → zmiana nocy na 2026-10-25 → noc to 25/26.10.2026, a kursor ustawia się tak samo jak przy zmianie nocy w innych zakładkach (tryb „Teraz” się wyłącza). Po przejściu do zakładki Katalog suwak pokazuje ten kursor.

P7: Katalog, kursor przesunięty na 01:30 → przejście do Kadr → powrót do Katalogu → kursor nadal 01:30, tryb „Teraz” nadal wyłączony. Samo wejście do Kadru nie zmienia kursora ani trybu.

P8: Tryb „Teraz” włączony → przejście do Kadr → tryb „Teraz” zostaje włączony, a kursor dalej odświeża się co 60 s (jak w 7.0). Po powrocie do Katalogu przycisk „Teraz” jest wciśnięty, a suwak pokazuje bieżącą godzinę.

P9: Kadr → przejście do Katalog → suwak, godzina i „Teraz” pojawiają się od razu, bez ponownego uruchomienia.

P10: Górny pasek wyrenderowany bez ustawionej zakładki (stan początkowy, zakładka Katalog) → pasek pokazuje listę „Zestaw” i kursor czasu jak dotąd; pomocnicze funkcje testów `profile-zestawow` i `zakladka-sprzet` znajdują listę „Zestaw” tak jak wcześniej.

## Styk z resztą
- `src/app/TopBar.tsx`: wiersz z suwakiem, godziną i „Teraz” pokazuje się tylko, gdy aktywna zakładka nie jest Kadrem ani Nocą (od 22.10.2026). Zakładkę pasek czyta ze wspólnego stanu (`tab` w `src/state/plannerStore.ts`), więc `TopBar` nadal nie przyjmuje żadnych parametrów.
- `src/App.tsx` (odświeżanie co 60 s w trybie „Teraz”) i `plannerStore.ts` bez zmian.
- Zamrożone testy `profile-zestawow` i `zakladka-sprzet` renderują `TopBar` — muszą przechodzić bez zmian.

## Poza zakresem
- Zmiany w samym kursorze czasu, trybie „Teraz” albo zasadach ustawiania kursora po zmianie nocy.
- Ukrywanie innych elementów paska w Kadrze (np. nocy, która w Kadrze też nic nie zmienia).
- Zmiany w wyglądzie paska w innych zakładkach i w nawigacji.

## Pytania
- Przyjąłem, że w Kadrze znika cały wiersz kursora (suwak, godzina, „Teraz”), a nie tylko zostaje wyłączony (szary). Specyfikacja mówi „kursora nie ma”.
- Przyjąłem, że pole „Noc” zostaje w Kadrze, choć kadr od nocy nie zależy — tak mówi 7.0 („reszta paska zostaje”).
- Tryb „Teraz” działa w tle także w Kadrze (P8); nie wyłączam go przy wejściu do Kadru.
