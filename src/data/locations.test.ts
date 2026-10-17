import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formatDesignation } from '../services/catalog/records'
import { locationToForm, readLocationForm } from '../services/location'
import type { DsoObject } from '../types'
import { DEMO_LOCATION } from './demo'
import { DEFAULT_OBJECT, featuredObjects, selectFeatured } from './featuredObjects'
import { DEFAULT_LOCATIONS, DEFAULT_LOCATION_ID, HOME_LOCATION } from './locations'

describe('lokalizacje startowe', () => {
  it('Z5 (16.10.2026): domyślnie Chrząstawa Wielka, horyzont płaski do czasu wczytania pliku z N.I.N.A.', () => {
    expect(DEFAULT_LOCATION_ID).toBe(HOME_LOCATION.id)
    expect(HOME_LOCATION).toMatchObject({
      name: 'Chrząstawa Wielka',
      latDeg: 51.0956,
      lonDegEast: 17.3022,
      elevationM: 125,
      timezone: 'Europe/Warsaw',
      horizon: [],
    })
  })

  it('lokalizacja demonstracyjna z horyzontem Z13 zostaje na liście', () => {
    expect(DEFAULT_LOCATIONS).toEqual([HOME_LOCATION, DEMO_LOCATION])
  })

  it.each(DEFAULT_LOCATIONS.map((location) => [location.name, location] as const))(
    '%s przechodzi walidację formularza lokalizacji',
    (_, location) => {
      expect(readLocationForm(locationToForm(location), location)).toEqual({ location, issues: [] })
    },
  )
})

describe('lista „Klasyki” do wykresu nocy', () => {
  const catalog = JSON.parse(readFileSync(new URL('../../public/catalog/catalog.v1.json', import.meta.url), 'utf8')) as DsoObject[]
  const featured = featuredObjects(catalog)

  it('26 obiektów w kolejności z featured.json', () => {
    expect(featured).toHaveLength(26)
    expect(featured.slice(0, 3).map((object) => formatDesignation(object.primary))).toEqual(['vdB 141', 'vdB 152', 'Sh2-155'])
  })

  it('wybór: zapamiętany uid, a gdy go brak na liście – M 31', () => {
    expect(selectFeatured(featured, 'NGC7000')?.uid).toBe('NGC7000')
    expect(selectFeatured(featured, null)?.uid).toBe('NGC224')
    expect(selectFeatured(featured, 'NGC9999')?.uid).toBe('NGC224')
    expect(selectFeatured([], null)).toBeNull()
  })

  it('obiekt domyślny M 31 jest na liście', () => {
    const m31 = featured.find((object) => object.designations.some((d) => d.catalog === DEFAULT_OBJECT.catalog && d.id === DEFAULT_OBJECT.id))
    expect(m31?.uid).toBe('NGC224')
  })
})
