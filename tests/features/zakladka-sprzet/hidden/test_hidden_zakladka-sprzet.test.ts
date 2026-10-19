// Ukryte przypadki „zakladka-sprzet”: te same reguły co w testach widocznych, inne wartości (inne zestawy, frazy,
// mnożniki, seeing i wpisy). Wartości podglądu i komunikatów spoza przykładów spec liczy model formularz-profilu
// (`profilePreview`, `readProfileForm`) – sekcja ma je tylko pokazać przy właściwym polu.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appDb } from '../../../../src/data/appDb'
import { BUILTIN_TELESCOPES } from '../../../../src/data/equipmentCatalog'
import { DEMO_PROFILES } from '../../../../src/data/demo'
import type { EquipmentKind } from '../../../../src/features/equipment/ProfileEditor'
import type { OwnEntryForm } from '../../../../src/features/equipment/OwnEquipmentList'
import { profilePreview, readProfileForm, type ProfileForm } from '../../../../src/features/equipment/profileForm'
import { DEFAULT_PLANNING_SETTINGS } from '../../../../src/services/planningSettings'
import { usePlannerStore } from '../../../../src/state/plannerStore'
import {
  CHANGED,
  DEMO_NAMES,
  DUPLICATE_BUILTIN,
  DUPLICATE_PROFILE,
  ESPRIT_ID,
  LOADING,
  MOJ_ID,
  NEWTON_ID,
  REDCAT_ID,
  REDUCER_LABELS,
  SAVE_CAMERA,
  SAVE_PROFILE,
  SAVE_TELESCOPE,
  UNSAVED,
  change,
  click,
  clickEditorButton,
  editorButtons,
  editorFor,
  elementsOf,
  formOf,
  headingWhere,
  listButtons,
  nearField,
  onlyButton,
  ownButtons,
  ownEntries,
  parseMarkup,
  partAfter,
  previewOf,
  renderEditor,
  renderOwnEdit,
  renderSettings,
  resultsOf,
  textOf,
  topBarProfile,
  until,
  userTelescope,
  visibleText,
  type EditorRender,
  type FieldKey,
  type MarkupElement,
} from '../helpers'

const isDisabled = (element: MarkupElement) => 'disabled' in element.attrs

function editorButton(r: EditorRender, text: string): MarkupElement {
  const found = elementsOf(r.root).filter((element) => element.tag === 'button' && textOf(element) === text)
  expect(found, `przyciski „${text}”`).toHaveLength(1)
  return found[0]
}

/** Oczekiwane teksty <dd> podglądu z modelu formularz-profilu (Matryca z przekątną, pole widzenia ze stopniami i minutami). */
function expectedPreview(form: ProfileForm, seeing: number): Record<string, string> {
  const p = profilePreview(form, seeing)
  const both = (a: string, b: string, join: (x: string, y: string) => string) => (a === '—' || b === '—' ? '—' : join(a, b))
  return {
    F_eff: p.effectiveFocalLength,
    'Światłosiła': p.focalRatio,
    Matryca: both(p.sensor, p.sensorDiagonal, (x, y) => `${x}, przekątna ${y}`),
    'Pole widzenia': both(p.fieldOfViewDeg, p.fieldOfViewArcmin, (x, y) => `${x} (${y})`),
    Skala: p.scale,
  }
}

describe('ukryte: lista zestawów', () => {
  it('P1 (ukryty): aktywny „Esprit 100ED + ASI6200MM Pro” → wciśnięty tylko on', () => {
    const { buttons } = listButtons({ activeId: ESPRIT_ID })
    const pressed = buttons.filter((button) => button.element.attrs['aria-pressed'] === 'true').map((button) => button.text)
    expect(pressed).toEqual(['Esprit 100ED + ASI6200MM Pro'])
  })

  it('P2 (ukryty): klik „Newton 200/1000 + ASI533MM Pro” → onSelect z jego id', () => {
    const onSelect = vi.fn<(id: string) => void>()
    click(onlyButton(listButtons({ onSelect }).buttons, 'Newton 200/1000 + ASI533MM Pro').props)
    expect(onSelect).toHaveBeenCalledWith(NEWTON_ID)
  })

  it('P4 (ukryty): pytanie o usunięcie aktywnego „RedCat 51 + ASI2600MC Pro”', () => {
    expect(visibleText(listButtons({ activeId: REDCAT_ID, confirmRemove: true }).markup)).toContain('Usunąć „RedCat 51 + ASI2600MC Pro”?')
  })
})

describe('ukryte: wyszukiwarki i źródła', () => {
  it('P5 (ukryty): „redcat” → „Własny” i trzy RedCaty z aperturą i ogniskową', () => {
    const r = renderEditor({ telescopeQuery: 'redcat' })
    const results = resultsOf(r.root, 'Własny')
    expect(results.name).toBe('Wyniki: teleskopy')
    expect(results.labels).toEqual([
      'Własny',
      'William Optics RedCat 51 — 51/250 mm',
      'William Optics RedCat 61 — 61/300 mm',
      'William Optics RedCat 71 — 71/350 mm',
    ])
  })

  it('P5 (ukryty): klik „William Optics RedCat 61 — 61/300 mm” → nazwa, 61, 300; pole szukania czyszczone', () => {
    const form = formOf(NEWTON_ID)
    const onFormChange = vi.fn<(form: ProfileForm) => void>()
    const onQueryChange = vi.fn<(kind: EquipmentKind, query: string) => void>()
    clickEditorButton(editorFor(NEWTON_ID, {}, { telescopeQuery: 'redcat', onFormChange, onQueryChange }), 'William Optics RedCat 61 — 61/300 mm')
    expect(onFormChange).toHaveBeenCalledWith({
      ...form,
      telescopeSpecId: 'william-optics-redcat-61',
      telescopeLabel: 'William Optics RedCat 61',
      apertureMm: '61',
      focalLengthMm: '300',
    })
    expect(onQueryChange).toHaveBeenCalledWith('telescope', '')
  })

  it('P5 (ukryty): „asi2600mm” w „Szukaj kamery” → „Własna” i „ZWO ASI2600MM Pro — 6248 × 4176 px, 3,76 µm, mono”', () => {
    const r = renderEditor({ cameraQuery: 'asi2600mm' })
    expect(resultsOf(r.root, 'Własna').labels).toEqual(['Własna', 'ZWO ASI2600MM Pro — 6248 × 4176 px, 3,76 µm, mono'])
  })

  it('P6 (ukryty): własny „Żuraw 70” pasuje do „żuraw” jako „Żuraw 70 — 70/420 mm (mój)”', () => {
    const zuraw = userTelescope('teleskop-zuraw', 'Żuraw 70', 70, 420)
    const r = renderEditor({ telescopes: [...BUILTIN_TELESCOPES, zuraw], telescopeQuery: 'żuraw' })
    expect(resultsOf(r.root, 'Własny').labels).toEqual(['Własny', 'Żuraw 70 — 70/420 mm (mój)'])
  })

  it('P6 (ukryty): RedCat z katalogu → „Z katalogu: William Optics RedCat 51”', () => {
    expect(renderEditor(editorFor(REDCAT_ID)).text).toContain('Z katalogu: William Optics RedCat 51')
  })

  it('P7 (ukryty): RedCat 51 z aperturą „60” → „zmienione” przy Aperturze, nie przy Ogniskowej', () => {
    const r = renderEditor(editorFor(REDCAT_ID, { apertureMm: '60' }))
    expect(nearField(r.root, [r.field('apertureMm')], CHANGED)).toBe(true)
    expect(nearField(r.root, [r.field('focalLengthMm')], CHANGED)).toBe(false)
  })

  it('P7 (ukryty): ASI2600MC Pro z pikselem „4” → „zmienione” przy Rozmiarze piksela', () => {
    const r = renderEditor(editorFor(REDCAT_ID, { pixelSizeUm: '4' }))
    expect(nearField(r.root, [r.field('pixelSizeUm')], CHANGED)).toBe(true)
    expect(nearField(r.root, [r.field('resolutionXPx')], CHANGED)).toBe(false)
  })

  it('P19 (ukryty): RedCat 51 + ASI2600MC Pro → „Duplikuj jako własny” dla RedCat 51 i dla ASI2600MC Pro', () => {
    const onDuplicateBuiltin = vi.fn<(kind: EquipmentKind, id: string) => void>()
    const buttons = editorButtons(editorFor(REDCAT_ID, {}, { onDuplicateBuiltin })).buttons.filter((button) => button.text === DUPLICATE_BUILTIN)
    expect(buttons).toHaveLength(2)
    click(buttons[0].props)
    click(buttons[1].props)
    expect(onDuplicateBuiltin.mock.calls).toEqual([
      ['telescope', 'william-optics-redcat-51'],
      ['camera', 'zwo-asi2600mc-pro'],
    ])
  })
})

describe('ukryte: mnożnik, błędy, podgląd', () => {
  const pressedLabels = (r: EditorRender) =>
    elementsOf(r.root)
      .filter((element) => element.tag === 'button' && REDUCER_LABELS.includes(textOf(element)))
      .filter((element) => element.attrs['aria-pressed'] === 'true')
      .map((element) => textOf(element))

  it('P8 (ukryty): Mnożnik „0,7” → wciśnięty tylko „0,7×”; „0,73” → tylko „0,73×”', () => {
    expect(pressedLabels(renderEditor({ form: formOf(MOJ_ID, { reducerFactor: '0,7' }) }))).toEqual(['0,7×'])
    expect(pressedLabels(renderEditor({ form: formOf(MOJ_ID, { reducerFactor: '0,73' }) }))).toEqual(['0,73×'])
  })

  it('P8 (ukryty): klik „0,63×” przy RedCat → Mnożnik „0,63”', () => {
    const onFormChange = vi.fn<(form: ProfileForm) => void>()
    clickEditorButton(editorFor(REDCAT_ID, {}, { onFormChange }), '0,63×')
    expect(onFormChange).toHaveBeenCalledWith(formOf(REDCAT_ID, { reducerFactor: '0,63' }))
  })

  const errorCases: [Partial<ProfileForm>, FieldKey, string][] = [
    [{ resolutionYPx: '2,5' }, 'resolutionYPx', 'Rozdzielczość Y: wpisz liczbę całkowitą'],
    [{ telescopeLabel: '' }, 'telescopeLabel', 'Nazwa teleskopu: wpisz nazwę'],
    [{ apertureMm: '2000' }, 'apertureMm', 'Apertura: dozwolony zakres 5–1500 mm'],
  ]
  for (const [patch, key, message] of errorCases) {
    it(`P9 (ukryty): ${JSON.stringify(patch)} → „${message}” przy polu z aria-invalid; zapis zablokowany`, () => {
      const r = renderEditor(editorFor(REDCAT_ID, patch))
      expect(nearField(r.root, [r.field(key)], message)).toBe(true)
      expect(r.field(key).attrs['aria-invalid']).toBe('true')
      expect(isDisabled(editorButton(r, SAVE_PROFILE))).toBe(true)
    })
  }

  it('P10 (ukryty): Apertura „400”, Ogniskowa „300” → ostrzeżenie (z formularz-profilu) przy Ogniskowej, zapis aktywny', () => {
    const form = formOf(REDCAT_ID, { apertureMm: '400', focalLengthMm: '300' })
    const warning = readProfileForm(form).issues.find((issue) => issue.severity === 'warning' && issue.field === 'focalLengthMm')
    expect(warning).toBeDefined()
    const r = renderEditor(editorFor(REDCAT_ID, { apertureMm: '400', focalLengthMm: '300' }))
    expect(nearField(r.root, [r.field('focalLengthMm')], warning?.message ?? '?')).toBe(true)
    expect(r.field('focalLengthMm').attrs['aria-invalid']).not.toBe('true')
    expect(isDisabled(editorButton(r, SAVE_PROFILE))).toBe(false)
  })

  it('P11 (ukryty): RedCat 51 + ASI2600MC Pro z mnożnikiem „0,8” i binningiem 2 → teksty podglądu z modelu; uwaga OSC', () => {
    const form = formOf(REDCAT_ID, { reducerFactor: '0,8', binning: 2 })
    const r = renderEditor(editorFor(REDCAT_ID, { reducerFactor: '0,8', binning: 2 }))
    const { values } = previewOf(r.root)
    expect(values).toMatchObject(expectedPreview(form, 2.5))
    expect(r.text).toContain('Kamera kolorowa (OSC): efektywna rozdzielczość jest niższa, niż wynika ze skali.')
  })

  it('P12 (ukryty): Ogniskowa „abc” → „—” w F_eff, Światłosile, Polu widzenia, Skali, Próbkowaniu; Matryca zostaje', () => {
    const { values } = previewOf(renderEditor(editorFor(REDCAT_ID, { focalLengthMm: 'abc' })).root)
    expect([values.F_eff, values['Światłosiła'], values['Pole widzenia'], values.Skala, values['Próbkowanie']]).toEqual(['—', '—', '—', '—', '—'])
    expect(values.Matryca).toBe(expectedPreview(formOf(REDCAT_ID), 2.5).Matryca)
  })

  it('P13 (ukryty): seeing 1,5″ → próbkowanie z modelu i „(seeing 1,5″)”', () => {
    const sampling = profilePreview(formOf(ESPRIT_ID), 1.5).sampling
    const { values } = previewOf(renderEditor(editorFor(ESPRIT_ID, {}, { seeingArcsec: 1.5 })).root)
    expect(values['Próbkowanie']).toBe(`${sampling} (seeing 1,5″)`)
  })

  it('P14 (ukryty): „Newton 200/1000 + ASI533MM Pro” → filtry L, R, G, B, Ha, OIII, SII zaznaczone, OSC i DualBand nie', () => {
    const r = renderEditor(editorFor(NEWTON_ID))
    const checked = ['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII', 'OSC', 'DualBand'].filter((id) => 'checked' in r.field(`filters:${id}`).attrs)
    expect(checked).toEqual(['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII'])
  })

  it('P15 (ukryty): RedCat bez filtra DualBand → „Niezapisane zmiany”; RedCat bez zmian → brak', () => {
    expect(renderEditor(editorFor(REDCAT_ID, { filters: ['OSC'] })).text).toContain(UNSAVED)
    expect(renderEditor(editorFor(REDCAT_ID)).text).not.toContain(UNSAVED)
  })

  it('P18 (ukryty): pusta Rozdzielczość X → „Zapisz jako moją kamerę” nieaktywny, „Zapisz jako mój teleskop” aktywny', () => {
    const r = renderEditor(editorFor(REDCAT_ID, { resolutionXPx: '' }))
    expect(isDisabled(editorButton(r, SAVE_CAMERA))).toBe(true)
    expect(isDisabled(editorButton(r, SAVE_TELESCOPE))).toBe(false)
  })
})

describe('ukryte: „Mój sprzęt”', () => {
  const entries = [userTelescope('t-a', 'Alfa 60', 60, 360), userTelescope('t-b', 'Beta 90', 90, 900)]

  it('P20 (ukryty): wpisy pokazują nazwę, aperturę i ogniskową; „Edytuj” drugiego → onEdit z jego id', () => {
    const onEdit = vi.fn<(kind: EquipmentKind, id: string) => void>()
    const { markup, buttons } = ownButtons({ telescopes: entries, cameras: [], onEdit })
    const texts = ownEntries(parseMarkup(markup)).map((entry) => entry.text)
    expect(texts[0]).toContain('Alfa 60 — 60/360 mm')
    expect(texts[1]).toContain('Beta 90 — 90/900 mm')
    click(buttons.filter((button) => button.text === 'Edytuj')[1].props)
    expect(onEdit).toHaveBeenCalledWith('telescope', 't-b')
  })

  it('P20 (ukryty): wpisy jeszcze się wczytują → „Wczytywanie własnych wpisów…”, bez listy wpisów', () => {
    const { markup } = ownButtons({ telescopes: null, cameras: null })
    expect(visibleText(markup)).toContain(LOADING)
    expect(ownEntries(parseMarkup(markup))).toEqual([])
  })

  it('P21 (ukryty): edycja „Beta 90”, Apertura „2000” → komunikat przy polu, „Zapisz wpis” nieaktywny; Ogniskowa „950” → onEditChange', () => {
    const editForm: OwnEntryForm = { name: 'Beta 90', apertureMm: '2000', focalLengthMm: '900' }
    const { root, fields, inputs, onEditChange } = renderOwnEdit({ telescopes: entries, cameras: [], editing: { kind: 'telescope', id: 't-b' }, editForm })
    expect(nearField(root, [fields.apertureMm], 'Apertura: dozwolony zakres 5–1500 mm')).toBe(true)
    const save = elementsOf(root).filter((element) => element.tag === 'button' && textOf(element) === 'Zapisz wpis')
    expect(save).toHaveLength(1)
    expect(isDisabled(save[0])).toBe(true)
    change(inputs.focalLengthMm, '950')
    expect(onEditChange).toHaveBeenLastCalledWith({ ...editForm, focalLengthMm: '950' })
  })

  it('P21 (ukryty): pytanie „Usunąć wpis „Alfa 60”? Zestawy zachowają swoje wartości.”', () => {
    const { markup } = ownButtons({ telescopes: entries, cameras: [], confirmRemove: { kind: 'telescope', id: 't-a' } })
    expect(visibleText(markup)).toContain('Usunąć wpis „Alfa 60”? Zestawy zachowają swoje wartości.')
  })
})

describe('ukryte: zakładka Ustawienia', () => {
  beforeEach(async () => {
    await appDb.settings.clear()
    usePlannerStore.setState({ profiles: structuredClone(DEMO_PROFILES), activeProfileId: MOJ_ID, planningSettings: DEFAULT_PLANNING_SETTINGS })
  })

  const zestawy = () => {
    const { root, buttons } = renderSettings()
    const part = partAfter(root, headingWhere(root, (text) => text === 'Zestawy', '„Zestawy”'))
    return buttons.filter((button) => part.includes(button.element))
  }

  it('P2 (ukryty): klik „Esprit 100ED + ASI6200MM Pro” na liście → aktywny w stanie i na górnym pasku; nagłówek edytora', () => {
    click(onlyButton(zestawy(), 'Esprit 100ED + ASI6200MM Pro').props)
    expect(usePlannerStore.getState().activeProfileId).toBe(ESPRIT_ID)
    expect(topBarProfile().selected).toBe('Esprit 100ED + ASI6200MM Pro')
    const { root } = renderSettings()
    expect(textOf(headingWhere(root, (text) => text.startsWith('Edycja zestawu:'), 'edytora'))).toBe('Edycja zestawu: Esprit 100ED + ASI6200MM Pro')
  })

  it('P3 (ukryty): „Duplikuj zestaw” przy aktywnym „Newton 200/1000 + ASI533MM Pro” → „Newton 200/1000 + ASI533MM Pro (kopia)” na końcu', async () => {
    usePlannerStore.getState().selectProfile(NEWTON_ID)
    click(onlyButton(zestawy(), DUPLICATE_PROFILE).props)
    await until(() => usePlannerStore.getState().profiles.length === 5)
    expect(usePlannerStore.getState().profiles.map((profile) => profile.name)).toEqual([...DEMO_NAMES, 'Newton 200/1000 + ASI533MM Pro (kopia)'])
    expect(usePlannerStore.getState().activeProfileId).toBe(NEWTON_ID)
  })

  it('P13 (ukryty): seeing 2″ w parametrach planowania → próbkowanie RedCata z modelu i „(seeing 2″)”', async () => {
    await usePlannerStore.getState().savePlanningSettings({ ...DEFAULT_PLANNING_SETTINGS, seeingArcsec: 2 })
    usePlannerStore.getState().selectProfile(REDCAT_ID)
    const sampling = profilePreview(formOf(REDCAT_ID), 2).sampling
    expect(previewOf(renderSettings().root).values['Próbkowanie']).toBe(`${sampling} (seeing 2″)`)
  })
})
