// Kadr: rzut gnomoniczny (TAN) wokół środka zdjęcia, prostokąt matrycy obrócony o kąt pozycyjny (od N przez E).
import { DEG, normDeg, type Equatorial } from './astro'

export interface TangentPoint {
  xi: number // ku E [rad]
  eta: number // ku N [rad]
}

export function gnomonic(center: Equatorial, p: Equatorial): TangentPoint {
  const d0 = center.decDeg * DEG
  const d = p.decDeg * DEG
  const dRa = (p.raDeg - center.raDeg) * DEG
  const cosC = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(dRa)
  return {
    xi: (Math.cos(d) * Math.sin(dRa)) / cosC,
    eta: (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(dRa)) / cosC,
  }
}

export function gnomonicInverse(center: Equatorial, { xi, eta }: TangentPoint): Equatorial {
  const d0 = center.decDeg * DEG
  return {
    raDeg: normDeg(center.raDeg + Math.atan2(xi, Math.cos(d0) - eta * Math.sin(d0)) / DEG),
    decDeg: Math.asin((Math.sin(d0) + eta * Math.cos(d0)) / Math.sqrt(1 + xi * xi + eta * eta)) / DEG,
  }
}

/**
 * Narożniki prostokąta matrycy w płaszczyźnie stycznej [rad] (ξ ku E, η ku N), dla kadru w środku `offset`
 * względem środka zdjęcia, z bokami fovW × fovH [°] i kątem `paDeg` (oś „góra” kadru obrócona od N ku E).
 */
export function frameCorners(offset: TangentPoint, fovWdeg: number, fovHdeg: number, paDeg: number): TangentPoint[] {
  const hw = Math.tan((fovWdeg / 2) * DEG)
  const hh = Math.tan((fovHdeg / 2) * DEG)
  const pa = paDeg * DEG
  // Wektor „góra” kadru: N obrócone ku E o PA; „prawo” kadru (W na niebie przy PA = 0, bo E jest po lewej).
  const up = { xi: Math.sin(pa), eta: Math.cos(pa) }
  const right = { xi: -Math.cos(pa), eta: Math.sin(pa) }
  return [
    [-1, 1],
    [1, 1],
    [1, -1],
    [-1, -1],
  ].map(([sx, sy]) => ({
    xi: offset.xi + sx * hw * right.xi + sy * hh * up.xi,
    eta: offset.eta + sx * hw * right.eta + sy * hh * up.eta,
  }))
}

/** Punkt płaszczyzny stycznej → piksel zdjęcia hips2fits (TAN, N u góry, E po lewej). */
export function tangentToPixel(p: TangentPoint, imageFovDeg: number, sizePx: number): [number, number] {
  // hips2fits: skala = 2·tan(fov/2)/W [rad/px] w rzucie TAN.
  const radPerPx = (2 * Math.tan((imageFovDeg / 2) * DEG)) / sizePx
  return [sizePx / 2 - p.xi / radPerPx, sizePx / 2 - p.eta / radPerPx]
}

export function pixelToTangent(x: number, y: number, imageFovDeg: number, sizePx: number): TangentPoint {
  const radPerPx = (2 * Math.tan((imageFovDeg / 2) * DEG)) / sizePx
  return { xi: (sizePx / 2 - x) * radPerPx, eta: (sizePx / 2 - y) * radPerPx }
}
