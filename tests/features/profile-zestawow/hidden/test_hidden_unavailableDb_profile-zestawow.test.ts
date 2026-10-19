// Testy ukryte P14: baza przeglądarki niedostępna (bez fake-indexeddb), inne wartości niż w testach widocznych.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { DEMO_PROFILES } from '../../../../src/data/demo'
import { ESPRIT_ID, NEWTON_ID, WARM_UP_MS, startApp, warmUp } from '../helpers'

beforeAll(warmUp, WARM_UP_MS)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ukryte P14', () => {
  it('P14: aktywny Esprit, próba jego usunięcia → błąd; lista i aktywny bez zmian', async () => {
    expect(globalThis.indexedDB).toBeUndefined()
    const app = await startApp()
    await app.load()
    app.state().selectProfile(ESPRIT_ID)

    await expect(app.state().removeProfile(ESPRIT_ID)).rejects.toThrow()
    expect(app.profiles()).toEqual(DEMO_PROFILES)
    expect(app.active().id).toBe(ESPRIT_ID)
  })

  it('P14: Duplikuj Newton i Dodaj → błąd, lista w stanie bez zmian, aktywny Newton', async () => {
    const app = await startApp()
    await app.load()
    app.state().selectProfile(NEWTON_ID)

    await expect(app.state().duplicateProfile(NEWTON_ID)).rejects.toThrow()
    await expect(app.state().addProfile()).rejects.toThrow()
    expect(app.profiles()).toEqual(DEMO_PROFILES)
    expect(app.active().id).toBe(NEWTON_ID)
  })
})
