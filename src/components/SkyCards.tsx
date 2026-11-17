import { CircleDot, CloudMoon, Droplets, Eye, Gauge, Ruler, Settings, Sparkles, Telescope, Thermometer, Wind, Camera } from 'lucide-react'
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { angularDistanceDeg, bodyAltAz, computeOptics, moonInfo, moonJ2000, riseSetMs, sampling } from '../lib/astro'
import { DEFAULT_ANNOTATION_COLORS, TYPE_INFO } from '../lib/catalog'
import { fmtDate, fmtDeg, fmtDistance, fmtNum, fmtSize, fmtTime } from '../lib/format'
import { darkWindow, nightPhases } from '../lib/night'
import { WEATHER_PROVIDERS, skyRating, weatherAt, weatherProviderInfo, weatherSeeing, windRating, type WeatherProviderId, type WeatherSeeingResult } from '../lib/services'
import { useNight, useSelected, useSite, useTime, useWeather } from '../state/data'
import { useStore } from '../state/store'
import { MoonDisc } from './MoonDisc'
import { ObjectSearch } from './ObjectSearch'
import { ScrambleText } from './ScrambleText'
import { Thumb } from './Thumb'
import { FavoriteButton } from './FavoriteButton'
import { OwnPhotoButton } from './OwnPhotoButton'
import { Select } from './Select'
import { CONSTELLATION_PL } from '../lib/constellations'

export const ObjectCard = memo(function ObjectCard({ onDetails }: { onDetails: () => void }) {
  const o = useSelected()
  const plan = useStore((s) => s.plan)
  const annotationColors = useStore((s) => s.annotationColors)
  const addToPlan = useStore((s) => s.addToPlan)
  const setTab = useStore((s) => s.setTab)
  const setCenterMode = useStore((s) => s.setCenterMode)
  const canBack = useStore((s) => s.historyPos > 0)
  const canForward = useStore((s) => s.historyPos < s.history.length - 1)
  const stepHistory = useStore((s) => s.stepHistory)
  const inPlan = o ? plan.some((p) => p.objectId === o.id) : false
  return (
    <section className="card">
      <ObjectSearch />
      {o ? (
        <div key={o.i} style={{ marginTop: 12, animation: 'fade-in 0.4s ease' }}>
          <div className="object-photo corners">
            <Thumb object={o} className="thumb" style={{ position: 'absolute', inset: 0 }} fovDeg={Math.min(4, Math.max(0.25, (Math.max(o.majArcmin, 3) * 2.2) / 60))} sizePx={480} />
            <OwnPhotoButton objectId={o.id} />
            <FavoriteButton objectId={o.id} />
          </div>
          <div className="object-head">
            <div className="object-name">
              <span className="id"><ScrambleText text={o.id} /></span>
            </div>
            <div className="history-nav">
              <button className="picker-button icon-button" title="Poprzedni obiekt" aria-label="Poprzedni obiekt" disabled={!canBack} onClick={() => stepHistory(-1)}>‹</button>
              <button className="picker-button icon-button" title="Następny obiekt" aria-label="Następny obiekt" disabled={!canForward} onClick={() => stepHistory(1)}>›</button>
            </div>
          </div>
          <div className="object-tags">
            <span className="chip" style={{ color: annotationColors[o.type] ?? DEFAULT_ANNOTATION_COLORS[o.type] }}>
              {TYPE_INFO[o.type].label}
            </span>
            {o.aliases.slice(0, 2).map((a) => (
              <span key={a} className="chip" style={{ color: 'var(--text-dim)' }}>
                {a}
              </span>
            ))}
          </div>
          <dl className="facts object-facts">
            <dt>Gwiazdozbiór</dt>
            <dd>{CONSTELLATION_PL[o.con] ?? o.con}</dd>
            <dt>Jasność</dt>
            <dd>{o.mag !== null ? `${fmtNum(o.mag, 1)} mag` : '-'}</dd>
            <dt>Rozmiar</dt>
            <dd>{fmtSize(o.majArcmin, o.minArcmin)}</dd>
            <dt>Odległość</dt>
            <dd>{fmtDistance(o.distLy)}</dd>
          </dl>
          <div className="object-actions">
            <button className="button small" onClick={onDetails}>
              Szczegóły obiektu
            </button>
            <button className="button small" onClick={() => setCenterMode('framing')}>
              Kadruj
            </button>
            <button className={`button small${inPlan ? ' active' : ''}`} onClick={() => { addToPlan(o.i, o.id); setTab('planner') }} disabled={inPlan}>
              {inPlan ? 'W planie' : 'Do planu'}
            </button>
          </div>
        </div>
      ) : (
        <div className="empty" style={{ padding: '40px 10px' }}>
          <CircleDot size={28} className="accent" />
          <p>Wybierz obiekt z wyszukiwarki, katalogu albo kliknij znacznik na kopule.</p>
        </div>
      )}
    </section>
  )
})

export function MoonCard() {
  const time = useTime()
  const site = useSite()
  const night = useNight()
  const o = useSelected()
  const tz = useStore((s) => s.location.timeZone)
  const info = useMemo(() => moonInfo(time), [time])
  const pos = useMemo(() => bodyAltAz('moon', time, site), [time, site])
  const rise = useMemo(() => riseSetMs('moon', site, +1, night.startMs - 6 * 3_600_000, 1.2), [site, night])
  const set = useMemo(() => riseSetMs('moon', site, -1, night.startMs - 6 * 3_600_000, 1.2), [site, night])
  const sep = useMemo(() => (o ? angularDistanceDeg(o, moonJ2000(time, site)) : null), [o, time, site])
  const daysToNew = (info.nextNewMs - time) / 86_400_000
  const daysToFull = (info.nextFullMs - time) / 86_400_000
  const next = daysToNew < daysToFull ? `nów za ${Math.max(0, Math.round(daysToNew))} dni` : `pełnia za ${Math.max(0, Math.round(daysToFull))} dni`
  return (
    <section className="card">
      <div className="moon-row">
        <MoonDisc illumination={info.illumination} waxing={info.waxing} phaseName={info.name} size={80} />
        <div>
          <div style={{ font: '700 14px var(--sans)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Księżyc</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            <span className="dim">Faza</span> <b className="figures">{Math.round(info.illumination * 100)}%</b> · {info.name}
          </div>
          <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>{next}</div>
          <div className="progress"><div style={{ width: `${info.illumination * 100}%` }} /></div>
        </div>
      </div>
      <dl className="facts" style={{ gridTemplateColumns: 'auto 1fr auto 1fr', fontSize: 12.5 }}>
        <dt>Wschód</dt>
        <dd>{fmtTime(rise, tz)}</dd>
        <dt>Zachód</dt>
        <dd>{fmtTime(set, tz)}</dd>
        <dt>Wysokość</dt>
        <dd>{fmtDeg(pos.altDeg)}</dd>
        <dt>Od obiektu</dt>
        <dd style={{ color: sep !== null && sep < 30 && pos.altDeg > 0 && info.illumination > 0.3 ? 'var(--warn)' : undefined }}>{sep !== null ? fmtDeg(sep) : '-'}</dd>
      </dl>
      <div className="dim" style={{ fontSize: 11.5, marginTop: 8 }}>
        Nów {fmtDate(info.nextNewMs, tz)} · pełnia {fmtDate(info.nextFullMs, tz)}
      </div>
    </section>
  )
}

function WeatherIcon({ cloud, night }: { cloud: number; night: boolean }) {
  return (
    <svg width="64" height="54" viewBox="0 0 64 54" fill="none" stroke="#e6edf7" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      {night ? <path d="M38 6a12 12 0 1 0 14 15 10 10 0 0 1-14-15z" stroke="#9ec9ff" /> : (
        <g stroke="#ffd27a"><circle cx="40" cy="16" r="7" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d={`M${40 + Math.cos((a * Math.PI) / 180) * 10} ${16 + Math.sin((a * Math.PI) / 180) * 10}l${Math.cos((a * Math.PI) / 180) * 4} ${Math.sin((a * Math.PI) / 180) * 4}`} />)}</g>
      )}
      {cloud > 15 && <path d="M14 46h28a9 9 0 0 0 0-18 12 12 0 0 0-23 2 8 8 0 0 0-5 16z" fill="#0b0d17" opacity={Math.min(1, 0.4 + cloud / 100)} />}
    </svg>
  )
}

function RatingFace({ score, label }: { score: number; label: string }) {
  const color = score >= 60 ? 'var(--ok)' : score >= 35 ? 'var(--warn)' : 'var(--bad)'
  const mouth = score >= 60 ? 'M7.5 13 Q12 18 16.5 13' : score >= 35 ? 'M8 14h8' : 'M7.5 15.5 Q12 10.5 16.5 15.5'

  return (
    <span className="v" style={{ display: 'flex', justifyContent: 'flex-end' }} role="img" aria-label={`Ocena nieba: ${label}`} title={`Ocena nieba: ${label}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill={color} />
        <circle cx="9" cy="9.5" r="1" fill="#081018" />
        <circle cx="15" cy="9.5" r="1" fill="#081018" />
        <path d={mouth} fill="none" stroke="#081018" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  )
}

const QUALITY_COLOR = { dobry: 'var(--ok)', średni: 'var(--warn)', zły: 'var(--bad)' } as const

function seeingTooltip(seeing: WeatherSeeingResult | null, jetKmh: number | null): string | undefined {
  if (!seeing) return undefined
  const parts = [`Seeing ${seeing.label}`]
  if (seeing.source === 'profile') {
    if (seeing.blArcsec !== null) parts.push(`warstwa graniczna ~${fmtNum(seeing.blArcsec, 1)}″`)
    if (seeing.faArcsec !== null) parts.push(`swobodna atmosfera ~${fmtNum(seeing.faArcsec, 1)}″`)
    if (jetKmh !== null) parts.push(`prąd strumieniowy ${Math.round(jetKmh)} km/h`)
    if (seeing.pblM !== null) parts.push(`PBL ${seeing.pblM} m`)
  } else if (jetKmh !== null) {
    parts.push(`prąd strumieniowy ${Math.round(jetKmh)} km/h`)
  }
  return parts.join(' · ')
}

function CloudBars({ hours, time, tz }: { hours: { t: number; cloud: number }[]; time: number; tz: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<{ bar: number; gap: number; pad: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const dpr = window.devicePixelRatio || 1
      const wDev = Math.floor(el.clientWidth * dpr)
      const n = hours.length
      if (wDev <= 0 || n <= 0) return
      const gapDev = Math.max(2, Math.round(2 * dpr))
      const barDev = Math.max(1, Math.floor((wDev - (n - 1) * gapDev) / n))
      const totalDev = n * barDev + (n - 1) * gapDev
      const padDev = Math.max(0, Math.floor((wDev - totalDev) / 2))
      const rectLeftDev = el.getBoundingClientRect().left * dpr
      const fracDev = rectLeftDev - Math.floor(rectLeftDev)
      setLayout({ bar: barDev / dpr, gap: gapDev / dpr, pad: Math.max(0, padDev - fracDev) / dpr })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [hours.length])

  return (
    <div ref={ref} className="cloud-bars" style={layout ? { gap: layout.gap, paddingLeft: layout.pad } : undefined} title="Zachmurzenie w kolejnych godzinach nocy">
      {hours.map((x) => (
        <div
          key={x.t}
          style={{
            flex: layout ? `0 0 ${layout.bar}px` : 1,
            height: `${Math.max(3, x.cloud)}%`,
            opacity: Math.abs(x.t - time) < 1_800_000 ? 1 : 0.45,
            background: x.cloud > 60 ? 'var(--text-dim)' : 'var(--accent)',
          }}
          title={`${fmtTime(x.t, tz)}: ${Math.round(x.cloud)}%`}
        />
      ))}
    </div>
  )
}

export function WeatherCard() {
  const [weekView, setWeekView] = useState(false)
  const time = useTime()
  const night = useNight()
  const site = useSite()
  const provider = useStore((s) => s.weatherProvider)
  const setWeatherProvider = useStore((s) => s.setWeatherProvider)
  const providerInfo = weatherProviderInfo(provider)
  const { hours, error, loading } = useWeather()
  const h = weatherAt(hours, time)
  const nightHours = hours.filter((x) => x.t >= night.startMs && x.t <= night.endMs)
  // Bez zachodu Słońca: noc polarna to noc przez całą dobę, dzień polarny to dzień.
  const isNight = night.sunset === null ? !night.polarDay : time > night.sunset && (night.sunrise === null || time < night.sunrise)
  const rating = h ? skyRating(h) : null
  const wind = h ? windRating(h.wind) : null
  const seeing = h ? weatherSeeing(h) : null
  const seeingLabelTitle = seeing?.source === 'profile'
    ? 'Szacunek z pionowego profilu atmosfery Cₙ² (warstwa graniczna + swobodna atmosfera), nie pomiar'
    : seeing?.source === 'jet'
      ? 'Szacunek z wiatru prądu strumieniowego (300–200 hPa), nie pomiar'
      : 'Szacunek seeingu (wybrane źródło nie udostępnia danych górnych warstw atmosfery)'
  const seeingValueTitle = seeingTooltip(seeing, h?.jetKmh ?? null) ?? (!providerInfo.hasUpperAir ? 'Brak danych górnych warstw atmosfery w tym źródle' : undefined)
  const tz = useStore((s) => s.location.timeZone)
  const week = useMemo(() => {
    // 7 × nightPhases (po kilka wyszukiwań efemeryd) tylko wtedy, gdy widok tygodnia jest otwarty.
    if (!weekView) return []
    const [year, month, day] = night.date.split('-').map(Number)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.UTC(year, month - 1, day + i)).toISOString().slice(0, 10)
      const phases = nightPhases(date, site, tz)
      const [start, end] = darkWindow(phases)
      const samples = hours.filter((x) => x.t >= start && x.t <= end)
      const ratings = samples.map(skyRating).filter((r) => r !== null)
      const score = ratings.length ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : null
      return {
        date,
        label: fmtDate(phases.startMs, tz, { weekday: 'short', day: 'numeric', month: 'short' }),
        cloud: samples.length ? Math.round(samples.reduce((sum, x) => sum + x.cloud, 0) / samples.length) : null,
        minTemp: samples.length ? Math.round(Math.min(...samples.map((x) => x.temp))) : null,
        score,
        rating: score === null ? null : score >= 80 ? 'bardzo dobre' : score >= 60 ? 'dobre' : score >= 35 ? 'przeciętne' : 'złe',
      }
    })
  }, [weekView, night.date, site, tz, hours])
  return (
    <section className="card weather-card">
      <h2 className="panel-title weather-title">
        <span className="weather-title-label">{weekView ? 'Warunki na 7 nocy' : 'Warunki tej nocy'}</span>
        <span className="sub weather-time" aria-hidden={weekView} style={{ visibility: weekView ? 'hidden' : 'visible' }}>{fmtTime(time, tz)}</span>
        <button className={`switch weather-period${weekView ? ' on' : ''}`} onClick={() => setWeekView(!weekView)} role="switch" aria-checked={weekView} aria-label={weekView ? 'Pokaż warunki tej nocy' : 'Pokaż prognozę na 7 nocy'} style={{ background: 'none', border: 0, padding: 0 }}><span className="track" /><span>{weekView ? '7 nocy' : '1 noc'}</span></button>
        <Select
          id="weather-provider"
          className="control weather-select"
          value={provider}
          ariaLabel="Dostawca prognozy pogody"
          options={WEATHER_PROVIDERS.map((p) => ({ value: p.id, label: p.label }))}
          onChange={(v) => setWeatherProvider(v as WeatherProviderId)}
        />
      </h2>
      {weekView ? (
        <div className="wx-week">
          {week.map((day) => <div className="wx-week-row" key={day.date}>
            <strong>{day.label}</strong>
            {day.score === null || day.rating === null ? <span className="dim">Brak danych</span> : <RatingFace score={day.score} label={day.rating} />}
            {day.cloud !== null && <small>Zachmurzenie {day.cloud}% - min. {day.minTemp}°C</small>}
          </div>)}
          <p className="dim" style={{ fontSize: 11, marginBottom: 0 }}>Średnia ocena i zachmurzenie w ciemnym oknie każdej nocy. Prognoza: {providerInfo.shortLabel}.</p>
        </div>
      ) : h && rating ? (
        <div className="wx-current">
          <div className="wx-main">
            <div style={{ textAlign: 'center' }}>
              <WeatherIcon cloud={h.cloud} night={isNight} />
              <div className="wx-temp">{Math.round(h.temp)}°C</div>
            </div>
            <div className="wx-rows">
              <Gauge size={15} /> <span>Ocena nieba</span>
              <RatingFace score={rating.score} label={rating.label} />
              <CloudMoon size={15} /> <span>Zachmurzenie</span> <span className="v">{Math.round(h.cloud)}%</span>
              <Droplets size={15} /> <span>Wilgotność</span> <span className="v">{Math.round(h.humidity)}%</span>
              <Thermometer size={15} /> <span>Punkt rosy</span> <span className="v">{fmtNum(h.dew, 0)}°C</span>
              <Wind size={15} /> <span title="Do 15 km/h akceptowalny, 16–24 km/h umiarkowany (ryzykowny przy długiej ogniskowej), powyżej 24 km/h za silny">Wiatr</span>
              <span className="v" title={wind?.note} style={{ color: wind ? QUALITY_COLOR[wind.label] : undefined }}>{Math.round(h.wind)} km/h</span>
              <Sparkles size={15} /> <span title={seeingLabelTitle}>Seeing</span>
              {/* Ocena (dobry/średni/zły) tylko kolorem wartości; słownie w dymku. */}
              <span className="v" title={seeingValueTitle} style={{ color: seeing ? QUALITY_COLOR[seeing.label] : undefined }}>
                {seeing ? `~${fmtNum(seeing.arcsec, 1)}″` : '-'}
              </span>
            </div>
          </div>
          {nightHours.length > 0 && (
            <>
              <CloudBars hours={nightHours} time={time} tz={tz} />
              <div className="dim figures" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginTop: 4 }}>
                <span>{fmtTime(nightHours[0].t, tz)}</span>
                <span>zachmurzenie godzinowe · {providerInfo.shortLabel}</span>
                <span>{fmtTime(nightHours[nightHours.length - 1].t, tz)}</span>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="dim wx-empty" style={{ fontSize: 13, padding: '18px 0' }}>
          {loading ? 'Pobieranie prognozy…' : error ? `Prognoza niedostępna: ${error}` : 'Prognoza obejmuje najbliższe 7 dni. Dla tej nocy brak danych.'}
        </div>
      )}
    </section>
  )
}

export const OpticsCard = memo(function OpticsCard() {
  const eq = useStore((s) => s.equipment)
  const setTab = useStore((s) => s.setTab)
  const o = useMemo(
    () => computeOptics({ apertureMm: eq.apertureMm, focalLengthMm: eq.focalLengthMm, reducer: eq.reducer, widthPx: eq.widthPx, heightPx: eq.heightPx, pixelUm: eq.pixelUm, binning: eq.binning }),
    [eq],
  )
  const s = sampling(o.scaleArcsecPx, eq.seeingArcsec)
  return (
    <section className="card">
      <h2 className="panel-title">
        Zestaw optyczny
        <span className="spacer" />
        <button className="button ghost icon-button" style={{ minHeight: 28, width: 28 }} onClick={() => setTab('equipment')} title="Konfiguruj zestaw" aria-label="Konfiguruj zestaw">
          <Settings size={18} />
        </button>
      </h2>
      <div className="wx-rows" style={{ gridTemplateColumns: 'auto 1fr', fontSize: 13.5, gap: '12px 14px' }}>
        <Telescope size={17} />
        <span>
          {eq.telescopeName} <span className="dim">·</span> <span className="mono">{fmtNum(eq.apertureMm, 0)}/{fmtNum(o.focalMm, 0)} f/{fmtNum(o.fRatio, 1)}</span>
        </span>
        <Camera size={17} />
        <span>{eq.cameraName} <span className="dim mono">{eq.binning > 1 ? `bin ${eq.binning}` : ''}</span></span>
        <Eye size={17} />
        <span>
          Pole widzenia <b className="mono">{fmtNum(o.fovWdeg, 2)}° × {fmtNum(o.fovHdeg, 2)}°</b>
        </span>
        <Ruler size={17} />
        <span>
          Skala <b className="mono">{fmtNum(o.scaleArcsecPx, 2)}″/px</b> <span className="dim">· {s}</span>
        </span>
      </div>
      <TelescopeDrawing />
    </section>
  )
})

function TelescopeDrawing() {
  return <img className="telescope-art" src="/icons/telescope.webp" alt="" width={720} height={535} decoding="async" loading="lazy" />
}
