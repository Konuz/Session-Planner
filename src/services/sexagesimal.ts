// Zapis sześćdziesiątkowy (HMS/DMS), wspólny dla eksportu do N.I.N.A. (7E) i widoku projektu.
import { normalizeDeg } from './astroMath'

export interface Sexagesimal {
  /** Znak wartości po zaokrągleniu (wartość, która zaokrągla się do zera, nie jest ujemna). */
  negative: boolean
  whole: number
  minutes: number
  seconds: number
}

/**
 * |value| jako całość, minuty i sekundy zaokrąglone do `digits` miejsc po przecinku, z przeniesieniem
 * (59,996″ przy 2 miejscach → pełna minuta). Liczone w liczbach całkowitych, bez błędów zaokrągleń.
 */
export function sexagesimal(value: number, digits: number): Sexagesimal {
  const scale = 10 ** digits
  const total = Math.round(Math.abs(value) * 3600 * scale)
  const whole = Math.floor(total / (3600 * scale))
  const rest = total - whole * 3600 * scale
  const minutes = Math.floor(rest / (60 * scale))
  return { negative: value < 0 && total > 0, whole, minutes, seconds: (rest - minutes * 60 * scale) / scale }
}

/** RA w godzinach [0, 24) z RA w stopniach; zaokrąglenie do 24 h daje 0 h. */
export function raHours(raDeg: number, digits: number): Sexagesimal {
  const hms = sexagesimal(normalizeDeg(raDeg) / 15, digits)
  return hms.whole === 24 ? { ...hms, whole: 0 } : hms
}

export const pad2 = (value: number) => String(value).padStart(2, '0')

/** Sekundy z zerem wiodącym i stałą liczbą miejsc, np. 9,5 → „09.50” (separator dziesiętny do wyboru). */
export function secondsText(seconds: number, digits: number, decimalSeparator = '.'): string {
  const [whole, fraction] = seconds.toFixed(digits).split('.')
  return fraction === undefined ? pad2(Number(whole)) : `${pad2(Number(whole))}${decimalSeparator}${fraction}`
}
