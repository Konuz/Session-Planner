// Testy funkcji „zrodla-zdjec” (spec: .autoloop/features/zrodla-zdjec/spec.md).
// Nazwy wybrał test-author (spec ich nie podaje) – opis w src/services/skyImage/sources.ts.
// Domyślnie jak w spec: M 42 (RA 83,8221°, Dec −5,3911°), warstwa DSS2 kolor, wycinek kwadratowy 1000 px.
// Rozmiar kadru podaje się jako `MosaicSize` (szerokość × wysokość [°]); przekątna = √(w² + h²).
import { describe, expect, it } from 'vitest'
import type { EquatorialDeg } from '../../../src/services/astroMath'
import {
  CUTOUT_SIZE_PX,
  cutoutFovDeg,
  effectiveLayer,
  layersForFov,
  needsNewCutout,
  planCutout,
  skyImageCacheKey,
  skyImageSources,
  skyImageUrl,
  stsciCoveredFovDeg,
  stsciScaleArcsecPerPx,
  type SkyImageLayerId,
  type SkyImageRequest,
  type SkyImageSourceId,
} from '../../../src/services/skyImage/sources'

const M42: EquatorialDeg = { raDeg: 83.8221, decDeg: -5.3911 }
const ALL_SOURCES: SkyImageSourceId[] = ['alaskybis', 'alasky', 'skyview', 'stsci']
const ALL_LAYERS: SkyImageLayerId[] = ['dss2-color', 'dss2-red', 'halpha']

function request(overrides: Partial<SkyImageRequest> = {}): SkyImageRequest {
  return { center: M42, fovDeg: 1, sizePx: CUTOUT_SIZE_PX, layerId: 'dss2-color', ...overrides }
}

/** Wycinek z P1: pole 1°, 800 px. */
const P1 = request({ fovDeg: 1, sizePx: 800 })

const P1_ALASKYBIS =
  'https://alaskybis.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FDSS2%2Fcolor&width=800&height=800&fov=1&ra=83.8221&dec=-5.3911&projection=TAN&format=jpg'
const P1_ALASKY =
  'https://alasky.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FDSS2%2Fcolor&width=800&height=800&fov=1&ra=83.8221&dec=-5.3911&projection=TAN&format=jpg'
const P1_SKYVIEW =
  'https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=dss2r&Position=83.8221,-5.3911&Size=1&Pixels=800&Return=JPG'
const P1_STSCI =
  'https://archive.stsci.edu/cgi-bin/dss_search?format=GIF&r=83.8221&d=-5.3911&e=J2000&w=60&h=60&v=1'

/** Wartość parametru `name` z adresu (tekst między `name=` a `&` albo końcem). */
function param(url: string, name: string): string | undefined {
  const match = new RegExp(`[?&]${name}=([^&]*)`).exec(url)
  return match?.[1]
}

function commas(text: string): number {
  return text.split(',').length - 1
}

describe('źródła i adresy (P1–P5)', () => {
  it('test_p1_alaskybis: dokładny adres hips2fits na alaskybis dla pola 1° i 800 px', () => {
    expect(skyImageUrl('alaskybis', P1)).toBe(P1_ALASKYBIS)
  })

  it('test_p1_alasky: ten sam adres z hostem alasky.cds.unistra.fr', () => {
    expect(skyImageUrl('alasky', P1)).toBe(P1_ALASKY)
  })

  it('test_p1_skyview: dokładny adres SkyView', () => {
    expect(skyImageUrl('skyview', P1)).toBe(P1_SKYVIEW)
  })

  it('test_p1_stsci: dokładny adres STScI (pole 1° → w=60&h=60)', () => {
    expect(skyImageUrl('stsci', P1)).toBe(P1_STSCI)
  })

  it('test_p1_rozmiar: rozmiar wycinka trafia do width/height i Pixels (1000 px zamiast 800)', () => {
    const url = skyImageUrl('alaskybis', request({ fovDeg: 1, sizePx: 1000 }))
    expect(param(url, 'width')).toBe('1000')
    expect(param(url, 'height')).toBe('1000')
    expect(param(skyImageUrl('skyview', request({ fovDeg: 1, sizePx: 1000 })), 'Pixels')).toBe('1000')
  })

  it('test_p2: lista czterech źródeł w stałej kolejności z nazwami i zapisem offline', () => {
    expect(skyImageSources()).toEqual([
      { id: 'alaskybis', name: 'CDS hips2fits (alaskybis)', offline: true },
      { id: 'alasky', name: 'CDS hips2fits (alasky)', offline: true },
      { id: 'skyview', name: 'NASA SkyView', offline: false },
      { id: 'stsci', name: 'STScI DSS', offline: true },
    ])
  })

  it('test_p3: kropka dziesiętna, najwyżej 4 miejsca, bez zbędnych zer (RA 10,68470833, Dec 41,269167, pole 3,75)', () => {
    const req = request({ center: { raDeg: 10.68470833, decDeg: 41.269167 }, fovDeg: 3.75 })
    const hips = skyImageUrl('alaskybis', req)
    expect(param(hips, 'ra')).toBe('10.6847')
    expect(param(hips, 'dec')).toBe('41.2692')
    expect(param(hips, 'fov')).toBe('3.75')
    const skyview = skyImageUrl('skyview', req)
    expect(param(skyview, 'Position')).toBe('10.6847,41.2692')
    expect(param(skyview, 'Size')).toBe('3.75')
    const stsci = skyImageUrl('stsci', req)
    expect(param(stsci, 'r')).toBe('10.6847')
    expect(param(stsci, 'd')).toBe('41.2692')
  })

  it('test_p3_przecinek: jedyny przecinek to separator RA i Dec w Position= SkyView', () => {
    const req = request({ center: { raDeg: 10.68470833, decDeg: 41.269167 }, fovDeg: 3.75 })
    expect(commas(skyImageUrl('alaskybis', req))).toBe(0)
    expect(commas(skyImageUrl('alasky', req))).toBe(0)
    expect(commas(skyImageUrl('stsci', req))).toBe(0)
    expect(commas(skyImageUrl('skyview', req))).toBe(1)
    expect(commas(skyImageCacheKey('alaskybis', req) ?? '')).toBe(0)
    expect(commas(skyImageCacheKey('stsci', req) ?? '')).toBe(0)
  })

  it('test_p3_zera: pole 2 daje „2”, a nie „2.00” ani „2.0000”', () => {
    const req = request({ fovDeg: 2 })
    expect(param(skyImageUrl('alaskybis', req), 'fov')).toBe('2')
    expect(param(skyImageUrl('skyview', req), 'Size')).toBe('2')
    expect(skyImageCacheKey('alaskybis', req)).toBe('/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fcolor/83.8221/-5.3911/2/1000')
  })

  it('test_p4: Dec −0,00001 daje „0”, nigdy „-0” (adresy i klucze)', () => {
    const req = request({ center: { raDeg: 83.8221, decDeg: -0.00001 } })
    expect(param(skyImageUrl('alaskybis', req), 'dec')).toBe('0')
    expect(param(skyImageUrl('skyview', req), 'Position')).toBe('83.8221,0')
    expect(param(skyImageUrl('stsci', req), 'd')).toBe('0')
    expect(skyImageCacheKey('alaskybis', req)).toBe('/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fcolor/83.8221/0/1/1000')
    expect(skyImageCacheKey('stsci', req)).toBe('/sky-image-cache/stsci/dss/83.8221/0/1/0')
  })

  it('test_p5: RA −10 → 350, RA 360 → 0, RA 359,99999 → 0 (adresy i klucze)', () => {
    const at = (raDeg: number): SkyImageRequest => request({ center: { raDeg, decDeg: -5.3911 } })
    expect(param(skyImageUrl('alaskybis', at(-10)), 'ra')).toBe('350')
    expect(param(skyImageUrl('alaskybis', at(360)), 'ra')).toBe('0')
    expect(param(skyImageUrl('alaskybis', at(359.99999)), 'ra')).toBe('0')
    expect(param(skyImageUrl('skyview', at(-10)), 'Position')).toBe('350,-5.3911')
    expect(param(skyImageUrl('skyview', at(359.99999)), 'Position')).toBe('0,-5.3911')
    expect(param(skyImageUrl('stsci', at(360)), 'r')).toBe('0')
    expect(param(skyImageUrl('stsci', at(-10)), 'r')).toBe('350')
    expect(skyImageCacheKey('alasky', at(-10))).toBe('/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fcolor/350/-5.3911/1/1000')
    expect(skyImageCacheKey('stsci', at(359.99999))).toBe('/sky-image-cache/stsci/dss/0/-5.3911/1/0')
  })
})

describe('warstwy (P6–P8)', () => {
  it('test_p6: DSS2 czerwony → CDS%2FP%2FDSS2%2Fred, Hα → CDS%2FP%2FFinkbeiner (pole 5°)', () => {
    const red = request({ fovDeg: 5, layerId: 'dss2-red' })
    const halpha = request({ fovDeg: 5, layerId: 'halpha' })
    expect(skyImageUrl('alaskybis', red)).toBe(
      'https://alaskybis.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FDSS2%2Fred&width=1000&height=1000&fov=5&ra=83.8221&dec=-5.3911&projection=TAN&format=jpg',
    )
    expect(skyImageUrl('alasky', halpha)).toBe(
      'https://alasky.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FFinkbeiner&width=1000&height=1000&fov=5&ra=83.8221&dec=-5.3911&projection=TAN&format=jpg',
    )
  })

  it('test_p6_skyview_stsci: adresy SkyView i STScI są takie same dla każdej warstwy', () => {
    for (const fovDeg of [1, 5]) {
      const urls = (source: SkyImageSourceId): string[] =>
        ALL_LAYERS.map((layerId) => skyImageUrl(source, request({ fovDeg, sizePx: 800, layerId })))
      expect(new Set(urls('skyview')).size).toBe(1)
      expect(new Set(urls('stsci')).size).toBe(1)
    }
    expect(skyImageUrl('skyview', request({ fovDeg: 1, sizePx: 800, layerId: 'halpha' }))).toBe(P1_SKYVIEW)
    expect(skyImageUrl('stsci', request({ fovDeg: 1, sizePx: 800, layerId: 'dss2-red' }))).toBe(P1_STSCI)
  })

  it('test_p6_warstwa_zmienia_adres_i_klucz: inna warstwa hips2fits daje inny adres i inny klucz', () => {
    const urls = ALL_LAYERS.map((layerId) => skyImageUrl('alaskybis', request({ fovDeg: 5, layerId })))
    const keys = ALL_LAYERS.map((layerId) => skyImageCacheKey('alaskybis', request({ fovDeg: 5, layerId })))
    expect(new Set(urls).size).toBe(3)
    expect(new Set(keys).size).toBe(3)
    expect(keys[1]).toBe('/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fred/83.8221/-5.3911/5/1000')
    expect(keys[2]).toBe('/sky-image-cache/hips2fits/CDS%2FP%2FFinkbeiner/83.8221/-5.3911/5/1000')
  })

  it('test_p7: pole 5° → trzy warstwy w kolejności kolor, czerwony, Hα', () => {
    expect(layersForFov(5)).toEqual([
      { id: 'dss2-color', name: 'DSS2 kolor' },
      { id: 'dss2-red', name: 'DSS2 czerwony' },
      { id: 'halpha', name: 'Hα (Finkbeiner)' },
    ])
  })

  it('test_p7_prog: pole 3° → te same trzy warstwy (próg włącznie)', () => {
    expect(layersForFov(3).map((layer) => layer.name)).toEqual(['DSS2 kolor', 'DSS2 czerwony', 'Hα (Finkbeiner)'])
  })

  it('test_p7_ponizej: pole 2,5° → tylko DSS2 kolor i DSS2 czerwony', () => {
    expect(layersForFov(2.5)).toEqual([
      { id: 'dss2-color', name: 'DSS2 kolor' },
      { id: 'dss2-red', name: 'DSS2 czerwony' },
    ])
  })

  it('test_p7_tuz_ponizej_progu: pole 2,99° (reguła „Hα od 3°”) → bez Hα', () => {
    expect(layersForFov(2.99).map((layer) => layer.id)).toEqual(['dss2-color', 'dss2-red'])
  })

  it('test_p8: wybrane Hα przy polu 2,5° → adres i klucz z CDS%2FP%2FDSS2%2Fcolor', () => {
    const req = request({ fovDeg: 2.5, layerId: 'halpha' })
    expect(skyImageUrl('alaskybis', req)).toBe(
      'https://alaskybis.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FDSS2%2Fcolor&width=1000&height=1000&fov=2.5&ra=83.8221&dec=-5.3911&projection=TAN&format=jpg',
    )
    expect(skyImageCacheKey('alaskybis', req)).toBe('/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fcolor/83.8221/-5.3911/2.5/1000')
    expect(skyImageCacheKey('alasky', req)).toBe(skyImageCacheKey('alaskybis', request({ fovDeg: 2.5 })))
  })

  it('test_p8_effective_layer: Hα przy 2,5° → DSS2 kolor; przy 3° zostaje Hα; inne warstwy bez zmian', () => {
    expect(effectiveLayer('halpha', 2.5)).toBe('dss2-color')
    expect(effectiveLayer('halpha', 3)).toBe('halpha')
    expect(effectiveLayer('halpha', 5)).toBe('halpha')
    expect(effectiveLayer('dss2-red', 2.5)).toBe('dss2-red')
    expect(effectiveLayer('dss2-color', 2.5)).toBe('dss2-color')
  })

  it('test_p8_czerwony: wybrany DSS2 czerwony przy polu 2,5° zostaje czerwony', () => {
    expect(param(skyImageUrl('alaskybis', request({ fovDeg: 2.5, layerId: 'dss2-red' })), 'hips')).toBe('CDS%2FP%2FDSS2%2Fred')
  })
})

describe('pole wycinka: 2 × przekątna, do 0,01°, najwyżej 60° (P9–P11)', () => {
  it('test_p9: kadr 2,0° × 1,5° (przekątna 2,5°) → pole 5°', () => {
    expect(cutoutFovDeg({ widthDeg: 2, heightDeg: 1.5 })).toBeCloseTo(5, 9)
  })

  it('test_p10: kadr 2,5° × 2,0° (przekątna 3,2016°) → pole 6,4° (zaokrąglone do 0,01°)', () => {
    expect(cutoutFovDeg({ widthDeg: 2.5, heightDeg: 2 })).toBeCloseTo(6.4, 9)
  })

  it('test_p11: mozaika 40° × 30° (przekątna 50°) → pole ograniczone do 60°', () => {
    expect(cutoutFovDeg({ widthDeg: 40, heightDeg: 30 })).toBe(60)
  })

  it('test_p11_ponizej_limitu: 21° × 21° (2 × 29,698° = 59,397°) → 59,4°, bez przycięcia', () => {
    expect(cutoutFovDeg({ widthDeg: 21, heightDeg: 21 })).toBeCloseTo(59.4, 9)
  })

  it('test_p9_zaokraglenie: 1° × 1° (2 × 1,41421° = 2,82843°) → 2,83°; kolejność boków bez znaczenia', () => {
    expect(cutoutFovDeg({ widthDeg: 1, heightDeg: 1 })).toBeCloseTo(2.83, 9)
    expect(cutoutFovDeg({ widthDeg: 1.5, heightDeg: 2 })).toBeCloseTo(5, 9)
  })

  it('test_p9_plan: wycinek do pobrania ma środek kadru zaokrąglony jak w adresie, pole z P9 i 1000 px', () => {
    const plan = planCutout({ raDeg: 83.82210001, decDeg: -5.39114 }, { widthDeg: 2, heightDeg: 1.5 }, 'dss2-color')
    expect(plan.center.raDeg).toBeCloseTo(83.8221, 9)
    expect(plan.center.decDeg).toBeCloseTo(-5.3911, 9)
    expect(plan.fovDeg).toBeCloseTo(5, 9)
    expect(plan.sizePx).toBe(1000)
    expect(plan.layerId).toBe('dss2-color')
    expect(skyImageUrl('alaskybis', plan)).toBe(
      'https://alaskybis.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FDSS2%2Fcolor&width=1000&height=1000&fov=5&ra=83.8221&dec=-5.3911&projection=TAN&format=jpg',
    )
  })

  it('test_p5_plan: środek wycinka z RA −10° ma RA 350° (sprowadzone jak w adresie)', () => {
    const plan = planCutout({ raDeg: -10, decDeg: 20 }, { widthDeg: 2.5, heightDeg: 2 }, 'dss2-red')
    expect(plan.center.raDeg).toBeCloseTo(350, 9)
    expect(plan.center.decDeg).toBeCloseTo(20, 9)
    expect(plan.fovDeg).toBeCloseTo(6.4, 9)
    expect(plan.sizePx).toBe(CUTOUT_SIZE_PX)
  })
})

describe('STScI (P12, P13)', () => {
  it('test_p12: pole 5° → w=60&h=60, obraz pokrywa naprawdę 1°', () => {
    expect(skyImageUrl('stsci', request({ fovDeg: 5 }))).toBe(P1_STSCI)
    expect(stsciCoveredFovDeg(5)).toBe(1)
  })

  it('test_p12_pol_stopnia: pole 0,5° → w=30&h=30, obraz pokrywa 0,5°', () => {
    expect(skyImageUrl('stsci', request({ fovDeg: 0.5 }))).toBe(
      'https://archive.stsci.edu/cgi-bin/dss_search?format=GIF&r=83.8221&d=-5.3911&e=J2000&w=30&h=30&v=1',
    )
    expect(stsciCoveredFovDeg(0.5)).toBe(0.5)
  })

  it('test_p12_granica: pole 1° pokrywa 1°, pole 60° też tylko 1°', () => {
    expect(stsciCoveredFovDeg(1)).toBe(1)
    expect(stsciCoveredFovDeg(60)).toBe(1)
    expect(param(skyImageUrl('stsci', request({ fovDeg: 60 })), 'w')).toBe('60')
  })

  it('test_p13: 60′ przy szerokości 1000 px → 3,6″/px', () => {
    expect(stsciScaleArcsecPerPx(5, 1000)).toBeCloseTo(3.6, 9)
  })

  it('test_p13_pol_stopnia: 30′ przy szerokości 500 px → 3,6″/px', () => {
    expect(stsciScaleArcsecPerPx(0.5, 500)).toBeCloseTo(3.6, 9)
  })

  it('test_p13_inna_szerokosc: 60′ przy 1200 px → 3″/px (skala zależy od naturalnej szerokości)', () => {
    expect(stsciScaleArcsecPerPx(1, 1200)).toBeCloseTo(3, 9)
  })
})

describe('klucz pamięci podręcznej (P14–P17)', () => {
  it('test_p14: klucz hips2fits z P1, taki sam dla alaskybis i alasky', () => {
    const key = '/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fcolor/83.8221/-5.3911/1/800'
    expect(skyImageCacheKey('alaskybis', P1)).toBe(key)
    expect(skyImageCacheKey('alasky', P1)).toBe(key)
  })

  it('test_p15: klucz STScI dla pola 5° i dla pola 1° (pole po przycięciu, rozmiar 0)', () => {
    const key = '/sky-image-cache/stsci/dss/83.8221/-5.3911/1/0'
    expect(skyImageCacheKey('stsci', request({ fovDeg: 5 }))).toBe(key)
    expect(skyImageCacheKey('stsci', request({ fovDeg: 1 }))).toBe(key)
    expect(skyImageCacheKey('stsci', P1)).toBe(key)
  })

  it('test_p15_pol_stopnia: klucz STScI dla pola 0,5° ma pole 0,5', () => {
    expect(skyImageCacheKey('stsci', request({ fovDeg: 0.5 }))).toBe('/sky-image-cache/stsci/dss/83.8221/-5.3911/0.5/0')
  })

  it('test_p16: SkyView nie ma klucza (null)', () => {
    expect(skyImageCacheKey('skyview', P1)).toBeNull()
    expect(skyImageCacheKey('skyview', request({ fovDeg: 5 }))).toBeNull()
  })

  it('test_p15_zrodlo_zmienia_klucz: hips2fits i STScI mają różne klucze dla tego samego wycinka', () => {
    expect(skyImageCacheKey('alaskybis', request({ fovDeg: 1 }))).not.toBe(skyImageCacheKey('stsci', request({ fovDeg: 1 })))
  })

  it('test_p17: RA 83,82210001 i RA 83,8221 dają ten sam klucz i ten sam adres', () => {
    const near = request({ center: { raDeg: 83.82210001, decDeg: -5.3911 }, fovDeg: 1, sizePx: 800 })
    for (const source of ALL_SOURCES) {
      expect(skyImageUrl(source, near)).toBe(skyImageUrl(source, P1))
      expect(skyImageCacheKey(source, near)).toBe(skyImageCacheKey(source, P1))
    }
    expect(skyImageUrl('alaskybis', near)).toBe(P1_ALASKYBIS)
    expect(skyImageCacheKey('alaskybis', near)).toBe('/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fcolor/83.8221/-5.3911/1/800')
  })
})

describe('czy trzeba pobrać nowy wycinek (P18–P23)', () => {
  const FRAME_2x15 = { widthDeg: 2, heightDeg: 1.5 }
  const CUTOUT_P18 = { center: { raDeg: 83.8221, decDeg: 0 }, fovDeg: 5 }

  it('test_p18_1_24: przesunięcie 1,24° (< ¼ z 5°) → nie trzeba', () => {
    expect(needsNewCutout(CUTOUT_P18, { center: { raDeg: 83.8221, decDeg: 1.24 }, size: FRAME_2x15 })).toBe(false)
  })

  it('test_p18_1_25: przesunięcie dokładnie 1,25° (na granicy) → nie trzeba', () => {
    expect(needsNewCutout(CUTOUT_P18, { center: { raDeg: 83.8221, decDeg: 1.25 }, size: FRAME_2x15 })).toBe(false)
  })

  it('test_p18_1_26: przesunięcie 1,26° → trzeba', () => {
    expect(needsNewCutout(CUTOUT_P18, { center: { raDeg: 83.8221, decDeg: 1.26 }, size: FRAME_2x15 })).toBe(true)
  })

  it('test_p18_bez_przesuniecia: ten sam środek i to samo pole → nie trzeba', () => {
    expect(needsNewCutout(CUTOUT_P18, { center: { raDeg: 83.8221, decDeg: 0 }, size: FRAME_2x15 })).toBe(false)
  })

  it('test_p18_ujemna_dec: przesunięcie w dół o 1,26° → trzeba, o 1,24° → nie trzeba', () => {
    expect(needsNewCutout(CUTOUT_P18, { center: { raDeg: 83.8221, decDeg: -1.26 }, size: FRAME_2x15 })).toBe(true)
    expect(needsNewCutout(CUTOUT_P18, { center: { raDeg: 83.8221, decDeg: -1.24 }, size: FRAME_2x15 })).toBe(false)
  })

  it('test_p19: wycinek RA 359,5°: kadr przy RA 0,5° (1°) → nie trzeba, przy RA 1,0° (1,5°) → trzeba', () => {
    const cutout = { center: { raDeg: 359.5, decDeg: 0 }, fovDeg: 5 }
    expect(needsNewCutout(cutout, { center: { raDeg: 0.5, decDeg: 0 }, size: FRAME_2x15 })).toBe(false)
    expect(needsNewCutout(cutout, { center: { raDeg: 1.0, decDeg: 0 }, size: FRAME_2x15 })).toBe(true)
  })

  it('test_p20: wycinek RA 0°, Dec 89,5°; kadr RA 180°, Dec 89,5° (odległość 1°) → nie trzeba', () => {
    const cutout = { center: { raDeg: 0, decDeg: 89.5 }, fovDeg: 5 }
    expect(needsNewCutout(cutout, { center: { raDeg: 180, decDeg: 89.5 }, size: FRAME_2x15 })).toBe(false)
  })

  it('test_p20_dalej: kadr RA 180°, Dec 88° (odległość po sferze 2,5°) → trzeba', () => {
    const cutout = { center: { raDeg: 0, decDeg: 89.5 }, fovDeg: 5 }
    expect(needsNewCutout(cutout, { center: { raDeg: 180, decDeg: 88 }, size: FRAME_2x15 })).toBe(true)
  })

  it('test_p21: kadr powiększony do 2,5° × 2,0° (pole 6,4° > 5°) → trzeba, nawet bez przesunięcia', () => {
    expect(needsNewCutout(CUTOUT_P18, { center: { raDeg: 83.8221, decDeg: 0 }, size: { widthDeg: 2.5, heightDeg: 2 } })).toBe(true)
  })

  it('test_p22: kadr 1,0° × 0,75° (pole 2,5°, równo połowa) → nie trzeba', () => {
    expect(needsNewCutout(CUTOUT_P18, { center: { raDeg: 83.8221, decDeg: 0 }, size: { widthDeg: 1, heightDeg: 0.75 } })).toBe(false)
  })

  it('test_p22_mniej_niz_polowa: kadr 0,8° × 0,6° (pole 2,0°) → trzeba', () => {
    expect(needsNewCutout(CUTOUT_P18, { center: { raDeg: 83.8221, decDeg: 0 }, size: { widthDeg: 0.8, heightDeg: 0.6 } })).toBe(true)
  })

  it('test_p23: wycinek STScI z P12 (planowane 5°, pokryte 1°) i nieprzesunięty kadr 2,0° × 1,5° → nie trzeba', () => {
    const cutout = { center: { raDeg: 83.8221, decDeg: -5.3911 }, fovDeg: 5 }
    expect(stsciCoveredFovDeg(cutout.fovDeg)).toBe(1)
    expect(needsNewCutout(cutout, { center: { raDeg: 83.8221, decDeg: -5.3911 }, size: FRAME_2x15 })).toBe(false)
  })

  it('test_p23_limit_60: wycinek przycięty do 60° i mozaika 40° × 30° (planowane 60° po przycięciu) → nie trzeba', () => {
    const cutout = { center: { raDeg: 83.8221, decDeg: -5.3911 }, fovDeg: 60 }
    expect(needsNewCutout(cutout, { center: { raDeg: 83.8221, decDeg: -5.3911 }, size: { widthDeg: 40, heightDeg: 30 } })).toBe(false)
  })
})
