import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { CONSTELLATION_PL } from '../src/lib/constellations.ts'

const STELLARIUM_REV = '7161aebe7f2ecbdb0a66b7a489076d36e52851a8'
const D3CELESTIAL_REV = '7e720a3de062059d4c5400a379146a601d9010e0'

interface StellariumConstellation {
  id: string
  lines: number[][]
  image?: { file: string; size: [number, number]; anchors: { pos: [number, number]; hip: number }[] }
  common_name: { english: string; native: string }
}

const r = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d

export interface SkyBuildDeps {
  outDir: string
  cached(name: string, url: string): Promise<string>
  cachedBinary(name: string, url: string): Promise<Buffer>
  vizier(name: string, query: string): Promise<string>
}

export async function buildSky({ outDir, cached, cachedBinary, vizier }: SkyBuildDeps) {
  const ST = `https://raw.githubusercontent.com/Stellarium/stellarium/${STELLARIUM_REV}`
  const D3C = `https://raw.githubusercontent.com/ofrohn/d3-celestial/${D3CELESTIAL_REV}/data`
  const stars = JSON.parse(await cached('d3c-stars.6.json', `${D3C}/stars.6.json`)) as {
    features: { id: number; properties: { mag: number; bv: string }; geometry: { coordinates: [number, number] } }[]
  }
  const starNames = JSON.parse(await cached('d3c-starnames.json', `${D3C}/starnames.json`)) as Record<number, { name?: string; bayer?: string; flam?: string; c?: string }>
  const labels = JSON.parse(await cached('d3c-constellations.json', `${D3C}/constellations.json`)) as {
    features: { id: string; properties: { rank: string }; geometry: { coordinates: [number, number] } }[]
  }
  const modern = JSON.parse(await cached('st-modern-index.json', `${ST}/skycultures/modern/index.json`)) as {
    constellations: StellariumConstellation[]
  }

  const byHip = new Map<number, [number, number, number]>()
  for (const f of stars.features) {
    const [lon, lat] = f.geometry.coordinates
    byHip.set(f.id, [(lon + 360) % 360, lat, f.properties.mag])
  }
  const needed = new Set<number>()
  for (const c of modern.constellations) {
    for (const line of c.lines) for (const hip of line) needed.add(hip)
    for (const a of c.image?.anchors ?? []) needed.add(a.hip)
  }
  const missing = [...needed].filter((hip) => !byHip.has(hip))
  if (missing.length) {
    const tsv = await vizier('hip-missing', `-source=I/239/hip_main&-out=HIP,_RA.icrs,_DE.icrs,Vmag&-oc.form=d&HIP=${missing.join(',')}`)
    for (const line of tsv.split('\n')) {
      const cols = line.trim().split(/\t/)
      if (cols.length >= 4 && /^\d+$/.test(cols[0].trim())) byHip.set(Number(cols[0]), [Number(cols[1]), Number(cols[2]), Number(cols[3])])
    }
  }

  const lineHips = [...new Set(modern.constellations.flatMap((c) => c.lines.flat()))]
  const distances = new Map<number, number>()
  for (let i = 0; i < lineHips.length; i += 100) {
    const parallaxes = await vizier(`hip-constellation-parallax-${i}`, `-source=I/239/hip_main&-out=HIP,Plx&HIP=${lineHips.slice(i, i + 100).join(',')}`)
    for (const line of parallaxes.split('\n')) {
      const cols = line.trim().split(/\t/)
      if (!/^\d+$/.test(cols[0]?.trim())) continue
      const parallax = Number(cols[1])
      if (Number.isFinite(parallax) && parallax > 0) distances.set(Number(cols[0]), 3261.56 / parallax)
    }
  }
  if (!distances.size) throw new Error('Brak paralaks Hipparcosa dla gwiazdozbiorów 3D')
  writeFileSync(join(outDir, 'constellations3d.json'), JSON.stringify({
    source: 'Nazwy: d3-celestial (BSD); odległości: Hipparcos I/239 (CDS); linie: Stellarium modern (CC BY-SA 4.0)',
    constellations: modern.constellations.map((c) => {
      const abbr = c.id.split(' ')[2]
      return {
        abbr,
        lines: c.lines.map((line) => line.map((hip) => {
          const star = byHip.get(hip)
          const dist = distances.get(hip)
          return star && dist ? [r(star[0], 3), r(star[1], 3), r(dist, 2)] : null
        })),
        stars: [...new Set(c.lines.flat())].flatMap((hip) => {
          const star = byHip.get(hip)
          const dist = distances.get(hip)
          const names = starNames[hip]
          if (names?.c && names.c !== abbr) return []
          const name = names?.name?.trim() || (names?.bayer ? `${names.bayer} ${abbr}` : names?.flam ? `${names.flam} ${abbr}` : '')
          return star && dist && name ? [{ raDeg: r(star[0], 3), decDeg: r(star[1], 3), distLy: r(dist, 2), name }] : []
        }),
      }
    }),
  }))

  const starRows = stars.features
    .map((f) => {
      const [ra, dec, mag] = byHip.get(f.id)!
      const bv = Number.parseFloat(f.properties.bv)
      return [r(ra, 3), r(dec, 3), r(mag, 2), Number.isFinite(bv) ? r(bv, 2) : 0.6, f.id]
    })
    .sort((a, b) => a[2] - b[2])

  const labelPos = new Map(labels.features.map((f) => [f.id, [r((f.geometry.coordinates[0] + 360) % 360, 2), r(f.geometry.coordinates[1], 2), Number(f.properties.rank)]]))

  const constellations = []
  for (const c of modern.constellations) {
    const abbr = c.id.split(' ')[2]
    const lines = c.lines.map((line) => line.map((hip) => byHip.get(hip)).filter((p) => p !== undefined).map(([ra, dec]) => [r(ra, 3), r(dec, 3)]))
    let art = null
    if (c.image) {
      const file = `${abbr}.webp`
      const target = join(outDir, 'art', file)
      if (!existsSync(target)) {
        const png = await cachedBinary(`art-${abbr}.png`, `${ST}/skycultures/modern/${c.image.file}`)
        const { data, info } = await sharp(png).greyscale().resize(384, 384, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
        const rgba = Buffer.alloc(info.width * info.height * 4)
        for (let i = 0; i < info.width * info.height; i++) {
          rgba[i * 4] = 225
          rgba[i * 4 + 1] = 245
          rgba[i * 4 + 2] = 255
          rgba[i * 4 + 3] = Math.min(255, Math.round(data[i * info.channels] * 2.4))
        }
        await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 70, alphaQuality: 60 }).toFile(target)
      }
      const scale = 384 / c.image.size[0]
      art = {
        file,
        anchors: c.image.anchors.map((a) => {
          const [ra, dec] = byHip.get(a.hip)!
          return [r(a.pos[0] * scale, 1), r(a.pos[1] * (384 / c.image!.size[1]), 1), r(ra, 3), r(dec, 3)]
        }),
      }
    }
    constellations.push({
      abbr,
      la: c.common_name.native,
      pl: CONSTELLATION_PL[abbr] ?? c.common_name.native,
      label: labelPos.get(abbr) ?? null,
      lines,
      art,
    })
  }
  writeFileSync(join(outDir, 'sky.json'), JSON.stringify({ v: 1, stars: starRows, constellations }))
  const noPl = constellations.filter((c) => c.pl === c.la).map((c) => c.abbr)
  console.log(`sky: ${starRows.length} gwiazd, ${constellations.length} gwiazdozbiorów, ${constellations.filter((c) => c.art).length} ilustracji; nazwa PL = łacińska: ${noPl.join(' ')}`)
}

const ONGC_TAG = 'v20260501'
const REGIONS = new Map([
  ['Antlia', 'Pompa'], ['Cepheus', 'Cefeusz'], ['CoronaAustralis', 'Korona Południowa'], ['Cygnus', 'Łabędź'],
  ['LMC', 'Wielki Obłok Magellana'], ['Orion', 'Orion'], ['Puppis', 'Rufa'], ['Scorpion', 'Skorpion'], ['Vela', 'Żagiel'],
])
const LARGE_LV1_DEG = 2
const SIMPLIFY_DEG = 0.005

type RaDec = [number, number]

function parseAladin(tsv: string): RaDec[][] {
  const rings: RaDec[][] = [[]]
  for (const line of tsv.split('\n').slice(1)) {
    const cols = line.split('\t')
    if (cols.length < 4) continue
    const ring = rings[rings.length - 1]
    const p: RaDec = [Number(cols[2]), Number(cols[3])]
    const last = ring[ring.length - 1]
    if (!last || last[0] !== p[0] || last[1] !== p[1]) ring.push(p)
    if (cols[1] === '*') rings.push([])
  }
  return rings.filter((ring) => ring.length >= 3)
}

function ringBounds(ring: RaDec[]): { centre: RaDec; radiusDeg: number } {
  const D = Math.PI / 180
  let x = 0, y = 0, z = 0
  for (const [ra, dec] of ring) {
    x += Math.cos(dec * D) * Math.cos(ra * D)
    y += Math.cos(dec * D) * Math.sin(ra * D)
    z += Math.sin(dec * D)
  }
  const n = Math.hypot(x, y, z)
  const centre: RaDec = [((Math.atan2(y, x) / D) + 360) % 360, Math.asin(z / n) / D]
  let radiusDeg = 0
  for (const [ra, dec] of ring) {
    const c = Math.sin(dec * D) * Math.sin(centre[1] * D) + Math.cos(dec * D) * Math.cos(centre[1] * D) * Math.cos((ra - centre[0]) * D)
    radiusDeg = Math.max(radiusDeg, Math.acos(Math.min(1, c)) / D)
  }
  return { centre, radiusDeg }
}

function simplify(ring: RaDec[], centre: RaDec, tol: number): RaDec[] {
  const cosDec = Math.cos(centre[1] * Math.PI / 180)
  const xy = ring.map(([ra, dec]) => [(((ra - centre[0] + 540) % 360) - 180) * cosDec, dec - centre[1]])
  const keep = new Uint8Array(ring.length)
  keep[0] = keep[ring.length - 1] = 1
  const stack: [number, number][] = [[0, ring.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = xy[a], [bx, by] = xy[b]
    const len = Math.hypot(bx - ax, by - ay)
    let best = -1, bestD = tol
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i]
      const d = len > 0 ? Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len : Math.hypot(px - ax, py - ay)
      if (d > bestD) { bestD = d; best = i }
    }
    if (best >= 0) {
      keep[best] = 1
      stack.push([a, best], [best, b])
    }
  }
  return ring.filter((_, i) => keep[i])
}

function angularDistance(a: RaDec, b: RaDec): number {
  const D = Math.PI / 180
  const c = Math.sin(a[1] * D) * Math.sin(b[1] * D) + Math.cos(a[1] * D) * Math.cos(b[1] * D) * Math.cos((a[0] - b[0]) * D)
  return Math.acos(Math.min(1, c)) / D
}

function insideRing(ring: RaDec[], centre: RaDec, ra: number, dec: number): boolean {
  const cosDec = Math.cos(centre[1] * Math.PI / 180)
  const xy = (a: number, d: number) => [(((a - centre[0] + 540) % 360) - 180) * cosDec, d - centre[1]]
  const [px, py] = xy(ra, dec)
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = xy(...ring[i]), [xj, yj] = xy(...ring[j])
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function outlineId(base: string): string {
  const m = /^(NGC|IC|LBN|M|C)0*(\d+[A-Z]?)$/.exec(base)
  return m ? `${m[1]} ${m[2]}` : base
}

export interface OverlayBuildDeps {
  rootDir: string
  cacheDir: string
  outDir: string
  cached(name: string, url: string): Promise<string>
  cachedBinary(name: string, url: string): Promise<Buffer>
}

export async function buildOutlines({ rootDir, outDir, cached }: OverlayBuildDeps) {
  const list = JSON.parse(
    await cached('ongc-outlines-list.json', `https://api.github.com/repos/mattiaverga/OpenNGC/contents/outlines/objects?ref=${ONGC_TAG}`),
  ) as { name: string }[]
  const files = new Map<string, Map<number, string>>()
  for (const { name } of list) {
    const m = /^(.+?)_lv(\d)\.txt$/.exec(name)
    if (!m) continue
    if (!files.has(m[1])) files.set(m[1], new Map())
    files.get(m[1])!.set(Number(m[2]), name)
  }

  const catalogRows = (JSON.parse(readFileSync(join(outDir, 'catalog.json'), 'utf8')) as { rows: [string, string, string, string, string, number, number, number][] }).rows
  const nebulae = catalogRows.filter((row) => ['EN', 'RN', 'SNR', 'CN'].includes(row[4]))
  const assigned: string[] = []

  const objects = []
  let points = 0
  const largeLv1: string[] = []
  for (const [base, levels] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    const picked = (REGIONS.has(base) ? [2] : [2, 3]).filter((lv) => levels.has(lv))
    if (levels.has(1)) picked.push(1)
    for (const level of picked) {
      const name = levels.get(level)!
      const raw = parseAladin(await cached(`ongc-${name}`, `https://raw.githubusercontent.com/mattiaverga/OpenNGC/${ONGC_TAG}/outlines/objects/${name}`))
      const bounds = raw.map(ringBounds)
      const extra = level === 1 && picked[0] !== 1
      if (extra && !REGIONS.has(base) && Math.max(...bounds.map((b) => b.radiusDeg)) < LARGE_LV1_DEG) continue
      if (extra) largeLv1.push(base)
      const rings = raw.map((ring, i) => simplify(ring, bounds[i].centre, SIMPLIFY_DEG).flatMap(([ra, dec]) => [r(ra, 3), r(dec, 3)]))
      points += rings.reduce((s, ring) => s + ring.length / 2, 0)
      if (!REGIONS.has(base)) {
        objects.push({ id: outlineId(base), level, rings })
        continue
      }
      raw.forEach((ring, i) => {
        const { centre, radiusDeg } = bounds[i]
        const inside = nebulae.filter((row) => {
          if (insideRing(ring, centre, row[5], row[6])) return true
          const objR = row[7] / 120
          return objR >= radiusDeg && objR <= 2 * radiusDeg && angularDistance(centre, [row[5], row[6]]) + radiusDeg <= objR * 1.1
        })
        const best = inside.sort((a, b) => b[7] - a[7])[0]
        if (best) assigned.push(`${base}#${i}→${best[0]}`)
        objects.push(best ? { id: best[0], level, rings: [rings[i]] } : { id: base, level, region: REGIONS.get(base), rings: [rings[i]] })
      })
    }
  }
  console.log(`outlines: pierścienie regionów: ${assigned.join(' ')}`)

  const darkPath = join(rootDir, 'scripts', 'data', 'dark-outlines.json')
  let darkCount = 0
  if (existsSync(darkPath)) {
    const dark = JSON.parse(readFileSync(darkPath, 'utf8')) as {
      objects: { id: string; also: string[]; name: string | null; bright?: boolean; replace?: boolean; level?: 1 | 2 | 3; rings: [number, number][][]; holes?: [number, number][][][] }[]
    }
    const replaced = new Set(dark.objects.filter((d) => d.replace).map((d) => d.id))
    for (let i = objects.length - 1; i >= 0; i--) if (replaced.has(objects[i].id)) objects.splice(i, 1)
    for (const d of dark.objects) {
      const rings = d.rings.map((ring) => ring.flatMap(([ra, dec]) => [r(ra, 4), r(dec, 4)]))
      const holes = d.holes?.map((group) => group.map((ring) => ring.flatMap(([ra, dec]) => [r(ra, 4), r(dec, 4)])))
      points += rings.reduce((s, ring) => s + ring.length / 2, 0)
      objects.push({ id: d.id, level: d.level ?? 2, ...(d.bright ? {} : { dark: 1 }), ...(d.also.length ? { also: d.also } : {}), ...(d.name ? { name: d.name } : {}), rings, ...(holes ? { holes } : {}) })
      if (!d.bright) darkCount++
    }
  }
  writeFileSync(
    join(outDir, 'outlines.json'),
    JSON.stringify({
      v: 1,
      source: {
        url: `https://github.com/mattiaverga/OpenNGC/tree/${ONGC_TAG}/outlines`,
        licence: 'CC-BY-SA-4.0',
        credit: 'OpenNGC, Mattia Verga; obrysy na DSS2 w Aladin (CDS, Strasbourg)',
        changes: `Poziomy 2 i 3 (bez nich 1) oraz poziom 1 regionów i obrysów o promieniu ≥ ${LARGE_LV1_DEG}°; pierścienie regionów przypisane do największej mgławicy katalogu w środku; uproszczone do ${SIMPLIFY_DEG}°, zaokrąglone do 0,001°.`,
      },
      darkSource: 'Kontury własne: wcześniejsze obrysy SAM 3 oraz zaakceptowane warstwy wyznaczone z map DSS, Planck, IRIS i atlasu Dobashiego; źródła i metoda poszczególnych obiektów w scripts/data/dark-outlines.json.',
      objects,
    }),
  )
  console.log(`outlines: ${objects.length} obrysów (w tym ${darkCount} mgławic ciemnych), ${points} wierzchołków; poziom 1 dodatkowo: ${largeLv1.join(' ')}`)
}

export async function buildMilkyWay({ outDir, cached }: OverlayBuildDeps) {
  const mw = JSON.parse(await cached('d3c-mw.json', `https://raw.githubusercontent.com/ofrohn/d3-celestial/${D3CELESTIAL_REV}/data/mw.json`)) as {
    features: { id: string; geometry: { coordinates: [number, number][][][] } }[]
  }
  const W = 720
  const H = 360
  const levels = new Uint8Array(W * H)
  for (const f of mw.features) {
    const edges: [number, number, number, number][] = []
    for (const ring of f.geometry.coordinates.flat()) {
      for (let i = 0; i < ring.length; i++) {
        const [a0, d0] = ring[i]
        let [a1, d1] = ring[(i + 1) % ring.length]
        if (a1 - a0 > 180) a1 -= 360
        else if (a0 - a1 > 180) a1 += 360
        edges.push([a0, d0, a1, d1])
      }
    }
    for (let x = 0; x < W; x++) {
      const ra = (x + 0.5) / 2
      const lon = ra > 180 ? ra - 360 : ra
      const decs: number[] = []
      for (const [a0, d0, a1, d1] of edges) {
        for (const l of [lon, lon - 360, lon + 360]) {
          if (a0 > l === a1 > l) continue
          decs.push(d0 + ((l - a0) / (a1 - a0)) * (d1 - d0))
        }
      }
      decs.sort((p, q) => q - p)
      let k = 0
      for (let y = 0; y < H; y++) {
        const dec = 90 - (y + 0.5) / 2
        while (k < decs.length && decs[k] > dec) k++
        if (k % 2) levels[y * W + x]++
      }
    }
  }
  const pixels = Buffer.from(levels.map((n) => Math.min(255, n * 51)))
  await sharp(pixels, { raw: { width: W, height: H, channels: 1 } }).blur(2).png({ compressionLevel: 9 }).toFile(join(outDir, 'milkyway.png'))
  console.log(`milkyway: ${W}×${H}, piksele z pasem: ${levels.filter((n) => n > 0).length}`)
}

const HIPS_FIELDS: { name: string; ra: number; dec: number; tiles: number[] }[] = [
  { name: 'm27', ra: 299.9016, dec: 22.721, tiles: [51927, 51932, 51933, 51935, 52104] },
  { name: 'ngc188', ra: 12.11, dec: 85.255, tiles: [16301, 16306, 16307, 16312, 16313] },
  { name: 'ngc253', ra: 11.888, dec: -25.288, tiles: [66615, 66621, 66658, 66664] },
  { name: 'ngc7814', ra: 0.8125, dec: 16.145, tiles: [78789, 78791, 78797, 78802, 78808] },
  { name: 'ngc2070', ra: 84.676, dec: -69.101, tiles: [132377, 132378, 132379, 132382] },
]

export async function buildHipsFixtures({ cacheDir, cachedBinary }: OverlayBuildDeps) {
  mkdirSync(join(cacheDir, 'hips'), { recursive: true })
  const jpeg = async (name: string, url: string) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const buf = await cachedBinary(name, url)
      if (buf[0] === 0xff && buf[1] === 0xd8) return
      rmSync(join(cacheDir, name))
    }
    throw new Error(`${url}: brak obrazu JPEG`)
  }
  for (const f of HIPS_FIELDS) {
    for (const n of f.tiles) await jpeg(`hips/dss2-7-${n}.jpg`, `https://cdn.skies.esac.esa.int/DSSColor/Norder7/Dir${Math.floor(n / 10000) * 10000}/Npix${n}.jpg`)
    await jpeg(`hips/skyview-${f.name}.jpg`, `https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=DSS2+Red&Position=${f.ra},${f.dec}&Size=0.4&Pixels=300&Return=JPG&Scaling=Linear`)
  }
  console.log(`hips: ${HIPS_FIELDS.reduce((s, f) => s + f.tiles.length, 0)} kafelków, ${HIPS_FIELDS.length} wzorców`)
}
