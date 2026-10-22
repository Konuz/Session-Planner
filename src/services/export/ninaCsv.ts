// Eksport CSV dla N.I.N.A. (7E) w formacie planu mozaiki Telescopius. Reguły importu z kodu N.I.N.A.
// (SimpleSequenceVM.ImportTargets): nagłówki bez względu na wielkość liter, InvariantCulture (separator `,`, kropka
// dziesiętna), kolumna `Pane` staje się nazwą celu, współrzędne J2000 z liczb wyciąganych wyrażeniem regularnym
// i minusem w dowolnym miejscu pola, kąt `Position Angle (East)` jako liczba modulo 360.
import type { EquipmentProfile, Framing } from '../../types'
import type { EquatorialDeg } from '../astroMath'
import { mosaicPanels, normalizeFraming } from '../framing'
import { pad2, raHours, secondsText, sexagesimal } from '../sexagesimal'

export const NINA_CSV_HEADER = 'Pane,RA,DEC,Position Angle (East)'

/** Jeden wiersz CSV: cel w N.I.N.A. */
export interface NinaPane {
  name: string
  center: EquatorialDeg
  /** Kąt od N przez E (konwencja z sekcji 4, zgodna z N.I.N.A. ≥ 3.0). */
  paDeg: number
}

/** RA jako `HH:MM:SS.ss`. */
export function formatRaNina(raDeg: number): string {
  const { whole, minutes, seconds } = raHours(raDeg, 2)
  return `${pad2(whole)}:${pad2(minutes)}:${secondsText(seconds, 2)}`
}

/** DEC jako `+DD:MM:SS.s`, znak zawsze (−0°30′ → `-00:30:00.0`). */
export function formatDecNina(decDeg: number): string {
  const { negative, whole, minutes, seconds } = sexagesimal(decDeg, 1)
  return `${negative ? '-' : '+'}${pad2(whole)}:${pad2(minutes)}:${secondsText(seconds, 1)}`
}

/** Kąt w [0, 360) z kropką: co najmniej jedno, najwyżej dwa miejsca po przecinku (30 → `30.0`, 3,7213 → `3.72`). */
export function formatPaNina(paDeg: number): string {
  // W setnych stopnia (liczby całkowite), żeby zawinięcie przez 360° nie dało 3.7200000000000273.
  const hundredths = ((Math.round(paDeg * 100) % 36000) + 36000) % 36000
  const text = String(hundredths / 100)
  return text.includes('.') ? text : `${text}.0`
}

/** Nazwa celu bez znaków, które zepsułyby kolumny CSV. */
function paneName(name: string): string {
  return name.replace(/[,"\r\n]/g, ' ').replace(/\s+/g, ' ').trim() || 'Cel'
}

export const MOSAIC_NEEDS_PROFILE = 'Mozaika wymaga zestawu sprzętu (wymiary matrycy i ogniskowa wyznaczają panele)'

/**
 * Panele kadru: 1×1 → jeden cel o nazwie obiektu ze środkiem i PA kadru (zestaw niepotrzebny), mozaika →
 * „<nazwa> Panel 1…n” w kolejności `mosaicPanels`, z lokalnym PA każdego panelu. Mozaika bez zestawu → wyjątek.
 */
export function ninaPanes(name: string, profile: EquipmentProfile | null, framing: Framing): NinaPane[] {
  const base = paneName(name)
  const normalized = normalizeFraming(framing)
  if (normalized.mosaic.cols * normalized.mosaic.rows === 1) {
    return [{ name: base, center: { raDeg: normalized.centerRaDeg, decDeg: normalized.centerDecDeg }, paDeg: normalized.paDeg }]
  }
  if (profile === null) throw new Error(MOSAIC_NEEDS_PROFILE)
  return mosaicPanels(profile, normalized).map((panel, i) => ({ name: `${base} Panel ${i + 1}`, center: panel.center, paDeg: panel.paDeg }))
}

/** Plik CSV: nagłówek i jeden wiersz na panel, końce linii CRLF, bez BOM. */
export function ninaCsv(panes: readonly NinaPane[]): string {
  const rows = panes.map(
    ({ name, center, paDeg }) => `${name},${formatRaNina(center.raDeg)},${formatDecNina(center.decDeg)},${formatPaNina(paDeg)}`,
  )
  return `${[NINA_CSV_HEADER, ...rows].join('\r\n')}\r\n`
}
