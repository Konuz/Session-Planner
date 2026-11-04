import { describe, expect, it } from 'vitest'
import { healpixFaceXY, nestIndex } from './healpix'

// [rząd, RA, Dec, ściana, ix, iy] z astropy_healpix (punkty z dala od granic pikseli)
const REF: [number, number, number, number, number, number][] = [
  [5, 279.23473, 38.78369, 3, 2, 27], // Vega
  [5, 37.95456, 89.26411, 0, 31, 31], // Polaris
  [5, 123.4, -89.95, 9, 0, 0], // biegun S
  [5, 1e-5, 0.5, 4, 16, 16], // RA 0
  [5, 359.9999, 10, 4, 20, 20],
  [5, 90, 41.82, 1, 0, 31], // nad granicą z = 2/3
  [5, 90, 41.8, 5, 31, 31], // pod granicą z = 2/3
  [5, 344.41269, -29.62224, 11, 30, 9], // Fomalhaut
  [5, 95.98796, -52.69566, 9, 1, 23], // Kanopus
  [18, 279.23473, 38.78369, 3, 18977, 227325],
  [18, 37.95456, 89.26411, 0, 259759, 260405],
  [18, 123.4, -89.95, 9, 103, 176],
  [18, 1e-5, 0.5, 4, 132787, 132787],
  [18, 359.9999, 10, 4, 165212, 165212],
  [18, 90, 41.82, 1, 49, 262143],
  [18, 90, 41.8, 5, 262117, 262117],
  [18, 344.41269, -29.62224, 11, 250635, 79294],
  [18, 95.98796, -52.69566, 9, 13663, 191700],
  [18, 299.9016, 22.721, 3, 31961, 119915], // M 27
  [20, 279.23473, 38.78369, 3, 75911, 909302],
  [20, 37.95456, 89.26411, 0, 1039037, 1041620],
  [20, 359.9999, 10, 4, 660849, 660851],
  [20, 344.41269, -29.62224, 11, 1002541, 317176],
  [20, 299.9016, 22.721, 3, 127845, 479663],
]

describe('HEALPix', () => {
  it('ściana i współrzędne zgodne z astropy_healpix', () => {
    for (const [order, ra, dec, face, ix, iy] of REF) expect(healpixFaceXY(order, ra, dec), `${order} ${ra} ${dec}`).toEqual([face, ix, iy])
  })
  it('indeks kafelka na rzędzie 7 dla M 27 (ESA: Norder7/Dir50000/Npix51933.jpg)', () => {
    const [face, ix, iy] = healpixFaceXY(16, 299.9016, 22.721)
    expect(nestIndex(7, face, ix >> 9, iy >> 9)).toBe(51933)
    expect(nestIndex(7, 3, 15, 58)).toBe(51933)
    expect(nestIndex(15, 0, 0, 1 << 14)).toBe(2 ** 29)
    expect(nestIndex(16, 0, 0, 1 << 15)).toBe(2 ** 31)
  })
})
