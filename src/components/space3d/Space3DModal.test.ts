import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { NO_DISTANCE } from '../../lib/distance'
import type { PhotoProject } from '../../lib/photo'
import type { PhotoSession } from './photoSession'

const sessionState = vi.hoisted(() => ({
  restoring: true,
  project: null as PhotoProject | null,
}))

vi.stubGlobal('document', { body: {} })
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return { ...actual, createPortal: (node: unknown) => node }
})
vi.mock('../../state/data', () => ({
  useSelected: () => ({ i: 1, id: 'M 81', namePl: 'Galaktyka Bodego', type: 'G', distLy: 12e6, raDeg: 148.888, decDeg: 69.065, con: 'UMa' }),
  useCatalog: () => ({ catalog: null, error: null }),
}))
vi.mock('../Space3D', () => ({ default: () => null }))
vi.mock('./photoSession', () => ({
  usePhotoSession: () => ({
    project: sessionState.project,
    restoring: sessionState.restoring,
    busy: false,
    editing: false,
    error: '',
    saveError: '',
    ready: true,
    activeId: null,
    change: vi.fn(),
    updateCut: vi.fn(),
    upload: vi.fn(),
    cancelUpload: vi.fn(),
    clearError: vi.fn(),
    retrySave: vi.fn(),
    setEditing: vi.fn(),
    setActiveId: vi.fn(),
  } satisfies PhotoSession),
  useGaiaStars: () => ({ stars: { status: 'idle' as const }, retry: vi.fn() }),
  useCutDistances: () => {},
  useRegressor: () => [],
}))

import Space3DModal from './Space3DModal'

it('nie pokazuje okna z tymczasową skalą, dopóki sesja nie odczyta zapisanego zdjęcia', () => {
  sessionState.restoring = true
  sessionState.project = null
  expect(renderToString(createElement(Space3DModal))).toBe('')
})

it('we Wszechświecie lokalnym używa tego samego paska przycisków co w Drodze Mlecznej, bez osobnej „Osi odległości”', () => {
  sessionState.restoring = false
  sessionState.project = {
    version: 3, id: 'galaxies', name: 'Galaktyki', image: 'galaxies.jpg', width: 1600, height: 900, createdAt: 0, stars: null,
    cuts: [
      { ...NO_DISTANCE, id: 'M 81', type: 'G', raDeg: 148.888, decDeg: 69.065, x: 400, y: 300, radius: 70, enabled: true, distLy: 12e6, distanceOrigin: 'user' },
    ],
    astrometry: { raDeg: 149, decDeg: 69, rmsPx: 1, matches: 20, edgeMatches: 5, edgeRmsPx: 1, totalMs: 1, wcs: null },
  }
  const html = renderToString(createElement(Space3DModal))
  expect(html).toContain('Wszechświat lokalny · odległości w skali logarytmicznej')
  expect(html).not.toContain('M 81 · Galaktyka Bodego')
  expect(html).toContain('Galaktyki')
  expect(html).not.toContain('Oś odległości')
  expect(html).toContain('Rozłóż zdjęcie 3D')
  expect(html).toContain('Edytuj wycinki')
  expect(html).toContain('Zmień zdjęcie')
  expect(html).toContain('Usuń')
  // Przycisk „Zmień zdjęcie” występuje wyłącznie w dolnym pasku zdjęcia (nie w lewym górnym rogu).
  expect(html.match(/Zmień zdjęcie/g)).toHaveLength(1)
})
