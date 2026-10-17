import { describe, expect, it } from 'vitest'
import { DEMO_HORIZON } from '../test/fixtures'
import type { ObserverLocation } from '../types'
import { canonicalTimeZone, locationToForm, readLocationForm, type LocationForm } from './location'

const BASE: Pick<ObserverLocation, 'id' | 'horizon'> = { id: 'test', horizon: [] }

const FORM: LocationForm = {
  name: '  Polska centralna  ',
  latDeg: '52,0',
  lonDegEast: '19.0',
  elevationM: '150',
  timezone: 'Europe/Warsaw',
  bortle: '',
  sqm: '',
}

const fieldsWithIssues = (form: LocationForm, horizon = BASE.horizon) =>
  readLocationForm(form, { ...BASE, horizon }).issues.map((issue) => issue.field)

describe('formularz lokalizacji', () => {
  it('poprawny formularz daje lokalizację; przecinek i kropka dziesiętna są równoważne', () => {
    expect(readLocationForm(FORM, BASE)).toEqual({
      location: {
        id: 'test',
        name: 'Polska centralna',
        latDeg: 52,
        lonDegEast: 19,
        elevationM: 150,
        timezone: 'Europe/Warsaw',
        horizon: [],
        bortle: null,
        sqm: null,
      },
      issues: [],
    })
  })

  it('Bortle i SQM są opcjonalne i tylko informacyjne [Z19]', () => {
    const { location } = readLocationForm({ ...FORM, bortle: '4', sqm: '20,8' }, BASE)
    expect(location).toMatchObject({ bortle: 4, sqm: 20.8 })
  })

  it('lokalizacja → formularz → lokalizacja bez zmian, także z horyzontem', () => {
    const location: ObserverLocation = {
      id: 'demo',
      name: 'Polska centralna (demo)',
      latDeg: 52.25,
      lonDegEast: -0.5,
      elevationM: 1250,
      timezone: 'Europe/Warsaw',
      horizon: DEMO_HORIZON,
      bortle: 5,
      sqm: 20.4,
    }
    const form = locationToForm(location)
    expect(form.latDeg).toBe('52,25')
    expect(readLocationForm(form, location)).toEqual({ location, issues: [] })
  })

  it.each([
    ['name', { name: '   ' }],
    ['latDeg', { latDeg: '90,5' }],
    ['latDeg', { latDeg: 'abc' }],
    ['lonDegEast', { lonDegEast: '-180,1' }],
    ['elevationM', { elevationM: '' }],
    ['elevationM', { elevationM: '9001' }],
    ['timezone', { timezone: 'Mars/Olympus' }],
    ['timezone', { timezone: '' }],
    ['bortle', { bortle: '0' }],
    ['bortle', { bortle: '4,5' }],
    ['bortle', { bortle: '10' }],
    ['sqm', { sqm: '213' }],
  ] as const)('błąd w polu %s: %o', (field, change) => {
    const issues = readLocationForm({ ...FORM, ...change }, BASE)
    expect(issues.location).toBeNull()
    expect(issues.issues.map((issue) => issue.field)).toEqual([field])
  })

  it('wartości graniczne są dozwolone', () => {
    expect(fieldsWithIssues({ ...FORM, latDeg: '-90', lonDegEast: '180', elevationM: '-500', bortle: '9', sqm: '10' })).toEqual([])
  })

  it('horyzont: 0 punktów (płaski) albo co najmniej 2; pojedynczy punkt blokuje zapis', () => {
    expect(fieldsWithIssues(FORM, [])).toEqual([])
    expect(fieldsWithIssues(FORM, DEMO_HORIZON.slice(0, 2))).toEqual([])
    expect(fieldsWithIssues(FORM, DEMO_HORIZON.slice(0, 1))).toEqual(['horizon'])
  })
})

describe('strefa czasowa IANA', () => {
  it('nazwa kanoniczna, bez względu na wielkość liter', () => {
    expect(canonicalTimeZone('europe/warsaw')).toBe('Europe/Warsaw')
    expect(canonicalTimeZone(' Europe/Warsaw ')).toBe('Europe/Warsaw')
  })

  it('nieznana strefa → null', () => {
    expect(canonicalTimeZone('Warszawa')).toBeNull()
    expect(canonicalTimeZone('')).toBeNull()
  })

  it('formularz zapisuje nazwę kanoniczną', () => {
    expect(readLocationForm({ ...FORM, timezone: 'europe/warsaw' }, BASE).location?.timezone).toBe('Europe/Warsaw')
  })
})
