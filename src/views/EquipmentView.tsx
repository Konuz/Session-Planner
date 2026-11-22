import { Check, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import cameras from '../data/cameras.json'
import reducers from '../data/reducers.json'
import telescopes from '../data/telescopes.json'
import { computeOptics, sampling } from '../lib/astro'
import { displayName } from '../lib/catalog'
import { fmtNum, fmtSize } from '../lib/format'
import { readOwnPhoto } from '../lib/ownPhotoStorage'
import { download } from '../lib/planExport'
import { Select } from '../components/Select'
import { useActionFeedback } from '../components/useActionFeedback'
import { backupFileName, backupText, parseBackup, restoreBackup } from '../state/backup'
import { useCatalog } from '../state/data'
import { useStore } from '../state/store'

const SHOWCASE = ['M 31', 'M 42', 'NGC 7000', 'M 33', 'M 51', 'M 27', 'M 13', 'NGC 6888']

function NumField({ label, value, onChange, step = 1, min = 0, unit }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; unit?: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className="field">
      <span className="label">{label}{unit ? ` [${unit}]` : ''}</span>
      <input
        className="control figures"
        type="number"
        step={step}
        min={min}
        value={draft ?? String(value)}
        onChange={(e) => {
          const raw = e.target.value
          setDraft(raw)
          const n = Number(raw)
          if (raw.trim() !== '' && Number.isFinite(n) && n > 0) onChange(n)
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  )
}

export default function EquipmentView() {
  const eq = useStore((s) => s.equipment)
  const set = useStore((s) => s.setEquipment)
  const equipmentSets = useStore((s) => s.equipmentSets)
  const activeEquipmentSetId = useStore((s) => s.activeEquipmentSetId)
  const addEquipmentSet = useStore((s) => s.addEquipmentSet)
  const removeEquipmentSet = useStore((s) => s.removeEquipmentSet)
  const selectEquipmentSet = useStore((s) => s.selectEquipmentSet)
  const renameEquipmentSet = useStore((s) => s.renameEquipmentSet)
  const activeSet = equipmentSets.find((item) => item.id === activeEquipmentSetId) ?? equipmentSets[0]
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const renameButton = useRef<HTMLButtonElement>(null)
  const savedTelescopes = useStore((s) => s.savedTelescopes)
  const savedCameras = useStore((s) => s.savedCameras)
  const addTelescope = useStore((s) => s.addTelescope)
  const removeTelescope = useStore((s) => s.removeTelescope)
  const addCamera = useStore((s) => s.addCamera)
  const removeCamera = useStore((s) => s.removeCamera)
  const savedTelescope = savedTelescopes.find((item) => item.id === eq.telescopeId)
  const savedCamera = savedCameras.find((item) => item.id === eq.cameraId)
  const { catalog } = useCatalog()
  const optics = useMemo(
    () => computeOptics({ apertureMm: eq.apertureMm, focalLengthMm: eq.focalLengthMm, reducer: eq.reducer, widthPx: eq.widthPx, heightPx: eq.heightPx, pixelUm: eq.pixelUm, binning: eq.binning }),
    [eq],
  )
  const samp = sampling(optics.scaleArcsecPx, eq.seeingArcsec)
  const showcase = useMemo(() => (catalog ? SHOWCASE.map((id) => catalog.find((o) => o.id === id)).filter((o) => o !== undefined) : []), [catalog])
  const renameLabel = nameDraft === null ? 'Zmień nazwę zestawu' : 'Zatwierdź nazwę zestawu'
  const { feedback, confirm: confirmAction } = useActionFeedback()
  const backupInput = useRef<HTMLInputElement>(null)
  const [restoring, setRestoring] = useState(false)
  const [backupMessage, setBackupMessage] = useState<{ text: string; error: boolean } | null>(null)

  const saveBackup = () => {
    const now = Date.now()
    download(backupFileName(now), backupText(now), 'application/json')
    confirmAction('backup', 'Rozpoczęto pobieranie kopii.')
  }
  const restore = async (file: File) => {
    setBackupMessage(null)
    setRestoring(true)
    try {
      const backup = parseBackup(await file.text())
      const date = new Date(backup.savedAtMs).toLocaleString('pl-PL')
      if (!confirm(`Przywrócić kopię z ${date}? Obecny plan, sprzęt, lokalizacje i ustawienia zostaną zastąpione.`)) return
      await restoreBackup(backup, async (id) => (await readOwnPhoto(id))?.photoId ?? null)
      setBackupMessage({ text: `Przywrócono kopię z ${date}.`, error: false })
    } catch (error) {
      setBackupMessage({ text: error instanceof Error ? error.message : 'Nie udało się przywrócić kopii.', error: true })
    } finally {
      setRestoring(false)
    }
  }

  const finishRenaming = (save: boolean) => {
    if (save && nameDraft !== null) renameEquipmentSet(nameDraft)
    setNameDraft(null)
    renameButton.current?.focus()
  }

  return (
    <div className="two-col equipment-view">
      <div className="col">
        <section className="card equipment-set">
          <h2 className="panel-title">
            <span className="equipment-set-name">{activeSet.name}</span>
            <button className="button small" onClick={() => { setNameDraft(null); addEquipmentSet() }}>Dodaj zestaw</button>
          </h2>
          <h3 className="panel-title">Teleskop <button className="button small" title="Zapisz bieżący teleskop jako własny model" aria-label="Dodaj własny teleskop" onClick={addTelescope}>Dodaj</button><button className="button small ghost" aria-label="Usuń własny teleskop" disabled={!savedTelescope} onClick={() => { if (savedTelescope && confirm(`Usunąć zapisany teleskop „${savedTelescope.name}”?`)) removeTelescope() }}>Usuń</button></h3>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="label" htmlFor="telescope-model">Model</label>
              <div className="equipment-telescope-model">
                <Select
                  id="telescope-model"
                  className="control"
                  value={savedTelescope || telescopes.some((t) => t.id === eq.telescopeId) ? eq.telescopeId : 'custom'}
                  ariaLabel="Model teleskopu"
                  options={[
                    ...savedTelescopes.map((t) => ({ value: t.id, label: `${t.name} - ${t.apertureMm}/${t.focalLengthMm}`, group: 'Moje teleskopy' })),
                    ...telescopes.map((t) => ({ value: t.id, label: `${t.brand} ${t.model} - ${t.apertureMm}/${t.focalLengthMm}` })),
                    {
                      value: 'custom',
                      label: eq.telescopeId === 'custom' ? `${eq.telescopeName.trim() || 'Własny teleskop'} - ${eq.apertureMm}/${eq.focalLengthMm}` : 'Własny…',
                    },
                  ]}
                  onChange={(v) => {
                    const t = telescopes.find((x) => x.id === v)
                    const own = savedTelescopes.find((x) => x.id === v)
                    if (own) set({ telescopeId: own.id, telescopeName: own.name, apertureMm: own.apertureMm, focalLengthMm: own.focalLengthMm, reducer: own.reducer })
                    else if (t) set({ telescopeId: t.id, telescopeName: `${t.brand} ${t.model}`, apertureMm: t.apertureMm, focalLengthMm: t.focalLengthMm })
                    else set({ telescopeId: 'custom', telescopeName: 'Własny teleskop' })
                  }}
                />
                {(eq.telescopeId === 'custom' || savedTelescope) && (
                  <button
                    className="button small icon-button"
                    type="button"
                    title="Zmień nazwę teleskopu"
                    aria-label="Zmień nazwę teleskopu"
                    onClick={() => {
                      const telescopeName = prompt('Nazwa teleskopu', eq.telescopeName)?.trim()
                      if (telescopeName) set({ telescopeName })
                    }}
                  >
                    <Pencil size={16} aria-hidden />
                  </button>
                )}
              </div>
            </div>
            <NumField label="Apertura" unit="mm" value={eq.apertureMm} onChange={(v) => set({ apertureMm: v, telescopeId: savedTelescope ? eq.telescopeId : 'custom' })} />
            <NumField label="Ogniskowa" unit="mm" value={eq.focalLengthMm} onChange={(v) => set({ focalLengthMm: v, telescopeId: savedTelescope ? eq.telescopeId : 'custom' })} />
            <label className="field">
              <span className="label">Reduktor / korektor</span>
              <Select
                className="control"
                value={String(eq.reducer)}
                ariaLabel="Reduktor / korektor"
                options={reducers.map((r) => ({ value: String(r.factor), label: `×${r.factor}` }))}
                onChange={(v) => set({ reducer: Number(v) })}
              />
            </label>
          </div>
          <h3 className="panel-title">Kamera <button className="button small" title="Zapisz bieżącą kamerę jako własny model" aria-label="Dodaj własną kamerę" onClick={addCamera}>Dodaj</button><button className="button small ghost" aria-label="Usuń własną kamerę" disabled={!savedCamera} onClick={() => { if (savedCamera && confirm(`Usunąć zapisaną kamerę „${savedCamera.name}”?`)) removeCamera() }}>Usuń</button></h3>
          <div className="form-grid">
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span className="label">Model</span>
              <Select
                className="control"
                value={savedCamera || cameras.some((c) => c.id === eq.cameraId) ? eq.cameraId : 'custom'}
                ariaLabel="Model kamery"
                options={[
                  ...savedCameras.map((c) => ({ value: c.id, label: `${c.name} - ${c.mono ? 'mono' : 'kolor'}`, group: 'Moje kamery' })),
                  ...cameras.map((c) => ({ value: c.id, label: `${c.brand} ${c.model} - ${c.sensorModel ? `${c.sensorModel}, ` : ''}${c.sensor === 'mono' ? 'mono' : 'kolor'}` })),
                  { value: 'custom', label: 'Własna…' },
                ]}
                onChange={(v) => {
                  const c = cameras.find((x) => x.id === v)
                  const own = savedCameras.find((x) => x.id === v)
                  if (own) set({ cameraId: own.id, cameraName: own.name, widthPx: own.widthPx, heightPx: own.heightPx, pixelUm: own.pixelUm, binning: own.binning, mono: own.mono })
                  else if (c) set({ cameraId: c.id, cameraName: `${c.brand} ${c.model}`, widthPx: c.resolutionXPx, heightPx: c.resolutionYPx, pixelUm: c.pixelSizeUm, mono: c.sensor === 'mono' })
                  else set({ cameraId: 'custom', cameraName: 'Własna kamera' })
                }}
              />
            </label>
            {(eq.cameraId === 'custom' || savedCamera) && <label className="field" style={{ gridColumn: '1 / -1' }}><span className="label">Nazwa</span><input className="control" value={eq.cameraName} onChange={(e) => set({ cameraName: e.target.value })} onBlur={() => set({ cameraName: eq.cameraName.trim() || 'Własna kamera' })} /></label>}
            <NumField label="Szerokość" unit="px" value={eq.widthPx} onChange={(v) => set({ widthPx: v, cameraId: savedCamera ? eq.cameraId : 'custom' })} />
            <NumField label="Wysokość" unit="px" value={eq.heightPx} onChange={(v) => set({ heightPx: v, cameraId: savedCamera ? eq.cameraId : 'custom' })} />
            <NumField label="Piksel" unit="µm" step={0.01} value={eq.pixelUm} onChange={(v) => set({ pixelUm: v, cameraId: savedCamera ? eq.cameraId : 'custom' })} />
            {(eq.cameraId === 'custom' || savedCamera) && <label className="field"><span className="label">Matryca</span><Select className="control" value={eq.mono ? 'mono' : 'color'} ariaLabel="Matryca" options={[{ value: 'mono', label: 'Mono' }, { value: 'color', label: 'Kolor' }]} onChange={(v) => set({ mono: v === 'mono' })} /></label>}
            <label className="field">
              <span className="label">Binning</span>
              <Select
                className="control"
                value={String(eq.binning)}
                ariaLabel="Binning"
                options={[1, 2, 3, 4].map((b) => ({ value: String(b), label: `${b}×${b}` }))}
                onChange={(v) => set({ binning: Number(v) })}
              />
            </label>
            <NumField label="Seeing" unit="″" step={0.1} value={eq.seeingArcsec} onChange={(v) => set({ seeingArcsec: v })} />
          </div>
        </section>
      </div>

      <div className="col">
        <section className="card">
          <h2 className="panel-title">Parametry zestawu <span className="sub">{eq.telescopeName} + {eq.cameraName}</span></h2>
          <div className="equipment-set-picker">
            {nameDraft === null ? (
              <Select
                className="control"
                ariaLabel="Aktywny zestaw"
                value={activeEquipmentSetId}
                options={equipmentSets.map((item) => ({ value: item.id, label: item.name }))}
                onChange={(v) => selectEquipmentSet(v)}
              />
            ) : (
              <input
                autoFocus
                className="control"
                aria-label="Nazwa zestawu"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== 'Escape') return
                  e.preventDefault()
                  finishRenaming(e.key === 'Enter')
                }}
              />
            )}
            <button
              className="button small icon-button"
              type="button"
              ref={renameButton}
              title={renameLabel}
              aria-label={renameLabel}
              onClick={() => nameDraft === null ? setNameDraft(activeSet.name) : finishRenaming(true)}
            >
              {nameDraft === null ? <Pencil size={16} aria-hidden /> : <Check size={16} aria-hidden />}
            </button>
            <button
              className="button ghost icon-button"
              style={{ color: 'var(--bad)' }}
              type="button"
              title="Usuń zestaw"
              aria-label="Usuń zestaw"
              disabled={equipmentSets.length === 1}
              onClick={() => {
                if (!confirm(`Usunąć zestaw „${activeSet.name}”?`)) return
                setNameDraft(null)
                removeEquipmentSet()
              }}
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="stat-grid">
            <div className="stat"><div className="label">Ogniskowa efektywna</div><div className="v">{fmtNum(optics.focalMm, 0)} mm</div></div>
            <div className="stat"><div className="label">Światłosiła</div><div className="v">f/{fmtNum(optics.fRatio, 2)}</div></div>
            <div className="stat"><div className="label">Pole widzenia</div><div className="v">{fmtNum(optics.fovWdeg, 2)}° × {fmtNum(optics.fovHdeg, 2)}°</div></div>
            <div className="stat"><div className="label">Matryca</div><div className="v">{fmtNum(optics.sensorWmm, 1)} × {fmtNum(optics.sensorHmm, 1)} mm</div></div>
            <div className="stat"><div className="label">Skala</div><div className="v">{fmtNum(optics.scaleArcsecPx, 2)}″/px</div></div>
            <div className="stat">
              <div className="label">Próbkowanie przy {fmtNum(eq.seeingArcsec, 1)}″</div>
              <div className="v" style={{ color: samp === 'optymalne' ? 'var(--ok)' : 'var(--warn)' }}>{samp}</div>
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

        <section className="card">
          <h2 className="panel-title">Kopia zapasowa</h2>
          <p className="dim" style={{ fontSize: 12 }}>
            Plik JSON z planem, lokalizacjami, zestawami sprzętu, horyzontem, ulubionymi i ustawieniami. Nie zawiera zdjęć własnych ani projektu Obserwatorium 3D.
          </p>
          <div className="backup-actions">
            <button className="button primary" data-confirmed={feedback?.action === 'backup' || undefined} onClick={saveBackup}>Zapisz kopię</button>
            <button className="button" disabled={restoring} onClick={() => backupInput.current?.click()}>{restoring ? 'Przywracanie…' : 'Przywróć kopię'}</button>
            <input ref={backupInput} type="file" accept=".json,application/json" hidden onChange={async (event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (file) await restore(file)
            }} />
            <span className="action-status" role="status">{feedback?.message}</span>
          </div>
          {backupMessage && <p className={backupMessage.error ? undefined : 'dim'} role={backupMessage.error ? 'alert' : 'status'} style={{ fontSize: 12, marginTop: 12, color: backupMessage.error ? 'var(--warn)' : undefined }}>{backupMessage.text}</p>}
        </section>
      </div>
    </div>
  )
}
