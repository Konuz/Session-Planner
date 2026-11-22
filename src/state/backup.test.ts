import { beforeEach, describe, expect, it } from 'vitest'
import { fieldId } from '../lib/fieldTarget'
import { backupFileName, backupText, parseBackup, restoreBackup } from './backup'
import { useStore, type PlanItem } from './store'

const now = Date.UTC(2026, 10, 22, 12)
const noPhotos = async () => null
const FOREIGN = 'To nie jest plik kopii zapasowej KONUZASTRO Tracker.'

const field = { raDeg: 83.82, decDeg: -5.39 }
const catalogTarget: PlanItem = {
  key: 'a', objectIndex: 3, objectId: 'M 51', startMs: Date.UTC(2026, 10, 22, 20), endMs: Date.UTC(2026, 10, 22, 22),
  framing: { raDeg: 200, decDeg: 48, paDeg: 20, mosaic: { cols: 2, rows: 1, overlapPct: 15 } },
  filters: 'Ha', exposures: [{ filter: 'Ha', count: 12, seconds: 300 }], note: 'Po zachodzie Księżyca',
}
const fieldTarget: PlanItem = {
  key: 'b', objectIndex: -1, objectId: fieldId(field), field, startMs: null, endMs: null,
  framing: { raDeg: null, decDeg: null, paDeg: 0 }, filters: 'OSC', note: '',
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true)
})

describe('kopia zapasowa', () => {
  it('nazwa pliku i nagłówek kopii', () => {
    expect(backupFileName(now)).toBe('konuzastro-kopia-2026-11-22.json')
    const file = JSON.parse(backupText(now))
    expect(file).toMatchObject({ app: 'konuzastro-tracker', format: 1, savedAt: '2026-11-22T12:00:00.000Z' })
    expect(Object.keys(file.state)).toEqual(Object.keys(useStore.persist.getOptions().partialize!(useStore.getState())))
  })

  it('kopia odtwarza plan, sprzęt i lokalizację', async () => {
    const s = useStore.getState()
    s.setLocation({ name: 'Zakopane', region: 'Tatry', latDeg: 49.3, lonDeg: 19.95, elevationM: 830, timeZone: 'Europe/Warsaw' })
    s.addEquipmentSet()
    useStore.getState().setEquipment({ focalLengthMm: 750 })
    useStore.setState({ plan: [catalogTarget, fieldTarget] })
    const before = useStore.getState()
    const text = backupText(now)

    useStore.setState(useStore.getInitialState(), true)
    await restoreBackup(parseBackup(text), noPhotos)

    const after = useStore.getState()
    expect(after.plan).toEqual([catalogTarget, fieldTarget])
    expect(after.location).toEqual(before.location)
    expect(after.equipmentSets).toEqual(before.equipmentSets)
    expect(after.activeEquipmentSetId).toBe(before.activeEquipmentSetId)
    expect(after.equipment).toEqual(before.equipment)
  })

  it('odrzuca obcy plik i nowszy format', () => {
    const file = { app: 'konuzastro-tracker', format: 1, savedAt: '2026-11-22T12:00:00.000Z', state: {} }
    expect(() => parseBackup('nie json')).toThrow(FOREIGN)
    expect(() => parseBackup('{}')).toThrow(FOREIGN)
    expect(() => parseBackup(JSON.stringify({ ...file, app: 'inna' }))).toThrow(FOREIGN)
    expect(() => parseBackup(JSON.stringify({ ...file, state: null }))).toThrow(FOREIGN)
    expect(() => parseBackup(JSON.stringify({ ...file, savedAt: 'wczoraj' }))).toThrow(FOREIGN)
    expect(() => parseBackup(JSON.stringify({ ...file, format: 2 }))).toThrow('Kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację i spróbuj ponownie.')
  })

  it('przyjmuje plik z BOM', () => {
    expect(parseBackup('\uFEFF' + backupText(now)).savedAtMs).toBe(now)
  })

  it('brakujące pola wracają do domyślnych, uszkodzone są czyszczone', async () => {
    const initial = useStore.getInitialState()
    useStore.setState({ minAltDeg: 35 })
    const brokenField = { ...fieldTarget, field: { raDeg: 10, decDeg: 99 } }
    await restoreBackup({ savedAtMs: now, state: { location: 'x' as never, plan: [brokenField, catalogTarget] } }, noPhotos)
    const after = useStore.getState()
    expect(after.minAltDeg).toBe(initial.minAltDeg)
    expect(after.location).toEqual(initial.location)
    expect(after.plan).toEqual([catalogTarget])
  })

  it('nie zmienia bieżącego widoku', async () => {
    useStore.setState({ tab: 'equipment' })
    await restoreBackup(parseBackup(backupText(now)), noPhotos)
    expect(useStore.getState().tab).toBe('equipment')
  })

  it('pola spoza kopii (widok, akcje) nie są nadpisywane z pliku', async () => {
    useStore.setState({ tab: 'equipment' })
    await restoreBackup({ savedAtMs: now, state: { tab: 'catalog', space3DOpen: true, setTab: null } as never }, noPhotos)
    const after = useStore.getState()
    expect(after.tab).toBe('equipment')
    expect(after.space3DOpen).toBe(false)
    expect(typeof after.setTab).toBe('function')
  })

  it('kadr, kursor czasu i historia wracają do stanu początkowego', async () => {
    const initial = useStore.getInitialState()
    useStore.setState({
      framing: { raDeg: 1, decDeg: 2, paDeg: 33, mosaic: { cols: 3, rows: 2, overlapPct: 10 } },
      framingView: { ...initial.framingView, photoCenter: { objectIndex: 9, raDeg: 1, decDeg: 2 } },
      timeMs: now, framePinned: false, history: [9], historyPos: 0,
    })
    await restoreBackup({ savedAtMs: now, state: { selectedIndex: 5 } }, noPhotos)
    const after = useStore.getState()
    expect(after.selectedIndex).toBe(5)
    expect({ framing: after.framing, framingView: after.framingView, timeMs: after.timeMs, framePinned: after.framePinned, history: after.history, historyPos: after.historyPos })
      .toEqual({ framing: initial.framing, framingView: initial.framingView, timeMs: initial.timeMs, framePinned: initial.framePinned, history: initial.history, historyPos: initial.historyPos })
  })

  it('uszkodzone listy, cele i wpisy zdjęć w kopii nie trafiają do stanu', async () => {
    const state = { savedTelescopes: null, savedCameras: 'x', plan: [null, { objectId: 'M 1' }, catalogTarget], ownPhotos: { 'M 1': null }, selectedIndex: 'abc' }
    await restoreBackup({ savedAtMs: now, state: state as never }, async () => 'a')
    const after = useStore.getState()
    expect(after.savedTelescopes).toEqual([])
    expect(after.savedCameras).toEqual([])
    expect(after.plan).toEqual([catalogTarget])
    expect(after.ownPhotos).toEqual({})
    expect(after.selectedIndex).toBeNull()
  })

  it('zdjęcia własne idą za bazą tej przeglądarki', async () => {
    useStore.setState({ ownPhotos: { 'M 33': { photoId: 'c', shown: false } } })
    const ownPhotos = { 'M 42': { photoId: 'a', shown: true }, 'M 51': { photoId: 'b', shown: true }, 'M 33': { photoId: 'old', shown: true } }
    const local: Record<string, string> = { 'M 42': 'a', 'M 51': 'inne', 'M 33': 'c' }
    await restoreBackup({ savedAtMs: now, state: { ownPhotos } }, async (id) => local[id] ?? null)
    expect(useStore.getState().ownPhotos).toEqual({ 'M 42': { photoId: 'a', shown: true }, 'M 33': { photoId: 'c', shown: false } })
  })

  it('błąd bazy zdjęć zostawia wpisy z kopii', async () => {
    const ownPhotos = { 'M 42': { photoId: 'a', shown: true }, 'M 51': { photoId: 'b', shown: true } }
    await restoreBackup({ savedAtMs: now, state: { ownPhotos } }, async () => { throw new Error('IndexedDB') })
    expect(useStore.getState().ownPhotos).toEqual(ownPhotos)
  })
})
