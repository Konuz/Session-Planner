// HEALPix NESTED (Górski i in. 2005): ściana bazowa i współrzędne piksela na rzędzie `order` (nside = 2^order).
// Algorytm loc2pix z HEALPix C++; czapki polarne liczone przez cos δ, dokładne także tuż przy biegunie.
import { DEG, type Vec3 } from './astro'

export function healpixFaceXY(order: number, raDeg: number, decDeg: number): [number, number, number] {
  const nside = 2 ** order
  const z = Math.sin(decDeg * DEG)
  const za = Math.abs(z)
  const tt = (((raDeg % 360) + 360) % 360) / 90
  if (za <= 2 / 3) {
    const t1 = nside * (0.5 + tt)
    const t2 = nside * z * 0.75
    const jp = Math.floor(t1 - t2)
    const jm = Math.floor(t1 + t2)
    const ifp = Math.floor(jp / nside)
    const ifm = Math.floor(jm / nside)
    const face = ifp === ifm ? ifp | 4 : ifp < ifm ? ifp : ifm + 8
    return [face, jm % nside, nside - (jp % nside) - 1]
  }
  const ntt = Math.min(3, Math.floor(tt))
  const tp = tt - ntt
  const tmp = (nside * Math.cos(decDeg * DEG)) / Math.sqrt((1 + za) / 3)
  const jp = Math.min(nside - 1, Math.floor(tp * tmp))
  const jm = Math.min(nside - 1, Math.floor((1 - tp) * tmp))
  return z > 0 ? [ntt, nside - jm - 1, nside - jp - 1] : [ntt + 8, jp, jm]
}

const CTAB = new Uint16Array(256)
for (let i = 0; i < 256; i++) {
  let m = 0
  for (let b = 0; b < 8; b++) m |= ((i >> b) & 1) << (2 * b)
  CTAB[i] = m
}

/** Indeks NESTED: bity `ix` na pozycjach parzystych, `iy` na nieparzystych (bezpieczne do rzędu 24 włącznie). */
export function nestIndex(order: number, face: number, ix: number, iy: number): number {
  const lo = CTAB[ix & 0xff] | (CTAB[iy & 0xff] << 1)
  const mid = (CTAB[(ix >> 8) & 0xff] | (CTAB[(iy >> 8) & 0xff] << 1)) * 0x10000
  const hi = (ix | iy) > 0xffff ? (CTAB[(ix >> 16) & 0xff] | (CTAB[(iy >> 16) & 0xff] << 1)) * 0x100000000 : 0
  return face * 4 ** order + hi + mid + lo
}

/** Ściana i współrzędne (ix, iy) piksela o indeksie NESTED na rzędzie `order` ≤ 15 (odwrotność `nestIndex`). */
export function nestToFaceXY(order: number, npix: number): [number, number, number] {
  const n = 4 ** order
  const face = Math.floor(npix / n)
  let p = npix - face * n
  let ix = 0
  let iy = 0
  for (let b = 0; b < order; b++) {
    ix |= (p & 1) << b
    iy |= ((p >> 1) & 1) << b
    p >>= 2
  }
  return [face, ix, iy]
}

const JRLL = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4]
const JPLL = [1, 3, 5, 7, 0, 2, 4, 6, 1, 3, 5, 7]

/**
 * Wektor jednostkowy J2000 punktu ściany `face` o współrzędnych ułamkowych x = ix/nside, y = iy/nside z [0, 1]
 * (te same osie co `healpixFaceXY`); xyf2loc z HEALPix C++.
 */
export function faceXYToVec(face: number, x: number, y: number): Vec3 {
  const jr = JRLL[face] - x - y
  let nr: number
  let z: number
  let sth: number
  if (jr < 1 || jr > 3) {
    nr = jr < 1 ? jr : 4 - jr
    const t = (nr * nr) / 3
    z = jr < 1 ? 1 - t : t - 1
    sth = Math.sqrt(t * (2 - t))
  } else {
    nr = 1
    z = ((2 - jr) * 2) / 3
    sth = Math.sqrt(1 - z * z)
  }
  let t = JPLL[face] * nr + x - y
  if (t < 0) t += 8
  if (t >= 8) t -= 8
  const phi = nr < 1e-15 ? 0 : ((Math.PI / 4) * t) / nr
  return [sth * Math.cos(phi), sth * Math.sin(phi), z]
}
