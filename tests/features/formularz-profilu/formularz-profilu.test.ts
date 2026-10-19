// Model edytora profilu sprzętu (7F): tekst pól ↔ profil, walidacja, podgląd optyki, wyszukiwarka, przyciski mnożnika
// i oznaczenia „zmienione względem katalogu”. Nazwy funkcji i pól (spec ich nie podaje) opisuje helpers.ts.
import { describe, expect, it } from 'vitest'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from '../../../src/data/equipmentCatalog'
import { DEMO_PROFILES } from '../../../src/data/demo'
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
} from '../../../src/features/equipment/profileForm'
import type { EquipmentProfile, TelescopeSpec } from '../../../src/types'
import {
  ASI6200MM,
  ESPRIT_100,
  ESPRIT_ID,
  NEWTON_ID,
  OSC_NOTE,
  REDCAT_ID,
  camera,
  demo,
  errors,
  formOf,
  issuesAt,
  moj,
  saved,
  telescope,
  warnings,
} from './helpers'

const ids = (options: { spec: { id: string } | null }[]) => options.map((option) => option.spec?.id ?? null)

/** P1 (T17): teleskop „Własny” 80/480, mnożnik 0,8, kamera „Własna” 4144 × 2822 px, 4,63 µm, OSC, binning 1. */
function t17(patch: Partial<ProfileForm> = {}): ProfileForm {
  return moj({
    telescopeSpecId: null,
    telescopeLabel: 'Własny',
    apertureMm: '80',
    focalLengthMm: '480',
    reducerFactor: '0,8',
    cameraSpecId: null,
    cameraLabel: 'Własna',
    resolutionXPx: '4144',
    resolutionYPx: '2822',
    pixelSizeUm: '4,63',
    sensor: 'osc',
    binning: 1,
    ...patch,
  })
}

/** P3 (T18): wybór „Sky-Watcher Esprit 100ED” i „ZWO ASI6200MM Pro” z wyszukiwarek, zaczynając od „Mój zestaw”. */
function p3Form(): ProfileForm {
  const scope = searchTelescopes('esprit', BUILTIN_TELESCOPES).find((option) => option.spec?.id === ESPRIT_100)
  const cam = searchCameras('asi6200', BUILTIN_CAMERAS).find((option) => option.spec?.id === ASI6200MM)
  if (!scope?.spec || !cam?.spec) throw new Error('Wyszukiwarka nie zwróciła Esprit 100ED albo ASI6200MM Pro')
  return selectCamera(selectTelescope(moj(), scope.spec), cam.spec)
}

const changed = (form: ProfileForm) => changedFields(form, BUILTIN_TELESCOPES, BUILTIN_CAMERAS)

describe('podgląd (T17)', () => {
  it('test_p1_t17_preview_values', () => {
    const preview = profilePreview(t17(), 2.5)
    expect(preview.effectiveFocalLength).toBe('384 mm')
    expect(preview.focalRatio).toBe('f/4,80')
    expect(preview.sensor).toBe('19,19 × 13,07 mm')
    expect(preview.sensorDiagonal).toBe('23,21 mm')
    expect(preview.fieldOfViewDeg).toBe('2,862° × 1,949°')
    expect(preview.fieldOfViewArcmin).toBe('171,7′ × 117,0′')
    expect(preview.scale).toBe('2,487″/px')
  })

  it('test_p2_binning_2_doubles_scale_fov_unchanged', () => {
    const preview = profilePreview(t17({ binning: 2 }), 2.5)
    expect(preview.scale).toBe('4,974″/px')
    expect(preview.fieldOfViewDeg).toBe('2,862° × 1,949°')
    expect(preview.fieldOfViewArcmin).toBe('171,7′ × 117,0′')
    expect(preview.effectiveFocalLength).toBe('384 mm')
  })

  it('test_p1_t17_profile_values_from_text', () => {
    const profile = saved(t17())
    expect(profile.telescope).toEqual({ specId: null, label: 'Własny', apertureMm: 80, focalLengthMm: 480 })
    expect(profile.reducerFactor).toBe(0.8)
    expect(profile.camera).toEqual({
      specId: null,
      label: 'Własna',
      sensor: 'osc',
      resolutionXPx: 4144,
      resolutionYPx: 2822,
      pixelSizeUm: 4.63,
      binning: 1,
    })
  })
})

describe('wyszukiwarka i wybór z katalogu (T18)', () => {
  it('test_p3_select_esprit_and_asi6200mm_fills_fields', () => {
    const form = p3Form()
    expect(form.telescopeSpecId).toBe(ESPRIT_100)
    expect(form.telescopeLabel).toBe('Sky-Watcher Esprit 100ED')
    expect(form.apertureMm).toBe('100')
    expect(form.focalLengthMm).toBe('550')
    expect(form.cameraSpecId).toBe(ASI6200MM)
    expect(form.resolutionXPx).toBe('9576')
    expect(form.resolutionYPx).toBe('6388')
    expect(form.pixelSizeUm).toBe('3,76')
    expect(form.sensor).toBe('mono')
  })

  it('test_p3_preview_after_selection', () => {
    const preview = profilePreview(p3Form(), 2.5)
    expect(preview.focalRatio).toBe('f/5,50')
    expect(preview.fieldOfViewDeg).toBe('3,750° × 2,502°')
    expect(preview.scale).toBe('1,410″/px')
  })

  it('test_p3_selection_shows_catalog_sources_without_changes', () => {
    const form = p3Form()
    const sources = formSources(form, BUILTIN_TELESCOPES, BUILTIN_CAMERAS)
    expect(sources.telescope?.id).toBe(ESPRIT_100)
    expect(sources.camera?.id).toBe(ASI6200MM)
    expect(changed(form)).toEqual([])
  })

  it('test_p6_redcat_case_insensitive', () => {
    const lower = searchTelescopes('redcat', BUILTIN_TELESCOPES)
    expect(ids(lower)).toEqual([
      null,
      'william-optics-redcat-51',
      'william-optics-redcat-61',
      'william-optics-redcat-71',
    ])
    expect(lower[0].label).toBe('Własny')
    expect(ids(searchTelescopes('REDCAT', BUILTIN_TELESCOPES))).toEqual(ids(lower))
  })

  it('test_p6_brand_and_model_together', () => {
    expect(ids(searchTelescopes('sky esprit 100', BUILTIN_TELESCOPES))).toEqual([null, ESPRIT_100])
  })

  it('test_p6_no_match_leaves_only_wlasny', () => {
    const telescopes = searchTelescopes('xyz123', BUILTIN_TELESCOPES)
    expect(telescopes).toEqual([{ spec: null, label: 'Własny' }])
    const cameras = searchCameras('xyz123', BUILTIN_CAMERAS)
    expect(cameras).toEqual([{ spec: null, label: 'Własna' }])
  })

  it('test_p6_user_entries_from_given_list_appear', () => {
    const own: TelescopeSpec = {
      id: 'user-redcat-mod',
      brand: 'William Optics',
      model: 'RedCat 51 po przeróbce',
      design: 'refractor',
      apertureMm: 51,
      focalLengthMm: 250,
      origin: 'user',
    }
    const result = ids(searchTelescopes('redcat', [...BUILTIN_TELESCOPES, own]))
    expect(result).toHaveLength(5)
    expect(result).toContain('user-redcat-mod')
    // Wyszukiwarka szuka na przekazanej liście, nie w stałym katalogu.
    expect(ids(searchTelescopes('redcat', [telescope('william-optics-redcat-61'), own]))).toEqual([
      null,
      'william-optics-redcat-61',
      'user-redcat-mod',
    ])
  })

  it('test_p6_camera_search_finds_entry', () => {
    const result = searchCameras('asi6200mm', BUILTIN_CAMERAS)
    expect(ids(result)).toEqual([null, ASI6200MM])
    expect(result[0].label).toBe('Własna')
  })

  it('test_p7_wlasny_keeps_values_and_name_without_marks', () => {
    const form = selectTelescope(p3Form(), null)
    expect(form.telescopeSpecId).toBeNull()
    expect(form.telescopeLabel).toBe('Sky-Watcher Esprit 100ED')
    expect(form.apertureMm).toBe('100')
    expect(form.focalLengthMm).toBe('550')
    expect(formSources(form, BUILTIN_TELESCOPES, BUILTIN_CAMERAS).telescope).toBeNull()
    expect(changed(form)).toEqual([])
    const profile = saved(form)
    expect(profile.telescope).toEqual({
      specId: null,
      label: 'Sky-Watcher Esprit 100ED',
      apertureMm: 100,
      focalLengthMm: 550,
    })
  })

  it('test_p7_wlasny_after_change_has_no_marks', () => {
    const form = selectTelescope({ ...p3Form(), focalLengthMm: '600' }, null)
    expect(form.focalLengthMm).toBe('600')
    expect(changed(form)).toEqual([])
  })

  it('test_p7_wlasna_camera_keeps_values', () => {
    const form = selectCamera(p3Form(), null)
    expect(form.cameraSpecId).toBeNull()
    expect(form.resolutionXPx).toBe('9576')
    expect(form.pixelSizeUm).toBe('3,76')
    expect(form.sensor).toBe('mono')
    expect(formSources(form, BUILTIN_TELESCOPES, BUILTIN_CAMERAS).camera).toBeNull()
  })
})

describe('oznaczenia „zmienione względem katalogu” (T18)', () => {
  it('test_p4_focal_600_marks_only_focal', () => {
    const form = { ...p3Form(), focalLengthMm: '600' }
    expect(changed(form)).toEqual(['focalLengthMm'])
    expect(telescope(ESPRIT_100).focalLengthMm).toBe(550)
    const again = searchTelescopes('esprit 100', BUILTIN_TELESCOPES).find((option) => option.spec?.id === ESPRIT_100)
    expect(again?.spec?.focalLengthMm).toBe(550)
  })

  it('test_p4_back_to_550_removes_mark', () => {
    expect(changed({ ...p3Form(), focalLengthMm: '550' })).toEqual([])
    expect(changed({ ...p3Form(), focalLengthMm: '550,0' })).toEqual([])
  })

  it('test_p4_marks_compare_with_given_list', () => {
    // Lista wpisów, na której Esprit 100ED ma 600 mm: ogniskowa 600 nie jest zmieniona, 550 już tak.
    const edited = BUILTIN_TELESCOPES.map((spec) => (spec.id === ESPRIT_100 ? { ...spec, focalLengthMm: 600 } : spec))
    expect(changedFields({ ...p3Form(), focalLengthMm: '600' }, edited, BUILTIN_CAMERAS)).toEqual([])
    expect(changedFields(p3Form(), edited, BUILTIN_CAMERAS)).toEqual(['focalLengthMm'])
  })

  it('test_p4_text_that_is_not_a_number_is_not_marked', () => {
    // Pytania: przy tekście, który nie jest liczbą, nie ma oznaczenia, tylko błąd.
    const form = { ...p3Form(), focalLengthMm: 'abc' }
    expect(changed(form)).toEqual([])
    expect(errors(form)).toEqual(['Ogniskowa: wpisz liczbę'])
  })

  it('test_p5_sensor_change_marks_type', () => {
    expect(changed({ ...p3Form(), sensor: 'osc' })).toEqual(['sensor'])
  })

  it('test_p5_binning_and_reducer_never_marked', () => {
    expect(changed({ ...p3Form(), binning: 2, reducerFactor: '0,85' })).toEqual([])
    expect(changed({ ...p3Form(), sensor: 'osc', binning: 4, reducerFactor: '2' })).toEqual(['sensor'])
  })

  it('test_p16_save_keeps_spec_id_and_changed_focal', () => {
    const profile = saved({ ...p3Form(), focalLengthMm: '600' })
    expect(profile.telescope.specId).toBe(ESPRIT_100)
    expect(profile.telescope.focalLengthMm).toBe(600)
    expect(profile.camera.specId).toBe(ASI6200MM)
  })

  it('test_p16_spec_id_missing_from_list_is_shown_as_wlasny', () => {
    const base = demo(ESPRIT_ID)
    const profile: EquipmentProfile = {
      ...base,
      telescope: { ...base.telescope, specId: 'usuniety-teleskop', focalLengthMm: 600 },
      camera: { ...base.camera, specId: 'usunieta-kamera', pixelSizeUm: 4 },
    }
    const form = profileToForm(profile)
    const sources = formSources(form, BUILTIN_TELESCOPES, BUILTIN_CAMERAS)
    expect(sources).toEqual({ telescope: null, camera: null })
    expect(changed(form)).toEqual([])
  })

  it('test_p16_entry_removed_from_list_is_shown_as_wlasny', () => {
    const form = { ...p3Form(), focalLengthMm: '600' }
    const without = BUILTIN_TELESCOPES.filter((spec) => spec.id !== ESPRIT_100)
    expect(formSources(form, without, BUILTIN_CAMERAS).telescope).toBeNull()
    expect(changedFields(form, without, BUILTIN_CAMERAS)).toEqual([])
  })
})

describe('przyciski mnożnika', () => {
  it('test_p8_buttons_labels_in_order', () => {
    expect(reducerButtons(moj()).map((button) => button.label)).toEqual([
      '0,63×',
      '0,7×',
      '0,73×',
      '0,8×',
      '0,85×',
      '1,0×',
      '2,0×',
    ])
  })

  it('test_p8_click_085_writes_text_and_presses_button', () => {
    const button = reducerButtons(moj()).find((item) => item.label === '0,85×')
    expect(button?.text).toBe('0,85')
    const form = moj({ reducerFactor: button?.text ?? '' })
    expect(form.reducerFactor).toBe('0,85')
    const pressed = reducerButtons(form).filter((item) => item.pressed)
    expect(pressed.map((item) => item.label)).toEqual(['0,85×'])
    expect(saved(form).reducerFactor).toBe(0.85)
  })

  it('test_p8_typed_09_is_valid_and_no_button_pressed', () => {
    const form = moj({ reducerFactor: '0,9' })
    expect(reducerButtons(form).some((item) => item.pressed)).toBe(false)
    expect(errors(form)).toEqual([])
    expect(saved(form).reducerFactor).toBe(0.9)
  })

  it('test_p8_value_1_presses_only_1_0', () => {
    // Profil z 6.4 ma mnożnik 1: zaznaczony jest przycisk o tej wartości (reguła P8).
    expect(reducerButtons(moj()).filter((item) => item.pressed).map((item) => item.label)).toEqual(['1,0×'])
  })
})

describe('błędy i ostrzeżenia (T19)', () => {
  it('test_p9_aperture_0', () => {
    const form = moj({ apertureMm: '0' })
    expect(errors(form)).toEqual(['Apertura: dozwolony zakres 5–1500 mm'])
    expect(issuesAt(form, 'apertureMm').map((issue) => issue.severity)).toEqual(['error'])
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('test_p9_pixel_0_5', () => {
    const form = moj({ pixelSizeUm: '0,5' })
    expect(errors(form)).toEqual(['Rozmiar piksela: dozwolony zakres 1–30 µm'])
    expect(issuesAt(form, 'pixelSizeUm').map((issue) => issue.message)).toEqual([
      'Rozmiar piksela: dozwolony zakres 1–30 µm',
    ])
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('test_p9_reducer_4', () => {
    const form = moj({ reducerFactor: '4' })
    expect(errors(form)).toEqual(['Mnożnik: dozwolony zakres 0,3–3 ×'])
    expect(issuesAt(form, 'reducerFactor')).toHaveLength(1)
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('test_p9_resolution_x_not_integer', () => {
    const form = moj({ resolutionXPx: '1000,5' })
    expect(errors(form)).toEqual(['Rozdzielczość X: wpisz liczbę całkowitą'])
    expect(issuesAt(form, 'resolutionXPx')).toHaveLength(1)
    expect(readProfileForm(form).profile).toBeNull()
  })

  it.each(['', 'abc', '10 000'])('test_p9_focal_%j_is_not_a_number', (text) => {
    const form = moj({ focalLengthMm: text })
    expect(errors(form)).toEqual(['Ogniskowa: wpisz liczbę'])
    expect(issuesAt(form, 'focalLengthMm').map((issue) => issue.severity)).toEqual(['error'])
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('test_p10_unusual_focal_ratio_warning_does_not_block', () => {
    const form = moj({ apertureMm: '500', focalLengthMm: '400' })
    expect(warnings(form)).toEqual([
      {
        field: 'focalLengthMm',
        severity: 'warning',
        message: 'Nietypowa światłosiła f/0,8: sprawdź ogniskową i aperturę',
      },
    ])
    expect(errors(form)).toEqual([])
    const profile = readProfileForm(form).profile
    expect(profile?.telescope.apertureMm).toBe(500)
    expect(profile?.telescope.focalLengthMm).toBe(400)
    expect(profilePreview(form, 2.5).focalRatio).toBe('f/0,80')
  })

  it('test_p10_warning_ignores_reducer_preview_uses_it', () => {
    const form = moj({ apertureMm: '500', focalLengthMm: '400', reducerFactor: '2' })
    expect(warnings(form).map((issue) => issue.message)).toEqual([
      'Nietypowa światłosiła f/0,8: sprawdź ogniskową i aperturę',
    ])
    expect(readProfileForm(form).profile).not.toBeNull()
    expect(profilePreview(form, 2.5).focalRatio).toBe('f/1,60')
    expect(profilePreview(form, 2.5).effectiveFocalLength).toBe('800 mm')
  })

  it('test_p11_comma_and_dot_decimal_are_equal', () => {
    const comma = moj({ pixelSizeUm: '3,76' })
    const dot = moj({ pixelSizeUm: '3.76' })
    expect(saved(comma).camera.pixelSizeUm).toBe(3.76)
    expect(saved(dot).camera.pixelSizeUm).toBe(3.76)
    expect(profilePreview(dot, 2.5)).toEqual(profilePreview(comma, 2.5))
    expect(profilePreview(dot, 2.5).scale).toBe('1,293″/px')
  })

  it('test_p17_blank_profile_name', () => {
    const form = moj({ name: '   ' })
    expect(errors(form)).toEqual(['Nazwa profilu: wpisz nazwę'])
    expect(issuesAt(form, 'name').map((issue) => issue.message)).toEqual(['Nazwa profilu: wpisz nazwę'])
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('test_p17_blank_own_telescope_name', () => {
    const form = moj({ telescopeSpecId: null, telescopeLabel: '' })
    expect(errors(form)).toEqual(['Nazwa teleskopu: wpisz nazwę'])
    expect(issuesAt(form, 'telescopeLabel').map((issue) => issue.message)).toEqual(['Nazwa teleskopu: wpisz nazwę'])
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('test_p17_blank_own_camera_name', () => {
    const form = moj({ cameraSpecId: null, cameraLabel: '' })
    expect(errors(form)).toEqual(['Nazwa kamery: wpisz nazwę'])
    expect(issuesAt(form, 'cameraLabel').map((issue) => issue.message)).toEqual(['Nazwa kamery: wpisz nazwę'])
    expect(readProfileForm(form).profile).toBeNull()
  })
})

describe('niepoprawne pola w podglądzie', () => {
  it('test_p12_aperture_abc_hides_only_focal_ratio', () => {
    const preview = profilePreview(moj({ apertureMm: 'abc' }), 2.5)
    expect(preview.focalRatio).toBe('—')
    expect(preview.effectiveFocalLength).toBe('600 mm')
    expect(preview.sensor).toBe('11,31 × 11,31 mm')
    expect(preview.sensorDiagonal).toBe('15,99 mm')
    expect(preview.fieldOfViewDeg).toBe('1,080° × 1,080°')
    expect(preview.fieldOfViewArcmin).toBe('64,8′ × 64,8′')
    expect(preview.scale).toBe('1,293″/px')
    expect(preview.sampling).toBe('podpróbkowanie')
  })

  it('test_p12_pixel_abc_hides_sensor_fov_scale_sampling', () => {
    const preview = profilePreview(moj({ pixelSizeUm: 'abc' }), 2.5)
    expect(preview.sensor).toBe('—')
    expect(preview.sensorDiagonal).toBe('—')
    expect(preview.fieldOfViewDeg).toBe('—')
    expect(preview.fieldOfViewArcmin).toBe('—')
    expect(preview.scale).toBe('—')
    expect(preview.sampling).toBe('—')
    expect(preview.effectiveFocalLength).toBe('600 mm')
    expect(preview.focalRatio).toBe('f/4,00')
  })
})

describe('próbkowanie (T2) i uwaga OSC', () => {
  it('test_p13_newton_200_1000_asi533mm_oversampled', () => {
    const preview = profilePreview(formOf(NEWTON_ID), 2.5)
    expect(preview.scale).toBe('0,776″/px')
    expect(preview.sampling).toBe('nadpróbkowanie')
  })

  it('test_p13_newton_150_750_ares_m_ideal', () => {
    const preview = profilePreview(moj({ apertureMm: '150', focalLengthMm: '750' }), 2.5)
    expect(preview.scale).toBe('1,034″/px')
    expect(preview.sampling).toBe('idealne')
  })

  it('test_p13_newton_150_600_ares_m_undersampled_then_ideal_at_3', () => {
    const form = moj()
    expect(profilePreview(form, 2.5).scale).toBe('1,293″/px')
    expect(profilePreview(form, 2.5).sampling).toBe('podpróbkowanie')
    expect(profilePreview(form, 3.0).sampling).toBe('idealne')
    expect(profilePreview(form, 3.0).scale).toBe('1,293″/px')
  })

  it('test_p14_osc_camera_note', () => {
    expect(profilePreview(formOf(REDCAT_ID), 2.5).oscNote).toBe(OSC_NOTE)
    expect(profilePreview(t17(), 2.5).oscNote).toBe(OSC_NOTE)
  })

  it('test_p14_mono_camera_without_note', () => {
    const form = selectCamera(formOf(REDCAT_ID), camera('zwo-asi2600mm-pro'))
    expect(form.sensor).toBe('mono')
    expect(profilePreview(form, 2.5).oscNote).toBeNull()
  })
})

describe('profil ↔ formularz', () => {
  it.each(DEMO_PROFILES.map((profile) => [profile.id]))('test_p15_demo_profile_round_trip_%s', (id) => {
    const profile = demo(id)
    expect(readProfileForm(profileToForm(profile))).toEqual({ profile, issues: [] })
  })

  it('test_p15_focal_10000_written_without_thousands_space', () => {
    const base = demo(ESPRIT_ID)
    const profile: EquipmentProfile = {
      ...base,
      telescope: { specId: null, label: 'Ogromny', apertureMm: 1000, focalLengthMm: 10000 },
    }
    const form = profileToForm(profile)
    expect(form.focalLengthMm).toBe('10000')
    expect(form.pixelSizeUm).toBe('3,76')
    expect(saved(form)).toEqual(profile)
  })

  it('test_p15_demo_text_fields', () => {
    const form = formOf(ESPRIT_ID)
    expect(form.name).toBe('Esprit 100ED + ASI6200MM Pro')
    expect(form.apertureMm).toBe('100')
    expect(form.focalLengthMm).toBe('550')
    expect(form.pixelSizeUm).toBe('3,76')
    expect(form.resolutionXPx).toBe('9576')
    expect(form.flipMinutes).toBe('10')
    expect(form.mountType).toBe('gem')
  })
})

describe('montaż i filtry', () => {
  it('test_p18_flip_10_and_mount_types', () => {
    expect(saved(moj({ mountType: 'gem', flipMinutes: '10' })).mount).toEqual({ type: 'gem', flipMinutesAfterMeridian: 10 })
    expect(saved(moj({ mountType: 'fork', flipMinutes: '10' })).mount).toEqual({
      type: 'fork',
      flipMinutesAfterMeridian: 10,
    })
    expect(saved(moj({ mountType: 'altaz', flipMinutes: '10' })).mount).toEqual({
      type: 'altaz',
      flipMinutesAfterMeridian: 10,
    })
  })

  it.each(['-5', '90'])('test_p18_flip_%s_out_of_range', (text) => {
    const form = moj({ flipMinutes: text })
    expect(errors(form)).toEqual(['Przerzut: dozwolony zakres 0–60 min'])
    expect(issuesAt(form, 'flipMinutes').map((issue) => issue.message)).toEqual(['Przerzut: dozwolony zakres 0–60 min'])
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('test_p18_flip_range_applies_to_every_mount', () => {
    expect(errors(moj({ mountType: 'fork', flipMinutes: '90' }))).toEqual(['Przerzut: dozwolony zakres 0–60 min'])
    expect(errors(moj({ mountType: 'altaz', flipMinutes: '-5' }))).toEqual(['Przerzut: dozwolony zakres 0–60 min'])
  })

  it('test_p18_flip_range_ends_0_and_60_are_valid', () => {
    expect(saved(moj({ flipMinutes: '0' })).mount.flipMinutesAfterMeridian).toBe(0)
    expect(saved(moj({ flipMinutes: '60' })).mount.flipMinutesAfterMeridian).toBe(60)
  })

  it('test_p18_empty_filter_list_is_allowed', () => {
    const form = moj({ filters: [] })
    expect(errors(form)).toEqual([])
    expect(saved(form).filters).toEqual([])
  })

  it('test_p18_filters_saved_in_canonical_order', () => {
    const form = moj({ filters: ['DualBand', 'SII', 'L', 'OSC', 'Ha', 'B', 'OIII', 'G', 'R'] })
    expect(saved(form).filters).toEqual(['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII', 'OSC', 'DualBand'])
  })
})

describe('OAG', () => {
  const oag = (patch: Partial<ProfileForm>) =>
    moj({
      oagEnabled: true,
      oagPrismWidthMm: '8',
      oagPrismHeightMm: '6',
      oagOffsetMm: '15',
      oagAngleDeg: '90',
      ...patch,
    })

  it('test_p19_oag_off_gives_null_and_empty_fields', () => {
    const form = moj()
    expect(form.oagEnabled).toBe(false)
    expect([form.oagPrismWidthMm, form.oagPrismHeightMm, form.oagOffsetMm, form.oagAngleDeg]).toEqual(['', '', '', ''])
    expect(saved(form).oag).toBeNull()
  })

  it('test_p19_oag_off_ignores_field_text', () => {
    const form = oag({ oagEnabled: false, oagAngleDeg: '370', oagPrismWidthMm: '0' })
    expect(errors(form)).toEqual([])
    expect(saved(form).oag).toBeNull()
  })

  it('test_p19_valid_oag_8x6_15_90', () => {
    expect(saved(oag({})).oag).toEqual({ prismWidthMm: 8, prismHeightMm: 6, offsetFromCenterMm: 15, angleDeg: 90 })
  })

  it('test_p19_prism_width_0', () => {
    const form = oag({ oagPrismWidthMm: '0' })
    const issues = issuesAt(form, 'oagPrismWidthMm')
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe('error')
    expect(issues[0].message).toContain('> 0 mm')
    expect(errors(form)).toHaveLength(1)
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('test_p19_prism_height_0', () => {
    const form = oag({ oagPrismHeightMm: '0' })
    const issues = issuesAt(form, 'oagPrismHeightMm')
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe('error')
    expect(issues[0].message).toContain('> 0 mm')
    expect(errors(form)).toHaveLength(1)
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('test_p19_offset_minus_1', () => {
    const form = oag({ oagOffsetMm: '-1' })
    const issues = issuesAt(form, 'oagOffsetMm')
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe('error')
    expect(issues[0].message).toContain('≥ 0 mm')
    expect(errors(form)).toHaveLength(1)
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('test_p19_offset_0_is_valid', () => {
    expect(saved(oag({ oagOffsetMm: '0' })).oag?.offsetFromCenterMm).toBe(0)
  })

  it('test_p19_angle_370', () => {
    const form = oag({ oagAngleDeg: '370' })
    expect(errors(form)).toEqual(['Kąt OAG: dozwolony zakres 0–360°'])
    expect(issuesAt(form, 'oagAngleDeg').map((issue) => issue.message)).toEqual(['Kąt OAG: dozwolony zakres 0–360°'])
    expect(readProfileForm(form).profile).toBeNull()
  })

  it('test_p19_angle_range_ends_0_and_360_are_valid', () => {
    expect(saved(oag({ oagAngleDeg: '0' })).oag?.angleDeg).toBe(0)
    expect(saved(oag({ oagAngleDeg: '360' })).oag?.angleDeg).toBe(360)
  })
})
