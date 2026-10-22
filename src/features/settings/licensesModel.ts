// Ekran „Źródła i licencje” (sekcja 10): wpisy stałe i lista katalogów VizieR z public/catalog/meta.json.
import { isObject } from '../../services/projects'

export interface CatalogSource {
  id: string
  title: string | null
  version: string | null
  license: string
}

export interface CatalogMeta {
  sources: CatalogSource[]
  starsCitation: string | null
}

export interface LicenseEntry {
  name: string
  license: string
  detail: string | null
  url: string | null
  /** Pełny tekst licencji kroju w repozytorium (src/assets/fonts). */
  licenseText?: 'atkinson' | 'garamond'
}

export interface LicenseGroup {
  title: string
  entries: LicenseEntry[]
}

const isString = (value: unknown): value is string => typeof value === 'string'
const optionalString = (value: unknown) => (isString(value) ? value : null)

/** Potrzebne pola meta.json albo null przy złych danych. */
export function readCatalogMeta(raw: unknown): CatalogMeta | null {
  if (!isObject(raw) || !Array.isArray(raw.sources)) return null
  const sources = raw.sources.filter((source) => isObject(source) && isString(source.id)) as Record<string, unknown>[]
  return {
    sources: sources.map((source) => ({
      id: source.id as string,
      title: optionalString(source.title),
      version: optionalString(source.version),
      license: optionalString(source.license) ?? '',
    })),
    starsCitation: isObject(raw.stars) ? optionalString(raw.stars.citation) : null,
  }
}

const TYCHO_CITATION = 'Høg i in. 2000 (ESA, CDS)'
const VIZIER_SOURCE = 'https://vizier.cds.unistra.fr/viz-bin/VizieR?-source='

/** „VizieR VII/220A/barnard” → „VII/220A”. */
function vizierCatalog(id: string): string {
  return id.replace(/^VizieR\s+/, '').split('/').slice(0, 2).join('/')
}

function catalogEntries(meta: CatalogMeta | null): LicenseEntry[] {
  const openNgcVersion = meta?.sources.find((source) => source.id.startsWith('OpenNGC'))?.version ?? null
  const vizier = (meta?.sources ?? [])
    .filter((source) => source.id.startsWith('VizieR '))
    .map((source) => ({
      name: source.title ?? source.id,
      license: source.license,
      detail: `Katalog VizieR ${vizierCatalog(source.id)}`,
      url: `${VIZIER_SOURCE}${vizierCatalog(source.id)}`,
    }))
  return [
    {
      name: 'OpenNGC',
      license: 'CC BY-SA 4.0',
      detail: `Mattia Verga i współautorzy. Katalog aplikacji jako dane pochodne jest na tej samej licencji.${openNgcVersion ? ` Wersja: ${openNgcVersion}.` : ''}`,
      url: 'https://github.com/mattiaverga/OpenNGC',
    },
    ...(meta === null
      ? [{ name: 'Katalogi VizieR', license: 'Przy wykorzystaniu cytuj autorów katalogów', detail: 'Listy katalogów nie udało się wczytać (catalog/meta.json).', url: null }]
      : vizier),
    {
      name: 'Usługa VizieR (CDS, Strasbourg)',
      license: 'Warunki użycia CDS',
      detail: 'Ochsenbein F., Bauer P., Marcout J. 2000, A&AS 143, 23; DOI 10.26093/cds/vizier',
      url: 'https://vizier.cds.unistra.fr',
    },
    {
      name: 'Katalog gwiazd Tycho-2',
      license: `Cytowanie: ${meta?.starsCitation ?? TYCHO_CITATION}`,
      detail: 'Høg E. i in. 2000, A&A 355, L27; VizieR I/259. Gwiazdy do V ≤ 10 w tle mapy kadru.',
      url: `${VIZIER_SOURCE}I/259`,
    },
    {
      name: 'Zarysy obiektów: Stellarium (outlines.dat)',
      license: 'GPL-2.0',
      detail: 'Plik outlines.dat z programu Stellarium (commit 48e4f35).',
      url: 'https://github.com/Stellarium/stellarium',
    },
  ]
}

const IMAGE_ENTRIES: LicenseEntry[] = [
  {
    name: 'CDS hips2fits (Strasbourg)',
    license: 'Warunki użycia CDS',
    detail: '„This research made use of hips2fits, a service provided by CDS.”',
    url: 'https://alasky.cds.unistra.fr/hips-image-services/hips2fits',
  },
  {
    name: 'Digitized Sky Survey (DSS, DSS2), także miniatury obiektów',
    license: '© STScI/AURA',
    detail: '„The Digitized Sky Surveys were produced at the Space Telescope Science Institute under U.S. Government grant NAG W-2166.”',
    url: 'https://archive.stsci.edu/cgi-bin/dss_form',
  },
  {
    name: 'NASA SkyView',
    license: 'NASA/GSFC',
    detail: '„This research has made use of NASA’s SkyView facility (https://skyview.gsfc.nasa.gov) located at NASA Goddard Space Flight Center.”',
    url: 'https://skyview.gsfc.nasa.gov',
  },
  {
    name: 'Mapa Hα Finkbeinera (HiPS CDS/P/Finkbeiner)',
    license: 'ODbL',
    detail: 'Finkbeiner D. P. 2003, ApJS 146, 407.',
    url: null,
  },
]

const SOFTWARE_ENTRIES: LicenseEntry[] = [
  { name: 'astronomy-engine', license: 'MIT', detail: 'Donald Cross. Słońce, Księżyc, zmierzchy, precesja.', url: 'https://github.com/cosinekitty/astronomy' },
  { name: 'React', license: 'MIT', detail: null, url: 'https://react.dev' },
  { name: 'Zustand', license: 'MIT', detail: null, url: 'https://github.com/pmndrs/zustand' },
  { name: 'Dexie', license: 'Apache-2.0', detail: null, url: 'https://dexie.org' },
  { name: 'd3-scale', license: 'ISC', detail: null, url: 'https://github.com/d3/d3-scale' },
  { name: 'date-fns i date-fns-tz', license: 'MIT', detail: null, url: 'https://date-fns.org' },
  { name: 'Lucide (ikony)', license: 'ISC', detail: null, url: 'https://lucide.dev' },
  { name: 'TanStack Virtual', license: 'MIT', detail: null, url: 'https://tanstack.com/virtual' },
  { name: 'Workbox i vite-plugin-pwa (praca offline)', license: 'MIT', detail: null, url: 'https://vite-pwa-org.netlify.app' },
]

const FONT_ENTRIES: LicenseEntry[] = [
  {
    name: 'Atkinson Hyperlegible Next',
    license: 'SIL Open Font License 1.1',
    detail: 'Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors',
    url: 'https://github.com/googlefonts/atkinson-hyperlegible-next',
    licenseText: 'atkinson',
  },
  {
    name: 'EB Garamond',
    license: 'SIL Open Font License 1.1',
    detail: 'Copyright 2017 The EB Garamond Project Authors',
    url: 'https://github.com/octaviopardo/EBGaramond12',
    licenseText: 'garamond',
  },
]

export function licenseGroups(meta: CatalogMeta | null): LicenseGroup[] {
  return [
    { title: 'Dane katalogu i mapy', entries: catalogEntries(meta) },
    { title: 'Zdjęcia nieba', entries: IMAGE_ENTRIES },
    { title: 'Oprogramowanie', entries: SOFTWARE_ENTRIES },
    { title: 'Kroje pisma', entries: FONT_ENTRIES },
  ]
}
