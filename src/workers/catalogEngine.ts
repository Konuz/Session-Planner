// Silnik Workera katalogu: komunikat → odpowiedź, z pamięcią podręczną wyników nocy (7A).
// ZAŚLEPKA funkcji „obliczenia-w-tle”: każde wywołanie zgłasza NotImplementedError.
import type { CatalogNightParams, CatalogNightResult, CatalogTarget } from '../services/catalogNight'
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

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

/**
 * Nowy silnik z pustą pamięcią. Klucz pamięci: szerokość, długość, wysokość n.p.m., strefa czasowa,
 * skrót horyzontu (z punktów), noc D, próg i obniżanie, h_min, krok katalogu.
 */
export function createCatalogEngine(options: CatalogEngineOptions = {}): CatalogEngine {
  void options
  return notImplemented('createCatalogEngine')
}
