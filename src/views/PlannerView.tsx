import { ArrowDown, ArrowUp, Download, FileText, Trash2, Wand2, Crosshair, AlertTriangle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { AltitudeChart } from '../components/AltitudeChart'
import { Thumb } from '../components/Thumb'
import { angularDistanceDeg, computeOptics, moonJ2000 } from '../lib/astro'
import { mosaicCenters } from '../lib/framing'
import { displayName, TYPE_INFO, type DSO } from '../lib/catalog'
import { exposureSeconds, fitExposures, planExposures, validExposure, type Exposure } from '../lib/exposures'
import { fmtDec, fmtDeg, fmtDuration, fmtRa, fmtTime } from '../lib/format'
import { altitudeTrack, darkWindow, nightGrid, visibility, type AltSample, type Visibility } from '../lib/night'
import { download, exposureCsv, ninaCsv, schedulerCsv } from '../lib/nina'
import { autoSchedule, localTimeToMs, overlaps } from '../lib/planner'
import { useCatalog, useNight, useSite } from '../state/data'
import { useStore, type PlanItem } from '../state/store'

interface Row {
  item: PlanItem
  o: DSO
  track: AltSample[]
  vis: Visibility
  exposures: Exposure[]
}

export default function PlannerView() {
  const { catalog } = useCatalog()
  const night = useNight()
  const site = useSite()
  const plan = useStore((s) => s.plan)
  const targetIds = useStore(useShallow((s) => s.plan.map((item) => item.objectId)))
  const updatePlan = useStore((s) => s.updatePlan)
  const removeFromPlan = useStore((s) => s.removeFromPlan)
  const movePlan = useStore((s) => s.movePlan)
  const select = useStore((s) => s.select)
  const selectedIndex = useStore((s) => s.selectedIndex)
  const setTab = useStore((s) => s.setTab)
  const setMode = useStore((s) => s.setCenterMode)
  const minAlt = useStore((s) => s.minAltDeg)
  const horizon = useStore((s) => s.horizon)
  const location = useStore((s) => s.location)
  const equipment = useStore((s) => s.equipment)
  const tz = location.timeZone
  const [exportFormat, setExportFormat] = useState('nina')
  const [chartTargetKey, setChartTargetKey] = useState<string | null>(null)
  const [darkStart, darkEnd] = darkWindow(night)
  const grid = useMemo(() => nightGrid(night, site, 5), [night, site])
  const catalogById = useMemo(() => new Map((catalog ?? []).map((o) => [o.id, o])), [catalog])
  const missingItems = catalog ? plan.filter((item) => !catalogById.has(item.objectId)) : []
  const targets = useMemo(() => {
    const result = new Map<string, Omit<Row, 'item' | 'exposures'>>()
    for (const id of targetIds) {
      const o = catalogById.get(id)
      if (!o || result.has(id)) continue
      const track = altitudeTrack(o, grid)
      result.set(id, { o, track, vis: visibility(o, track, night, site, minAlt, horizon) })
    }
    return result
  }, [catalogById, targetIds, grid, night, site, minAlt, horizon])
  const rows: Row[] = useMemo(() => plan.flatMap((item) => {
    const target = targets.get(item.objectId)
    return target ? [{ item, ...target, exposures: planExposures(item) }] : []
  }), [plan, targets])

  const auto = useMemo(
    () => autoSchedule(rows.map((r) => ({ key: r.item.key, bestMs: r.vis.bestMs, usableStart: r.vis.windowStart, usableEnd: r.vis.windowEnd })), darkStart, darkEnd),
    [rows, darkStart, darkEnd],
  )
  const autoByKey = useMemo(() => new Map(auto.map((slot) => [slot.key, slot])), [auto])
  const inNight = (t: number | null) => t !== null && t >= night.startMs && t <= night.endMs
  const slots = rows.map((r) => {
    const { startMs, endMs } = r.item
    if (inNight(startMs) && inNight(endMs)) return { key: r.item.key, startMs: startMs!, endMs: endMs!, manual: true }
    const a = autoByKey.get(r.item.key)
    return a ? { ...a, manual: false } : null
  })
  const conflicts = overlaps(slots.filter((s): s is NonNullable<typeof s> => s !== null && s.endMs > s.startMs))
  const warnings = rows.map((r, i) => {
    const s = slots[i]
    const issues: string[] = []
    if (!s) issues.push('Brak dostępnego okna obserwacji.')
    else if (s.endMs <= s.startMs) issues.push('Koniec okna musi wypadać po początku.')
    else {
      if (conflicts.has(r.item.key)) issues.push('Okno nakłada się na inny cel.')
      if (exposureSeconds(r.exposures) > (s.endMs - s.startMs) / 1000) issues.push('Ekspozycje przekraczają długość okna.')
      if (s.startMs < darkStart || s.endMs > darkEnd) issues.push('Okno wykracza poza ciemną część nocy.')
      if (r.vis.windowStart === null || r.vis.windowEnd === null || s.startMs < r.vis.windowStart || s.endMs > r.vis.windowEnd) issues.push('Okno wykracza poza zalecaną widoczność celu.')
    }
    if (!r.exposures.length || r.exposures.some((e) => !validExposure(e))) issues.push('Uzupełnij poprawnie filtry, klatki i czas ekspozycji.')
    else if (!r.exposures.some((e) => e.count > 0)) issues.push('Ustaw liczbę klatek: obecnie wynosi 0.')
    return issues
  })
  const integration = rows.reduce((sum, r) => sum + exposureSeconds(r.exposures), 0)
  const frameCount = rows.reduce((sum, r) => sum + r.exposures.reduce((n, e) => n + (validExposure(e) ? e.count : 0), 0), 0)
  const invalidExposures = rows.some((r) => !r.exposures.length || r.exposures.some((e) => !validExposure(e)))
  const invalidWindows = slots.some((s) => s && s.endMs <= s.startMs)
  const warningCount = warnings.filter((w) => w.length).length
  const chartIndex = Math.max(0, rows.findIndex((r) => r.item.key === chartTargetKey || (chartTargetKey === null && r.o.i === selectedIndex)))
  const chartRow = rows[chartIndex]
  const chartSlot = slots[chartIndex]
  const saveExposures = (r: Row, exposures: Exposure[]) => updatePlan(r.item.key, { exposures, filters: exposures.map((e) => e.filter).join(', ') })
  const exportCsv = () => {
    const optics = computeOptics({ apertureMm: equipment.apertureMm, focalLengthMm: equipment.focalLengthMm, reducer: equipment.reducer, widthPx: equipment.widthPx, heightPx: equipment.heightPx, pixelUm: equipment.pixelUm, binning: equipment.binning })
    // Mozaika: każdy panel to osobny cel („Panel k”) ze wspólnym PA, jak w planie mozaiki Telescopius.
    const exportTargets = rows.flatMap((r, i) => {
      const name = displayName(r.o) ? `${r.o.id} ${displayName(r.o)}` : r.o.id
      const center = { raDeg: r.item.framing.raDeg ?? r.o.raDeg, decDeg: r.item.framing.decDeg ?? r.o.decDeg }
      const mosaic = r.item.framing.mosaic
      const panels = mosaic && mosaic.cols * mosaic.rows > 1 ? mosaicCenters(center, optics.fovWdeg, optics.fovHdeg, r.item.framing.paDeg, mosaic) : [center]
      return panels.map((p, k) => ({
        name: panels.length > 1 ? `${name} Panel ${k + 1}` : name,
        type: TYPE_INFO[r.o.type].label,
        raDeg: p.raDeg,
        decDeg: p.decDeg,
        paDeg: r.item.framing.paDeg,
        exposures: r.exposures,
        startMs: slots[i]?.startMs ?? null,
        endMs: slots[i]?.endMs ?? null,
        note: r.item.note,
      }))
    })
    const csv = exportFormat === 'exposures' ? exposureCsv(exportTargets, tz)
      : exportFormat === 'scheduler' ? schedulerCsv(exportTargets) : ninaCsv(exportTargets)
    download(`plan-${night.date}-${exportFormat}.csv`, csv)
  }
  const exportText = () => {
    const lines = [
      `KONUZASTRO: plan sesji, noc ${night.date}`,
      `Miejsce: ${location.name} (${location.latDeg.toFixed(3)}°, ${location.lonDeg.toFixed(3)}°), strefa ${tz}`,
      `Zestaw: ${equipment.telescopeName} + ${equipment.cameraName}`,
      `Ciemne okno: ${fmtTime(darkStart, tz)}–${fmtTime(darkEnd, tz)}`,
      `Integracja: ${fmtDuration(integration / 3600)} · ${frameCount} klatek (bez przerw i obsługi sprzętu)`, '',
      ...rows.map((r, i) => {
        const s = slots[i]
        return [
          `${i + 1}. ${r.o.id}${displayName(r.o) ? ` ${displayName(r.o)}` : ''} (${TYPE_INFO[r.o.type].label})`,
          `   Okno: ${s ? `${fmtTime(s.startMs, tz)}–${fmtTime(s.endMs, tz)}` : 'brak'}`,
          `   Środek: RA ${fmtRa(r.item.framing.raDeg ?? r.o.raDeg)}, Dec ${fmtDec(r.item.framing.decDeg ?? r.o.decDeg)}, PA ${r.item.framing.paDeg}°`,
          `   Górowanie: ${fmtTime(r.vis.transitMs, tz)} na ${fmtDeg(r.vis.transitAlt)}`,
          ...r.exposures.map((e) => `   ${e.filter}: ${e.count} × ${e.seconds} s = ${fmtDuration(e.count * e.seconds / 3600)}`),
          ...(r.item.note ? [`   Notatka: ${r.item.note}`] : []),
          ...warnings[i].map((w) => `   Uwaga: ${w}`),
        ].join('\n')
      }),
    ]
    download(`plan-${night.date}.txt`, lines.join('\n') + '\n', 'text/plain')
  }

  return (
    <div className="col planner">
      <section className="card planner-overview">
        <div className="planner-heading">
          <div><div className="kicker">Plan obserwacji / {night.date}</div><h1>Twoja noc pod gwiazdami</h1><p className="dim">{location.name} · {tz} · godziny po północy dotyczą następnego dnia</p></div>
          <div className="planner-heading-actions">
            <button className="button" onClick={() => setTab('catalog', 'single')}>Dodaj jeden</button>
            <button className="button ghost" onClick={() => setTab('catalog', 'multiple')}>Dodaj kilka</button>
          </div>
        </div>
        <div className="planner-stats">
          <div><span className="label">Cele w planie</span><strong>{rows.length.toString().padStart(2, '0')}</strong></div>
          <div><span className="label">Ciemne okno</span><strong>{fmtTime(darkStart, tz)} <span>–</span> {fmtTime(darkEnd, tz)}</strong></div>
          <div><span className="label">Łączna integracja</span><strong>{fmtDuration(integration / 3600)}</strong><small>{frameCount} klatek · bez przerw</small></div>
          <div><span className="label">Kontrola planu</span><strong className={warningCount ? 'planner-warn' : ''}>{warningCount ? `${warningCount} do sprawdzenia` : rows.length ? 'Bez uwag' : 'Dodaj cele'}</strong><small>Widoczność, okna i ekspozycje</small></div>
        </div>
      </section>
      {missingItems.length > 0 && <section className="card" role="alert">
        <p>Niektórych celów brakuje w katalogu lub ich stary zapis nie zawiera ID. Ustawienia pozostają w planie; te cele są pomijane w obliczeniach i eksporcie.</p>
        {missingItems.map((item) => <div key={item.key}>{item.objectId || 'Cel ze starego zapisu'} <button className="button small" onClick={() => removeFromPlan(item.key)}>Usuń z planu</button></div>)}
      </section>}
      {rows.length === 0 ? (
        <section className="card empty">Plan jest pusty. Wybierz „Dodaj jeden” lub „Dodaj kilka”, a następnie kliknij obiekty w katalogu.</section>
      ) : (
        <>
          <AltitudeChart
            object={chartRow.o}
            slot={chartSlot && { ...chartSlot, conflict: conflicts.has(chartRow.item.key) }}
            title="Przebieg nocy"
            toolbar={<div className="planner-chart-toolbar">
              <label className="field"><span className="label">Cel na wykresie</span><select className="control" value={chartRow.item.key} onChange={(e) => setChartTargetKey(e.target.value)}>
                {rows.map((r, i) => <option value={r.item.key} key={r.item.key}>{i + 1}. {r.o.id}{displayName(r.o) ? ` - ${displayName(r.o)}` : ''}</option>)}
              </select></label>
              <span className="planner-chart-key"><i /> Granice planowanego okna{chartSlot ? ` · ${fmtTime(chartSlot.startMs, tz)}–${fmtTime(chartSlot.endMs, tz)}` : ' · brak okna'}</span>
              <button className="button small" onClick={() => rows.forEach((r) => updatePlan(r.item.key, { startMs: null, endMs: null }))}><Wand2 size={14} /> Ułóż okna automatycznie</button>
            </div>}
          />
          {rows.map((r, i) => {
            const s = slots[i]
            const available = s ? Math.max(0, (s.endMs - s.startMs) / 1000) : 0
            const seconds = exposureSeconds(r.exposures)
            const moonSep = s && available > 0 ? angularDistanceDeg(r.o, moonJ2000((s.startMs + s.endMs) / 2, site)) : null
            const setExposure = (j: number, patch: Partial<Exposure>) => saveExposures(r, r.exposures.map((e, k) => k === j ? { ...e, ...patch } : e))
            return <section className="card planner-target" id={`target-${r.item.key}`} key={r.item.key} aria-label={`Cel ${r.o.id}`}>
              <div className="planner-target-head">
                <span className="planner-number">{String(i + 1).padStart(2, '0')}</span>
                <Thumb object={r.o} style={{ width: 52, height: 52, flex: 'none' }} />
                <div className="planner-target-name"><h2>{r.o.id} <span>{displayName(r.o)}</span></h2><div className="dim">{TYPE_INFO[r.o.type].label} · {fmtDuration(seconds / 3600)} integracji</div></div>
                <div className="planner-actions">
                  <button className="button ghost icon-button" disabled={i === 0} onClick={() => movePlan(r.item.key, -1)} aria-label={`Przesuń ${r.o.id} w górę`}><ArrowUp size={16} /></button>
                  <button className="button ghost icon-button" disabled={i === rows.length - 1} onClick={() => movePlan(r.item.key, 1)} aria-label={`Przesuń ${r.o.id} w dół`}><ArrowDown size={16} /></button>
                  <button className="button ghost icon-button" onClick={() => removeFromPlan(r.item.key)} aria-label={`Usuń ${r.o.id} z planu`}><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="planner-target-body">
                <div className="planner-window">
                  <h3 className="label">Okno obserwacji <span className="chip">{s?.manual ? 'Ręcznie' : 'Automatycznie'}</span></h3>
                  <div className="planner-time-fields">
                    <label className="field"><span className="label">Od</span><input type="time" className="control figures" aria-label={`Początek ${r.o.id}`} value={s ? fmtTime(s.startMs, tz) : ''} onChange={(e) => {
                      const t = localTimeToMs(night.date, e.target.value, tz, s?.startMs)
                      if (t !== null) updatePlan(r.item.key, { startMs: t, endMs: s?.endMs ?? t + 3_600_000 })
                    }} /></label>
                    <label className="field"><span className="label">Do</span><input type="time" className="control figures" aria-label={`Koniec ${r.o.id}`} value={s ? fmtTime(s.endMs, tz) : ''} onChange={(e) => {
                      const t = localTimeToMs(night.date, e.target.value, tz, s?.endMs)
                      if (t !== null) updatePlan(r.item.key, { endMs: t, startMs: s?.startMs ?? t - 3_600_000 })
                    }} /></label>
                  </div>
                  <div className="planner-budget"><span>{fmtDuration(seconds / 3600)} / {fmtDuration(available / 3600)}</span><span className={seconds > available ? 'planner-warn' : 'dim'}>{available > 0 ? `${Math.round(seconds / available * 100)}% okna` : 'Brak okna'}</span></div>
                  <div className="planner-meter" role="meter" aria-label={`Wykorzystanie okna ${r.o.id}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={available > 0 ? Math.min(100, seconds / available * 100) : 0}><i style={{ width: `${available > 0 ? Math.min(100, seconds / available * 100) : 0}%`, background: seconds > available ? 'var(--warn)' : undefined }} /></div>
                  <p className="planner-help">Czas samego naświetlania. Zostaw zapas na odczyt, zmianę filtrów, ustawianie ostrości i dithering.</p>
                  <button className="button small ghost" onClick={() => updatePlan(r.item.key, { startMs: null, endMs: null })} disabled={!s?.manual}><Wand2 size={13} /> Przywróć okno automatyczne</button>
                  <dl className="planner-facts"><div><dt>Maks. wysokość</dt><dd>{fmtDeg(r.vis.maxAlt)}</dd></div><div><dt>Górowanie</dt><dd>{fmtTime(r.vis.transitMs, tz)}</dd></div><div><dt>Od Księżyca</dt><dd className={moonSep !== null && moonSep < 30 ? 'planner-warn' : ''}>{moonSep !== null ? fmtDeg(moonSep) : '-'}</dd></div><div><dt>Kąt kadru</dt><dd>{r.item.framing.paDeg}°</dd></div></dl>
                  <button className="button small" onClick={() => { select(r.o.i, false); useStore.getState().setFraming(r.item.framing); setMode('framing'); setTab('sky') }}><Crosshair size={13} /> Ustaw kadr</button>
                </div>
                <div className="planner-exposures">
                  <div className="planner-section-head"><h3>Filtry i ekspozycje</h3><button className="button small ghost" disabled={seconds <= 0 || available <= 0 || r.exposures.some((e) => !validExposure(e))} title="Przelicz liczbę klatek proporcjonalnie, wypełniając całe okno bez zapasu na obsługę sprzętu" onClick={() => saveExposures(r, fitExposures(r.exposures, available))}>Dopasuj klatki do okna</button></div>
                  <div className="planner-exposure-labels label" aria-hidden="true"><span>Filtr</span><span>Klatki</span><span>Czas [s]</span><span>Łącznie</span><span /></div>
                  {r.exposures.map((e, j) => <div className="planner-exposure-row" key={j}>
                    <input className="control mono" aria-label={`Filtr ${j + 1}: ${r.o.id}`} value={e.filter} placeholder="np. Ha" onChange={(ev) => setExposure(j, { filter: ev.target.value })} aria-invalid={!e.filter.trim()} />
                    <input className="control figures" type="number" min={0} step={1} aria-label={`Liczba klatek ${j + 1}: ${r.o.id}`} value={e.count} onChange={(ev) => setExposure(j, { count: ev.target.value === '' ? 0 : Number(ev.target.value) })} aria-invalid={!Number.isSafeInteger(e.count) || e.count < 0} />
                    <input className="control figures" type="number" min={0.001} step="any" aria-label={`Czas ekspozycji ${j + 1}: ${r.o.id} [s]`} value={e.seconds} onChange={(ev) => setExposure(j, { seconds: Number(ev.target.value) })} aria-invalid={e.seconds <= 0} />
                    <span className="mono planner-exposure-total">{validExposure(e) ? fmtDuration(e.count * e.seconds / 3600) : '-'}</span>
                    <button className="button ghost icon-button" onClick={() => saveExposures(r, r.exposures.filter((_, k) => k !== j))} aria-label={`Usuń filtr ${j + 1}: ${r.o.id}`}><Trash2 size={14} /></button>
                  </div>)}
                  <button className="button small planner-add-filter" onClick={() => saveExposures(r, [...r.exposures, { filter: '', count: 0, seconds: 180 }])}>Dodaj filtr</button>
                  <p className="planner-help">Nazwy filtrów powinny odpowiadać konfiguracji NINA. Ustaw 0 klatek, aby pominąć filtr w naświetlaniu.</p>
                  <label className="field planner-note"><span className="label">Notatka do sesji</span><input className="control" placeholder="np. Ha przed wschodem Księżyca" value={r.item.note} onChange={(e) => updatePlan(r.item.key, { note: e.target.value })} /></label>
                </div>
              </div>
              {warnings[i].length > 0 && <div className="planner-notices" role="status"><AlertTriangle size={15} /><div>{warnings[i].map((w) => <p key={w}>{w}</p>)}</div></div>}
            </section>
          })}
        </>
      )}
      <section className="card planner-export">
        <div className="planner-section-head"><h2>Zabierz plan na sesję</h2><span className="label">CSV / TXT</span></div>
        <div className="planner-export-actions"><label className="field"><span className="label">Format CSV</span><select className="control" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
          <option value="nina">NINA - cele i kadry (Telescopius)</option><option value="scheduler">Target Scheduler - cele i kadry</option><option value="exposures">Wykaz ekspozycji - pełne dane</option>
        </select></label><button className="button primary" disabled={!rows.length || (exportFormat === 'exposures' && (invalidExposures || invalidWindows))} onClick={exportCsv}><Download size={14} /> Pobierz CSV</button><button className="button" disabled={!rows.length || invalidExposures || invalidWindows} onClick={exportText}><FileText size={14} /> Plan nocy TXT</button></div>
        <p className="planner-help">{exportFormat === 'nina' ? 'Importuj cele w prostym sekwencerze NINA (Import targets). Plik zawiera nazwę, RA/Dec J2000 i obrót kadru. Ekspozycje pochodzą z szablonu NINA; do zaawansowanego sekwencera przenieś plan w NINA.' : exportFormat === 'scheduler' ? 'W Target Scheduler wybierz profil → Import Targets. Plik zawiera typ, nazwę, RA/Dec J2000, obrót i ROI 100%. Ekspozycje przypisz przez szablon celu w tej wtyczce.' : 'Jeden wiersz na filtr: klatki, sekundy, integracja, kadr, okno UTC, strefa i notatka. To wykaz do arkusza lub ręcznego przeniesienia ustawień, nie plik importu sekwencji NINA.'}</p>
        <details className="planner-export-help"><summary>Co przenosi się do NINA?</summary><p>Nie istnieje wspólny CSV pełnej sesji dla wszystkich modułów. Importery celów nie odczytują liczby klatek ani czasów ekspozycji z dodatkowych kolumn. Pobierz też wykaz ekspozycji lub TXT, aby zachować te ustawienia. Okna z planera są wskazówką; pliki celów ich nie wymuszają.</p><a href="https://tcpalmer.github.io/nina-scheduler/target-management/targets.html" target="_blank" rel="noreferrer">Dokumentacja Target Scheduler</a><span> · </span><a href="https://github.com/isbeorn/nina/blob/develop/NINA/ViewModel/Sequencer/SimpleSequence/SimpleSequenceVM.cs" target="_blank" rel="noreferrer">Importer NINA</a></details>
      </section>
    </div>
  )
}
