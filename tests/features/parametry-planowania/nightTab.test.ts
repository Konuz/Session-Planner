// Zakładka Noc i kursor czasu sterowane parametrami planowania zapisanymi w bazie przeglądarki (P11–P14).
// Parametry wczytują się przy starcie razem z lokalizacjami (`loadLocations`).
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { appDb } from '../../../src/data/appDb'
import { locationRepository, planningSettingsRepository } from '../../../src/data/repositories'
import { usePlannerStore } from '../../../src/state/plannerStore'
import { at, expectSameMinute } from '../../../src/test/fixtures'
import type { PlanningSettings } from '../../../src/types'
import { FLAT_SITE, corruptSaved, defaults, settingsWith } from './helpers'
import { renderedNightTab } from './render'

/** Start aplikacji z zapisanymi parametrami, lokalizacja wektorowa z horyzontem płaskim, potem wybór nocy D. */
async function openNight(nightDate: string, saved: PlanningSettings): Promise<void> {
  await locationRepository.save(appDb, FLAT_SITE)
  await planningSettingsRepository.save(appDb, saved)
  await startOnNight(nightDate)
}

async function startOnNight(nightDate: string): Promise<void> {
  await usePlannerStore.getState().loadLocations()
  usePlannerStore.getState().selectLocation(FLAT_SITE.id)
  usePlannerStore.getState().setNightDate(nightDate)
}

const cursorMs = () => usePlannerStore.getState().cursorMs

describe('noc 21/22.06.2026, 52,0°N 19,0°E, horyzont płaski [T6]', () => {
  it('P12: zapisany próg −15° z obniżaniem → „Brak okna przy progu −15°; użyto progu −12°.”', async () => {
    await openNight('2026-06-21', settingsWith({ darknessThresholdDeg: -15, autoLowerThreshold: true }))
    const text = renderedNightTab()
    expect(text).toContain('Brak okna przy progu −15°; użyto progu −12°.')
    expect(text).toContain('próg −12°, h_min 30°')
  })

  it('P12: próg −15° bez obniżania → „Brak okna ciemności przy progu −15°.”', async () => {
    await openNight('2026-06-21', settingsWith({ darknessThresholdDeg: -15, autoLowerThreshold: false }))
    const text = renderedNightTab()
    expect(text).toContain('Brak okna ciemności przy progu −15°.')
    expect(text).not.toContain('użyto progu')
  })

  it('P13: próg −18°, obniżanie wyłączone → „Brak okna ciemności przy progu −18°.”', async () => {
    await openNight('2026-06-21', settingsWith({ darknessThresholdDeg: -18, autoLowerThreshold: false }))
    const text = renderedNightTab()
    expect(text).toContain('Brak okna ciemności przy progu −18°.')
    expect(text).not.toContain('użyto progu')
  })

  it('P13: próg −18° bez obniżania → po wybraniu nocy kursor na lokalnej północy, 00:00 CEST', async () => {
    await openNight('2026-06-21', settingsWith({ darknessThresholdDeg: -18, autoLowerThreshold: false }))
    expect(cursorMs()).toBe(at('2026-06-22 00:00', 'CEST'))
    expect(renderedNightTab()).toContain('Kursor 00:00 CEST')
  })

  it('P13: próg −18° z obniżaniem → kursor w środku okna 23:15–02:16 CEST, ok. 00:45 CEST (±1 min)', async () => {
    await openNight('2026-06-21', settingsWith({ darknessThresholdDeg: -18, autoLowerThreshold: true }))
    expectSameMinute(cursorMs(), at('2026-06-22 00:45', 'CEST'))
    expect(renderedNightTab()).toContain('Brak okna przy progu −18°; użyto progu −12°.')
  })

  it('P13: próg −15° bez obniżania → kursor na północy; próg −12° bez obniżania → środek okna', async () => {
    await openNight('2026-06-21', settingsWith({ darknessThresholdDeg: -15, autoLowerThreshold: false }))
    expect(cursorMs()).toBe(at('2026-06-22 00:00', 'CEST'))
    await openNight('2026-06-21', settingsWith({ darknessThresholdDeg: -12, autoLowerThreshold: false }))
    expectSameMinute(cursorMs(), at('2026-06-22 00:45', 'CEST'))
    expect(renderedNightTab()).not.toContain('Brak okna')
  })
})

describe('noc 16/17.10.2026, 52,0°N 19,0°E, horyzont płaski', () => {
  it('P14: zapisane h_min 20° → podpis czasu efektywnego „próg −18°, h_min 20°” bez wybranego obiektu', async () => {
    await openNight('2026-10-16', settingsWith({ minAltitudeDeg: 20 }))
    const text = renderedNightTab()
    expect(text).toContain('Czas efektywny')
    expect(text).toContain('próg −18°, h_min 20°')
    expect(text).not.toContain('h_min 30°')
  })

  it('P14: zapisane h_min 35° i próg −15° → podpis „próg −15°, h_min 35°”', async () => {
    await openNight('2026-10-16', settingsWith({ minAltitudeDeg: 35, darknessThresholdDeg: -15 }))
    const text = renderedNightTab()
    expect(text).toContain('próg −15°, h_min 35°')
    expect(text).not.toContain('h_min 30°')
  })

  it('P11: uszkodzony zapis (h_min jako tekst) → aplikacja startuje z wartościami domyślnymi', async () => {
    await locationRepository.save(appDb, FLAT_SITE)
    await corruptSaved(appDb, settingsWith({ minAltitudeDeg: 25, minEffectiveHours: 2.5 }), 'minAltitudeDeg', '25')
    await startOnNight('2026-10-16')
    expect(usePlannerStore.getState().locationsReady).toBe(true)
    expect(usePlannerStore.getState().planningSettings).toEqual(defaults())
    expect(renderedNightTab()).toContain('próg −18°, h_min 30°')
  })
})
