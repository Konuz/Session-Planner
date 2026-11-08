import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

vi.mock('../../state/data', () => ({
  useSelected: () => null,
  useCatalog: () => ({ catalog: null, error: null }),
}))
vi.mock('../Space3D', () => ({ default: () => null }))

import Space3DModal from './Space3DModal'

it('nie pokazuje okna z tymczasową skalą, dopóki sesja nie odczyta zapisanego zdjęcia', () => {
  expect(renderToString(createElement(Space3DModal))).toBe('')
})
