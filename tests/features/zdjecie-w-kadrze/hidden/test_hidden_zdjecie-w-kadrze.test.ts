// Testy ukryte funkcji „zdjecie-w-kadrze”: te same zachowania co w testach widocznych, inne wartości.
import { describe, expect, it } from 'vitest'
import {
  attemptLines,
  createPhotoLayer,
  layerChoices,
  licenseLines,
  loadOptions,
  photoCaption,
  photoRect,
} from '../../../../src/features/framing/photoModel'
import { planCutout, type SkyImageLayerId } from '../../../../src/services/skyImage/sources'
import {
  FakeLoader,
  M31_CENTER,
  OUTLINES_LICENSE,
  SIZE_5,
  expectRect,
  frameAt,
  image,
  m42Request,
  missing,
  shown,
} from '../helpers'

describe('Podpisy (inne źródła i warstwy)', () => {
  it('alaskybis w DSS2 czerwony → „Zdjęcie: CDS hips2fits (alaskybis), DSS2 czerwony”', () => {
    expect(photoCaption(shown('alaskybis', m42Request('dss2-red')))).toBe('Zdjęcie: CDS hips2fits (alaskybis), DSS2 czerwony')
  })

  it('alaskybis w DSS2 czerwony z pamięci → dopisek „, z pamięci”', () => {
    expect(photoCaption(shown('alaskybis', m42Request('dss2-red'), { fromCache: true }))).toBe(
      'Zdjęcie: CDS hips2fits (alaskybis), DSS2 czerwony, z pamięci',
    )
  })

  it('wycinek Hα przy polu 2,5° pobrany z alasky → podpis z warstwą naprawdę użytą, DSS2 kolor (zrodla-zdjec P8)', () => {
    const request = planCutout(M31_CENTER, { widthDeg: 1, heightDeg: 0.75 }, 'halpha')
    expect(photoCaption(shown('alasky', request))).toBe('Zdjęcie: CDS hips2fits (alasky), DSS2 kolor')
  })

  it('STScI z pamięci przy M 31 (wycinek DSS2 czerwony) → „Zdjęcie: STScI DSS, z pamięci”', () => {
    const request = planCutout(M31_CENTER, SIZE_5, 'dss2-red')
    expect(photoCaption(shown('stsci', request, { fromCache: true }))).toBe('Zdjęcie: STScI DSS, z pamięci')
  })
})

describe('Lista prób (inna kolejność i powody)', () => {
  it('linie w kolejności prób', () => {
    expect(
      attemptLines([
        { sourceId: 'stsci', reason: 'błąd 404' },
        { sourceId: 'alaskybis', reason: 'błąd 200' },
        { sourceId: 'alasky', reason: 'błąd sieci' },
        { sourceId: 'skyview', reason: 'limit czasu' },
      ]),
    ).toEqual([
      'STScI DSS: błąd 404',
      'CDS hips2fits (alaskybis): błąd 200',
      'CDS hips2fits (alasky): błąd sieci',
      'NASA SkyView: limit czasu',
    ])
  })

  it('stan warstwy po porażce z dwiema próbami', async () => {
    const loader = new FakeLoader()
    const layer = createPhotoLayer(loader)
    layer.setFrame(frameAt(M31_CENTER), false)
    await loader.finish(
      missing([
        { sourceId: 'alasky', reason: 'błąd 502' },
        { sourceId: 'alaskybis', reason: 'limit czasu' },
      ]),
    )
    expect(layer.view().missing).toEqual({
      message: 'Brak zdjęcia — pokazuję zarysy obiektów',
      attempts: ['CDS hips2fits (alasky): błąd 502', 'CDS hips2fits (alaskybis): limit czasu'],
    })
  })
})

describe('Licencje (inne źródła)', () => {
  it('alaskybis w Hα → mapa Finkbeinera; alaskybis w DSS2 czerwony → dane DSS', () => {
    const halpha = licenseLines(shown('alaskybis', m42Request('halpha')))
    expect(halpha).toHaveLength(2)
    expect(halpha).toEqual(
      expect.arrayContaining([OUTLINES_LICENSE, 'Licencja: zdjęcie — CDS Strasbourg (hips2fits), mapa Hα: Finkbeiner (ODbL)']),
    )
    const red = licenseLines(shown('alaskybis', m42Request('dss2-red')))
    expect(red).toEqual(expect.arrayContaining([OUTLINES_LICENSE, 'Licencja: zdjęcie — CDS Strasbourg (hips2fits), dane DSS © STScI/AURA']))
    expect(red.join('\n')).not.toMatch(/Finkbeiner|ODbL/)
  })

  it('STScI w warstwie Hα → licencja STScI, bez Finkbeinera', () => {
    const lines = licenseLines(shown('stsci', m42Request('halpha')))
    expect(lines).toEqual(expect.arrayContaining([OUTLINES_LICENSE, 'Licencja: zdjęcie — Digitized Sky Survey © STScI/AURA']))
    expect(lines.join('\n')).not.toMatch(/Finkbeiner|ODbL/)
  })
})

describe('Listy wyboru i tryb (inne wartości)', () => {
  it('warstwy na granicy 3° (zrodla-zdjec): 3° z Hα, 2,99° bez; 60° z Hα', () => {
    expect(layerChoices(3).map((choice) => choice.label)).toEqual(['DSS2 kolor', 'DSS2 czerwony', 'Hα (Finkbeiner)'])
    expect(layerChoices(2.99).map((choice) => choice.label)).toEqual(['DSS2 kolor', 'DSS2 czerwony'])
    expect(layerChoices(60).map((choice) => choice.label)).toEqual(['DSS2 kolor', 'DSS2 czerwony', 'Hα (Finkbeiner)'])
  })

  it('tryb: ręczne SkyView i alasky dla każdej warstwy', () => {
    const mode = (source: Parameters<typeof loadOptions>[0], layerId: SkyImageLayerId) => loadOptions(source, layerId).sourceId ?? null
    for (const layerId of ['dss2-color', 'dss2-red', 'halpha'] as const) {
      expect(mode('skyview', layerId)).toBe('skyview')
      expect(mode('alasky', layerId)).toBe('alasky')
      expect(mode('alaskybis', layerId)).toBe('alaskybis')
    }
  })

  it('wybór „NASA SkyView” → jedno wywołanie w trybie ręcznym z SkyView', async () => {
    const loader = new FakeLoader()
    const layer = createPhotoLayer(loader)
    layer.setFrame(frameAt(M31_CENTER), false)
    await loader.finish(image('stsci'))
    layer.chooseSource('skyview')
    expect(loader.calls).toHaveLength(2)
    expect(loader.lastCall.sourceId).toBe('skyview')
    expect(loader.lastCall.request).toEqual(planCutout(M31_CENTER, SIZE_5, 'dss2-color'))
  })

  it('zmiana warstwy na Hα przy M 31 → jedno wywołanie, alaskybis, warstwa Hα', async () => {
    const loader = new FakeLoader()
    const layer = createPhotoLayer(loader)
    layer.setFrame(frameAt(M31_CENTER), false)
    await loader.finish(image('alasky'))
    layer.chooseLayer('halpha')
    expect(loader.calls).toHaveLength(2)
    expect(loader.lastCall.sourceId).toBe('alaskybis')
    expect(loader.lastCall.request).toEqual(planCutout(M31_CENTER, SIZE_5, 'halpha'))
  })
})

describe('Nowy wycinek przy innym polu (próg ¼ pola, zrodla-zdjec P18)', () => {
  it('kadr 4° × 3° → pole 10°: Dec 2,5° bez wywołania, 2,51° jedno wywołanie; w trakcie przeciągania nic', async () => {
    const size = { widthDeg: 4, heightDeg: 3 }
    const at = (decDeg: number) => frameAt({ raDeg: 120, decDeg }, size)
    const loader = new FakeLoader()
    const layer = createPhotoLayer(loader)
    layer.setFrame(at(10), false)
    expect(loader.lastCall.request.fovDeg).toBe(10)
    await loader.finish(image('alasky'))
    layer.setFrame(at(12.5), false)
    expect(loader.calls).toHaveLength(1)
    layer.setFrame(at(14), true)
    expect(loader.calls).toHaveLength(1)
    layer.setFrame(at(12.51), false)
    expect(loader.calls).toHaveLength(2)
    expect(loader.lastCall.request).toEqual(planCutout({ raDeg: 120, decDeg: 12.51 }, size, 'dss2-color'))
  })
})

describe('Położenie zdjęcia (inne wartości, ±1)', () => {
  const base = { raDeg: 83.8221, decDeg: 0 }
  const request5 = planCutout(base, SIZE_5, 'dss2-color')

  it('STScI przy polu 2° (pokrywa 1°) → ok. 250–750', () => {
    const request = planCutout(base, { widthDeg: 0.8, heightDeg: 0.6 }, 'dss2-color')
    expect(request.fovDeg).toBe(2)
    expectRect(photoRect(shown('stsci', request), base, 2), [250, 750], [250, 750])
  })

  it('kadr przesunięty o 1° na wschód → zdjęcie w prawo: x ok. 200–1200', () => {
    expectRect(photoRect(shown('skyview', request5), { raDeg: 84.8221, decDeg: 0 }, 5), [199.9, 1199.9], [0, 1000])
  })

  it('kadr przesunięty na Dec 0,5° → y ok. 100–1100', () => {
    expectRect(photoRect(shown('alaskybis', request5), { raDeg: 83.8221, decDeg: 0.5 }, 5), [0, 1000], [99.9, 1099.9])
  })

  it('pole widoku 4° przy wycinku 5° → zdjęcie większe niż widok: x ok. −125–1125', () => {
    expectRect(photoRect(shown('alasky', request5), base, 4), [-125.1, 1125.1], [-125.1, 1125.1])
  })
})
