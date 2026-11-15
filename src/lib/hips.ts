// Przeglądy HiPS (lustra, rzędy) i składanie obrazu TAN z kafelków: ta sama geometria co `framing.ts`
// (N u góry, E po lewej, skala 2·tan(fov/2)/W). Orientację kafelka sprawdzono 1.11.2026 względem SkyView:
// kolumna obrazu kafelka = iy & 511, wiersz = ix & 511.
import { DEG, normDeg } from './astro'
import { healpixFaceXY, nestIndex } from './healpix'

export type SurveyId = 'dss2' | 'ps1' | 'nsns' | 'nsnsRgb'
export type ImageMode = 'color' | 'red'

export interface Survey {
  id: SurveyId
  label: string
  credit: string
  maxOrder: number
  minDecDeg: number
  mirrors: string[]
  /** Limit czasu na nagłówki kafelka [ms]; domyślnie `TILE_TIMEOUT_MS` (szybkie przejście do następnego lustra). */
  timeoutMs?: number
}

export const SURVEYS: Record<SurveyId, Survey> = {
  dss2: {
    id: 'dss2',
    label: 'DSS2',
    credit: 'ESA/MAST',
    maxOrder: 9,
    minDecDeg: -90,
    mirrors: [
      'https://cdn.skies.esac.esa.int/DSSColor',
      'https://stpubdata.s3.us-east-1.amazonaws.com/mast/skybackgrounds/DSSColor',
      'https://casda.csiro.au/hips/DSS2/color',
      'https://alasky.cds.unistra.fr/DSS/DSSColor',
      'https://alaskybis.cds.unistra.fr/DSS/DSSColor',
    ],
  },
  ps1: {
    id: 'ps1',
    label: 'PanSTARRS',
    credit: 'MAST',
    maxOrder: 11,
    minDecDeg: -30,
    mirrors: ['https://stpubdata.s3.us-east-1.amazonaws.com/mast/skybackgrounds/PanSTARRS', 'https://alasky.cds.unistra.fr/Pan-STARRS/DR1/color-i-r-g'],
  },
  // Northern Sky Narrowband Survey (S. Ziegenbalg, CC BY-NC-SA 4.0): przez pośrednika serwera aplikacji
  // (`server/hipsProxy.ts`, JPEG zamiast PNG). Piksel rzędu 5 to 12,9″; pokrycie do δ ≈ −16°.
  nsns: {
    id: 'nsns',
    label: 'NSNS true-color',
    credit: 'DR0.1 · S. Ziegenbalg · CC BY-NC-SA 4.0',
    maxOrder: 5,
    minDecDeg: -16,
    mirrors: ['/api/hips/nsns-tc8'],
    // Jedno lustro: pośrednik odpowiada dopiero po pobraniu i przekodowaniu kafelka, a przy serii zimnych kafelków
    // czeka w kolejce 4 pobrań ze źródła; nie ma dokąd przejść po 3 s.
    timeoutMs: 20000,
  },
  // Kontinuum RGB bez Hα z częściowo odjętymi gwiazdami: odpowiednik obrazu DR0.1 „(Almost) true-color without Hα”.
  nsnsRgb: {
    id: 'nsnsRgb',
    label: 'NSNS bez Hα',
    credit: 'DR0.2 · S. Ziegenbalg · CC BY-NC-SA 4.0',
    maxOrder: 5,
    minDecDeg: -16,
    mirrors: ['/api/hips/nsns-rgb8'],
    timeoutMs: 20000,
  },
}

export type HipsRequest = { id: number; raDeg: number; decDeg: number; fovDeg: number; sizePx: number; survey: SurveyId; mode: ImageMode; coarser: number }
/** `complete`: wszystkie kafelki przyszły; obraz z dziurą po chwilowym błędzie nie trafia do Cache Storage. */
export type HipsReply = { id: number; blob: Blob; complete: boolean } | { id: number; error: string } | { id: number; cancelled: true }
export type HipsCancel = { cancel: number }

export function tileUrl(base: string, order: number, npix: number): string {
  return `${base}/Norder${order}/Dir${Math.floor(npix / 10000) * 10000}/Npix${npix}.jpg`
}

export function arcsecPerPixel(fovDeg: number, sizePx: number): number {
  return (((2 * Math.tan((fovDeg / 2) * (Math.PI / 180))) / sizePx) * 180 * 3600) / Math.PI
}

// Bok piksela HEALPix przy nside = 1 (√(π/3) rad) w sekundach łuku; piksel kafelka rzędu k: 211076 / 2^(k+9).
const HPX_ARCSEC = 211076

/** Bok piksela kafelka rzędu `order` w sekundach łuku. */
export function tilePixelArcsec(order: number): number {
  return HPX_ARCSEC / 2 ** (order + 9)
}

/** Najmniejszy rząd, w którym piksel kafelka nie jest większy niż piksel obrazu; `coarser` zgrubia o tyle rzędów. */
export function tileOrderFor(arcsecPerPx: number, maxOrder: number, coarser = 0): number {
  const k = Math.ceil(Math.log2(HPX_ARCSEC / (512 * arcsecPerPx))) - coarser
  return Math.min(maxOrder, Math.max(0, k))
}

/**
 * Bok malowanego obrazu [px]. Gdy przegląd nie ma drobniejszych kafelków (rząd = `maxOrder`), a piksel kafelka jest
 * większy niż piksel obrazu, obraz maluje się w rozdzielczości kafelka i powiększa z wygładzaniem: najbliższy sąsiad
 * dałby romby pikseli HEALPix.
 */
export function paintSizeFor(arcsecPerPx: number, order: number, survey: Pick<Survey, 'maxOrder'>, sizePx: number): number {
  const tilePx = tilePixelArcsec(order)
  return order === survey.maxOrder && tilePx > arcsecPerPx ? Math.max(1, Math.ceil((sizePx * arcsecPerPx) / tilePx)) : sizePx
}

export interface TanRequest {
  raDeg: number
  decDeg: number
  fovDeg: number
  sizePx: number
  order: number
}

export interface TanLayout {
  sizePx: number
  order: number
  tiles: number[]
  tileOfPixel: Int32Array
  colRow: Uint32Array
}

export interface TilePixels {
  data: Uint8ClampedArray
}

export function layoutTan(req: TanRequest, survey: Survey): TanLayout {
  const W = req.sizePx
  const tileOfPixel = new Int32Array(W * W)
  const colRow = new Uint32Array(W * W)
  const tiles = new Set<number>()
  const radPerPx = (2 * Math.tan((req.fovDeg / 2) * DEG)) / W
  const halfW = W / 2
  const d0 = req.decDeg * DEG
  const sinD0 = Math.sin(d0)
  const cosD0 = Math.cos(d0)
  const pixelOrder = req.order + 9
  let lastTile = -1
  for (let j = 0; j < W; j++) {
    const eta = (halfW - (j + 0.5)) * radPerPx
    const etaCosD0 = eta * cosD0
    const etaSinD0 = eta * sinD0
    const onePlusEta2 = 1 + eta * eta
    for (let i = 0; i < W; i++) {
      const p = j * W + i
      const xi = (halfW - (i + 0.5)) * radPerPx
      const sinDec = (sinD0 + etaCosD0) / Math.sqrt(onePlusEta2 + xi * xi)
      const decDeg = Math.asin(Math.max(-1, Math.min(1, sinDec))) / DEG
      if (decDeg < survey.minDecDeg) {
        tileOfPixel[p] = -1
        continue
      }
      const raDeg = normDeg(req.raDeg + Math.atan2(xi, cosD0 - etaSinD0) / DEG)
      const [face, ix, iy] = healpixFaceXY(pixelOrder, raDeg, decDeg)
      const npix = nestIndex(req.order, face, ix >> 9, iy >> 9)
      tileOfPixel[p] = npix
      colRow[p] = (ix & 511) * 512 + (iy & 511)
      if (npix !== lastTile) {
        tiles.add(npix)
        lastTile = npix
      }
    }
  }
  return { sizePx: W, order: req.order, tiles: [...tiles].sort((a, b) => a - b), tileOfPixel, colRow }
}

// Paski w lukach: tokeny --card (#0B0D17) i --border (#15192B), żeby luka nie udawała ciemnej mgławicy.
const STRIPE_A = [0x0b, 0x0d, 0x17]
const STRIPE_B = [0x15, 0x19, 0x2b]

/** RGBA W·W·4 (najbliższy sąsiad); null, gdy brakuje wszystkich kafelków. */
export function paintTan(layout: TanLayout, tiles: Map<number, TilePixels | null>, mode: ImageMode): Uint8ClampedArray | null {
  if (layout.tiles.length && layout.tiles.every((n) => !tiles.get(n))) return null
  const W = layout.sizePx
  const out = new Uint8ClampedArray(W * W * 4)
  for (let j = 0; j < W; j++) {
    for (let i = 0; i < W; i++) {
      const p = j * W + i
      const o = p * 4
      out[o + 3] = 255
      const n = layout.tileOfPixel[p]
      const tile = n >= 0 ? tiles.get(n) : null
      if (!tile) {
        out.set(((i + j) >> 3) & 1 ? STRIPE_B : STRIPE_A, o)
        continue
      }
      const s = layout.colRow[p] * 4
      if (mode === 'red') {
        const v = Math.round((tile.data[s] - 128) * 1.15 + 128)
        out[o] = out[o + 1] = out[o + 2] = v
      } else {
        out[o] = tile.data[s]
        out[o + 1] = tile.data[s + 1]
        out[o + 2] = tile.data[s + 2]
      }
    }
  }
  return out
}
