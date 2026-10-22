import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANNING_SETTINGS } from '../services/planningSettings'
import type { CameraSpec, Project, TelescopeSpec } from '../types'
import {
  BACKUP_FORMAT,
  backupFileName,
  backupSummary,
  backupToFile,
  readAllTables,
  readBackupFile,
  replaceAllTables,
  type BackupTables,
} from './backup'
import { openPlannerDb } from './db'
import { DEMO_LOCATION, DEMO_PROFILES } from './demo'
import { HOME_LOCATION } from './locations'

let databases = 0
const freshDb = () => openPlannerDb(`backup-test-${++databases}`)

const TELESCOPE: TelescopeSpec = {
  id: 'teleskop-1',
  brand: '',
  model: 'Mój Newton',
  design: 'other',
  apertureMm: 150,
  focalLengthMm: 600,
  origin: 'user',
}
const CAMERA: CameraSpec = {
  id: 'kamera-1',
  brand: '',
  model: 'Moja kamera',
  sensorModel: null,
  sensor: 'mono',
  resolutionXPx: 3008,
  resolutionYPx: 3008,
  pixelSizeUm: 3.76,
  origin: 'user',
}
const PROJECT: Project = {
  id: 'projekt-1',
  name: 'M 31',
  objectUid: 'NGC224',
  equipmentId: 'demo-moj-zestaw',
  framing: { centerRaDeg: 10.6846, centerDecDeg: 41.2692, paDeg: 30, mosaic: { cols: 1, rows: 1, overlapPct: 20 } },
  log: [{ nightDate: '2026-10-16', filter: 'Ha', subs: 30, exposureS: 300 }],
  goalMinutes: { Ha: 600 },
  notes: 'test',
  createdAtIso: '2026-10-16T18:00:00.000Z',
}

const TABLES: BackupTables = {
  locations: [HOME_LOCATION, DEMO_LOCATION],
  settings: [
    { id: 'planning', value: { ...DEFAULT_PLANNING_SETTINGS, minAltitudeDeg: 25 } },
    { id: 'profiles', value: DEMO_PROFILES },
  ],
  userTelescopes: [TELESCOPE],
  userCameras: [CAMERA],
  userObjects: [],
  projects: [PROJECT],
}

async function fill(tables: BackupTables) {
  const db = freshDb()
  await replaceAllTables(db, tables)
  return db
}

describe('kopia zapasowa wszystkich danych użytkownika (sekcja 10)', () => {
  it('odczyt wszystkich tabel i zapis do pliku JSON z formatem, wersją i datą', async () => {
    const db = await fill(TABLES)
    const tables = await readAllTables(db)
    expect(tables).toEqual(TABLES)
    const file = JSON.parse(backupToFile(tables, '2026-10-22T20:00:00.000Z')) as Record<string, unknown>
    expect(file).toEqual({ format: BACKUP_FORMAT, version: 1, exportedAtIso: '2026-10-22T20:00:00.000Z', tables: TABLES })
  })

  it('eksport i import przywracają te same dane, a import zastępuje poprzednie', async () => {
    const text = backupToFile(await readAllTables(await fill(TABLES)), '2026-10-22T20:00:00.000Z')
    const other = await fill({ ...TABLES, locations: [DEMO_LOCATION], projects: [{ ...PROJECT, id: 'inny' }], userCameras: [] })
    const read = readBackupFile(text)
    expect('tables' in read).toBe(true)
    if (!('tables' in read)) return
    await replaceAllTables(other, read.tables)
    expect(await readAllTables(other)).toEqual(TABLES)
  })

  it('nieudany zapis nie zmienia danych (jedna transakcja)', async () => {
    const db = await fill(TABLES)
    const broken = { ...TABLES, projects: [{ ...PROJECT, id: undefined } as unknown as Project] }
    await expect(replaceAllTables(db, broken)).rejects.toThrow()
    expect(await readAllTables(db)).toEqual(TABLES)
  })

  it('podsumowanie i nazwa pliku', () => {
    expect(backupSummary(TABLES)).toBe('2 lokalizacje, 4 zestawy, 1 projekt, własny sprzęt: 1 teleskop i 1 kamera')
    expect(backupSummary({ ...TABLES, settings: [], userTelescopes: [], userCameras: [], projects: [] })).toBe(
      '2 lokalizacje, 0 zestawów, 0 projektów',
    )
    expect(backupFileName('2026-10-22T20:00:00.000Z')).toBe('astro-planner-kopia-2026-10-22.json')
  })
})

describe('odczyt pliku kopii', () => {
  const file = (changes: Record<string, unknown>) =>
    JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAtIso: '2026-10-22T20:00:00.000Z', tables: TABLES, ...changes })

  it('poprawny plik', () => {
    expect(readBackupFile(file({}))).toEqual({ tables: TABLES, exportedAtIso: '2026-10-22T20:00:00.000Z' })
  })

  it.each([
    ['nie JSON', '{', 'To nie jest plik JSON.'],
    ['inny format', file({ format: 'astrophotography-planner-project' }), 'To nie jest kopia zapasowa tej aplikacji.'],
    ['nowsza wersja', file({ version: 2 }), 'Kopia ma nieobsługiwaną wersję 2.'],
    ['brak tabeli', file({ tables: { ...TABLES, projects: undefined } }), 'Kopia jest uszkodzona: tabela „projects”.'],
    [
      'zła lokalizacja',
      file({ tables: { ...TABLES, locations: [{ ...HOME_LOCATION, latDeg: 'x' }] } }),
      'Kopia jest uszkodzona: tabela „locations”, wpis 1.',
    ],
    [
      'zły projekt',
      file({ tables: { ...TABLES, projects: [PROJECT, { ...PROJECT, log: [{}] }] } }),
      'Kopia jest uszkodzona: tabela „projects”, wpis 2.',
    ],
    [
      'złe parametry planowania',
      file({ tables: { ...TABLES, settings: [{ id: 'planning', value: { minAltitudeDeg: 'x' } }] } }),
      'Kopia jest uszkodzona: tabela „settings”, wpis 1.',
    ],
    [
      'zły profil sprzętu',
      file({ tables: { ...TABLES, settings: [{ id: 'profiles', value: [{ id: 'p' }] }] } }),
      'Kopia jest uszkodzona: tabela „settings”, wpis 1.',
    ],
    [
      'zły teleskop',
      file({ tables: { ...TABLES, userTelescopes: [{ ...TELESCOPE, apertureMm: null }] } }),
      'Kopia jest uszkodzona: tabela „userTelescopes”, wpis 1.',
    ],
  ])('%s → komunikat', (_, text, error) => {
    expect(readBackupFile(text)).toEqual({ error })
  })
})
