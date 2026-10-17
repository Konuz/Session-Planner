# rekomendacje-filtrow — Rekomendacje filtrów według Księżyca

## Cel
Każdy filtr aktywnego zestawu dostaje dla obiektu kolor zielony, żółty albo czerwony według tabeli z 7A. Kolor zależy od tego, jak długo Księżyc jest pod horyzontem, gdy obiekt jest widoczny, jak mocno Księżyc świeci i jak blisko obiektu się znajduje; progi pochodzą z parametrów planowania.

## Przykłady
Okno efektywne to te próbki okna ciemności, w których obiekt jest widoczny (nad h_min i nad horyzontem lokalnym). „Pod horyzontem” oznacza udział okna efektywnego z Księżycem pod horyzontem; separacja to najmniejsza separacja w tym oknie.

P1: Noc 16/17.10.2026, M 31, Mój zestaw (52,0°N, 19,0°E, 150 m, horyzont płaski, próg −18°, h_min 30°, krok 5 min). Okno efektywne M 31 to całe okno 19:40–05:19 CEST. Księżyc zachodzi o 20:25 CEST, więc jest nad horyzontem tylko na początku, przez mniej niż 10% tego okna (ok. 8%), a pod horyzontem przez co najmniej 90% → L, R, G, B, Ha, OIII i SII zielone. [AC5, T4, T7]

P2: Noc 24/25.10.2026, M 31, Mój zestaw, te same ustawienia: Księżyc jest nad horyzontem przez całe okno efektywne (pod horyzontem 0%), oświetlenie w środku okna ≈ 98% (±1 punkt procentowy) → L, R, G, B czerwone. [AC6, T5]

P3: Galaktyka, dane podane wprost: pod horyzontem dokładnie 80%, oświetlenie 90%, separacja 10° → wszystkie filtry zielone (granica włącznie).

P4: Galaktyka, pod horyzontem 50%, oświetlenie 10%, separacja 30° → L, R, G, B zielone; Ha i SII żółte; OIII czerwony.

P5: Galaktyka, pod horyzontem 50%, oświetlenie 40%, separacja 95° → L, R, G, B żółte; Ha i SII zielone; OIII zielony.

P6: Galaktyka, pod horyzontem 50%: oświetlenie dokładnie 15% i separacja dokładnie 90° → L, R, G, B żółte, bo 15% to nie „poniżej 15%”, a 90° spełnia „od 90°”. Oświetlenie 50% i separacja 120° → L, R, G, B czerwone.

P7: Galaktyka, pod horyzontem 50%, oświetlenie 40%: Ha i SII przy separacji 50° → zielony; 25° → żółty; 24,9° → czerwony.

P8: Galaktyka, pod horyzontem 50%: OIII przy separacji 70° i oświetleniu 75% → żółty; 70° przy 74% → zielony; 39,9° przy 40% → czerwony.

P9: Mgławica refleksyjna (np. vdB 141) albo ciemna (np. LDN 1235); pod horyzontem 30%, oświetlenie 40%, separacja 120° → L, R, G, B czerwone (te typy nie mają stanu żółtego), Ha i SII zielone, OIII zielony. Przy oświetleniu 10% L, R, G, B są zielone.

P10: Galaktyka z danymi z P5, zestaw RedCat 51 + ASI2600MC Pro (filtry OSC i DualBand) → tylko dwie rekomendacje: OSC żółty (jak L, R, G, B) i DualBand zielony (jak OIII). Mój zestaw → siedem, w kolejności L, R, G, B, Ha, OIII, SII.

P11: Galaktyka z danymi z P3, zmieniony próg „pod horyzontem” 95% zamiast 80% → L, R, G, B czerwone, Ha i SII czerwone, OIII czerwony.

P12: Obiekt bez czasu efektywnego (0 min albo „brak okna”) → brak rekomendacji.

P13: Próbki podane wprost: obiekt widoczny tylko 20:00–21:00 i 03:00–04:00 → udział Księżyca pod horyzontem i najmniejszą separację liczy się tylko z próbek tych dwóch godzin, a oświetlenie z próbki w chwili 00:00, czyli w połowie między początkiem pierwszej a końcem ostatniej części.

P14: Pełny katalog z danymi Księżyca (noc 16/17.10.2026, krok 5 min) nadal liczy się w czasie do 3 s. [AC7]

## Styk z resztą
- `src/services/filterAdvice.ts`: czysta funkcja: dane Księżyca obiektu (udział okna efektywnego z Księżycem pod horyzontem, oświetlenie w środku okna efektywnego, najmniejsza separacja), typ obiektu, `MoonRuleThresholds` z parametrów i filtry aktywnego zestawu → kolor dla każdego filtru, w kolejności filtrów zestawu.
- Grupy filtrów: L, R, G, B, OSC → `broadband` (dla `reflection_nebula` i `dark_nebula` → `broadbandFaintNebula`); Ha, SII → `hydrogenSulfur`; OIII, DualBand → `oxygen`. Pola `*Max` są wyłączne, pola `*Min` włączne (sekcja 5).
- Dane Księżyca obiektu liczy osobna czysta funkcja z próbek okna. Każda próbka ma: chwilę, czas trwania, czy obiekt jest widoczny, wysokość Księżyca, oświetlenie i separację. Wynik to udział pod horyzontem, oświetlenie w środku okna efektywnego i najmniejsza separacja. Dzięki temu P13 da się podać wprost.
- Rozszerzenie `src/services/catalogNight.ts`: Księżyc liczony raz na krok siatki (`bodyPosition`, `moonIlluminatedFraction`); podsumowanie obiektu dostaje dane Księżyca z funkcji powyżej. Separacja to `angularSeparationDeg` między współrzędnymi daty obiektu a topocentryczną pozycją Księżyca, jak w T7.
- Dane Księżyca przychodzą z Workera w wyniku nocy (`obliczenia-w-tle`). Kolory liczy wątek główny, więc zmiana progów nie wymaga ponownego liczenia.

## Poza zakresem
- Wygląd odznak na karcie (`karta-obiektu`).
- Własne grupy filtrów, poświata zależna od wysokości Księżyca, faza Księżyca na karcie.

## Pytania
- „Księżyc nad horyzontem” znaczy: wysokość geometryczna środka tarczy > 0° (bez refrakcji, jak w sekcji 4 i w teście wykresu nocy), liczona względem horyzontu 0°, a nie horyzontu lokalnego. Dlatego w P1 udział wychodzi ok. 6–8%, a nie dokładnie 45/579.
- Najmniejszą separację biorę ze wszystkich próbek okna efektywnego, także gdy Księżyc jest wtedy pod horyzontem (dosłownie według decyzji z 17.10).
- „Środek okna efektywnego” przy oknie z przerwą to połowa między początkiem pierwszej a końcem ostatniej widocznej próbki (P13). Oświetlenie bierze się z próbki najbliższej tej chwili.
