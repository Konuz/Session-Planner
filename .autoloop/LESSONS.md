# LESSONS (meta-pętla)
Maksymalnie 25 reguł. Format: `- [Nx] <rola>: <reguła> — dowód: <id funkcji>`.
Regułę dodaje się dopiero po wzorcu widzianym co najmniej dwa razy. Reguły, które przestały być prawdziwe, się usuwa.

- [2x] spec-writer: Nie zostawiaj w spec niedopowiedzianych szczegółów, które test musi znać. Każda akcja i funkcja z „Styk z resztą” ma mieć nazwę. Każde sprawdzane pole ma mieć dokładny komunikat błędu. Każda ścieżka awaryjna (np. wartości domyślne, gdy baza jest niedostępna) ma mieć własny przykład P. Bez tego testy sprawdzają tylko liczbę problemów albo pomijają zachowanie. — dowód: parametry-planowania (dwie uwagi review: akcja zapisu bez nazwy i bez przykładu dla niedostępnej bazy; brak komunikatów dla trzech pól w P4)

