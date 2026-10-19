// Sekcja „Sprzęt” – komponenty prezentacyjne (render w Node bez DOM): lista zestawów (ProfileList), edytor zestawu
// (ProfileEditor) i „Mój sprzęt” (OwnEquipmentList). Liczby, komunikaty walidacji, wyniki wyszukiwania i oznaczenia
// „zmienione” liczy model z formularz-profilu, a własne wpisy – userEquipment.ts z wlasny-sprzet (tu na bazie
// fake-indexeddb). Testy sprawdzają, że to widać w interfejsie przy właściwym polu. Nazwy props opisuje helpers.ts.
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from '../../../src/data/equipmentCatalog'
import { openPlannerDb, type PlannerDb } from '../../../src/data/db'
import { DEMO_PROFILES } from '../../../src/data/demo'
import type { EquipmentKind, EquipmentMessage } from '../../../src/features/equipment/ProfileEditor'
import type { OwnEntryForm } from '../../../src/features/equipment/OwnEquipmentList'
import { profileToForm, type ProfileForm } from '../../../src/features/equipment/profileForm'
import {
  duplicateCamera,
  duplicateTelescope,
  editUserTelescope,
  listUserCameras,
  listUserTelescopes,
  removeUserTelescope,
  saveAsMyTelescope,
} from '../../../src/features/equipment/userEquipment'
import type { EquipmentProfile, TelescopeSpec } from '../../../src/types'
import {
  ADD_PROFILE,
  ARES_M,
  ASI6200MM,
  CHANGED,
  DASH,
  DEMO_NAMES,
  DISCARD_PROFILE,
  DUPLICATE_BUILTIN,
  DUPLICATE_PROFILE,
  ESPRIT_100,
  ESPRIT_ID,
  FILTER_LABELS,
  LAST_PROFILE,
  LOADING,
  MANUAL,
  MOJ_ID,
  NEWTON_ID,
  NO_ENTRIES,
  OSC_NOTE,
  PREVIEW_TERMS,
  READ_ONLY,
  REDCAT_ID,
  REDUCER_LABELS,
  REMOVE_PROFILE,
  SAVE_CAMERA,
  SAVE_PROFILE,
  SAVE_TELESCOPE,
  UNSAVED,
  builtinCamera,
  change,
  chosenText,
  classesOf,
  click,
  clickEditorButton,
  colorsOutsideTokens,
  commonAncestor,
  controlsWithoutClass,
  demo,
  editorButtons,
  editorFor,
  elementsOf,
  fieldLabel,
  fieldsIn,
  formOf,
  groupLabel,
  labelStartsWith,
  listButtons,
  messageElements,
  minHeightPx,
  nearField,
  onlyButton,
  optionTexts,
  orderOf,
  ownButtons,
  ownEntries,
  parseMarkup,
  previewOf,
  renderEditor,
  renderOwnEdit,
  resultsOf,
  textOf,
  userTelescope,
  visibleText,
  type EditorRender,
  type FieldKey,
  type MarkupElement,
} from './helpers'

// ---------- Baza dla własnych wpisów (wlasny-sprzet) ----------

let db: PlannerDb | null = null
let counter = 0

function freshDb(): PlannerDb {
  counter += 1
  db = openPlannerDb(`zakladka-sprzet-${counter}`)
  return db
}

afterEach(() => {
  db?.close()
  db = null
})

// ---------- Narzędzia ----------

const TELESCOPE_FIELDS: FieldKey[] = ['telescopeLabel', 'apertureMm', 'focalLengthMm']
const CAMERA_FIELDS: FieldKey[] = ['cameraLabel', 'resolutionXPx', 'resolutionYPx', 'pixelSizeUm']

const value = (r: EditorRender, key: FieldKey) => r.field(key).attrs.value ?? ''
const fieldsOf = (r: EditorRender, keys: readonly FieldKey[]) => keys.flatMap((key) => r.fields.get(key) ?? [])
const isDisabled = (element: MarkupElement) => 'disabled' in element.attrs
const pressed = (element: MarkupElement) => element.attrs['aria-pressed']

/** Przycisk edytora (element w znacznikach) o tekście `text`. */
function editorButton(r: EditorRender, text: string): MarkupElement {
  const found = elementsOf(r.root).filter((element) => element.tag === 'button' && textOf(element) === text)
  expect(found, `przyciski „${text}”`).toHaveLength(1)
  return found[0]
}

/**
 * Element (napis albo przycisk) należy do grupy pól `own`: najmniejszy wspólny przodek z polem grupy nie zawiera pól
 * drugiej grupy (`other`).
 */
function inGroup(r: EditorRender, element: MarkupElement, own: readonly FieldKey[], other: readonly FieldKey[]): boolean {
  const otherFields = fieldsOf(r, other)
  const common = commonAncestor(element, r.field(own[1]))
  return common !== null && fieldsIn(common).every((field) => !otherFields.includes(field))
}

/** Jedyny najmniejszy element z tekstem `text`. */
function textElement(root: MarkupElement, text: string): MarkupElement {
  const found = messageElements(root, text)
  expect(found, `elementy z tekstem „${text}”`).toHaveLength(1)
  return found[0]
}

/** Napis źródła stoi nad polami swojej grupy: przed polami liczbowymi grupy i przy jej polach. */
function sourceAbove(r: EditorRender, text: string, own: readonly FieldKey[], other: readonly FieldKey[]): boolean {
  const element = textElement(r.root, text)
  return orderOf(r.root, element) < orderOf(r.root, r.field(own[1])) && inGroup(r, element, own, other)
}

/** Formularz „Mój zestaw” z teleskopem Esprit 100ED i kamerą ASI6200MM Pro wybranymi z wyszukiwarek (P5). */
function espritAsiForm(patch: Partial<ProfileForm> = {}): ProfileForm {
  return formOf(MOJ_ID, {
    telescopeSpecId: ESPRIT_100,
    telescopeLabel: 'Sky-Watcher Esprit 100ED',
    apertureMm: '100',
    focalLengthMm: '550',
    cameraSpecId: ASI6200MM,
    cameraLabel: 'ZWO ASI6200MM Pro',
    sensor: 'mono',
    resolutionXPx: '9576',
    resolutionYPx: '6388',
    pixelSizeUm: '3,76',
    ...patch,
  })
}

/** Zestaw T17: 80/480, mnożnik „0,8”, 4144 × 2822, piksel „4,63”, OSC, binning 1 (wpisy ręczne). */
function t17Form(patch: Partial<ProfileForm> = {}): ProfileForm {
  return formOf(MOJ_ID, {
    telescopeSpecId: null,
    telescopeLabel: 'T17',
    apertureMm: '80',
    focalLengthMm: '480',
    reducerFactor: '0,8',
    cameraSpecId: null,
    cameraLabel: 'T17',
    resolutionXPx: '4144',
    resolutionYPx: '2822',
    pixelSizeUm: '4,63',
    sensor: 'osc',
    binning: 1,
    ...patch,
  })
}

const NEWTON_80: TelescopeSpec = userTelescope('teleskop-moj-newton-80', 'Mój Newton 80/480', 80, 480)

// ---------- P1–P4 lista zestawów ----------

describe('P1–P4 lista zestawów (ProfileList)', () => {
  it('P1: 4 przyciski zestawów w kolejności z 6.4 z aria-pressed; „Dodaj/Duplikuj/Usuń zestaw” bez aria-pressed; wciśnięty tylko „Mój zestaw”', () => {
    const { buttons } = listButtons()
    const profileButtons = buttons.filter((button) => DEMO_NAMES.includes(button.text))
    expect(profileButtons.map((button) => button.text)).toEqual(DEMO_NAMES)
    expect(profileButtons.map((button) => pressed(button.element))).toEqual(['true', 'false', 'false', 'false'])
    for (const text of [ADD_PROFILE, DUPLICATE_PROFILE, REMOVE_PROFILE]) {
      expect(onlyButton(buttons, text).element.attrs['aria-pressed'], text).toBeUndefined()
    }
  })

  it('P1: aktywny „Newton 200/1000 + ASI533MM Pro” → wciśnięty tylko on', () => {
    const { buttons } = listButtons({ activeId: NEWTON_ID })
    const profileButtons = buttons.filter((button) => DEMO_NAMES.includes(button.text))
    expect(profileButtons.filter((button) => pressed(button.element) === 'true').map((button) => button.text)).toEqual([
      'Newton 200/1000 + ASI533MM Pro',
    ])
  })

  it('P2: klik „RedCat 51 + ASI2600MC Pro” → onSelect z id tego zestawu', () => {
    const onSelect = vi.fn<(id: string) => void>()
    click(onlyButton(listButtons({ onSelect }).buttons, 'RedCat 51 + ASI2600MC Pro').props)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(REDCAT_ID)
  })

  it('P3: „Dodaj zestaw” → onAdd; „Duplikuj zestaw” → onDuplicate (bez zmiany aktywnego)', () => {
    const onAdd = vi.fn<() => void>()
    const onDuplicate = vi.fn<() => void>()
    const onSelect = vi.fn<(id: string) => void>()
    const { buttons } = listButtons({ activeId: REDCAT_ID, onAdd, onDuplicate, onSelect })
    click(onlyButton(buttons, ADD_PROFILE).props)
    click(onlyButton(buttons, DUPLICATE_PROFILE).props)
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onDuplicate).toHaveBeenCalledTimes(1)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('P3: lista z „Nowy zestaw” i „RedCat 51 + ASI2600MC Pro (kopia)” na końcu → przyciski na końcu, aktywny bez zmian', () => {
    const profiles: EquipmentProfile[] = [
      ...DEMO_PROFILES,
      { ...demo(MOJ_ID), id: 'profil-nowy', name: 'Nowy zestaw' },
      { ...demo(REDCAT_ID), id: 'profil-kopia', name: 'RedCat 51 + ASI2600MC Pro (kopia)' },
    ]
    const { buttons } = listButtons({ profiles, activeId: REDCAT_ID })
    const names = [...DEMO_NAMES, 'Nowy zestaw', 'RedCat 51 + ASI2600MC Pro (kopia)']
    const profileButtons = buttons.filter((button) => names.includes(button.text))
    expect(profileButtons.map((button) => button.text)).toEqual(names)
    expect(profileButtons.filter((button) => pressed(button.element) === 'true').map((button) => button.text)).toEqual([
      'RedCat 51 + ASI2600MC Pro',
    ])
  })

  it('P3: błąd „Nie udało się dodać zestawu: <przyczyna>” i „Nie udało się zduplikować zestawu: <przyczyna>” są widoczne', () => {
    for (const error of ['Nie udało się dodać zestawu: baza niedostępna', 'Nie udało się zduplikować zestawu: baza niedostępna']) {
      const { markup, buttons } = listButtons({ error })
      expect(visibleText(markup)).toContain(error)
      expect(buttons.filter((button) => DEMO_NAMES.includes(button.text))).toHaveLength(4)
    }
  })

  it('P4: „Usuń zestaw” → onRemoveRequest (bez usuwania)', () => {
    const onRemoveRequest = vi.fn<() => void>()
    const onRemoveConfirm = vi.fn<() => void>()
    click(onlyButton(listButtons({ activeId: ESPRIT_ID, onRemoveRequest, onRemoveConfirm }).buttons, REMOVE_PROFILE).props)
    expect(onRemoveRequest).toHaveBeenCalledTimes(1)
    expect(onRemoveConfirm).not.toHaveBeenCalled()
  })

  it('P4: pytanie „Usunąć „Esprit 100ED + ASI6200MM Pro”?” z „Usuń” i „Anuluj”; „Anuluj” → onRemoveCancel, „Usuń” → onRemoveConfirm', () => {
    const onRemoveConfirm = vi.fn<() => void>()
    const onRemoveCancel = vi.fn<() => void>()
    const { markup, buttons } = listButtons({ activeId: ESPRIT_ID, confirmRemove: true, onRemoveConfirm, onRemoveCancel })
    expect(visibleText(markup)).toContain('Usunąć „Esprit 100ED + ASI6200MM Pro”?')
    click(onlyButton(buttons, 'Anuluj').props)
    expect(onRemoveCancel).toHaveBeenCalledTimes(1)
    expect(onRemoveConfirm).not.toHaveBeenCalled()
    click(onlyButton(buttons, 'Usuń').props)
    expect(onRemoveConfirm).toHaveBeenCalledTimes(1)
  })

  it('P4: bez pytania nie ma tekstu „Usunąć …?”', () => {
    expect(visibleText(listButtons({ activeId: ESPRIT_ID }).markup)).not.toContain('Usunąć')
  })

  it('P4: 1 zestaw → „Usuń zestaw” nieaktywny z title „Ostatniego zestawu nie można usunąć”; przy 4 aktywny', () => {
    const single = onlyButton(listButtons({ profiles: [demo(MOJ_ID)], canRemove: false }).buttons, REMOVE_PROFILE).element
    expect(isDisabled(single)).toBe(true)
    expect(single.attrs.title).toBe(LAST_PROFILE)
    expect(isDisabled(onlyButton(listButtons().buttons, REMOVE_PROFILE).element)).toBe(false)
  })

  it('P4: błąd bazy → widoczne „Nie udało się usunąć: <przyczyna>”', () => {
    expect(visibleText(listButtons({ error: 'Nie udało się usunąć: baza niedostępna' }).markup)).toContain(
      'Nie udało się usunąć: baza niedostępna',
    )
  })
})

// ---------- P2 edytor pokazuje wybrany zestaw ----------

describe('P2 edytor zestawu', () => {
  it('P2: „RedCat 51 + ASI2600MC Pro” → 51 / 250, 6248 × 4176, „3,76”, OSC', () => {
    const r = renderEditor(editorFor(REDCAT_ID))
    expect(value(r, 'apertureMm')).toBe('51')
    expect(value(r, 'focalLengthMm')).toBe('250')
    expect(value(r, 'resolutionXPx')).toBe('6248')
    expect(value(r, 'resolutionYPx')).toBe('4176')
    expect(value(r, 'pixelSizeUm')).toBe('3,76')
    expect(chosenText(r.root, r.fields.get('sensor') ?? [])).toBe('OSC')
  })

  it('P2: „Esprit 100ED + ASI6200MM Pro” → 100 / 550, 9576 × 6388, mono', () => {
    const r = renderEditor(editorFor(ESPRIT_ID))
    expect(value(r, 'apertureMm')).toBe('100')
    expect(value(r, 'focalLengthMm')).toBe('550')
    expect(value(r, 'resolutionXPx')).toBe('9576')
    expect(value(r, 'resolutionYPx')).toBe('6388')
    expect(chosenText(r.root, r.fields.get('sensor') ?? [])).toBe('mono')
  })
})

// ---------- P5–P7 wyszukiwarki i napisy źródła ----------

describe('P5 wyszukiwarki teleskopu i kamery', () => {
  it('P5: „esprit” → lista „Wyniki: teleskopy” z dokładnie 5 przyciskami ze spec', () => {
    const r = renderEditor({ telescopeQuery: 'esprit' })
    const results = resultsOf(r.root, 'Własny')
    expect(results.name).toBe('Wyniki: teleskopy')
    expect(results.labels).toEqual([
      'Własny',
      'Sky-Watcher Esprit 80ED — 80/400 mm',
      'Sky-Watcher Esprit 100ED — 100/550 mm',
      'Sky-Watcher Esprit 120ED — 120/840 mm',
      'Sky-Watcher Esprit 150ED — 150/1050 mm',
    ])
    expect(value(r, 'query:telescope')).toBe('esprit')
  })

  it('P5: wpisanie w „Szukaj teleskopu” → onQueryChange("telescope", tekst); pole ma etykietę „Szukaj teleskopu”', () => {
    const r = renderEditor()
    expect(labelStartsWith(r.root, r.field('query:telescope'), 'Szukaj teleskopu')).toBe(true)
    expect(labelStartsWith(r.root, r.field('query:camera'), 'Szukaj kamery')).toBe(true)
  })

  it('P5: klik „Sky-Watcher Esprit 100ED — 100/550 mm” → nazwa, apertura „100”, ogniskowa „550”; pole szukania czyszczone', () => {
    const form = formOf(MOJ_ID)
    const onFormChange = vi.fn<(form: ProfileForm) => void>()
    const onQueryChange = vi.fn<(kind: EquipmentKind, query: string) => void>()
    clickEditorButton({ form, telescopeQuery: 'esprit', onFormChange, onQueryChange }, 'Sky-Watcher Esprit 100ED — 100/550 mm')
    expect(onFormChange).toHaveBeenCalledTimes(1)
    expect(onFormChange).toHaveBeenCalledWith({
      ...form,
      telescopeSpecId: ESPRIT_100,
      telescopeLabel: 'Sky-Watcher Esprit 100ED',
      apertureMm: '100',
      focalLengthMm: '550',
    })
    expect(onQueryChange).toHaveBeenCalledWith('telescope', '')
  })

  it('P5: po wyborze → „Z katalogu: Sky-Watcher Esprit 100ED” nad polami teleskopu, pola 100 / 550', () => {
    const r = renderEditor({ form: espritAsiForm() })
    expect(sourceAbove(r, 'Z katalogu: Sky-Watcher Esprit 100ED', TELESCOPE_FIELDS, CAMERA_FIELDS)).toBe(true)
    expect(value(r, 'telescopeLabel')).toBe('Sky-Watcher Esprit 100ED')
    expect(value(r, 'apertureMm')).toBe('100')
    expect(value(r, 'focalLengthMm')).toBe('550')
  })

  it('P5: „asi6200mm” w „Szukaj kamery” → „Własna” i jeden wynik „ZWO ASI6200MM Pro — 9576 × 6388 px, 3,76 µm, mono”', () => {
    const r = renderEditor({ cameraQuery: 'asi6200mm' })
    expect(resultsOf(r.root, 'Własna').labels).toEqual(['Własna', 'ZWO ASI6200MM Pro — 9576 × 6388 px, 3,76 µm, mono'])
  })

  it('P5: klik wyniku kamery → 9576, 6388, „3,76”, mono; pole szukania kamery czyszczone', () => {
    const form = formOf(MOJ_ID)
    const onFormChange = vi.fn<(form: ProfileForm) => void>()
    const onQueryChange = vi.fn<(kind: EquipmentKind, query: string) => void>()
    clickEditorButton({ form, cameraQuery: 'asi6200mm', onFormChange, onQueryChange }, 'ZWO ASI6200MM Pro — 9576 × 6388 px, 3,76 µm, mono')
    expect(onFormChange).toHaveBeenCalledTimes(1)
    expect(onFormChange).toHaveBeenCalledWith({
      ...form,
      cameraSpecId: ASI6200MM,
      cameraLabel: 'ZWO ASI6200MM Pro',
      sensor: 'mono',
      resolutionXPx: '9576',
      resolutionYPx: '6388',
      pixelSizeUm: '3,76',
    })
    expect(onQueryChange).toHaveBeenCalledWith('camera', '')
  })

  it('P5: Esprit 100ED + ASI6200MM Pro → podgląd „f/5,50”, „3,750° × 2,502° (225,0′ × 150,1′)”, „1,410″/px”', () => {
    const r = renderEditor({ form: espritAsiForm() })
    const { values } = previewOf(r.root)
    expect(values['Światłosiła']).toBe('f/5,50')
    expect(values['Pole widzenia']).toBe('3,750° × 2,502° (225,0′ × 150,1′)')
    expect(values.Skala).toBe('1,410″/px')
    expect(sourceAbove(r, 'Z katalogu: ZWO ASI6200MM Pro', CAMERA_FIELDS, TELESCOPE_FIELDS)).toBe(true)
  })
})

describe('P6 pusta wyszukiwarka, własne wpisy i „Własny”', () => {
  it('P6: pusta wyszukiwarka → tylko „Własny” (kamera: tylko „Własna”)', () => {
    const r = renderEditor()
    expect(resultsOf(r.root, 'Własny').labels).toEqual(['Własny'])
    expect(resultsOf(r.root, 'Własna').labels).toEqual(['Własna'])
  })

  it('P6: „xyz123” → tylko „Własny” i tylko „Własna”', () => {
    const r = renderEditor({ telescopeQuery: 'xyz123', cameraQuery: 'xyz123' })
    expect(resultsOf(r.root, 'Własny').labels).toEqual(['Własny'])
    expect(resultsOf(r.root, 'Własna').labels).toEqual(['Własna'])
  })

  it('P6: własny „Mój Newton 80/480” pasuje do „mój newton” jako „Mój Newton 80/480 — 80/480 mm (mój)”', () => {
    const r = renderEditor({ telescopes: [...BUILTIN_TELESCOPES, NEWTON_80], telescopeQuery: 'mój newton' })
    expect(resultsOf(r.root, 'Własny').labels).toEqual(['Własny', 'Mój Newton 80/480 — 80/480 mm (mój)'])
  })

  it('P6: klik „Własny” → wpis ręczny z tymi samymi wartościami pól', () => {
    const form = espritAsiForm()
    const onFormChange = vi.fn<(form: ProfileForm) => void>()
    clickEditorButton({ form, onFormChange }, 'Własny')
    expect(onFormChange).toHaveBeenCalledTimes(1)
    expect(onFormChange).toHaveBeenCalledWith({ ...form, telescopeSpecId: null })
  })

  it('P6: po „Własny” → nad polami „Własny (wpis ręczny)”, wartości 100 / 550 zostają, bez „Z katalogu: Sky-Watcher…”', () => {
    const r = renderEditor({ form: espritAsiForm({ telescopeSpecId: null }) })
    expect(sourceAbove(r, MANUAL, TELESCOPE_FIELDS, CAMERA_FIELDS)).toBe(true)
    expect(r.text).not.toContain('Z katalogu: Sky-Watcher Esprit 100ED')
    expect(value(r, 'apertureMm')).toBe('100')
    expect(value(r, 'focalLengthMm')).toBe('550')
  })

  it('P6: zestaw z własnym wpisem → „Mój wpis: Mój Newton 80/480” nad polami teleskopu', () => {
    const form = formOf(MOJ_ID, { telescopeSpecId: NEWTON_80.id, telescopeLabel: 'Mój Newton 80/480', apertureMm: '80', focalLengthMm: '480' })
    const r = renderEditor({ form, telescopes: [...BUILTIN_TELESCOPES, NEWTON_80] })
    expect(sourceAbove(r, 'Mój wpis: Mój Newton 80/480', TELESCOPE_FIELDS, CAMERA_FIELDS)).toBe(true)
    expect(r.text).not.toContain(MANUAL)
  })
})

describe('P7 „zmienione względem katalogu”', () => {
  it('P7: Esprit 100ED z ogniskową „600” → napis przy Ogniskowej, nie przy Aperturze', () => {
    const r = renderEditor(editorFor(ESPRIT_ID, { focalLengthMm: '600' }))
    expect(nearField(r.root, [r.field('focalLengthMm')], CHANGED)).toBe(true)
    expect(nearField(r.root, [r.field('apertureMm')], CHANGED)).toBe(false)
  })

  it('P7: w wynikach „esprit” Esprit 100ED dalej ma „100/550 mm”', () => {
    const r = renderEditor(editorFor(ESPRIT_ID, { focalLengthMm: '600' }, { telescopeQuery: 'esprit' }))
    expect(resultsOf(r.root, 'Własny').labels).toContain('Sky-Watcher Esprit 100ED — 100/550 mm')
  })

  it('P7: powrót do „550” → bez napisu', () => {
    expect(renderEditor(editorFor(ESPRIT_ID, { focalLengthMm: '550' })).text).not.toContain(CHANGED)
  })

  it('P7: typ kamery mono → OSC (ASI6200MM Pro) → napis przy polu „Typ”, nie przy Ogniskowej', () => {
    const r = renderEditor(editorFor(ESPRIT_ID, { sensor: 'osc' }))
    expect(nearField(r.root, r.fields.get('sensor') ?? [], CHANGED)).toBe(true)
    expect(nearField(r.root, [r.field('focalLengthMm')], CHANGED)).toBe(false)
  })
})

// ---------- P8 mnożnik ----------

describe('P8 przyciski mnożnika', () => {
  const reducerButtons = (r: EditorRender) =>
    elementsOf(r.root).filter((element) => element.tag === 'button' && REDUCER_LABELS.includes(textOf(element)))

  it('P8: przyciski „0,63×” … „2,0×” w tej kolejności; przy mnożniku 1 wciśnięty tylko „1,0×”', () => {
    const buttons = reducerButtons(renderEditor())
    expect(buttons.map((button) => textOf(button))).toEqual(REDUCER_LABELS)
    expect(buttons.filter((button) => pressed(button) === 'true').map((button) => textOf(button))).toEqual(['1,0×'])
  })

  it('P8: klik „0,85×” → Mnożnik „0,85”', () => {
    const form = formOf(MOJ_ID)
    const onFormChange = vi.fn<(form: ProfileForm) => void>()
    clickEditorButton({ form, onFormChange }, '0,85×')
    expect(onFormChange).toHaveBeenCalledTimes(1)
    expect(onFormChange).toHaveBeenCalledWith({ ...form, reducerFactor: '0,85' })
  })

  it('P8: Mnożnik „0,85” → pole „0,85” i wciśnięty tylko „0,85×”', () => {
    const r = renderEditor({ form: formOf(MOJ_ID, { reducerFactor: '0,85' }) })
    expect(value(r, 'reducerFactor')).toBe('0,85')
    expect(reducerButtons(r).filter((button) => pressed(button) === 'true').map((button) => textOf(button))).toEqual(['0,85×'])
  })

  it('P8: wpisane „0,9” → żaden przycisk nie jest wciśnięty', () => {
    const buttons = reducerButtons(renderEditor({ form: formOf(MOJ_ID, { reducerFactor: '0,9' }) }))
    expect(buttons).toHaveLength(7)
    expect(buttons.filter((button) => pressed(button) === 'true')).toEqual([])
  })
})

// ---------- P9, P10 błędy i ostrzeżenia ----------

describe('P9 błędy pod polem', () => {
  const cases: [string, Partial<ProfileForm>, FieldKey, string][] = [
    ['Apertura „0”', { apertureMm: '0' }, 'apertureMm', 'Apertura: dozwolony zakres 5–1500 mm'],
    ['Rozdzielczość X „1000,5”', { resolutionXPx: '1000,5' }, 'resolutionXPx', 'Rozdzielczość X: wpisz liczbę całkowitą'],
    ['pusta „Nazwa profilu”', { name: '' }, 'name', 'Nazwa profilu: wpisz nazwę'],
    ['pusta „Nazwa kamery”', { cameraLabel: '' }, 'cameraLabel', 'Nazwa kamery: wpisz nazwę'],
  ]

  for (const [title, patch, key, message] of cases) {
    it(`P9: ${title} → „${message}” przy polu z aria-invalid="true"; „Zapisz zestaw” nieaktywny`, () => {
      const r = renderEditor({ form: formOf(MOJ_ID, patch) })
      expect(nearField(r.root, [r.field(key)], message)).toBe(true)
      expect(r.field(key).attrs['aria-invalid']).toBe('true')
      expect(isDisabled(editorButton(r, SAVE_PROFILE))).toBe(true)
    })
  }

  it('P9: komunikat apertury nie stoi przy Ogniskowej, a Ogniskowa nie ma aria-invalid="true"', () => {
    const r = renderEditor({ form: formOf(MOJ_ID, { apertureMm: '0' }) })
    expect(nearField(r.root, [r.field('focalLengthMm')], 'Apertura: dozwolony zakres 5–1500 mm')).toBe(false)
    expect(r.field('focalLengthMm').attrs['aria-invalid']).not.toBe('true')
  })
})

describe('P10 ostrzeżenia nie blokują zapisu', () => {
  it('P10: Apertura „500”, Ogniskowa „400” → ostrzeżenie o f/0,8 pod Ogniskową, bez aria-invalid; „Zapisz zestaw” aktywny', () => {
    const r = renderEditor({ form: formOf(MOJ_ID, { apertureMm: '500', focalLengthMm: '400' }) })
    const warning = 'Nietypowa światłosiła f/0,8: sprawdź ogniskową i aperturę'
    expect(nearField(r.root, [r.field('focalLengthMm')], warning)).toBe(true)
    expect(r.field('focalLengthMm').attrs['aria-invalid']).not.toBe('true')
    expect(r.field('apertureMm').attrs['aria-invalid']).not.toBe('true')
    expect(isDisabled(editorButton(r, SAVE_PROFILE))).toBe(false)
  })

  it('P10: klik „Zapisz zestaw” przy ostrzeżeniu → onSave', () => {
    const onSave = vi.fn<() => void>()
    clickEditorButton({ form: formOf(MOJ_ID, { apertureMm: '500', focalLengthMm: '400' }), onSave }, SAVE_PROFILE)
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('P10: kamera 9576 px, piksel „7” → pod Rozmiarem piksela ostrzeżenie o 67,03 mm; zapis możliwy', () => {
    const r = renderEditor(editorFor(ESPRIT_ID, { pixelSizeUm: '7' }))
    const warning = 'Dłuższy bok matrycy ma 67,03 mm: sprawdź rozmiar piksela i rozdzielczość'
    expect(nearField(r.root, [r.field('pixelSizeUm')], warning)).toBe(true)
    expect(r.field('pixelSizeUm').attrs['aria-invalid']).not.toBe('true')
    expect(isDisabled(editorButton(r, SAVE_PROFILE))).toBe(false)
  })
})

// ---------- P11–P13 podgląd ----------

describe('P11–P13 podgląd na żywo', () => {
  it('P11: podgląd to <dl>; każdy <dt> (F_eff … Próbkowanie) ma swój <dd>', () => {
    const { values } = previewOf(renderEditor({ form: t17Form() }).root)
    expect(Object.keys(values)).toEqual(PREVIEW_TERMS)
  })

  it('P11: zestaw T17 → „384 mm”, „f/4,80”, matryca, pole widzenia i „2,487″/px”', () => {
    const { values } = previewOf(renderEditor({ form: t17Form() }).root)
    expect(values.F_eff).toBe('384 mm')
    expect(values['Światłosiła']).toBe('f/4,80')
    expect(values.Matryca).toBe('19,19 × 13,07 mm, przekątna 23,21 mm')
    expect(values['Pole widzenia']).toBe('2,862° × 1,949° (171,7′ × 117,0′)')
    expect(values.Skala).toBe('2,487″/px')
  })

  it('P11: OSC → pod listą uwaga „Kamera kolorowa (OSC)…” (poza <dl>, po niej)', () => {
    const r = renderEditor({ form: t17Form() })
    const { list } = previewOf(r.root)
    const note = textElement(r.root, OSC_NOTE)
    expect(elementsOf(list)).not.toContain(note)
    expect(orderOf(r.root, note)).toBeGreaterThan(orderOf(r.root, list))
  })

  it('P11: binning 2 → „4,974″/px”, pole widzenia bez zmian', () => {
    const { values } = previewOf(renderEditor({ form: t17Form({ binning: 2 }) }).root)
    expect(values.Skala).toBe('4,974″/px')
    expect(values['Pole widzenia']).toBe('2,862° × 1,949° (171,7′ × 117,0′)')
  })

  it('P11: typ mono → bez uwagi OSC', () => {
    expect(renderEditor({ form: t17Form({ sensor: 'mono' }) }).text).not.toContain(OSC_NOTE)
  })

  it('P12: piksel „abc” → „—” w Matrycy, Polu widzenia, Skali i Próbkowaniu; F_eff i Światłosiła zostają', () => {
    const { values } = previewOf(renderEditor({ form: t17Form({ pixelSizeUm: 'abc' }) }).root)
    expect(values.Matryca).toBe(DASH)
    expect(values['Pole widzenia']).toBe(DASH)
    expect(values.Skala).toBe(DASH)
    expect(values['Próbkowanie']).toBe(DASH)
    expect(values.F_eff).toBe('384 mm')
    expect(values['Światłosiła']).toBe('f/4,80')
  })

  it('P12: apertura „abc” → „—” tylko w Światłosile', () => {
    const { values } = previewOf(renderEditor({ form: t17Form({ apertureMm: 'abc' }) }).root)
    expect(values['Światłosiła']).toBe(DASH)
    for (const term of PREVIEW_TERMS.filter((name) => name !== 'Światłosiła')) expect(values[term], term).not.toBe(DASH)
  })

  it('P13: „Mój zestaw” (Newton 150/600 + Ares-M Pro), seeing 2,5″ → „podpróbkowanie (seeing 2,5″)”', () => {
    const { values } = previewOf(renderEditor(editorFor(MOJ_ID, {}, { seeingArcsec: 2.5 })).root)
    expect(values['Próbkowanie']).toBe('podpróbkowanie (seeing 2,5″)')
  })

  it('P13: seeing 3 → „idealne (seeing 3″)”', () => {
    const { values } = previewOf(renderEditor(editorFor(MOJ_ID, {}, { seeingArcsec: 3 })).root)
    expect(values['Próbkowanie']).toBe('idealne (seeing 3″)')
  })

  it('P13: Newton 200/1000 + ASI533MM Pro, seeing 2,5″ → „nadpróbkowanie (seeing 2,5″)”', () => {
    const { values } = previewOf(renderEditor(editorFor(NEWTON_ID, {}, { seeingArcsec: 2.5 })).root)
    expect(values['Próbkowanie']).toBe('nadpróbkowanie (seeing 2,5″)')
  })
})

// ---------- P14 pola formularza ----------

describe('P14 pola formularza', () => {
  const TEXT_LABELS: [FieldKey, string][] = [
    ['name', 'Nazwa profilu'],
    ['telescopeLabel', 'Nazwa teleskopu'],
    ['apertureMm', 'Apertura [mm]'],
    ['focalLengthMm', 'Ogniskowa [mm]'],
    ['reducerFactor', 'Mnożnik [×]'],
    ['cameraLabel', 'Nazwa kamery'],
    ['resolutionXPx', 'Rozdzielczość X [px]'],
    ['resolutionYPx', 'Rozdzielczość Y [px]'],
    ['pixelSizeUm', 'Rozmiar piksela [µm]'],
    ['flipMinutes', 'Przerzut [min]'],
  ]

  it('P14: pola tekstowe mają etykiety ze spec (Nazwa profilu … Przerzut [min])', () => {
    const r = renderEditor()
    for (const [key, label] of TEXT_LABELS) {
      expect(labelStartsWith(r.root, r.field(key), label), `${key}: „${fieldLabel(r.root, r.field(key))}”`).toBe(true)
    }
  })

  it('P14: Typ (mono, OSC), Binning (1, 2, 3, 4), Montaż (GEM, widłowy, alt-az) – opcje i etykiety', () => {
    const r = renderEditor()
    const groups: [FieldKey, string, string[]][] = [
      ['sensor', 'Typ', ['mono', 'OSC']],
      ['binning', 'Binning', ['1', '2', '3', '4']],
      ['mountType', 'Montaż', ['GEM', 'widłowy', 'alt-az']],
    ]
    for (const [key, label, options] of groups) {
      const elements = r.fields.get(key) ?? []
      expect(elements.length, key).toBeGreaterThan(0)
      expect(groupLabel(r.root, elements).startsWith(label), `${key}: „${groupLabel(r.root, elements)}”`).toBe(true)
      expect(optionTexts(r.root, elements)).toEqual(options)
    }
  })

  it('P14: 9 pól wyboru filtrów L … DualBand; „Mój zestaw” ma zaznaczone L, R, G, B, Ha, OIII, SII', () => {
    const r = renderEditor()
    const checked = FILTER_LABELS.filter((id) => {
      const box = r.field(`filters:${id}`)
      expect(box.attrs.type).toBe('checkbox')
      expect(fieldLabel(r.root, box)).toBe(id)
      return 'checked' in box.attrs
    })
    expect(checked).toEqual(['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII'])
  })

  it('P14: „RedCat 51 + ASI2600MC Pro” ma zaznaczone tylko OSC i DualBand', () => {
    const r = renderEditor(editorFor(REDCAT_ID))
    expect(FILTER_LABELS.filter((id) => 'checked' in r.field(`filters:${id}`).attrs)).toEqual(['OSC', 'DualBand'])
  })

  it('P14: pole wyboru „OAG” odznaczone przy oag: null; zaznaczenie → oagEnabled true', () => {
    const r = renderEditor()
    const box = r.field('oagEnabled')
    expect(fieldLabel(r.root, box)).toBe('OAG')
    expect('checked' in box.attrs).toBe(false)
    expect(r.fields.has('oagPrismWidthMm')).toBe(false)
  })

  it('P14: OAG zaznaczony → puste pola „Szerokość pryzmatu [mm]”, „Wysokość pryzmatu [mm]”, „Odległość od środka matrycy [mm]”, „Kąt OAG [°]”', () => {
    const r = renderEditor({ form: formOf(MOJ_ID, { oagEnabled: true }) })
    const oag: [FieldKey, string][] = [
      ['oagPrismWidthMm', 'Szerokość pryzmatu [mm]'],
      ['oagPrismHeightMm', 'Wysokość pryzmatu [mm]'],
      ['oagOffsetMm', 'Odległość od środka matrycy [mm]'],
      ['oagAngleDeg', 'Kąt OAG [°]'],
    ]
    for (const [key, label] of oag) {
      expect(labelStartsWith(r.root, r.field(key), label), `${key}: „${fieldLabel(r.root, r.field(key))}”`).toBe(true)
      expect(value(r, key)).toBe('')
    }
    expect('checked' in r.field('oagEnabled').attrs).toBe(true)
  })
})

// ---------- P15, P16 niezapisane zmiany i zapis ----------

describe('P15, P16 niezapisane zmiany, odrzucenie i komunikat zapisu', () => {
  it('P15: bez zmian → „Zapisz zestaw” i „Odrzuć zmiany zestawu” nieaktywne, bez „Niezapisane zmiany”', () => {
    const r = renderEditor(editorFor(MOJ_ID))
    expect(isDisabled(editorButton(r, SAVE_PROFILE))).toBe(true)
    expect(isDisabled(editorButton(r, DISCARD_PROFILE))).toBe(true)
    expect(r.text).not.toContain(UNSAVED)
  })

  it('P15: Ogniskowa 600 → 610 → „Niezapisane zmiany”, oba przyciski aktywne', () => {
    const r = renderEditor(editorFor(MOJ_ID, { focalLengthMm: '610' }))
    expect(r.text).toContain(UNSAVED)
    expect(isDisabled(editorButton(r, SAVE_PROFILE))).toBe(false)
    expect(isDisabled(editorButton(r, DISCARD_PROFILE))).toBe(false)
  })

  it('P15: „Odrzuć zmiany zestawu” → onDiscard, bez zapisu', () => {
    const onDiscard = vi.fn<() => void>()
    const onSave = vi.fn<() => void>()
    clickEditorButton(editorFor(MOJ_ID, { focalLengthMm: '610' }, { onDiscard, onSave }), DISCARD_PROFILE)
    expect(onDiscard).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('P15: przyciski edytora nie nazywają się „Zapisz zmiany” ani „Odrzuć zmiany”', () => {
    const { buttons } = editorButtons(editorFor(MOJ_ID, { focalLengthMm: '610' }))
    expect(buttons.map((button) => button.text)).not.toContain('Zapisz zmiany')
    expect(buttons.map((button) => button.text)).not.toContain('Odrzuć zmiany')
  })

  it('P16: komunikat „Zapisano zestaw.” jest widoczny; zapisane 610 → bez „Niezapisane zmiany”', () => {
    const saved = { ...demo(MOJ_ID), telescope: { ...demo(MOJ_ID).telescope, focalLengthMm: 610 } }
    const message: EquipmentMessage = { kind: 'saved', text: 'Zapisano zestaw.' }
    const r = renderEditor({ saved, form: profileToForm(saved), message })
    expect(r.text).toContain('Zapisano zestaw.')
    expect(r.text).not.toContain(UNSAVED)
    expect(value(r, 'focalLengthMm')).toBe('610')
  })

  it('P16: baza niedostępna → „Nie udało się zapisać: <przyczyna>”, formularz zachowuje „610”', () => {
    const message: EquipmentMessage = { kind: 'error', text: 'Nie udało się zapisać: baza niedostępna' }
    const r = renderEditor(editorFor(MOJ_ID, { focalLengthMm: '610' }, { message }))
    expect(r.text).toContain('Nie udało się zapisać: baza niedostępna')
    expect(value(r, 'focalLengthMm')).toBe('610')
    expect(r.text).toContain(UNSAVED)
  })
})

// ---------- P18, P19 własne wpisy z edytora ----------

describe('P18 „Zapisz jako mój teleskop / moją kamerę”', () => {
  const newtonForm = (patch: Partial<ProfileForm> = {}) =>
    formOf(MOJ_ID, { telescopeSpecId: null, telescopeLabel: 'Mój Newton 80/480', apertureMm: '80', focalLengthMm: '480', reducerFactor: '0,8', ...patch })

  it('P18: „Zapisz jako mój teleskop” pod polami teleskopu, „Zapisz jako moją kamerę” pod polami kamery', () => {
    const r = renderEditor({ form: newtonForm() })
    const telescope = editorButton(r, SAVE_TELESCOPE)
    const camera = editorButton(r, SAVE_CAMERA)
    expect(inGroup(r, telescope, TELESCOPE_FIELDS, CAMERA_FIELDS)).toBe(true)
    expect(inGroup(r, camera, CAMERA_FIELDS, TELESCOPE_FIELDS)).toBe(true)
    for (const key of TELESCOPE_FIELDS) expect(orderOf(r.root, telescope), key).toBeGreaterThan(orderOf(r.root, r.field(key)))
    for (const key of CAMERA_FIELDS) expect(orderOf(r.root, camera), key).toBeGreaterThan(orderOf(r.root, r.field(key)))
  })

  it('P18: klik „Zapisz jako mój teleskop” → onSaveTelescope; „Zapisz jako moją kamerę” → onSaveCamera', () => {
    const onSaveTelescope = vi.fn<() => void>()
    const onSaveCamera = vi.fn<() => void>()
    const patch = { form: newtonForm(), onSaveTelescope, onSaveCamera }
    clickEditorButton(patch, SAVE_TELESCOPE)
    expect(onSaveTelescope).toHaveBeenCalledTimes(1)
    expect(onSaveCamera).not.toHaveBeenCalled()
    clickEditorButton(patch, SAVE_CAMERA)
    expect(onSaveCamera).toHaveBeenCalledTimes(1)
  })

  it('P18: po zapisie → „Mój sprzęt” pokazuje „Mój Newton 80/480 — 80/480 mm” (natywna ogniskowa, nie 384)', async () => {
    const base = freshDb()
    const { spec } = await saveAsMyTelescope(base, newtonForm())
    const { markup } = ownButtons({ telescopes: await listUserTelescopes(base), cameras: [] })
    const entries = ownEntries(parseMarkup(markup))
    expect(entries).toHaveLength(1)
    expect(entries[0].text).toContain('Mój Newton 80/480 — 80/480 mm')
    expect(visibleText(markup)).not.toContain('384')
    expect(spec.focalLengthMm).toBe(480)
  })

  it('P18: po zapisie formularz → „Mój wpis: Mój Newton 80/480”, bez „zmienione”, z „Niezapisane zmiany”', async () => {
    const base = freshDb()
    const { form } = await saveAsMyTelescope(base, newtonForm())
    const telescopes = [...BUILTIN_TELESCOPES, ...(await listUserTelescopes(base))]
    const message: EquipmentMessage = { kind: 'saved', text: 'Zapisano „Mój Newton 80/480” jako mój teleskop.' }
    const r = renderEditor({ form, saved: demo(MOJ_ID), telescopes, message })
    expect(sourceAbove(r, 'Mój wpis: Mój Newton 80/480', TELESCOPE_FIELDS, CAMERA_FIELDS)).toBe(true)
    expect(r.text).not.toContain(CHANGED)
    expect(r.text).toContain(UNSAVED)
    expect(r.text).toContain('Zapisano „Mój Newton 80/480” jako mój teleskop.')
  })

  it('P18: ponowny zapis z nazwą „Mój Newton 2” → dwa wpisy w „Mój sprzęt”', async () => {
    const base = freshDb()
    const first = await saveAsMyTelescope(base, newtonForm())
    await saveAsMyTelescope(base, { ...first.form, telescopeLabel: 'Mój Newton 2' })
    const { markup } = ownButtons({ telescopes: await listUserTelescopes(base), cameras: [] })
    const texts = ownEntries(parseMarkup(markup)).map((entry) => entry.text)
    expect(texts).toHaveLength(2)
    expect(texts[0]).toContain('Mój Newton 2 — 80/480 mm')
    expect(texts[1]).toContain('Mój Newton 80/480 — 80/480 mm')
  })

  it('P18: błąd w polach teleskopu (Apertura „0” albo pusta Nazwa teleskopu) → przycisk teleskopu nieaktywny, kamery aktywny', () => {
    for (const patch of [{ apertureMm: '0' }, { telescopeLabel: '' }]) {
      const r = renderEditor({ form: newtonForm(patch) })
      expect(isDisabled(editorButton(r, SAVE_TELESCOPE)), JSON.stringify(patch)).toBe(true)
      expect(isDisabled(editorButton(r, SAVE_CAMERA)), JSON.stringify(patch)).toBe(false)
    }
  })

  it('P18: błąd tylko w polach kamery (piksel „abc”) → przycisk teleskopu aktywny, kamery nieaktywny', () => {
    const r = renderEditor({ form: newtonForm({ pixelSizeUm: 'abc' }) })
    expect(isDisabled(editorButton(r, SAVE_TELESCOPE))).toBe(false)
    expect(isDisabled(editorButton(r, SAVE_CAMERA))).toBe(true)
  })

  it('P18: baza niedostępna → „Nie udało się zapisać wpisu: <przyczyna>”, formularz bez zmian', () => {
    const message: EquipmentMessage = { kind: 'error', text: 'Nie udało się zapisać wpisu: baza niedostępna' }
    const r = renderEditor({ form: newtonForm(), message })
    expect(r.text).toContain('Nie udało się zapisać wpisu: baza niedostępna')
    expect(value(r, 'telescopeLabel')).toBe('Mój Newton 80/480')
    expect(sourceAbove(r, MANUAL, TELESCOPE_FIELDS, CAMERA_FIELDS)).toBe(true)
  })
})

describe('P19 „Duplikuj jako własny”', () => {
  const duplicateButtons = (patch: Parameters<typeof editorButtons>[0]) =>
    editorButtons(patch).buttons.filter((button) => button.text === DUPLICATE_BUILTIN)

  it('P19: Esprit 100ED + ASI6200MM Pro → przyciski przy „Z katalogu: …” teleskopu i kamery; klik → onDuplicateBuiltin, formularz bez zmian', () => {
    const onDuplicateBuiltin = vi.fn<(kind: EquipmentKind, id: string) => void>()
    const onFormChange = vi.fn<(form: ProfileForm) => void>()
    const buttons = duplicateButtons({ form: espritAsiForm(), onDuplicateBuiltin, onFormChange })
    expect(buttons).toHaveLength(2)
    click(buttons[0].props)
    expect(onDuplicateBuiltin).toHaveBeenLastCalledWith('telescope', ESPRIT_100)
    click(buttons[1].props)
    expect(onDuplicateBuiltin).toHaveBeenLastCalledWith('camera', ASI6200MM)
    expect(onDuplicateBuiltin).toHaveBeenCalledTimes(2)
    expect(onFormChange).not.toHaveBeenCalled()
  })

  it('P19: przycisk teleskopu stoi przy napisie „Z katalogu: Sky-Watcher Esprit 100ED” (w grupie pól teleskopu)', () => {
    const r = renderEditor({ form: espritAsiForm() })
    const buttons = elementsOf(r.root).filter((element) => element.tag === 'button' && textOf(element) === DUPLICATE_BUILTIN)
    expect(buttons).toHaveLength(2)
    expect(inGroup(r, buttons[0], TELESCOPE_FIELDS, CAMERA_FIELDS)).toBe(true)
    expect(inGroup(r, buttons[1], CAMERA_FIELDS, TELESCOPE_FIELDS)).toBe(true)
  })

  it('P19: „Własny (wpis ręczny)” przy teleskopie → bez przycisku teleskopu; jedyny przycisk duplikuje kamerę Ares-M Pro', () => {
    const onDuplicateBuiltin = vi.fn<(kind: EquipmentKind, id: string) => void>()
    const buttons = duplicateButtons({ form: formOf(MOJ_ID), onDuplicateBuiltin })
    expect(buttons).toHaveLength(1)
    click(buttons[0].props)
    expect(onDuplicateBuiltin).toHaveBeenCalledWith('camera', ARES_M)
  })

  it('P19: „Mój wpis: …” przy teleskopie i kamera ręczna → żadnego przycisku „Duplikuj jako własny”', () => {
    const form = formOf(MOJ_ID, { telescopeSpecId: NEWTON_80.id, telescopeLabel: 'Mój Newton 80/480', apertureMm: '80', focalLengthMm: '480', cameraSpecId: null })
    expect(duplicateButtons({ form, telescopes: [...BUILTIN_TELESCOPES, NEWTON_80] })).toHaveLength(0)
  })

  it('P19: kopie Esprit 100ED → „Mój sprzęt” pokazuje „Sky-Watcher Esprit 100ED (kopia) — 100/550 mm” i „… (kopia 2)”', async () => {
    const base = freshDb()
    await duplicateTelescope(base, ESPRIT_100)
    await duplicateTelescope(base, ESPRIT_100)
    const { markup } = ownButtons({ telescopes: await listUserTelescopes(base), cameras: [] })
    const texts = ownEntries(parseMarkup(markup)).map((entry) => entry.text)
    expect(texts).toHaveLength(2)
    // Kolejność wpisów ustala wlasny-sprzet (sortowanie po nazwie); tu tylko oba napisy.
    expect(texts.filter((text) => text.includes('Sky-Watcher Esprit 100ED (kopia) — 100/550 mm'))).toHaveLength(1)
    expect(texts.filter((text) => text.includes('Sky-Watcher Esprit 100ED (kopia 2) — 100/550 mm'))).toHaveLength(1)
  })

  it('P19: kopia kamery → w „Mój sprzęt” wpis „ZWO ASI6200MM Pro (kopia)”; wbudowane bez zmian', async () => {
    const base = freshDb()
    await duplicateCamera(base, ASI6200MM)
    const { markup } = ownButtons({ telescopes: [], cameras: await listUserCameras(base) })
    const entries = ownEntries(parseMarkup(markup))
    expect(entries).toHaveLength(1)
    expect(entries[0].text).toContain('ZWO ASI6200MM Pro (kopia)')
    expect(builtinCamera(ASI6200MM)).toMatchObject({ model: 'ASI6200MM Pro', origin: 'builtin' })
  })
})

// ---------- P20, P21 „Mój sprzęt” ----------

describe('P20 lista „Mój sprzęt”', () => {
  const sorted = [
    userTelescope('teleskop-c', 'Ćma 50', 50, 250),
    userTelescope('teleskop-m', 'Mój Newton 80/480', 80, 480),
    userTelescope('teleskop-z', 'Żuraw 70', 70, 420),
  ]

  it('P20: przed wczytaniem wpisów → „Wczytywanie własnych wpisów…”', () => {
    const text = visibleText(ownButtons({ telescopes: null, cameras: null }).markup)
    expect(text).toContain(LOADING)
    expect(text).not.toContain('Brak własnych wpisów')
  })

  it('P20: bez własnych wpisów → „Brak własnych wpisów. Użyj „Zapisz jako mój teleskop” albo „Zapisz jako moją kamerę”.”', () => {
    const text = visibleText(ownButtons({ telescopes: [], cameras: [] }).markup)
    expect(text).toContain(NO_ENTRIES)
    expect(text).not.toContain(LOADING)
  })

  it('P20: wpisy „Ćma 50”, „Mój Newton 80/480”, „Żuraw 70” w tej kolejności, pod nagłówkiem „Teleskopy”; kamery pod „Kamery”', () => {
    const camera = { ...BUILTIN_CAMERAS[0], id: 'kamera-moja', brand: '', model: 'Moja 294', origin: 'user' as const }
    const { markup } = ownButtons({ telescopes: sorted, cameras: [camera] })
    const root = parseMarkup(markup)
    const entries = ownEntries(root)
    expect(entries.map((entry) => entry.text.split(' — ')[0])).toEqual(['Ćma 50', 'Mój Newton 80/480', 'Żuraw 70', 'Moja 294'])
    const telescopesTitle = textElement(root, 'Teleskopy')
    const camerasTitle = textElement(root, 'Kamery')
    expect(orderOf(root, telescopesTitle)).toBeLessThan(orderOf(root, entries[0].element))
    expect(orderOf(root, camerasTitle)).toBeGreaterThan(orderOf(root, entries[2].element))
    expect(orderOf(root, camerasTitle)).toBeLessThan(orderOf(root, entries[3].element))
    expect(visibleText(markup)).not.toContain(NO_ENTRIES)
  })

  it('P20: każdy wpis ma „Edytuj” i „Usuń”; klik → onEdit / onRemoveRequest z rodzajem i id wpisu', () => {
    const onEdit = vi.fn<(kind: EquipmentKind, id: string) => void>()
    const onRemoveRequest = vi.fn<(kind: EquipmentKind, id: string) => void>()
    const { buttons } = ownButtons({ telescopes: sorted, cameras: [], onEdit, onRemoveRequest })
    const edits = buttons.filter((button) => button.text === 'Edytuj')
    const removes = buttons.filter((button) => button.text === 'Usuń')
    expect(edits).toHaveLength(3)
    expect(removes).toHaveLength(3)
    click(edits[1].props)
    expect(onEdit).toHaveBeenCalledWith('telescope', 'teleskop-m')
    click(removes[2].props)
    expect(onRemoveRequest).toHaveBeenCalledWith('telescope', 'teleskop-z')
  })

  it('P20: komunikat akcji („Wpis wbudowany jest tylko do odczytu…”) pod listą', () => {
    const { markup } = ownButtons({ telescopes: sorted, cameras: [], message: READ_ONLY })
    const root = parseMarkup(markup)
    const message = textElement(root, READ_ONLY)
    const entries = ownEntries(root)
    expect(orderOf(root, message)).toBeGreaterThan(orderOf(root, entries[entries.length - 1].element))
  })
})

describe('P21 edycja i usunięcie własnego wpisu', () => {
  const MOJ_NEWTON = userTelescope('teleskop-moj-newton', 'Mój Newton', 150, 600)
  const OTHER = userTelescope('teleskop-zuraw', 'Żuraw 70', 70, 420)
  const editForm: OwnEntryForm = { name: 'Mój Newton', apertureMm: '150', focalLengthMm: '600' }
  const editing = { kind: 'telescope' as const, id: MOJ_NEWTON.id }

  /** Zestaw „Szeroki kadr” zapisany z wpisu `entry` (150/600). */
  function szerokiKadr(entry: TelescopeSpec): EquipmentProfile {
    const profile = demo(MOJ_ID)
    return { ...profile, id: 'profil-szeroki', name: 'Szeroki kadr', telescope: { specId: entry.id, label: 'Mój Newton', apertureMm: 150, focalLengthMm: 600 } }
  }

  it('P21: „Edytuj” → pod wpisem pola Nazwa teleskopu, Apertura, Ogniskowa i przyciski „Zapisz wpis” i „Anuluj”', () => {
    const { root, fields } = renderOwnEdit({ telescopes: [MOJ_NEWTON, OTHER], cameras: [], editing, editForm })
    expect(Object.keys(fields).sort()).toEqual(['apertureMm', 'focalLengthMm', 'name'])
    expect(labelStartsWith(root, fields.name, 'Nazwa teleskopu')).toBe(true)
    expect(labelStartsWith(root, fields.apertureMm, 'Apertura')).toBe(true)
    expect(labelStartsWith(root, fields.focalLengthMm, 'Ogniskowa')).toBe(true)
    expect([fields.name, fields.apertureMm, fields.focalLengthMm].map((field) => field.attrs.value)).toEqual(['Mój Newton', '150', '600'])
    const label = textElement(root, 'Mój Newton — 150/600 mm')
    const next = textElement(root, 'Żuraw 70 — 70/420 mm')
    for (const field of Object.values(fields)) {
      expect(orderOf(root, field)).toBeGreaterThan(orderOf(root, label))
      expect(orderOf(root, field)).toBeLessThan(orderOf(root, next))
    }
  })

  it('P21: „Zapisz wpis” → onEditSave; „Anuluj” → onEditCancel', () => {
    const onEditSave = vi.fn<() => void>()
    const onEditCancel = vi.fn<() => void>()
    const { buttons } = ownButtons({ telescopes: [MOJ_NEWTON], cameras: [], editing, editForm, onEditSave, onEditCancel })
    click(onlyButton(buttons, 'Zapisz wpis').props)
    expect(onEditSave).toHaveBeenCalledTimes(1)
    click(onlyButton(buttons, 'Anuluj').props)
    expect(onEditCancel).toHaveBeenCalledTimes(1)
  })

  it('P21: wpisanie „610” w Ogniskowej i „Newton po kolimacji” w nazwie → onEditChange zmienia tylko to pole', () => {
    const { inputs, onEditChange } = renderOwnEdit({ telescopes: [MOJ_NEWTON], cameras: [], editing, editForm })
    change(inputs.focalLengthMm, '610')
    expect(onEditChange).toHaveBeenLastCalledWith({ ...editForm, focalLengthMm: '610' })
    change(inputs.name, 'Newton po kolimacji')
    expect(onEditChange).toHaveBeenLastCalledWith({ ...editForm, name: 'Newton po kolimacji' })
  })

  it('P21: Apertura „0” → pod polem wpisu „Apertura: dozwolony zakres 5–1500 mm”, „Zapisz wpis” nieaktywny', () => {
    const form: OwnEntryForm = { ...editForm, apertureMm: '0' }
    const { root, fields } = renderOwnEdit({ telescopes: [MOJ_NEWTON], cameras: [], editing, editForm: form })
    expect(nearField(root, [fields.apertureMm], 'Apertura: dozwolony zakres 5–1500 mm')).toBe(true)
    expect(nearField(root, [fields.focalLengthMm], 'Apertura: dozwolony zakres 5–1500 mm')).toBe(false)
    const save = elementsOf(root).filter((element) => element.tag === 'button' && textOf(element) === 'Zapisz wpis')
    expect(save).toHaveLength(1)
    expect(isDisabled(save[0])).toBe(true)
  })

  it('P21: poprawny formularz wpisu → „Zapisz wpis” aktywny', () => {
    const { buttons } = ownButtons({ telescopes: [MOJ_NEWTON], cameras: [], editing, editForm: { ...editForm, focalLengthMm: '610' } })
    expect(isDisabled(onlyButton(buttons, 'Zapisz wpis').element)).toBe(false)
  })

  it('P21: pytanie „Usunąć wpis „Newton po kolimacji”? Zestawy zachowają swoje wartości.” z „Usuń” i „Anuluj”', () => {
    const entry = userTelescope(MOJ_NEWTON.id, 'Newton po kolimacji', 150, 610)
    const onRemoveConfirm = vi.fn<() => void>()
    const onRemoveCancel = vi.fn<() => void>()
    const { markup, buttons } = ownButtons({ telescopes: [entry], cameras: [], confirmRemove: editing, onRemoveConfirm, onRemoveCancel })
    expect(visibleText(markup)).toContain('Usunąć wpis „Newton po kolimacji”? Zestawy zachowają swoje wartości.')
    click(onlyButton(buttons, 'Anuluj').props)
    expect(onRemoveCancel).toHaveBeenCalledTimes(1)
    expect(onRemoveConfirm).not.toHaveBeenCalled()
    const removes = buttons.filter((button) => button.text === 'Usuń')
    click(removes[removes.length - 1].props)
    expect(onRemoveConfirm).toHaveBeenCalledTimes(1)
  })

  it('P21: (T18) edycja na 610 i „Newton po kolimacji” → lista „Newton po kolimacji — 150/610 mm”; zestaw ma 600, dawną nazwę i „zmienione” przy Ogniskowej', async () => {
    const base = freshDb()
    const { spec } = await saveAsMyTelescope(base, formOf(MOJ_ID, { telescopeSpecId: null, telescopeLabel: 'Mój Newton' }))
    const profile = szerokiKadr(spec)
    await editUserTelescope(base, { ...spec, model: 'Newton po kolimacji', focalLengthMm: 610 })
    const own = await listUserTelescopes(base)
    const { markup } = ownButtons({ telescopes: own, cameras: [] })
    const entries = ownEntries(parseMarkup(markup))
    expect(entries).toHaveLength(1)
    expect(entries[0].text).toContain('Newton po kolimacji — 150/610 mm')
    expect(visibleText(markup)).not.toContain('Mój Newton —')

    const r = renderEditor({ saved: profile, form: profileToForm(profile), telescopes: [...BUILTIN_TELESCOPES, ...own] })
    expect(value(r, 'focalLengthMm')).toBe('600')
    expect(value(r, 'telescopeLabel')).toBe('Mój Newton')
    expect(nearField(r.root, [r.field('focalLengthMm')], CHANGED)).toBe(true)
    expect(nearField(r.root, [r.field('apertureMm')], CHANGED)).toBe(false)
  })

  it('P21: (T18) „Usuń” wpis → znika z listy i z wyników; edytor „Szeroki kadr” pokazuje „Własny (wpis ręczny)”, 150/600, bez „zmienione”', async () => {
    const base = freshDb()
    const { spec } = await saveAsMyTelescope(base, formOf(MOJ_ID, { telescopeSpecId: null, telescopeLabel: 'Mój Newton' }))
    const profile = szerokiKadr(spec)
    await editUserTelescope(base, { ...spec, model: 'Newton po kolimacji', focalLengthMm: 610 })
    await removeUserTelescope(base, spec.id)
    const own = await listUserTelescopes(base)
    expect(visibleText(ownButtons({ telescopes: own, cameras: [] }).markup)).toContain(NO_ENTRIES)

    const telescopes = [...BUILTIN_TELESCOPES, ...own]
    const r = renderEditor({ saved: profile, form: profileToForm(profile), telescopes, telescopeQuery: 'newton' })
    expect(sourceAbove(r, MANUAL, TELESCOPE_FIELDS, CAMERA_FIELDS)).toBe(true)
    expect(value(r, 'apertureMm')).toBe('150')
    expect(value(r, 'focalLengthMm')).toBe('600')
    expect(r.text).not.toContain(CHANGED)
    expect(resultsOf(r.root, 'Własny').labels.some((label) => label.includes('kolimacji'))).toBe(false)
  })
})

// ---------- P22 wygląd ----------

describe('P22 klasy, wysokość i kolory', () => {
  const renders = () => [
    renderEditor({ form: formOf(MOJ_ID, { apertureMm: '0', focalLengthMm: '610', oagEnabled: true }), telescopeQuery: 'esprit' }).root,
    renderEditor({ form: formOf(MOJ_ID, { apertureMm: '500', focalLengthMm: '400' }) }).root,
    parseMarkup(listButtons({ confirmRemove: true, error: 'Nie udało się usunąć: x' }).markup),
    parseMarkup(ownButtons({ telescopes: [NEWTON_80], cameras: [], editing: { kind: 'telescope', id: NEWTON_80.id }, editForm: { name: 'x', apertureMm: '0', focalLengthMm: '480' } }).markup),
  ]

  it('P22: pola mają klasę `control`, przyciski klasę `button`', () => {
    for (const root of renders()) {
      expect(elementsOf(root).some((element) => element.tag === 'button')).toBe(true)
      expect(controlsWithoutClass(root)).toEqual([])
    }
  })

  it('P22: przyciski, pola tekstowe i listy wyboru mają co najmniej 44 px', () => {
    for (const root of renders()) {
      const targets = elementsOf(root).filter(
        (element) => element.tag === 'button' || element.tag === 'select' || (element.tag === 'input' && !['checkbox', 'radio', 'hidden'].includes(element.attrs.type ?? 'text')),
      )
      expect(targets.length).toBeGreaterThan(0)
      for (const element of targets) {
        expect(minHeightPx(element), `<${element.tag} class="${classesOf(element).join(' ')}">`).toBeGreaterThanOrEqual(44)
      }
    }
  })

  it('P22: kolory tylko z tokenów (bez klas palety Tailwind i kolorów wpisanych w style)', () => {
    for (const root of renders()) expect(colorsOutsideTokens(root)).toEqual([])
  })

  it('P22: błąd, ostrzeżenie i „zmienione” różnią się tekstem (każde widoczne jako własny napis)', () => {
    const r = renderEditor(editorFor(ESPRIT_ID, { apertureMm: '0', focalLengthMm: '600', pixelSizeUm: '7' }))
    expect(nearField(r.root, [r.field('apertureMm')], 'Apertura: dozwolony zakres 5–1500 mm')).toBe(true)
    expect(nearField(r.root, [r.field('pixelSizeUm')], 'Dłuższy bok matrycy ma 67,03 mm: sprawdź rozmiar piksela i rozdzielczość')).toBe(true)
    expect(nearField(r.root, [r.field('focalLengthMm')], CHANGED)).toBe(true)
  })
})

// Wpisy wbudowane są tylko do odczytu (wlasny-sprzet); listę własnych dostaje komponent bez wbudowanych (P20).
describe('P20 wpisy wbudowane poza „Mój sprzęt”', () => {
  it('P20: lista własnych wpisów z bazy po duplikacie nie zawiera wpisów wbudowanych', async () => {
    const base = freshDb()
    await duplicateTelescope(base, ESPRIT_100)
    const own = await listUserTelescopes(base)
    const { markup } = ownButtons({ telescopes: own, cameras: await listUserCameras(base) })
    const entries = ownEntries(parseMarkup(markup))
    expect(entries).toHaveLength(1)
    expect(entries[0].text).not.toMatch(/^Sky-Watcher Esprit 100ED — /)
    expect(BUILTIN_TELESCOPES.length).toBeGreaterThan(1)
  })
})
