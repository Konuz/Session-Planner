// Własne teleskopy i kamery w katalogu sprzętu (IndexedDB przez fake-indexeddb): „Zapisz jako mój teleskop / moją
// kamerę”, edycja, usunięcie, „Duplikuj jako własny”, lista własnych wpisów i ochrona wpisów wbudowanych.
// Nazwy funkcji (spec ich nie podaje) opisuje helpers.ts.
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from '../../../src/data/equipmentCatalog'
import type { PlannerDb } from '../../../src/data/db'
import { cameraRepository, profileRepository, telescopeRepository } from '../../../src/data/repositories'
import {
  changedFields,
  formSources,
  profileToForm,
  readProfileForm,
  searchTelescopes,
  selectTelescope,
} from '../../../src/features/equipment/profileForm'
import {
  duplicateCamera,
  duplicateTelescope,
  editUserCamera,
  editUserTelescope,
  equipmentLabel,
  isBuiltinCamera,
  isBuiltinTelescope,
  listUserCameras,
  listUserTelescopes,
  removeUserCamera,
  removeUserTelescope,
  saveAsMyCamera,
  saveAsMyTelescope,
} from '../../../src/features/equipment/userEquipment'
import type { EquipmentProfile, TelescopeSpec } from '../../../src/types'
import {
  ASI6200MM,
  BUILTIN_CAMERA_IDS,
  BUILTIN_TELESCOPE_IDS,
  ESPRIT_100,
  READ_ONLY,
  builtinCamera,
  builtinTelescope,
  camera294Form,
  freshDb,
  moj,
  newtonForm,
  reopenDb,
} from './helpers'

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

const allTelescopes = async () => [...BUILTIN_TELESCOPES, ...(await listUserTelescopes(db))]
const allCameras = async () => [...BUILTIN_CAMERAS, ...(await listUserCameras(db))]
const labels = (specs: { brand: string; model: string }[]) => specs.map((spec) => equipmentLabel(spec))

/** Profil zapisany z formularza (przycisk zapisu profilu z formularz-profilu). */
function profileFrom(form: ReturnType<typeof moj>): EquipmentProfile {
  const { profile, issues } = readProfileForm(form)
  if (profile === null) throw new Error(issues.map((issue) => issue.message).join('; '))
  return profile
}

describe('P1 zapis teleskopu z formularza', () => {
  it('P1: „Mój Newton 80/480” 80/480 przy mnożniku 0,8 → wpis user z natywną ogniskową 480 (nie 384)', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm())
    expect(spec).toMatchObject({ origin: 'user', apertureMm: 80, focalLengthMm: 480 })
    expect(equipmentLabel(spec)).toBe('Mój Newton 80/480')
    expect(BUILTIN_TELESCOPE_IDS).not.toContain(spec.id)
  })

  it('P1: wpis jest w tabeli userTelescopes i jest widoczny po ponownym otwarciu aplikacji', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm())
    expect(await db.userTelescopes.toArray()).toEqual([spec])
    db = reopenDb(db, dbName)
    expect(await listUserTelescopes(db)).toEqual([spec])
    expect(await db.userTelescopes.toArray()).toEqual([spec])
    expect((await telescopeRepository.list(db)).filter((entry) => entry.id === spec.id)).toEqual([spec])
  })

  it('P1: id kolejnych wpisów różnią się od siebie i od wszystkich wpisów wbudowanych', async () => {
    open()
    const first = await saveAsMyTelescope(db, newtonForm())
    const second = await saveAsMyTelescope(db, newtonForm())
    const copy = await duplicateTelescope(db, ESPRIT_100)
    const ids = [first.spec.id, second.spec.id, copy.id]
    expect(new Set(ids).size).toBe(3)
    for (const id of ids) expect(BUILTIN_TELESCOPE_IDS).not.toContain(id)
    expect((await listUserTelescopes(db)).map((spec) => spec.id).sort()).toEqual([...ids].sort())
  })

  it('Pytania: wpis z formularza ma pustą markę, model = nazwa i konstrukcję „inna” (other)', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm())
    expect(spec).toEqual<TelescopeSpec>({
      id: spec.id,
      brand: '',
      model: 'Mój Newton 80/480',
      design: 'other',
      apertureMm: 80,
      focalLengthMm: 480,
      origin: 'user',
    })
  })

  it('Pytania: „Zapisz jako…” nie zapisuje profilu (wpis profiles w tabeli settings się nie zmienia)', async () => {
    open()
    await saveAsMyTelescope(db, newtonForm())
    await saveAsMyCamera(db, camera294Form())
    expect(await db.settings.get('profiles')).toBeUndefined()

    const before = [profileFrom(moj())]
    await profileRepository.save(db, before)
    const saved = await db.settings.get('profiles')
    await saveAsMyTelescope(db, newtonForm({ telescopeLabel: 'Inny Newton' }))
    expect(await db.settings.get('profiles')).toEqual(saved)
  })
})

describe('P2 zapis kamery z formularza', () => {
  it('P2: „Moja 294” 4144 × 2822, piksel „4.63”, OSC, binning 2 → wpis 4,63 µm, OSC, bez binningu', async () => {
    open()
    const { spec } = await saveAsMyCamera(db, camera294Form())
    expect(spec).toMatchObject({ origin: 'user', resolutionXPx: 4144, resolutionYPx: 2822, pixelSizeUm: 4.63, sensor: 'osc' })
    expect(equipmentLabel(spec)).toBe('Moja 294')
    expect('binning' in spec).toBe(false)
    expect(BUILTIN_CAMERA_IDS).not.toContain(spec.id)
  })

  it('P2: wpis w tabeli userCameras bez binningu, z pustą marką, model = nazwa, model matrycy null', async () => {
    open()
    const { spec } = await saveAsMyCamera(db, camera294Form())
    const rows = await db.userCameras.toArray()
    expect(rows).toEqual([
      {
        id: spec.id,
        brand: '',
        model: 'Moja 294',
        sensorModel: null,
        sensor: 'osc',
        resolutionXPx: 4144,
        resolutionYPx: 2822,
        pixelSizeUm: 4.63,
        origin: 'user',
      },
    ])
    db = reopenDb(db, dbName)
    expect(await listUserCameras(db)).toEqual(rows)
  })
})

describe('P3 sprawdzane są tylko pola zapisywanego wpisu', () => {
  it('P3: zapis teleskopu udaje się przy pikselu kamery „abc”', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm({ pixelSizeUm: 'abc' }))
    expect(spec).toMatchObject({ apertureMm: 80, focalLengthMm: 480 })
    expect(await db.userTelescopes.count()).toBe(1)
  })

  it('P3: zapis kamery udaje się przy błędnej aperturze', async () => {
    open()
    const { spec } = await saveAsMyCamera(db, camera294Form({ apertureMm: '0' }))
    expect(spec.pixelSizeUm).toBe(4.63)
    expect(await db.userCameras.count()).toBe(1)
  })

  it('P3 (mnożnik i nazwa profilu nie należą do wpisu): mnożnik „abc” i pusta nazwa profilu nie blokują zapisu teleskopu', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm({ reducerFactor: 'abc', name: '' }))
    expect(spec).toMatchObject({ apertureMm: 80, focalLengthMm: 480 })
  })
})

describe('P4 zakresy wartości', () => {
  it('P4: apertura „0” → odrzucone z komunikatem zakresu, w bazie nic nowego', async () => {
    open()
    await expect(saveAsMyTelescope(db, newtonForm({ apertureMm: '0' }))).rejects.toThrow(
      'Apertura: dozwolony zakres 5–1500 mm',
    )
    expect(await db.userTelescopes.count()).toBe(0)
    expect(await listUserTelescopes(db)).toEqual([])
  })

  it('P4: apertura 500 i ogniskowa 400 (f/0,8, tylko ostrzeżenie) → wpis zapisany', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm({ apertureMm: '500', focalLengthMm: '400' }))
    expect(spec).toMatchObject({ apertureMm: 500, focalLengthMm: 400 })
    expect(await db.userTelescopes.toArray()).toEqual([spec])
  })

  it('P4 (te same zakresy dla kamery): piksel „abc” → „Rozmiar piksela: wpisz liczbę”, nic nie zapisane', async () => {
    open()
    await expect(saveAsMyCamera(db, camera294Form({ pixelSizeUm: 'abc' }))).rejects.toThrow('Rozmiar piksela: wpisz liczbę')
    expect(await db.userCameras.count()).toBe(0)
  })
})

describe('P5 nazwa wpisu', () => {
  it('P5: pusta nazwa teleskopu → „Nazwa teleskopu: wpisz nazwę”, nic nie zapisane', async () => {
    open()
    await expect(saveAsMyTelescope(db, newtonForm({ telescopeLabel: '' }))).rejects.toThrow('Nazwa teleskopu: wpisz nazwę')
    expect(await db.userTelescopes.count()).toBe(0)
  })

  it('P5: nazwa z samych spacji → „Nazwa teleskopu: wpisz nazwę”', async () => {
    open()
    await expect(saveAsMyTelescope(db, newtonForm({ telescopeLabel: '   ' }))).rejects.toThrow(
      'Nazwa teleskopu: wpisz nazwę',
    )
    expect(await db.userTelescopes.count()).toBe(0)
  })

  it('P5: pusta nazwa kamery albo same spacje → „Nazwa kamery: wpisz nazwę”, nic nie zapisane', async () => {
    open()
    await expect(saveAsMyCamera(db, camera294Form({ cameraLabel: '' }))).rejects.toThrow('Nazwa kamery: wpisz nazwę')
    await expect(saveAsMyCamera(db, camera294Form({ cameraLabel: '  ' }))).rejects.toThrow('Nazwa kamery: wpisz nazwę')
    expect(await db.userCameras.count()).toBe(0)
  })

  it('P5: nazwa „  Mój Newton ” zapisuje się jako „Mój Newton”', async () => {
    open()
    const { spec, form } = await saveAsMyTelescope(db, newtonForm({ telescopeLabel: '  Mój Newton ' }))
    expect(equipmentLabel(spec)).toBe('Mój Newton')
    expect(spec.model).toBe('Mój Newton')
    expect(form.telescopeLabel).toBe('Mój Newton')
    expect((await db.userTelescopes.toArray()).map((entry) => entry.model)).toEqual(['Mój Newton'])
  })
})

describe('P6 formularz po zapisie wskazuje nowy wpis', () => {
  it('P6: specId = id wpisu, etykieta dokładnie „Mój Newton 80/480”, pozostałe pola bez zmian', async () => {
    open()
    const input = newtonForm()
    const { spec, form } = await saveAsMyTelescope(db, input)
    expect(form).toEqual({ ...input, telescopeSpecId: spec.id, telescopeLabel: 'Mój Newton 80/480' })
  })

  it('P6: bez oznaczeń „zmienione względem katalogu” i źródłem jest nowy wpis', async () => {
    open()
    const { spec, form } = await saveAsMyTelescope(db, newtonForm())
    const telescopes = await allTelescopes()
    expect(changedFields(form, telescopes, BUILTIN_CAMERAS)).toEqual([])
    expect(formSources(form, telescopes, BUILTIN_CAMERAS).telescope).toEqual(spec)
  })

  it('P6 (kamera): po zapisie kamery formularz wskazuje nowy wpis, binning bez zmian, bez oznaczeń „zmienione”', async () => {
    open()
    const input = camera294Form()
    const { spec, form } = await saveAsMyCamera(db, input)
    expect(form).toEqual({ ...input, cameraSpecId: spec.id, cameraLabel: 'Moja 294' })
    expect(changedFields(form, BUILTIN_TELESCOPES, await allCameras())).toEqual([])
  })
})

describe('P7 „Zapisz jako…” zawsze dodaje nowy wpis', () => {
  it('P7: ponowny zapis z nazwą „Mój Newton 2” tworzy drugi wpis, pierwszy bez zmian', async () => {
    open()
    const first = await saveAsMyTelescope(db, newtonForm())
    const snapshot = structuredClone(first.spec)
    expect(first.form.telescopeSpecId).toBe(first.spec.id)
    const second = await saveAsMyTelescope(db, { ...first.form, telescopeLabel: 'Mój Newton 2', focalLengthMm: '500' })
    expect(second.spec.id).not.toBe(first.spec.id)
    expect(second.form.telescopeSpecId).toBe(second.spec.id)
    expect(second.spec).toMatchObject({ model: 'Mój Newton 2', focalLengthMm: 500 })
    expect(await db.userTelescopes.get(first.spec.id)).toEqual(snapshot)
    expect(labels(await listUserTelescopes(db))).toEqual(['Mój Newton 2', 'Mój Newton 80/480'])
  })
})

describe('P8 własne wpisy w wyszukiwarce innego profilu', () => {
  it('P8: fraza „mój newton” pokazuje „Mój Newton 80/480” (etykieta bez spacji na początku)', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm())
    const options = searchTelescopes('mój newton', await allTelescopes())
    expect(options.map((option) => option.label)).toEqual(['Własny', 'Mój Newton 80/480'])
    expect(options[1].spec).toEqual(spec)
  })

  it('P8: wybór własnego wpisu w innym profilu ustawia etykietę „Mój Newton 80/480” i jego wartości', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm())
    const other = profileToForm(profileFrom(moj({ name: 'Inny profil' })))
    const chosen = selectTelescope(other, spec)
    expect(chosen).toMatchObject({ telescopeSpecId: spec.id, telescopeLabel: 'Mój Newton 80/480', apertureMm: '80', focalLengthMm: '480' })
  })

  it('P8: własny „Esprit 100ED” pojawia się obok wbudowanego „Sky-Watcher Esprit 100ED”', async () => {
    open()
    const { spec } = await saveAsMyTelescope(db, newtonForm({ telescopeLabel: 'Esprit 100ED', apertureMm: '100', focalLengthMm: '550' }))
    const options = searchTelescopes('esprit 100ed', await allTelescopes())
    const found = options.filter((option) => option.spec !== null)
    expect(found.map((option) => option.label).sort()).toEqual(['Esprit 100ED', 'Sky-Watcher Esprit 100ED'])
    expect(found.map((option) => option.spec?.id).sort()).toEqual([ESPRIT_100, spec.id].sort())
  })
})

/** Profil „Szeroki kadr” utworzony z własnego wpisu z ogniskową 600 mm (P9, P10). */
async function wideFieldProfile() {
  const { spec, form } = await saveAsMyTelescope(
    db,
    moj({ telescopeSpecId: null, telescopeLabel: 'Mój Newton 150/600', apertureMm: '150', focalLengthMm: '600' }),
  )
  const profile = profileFrom({ ...form, name: 'Szeroki kadr' })
  await profileRepository.save(db, [profile])
  return { spec, profile: structuredClone(profile) }
}

describe('P9 edycja własnego wpisu', () => {
  it('P9: zmiana na 610 mm i „Newton po kolimacji” → to samo id, origin user, bez nowego wpisu', async () => {
    open()
    const { spec } = await wideFieldProfile()
    await editUserTelescope(db, { ...spec, model: 'Newton po kolimacji', focalLengthMm: 610 })
    expect(await db.userTelescopes.toArray()).toEqual([{ ...spec, model: 'Newton po kolimacji', focalLengthMm: 610, origin: 'user' }])
    expect(labels(await listUserTelescopes(db))).toEqual(['Newton po kolimacji'])
  })

  it('P9: profil ma dalej 600 mm i dawną etykietę, a przy ogniskowej jest „zmienione względem katalogu”', async () => {
    open()
    const { spec, profile } = await wideFieldProfile()
    const savedBefore = await db.settings.get('profiles')
    await editUserTelescope(db, { ...spec, model: 'Newton po kolimacji', focalLengthMm: 610 })
    expect(profile.telescope).toEqual({ specId: spec.id, label: 'Mój Newton 150/600', apertureMm: 150, focalLengthMm: 600 })
    expect(await db.settings.get('profiles')).toEqual(savedBefore)
    expect(changedFields(profileToForm(profile), await allTelescopes(), BUILTIN_CAMERAS)).toEqual(['focalLengthMm'])
  })

  it('P9: edycja z aperturą 0 odrzucona komunikatem z P4, wpis zachowuje poprzednie wartości', async () => {
    open()
    const { spec } = await wideFieldProfile()
    await expect(editUserTelescope(db, { ...spec, apertureMm: 0, focalLengthMm: 610 })).rejects.toThrow(
      'Apertura: dozwolony zakres 5–1500 mm',
    )
    expect(await db.userTelescopes.toArray()).toEqual([spec])
  })

  it('P9: edycja z pustą nazwą albo samymi spacjami odrzucona komunikatem z P5, wpis bez zmian', async () => {
    open()
    const { spec } = await wideFieldProfile()
    await expect(editUserTelescope(db, { ...spec, model: '', focalLengthMm: 610 })).rejects.toThrow('Nazwa teleskopu: wpisz nazwę')
    await expect(editUserTelescope(db, { ...spec, model: '   ', focalLengthMm: 610 })).rejects.toThrow(
      'Nazwa teleskopu: wpisz nazwę',
    )
    expect(await db.userTelescopes.toArray()).toEqual([spec])
  })
})

describe('P10 usunięcie własnego wpisu', () => {
  it('P10: profil ma dalej swoje wartości, teleskop pokazany jako „Własny”, bez oznaczeń „zmienione”', async () => {
    open()
    const { spec, profile } = await wideFieldProfile()
    await editUserTelescope(db, { ...spec, model: 'Newton po kolimacji', focalLengthMm: 610 })
    await removeUserTelescope(db, spec.id)
    expect(await listUserTelescopes(db)).toEqual([])
    expect(await db.userTelescopes.count()).toBe(0)
    const form = profileToForm(profile)
    const telescopes = await allTelescopes()
    expect(profile.telescope).toEqual({ specId: spec.id, label: 'Mój Newton 150/600', apertureMm: 150, focalLengthMm: 600 })
    expect(formSources(form, telescopes, BUILTIN_CAMERAS).telescope).toBeNull()
    expect(changedFields(form, telescopes, BUILTIN_CAMERAS)).toEqual([])
  })

  it('P10: specId profilu nie jest przepisywany, wpis profiles w tabeli settings się nie zmienia', async () => {
    open()
    const { spec, profile } = await wideFieldProfile()
    const savedBefore = structuredClone(await db.settings.get('profiles'))
    await removeUserTelescope(db, spec.id)
    expect(await db.settings.get('profiles')).toEqual(savedBefore)
    expect(await profileRepository.load(db, [])).toEqual([profile])
  })

  it('P10 (kamera): usunięcie własnej kamery usuwa tylko ją', async () => {
    open()
    const kept = await saveAsMyCamera(db, camera294Form({ cameraLabel: 'Zostaje' }))
    const removed = await saveAsMyCamera(db, camera294Form())
    await removeUserCamera(db, removed.spec.id)
    expect(await db.userCameras.toArray()).toEqual([kept.spec])
  })
})

describe('P11 „Duplikuj jako własny” na wpisie wbudowanym', () => {
  it('P11: „Sky-Watcher Esprit 100ED” → „Sky-Watcher Esprit 100ED (kopia)” 100/550, refraktor', async () => {
    open()
    const before = structuredClone(builtinTelescope(ESPRIT_100))
    const copy = await duplicateTelescope(db, ESPRIT_100)
    expect(equipmentLabel(copy)).toBe('Sky-Watcher Esprit 100ED (kopia)')
    expect(copy).toMatchObject({ apertureMm: 100, focalLengthMm: 550, design: 'refractor', origin: 'user' })
    expect(BUILTIN_TELESCOPE_IDS).not.toContain(copy.id)
    expect(await db.userTelescopes.toArray()).toEqual([copy])
    expect(builtinTelescope(ESPRIT_100)).toEqual(before)
    expect((await telescopeRepository.list(db)).find((spec) => spec.id === ESPRIT_100)).toEqual(before)
  })

  it('P11: kolejne duplikowanie daje „(kopia 2)”', async () => {
    open()
    const first = await duplicateTelescope(db, ESPRIT_100)
    const second = await duplicateTelescope(db, ESPRIT_100)
    expect(second.id).not.toBe(first.id)
    expect(equipmentLabel(second)).toBe('Sky-Watcher Esprit 100ED (kopia 2)')
    expect(labels(await listUserTelescopes(db)).sort()).toEqual(
      ['Sky-Watcher Esprit 100ED (kopia)', 'Sky-Watcher Esprit 100ED (kopia 2)'].sort(),
    )
  })

  it('P11: kamera „ZWO ASI6200MM Pro” → kopia z modelem matrycy IMX455, wbudowana bez zmian', async () => {
    open()
    const before = structuredClone(builtinCamera(ASI6200MM))
    const copy = await duplicateCamera(db, ASI6200MM)
    expect(equipmentLabel(copy)).toBe('ZWO ASI6200MM Pro (kopia)')
    expect(copy).toMatchObject({
      sensorModel: 'IMX455',
      sensor: 'mono',
      resolutionXPx: 9576,
      resolutionYPx: 6388,
      pixelSizeUm: 3.76,
      origin: 'user',
    })
    expect(BUILTIN_CAMERA_IDS).not.toContain(copy.id)
    expect(await db.userCameras.toArray()).toEqual([copy])
    expect(builtinCamera(ASI6200MM)).toEqual(before)
  })
})

describe('P12 wpisy wbudowane są tylko do odczytu', () => {
  it('P12: edycja i usunięcie „skywatcher-esprit-100ed” odrzucone przyjaznym komunikatem, listy bez zmian', async () => {
    open()
    await saveAsMyTelescope(db, newtonForm())
    const before = await telescopeRepository.list(db)
    const builtin = builtinTelescope(ESPRIT_100)
    await expect(editUserTelescope(db, { ...builtin, focalLengthMm: 600 })).rejects.toThrow(READ_ONLY)
    await expect(removeUserTelescope(db, ESPRIT_100)).rejects.toThrow(READ_ONLY)
    expect(await telescopeRepository.list(db)).toEqual(before)
    expect(builtinTelescope(ESPRIT_100).focalLengthMm).toBe(550)
  })

  it('P12 (kamera): edycja i usunięcie „zwo-asi6200mm-pro” odrzucone tym samym komunikatem', async () => {
    open()
    await saveAsMyCamera(db, camera294Form())
    const before = await cameraRepository.list(db)
    await expect(editUserCamera(db, { ...builtinCamera(ASI6200MM), pixelSizeUm: 4 })).rejects.toThrow(READ_ONLY)
    await expect(removeUserCamera(db, ASI6200MM)).rejects.toThrow(READ_ONLY)
    expect(await cameraRepository.list(db)).toEqual(before)
  })

  it('Styk: sprawdzenie „wpis wbudowany” rozróżnia wpisy wbudowane i własne', async () => {
    open()
    const telescope = await saveAsMyTelescope(db, newtonForm())
    const camera = await saveAsMyCamera(db, camera294Form())
    expect(isBuiltinTelescope(ESPRIT_100)).toBe(true)
    expect(isBuiltinTelescope(telescope.spec.id)).toBe(false)
    expect(isBuiltinCamera(ASI6200MM)).toBe(true)
    expect(isBuiltinCamera(camera.spec.id)).toBe(false)
    expect(isBuiltinCamera(ESPRIT_100)).toBe(false)
  })
})

describe('P13 lista własnych wpisów po polsku', () => {
  it('P13: „Ćma 50”, „Mój Newton 80/480”, „Żuraw 70” (Ć przed M mimo kodów znaków)', async () => {
    open()
    for (const name of ['Żuraw 70', 'Mój Newton 80/480', 'Ćma 50']) {
      await saveAsMyTelescope(db, newtonForm({ telescopeLabel: name }))
    }
    expect(labels(await listUserTelescopes(db))).toEqual(['Ćma 50', 'Mój Newton 80/480', 'Żuraw 70'])
  })

  it('Pytania: dwa wpisy mogą mieć tę samą nazwę', async () => {
    open()
    await saveAsMyTelescope(db, newtonForm())
    await saveAsMyTelescope(db, newtonForm())
    expect(labels(await listUserTelescopes(db))).toEqual(['Mój Newton 80/480', 'Mój Newton 80/480'])
  })
})

describe('Pytania: etykieta wpisu', () => {
  it('marka i model rozdzielone spacją, przy pustej marce sam model', () => {
    expect(equipmentLabel(builtinTelescope(ESPRIT_100))).toBe('Sky-Watcher Esprit 100ED')
    expect(equipmentLabel({ brand: '', model: 'Mój Newton 80/480' })).toBe('Mój Newton 80/480')
  })
})
