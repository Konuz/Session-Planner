# formularz-profilu — Model edytora profilu sprzętu (7F)

## Cel
Użytkownik składa profil sprzętu z teleskopu i kamery wybranych z katalogu albo wpisanych ręcznie, poprawia wartości, ustawia mnożnik, binning, montaż, filtry i OAG. Na bieżąco widzi błędy, ostrzeżenia i podgląd: F_eff, f/, matrycę, FOV, skalę i ocenę próbkowania. Ta funkcja to sama logika formularza (czyste funkcje), bez wyglądu.

## Przykłady
Podgląd pokazuje F_eff z dokładnością do 0,1 mm bez zbędnych zer, f/ i mm z 2 miejscami, stopnie z 3, minuty kątowe z 1, ″/px z 3. Liczby mają przecinek dziesiętny.

P1: (T17) teleskop „Własny” 80/480, mnożnik „0,8”, kamera „Własna” 4144 × 2822 px, 4,63 µm, OSC, binning 1 → F_eff 384 mm; f/4,80; matryca 19,19 × 13,07 mm, przekątna 23,21 mm; FOV 2,862° × 1,949° (171,7′ × 117,0′); skala 2,487″/px.
P2: (T17) ten sam zestaw z binningiem 2 → skala 4,974″/px, a FOV bez zmian: 2,862° × 1,949°.
P3: (T18) wyszukiwarka, wybór „Sky-Watcher Esprit 100ED” i „ZWO ASI6200MM Pro” → pola 100 / 550 i 9576 × 6388 / 3,76 / mono. Nazwa teleskopu to „Sky-Watcher Esprit 100ED”. Podgląd: f/5,50; FOV 3,750° × 2,502°; skala 1,410″/px.
P4: (T18) w zestawie z P3 ogniskowa „600” → przy ogniskowej „zmienione względem katalogu”, przy aperturze nie. Wpis katalogu dalej ma 550 mm. Powrót do „550” (albo „550,0”) usuwa oznaczenie.
P5: w zestawie z P3 typ kamery mono → OSC → przy typie „zmienione względem katalogu”. Binning i mnożnik nigdy nie mają tego oznaczenia.
P6: wyszukiwanie „redcat” (także „REDCAT”) → RedCat 51, RedCat 61, RedCat 71. Pasuje marka i model razem, np. „sky esprit 100” → Esprit 100ED. Fraza „xyz123” → żadnych wpisów, zostaje tylko „Własny”. Wpisy własne użytkownika z listy przekazanej do wyszukiwarki pojawiają się tak samo.
P7: profil z Esprit 100ED, potem „Własny” → teleskop staje się wpisem ręcznym, wartości 100 / 550 zostają, oznaczeń „zmienione” nie ma.
P8: przyciski mnożnika: 0,63×, 0,7×, 0,73×, 0,8×, 0,85×, 1,0×, 2,0×. Kliknięcie 0,85× wpisuje „0,85” i zaznacza ten przycisk. Wpisane ręcznie „0,9” jest poprawne i żaden przycisk nie jest zaznaczony.
P9: (T19) błędy blokują zapis: apertura „0” → „Apertura: dozwolony zakres 5–1500 mm”; piksel „0,5” → „Rozmiar piksela: dozwolony zakres 1–30 µm”; mnożnik „4” → „Mnożnik: dozwolony zakres 0,3–3 ×”; rozdzielczość X „1000,5” → „Rozdzielczość X: wpisz liczbę całkowitą”; ogniskowa pusta, „abc” albo „10 000” (ze spacją) → „Ogniskowa: wpisz liczbę”.
P10: (T19) apertura 500, ogniskowa 400 → ostrzeżenie „Nietypowa światłosiła f/0,8: sprawdź ogniskową i aperturę”. Zapis jest możliwy, a podgląd działa. Ostrzeżenie liczy f/ z ogniskowej bez mnożnika, więc przy 500/400 i mnożniku 2,0× ostrzeżenie zostaje, choć podgląd pokazuje f/1,60.
P11: (T19) rozmiar piksela „3,76” i „3.76” → 3,76 µm, a podgląd jest taki sam.
P12: apertura „abc” → „—” tylko przy f/. F_eff, matryca, FOV, skala i próbkowanie są dalej liczone. Piksel „abc” → „—” przy matrycy, FOV, skali i próbkowaniu, a F_eff i f/ zostają.
P13: (T2) próbkowanie przy seeingu 2,5″ (idealnie 0,833–1,25″/px):
- Newton 200/1000 + ASI533MM: 0,776″/px, nadpróbkowanie;
- Newton 150/750 + Ares-M Pro: 1,034″/px, idealne;
- Newton 150/600 + Ares-M Pro: 1,293″/px, podpróbkowanie, a przy seeingu 3,0″ idealne.

Seeing pochodzi z parametrów planowania.
P14: RedCat 51 + ASI2600MC Pro (OSC) → uwaga „Kamera kolorowa (OSC): efektywna rozdzielczość jest niższa, niż wynika ze skali.” Ten sam teleskop z ASI2600MM Pro (mono) → bez uwagi.
P15: każdy z 4 profili demonstracyjnych → formularz → profil daje identyczny profil. Ogniskowa 10000 jest w polu zapisana jako „10000”, bez spacji tysięcy. 3,76 jest zapisane jako „3,76”.
P16: zapis z P4 → profil ma `specId` Esprit 100ED i ogniskową 600 mm. Profil, którego `specId` nie ma na liście wpisów, jest pokazany jako „Własny”, bez oznaczeń „zmienione”.
P17: pusta nazwa profilu (same spacje) → błąd „Nazwa profilu: wpisz nazwę”. Pusta nazwa własnego teleskopu lub kamery → „Nazwa teleskopu: wpisz nazwę” / „Nazwa kamery: wpisz nazwę”.
P18: montaż GEM/widłowy/alt-az. Przerzut „10” → 10 min; „-5” albo „90” → „Przerzut: dozwolony zakres 0–60 min”. Pusta lista filtrów jest dozwolona. Filtry zapisują się w kolejności L, R, G, B, Ha, OIII, SII, OSC, DualBand.
P19: OAG wyłączony → `oag: null`. Po włączeniu:
- szerokość lub wysokość pryzmatu „0” → błąd „> 0 mm”;
- odległość od środka „-1” → błąd „≥ 0 mm”;
- kąt „370” → „Kąt OAG: dozwolony zakres 0–360°”;
- 8 × 6 mm, 15 mm, 90° → zapis poprawny.

## Styk z resztą
- Nowy plik `src/features/equipment/profileForm.ts` w stylu `planningSettingsForm.ts`. Funkcje: profil → tekst pól; tekst pól → profil albo null i lista błędów/ostrzeżeń; podgląd; wyszukiwarka; oznaczenia „zmienione”.
- Używa gotowych funkcji: `parseDecimal`, `validateEquipment`, `hasErrors`, `findSpec`, `changedTelescopeFields`, `changedCameraFields` (`services/equipment.ts`); `computeOptics`, `assessSampling` (`services/astroMath.ts`); `REDUCER_PRESETS`, `BUILTIN_TELESCOPES`, `BUILTIN_CAMERAS` (`data/equipmentCatalog.ts`); `DEMO_PROFILES` (`data/demo.ts`). Seeing pochodzi z `PlanningSettings.seeingArcsec`.
- Typy `EquipmentProfile`, `TelescopeSpec`, `CameraSpec`, `FilterId` z `src/types.ts` bez zmian.

## Poza zakresem
- Zapis profili w bazie, lista profili i aktywny profil (`profile-zestawow`).
- „Zapisz jako mój teleskop / moją kamerę”, edycja i usuwanie własnych wpisów (`wlasny-sprzet`).
- Wygląd, komponenty i zakładka „Sprzęt” (`zakladka-sprzet`).
- Zmiana zakresów walidacji z 7F ani `validateEquipment`.

## Pytania
- T17 nie podaje typu kamery. Przyjmuję OSC (4144 × 2822 / 4,63 µm to ASI294MC). Na liczby to nie wpływa.
- Ostrzeżenie o f/ liczy z ogniskowej bez mnożnika, tak jak dziś `validateEquipment`, a podgląd pokazuje f/ z F_eff (P10). Czy ostrzeżenie ma uwzględniać mnożnik?
- Podgląd przy błędnym polu pokazuje „—” tylko w wartościach od niego zależnych (P12). Ostrzeżenia nie wyłączają podglądu.
- Przy tekście, który nie jest liczbą, nie pokazuję „zmienione względem katalogu”, tylko błąd.
- Reguły spoza Z25 to moja propozycja: wymagane nazwy (P17), przerzut 0–60 min dla każdego montażu (P18), pusta lista filtrów dozwolona, zakresy OAG (P19). Pola OAG po włączeniu są puste.
- „Własny” zachowuje bieżące wartości i nazwę (P7). Teksty uwagi OSC i komunikatów spoza `validateEquipment` też są propozycją.
