// Maska czarnych brzegów zdjęcia w osobnym wątku (worker_threads): raster do ok. 10 Mpx i kilka przebiegów BFS
// blokowały pętlę zdarzeń serwera, także statyki i inne API (audyt C09).
import { parentPort, workerData } from 'node:worker_threads'
import { blackBorderMask } from '../src/lib/blackBorderMask.ts'

const { pixels, width, height, channels } = workerData as { pixels: Uint8Array; width: number; height: number; channels: number }
const cut = blackBorderMask(pixels, width, height, channels)
parentPort!.postMessage(cut, cut ? [cut.buffer as ArrayBuffer] : [])
