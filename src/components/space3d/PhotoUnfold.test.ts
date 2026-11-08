import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { NO_DISTANCE } from '../../lib/distance'
import { photoFrame, type PhotoProject, type PhotoSceneFrame } from '../../lib/photo'
import type { PhotoSession } from './photoSession'

const state = vi.hoisted(() => ({ progress: 1, scene: { width: 1000, height: 700, anchors: [] } as PhotoSceneFrame, labels: [{ id: 'M 81', x: 640, y: 230, size: 64, visible: true }, { id: 'M 82', x: 710, y: 350, size: 48, visible: true }] }))
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => [Array.isArray(initial) ? state.labels : typeof initial === 'object' ? state.scene : initial === 0 ? state.progress : initial, vi.fn()],
}))
import { PhotoUnfold } from './PhotoUnfold'

const project: PhotoProject = {
  version: 3, id: 'galaxies', name: 'Galaktyki', image: 'galaxies.jpg', width: 1600, height: 900, createdAt: 0, stars: null,
  cuts: [
    { ...NO_DISTANCE, id: 'M 81', type: 'G', raDeg: 148.888, decDeg: 69.065, x: 400, y: 300, radius: 70, enabled: true, distLy: 12e6, distanceOrigin: 'user' },
    { ...NO_DISTANCE, id: 'M 82', type: 'G', raDeg: 148.97, decDeg: 69.68, x: 1100, y: 600, radius: 40, enabled: true, distLy: 11.4e6, distanceOrigin: 'user' },
    { ...NO_DISTANCE, id: 'bez odległości', type: 'G', raDeg: 149, decDeg: 69, x: 800, y: 450, radius: 20, enabled: true, distanceOrigin: 'user' },
  ],
  astrometry: { raDeg: 149, decDeg: 69, rmsPx: 1, matches: 20, edgeMatches: 5, edgeRmsPx: 1, totalMs: 1, wcs: null },
}
const session: PhotoSession = {
  project, activeId: null, busy: false, editing: false, restoring: false, error: '', saveError: '', ready: true,
  change: vi.fn(), updateCut: vi.fn(), upload: vi.fn(), cancelUpload: vi.fn(), clearError: vi.fn(), retrySave: vi.fn(), setEditing: vi.fn(), setActiveId: vi.fn(),
}
function render() {
  return renderToStaticMarkup(createElement(PhotoUnfold, { session, handle: null, frameRef: { current: null }, fitRef: { current: null }, onObservatory: vi.fn() }))
}
beforeEach(() => {
  state.progress = 1
  state.labels = [{ id: 'M 81', x: 640, y: 230, size: 64, visible: true }, { id: 'M 82', x: 710, y: 350, size: 48, visible: true }]
})

it('opisuje rzeczywiste fragmenty 3D bez powielania ich obrazów i bez dawnego schematu linii', () => {
  const html = render()
  expect(html).toContain('x="608" y="198" width="64" height="64"')
  expect(html).toContain('x="686" y="326" width="48" height="48"')
  expect(html).toContain('M 81:')
  expect(html).toContain('M 82:')
  expect(html).not.toContain('bez odległości:')
  expect(html).not.toContain('<clipPath')
  expect(html).not.toContain('stroke-dashoffset')
})

it('zachowuje dopasowaną fotografię przy zerowym rozłożeniu i ukrywa opisy 3D', () => {
  state.progress = 0
  const frame = photoFrame(1000, 700, project)
  const html = render()
  expect(html).toContain(`translate(${frame.x} ${frame.y}) scale(${frame.scale})`)
  expect(html).not.toContain('photo-fragment-hit')
})

it('podpisy podążają za rzutem fragmentu i znikają za kamerą', () => {
  state.labels[0].x = 450
  state.labels[1].visible = false
  const html = render()
  expect(html).toContain('x="418" y="198" width="64" height="64"')
  expect(html).not.toContain('M 82:')
})
