import { describe, expect, it } from 'vitest'
import { DEFAULT_PROFILE_ID, DEMO_PROFILES } from '../../data/demo'
import { M31 } from '../../test/fixtures'
import { isProject } from '../../services/projects'
import type { DsoObject, EquipmentProfile, Framing, Project } from '../../types'
import {
  PROJECT_FILE_FORMAT,
  addLogEntry,
  canTakeFraming,
  framingTexts,
  takeFraming,
  coordinateTexts,
  createProject,
  filterRows,
  formatHoursMinutes,
  logRows,
  projectCsv,
  projectFileName,
  projectToFile,
  readGoalInput,
  readLogForm,
  readProjectFile,
  removeLogEntry,
  setGoal,
  totalText,
} from './projectModel'

const MY_SET = DEMO_PROFILES.find((profile) => profile.id === DEFAULT_PROFILE_ID) as EquipmentProfile
const REDCAT = DEMO_PROFILES.find((profile) => profile.id === 'demo-redcat51-asi2600mc') as EquipmentProfile

const M31_OBJECT: DsoObject = {
  uid: 'NGC224',
  primary: { catalog: 'M', id: '31' },
  designations: [
    { catalog: 'M', id: '31' },
    { catalog: 'NGC', id: '224' },
  ],
  commonNames: ['Andromeda Galaxy'],
  type: 'galaxy',
  raDeg: M31.raDeg,
  decDeg: M31.decDeg,
  sizeMajorArcmin: 190,
  sizeMinorArcmin: 60,
  positionAngleDeg: 35,
  magV: 3.4,
  surfaceBrightness: null,
  ldnOpacity: null,
  sh2Brightness: null,
  lbnBrightness: null,
  vdbStarMagV: null,
  constellation: 'And',
  sources: ['OpenNGC'],
}

const FRAME: Framing = { centerRaDeg: M31.raDeg, centerDecDeg: M31.decDeg, paDeg: 30, mosaic: { cols: 1, rows: 1, overlapPct: 20 } }
const NOW = '2026-10-22T12:00:00.000Z'

function project(changes: Partial<Project> = {}): Project {
  return { ...createProject({ object: M31_OBJECT, framing: FRAME, profile: MY_SET, nowIso: NOW, taken: [] }), ...changes }
}

describe('nowy projekt', () => {
  it('zapisuje obiekt, kadr (środek, PA, mozaika) i zestaw; nazwa = oznaczenie obiektu', () => {
    const created = project()
    expect(created).toMatchObject({
      name: 'M 31',
      objectUid: 'NGC224',
      equipmentId: DEFAULT_PROFILE_ID,
      framing: FRAME,
      log: [],
      goalMinutes: {},
      notes: '',
      createdAtIso: NOW,
    })
    expect(created.id).toMatch(/^projekt-/)
    expect(isProject(created)).toBe(true)
  })

  it('kadr jest kopią (zmiana kadru w Kadrze nie zmienia projektu) i jest przycięty do zakresów', () => {
    const framing: Framing = { ...FRAME, paDeg: 390, mosaic: { cols: 9, rows: 1, overlapPct: 50 } }
    const created = createProject({ object: M31_OBJECT, framing, profile: MY_SET, nowIso: NOW, taken: [] })
    expect(created.framing).toEqual({ ...FRAME, mosaic: { cols: 5, rows: 1, overlapPct: 30 } })
    framing.mosaic.cols = 2
    expect(created.framing.mosaic.cols).toBe(5)
  })

  it('id różne od zajętych', () => {
    const first = project()
    const second = createProject({ object: M31_OBJECT, framing: FRAME, profile: MY_SET, nowIso: NOW, taken: [first.id] })
    expect(second.id).not.toBe(first.id)
  })
})

describe('dziennik akwizycji i sumy na filtr', () => {
  const withLog = project({
    log: [
      { nightDate: '2026-10-16', filter: 'Ha', subs: 30, exposureS: 300 },
      { nightDate: '2026-10-17', filter: 'OIII', subs: 12, exposureS: 300 },
      { nightDate: '2026-10-17', filter: 'Ha', subs: 13, exposureS: 300 },
      { nightDate: '2026-10-18', filter: 'L', subs: 7, exposureS: 90 },
    ],
    goalMinutes: { Ha: 300, SII: 600 },
  })

  it('h:mm: godziny bez zera wiodącego, minuty zaokrąglone', () => {
    expect(formatHoursMinutes(0)).toBe('0:00')
    expect(formatHoursMinutes(65)).toBe('1:05')
    expect(formatHoursMinutes(579)).toBe('9:39')
    expect(formatHoursMinutes(10.5)).toBe('0:11')
    expect(formatHoursMinutes(59.6)).toBe('1:00')
    expect(formatHoursMinutes(6000)).toBe('100:00')
  })

  it('wiersze filtrów: filtry zestawu, dziennika i celów w kolejności L…DualBand, sumy h:mm i postęp celu', () => {
    const rows = filterRows(withLog, ['L', 'R', 'Ha', 'OIII'])
    expect(rows.map((row) => row.filter)).toEqual(['L', 'R', 'Ha', 'OIII', 'SII'])
    const ha = rows.find((row) => row.filter === 'Ha')
    // 43 klatki × 300 s = 215 min
    expect(ha).toMatchObject({ subs: 43, minutes: 215, total: '3:35', goal: '5:00', progress: 215 / 300, progressText: '72%' })
    expect(rows.find((row) => row.filter === 'L')).toMatchObject({ subs: 7, minutes: 10.5, total: '0:11', goal: null, progress: null })
    expect(rows.find((row) => row.filter === 'R')).toMatchObject({ subs: 0, total: '0:00', progress: null })
    expect(rows.find((row) => row.filter === 'SII')).toMatchObject({ subs: 0, total: '0:00', goal: '10:00', progress: 0, progressText: '0%' })
  })

  it('postęp ponad cel: tekst ponad 100%, pasek przycięty w widoku', () => {
    const over = project({ log: [{ nightDate: '2026-10-16', filter: 'Ha', subs: 40, exposureS: 300 }], goalMinutes: { Ha: 100 } })
    expect(filterRows(over, [])[0]).toMatchObject({ progress: 2, progressText: '200%' })
  })

  it('suma wszystkich filtrów (215 + 60 + 10,5 min)', () => {
    expect(totalText(withLog)).toBe('4:46')
  })

  it('wiersze dziennika: noc „D/D+1”, czas klatki i suma wpisu', () => {
    expect(logRows(withLog)[0]).toEqual({ index: 0, night: '16/17.10.2026', filter: 'Ha', subs: '30', exposure: '300 s', total: '2:30' })
    expect(logRows(withLog)[3]).toMatchObject({ exposure: '90 s', total: '0:11' })
  })

  it('dodanie wpisu: dziennik posortowany po nocy, wpisy z tej samej nocy w kolejności dodania', () => {
    const added = addLogEntry(withLog, { nightDate: '2026-10-17', filter: 'SII', subs: 5, exposureS: 600 })
    expect(added.log.map((entry) => `${entry.nightDate} ${entry.filter}`)).toEqual([
      '2026-10-16 Ha',
      '2026-10-17 OIII',
      '2026-10-17 Ha',
      '2026-10-17 SII',
      '2026-10-18 L',
    ])
    const earlier = addLogEntry(withLog, { nightDate: '2026-10-01', filter: 'L', subs: 1, exposureS: 60 })
    expect(earlier.log[0].nightDate).toBe('2026-10-01')
    expect(withLog.log).toHaveLength(4)
  })

  it('usunięcie wpisu po indeksie', () => {
    expect(removeLogEntry(withLog, 1).log.map((entry) => entry.filter)).toEqual(['Ha', 'Ha', 'L'])
  })
})

describe('formularz wpisu dziennika', () => {
  const form = { nightDate: '2026-10-16', filter: 'Ha', subs: '30', exposureS: '300' }

  it('poprawny wpis; czas klatki z przecinkiem albo kropką', () => {
    expect(readLogForm(form)).toEqual({ entry: { nightDate: '2026-10-16', filter: 'Ha', subs: 30, exposureS: 300 }, issues: [] })
    expect(readLogForm({ ...form, exposureS: '0,5' }).entry?.exposureS).toBe(0.5)
    expect(readLogForm({ ...form, exposureS: '2.5' }).entry?.exposureS).toBe(2.5)
  })

  it.each([
    ['nightDate', '2026-02-30', 'Podaj datę nocy w formacie RRRR-MM-DD'],
    ['nightDate', '16.10.2026', 'Podaj datę nocy w formacie RRRR-MM-DD'],
    ['filter', 'X', 'Wybierz filtr'],
    ['subs', '0', 'Liczba klatek: liczba całkowita od 1 do 100 000'],
    ['subs', '2,5', 'Liczba klatek: liczba całkowita od 1 do 100 000'],
    ['subs', '', 'Liczba klatek: liczba całkowita od 1 do 100 000'],
    ['exposureS', '0', 'Czas klatki: liczba sekund większa od 0, najwyżej 3600'],
    ['exposureS', '3601', 'Czas klatki: liczba sekund większa od 0, najwyżej 3600'],
    ['exposureS', 'abc', 'Czas klatki: liczba sekund większa od 0, najwyżej 3600'],
  ])('%s = „%s” → błąd „%s”, bez wpisu', (field, value, message) => {
    expect(readLogForm({ ...form, [field]: value })).toEqual({ entry: null, issues: [{ field, message }] })
  })
})

describe('cele', () => {
  it('pole celu w minutach: puste = bez celu, przecinek albo kropka, błąd przy złej liczbie', () => {
    expect(readGoalInput('')).toEqual({ minutes: null, error: null })
    expect(readGoalInput(' 300 ')).toEqual({ minutes: 300, error: null })
    expect(readGoalInput('90,5')).toEqual({ minutes: 90.5, error: null })
    expect(readGoalInput('0')).toEqual({ minutes: null, error: 'Cel: liczba minut większa od 0 (puste pole = bez celu)' })
    expect(readGoalInput('x')).toEqual({ minutes: null, error: 'Cel: liczba minut większa od 0 (puste pole = bez celu)' })
  })

  it('ustawienie i usunięcie celu', () => {
    const withGoal = setGoal(project(), 'Ha', 300)
    expect(withGoal.goalMinutes).toEqual({ Ha: 300 })
    expect(setGoal(withGoal, 'Ha', null).goalMinutes).toEqual({})
  })
})

describe('współrzędne', () => {
  it('HMS/DMS i stopnie dziesiętne, pl-PL, typograficzny minus', () => {
    expect(coordinateTexts(FRAME)).toEqual({ ra: '00h 42m 44,30s', dec: '+41° 16′ 09,0″', raDecimal: '10,6846°', decDecimal: '+41,2692°' })
    const south = coordinateTexts({ ...FRAME, centerRaDeg: 83.8221, centerDecDeg: -0.5 })
    expect(south).toEqual({ ra: '05h 35m 17,30s', dec: '−00° 30′ 00,0″', raDecimal: '83,8221°', decDecimal: '−0,5000°' })
  })
})

describe('eksport CSV projektu', () => {
  it('kadr 1×1: plik z nazwą projektu, także bez zestawu', () => {
    const result = projectCsv(project({ equipmentId: 'usuniety' }), DEMO_PROFILES)
    expect(result).toEqual({ csv: 'Pane,RA,DEC,Position Angle (East)\r\nM 31,00:42:44.30,+41:16:09.0,30.0\r\n', fileName: 'M_31.csv' })
  })

  it('mozaika z zestawem projektu (nie aktywnym): 2 wiersze', () => {
    const result = projectCsv(project({ equipmentId: REDCAT.id, framing: { ...FRAME, mosaic: { cols: 2, rows: 1, overlapPct: 20 } } }), DEMO_PROFILES)
    expect('csv' in result && result.csv.trim().split('\r\n')).toHaveLength(3)
  })

  it('mozaika bez zestawu → komunikat zamiast pliku', () => {
    const result = projectCsv(project({ equipmentId: 'usuniety', framing: { ...FRAME, mosaic: { cols: 2, rows: 1, overlapPct: 20 } } }), DEMO_PROFILES)
    expect(result).toEqual({ error: 'Zestaw projektu nie istnieje; wybierz zestaw, żeby wyeksportować mozaikę.' })
  })

  it('nazwa pliku bez znaków niedozwolonych w Windows', () => {
    expect(projectFileName('NGC 7000: „Ameryka”/HOO?', 'csv')).toBe('NGC_7000_Ameryka_HOO.csv')
    expect(projectFileName('Sh2-129 Kałamarnica', 'json')).toBe('Sh2-129_Kałamarnica.json')
    expect(projectFileName('???', 'json')).toBe('projekt.json')
  })
})

describe('plik JSON projektu', () => {
  const saved = project({
    name: 'M 31 — LRGB',
    log: [{ nightDate: '2026-10-16', filter: 'L', subs: 60, exposureS: 120 }],
    goalMinutes: { L: 600 },
    notes: 'Korektor 1,0×',
  })

  it('eksport i ponowny import dają ten sam projekt; zestaw w pliku', () => {
    const text = projectToFile(saved, MY_SET)
    expect(JSON.parse(text)).toMatchObject({ format: PROJECT_FILE_FORMAT, version: 1, project: saved, equipment: MY_SET })
    expect(readProjectFile(text, { projectIds: [], profiles: DEMO_PROFILES })).toEqual({ project: saved, addProfile: null })
  })

  it('projekt o zajętym id dostaje nowe id', () => {
    const result = readProjectFile(projectToFile(saved, MY_SET), { projectIds: [saved.id], profiles: DEMO_PROFILES })
    expect('project' in result && result.project.id).not.toBe(saved.id)
    expect('project' in result && { ...result.project, id: saved.id }).toEqual(saved)
  })

  it('zestawu projektu nie ma na liście → import dodaje zestaw z pliku', () => {
    const custom: EquipmentProfile = { ...MY_SET, id: 'profil-z-innego-komputera', name: 'Zestaw kolegi' }
    const shared = { ...saved, equipmentId: custom.id }
    expect(readProjectFile(projectToFile(shared, custom), { projectIds: [], profiles: DEMO_PROFILES })).toEqual({
      project: shared,
      addProfile: custom,
    })
  })

  it('błędne pliki → komunikat', () => {
    const options = { projectIds: [], profiles: DEMO_PROFILES }
    expect(readProjectFile('nie json', options)).toEqual({ error: 'To nie jest plik JSON.' })
    expect(readProjectFile('{"format":"inny","version":1}', options)).toEqual({ error: 'To nie jest plik projektu tej aplikacji.' })
    const broken = JSON.stringify({ format: PROJECT_FILE_FORMAT, version: 1, project: { ...saved, framing: null }, equipment: null })
    expect(readProjectFile(broken, options)).toEqual({ error: 'Plik projektu jest uszkodzony albo niepełny.' })
    const future = JSON.stringify({ format: PROJECT_FILE_FORMAT, version: 2, project: saved, equipment: null })
    expect(readProjectFile(future, options)).toEqual({ error: 'Plik projektu ma nieobsługiwaną wersję 2.' })
  })

  it('isProject odrzuca złe wpisy dziennika i cele', () => {
    expect(isProject({ ...saved, log: [{ nightDate: '2026-10-16', filter: 'X', subs: 1, exposureS: 1 }] })).toBe(false)
    expect(isProject({ ...saved, log: [{ nightDate: '2026-10-16', filter: 'L', subs: 0, exposureS: 1 }] })).toBe(false)
    expect(isProject({ ...saved, goalMinutes: { L: -5 } })).toBe(false)
    expect(isProject({ ...saved, goalMinutes: { Q: 5 } })).toBe(false)
    expect(isProject({ ...saved, framing: { ...saved.framing, paDeg: Number.NaN } })).toBe(false)
  })
})

describe('kadr projektu', () => {
  it('PA i mozaika', () => {
    expect(framingTexts(FRAME)).toEqual({ pa: '30,0°', mosaic: 'pojedynczy kadr (1×1)' })
    expect(framingTexts({ ...FRAME, paDeg: 371.25, mosaic: { cols: 2, rows: 3, overlapPct: 15 } })).toEqual({ pa: '11,3°', mosaic: '2×3, zakładka 15%' })
  })

  it('kadr z zakładki Kadr: tylko dla obiektu projektu; przenosi kadr i zestaw', () => {
    const saved = project()
    const other: Framing = { ...FRAME, paDeg: 90, mosaic: { cols: 2, rows: 1, overlapPct: 20 } }
    expect(canTakeFraming(saved, other, 'NGC224')).toBe(true)
    expect(canTakeFraming(saved, other, 'NGC1976')).toBe(false)
    expect(canTakeFraming(saved, null, 'NGC224')).toBe(false)
    const taken = takeFraming(saved, other, REDCAT.id)
    expect(taken).toEqual({ ...saved, framing: other, equipmentId: REDCAT.id })
    other.paDeg = 1
    expect(taken.framing.paDeg).toBe(90)
  })
})
