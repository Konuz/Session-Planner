import { CATALOG_DISTANCE_SCOPES, type CatalogRow, type SourceRow } from '../src/lib/catalog.ts'
import { hasDistance } from '../src/lib/distance.ts'

// Potwierdzone powiązania optycznych składowych z pozostałościami. Źródła: docs/odleglosci/stan.md.
export const SNR_COMPONENTS = [
  ['SNR G074.0-08.5', ['NGC 6960', 'NGC 6974', 'NGC 6979', 'NGC 6992', 'NGC 6995', 'IC 1340']],
  ['SNR G065.3+05.7', ['Sh2-91', 'Sh2-94', 'Sh2-96']],
  ['SNR G116.9+00.2', ['LBN 576']],
  ['SNR G132.7+01.3', ['LBN 641']],
  ['SNR G160.9+02.6', ['LBN 759']],
  ['SNR G166.0+04.3', ['Sh2-224']],
  ['SNR G260.4-03.4', ['RCW 28', 'RCW 29', 'RCW 30', 'RCW 31']],
  ['SNR G263.9-03.3', ['NGC 2736']],
] as const

// Pomiary z publikacji dla pozostałości, których wartości z zestawienia Ranasinghe & Leahy mają σ > 50%.
export const SNR_COMPONENT_PARENT_DISTANCES = new Map<string, { pc: number; sigmaPc: number; method: string; source: string; ref: string }>([
  ['SNR G160.9+02.6', { pc: 540, sigmaPc: 100, method: 'skok ekstynkcji na linii widzenia (Gaia)', source: 'Zhao i in. 2020, ApJ 891, 137', ref: '2020ApJ...891..137Z' }],
  ['SNR G260.4-03.4', { pc: 1300, sigmaPc: 300, method: 'odległość kinematyczna z obserwacji HI (model Fich i in.)', source: 'Reynoso i in. 2017, MNRAS 464, 3029', ref: '2017MNRAS.464.3029R' }],
])

const remnantScope = CATALOG_DISTANCE_SCOPES.indexOf('remnant')
const usable = (row: CatalogRow) => hasDistance({ distLy: row[13], uncertaintyLy: row[16] ? row[13] * row[16] / 1000 : null })

/** Dziedziczymy wartość i niepewność pomiaru całości, zachowując geometrię i sprawdzone pomiary składowych. */
export function inheritSnrComponentDistances(rows: CatalogRow[], sources: SourceRow[], unresolved: readonly number[], photoAliases: Record<string, string>): number {
  const pending = new Set(unresolved)
  const byId = new Map(rows.flatMap((row, i) => pending.has(i) ? [] : [[row[0], row] as const]))
  let inherited = 0
  for (const [parentId, components] of SNR_COMPONENTS) {
    const distinct = new Set<string>([parentId, ...components])
    for (const id of distinct) if (distinct.has(photoAliases[id])) delete photoAliases[id]

    const parent = byId.get(parentId)
    const parentSource = parent?.[17] === undefined ? undefined : sources[parent[17]]
    if (!parent || parent[4] !== 'SNR' || parentSource?.[4] !== 1 || !usable(parent)) continue
    const method = `${parentId} · ${parentSource[1]}`
    let index = sources.findIndex(([scope, name, source, ref, verified]) =>
      scope === remnantScope && name === method && source === parentSource[2] && ref === parentSource[3] && verified === 1)
    for (const id of components) {
      const child = byId.get(id)
      if (!child) continue
      const current = child[17] === undefined ? undefined : sources[child[17]]
      if (current?.[4] === 1 && current[0] !== remnantScope && usable(child)) continue
      if (index < 0) index = sources.push([remnantScope, method, parentSource[2], parentSource[3], 1]) - 1
      child[13] = parent[13]
      child[16] = parent[16] ?? 0
      child[17] = index
      inherited++
    }
  }
  return inherited
}
