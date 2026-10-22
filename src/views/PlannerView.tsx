import { ArrowDown, ArrowUp, CalendarDays, Download, FileText, Trash2, Wand2, Crosshair } from 'lucide-react'
import { useMemo } from 'react'
import { Thumb } from '../components/Thumb'
import { angularDistanceDeg, moonJ2000 } from '../lib/astro'
import { displayName, TYPE_INFO, type DSO } from '../lib/catalog'
import { fmtDec, fmtDeg, fmtDuration, fmtRa, fmtTime } from '../lib/format'
import { altitudeTrack, darkWindow, nightGrid, visibility, type AltSample, type Visibility } from '../lib/night'
import { download, ninaCsv } from '../lib/nina'
import { autoSchedule, localTimeToMs, overlaps } from '../lib/planner'
import { useCatalog, useNight, useSite } from '../state/data'
import { useStore, type PlanItem } from '../state/store'

interface Row {
  item: PlanItem
  o: DSO
  track: AltSample[]
  vis: Visibility
  start: number | null
  end: number | null
}

export default function PlannerView() {
  const { catalog } = useCatalog()
  const night = useNight()
  const site = useSite()
  const plan = useStore((s) => s.plan)
  const updatePlan = useStore((s) => s.updatePlan)
  const removeFromPlan = useStore((s) => s.removeFromPlan)
  const movePlan = useStore((s) => s.movePlan)
  const select = useStore((s) => s.select)
  const setTab = useStore((s) => s.setTab)
  const setMode = useStore((s) => s.setCenterMode)
  const minAlt = useStore((s) => s.minAltDeg)
  const horizon = useStore((s) => s.horizon)
  const tz = useStore((s) => s.location.timeZone)
  const location = useStore((s) => s.location)
  const equipment = useStore((s) => s.equipment)
  const [darkStart, darkEnd] = darkWindow(night)

  const grid = useMemo(() => nightGrid(night, site, 10), [night, site])
  const rows: Row[] = useMemo(() => {
    if (!catalog) return []
    return plan
      .map((item) => {
        const o = catalog[item.objectIndex]
        if (!o) return null
        const track = altitudeTrack(o, grid)
        const vis = visibility(o, track, night, site, minAlt, horizon)
        return { item, o, track, vis, start: item.startMs, end: item.endMs }
      })
      .filter((r): r is Row => r !== null)
  }, [catalog, plan, grid, night, site, minAlt, horizon])

  // Zapisane okna mogą pochodzić z innej nocy — wtedy liczy się okno automatyczne.
  const inNight = (t: number | null) => t !== null && t >= night.startMs && t <= night.endMs
  const auto = useMemo(
    () => autoSchedule(rows.map((r) => ({ key: r.item.key, bestMs: r.vis.bestMs, usableStart: r.vis.windowStart, usableEnd: r.vis.windowEnd })), darkStart, darkEnd),
    [rows, darkStart, darkEnd],
  )
  const slots = rows.map((r) => {
    if (inNight(r.start) && inNight(r.end)) return { key: r.item.key, startMs: r.start!, endMs: r.end!, manual: true }
    const a = auto.find((s) => s.key === r.item.key)
    return a ? { ...a, manual: false } : null
  })
  const conflicts = overlaps(slots.filter((s): s is NonNullable<typeof s> => s !== null))
  const totalH = slots.reduce((sum, s) => sum + (s ? (s.endMs - s.startMs) / 3_600_000 : 0), 0)

  const W = 1000
  const x = (t: number) => ((t - night.startMs) / (night.endMs - night.startMs)) * W

  const exportNina = () => {
    const csv = ninaCsv(
      rows.map((r) => ({
        name: displayName(r.o) ? `${r.o.id} ${displayName(r.o)}` : r.o.id,
        raDeg: r.item.framing.raDeg ?? r.o.raDeg,
        decDeg: r.item.framing.decDeg ?? r.o.decDeg,
        paDeg: r.item.framing.paDeg,
      })),
    )
    download(`plan-${night.date}-nina.csv`, csv)
  }

  const exportText = () => {
    const lines = [
      `KONUZASTRO — plan sesji, noc ${night.date}`,
      `Miejsce: ${location.name} (${location.latDeg.toFixed(3)}°, ${location.lonDeg.toFixed(3)}°), strefa ${tz}`,
      `Zestaw: ${equipment.telescopeName} + ${equipment.cameraName}`,
      `Ciemne okno: ${fmtTime(darkStart, tz)}–${fmtTime(darkEnd, tz)}`,
      '',
      ...rows.map((r, i) => {
        const s = slots[i]
        return [
          `${i + 1}. ${r.o.id}${displayName(r.o) ? ` — ${displayName(r.o)}` : ''} (${TYPE_INFO[r.o.type].label})`,
          `   Okno: ${s ? `${fmtTime(s.startMs, tz)}–${fmtTime(s.endMs, tz)} (${fmtDuration((s.endMs - s.startMs) / 3_600_000)})` : 'brak — poniżej limitu'}`,
          `   Środek: RA ${fmtRa(r.item.framing.raDeg ?? r.o.raDeg)}, Dec ${fmtDec(r.item.framing.decDeg ?? r.o.decDeg)}, PA ${r.item.framing.paDeg}°`,
          `   Górowanie: ${fmtTime(r.vis.transitMs, tz)} na ${fmtDeg(r.vis.transitAlt)} · filtry: ${r.item.filters}${r.item.note ? ` · ${r.item.note}` : ''}`,
        ].join('\n')
      }),
    ]
    download(`plan-${night.date}.txt`, lines.join('\n') + '\n', 'text/plain')
  }

  const bands: [number | null, number | null, string][] = [
    [night.sunset, night.civilDusk, 'rgba(120,72,40,0.35)'],
    [night.civilDusk, night.nauticalDusk, 'rgba(44,46,78,0.5)'],
    [night.nauticalDusk, night.astroDusk, 'rgba(22,40,84,0.55)'],
    [darkStart, darkEnd, 'rgba(10,26,64,0.7)'],
    [night.astroDawn, night.nauticalDawn, 'rgba(22,40,84,0.55)'],
    [night.nauticalDawn, night.civilDawn, 'rgba(44,46,78,0.5)'],
    [night.civilDawn, night.sunrise, 'rgba(120,72,40,0.35)'],
  ]
  const hours: number[] = []
  for (let t = Math.ceil(night.startMs / 3_600_000) * 3_600_000; t <= night.endMs; t += 3_600_000) hours.push(t)

  return (
    <div className="col">
      <section className="card">
        <h2 className="panel-title">
          <CalendarDays size={20} /> Planer sesji <span className="sub">— noc {night.date} · ciemne okno {fmtTime(darkStart, tz)}–{fmtTime(darkEnd, tz)}</span>
          <span className="spacer" />
          <span className="sub">{rows.length} cel(e) · {fmtDuration(totalH)}</span>
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button" onClick={() => rows.forEach((r) => updatePlan(r.item.key, { startMs: null, endMs: null }))} disabled={!rows.length}>
            <Wand2 size={14} /> Ułóż automatycznie
          </button>
          <button className="button primary" onClick={exportNina} disabled={!rows.length}>
            <Download size={14} /> Eksport do N.I.N.A. (CSV)
          </button>
          <button className="button" onClick={exportText} disabled={!rows.length}>
            <FileText size={14} /> Plan nocy (TXT)
          </button>
        </div>
        <p className="dim" style={{ fontSize: 12, margin: '10px 0 0' }}>
          Plik CSV ma kolumny Pane, RA, DEC, Position Angle (East), czyli format planu mozaiki Telescopius. W N.I.N.A. zaimportujesz go w sekwencerze poleceniem importu celów; każdy wiersz staje się celem z kadrem i kątem obrotu.
        </p>
      </section>

      {rows.length === 0 ? (
        <section className="card empty">
          Plan jest pusty. Dodaj obiekty przyciskiem „Do planu” w karcie obiektu albo w katalogu.
          <div style={{ marginTop: 14 }}><button className="button" onClick={() => setTab('catalog')}>Otwórz katalog</button></div>
        </section>
      ) : (
        <>
          <section className="card">
            <h2 className="panel-title">Oś czasu nocy</h2>
            <svg viewBox={`0 0 ${W} ${rows.length * 46 + 30}`} style={{ width: '100%', display: 'block' }}>
              {bands.map(([a, b, fill], i) => a !== null && b !== null && <rect key={i} x={x(a)} y={0} width={Math.max(0, x(b) - x(a))} height={rows.length * 46} fill={fill} />)}
              {hours.map((t) => (
                <g key={t}>
                  <line x1={x(t)} x2={x(t)} y1={0} y2={rows.length * 46} stroke="rgba(200,210,230,0.08)" />
                  <text x={x(t)} y={rows.length * 46 + 18} fill="rgba(200,210,230,0.65)" fontSize="11" textAnchor="middle" fontFamily="var(--mono)">{fmtTime(t, tz)}</text>
                </g>
              ))}
              {rows.map((r, i) => {
                const y0 = i * 46
                const s = slots[i]
                const path = r.track.map((p, k) => `${k ? 'L' : 'M'}${x(p.t).toFixed(1)},${(y0 + 42 - (Math.max(0, p.alt) / 90) * 38).toFixed(1)}`).join('')
                return (
                  <g key={r.item.key}>
                    <line x1={0} x2={W} y1={y0 + 46} y2={y0 + 46} stroke="rgba(35,41,66,0.6)" />
                    {s && <rect x={x(s.startMs)} y={y0 + 6} width={Math.max(2, x(s.endMs) - x(s.startMs))} height={36} fill={conflicts.has(r.item.key) ? 'rgba(244,63,94,0.25)' : 'rgba(0,224,255,0.16)'} stroke={conflicts.has(r.item.key) ? '#f43f5e' : '#00e0ff'} />}
                    <path d={path} fill="none" stroke={TYPE_INFO[r.o.type].color} strokeWidth="1.4" opacity="0.9" />
                    <text x={6} y={y0 + 18} fill="#e6edf7" fontSize="12" fontFamily="var(--mono)">{i + 1}. {r.o.id}</text>
                  </g>
                )
              })}
            </svg>
          </section>

          <section className="card" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="label">#</th>
                  <th className="label">Obiekt</th>
                  <th className="label">Okno</th>
                  <th className="label">Maks. / górowanie</th>
                  <th className="label">Księżyc</th>
                  <th className="label">Kadr</th>
                  <th className="label">Filtry i notatka</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const s = slots[i]
                  const moonSep = s ? angularDistanceDeg(r.o, moonJ2000((s.startMs + s.endMs) / 2, site)) : null
                  return (
                    <tr key={r.item.key}>
                      <td className="mono">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <button className="button ghost small icon-button" onClick={() => movePlan(r.item.key, -1)} aria-label="W górę"><ArrowUp size={12} /></button>
                          <button className="button ghost small icon-button" onClick={() => movePlan(r.item.key, 1)} aria-label="W dół"><ArrowDown size={12} /></button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 210 }}>
                          <Thumb object={r.o} style={{ width: 52, height: 52, flex: 'none' }} />
                          <div>
                            <b className="mono">{r.o.id}</b>
                            <div className="dim" style={{ fontSize: 12 }}>{displayName(r.o) || TYPE_INFO[r.o.type].label}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input
                            type="time"
                            className="control figures"
                            style={{ width: 92, borderColor: conflicts.has(r.item.key) ? 'var(--bad)' : undefined }}
                            value={s ? fmtTime(s.startMs, tz) : ''}
                            onChange={(e) => {
                              const t = localTimeToMs(night.date, e.target.value, tz)
                              if (t !== null) updatePlan(r.item.key, { startMs: t, endMs: s?.endMs ?? t + 3_600_000 })
                            }}
                          />
                          –
                          <input
                            type="time"
                            className="control figures"
                            style={{ width: 92, borderColor: conflicts.has(r.item.key) ? 'var(--bad)' : undefined }}
                            value={s ? fmtTime(s.endMs, tz) : ''}
                            onChange={(e) => {
                              const t = localTimeToMs(night.date, e.target.value, tz)
                              if (t !== null) updatePlan(r.item.key, { endMs: t, startMs: s?.startMs ?? t - 3_600_000 })
                            }}
                          />
                        </div>
                        <div className="dim" style={{ fontSize: 11, marginTop: 3 }}>
                          {s ? `${fmtDuration((s.endMs - s.startMs) / 3_600_000)}${s.manual ? ' · ręcznie' : ' · automatycznie'}` : `poniżej ${minAlt}° tej nocy`}
                          {conflicts.has(r.item.key) && <span style={{ color: 'var(--bad)' }}> · nakłada się</span>}
                        </div>
                      </td>
                      <td className="mono">{fmtDeg(r.vis.maxAlt)}<div className="dim" style={{ fontSize: 11 }}>{fmtTime(r.vis.transitMs, tz)}</div></td>
                      <td className="mono" style={{ color: moonSep !== null && moonSep < 30 ? 'var(--warn)' : undefined }}>{moonSep !== null ? fmtDeg(moonSep) : '—'}</td>
                      <td>
                        <div className="mono" style={{ fontSize: 12 }}>PA {r.item.framing.paDeg}°</div>
                        <button
                          className="link-row"
                          style={{ fontSize: 12, marginTop: 2 }}
                          onClick={() => {
                            select(r.o.i, false)
                            useStore.getState().setFraming(r.item.framing)
                            setMode('framing')
                            setTab('sky')
                          }}
                        >
                          <Crosshair size={12} /> kadruj
                        </button>
                      </td>
                      <td>
                        <input className="control" style={{ width: 150 }} value={r.item.filters} onChange={(e) => updatePlan(r.item.key, { filters: e.target.value })} aria-label="Filtry" />
                        <input className="control" style={{ width: 150, marginTop: 4 }} placeholder="Notatka" value={r.item.note} onChange={(e) => updatePlan(r.item.key, { note: e.target.value })} aria-label="Notatka" />
                      </td>
                      <td>
                        <button className="button ghost small icon-button" onClick={() => removeFromPlan(r.item.key)} aria-label="Usuń z planu"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  )
}
