import { Camera, Gauge, Telescope } from 'lucide-react'
import { useMemo } from 'react'
import cameras from '../data/cameras.json'
import reducers from '../data/reducers.json'
import telescopes from '../data/telescopes.json'
import { computeOptics, sampling } from '../lib/astro'
import { displayName } from '../lib/catalog'
import { fmtNum, fmtSize } from '../lib/format'
import { useCatalog } from '../state/data'
import { useStore } from '../state/store'

const SHOWCASE = ['M 31', 'M 42', 'NGC 7000', 'M 33', 'M 51', 'M 27', 'M 13', 'NGC 6888']

function NumField({ label, value, onChange, step = 1, min = 0, unit }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; unit?: string }) {
  return (
    <label className="field">
      <span className="label">{label}{unit ? ` [${unit}]` : ''}</span>
      <input className="control figures" type="number" step={step} min={min} value={value} onChange={(e) => Number(e.target.value) > 0 && onChange(Number(e.target.value))} />
    </label>
  )
}

export default function EquipmentView() {
  const eq = useStore((s) => s.equipment)
  const set = useStore((s) => s.setEquipment)
  const { catalog } = useCatalog()
  const optics = useMemo(
    () => computeOptics({ apertureMm: eq.apertureMm, focalLengthMm: eq.focalLengthMm, reducer: eq.reducer, widthPx: eq.widthPx, heightPx: eq.heightPx, pixelUm: eq.pixelUm, binning: eq.binning }),
    [eq],
  )
  const samp = sampling(optics.scaleArcsecPx, eq.seeingArcsec)
  const showcase = useMemo(() => (catalog ? SHOWCASE.map((id) => catalog.find((o) => o.id === id)).filter((o) => o !== undefined) : []), [catalog])

  return (
    <div className="two-col">
      <div className="col">
        <section className="card">
          <h2 className="panel-title"><Telescope size={20} /> Teleskop</h2>
          <div className="form-grid">
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span className="label">Model</span>
              <select
                className="control"
                value={telescopes.some((t) => t.id === eq.telescopeId) ? eq.telescopeId : 'custom'}
                onChange={(e) => {
                  const t = telescopes.find((x) => x.id === e.target.value)
                  if (t) set({ telescopeId: t.id, telescopeName: `${t.brand} ${t.model}`, apertureMm: t.apertureMm, focalLengthMm: t.focalLengthMm })
                  else set({ telescopeId: 'custom', telescopeName: 'Własny teleskop' })
                }}
              >
                {telescopes.map((t) => <option key={t.id} value={t.id}>{t.brand} {t.model} — {t.apertureMm}/{t.focalLengthMm}</option>)}
                <option value="custom">Własny…</option>
              </select>
            </label>
            {eq.telescopeId === 'custom' && (
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span className="label">Nazwa</span>
                <input className="control" value={eq.telescopeName} onChange={(e) => set({ telescopeName: e.target.value })} />
              </label>
            )}
            <NumField label="Apertura" unit="mm" value={eq.apertureMm} onChange={(v) => set({ apertureMm: v, telescopeId: 'custom' })} />
            <NumField label="Ogniskowa" unit="mm" value={eq.focalLengthMm} onChange={(v) => set({ focalLengthMm: v, telescopeId: 'custom' })} />
            <label className="field">
              <span className="label">Reduktor / korektor</span>
              <select className="control" value={eq.reducer} onChange={(e) => set({ reducer: Number(e.target.value) })}>
                {reducers.map((r) => <option key={r.factor} value={r.factor}>×{r.factor}{r.note ? ` — ${r.note}` : ''}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="panel-title"><Camera size={20} /> Kamera</h2>
          <div className="form-grid">
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span className="label">Model</span>
              <select
                className="control"
                value={cameras.some((c) => c.id === eq.cameraId) ? eq.cameraId : 'custom'}
                onChange={(e) => {
                  const c = cameras.find((x) => x.id === e.target.value)
                  if (c) set({ cameraId: c.id, cameraName: `${c.brand} ${c.model}`, widthPx: c.resolutionXPx, heightPx: c.resolutionYPx, pixelUm: c.pixelSizeUm, mono: c.sensor === 'mono' })
                  else set({ cameraId: 'custom', cameraName: 'Własna kamera' })
                }}
              >
                {cameras.map((c) => <option key={c.id} value={c.id}>{c.brand} {c.model} — {c.sensorModel}, {c.sensor === 'mono' ? 'mono' : 'kolor'}</option>)}
                <option value="custom">Własna…</option>
              </select>
            </label>
            <NumField label="Szerokość" unit="px" value={eq.widthPx} onChange={(v) => set({ widthPx: v, cameraId: 'custom' })} />
            <NumField label="Wysokość" unit="px" value={eq.heightPx} onChange={(v) => set({ heightPx: v, cameraId: 'custom' })} />
            <NumField label="Piksel" unit="µm" step={0.01} value={eq.pixelUm} onChange={(v) => set({ pixelUm: v, cameraId: 'custom' })} />
            <label className="field">
              <span className="label">Binning</span>
              <select className="control" value={eq.binning} onChange={(e) => set({ binning: Number(e.target.value) })}>
                {[1, 2, 3, 4].map((b) => <option key={b} value={b}>{b}×{b}</option>)}
              </select>
            </label>
            <NumField label="Seeing" unit="″" step={0.1} value={eq.seeingArcsec} onChange={(v) => set({ seeingArcsec: v })} />
          </div>
        </section>
      </div>

      <div className="col">
        <section className="card">
          <h2 className="panel-title"><Gauge size={20} /> Parametry zestawu <span className="sub">{eq.telescopeName} + {eq.cameraName}</span></h2>
          <div className="stat-grid">
            <div className="stat"><div className="label">Ogniskowa efektywna</div><div className="v">{fmtNum(optics.focalMm, 0)} mm</div></div>
            <div className="stat"><div className="label">Światłosiła</div><div className="v">f/{fmtNum(optics.fRatio, 2)}</div></div>
            <div className="stat"><div className="label">Pole widzenia</div><div className="v">{fmtNum(optics.fovWdeg, 2)}° × {fmtNum(optics.fovHdeg, 2)}°</div></div>
            <div className="stat"><div className="label">Matryca</div><div className="v">{fmtNum(optics.sensorWmm, 1)} × {fmtNum(optics.sensorHmm, 1)} mm</div></div>
            <div className="stat"><div className="label">Skala</div><div className="v">{fmtNum(optics.scaleArcsecPx, 2)}″/px</div></div>
            <div className="stat">
              <div className="label">Próbkowanie przy {fmtNum(eq.seeingArcsec, 1)}″</div>
              <div className="v" style={{ color: samp === 'optymalne' ? 'var(--ok)' : 'var(--warn)', fontSize: 16 }}>{samp}</div>
            </div>
          </div>
          <p className="dim" style={{ fontSize: 12, marginTop: 12 }}>
            Próbkowanie optymalne, gdy skala mieści się między 1/3 a 2/3 seeingu. Pole widzenia: 2·atan(matryca / 2F).
          </p>
        </section>

        <section className="card">
          <h2 className="panel-title">Jak mieszczą się popularne cele</h2>
          <table className="table">
            <tbody>
              {showcase.map((o) => {
                const fill = o.majArcmin / 60 / Math.max(optics.fovWdeg, optics.fovHdeg)
                return (
                  <tr key={o.i}>
                    <td className="mono">{o.id}</td>
                    <td className="dim">{displayName(o)}</td>
                    <td className="mono">{fmtSize(o.majArcmin, o.minArcmin)}</td>
                    <td style={{ width: '34%' }}>
                      <div className="progress" style={{ marginTop: 0 }}><div style={{ width: `${Math.min(100, fill * 100)}%`, background: fill > 1 ? 'var(--warn)' : undefined }} /></div>
                    </td>
                    <td className="mono" style={{ color: fill > 1 ? 'var(--warn)' : fill < 0.15 ? 'var(--text-dim)' : 'var(--ok)', whiteSpace: 'nowrap' }}>
                      {fill > 1 ? `mozaika ×${Math.ceil(fill)}` : `${Math.round(fill * 100)}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
