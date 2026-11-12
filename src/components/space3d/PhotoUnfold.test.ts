import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { NO_DISTANCE } from '../../lib/distance'
import type { PhotoProject } from '../../lib/photo'
import type { PhotoSession } from './photoSession'
import { PhotoUnfold } from './PhotoUnfold'

const project: PhotoProject = {
  version: 3, id: 'galaxies', name: 'Galaktyki', image: 'galaxies.jpg', width: 1600, height: 900, createdAt: 0, stars: null,
  cuts: [
    { ...NO_DISTANCE, id: 'M 81', type: 'G', raDeg: 148.888, decDeg: 69.065, x: 400, y: 300, radius: 70, enabled: true, distLy: 12e6, distanceOrigin: 'user' },
    { ...NO_DISTANCE, id: 'M 82', type: 'G', raDeg: 148.97, decDeg: 69.68, x: 1100, y: 600, radius: 40, enabled: true, distLy: 11.4e6, distanceOrigin: 'user' },
    { ...NO_DISTANCE, id: 'PGC 28757', type: 'G', raDeg: 149.2, decDeg: 69.3, x: 900, y: 200, radius: 9, enabled: true, distLy: 410e6, distanceOrigin: 'user' },
    { ...NO_DISTANCE, id: 'bez odległości', type: 'G', raDeg: 149, decDeg: 69, x: 800, y: 450, radius: 20, enabled: true, distanceOrigin: 'user' },
  ],
  astrometry: { raDeg: 149, decDeg: 69, rmsPx: 1, matches: 20, edgeMatches: 5, edgeRmsPx: 1, totalMs: 1, wcs: null },
}
function render(overrides: Partial<PhotoSession> = {}, visible = true) {
  const session: PhotoSession = {
    project, activeId: null, busy: false, editing: false, restoring: false, error: '', saveError: '', ready: true,
    change: vi.fn(), updateCut: vi.fn(), upload: vi.fn(), cancelUpload: vi.fn(), clearError: vi.fn(), retrySave: vi.fn(), setEditing: vi.fn(), setActiveId: vi.fn(),
    ...overrides,
  }
  return renderToStaticMarkup(createElement(PhotoUnfold, { session, visible }))
}

it('pokazuje licznik obiektów, zakres odległości i licznik obiektów poza 3D, bez planów i okna zdjęcia', () => {
  const html = render()
  expect(html).toContain('OBIEKTY ZDJĘCIA')
  expect(html).toContain('3 obiektów w przestrzeni')
  expect(html).toContain('≈ 11–410 mln lś')
  expect(html).toContain('1 poza 3D')
  expect(html).not.toContain('Główny plan')
  expect(html).not.toContain('Z Ziemi')
})

it('wybrany obiekt ma odległość, przybliżenie i przejście do źródła odległości', () => {
  const html = render({ activeId: 'PGC 28757' })
  expect(html).toContain('aria-label="Wybrany obiekt"')
  expect(html).toContain('≈ 410 mln lś')
  expect(html).toContain('Przybliż')
  expect(html).toContain('Źródło odległości')
})

it('znika w edycji wycinków, poza skalą i bez projektu', () => {
  expect(render({ editing: true })).toBe('')
  expect(render({}, false)).toBe('')
  expect(render({ project: null })).toBe('')
})

it('bez obiektów z odległością prowadzi do edytora wycinków', () => {
  const html = render({ project: { ...project, cuts: project.cuts.slice(3) } })
  expect(html).toContain('0 obiektów w przestrzeni')
  expect(html).toContain('Włącz wycinki z ustaloną odległością')
})
