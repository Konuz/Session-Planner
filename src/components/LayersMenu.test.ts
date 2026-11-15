import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../state/data', () => ({
  useCatalog: () => ({
    catalog: [
      { i: 0, id: 'M 42', namePl: 'Mgławica Oriona', type: 'EN', distLy: 1344, raDeg: 83.82, decDeg: -5.39, con: 'Ori' },
      { i: 1, id: 'M 13', namePl: 'Wielka Gromada w Herkulesie', type: 'GC', distLy: 22200, raDeg: 250.42, decDeg: 36.46, con: 'Her' },
      { i: 2, id: 'M 31', namePl: 'Galaktyka Andromedy', type: 'G', distLy: 2.54e6, raDeg: 10.68, decDeg: 41.27, con: 'And' },
    ],
    error: null,
  }),
}))

import { LayersMenu } from './LayersMenu'
import { SpaceToolbar } from './space3d/SpaceToolbar'
import type { SpaceSettingsState } from './space3d/spaceSettings'

function makeSettings(overrides: Partial<SpaceSettingsState> = {}): SpaceSettingsState {
  return {
    scale: 'galaxy',
    setScale: vi.fn(),
    showConstellations: false,
    setShowConstellations: vi.fn(),
    constellationChoice: 'all',
    setConstellationChoice: vi.fn(),
    showStarNames: true,
    setShowStarNames: vi.fn(),
    hiddenTypes: [],
    setHiddenTypes: vi.fn(),
    galaxyLevel: 1,
    setGalaxyLevel: vi.fn(),
    constellations: { constellations: [{ abbr: 'Ori', lines: [] }] },
    constellationError: false,
    ...overrides,
  }
}

describe('LayersMenu', () => {
  it('na mapie nieba dzieli menu na zwijane sekcje Warstwy i Obiekty', () => {
    const html = renderToString(createElement(LayersMenu, { defaultOpen: true })).replace(/<!-- -->/g, '')
    expect(html).toContain('aria-label="Warstwy kopuły"')
    expect(html).toContain('>Warstwy</span>')
    expect(html).toContain('>Obiekty</span>')
    expect(html).toContain('Nazwy gwiazdozbiorów')
    expect(html).not.toContain('Wspólne')
    expect(html).not.toContain('Wszechświat lokalny')
  })

  it('w widoku 3D dzieli menu na sekcje Wspólne, Droga Mleczna i Wszechświat lokalny ze suwakiem galaktyk', () => {
    const settings = makeSettings({ galaxyLevel: 1, hiddenTypes: ['GC'] })
    const html = renderToString(
      createElement(LayersMenu, {
        threeD: true,
        settings,
        typeCounts: [
          { type: 'EN', count: 1 },
          { type: 'GC', count: 1 },
        ],
        defaultOpen: true,
      }),
    ).replace(/<!-- -->/g, '')

    expect(html).toContain('aria-label="Warstwy 3D"')
    expect(html.match(/class="layers-group"/g)).toHaveLength(3)
    expect(html.match(/class="layers-body"/g)).toHaveLength(3)
    expect(html).toContain('>Wspólne</span>')
    expect(html).toContain('Opisy')
    expect(html).toContain('>Droga Mleczna</span>')
    expect(html).toContain('Gwiazdozbiory 3D')
    expect(html).not.toContain('Nazwy gwiazd')
    expect(html).toContain('class="layers-subgroup"><button type="button" class="layers-section layers-subsection"')
    expect(html).toContain('>Filtr obiektów</span><span class="dim">1/2</span>')
    expect(html).toContain('>Wszechświat lokalny</span>')
    expect(html).toContain('Liczba galaktyk')
    expect(html).toContain('aria-label="Liczba galaktyk"')
    expect(html).toContain('do 50 mln lś')
    expect(html).toContain('>Kopuły</span>')
    expect(html).not.toContain('Kopuły (Wszechświat lokalny)')
  })

  it('po włączeniu gwiazdozbiorów 3D pokazuje przełącznik „Nazwy gwiazd” w sekcji Droga Mleczna', () => {
    const settings = makeSettings({ showConstellations: true })
    const html = renderToString(createElement(LayersMenu, { threeD: true, settings, defaultOpen: true })).replace(/<!-- -->/g, '')
    expect(html).toContain('Nazwy gwiazd')
  })
})

describe('SpaceToolbar', () => {
  it('nie trzyma suwaka liczby galaktyk ani przełącznika „Gwiazdozbiory 3D” na pasku narzędzi', () => {
    const universeHtml = renderToString(
      createElement(SpaceToolbar, { o: null, settings: makeSettings({ scale: 'universe' }), onScale: vi.fn() }),
    )
    expect(universeHtml).not.toContain('space-galaxy-level')
    expect(universeHtml).not.toContain('aria-label="Liczba galaktyk"')

    const galaxyOffHtml = renderToString(
      createElement(SpaceToolbar, { o: null, settings: makeSettings({ scale: 'galaxy', showConstellations: false }), onScale: vi.fn() }),
    )
    expect(galaxyOffHtml).not.toContain('Gwiazdozbiory 3D')
    expect(galaxyOffHtml).not.toContain('Nazwy gwiazd')
    expect(galaxyOffHtml).not.toContain('space-filter-menu')
    expect(galaxyOffHtml).not.toContain('aria-label="Gwiazdozbiór w przestrzeni 3D"')
  })

  it('gdy gwiazdozbiory 3D są włączone w Drodze Mlecznej, zostawia na pasku wybór gwiazdozbioru i kamerę z Ziemi', () => {
    const galaxyOnHtml = renderToString(
      createElement(SpaceToolbar, { o: null, settings: makeSettings({ scale: 'galaxy', showConstellations: true }), onScale: vi.fn(), onConstellationView: vi.fn() }),
    )
    expect(galaxyOnHtml).toContain('aria-label="Gwiazdozbiór w przestrzeni 3D"')
    expect(galaxyOnHtml).toContain('aria-label="Pokaż gwiazdozbiór z Ziemi"')
    expect(galaxyOnHtml).not.toContain('Nazwy gwiazd')
  })
})
