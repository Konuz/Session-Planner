import { formatDesignation } from '../../services/catalog/records'
import type { DsoObject } from '../../types'

/** Nazwa obiektu na liście wyboru (Noc, Kadr): „M 42 (Great Orion Nebula)” albo samo oznaczenie. */
export function objectName(object: DsoObject): string {
  const name = formatDesignation(object.primary)
  return object.commonNames.length > 0 ? `${name} (${object.commonNames[0]})` : name
}
