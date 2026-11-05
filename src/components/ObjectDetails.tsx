import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { angularDistanceDeg, galactic, isCircumpolar, moonInfo, moonJ2000 } from '../lib/astro'
import { DEFAULT_ANNOTATION_COLORS, TYPE_INFO } from '../lib/catalog'
import { CONSTELLATION_PL } from '../lib/constellations'
import { fmtDec, fmtDeg, fmtDistance, fmtDuration, fmtNum, fmtRa, fmtSize, fmtTime } from '../lib/format'
import { altitudeTrack, nightGrid, visibility } from '../lib/night'
import { astrobinSearchUrl, fetchWikiSummary, type WikiSummary } from '../lib/services'
import { useNight, useSelected, useSite } from '../state/data'
import { useStore } from '../state/store'
import { CloseButton } from './CloseButton'
import { Thumb } from './Thumb'

export function ObjectDetails({ onClose }: { onClose: () => void }) {
  const o = useSelected()
  const night = useNight()
  const site = useSite()
  const tz = useStore((s) => s.location.timeZone)
  const annotationColors = useStore((s) => s.annotationColors)
  const minAlt = useStore((s) => s.minAltDeg)
  const horizon = useStore((s) => s.horizon)
  const setMode = useStore((s) => s.setCenterMode)
  const select = useStore((s) => s.select)
  const addToPlan = useStore((s) => s.addToPlan)
  const setTab = useStore((s) => s.setTab)
  const [wiki, setWiki] = useState<{ key: number; data: WikiSummary | null } | null>(null)
  const [astrobin, setAstrobin] = useState<{ key: number; url: string } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!o) return
    let alive = true
    fetchWikiSummary(o.wikiPl, o.wikiEn, o.namesEn[0] ?? '')
      .then((data) => alive && setWiki({ key: o.i, data }))
      .catch(() => alive && setWiki({ key: o.i, data: null }))
    return () => {
      alive = false
    }
  }, [o])

  // Adres AstroBin liczony asynchronicznie (kompresja), żeby przycisk był zwykłym linkiem.
  useEffect(() => {
    if (!o) return
    let alive = true
    astrobinSearchUrl(o.id)
      .then((url) => alive && setAstrobin({ key: o.i, url }))
      .catch((e) => console.error('AstroBin: adres wyszukiwania', e))
    return () => {
      alive = false
    }
  }, [o])

  const stats = useMemo(() => {
    if (!o) return null
    const grid = nightGrid(night, site, 5)
    const track = altitudeTrack(o, grid)
    const vis = visibility(o, track, night, site, minAlt, horizon)
    let rise: number | null = null
    let set: number | null = null
    for (let i = 1; i < track.length; i++) {
      if (track[i - 1].alt < 0 && track[i].alt >= 0 && rise === null) rise = track[i].t
      if (track[i - 1].alt >= 0 && track[i].alt < 0 && set === null) set = track[i].t
    }
    const moon = moonJ2000(vis.bestMs, site)
    return { vis, rise, set, moonSep: angularDistanceDeg(o, moon), moonIllum: moonInfo(vis.bestMs).illumination, circumpolar: isCircumpolar(o.decDeg, site.latDeg) }
  }, [o, night, site, minAlt, horizon])

  if (!o || !stats) return null
  const g = galactic(o)
  const w = wiki?.key === o.i ? wiki.data : undefined
  const simbad = `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(o.aliases.find((a) => /^(NGC|IC|M) /.test(a)) ?? o.id)}`
  const aladin = `https://aladin.cds.unistra.fr/AladinLite/?target=${o.raDeg.toFixed(4)}%20${o.decDeg.toFixed(4)}&fov=${Math.max(0.3, (o.majArcmin / 60) * 3).toFixed(2)}&survey=CDS%2FP%2FDSS2%2Fcolor`
  const go = (mode: 'dome' | '3d') => {
    setMode(mode)
    setTab('sky')
    if (mode === 'dome') select(o.i, true)
    onClose()
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`Szczegóły ${o.id}`}>
        <div style={{ position: 'relative' }}>
          <Thumb object={o} className="thumb" style={{ aspectRatio: '16 / 9' }} fovDeg={Math.min(4, Math.max(0.3, (Math.max(o.majArcmin, 3) * 2.6) / 60))} sizePx={560} preferAstroBin />
          <CloseButton onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, zIndex: 4 }} />
        </div>
        <p className="faint" style={{ fontSize: 10, margin: '7px 22px 0' }}>This product uses the AstroBin API but is not endorsed or certified by AstroBin.</p>
        <div style={{ padding: 22 }}>
          <h2 className="object-name" style={{ margin: 0, width: 'fit-content', fontWeight: 400 }}>
            <span className="id">{o.id}</span>
          </h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            <span className="chip" style={{ color: annotationColors[o.type] ?? DEFAULT_ANNOTATION_COLORS[o.type] }}>{TYPE_INFO[o.type].label}</span>
            {o.aliases.map((alias) => (
              <span key={alias} className="chip" style={{ color: 'var(--text-dim)' }}>{alias}</span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
            <button className="button primary" onClick={() => go('dome')}>Pokaż na niebie</button>
            <button className="button" onClick={() => go('3d')}>Pozycja 3D</button>
            <button className="button" onClick={() => { addToPlan(o.i, o.id); onClose(); setTab('planner') }}>Do planu</button>
            {astrobin?.key === o.i && (
              <a className="button" href={astrobin.url} target="_blank" rel="noreferrer" title="Zdjęcia z AstroBin wyróżnione jako IOTD lub Top Pick">
                AstroBin
              </a>
            )}
          </div>

          <div className="label" style={{ marginTop: 18 }}>Opis</div>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.65, fontSize: 14 }}>
            {w === undefined ? <span className="dim">Pobieranie opisu z Wikipedii…</span> : w ? w.extract : <span className="dim">Brak artykułu w Wikipedii dla tego obiektu.</span>}
          </p>
          {w && (
            <a href={w.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
              Wikipedia ({w.lang === 'pl' ? 'polska' : 'angielska'}): {w.title} <ExternalLink size={11} />
            </a>
          )}

          <div className="label" style={{ marginTop: 22, marginBottom: 10 }}>Tej nocy</div>
          <div className="stat-grid">
            <div className="stat"><div className="label">Wschód</div><div className="v">{stats.circumpolar ? 'okołobiegunowy' : fmtTime(stats.rise, tz)}</div></div>
            <div className="stat"><div className="label">Górowanie</div><div className="v">{fmtTime(stats.vis.transitMs, tz)}</div></div>
            <div className="stat"><div className="label">Zachód</div><div className="v">{stats.circumpolar ? '-' : fmtTime(stats.set, tz)}</div></div>
            <div className="stat"><div className="label">Maks. wysokość</div><div className="v">{fmtDeg(stats.vis.maxAlt)}</div></div>
            <div className="stat"><div className="label">Czas ≥ {minAlt}°</div><div className="v">{fmtDuration(stats.vis.hoursUsable)}</div></div>
            <div className="stat"><div className="label">Księżyc</div><div className="v">{fmtDeg(stats.moonSep)} · {Math.round(stats.moonIllum * 100)}%</div></div>
          </div>

          <div className="label" style={{ marginTop: 22, marginBottom: 10 }}>Dane</div>
          <table className="table">
            <tbody>
              <tr><td className="dim">RA / Dec (J2000)</td><td className="mono">{fmtRa(o.raDeg)} · {fmtDec(o.decDeg)}</td></tr>
              <tr><td className="dim">Galaktyczne l / b</td><td className="mono">{fmtNum(g.lDeg, 2)}° · {fmtNum(g.bDeg, 2)}°</td></tr>
              <tr><td className="dim">Gwiazdozbiór</td><td>{CONSTELLATION_PL[o.con] ?? o.con}</td></tr>
              <tr><td className="dim">Jasność</td><td className="mono">{o.mag !== null ? `${fmtNum(o.mag, 1)} mag` : '-'}{o.sb !== null ? ` · jasność pow. ${fmtNum(o.sb, 1)} mag/″²` : ''}</td></tr>
              <tr><td className="dim">Rozmiar</td><td className="mono">{fmtSize(o.majArcmin, o.minArcmin)}{o.paDeg !== null ? ` · PA ${o.paDeg}°` : ''}</td></tr>
              <tr><td className="dim">Odległość</td><td className="mono">{fmtDistance(o.distLy)}</td></tr>
              {o.namesEn.length > 0 && <tr><td className="dim">Nazwy (ang.)</td><td>{o.namesEn.join(', ')}</td></tr>}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 12 }}>
            <a href={simbad} target="_blank" rel="noreferrer">SIMBAD <ExternalLink size={11} /></a>
            <a href={aladin} target="_blank" rel="noreferrer">Aladin Lite <ExternalLink size={11} /></a>
          </div>
          <p className="faint" style={{ fontSize: 11, marginTop: 18 }}>
            Dane: OpenNGC (CC BY-SA 4.0), kontury mgławic: OpenNGC outlines (CC BY-SA 4.0, obrysy na DSS2 w Aladin, CDS), mgławic ciemnych: mapy Planck 857 GHz (ESA, NASA SkyView) dopasowane SAM 3 (Meta) do zdjęć z AstroBin, katalogi VizieR/CDS, odległości i artykuły: Wikidata (CC0), opisy: Wikipedia (CC BY-SA), zdjęcia: AstroBin API użytkownika Konuz lub kafelki HiPS (ESA ESASky, MAST/STScI): Digitized Sky Survey (STScI/NASA; Palomar Observatory/Caltech, UK Schmidt Telescope/AAO) i Pan-STARRS1 (PS1 Surveys).
          </p>
        </div>
      </aside>
    </>
  )
}
