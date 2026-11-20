import { DEG, mulVec, unitVector, type Mat3, type Vec3 } from '../lib/astro'
import { horizonAltitude, type HorizonPoint } from '../lib/horizon'
import type { Projector } from '../lib/projection'
import type { MilkyWay, SkyData } from '../lib/sky'
import { compileProgram } from '../lib/webgl'

const VS = `#version 300 es
in vec3 a_dir;
in vec2 a_magbv;
uniform mat3 u_m;
uniform vec3 u_zen;
uniform float u_scale;
uniform vec2 u_center;
uniform vec2 u_res;
uniform float u_magLimit;
uniform float u_dpr;
uniform float u_bright;
uniform float u_hideZ;
uniform float u_glow;
out vec3 v_color;
out float v_alpha;
out float v_glow;
vec3 bvColor(float bv) {
  float t = clamp((bv + 0.3) / 2.0, 0.0, 1.0);
  return mix(vec3(0.70, 0.82, 1.0), mix(vec3(1.0, 0.98, 0.94), vec3(1.0, 0.78, 0.55), smoothstep(0.35, 1.0, t)), smoothstep(0.0, 0.35, t));
}
void main() {
  vec3 v = u_m * a_dir;
  float alt = dot(u_zen, a_dir);
  float d = 1.0 + v.z;
  if (d < 0.02 || a_magbv.x > u_magLimit || a_dir.z > u_hideZ) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); gl_PointSize = 0.0; return; }
  vec2 p = u_center + 2.0 * u_scale * v.xy / d;
  vec2 clip = vec2(p.x / u_res.x * 2.0 - 1.0, p.y / u_res.y * 2.0 - 1.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  float m = u_magLimit - a_magbv.x;
  v_glow = u_glow * 0.6 * (1.0 - smoothstep(0.5, 4.5, a_magbv.x));
  gl_PointSize = clamp(2.4 + m * 1.45, 2.4, 15.0) * u_dpr * (1.0 + v_glow);
  v_color = bvColor(a_magbv.y);
  v_alpha = clamp(0.5 + m * 0.18, 0.45, 1.0) * smoothstep(-0.03, 0.01, alt) * u_bright;
}`

const FS = `#version 300 es
precision mediump float;
in vec3 v_color;
in float v_alpha;
in float v_glow;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = dot(c, c);
  if (r > 1.0) discard;
  float radius = sqrt(r);
  float scale = 1.0 + v_glow;
  r *= scale * scale;
  float d = radius * scale;
  float a = 1.0 - smoothstep(0.0, 1.0, d);
  float halo = (exp(-r * 3.2) - exp(-r * 16.0)) * 0.18;
  float core = (a * a * 0.75 + exp(-r * 18.0) * 0.5 + halo) * step(r, 1.0);
  float glow = v_glow * 0.25 * (1.0 - smoothstep(0.0, 1.0, radius));
  a = (core + glow) * v_alpha;
  outColor = vec4(v_color * a, a);
}`

export interface StarGL {
  draw(m: Mat3, zen: Vec3, p: Projector, width: number, height: number, dpr: number, magLimit: number, bright: number, hideAboveZ: number, glow: boolean): void
  dispose(): void
}

export function createStarGL(canvas: HTMLCanvasElement, sky: SkyData): StarGL | null {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true })
  if (!gl) return null
  const prog = compileProgram(gl, VS, FS)
  const n = sky.starCount
  const dirs = new Float32Array(n * 3)
  const magbv = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    const [x, y, z] = unitVector(sky.stars[i * 4], sky.stars[i * 4 + 1])
    dirs.set([x, y, z], i * 3)
    magbv.set([sky.stars[i * 4 + 2], sky.stars[i * 4 + 3]], i * 2)
  }
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const buf = (data: Float32Array, name: string, size: number) => {
    const b = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, name)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
    return b
  }
  const dirsBuf = buf(dirs, 'a_dir', 3)
  const magbvBuf = buf(magbv, 'a_magbv', 2)
  const u = (name: string) => gl.getUniformLocation(prog, name)
  const uM = u('u_m'), uZen = u('u_zen'), uScale = u('u_scale'), uCenter = u('u_center'), uRes = u('u_res'), uMag = u('u_magLimit'), uDpr = u('u_dpr'), uBright = u('u_bright'), uHideZ = u('u_hideZ')
  const uGlow = u('u_glow')
  return {
    draw(m, zen, p, width, height, dpr, magLimit, bright, hideAboveZ, glow) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.uniformMatrix3fv(uM, true, new Float32Array(m))
      gl.uniform3f(uZen, zen[0], zen[1], zen[2])
      gl.uniform1f(uScale, p.scale * dpr)
      gl.uniform2f(uCenter, p.cx * dpr, (height - p.cy) * dpr)
      gl.uniform2f(uRes, width * dpr, height * dpr)
      gl.uniform1f(uMag, magLimit)
      gl.uniform1f(uDpr, Math.min(dpr, 1.5))
      gl.uniform1f(uBright, bright)
      gl.uniform1f(uHideZ, hideAboveZ)
      gl.uniform1f(uGlow, glow ? 1 : 0)
      gl.drawArrays(gl.POINTS, 0, n)
    },
    dispose() {
      gl.deleteProgram(prog)
      gl.deleteVertexArray(vao)
      gl.deleteBuffer(dirsBuf)
      gl.deleteBuffer(magbvBuf)
    },
  }
}

export function withAlpha(hex: string, a: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  return m ? `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${a})` : `rgba(160, 175, 200, ${a})`
}

export function brighter(hex: string, a: number, dl = 0.25): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return `rgba(215, 222, 235, ${a})`
  const [r, g, b] = [m[1], m[2], m[3]].map((s) => parseInt(s, 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  let h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  if (h >= 320) h = 356
  const L = Math.min(0.66, l + dl), C = 1 - Math.abs(2 * L - 1), X = C * (1 - Math.abs(((h / 60) % 2) - 1)), o = L - C / 2
  const [R, G, B] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X]
  return `rgba(${Math.round((R + o) * 255)}, ${Math.round((G + o) * 255)}, ${Math.round((B + o) * 255)}, ${a})`
}

const artLevels = new Map<string, HTMLCanvasElement>()
let artLayerCanvas: HTMLCanvasElement | null = null

export function artLayer(w: number, h: number): HTMLCanvasElement {
  artLayerCanvas ??= document.createElement('canvas')
  if (artLayerCanvas.width !== w || artLayerCanvas.height !== h) {
    artLayerCanvas.width = w
    artLayerCanvas.height = h
  }
  return artLayerCanvas
}

export function artLevel(img: HTMLImageElement, file: string, screenPx: number): CanvasImageSource {
  const size = screenPx > 320 ? 384 : screenPx > 150 ? 192 : screenPx > 72 ? 96 : 48
  if (size === 384) return img
  const key = `${file}@${size}`
  let level = artLevels.get(key)
  if (!level) {
    level = document.createElement('canvas')
    level.width = level.height = size
    const g = level.getContext('2d')!
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    g.globalCompositeOperation = 'lighten'
    const passes = size >= 96 ? [[0, 0], [0.5, 0], [0, 0.5]] : [[0, 0], [0.6, 0], [0, 0.6], [-0.6, 0], [0, -0.6]]
    for (const [dx, dy] of passes) g.drawImage(img, dx, dy, size, size)
    artLevels.set(key, level)
  }
  return level
}

export type Pt = [number, number] | null

export function polyline(ctx: CanvasRenderingContext2D, pts: Pt[], size: { w: number; h: number }) {
  const maxJump = Math.max(size.w, size.h) * 0.6
  let prev: Pt = null
  for (const p of pts) {
    if (p && prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < maxJump) ctx.lineTo(p[0], p[1])
    else if (p) ctx.moveTo(p[0], p[1])
    prev = p
  }
}

export function drawCelestialGrid(ctx: CanvasRenderingContext2D, proj: Projector, latDeg: number, size: { w: number; h: number }, showDecLabels: boolean) {
  const sin = Math.sin(latDeg * DEG), cos = Math.cos(latDeg * DEG)
  const toHorizontal: Mat3 = [-sin, 0, cos, 0, 1, 0, cos, 0, sin]
  const project = (angle: number, dec: number) => {
    const direction = mulVec(toHorizontal, unitVector(angle, dec))
    return direction[2] >= 0 ? proj.hor(direction) : null
  }
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(120, 150, 200, 0.23)'
  ctx.beginPath()
  const labels: { x: number; y: number; text: string }[] = []
  for (let dec = -80; dec <= 80; dec += 10) {
    const ring = Array.from({ length: 121 }, (_, i) => project(i * 3, dec))
    polyline(ctx, ring, size)
    const p = ring[0]
    if (p && showDecLabels) labels.push({ x: p[0], y: p[1], text: `DEC ${dec > 0 ? '+' : ''}${dec}°` })
  }
  for (let angle = 0; angle < 360; angle += 30) {
    polyline(ctx, Array.from({ length: 61 }, (_, i) => project(angle, -90 + i * 3)), size)
  }
  ctx.stroke()
  const north = latDeg >= 0
  const pole = project(0, north ? 90 : -90)
  if (pole) {
    const [x, y] = pole
    ctx.fillStyle = 'rgba(160, 200, 235, 0.9)'
    ctx.fillRect(x - 3, y, 7, 1)
    ctx.fillRect(x, y - 3, 1, 7)
    ctx.font = '11px ui-monospace, Consolas, monospace'
    ctx.fillText(north ? 'Biegun N' : 'Biegun S', x + 7, y - 5)
  }
  return labels
}

export const groundCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
export const GROUND_STEP = 3
let groundCacheKey = ''
let groundCacheHorizon: readonly HorizonPoint[] | null = null
let groundPixels: Uint8ClampedArray | null = null

export const getGroundCacheKey = () => groundCacheKey

export function overlapsGround(x0: number, y0: number, x1: number, y1: number): boolean {
  if (!groundCanvas || !groundPixels) return true
  const mw = groundCanvas.width
  const i0 = Math.max(0, Math.floor(x0 / GROUND_STEP) - 1)
  const i1 = Math.min(mw - 1, Math.ceil(x1 / GROUND_STEP) + 1)
  const j0 = Math.max(0, Math.floor(y0 / GROUND_STEP) - 1)
  const j1 = Math.min(groundCanvas.height - 1, Math.ceil(y1 / GROUND_STEP) + 1)
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (groundPixels[(j * mw + i) * 4 + 3] > 0) return true
  return false
}

export function drawGround(ctx: CanvasRenderingContext2D, proj: Projector, horizon: readonly HorizonPoint[], w: number, h: number, fovDeg: number, radius: number) {
  if (!groundCanvas) return
  const mw = Math.ceil(w / GROUND_STEP)
  const mh = Math.ceil(h / GROUND_STEP)
  const gKey = `${mw}x${mh}|${fovDeg}|${radius}|${proj.cx},${proj.cy},${proj.scale}|${proj.horToView.join(',')}`
  if (gKey === groundCacheKey && horizon === groundCacheHorizon && groundCanvas.width === mw && groundCanvas.height === mh) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(groundCanvas, 0, 0, mw * GROUND_STEP, mh * GROUND_STEP)
    return
  }
  groundCacheKey = gKey
  groundCacheHorizon = horizon
  if (groundCanvas.width !== mw || groundCanvas.height !== mh) {
    groundCanvas.width = mw
    groundCanvas.height = mh
  }
  const g = groundCanvas.getContext('2d')!
  const img = g.createImageData(mw, mh)
  const table = new Float32Array(721)
  for (let i = 0; i <= 720; i++) table[i] = horizonAltitude(horizon, i / 2)
  const m = proj.horToView
  const direction: Vec3 = [0, 0, 0]
  const edgeDeg = Math.max(0.05, (fovDeg / (2 * radius)) * GROUND_STEP)
  for (let j = 0; j < mh; j++) {
    const y = (j + 0.5) * GROUND_STEP
    for (let i = 0; i < mw; i++) {
      const [vx, vy, vz] = proj.unprojectView((i + 0.5) * GROUND_STEP, y, direction)
      const hx = m[0] * vx + m[3] * vy + m[6] * vz
      const hy = m[1] * vx + m[4] * vy + m[7] * vz
      const hz = m[2] * vx + m[5] * vy + m[8] * vz
      const alt = Math.asin(Math.max(-1, Math.min(1, hz))) / DEG
      let az = Math.atan2(hy, hx) / DEG
      if (az < 0) az += 360
      const limit = table[Math.round(az * 2)]
      const a = Math.max(0, Math.min(1, (limit - alt) / edgeDeg + 0.5))
      if (a <= 0) continue
      const o = (j * mw + i) * 4
      const shade = 1 - Math.min(1, (y / h) * 0.6)
      img.data[o] = 3 * shade
      img.data[o + 1] = 6 * shade
      img.data[o + 2] = 12 * shade
      img.data[o + 3] = a * (235 + 15 * (1 - shade))
    }
  }
  g.putImageData(img, 0, 0)
  groundPixels = img.data
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(groundCanvas, 0, 0, mw * GROUND_STEP, mh * GROUND_STEP)
}

const mwCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
export const MW_STEP = 4
let mwCacheKey = ''
let mwCacheHorizon: readonly HorizonPoint[] | null = null
let mwCacheRef: MilkyWay | null = null

export function drawMilkyWay(ctx: CanvasRenderingContext2D, proj: Projector, mw: MilkyWay, horizon: readonly HorizonPoint[], w: number, h: number, alpha: number, step = MW_STEP, maxDecDeg = 90) {
  if (!mwCanvas || alpha * 255 < 0.5) return
  const cw = Math.ceil(w / step)
  const ch = Math.ceil(h / step)
  const mKey = `${cw}x${ch}|${alpha}|${maxDecDeg}|${proj.cx},${proj.cy},${proj.scale}|${proj.eqToView.join(',')}|${proj.horToView.join(',')}`
  if (mKey === mwCacheKey && horizon === mwCacheHorizon && mw === mwCacheRef && mwCanvas.width === cw && mwCanvas.height === ch) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(mwCanvas, 0, 0, cw * step, ch * step)
    ctx.restore()
    return
  }
  mwCacheKey = mKey
  mwCacheHorizon = horizon
  mwCacheRef = mw
  const table = new Float32Array(721)
  for (let i = 0; i <= 720; i++) table[i] = horizonAltitude(horizon, i / 2)
  if (mwCanvas.width !== cw || mwCanvas.height !== ch) {
    mwCanvas.width = cw
    mwCanvas.height = ch
  }
  const g = mwCanvas.getContext('2d')!
  const img = g.createImageData(cw, ch)
  const m = proj.eqToView
  const hm = proj.horToView
  const direction: Vec3 = [0, 0, 0]
  const { w: gw, h: gh, data } = mw
  for (let j = 0; j < ch; j++) {
    for (let i = 0; i < cw; i++) {
      const [vx, vy, vz] = proj.unprojectView((i + 0.5) * step, (j + 0.5) * step, direction)
      const hx = hm[0] * vx + hm[3] * vy + hm[6] * vz
      const hy = hm[1] * vx + hm[4] * vy + hm[7] * vz
      const alt = Math.asin(Math.max(-1, Math.min(1, hm[2] * vx + hm[5] * vy + hm[8] * vz))) / DEG
      let az = Math.atan2(hy, hx) / DEG
      if (az < 0) az += 360
      const fade = Math.min(1, alt - table[Math.round(az * 2)])
      if (fade <= 0) continue
      const ex = m[0] * vx + m[3] * vy + m[6] * vz
      const ey = m[1] * vx + m[4] * vy + m[7] * vz
      const ez = m[2] * vx + m[5] * vy + m[8] * vz
      let ra = Math.atan2(ey, ex) / DEG
      if (ra < 0) ra += 360
      const dec = Math.asin(Math.max(-1, Math.min(1, ez))) / DEG
      if (dec > maxDecDeg) continue
      const fx = (ra / 360) * gw - 0.5
      const fy = ((90 - dec) / 180) * gh - 0.5
      const x0 = Math.floor(fx)
      const y0 = Math.max(0, Math.min(gh - 2, Math.floor(fy)))
      const tx = fx - x0
      const ty = Math.max(0, Math.min(1, fy - y0))
      const xa = (x0 + gw) % gw
      const xb = (x0 + 1) % gw
      const v =
        (data[y0 * gw + xa] * (1 - tx) + data[y0 * gw + xb] * tx) * (1 - ty) +
        (data[(y0 + 1) * gw + xa] * (1 - tx) + data[(y0 + 1) * gw + xb] * tx) * ty
      if (v < 1) continue
      const o = (j * cw + i) * 4
      img.data[o] = 190
      img.data[o + 1] = 205
      img.data[o + 2] = 255
      img.data[o + 3] = v * alpha * fade
    }
  }
  g.putImageData(img, 0, 0)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(mwCanvas, 0, 0, cw * step, ch * step)
  ctx.restore()
}
