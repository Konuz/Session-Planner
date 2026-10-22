// Profile sprzętu zapisane w przeglądarce (IndexedDB przez fake-indexeddb): wczytanie z profilami startowymi z 6.4,
// dodawanie, duplikowanie, zapis, usuwanie, wybór aktywnego profilu (także na górnym pasku) i uszkodzony wpis.
// Nazwy stanu i akcji (spec ich nie podaje) opisuje helpers.ts.
import 'fake-indexeddb/auto'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { hasErrors, validateEquipment } from '../../../src/services/equipment'
import type { EquipmentProfile } from '../../../src/types'
import {
  DEMO_NAMES,
  ESPRIT_ID,
  MOJ_ID,
  NEWTON_ID,
  REDCAT_ID,
  custom,
  demo,
  WARM_UP_MS,
  firstRun,
  reopen,
  savedState,
  startApp,
  storageWithActive,
  valuesOf,
  warmUp,
  withoutFocalLength,
  type App,
} from './helpers'

let app: App

beforeEach(async () => {
  app = await firstRun()
})

beforeAll(warmUp, WARM_UP_MS)

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Stan listy i surowy wpis w bazie, do sprawdzenia, że odrzucona akcja niczego nie zmieniła. */
async function snapshot(current: App) {
  return { profiles: structuredClone(current.profiles()), saved: structuredClone(await current.saved()) }
}

const ids = (profiles: readonly EquipmentProfile[]) => profiles.map((profile) => profile.id)

describe('P1 pierwsze uruchomienie', () => {
  it('P1: brak wpisu profiles → 4 profile z 6.4 w kolejności (wartości jak DEMO_PROFILES), aktywny „Mój zestaw”', async () => {
    expect(await app.saved()).toBeUndefined()
    await app.load()
    expect(app.names()).toEqual(DEMO_NAMES)
    expect(app.profiles()).toEqual(DEMO_PROFILES)
    expect(app.active().name).toBe('Mój zestaw')
    expect(app.active().id).toBe(MOJ_ID)
  })

  it('P1: lista zostaje zapisana w tabeli settings pod kluczem profiles', async () => {
    await app.load()
    expect(await app.saved()).toEqual(DEMO_PROFILES)
  })

  it('P1: podwójne wczytanie nie dubluje listy ani w stanie, ani w bazie (także po ponownym otwarciu)', async () => {
    await app.load()
    await app.load()
    expect(app.profiles()).toEqual(DEMO_PROFILES)
    expect(await app.saved()).toEqual(DEMO_PROFILES)
    const again = await reopen()
    await again.load()
    expect(again.profiles()).toEqual(DEMO_PROFILES)
    expect(await again.saved()).toEqual(DEMO_PROFILES)
  })

  it('P1 (Styk z resztą): profile bez własnej wersji bazy; od projektów (7E) db.verno = 4', async () => {
    await app.load()
    expect(app.db.verno).toBe(4)
  })
})

describe('P2 usunięte profile nie wracają', () => {
  it('P2: usunięcie 3 profili demonstracyjnych i ponowne otwarcie → zostaje 1 profil', async () => {
    await app.load()
    await app.state().removeProfile(REDCAT_ID)
    await app.state().removeProfile(NEWTON_ID)
    await app.state().removeProfile(ESPRIT_ID)
    expect(app.names()).toEqual(['Mój zestaw'])

    const again = await reopen()
    expect(again.names()).toEqual(['Mój zestaw'])
    expect(again.profiles()).toEqual([demo(MOJ_ID)])
    expect(await again.saved()).toEqual([demo(MOJ_ID)])
  })
})

describe('P3 Dodaj', () => {
  it('P3: Dodaj → na końcu „Nowy zestaw” z wartościami „Mój zestaw” z 6.4 i nowym id; aktywny bez zmian', async () => {
    await app.load()
    app.state().selectProfile(REDCAT_ID)
    await app.state().addProfile()

    const profiles = app.profiles()
    expect(profiles).toHaveLength(5)
    expect(profiles.slice(0, 4)).toEqual(DEMO_PROFILES)
    const added = profiles[4]
    expect(added.name).toBe('Nowy zestaw')
    expect(valuesOf(added)).toEqual(valuesOf(demo(MOJ_ID)))
    expect(added.telescope.label).toBe('Newton 150/600')
    expect(added.camera.label).toBe(demo(MOJ_ID).camera.label)
    expect(added.filters).toEqual(['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII'])
    expect(ids(DEMO_PROFILES)).not.toContain(added.id)
    expect(app.active().id).toBe(REDCAT_ID)
    expect(await app.saved()).toEqual(profiles)
  })

  it('P3: drugie Dodaj → „Nowy zestaw 2” z id innym niż wszystkie istniejące', async () => {
    await app.load()
    await app.state().addProfile()
    await app.state().addProfile()

    const profiles = app.profiles()
    expect(profiles.map((profile) => profile.name)).toEqual([...DEMO_NAMES, 'Nowy zestaw', 'Nowy zestaw 2'])
    expect(new Set(ids(profiles)).size).toBe(6)
    expect(valuesOf(profiles[5])).toEqual(valuesOf(demo(MOJ_ID)))
    expect(app.active().id).toBe(MOJ_ID)
    expect(await app.saved()).toEqual(profiles)
  })

  it('P3: wartości pochodzą z „Mój zestaw” z 6.4, nawet gdy zapisany „Mój zestaw” zmieniono', async () => {
    await app.load()
    const changed = demo(MOJ_ID)
    changed.name = 'Szeroki kadr'
    changed.telescope = { ...changed.telescope, apertureMm: 200, focalLengthMm: 800 }
    changed.filters = ['Ha']
    await app.state().saveProfile(changed)
    await app.state().addProfile()

    const added = app.profiles()[4]
    expect(added.name).toBe('Nowy zestaw')
    expect(valuesOf(added)).toEqual(valuesOf(demo(MOJ_ID)))
  })

  it('P3: dodany profil zostaje po ponownym otwarciu aplikacji', async () => {
    await app.load()
    await app.state().addProfile()
    const profiles = structuredClone(app.profiles())
    const again = await reopen()
    expect(again.profiles()).toEqual(profiles)
  })
})

describe('P4 Duplikuj', () => {
  it('P4: Duplikuj „RedCat 51 + ASI2600MC Pro” → na końcu „… (kopia)” z tymi samymi wartościami i nowym id', async () => {
    await app.load()
    app.state().selectProfile(ESPRIT_ID)
    await app.state().duplicateProfile(REDCAT_ID)

    const profiles = app.profiles()
    expect(profiles).toHaveLength(5)
    expect(profiles.slice(0, 4)).toEqual(DEMO_PROFILES)
    const copy = profiles[4]
    expect(copy.name).toBe('RedCat 51 + ASI2600MC Pro (kopia)')
    expect(valuesOf(copy)).toEqual(valuesOf(demo(REDCAT_ID)))
    expect(ids(DEMO_PROFILES)).not.toContain(copy.id)
    expect(app.active().id).toBe(ESPRIT_ID)
    expect(await app.saved()).toEqual(profiles)
  })

  it('P4: ponowne duplikowanie oryginału → „… (kopia 2)” z nowym id', async () => {
    await app.load()
    await app.state().duplicateProfile(REDCAT_ID)
    await app.state().duplicateProfile(REDCAT_ID)

    const profiles = app.profiles()
    expect(profiles.map((profile) => profile.name)).toEqual([
      ...DEMO_NAMES,
      'RedCat 51 + ASI2600MC Pro (kopia)',
      'RedCat 51 + ASI2600MC Pro (kopia 2)',
    ])
    expect(new Set(ids(profiles)).size).toBe(6)
    expect(valuesOf(profiles[5])).toEqual(valuesOf(demo(REDCAT_ID)))
    expect(app.active().id).toBe(MOJ_ID)
  })

  it('P4: filtry kopii zmienione na „Ha” → oryginał nadal OSC, DualBand (w stanie i po ponownym otwarciu)', async () => {
    await app.load()
    await app.state().duplicateProfile(REDCAT_ID)
    const copy = structuredClone(app.profiles()[4])
    await app.state().saveProfile({ ...copy, filters: ['Ha'] })

    const original = app.profiles().find((profile) => profile.id === REDCAT_ID)
    expect(original?.filters).toEqual(['OSC', 'DualBand'])
    expect(app.profiles()[4].filters).toEqual(['Ha'])

    const again = await reopen()
    expect(again.profiles().find((profile) => profile.id === REDCAT_ID)?.filters).toEqual(['OSC', 'DualBand'])
    expect(again.profiles().find((profile) => profile.id === copy.id)?.filters).toEqual(['Ha'])
  })
})

describe('P5 zapis profilu', () => {
  it('P5: zapis istniejącego id z nazwą „Szeroki kadr” → profil zostaje na swoim miejscu z nową nazwą', async () => {
    await app.load()
    await app.state().saveProfile({ ...demo(REDCAT_ID), name: 'Szeroki kadr' })

    const expected = [demo(MOJ_ID), { ...demo(REDCAT_ID), name: 'Szeroki kadr' }, demo(NEWTON_ID), demo(ESPRIT_ID)]
    expect(app.profiles()).toEqual(expected)
    expect(await app.saved()).toEqual(expected)
  })

  it('P5: po ponownym otwarciu aplikacji profil ma nową nazwę i to samo miejsce', async () => {
    await app.load()
    await app.state().saveProfile({ ...demo(REDCAT_ID), name: 'Szeroki kadr' })

    const again = await reopen()
    expect(again.names()).toEqual(['Mój zestaw', 'Szeroki kadr', 'Newton 200/1000 + ASI533MM Pro', 'Esprit 100ED + ASI6200MM Pro'])
    expect(ids(again.profiles())).toEqual([MOJ_ID, REDCAT_ID, NEWTON_ID, ESPRIT_ID])
  })

  it('P5: zapis profilu o nowym id → trafia na koniec listy (w stanie i w bazie)', async () => {
    await app.load()
    const added = custom('wlasny-szeroki-kadr', 'Szeroki kadr')
    await app.state().saveProfile(added)

    expect(app.profiles()).toEqual([...DEMO_PROFILES, added])
    expect(await app.saved()).toEqual([...DEMO_PROFILES, added])
  })

  it('P5 (Pytania): dwa profile mogą mieć tę samą nazwę, różnią się id', async () => {
    await app.load()
    const twin = custom('wlasny-redcat', 'RedCat 51 + ASI2600MC Pro', NEWTON_ID)
    await app.state().saveProfile(twin)

    expect(app.profiles()).toEqual([...DEMO_PROFILES, twin])
    expect(app.names().filter((name) => name === 'RedCat 51 + ASI2600MC Pro')).toHaveLength(2)
  })
})

describe('P6 walidacja wartości przy zapisie', () => {
  it('P6: apertura 0 mm → odrzucony z „Apertura: dozwolony zakres 5–1500 mm”; stan i baza bez zmian', async () => {
    await app.load()
    const before = await snapshot(app)
    const broken = demo(REDCAT_ID)
    broken.telescope.apertureMm = 0

    await expect(app.state().saveProfile(broken)).rejects.toThrow('Apertura: dozwolony zakres 5–1500 mm')
    await app.load()
    expect(await snapshot(app)).toEqual(before)
  })

  it('P6: mnożnik 4 → odrzucony z komunikatem z validateEquipment; stan i baza bez zmian', async () => {
    await app.load()
    const before = await snapshot(app)
    const message = validateEquipment({ reducerFactor: 4 })[0].message
    expect(message).toContain('Mnożnik: dozwolony zakres')

    await expect(app.state().saveProfile({ ...demo(MOJ_ID), reducerFactor: 4 })).rejects.toThrow(message)
    await app.load()
    expect(await snapshot(app)).toEqual(before)
  })

  it('P6: apertura 500 mm i ogniskowa 400 mm (f/0,8, tylko ostrzeżenie) → zapisany', async () => {
    await app.load()
    const fast = demo(MOJ_ID)
    fast.telescope = { ...fast.telescope, apertureMm: 500, focalLengthMm: 400 }
    const issues = validateEquipment({ apertureMm: 500, focalLengthMm: 400 })
    expect(issues).toHaveLength(1)
    expect(hasErrors(issues)).toBe(false)

    await app.state().saveProfile(fast)
    expect(app.profiles()[0]).toEqual(fast)
    expect((await app.saved()) as EquipmentProfile[]).toEqual([fast, demo(REDCAT_ID), demo(NEWTON_ID), demo(ESPRIT_ID)])
  })
})

describe('P7 nazwa profilu', () => {
  it('P7: pusta nazwa → odrzucony z „Nazwa: wpisz nazwę”; stan i baza bez zmian', async () => {
    await app.load()
    const before = await snapshot(app)
    await expect(app.state().saveProfile({ ...demo(REDCAT_ID), name: '' })).rejects.toThrow('Nazwa: wpisz nazwę')
    await app.load()
    expect(await snapshot(app)).toEqual(before)
  })

  it('P7: nazwa z samych spacji → odrzucony z „Nazwa: wpisz nazwę”; nowy profil nie trafia na listę', async () => {
    await app.load()
    const before = await snapshot(app)
    await expect(app.state().saveProfile(custom('wlasny-pusty', '   '))).rejects.toThrow('Nazwa: wpisz nazwę')
    await app.load()
    expect(await snapshot(app)).toEqual(before)
  })

  it('P7: nazwa „  Szeroki kadr ” zapisuje się jako „Szeroki kadr”', async () => {
    await app.load()
    await app.state().saveProfile({ ...demo(NEWTON_ID), name: '  Szeroki kadr ' })
    expect(app.profiles()[2].name).toBe('Szeroki kadr')
    const saved = (await app.saved()) as EquipmentProfile[]
    expect(saved[2].name).toBe('Szeroki kadr')
  })
})

describe('P8 usuwanie', () => {
  it('P8: usunięcie nieaktywnego profilu → znika z listy i z bazy, aktywny bez zmian', async () => {
    await app.load()
    app.state().selectProfile(ESPRIT_ID)
    await app.state().removeProfile(NEWTON_ID)

    const expected = [demo(MOJ_ID), demo(REDCAT_ID), demo(ESPRIT_ID)]
    expect(app.profiles()).toEqual(expected)
    expect(await app.saved()).toEqual(expected)
    expect(app.active().id).toBe(ESPRIT_ID)
  })

  it('P8: usunięcie aktywnego „Esprit 100ED + ASI6200MM Pro” → aktywny „Mój zestaw”', async () => {
    await app.load()
    app.state().selectProfile(ESPRIT_ID)
    await app.state().removeProfile(ESPRIT_ID)

    expect(ids(app.profiles())).toEqual([MOJ_ID, REDCAT_ID, NEWTON_ID])
    expect(app.active().name).toBe('Mój zestaw')
  })

  it('P8: „Mój zestaw” nie jest pierwszy na liście → po usunięciu aktywnego aktywny jest „Mój zestaw”', async () => {
    await app.putSaved([demo(REDCAT_ID), demo(MOJ_ID), demo(ESPRIT_ID)])
    await app.load()
    app.state().selectProfile(ESPRIT_ID)
    await app.state().removeProfile(ESPRIT_ID)

    expect(ids(app.profiles())).toEqual([REDCAT_ID, MOJ_ID])
    expect(app.active().id).toBe(MOJ_ID)
  })

  it('P8: „Mój zestaw” już nie istnieje → po usunięciu aktywnego aktywny jest pierwszy profil z listy', async () => {
    await app.load()
    await app.state().removeProfile(MOJ_ID)
    app.state().selectProfile(ESPRIT_ID)
    await app.state().removeProfile(ESPRIT_ID)

    expect(ids(app.profiles())).toEqual([REDCAT_ID, NEWTON_ID])
    expect(app.active().id).toBe(REDCAT_ID)
    expect(await app.saved()).toEqual([demo(REDCAT_ID), demo(NEWTON_ID)])
  })
})

describe('P9 ostatni profil', () => {
  it('P9: lista ma 1 profil, próba usunięcia → nic się nie dzieje; lista i baza bez zmian', async () => {
    await app.load()
    await app.state().removeProfile(REDCAT_ID)
    await app.state().removeProfile(NEWTON_ID)
    await app.state().removeProfile(ESPRIT_ID)
    const before = await snapshot(app)
    expect(before.profiles).toEqual([demo(MOJ_ID)])

    await expect(app.state().removeProfile(MOJ_ID)).resolves.toBeUndefined()
    expect(app.profiles()).toEqual([demo(MOJ_ID)])
    await app.load()
    expect(await snapshot(app)).toEqual(before)
  })
})

describe('P10 lista „Zestaw” na górnym pasku', () => {
  it('P10: lista „Zestaw” pokazuje 4 profile ze stanu w ich kolejności', async () => {
    await app.load()
    const bar = app.topBar()
    expect(bar.options).toEqual(DEMO_NAMES)
    expect(bar.values).toEqual([MOJ_ID, REDCAT_ID, NEWTON_ID, ESPRIT_ID])
    expect(bar.value).toBe(MOJ_ID)
  })

  it('P10: lista „Zestaw” idzie za kolejnością i zawartością listy w stanie (inna lista z bazy)', async () => {
    await app.putSaved([demo(ESPRIT_ID), custom('wlasny-szeroki-kadr', 'Szeroki kadr'), demo(MOJ_ID)])
    await app.load()
    const bar = app.topBar()
    expect(bar.options).toEqual(['Esprit 100ED + ASI6200MM Pro', 'Szeroki kadr', 'Mój zestaw'])
    expect(bar.values).toEqual([ESPRIT_ID, 'wlasny-szeroki-kadr', MOJ_ID])
  })

  it('P10: po dodaniu „Szeroki kadr” pasek ma 5 pozycji, ostatnia „Szeroki kadr”; wybranie jej ustawia ją jako aktywną', async () => {
    await app.load()
    await app.state().saveProfile(custom('wlasny-szeroki-kadr', 'Szeroki kadr'))
    const bar = app.topBar()
    expect(bar.options).toEqual([...DEMO_NAMES, 'Szeroki kadr'])

    bar.choose('wlasny-szeroki-kadr')
    expect(app.state().activeProfileId).toBe('wlasny-szeroki-kadr')
    expect(app.active().name).toBe('Szeroki kadr')
    expect(app.topBar().value).toBe('wlasny-szeroki-kadr')
  })
})

describe('P11 aktywny profil po ponownym otwarciu', () => {
  it('P11: aktywny własny „Szeroki kadr” → po ponownym otwarciu i wczytaniu listy nadal aktywny', async () => {
    await app.load()
    await app.state().saveProfile(custom('wlasny-szeroki-kadr', 'Szeroki kadr'))
    app.state().selectProfile('wlasny-szeroki-kadr')
    expect(savedState(app.storage).activeProfileId).toBe('wlasny-szeroki-kadr')

    const again = await startApp(app.storage)
    expect(again.state().activeProfileId).toBe('wlasny-szeroki-kadr')
    again.state().toggleRedMode()
    expect(savedState(app.storage).activeProfileId).toBe('wlasny-szeroki-kadr')

    await again.load()
    expect(again.active().name).toBe('Szeroki kadr')
    expect(again.active().id).toBe('wlasny-szeroki-kadr')
    expect(savedState(app.storage).activeProfileId).toBe('wlasny-szeroki-kadr')
  })

  it('P11: zapamiętanego id nie ma na liście → aktywny staje się „Mój zestaw” (nie pierwszy z listy)', async () => {
    await app.putSaved([demo(REDCAT_ID), demo(MOJ_ID), demo(ESPRIT_ID)])
    const again = await startApp(storageWithActive('wlasny-usuniety'))
    expect(again.state().activeProfileId).toBe('wlasny-usuniety')
    await again.load()
    expect(again.active().id).toBe(MOJ_ID)
  })

  it('P11: zapamiętanego id ani „Mój zestaw” nie ma na liście → aktywny jest pierwszy profil', async () => {
    await app.putSaved([demo(ESPRIT_ID), custom('wlasny-szeroki-kadr', 'Szeroki kadr')])
    const again = await startApp(storageWithActive('wlasny-usuniety'))
    await again.load()
    expect(again.active().id).toBe(ESPRIT_ID)
  })
})

describe('P12 activeProfileOf', () => {
  it('P12: stan bez listy, activeProfileId demo-redcat51-asi2600mc → „RedCat 51 + ASI2600MC Pro” z DEMO_PROFILES', () => {
    expect(app.activeProfileOf({ activeProfileId: 'demo-redcat51-asi2600mc' })).toEqual(demo(REDCAT_ID))
  })

  it('P12: stan bez listy, activeProfileId nie-ma-takiego → „Mój zestaw”', () => {
    expect(app.activeProfileOf({ activeProfileId: 'nie-ma-takiego' }).name).toBe('Mój zestaw')
  })

  it('P12: lista bez demo-moj-zestaw i nieznane id → pierwszy profil z listy', () => {
    const profiles = [demo(ESPRIT_ID), custom('wlasny-szeroki-kadr', 'Szeroki kadr')]
    expect(app.activeProfileOf({ activeProfileId: 'nie-ma-takiego', profiles })).toEqual(demo(ESPRIT_ID))
  })

  it('P12: z listą wynik pochodzi z listy, nie z DEMO_PROFILES (zmieniona nazwa profilu demo)', () => {
    const renamed = { ...demo(REDCAT_ID), name: 'Szeroki kadr' }
    const profiles = [demo(MOJ_ID), renamed]
    expect(app.activeProfileOf({ activeProfileId: REDCAT_ID, profiles })).toEqual(renamed)
    expect(app.activeProfileOf({ activeProfileId: 'wlasny-szeroki-kadr', profiles: [demo(NEWTON_ID), custom('wlasny-szeroki-kadr', 'Szeroki kadr')] }).name).toBe('Szeroki kadr')
  })
})

describe('P13 uszkodzony wpis profiles', () => {
  it('P13: jeden z 3 profili nie ma ogniskowej → wczytują się 2 poprawne profile', async () => {
    await app.putSaved([demo(MOJ_ID), withoutFocalLength(REDCAT_ID), demo(ESPRIT_ID)])
    await app.load()
    expect(app.profiles()).toEqual([demo(MOJ_ID), demo(ESPRIT_ID)])
    expect(app.active().id).toBe(MOJ_ID)
  })

  it('P13 (Pytania): przy wczytaniu uszkodzonego wpisu nic nie trafia do bazy', async () => {
    const broken = [demo(MOJ_ID), withoutFocalLength(REDCAT_ID), demo(ESPRIT_ID)]
    await app.putSaved(broken)
    await app.load()
    await app.load()
    expect(await app.saved()).toEqual(broken)
  })

  it('P13 (Pytania): następny zapis nadpisuje uszkodzony wpis bieżącą listą', async () => {
    await app.putSaved([demo(MOJ_ID), withoutFocalLength(REDCAT_ID), demo(ESPRIT_ID)])
    await app.load()
    await app.state().saveProfile({ ...demo(ESPRIT_ID), name: 'Szeroki kadr' })
    const expected = [demo(MOJ_ID), { ...demo(ESPRIT_ID), name: 'Szeroki kadr' }]
    expect(app.profiles()).toEqual(expected)
    expect(await app.saved()).toEqual(expected)
  })

  it('P13: wpis nie jest listą (tekst) → 4 profile z 6.4, aplikacja działa dalej', async () => {
    await app.putSaved('to nie jest lista')
    await app.load()
    expect(app.profiles()).toEqual(DEMO_PROFILES)
    expect(app.active().name).toBe('Mój zestaw')
    app.state().selectProfile(NEWTON_ID)
    expect(app.active().id).toBe(NEWTON_ID)
    expect(app.topBar().options).toEqual(DEMO_NAMES)
  })

  it('P13: żaden profil we wpisie nie jest poprawny → 4 profile z 6.4', async () => {
    await app.putSaved([withoutFocalLength(MOJ_ID), withoutFocalLength(NEWTON_ID)])
    await app.load()
    expect(app.profiles()).toEqual(DEMO_PROFILES)
    expect(app.active().id).toBe(MOJ_ID)
  })
})
