// Zakładka „Katalog” (7A): kontener, który wczytuje katalog, wysyła żądania do Workera i łączy panel, komunikaty i listę.
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { loadCatalog } from '../../data/featuredObjects'
import { bodyPosition } from '../../services/astroMath'
import { referenceNightDate } from '../../services/catalogFilters'
import { prepareCatalogNight, type CatalogNightParams, type ObjectNightSummary } from '../../services/catalogNight'
import { buildNightFrame } from '../../services/nightChart'
import { useActiveLocation, useActiveProfile, usePlannerStore } from '../../state/plannerStore'
import type { DsoObject } from '../../types'
import { createCatalogClient } from '../../workers/catalogClient'
import { buildCatalogRequest } from '../../workers/catalogMessages'
import { AltitudeSpark } from '../night/AltitudeSpark'
import { cachedTrack } from '../night/trackCache'
import { CatalogList } from './CatalogList'
import { CatalogMessages } from './CatalogMessages'
import { CatalogPanel } from './CatalogPanel'
import { ObjectThumbnail } from './ObjectThumbnail'
import {
  catalogView,
  requestKey,
  requestsToSend,
  type CatalogLoad,
  type CatalogTabState,
  type NightResponse,
} from './catalogTabModel'

type Night = 'tonight' | 'reference'

/** Ostatnia odpowiedź Workera każdej nocy z kluczem żądania, na które odpowiada. */
type Answers = Partial<Record<Night, { key: string; response: NightResponse }>>

const NO_OBJECTS: readonly DsoObject[] = []

/** Katalog z `loadCatalog`; `retry` ponawia pobranie po błędzie. */
function useCatalog(): { catalog: CatalogLoad; retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [catalog, setCatalog] = useState<CatalogLoad>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadCatalog().then(
      (objects) => {
        if (active) setCatalog({ status: 'ready', objects })
      },
      (error: unknown) => {
        if (active) setCatalog({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      },
    )
    return () => {
      active = false
    }
  }, [attempt])

  const retry = () => {
    setCatalog({ status: 'loading' })
    setAttempt((value) => value + 1)
  }
  return { catalog, retry }
}

/**
 * Odpowiedzi Workerów o noc D i o noc odniesienia „Polecane na miesiąc”. Każda noc ma własny Worker, bo klient
 * przyjmuje tylko odpowiedź na swoje ostatnie żądanie. Żądania wysyła `requestsToSend` po każdej zmianie stanu.
 */
function useNightAnswers(objects: readonly DsoObject[] | null, state: CatalogTabState): Answers {
  const [answers, setAnswers] = useState<Answers>({})
  const session = useRef<{ send: Record<Night, (params: CatalogNightParams) => void>; previous: CatalogTabState | null }>(null)

  useEffect(() => {
    if (!objects) return
    const workers: Worker[] = []
    const open = (night: Night) => {
      const worker = new Worker(new URL('../../workers/catalog.worker.ts', import.meta.url), { type: 'module' })
      workers.push(worker)
      const keys = new Map<number, string>()
      const client = createCatalogClient((response) => {
        if (response.type === 'ready') return
        const key = keys.get(response.requestId)
        if (key !== undefined) setAnswers((current) => ({ ...current, [night]: { key, response } }))
      }, worker)
      client.sendCatalog(objects)
      return (params: CatalogNightParams) => {
        keys.set(client.request(params), requestKey(params))
      }
    }
    session.current = { send: { tonight: open('tonight'), reference: open('reference') }, previous: null }
    return () => {
      session.current = null
      for (const worker of workers) worker.terminate()
    }
  }, [objects])

  const { location, nightDate, settings, profile, filters, sort } = state
  useEffect(() => {
    const current = session.current
    if (!current) return
    const next = { location, nightDate, settings, profile, filters, sort }
    for (const params of requestsToSend(current.previous, next)) {
      current.send[params.nightDate === nightDate ? 'tonight' : 'reference'](params)
    }
    current.previous = next
  }, [objects, location, nightDate, settings, profile, filters, sort])

  return answers
}

/** Bok miniatury obiektu w karcie [px]. */
const THUMBNAIL_PX = 112

/** Lista z kontekstem kart: noc D, aktywny zestaw i kursor czasu; karty z miniaturą i mini-wykresem wysokości. */
function NightList({ objects, results }: { objects: readonly DsoObject[]; results: readonly ObjectNightSummary[] | null }) {
  const location = useActiveLocation()
  const profile = useActiveProfile()
  const nightDate = usePlannerStore((state) => state.nightDate)
  const settings = usePlannerStore((state) => state.planningSettings)
  const cursorMs = usePlannerStore((state) => state.cursorMs)
  const night = useMemo(
    () => prepareCatalogNight(buildCatalogRequest({ location, nightDate, settings })),
    [location, nightDate, settings],
  )
  const context = useMemo(
    () => ({
      site: night.site,
      timeZone: location.timezone,
      precession: night.precession,
      profile,
      cursorMs,
      moonAtCursor: bodyPosition('moon', night.site, cursorMs),
    }),
    [night, location.timezone, profile, cursorMs],
  )
  // Model nocy jak na wykresie nocy (7C): z niego mini-wykresy, a tory obiektów są zapamiętane na noc (trackCache).
  const frame = useMemo(() => buildNightFrame(location, location.timezone, nightDate, settings), [location, nightDate, settings])
  const trackOptions = { horizon: location.horizon, minAltitudeDeg: settings.minAltitudeDeg, mount: profile.mount }
  return (
    <>
      <CatalogList
        objects={objects}
        results={results}
        context={context}
        profile={profile}
        moonRules={settings.moonRules}
        renderImage={(object) => <ObjectThumbnail key={object.uid} object={object} sizePx={THUMBNAIL_PX} layer="dss2-red" />}
        renderAltitude={(object) => (
          <AltitudeSpark
            frame={frame}
            track={cachedTrack(frame, object, trackOptions)}
            minAltitudeDeg={settings.minAltitudeDeg}
            cursorMs={cursorMs}
          />
        )}
      />
      <p className="text-xs text-muted">Zdjęcia: DSS2 czerwony przez CDS hips2fits (Strasbourg), DSS © STScI/AURA.</p>
    </>
  )
}

export function CatalogTab() {
  const location = useActiveLocation()
  const profile = useActiveProfile()
  const nightDate = usePlannerStore((state) => state.nightDate)
  const settings = usePlannerStore((state) => state.planningSettings)
  const filters = usePlannerStore((state) => state.catalogFilters)
  const sort = usePlannerStore((state) => state.catalogSort)
  const setFilters = usePlannerStore((state) => state.setCatalogFilters)
  const setSort = usePlannerStore((state) => state.setCatalogSort)
  const { catalog, retry } = useCatalog()
  const objects = catalog.status === 'ready' ? catalog.objects : null
  const answers = useNightAnswers(objects, { location, nightDate, settings, profile, filters, sort })
  // Poniżej 1024 px panel stoi nad listą, więc jest domyślnie zwinięty, żeby lista była widoczna od razu.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersId = useId()

  const keyOf = (night: string) => requestKey(buildCatalogRequest({ location, nightDate: night, settings }))
  const tonight = answers.tonight?.key === keyOf(nightDate) ? answers.tonight.response : null
  const reference = answers.reference?.key === keyOf(referenceNightDate(nightDate)) ? answers.reference.response : null
  const view = useMemo(
    () => catalogView({ catalog, filters, sort, nightDate, settings, profile, tonight, reference }),
    [catalog, filters, sort, nightDate, settings, profile, tonight, reference],
  )

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="lg:w-80 lg:shrink-0">
        <button
          type="button"
          className="button w-full justify-between lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls={filtersId}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden size={18} />
            Filtry i sortowanie
          </span>
          <ChevronDown aria-hidden size={18} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
        </button>
        <div id={filtersId} className={filtersOpen ? 'max-lg:mt-2' : 'max-lg:hidden'}>
          <CatalogPanel
            catalog={objects ?? NO_OBJECTS}
            filters={filters}
            sort={sort}
            onFiltersChange={setFilters}
            onSortChange={setSort}
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <CatalogMessages view={view} onRetry={retry} />
        {objects && <NightList objects={view.objects} results={view.results} />}
      </div>
    </div>
  )
}
