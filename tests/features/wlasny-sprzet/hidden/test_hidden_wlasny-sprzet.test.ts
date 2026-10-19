// Ukryte przypadki „wlasny-sprzet”: te same reguły co w testach widocznych, inne wartości.
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from '../../../../src/data/equipmentCatalog'
import type { PlannerDb } from '../../../../src/data/db'
import { cameraRepository, profileRepository, telescopeRepository } from '../../../../src/data/repositories'
import {
  changedFields,
  formSources,
  profileToForm,
  readProfileForm,
  searchCameras,
} from '../../../../src/features/equipment/profileForm'
import {
  duplicateCamera,
  duplicateTelescope,
  editUserCamera,
  editUserTelescope,
  equipmentLabel,
  listUserCameras,
  listUserTelescopes,
  removeUserCamera,
  removeUserTelescope,
  saveAsMyCamera,
  saveAsMyTelescope,
} from '../../../../src/features/equipment/userEquipment'
import {
  BUILTIN_CAMERA_IDS,
  BUILTIN_TELESCOPE_IDS,
  READ_ONLY,
  builtinCamera,
  builtinTelescope,
  camera294Form,
  freshDb,
  moj,
  newtonForm,
  reopenDb,
} from '../helpers'

let db: PlannerDb
let dbName: string

const open = () => {
  const fresh = freshDb()
  db = fresh.db
  dbName = fresh.name
}

afterEach(() => {
  db.close()
})

const labels = (specs: { brand: string; model: string }[]) => specs.map((spec) => equipmentLabel(spec))

describe('zapis teleskopu: inne wartości', () => {
  it('„Refraktor 72/432” przy mnożniku 1,0 → 72/432, wpis widoczny po ponownym otwarciu', async () => {
    open()
    const input = newtonForm({ telescopeLabel: 'Refraktor 72/432', apertureMm: '72', focalLengthMm: '432', reducerFactor: '1' })
    const { spec, form } = await saveAsMyTelescope(db, input)
    expect(spec).toEqual({
      id: spec.id,
      brand: '',
      model: 'Refraktor 72/432',
      design: 'other',
      apertureMm: 72,
      focalLengthMm: 432,
      origin: 'user',
    })
    expect(BUILTIN_TELESCOPE_IDS).not.toContain(spec.id)
    expect(form).toEqual({ ...input, telescopeSpecId: spec.id, telescopeLabel: 'Refraktor 72/432' })
    db = reopenDb(db, dbName)
    expect(await listUserTelescopes(db)).toEqual([spec])
  })

  it('mnożnik 1,5 nie zmienia ogniskowej wpisu (natywna 1000, nie 1500), liczby z przecinkiem', async () => {
    open()
    const { spec } = await saveAsMyTelescope(
      db,
      newtonForm({ telescopeLabel: 'SCT 8', apertureMm: '203,2', focalLengthMm: '2032', reducerFactor: '1,5' }),
    )
    expect(spec).toMatchObject({ apertureMm: 203.2, focalLengthMm: 2032 })
  })

  it('apertura 1600 → komunikat zakresu, nic nie zapisane; ogniskowa „abc” → „Ogniskowa: wpisz liczbę”', async () => {
    open()
    await expect(saveAsMyTelescope(db, newtonForm({ apertureMm: '1600' }))).rejects.toThrow('Apertura: dozwolony zakres 5–1500 mm')
    await expect(saveAsMyTelescope(db, newtonForm({ focalLengthMm: 'abc' }))).rejects.toThrow('Ogniskowa: wpisz liczbę')
    expect(await db.userTelescopes.count()).toBe(0)
  })

  it('apertura 20 i ogniskowa 800 (f/40, tylko ostrzeżenie) → wpis zapisany', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm({ apertureMm: '20', focalLengthMm: '800' }))
    expect(await db.userTelescopes.toArray()).toEqual([spec])
  })

  it('zapis teleskopu przy rozdzielczości kamery „x” i pustej nazwie kamery', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm({ resolutionXPx: 'x', cameraLabel: '' }))
    expect(spec).toMatchObject({ apertureMm: 80, focalLengthMm: 480 })
  })

  it('nazwa „  Żuraw 70  ” zapisuje się jako „Żuraw 70”', async () => {
    open()
    const { spec, form } = await saveAsMyTelescope(db, newtonForm({ telescopeLabel: '  Żuraw 70  ' }))
    expect(equipmentLabel(spec)).toBe('Żuraw 70')
    expect(form.telescopeLabel).toBe('Żuraw 70')
  })

  it('formularz wskazujący wpis wbudowany: „Zapisz jako mój teleskop” tworzy nowy wpis, wbudowany bez zmian', async () => {
    open()
    const esprit = structuredClone(builtinTelescope('skywatcher-esprit-80ed'))
    const input = moj({ telescopeSpecId: esprit.id, telescopeLabel: 'Mój Esprit', apertureMm: '80', focalLengthMm: '400' })
    const { spec, form } = await saveAsMyTelescope(db, input)
    expect(spec.id).not.toBe(esprit.id)
    expect(form.telescopeSpecId).toBe(spec.id)
    expect(builtinTelescope('skywatcher-esprit-80ed')).toEqual(esprit)
    expect(await db.userTelescopes.toArray()).toEqual([spec])
  })
})

describe('zapis kamery: inne wartości', () => {
  it('„Moja 1600” mono 4656 × 3520, piksel „3,8”, binning 3 → wpis bez binningu, po ponownym otwarciu', async () => {
    open()
    const input = camera294Form({
      cameraLabel: 'Moja 1600',
      sensor: 'mono',
      resolutionXPx: '4656',
      resolutionYPx: '3520',
      pixelSizeUm: '3,8',
      binning: 3,
    })
    const { spec, form } = await saveAsMyCamera(db, input)
    expect(spec).toEqual({
      id: spec.id,
      brand: '',
      model: 'Moja 1600',
      sensorModel: null,
      sensor: 'mono',
      resolutionXPx: 4656,
      resolutionYPx: 3520,
      pixelSizeUm: 3.8,
      origin: 'user',
    })
    expect(BUILTIN_CAMERA_IDS).not.toContain(spec.id)
    expect(form).toEqual({ ...input, cameraSpecId: spec.id, cameraLabel: 'Moja 1600' })
    db = reopenDb(db, dbName)
    expect(await db.userCameras.toArray()).toEqual([spec])
  })

  it('piksel 0,5 → „Rozmiar piksela: dozwolony zakres 1–30 µm”, nic nie zapisane', async () => {
    open()
    await expect(saveAsMyCamera(db, camera294Form({ pixelSizeUm: '0,5' }))).rejects.toThrow('Rozmiar piksela: dozwolony zakres 1–30 µm')
    expect(await db.userCameras.count()).toBe(0)
  })

  it('zapis kamery przy ogniskowej „abc” i mnożniku 9', async () => {
    open()
    const { spec } = await saveAsMyCamera(db, camera294Form({ focalLengthMm: 'abc', reducerFactor: '9' }))
    expect(spec.resolutionXPx).toBe(4144)
  })

  it('nazwa „ Moja 294 ” zapisuje się jako „Moja 294”; pusta → „Nazwa kamery: wpisz nazwę”', async () => {
    open()
    const { spec } = await saveAsMyCamera(db, camera294Form({ cameraLabel: ' Moja 294 ' }))
    expect(spec.model).toBe('Moja 294')
    await expect(saveAsMyCamera(db, camera294Form({ cameraLabel: '\t ' }))).rejects.toThrow('Nazwa kamery: wpisz nazwę')
    expect(await db.userCameras.count()).toBe(1)
  })

  it('ponowny zapis kamery z formularza wskazującego własną kamerę tworzy drugi wpis, pierwszy bez zmian', async () => {
    open()
    const first = await saveAsMyCamera(db, camera294Form())
    const snapshot = structuredClone(first.spec)
    const second = await saveAsMyCamera(db, { ...first.form, cameraLabel: 'Moja 294 v2', pixelSizeUm: '5' })
    expect(second.spec.id).not.toBe(first.spec.id)
    expect(await db.userCameras.get(first.spec.id)).toEqual(snapshot)
    expect(await db.userCameras.count()).toBe(2)
  })

  it('wyszukiwarka kamer pokazuje własną „Moja 294” z etykietą bez spacji na początku', async () => {
    open()
    const { spec } = await saveAsMyCamera(db, camera294Form())
    const options = searchCameras('moja', [...BUILTIN_CAMERAS, ...(await listUserCameras(db))])
    expect(options.map((option) => option.label)).toEqual(['Własna', 'Moja 294'])
    expect(options[1].spec).toEqual(spec)
  })
})

describe('edycja i usunięcie: inne wartości', () => {
  it('edycja kamery: piksel 4,63 → 4,5 i nowa nazwa, to samo id; profil z kamery ma „zmienione” przy pikselu', async () => {
    open()
    const { spec, form } = await saveAsMyCamera(db, camera294Form())
    const result = readProfileForm({ ...form, name: 'Kadr 294' })
    if (result.profile === null) throw new Error('profil z błędami')
    const profile = result.profile
    await profileRepository.save(db, [profile])
    const saved = structuredClone(await db.settings.get('profiles'))
    await editUserCamera(db, { ...spec, model: 'Moja 294 Pro', pixelSizeUm: 4.5 })
    expect(await db.userCameras.toArray()).toEqual([{ ...spec, model: 'Moja 294 Pro', pixelSizeUm: 4.5, origin: 'user' }])
    expect(profile.camera).toMatchObject({ specId: spec.id, label: 'Moja 294', pixelSizeUm: 4.63 })
    expect(await db.settings.get('profiles')).toEqual(saved)
    const cameras = [...BUILTIN_CAMERAS, ...(await listUserCameras(db))]
    expect(changedFields(profileToForm(profile), BUILTIN_TELESCOPES, cameras)).toEqual(['pixelSizeUm'])
  })

  it('edycja kamery z pikselem 40 albo nazwą ze spacji odrzucona, wpis bez zmian', async () => {
    open()
    const { spec } = await saveAsMyCamera(db, camera294Form())
    await expect(editUserCamera(db, { ...spec, pixelSizeUm: 40 })).rejects.toThrow('Rozmiar piksela: dozwolony zakres 1–30 µm')
    await expect(editUserCamera(db, { ...spec, model: '  ' })).rejects.toThrow('Nazwa kamery: wpisz nazwę')
    expect(await db.userCameras.toArray()).toEqual([spec])
  })

  it('edycja teleskopu z aperturą 2000 odrzucona, wpis bez zmian', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm())
    await expect(editUserTelescope(db, { ...spec, apertureMm: 2000 })).rejects.toThrow('Apertura: dozwolony zakres 5–1500 mm')
    expect(await db.userTelescopes.toArray()).toEqual([spec])
  })

  it('usunięcie kamery z profilu: profil zachowuje wartości, kamera „Własna”, bez „zmienione”', async () => {
    open()
    const { spec, form } = await saveAsMyCamera(db, camera294Form())
    const result = readProfileForm(form)
    if (result.profile === null) throw new Error('profil z błędami')
    const profile = structuredClone(result.profile)
    await removeUserCamera(db, spec.id)
    const cameras = [...BUILTIN_CAMERAS, ...(await listUserCameras(db))]
    const profileForm = profileToForm(profile)
    expect(profile.camera.specId).toBe(spec.id)
    expect(formSources(profileForm, BUILTIN_TELESCOPES, cameras).camera).toBeNull()
    expect(changedFields(profileForm, BUILTIN_TELESCOPES, cameras)).toEqual([])
  })

  it('usunięcie jednego z dwóch własnych teleskopów zostawia drugi', async () => {
    open()
    const kept = await saveAsMyTelescope(db, newtonForm({ telescopeLabel: 'Zostaje' }))
    const removed = await saveAsMyTelescope(db, newtonForm())
    await removeUserTelescope(db, removed.spec.id)
    expect(await db.userTelescopes.toArray()).toEqual([kept.spec])
  })
})

describe('duplikowanie: inne wpisy', () => {
  it('„Askar FRA400” → „Askar FRA400 (kopia)” 72/400, refraktor; trzecia kopia → „(kopia 3)”', async () => {
    open()
    const before = structuredClone(builtinTelescope('askar-fra400'))
    const first = await duplicateTelescope(db, 'askar-fra400')
    expect(equipmentLabel(first)).toBe('Askar FRA400 (kopia)')
    expect(first).toMatchObject({ apertureMm: 72, focalLengthMm: 400, design: 'refractor', origin: 'user' })
    const second = await duplicateTelescope(db, 'askar-fra400')
    const third = await duplicateTelescope(db, 'askar-fra400')
    expect(equipmentLabel(second)).toBe('Askar FRA400 (kopia 2)')
    expect(equipmentLabel(third)).toBe('Askar FRA400 (kopia 3)')
    expect(new Set([first.id, second.id, third.id]).size).toBe(3)
    expect(await db.userTelescopes.count()).toBe(3)
    expect(builtinTelescope('askar-fra400')).toEqual(before)
  })

  it('kopie różnych wpisów numerowane osobno: Esprit 80ED po kopii Esprit 100ED dostaje „(kopia)”', async () => {
    open()
    await duplicateTelescope(db, 'skywatcher-esprit-100ed')
    const other = await duplicateTelescope(db, 'skywatcher-esprit-80ed')
    expect(equipmentLabel(other)).toBe('Sky-Watcher Esprit 80ED (kopia)')
  })

  it('kamera „ZWO ASI2400MC Pro” → kopia z IMX410, OSC; druga → „(kopia 2)”', async () => {
    open()
    const before = structuredClone(builtinCamera('zwo-asi2400mc-pro'))
    const copy = await duplicateCamera(db, 'zwo-asi2400mc-pro')
    expect(equipmentLabel(copy)).toBe('ZWO ASI2400MC Pro (kopia)')
    expect(copy).toMatchObject({
      sensorModel: 'IMX410',
      sensor: 'osc',
      resolutionXPx: 6072,
      resolutionYPx: 4042,
      pixelSizeUm: 5.94,
      origin: 'user',
    })
    const second = await duplicateCamera(db, 'zwo-asi2400mc-pro')
    expect(equipmentLabel(second)).toBe('ZWO ASI2400MC Pro (kopia 2)')
    expect(builtinCamera('zwo-asi2400mc-pro')).toEqual(before)
  })
})

describe('wpisy wbudowane tylko do odczytu: inne wpisy', () => {
  it('edycja „askar-fra400” z origin user i usunięcie są odrzucone, listy bez zmian', async () => {
    open()
    await duplicateTelescope(db, 'askar-fra400')
    const before = await telescopeRepository.list(db)
    await expect(editUserTelescope(db, { ...builtinTelescope('askar-fra400'), origin: 'user', model: 'FRA400 mój' })).rejects.toThrow(
      READ_ONLY,
    )
    await expect(removeUserTelescope(db, 'askar-fra400')).rejects.toThrow(READ_ONLY)
    expect(await telescopeRepository.list(db)).toEqual(before)
  })

  it('edycja „zwo-asi2400mc-pro” z origin user i usunięcie są odrzucone, listy bez zmian', async () => {
    open()
    await saveAsMyCamera(db, camera294Form())
    const before = await cameraRepository.list(db)
    await expect(editUserCamera(db, { ...builtinCamera('zwo-asi2400mc-pro'), origin: 'user' })).rejects.toThrow(READ_ONLY)
    await expect(removeUserCamera(db, 'zwo-asi2400mc-pro')).rejects.toThrow(READ_ONLY)
    expect(await cameraRepository.list(db)).toEqual(before)
  })
})

describe('lista po polsku: inne nazwy', () => {
  it('teleskopy „Źrebię”, „Lis”, „Żuraw”, „Łoś”, „Zebra” → Lis, Łoś, Zebra, Źrebię, Żuraw', async () => {
    open()
    for (const name of ['Źrebię', 'Lis', 'Żuraw', 'Łoś', 'Zebra']) {
      await saveAsMyTelescope(db, newtonForm({ telescopeLabel: name }))
    }
    expect(labels(await listUserTelescopes(db))).toEqual(['Lis', 'Łoś', 'Zebra', 'Źrebię', 'Żuraw'])
  })

  it('kamery „Śnieg 1”, „Sowa 2”, „Ćwierć 3”, „Cyklop 4” → Cyklop, Ćwierć, Sowa, Śnieg', async () => {
    open()
    for (const name of ['Śnieg 1', 'Sowa 2', 'Ćwierć 3', 'Cyklop 4']) {
      await saveAsMyCamera(db, camera294Form({ cameraLabel: name }))
    }
    expect(labels(await listUserCameras(db))).toEqual(['Cyklop 4', 'Ćwierć 3', 'Sowa 2', 'Śnieg 1'])
  })

  it('dwie kamery o tej samej nazwie są obie na liście', async () => {
    open()
    await saveAsMyCamera(db, camera294Form())
    await saveAsMyCamera(db, camera294Form({ pixelSizeUm: '5' }))
    expect(await listUserCameras(db)).toHaveLength(2)
  })
})
