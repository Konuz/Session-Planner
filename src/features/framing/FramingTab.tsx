// Zakładka Kadr (zakladka-kadr): obiekt, widok SVG kadru, PA, mozaika i dane kadru.
// ZAŚLEPKA: komponent rzuca NotImplementedError; implementację dopisuje implementer.
//
// Umowa z testami (wybrana przez test-author; spec jej nie podaje):
// - Obiekty bierze z haka `useFeaturedObjects` (`features/night/useFeaturedObjects`), tak jak zakładka Noc:
//   „Wczytywanie katalogu…” przy `loading`, komunikat z `message` i przycisk „Spróbuj ponownie” (`retry`) przy `error`;
//   obiekt to `selectFeatured(catalog, objectUid)`, a lista wyboru to `<select>` z opcjami `nightObjectOptions` (wartość
//   opcji = uid), której zmiana wywołuje `selectObject(uid)`.
// - Stan kadru czyta ze sklepu (`framing`, `framingObjectUid`) i zapisuje akcją `updateFraming(uid, framing)`;
//   gdy uid pokazywanego obiektu jest inny niż `framingObjectUid` (albo kadru jeszcze nie ma), środek to obiekt,
//   a PA i mozaika zostają (przy braku kadru: PA 0°, 1×1, zakładka 20%).
// - Odczyt środka w tekście: „RA 83,8187°, Dec −5,3897°” (`formatDeg(…, 4)`).
// - Suwak PA: `<input type="range" min="0" max="360" step="0.5" value=PA>` z etykietą zawierającą „PA”; jego zmiana
//   od razu zapisuje PA. Pole PA: tekstowe `<input>` z etykietą zawierającą „PA” (odczyt `readPaInput`).
// - Mozaika: dwa `<select>` z opcjami 1…5 i etykietami zawierającymi „Kolumny” i „Wiersze” (lista kolumn przed listą
//   wierszy w dokumencie); zmiana od razu zapisuje mozaikę. Pole zakładki: tekstowe `<input>` z etykietą zawierającą „Zakładka”, wartość w % (np. „20”).
// - Przycisk „Wyśrodkuj na obiekcie”.
// - Dane kadru (widoczne też bez katalogu): „1,080° × 1,080° (64,8′ × 64,8′)”, „1,293″/px”, ocena próbkowania
//   (seeing z `planningSettings`), uwaga OSC z `profilePreview`, a przy mozaice > 1×1 wiersz „Mozaika: 9,668° × 3,597°”
//   (tekst „Mozaika:” z dwukropkiem pojawia się tylko w tym wierszu).
// - Widok: `FramingView` z polem `cutoutFovDeg(mosaicSizeDeg(profile, framing))` i mapą `fallbackMap` z całego katalogu.
// - Red Mode (`redMode` w sklepie): element otaczający `<svg viewBox="0 0 1000 1000">` ma styl `filter: url(#red-only)`,
//   a na stronie jest `<filter id="red-only">` z macierzą z sekcji 8; bez Red Mode żaden przodek widoku nie ma filtra.
import type { ReactElement } from 'react'

function notImplemented(name: string, ...args: unknown[]): never {
  const error = new Error(`${name}: not implemented (${args.length})`)
  error.name = 'NotImplementedError'
  throw error
}

export function FramingTab(): ReactElement {
  return notImplemented('FramingTab')
}
