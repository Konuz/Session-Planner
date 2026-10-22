import { useVirtualizer } from '@tanstack/react-virtual'
import { CalendarCheck, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ObjectDetails } from '../components/ObjectDetails'
import { Thumb } from '../components/Thumb'
import { CATALOGS, displayName, matchesFilter, searchScore, TYPE_INFO, EMPTY_FILTER, type DSO, type ObjectType } from '../lib/catalog'
import { CONSTELLATION_PL } from '../lib/constellations'
import { fmtDuration, fmtNum, fmtSize, fmtTime } from '../lib/format'
import { useCatalog, useCatalogVisibility } from '../state/data'
import { useStore } from '../state/store'

const TYPES: ObjectType[] = ['G', 'EN', 'RN', 'DN', 'PN', 'SNR', 'OC', 'GC', 'CN', 'GG']
const SORTS = [
  { id: 'best', label: 'Najlepsze tej nocy' },
  { id: 'hours', label: 'Najdłużej widoczne' },
  { id: 'alt', label: 'Najwyżej' },
  { id: 'mag', label: 'Najjaśniejsze' },
  { id: 'size', label: 'Największe' },
  { id: 'name', label: 'Oznaczenie' },
] as const

const designationKey = (id: string) => id.replace(/\d+/g, (d) => d.padStart(6, '0'))

export default function CatalogView() {
  const { catalog, error } = useCatalog()
  const vis = useCatalogVisibility()
  const filter = useStore((s) => s.filter)
  const setFilter = useStore((s) => s.setFilter)
  const sortBy = useStore((s) => s.sortBy)
  const setSort = useStore((s) => s.setSort)
  const onlyVisible = useStore((s) => s.onlyVisible)
  const toggle = useStore((s) => s.toggle)
  const minAlt = useStore((s) => s.minAltDeg)
  const setMinAlt = useStore((s) => s.setMinAlt)
  const select = useStore((s) => s.select)
  const selectedIndex = useStore((s) => s.selectedIndex)
  const plan = useStore((s) => s.plan)
  const tz = useStore((s) => s.location.timeZone)
  const [details, setDetails] = useState(false)
  const [query, setQuery] = useState(filter.query)

  useEffect(() => {
    const id = setTimeout(() => setFilter({ query }), 180)
    return () => clearTimeout(id)
  }, [query, setFilter])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    if (catalog) for (const o of catalog) for (const k of o.catalogs) c[k] = (c[k] ?? 0) + 1
    return c
  }, [catalog])

  const list = useMemo(() => {
    if (!catalog) return []
    const out: DSO[] = []
    for (const o of catalog) {
      if (!matchesFilter(o, filter)) continue
      if (onlyVisible && vis && vis.hours[o.i] < 1) continue
      out.push(o)
    }
    const h = vis?.hours
    const a = vis?.maxAlt
    const score = (o: DSO) => {
      // „Najlepsze”: godziny powyżej limitu, premia za jasność i rozmiar (łatwiejsze cele wyżej).
      const hours = h ? h[o.i] : 0
      const bright = o.mag !== null ? Math.max(0, 14 - o.mag) / 14 : o.type === 'DN' ? 0.15 : 0.3
      const size = Math.min(1, Math.log10(1 + o.majArcmin) / 2)
      return hours * (0.6 + bright * 0.8 + size * 0.6)
    }
    if (filter.query) return out.sort((x, y) => searchScore(x, filter.query) - searchScore(y, filter.query))
    switch (sortBy) {
      case 'best': return out.sort((x, y) => score(y) - score(x))
      case 'hours': return h ? out.sort((x, y) => h[y.i] - h[x.i]) : out
      case 'alt': return a ? out.sort((x, y) => a[y.i] - a[x.i]) : out
      case 'mag': return out.sort((x, y) => (x.mag ?? 99) - (y.mag ?? 99))
      case 'size': return out.sort((x, y) => y.majArcmin - x.majArcmin)
      case 'name': return out.sort((x, y) => designationKey(x.id).localeCompare(designationKey(y.id)))
    }
  }, [catalog, filter, sortBy, onlyVisible, vis])

  const scrollRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1000)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const cols = Math.max(1, Math.floor((width + 14) / (196 + 14)))
  const cardW = (width - 14 * (cols - 1)) / cols
  const rowH = cardW + 118
  const rows = Math.ceil(list.length / cols)
  const virt = useVirtualizer({ count: rows, getScrollElement: () => scrollRef.current, estimateSize: () => rowH, overscan: 2 })
  useEffect(() => {
    virt.measure()
  }, [rowH, virt])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [filter, sortBy, onlyVisible])

  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const constellations = useMemo(() => Object.entries(CONSTELLATION_PL).sort((a, b) => a[1].localeCompare(b[1], 'pl')), [])

  return (
    <div className="catalog-layout">
      <aside className="card catalog-filters">
        <h2 className="panel-title"><SlidersHorizontal size={18} /> Filtry <span className="spacer" />
          <button className="button ghost small" onClick={() => { setFilter(EMPTY_FILTER); setQuery('') }} title="Wyczyść filtry"><RotateCcw size={13} /></button>
        </h2>
        <div className="filter-group search-box">
          <Search size={15} />
          <input className="control" style={{ width: '100%' }} placeholder="Oznaczenie lub nazwa…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Szukaj w katalogu" />
        </div>
        <div className="filter-group">
          <span className="label">Katalog</span>
          <div className="chips">
            {CATALOGS.map((c) => (
              <button key={c.id} title={c.title} className={`toggle-chip${filter.catalogs.includes(c.id) ? ' on' : ''}`} onClick={() => setFilter({ catalogs: toggleIn(filter.catalogs, c.id) })}>
                {c.label} <span className="faint">{counts[c.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="label">Rodzaj obiektu</span>
          <div className="chips">
            {TYPES.map((t) => (
              <button key={t} className={`toggle-chip${filter.types.includes(t) ? ' on' : ''}`} onClick={() => setFilter({ types: toggleIn(filter.types, t) })}>
                <span className="dot" style={{ background: TYPE_INFO[t].color }} /> {TYPE_INFO[t].short}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="label">Gwiazdozbiór</span>
          <select className="control" style={{ width: '100%' }} value={filter.constellation} onChange={(e) => setFilter({ constellation: e.target.value })}>
            <option value="">Wszystkie</option>
            {constellations.map(([abbr, name]) => <option key={abbr} value={abbr}>{name}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="label">Jasność do {filter.maxMag === null ? 'dowolnej' : `${filter.maxMag} mag`}</span>
          <input type="range" min={4} max={16} step={0.5} value={filter.maxMag ?? 16} onChange={(e) => setFilter({ maxMag: Number(e.target.value) >= 16 ? null : Number(e.target.value) })} style={{ width: '100%' }} />
        </div>
        <div className="filter-group">
          <span className="label">Rozmiar od {filter.minSizeArcmin}′</span>
          <input type="range" min={0} max={120} step={1} value={filter.minSizeArcmin} onChange={(e) => setFilter({ minSizeArcmin: Number(e.target.value) })} style={{ width: '100%' }} />
        </div>
        <div className="filter-group">
          <span className="label">Limit wysokości {minAlt}°</span>
          <input type="range" min={0} max={60} step={5} value={minAlt} onChange={(e) => setMinAlt(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <label className={`switch${onlyVisible ? ' on' : ''}`} onClick={() => toggle('onlyVisible')}>
          <span className="track" /> <span>Widoczne tej nocy ≥ 1 h</span>
        </label>
      </aside>

      <section>
        <div className="catalog-head">
          <div className="kicker">Baza obiektów</div>
          <b className="mono" style={{ fontSize: 15 }}>{catalog ? list.length.toLocaleString('pl-PL') : '…'}</b>
          <span className="dim" style={{ fontSize: 13 }}>z {catalog?.length.toLocaleString('pl-PL') ?? '…'}</span>
          {!vis && catalog && <span className="dim mono" style={{ fontSize: 11 }}>· liczenie widoczności…</span>}
          <span style={{ flex: 1 }} />
          <select className="control" value={sortBy} onChange={(e) => setSort(e.target.value as typeof sortBy)} aria-label="Sortowanie" disabled={!!filter.query}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        {error && <div className="card empty">Nie udało się wczytać katalogu: {error}</div>}
        <div ref={scrollRef} className="catalog-scroll">
          {catalog && list.length === 0 && <div className="empty">Brak obiektów spełniających filtry.</div>}
          <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
            {virt.getVirtualItems().map((row) => (
              <div key={row.key} className="obj-grid-row" style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${row.start}px)`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {list.slice(row.index * cols, row.index * cols + cols).map((o) => {
                  const hours = vis ? vis.hours[o.i] : null
                  const maxAlt = vis ? vis.maxAlt[o.i] : null
                  const inPlan = plan.some((p) => p.objectIndex === o.i)
                  return (
                    <button
                      key={o.i}
                      className={`obj-card${o.i === selectedIndex ? ' selected' : ''}`}
                      onClick={() => {
                        select(o.i, true)
                        setDetails(true)
                      }}
                    >
                      <Thumb object={o} />
                      {inPlan && <span className="in-plan" title="W planie"><CalendarCheck size={14} /></span>}
                      <div className="vis-bar" title={hours !== null ? `${fmtDuration(hours)} powyżej ${minAlt}°` : ''}>
                        <div style={{ width: `${Math.min(100, ((hours ?? 0) / 10) * 100)}%`, background: (hours ?? 0) >= 3 ? 'var(--accent)' : (hours ?? 0) >= 1 ? 'var(--warn)' : 'var(--text-faint)' }} />
                      </div>
                      <div className="body">
                        <div className="title">
                          <b>{o.id}</b>
                          <span className="chip" style={{ color: TYPE_INFO[o.type].color, padding: '1px 5px', fontSize: 9.5 }}>{TYPE_INFO[o.type].short}</span>
                        </div>
                        <div className="name">{displayName(o) || CONSTELLATION_PL[o.con] || ''}</div>
                        <div className="meta">
                          <span>{o.mag !== null ? `${fmtNum(o.mag, 1)}m` : '—'} · {fmtSize(o.majArcmin, o.minArcmin)}</span>
                          <span>{maxAlt !== null ? `${Math.round(Math.max(0, maxAlt))}°` : ''}</span>
                        </div>
                        <div className="meta">
                          <span>{hours !== null ? (hours > 0 ? fmtDuration(hours) : 'niewidoczny') : '…'}</span>
                          <span>{vis && hours ? fmtTime(vis.best[o.i], tz) : ''}</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </section>
      {details && <ObjectDetails onClose={() => setDetails(false)} />}
    </div>
  )
}
