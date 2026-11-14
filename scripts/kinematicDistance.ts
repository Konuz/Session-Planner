// Odległość kinematyczna obszaru H II z prędkości radialnej (v_LSR): uniwersalna krzywa rotacji (Persic i in. 1996)
// z parametrami dopasowania A5 Reid i in. 2019 (ApJ 885, 131, tabela 3) i niepewność metodą Monte Carlo jak
// u Wenger i in. 2018 (ApJ 856, 52). Własna implementacja (bez kodu pakietu kd). Czysta logika bez importów wartości.

export interface RotationModel {
  /** Odległość Słońca od centrum Galaktyki [kpc]. */
  R0: number
  /** Ruch własny Słońca: do centrum, w kierunku rotacji, do bieguna północnego [km/s]. */
  Usun: number
  Vsun: number
  Wsun: number
  /** Średni ruch własny obszarów gwiazdotwórczych: do centrum i w kierunku rotacji [km/s]. */
  Us: number
  Vs: number
  /** Parametry krzywej uniwersalnej. */
  a2: number
  a3: number
}

/** Dopasowanie A5 (Reid i in. 2019, tabela 3; R₀ ze streszczenia). Z⊙ = 5,5 pc pomijamy (< 0,1 km/s). */
export const REID19_A5: RotationModel = { R0: 8.15, Usun: 10.6, Vsun: 10.7, Wsun: 7.6, Us: 6.0, Vs: -4.3, a2: 0.96, a3: 1.62 }
const REID19_A5_SIGMA: RotationModel = { R0: 0.15, Usun: 1.2, Vsun: 6.0, Wsun: 0.7, Us: 1.4, Vs: 5.6, a2: 0.05, a3: 0.02 }
/** Korelacja V⊙ z V̄s w dopasowaniu A5 (Reid i in. 2019, §4). Pozostałe korelacje pomijamy. */
const VSUN_VS_CORRELATION = -0.99
/** Rozrzut prędkości gazu względem modelu (ruchy własne i turbulencje) [km/s]. Założenie projektu 14.11.2026. */
const VELOCITY_SIGMA_KMS = 5
/** Standardowy ruch Słońca definiujący LSR (IAU: 20 km/s w kierunku α = 18h, δ = +30°, B1900) [km/s]. */
const LSR_STD = { U: 10.27, V: 15.32, W: 7.74 }
const MAX_DISTANCE_KPC = 25
const DEG = Math.PI / 180

/** Krzywa uniwersalna Persic i in. 1996 w postaci Reid i in. 2019; stałe zależne od a₃ liczone raz na model. */
function rotationCurve(m: RotationModel): (rKpc: number) => number {
  const lambda = (m.a3 / 1.5) ** 5
  const logLambda = Math.log10(lambda)
  const diskScale = (0.72 + 0.44 * logLambda) * 1.97
  const haloScale = 1.6 * Math.exp(-0.4 * lambda), haloCore = 2.25 * lambda ** 0.4
  const scale = 200 * lambda ** 0.41 / Math.sqrt(0.8 + 0.49 * logLambda + 0.75 * Math.exp(-0.4 * lambda) / (0.47 + haloCore))
  return (rKpc) => {
    const rho = rKpc / (m.a2 * m.R0), rho2 = rho * rho
    return scale * Math.sqrt(Math.max(0, diskScale * rho ** 1.22 / (rho2 + 0.61) ** 1.43 + haloScale * rho2 / (rho2 + haloCore)))
  }
}

/** Prędkość orbitalna na promieniu galaktocentrycznym R [km/s]. */
export function circularSpeed(rKpc: number, m: RotationModel): number {
  return rotationCurve(m)(rKpc)
}

/**
 * v_LSR w funkcji odległości na linii widzenia (l, b) dla obiektu krążącego po krzywej rotacji z ruchem własnym
 * obszarów gwiazdotwórczych. Układ heliocentryczny: X do centrum Galaktyki, Y w kierunku l = 90° (kierunek rotacji),
 * Z do bieguna północnego.
 */
function sightline(lDeg: number, bDeg: number, m: RotationModel): (dKpc: number) => number {
  const cosL = Math.cos(lDeg * DEG), sinL = Math.sin(lDeg * DEG), cosB = Math.cos(bDeg * DEG), sinB = Math.sin(bDeg * DEG)
  const theta = rotationCurve(m)
  const sun = { x: m.Usun, y: theta(m.R0) + m.Vsun, z: m.Wsun }
  const offset = -sun.x * cosB * cosL - sun.y * cosB * sinL - sun.z * sinB + (LSR_STD.U * cosL + LSR_STD.V * sinL) * cosB + LSR_STD.W * sinB
  return (dKpc) => {
    // Położenie względem centrum Galaktyki (w płaszczyźnie).
    const px = dKpc * cosB * cosL - m.R0, py = dKpc * cosB * sinL
    const r = Math.max(Math.hypot(px, py), 1e-6)
    const rotation = theta(r) + m.Vs
    // Kierunek rotacji (py, −px)/R, kierunek do centrum −p/R.
    const vx = (rotation * py - m.Us * px) / r
    const vy = (-rotation * px - m.Us * py) / r
    return vx * cosB * cosL + vy * cosB * sinL + offset
  }
}

export function modelVlsr(lDeg: number, bDeg: number, dKpc: number, m: RotationModel): number {
  return sightline(lDeg, bDeg, m)(dKpc)
}

/** Miejsce zerowe f na [a, b] metodą bisekcji; null bez zmiany znaku. */
function bisect(f: (d: number) => number, a: number, b: number): number | null {
  let fa = f(a)
  if (fa === 0) return a
  if (Math.sign(fa) === Math.sign(f(b))) return null
  // 32 kroki na przedziale ≤ 25 kpc: dokładność poniżej 10⁻⁸ kpc.
  for (let i = 0; i < 32; i++) {
    const mid = (a + b) / 2, fm = f(mid)
    if (Math.sign(fm) === Math.sign(fa)) { a = mid; fa = fm } else b = mid
  }
  return (a + b) / 2
}

/**
 * Odległości [kpc], dla których model daje v_LSR. Wewnętrzna Galaktyka (cos l > 0): bliższa i dalsza po obu stronach
 * punktu stycznego, a prędkość poza styczną daje punkt styczny. Jedno rozwiązanie: far = null. Brak rozwiązania: null.
 */
export function solveKinematic(lDeg: number, bDeg: number, vlsr: number, m: RotationModel): { near: number; far: number | null } | null {
  const model = sightline(lDeg, bDeg, m)
  const f = (d: number) => model(d) - vlsr
  const cosL = Math.cos(lDeg * DEG)
  if (cosL <= 0) {
    const d = bisect(f, 0.001, MAX_DISTANCE_KPC)
    return d === null ? null : { near: d, far: null }
  }
  const tangent = m.R0 * cosL / Math.cos(bDeg * DEG)
  // Poza punktem stycznym: prędkość dalej od zera niż największa możliwa na tej linii widzenia.
  if (Math.sign(Math.sin(lDeg * DEG)) * f(tangent) < 0) return { near: tangent, far: tangent }
  const near = bisect(f, 0.001, tangent), far = bisect(f, tangent, MAX_DISTANCE_KPC)
  if (near !== null && far !== null) return { near, far }
  const only = near ?? far
  return only === null ? null : { near: only, far: null }
}

export type Kda = 'N' | 'F' | 'T' | null

/** Generator mulberry32 z ziarnem z hasza FNV-1a: ten sam obiekt daje te same próbki w każdej budowie. */
function random(seed: string): () => number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193)
  let state = h >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Odległość kinematyczna z niepewnością: mediana i połowa przedziału 16–84 % z próbek Monte Carlo (parametry modelu
 * i prędkość obiektu losowane z rozkładów normalnych). KDA „F”: dalsze rozwiązanie, inaczej bliższe. Gdy ponad połowa
 * próbek nie ma rozwiązania: null.
 */
export function kinematicDistance(o: { seed: string; lDeg: number; bDeg: number; vlsr: number; kda: Kda }, samples = 2000): { kpc: number; sigmaKpc: number } | null {
  const uniform = random(o.seed)
  const normal = () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform())
  const draw = (key: keyof RotationModel, z = normal()) => REID19_A5[key] + REID19_A5_SIGMA[key] * z
  const distances: number[] = []
  for (let i = 0; i < samples; i++) {
    const z1 = normal(), z2 = normal()
    const m: RotationModel = {
      R0: draw('R0'), Usun: draw('Usun'), Vsun: draw('Vsun', z1), Wsun: draw('Wsun'), Us: draw('Us'),
      Vs: draw('Vs', VSUN_VS_CORRELATION * z1 + Math.sqrt(1 - VSUN_VS_CORRELATION ** 2) * z2), a2: draw('a2'), a3: draw('a3'),
    }
    const solution = solveKinematic(o.lDeg, o.bDeg, o.vlsr + VELOCITY_SIGMA_KMS * normal(), m)
    if (solution) distances.push(o.kda === 'F' ? solution.far ?? solution.near : solution.near)
  }
  if (distances.length < samples / 2) return null
  distances.sort((a, b) => a - b)
  const quantile = (q: number) => distances[Math.round(q * (distances.length - 1))]
  return { kpc: quantile(0.5), sigmaKpc: (quantile(0.84) - quantile(0.16)) / 2 }
}
