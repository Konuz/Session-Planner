import { describe, expect, it } from 'vitest'
import { exposureSeconds, fitExposures, planExposures, validExposure } from './exposures'
import { exposureCsv } from './planExport'

const target = {
  name: 'M 42, "Orion"', raDeg: 83.8, decDeg: -5.4, paDeg: 30,
  exposures: [{ filter: 'Ha', count: 12, seconds: 300 }, { filter: 'OIII', count: 6, seconds: 120.5 }],
  startMs: Date.UTC(2026, 9, 25, 20), endMs: Date.UTC(2026, 9, 25, 22), note: 'Test, "notatka"\ndruga linia',
}

describe('ekspozycje planera', () => {
  it('zachowuje filtry starego planu bez wymyślania liczby klatek', () => {
    expect(planExposures({ filters: ' L, R; Ha, , ' })).toEqual([
      { filter: 'L', count: 0, seconds: 180 }, { filter: 'R', count: 0, seconds: 180 }, { filter: 'Ha', count: 0, seconds: 180 },
    ])
    expect(planExposures({ filters: 'L', exposures: [] })).toEqual([])
    expect(planExposures({ filters: 'stare', exposures: target.exposures })).toEqual(target.exposures)
  })
  it('sumuje niezależne czasy i obsługuje ułamkowe sekundy oraz pominięte filtry', () => {
    expect(exposureSeconds(target.exposures)).toBe(4323)
    expect(exposureSeconds([{ filter: 'OSC', count: 0, seconds: 0.5 }])).toBe(0)
  })
  it('odrzuca brak filtra, ułamkowe i ujemne klatki oraz niepoprawne sekundy', () => {
    const e = target.exposures[0]
    for (const patch of [{ filter: ' ' }, { count: -1 }, { count: 1.5 }, { count: Infinity }, { seconds: 0 }, { seconds: -1 }, { seconds: NaN }]) {
      expect(validExposure({ ...e, ...patch })).toBe(false)
    }
  })
  it('dopasowuje proporcje w dół i nie przekracza okna', () => {
    const fitted = fitExposures(target.exposures, 2161.5)
    expect(fitted.map((e) => e.count)).toEqual([6, 3])
    expect(exposureSeconds(fitExposures(target.exposures, 1000))).toBeLessThanOrEqual(1000)
    expect(fitExposures(target.exposures, 0)).toEqual(target.exposures)
    expect(fitExposures([{ filter: 'L', count: 0, seconds: 30 }], 3600)[0].count).toBe(0)
  })
})

describe('eksport planera', () => {
  it('pełny wykaz zawiera osobne ekspozycje, poprawne cytowanie i jednoznaczny czas', () => {
    const csv = exposureCsv([target], 'Europe/Warsaw')
    expect(csv).toContain('"Ha","12","300","3600"')
    expect(csv).toContain('"OIII","6","120.5","723"')
    expect(csv).toContain('"2026-10-25T20:00:00.000Z","2026-10-25T22:00:00.000Z","Europe/Warsaw"')
    expect(csv).toContain('"Test, ""notatka""\ndruga linia"')
    expect(csv).toContain('"M 42, ""Orion"""')
    expect(csv.endsWith('\r\n')).toBe(true)
  })
  it('eksportuje cel bez okna, ale blokuje niepoprawne ekspozycje', () => {
    expect(exposureCsv([{ ...target, startMs: null, endMs: null }], 'UTC')).toContain('"","","UTC"')
    expect(() => exposureCsv([{ ...target, exposures: [{ filter: 'L', count: -1, seconds: 30 }] }], 'UTC')).toThrow()
  })
})
