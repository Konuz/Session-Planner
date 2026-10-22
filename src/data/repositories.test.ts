import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import type { CameraSpec, DsoObject, ObserverLocation, Project, TelescopeSpec } from '../types'
import { openPlannerDb } from './db'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from './equipmentCatalog'
import { DEMO_LOCATION } from './demo'
import { cameraRepository, locationRepository, projectRepository, telescopeRepository, userCatalogRepository } from './repositories'

let databases = 0
const freshDb = () => openPlannerDb(`planner-test-${++databases}`)

const myNewton: TelescopeSpec = {
  id: 'moj-newton-150-600',
  brand: 'Własny',
  model: 'Newton 150/600',
  design: 'newtonian',
  apertureMm: 150,
  focalLengthMm: 600,
  origin: 'builtin',
}

describe('repozytorium sprzętu (6.5)', () => {
  it('wpis użytkownika ma origin „user” i jest widoczny razem z wbudowanymi', async () => {
    const db = freshDb()
    await telescopeRepository.save(db, myNewton)
    const telescopes = await telescopeRepository.list(db)
    expect(telescopes).toHaveLength(BUILTIN_TELESCOPES.length + 1)
    expect(telescopes.find((spec) => spec.id === myNewton.id)).toEqual({ ...myNewton, origin: 'user' })
  })

  it('wpisu wbudowanego nie można nadpisać; duplikat zapisuje się pod nowym id', async () => {
    const db = freshDb()
    const builtin = BUILTIN_TELESCOPES[0]
    await expect(telescopeRepository.save(db, { ...builtin, focalLengthMm: 1 })).rejects.toThrow(builtin.id)
    await telescopeRepository.save(db, { ...builtin, id: `${builtin.id}-kopia` })
    expect((await telescopeRepository.list(db)).filter((spec) => spec.origin === 'user')).toHaveLength(1)
  })

  it('własny wpis można edytować i usunąć', async () => {
    const db = freshDb()
    await telescopeRepository.save(db, myNewton)
    await telescopeRepository.save(db, { ...myNewton, focalLengthMm: 610 })
    expect((await telescopeRepository.list(db)).find((spec) => spec.id === myNewton.id)?.focalLengthMm).toBe(610)
    await telescopeRepository.remove(db, myNewton.id)
    expect(await telescopeRepository.list(db)).toHaveLength(BUILTIN_TELESCOPES.length)
  })

  it('kamery: zapis własnej i lista razem z wbudowanymi', async () => {
    const db = freshDb()
    const camera: CameraSpec = { ...BUILTIN_CAMERAS[0], id: 'moja-kamera', model: 'Własna', origin: 'builtin' }
    await cameraRepository.save(db, camera)
    expect(await cameraRepository.list(db)).toHaveLength(BUILTIN_CAMERAS.length + 1)
  })
})

const imported: DsoObject = {
  uid: 'LDN1235',
  primary: { catalog: 'LDN', id: '1235' },
  designations: [{ catalog: 'LDN', id: '1235' }],
  commonNames: [],
  type: 'dark_nebula',
  raDeg: 333.7288,
  decDeg: 73.4159,
  sizeMajorArcmin: 13,
  sizeMinorArcmin: null,
  positionAngleDeg: null,
  magV: null,
  surfaceBrightness: null,
  ldnOpacity: 6,
  sh2Brightness: null,
  lbnBrightness: null,
  vdbStarMagV: null,
  constellation: 'Cep',
  sources: ['VizieR VII/7A'],
}

describe('warstwa katalogu użytkownika (6.3)', () => {
  it('zapisuje obiekty z importu; ten sam uid nadpisuje poprzedni wpis', async () => {
    const db = freshDb()
    await userCatalogRepository.save(db, [imported])
    await userCatalogRepository.save(db, [{ ...imported, ldnOpacity: 5 }])
    expect(await userCatalogRepository.list(db)).toEqual([{ ...imported, ldnOpacity: 5 }])
  })

  it('czyszczenie usuwa całą warstwę', async () => {
    const db = freshDb()
    await userCatalogRepository.save(db, [imported])
    await userCatalogRepository.clear(db)
    expect(await userCatalogRepository.list(db)).toEqual([])
  })
})

const otherSite: ObserverLocation = { ...DEMO_LOCATION, id: 'inne-miejsce', name: 'Inne miejsce', horizon: [] }

describe('repozytorium lokalizacji', () => {
  it('pierwsze uruchomienie zapisuje lokalizacje startowe', async () => {
    const db = freshDb()
    expect(await locationRepository.seed(db, [DEMO_LOCATION, otherSite])).toHaveLength(2)
    expect(await locationRepository.list(db)).toEqual(expect.arrayContaining([DEMO_LOCATION, otherSite]))
  })

  it('dane startowe nie nadpisują zmian użytkownika ani nie dublują się przy podwójnym wywołaniu', async () => {
    const db = freshDb()
    await Promise.all([locationRepository.seed(db, [DEMO_LOCATION]), locationRepository.seed(db, [DEMO_LOCATION])])
    await locationRepository.save(db, { ...DEMO_LOCATION, name: 'Ogród' })
    expect(await locationRepository.seed(db, [DEMO_LOCATION])).toEqual([{ ...DEMO_LOCATION, name: 'Ogród' }])
  })

  it('lista posortowana po nazwie (pl-PL), niezależnie od id', async () => {
    const db = freshDb()
    await locationRepository.save(db, { ...otherSite, id: 'a', name: 'Żywiec' })
    await locationRepository.save(db, { ...otherSite, id: 'b', name: 'Chrząstawa Wielka' })
    await locationRepository.save(db, { ...otherSite, id: 'c', name: 'Łódź' })
    expect((await locationRepository.list(db)).map((location) => location.name)).toEqual(['Chrząstawa Wielka', 'Łódź', 'Żywiec'])
  })

  it('zapis, edycja i usunięcie lokalizacji razem z horyzontem', async () => {
    const db = freshDb()
    await locationRepository.save(db, otherSite)
    await locationRepository.save(db, { ...otherSite, horizon: DEMO_LOCATION.horizon })
    expect(await locationRepository.list(db)).toEqual([{ ...otherSite, horizon: DEMO_LOCATION.horizon }])
    await locationRepository.remove(db, otherSite.id)
    expect(await locationRepository.list(db)).toEqual([])
  })
})

describe('projekty (7E) i wersja 4 bazy', () => {
  const project = (id: string, createdAtIso: string, name = 'M 31'): Project => ({
    id,
    name,
    objectUid: 'NGC224',
    equipmentId: 'demo-moj-zestaw',
    framing: { centerRaDeg: 10.6846, centerDecDeg: 41.2692, paDeg: 30, mosaic: { cols: 1, rows: 1, overlapPct: 20 } },
    log: [{ nightDate: '2026-10-16', filter: 'Ha', subs: 30, exposureS: 300 }],
    goalMinutes: { Ha: 600 },
    notes: '',
    createdAtIso,
  })

  it('zapis, edycja i usunięcie; lista od najnowszego', async () => {
    const db = freshDb()
    await projectRepository.save(db, project('a', '2026-10-01T20:00:00.000Z'))
    await projectRepository.save(db, project('b', '2026-10-20T20:00:00.000Z', 'NGC 7000'))
    expect((await projectRepository.list(db)).map((entry) => entry.id)).toEqual(['b', 'a'])
    await projectRepository.save(db, { ...project('a', '2026-10-01T20:00:00.000Z'), notes: 'Ha 3 nm' })
    expect((await projectRepository.list(db)).find((entry) => entry.id === 'a')?.notes).toBe('Ha 3 nm')
    await projectRepository.remove(db, 'b')
    expect((await projectRepository.list(db)).map((entry) => entry.id)).toEqual(['a'])
  })

  it('dwie zmiany wysłane jedna po drugiej bez czekania obie zostają (zmiana liczona na wersji z bazy)', async () => {
    const db = freshDb()
    await projectRepository.save(db, project('a', '2026-10-01T20:00:00.000Z'))
    await Promise.all([
      projectRepository.update(db, 'a', (current) => ({ ...current, goalMinutes: { ...current.goalMinutes, OIII: 120 } })),
      projectRepository.update(db, 'a', (current) => ({ ...current, log: [...current.log, { nightDate: '2026-10-17', filter: 'OIII', subs: 10, exposureS: 300 }] })),
    ])
    const [saved] = await projectRepository.list(db)
    expect(saved.goalMinutes).toEqual({ Ha: 600, OIII: 120 })
    expect(saved.log.map((entry) => entry.filter)).toEqual(['Ha', 'OIII'])
  })

  it('zmiana usuniętego projektu go nie przywraca', async () => {
    const db = freshDb()
    await projectRepository.update(db, 'nie-ma', (current) => ({ ...current, notes: 'x' }))
    expect(await projectRepository.list(db)).toEqual([])
  })

  it('uszkodzone wpisy są pomijane przy wczytaniu', async () => {
    const db = freshDb()
    await projectRepository.save(db, project('a', '2026-10-01T20:00:00.000Z'))
    await db.projects.put({ ...project('zly', '2026-10-02T20:00:00.000Z'), framing: null } as unknown as Project)
    expect((await projectRepository.list(db)).map((entry) => entry.id)).toEqual(['a'])
  })

  it('baza w wersji 3 przechodzi na wersję 4 bez utraty danych; tabela projektów jest pusta', async () => {
    const name = `planner-test-v3-${++databases}`
    const old = new Dexie(name)
    old.version(1).stores({ userObjects: 'uid', userTelescopes: 'id', userCameras: 'id' })
    old.version(2).stores({ locations: 'id' })
    old.version(3).stores({ settings: 'id' })
    await old.table('locations').put(DEMO_LOCATION)
    await old.table('settings').put({ id: 'planning', value: { minAltitudeDeg: 25 } })
    await old.table('userTelescopes').put({ ...myNewton, origin: 'user' })
    old.close()

    const db = openPlannerDb(name)
    expect(await locationRepository.list(db)).toEqual([DEMO_LOCATION])
    expect(await db.settings.get('planning')).toEqual({ id: 'planning', value: { minAltitudeDeg: 25 } })
    expect(await db.userTelescopes.toArray()).toEqual([{ ...myNewton, origin: 'user' }])
    expect(db.verno).toBe(4)
    expect(await projectRepository.list(db)).toEqual([])
    await projectRepository.save(db, project('a', '2026-10-01T20:00:00.000Z'))
    expect(await projectRepository.list(db)).toHaveLength(1)
  })
})
