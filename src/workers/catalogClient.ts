// Klient Workera katalogu w wątku głównym: numeruje żądania i przyjmuje tylko odpowiedź na ostatnie.
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

/**
 * Klient Workera. `onResponse` dostaje odpowiedzi z wyjątkiem „wynik” i „błąd” dla żądań starszych niż ostatnie wysłane.
 * Bez `worker` klient tworzy Worker z `catalog.worker.ts`.
 */
export function createCatalogClient(
  onResponse: (response: CatalogWorkerResponse) => void,
  worker: CatalogWorkerPort = new Worker(new URL('./catalog.worker.ts', import.meta.url), { type: 'module' }),
): CatalogClient {
  let latest = 0
  worker.onmessage = ({ data }) => {
    if (data.type !== 'ready' && data.requestId !== latest) return
    onResponse(data)
  }
  return {
    sendCatalog(objects) {
      worker.postMessage({ type: 'catalog', objects: objects.map(({ uid, raDeg, decDeg }) => ({ uid, raDeg, decDeg })) })
    },
    request(params) {
      worker.postMessage({ type: 'compute', requestId: ++latest, params })
      return latest
    },
  }
}
