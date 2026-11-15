import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it } from 'vitest'
import type { DSO } from '../../lib/catalog'
import type { PhotoProject } from '../../lib/photo'
import { autoSpaceScale, nextScaleChoice, useSpaceSettings } from './spaceSettings'

const selected = { i: 31, distLy: 2.5e6, con: 'And' } as DSO
const milkyWayObject = { i: 42, distLy: 1344, con: 'Ori' } as DSO
const photo = (distances: (number | null)[], id = 'LDN1355'): PhotoProject => ({
  version: 3, id, name: id, image: '', width: 1000, height: 1000, createdAt: 0,
  cuts: distances.map((distLy, i) => ({
    id: `cut-${i}`, type: 'DN', raDeg: 0, decDeg: 0, x: 100, y: 100, radius: 20, enabled: true, distLy,
    uncertaintyLy: null, distanceScope: 'object', distanceMethod: '', distanceSource: '', distanceRef: '', distanceOrigin: 'user',
  })),
  astrometry: { raDeg: 0, decDeg: 0, rmsPx: 0, matches: 0, edgeMatches: 0, edgeRmsPx: null, totalMs: 0, wcs: null }, stars: null,
})

function firstRender(project: PhotoProject | null, photoActive = true) {
  function Probe() {
    return createElement('span', null, useSpaceSettings(selected, project, photoActive).scale)
  }
  return renderToString(createElement(Probe))
}

it('już pierwszy widok zapisanego zdjęcia LDN jest w Drodze Mlecznej mimo wybranej wcześniej galaktyki', () => {
  expect(firstRender(photo([1300, 1500]))).toBe('<span>galaxy</span>')
})

it('nieaktywne zdjęcie LDN przy wybranej galaktyce zostawia Wszechświat lokalny', () => {
  expect(firstRender(photo([1300, 1500]), false)).toBe('<span>universe</span>')
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

it('„Pokaż zdjęcie” dla obiektu w Drodze Mlecznej zostaje we Wszechświecie lokalnym', () => {
  const ldn = photo([1300, 1500], 'LDN1355')
  // Użytkownik przeszedł do Wszechświata przez kliknięcie galaktyki (scaleChoice === null).
  const byObject = nextScaleChoice(
    { object: selected.i, photo: ldn.id, active: false },
    { object: selected.i, photo: ldn.id, active: true },
    null,
    selected,
  )
  expect(byObject ?? autoSpaceScale(selected, ldn, true)).toBe('universe')
  // Użytkownik przełączył ręcznie zakładkę na Wszechświat przy obiekcie z Drogi Mlecznej.
  const byTab = nextScaleChoice(
    { object: milkyWayObject.i, photo: ldn.id, active: false },
    { object: milkyWayObject.i, photo: ldn.id, active: true },
    'universe',
    milkyWayObject,
  )
  expect(byTab ?? autoSpaceScale(milkyWayObject, ldn, true)).toBe('universe')
})

it('„Pokaż zdjęcie” dla galaktyki nie przenosi z Drogi Mlecznej do Wszechświata lokalnego', () => {
  const galaxyPhoto = photo([12e6], 'M81')
  // Użytkownik kliknął obiekt z Drogi Mlecznej (scaleChoice === null).
  const byObject = nextScaleChoice(
    { object: milkyWayObject.i, photo: galaxyPhoto.id, active: false },
    { object: milkyWayObject.i, photo: galaxyPhoto.id, active: true },
    null,
    milkyWayObject,
  )
  expect(byObject ?? autoSpaceScale(milkyWayObject, galaxyPhoto, true)).toBe('galaxy')
  // Użytkownik przełączył ręcznie zakładkę na Drogę Mleczną przy galaktyce.
  const byTab = nextScaleChoice(
    { object: selected.i, photo: galaxyPhoto.id, active: false },
    { object: selected.i, photo: galaxyPhoto.id, active: true },
    'galaxy',
    selected,
  )
  expect(byTab ?? autoSpaceScale(selected, galaxyPhoto, true)).toBe('galaxy')
})

it('nowo wczytane zdjęcie i nowy obiekt katalogowy dalej dobierają skalę automatycznie', () => {
  expect(nextScaleChoice(
    { object: selected.i, photo: 'LDN1355', active: false },
    { object: selected.i, photo: 'M81', active: true },
    'galaxy',
    selected,
  )).toBeNull()
  expect(nextScaleChoice(
    { object: milkyWayObject.i, photo: 'LDN1355', active: true },
    { object: selected.i, photo: 'LDN1355', active: false },
    'galaxy',
    selected,
  )).toBeNull()
})
