// P1 na poziomie aplikacji: pierwsze uruchomienie z pustą bazą przeglądarki, nic nie zapisano.
// Osobny plik, żeby żaden inny test nie zapisał wcześniej parametrów w tej samej bazie.
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DEMO_LOCATION } from '../../../src/data/demo'
import { usePlannerStore } from '../../../src/state/plannerStore'
import { defaults } from './helpers'
import { renderedNightTab } from './render'

describe('pierwsze uruchomienie', () => {
  it('P1: po starcie z pustą bazą stan aplikacji ma parametry domyślne', async () => {
    await usePlannerStore.getState().loadLocations()
    expect(usePlannerStore.getState().planningSettings).toEqual(defaults())
  })

  it('P1: zakładka Noc (16/17.10.2026) podpisuje czas efektywny „próg −18°, h_min 30°”', async () => {
    await usePlannerStore.getState().loadLocations()
    usePlannerStore.getState().selectLocation(DEMO_LOCATION.id)
    usePlannerStore.getState().setNightDate('2026-10-16')
    expect(usePlannerStore.getState().planningSettings).toEqual(defaults())
    expect(renderedNightTab()).toContain('próg −18°, h_min 30°')
  })
})
