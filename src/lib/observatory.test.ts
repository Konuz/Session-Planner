import * as THREE from 'three'
import { expect, it } from 'vitest'
import { AXIS_LENGTH, EARTH_Z, HISTOGRAM_BOTTOM, HISTOGRAM_TOP, OBSERVATORY_FOV, PLANE_WIDTH, byDistance, fieldOfView, categoryCounts, distanceAt, distanceDomain, distanceHistogram, earthViewPose, histogramColor, histogramCurve, matchesFilter, observatoryItems, observatoryPosition, orbitOffset, placeCutoutLabel, planeSize, starColor, starSize, structureViewPose, type ObservatoryItem } from './observatory'
import type { PhotoCut, PhotoProject, PhotoStar } from './photo'

const image = { width: 2000, height: 1000 }
const domain = distanceDomain([350, 1300, 1.5e6, 5e7])

it('przy progress = 0 wszystko leży na płaszczyźnie zdjęcia w miejscu swoich pikseli', () => {
  for (const distLy of [null, 12, 1300, 5e7]) {
    expect(observatoryPosition({ x: 0, y: 0 }, image, distLy, domain, 0)).toEqual([-PLANE_WIDTH / 2, PLANE_WIDTH / 4, -0])
    expect(observatoryPosition({ x: 1500, y: 750 }, image, distLy, domain, 0)).toEqual([PLANE_WIDTH / 4, -PLANE_WIDTH / 8, -0])
  }
})

it('przy progress = 1 głębia rośnie monotonicznie z odległością, a x i y się nie zmieniają', () => {
  const pixel = { x: 400, y: 300 }
  const depths = [350, 1000, 1300, 2000, 1.5e6, 5e7].map((d) => observatoryPosition(pixel, image, d, domain, 1))
  for (let i = 1; i < depths.length; i++) expect(depths[i][2]).toBeLessThan(depths[i - 1][2])
  for (const p of depths) expect(p.slice(0, 2)).toEqual(observatoryPosition(pixel, image, null, domain, 0).slice(0, 2))
  expect(observatoryPosition(pixel, image, domain.maxLy, domain, 1)[2]).toBe(-AXIS_LENGTH)
  // Bez odległości obiekt zostaje na zdjęciu zamiast udawać głębię.
  expect(observatoryPosition(pixel, image, null, domain, 1)[2]).toBe(-0)
  const half = observatoryPosition(pixel, image, 1300, domain, 0.5)[2]
  expect(half).toBeLessThan(0)
  expect(half).toBeGreaterThan(observatoryPosition(pixel, image, 1300, domain, 1)[2])
})

it('planeSize normalizuje dłuższy bok do PLANE_WIDTH dla zdjęć pionowych, kwadratowych i poziomych', () => {
  const portrait = planeSize({ width: 3540, height: 5270 })
  expect(portrait.height).toBeCloseTo(PLANE_WIDTH, 9)
  expect(portrait.width).toBeCloseTo(PLANE_WIDTH * 3540 / 5270, 9)
  expect(observatoryPosition({ x: 0, y: 0 }, { width: 3540, height: 5270 }, null, domain, 0)).toEqual([-portrait.width / 2, PLANE_WIDTH / 2, -0])

  const square = planeSize({ width: 2944, height: 2956 })
  expect(square.height).toBeCloseTo(PLANE_WIDTH, 9)
  expect(square.width).toBeCloseTo(PLANE_WIDTH * 2944 / 2956, 9)

  const landscape = planeSize({ width: 2000, height: 1000 })
  expect(landscape.width).toBe(PLANE_WIDTH)
  expect(landscape.height).toBe(PLANE_WIDTH / 2)
})

it('zakres osi obejmuje pełne dekady, a distanceAt odwraca położenie', () => {
  expect(domain).toEqual({ minLy: 100, maxLy: 1e8 })
  expect(distanceDomain([])).toEqual({ minLy: 10, maxLy: 1e4 })
  expect(distanceDomain([400, null, 600])).toEqual({ minLy: 100, maxLy: 1000 })
  expect(distanceDomain([1000])).toEqual({ minLy: 1000, maxLy: 1e4 })
  expect(distanceAt(0.5, { minLy: 100, maxLy: 1e4 })).toBeCloseTo(1000)
})

it('histogram liczy odległości w koszykach logarytmicznych i pomija brak danych', () => {
  const h = distanceHistogram([150, 160, 1100, 9000, null, 50, 2e4], { minLy: 100, maxLy: 1e4 }, 4)
  expect(h.edges.map((e) => Math.round(e))).toEqual([100, 316, 1000, 3162, 10000])
  expect(h.counts).toEqual([2, 0, 1, 1])
  expect(distanceHistogram([1e4], { minLy: 100, maxLy: 1e4 }, 4).counts).toEqual([0, 0, 0, 1])
})

it('histogramColor odwzorowuje [0..1] na rampę zielony → bursztyn → czerwony z tokenów :root', () => {
  expect(histogramColor(0)).toBe('var(--ok)')
  expect(histogramColor(0.5)).toBe('var(--warn)')
  expect(histogramColor(1)).toBe('var(--bad)')
  expect(histogramColor(-0.4)).toBe('var(--ok)')
  expect(histogramColor(1.4)).toBe('var(--bad)')
  expect(histogramColor(0.25)).toBe('color-mix(in srgb, var(--warn) 50%, var(--ok))')
  expect(histogramColor(0.75)).toBe('color-mix(in srgb, var(--bad) 50%, var(--warn))')
})

it('histogramCurve buduje gładką krzywą bez przesterowań i z płynnymi przejściami gradientu', () => {
  expect(histogramCurve([])).toEqual({ linePath: '', areaPath: '', stops: [] })
  expect(histogramCurve([0, 0, 0, 0])).toEqual({ linePath: '', areaPath: '', stops: [] })

  const skewed = [0, 0, 1, 0, 0, 1, 2, 4, 25, 6, 3, 1, 0, 0]
  const curve = histogramCurve(skewed)
  expect(curve.linePath.startsWith('M0 ')).toBe(true)
  expect(curve.areaPath).toBe(`${curve.linePath} L${skewed.length} ${HISTOGRAM_BOTTOM} L0 ${HISTOGRAM_BOTTOM} Z`)

  const nums = curve.linePath.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
  expect(nums.length % 2).toBe(0)
  expect(nums[nums.length - 2]).toBe(skewed.length)
  for (let i = 1; i < nums.length; i += 2) {
    expect(nums[i]).toBeGreaterThanOrEqual(HISTOGRAM_TOP)
    expect(nums[i]).toBeLessThanOrEqual(HISTOGRAM_BOTTOM)
  }

  // Małe wartości (1 przy maksimum 25) pozostają widoczne nad linią bazową, a zera leżą na bazie.
  const endpointY = (targetX: number) => {
    const tokens = curve.linePath.split(' ')
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].startsWith('M') || tokens[i].startsWith('L')) {
        if (Number(tokens[i].slice(1)) === targetX) return Number(tokens[i + 1])
      } else if (tokens[i].startsWith('C')) {
        if (Number(tokens[i + 4]) === targetX) return Number(tokens[i + 5])
      }
    }
    return null
  }
  expect(endpointY(0.5)).toBe(HISTOGRAM_BOTTOM)
  expect(endpointY(2.5)).toBeLessThan(HISTOGRAM_BOTTOM - 2)
  expect(endpointY(8.5)).toBe(HISTOGRAM_TOP)

  expect(curve.stops[0]).toEqual({ offset: 0, color: 'var(--ok)' })
  expect(curve.stops[curve.stops.length - 1]).toEqual({ offset: 1, color: 'var(--ok)' })
  for (let i = 1; i < curve.stops.length; i++) {
    expect(curve.stops[i].offset).toBeGreaterThan(curve.stops[i - 1].offset)
    const pair = [curve.stops[i - 1].color, curve.stops[i].color]
    expect(pair).not.toEqual(['var(--ok)', 'var(--bad)'])
    expect(pair).not.toEqual(['var(--bad)', 'var(--ok)'])
  }
  expect(curve.stops.some((s) => s.color === 'var(--bad)')).toBe(true)
  expect(curve.stops.some((s) => s.color.includes('var(--warn)'))).toBe(true)

  const edges = histogramCurve([5, 0, 0, 10])
  const edgeNums = edges.linePath.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
  expect(edgeNums[0]).toBe(0)
  expect(edgeNums[1]).toBeLessThan(HISTOGRAM_BOTTOM)
  expect(edgeNums[edgeNums.length - 2]).toBe(4)
  expect(edgeNums[edgeNums.length - 1]).toBe(HISTOGRAM_TOP)
  expect(edges.stops[edges.stops.length - 1]).toEqual({ offset: 1, color: 'var(--bad)' })

  const uniform = histogramCurve([3, 3, 3])
  expect(uniform.linePath.startsWith(`M0 ${HISTOGRAM_TOP}`)).toBe(true)
  expect(uniform.linePath.endsWith(`L3 ${HISTOGRAM_TOP}`)).toBe(true)
  expect(uniform.stops).toEqual([
    { offset: 0, color: 'var(--bad)' },
    { offset: 1, color: 'var(--bad)' },
  ])
})

const item = (id: string, category: ObservatoryItem['category'], distLy: number | null, gMag: number | null = null): ObservatoryItem => ({ id, kind: category === 'stars' ? 'star' : 'object', category, type: null, x: 0, y: 0, radius: 0, distLy, distLoLy: null, distHiLy: null, gMag, bpRp: null, parallaxOverError: null, raDeg: 0, decDeg: 0, source: '', method: '', ref: '', scope: 'object' })

it('zakres 1000–2000 lś zostawia tylko obiekty z tego przedziału, kategoria zawęża dalej', () => {
  const items = [item('a', 'stars', 900), item('b', 'stars', 1000), item('c', 'nebulae', 1500), item('d', 'stars', 2000), item('e', 'stars', 2001), item('f', 'stars', null), item('g', 'galaxies', 2e7)]
  expect(items.filter((i) => matchesFilter(i, { category: 'all', range: [1000, 2000] })).map((i) => i.id)).toEqual(['b', 'c', 'd'])
  expect(items.filter((i) => matchesFilter(i, { category: 'stars', range: [1000, 2000] })).map((i) => i.id)).toEqual(['b', 'd'])
  expect(items.filter((i) => matchesFilter(i, { category: 'all', range: null }))).toHaveLength(items.length)
  expect(items.filter((i) => matchesFilter(i, { category: 'galaxies', range: null })).map((i) => i.id)).toEqual(['g'])
  expect(categoryCounts(items)).toEqual({ all: 7, stars: 5, nebulae: 1, galaxies: 1 })
  expect([item('x', 'stars', null, 9), item('y', 'stars', 300), item('z', 'stars', null, 6)].sort(byDistance).map((i) => i.id)).toEqual(['y', 'z', 'x'])
})

it('łączy włączone wycinki i gwiazdy zdjęcia, pomija obiekty bez ustalonej odległości', () => {
  const cut = (id: string, enabled: boolean, type: PhotoCut['type'], distLy: number | null = 1300, uncertaintyLy: number | null = 100): PhotoCut => ({ id, type, raDeg: 0, decDeg: 0, x: 10, y: 20, radius: 30, enabled, distLy, uncertaintyLy, distanceScope: 'illuminator', distanceMethod: 'paralaksa HD 37903', distanceSource: 'Bailer-Jones i in. 2021', distanceRef: '2021AJ....161..147B', distanceOrigin: 'stars' })
  const star: PhotoStar = { id: 'Gaia DR3 1', x: 5, y: 6, raDeg: 0, decDeg: 0, gMag: 8, bpRp: 0.4, parallaxMas: 2.5, parallaxOverError: 30, distLy: 1290, distLoLy: 1250, distHiLy: 1330 }
  const faint: PhotoStar = { ...star, id: 'Gaia DR3 2', parallaxOverError: 2, distLy: null, distLoLy: null, distHiLy: null }
  const project = { cuts: [cut('IC 434', true, 'EN'), cut('NGC 2024', false, 'EN'), cut('NGC 2023', true, 'G'), cut('IC 435', true, 'RN', null, null), cut('NGC 5169', true, 'G', 1.8e8, 1e8)], stars: { stars: [star, faint], magLimit: 15, fetchedAt: 0 } } as unknown as PhotoProject
  const items = observatoryItems(project)
  expect(items.map((i) => [i.id, i.category])).toEqual([['IC 434', 'nebulae'], ['NGC 2023', 'galaxies'], ['Gaia DR3 1', 'stars']])
  expect(items[0]).toMatchObject({ distLoLy: 1200, distHiLy: 1400, radius: 30, scope: 'illuminator', method: 'paralaksa HD 37903', ref: '2021AJ....161..147B' })
  expect(items[2]).toMatchObject({ kind: 'star', distLy: 1290, gMag: 8 })
  expect(observatoryItems({ ...project, stars: null })).toHaveLength(2)
})

it('barwa gwiazdy przechodzi od niebieskiej do czerwonej, rozmiar rośnie z jasnością', () => {
  const [blueR, , blueB] = starColor(-0.5)
  const [redR, , redB] = starColor(3)
  expect(blueB).toBeGreaterThan(blueR)
  expect(redR).toBeGreaterThan(redB)
  expect(starSize(4, 17)).toBe(9)
  expect(starSize(17, 17)).toBe(1.5)
  expect(starSize(12, 17)).toBeGreaterThan(starSize(15, 17))
})

it('rozmiar pola liczy z macierzy CD i porównuje z tarczą Księżyca', () => {
  // IC 434 z konuzastro.pl: 2798 × 2827 px, 1,28″/px.
  const cd = [[-0.000046206143700459305, 0.00035229624378628905], [-0.00035248318258832885, -0.00004637840645707231]]
  const fov = fieldOfView({ cd }, 2798, 2827)!
  expect(fov.widthDeg).toBeCloseTo(2798 * 1.27950 / 3600, 4)
  expect(fov.heightDeg).toBeCloseTo(2827 * 1.27950 / 3600, 4)
  expect(fov.moons).toBeCloseTo(1.94, 2)
  expect(fieldOfView(null, 10, 10)).toBeNull()
  expect(fieldOfView({ cd: [[0, 0], [0, 0]] }, 10, 10)).toBeNull()
})

const azimuth = ([x, , z]: number[]) => Math.atan2(x, z) * 180 / Math.PI

it('przelot kamery do widoku z góry obraca obraz płynnie, bez skoku azymutu na końcu', () => {
  // Kierunek widoku Struktura i widok z góry z tym samym przesunięciem 0,001 co w scenie.
  const from: [number, number, number] = [1.05 * 200, 0.62 * 200, 0.9 * 200]
  const to: [number, number, number] = [0, 300, 0.001]
  const steps = 100
  const path = Array.from({ length: steps + 1 }, (_, i) => orbitOffset(from, to, i / steps))
  path[0].forEach((v, i) => expect(v).toBeCloseTo(from[i], 6))
  path[steps].forEach((v, i) => expect(v).toBeCloseTo(to[i], 6))
  let maxStep = 0
  for (let i = 1; i <= steps; i++) maxStep = Math.max(maxStep, Math.abs(azimuth(path[i]) - azimuth(path[i - 1])))
  // Liniowe przesuwanie pozycji trzymało azymut ok. 49° do ostatniego kroku i wtedy skakało do 0°.
  expect(maxStep).toBeLessThan(Math.abs(azimuth(to) - azimuth(from)) / steps * 1.01)
})

it('przelot kamery idzie najkrótszą drogą w azymucie i nie zmienia kierunku przy samym oddaleniu', () => {
  const r = 50
  const deg = Math.PI / 180
  const half = orbitOffset([r * Math.sin(170 * deg), 0, r * Math.cos(170 * deg)], [r * Math.sin(-170 * deg), 0, r * Math.cos(-170 * deg)], 0.5)
  expect(half[0]).toBeCloseTo(0, 6)
  expect(half[2]).toBeCloseTo(-r, 6)
  orbitOffset([10, 20, 30], [30, 60, 90], 0.5).forEach((v, i) => expect(v).toBeCloseTo([20, 40, 60][i], 6))
})

it('widok Struktura (szew nurkowania) patrzy na środek całości po rozłożeniu, skosem z przodu i z góry', () => {
  const image = { width: 1000, height: 500 }
  const domain = { minLy: 100, maxLy: 1e4 }
  // Zdjęcie ±50 × ±25, Ziemia z = 70, obiekt 10 tys. lś na końcu osi (z = −400); obiekt bez odległości nie zmienia kadru.
  const pose = structureViewPose([{ x: 500, y: 250, distLy: 1e4 }, { x: 0, y: 0, distLy: null }], image, domain)
  pose.target.forEach((v, i) => expect(v).toBeCloseTo([0, 0, -165][i], 9))
  const offset = pose.position.map((v, i) => v - pose.target[i])
  const distance = Math.hypot(...offset)
  expect(distance).toBeCloseTo(Math.hypot(100, 50, 470) / 2 / Math.sin(Math.PI / 9) * 0.9, 9)
  const dir = [1.05, 0.62, 0.9].map((v) => v / Math.hypot(1.05, 0.62, 0.9))
  offset.forEach((v, i) => expect(v / distance).toBeCloseTo(dir[i], 9))

  const portrait = structureViewPose([{ x: 250, y: 500, distLy: 1e4 }], { width: 500, height: 1000 }, domain)
  const portraitDistance = Math.hypot(...portrait.position.map((v, i) => v - portrait.target[i]))
  expect(portraitDistance).toBeCloseTo(Math.hypot(50, 100, 470) / 2 / Math.sin(Math.PI / 9) * 0.9, 9)
})

it('widok Z Ziemi ustawia jednakową kamerę dla każdego zdjęcia i mieści cały kadr na wprost', () => {
  const images = [
    { width: 1720, height: 1000 },
    { width: 1500, height: 1000 },
    { width: 2944, height: 2956 },
    { width: 3540, height: 5270 },
    { width: 900, height: 1600 },
  ]
  for (const aspect of [1.95, 1.5, 1.0, 0.6]) {
    const pose = earthViewPose(aspect)
    expect(pose.position[0]).toBe(0)
    expect(pose.target).toEqual([0, 0, 0])
    expect(pose.position[2]).toBeGreaterThanOrEqual(EARTH_Z + 15)

    const camera = new THREE.PerspectiveCamera(OBSERVATORY_FOV, aspect, 0.1, 5000)
    camera.position.set(...pose.position)
    camera.lookAt(...pose.target)
    camera.updateMatrixWorld()

    for (const img of images) {
      const { width: w, height: h } = planeSize(img)
      const tl = new THREE.Vector3(-w / 2, h / 2, 0).project(camera)
      const tr = new THREE.Vector3(w / 2, h / 2, 0).project(camera)
      const bl = new THREE.Vector3(-w / 2, -h / 2, 0).project(camera)
      const br = new THREE.Vector3(w / 2, -h / 2, 0).project(camera)
      expect(tl.x).toBeCloseTo(-tr.x, 9)
      expect(bl.x).toBeCloseTo(-br.x, 9)
      expect(tl.y).toBeCloseTo(tr.y, 9)
      expect(bl.y).toBeCloseTo(br.y, 9)
      for (const c of [tl, tr, bl, br]) {
        expect(Math.abs(c.x)).toBeLessThan(1)
        expect(Math.abs(c.y)).toBeLessThan(1)
      }
    }

    const earth = new THREE.Vector3(0, 0, EARTH_Z).project(camera)
    expect(earth.x).toBeCloseTo(0, 9)
    expect(earth.y).toBeLessThan(-0.15)
    expect(earth.y).toBeGreaterThan(-0.5)
  }
})

it('placeCutoutLabel utrzymuje ramkę podpisu poza okręgiem wycinka i krawędziami kadru', () => {
  const outside = (box: { left: number; top: number; right: number; bottom: number }, cx: number, cy: number, r: number) => {
    const px = Math.max(box.left, Math.min(cx, box.right))
    const py = Math.max(box.top, Math.min(cy, box.bottom))
    expect(Math.hypot(px - cx, py - cy)).toBeGreaterThan(r)
  }

  const base = { labelWidth: 96, labelHeight: 37, viewportWidth: 1000, viewportHeight: 700 }
  const cardSmall = placeCutoutLabel({ ...base, cx: 400, cy: 350, radius: 10, dx: 8, dy: -46, byMarker: false })
  expect(cardSmall.box.left).toBe(408)
  expect(cardSmall.box.bottom).toBe(350 - 10 - 9)
  outside(cardSmall.box, 400, 350, 10)

  const cardZoom = placeCutoutLabel({ ...base, cx: 500, cy: 350, radius: 150, dx: 8, dy: -46, byMarker: false })
  expect(cardZoom.box.bottom).toBeLessThan(350 - 150)
  outside(cardZoom.box, 500, 350, 150)

  const cardTopEdge = placeCutoutLabel({ ...base, cx: 500, cy: 170, radius: 150, dx: 8, dy: -46, byMarker: false })
  expect(cardTopEdge.box.left).toBeGreaterThan(500 + 150)
  outside(cardTopEdge.box, 500, 170, 150)

  const cardTopRightEdge = placeCutoutLabel({ ...base, cx: 860, cy: 170, radius: 150, dx: 8, dy: -46, byMarker: false })
  expect(cardTopRightEdge.box.right).toBeLessThan(860 - 150)
  outside(cardTopRightEdge.box, 860, 170, 150)

  const cardBelow = placeCutoutLabel({ labelWidth: 96, labelHeight: 37, viewportWidth: 400, viewportHeight: 700, cx: 200, cy: 170, radius: 150, dx: 8, dy: -46, byMarker: false })
  expect(cardBelow.box.top).toBeGreaterThan(170 + 150)
  outside(cardBelow.box, 200, 170, 150)

  const markZero = placeCutoutLabel({ ...base, cx: 400, cy: 350, radius: 0, dx: 13, dy: -9, byMarker: true })
  expect(markZero.x).toBe(400)
  expect(markZero.y).toBe(350)

  const markZoom = placeCutoutLabel({ ...base, cx: 500, cy: 350, radius: 150, dx: 13, dy: -9, byMarker: true })
  expect(markZoom.box.left).toBeGreaterThan(500 + 150)
  outside(markZoom.box, 500, 350, 150)

  const markRightEdge = placeCutoutLabel({ ...base, cx: 850, cy: 350, radius: 150, dx: 13, dy: -9, byMarker: true })
  expect(markRightEdge.box.right).toBeLessThan(850 - 150)
  outside(markRightEdge.box, 850, 350, 150)

  const markAbove = placeCutoutLabel({ labelWidth: 96, labelHeight: 37, viewportWidth: 400, viewportHeight: 700, cx: 200, cy: 350, radius: 150, dx: 13, dy: -9, byMarker: true })
  expect(markAbove.box.bottom).toBeLessThan(350 - 150)
  outside(markAbove.box, 200, 350, 150)

  const markBelow = placeCutoutLabel({ labelWidth: 96, labelHeight: 37, viewportWidth: 400, viewportHeight: 700, cx: 200, cy: 170, radius: 150, dx: 13, dy: -9, byMarker: true })
  expect(markBelow.box.top).toBeGreaterThan(170 + 150)
  outside(markBelow.box, 200, 170, 150)
})
