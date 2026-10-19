// Wspólne dane testów funkcji „zarysy-stellarium” (spec: .autoloop/features/zarysy-stellarium/spec.md).
// Nazwy funkcji wybrał test-author (spec ich nie podaje) – opis w src/services/outlines.ts.
import { readFileSync } from 'node:fs'
import { expect } from 'vitest'
import type { EquatorialDeg } from '../../../src/services/astroMath'
import type { AssignedOutline, Outline } from '../../../src/services/outlines'
import type { Designation, DsoObject } from '../../../src/types'

/** Plik zarysów Stellarium w postaci z dysku (końce LF). */
export const OUTLINES_TEXT = readFileSync(new URL('../../../src/data/outlines.dat', import.meta.url), 'utf8')

/** Ten sam plik z końcami CRLF (P5). */
export const OUTLINES_TEXT_CRLF = OUTLINES_TEXT.replace(/\n/g, '\r\n')

/** Katalog aplikacji (public/catalog). Testy czytają go z dysku, bo `loadCatalog` używa fetch. */
export const CATALOG = JSON.parse(
  readFileSync(new URL('../../../public/catalog/catalog.v1.json', import.meta.url), 'utf8'),
) as DsoObject[]

/** RA w stopniach z RA w godzinach (zasada spec: × 15). */
export function hoursToDeg(hours: number): number {
  return hours * 15
}

/** Punkt porównywany z tolerancją ±0,0001° (P3, P6). */
export function expectPoint(point: EquatorialDeg | undefined, raDeg: number, decDeg: number): void {
  expect(point).toBeDefined()
  expect(point!.raDeg).toBeCloseTo(raDeg, 4)
  expect(point!.decDeg).toBeCloseTo(decDeg, 4)
}

/** Linie zarysu w formacie pliku: pierwsza `start <oznaczenie>`, potem `vertex`, ostatnia `end`. */
export function outlineLines(label: string, points: readonly [number, number][]): string[] {
  return points.map(([raHours, decDeg], index) => {
    const command = index === 0 ? `start  ${label} ` : index === points.length - 1 ? 'end ' : 'vertex '
    const dec = decDeg >= 0 ? `+${decDeg.toFixed(5)}` : decDeg.toFixed(5)
    return `${raHours.toFixed(5)} ${dec} ${command}`
  })
}

/** Zarysy o danym oznaczeniu, w kolejności wyniku. */
export function withLabel<T extends Outline>(outlines: readonly T[], label: string): T[] {
  return outlines.filter((outline) => outline.label === label)
}

/** uid przypisany zarysom o danym oznaczeniu (wszystkie wystąpienia). */
export function uidsOf(outlines: readonly AssignedOutline[], label: string): (string | null)[] {
  return withLabel(outlines, label).map((outline) => outline.uid)
}

/** Sztuczny obiekt katalogu o podanym uid i oznaczeniach. */
export function syntheticObject(uid: string, designations: Designation[], raDeg = 83.8, decDeg = -5.4): DsoObject {
  return {
    uid,
    primary: designations[0],
    designations,
    commonNames: [],
    type: 'emission_nebula',
    raDeg,
    decDeg,
    sizeMajorArcmin: null,
    sizeMinorArcmin: null,
    positionAngleDeg: null,
    magV: null,
    surfaceBrightness: null,
    ldnOpacity: null,
    sh2Brightness: null,
    lbnBrightness: null,
    vdbStarMagV: null,
    constellation: 'Ori',
    sources: ['test'],
  }
}
