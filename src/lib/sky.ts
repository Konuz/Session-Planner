// Dane nieba dla kopuły: gwiazdy, linie i nazwy gwiazdozbiorów, kotwice ilustracji.

export interface Constellation {
  abbr: string
  la: string
  pl: string
  /** [ra, dec, ranga] położenia etykiety. */
  label: [number, number, number] | null
  lines: [number, number][][]
  /** Ilustracja 384×384 px: kotwice [x, y, ra, dec] do transformacji afinicznej. */
  art: { file: string; anchors: [number, number, number, number][] } | null
}

export interface SkyData {
  /** Gwiazdy: Float32Array [ra, dec, mag, b-v] × n, od najjaśniejszej. */
  stars: Float32Array
  starCount: number
  constellations: Constellation[]
  byAbbr: Map<string, Constellation>
}

let pending: Promise<SkyData> | null = null

export function loadSky(): Promise<SkyData> {
  pending ??= fetch('/data/sky.json')
    .then((res) => {
      if (!res.ok) throw new Error(`Nie udało się wczytać danych nieba (HTTP ${res.status})`)
      return res.json() as Promise<{ stars: number[][]; constellations: Constellation[] }>
    })
    .then((data) => {
      const stars = new Float32Array(data.stars.length * 4)
      data.stars.forEach((s, i) => stars.set([s[0], s[1], s[2], s[3]], i * 4))
      return {
        stars,
        starCount: data.stars.length,
        constellations: data.constellations,
        byAbbr: new Map(data.constellations.map((c) => [c.abbr, c])),
      }
    })
  return pending
}
