import * as THREE from 'three'
import type { DSO, ObjectType } from '../../lib/catalog'
import { GALACTIC_REGIONS, LOCAL_GROUP_SHAPES, dotTexture, position } from './galaxyModels'

export type BackgroundPoints = {
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  counts: number[]
  types: ObjectType[]
  pos: Float32Array
  col: Float32Array
}

export function sameMatrix(a: THREE.Matrix4, b: THREE.Matrix4): boolean {
  for (let i = 0; i < 16; i++) if (Math.abs(a.elements[i] - b.elements[i]) > 1e-6 * Math.max(1, Math.abs(b.elements[i]))) return false
  return true
}

export function showTypes(bg: { geometry: THREE.BufferGeometry; types: ObjectType[]; pos: Float32Array; col: Float32Array }, hidden: ObjectType[]) {
  const pos = bg.geometry.getAttribute('position') as THREE.BufferAttribute
  const col = bg.geometry.getAttribute('color') as THREE.BufferAttribute
  let n = 0
  bg.types.forEach((t, i) => {
    if (hidden.includes(t)) return
    ;(pos.array as Float32Array).set(bg.pos.subarray(i * 3, i * 3 + 3), n * 3)
    ;(col.array as Float32Array).set(bg.col.subarray(i * 3, i * 3 + 3), n * 3)
    n++
  })
  pos.needsUpdate = true
  col.needsUpdate = true
  bg.geometry.setDrawRange(0, n)
}

export function buildBackgroundPoints(
  scene: THREE.Scene,
  disposables: { dispose(): void }[],
  typeRGB: Record<ObjectType, number>,
  list: DSO[],
  size: number,
  counts: number[],
): BackgroundPoints {
  const pos = new Float32Array(list.length * 3)
  const col = new Float32Array(list.length * 3)
  const tmp = new THREE.Color()
  list.forEach((c, i) => {
    const p = position(c, c.distLy!)
    pos.set([p.x, p.y, p.z], i * 3)
    tmp.setHex(typeRGB[c.type])
    col.set([tmp.r, tmp.g, tmp.b], i * 3)
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const dot = dotTexture()
  const m = new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, map: dot, transparent: true, opacity: 0.8, depthWrite: false })
  scene.add(new THREE.Points(g, m))
  disposables.push(g, m, dot)
  return { geometry: g, material: m, counts, types: list.map((c) => c.type), pos: pos.slice(), col: col.slice() }
}

export interface BackgroundLabelHit {
  c: DSO
  x: number
  y: number
  box: [number, number, number, number] | null
}

export function drawBackgroundLabels(params: {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  camera: THREE.Camera
  projected: THREE.Vector3
  galaxy: boolean
  fade: number
  list: DSO[]
  listPos: THREE.Vector3[]
  limit: number
  localGroup: DSO[]
  localGroupPos: THREE.Vector3[]
  hasPhoto: boolean
  currentIndex: number
  hidden: readonly ObjectType[]
  annotations: boolean
  regionAlpha: number
  sunPos: THREE.Vector3
  anchors: Iterable<THREE.Vector3>
  target: THREE.Vector3
  typeRGB: Record<ObjectType, number>
}): BackgroundLabelHit[] {
  const { ctx, width: w, height: h, camera, projected, galaxy, fade, list, listPos, limit, localGroup, localGroupPos, hasPhoto, currentIndex, hidden, annotations, regionAlpha, sunPos, anchors, target, typeRGB } = params
  ctx.clearRect(0, 0, w, h)
  const hits: BackgroundLabelHit[] = []
  const candidates: { c: DSO; x: number; y: number; d: number; localGroup: boolean }[] = []
  for (let i = 0; i < limit; i++) {
    const c = list[i]
    if ((!hasPhoto && c.i === currentIndex) || (galaxy && hidden.includes(c.type))) continue
    projected.copy(listPos[i]).project(camera)
    if (projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue
    candidates.push({ c, x: ((projected.x + 1) / 2) * w, y: ((1 - projected.y) / 2) * h, d: camera.position.distanceToSquared(listPos[i]), localGroup: false })
  }
  for (let i = 0; i < localGroup.length && !galaxy && fade > 0; i++) {
    const c = localGroup[i]
    if (!hasPhoto && c.i === currentIndex) continue
    const p = localGroupPos[i]
    projected.copy(p).project(camera)
    if (projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue
    candidates.push({ c, x: ((projected.x + 1) / 2) * w, y: ((1 - projected.y) / 2) * h, d: camera.position.distanceToSquared(p), localGroup: true })
  }
  candidates.sort((a, b) => Number(b.localGroup) - Number(a.localGroup) || a.d - b.d)
  for (const l of candidates) hits.push({ c: l.c, x: l.x, y: l.y, box: null })
  ctx.globalAlpha = fade
  ctx.font = '10px ui-monospace, Consolas, monospace'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 3
  const boxes: [number, number, number, number][] = []
  for (const l of candidates) {
    if (!annotations) break
    if (boxes.length >= 120) break
    const text = l.localGroup && LOCAL_GROUP_SHAPES[l.c.id]?.named && l.c.namePl ? l.c.namePl : l.c.id
    const tw = ctx.measureText(text).width
    const boxAt = (x: number, y: number): [number, number, number, number] => [x - 2, y - 11, x + tw + 2, y + 3]
    const overlaps = (b: [number, number, number, number]) => boxes.some((x) => b[0] < x[2] && b[2] > x[0] && b[1] < x[3] && b[3] > x[1])
    let labelX = l.x + 6
    let labelY = l.y + 3
    let b = boxAt(labelX, labelY)
    if (l.localGroup) {
      const placements = [
        [l.x + 7, l.y + 3], [l.x + 7, l.y - 12], [l.x + 7, l.y + 18],
        [l.x - tw - 7, l.y + 3], [l.x - tw - 7, l.y - 12], [l.x - tw - 7, l.y + 18],
        [l.x + 18, l.y - 25], [l.x + 18, l.y + 31],
        [l.x - tw - 18, l.y - 25], [l.x - tw - 18, l.y + 31],
      ]
      const inBounds = ([x, y]: number[]) => {
        const candidate = boxAt(x, y)
        return candidate[0] >= 2 && candidate[1] >= 2 && candidate[2] <= w - 2 && candidate[3] <= h - 2
      }
      const placement = placements.find(([x, y]) => inBounds([x, y]) && !overlaps(boxAt(x, y))) ?? placements.find(inBounds)
      if (placement) [labelX, labelY] = placement
      b = boxAt(labelX, labelY)
    } else if (overlaps(b)) continue
    boxes.push(b)
    hits.push({ c: l.c, x: l.x, y: l.y, box: [Math.min(l.x - 6, b[0]), b[1], Math.max(l.x + 6, b[2]), b[3]] })
    ctx.strokeStyle = 'rgba(2, 5, 13, 0.85)'
    ctx.strokeText(text, labelX, labelY)
    ctx.fillStyle = `#${typeRGB[l.c.type].toString(16).padStart(6, '0')}c0`
    ctx.fillText(text, labelX, labelY)
  }
  if (regionAlpha <= 0) return hits
  for (const p of [sunPos, ...(hasPhoto ? anchors : [target])]) {
    projected.copy(p).project(camera)
    if (Math.abs(projected.z) >= 1) continue
    const x = (1 + projected.x) * w / 2, y = (1 - projected.y) * h / 2
    boxes.push([x - 12, y - 13, x + 12, y + 13])
  }
  ctx.globalAlpha = regionAlpha
  ctx.font = 'italic 13px system-ui, sans-serif'
  ctx.strokeStyle = 'rgba(2, 5, 13, 0.85)'
  ctx.fillStyle = '#d4d9e5'
  for (const { name, anchor } of GALACTIC_REGIONS) {
    projected.copy(anchor).project(camera)
    if (Math.abs(projected.z) >= 1) continue
    const x = (1 + projected.x) * w / 2, y = (1 - projected.y) * h / 2
    const half = ctx.measureText(name).width / 2
    if (x - half < 4 || x + half > w - 4 || y < 16 || y > h - 4) continue
    if (boxes.some(([a, b, c, d]) => x + half + 4 > a && x - half - 4 < c && y + 4 > b && y - 14 < d)) continue
    boxes.push([x - half, y - 14, x + half, y + 4])
    ctx.strokeText(name, x - half, y)
    ctx.fillText(name, x - half, y)
  }
  return hits
}

export function hitBackgroundLabel(hits: readonly BackgroundLabelHit[], x: number, y: number): DSO | null {
  const label = hits.findLast((t) => t.box && x >= t.box[0] && x <= t.box[2] && y >= t.box[1] && y <= t.box[3])
  if (label) return label.c
  let best: DSO | null = null
  let bestD = 8 * 8
  for (const t of hits) {
    const d = (t.x - x) ** 2 + (t.y - y) ** 2
    if (d < bestD) [best, bestD] = [t.c, d]
  }
  return best
}
