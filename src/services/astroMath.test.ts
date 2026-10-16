import { Body, DefineStar, Equator, Horizon, Observer } from 'astronomy-engine'
import { describe, expect, it } from 'vitest'
import { DEMO_HORIZON, HOUR_MS, M31, MINUTE_MS, SITE } from '../test/fixtures'
import {
  angularSeparationDeg,
  assessSampling,
  computeOptics,
  gnomonicProject,
  gnomonicUnproject,
  horizonAltitudeDeg,
  horizontalAt,
  normalizeDeg,
  precessionMatrix,
  toEquatorOfDate,
} from './astroMath'

const ONE_DEG_RAD = Math.PI / 180

describe('normalizeDeg', () => {
  it.each([
    [-30, 330],
    [-360, 0],
    [360, 0],
    [725, 5],
  ])('%s° → %s°', (input, expected) => {
    expect(normalizeDeg(input)).toBe(expected)
  })
})

const SETUPS = {
  redCat: { apertureMm: 51, focalLengthMm: 250, reducerFactor: 1, resolutionXPx: 6248, resolutionYPx: 4176, pixelSizeUm: 3.76, binning: 1 },
  newton200: { apertureMm: 200, focalLengthMm: 1000, reducerFactor: 1, resolutionXPx: 3008, resolutionYPx: 3008, pixelSizeUm: 3.76, binning: 1 },
  esprit100: { apertureMm: 100, focalLengthMm: 550, reducerFactor: 1, resolutionXPx: 9576, resolutionYPx: 6388, pixelSizeUm: 3.76, binning: 1 },
  newton150: { apertureMm: 150, focalLengthMm: 750, reducerFactor: 1, resolutionXPx: 3008, resolutionYPx: 3008, pixelSizeUm: 3.76, binning: 1 },
  myNewton150: { apertureMm: 150, focalLengthMm: 600, reducerFactor: 1, resolutionXPx: 3008, resolutionYPx: 3008, pixelSizeUm: 3.76, binning: 1 },
}

describe('T1 FOV i skala (binning 1, reduktor 1,0×)', () => {
  it('RedCat 51 + ASI2600MC: 23,49 × 15,70 mm, 5,380° × 3,597°, 3,102″/px, f/4,90', () => {
    const o = computeOptics(SETUPS.redCat)
    expect(o.sensorWidthMm).toBeCloseTo(23.49, 2)
    expect(o.sensorHeightMm).toBeCloseTo(15.7, 2)
    expect(o.fovWidthDeg).toBeCloseTo(5.38, 3)
    expect(o.fovHeightDeg).toBeCloseTo(3.597, 3)
    expect(o.scaleArcsecPerPx).toBeCloseTo(3.102, 3)
    expect(o.focalRatio).toBeCloseTo(4.9, 2)
  })

  it('Newton 200/1000 + ASI533MM: 0,648° × 0,648° (38,9′), 0,776″/px, f/5,00', () => {
    const o = computeOptics(SETUPS.newton200)
    expect(o.fovWidthDeg).toBeCloseTo(0.648, 3)
    expect(o.fovHeightDeg).toBeCloseTo(0.648, 3)
    expect(o.fovWidthDeg * 60).toBeCloseTo(38.9, 1)
    expect(o.scaleArcsecPerPx).toBeCloseTo(0.776, 3)
    expect(o.focalRatio).toBeCloseTo(5, 2)
  })

  it('Esprit 100 + ASI6200MM: 3,750° × 2,502°, 1,410″/px, f/5,50', () => {
    const o = computeOptics(SETUPS.esprit100)
    expect(o.fovWidthDeg).toBeCloseTo(3.75, 3)
    expect(o.fovHeightDeg).toBeCloseTo(2.502, 3)
    expect(o.scaleArcsecPerPx).toBeCloseTo(1.41, 3)
    expect(o.focalRatio).toBeCloseTo(5.5, 2)
  })

  it('Newton 150/750 + Ares-M Pro: 0,864° × 0,864° (51,8′), 1,034″/px, f/5,00', () => {
    const o = computeOptics(SETUPS.newton150)
    expect(o.fovWidthDeg).toBeCloseTo(0.864, 3)
    expect(o.fovHeightDeg).toBeCloseTo(0.864, 3)
    expect(o.fovWidthDeg * 60).toBeCloseTo(51.8, 1)
    expect(o.scaleArcsecPerPx).toBeCloseTo(1.034, 3)
    expect(o.focalRatio).toBeCloseTo(5, 2)
  })

  it('Newton 150/600 + Ares-M Pro (zestaw użytkownika): 1,080° × 1,080° (64,8′), 1,293″/px, f/4,00', () => {
    const o = computeOptics(SETUPS.myNewton150)
    expect(o.fovWidthDeg).toBeCloseTo(1.08, 3)
    expect(o.fovHeightDeg).toBeCloseTo(1.08, 3)
    expect(o.fovWidthDeg * 60).toBeCloseTo(64.8, 1)
    expect(o.scaleArcsecPerPx).toBeCloseTo(1.293, 3)
    expect(o.focalRatio).toBeCloseTo(4, 2)
  })

  it('mnożnik reduktora skraca ogniskową efektywną', () => {
    const o = computeOptics({ ...SETUPS.newton200, reducerFactor: 0.5 })
    expect(o.effectiveFocalLengthMm).toBe(500)
    expect(o.focalRatio).toBeCloseTo(2.5, 10)
  })
})

describe('T2 ocena próbkowania, seeing 2,5″ (zakres idealny 0,833–1,25″/px)', () => {
  it.each([
    ['RedCat', SETUPS.redCat, 'undersampled'],
    ['Newton 200', SETUPS.newton200, 'oversampled'],
    ['Esprit', SETUPS.esprit100, 'undersampled'],
    ['Newton 150/750 + Ares', SETUPS.newton150, 'ideal'],
    ['Newton 150/600 + Ares (zestaw użytkownika)', SETUPS.myNewton150, 'undersampled'],
  ] as const)('%s → %s', (_, setup, expected) => {
    expect(assessSampling(computeOptics(setup).scaleArcsecPerPx, 2.5)).toBe(expected)
  })

  it.each([
    [0.83, 'oversampled'],
    [0.84, 'ideal'],
    [1.25, 'ideal'],
    [1.26, 'undersampled'],
  ] as const)('granice zakresu: %s″/px → %s', (scale, expected) => {
    expect(assessSampling(scale, 2.5)).toBe(expected)
  })
})

describe('T8 szybki wzór Alt/Az a astronomy-engine (M 31, doba co 7 min)', () => {
  it('różnica wysokości ≤ 0,01°, azymutu ≤ 0,05° dla h < 80°', () => {
    const startMs = Date.UTC(2026, 9, 16, 10) // lokalne południe 16.10.2026
    const ofDate = toEquatorOfDate(M31, precessionMatrix(startMs))
    DefineStar(Body.Star1, M31.raDeg / 15, M31.decDeg, 1000)
    const observer = new Observer(SITE.latDeg, SITE.lonDegEast, SITE.elevationM)

    let maxAltDiff = 0
    let maxAzDiff = 0
    for (let t = startMs; t < startMs + 24 * HOUR_MS; t += 7 * MINUTE_MS) {
      const date = new Date(t)
      const eq = Equator(Body.Star1, date, observer, true, true)
      const reference = Horizon(date, observer, eq.ra, eq.dec)
      const fast = horizontalAt(ofDate, SITE, t)
      maxAltDiff = Math.max(maxAltDiff, Math.abs(fast.altDeg - reference.altitude))
      if (reference.altitude < 80) {
        maxAzDiff = Math.max(maxAzDiff, Math.abs(((fast.azDeg - reference.azimuth + 540) % 360) - 180))
      }
    }

    expect(maxAltDiff).toBeLessThanOrEqual(0.01)
    expect(maxAzDiff).toBeLessThanOrEqual(0.05)
  })
})

describe('T13 separacja kątowa', () => {
  it('(0°, 0°)–(90°, 0°) = 90°', () => {
    expect(angularSeparationDeg({ raDeg: 0, decDeg: 0 }, { raDeg: 90, decDeg: 0 })).toBeCloseTo(90, 9)
  })

  it('(0°, 89,9°)–(180°, 89,9°) = 0,2°', () => {
    expect(angularSeparationDeg({ raDeg: 0, decDeg: 89.9 }, { raDeg: 180, decDeg: 89.9 })).toBeCloseTo(0.2, 9)
  })
})

describe('T10 interpolacja horyzontu', () => {
  it('horyzont demonstracyjny: az 127,5° → 31,5°', () => {
    expect(horizonAltitudeDeg(DEMO_HORIZON, 127.5)).toBeCloseTo(31.5, 9)
  })

  it('az 352,5° → 11,5° (zawinięcie 345 → 0)', () => {
    expect(horizonAltitudeDeg(DEMO_HORIZON, 352.5)).toBeCloseTo(11.5, 9)
  })

  it('punkty {350: 10, 10: 20}: az 0° → 15°', () => {
    const horizon = [
      { azDeg: 10, altDeg: 20 },
      { azDeg: 350, altDeg: 10 },
    ]
    expect(horizonAltitudeDeg(horizon, 0)).toBeCloseTo(15, 9)
  })

  it('azymut ujemny jest sprowadzany do [0, 360)', () => {
    expect(horizonAltitudeDeg(DEMO_HORIZON, -7.5)).toBeCloseTo(11.5, 9)
  })

  it('pusta lista punktów oznacza horyzont 0°', () => {
    expect(horizonAltitudeDeg([], 200)).toBe(0)
  })
})

describe('rzut gnomoniczny: ξ w stronę E, η w stronę N', () => {
  const center = { raDeg: 0, decDeg: 0 }

  it('punkt 1° na wschód od środka: ξ = tg 1°, η = 0', () => {
    const p = gnomonicProject(center, { raDeg: 1, decDeg: 0 })
    expect(p.xi).toBeCloseTo(Math.tan(ONE_DEG_RAD), 12)
    expect(p.eta).toBeCloseTo(0, 12)
  })

  it('punkt 1° na północ od środka: ξ = 0, η = tg 1°', () => {
    const p = gnomonicProject(center, { raDeg: 0, decDeg: 1 })
    expect(p.xi).toBeCloseTo(0, 12)
    expect(p.eta).toBeCloseTo(Math.tan(ONE_DEG_RAD), 12)
  })

  it('rzut odwrotny przez 0h RA zostaje w [0, 360)', () => {
    const p = gnomonicUnproject({ raDeg: 0.5, decDeg: 0 }, { xi: -Math.tan(ONE_DEG_RAD), eta: 0 })
    expect(p.raDeg).toBeCloseTo(359.5, 9)
    expect(p.decDeg).toBeCloseTo(0, 9)
  })

  it('rzut odwrotny odtwarza punkt przy deklinacji 85°', () => {
    const highCenter = { raDeg: 30, decDeg: 85 }
    const back = gnomonicUnproject(highCenter, gnomonicProject(highCenter, { raDeg: 40, decDeg: 84 }))
    expect(back.raDeg).toBeCloseTo(40, 9)
    expect(back.decDeg).toBeCloseTo(84, 9)
  })
})
