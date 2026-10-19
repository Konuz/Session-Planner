// Ukryte przypadki „formularz-profilu”: te same reguły co w testach widocznych, inne wartości.
// Wartości podglądu policzone wzorami z 7B (`computeOptics`, `assessSampling`) i formatem z „Przykładów” spec.
import { describe, expect, it } from 'vitest'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from '../../../../src/data/equipmentCatalog'
import {
  changedFields,
  formSources,
  profilePreview,
  profileToForm,
  readProfileForm,
  reducerButtons,
  searchCameras,
  searchTelescopes,
  selectCamera,
  selectTelescope,
  type ProfileForm,
} from '../../../../src/features/equipment/profileForm'
import type { CameraSpec, EquipmentProfile } from '../../../../src/types'
import { NEWTON_ID, OSC_NOTE, camera, demo, errors, formOf, issuesAt, moj, saved, telescope, warnings } from '../helpers'

const ids = (options: { spec: { id: string } | null }[]) => options.map((option) => option.spec?.id ?? null)
const changed = (form: ProfileForm) => changedFields(form, BUILTIN_TELESCOPES, BUILTIN_CAMERAS)

describe('podgląd: inne zestawy', () => {
  it('evostar 100ED + reduktor 0,85 + ASI533MC (OSC)', () => {
    const form = {
      ...selectCamera(selectTelescope(moj(), telescope('skywatcher-evostar-100ed')), camera('zwo-asi533mc-pro')),
      reducerFactor: '0,85',
    }
    expect(profilePreview(form, 2.5)).toEqual({
      effectiveFocalLength: '765 mm',
      focalRatio: 'f/7,65',
      sensor: '11,31 × 11,31 mm',
      sensorDiagonal: '15,99 mm',
      fieldOfViewDeg: '0,847° × 0,847°',
      fieldOfViewArcmin: '50,8′ × 50,8′',
      scale: '1,014″/px',
      sampling: 'idealne',
      oscNote: OSC_NOTE,
    })
  })

  it('ręczny 150/750 + 0,85 + ASI2600MM binning 2: F_eff z jednym miejscem po przecinku', () => {
    const form = {
      ...selectCamera(moj({ focalLengthMm: '750' }), camera('zwo-asi2600mm-pro')),
      reducerFactor: '0.85',
      binning: 2 as const,
    }
    expect(profilePreview(form, 2.5)).toEqual({
      effectiveFocalLength: '637,5 mm',
      focalRatio: 'f/4,25',
      sensor: '23,49 × 15,70 mm',
      sensorDiagonal: '28,26 mm',
      fieldOfViewDeg: '2,111° × 1,411°',
      fieldOfViewArcmin: '126,7′ × 84,7′',
      scale: '2,433″/px',
      sampling: 'podpróbkowanie',
      oscNote: null,
    })
  })

  it('RedCat 61 + ASI2600MC + 0,73 + binning 3', () => {
    const form = {
      ...selectCamera(selectTelescope(moj(), telescope('william-optics-redcat-61')), camera('zwo-asi2600mc-pro')),
      reducerFactor: '0,73',
      binning: 3 as const,
    }
    const preview = profilePreview(form, 2.5)
    expect(preview.effectiveFocalLength).toBe('219 mm')
    expect(preview.focalRatio).toBe('f/3,59')
    expect(preview.fieldOfViewDeg).toBe('6,140° × 4,106°')
    expect(preview.fieldOfViewArcmin).toBe('368,4′ × 246,4′')
    expect(preview.scale).toBe('10,624″/px')
    // Binning nie zmienia pola widzenia.
    expect(profilePreview({ ...form, binning: 1 }, 2.5).fieldOfViewDeg).toBe('6,140° × 4,106°')
  })
})

describe('próbkowanie: inny seeing', () => {
  it('Esprit 120ED + Ares-M: 0,923″/px idealne przy 2″, nadpróbkowanie przy 3″', () => {
    const form = selectTelescope(moj(), telescope('skywatcher-esprit-120ed'))
    expect(profilePreview(form, 2).scale).toBe('0,923″/px')
    expect(profilePreview(form, 2).sampling).toBe('idealne')
    expect(profilePreview(form, 3).sampling).toBe('nadpróbkowanie')
  })

  it('Evostar 72ED + ASI533MM: 1,847″/px podpróbkowanie przy 2,5″, idealne przy 4″', () => {
    const form = selectCamera(selectTelescope(moj(), telescope('skywatcher-evostar-72ed')), camera('zwo-asi533mm-pro'))
    expect(profilePreview(form, 2.5).scale).toBe('1,847″/px')
    expect(profilePreview(form, 2.5).sampling).toBe('podpróbkowanie')
    expect(profilePreview(form, 4).sampling).toBe('idealne')
    expect(profilePreview(form, 4).oscNote).toBeNull()
  })

  it('Newton 200/1000 z 6.4 przy seeingu 2″ jest idealny', () => {
    expect(profilePreview(formOf(NEWTON_ID), 2).sampling).toBe('idealne')
  })
})

describe('wyszukiwarka: inne frazy', () => {
  it('„esprit” → cztery Esprity w kolejności listy', () => {
    expect(ids(searchTelescopes('esprit', BUILTIN_TELESCOPES))).toEqual([
      null,
      'skywatcher-esprit-80ed',
      'skywatcher-esprit-100ed',
      'skywatcher-esprit-120ed',
      'skywatcher-esprit-150ed',
    ])
  })

  it('„william redcat 7” → RedCat 71', () => {
    expect(ids(searchTelescopes('william redcat 7', BUILTIN_TELESCOPES))).toEqual([null, 'william-optics-redcat-71'])
  })

  it('kamery „ZWO asi2600” → MC i MM; „Player One ares-m” → Ares-M Pro', () => {
    expect(ids(searchCameras('ZWO asi2600', BUILTIN_CAMERAS))).toEqual([null, 'zwo-asi2600mc-pro', 'zwo-asi2600mm-pro'])
    expect(ids(searchCameras('Player One ares-m', BUILTIN_CAMERAS))).toEqual([null, 'player-one-ares-m-pro'])
  })

  it('własna kamera z przekazanej listy', () => {
    const own: CameraSpec = {
      id: 'user-moja-kamera',
      brand: 'Moja',
      model: 'Kamera 678',
      sensorModel: null,
      sensor: 'mono',
      resolutionXPx: 3840,
      resolutionYPx: 2160,
      pixelSizeUm: 2,
      origin: 'user',
    }
    expect(ids(searchCameras('kamera 678', [...BUILTIN_CAMERAS, own]))).toEqual([null, 'user-moja-kamera'])
    expect(searchCameras('kamera 678', BUILTIN_CAMERAS)).toEqual([{ spec: null, label: 'Własna' }])
    const form = selectCamera(moj(), own)
    expect([form.resolutionXPx, form.resolutionYPx, form.pixelSizeUm, form.sensor]).toEqual(['3840', '2160', '2', 'mono'])
    expect(changedFields(form, BUILTIN_TELESCOPES, [own])).toEqual([])
  })
})

describe('oznaczenia: inne pola', () => {
  const esprit120 = () =>
    selectCamera(selectTelescope(moj(), telescope('skywatcher-esprit-120ed')), camera('zwo-asi2600mm-pro'))

  it('apertura 110 przy Esprit 120ED → tylko apertura', () => {
    expect(changed({ ...esprit120(), apertureMm: '110' })).toEqual(['apertureMm'])
    expect(changed({ ...esprit120(), apertureMm: '120,0' })).toEqual([])
  })

  it('rozdzielczość i piksel kamery', () => {
    expect(changed({ ...esprit120(), resolutionXPx: '6000' })).toEqual(['resolutionXPx'])
    expect(changed({ ...esprit120(), resolutionYPx: '4000' })).toEqual(['resolutionYPx'])
    expect(changed({ ...esprit120(), pixelSizeUm: '3.76' })).toEqual([])
    expect(changed({ ...esprit120(), pixelSizeUm: '3,8' })).toEqual(['pixelSizeUm'])
    expect(changed({ ...esprit120(), pixelSizeUm: 'x' })).toEqual([])
  })

  it('„Własna” kamera zostawia nazwę i nie ma oznaczeń', () => {
    const form = selectCamera({ ...esprit120(), resolutionXPx: '6000' }, null)
    expect(form.cameraLabel).toBe('ZWO ASI2600MM Pro')
    expect(form.cameraSpecId).toBeNull()
    expect(changed(form)).toEqual([])
  })

  it('zapis zachowuje specId kamery przy zmienionym pikselu', () => {
    const profile = saved({ ...esprit120(), pixelSizeUm: '3,8' })
    expect(profile.camera.specId).toBe('zwo-asi2600mm-pro')
    expect(profile.camera.pixelSizeUm).toBe(3.8)
    expect(profile.telescope.specId).toBe('skywatcher-esprit-120ed')
  })

  it('kamera z specId spoza listy jest pokazana jako „Własna”', () => {
    const base = demo(NEWTON_ID)
    const form = profileToForm({ ...base, camera: { ...base.camera, specId: 'usunieta', resolutionXPx: 2000 } })
    expect(formSources(form, BUILTIN_TELESCOPES, BUILTIN_CAMERAS).camera).toBeNull()
    expect(formSources(form, BUILTIN_TELESCOPES, BUILTIN_CAMERAS).telescope?.id).toBe('skywatcher-explorer-200pds')
    expect(changed(form)).toEqual([])
  })
})

describe('mnożnik: inne wartości', () => {
  it.each([
    ['0,63', '0,63×'],
    ['2', '2,0×'],
    ['0.7', '0,7×'],
  ])('%s zaznacza tylko %s', (text, label) => {
    expect(reducerButtons(moj({ reducerFactor: text })).filter((item) => item.pressed).map((item) => item.label)).toEqual([
      label,
    ])
  })

  it('1,2 nie zaznacza żadnego przycisku i jest poprawne', () => {
    const form = moj({ reducerFactor: '1,2' })
    expect(reducerButtons(form).some((item) => item.pressed)).toBe(false)
    expect(saved(form).reducerFactor).toBe(1.2)
  })
})

describe('walidacja: inne wartości', () => {
  it.each([
    ['apertureMm', '1600', 'Apertura: dozwolony zakres 5–1500 mm'],
    ['apertureMm', '', 'Apertura: wpisz liczbę'],
    ['pixelSizeUm', '31', 'Rozmiar piksela: dozwolony zakres 1–30 µm'],
    ['reducerFactor', '0,2', 'Mnożnik: dozwolony zakres 0,3–3 ×'],
    ['resolutionYPx', '3000,5', 'Rozdzielczość Y: wpisz liczbę całkowitą'],
    ['focalLengthMm', '1 000', 'Ogniskowa: wpisz liczbę'],
  ] as const)('%s „%s” → %s', (field, text, message) => {
    const form = moj({ [field]: text })
    expect(errors(form)).toEqual([message])
    expect(issuesAt(form, field).map((issue) => issue.message)).toEqual([message])
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('50/2000 → ostrzeżenie f/40, mnożnik 0,5 go nie usuwa, podgląd f/20,00', () => {
    const form = moj({ apertureMm: '50', focalLengthMm: '2000', reducerFactor: '0,5' })
    expect(warnings(form)).toEqual([
      { field: 'focalLengthMm', severity: 'warning', message: 'Nietypowa światłosiła f/40: sprawdź ogniskową i aperturę' },
    ])
    expect(readProfileForm(form).profile?.reducerFactor).toBe(0.5)
    expect(profilePreview(form, 2.5).focalRatio).toBe('f/20,00')
  })

  it('pusta nazwa z kamery wpisu ręcznego (same spacje) i teleskopu', () => {
    expect(errors(moj({ cameraSpecId: null, cameraLabel: '  ' }))).toEqual(['Nazwa kamery: wpisz nazwę'])
    // Kolejność komunikatów spec nie określa.
    expect([...errors(moj({ name: '', telescopeLabel: ' ' }))].sort()).toEqual([
      'Nazwa profilu: wpisz nazwę',
      'Nazwa teleskopu: wpisz nazwę',
    ])
  })

  it('piksel „xyz” w podglądzie, przy Newtonie 200/1000', () => {
    const preview = profilePreview({ ...formOf(NEWTON_ID), pixelSizeUm: 'xyz' }, 2.5)
    expect(preview.scale).toBe('—')
    expect(preview.sensor).toBe('—')
    expect(preview.effectiveFocalLength).toBe('1000 mm')
    expect(preview.focalRatio).toBe('f/5,00')
  })

  it('apertura „?” przy Newtonie 200/1000: tylko f/ jest „—”', () => {
    const preview = profilePreview({ ...formOf(NEWTON_ID), apertureMm: '?' }, 2.5)
    expect(preview.focalRatio).toBe('—')
    expect(preview.scale).toBe('0,776″/px')
    expect(preview.fieldOfViewDeg).toBe('0,648° × 0,648°')
  })
})

describe('montaż, filtry, OAG: inne wartości', () => {
  it.each(['61', '-1'])('przerzut %s → błąd przy montażu widłowym', (text) => {
    const form = moj({ mountType: 'fork', flipMinutes: text })
    expect(errors(form)).toEqual(['Przerzut: dozwolony zakres 0–60 min'])
  })

  it('przerzut 45 przy alt-az', () => {
    expect(saved(moj({ mountType: 'altaz', flipMinutes: '45' })).mount).toEqual({ type: 'altaz', flipMinutesAfterMeridian: 45 })
  })

  it('filtry w kolejności kanonicznej z innego wyboru', () => {
    expect(saved(moj({ filters: ['OIII', 'G', 'OSC', 'R'] })).filters).toEqual(['R', 'G', 'OIII', 'OSC'])
  })

  it('OAG 12,5 × 7,25 mm, 0 mm, 270°', () => {
    const form = moj({
      oagEnabled: true,
      oagPrismWidthMm: '12,5',
      oagPrismHeightMm: '7.25',
      oagOffsetMm: '0',
      oagAngleDeg: '270',
    })
    expect(saved(form).oag).toEqual({ prismWidthMm: 12.5, prismHeightMm: 7.25, offsetFromCenterMm: 0, angleDeg: 270 })
  })

  it('OAG: kąt -1 i odległość -0,5 to błędy przy swoich polach', () => {
    const form = moj({
      oagEnabled: true,
      oagPrismWidthMm: '9',
      oagPrismHeightMm: '9',
      oagOffsetMm: '-0,5',
      oagAngleDeg: '-1',
    })
    expect(issuesAt(form, 'oagAngleDeg').map((issue) => issue.message)).toEqual(['Kąt OAG: dozwolony zakres 0–360°'])
    expect(issuesAt(form, 'oagOffsetMm')).toHaveLength(1)
    expect(issuesAt(form, 'oagOffsetMm')[0].message).toContain('≥ 0 mm')
    expect(errors(form)).toHaveLength(2)
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('profil własny z OAG, widłowym montażem i binningiem 3 wraca bez zmian', () => {
    const base = demo(NEWTON_ID)
    const profile: EquipmentProfile = {
      ...base,
      id: 'profil-wlasny',
      name: 'Mały refraktor',
      telescope: { specId: null, label: 'Refraktor 61/360', apertureMm: 61, focalLengthMm: 360 },
      reducerFactor: 0.73,
      camera: { ...base.camera, specId: null, label: 'Kamera 2,9 µm', pixelSizeUm: 2.9, binning: 3 },
      mount: { type: 'fork', flipMinutesAfterMeridian: 25 },
      filters: ['Ha', 'OIII'],
      oag: { prismWidthMm: 8.5, prismHeightMm: 6, offsetFromCenterMm: 12.25, angleDeg: 270 },
    }
    const form = profileToForm(profile)
    expect(form.pixelSizeUm).toBe('2,9')
    expect(form.reducerFactor).toBe('0,73')
    expect(form.oagEnabled).toBe(true)
    expect(form.oagOffsetMm).toBe('12,25')
    expect(readProfileForm(form)).toEqual({ profile, issues: [] })
  })
})
