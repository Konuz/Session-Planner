import { describe, expect, it } from 'vitest'
import { mosaicCenters, mosaicOffsets } from './framing'

const C = { raDeg: 100, decDeg: 0 }

describe('mozaika', () => {
  it('1 × 1: jeden panel w środku kadru', () => {
    expect(mosaicCenters(C, 2, 1, 0, { cols: 1, rows: 1, overlapPct: 15 })).toEqual([C])
  })
  it('2 × 1 bez zakładki, PA 0: panele o pół pola na E i W, pierwszy po lewej (E)', () => {
    const [a, b] = mosaicCenters(C, 2, 1, 0, { cols: 2, rows: 1, overlapPct: 0 })
    expect(a.raDeg).toBeCloseTo(101, 6)
    expect(b.raDeg).toBeCloseTo(99, 6)
    expect(a.decDeg).toBeCloseTo(0, 6)
  })
  it('zakładka 20% zbliża panele: odstęp 0,8 pola w płaszczyźnie stycznej', () => {
    const [a] = mosaicCenters(C, 2, 1, 0, { cols: 2, rows: 1, overlapPct: 20 })
    expect(a.raDeg).toBeCloseTo(100 + (Math.atan(0.8 * Math.tan(Math.PI / 180)) * 180) / Math.PI, 6)
  })
  it('PA 90°: kolumny układają się wzdłuż deklinacji, pierwsza na S', () => {
    const [a, b] = mosaicCenters(C, 2, 1, 90, { cols: 2, rows: 1, overlapPct: 0 })
    expect(a.decDeg).toBeCloseTo(-1, 6)
    expect(b.decDeg).toBeCloseTo(1, 6)
    expect(a.raDeg).toBeCloseTo(100, 6)
  })
  it('2 × 2: kolejność wierszami od lewego górnego (N, E)', () => {
    const p = mosaicOffsets({ xi: 0, eta: 0 }, 2, 2, 0, { cols: 2, rows: 2, overlapPct: 0 })
    expect(p.map((t) => [Math.sign(t.xi), Math.sign(t.eta)])).toEqual([[1, 1], [-1, 1], [1, -1], [-1, -1]])
  })
})
