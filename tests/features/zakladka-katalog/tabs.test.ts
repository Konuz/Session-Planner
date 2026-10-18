// P1: zakładki Katalog, Noc, Ustawienia; nowy użytkownik zaczyna na Katalogu, zapamiętana zakładka zostaje („Pytania”).
// App wyświetla zakładkę Katalog („Styk z resztą”). Filtry i sortowanie nie są zapamiętywane między sesjami („Pytania”).
// Każde „uruchomienie aplikacji” to świeży moduł stanu nad tym samym localStorage (atrapa w pamięci).
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_LOCATION_ID } from '../../../src/data/locations'
import { MemoryStorage, elementsOf, filtersWith, parseMarkup, textOf, visibleText } from './helpers'

/** Klucz zapisu preferencji interfejsu w localStorage. */
const STORAGE_KEY = 'astrophotography-planner-ui'

/** Zapis dotychczasowego użytkownika, tak jak zapisuje go aplikacja przed tą funkcją (wersja 1). */
function savedBefore(tab: 'night' | 'settings'): MemoryStorage {
  const state = { activeLocationId: DEFAULT_LOCATION_ID, activeProfileId: 'demo-moj-zestaw', redMode: false, tab, objectUid: null }
  return new MemoryStorage({ [STORAGE_KEY]: JSON.stringify({ state, version: 1 }) })
}

/** Uruchomienie aplikacji z danym localStorage: świeże moduły stanu, nawigacji i aplikacji. */
async function startApp(storage: MemoryStorage) {
  vi.stubGlobal('localStorage', storage)
  vi.resetModules()
  const { usePlannerStore } = await import('../../../src/state/plannerStore')
  const { NavBar } = await import('../../../src/app/NavBar')
  const { default: App } = await import('../../../src/App')
  const { DEFAULT_CATALOG_FILTERS } = await import('../../../src/services/catalogFilters')
  /** Znaczniki elementu dla bieżącego stanu (renderToStaticMarkup czyta stan Zustand z getInitialState()). */
  const render = (element: ReactElement) => {
    Object.assign(usePlannerStore.getInitialState(), usePlannerStore.getState())
    return renderToStaticMarkup(element)
  }
  return { usePlannerStore, render, navBar: () => createElement(NavBar), app: () => createElement(App), DEFAULT_CATALOG_FILTERS }
}

/** Etykiety przycisków nawigacji w kolejności i etykieta przycisku bieżącej zakładki (aria-current="page"). */
function navigation(markup: string): { labels: string[]; current: string[] } {
  const buttons = elementsOf(parseMarkup(markup)).filter((element) => element.tag === 'button')
  return {
    labels: buttons.map(textOf),
    current: buttons.filter((button) => button.attrs['aria-current'] === 'page').map(textOf),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('nawigacja', () => {
  it('P1: nawigacja ma zakładki w kolejności Katalog, Noc, Ustawienia', async () => {
    const app = await startApp(new MemoryStorage())
    expect(navigation(app.render(app.navBar())).labels).toEqual(['Katalog', 'Noc', 'Ustawienia'])
  })
})

describe('zakładka na starcie', () => {
  it('P1: nowy użytkownik (nic nie zapisano) zaczyna na zakładce Katalog', async () => {
    const app = await startApp(new MemoryStorage())
    expect(app.usePlannerStore.getState().tab).toBe('catalog')
    expect(navigation(app.render(app.navBar())).current).toEqual(['Katalog'])
  })

  it('P1: zapamiętana wcześniej zakładka Noc zostaje', async () => {
    const app = await startApp(savedBefore('night'))
    expect(app.usePlannerStore.getState().tab).toBe('night')
    expect(navigation(app.render(app.navBar())).current).toEqual(['Noc'])
  })

  it('P1: zapamiętana wcześniej zakładka Ustawienia zostaje', async () => {
    const app = await startApp(savedBefore('settings'))
    expect(app.usePlannerStore.getState().tab).toBe('settings')
    expect(navigation(app.render(app.navBar())).current).toEqual(['Ustawienia'])
  })

  it('P1: wybrana zakładka Katalog zostaje zapamiętana po ponownym uruchomieniu', async () => {
    const storage = savedBefore('night')
    const first = await startApp(storage)
    first.usePlannerStore.getState().setTab('catalog')
    const second = await startApp(storage)
    expect(second.usePlannerStore.getState().tab).toBe('catalog')
  })
})

describe('App wyświetla zakładkę Katalog', () => {
  it('P1: zakładka Katalog w aplikacji → „Wczytywanie katalogu…”, bez zakładki Noc i bez Ustawień', async () => {
    const app = await startApp(new MemoryStorage())
    app.usePlannerStore.setState({ locationsReady: true })
    app.usePlannerStore.getState().setTab('catalog')
    const text = visibleText(app.render(app.app()))
    expect(text).toContain('Wczytywanie katalogu…')
    // Teksty, które zawsze pokazują zakładka Noc („Podsumowanie nocy”) i zakładka Ustawienia (opis lokalizacji).
    expect(text).not.toContain('Podsumowanie nocy')
    expect(text).not.toContain('Wybrana lokalizacja jest aktywna w całej aplikacji')
  })
})

describe('filtry i sortowanie bez zapisu między sesjami', () => {
  it('Pytania: filtry i sortowanie nie są zapamiętywane po zamknięciu aplikacji, a zakładka tak', async () => {
    const storage = new MemoryStorage()
    const first = await startApp(storage)
    const changed = filtersWith({ types: ['dark_nebula'], constellation: 'Cep', visibleTonight: true })
    first.usePlannerStore.getState().setCatalogFilters(changed)
    first.usePlannerStore.getState().setCatalogSort('size')
    first.usePlannerStore.getState().setTab('night')
    expect(first.usePlannerStore.getState().catalogFilters).toEqual(changed)
    expect(first.usePlannerStore.getState().catalogSort).toBe('size')

    const saved = storage.getItem(STORAGE_KEY) ?? ''
    expect(saved).not.toContain('dark_nebula')
    expect(saved).not.toContain('Cep')

    const second = await startApp(storage)
    expect(second.usePlannerStore.getState().tab).toBe('night')
    expect(second.usePlannerStore.getState().catalogFilters).toEqual(second.DEFAULT_CATALOG_FILTERS)
    expect(second.usePlannerStore.getState().catalogSort).toBe('effectiveTime')
  })
})
