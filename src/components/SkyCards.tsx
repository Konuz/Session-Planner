import { ChevronRight, CircleDot, CloudMoon, Droplets, Eye, Gauge, Maximize2, Moon, Ruler, Settings, Sparkles, Sun, Telescope, Thermometer, Wind, Camera, Aperture, Plus, Check } from 'lucide-react'
import { useMemo } from 'react'
import { angularDistanceDeg, bodyAltAz, computeOptics, moonInfo, moonJ2000, riseSetMs, sampling } from '../lib/astro'
import { displayName, TYPE_INFO } from '../lib/catalog'
import { fmtDate, fmtDeg, fmtDistance, fmtNum, fmtSize, fmtTime } from '../lib/format'
import { skyRating, weatherAt } from '../lib/services'
import { useNight, useSelected, useSite, useTime, useWeather } from '../state/data'
import { useStore } from '../state/store'
import { MoonDisc } from './MoonDisc'
import { ObjectSearch } from './ObjectSearch'
import { ScrambleText } from './ScrambleText'
import { Thumb } from './Thumb'
import { CONSTELLATION_PL } from '../lib/constellations'

export function ObjectCard({ onDetails }: { onDetails: () => void }) {
  const o = useSelected()
  const plan = useStore((s) => s.plan)
  const addToPlan = useStore((s) => s.addToPlan)
  const inPlan = o ? plan.some((p) => p.objectIndex === o.i) : false
  return (
    <section className="card">
      <ObjectSearch />
      {o ? (
        <div key={o.i} style={{ marginTop: 12, animation: 'fade-in 0.4s ease' }}>
          <div className="object-photo corners">
            <Thumb object={o} className="thumb" style={{ position: 'absolute', inset: 0 }} fovDeg={Math.min(4, Math.max(0.25, (Math.max(o.majArcmin, 3) * 2.2) / 60))} sizePx={480} />
          </div>
          <div className="object-name">
            <span className="id"><ScrambleText text={o.id} /></span>
            {displayName(o) && (
              <>
                <span className="sep">·</span>
                <span><ScrambleText text={displayName(o)} /></span>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="chip" style={{ color: TYPE_INFO[o.type].color }}>
              {TYPE_INFO[o.type].label}
            </span>
            {o.aliases.slice(0, 2).map((a) => (
              <span key={a} className="chip" style={{ color: 'var(--text-dim)' }}>
                {a}
              </span>
            ))}
          </div>
          <dl className="facts">
            <dt><Sparkles size={15} /> Gwiazdozbiór</dt>
            <dd>{CONSTELLATION_PL[o.con] ?? o.con}</dd>
            <dt><Sun size={15} /> Jasność</dt>
            <dd>{o.mag !== null ? `${fmtNum(o.mag, 1)} mag` : '—'}</dd>
            <dt><Maximize2 size={15} /> Rozmiar</dt>
            <dd>{fmtSize(o.majArcmin, o.minArcmin)}</dd>
            <dt><Ruler size={15} /> Odległość</dt>
            <dd>{fmtDistance(o.distLy)}</dd>
          </dl>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button className="link-row" onClick={onDetails}>
              <ChevronRight size={15} /> Szczegóły obiektu
            </button>
            <button className={`button small${inPlan ? ' active' : ''}`} onClick={() => addToPlan(o.i, o.id)} disabled={inPlan}>
              {inPlan ? <Check size={13} /> : <Plus size={13} />} {inPlan ? 'W planie' : 'Do planu'}
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
}

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
        <MoonDisc illumination={info.illumination} waxing={info.waxing} size={80} />
        <div>
          <div style={{ font: '700 14px var(--sans)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Księżyc</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            <span className="dim">Faza</span> <b className="figures">{Math.round(info.illumination * 100)}%</b> · {info.name}
          </div>
          <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>{next}</div>
          <div className="progress"><div style={{ width: `${info.illumination * 100}%` }} /></div>
        </div>
        <Moon size={18} className="dim" />
      </div>
      <dl className="facts" style={{ gridTemplateColumns: 'auto 1fr auto 1fr', fontSize: 12.5 }}>
        <dt>Wschód</dt>
        <dd>{fmtTime(rise, tz)}</dd>
        <dt>Zachód</dt>
        <dd>{fmtTime(set, tz)}</dd>
        <dt>Wysokość</dt>
        <dd>{fmtDeg(pos.altDeg)}</dd>
        <dt>Od obiektu</dt>
        <dd style={{ color: sep !== null && sep < 30 && pos.altDeg > 0 && info.illumination > 0.3 ? 'var(--warn)' : undefined }}>{sep !== null ? fmtDeg(sep) : '—'}</dd>
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

export function WeatherCard() {
  const time = useTime()
  const night = useNight()
  const { hours, error, loading } = useWeather()
  const h = weatherAt(hours, time)
  const nightHours = hours.filter((x) => x.t >= night.startMs && x.t <= night.endMs)
  const isNight = night.sunset !== null && time > night.sunset && (night.sunrise === null || time < night.sunrise)
  const rating = h ? skyRating(h) : null
  const tz = useStore((s) => s.location.timeZone)
  return (
    <section className="card">
      <h2 className="panel-title">
        <CloudMoon size={20} /> Warunki tej nocy <span className="spacer" /> <span className="sub">{fmtTime(time, tz)}</span>
      </h2>
      {h && rating ? (
        <>
          <div className="wx-main">
            <div style={{ textAlign: 'center' }}>
              <WeatherIcon cloud={h.cloud} night={isNight} />
              <div className="wx-temp">{Math.round(h.temp)}°C</div>
            </div>
            <div className="wx-rows">
              <Gauge size={15} /> <span>Ocena nieba</span>
              <span className="v" style={{ color: rating.score >= 60 ? 'var(--ok)' : rating.score >= 35 ? 'var(--warn)' : 'var(--bad)' }}>{rating.label}</span>
              <CloudMoon size={15} /> <span>Zachmurzenie</span> <span className="v">{Math.round(h.cloud)}%</span>
              <Droplets size={15} /> <span>Wilgotność</span> <span className="v">{Math.round(h.humidity)}%</span>
              <Thermometer size={15} /> <span>Punkt rosy</span> <span className="v">{fmtNum(h.dew, 0)}°C</span>
              <Wind size={15} /> <span>Wiatr</span> <span className="v">{Math.round(h.wind)} km/h</span>
            </div>
          </div>
          {nightHours.length > 0 && (
            <>
              <div className="cloud-bars" title="Zachmurzenie w kolejnych godzinach nocy">
                {nightHours.map((x) => (
                  <div key={x.t} style={{ height: `${Math.max(3, x.cloud)}%`, opacity: Math.abs(x.t - time) < 1_800_000 ? 1 : 0.45, background: x.cloud > 60 ? 'var(--text-dim)' : 'var(--accent)' }} title={`${fmtTime(x.t, tz)}: ${Math.round(x.cloud)}%`} />
                ))}
              </div>
              <div className="dim figures" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginTop: 4 }}>
                <span>{fmtTime(nightHours[0].t, tz)}</span>
                <span>zachmurzenie godzinowe · Open-Meteo</span>
                <span>{fmtTime(nightHours[nightHours.length - 1].t, tz)}</span>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="dim" style={{ fontSize: 13, padding: '18px 0' }}>
          {loading ? 'Pobieranie prognozy…' : error ? `Prognoza niedostępna: ${error}` : 'Prognoza obejmuje najbliższe 7 dni. Dla tej nocy brak danych.'}
        </div>
      )}
    </section>
  )
}

export function OpticsCard() {
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
        <Telescope size={20} /> Zestaw optyczny
        <span className="spacer" />
        <button className="button ghost icon-button" style={{ minHeight: 28, width: 28 }} onClick={() => setTab('equipment')} title="Konfiguruj zestaw" aria-label="Konfiguruj zestaw">
          <Settings size={18} />
        </button>
      </h2>
      <div className="wx-rows" style={{ gridTemplateColumns: 'auto 1fr', fontSize: 13.5, gap: '12px 14px' }}>
        <Aperture size={17} />
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
}

function TelescopeDrawing() {
  return <img className="telescope-art" src="/icons/telescope.webp" alt="" width={720} height={535} decoding="async" loading="lazy" />
}
