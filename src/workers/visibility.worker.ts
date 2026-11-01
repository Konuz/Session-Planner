// Widoczność całego katalogu w ciemnym oknie nocy, liczona poza wątkiem interfejsu.
import { DEG, horizontalMatrix, type Site } from '../lib/astro'
import { horizonAltitude, type HorizonPoint } from '../lib/horizon'

export interface VisibilityRequest {
  id: number
  ra: Float64Array
  dec: Float64Array
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

self.onmessage = (e: MessageEvent<VisibilityRequest>) => {
  const { id, ra, dec, site, darkStart, darkEnd, minAltDeg, horizon } = e.data
  const n = ra.length
  const ux = new Float64Array(n)
  const uy = new Float64Array(n)
  const uz = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const r = ra[i] * DEG
    const d = dec[i] * DEG
    ux[i] = Math.cos(d) * Math.cos(r)
    uy[i] = Math.cos(d) * Math.sin(r)
    uz[i] = Math.sin(d)
  }
  const maxAlt = new Float32Array(n).fill(-90)
  const hours = new Float32Array(n)
  const best = new Float64Array(n)
  const sinMin = Math.sin(minAltDeg * DEG)
  const customHorizon = horizon.length > 0
  for (let t = darkStart; ; t = Math.min(t + STEP_MS, darkEnd)) {
    const stepH = Math.max(0, Math.min(STEP_MS, darkEnd - t)) / 3_600_000
    const m = horizontalMatrix(t, site)
    for (let i = 0; i < n; i++) {
      const z = m[6] * ux[i] + m[7] * uy[i] + m[8] * uz[i]
      const alt = Math.asin(z) / DEG
      if (alt > maxAlt[i]) {
        maxAlt[i] = alt
        best[i] = t
      }
      if (z < sinMin) continue
      if (customHorizon) {
        const x = m[0] * ux[i] + m[1] * uy[i] + m[2] * uz[i]
        const y = m[3] * ux[i] + m[4] * uy[i] + m[5] * uz[i]
        const az = ((Math.atan2(y, x) / DEG) + 360) % 360
        if (alt < horizonAltitude(horizon, az)) continue
      }
      hours[i] += stepH
    }
    if (t >= darkEnd) break
  }
  const result: VisibilityResult = { id, maxAlt, hours, best }
  ;(self as unknown as Worker).postMessage(result, [maxAlt.buffer, hours.buffer, best.buffer])
}
