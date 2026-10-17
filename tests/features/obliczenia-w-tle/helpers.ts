// Wspólne dane testów funkcji „obliczenia-w-tle”.
import { readFileSync } from 'node:fs'
import { expect, vi, type Mock } from 'vitest'
import { designationKey, formatDesignation } from '../../../src/services/catalog/records'
import { computeCatalogNight, type CatalogNightParams, type CatalogTarget } from '../../../src/services/catalogNight'
import { DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import { createCatalogEngine, type CatalogEngine } from '../../../src/workers/catalogEngine'
import type { CatalogWorkerPort } from '../../../src/workers/catalogClient'
import type {
  CatalogWorkerRequest,
  CatalogWorkerResponse,
  ErrorResponse,
  ReadyResponse,
  ResultResponse,
} from '../../../src/workers/catalogMessages'
import type { Designation, DsoObject, ObserverLocation, PlanningSettings } from '../../../src/types'

/** Katalog aplikacji (public/catalog, 16 516 obiektów). */
export const CATALOG = JSON.parse(
  readFileSync(new URL('../../../public/catalog/catalog.v1.json', import.meta.url), 'utf8'),
) as DsoObject[]

const byDesignation = new Map(
  CATALOG.flatMap((object) => object.designations.map((designation) => [designationKey(designation), object] as const)),
)

/** Obiekt katalogu aplikacji po oznaczeniu, np. catalogObject('M', '31'). */
export function catalogObject(catalog: Designation['catalog'], id: string): DsoObject {
  const object = byDesignation.get(designationKey({ catalog, id }))
  if (!object) throw new Error(`Brak obiektu ${formatDesignation({ catalog, id })} w katalogu`)
  return object
}

export const M31 = catalogObject('M', '31')
export const NGC7000 = catalogObject('NGC', '7000')
export const IC1396 = catalogObject('IC', '1396')
export const M42 = catalogObject('M', '42')
export const M45 = catalogObject('M', '45')
export const M101 = catalogObject('M', '101')

/** Tylko uid i współrzędne J2000 – tyle dostaje Worker. */
export function targetsOf(objects: readonly DsoObject[]): CatalogTarget[] {
  return objects.map(({ uid, raDeg, decDeg }) => ({ uid, raDeg, decDeg }))
}

/** Pięć obiektów z T9 w kolejności z przykładów: M 31, NGC 7000, IC 1396, M 42, M 45. */
export const FIVE_OBJECTS: readonly DsoObject[] = [M31, NGC7000, IC1396, M42, M45]
export const FIVE: CatalogTarget[] = targetsOf(FIVE_OBJECTS)

/** Pełny katalog jako komunikat „katalog”. */
export const FULL_CATALOG: CatalogTarget[] = targetsOf(CATALOG)

export const OCT_15 = '2026-10-15'
export const OCT_16 = '2026-10-16'
export const OCT_17 = '2026-10-17'
export const JUN_21 = '2026-06-21'

/** Lokalizacja żądania bazowego (pełny rekord z aplikacji): 52,0°N, 19,0°E, 150 m, Europe/Warsaw, horyzont płaski. */
export const BASE_LOCATION: ObserverLocation = {
  id: 'wektory-plaski',
  name: 'Polska centralna (horyzont płaski)',
  latDeg: 52,
  lonDegEast: 19,
  elevationM: 150,
  timezone: 'Europe/Warsaw',
  horizon: [],
  bortle: null,
  sqm: null,
}

/** Parametry planowania żądania bazowego (pełny obiekt, jak w aplikacji): próg −18° z obniżaniem, h_min 30°, krok 5 min. */
export const BASE_SETTINGS: PlanningSettings = {
  ...DEFAULT_PLANNING_SETTINGS,
  darknessThresholdDeg: -18,
  autoLowerThreshold: true,
  minAltitudeDeg: 30,
  catalogStepMin: 5,
}

/** Żądanie bazowe zapisane wprost (pola klucza): 52,0°N, 19,0°E, 150 m, Europe/Warsaw, płaski, 16/17.10.2026, −18° z obniżaniem, 30°, 5 min. */
export function baseParams(): CatalogNightParams {
  return {
    location: { latDeg: 52, lonDegEast: 19, elevationM: 150, timezone: 'Europe/Warsaw', horizon: [] },
    nightDate: OCT_16,
    settings: { darknessThresholdDeg: -18, autoLowerThreshold: true, minAltitudeDeg: 30, catalogStepMin: 5 },
  }
}

export interface ParamsPatch {
  location?: Partial<CatalogNightParams['location']>
  nightDate?: string
  settings?: Partial<CatalogNightParams['settings']>
}

/** Żądanie bazowe ze zmienionymi polami. */
export function paramsWith(patch: ParamsPatch): CatalogNightParams {
  const base = baseParams()
  return {
    location: { ...base.location, ...patch.location },
    nightDate: patch.nightDate ?? base.nightDate,
    settings: { ...base.settings, ...patch.settings },
  }
}

export const catalogMessage = (objects: CatalogTarget[]): CatalogWorkerRequest => ({ type: 'catalog', objects })

export const computeMessage = (requestId: number, params: CatalogNightParams): CatalogWorkerRequest => ({
  type: 'compute',
  requestId,
  params,
})

/** Silnik z licznikiem liczenia: `compute` woła prawdziwe `computeCatalogNight`. */
export interface CountingEngine {
  engine: CatalogEngine
  /** Liczenie przekazane silnikowi; liczba wywołań = liczba liczeń. */
  compute: Mock<typeof computeCatalogNight>
}

export function countingEngine(): CountingEngine {
  const compute = vi.fn<typeof computeCatalogNight>((params, targets) => computeCatalogNight(params, targets))
  return { engine: createCatalogEngine({ compute }), compute }
}

/**
 * Wysyła komunikat jak przez `postMessage` (kopia strukturalna w obie strony), więc silnik nie może polegać na
 * tożsamości obiektów.
 */
export function send(engine: CatalogEngine, message: CatalogWorkerRequest): CatalogWorkerResponse {
  return structuredClone(engine.handle(structuredClone(message)))
}

/** Silnik z wczytanym katalogiem `objects` (odpowiedź „gotowy” sprawdzona). */
export function loaded(objects: CatalogTarget[] = FIVE): CountingEngine {
  const counting = countingEngine()
  expect(send(counting.engine, catalogMessage(objects))).toEqual({ type: 'ready', count: objects.length })
  return counting
}

export function asReady(response: CatalogWorkerResponse): ReadyResponse {
  if (response.type !== 'ready') throw new Error(`Oczekiwano „gotowy”, jest ${JSON.stringify(response).slice(0, 200)}`)
  return response
}

export function asResult(response: CatalogWorkerResponse): ResultResponse {
  if (response.type !== 'result') throw new Error(`Oczekiwano „wynik”, jest ${JSON.stringify(response).slice(0, 200)}`)
  return response
}

export function asError(response: CatalogWorkerResponse): ErrorResponse {
  if (response.type !== 'error') throw new Error(`Oczekiwano „błąd”, jest ${JSON.stringify(response).slice(0, 200)}`)
  return response
}

/** Wynik żądania `params` z numerem `requestId`. */
export function resultFor(engine: CatalogEngine, requestId: number, params: CatalogNightParams): ResultResponse {
  return asResult(send(engine, computeMessage(requestId, params)))
}

/** Atrapa Workera z `postMessage`: zapisuje wysłane komunikaty, a odpowiedzi podaje przez `onmessage`. */
export class FakeWorker implements CatalogWorkerPort {
  readonly sent: CatalogWorkerRequest[] = []
  onmessage: ((event: MessageEvent<CatalogWorkerResponse>) => void) | null = null
  terminated = false

  postMessage = (message: CatalogWorkerRequest): void => {
    this.sent.push(structuredClone(message))
  }

  terminate(): void {
    this.terminated = true
  }

  /** Odpowiedź Workera dociera do wątku głównego. */
  reply(response: CatalogWorkerResponse): void {
    this.onmessage?.(new MessageEvent('message', { data: structuredClone(response) }))
  }
}
