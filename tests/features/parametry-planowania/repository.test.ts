// Parametry planowania w IndexedDB: wersja 3 bazy, tabela `settings`, jeden wpis `planning` (P1, P3, P10, P11).
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { openPlannerDb, type PlannerDb } from '../../../src/data/db'
import { DEMO_LOCATION } from '../../../src/data/demo'
import { locationRepository, planningSettingsRepository } from '../../../src/data/repositories'
import type { PlanningSettings } from '../../../src/types'
import { corruptSaved, defaultMoonRules, defaults, settingsWith, settingsWithRule } from './helpers'

let databases = 0
const nextName = () => `planning-settings-test-${++databases}`
const freshDb = () => openPlannerDb(nextName())

const settingsTable = (db: PlannerDb) => db.table<Record<string, unknown>, string>('settings')

const CUSTOM: PlanningSettings = {
  darknessThresholdDeg: -15,
  autoLowerThreshold: false,
  minAltitudeDeg: 40,
  minEffectiveHours: 4.5,
  catalogStepMin: 10,
  detailStepMin: 2,
  seeingArcsec: 3.1,
  fitRange: [0.3, 0.7],
  moonRules: {
    moonDownMinFraction: 0.9,
    broadband: { greenMaxIllum: 0.1, yellowMaxIllum: 0.4, yellowMinSepDeg: 100 },
    broadbandFaintNebula: { greenMaxIllum: 0.05 },
    hydrogenSulfur: { greenMinSepDeg: 60, yellowMinSepDeg: 30 },
    oxygen: { greenMinSepDeg: 80, greenMaxIllum: 0.6, yellowMinSepDeg: 45 },
  },
}

describe('pierwsze uruchomienie', () => {
  it('P1: nic nie zapisano → wczytane parametry są domyślne', async () => {
    expect(await planningSettingsRepository.load(freshDb())).toEqual(defaults())
  })

  it('P2: nic nie zapisano → wczytane progi Księżyca są domyślne', async () => {
    expect((await planningSettingsRepository.load(freshDb())).moonRules).toEqual(defaultMoonRules())
  })
})

describe('zapis i ponowne otwarcie bazy', () => {
  it('P3: h_min 25° i minimum 2,5 h po ponownym otwarciu, pozostałe parametry bez zmian', async () => {
    const name = nextName()
    const first = openPlannerDb(name)
    await planningSettingsRepository.save(first, settingsWith({ minAltitudeDeg: 25, minEffectiveHours: 2.5 }))
    first.close()
    const reopened = openPlannerDb(name)
    expect(await planningSettingsRepository.load(reopened)).toEqual(settingsWith({ minAltitudeDeg: 25, minEffectiveHours: 2.5 }))
  })

  it('P3: zapisują się wszystkie pola, także progi Księżyca; kolejny zapis zastępuje poprzedni', async () => {
    const name = nextName()
    const first = openPlannerDb(name)
    await planningSettingsRepository.save(first, settingsWith({ minAltitudeDeg: 25 }))
    await planningSettingsRepository.save(first, CUSTOM)
    first.close()
    const reopened = openPlannerDb(name)
    expect(await planningSettingsRepository.load(reopened)).toEqual(CUSTOM)
  })

  it('parametry są jednym wpisem `planning` w tabeli `settings`', async () => {
    const db = freshDb()
    await planningSettingsRepository.save(db, settingsWith({ minAltitudeDeg: 25 }))
    await planningSettingsRepository.save(db, CUSTOM)
    expect(await settingsTable(db).toCollection().primaryKeys()).toEqual(['planning'])
  })

  it('baza w wersji 2 (sprzed parametrów) przechodzi na wersję 3 bez utraty lokalizacji', async () => {
    const name = nextName()
    const old = new Dexie(name)
    old.version(1).stores({ userObjects: 'uid', userTelescopes: 'id', userCameras: 'id' })
    old.version(2).stores({ locations: 'id' })
    await old.table('locations').put(DEMO_LOCATION)
    old.close()

    const db = openPlannerDb(name)
    expect(await locationRepository.list(db)).toEqual([DEMO_LOCATION])
    expect(db.verno).toBe(3)
    expect(await planningSettingsRepository.load(db)).toEqual(defaults())
    await planningSettingsRepository.save(db, settingsWith({ minAltitudeDeg: 25 }))
    expect((await planningSettingsRepository.load(db)).minAltitudeDeg).toBe(25)
  })
})

describe('zapis parametrów z błędem', () => {
  it('P10: zapis h_min 95° jest odrzucany, w bazie zostają poprzednio zapisane wartości', async () => {
    const db = freshDb()
    await planningSettingsRepository.save(db, settingsWith({ minAltitudeDeg: 25, minEffectiveHours: 2.5 }))
    await expect(planningSettingsRepository.save(db, settingsWith({ minAltitudeDeg: 95, minEffectiveHours: 4 }))).rejects.toThrow()
    expect(await planningSettingsRepository.load(db)).toEqual(settingsWith({ minAltitudeDeg: 25, minEffectiveHours: 2.5 }))
  })

  it('P10: odrzucony zapis błędnego progu Księżyca (separacja 200°) nie zmienia zapisanych progów', async () => {
    const db = freshDb()
    await planningSettingsRepository.save(db, CUSTOM)
    await expect(planningSettingsRepository.save(db, settingsWithRule('oxygen', 'greenMinSepDeg', 200))).rejects.toThrow()
    expect(await planningSettingsRepository.load(db)).toEqual(CUSTOM)
  })

  it('P10: błędny pierwszy zapis (krok katalogu 2,5 min) zostawia wartości domyślne', async () => {
    const db = freshDb()
    await expect(planningSettingsRepository.save(db, settingsWith({ catalogStepMin: 2.5 }))).rejects.toThrow()
    expect(await planningSettingsRepository.load(db)).toEqual(defaults())
  })
})

describe('uszkodzony wpis', () => {
  it('P11: h_min zapisane jako tekst → wszystkie wartości domyślne (bez ratowania poprawnych pól)', async () => {
    const db = freshDb()
    await corruptSaved(db, settingsWith({ minAltitudeDeg: 25, minEffectiveHours: 2.5 }), 'minAltitudeDeg', '25')
    expect(await planningSettingsRepository.load(db)).toEqual(defaults())
  })

  it('P11: wpis bez pól → wartości domyślne', async () => {
    const db = freshDb()
    await settingsTable(db).put({ id: 'planning' })
    expect(await planningSettingsRepository.load(db)).toEqual(defaults())
  })

  it('P11: uszkodzony próg Księżyca albo zakres kadru → wartości domyślne', async () => {
    const moon = freshDb()
    await corruptSaved(moon, CUSTOM, 'yellowMinSepDeg', 'dużo')
    expect(await planningSettingsRepository.load(moon)).toEqual(defaults())

    const fit = freshDb()
    await corruptSaved(fit, CUSTOM, 'fitRange', 0.5)
    expect(await planningSettingsRepository.load(fit)).toEqual(defaults())
  })

  it('P11: po uszkodzonym wpisie można znowu zapisać poprawne parametry', async () => {
    const db = freshDb()
    await corruptSaved(db, CUSTOM, 'minAltitudeDeg', '25')
    await planningSettingsRepository.save(db, settingsWith({ minAltitudeDeg: 25 }))
    expect(await planningSettingsRepository.load(db)).toEqual(settingsWith({ minAltitudeDeg: 25 }))
  })
})
