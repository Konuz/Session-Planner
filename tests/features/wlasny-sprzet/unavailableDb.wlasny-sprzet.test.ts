// P14: baza przeglądarki niedostępna. Ten plik celowo nie ładuje fake-indexeddb, więc IndexedDB nie istnieje
// (jak w przeglądarce bez dostępu do bazy), a każda operacja na bazie kończy się błędem Dexie.
// Listy wpisów da się odczytać tylko z bazy, więc „listy bez zmian” sprawdzamy jako: akcja kończy się błędem,
// a lista wpisów wbudowanych i przekazany formularz albo wpis nie zmieniają się.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from '../../../src/data/equipmentCatalog'
import type { PlannerDb } from '../../../src/data/db'
import {
  duplicateCamera,
  duplicateTelescope,
  editUserCamera,
  editUserTelescope,
  removeUserCamera,
  removeUserTelescope,
  saveAsMyCamera,
  saveAsMyTelescope,
} from '../../../src/features/equipment/userEquipment'
import type { CameraSpec, TelescopeSpec } from '../../../src/types'
import { ASI6200MM, ESPRIT_100, camera294Form, freshDb, newtonForm } from './helpers'

let db: PlannerDb
const builtinTelescopes = structuredClone(BUILTIN_TELESCOPES)
const builtinCameras = structuredClone(BUILTIN_CAMERAS)

beforeEach(() => {
  expect(globalThis.indexedDB, 'w tym pliku IndexedDB ma nie istnieć').toBeUndefined()
  db = freshDb().db
})

afterEach(() => {
  expect(BUILTIN_TELESCOPES).toEqual(builtinTelescopes)
  expect(BUILTIN_CAMERAS).toEqual(builtinCameras)
})

const userTelescope: TelescopeSpec = {
  id: 'wlasny-newton',
  brand: '',
  model: 'Mój Newton 80/480',
  design: 'other',
  apertureMm: 80,
  focalLengthMm: 480,
  origin: 'user',
}

const userCamera: CameraSpec = {
  id: 'wlasna-294',
  brand: '',
  model: 'Moja 294',
  sensorModel: null,
  sensor: 'osc',
  resolutionXPx: 4144,
  resolutionYPx: 2822,
  pixelSizeUm: 4.63,
  origin: 'user',
}

describe('P14 baza przeglądarki niedostępna', () => {
  it('P14: „Zapisz jako mój teleskop” kończy się błędem, formularz bez zmian', async () => {
    const form = newtonForm()
    const before = structuredClone(form)
    await expect(saveAsMyTelescope(db, form)).rejects.toThrow()
    expect(form).toEqual(before)
  })

  it('P14: „Zapisz jako moją kamerę” kończy się błędem, formularz bez zmian', async () => {
    const form = camera294Form()
    const before = structuredClone(form)
    await expect(saveAsMyCamera(db, form)).rejects.toThrow()
    expect(form).toEqual(before)
  })

  it('P14: edycja własnego teleskopu i kamery kończy się błędem, przekazany wpis bez zmian', async () => {
    const telescope = { ...userTelescope, focalLengthMm: 500 }
    const camera = { ...userCamera, pixelSizeUm: 3.76 }
    const beforeTelescope = structuredClone(telescope)
    const beforeCamera = structuredClone(camera)
    await expect(editUserTelescope(db, telescope)).rejects.toThrow()
    await expect(editUserCamera(db, camera)).rejects.toThrow()
    expect(telescope).toEqual(beforeTelescope)
    expect(camera).toEqual(beforeCamera)
  })

  it('P14: duplikowanie wpisów wbudowanych kończy się błędem', async () => {
    await expect(duplicateTelescope(db, ESPRIT_100)).rejects.toThrow()
    await expect(duplicateCamera(db, ASI6200MM)).rejects.toThrow()
  })

  it('P14: usunięcie własnego teleskopu i kamery kończy się błędem', async () => {
    await expect(removeUserTelescope(db, userTelescope.id)).rejects.toThrow()
    await expect(removeUserCamera(db, userCamera.id)).rejects.toThrow()
  })
})
