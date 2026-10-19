// Sekcja „Sprzęt” w zakładce Ustawienia (kontener EquipmentSection ze stanem aplikacji, IndexedDB przez fake-indexeddb):
// miejsce sekcji i podsekcje (P1), wybór zestawu z listy i z górnego paska (P2), dodawanie i duplikowanie (P3),
// usuwanie (P4), seeing z parametrów planowania (P13), zmiana nazwy po zapisie (P16), powrót do zestawu (P17)
// i „Mój sprzęt” przed wczytaniem wpisów (P20). Przyciski klika sonda (handler z właściwości elementu), a wynik widać
// w stanie aplikacji, w bazie i w kolejnym renderze zakładki. Stanu lokalnego kontenera (formularz, pytania, komunikaty)
// render statyczny nie zmienia, więc te zachowania sprawdzają testy komponentów w zakladka-sprzet.test.ts.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { appDb } from '../../../src/data/appDb'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { profileToForm, readProfileForm } from '../../../src/features/equipment/profileForm'
import { DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import { usePlannerStore } from '../../../src/state/plannerStore'
import type { EquipmentProfile } from '../../../src/types'
import {
  ADD_PROFILE,
  DEMO_NAMES,
  DUPLICATE_PROFILE,
  ESPRIT_ID,
  LAST_PROFILE,
  LOADING,
  MOJ_ID,
  NEWTON_ID,
  REDCAT_ID,
  REMOVE_PROFILE,
  UNSAVED,
  click,
  controlsWithoutClass,
  demo,
  elementsOf,
  fieldIn,
  nearField,
  headingWhere,
  headingsOf,
  onlyButton,
  partAfter,
  previewOf,
  renderSettings,
  sensorIn,
  textOf,
  topBarProfile,
  until,
  visibleText,
  type MarkupElement,
  type ProbedButton,
} from './helpers'

beforeEach(async () => {
  await appDb.settings.clear()
  usePlannerStore.setState({
    profiles: structuredClone(DEMO_PROFILES),
    activeProfileId: MOJ_ID,
    planningSettings: DEFAULT_PLANNING_SETTINGS,
  })
})

const state = () => usePlannerStore.getState()
const names = () => state().profiles.map((profile) => profile.name)
const savedProfiles = async () => (await appDb.settings.get('profiles'))?.value as EquipmentProfile[] | undefined

/** Zakładka Ustawienia: sekcja „Sprzęt” (h2) i jej podsekcje (h3). */
function renderTab() {
  const { markup, root, buttons } = renderSettings()
  const section = headingWhere(root, (text) => text === 'Sprzęt', '„Sprzęt”')
  const part = partAfter(root, section)
  const sub = (test: (text: string) => boolean, what: string) => {
    const heading = headingWhere(root, test, what)
    expect(part, `${what} w sekcji „Sprzęt”`).toContain(heading)
    return { heading, part: partAfter(root, heading) }
  }
  const inPart = (elements: readonly MarkupElement[]) => buttons.filter((button) => elements.includes(button.element))
  return { markup, root, buttons, section, part, sub, inPart }
}

type Tab = ReturnType<typeof renderTab>

/** Przyciski podsekcji „Zestawy”. */
function profileButtons(tab: Tab): ProbedButton[] {
  return tab.inPart(tab.sub((text) => text === 'Zestawy', '„Zestawy”').part)
}

/** Podsekcja edytora: nagłówek „Edycja zestawu: …” i elementy od niego do nagłówka „Mój sprzęt”. */
function editorPart(tab: Tab) {
  const { heading } = tab.sub((text) => text.startsWith('Edycja zestawu:'), '„Edycja zestawu: …”')
  const own = tab.sub((text) => text === 'Mój sprzęt', '„Mój sprzęt”').heading
  const all = elementsOf(tab.root)
  return { heading, part: all.slice(all.indexOf(heading) + 1, all.indexOf(own)) }
}

describe('P1 miejsce sekcji i podsekcje', () => {
  it('P1: h2 „Sprzęt” stoi po edycji lokalizacji („Edycja: …”), a przed „Parametrami planowania”', () => {
    const { root, section } = renderTab()
    expect(section.tag).toBe('h2')
    const headings = headingsOf(root)
    const location = headings.findIndex((heading) => textOf(heading).startsWith('Edycja:'))
    const planning = headings.findIndex((heading) => textOf(heading) === 'Parametry planowania')
    expect(location).toBeGreaterThanOrEqual(0)
    expect(planning).toBeGreaterThanOrEqual(0)
    expect(headings.indexOf(section)).toBeGreaterThan(location)
    expect(headings.indexOf(section)).toBeLessThan(planning)
  })

  it('P1: podsekcje h3 „Zestawy”, „Edycja zestawu: Mój zestaw”, „Mój sprzęt” w tej kolejności; żaden nagłówek sekcji nie zaczyna się od „Edycja:”', () => {
    const { part } = renderTab()
    const sub = part.filter((element) => /^h[1-3]$/.test(element.tag))
    expect(sub.map((heading) => [heading.tag, textOf(heading)])).toEqual([
      ['h3', 'Zestawy'],
      ['h3', 'Edycja zestawu: Mój zestaw'],
      ['h3', 'Mój sprzęt'],
    ])
    expect(sub.filter((heading) => textOf(heading).startsWith('Edycja:'))).toEqual([])
  })

  it('P1: 4 przyciski zestawów z aria-pressed, wciśnięty tylko „Mój zestaw”; „Dodaj/Duplikuj/Usuń zestaw” bez aria-pressed', () => {
    const buttons = profileButtons(renderTab())
    const profiles = buttons.filter((button) => DEMO_NAMES.includes(button.text))
    expect(profiles.map((button) => button.text)).toEqual(DEMO_NAMES)
    expect(profiles.map((button) => button.element.attrs['aria-pressed'])).toEqual(['true', 'false', 'false', 'false'])
    for (const text of [ADD_PROFILE, DUPLICATE_PROFILE, REMOVE_PROFILE]) {
      expect(onlyButton(buttons, text).element.attrs['aria-pressed'], text).toBeUndefined()
    }
  })

  it('P1: aktywny „Newton 200/1000 + ASI533MM Pro” → wciśnięty tylko on, nagłówek „Edycja zestawu: Newton 200/1000 + ASI533MM Pro”', () => {
    state().selectProfile(NEWTON_ID)
    const tab = renderTab()
    const pressed = profileButtons(tab).filter((button) => button.element.attrs['aria-pressed'] === 'true')
    expect(pressed.map((button) => button.text)).toEqual(['Newton 200/1000 + ASI533MM Pro'])
    expect(textOf(editorPart(tab).heading)).toBe('Edycja zestawu: Newton 200/1000 + ASI533MM Pro')
  })

  it('Styk: w sekcji „Sprzęt” nie ma przycisków „Zapisz zmiany”, „Odrzuć zmiany” ani „Ustaw jako aktywny”', () => {
    const tab = renderTab()
    const texts = tab.inPart(tab.part).map((button) => button.text)
    expect(texts.length).toBeGreaterThan(0)
    for (const text of ['Zapisz zmiany', 'Odrzuć zmiany', 'Ustaw jako aktywny']) expect(texts).not.toContain(text)
  })

  it('P22: pola sekcji „Sprzęt” mają klasę `control`, przyciski klasę `button`', () => {
    const tab = renderTab()
    const wrapper: MarkupElement = { tag: '#part', attrs: {}, children: tab.part.filter((element) => !tab.part.includes(element.parent as MarkupElement)), parent: null }
    expect(controlsWithoutClass(wrapper)).toEqual([])
  })
})

describe('P2 wybór zestawu z listy i z górnego paska', () => {
  it('P2: klik „RedCat 51 + ASI2600MC Pro” na liście → aktywny w stanie i na górnym pasku', () => {
    click(onlyButton(profileButtons(renderTab()), 'RedCat 51 + ASI2600MC Pro').props)
    expect(state().activeProfileId).toBe(REDCAT_ID)
    expect(topBarProfile().selected).toBe('RedCat 51 + ASI2600MC Pro')
  })

  it('P2: po kliknięciu RedCat edytor pokazuje 51 / 250, 6248 × 4176, „3,76”, OSC', () => {
    click(onlyButton(profileButtons(renderTab()), 'RedCat 51 + ASI2600MC Pro').props)
    const tab = renderTab()
    const { heading, part } = editorPart(tab)
    expect(textOf(heading)).toBe('Edycja zestawu: RedCat 51 + ASI2600MC Pro')
    expect(fieldIn(tab.root, part, 'Apertura [mm]').attrs.value).toBe('51')
    expect(fieldIn(tab.root, part, 'Ogniskowa [mm]').attrs.value).toBe('250')
    expect(fieldIn(tab.root, part, 'Rozdzielczość X [px]').attrs.value).toBe('6248')
    expect(fieldIn(tab.root, part, 'Rozdzielczość Y [px]').attrs.value).toBe('4176')
    expect(fieldIn(tab.root, part, 'Rozmiar piksela [µm]').attrs.value).toBe('3,76')
    expect(sensorIn(tab.root, part)).toBe('OSC')
  })

  it('P2: wybór „Esprit 100ED + ASI6200MM Pro” na górnym pasku → edytor pokazuje ten zestaw (100 / 550, mono)', () => {
    topBarProfile().choose(ESPRIT_ID)
    expect(state().activeProfileId).toBe(ESPRIT_ID)
    const tab = renderTab()
    const { heading, part } = editorPart(tab)
    expect(textOf(heading)).toBe('Edycja zestawu: Esprit 100ED + ASI6200MM Pro')
    expect(fieldIn(tab.root, part, 'Apertura [mm]').attrs.value).toBe('100')
    expect(fieldIn(tab.root, part, 'Ogniskowa [mm]').attrs.value).toBe('550')
    expect(sensorIn(tab.root, part)).toBe('mono')
    expect(visibleText(tab.markup)).toContain('Z katalogu: Sky-Watcher Esprit 100ED')
  })
})

describe('P3, P4 dodawanie, duplikowanie i usuwanie zestawów', () => {
  it('P3: „Dodaj zestaw” → na końcu listy „Nowy zestaw”; aktywny i edytor bez zmian; lista w bazie', async () => {
    click(onlyButton(profileButtons(renderTab()), ADD_PROFILE).props)
    await until(() => state().profiles.length === 5)
    expect(names()).toEqual([...DEMO_NAMES, 'Nowy zestaw'])
    expect(state().activeProfileId).toBe(MOJ_ID)
    expect((await savedProfiles())?.map((profile) => profile.name)).toEqual([...DEMO_NAMES, 'Nowy zestaw'])
    const tab = renderTab()
    const listed = profileButtons(tab).filter((button) => [...DEMO_NAMES, 'Nowy zestaw'].includes(button.text))
    expect(listed.map((button) => button.text)).toEqual([...DEMO_NAMES, 'Nowy zestaw'])
    expect(textOf(editorPart(tab).heading)).toBe('Edycja zestawu: Mój zestaw')
  })

  it('P3: „Duplikuj zestaw” przy aktywnym „RedCat 51 + ASI2600MC Pro” → na końcu „RedCat 51 + ASI2600MC Pro (kopia)”, aktywny bez zmian', async () => {
    state().selectProfile(REDCAT_ID)
    click(onlyButton(profileButtons(renderTab()), DUPLICATE_PROFILE).props)
    await until(() => state().profiles.length === 5)
    expect(names()).toEqual([...DEMO_NAMES, 'RedCat 51 + ASI2600MC Pro (kopia)'])
    expect(state().activeProfileId).toBe(REDCAT_ID)
    const copy = state().profiles[4]
    expect(copy.telescope).toEqual(demo(REDCAT_ID).telescope)
    expect(textOf(editorPart(renderTab()).heading)).toBe('Edycja zestawu: RedCat 51 + ASI2600MC Pro')
  })

  it('P4: „Usuń zestaw” najpierw pyta → zaraz po kliknięciu zestaw nie jest usunięty', async () => {
    state().selectProfile(ESPRIT_ID)
    click(onlyButton(profileButtons(renderTab()), REMOVE_PROFILE).props)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(names()).toEqual(DEMO_NAMES)
    expect(state().activeProfileId).toBe(ESPRIT_ID)
  })

  it('P4: po usunięciu aktywnego „Esprit 100ED + ASI6200MM Pro” aktywny i edytowany jest „Mój zestaw”', async () => {
    state().selectProfile(ESPRIT_ID)
    await state().removeProfile(ESPRIT_ID)
    const tab = renderTab()
    expect(textOf(editorPart(tab).heading)).toBe('Edycja zestawu: Mój zestaw')
    expect(profileButtons(tab).map((button) => button.text)).not.toContain('Esprit 100ED + ASI6200MM Pro')
  })

  it('P4: 1 zestaw → „Usuń zestaw” nieaktywny z title „Ostatniego zestawu nie można usunąć”', () => {
    usePlannerStore.setState({ profiles: [demo(MOJ_ID)] })
    const remove = onlyButton(profileButtons(renderTab()), REMOVE_PROFILE).element
    expect('disabled' in remove.attrs).toBe(true)
    expect(remove.attrs.title).toBe(LAST_PROFILE)
  })

  it('P4: 4 zestawy → „Usuń zestaw” aktywny', () => {
    expect('disabled' in onlyButton(profileButtons(renderTab()), REMOVE_PROFILE).element.attrs).toBe(false)
  })
})

describe('P10, P13, P16, P17 edytor w zakładce', () => {
  it('P10: zestaw z ostrzeżeniem (Apertura „500”, Ogniskowa „400”) zapisuje się; edytor w zakładce pokazuje ostrzeżenie pod Ogniskową bez aria-invalid', async () => {
    const { profile } = readProfileForm({ ...profileToForm(demo(MOJ_ID)), apertureMm: '500', focalLengthMm: '400' })
    expect(profile).not.toBeNull()
    await state().saveProfile(profile as EquipmentProfile)
    expect((await savedProfiles())?.[0].telescope).toMatchObject({ apertureMm: 500, focalLengthMm: 400 })
    const tab = renderTab()
    const focal = fieldIn(tab.root, editorPart(tab).part, 'Ogniskowa [mm]')
    expect(focal.attrs.value).toBe('400')
    expect(nearField(tab.root, [focal], 'Nietypowa światłosiła f/0,8: sprawdź ogniskową i aperturę')).toBe(true)
    expect(focal.attrs['aria-invalid']).not.toBe('true')
  })

  it('P13: seeing z parametrów planowania 2,5″ → „podpróbkowanie (seeing 2,5″)” dla „Mój zestaw”', () => {
    expect(previewOf(renderTab().root).values['Próbkowanie']).toBe('podpróbkowanie (seeing 2,5″)')
  })

  it('P13: po zapisaniu seeingu 3 → „idealne (seeing 3″)”', async () => {
    await state().savePlanningSettings({ ...DEFAULT_PLANNING_SETTINGS, seeingArcsec: 3 })
    expect(previewOf(renderTab().root).values['Próbkowanie']).toBe('idealne (seeing 3″)')
  })

  it('P13: Newton 200/1000 + ASI533MM, seeing 2,5″ → „nadpróbkowanie (seeing 2,5″)”', () => {
    state().selectProfile(NEWTON_ID)
    expect(previewOf(renderTab().root).values['Próbkowanie']).toBe('nadpróbkowanie (seeing 2,5″)')
  })

  it('P16: zapis z Ogniskową 610 i nazwą „Szeroki kadr” → lista, nagłówek edytora i górny pasek pokazują „Szeroki kadr”; stan i baza mają 610', async () => {
    const { profile } = readProfileForm({ ...profileToForm(demo(MOJ_ID)), name: 'Szeroki kadr', focalLengthMm: '610' })
    await state().saveProfile(profile as EquipmentProfile)
    expect(state().profiles[0].telescope.focalLengthMm).toBe(610)
    expect((await savedProfiles())?.[0].telescope.focalLengthMm).toBe(610)
    const tab = renderTab()
    expect(profileButtons(tab).map((button) => button.text)).toContain('Szeroki kadr')
    const { heading, part } = editorPart(tab)
    expect(textOf(heading)).toBe('Edycja zestawu: Szeroki kadr')
    expect(fieldIn(tab.root, part, 'Ogniskowa [mm]').attrs.value).toBe('610')
    expect(visibleText(tab.markup)).not.toContain(UNSAVED)
    expect(topBarProfile().selected).toBe('Szeroki kadr')
  })

  it('P17: wybór innego zestawu i powrót do „Mój zestaw” → edytor pokazuje wartości zapisane (600), bez „Niezapisane zmiany”', () => {
    click(onlyButton(profileButtons(renderTab()), 'RedCat 51 + ASI2600MC Pro').props)
    expect(state().activeProfileId).toBe(REDCAT_ID)
    click(onlyButton(profileButtons(renderTab()), 'Mój zestaw').props)
    const tab = renderTab()
    const { part } = editorPart(tab)
    expect(fieldIn(tab.root, part, 'Ogniskowa [mm]').attrs.value).toBe('600')
    expect(visibleText(tab.markup)).not.toContain(UNSAVED)
  })
})

describe('P20 „Mój sprzęt” w zakładce', () => {
  it('P20: przed wczytaniem własnych wpisów → „Wczytywanie własnych wpisów…” w podsekcji „Mój sprzęt”', () => {
    const tab = renderTab()
    const { part } = tab.sub((text) => text === 'Mój sprzęt', '„Mój sprzęt”')
    const texts = part.map((element) => textOf(element))
    expect(texts.some((text) => text.includes(LOADING))).toBe(true)
  })
})
