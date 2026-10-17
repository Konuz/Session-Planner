// Klient Workera katalogu w wątku głównym: numeruje żądania i przyjmuje tylko odpowiedź na ostatnie.
// ZAŚLEPKA funkcji „obliczenia-w-tle”: każde wywołanie zgłasza NotImplementedError.
import type { CatalogNightParams, CatalogTarget } from '../services/catalogNight'
import type { CatalogWorkerRequest, CatalogWorkerResponse } from './catalogMessages'

/** Worker (`catalog.worker.ts`) albo atrapa w testach: wysyłanie komunikatów i odbiór odpowiedzi. */
export interface CatalogWorkerPort {
  postMessage: (message: CatalogWorkerRequest) => void
  onmessage: ((event: MessageEvent<CatalogWorkerResponse>) => void) | null
}

export interface CatalogClient {
  /** Przekazuje katalog: Worker dostaje tylko uid i współrzędne J2000 obiektów. */
  sendCatalog(objects: readonly CatalogTarget[]): void
  /** Wysyła żądanie „licz” z kolejnym numerem (1, 2, 3, …) i zwraca ten numer. */
  request(params: CatalogNightParams): number
}

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

/**
 * Klient Workera. `onResponse` dostaje odpowiedzi z wyjątkiem „wynik” i „błąd” dla żądań starszych niż ostatnie wysłane.
 * Bez `worker` klient tworzy Worker z `catalog.worker.ts`.
 */
export function createCatalogClient(
  onResponse: (response: CatalogWorkerResponse) => void,
  worker?: CatalogWorkerPort,
): CatalogClient {
  void onResponse
  void worker
  return notImplemented('createCatalogClient')
}
