export type SeeingQuality = 'dobry' | 'średni' | 'zły'

/** Poziomy izobaryczne Open-Meteo [hPa] od powierzchni po dolną stratosferę. */
export const PRESSURE_LEVELS = [1000, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200, 150, 100] as const

export interface PressureLevelSample {
  pressureHpa: number
  heightM: number
  tempC: number
  windKmh: number
  windDeg?: number | null
}

export interface VerticalProfile {
  elevationM?: number | null
  surfacePressureHpa?: number | null
  temp2mC: number
  wind10mKmh: number
  wind10mDeg?: number | null
  wind80mKmh?: number | null
  wind80mDeg?: number | null
  wind120mKmh?: number | null
  wind120mDeg?: number | null
  pblHeightM?: number | null
  capeJkg?: number | null
  liftedIndex?: number | null
  levels: readonly PressureLevelSample[]
}

export interface SeeingBreakdown {
  arcsec: number
  blArcsec: number
  faArcsec: number
  pblM: number
  label: SeeingQuality
}

const R_OVER_CP = 0.2854
const G = 9.80665
const KAPPA = 0.4
const LAMBDA_M = 500e-9
const K_WAVE = (2 * Math.PI) / LAMBDA_M
const RAD2ARCSEC = (180 / Math.PI) * 3600
const KELVIN = 273.15

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Konwertuje całkę profilu C_n^2 [m^(1/3)] na rozmycie FWHM w sekundach łuku (λ = 500 nm, zenit). */
export function integralToArcsec(intCn2: number): number {
  if (!finite(intCn2) || intCn2 <= 0) return 0
  const r0 = Math.pow(0.423 * K_WAVE * K_WAVE * intCn2, -3 / 5)
  return (0.98 * LAMBDA_M / r0) * RAD2ARCSEC
}

/** Klasyfikuje seeing astronomiczny na podstawie szerokości połówkowej obrazu gwiazdy (FWHM w zenicie). */
export function classifySeeing(arcsec: number): SeeingQuality {
  if (arcsec < 1.6) return 'dobry'
  if (arcsec <= 2.5) return 'średni'
  return 'zły'
}

interface WindPoint {
  u: number
  v: number
  speedMs: number
  hasDir: boolean
}

interface LayerPoint extends WindPoint {
  p: number
  z: number
  T: number
  th: number
}

function windPoint(kmh: number, deg?: number | null): WindPoint {
  const speedMs = Math.max(0, kmh) / 3.6
  if (!finite(deg)) return { u: speedMs, v: 0, speedMs, hasDir: false }
  const rad = (deg * Math.PI) / 180
  return { u: speedMs * Math.cos(rad), v: speedMs * Math.sin(rad), speedMs, hasDir: true }
}

function deltaWindMs(a: WindPoint, b: WindPoint): number {
  if (a.hasDir && b.hasDir) return Math.hypot(b.u - a.u, b.v - a.v)
  return Math.abs(b.speedMs - a.speedMs)
}

function interpField(pts: readonly LayerPoint[], zTarget: number, pick: (p: LayerPoint) => number): number {
  if (zTarget <= pts[0].z) return pick(pts[0])
  for (let i = 0; i < pts.length - 1; i++) {
    if (zTarget <= pts[i + 1].z) {
      const t = (zTarget - pts[i].z) / (pts[i + 1].z - pts[i].z)
      return pick(pts[i]) + t * (pick(pts[i + 1]) - pick(pts[i]))
    }
  }
  return pick(pts[pts.length - 1])
}

/**
 * Całka C_n^2 w swobodnej atmosferze (Tatarski + skala zewnętrzna Dewana 1993).
 * Zaczyna powyżej warstwy granicznej oraz nocnej warstwy resztkowej (min. 450 m AGL).
 */
function freeAtmosphereIntegral(pts: readonly LayerPoint[], zFAStart: number): number {
  let tropIdx = pts.length - 1
  let minT = Infinity
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].p <= 450 && pts[i].T < minT) {
      minT = pts[i].T
      tropIdx = i
    }
  }

  let total = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const dz = b.z - a.z
    if (dz <= 10 || b.z <= zFAStart) continue
    const frac = a.z >= zFAStart ? 1 : (b.z - zFAStart) / dz
    const dlnThetaDz = Math.log(b.th / a.th) / dz
    const M = -77.6e-6 * (Math.sqrt(a.p * b.p) / (0.5 * (a.T + b.T))) * dlnThetaDz
    const shear = Math.min(0.05, deltaWindMs(a, b) / dz)
    const isStrat = i >= tropIdx
    const l043 = Math.pow(0.1, 4 / 3) * Math.pow(10, isStrat ? 0.506 + 50 * shear : 1.64 + 42 * shear)
    // Silna inwersja statyczna w dolnej troposferze tłumi wybuchy turbulencji na grubych warstwach izobarycznych.
    const dTdz = (b.T - a.T) / dz
    const invDamp = !isStrat && dTdz > 0.002 ? 1 / (1 + 150 * (dTdz - 0.002)) : 1
    total += 2.8 * M * M * l043 * invDamp * dz * frac
  }
  return total
}

function lowLevelShear(profile: VerticalProfile, w10: WindPoint, wRef: WindPoint, dzRef: number): number {
  const sBulk = deltaWindMs(w10, wRef) / dzRef
  const has80 = finite(profile.wind80mKmh)
  const has120 = finite(profile.wind120mKmh)
  if (!has80 && !has120) return Math.min(0.08, sBulk)

  const w80 = has80 ? windPoint(profile.wind80mKmh!, profile.wind80mDeg) : null
  const w120 = has120 ? windPoint(profile.wind120mKmh!, profile.wind120mDeg) : null

  if (w80 && w120) {
    const s10_80 = deltaWindMs(w10, w80) / 70
    const s80_120 = deltaWindMs(w80, w120) / 40
    return Math.min(0.08, 0.5 * s10_80 + 0.3 * s80_120 + 0.2 * sBulk)
  }
  if (w80) return Math.min(0.08, 0.7 * (deltaWindMs(w10, w80) / 70) + 0.3 * sBulk)
  return Math.min(0.08, 0.7 * (deltaWindMs(w10, w120!) / 110) + 0.3 * sBulk)
}

/**
 * Całka C_n^2 w planetarnej warstwie granicznej: długość mieszania Blackadara
 * i funkcja stabilności z liczby Richardsona (wiatry 10/80/120 m, wysokość PBL, CAPE, LI).
 */
function boundaryLayerIntegral(
  profile: VerticalProfile,
  elevM: number,
  pSurf: number,
  t2mK: number,
  pblH: number,
  w10: WindPoint,
  pts: readonly LayerPoint[],
): number {
  const thSurf = t2mK * Math.pow(1000 / pSurf, R_OVER_CP)
  const surfPt: LayerPoint = { p: pSurf, z: elevM + 2, T: t2mK, th: thSurf, ...w10 }
  const fullProfile = [surfPt, ...pts]

  const zRefAGL = Math.min(Math.max(pblH * 0.75, 250), 500)
  const thRef = interpField(fullProfile, elevM + zRefAGL, (p) => p.th)
  const uRef = interpField(fullProfile, elevM + zRefAGL, (p) => p.u)
  const vRef = interpField(fullProfile, elevM + zRefAGL, (p) => p.v)
  const dzRef = zRefAGL - 2
  const dThDz = (thRef - thSurf) / dzRef

  const refHasDir = w10.hasDir && pts.every((p) => p.hasDir)
  const wRef: WindPoint = {
    u: uRef,
    v: vRef,
    speedMs: refHasDir ? Math.hypot(uRef, vRef) : interpField(fullProfile, elevM + zRefAGL, (p) => p.speedMs),
    hasDir: refHasDir,
  }
  const dv = deltaWindMs(w10, wRef)
  const dv2 = dv * dv + 0.8
  const Ri = (G / (0.5 * (thSurf + thRef))) * ((thRef - thSurf) * dzRef) / dv2

  const cape = finite(profile.capeJkg) ? Math.max(0, profile.capeJkg) : 0
  const li = finite(profile.liftedIndex) ? profile.liftedIndex : 5
  const convBoost = 1 + 0.3 * Math.min(2, cape / 400) + (li < 0 ? 0.15 * Math.min(3, -li) : 0)

  const stab = Ri >= 0 ? Math.max(0.25, 1 / (1 + 2.0 * Ri)) : 1 + 2.2 * Math.sqrt(Math.min(3, -Ri))
  const lInf = Ri >= 0 ? Math.min(22, Math.max(6, (0.09 * pblH) / (1 + 0.4 * Math.sqrt(Ri)))) : Math.min(32, Math.max(8, 0.1 * pblH))

  const clampedAbsGrad = Math.min(0.0085, Math.abs(dThDz))
  const effGrad = Ri <= 0 ? Math.max(clampedAbsGrad, 0.0045) : Math.max(clampedAbsGrad, 0.0032)
  const Mbl = -77.6e-6 * (pSurf / t2mK) * (effGrad / thSurf)

  const sEff = lowLevelShear(profile, w10, wRef, dzRef)
  const shearBoost = 1 + 10 * sEff
  const wind80Ms = finite(profile.wind80mKmh) ? Math.max(0, profile.wind80mKmh) / 3.6 : interpField(fullProfile, elevM + 80, (p) => p.speedMs)
  const windMix = 0.65 + 0.08 * Math.min(18, 0.4 * w10.speedMs + 0.6 * wind80Ms)
  const hScale = Math.min(Math.max(45, 0.6 * pblH), 220)

  let intBL = 0
  const steps = 12
  const zMin = 2
  const zMax = Math.max(40, pblH)
  const ratio = Math.pow(zMax / zMin, 1 / steps)
  for (let s = 0; s < steps; s++) {
    const z0 = zMin * Math.pow(ratio, s)
    const z1 = zMin * Math.pow(ratio, s + 1)
    const zMid = Math.sqrt(z0 * z1)
    const lm = (KAPPA * zMid) / (1 + (KAPPA * zMid) / lInf)
    const decay = Math.exp(-zMid / hScale)
    const cn2 = 2.8 * Math.pow(lm, 4 / 3) * Mbl * Mbl * stab * shearBoost * windMix * convBoost * decay
    intBL += cn2 * (z1 - z0)
  }
  return intBL
}

/**
 * Wylicza astronomiczny seeing (FWHM w sekundach łuku, 500 nm, zenit) z pełnego profilu pionowego atmosfery.
 * Zwraca null, jeśli brak co najmniej 2 ważnych poziomów izobarycznych powyżej powierzchni terenu.
 */
export function computeProfileSeeing(profile: VerticalProfile): SeeingBreakdown | null {
  if (!finite(profile.temp2mC) || !finite(profile.wind10mKmh)) return null

  const elevM = finite(profile.elevationM) ? profile.elevationM : 0
  const pSurf = finite(profile.surfacePressureHpa) && profile.surfacePressureHpa > 100
    ? profile.surfacePressureHpa
    : 1013.25 * Math.pow(Math.max(0.1, 1 - 2.25577e-5 * Math.max(0, elevM)), 5.25588)
  const t2mK = profile.temp2mC + KELVIN
  if (t2mK <= 100) return null

  const pblH = finite(profile.pblHeightM)
    ? Math.max(30, profile.pblHeightM)
    : Math.min(700, Math.max(120, Math.max(0, profile.wind10mKmh) * 35))

  // Odfiltrowanie poziomów ekstrapolowanych pod powierzchnią terenu (p >= p_surf lub z <= elev + 20 m).
  const pts: LayerPoint[] = []
  for (const lvl of profile.levels) {
    if (!finite(lvl.pressureHpa) || !finite(lvl.heightM) || !finite(lvl.tempC) || !finite(lvl.windKmh)) continue
    if (lvl.pressureHpa <= 0 || lvl.pressureHpa >= pSurf - 5 || lvl.heightM <= elevM + 20) continue
    const T = lvl.tempC + KELVIN
    if (T <= 100) continue
    const th = T * Math.pow(1000 / lvl.pressureHpa, R_OVER_CP)
    pts.push({ p: lvl.pressureHpa, z: lvl.heightM, T, th, ...windPoint(lvl.windKmh, lvl.windDeg) })
  }
  if (pts.length < 2) return null
  pts.sort((a, b) => a.z - b.z)

  const w10 = windPoint(profile.wind10mKmh, profile.wind10mDeg)
  const intBL = boundaryLayerIntegral(profile, elevM, pSurf, t2mK, pblH, w10, pts)
  const intFA = freeAtmosphereIntegral(pts, elevM + Math.max(pblH, 450))
  const totalInt = intBL + intFA
  if (!finite(totalInt) || totalInt <= 0) return null

  const arcsec = integralToArcsec(totalInt)
  if (!finite(arcsec)) return null

  return {
    arcsec,
    blArcsec: integralToArcsec(intBL),
    faArcsec: integralToArcsec(intFA),
    pblM: Math.round(pblH),
    label: classifySeeing(arcsec),
  }
}
