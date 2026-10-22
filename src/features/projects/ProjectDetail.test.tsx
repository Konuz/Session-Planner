import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PROFILE_ID, DEMO_LOCATION, DEMO_PROFILES } from '../../data/demo'
import { HOME_LOCATION } from '../../data/locations'
import { M31 } from '../../test/fixtures'
import type { Project } from '../../types'
import { NINA_IMPORT_NOTE, ProjectDetail, type ProjectDetailProps } from './ProjectDetail'

const PROJECT: Project = {
  id: 'projekt-1',
  name: 'M 31',
  objectUid: 'NGC224',
  equipmentId: DEFAULT_PROFILE_ID,
  framing: { centerRaDeg: M31.raDeg, centerDecDeg: M31.decDeg, paDeg: 30, mosaic: { cols: 1, rows: 1, overlapPct: 20 } },
  log: [
    { nightDate: '2026-10-16', filter: 'Ha', subs: 30, exposureS: 300 },
    { nightDate: '2026-10-17', filter: 'Ha', subs: 13, exposureS: 300 },
  ],
  goalMinutes: { Ha: 300 },
  notes: 'Korektor 1,0×',
  createdAtIso: '2026-10-16T18:00:00.000Z',
}

const noop = async () => {}

function render(changes: Partial<ProjectDetailProps> = {}): string {
  return renderToStaticMarkup(
    <ProjectDetail
      project={PROJECT}
      object={null}
      profiles={DEMO_PROFILES}
      location={DEMO_LOCATION}
      nightDate="2026-10-22"
      framingFromTab={null}
      onUpdate={noop}
      onRemove={noop}
      onOpenInFraming={() => {}}
      onTakeFraming={() => {}}
      {...changes}
    />,
  )
}

/** Znaczniki przycisku z danym tekstem (pierwszy pasujący). */
function button(markup: string, text: string): string {
  const match = [...markup.matchAll(/<button[^>]*>.*?<\/button>/g)].find((item) => item[0].includes(text))
  if (!match) throw new Error(`brak przycisku „${text}”`)
  return match[0]
}

describe('szczegóły projektu (7E)', () => {
  it('współrzędne HMS/DMS i dziesiętne, PA i mozaika', () => {
    const markup = render()
    for (const text of ['00h 42m 44,30s', '+41° 16′ 09,0″', '10,6846°', '+41,2692°', '30,0°', 'pojedynczy kadr (1×1)']) {
      expect(markup).toContain(text)
    }
  })

  it('suma, postęp celu Ha jako pasek z wartością i tekstem procentów', () => {
    const markup = render()
    expect(markup).toContain('3:35') // 43 × 300 s
    expect(markup).toMatch(/role="progressbar" aria-label="Postęp Ha" aria-valuemin="0" aria-valuemax="100" aria-valuenow="72"/)
    expect(markup).toContain('72%')
  })

  it('dziennik: wiersze nocy i przyciski usuwania z opisem', () => {
    const markup = render()
    expect(markup).toContain('16/17.10.2026')
    expect(markup).toContain('aria-label="Usuń wpis: noc 17/18.10.2026, Ha, 13 klatek"')
    expect(markup).toContain('value="2026-10-22"') // domyślna noc nowego wpisu = noc D
  })

  it('eksport: uwaga o czyszczeniu listy celów N.I.N.A., CSV aktywny', () => {
    const markup = render()
    expect(markup).toContain(NINA_IMPORT_NOTE)
    expect(NINA_IMPORT_NOTE).toContain('czyści bieżącą listę celów prostego sekwencera')
    expect(button(markup, 'CSV dla N.I.N.A.')).not.toContain('disabled')
  })

  it('mozaika bez zestawu: komunikat, CSV nieaktywny, wybór zestawu z pozycją „Usunięty zestaw”', () => {
    const markup = render({ project: { ...PROJECT, equipmentId: 'usuniety', framing: { ...PROJECT.framing, mosaic: { cols: 2, rows: 1, overlapPct: 20 } } } })
    expect(markup).toContain('Zestaw projektu nie istnieje; wybierz zestaw, żeby wyeksportować mozaikę.')
    expect(button(markup, 'CSV dla N.I.N.A.')).toContain('disabled')
    expect(markup).toContain('Usunięty zestaw — wybierz inny')
  })

  it('horyzont: płaski → przycisk nieaktywny z wyjaśnieniem; własny → aktywny', () => {
    const flat = render({ location: { ...HOME_LOCATION, horizon: [] } })
    expect(button(flat, 'Horyzont dla N.I.N.A.')).toContain('disabled')
    expect(flat).toContain('ma płaski horyzont')
    expect(button(render(), 'Horyzont dla N.I.N.A.')).not.toContain('disabled')
  })

  it('„Weź kadr z zakładki Kadr” tylko z kadrem tego obiektu', () => {
    expect(button(render(), 'Weź kadr z zakładki Kadr')).toContain('disabled')
    const markup = render({ framingFromTab: 'W zakładce Kadr: PA 45,0°' })
    expect(button(markup, 'Weź kadr z zakładki Kadr')).not.toContain('disabled')
    expect(markup).toContain('W zakładce Kadr: PA 45,0°')
  })
})
