// Widoczność całego katalogu w ciemnym oknie nocy, liczona poza wątkiem interfejsu.
import { DEG, horizontalMatrix, type Site } from '../lib/astro'
import { horizonAltitude, type HorizonPoint } from '../lib/horizon'

export interface VisibilityRequest {
  id: number
  ra?: Float64Array
  dec?: Float64Array
  site: Site
  darkStart: number
  darkEnd: number
  minAltDeg: number
  horizon: HorizonPoint[]
}

export interface VisibilityResult {
  id: number
  /** Największa wysokość w ciemnym oknie [°]. */
  maxAlt: Float32Array
  /** Godziny powyżej limitu i horyzontu. */
  hours: Float32Array
  /** Chwila największej wysokości (ms UTC). */
  best: Float64Array
}

const STEP_MS = 10 * 60_000

let cachedUx = new Float64Array(0)
let cachedUy = new Float64Array(0)
let cachedUz = new Float64Array(0)

// Liczone jest tylko najnowsze zadanie: przeciąganie suwaka wysyła ich serię, a starsze wyniki i tak są odrzucane
// po id. Zadania czekające w kolejce wiadomości trafiają tu przed timerem, więc pośrednie są pomijane (audyt C12).
let latest: VisibilityRequest | null = null
let scheduled = false

self.onmessage = (e: MessageEvent<VisibilityRequest>) => {
  const { ra, dec } = e.data
  // Współrzędne przychodzą raz: zapamiętać je od razu, nawet gdy samo zadanie zostanie pominięte.
  if (ra && dec) storeCoords(ra, dec)
  latest = e.data
  if (scheduled) return
  scheduled = true
  setTimeout(() => {
    scheduled = false
    const req = latest
    latest = null
    if (req) compute(req)
  }, 0)
}

function storeCoords(ra: Float64Array, dec: Float64Array) {
  const len = ra.length
  cachedUx = new Float64Array(len)
  cachedUy = new Float64Array(len)
  cachedUz = new Float64Array(len)
  for (let i = 0; i < len; i++) {
    const r = ra[i] * DEG
    const d = dec[i] * DEG
    const cosD = Math.cos(d)
    cachedUx[i] = cosD * Math.cos(r)
    cachedUy[i] = cosD * Math.sin(r)
    cachedUz[i] = Math.sin(d)
  }
}

function compute({ id, site, darkStart, darkEnd, minAltDeg, horizon }: VisibilityRequest) {
  const ux = cachedUx
  const uy = cachedUy
  const uz = cachedUz
  const n = ux.length
  const maxZ = new Float64Array(n).fill(-1)
  const hours = new Float32Array(n)
  const best = new Float64Array(n)
  const sinMin = Math.sin(minAltDeg * DEG)
  const customHorizon = horizon.length > 0
  for (let t = darkStart; ; t = Math.min(t + STEP_MS, darkEnd)) {
    const stepH = Math.max(0, Math.min(STEP_MS, darkEnd - t)) / 3_600_000
    const m = horizontalMatrix(t, site)
    const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], m4 = m[4], m5 = m[5], m6 = m[6], m7 = m[7], m8 = m[8]
    for (let i = 0; i < n; i++) {
      const z = m6 * ux[i] + m7 * uy[i] + m8 * uz[i]
      if (z > maxZ[i]) {
        maxZ[i] = z
        best[i] = t
      }
      if (z < sinMin) continue
      if (customHorizon) {
        const x = m0 * ux[i] + m1 * uy[i] + m2 * uz[i]
        const y = m3 * ux[i] + m4 * uy[i] + m5 * uz[i]
        const az = ((Math.atan2(y, x) / DEG) + 360) % 360
        const alt = Math.asin(Math.max(-1, Math.min(1, z))) / DEG
        if (alt < horizonAltitude(horizon, az)) continue
      }
      hours[i] += stepH
    }
    if (t >= darkEnd) break
  }
  const maxAlt = new Float32Array(n)
  for (let i = 0; i < n; i++) maxAlt[i] = Math.asin(Math.max(-1, Math.min(1, maxZ[i]))) / DEG
  const result: VisibilityResult = { id, maxAlt, hours, best }
  // Forma z tablicą transfer działa w każdej przeglądarce; typy DOM widzą tu Window, stąd rzutowanie.
  ;(self as unknown as Worker).postMessage(result, [maxAlt.buffer, hours.buffer, best.buffer])
}
