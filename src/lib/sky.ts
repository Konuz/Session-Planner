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

/** Jasność Drogi Mlecznej: siatka RA 0…360° × Dec +90…−90° (wiersze od północy), wartości 0–255. */
export interface MilkyWay {
  w: number
  h: number
  data: Uint8Array
}

let pendingMw: Promise<MilkyWay> | null = null

export function loadMilkyWay(): Promise<MilkyWay> {
  pendingMw ??= new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      // Jednorazowy odczyt pikseli: płótno na CPU, bez synchronicznego odczytu z GPU (C23).
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0)
      const rgba = ctx.getImageData(0, 0, c.width, c.height).data
      const data = new Uint8Array(c.width * c.height)
      for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4]
      resolve({ w: c.width, h: c.height, data })
    }
    img.onerror = () => reject(new Error('Nie udało się wczytać mapy Drogi Mlecznej'))
    img.src = '/data/milkyway.png'
  })
  return pendingMw
}
