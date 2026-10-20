// Widok kadru w SVG (zakladka-kadr): mapa zastępcza pod ramką, panele mozaiki i pryzmat OAG.
// ZAŚLEPKA: komponent rzuca NotImplementedError; implementację dopisuje implementer.
//
// Umowa z testami (nazwy i znaczniki wybrane przez test-author; spec ich nie podaje):
// - Props: `fovDeg` (pole widoku = pole wycinka TAN o boku VIEW_SIZE jednostek), `profile` (aktywny profil sprzętu),
//   `framing` (środek kadru = środek widoku, PA, mozaika), `mapObjects` (wynik `fallbackMap` dla wycinka
//   `{ center: środek kadru, fovDeg, widthPx: 1000, heightPx: 1000 }`, więc piksele mapy to jednostki widoku).
// - Jeden element `<svg viewBox="0 0 1000 1000">`.
// - Współrzędne kształtów są wpisane wprost w jednostkach widoku: `points` elementu `<polygon>`/`<polyline>` albo
//   `d` elementu `<path>` z poleceniami M, L, Z (bezwzględnymi). Kształty mapy, ramki, paneli i OAG ani ich przodkowie
//   nie mają atrybutu `transform` (obrót PA jest już w punktach).
// - Każdy panel mozaiki (także jedyny kadr przy 1×1) to `<g data-panel="N">` (N = 1, 2, … w kolejności
//   `mosaicPanels`), a w nim jeden `<polygon>` (albo `<path>`) z narożnikami w kolejności lewy górny, prawy górny,
//   prawy dolny, lewy dolny (strony kadru, jak `mosaicPanels(...).corners`) oraz `<text>` z numerem „N”.
// - Pryzmat OAG: `<polygon data-role="oag">` (jeden przy każdym panelu); przy `oag: null` żadnego.
// - Obiekt mapy zastępczej: `<g data-map-uid="<uid>">` z kształtami i `<text>` etykiety (`label.text`). Linia
//   przerywana = atrybut `stroke-dasharray` (różny od „none”) na kształcie albo na tej grupie; linia ciągła = bez niego.
//   Wszystkie grupy mapy leżą w dokumencie przed panelami (pod ramką).
// - Kolory tylko z klas tokenów (np. `stroke-accent`, `fill-muted`); żaden `fill`, `stroke` ani `style` nie ma
//   `#rrggbb`, `rgb(…)` ani `rgba(…)`; `url(#…)` wolno.
import type { ReactElement } from 'react'
import type { FallbackMapObject } from './fallbackMap'
import type { EquipmentProfile, Framing } from '../../types'

export interface FramingViewProps {
  fovDeg: number
  profile: EquipmentProfile
  framing: Framing
  mapObjects: readonly FallbackMapObject[]
}

function notImplemented(name: string, ...args: unknown[]): never {
  const error = new Error(`${name}: not implemented (${args.length})`)
  error.name = 'NotImplementedError'
  throw error
}

export function FramingView(props: FramingViewProps): ReactElement {
  return notImplemented('FramingView', props)
}
