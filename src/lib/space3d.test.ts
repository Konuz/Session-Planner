import { describe, expect, it } from 'vitest'
import { galacticVector, type Vec3 } from './astro'
import { FADE_FAR, FADE_NEAR, GALACTIC_LIMIT_LY, GALAXY_FADE_FAR, GALAXY_FADE_NEAR, LOG_UNIT, blendFades, layerFades, mixFades, pinScale, scenePoint, scenePosition, startFadeBlend, sunPosition, toScene } from './space3d'

// Wzory sprzed wspólnej sceny (dwie skale), wpisane na stałe jako odniesienie.
function oldPosition(o: { raDeg: number; decDeg: number }, distLy: number, scale: 'galaxy' | 'universe'): Vec3 {
  const v = galacticVector(o)
  if (scale === 'galaxy' || distLy < 150_000) {
    const d = distLy / 1000
    const s = scale === 'galaxy' ? 1 : 0.12
    return toScene([(v[0] * d - 26.7) * s, v[1] * d * s, v[2] * d * s])
  }
  const r = Math.max(0, Math.log10(distLy / 1e4)) * 22
  return toScene([v[0] * r, v[1] * r, v[2] * r])
}

const M42 = { raDeg: 83.82, decDeg: -5.39 }
const M31 = { raDeg: 10.68, decDeg: 41.27 }
const M33 = { raDeg: 23.462, decDeg: 30.6602 }

describe('scenePosition', () => {
  it('poniżej 150 tys. lś położenie jak dawna skala Drogi Mlecznej', () => {
    for (const d of [8, 1500, 26_700, 149_999]) expect(scenePosition(M42, d)).toEqual(oldPosition(M42, d, 'galaxy'))
  })

  it('od 150 tys. lś przesunięcie od Ziemi jak dawny Wszechświat lokalny × 1/0,12', () => {
    const sun = sunPosition()
    for (const d of [GALACTIC_LIMIT_LY, 2.5e6, 2.78e6, 3.2e8, 1e10]) {
      const p = scenePosition(M33, d)
      oldPosition(M33, d, 'universe').forEach((v, i) => expect(p[i] - sun[i]).toBeCloseTo(v / 0.12, 9))
    }
  })

  it('w obu skalach kierunek z Ziemi do obiektu zgadza się z kierunkiem na niebie', () => {
    const sun = sunPosition()
    const dir = unit(toScene(galacticVector(M33)))
    for (const d of [1500, GALACTIC_LIMIT_LY, 2_781_156, 3.2e8]) {
      const offset = scenePosition(M33, d).map((v, i) => v - sun[i])
      const dist = Math.hypot(...offset)
      offset.forEach((v, i) => expect(v / dist).toBeCloseTo(dir[i], 12))
    }
  })

  it('jednostka skali logarytmicznej: 22 j. dawnego Wszechświata na dekadę, w jednostkach Drogi Mlecznej', () => {
    expect(LOG_UNIT).toBeCloseTo(22 / 0.12, 12)
  })
})

const unit = (v: Vec3): Vec3 => { const n = Math.hypot(...v); return [v[0] / n, v[1] / n, v[2] / n] }

describe('scenePoint', () => {
  it('poniżej 150 tys. lś leży na promieniu od Słońca w d/1000 j.', () => {
    const dir = unit(toScene(galacticVector(M42)))
    const sun = sunPosition()
    const p = scenePoint(dir, 1305)
    const offset = p.map((v, i) => v - sun[i])
    expect(Math.hypot(...offset)).toBeCloseTo(1.305, 12)
    offset.forEach((v, i) => expect(v / 1.305).toBeCloseTo(dir[i], 12))
  })

  it('od 150 tys. lś w odległości logarytmicznej od Ziemi', () => {
    const dir = unit(toScene(galacticVector(M31)))
    const sun = sunPosition()
    const offset = scenePoint(dir, 2.5e6).map((v, i) => v - sun[i])
    expect(Math.hypot(...offset)).toBeCloseTo(Math.log10(250) * LOG_UNIT, 9)
    const expected = scenePosition(M31, 2.5e6)
    scenePoint(dir, 2.5e6).forEach((v, i) => expect(v).toBeCloseTo(expected[i], 6))
  })
})

it('Słońce 26,7 j. od centrum Galaktyki', () => {
  expect(sunPosition()).toEqual([-26.7, 0, -0])
})

describe('layerFades', () => {
  it('Droga Mleczna: warstwy Galaktyki pełne, galaktyki dopiero dalej niż kadry zakładki (do ok. 425 j.)', () => {
    for (const d of [30, 120, 425, GALAXY_FADE_NEAR]) expect(layerFades(d, 'galaxy')).toEqual({ galactic: 1, extragalactic: 0 })
    expect(layerFades(GALAXY_FADE_FAR, 'galaxy')).toEqual({ galactic: 1, extragalactic: 1 })
    expect(layerFades(6000, 'galaxy')).toEqual({ galactic: 1, extragalactic: 1 })
  })

  it('Wszechświat lokalny: galaktyki pełne w każdym kadrze, obiekty Galaktyki i Ziemia tylko z bliska', () => {
    for (const d of [20, 115, 175, 640, 1667]) expect(layerFades(d, 'universe').extragalactic).toBe(1)
    expect(layerFades(120, 'universe').galactic).toBe(1)
    expect(layerFades(FADE_NEAR, 'universe').galactic).toBe(1)
    expect(layerFades(FADE_FAR, 'universe').galactic).toBe(0)
  })

  it('przejścia monotoniczne i bez skoków w obu zakładkach', () => {
    for (const [scale, from, to, key, rising] of [['galaxy', GALAXY_FADE_NEAR, GALAXY_FADE_FAR, 'extragalactic', true], ['universe', FADE_NEAR, FADE_FAR, 'galactic', false]] as const) {
      let previous = layerFades(from, scale)[key]
      for (let d = from + 5; d <= to; d += 5) {
        const value = layerFades(d, scale)[key]
        expect(rising ? value >= previous : value <= previous).toBe(true)
        expect(Math.abs(value - previous)).toBeLessThan(0.05)
        previous = value
      }
    }
  })
})

it('mixFades: przelot zakładek przenika krycia obu zakładek', () => {
  const a = { galactic: 1, extragalactic: 0 }, b = { galactic: 0.2, extragalactic: 1 }
  expect(mixFades(a, b, 0)).toEqual(a)
  expect(mixFades(a, b, 1)).toEqual(b)
  const half = mixFades(a, b, 0.5)
  expect(half.galactic).toBeCloseTo(0.6, 12)
  expect(half.extragalactic).toBeCloseTo(0.5, 12)
})

describe('blendFades', () => {
  const linear = (t: number) => t
  it('bez przerwań daje dawne mixFades obu zakładek liczonych z bieżącej odległości kamery', () => {
    const blend = startFadeBlend(layerFades(900, 'universe'), 900, 'universe', 1000, 1600)
    for (const [now, d] of [[1000, 900], [1400, 600], [1800, 400], [2200, 300], [2600, 120]]) {
      const t = (now - 1000) / 1600
      const { fades } = blendFades(blend, d, 'galaxy', now, linear)
      const old = mixFades(layerFades(d, 'universe'), layerFades(d, 'galaxy'), t)
      expect(fades.galactic).toBeCloseTo(old.galactic, 12)
      expect(fades.extragalactic).toBeCloseTo(old.extragalactic, 12)
    }
    expect(blendFades(blend, 120, 'galaxy', 2600, linear)).toEqual({ fades: layerFades(120, 'galaxy'), done: true })
  })

  it('przerwane przenikanie zaczyna kolejne od kryć ostatniej klatki i ma własny zegar', () => {
    // Powrót w połowie przenikania Droga Mleczna → Wszechświat: start z kryć tej klatki, nie z kryć jednej zakładki.
    const midway = { galactic: 0.5, extragalactic: 0.5 }
    const blend = startFadeBlend(midway, 700, 'universe', 1000, 1600)
    expect(blendFades(blend, 700, 'galaxy', 1000, linear)).toEqual({ fades: midway, done: false })
    // Klatka sprzed startu (wcześniejszy czas rAF) nie cofa przenikania poza jego początek.
    expect(blendFades(blend, 700, 'galaxy', 900, linear).fades).toEqual(midway)
    // Kamera stoi (przeciągnięcie przerwało przelot): krycia dochodzą do zakładki docelowej w tym samym czasie.
    const half = blendFades(blend, 700, 'galaxy', 1800, linear).fades
    const target = layerFades(700, 'galaxy')
    expect(half.galactic).toBeCloseTo((0.5 + target.galactic) / 2, 12)
    expect(half.extragalactic).toBeCloseTo((0.5 + target.extragalactic) / 2, 12)
    expect(blendFades(blend, 700, 'galaxy', 5000, linear)).toEqual({ fades: target, done: true })
    // Krycia wyjściowe przesunięte o różnicę ze startu nie wychodzą poza [0, 1].
    const far = blendFades(blend, 100, 'galaxy', 1000, linear).fades
    expect(far.galactic).toBeLessThanOrEqual(1)
    expect(far.extragalactic).toBeGreaterThanOrEqual(0)
  })
})

it('pinScale: skala pinezki maleje z odległością kamery i mieści się w czytelnym zakresie obu skal', () => {
  expect(pinScale(20, 'galaxy')).toBe(1)
  expect(pinScale(5, 'galaxy')).toBe(1.6)
  expect(pinScale(200, 'galaxy')).toBe(0.45)
  expect(pinScale(10, 'galaxy')).toBeGreaterThan(pinScale(40, 'galaxy'))

  expect(pinScale(750, 'universe')).toBe(1)
  expect(pinScale(100, 'universe')).toBe(1.6)
  expect(pinScale(5000, 'universe')).toBe(0.45)
  expect(pinScale(400, 'universe')).toBeGreaterThan(pinScale(2000, 'universe'))

  expect(pinScale(NaN, 'galaxy')).toBe(1)
})
