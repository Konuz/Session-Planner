import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { CameraSpec, DsoObject, TelescopeSpec } from '../types'
import { openPlannerDb } from './db'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from './equipmentCatalog'
import { cameraRepository, telescopeRepository, userCatalogRepository } from './repositories'

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
