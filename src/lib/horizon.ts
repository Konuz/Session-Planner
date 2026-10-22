// Własny horyzont: punkty (azymut, wysokość), interpolacja i plik w formacie N.I.N.A. / Stellarium (pary „az alt”).
import { normDeg } from './astro'

export interface HorizonPoint {
  azDeg: number
  altDeg: number
}

/** Sortuje po azymucie w [0, 360); przy powtórzonym azymucie wygrywa ostatni punkt. */
export function normalizeHorizon(points: readonly HorizonPoint[]): HorizonPoint[] {
  const byAz = new Map<number, number>()
  for (const p of points) byAz.set(Math.round(normDeg(p.azDeg) * 100) / 100, p.altDeg)
  return [...byAz.entries()].sort(([a], [b]) => a - b).map(([azDeg, altDeg]) => ({ azDeg, altDeg }))
}

/** Wysokość horyzontu dla azymutu: interpolacja liniowa z zawinięciem przez 360°; brak punktów = 0°. */
export function horizonAltitude(horizon: readonly HorizonPoint[], azDeg: number): number {
  if (horizon.length === 0) return 0
  if (horizon.length === 1) return horizon[0].altDeg
  const az = normDeg(azDeg)
  const nextIndex = Math.max(0, horizon.findIndex((p) => p.azDeg > az))
  const next = horizon[nextIndex]
  const prev = horizon[(nextIndex - 1 + horizon.length) % horizon.length]
  const span = normDeg(next.azDeg - prev.azDeg)
  if (span === 0) return prev.altDeg
  return prev.altDeg + (normDeg(az - prev.azDeg) / span) * (next.altDeg - prev.altDeg)
}

export interface ParsedHorizon {
  points: HorizonPoint[]
  rejected: number[]
  error: string | null
}

/** Parser pliku: separatory spacja, tabulator, „,”, „;”; „#” rozpoczyna komentarz. */
export function parseHorizon(text: string): ParsedHorizon {
  const points: HorizonPoint[] = []
  const rejected: number[] = []
  text.replace(/^﻿/, '').split(/\r\n|\r|\n/).forEach((raw, i) => {
    const line = raw.split('#')[0].trim()
    if (!line) return
    const tokens = line.split(/[\s,;]+/).filter(Boolean)
    const nums = tokens.map(Number)
    if (tokens.length !== 2 || nums.some((n) => !Number.isFinite(n)) || nums[1] < -5 || nums[1] > 90) rejected.push(i + 1)
    else points.push({ azDeg: nums[0], altDeg: nums[1] })
  })
  const normalized = normalizeHorizon(points)
  return { points: normalized, rejected, error: normalized.length < 2 ? 'Plik musi zawierać co najmniej 2 poprawne punkty „azymut wysokość”' : null }
}

export function exportHorizon(points: readonly HorizonPoint[], title: string): string {
  const h = normalizeHorizon(points)
  if (h.length > 0 && h[0].azDeg !== 0) h.unshift({ azDeg: 0, altDeg: Math.round(horizonAltitude(h, 0) * 100) / 100 })
  const fmt = (v: number) => String(Math.round(v * 100) / 100)
  return [`# Horyzont: ${title}`, '# Az Alt', ...h.map((p) => `${fmt(p.azDeg)} ${fmt(p.altDeg)}`)].join('\n') + '\n'
}
