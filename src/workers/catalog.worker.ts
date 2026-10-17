// Worker katalogu: cienki adapter onmessage → silnik → postMessage, bez własnej logiki.
import { createCatalogEngine } from './catalogEngine'
import type { CatalogWorkerRequest } from './catalogMessages'

const engine = createCatalogEngine()

self.onmessage = (event: MessageEvent<CatalogWorkerRequest>) => {
  self.postMessage(engine.handle(event.data))
}
