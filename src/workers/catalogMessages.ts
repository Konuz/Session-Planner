// Komunikaty między wątkiem głównym a Workerem katalogu (sekcja 3, 7A) i budowanie żądania ze stanu aplikacji.
import type { CatalogNightParams, CatalogTarget, ObjectNightSummary } from '../services/catalogNight'
import type { Darkness } from '../services/visibility'
import type { ObserverLocation, PlanningSettings } from '../types'

/** „katalog”: obiekty do liczenia, tylko uid i współrzędne J2000; zastępuje poprzedni katalog i czyści pamięć. */
export interface CatalogMessage {
  type: 'catalog'
  objects: CatalogTarget[]
}

/** „licz”: numer żądania i parametry nocy (klucz pamięci podręcznej). */
export interface ComputeMessage {
  type: 'compute'
  requestId: number
  params: CatalogNightParams
}

export type CatalogWorkerRequest = CatalogMessage | ComputeMessage

/** „gotowy”: katalog przyjęty, z liczbą obiektów. */
export interface ReadyResponse {
  type: 'ready'
  count: number
}

/** „wynik”: numer żądania, czy z pamięci, stan nocy i wyniki w kolejności obiektów katalogu. */
export interface ResultResponse {
  type: 'result'
  requestId: number
  fromCache: boolean
  darkness: Darkness
  objects: ObjectNightSummary[]
}

/** „błąd”: numer żądania i komunikat dla użytkownika. */
export interface ErrorResponse {
  type: 'error'
  requestId: number
  message: string
}

export type CatalogWorkerResponse = ReadyResponse | ResultResponse | ErrorResponse

/** Stan aplikacji, z którego powstaje żądanie: aktywna lokalizacja, noc D ('RRRR-MM-DD') i parametry planowania. */
export interface CatalogRequestSource {
  location: ObserverLocation
  nightDate: string
  settings: PlanningSettings
}

/** Parametry żądania „licz” ze stanu aplikacji: tylko pola klucza pamięci (bez nazwy lokalizacji i parametrów spoza klucza). */
export function buildCatalogRequest({ location, nightDate, settings }: CatalogRequestSource): CatalogNightParams {
  const { latDeg, lonDegEast, elevationM, timezone, horizon } = location
  const { darknessThresholdDeg, autoLowerThreshold, minAltitudeDeg, catalogStepMin } = settings
  return {
    location: { latDeg, lonDegEast, elevationM, timezone, horizon },
    nightDate,
    settings: { darknessThresholdDeg, autoLowerThreshold, minAltitudeDeg, catalogStepMin },
  }
}
