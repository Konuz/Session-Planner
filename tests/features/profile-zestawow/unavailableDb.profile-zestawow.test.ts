// P14: baza przeglądarki niedostępna. Ten plik celowo nie ładuje fake-indexeddb, więc IndexedDB nie istnieje
// (jak w przeglądarce bez dostępu do bazy), a każdy zapis do bazy kończy się błędem Dexie.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { DEMO_NAMES, ESPRIT_ID, MOJ_ID, REDCAT_ID, WARM_UP_MS, custom, demo, startApp, warmUp, type App } from './helpers'

let app: App

beforeEach(async () => {
  expect(globalThis.indexedDB, 'w tym pliku IndexedDB ma nie istnieć').toBeUndefined()
  app = await startApp()
  await app.load()
})

beforeAll(warmUp, WARM_UP_MS)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('P14 baza przeglądarki niedostępna', () => {
  it('P14: lista to 4 profile z 6.4 w pamięci, aktywny „Mój zestaw”', () => {
    expect(app.profiles()).toEqual(DEMO_PROFILES)
    expect(app.active().id).toBe(MOJ_ID)
    expect(app.topBar().options).toEqual(DEMO_NAMES)
  })

  it('P14: wybór aktywnego profilu działa (także z listy „Zestaw” na górnym pasku)', () => {
    app.state().selectProfile(REDCAT_ID)
    expect(app.active().name).toBe('RedCat 51 + ASI2600MC Pro')
    app.topBar().choose(ESPRIT_ID)
    expect(app.active().name).toBe('Esprit 100ED + ASI6200MM Pro')
  })

  it('P14: Dodaj kończy się błędem, lista w stanie bez zmian', async () => {
    await expect(app.state().addProfile()).rejects.toThrow()
    expect(app.profiles()).toEqual(DEMO_PROFILES)
  })

  it('P14: Duplikuj kończy się błędem, lista w stanie bez zmian', async () => {
    await expect(app.state().duplicateProfile(REDCAT_ID)).rejects.toThrow()
    expect(app.profiles()).toEqual(DEMO_PROFILES)
  })

  it('P14: zapis poprawnego profilu (istniejące i nowe id) kończy się błędem, lista w stanie bez zmian', async () => {
    await expect(app.state().saveProfile({ ...demo(REDCAT_ID), name: 'Szeroki kadr' })).rejects.toThrow()
    expect(app.profiles()).toEqual(DEMO_PROFILES)
    await expect(app.state().saveProfile(custom('wlasny-szeroki-kadr', 'Szeroki kadr'))).rejects.toThrow()
    expect(app.profiles()).toEqual(DEMO_PROFILES)
  })

  it('P14: usunięcie kończy się błędem, lista w stanie bez zmian', async () => {
    await expect(app.state().removeProfile(REDCAT_ID)).rejects.toThrow()
    expect(app.profiles()).toEqual(DEMO_PROFILES)
  })
})
