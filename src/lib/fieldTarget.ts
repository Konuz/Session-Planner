// Swobodne pole: cel opisany samymi współrzędnymi (ramka FOV przesunięta poza obiekt katalogu).
// Udaje obiekt katalogu z indeksem −1, więc wykresy, Planer i eksport działają bez osobnej ścieżki.
import { constellationOf, normDeg } from './astro'
import type { DSO } from './catalog'
import { fmtDec, fmtRa } from './format'

export interface Field {
  raDeg: number
  decDeg: number
}

export const FREE_ROAM_LABEL = 'Swobodna eksploracja'
export const FIELD_TYPE_LABEL = 'Swobodne pole'
const FIELD_PREFIX = 'Pole '

export function fieldId(f: Field): string {
  return `${FIELD_PREFIX}${fmtRa(f.raDeg)} ${fmtDec(f.decDeg)}`
}

/** Nazwa z eksportu planu należy do swobodnego pola (także panel mozaiki „… Panel k”). */
export function isFieldName(name: string): boolean {
  return name.startsWith(FIELD_PREFIX)
}

export function isField(o: Pick<DSO, 'i'>): boolean {
  return o.i < 0
}

/** Współrzędne pola, gdy obiekt jest polem; dla obiektu katalogu `undefined`. */
export function fieldOf(o: DSO): Field | undefined {
  return isField(o) ? { raDeg: o.raDeg, decDeg: o.decDeg } : undefined
}

export function sanitizeField(raw: unknown): Field | null {
  if (!raw || typeof raw !== 'object') return null
  const { raDeg, decDeg } = raw as Partial<Field>
  if (typeof raDeg !== 'number' || !Number.isFinite(raDeg) || typeof decDeg !== 'number' || !Number.isFinite(decDeg) || Math.abs(decDeg) > 90) return null
  return { raDeg: normDeg(raDeg), decDeg }
}

export function fieldObject(f: Field): DSO {
  return {
    i: -1,
    id: fieldId(f),
    aliases: [],
    namePl: '',
    namesEn: [],
    type: 'X',
    raDeg: f.raDeg,
    decDeg: f.decDeg,
    majArcmin: 0,
    minArcmin: 0,
    paDeg: null,
    mag: null,
    sb: null,
    con: constellationOf(f),
    distLy: null,
    distUncLy: null,
    distInfo: null,
    illuminator: null,
    unresolved: false,
    wikiPl: '',
    wikiEn: '',
    catalogs: [],
    search: '',
  }
}
