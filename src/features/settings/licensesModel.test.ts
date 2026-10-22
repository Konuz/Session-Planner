import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { licenseGroups, readCatalogMeta, type LicenseEntry } from './licensesModel'

const META = readCatalogMeta(JSON.parse(readFileSync('public/catalog/meta.json', 'utf8')))

const entries = (meta: ReturnType<typeof readCatalogMeta>) => licenseGroups(meta).flatMap((group) => group.entries)
const entry = (list: LicenseEntry[], name: string) => list.find((item) => item.name === name)

describe('Źródła i licencje (sekcja 10)', () => {
  it('grupy w kolejności: dane, zdjęcia, oprogramowanie, kroje pisma', () => {
    expect(licenseGroups(META).map((group) => group.title)).toEqual(['Dane katalogu i mapy', 'Zdjęcia nieba', 'Oprogramowanie', 'Kroje pisma'])
  })

  it('OpenNGC: CC BY-SA 4.0 z wersją z meta.json', () => {
    const openNgc = entry(entries(META), 'OpenNGC')
    expect(openNgc?.license).toBe('CC BY-SA 4.0')
    expect(openNgc?.detail).toContain('4e2398a263de663d83f7b86be80c368c34335764')
    expect(openNgc?.url).toBe('https://github.com/mattiaverga/OpenNGC')
  })

  it('katalogi VizieR z meta.json: tytuł z autorem i rokiem, numer katalogu i odnośnik', () => {
    const vizier = entries(META).filter((item) => item.detail?.startsWith('Katalog VizieR '))
    expect(vizier.map((item) => item.name)).toEqual([
      'Catalogue of HII Regions (Sharpless 1959)',
      "Lynds' Catalogue of Dark Nebulae (LDN) (Lynds 1962)",
      "Lynds' Catalogue of Bright Nebulae (Lynds 1965)",
      'Catalogue of Reflection Nebulae (Van den Bergh, 1966)',
      "Barnard's Catalogue of 349 Dark Objects in the Sky (Barnard, 1927)",
      'A Catalogue of Galactic Supernova Remnants (Green, 2025)',
    ])
    expect(vizier[0]).toEqual({
      name: 'Catalogue of HII Regions (Sharpless 1959)',
      license: 'Dane VizieR (CDS); przy wykorzystaniu cytuj autorów katalogu',
      detail: 'Katalog VizieR VII/20',
      url: 'https://vizier.cds.unistra.fr/viz-bin/VizieR?-source=VII/20',
    })
    expect(vizier[4].url).toBe('https://vizier.cds.unistra.fr/viz-bin/VizieR?-source=VII/220A')
  })

  it('Tycho-2: cytowanie z meta.json; Stellarium GPL-2.0', () => {
    const tycho = entry(entries(META), 'Katalog gwiazd Tycho-2')
    expect(tycho?.license).toBe('Cytowanie: Høg i in. 2000 (ESA, CDS)')
    expect(entry(entries(META), 'Zarysy obiektów: Stellarium (outlines.dat)')?.license).toBe('GPL-2.0')
  })

  it('zdjęcia: CDS hips2fits, DSS (STScI/AURA), NASA SkyView, Finkbeiner (ODbL); astronomy-engine MIT; kroje OFL 1.1', () => {
    const list = entries(META)
    expect(entry(list, 'CDS hips2fits (Strasbourg)')?.detail).toBe('„This research made use of hips2fits, a service provided by CDS.”')
    expect(entry(list, 'Digitized Sky Survey (DSS, DSS2), także miniatury obiektów')?.license).toBe('© STScI/AURA')
    expect(entry(list, 'NASA SkyView')?.license).toBe('NASA/GSFC')
    expect(entry(list, 'Mapa Hα Finkbeinera (HiPS CDS/P/Finkbeiner)')?.license).toBe('ODbL')
    expect(entry(list, 'astronomy-engine')?.license).toBe('MIT')
    expect(entry(list, 'Atkinson Hyperlegible Next')).toMatchObject({ license: 'SIL Open Font License 1.1', licenseText: 'atkinson' })
    expect(entry(list, 'EB Garamond')).toMatchObject({ license: 'SIL Open Font License 1.1', licenseText: 'garamond' })
  })

  it('bez meta.json: wpisy stałe i jedna pozycja z informacją o katalogach VizieR', () => {
    const list = entries(null)
    expect(entry(list, 'OpenNGC')?.detail).not.toContain('Wersja')
    expect(list.filter((item) => item.detail?.startsWith('Katalog VizieR '))).toEqual([])
    expect(entry(list, 'Katalogi VizieR')?.detail).toBe('Listy katalogów nie udało się wczytać (catalog/meta.json).')
    expect(entry(list, 'Katalog gwiazd Tycho-2')?.license).toBe('Cytowanie: Høg i in. 2000 (ESA, CDS)')
  })

  it('readCatalogMeta odrzuca złe dane', () => {
    expect(readCatalogMeta(null)).toBeNull()
    expect(readCatalogMeta({ sources: 'x' })).toBeNull()
  })
})
