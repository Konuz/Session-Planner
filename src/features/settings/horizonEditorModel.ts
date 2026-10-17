// Operacje edytora horyzontu (7C) na posortowanej liście punktów; wartości zaokrąglane do pełnych stopni.
import { normalizeDeg } from '../../services/astroMath'
import { HORIZON_ALT_MAX_DEG, HORIZON_ALT_MIN_DEG, normalizeHorizon } from '../../services/horizonFile'
import type { HorizonPoint } from '../../types'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const clampAlt = (altDeg: number) => clamp(Math.round(altDeg), HORIZON_ALT_MIN_DEG, HORIZON_ALT_MAX_DEG)

/** Nowy punkt na miejscu według azymutu; ten sam azymut zastępuje wysokość (wygrywa ostatni wpis). */
export function addHorizonPoint(points: readonly HorizonPoint[], point: HorizonPoint): HorizonPoint[] {
  return normalizeHorizon([...points, { azDeg: normalizeDeg(Math.round(point.azDeg)), altDeg: clampAlt(point.altDeg) }])
}

/** Przesunięcie punktu; azymut zostaje między sąsiadami, więc kolejność i indeks punktu się nie zmieniają. */
export function moveHorizonPoint(points: readonly HorizonPoint[], index: number, target: HorizonPoint): HorizonPoint[] {
  const minAz = index > 0 ? points[index - 1].azDeg + 1 : 0
  const maxAz = index < points.length - 1 ? points[index + 1].azDeg - 1 : 359
  // Sąsiedzi bliżej niż 2° (np. ułamkowe azymuty z pliku): zmienia się tylko wysokość.
  const azDeg = minAz > maxAz ? points[index].azDeg : clamp(Math.round(target.azDeg), minAz, maxAz)
  const moved = { azDeg, altDeg: clampAlt(target.altDeg) }
  return points.map((point, i) => (i === index ? moved : point))
}

export function removeHorizonPoint(points: readonly HorizonPoint[], index: number): HorizonPoint[] {
  return points.filter((_, i) => i !== index)
}

/** Indeks punktu najbliższego miejscu (x, y) w odległości do maxDistancePx albo −1. */
export function nearestIndex(positions: readonly { x: number; y: number }[], x: number, y: number, maxDistancePx: number): number {
  let best = -1
  let bestDistance = maxDistancePx
  positions.forEach((position, i) => {
    const distance = Math.hypot(position.x - x, position.y - y)
    if (distance <= bestDistance) {
      best = i
      bestDistance = distance
    }
  })
  return best
}
