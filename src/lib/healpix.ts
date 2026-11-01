// HEALPix NESTED (Górski i in. 2005): ściana bazowa i współrzędne piksela na rzędzie `order` (nside = 2^order).
// Algorytm loc2pix z HEALPix C++; czapki polarne liczone przez cos δ, dokładne także tuż przy biegunie.
import { DEG } from './astro'

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

/** Indeks NESTED: bity `ix` na pozycjach parzystych, `iy` na nieparzystych (rząd ≤ 15). */
export function nestIndex(order: number, face: number, ix: number, iy: number): number {
  let bits = 0
  for (let b = 0; b < order; b++) bits += (((ix >> b) & 1) << (2 * b)) + (((iy >> b) & 1) << (2 * b + 1))
  return face * 4 ** order + bits
}
