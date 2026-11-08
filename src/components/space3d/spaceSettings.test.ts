import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it } from 'vitest'
import type { DSO } from '../../lib/catalog'
import type { PhotoProject } from '../../lib/photo'
import { useSpaceSettings } from './spaceSettings'

const selected = { i: 31, distLy: 2.5e6, con: 'And' } as DSO
const photo = (distances: (number | null)[]): PhotoProject => ({
  version: 3, id: 'LDN1355', name: 'LDN1355', image: '', width: 1000, height: 1000, createdAt: 0,
  cuts: distances.map((distLy, i) => ({
    id: `cut-${i}`, type: 'DN', raDeg: 0, decDeg: 0, x: 100, y: 100, radius: 20, enabled: true, distLy,
    uncertaintyLy: null, distanceScope: 'object', distanceMethod: '', distanceSource: '', distanceRef: '', distanceOrigin: 'user',
  })),
  astrometry: { raDeg: 0, decDeg: 0, rmsPx: 0, matches: 0, edgeMatches: 0, edgeRmsPx: null, totalMs: 0, wcs: null }, stars: null,
})

function firstRender(project: PhotoProject | null) {
  function Probe() {
    return createElement('span', null, useSpaceSettings(selected, project).scale)
  }
  return renderToString(createElement(Probe))
}

it('już pierwszy widok zapisanego zdjęcia LDN jest w Drodze Mlecznej mimo wybranej wcześniej galaktyki', () => {
  expect(firstRender(photo([1300, 1500]))).toBe('<span>galaxy</span>')
})

it('bez zdjęcia dobiera skalę do obiektu katalogowego', () => {
  expect(firstRender(null)).toBe('<span>universe</span>')
})

it('zdjęcie wyłącznie odległych obiektów zaczyna we Wszechświecie lokalnym', () => {
  expect(firstRender(photo([2.5e6, 5e7]))).toBe('<span>universe</span>')
})

it('zdjęcie bez ustalonych odległości zaczyna w Drodze Mlecznej', () => {
  expect(firstRender(photo([null]))).toBe('<span>galaxy</span>')
})
