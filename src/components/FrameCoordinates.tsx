// Środek odpiętej ramki FOV na kopule: wartości na żywo podczas przeciągania i ręczne wpisanie jak w kadrowaniu.
import { useState } from 'react'
import type { Equatorial } from '../lib/astro'
import { parseDecCoordinate, parseRaCoordinate } from '../lib/coordinates'
import { fmtDec, fmtRa } from '../lib/format'

export function FrameCoordinates({ center, onApply }: { center: Equatorial; onApply: (center: Equatorial) => void }) {
  // Wpisywany tekst; bez niego pola pokazują bieżący środek ramki.
  const [draft, setDraft] = useState<{ ra: string; dec: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ra = draft?.ra ?? fmtRa(center.raDeg)
  const dec = draft?.dec ?? fmtDec(center.decDeg)
  const apply = () => {
    const raDeg = parseRaCoordinate(ra)
    const decDeg = parseDecCoordinate(dec)
    if (raDeg === null || decDeg === null) {
      setError('Nieprawidłowe współrzędne. Sprawdź format i zakres RA/Dec.')
      return
    }
    setError(null)
    setDraft(null)
    onApply({ raDeg, decDeg })
  }
  return (
    <form
      className="frame-coords"
      aria-label="Środek ramki"
      onSubmit={(e) => { e.preventDefault(); apply() }}
      // Wyjście z formularza bez zatwierdzenia porzuca wpis: pola znów śledzą ramkę.
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setDraft(null); setError(null) } }}
      onKeyDown={(e) => { if (e.key === 'Escape') { setDraft(null); setError(null) } }}
    >
      <span className="label">Środek ramki (J2000)</span>
      <div className="frame-coords-row">
        <input className="control figures" aria-label="RA środka ramki" placeholder="05h 34m 32s" value={ra} onChange={(e) => { setDraft({ ra: e.target.value, dec }); setError(null) }} />
        <input className="control figures" aria-label="Dec środka ramki" placeholder="−05° 23′ 28″" value={dec} onChange={(e) => { setDraft({ ra, dec: e.target.value }); setError(null) }} />
        <button type="submit" className="button small">Ustaw</button>
      </div>
      {error && <span role="alert" className="frame-coords-error">{error}</span>}
    </form>
  )
}
