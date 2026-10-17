// Lista „Klasyki” (6.4) do wyboru obiektu na wykresie nocy, zanim powstanie moduł katalogu (7A).
import { designationKey } from '../services/catalog/records'
import type { Designation, DsoObject } from '../types'
import featured from './featured.json'

/** Obiekt wybrany domyślnie: M 31 z wektorów T7 i T9. */
export const DEFAULT_OBJECT: Designation = { catalog: 'M', id: '31' }

/** Obiekty z listy „Klasyki” w kolejności z featured.json; dane pochodzą z katalogu. */
export function featuredObjects(catalog: readonly DsoObject[]): DsoObject[] {
  const byDesignation = new Map(catalog.flatMap((object) => object.designations.map((d) => [designationKey(d), object] as const)))
  return (featured as Designation[]).flatMap((designation) => byDesignation.get(designationKey(designation)) ?? [])
}

/** Obiekt na wykresie nocy: zapamiętany uid, a gdy go nie ma na liście – obiekt domyślny (M 31). */
export function selectFeatured(objects: readonly DsoObject[], uid: string | null): DsoObject | null {
  const isDefault = (object: DsoObject) =>
    object.designations.some((d) => d.catalog === DEFAULT_OBJECT.catalog && d.id === DEFAULT_OBJECT.id)
  return objects.find((object) => object.uid === uid) ?? objects.find(isDefault) ?? objects[0] ?? null
}

let catalogRequest: Promise<DsoObject[]> | null = null

/** Katalog z public/catalog (6.1), pobierany raz; plik nie trafia do paczki JS. */
export function loadCatalog(): Promise<DsoObject[]> {
  catalogRequest ??= fetch(`${import.meta.env.BASE_URL}catalog/catalog.v1.json`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Nie udało się wczytać katalogu (HTTP ${response.status})`)
      return (await response.json()) as DsoObject[]
    })
    .catch((error: unknown) => {
      catalogRequest = null // następna próba pobierze plik ponownie
      throw error
    })
  return catalogRequest
}
