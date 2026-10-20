// Ukryte przypadki „zrodla-zdjec”: te same reguły co w testach widocznych, inne wartości
// (M 31 i inne środki, inne pola i rozmiary, warstwa DSS2 czerwony, inne granice decyzji o nowym wycinku).
// Wartości policzone regułami spec: liczby do 4 miejsc bez zbędnych zer, RA w [0, 360), pole = 2 × przekątna
// do 0,01° (najwyżej 60°), STScI najwyżej 60′, granica przesunięcia ¼ pola, pole kadru od ½ do 1 pola wycinka.
import { describe, expect, it } from 'vitest'
import type { EquatorialDeg } from '../../../../src/services/astroMath'
import {
  cutoutFovDeg,
  layersForFov,
  needsNewCutout,
  planCutout,
  skyImageCacheKey,
  skyImageUrl,
  stsciCoveredFovDeg,
  stsciScaleArcsecPerPx,
  type SkyImageRequest,
} from '../../../../src/services/skyImage/sources'

const M31: EquatorialDeg = { raDeg: 10.68470833, decDeg: 41.269167 }

function request(overrides: Partial<SkyImageRequest> = {}): SkyImageRequest {
  return { center: M31, fovDeg: 2.47, sizePx: 600, layerId: 'dss2-red', ...overrides }
}

function param(url: string, name: string): string | undefined {
  return new RegExp(`[?&]${name}=([^&]*)`).exec(url)?.[1]
}

describe('ukryte: adresy i klucze dla innych wartości', () => {
  it('hips2fits: M 31, DSS2 czerwony, pole 2,47°, 600 px (alaskybis i alasky)', () => {
    expect(skyImageUrl('alaskybis', request())).toBe(
      'https://alaskybis.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FDSS2%2Fred&width=600&height=600&fov=2.47&ra=10.6847&dec=41.2692&projection=TAN&format=jpg',
    )
    expect(skyImageUrl('alasky', request())).toBe(
      'https://alasky.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FDSS2%2Fred&width=600&height=600&fov=2.47&ra=10.6847&dec=41.2692&projection=TAN&format=jpg',
    )
  })

  it('SkyView: M 31, pole 2,47°, 600 px (warstwa bez wpływu)', () => {
    const expected =
      'https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=dss2r&Position=10.6847,41.2692&Size=2.47&Pixels=600&Return=JPG'
    expect(skyImageUrl('skyview', request())).toBe(expected)
    expect(skyImageUrl('skyview', request({ layerId: 'dss2-color' }))).toBe(expected)
  })

  it('STScI: pole 0,75° → w=45&h=45, klucz z polem 0,75', () => {
    const req = request({ fovDeg: 0.75 })
    expect(skyImageUrl('stsci', req)).toBe(
      'https://archive.stsci.edu/cgi-bin/dss_search?format=GIF&r=10.6847&d=41.2692&e=J2000&w=45&h=45&v=1',
    )
    expect(skyImageCacheKey('stsci', req)).toBe('/sky-image-cache/stsci/dss/10.6847/41.2692/0.75/0')
  })

  it('STScI: pole 12° → w=60&h=60 i klucz z polem 1', () => {
    const req = request({ fovDeg: 12, center: { raDeg: 201.36506, decDeg: -43.01911 } })
    expect(param(skyImageUrl('stsci', req), 'w')).toBe('60')
    expect(param(skyImageUrl('stsci', req), 'h')).toBe('60')
    expect(skyImageCacheKey('stsci', req)).toBe('/sky-image-cache/stsci/dss/201.3651/-43.0191/1/0')
  })

  it('klucz hips2fits: Hα przy polu 8° i 1000 px, wspólny dla obu maszyn', () => {
    const req = request({ fovDeg: 8, sizePx: 1000, layerId: 'halpha', center: { raDeg: 201.36506, decDeg: -43.01911 } })
    const key = '/sky-image-cache/hips2fits/CDS%2FP%2FFinkbeiner/201.3651/-43.0191/8/1000'
    expect(skyImageCacheKey('alaskybis', req)).toBe(key)
    expect(skyImageCacheKey('alasky', req)).toBe(key)
    expect(skyImageCacheKey('skyview', req)).toBeNull()
  })

  it('Hα przy polu 2,99° → DSS2 kolor w adresie i kluczu', () => {
    const req = request({ fovDeg: 2.99, layerId: 'halpha' })
    expect(param(skyImageUrl('alasky', req), 'hips')).toBe('CDS%2FP%2FDSS2%2Fcolor')
    expect(skyImageCacheKey('alasky', req)).toBe('/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fcolor/10.6847/41.2692/2.99/600')
  })

  it('liczby: RA 370,5 → 10.5, RA −0,00001 → 0, Dec −45,00004 → -45, Dec 0,00004 → 0', () => {
    expect(param(skyImageUrl('alaskybis', request({ center: { raDeg: 370.5, decDeg: -45.00004 } })), 'ra')).toBe('10.5')
    expect(param(skyImageUrl('alaskybis', request({ center: { raDeg: 370.5, decDeg: -45.00004 } })), 'dec')).toBe('-45')
    expect(param(skyImageUrl('skyview', request({ center: { raDeg: -0.00001, decDeg: 0.00004 } })), 'Position')).toBe('0,0')
    expect(skyImageCacheKey('stsci', request({ center: { raDeg: -0.00001, decDeg: -0.00004 }, fovDeg: 0.3 }))).toBe(
      '/sky-image-cache/stsci/dss/0/0/0.3/0',
    )
  })

  it('pole 10 → „10”, pole 0,1234 → „0.1234”', () => {
    expect(param(skyImageUrl('alaskybis', request({ fovDeg: 10 })), 'fov')).toBe('10')
    expect(param(skyImageUrl('skyview', request({ fovDeg: 0.1234 })), 'Size')).toBe('0.1234')
  })
})

describe('ukryte: warstwy i pole wycinka', () => {
  it('warstwy dla pól 60° i 1°', () => {
    expect(layersForFov(60).map((layer) => layer.id)).toEqual(['dss2-color', 'dss2-red', 'halpha'])
    expect(layersForFov(1).map((layer) => layer.id)).toEqual(['dss2-color', 'dss2-red'])
  })

  it('pole wycinka: 1,23456° × 0° → 2,47°; 3° × 4° → 10°; 30° × 0° → 60°; 29,6° × 0° → 59,2°', () => {
    expect(cutoutFovDeg({ widthDeg: 1.23456, heightDeg: 0 })).toBeCloseTo(2.47, 9)
    expect(cutoutFovDeg({ widthDeg: 3, heightDeg: 4 })).toBeCloseTo(10, 9)
    expect(cutoutFovDeg({ widthDeg: 30, heightDeg: 0 })).toBeCloseTo(60, 9)
    expect(cutoutFovDeg({ widthDeg: 29.6, heightDeg: 0 })).toBeCloseTo(59.2, 9)
    expect(cutoutFovDeg({ widthDeg: 45, heightDeg: 45 })).toBe(60)
  })

  it('plan wycinka: M 31, kadr 1,6° × 1,2° → środek do 4 miejsc, pole 4°, 1000 px', () => {
    const plan = planCutout(M31, { widthDeg: 1.6, heightDeg: 1.2 }, 'dss2-red')
    expect(plan.center.raDeg).toBeCloseTo(10.6847, 9)
    expect(plan.center.decDeg).toBeCloseTo(41.2692, 9)
    expect(plan.fovDeg).toBeCloseTo(4, 9)
    expect(plan.sizePx).toBe(1000)
  })
})

describe('ukryte: STScI pokrycie i skala', () => {
  it('pokrycie: 2° → 1°, 0,25° → 0,25°', () => {
    expect(stsciCoveredFovDeg(2)).toBe(1)
    expect(stsciCoveredFovDeg(0.25)).toBe(0.25)
  })

  it('skala: 60′ przy 800 px → 4,5″/px; 15′ przy 300 px → 3″/px', () => {
    expect(stsciScaleArcsecPerPx(2, 800)).toBeCloseTo(4.5, 9)
    expect(stsciScaleArcsecPerPx(0.25, 300)).toBeCloseTo(3, 9)
  })
})

describe('ukryte: decyzja o nowym wycinku', () => {
  const FRAME_8 = { widthDeg: 2.4, heightDeg: 3.2 } // przekątna 4° → pole 8°

  it('wycinek 8° (granica 2°): przesunięcie 1,99° → nie trzeba, 2,01° → trzeba, równo 2° → nie trzeba', () => {
    const cutout = { center: { raDeg: 150, decDeg: 30 }, fovDeg: 8 }
    expect(needsNewCutout(cutout, { center: { raDeg: 150, decDeg: 31.99 }, size: FRAME_8 })).toBe(false)
    expect(needsNewCutout(cutout, { center: { raDeg: 150, decDeg: 32 }, size: FRAME_8 })).toBe(false)
    expect(needsNewCutout(cutout, { center: { raDeg: 150, decDeg: 32.01 }, size: FRAME_8 })).toBe(true)
  })

  it('przejście przez RA 0 przy Dec −10°: 1,0° różnicy RA (0,985°) → nie trzeba; 1,4° (1,379°) → trzeba', () => {
    const cutout = { center: { raDeg: 0.4, decDeg: -10 }, fovDeg: 5 }
    const frame = { widthDeg: 2, heightDeg: 1.5 }
    expect(needsNewCutout(cutout, { center: { raDeg: 359.4, decDeg: -10 }, size: frame })).toBe(false)
    expect(needsNewCutout(cutout, { center: { raDeg: 359.0, decDeg: -10 }, size: frame })).toBe(true)
  })

  it('biegun południowy: wycinek RA 90°, Dec −89°; kadr RA 270°: Dec −89,9° (1,1°) → nie, Dec −89,5° (1,5°) → trzeba', () => {
    const cutout = { center: { raDeg: 90, decDeg: -89 }, fovDeg: 5 }
    const frame = { widthDeg: 2, heightDeg: 1.5 }
    expect(needsNewCutout(cutout, { center: { raDeg: 270, decDeg: -89.9 }, size: frame })).toBe(false)
    expect(needsNewCutout(cutout, { center: { raDeg: 270, decDeg: -89.5 }, size: frame })).toBe(true)
  })

  it('wycinek 8°: kadr 1,6° × 1,2° (pole 4°, równo połowa) → nie; 1,5° × 1,2° (3,84°) → trzeba; 3° × 3° (8,49°) → trzeba', () => {
    const cutout = { center: { raDeg: 150, decDeg: 30 }, fovDeg: 8 }
    const at = { raDeg: 150, decDeg: 30 }
    expect(needsNewCutout(cutout, { center: at, size: { widthDeg: 1.6, heightDeg: 1.2 } })).toBe(false)
    expect(needsNewCutout(cutout, { center: at, size: { widthDeg: 1.5, heightDeg: 1.2 } })).toBe(true)
    expect(needsNewCutout(cutout, { center: at, size: { widthDeg: 3, heightDeg: 3 } })).toBe(true)
    expect(needsNewCutout(cutout, { center: at, size: FRAME_8 })).toBe(false)
  })

  it('wycinek przycięty do 60°: mozaika 50° × 50° (pole 60° po przycięciu) → nie trzeba', () => {
    const cutout = { center: { raDeg: 150, decDeg: 30 }, fovDeg: 60 }
    expect(needsNewCutout(cutout, { center: { raDeg: 150, decDeg: 30 }, size: { widthDeg: 50, heightDeg: 50 } })).toBe(false)
  })
})
