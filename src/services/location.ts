// Formularz lokalizacji w Ustawieniach: odczyt pól tekstowych i walidacja. Bortle i SQM są tylko informacyjne [Z19].
import type { ObserverLocation } from '../types'
import { parseDecimal } from './equipment'

/** Pola formularza jako tekst; liczby przyjmują przecinek i kropkę dziesiętną. */
export interface LocationForm {
  name: string
  latDeg: string
  lonDegEast: string
  elevationM: string
  timezone: string
  bortle: string // puste = brak
  sqm: string // puste = brak
}

export type LocationField = keyof LocationForm | 'horizon'

export interface LocationIssue {
  field: LocationField
  message: string
}

type NumberField = 'latDeg' | 'lonDegEast' | 'elevationM' | 'bortle' | 'sqm'

interface NumberRule {
  label: string
  min: number
  max: number
  unit: string
  integer: boolean
  optional: boolean
}

const RULES: Record<NumberField, NumberRule> = {
  latDeg: { label: 'Szerokość', min: -90, max: 90, unit: '°', integer: false, optional: false },
  lonDegEast: { label: 'Długość', min: -180, max: 180, unit: '°', integer: false, optional: false },
  elevationM: { label: 'Wysokość n.p.m.', min: -500, max: 9000, unit: ' m', integer: false, optional: false },
  bortle: { label: 'Bortle', min: 1, max: 9, unit: '', integer: true, optional: true },
  sqm: { label: 'SQM', min: 10, max: 25, unit: ' mag/arcsec²', integer: false, optional: true },
}

const formatNumber = (value: number) => String(value).replace('.', ',').replace('-', '−')

/** Kanoniczna nazwa strefy IANA (np. 'europe/warsaw' → 'Europe/Warsaw') albo null dla nieznanej strefy. */
export function canonicalTimeZone(text: string): string | null {
  const name = text.trim()
  if (name === '') return null
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: name }).resolvedOptions().timeZone
  } catch {
    return null
  }
}

export function locationToForm(location: ObserverLocation): LocationForm {
  const text = (value: number | null) => (value === null ? '' : String(value).replace('.', ','))
  return {
    name: location.name,
    latDeg: text(location.latDeg),
    lonDegEast: text(location.lonDegEast),
    elevationM: text(location.elevationM),
    timezone: location.timezone,
    bortle: text(location.bortle),
    sqm: text(location.sqm),
  }
}

/** Lokalizacja z formularza (id i horyzont z `base`) albo lista problemów, które blokują zapis. */
export function readLocationForm(
  form: LocationForm,
  base: Pick<ObserverLocation, 'id' | 'horizon'>,
): { location: ObserverLocation | null; issues: LocationIssue[] } {
  const issues: LocationIssue[] = []

  const readNumber = (field: NumberField): number | null => {
    const rule = RULES[field]
    const text = form[field].trim()
    if (text === '' && rule.optional) return null
    const value = parseDecimal(text)
    let message: string | null = null
    if (value === null) message = `${rule.label}: wpisz liczbę`
    else if (rule.integer && !Number.isInteger(value)) message = `${rule.label}: wpisz liczbę całkowitą`
    else if (value < rule.min || value > rule.max) {
      message = `${rule.label}: dozwolony zakres ${formatNumber(rule.min)}…${formatNumber(rule.max)}${rule.unit}`
    }
    if (message !== null) issues.push({ field, message })
    return message === null ? value : null
  }

  const name = form.name.trim()
  if (name === '') issues.push({ field: 'name', message: 'Podaj nazwę lokalizacji' })
  const latDeg = readNumber('latDeg')
  const lonDegEast = readNumber('lonDegEast')
  const elevationM = readNumber('elevationM')
  const timezone = canonicalTimeZone(form.timezone)
  if (timezone === null) issues.push({ field: 'timezone', message: 'Nieznana strefa czasowa IANA (np. Europe/Warsaw)' })
  const bortle = readNumber('bortle')
  const sqm = readNumber('sqm')
  if (base.horizon.length === 1) {
    issues.push({ field: 'horizon', message: 'Horyzont: dodaj drugi punkt albo wyczyść horyzont (płaski 0°)' })
  }

  if (issues.length > 0 || latDeg === null || lonDegEast === null || elevationM === null || timezone === null) {
    return { location: null, issues }
  }
  return {
    location: { id: base.id, name, latDeg, lonDegEast, elevationM, timezone, horizon: base.horizon, bortle, sqm },
    issues,
  }
}
