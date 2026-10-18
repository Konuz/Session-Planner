// Zakładka Noc wybiera obiekt z całego katalogu (P2–P7) i jest aktywna po otwarciu obiektu z katalogu (P1, P4).
// Hak `useFeaturedObjects` jest podmieniony: w Node (renderToStaticMarkup) efekty się nie wykonują, więc katalog
// „wczytuje się” przez atrapę haka w stanie „gotowe” – lista „Klasyki” w `objects` i cały katalog w polu `catalog`
// („Styk z resztą”: hak zachowuje nazwę i kształt wyniku, cały katalog dochodzi jako dodatkowe pole).
// Wybór z listy (P3): `onChange` pola wyboru wywołany przez sondę w trakcie renderu (bez DOM).
// Teksty z wcześniejszych funkcji zakładki Noc: legenda wykresu „<oznaczenie> widoczny” (obiekt na wykresie, a nie
// tylko w polu wyboru), nagłówek kursora „Kursor HH:MM CEST” i „Podsumowanie nocy” (parametry-planowania, wykres nocy);
// opcje listy jak dotąd: oznaczenie i pierwsza nazwa zwyczajowa w nawiasie (P2: „M 13 (Hercules Globular Cluster)”).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  KLASYKI,
  M13,
  M31,
  M42,
  M57,
  MemoryStorage,
  OCT_16,
  choose,
  elementsOf,
  isObjectSelect,
  nightName,
  objectSelect,
  parseMarkup,
  prepareCatalogTab,
  readyHook,
  savedPreferences,
  startApp,
  textOf,
  uids,
  visibleText,
  type FeaturedHookResult,
} from './helpers'

const hook = vi.hoisted(() => ({ result: null as FeaturedHookResult | null }))

vi.mock('../../../src/features/night/useFeaturedObjects', () => ({
  useFeaturedObjects: () => {
    if (!hook.result) throw new Error('Brak wyniku atrapy haka useFeaturedObjects')
    return hook.result
  },
}))

beforeEach(() => {
  hook.result = readyHook()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Aplikacja uruchomiona z localStorage `storage`, noc 16/17.10.2026. */
async function startOnNight(storage: MemoryStorage = new MemoryStorage()) {
  const app = await startApp(storage)
  app.store.getState().setNightDate(OCT_16)
  return app
}

/** Aplikacja na zakładce Noc z obiektem `uid` (wybranym jak dotąd przez `selectObject`). */
async function nightWith(uid: string) {
  const app = await startOnNight()
  app.store.getState().selectObject(uid)
  app.store.getState().setTab('night')
  return app
}

const KLASYKI_NAMES = KLASYKI.map(nightName)

describe('P2 obiekt spoza „Klasyki” w zakładce Noc', () => {
  it('P2: zakładka Noc z M 13 → lista ma 27 pozycji: M 13 na górze, potem 26 „Klasyki” w dotychczasowej kolejności', async () => {
    const app = await nightWith(M13.uid)
    const select = objectSelect(app.render(app.nightTab()))
    expect(select.values).toEqual(['NGC6205', ...uids(KLASYKI)])
    expect(select.labels).toEqual(['M 13 (Hercules Globular Cluster)', ...KLASYKI_NAMES])
  })

  it('P2: zaznaczony jest M 13 z nazwą „M 13 (Hercules Globular Cluster)”', async () => {
    const app = await nightWith(M13.uid)
    const markup = app.render(app.nightTab())
    expect(objectSelect(markup).selected).toEqual(['M 13 (Hercules Globular Cluster)'])
    expect(visibleText(markup)).toContain('M 13 (Hercules Globular Cluster)')
  })

  it('P2: wykres nocy jest dla M 13 (legenda „M 13 widoczny”), a nie dla M 31', async () => {
    const app = await nightWith(M13.uid)
    const text = visibleText(app.render(app.nightTab()))
    expect(text).toContain('M 13 widoczny')
    expect(text).not.toContain('M 31 widoczny')
  })

  it('P2: inny obiekt spoza „Klasyki” (M 57) → 27 pozycji, na górze i zaznaczony „M 57 (Ring Nebula)”', async () => {
    const app = await nightWith(M57.uid)
    const markup = app.render(app.nightTab())
    const select = objectSelect(markup)
    expect(select.values).toEqual(['NGC6720', ...uids(KLASYKI)])
    expect(select.selected).toEqual(['M 57 (Ring Nebula)'])
    expect(visibleText(markup)).toContain('M 57 widoczny')
  })
})

describe('P3 wybór innego obiektu z listy', () => {
  it('P3: z M 13 wybór M 42 z listy → objectUid NGC1976; lista ma znowu 26 pozycji „Klasyki”, zaznaczony M 42', async () => {
    const app = await nightWith(M13.uid)
    const { props } = app.capture(app.nightTab(), isObjectSelect)
    choose(props, M42.uid)
    expect(app.store.getState().objectUid).toBe('NGC1976')

    const markup = app.render(app.nightTab())
    const select = objectSelect(markup)
    expect(select.values).toEqual(uids(KLASYKI))
    expect(select.labels).toEqual(KLASYKI_NAMES)
    expect(select.selected).toEqual(['M 42 (Great Orion Nebula)'])
    expect(select.values).not.toContain(M13.uid)
    expect(visibleText(markup)).toContain('M 42 widoczny')
  })

  it('Pytania: z M 13 wybór M 57 (też spoza „Klasyki”) → M 57 na górze, M 13 znika, 27 pozycji', async () => {
    const app = await nightWith(M13.uid)
    choose(app.capture(app.nightTab(), isObjectSelect).props, M57.uid)
    const select = objectSelect(app.render(app.nightTab()))
    expect(select.values).toEqual([M57.uid, ...uids(KLASYKI)])
    expect(select.selected).toEqual(['M 57 (Ring Nebula)'])
  })
})

describe('P1, P4 zakładka Noc po otwarciu obiektu z katalogu', () => {
  /** Etykiety przycisków nawigacji oznaczonych jako bieżąca zakładka (aria-current="page"). */
  function currentTabs(markup: string): string[] {
    return elementsOf(parseMarkup(markup))
      .filter((element) => element.tag === 'button' && element.attrs['aria-current'] === 'page')
      .map((element) => textOf(element))
  }

  it('P1: M 13 z zakładki Katalog → aplikacja pokazuje zakładkę Noc z M 13 (27 pozycji, zaznaczony M 13), kursor 01:30 CEST', async () => {
    const app = await startOnNight()
    prepareCatalogTab(app.store)
    app.store.getState().openObject(M13.uid)

    const markup = app.render(app.app())
    expect(currentTabs(markup)).toEqual(['Noc'])
    const text = visibleText(markup)
    expect(text).toContain('Podsumowanie nocy')
    expect(text).toContain('Kursor 01:30 CEST')
    const select = objectSelect(markup)
    expect(select.values).toEqual([M13.uid, ...uids(KLASYKI)])
    expect(select.selected).toEqual(['M 13 (Hercules Globular Cluster)'])
  })

  it('P4: karta M 31 (jest w „Klasyki”) → zakładka Noc, lista ma 26 pozycji, zaznaczony M 31', async () => {
    const app = await startOnNight()
    prepareCatalogTab(app.store)
    app.store.getState().openObject(M31.uid)

    const markup = app.render(app.app())
    expect(currentTabs(markup)).toEqual(['Noc'])
    const select = objectSelect(markup)
    expect(select.values).toEqual(uids(KLASYKI))
    expect(select.selected).toEqual(['M 31 (Andromeda Galaxy)'])
  })
})

describe('P5, P6 zapamiętany obiekt', () => {
  it('P5: ponowne uruchomienie z zapamiętanym M 13 → zakładka Noc nadal pokazuje M 13 (27 pozycji, zaznaczony M 13)', async () => {
    const app = await startOnNight(savedPreferences(M13.uid, 'night'))
    expect(app.store.getState().tab).toBe('night')
    const markup = app.render(app.nightTab())
    const select = objectSelect(markup)
    expect(select.values).toEqual([M13.uid, ...uids(KLASYKI)])
    expect(select.selected).toEqual(['M 13 (Hercules Globular Cluster)'])
    expect(visibleText(markup)).toContain('M 13 widoczny')
  })

  it('P5: M 13 otwarty z katalogu, potem ponowne uruchomienie → zakładka Noc pokazuje M 13', async () => {
    const storage = new MemoryStorage()
    const first = await startOnNight(storage)
    prepareCatalogTab(first.store)
    first.store.getState().openObject(M13.uid)

    const second = await startOnNight(storage)
    expect(second.store.getState().tab).toBe('night')
    expect(objectSelect(second.render(second.nightTab())).selected).toEqual(['M 13 (Hercules Globular Cluster)'])
  })

  it('P6: zapamiętany obiekt spoza katalogu („NGC9999”) → zakładka Noc pokazuje M 31 (26 pozycji, zaznaczony M 31)', async () => {
    const app = await startOnNight(savedPreferences('NGC9999', 'night'))
    const markup = app.render(app.nightTab())
    const select = objectSelect(markup)
    expect(select.values).toEqual(uids(KLASYKI))
    expect(select.selected).toEqual(['M 31 (Andromeda Galaxy)'])
    expect(visibleText(markup)).toContain('M 31 widoczny')
  })
})

describe('P7 etykieta pola wyboru', () => {
  it('P7: etykieta pola wyboru obiektu brzmi „Obiekt”, a nie „Obiekt z listy „Klasyki””', async () => {
    const app = await nightWith(M31.uid)
    const markup = app.render(app.nightTab())
    expect(objectSelect(markup).label).toBe('Obiekt')
    expect(visibleText(markup)).not.toContain('Obiekt z listy')
  })

  it('P7: z obiektem spoza „Klasyki” (M 13) etykieta też brzmi „Obiekt”', async () => {
    const app = await nightWith(M13.uid)
    const markup = app.render(app.nightTab())
    expect(objectSelect(markup).label).toBe('Obiekt')
    expect(visibleText(markup)).not.toContain('Obiekt z listy')
  })
})
