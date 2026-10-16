import { describe, expect, it } from 'vitest'
import { computeOptics } from '../services/astroMath'
import { changedCameraFields, changedTelescopeFields, findSpec, validateEquipment } from '../services/equipment'
import { DEFAULT_PROFILE_ID, DEMO_LOCATION, DEMO_PROFILES } from './demo'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from './equipmentCatalog'

describe('lokalizacja demonstracyjna [Z5, Z13]', () => {
  it('Polska centralna: 52,0°N, 19,0°E, 150 m, Europe/Warsaw', () => {
    expect(DEMO_LOCATION).toMatchObject({
      name: 'Polska centralna (demo)',
      latDeg: 52,
      lonDegEast: 19,
      elevationM: 150,
      timezone: 'Europe/Warsaw',
    })
  })

  it('horyzont: 24 punkty co 15°, posortowane, wysokości z zakresu pliku horyzontu (7C)', () => {
    expect(DEMO_LOCATION.horizon.map((point) => point.azDeg)).toEqual(Array.from({ length: 24 }, (_, i) => i * 15))
    for (const { altDeg } of DEMO_LOCATION.horizon) expect(altDeg).toBeGreaterThanOrEqual(-5)
    expect(DEMO_LOCATION.horizon.find((point) => point.azDeg === 135)?.altDeg).toBe(35)
  })
})

describe('profile sprzętu z 6.4', () => {
  it('cztery profile; aktywny domyślnie jest „Mój zestaw” [Z2]', () => {
    expect(DEMO_PROFILES.map((profile) => profile.name)).toEqual([
      'Mój zestaw',
      'RedCat 51 + ASI2600MC Pro',
      'Newton 200/1000 + ASI533MM Pro',
      'Esprit 100ED + ASI6200MM Pro',
    ])
    expect(DEMO_PROFILES.find((profile) => profile.id === DEFAULT_PROFILE_ID)?.name).toBe('Mój zestaw')
  })

  it('„Mój zestaw”: Newton 150/600 wpisany ręcznie, Ares-M Pro z katalogu, filtry LRGB i SHO, wynik jak w T1', () => {
    const mine = DEMO_PROFILES[0]
    expect(mine.telescope).toEqual({ specId: null, label: 'Newton 150/600', apertureMm: 150, focalLengthMm: 600 })
    expect(mine.camera.specId).toBe('player-one-ares-m-pro')
    expect(mine.filters).toEqual(['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII'])
    const optics = computeOptics({ ...mine.telescope, reducerFactor: mine.reducerFactor, ...mine.camera })
    expect(optics.fovWidthDeg).toBeCloseTo(1.08, 3)
    expect(optics.scaleArcsecPerPx).toBeCloseTo(1.293, 3)
  })

  it('RedCat 51 + ASI2600MC Pro: kamera kolorowa z filtrami OSC i DualBand', () => {
    expect(DEMO_PROFILES[1]).toMatchObject({ camera: { sensor: 'osc' }, filters: ['OSC', 'DualBand'] })
  })

  it.each(DEMO_PROFILES.map((profile) => [profile.name, profile] as const))(
    '%s: binning 1, mnożnik 1,0×, GEM z przerzutem 10 min, bez OAG, wartości w zakresach 7F',
    (_, profile) => {
      expect(profile).toMatchObject({ reducerFactor: 1, camera: { binning: 1 }, mount: { type: 'gem', flipMinutesAfterMeridian: 10 }, oag: null })
      expect(validateEquipment({ ...profile.telescope, reducerFactor: profile.reducerFactor, ...profile.camera })).toEqual([])
    },
  )

  it('profile z katalogu mają kopie wartości wpisów bez zmian [Z26]', () => {
    for (const profile of DEMO_PROFILES) {
      const telescope = findSpec(BUILTIN_TELESCOPES, profile.telescope.specId)
      if (telescope) expect(changedTelescopeFields(profile.telescope, telescope)).toEqual([])
      const camera = findSpec(BUILTIN_CAMERAS, profile.camera.specId)
      expect(camera).not.toBeNull()
      if (camera) expect(changedCameraFields(profile.camera, camera)).toEqual([])
    }
    expect(DEMO_PROFILES.filter((profile) => profile.telescope.specId !== null)).toHaveLength(3)
  })
})
