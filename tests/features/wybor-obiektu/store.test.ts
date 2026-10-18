// P1, P4: akcja otwarcia obiektu w src/state/plannerStore.ts (`openObject(uid)`; nazwy spec nie podaje): uid trafia do
// `objectUid`, zakładka zmienia się na 'night', a noc D, lokalizacja i kursor czasu się nie zmieniają.
// P5: `objectUid` jest zapamiętywany w localStorage, więc po ponownym uruchomieniu stan ma otwarty obiekt.
// Każde „uruchomienie aplikacji” to świeży moduł stanu nad localStorage w pamięci.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEMO_LOCATION } from '../../../src/data/demo'
import { at } from '../../../src/test/fixtures'
import {
  CURSOR_MS,
  M13,
  M31,
  M57,
  MemoryStorage,
  OCT_16,
  nightPlaceCursor,
  prepareCatalogTab,
  savedState,
  startApp,
} from './helpers'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('openObject', () => {
  it('P1: M 13 z zakładki Katalog → zakładka Noc, objectUid NGC6205; noc, lokalizacja i kursor czasu bez zmian', async () => {
    const app = await startApp()
    prepareCatalogTab(app.store)
    const before = nightPlaceCursor(app.store.getState())
    expect(before).toEqual({ nightDate: OCT_16, activeLocationId: DEMO_LOCATION.id, cursorMs: CURSOR_MS, followNow: false })
    expect(app.store.getState().tab).toBe('catalog')

    app.store.getState().openObject(M13.uid)

    expect(app.store.getState().tab).toBe('night')
    expect(app.store.getState().objectUid).toBe('NGC6205')
    expect(nightPlaceCursor(app.store.getState())).toEqual(before)
  })

  it('P1: w trybie „Teraz” (kursor za zegarem) → tryb „Teraz”, kursor i noc zostają', async () => {
    const app = await startApp()
    prepareCatalogTab(app.store)
    app.store.getState().goNow(at('2026-10-16 22:10', 'CEST'))
    const before = nightPlaceCursor(app.store.getState())
    expect(before).toEqual({
      nightDate: OCT_16,
      activeLocationId: DEMO_LOCATION.id,
      cursorMs: at('2026-10-16 22:10', 'CEST'),
      followNow: true,
    })

    app.store.getState().openObject(M13.uid)

    expect(app.store.getState()).toMatchObject({ tab: 'night', objectUid: 'NGC6205' })
    expect(nightPlaceCursor(app.store.getState())).toEqual(before)
  })

  it('P1: karta innego obiektu (M 57 po M 13) → objectUid NGC6720, zakładka Noc', async () => {
    const app = await startApp()
    prepareCatalogTab(app.store)
    app.store.getState().openObject(M13.uid)
    app.store.getState().setTab('catalog')

    app.store.getState().openObject(M57.uid)

    expect(app.store.getState()).toMatchObject({ tab: 'night', objectUid: 'NGC6720' })
  })

  it('P4: karta M 31 (jest w „Klasyki”) → zakładka Noc, objectUid NGC224; noc, lokalizacja i kursor bez zmian', async () => {
    const app = await startApp()
    prepareCatalogTab(app.store)
    const before = nightPlaceCursor(app.store.getState())

    app.store.getState().openObject(M31.uid)

    expect(app.store.getState()).toMatchObject({ tab: 'night', objectUid: 'NGC224' })
    expect(nightPlaceCursor(app.store.getState())).toEqual(before)
  })
})

describe('zapamiętany obiekt', () => {
  it('P5: po otwarciu M 13 localStorage ma objectUid NGC6205 i zakładkę Noc; po ponownym uruchomieniu stan je ma', async () => {
    const storage = new MemoryStorage()
    const first = await startApp(storage)
    prepareCatalogTab(first.store)
    first.store.getState().openObject(M13.uid)
    expect(savedState(storage)).toMatchObject({ objectUid: 'NGC6205', tab: 'night' })

    const second = await startApp(storage)
    expect(second.store.getState().objectUid).toBe('NGC6205')
    expect(second.store.getState().tab).toBe('night')
  })
})
