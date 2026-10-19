// Testy ukryte funkcji „profile-zestawow”: to samo zachowanie co w testach widocznych, inne wartości.
import 'fake-indexeddb/auto'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_PROFILES } from '../../../../src/data/demo'
import { validateEquipment } from '../../../../src/services/equipment'
import type { EquipmentProfile } from '../../../../src/types'
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
  startApp,
  storageWithActive,
  valuesOf,
  warmUp,
  withoutFocalLength,
  type App,
} from '../helpers'

let app: App

beforeEach(async () => {
  app = await firstRun()
})

beforeAll(warmUp, WARM_UP_MS)

afterEach(() => {
  vi.unstubAllGlobals()
})

async function snapshot(current: App) {
  return { profiles: structuredClone(current.profiles()), saved: structuredClone(await current.saved()) }
}

const ids = (profiles: readonly EquipmentProfile[]) => profiles.map((profile) => profile.id)

describe('ukryte: usuwanie i ponowne otwarcie', () => {
  it('P2: usunięcie „Mój zestaw”, RedCat i Esprit → po ponownym otwarciu zostaje tylko Newton 200/1000, aktywny', async () => {
    await app.load()
    await app.state().removeProfile(MOJ_ID)
    await app.state().removeProfile(REDCAT_ID)
    await app.state().removeProfile(ESPRIT_ID)

    const again = await reopen()
    expect(again.profiles()).toEqual([demo(NEWTON_ID)])
    expect(again.active().id).toBe(NEWTON_ID)
  })

  it('P8: bez „Mój zestaw” i RedCat, usunięcie aktywnego Esprit → aktywny Newton 200/1000 (pierwszy)', async () => {
    await app.load()
    await app.state().removeProfile(MOJ_ID)
    await app.state().removeProfile(REDCAT_ID)
    app.state().selectProfile(ESPRIT_ID)
    await app.state().removeProfile(ESPRIT_ID)

    expect(app.profiles()).toEqual([demo(NEWTON_ID)])
    expect(app.active().id).toBe(NEWTON_ID)
  })

  it('P8: usunięcie nieaktywnego RedCat przy aktywnym Newton → aktywny bez zmian, baza bez RedCat', async () => {
    await app.load()
    app.state().selectProfile(NEWTON_ID)
    await app.state().removeProfile(REDCAT_ID)
    expect(ids(app.profiles())).toEqual([MOJ_ID, NEWTON_ID, ESPRIT_ID])
    expect(ids((await app.saved()) as EquipmentProfile[])).toEqual([MOJ_ID, NEWTON_ID, ESPRIT_ID])
    expect(app.active().id).toBe(NEWTON_ID)
  })

  it('P9: jedyny profil to własny „Zestaw wyjazdowy” → próba usunięcia nic nie zmienia', async () => {
    const only = custom('wlasny-wyjazdowy', 'Zestaw wyjazdowy', ESPRIT_ID)
    await app.putSaved([only])
    await app.load()
    const before = await snapshot(app)

    await expect(app.state().removeProfile('wlasny-wyjazdowy')).resolves.toBeUndefined()
    await app.load()
    expect(await snapshot(app)).toEqual(before)
    expect(app.profiles()).toEqual([only])
  })
})

describe('ukryte: Dodaj i Duplikuj', () => {
  it('P3: po usunięciu „Mój zestaw” Dodaj nadal bierze wartości z 6.4; aktywny Newton bez zmian', async () => {
    await app.load()
    await app.state().removeProfile(MOJ_ID)
    app.state().selectProfile(NEWTON_ID)
    await app.state().addProfile()

    const profiles = app.profiles()
    expect(profiles).toHaveLength(4)
    expect(profiles[3].name).toBe('Nowy zestaw')
    expect(valuesOf(profiles[3])).toEqual(valuesOf(demo(MOJ_ID)))
    expect(ids(DEMO_PROFILES)).not.toContain(profiles[3].id)
    expect(app.active().id).toBe(NEWTON_ID)
  })

  it('P3: bez „Mój zestaw”, aktywny Newton, drugie Dodaj → „Nowy zestaw 2” z wartościami z 6.4', async () => {
    await app.load()
    await app.state().removeProfile(MOJ_ID)
    app.state().selectProfile(NEWTON_ID)
    await app.state().addProfile()
    await app.state().addProfile()
    expect(app.names().slice(3)).toEqual(['Nowy zestaw', 'Nowy zestaw 2'])
    expect(valuesOf(app.profiles()[4])).toEqual(valuesOf(demo(MOJ_ID)))
    expect(new Set(ids(app.profiles())).size).toBe(5)
    expect(app.active().id).toBe(NEWTON_ID)
  })

  it('P4: Duplikuj „Esprit 100ED + ASI6200MM Pro” → „… (kopia)”; filtry kopii „L” nie zmieniają oryginału', async () => {
    await app.load()
    app.state().selectProfile(NEWTON_ID)
    await app.state().duplicateProfile(ESPRIT_ID)
    const copy = structuredClone(app.profiles()[4])
    expect(copy.name).toBe('Esprit 100ED + ASI6200MM Pro (kopia)')
    expect(valuesOf(copy)).toEqual(valuesOf(demo(ESPRIT_ID)))
    expect(copy.id).not.toBe(ESPRIT_ID)
    expect(app.active().id).toBe(NEWTON_ID)

    await app.state().saveProfile({ ...copy, filters: ['L'] })
    const again = await reopen()
    expect(again.profiles().find((profile) => profile.id === ESPRIT_ID)).toEqual(demo(ESPRIT_ID))
    expect(again.profiles().find((profile) => profile.id === copy.id)?.filters).toEqual(['L'])
  })

  it('P4: Duplikuj własny „Szeroki kadr” dwa razy → „(kopia)”, „(kopia 2)”', async () => {
    await app.load()
    const wide = custom('wlasny-szeroki-kadr', 'Szeroki kadr', NEWTON_ID)
    await app.state().saveProfile(wide)
    await app.state().duplicateProfile('wlasny-szeroki-kadr')
    await app.state().duplicateProfile('wlasny-szeroki-kadr')

    expect(app.names().slice(4)).toEqual(['Szeroki kadr', 'Szeroki kadr (kopia)', 'Szeroki kadr (kopia 2)'])
    for (const copy of app.profiles().slice(5)) expect(valuesOf(copy)).toEqual(valuesOf(wide))
    expect(new Set(ids(app.profiles())).size).toBe(7)
  })
})

describe('ukryte: zapis', () => {
  it('P5: zmiana nazwy ostatniego profilu na „Zestaw wyjazdowy” i apertury → to samo miejsce, także po otwarciu', async () => {
    await app.load()
    const changed = demo(ESPRIT_ID)
    changed.name = 'Zestaw wyjazdowy'
    changed.telescope = { ...changed.telescope, apertureMm: 120 }
    await app.state().saveProfile(changed)

    const expected = [demo(MOJ_ID), demo(REDCAT_ID), demo(NEWTON_ID), changed]
    expect(app.profiles()).toEqual(expected)
    const again = await reopen()
    expect(again.profiles()).toEqual(expected)
  })

  it('P6: ogniskowa 20 000 mm albo mnożnik 0,2 → odrzucone z komunikatami z validateEquipment', async () => {
    await app.load()
    const before = await snapshot(app)
    const long = demo(NEWTON_ID)
    long.telescope = { ...long.telescope, focalLengthMm: 20_000 }
    const focalMessage = validateEquipment({ focalLengthMm: 20_000 })[0].message
    await expect(app.state().saveProfile(long)).rejects.toThrow(focalMessage)

    const reducerMessage = validateEquipment({ reducerFactor: 0.2 })[0].message
    await expect(app.state().saveProfile({ ...demo(ESPRIT_ID), reducerFactor: 0.2 })).rejects.toThrow(reducerMessage)

    await app.load()
    expect(await snapshot(app)).toEqual(before)
  })

  it('P6: apertura 1600 mm w nowym profilu → odrzucony, profil nie trafia na listę', async () => {
    await app.load()
    const before = await snapshot(app)
    const huge = custom('wlasny-duzy', 'Duży teleskop')
    huge.telescope = { ...huge.telescope, apertureMm: 1600 }
    await expect(app.state().saveProfile(huge)).rejects.toThrow('Apertura: dozwolony zakres 5–1500 mm')
    await app.load()
    expect(await snapshot(app)).toEqual(before)
  })

  it('P6: apertura 100 mm i ogniskowa 3500 mm (f/35, tylko ostrzeżenie) → zapisany', async () => {
    await app.load()
    const slow = demo(REDCAT_ID)
    slow.telescope = { ...slow.telescope, apertureMm: 100, focalLengthMm: 3500 }
    await app.state().saveProfile(slow)
    expect(app.profiles()[1]).toEqual(slow)
    expect(((await app.saved()) as EquipmentProfile[])[1]).toEqual(slow)
  })

  it('P7: nazwa z pięciu spacji → „Nazwa: wpisz nazwę”; „   Zestaw wyjazdowy” → „Zestaw wyjazdowy”', async () => {
    await app.load()
    const before = await snapshot(app)
    await expect(app.state().saveProfile({ ...demo(ESPRIT_ID), name: '     ' })).rejects.toThrow('Nazwa: wpisz nazwę')
    await app.load()
    expect(await snapshot(app)).toEqual(before)

    await app.state().saveProfile(custom('wlasny-wyjazdowy', '   Zestaw wyjazdowy'))
    expect(app.names()[4]).toBe('Zestaw wyjazdowy')
    const again = await reopen()
    expect(again.names()[4]).toBe('Zestaw wyjazdowy')
  })
})

describe('ukryte: aktywny profil i pasek', () => {
  it('P10: po usunięciu RedCat lista „Zestaw” ma 3 pozycje; wybór Esprit ustawia go jako aktywny', async () => {
    await app.load()
    await app.state().removeProfile(REDCAT_ID)
    const bar = app.topBar()
    expect(bar.options).toEqual([DEMO_NAMES[0], DEMO_NAMES[2], DEMO_NAMES[3]])
    bar.choose(ESPRIT_ID)
    expect(app.active().id).toBe(ESPRIT_ID)
    expect(app.topBar().value).toBe(ESPRIT_ID)
  })

  it('P11: zapamiętany Esprit, w bazie [Newton, RedCat] → aktywny Newton (pierwszy, bo nie ma „Mój zestaw”)', async () => {
    await app.putSaved([demo(NEWTON_ID), demo(REDCAT_ID)])
    const again = await startApp(storageWithActive(ESPRIT_ID))
    await again.load()
    expect(again.active().id).toBe(NEWTON_ID)
  })

  it('P11: zapamiętany własny „Zestaw wyjazdowy” z bazy → nadal aktywny po wczytaniu', async () => {
    await app.putSaved([demo(MOJ_ID), custom('wlasny-wyjazdowy', 'Zestaw wyjazdowy', ESPRIT_ID)])
    const again = await startApp(storageWithActive('wlasny-wyjazdowy'))
    expect(again.state().activeProfileId).toBe('wlasny-wyjazdowy')
    await again.load()
    expect(again.active().name).toBe('Zestaw wyjazdowy')
  })

  it('P12: activeProfileOf bez listy dla Esprit → Esprit z DEMO_PROFILES; z listą bez tego id → pierwszy z listy', () => {
    expect(app.activeProfileOf({ activeProfileId: ESPRIT_ID })).toEqual(demo(ESPRIT_ID))
    const profiles = [custom('wlasny-a', 'Zestaw A', NEWTON_ID), custom('wlasny-b', 'Zestaw B')]
    expect(app.activeProfileOf({ activeProfileId: 'nieznany', profiles })).toEqual(profiles[0])
    expect(app.activeProfileOf({ activeProfileId: 'wlasny-b', profiles })).toEqual(profiles[1])
  })
})

describe('ukryte: uszkodzony wpis', () => {
  it('P13: 4 profile, pierwszy bez ogniskowej → wczytują się 3 pozostałe; wpis w bazie bez zmian', async () => {
    const broken = [withoutFocalLength(MOJ_ID), demo(REDCAT_ID), demo(NEWTON_ID), demo(ESPRIT_ID)]
    await app.putSaved(broken)
    await app.load()
    expect(app.profiles()).toEqual([demo(REDCAT_ID), demo(NEWTON_ID), demo(ESPRIT_ID)])
    expect(app.active().id).toBe(REDCAT_ID)
    await app.load()
    expect(await app.saved()).toEqual(broken)
  })

  it('P13: wpis to liczba albo obiekt → 4 profile z 6.4', async () => {
    await app.putSaved(42)
    await app.load()
    expect(app.profiles()).toEqual(DEMO_PROFILES)

    const second = await firstRun()
    await second.putSaved({ profiles: DEMO_PROFILES })
    await second.load()
    expect(second.profiles()).toEqual(DEMO_PROFILES)
  })

  it('P13: wpis to pusta lista albo lista bez profili → 4 profile z 6.4', async () => {
    await app.putSaved([])
    await app.load()
    expect(app.profiles()).toEqual(DEMO_PROFILES)

    const second = await firstRun()
    await second.putSaved(['tekst', 7, null])
    await second.load()
    expect(second.profiles()).toEqual(DEMO_PROFILES)
  })
})
