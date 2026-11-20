import { ExternalLink, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { addDays, nightDateOf } from '../lib/night'
import { placeForCoords, searchPlaces, type Place } from '../lib/services'
import { useStore, type Location, type Tab } from '../state/store'
import { Select } from './Select'

// Ikony zakładek: srebrna (nieaktywna) i świecąca (aktywna), z public/icons (scripts/build-assets.ts).
const TABS: { id: Tab; label: string }[] = [
  { id: 'sky', label: 'Niebo' },
  { id: 'catalog', label: 'Katalog' },
  { id: 'planner', label: 'Planer sesji' },
  { id: 'equipment', label: 'Sprzęt' },
  { id: 'horizon', label: 'Mój horyzont' },
]

export function useOutside(ref: React.RefObject<HTMLElement | null>, close: () => void, enabled = true) {
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    if (!enabled) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !ref.current) return
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      closeRef.current()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [ref, enabled])
}

const locKey = (l: Pick<Location, 'name' | 'latDeg' | 'lonDeg'>) => `${l.name}:${l.latDeg.toFixed(4)}:${l.lonDeg.toFixed(4)}`

function LocationPicker() {
  const location = useStore((s) => s.location)
  const saved = useStore((s) => s.savedLocations)
  const setLocation = useStore((s) => s.setLocation)
  const saveLocation = useStore((s) => s.saveLocation)
  const removeLocation = useStore((s) => s.removeLocation)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [status, setStatus] = useState('')
  const [manual, setManual] = useState({ lat: String(location.latDeg), lon: String(location.lonDeg) })
  const ref = useRef<HTMLDivElement>(null)
  const geoReqRef = useRef(0)
  useOutside(ref, () => setOpen(false), open)

  useEffect(() => {
    if (open) setManual({ lat: String(location.latDeg), lon: String(location.lonDeg) })
  }, [open, location.latDeg, location.lonDeg])

  useEffect(() => () => { geoReqRef.current++ }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const id = setTimeout(() => {
      searchPlaces(query.trim(), ctrl.signal)
        .then((r) => {
          setResults(r)
          setStatus(r.length ? '' : 'Brak wyników')
        })
        .catch((e: Error) => e.name !== 'AbortError' && setStatus(e.message))
    }, 280)
    return () => {
      clearTimeout(id)
      ctrl.abort()
    }
  }, [query])

  const choose = (loc: Location) => {
    geoReqRef.current++
    setLocation(loc)
    saveLocation(loc)
    setOpen(false)
    setQuery('')
  }

  const fromCoords = async (lat: number, lon: number, name: string, token = ++geoReqRef.current) => {
    setStatus('Ustalanie strefy czasowej…')
    try {
      const extra = await placeForCoords(lat, lon)
      if (token !== geoReqRef.current) return
      choose({ name, region: `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`, latDeg: lat, lonDeg: lon, ...extra })
      setStatus('')
    } catch (e) {
      if (token === geoReqRef.current) setStatus(`Nie udało się: ${(e as Error).message}`)
    }
  }

  const geolocate = () => {
    if (!navigator.geolocation) return setStatus('Przeglądarka nie udostępnia położenia')
    const token = ++geoReqRef.current
    setStatus('Ustalanie położenia…')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (token === geoReqRef.current) void fromCoords(Math.round(p.coords.latitude * 1000) / 1000, Math.round(p.coords.longitude * 1000) / 1000, 'Moje położenie', token)
      },
      (e) => { if (token === geoReqRef.current) setStatus(`Brak dostępu do położenia: ${e.message}`) },
      { timeout: 10_000 },
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="picker-button" onClick={() => setOpen((o) => !o)} aria-expanded={open} title="Miejsce obserwacji">
        <span style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location.name}</span>
      </button>
      {open && (
        <div className="popover">
          <div className="label" style={{ marginBottom: 8 }}>Miejsce obserwacji</div>
          <div className="search-box">
            <Search size={15} />
            <input className="control" style={{ width: '100%' }} autoFocus placeholder="Szukaj miejscowości…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {results.length > 0 && (
            <div style={{ marginTop: 6, maxHeight: 220, overflow: 'auto', border: '1px solid var(--border)' }}>
              {results.map((r) => (
                <button key={`${r.latDeg},${r.lonDeg}`} className="search-results-item" style={rowStyle} onClick={() => choose(r)}>
                  <span>
                    {r.name}
                    <span className="dim" style={{ display: 'block', fontSize: 11.5 }}>
                      {r.region} · {r.latDeg.toFixed(2)}°, {r.lonDeg.toFixed(2)}°
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="button small" onClick={geolocate}>
              Moje położenie
            </button>
          </div>
          <div className="label" style={{ margin: '14px 0 8px' }}>Współrzędne ręcznie</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="control figures" style={{ width: 0, flex: 1 }} value={manual.lat} onChange={(e) => setManual({ ...manual, lat: e.target.value })} aria-label="Szerokość" />
            <input className="control figures" style={{ width: 0, flex: 1 }} value={manual.lon} onChange={(e) => setManual({ ...manual, lon: e.target.value })} aria-label="Długość (E dodatnia)" />
            <button
              className="button small"
              onClick={() => {
                const rawLat = manual.lat.trim()
                const rawLon = manual.lon.trim()
                const lat = Number(rawLat.replace(',', '.'))
                const lon = Number(rawLon.replace(',', '.'))
                if (rawLat !== '' && rawLon !== '' && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
                  void fromCoords(lat, lon, `Punkt ${lat.toFixed(2)}, ${lon.toFixed(2)}`)
                } else setStatus('Szerokość −90…90, długość −180…180 (E dodatnia)')
              }}
            >
              Ustaw
            </button>
          </div>
          {status && <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>{status}</div>}
          <div className="label" style={{ margin: '14px 0 6px' }}>Zapisane</div>
          {saved.map((l) => (
            <div key={locKey(l)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button style={{ ...rowStyle, flex: 1, color: locKey(l) === locKey(location) ? 'var(--accent)' : undefined }} onClick={() => choose(l)}>
                {l.name}
                <span className="dim figures" style={{ marginLeft: 'auto', fontSize: 11 }}>
                  {l.latDeg.toFixed(2)}°, {l.lonDeg.toFixed(2)}°
                </span>
              </button>
              {saved.length > 1 && (
                <button className="button ghost small icon-button" title="Usuń" onClick={() => removeLocation(l)}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '8px 8px',
  background: 'none',
  border: 0,
  borderBottom: '1px solid var(--border)',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: 13,
}

const MONTH_FMT = new Intl.DateTimeFormat('pl-PL', { month: 'long', timeZone: 'UTC' })
const DATE_LABEL_FMT = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const MONTHS = Array.from({ length: 12 }, (_, i) => MONTH_FMT.format(Date.UTC(2000, i, 1)))
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

function DatePicker() {
  const date = useStore((s) => s.nightDate)
  const setDate = useStore((s) => s.setNightDate)
  const setTime = useStore((s) => s.setTime)
  const tz = useStore((s) => s.location.timeZone)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setOpen(false), open)
  const [y, m, d] = date.split('-').map(Number)
  const pick = (year: number, month: number, day: number) =>
    setDate(`${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, daysInMonth(year, month))).padStart(2, '0')}`)
  const resetToNow = () => {
    setDate(nightDateOf(Date.now(), tz))
    setTime(null)
  }
  const label = DATE_LABEL_FMT.format(Date.UTC(y, m - 1, d))
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button className="picker-button icon-button" style={{ justifyContent: 'center' }} title="Poprzednia noc" onClick={() => setDate(addDays(date, -1))}>
        ‹
      </button>
      <div ref={ref} style={{ position: 'relative', margin: '0 -1px' }}>
        <button className="picker-button" onClick={() => setOpen((o) => !o)} aria-expanded={open} title="Noc obserwacyjna (data wieczoru)">
          <span className="figures">{label}</span>
        </button>
        {open && (
          <div className="popover" style={{ width: 'auto' }}>
            <div className="date-popover-head">
              <span className="label">Noc obserwacyjna</span>
              <button
                type="button"
                className="button ghost icon-button"
                title="Wróć do aktualnego czasu"
                aria-label="Wróć do aktualnego czasu"
                onClick={resetToNow}
              >
                <RotateCcw size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Select
                className="control figures"
                ariaLabel="Dzień"
                value={String(d)}
                options={Array.from({ length: daysInMonth(y, m) }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                onChange={(v) => pick(y, m, Number(v))}
              />
              <Select
                className="control"
                ariaLabel="Miesiąc"
                value={String(m)}
                options={MONTHS.map((name, i) => ({ value: String(i + 1), label: name }))}
                onChange={(v) => pick(y, Number(v), d)}
              />
              <Select
                className="control figures"
                ariaLabel="Rok"
                value={String(y)}
                options={Array.from({ length: 21 }, (_, i) => ({ value: String(y - 10 + i), label: String(y - 10 + i) }))}
                onChange={(v) => pick(Number(v), m, d)}
              />
            </div>
          </div>
        )}
      </div>
      <button className="picker-button icon-button" style={{ justifyContent: 'center' }} title="Następna noc" onClick={() => setDate(addDays(date, 1))}>
        ›
      </button>
    </div>
  )
}

export function TopBar() {
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)
  return (
    <header className="topbar">
      <a className="brand" href="https://www.konuzastro.pl" title="Michał Kania – astrofotografia">
        <img className="brand-logo" src="/michal-kania-logo.jpg" alt="Michał Kania Astrophotography" />
      </a>
      <nav className="nav" aria-label="Widoki">
        {TABS.map(({ id, label }) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} aria-label={label} title={label}>
            <span className="nav-icon" aria-hidden>
              <img src={`/icons/tab-${id}-off.webp`} alt="" width={39} height={39} decoding="async" />
              <img className="on" src={`/icons/tab-${id}-on.webp`} alt="" width={39} height={39} decoding="async" />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="topbar-right">
        <LocationPicker />
        <DatePicker />
        <a className="home-link" href="https://www.konuzastro.pl" title="Wróć do galerii">
          <ExternalLink size={13} />
          <span>konuzastro.pl</span>
        </a>
      </div>
    </header>
  )
}
