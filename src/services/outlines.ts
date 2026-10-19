// Zarysy obiektów ze Stellarium (zarysy-stellarium): parser pliku outlines.dat i przypisanie do katalogu.
// Czyste funkcje, bez Reacta.
// ZAŚLEPKA: funkcje rzucają NotImplementedError; implementację dopisuje implementer.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `parseOutlines(text)` – tekst pliku (LF albo CRLF) → zarysy w kolejności z pliku: `label` (tekst po `start`
//   po trim) i `points` (RA i Dec w stopniach: start, vertex…, end; bez usuwania powtórzonego punktu).
// - `outlineDesignation(label)` – oznaczenie z pliku → `Designation` albo null (RCW, Ced, C, PGC, same liczby).
// - `assignOutlines(outlines, catalog)` – te same zarysy z `uid` (null = brak obiektu) oraz `polygonsByUid`
//   (uid → wielokąty; tylko obiekty, które mają co najmniej jeden zarys).
// - `objectPolygons(assignment, uid)` – wielokąty obiektu; [] gdy obiekt nie ma zarysu.
import type { EquatorialDeg } from './astroMath'
import type { Designation, DsoObject } from '../types'

export interface Outline {
  /** Oznaczenie z pliku, bez spacji na początku i na końcu, np. 'LBN 933', 'SH 2-275', '44'. */
  label: string
  /** Punkty wielokąta w stopniach (J2000): start, vertex…, end. */
  points: EquatorialDeg[]
}

export interface AssignedOutline extends Outline {
  /** uid obiektu katalogu albo null, gdy oznaczenia nie ma w katalogu. */
  uid: string | null
}

export interface OutlineAssignment {
  /** Wszystkie zarysy z wejścia, w tej samej kolejności. */
  outlines: AssignedOutline[]
  /** uid → wielokąty obiektu. */
  polygonsByUid: ReadonlyMap<string, EquatorialDeg[][]>
}

function notImplemented(name: string, ...args: unknown[]): never {
  const error = new Error(`${name}: not implemented (${args.length})`)
  error.name = 'NotImplementedError'
  throw error
}

export function parseOutlines(text: string): Outline[] {
  return notImplemented('parseOutlines', text)
}

export function outlineDesignation(label: string): Designation | null {
  return notImplemented('outlineDesignation', label)
}

export function assignOutlines(outlines: readonly Outline[], catalog: readonly DsoObject[]): OutlineAssignment {
  return notImplemented('assignOutlines', outlines, catalog)
}

export function objectPolygons(assignment: OutlineAssignment, uid: string): EquatorialDeg[][] {
  return notImplemented('objectPolygons', assignment, uid)
}
