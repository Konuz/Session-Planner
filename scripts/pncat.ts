import * as Astronomy from 'astronomy-engine'
import type { CatalogRow } from '../src/lib/catalog.ts'
import { separationDeg } from './catalogDistances.ts'

export const PNCAT_URL = 'https://archive.stsci.edu/hlsps/guvpncat/hlsp_guvpncat_multi_imaging_pncat_multi_v1_cat.csv'

// PNcat podaje T, ale publiczny wyciąg HASH z 28.09.2026 podaje L. Lista i źródła są w docs/audits/pncat.md.
const DISPUTED = new Set([
  '000.4+02.2', '004.0-03.0', '019.7-10.7', '020.2-01.9', '021.0+01.9', '022.1+03.0',
  '022.1-02.4', '028.8-00.2', '034.1-01.6', '039.0-04.0', '053.1-02.1', '080.3-10.4',
  '155.5+05.1', '216.0+07.4', '357.4-07.2',
])

// Skrócony zapis pary oznaczeń NGC/IC w PNcat.
const COMPOUND_NAMES = new Map([
  ['IC 5148/50', 'IC 5148'],
  ['NGC 650-1', 'NGC 650'],
  ['NGC 2371-72', 'NGC 2371'],
])

// Obie sygnatury każdej pary prowadzą do tego samego obiektu SIMBAD.
const VERIFIED_EQUIVALENTS = new Map([
  ['001.7-03.8', '001.8-03.8'],
  ['011.7+00.0', '011.7-00.0'],
  ['021.0-04.0', '021.0-04.1'],
  ['285.4+01.2', '285.7+01.2'],
])

const key = (id: string) => id.toUpperCase().replace(/[−–]/g, '-').replace(/\s/g, '')
const designation = (png: string) => `PN G${png}`
const arcmin = (text: string) => Math.max(0, Math.round(Number(text) / 60 * 100) / 100)
const arcsecBetween = (row: CatalogRow, ra: number, dec: number) => 3600 * separationDeg(row[5], row[6], ra, dec)

function pncatRow(record: string[]): CatalogRow {
  const [png, rawName, , , , raText, decText, , a, b] = record
  const id = designation(png.trim())
  const name = rawName.trim().replace(/\s+/g, ' ')
  const ra = Number(raText), dec = Number(decText)
  return [
    name || id, name ? id : '', '', png === '075.5+01.7' ? 'Soap Bubble Nebula' : '', 'PN',
    Math.round(ra * 10000) / 10000, Math.round(dec * 10000) / 10000, arcmin(a), arcmin(b),
    -1, 99, 99, Astronomy.Constellation(ra / 15, dec).symbol, 0, '', '',
  ]
}

/** PNcat MAST v1. Dopisuje rekordy na końcu, a aliasy do istniejących wierszy, bez zmiany indeksów. */
export function mergePncat(rows: CatalogRow[], csv: string[][]) {
  const [header, ...records] = csv
  if (header?.slice(0, 10).join(',') !== 'PNG,Name,PNstat,RAJ2000,DECJ2000,DRAJ2000,DDECJ2000,Catalogue,MajDiam,MinDiam') {
    throw new Error('PNcat: nieznany układ kolumn')
  }
  const groups = new Map<string, string[][]>()
  for (const record of records) {
    if (record[2] !== 'T') continue
    const png = record[0].trim()
    const group = groups.get(png) ?? []
    group.push(record)
    groups.set(png, group)
  }
  if (!groups.size) throw new Error('PNcat: brak potwierdzonych mgławic')

  const owners = new Map<string, Set<CatalogRow>>()
  const remember = (name: string, row: CatalogRow) => {
    const normalized = key(name)
    if (!normalized) return
    const list = owners.get(normalized) ?? new Set<CatalogRow>()
    list.add(row)
    owners.set(normalized, list)
  }
  const existingPn = rows.filter((row) => row[4] === 'PN')
  for (const row of rows) for (const name of [row[0], ...row[1].split('|')]) remember(name, row)

  const report = {
    confirmed: groups.size,
    added: [] as string[],
    aliased: [] as string[],
    represented: [] as string[],
    disputed: [] as string[],
    review: [] as { id: string; name: string; reason: string; owners: string[] }[],
    offsets: [] as { id: string; existing: string; arcsec: number }[],
  }
  for (const [png, group] of groups) {
    const id = designation(png)
    if (DISPUTED.has(png)) {
      report.disputed.push(id)
      continue
    }
    const [, rawName, , , , raText, decText, , a, b] = group[0]
    const name = rawName.trim().replace(/\s+/g, ' ')
    const ra = Number(raText), dec = Number(decText)
    const size = arcmin(a), minor = arcmin(b)
    const review = (reason: string, hits: CatalogRow[] = []) =>
      report.review.push({ id, name, reason, owners: hits.map((row) => row[0]) })
    const measurements = new Set(group.map((record) => [key(record[1]), ...record.slice(5, 7)].join('|')))
    if (!/^\d{3}\.\d[+-]\d{2}\.\d[a-z]*$/i.test(png) || !raText?.trim() || !decText?.trim() ||
        !(ra >= 0 && ra < 360 && Math.abs(dec) <= 90) || !Number.isFinite(size + minor) || measurements.size > 1) {
      review('niejednoznaczne lub nieprawidłowe dane źródłowe')
      continue
    }
    const byId = owners.get(key(id))
    const equivalent = VERIFIED_EQUIVALENTS.get(png)
    const byEquivalent = equivalent ? owners.get(key(designation(equivalent))) : undefined
    const byName = owners.get(key(COMPOUND_NAMES.get(name) ?? name))
    const hits = [...new Set([...(byId ?? []), ...(byEquivalent ?? []), ...(byName ?? [])])]
    if (hits.length) {
      const row = hits[0]
      const distance = arcsecBetween(row, ra, dec)
      const limit = Math.max(60, 30 * Math.max(row[7], size))
      if (hits.length > 1 || row[4] !== 'PN' || (!byId && !byEquivalent && distance > limit)) {
        review('konflikt identyfikatora, typu lub pozycji', hits)
        continue
      }
      if (byId) {
        report.represented.push(id)
        if (distance > limit) report.offsets.push({ id, existing: row[0], arcsec: Math.round(distance) })
        continue
      }
      const storedPng = [row[0], ...row[1].split('|')].find((alias) => /^PNG\d/i.test(key(alias)))
      if (storedPng && !byEquivalent && distance > 5) {
        review('inna sygnatura PN G w istniejącym wpisie', hits)
        continue
      }
      row[1] = [row[1], id].filter(Boolean).join('|')
      remember(id, row)
      report.aliased.push(id)
      continue
    }
    const near = existingPn.filter((row) => Math.abs(row[6] - dec) <= 10 / 3600 && arcsecBetween(row, ra, dec) <= 10)
    if (near.length) {
      review('istniejąca mgławica w promieniu 10″', near)
      continue
    }

    const row = pncatRow(group[0])
    rows.push(row)
    existingPn.push(row)
    remember(id, row)
    remember(name, row)
    report.added.push(id)
  }
  return report
}

// Rozstrzygnięcia według źródeł z docs/audits/pncat.md. Nowe wpisy trafiają za import zbiorczy.
export function applyVerifiedPncatIdentifications(rows: CatalogRow[], csv: string[][]) {
  const confirmed = new Map(csv.filter((row) => row[2] === 'T').map((row) => [row[0].trim(), row]))
  const byName = new Map(rows.map((row) => [row[0], row]))
  const byPng = new Map(rows.flatMap((row) => row[1].split('|')
    .filter((alias) => alias.startsWith('PN G')).map((alias) => [alias.slice(4), row] as const)))
  const resolved = new Set<string>()
  const verified = (png: string) => {
    const record = confirmed.get(png)
    if (!record) throw new Error(`PNcat: brak zweryfikowanego rekordu ${png}`)
    resolved.add(designation(png))
    return pncatRow(record)
  }
  const requireRow = (row: CatalogRow | undefined, id: string) => {
    if (!row) throw new Error(`PNcat: brak istniejącego rekordu ${id}`)
    return row
  }

  for (const [name, png, alias] of [
    ['Sh2-42', '013.3+01.1'], ['Sh2-123', '091.0-06.3'], ['Sh2-176', '120.2-05.3'],
    ['Sh2-200', '138.1+04.1', 'HDW 2'], ['Sh2-215', '158.3-05.6a'],
    ['RCW 24', '258.5-01.3'], ['RCW 69', '302.1+00.3'],
  ]) {
    const row = requireRow(byName.get(name), name)
    const pn = verified(png)
    row[1] = [...new Set([...row[1].split('|').filter(Boolean), pn[1], ...(alias ? [alias] : [])])].join('|')
    row[4] = 'PN'
    row[5] = pn[5]
    row[6] = pn[6]
    row[7] = pn[7]
    row[8] = pn[8]
    row[12] = pn[12]
  }

  for (const [legacyPng, name] of [
    ['002.3+02.2', 'K 5-11'], ['329.5-02.2', 'HeFa 1'], ['260.7+00.9', 'PK 260+00 1'],
  ]) {
    const row = requireRow(byPng.get(legacyPng), legacyPng)
    row[0] = name
    if (legacyPng === '260.7+00.9') row[4] = 'RN'
  }

  for (const [legacyPng, alias] of [['094.5-00.8', 'LDu 1'], ['289.6-01.6', 'St 52']]) {
    const row = requireRow(byPng.get(legacyPng), legacyPng)
    row[1] = row[1].split('|').filter((name) => name !== alias).join('|')
  }

  for (const [legacyPng, png, name] of [
    ['358.3-02.5', '358.5-02.5', 'M 4-7'],
    ['359.5+02.6', '359.5+02.6', 'Al 2-I'],
    ['359.6+02.2', '359.6+02.2', 'Al 2-K'],
  ]) {
    const row = requireRow(byPng.get(png) ?? byPng.get(legacyPng), png)
    const pn = verified(png)
    row[0] = name
    row[1] = row[1].split('|').map((alias) => alias === designation(legacyPng) ? pn[1] : alias).join('|')
    row[7] = pn[7]
    row[8] = pn[8]
  }

  for (const png of ['094.5-00.8a', '150.0-00.3', '260.1+00.2', '289.6-01.6a', '330.7-02.0']) {
    const row = verified(png)
    if (!byPng.has(png)) rows.push(row)
  }
  return resolved
}
