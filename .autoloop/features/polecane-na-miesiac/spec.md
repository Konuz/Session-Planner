# polecane-na-miesiac — Filtr „Polecane na miesiąc”

## Cel
Filtr „Polecane na miesiąc” pokazuje obiekty widoczne (co najmniej minimum godzin czasu efektywnego) w nocy z 15. dnia miesiąca nocy D. To cele dobre na cały bieżący miesiąc, a nie tylko na wybraną noc. [Z22]

## Przykłady
P1: Noc D 16/17.10.2026 → noc odniesienia 15/16.10.2026.

P2: Noc D 31.10/1.11.2026 → noc odniesienia 15/16.10.2026, bo liczy się data wieczoru nocy D.

P3: Noc D 1/2.11.2026 → noc odniesienia 15/16.11.2026.

P4: Noc D 15/16.10.2026 → noc odniesienia to ta sama noc; filtr używa wyników nocy D bez drugiego liczenia.

P5: Noc D 24/25.10.2026; 52,0°N, 19,0°E, 150 m, horyzont płaski; próg −18°, h_min 30°, minimum 3 h, krok 5 min → „Polecane na miesiąc” (wyniki nocy 15/16.10.2026) przyjmuje M 31, NGC 7000, IC 1396 i M 45, a odrzuca M 42.

P6: Wyniki podane wprost, minimum 3 h. Obiekt A ma 4 h w nocy D i 1 h w nocy 15. → „Polecane” go odrzuca, a „Widoczne w wybraną noc” przyjmuje. Obiekt B ma 1 h w nocy D i 5 h w nocy 15. → „Polecane” go przyjmuje, a „Widoczne” odrzuca. Oba filtry naraz → nie przechodzi ani A, ani B.

P7: Granica włącznie: 180 min w nocy 15. przy minimum 3 h → obiekt przechodzi; 179 min → nie.

P8: Minimum z parametrów planowania: obiekt z 2 h 30 min w nocy 15. przechodzi przy minimum 2 h, a przy 3 h nie.

P9: Noc 15. ma stan „brak okna” albo jej wynik jeszcze się liczy → „Polecane” nie przyjmuje żadnego obiektu.

P10: Filtr łączy się z pozostałymi przez „i”: „Polecane” razem z typem „galaktyka” wśród obiektów z P5 → tylko M 31.

## Styk z resztą
- `src/services/catalogFilters.ts`: funkcja „noc odniesienia” (RRRR-MM-15 z daty nocy D) i nowy filtr, który korzysta z drugiego zestawu wyników.
- Wyniki nocy 15. liczy ten sam Worker (`obliczenia-w-tle`) z tymi samymi parametrami co noc D, pod osobnym kluczem (inna noc).
- Minimum godzin z `parametry-planowania`.

## Poza zakresem
- Wysyłanie żądania o noc 15.: robi to zakładka Katalog, tylko gdy filtr jest włączony (`zakladka-katalog`).
- Inny dzień odniesienia, kilka nocy w miesiącu, ranking „najlepsze w miesiącu”.

## Pytania
- „Miesiąc nocy D” to miesiąc daty wieczoru: noc 31.10/1.11 należy do października.
- Noc 15. liczę z tymi samymi parametrami co noc D (próg, obniżanie, h_min, krok, horyzont).
