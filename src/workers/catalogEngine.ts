// Silnik Workera katalogu: komunikat → odpowiedź, z pamięcią podręczną wyników nocy (7A).
import {
  computeCatalogNight,
  type CatalogNightParams,
  type CatalogNightResult,
  type CatalogTarget,
} from '../services/catalogNight'
import type { CatalogWorkerRequest, CatalogWorkerResponse } from './catalogMessages'

/** Liczenie widoczności katalogu; domyślnie `computeCatalogNight` z `services/catalogNight.ts`. */
export type ComputeCatalogNight = (params: CatalogNightParams, targets: readonly CatalogTarget[]) => CatalogNightResult

export interface CatalogEngineOptions {
  compute?: ComputeCatalogNight
}

export interface CatalogEngine {
  /** Odpowiedź na jeden komunikat; po błędzie silnik przyjmuje dalsze komunikaty. */
  handle(message: CatalogWorkerRequest): CatalogWorkerResponse
}

/** Klucz pamięci z samych pól klucza (kolejność pozycyjna, horyzont z punktów, bez nazwy lokalizacji). */
function cacheKey({ location, nightDate, settings }: CatalogNightParams): string {
  return JSON.stringify([
    location.latDeg,
    location.lonDegEast,
    location.elevationM,
    location.timezone,
    location.horizon.map((point) => [point.azDeg, point.altDeg]),
    nightDate,
    settings.darknessThresholdDeg,
    settings.autoLowerThreshold,
    settings.minAltitudeDeg,
    settings.catalogStepMin,
  ])
}

/**
 * Nowy silnik z pustą pamięcią. Klucz pamięci: szerokość, długość, wysokość n.p.m., strefa czasowa,
 * skrót horyzontu (z punktów), noc D, próg i obniżanie, h_min, krok katalogu.
 */
export function createCatalogEngine({ compute = computeCatalogNight }: CatalogEngineOptions = {}): CatalogEngine {
  let targets: CatalogTarget[] | null = null
  const cache = new Map<string, CatalogNightResult>()
  return {
    handle(message) {
      if (message.type === 'catalog') {
        targets = message.objects
        cache.clear()
        return { type: 'ready', count: targets.length }
      }
      const { requestId, params } = message
      if (!targets) return { type: 'error', requestId, message: 'Katalog nie jest wczytany' }
      const key = cacheKey(params)
      const cached = cache.get(key)
      const result = cached ?? compute(params, targets)
      cache.set(key, result)
      return { type: 'result', requestId, fromCache: cached !== undefined, ...result }
    },
  }
}
