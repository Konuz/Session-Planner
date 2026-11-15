// Warstwa WebGL2 nieba NSNS na kopule, we własnym płótnie pod resztą sceny. Podkład to Allsky rzędu 3 (jedna tekstura),
// na nim kafelki szczegółowe dobrane do skali ekranu (`hipsSky.ts`). Wierzchołki to kierunki J2000, rzut stereograficzny
// w shaderze ten sam co dla gwiazd; krycie z wysokości nad horyzontem, jasności nieba i granicy pokrycia.
import type { Mat3, Vec3 } from './astro'
import { DEG } from './astro'
import { allskyUvRect, ALLSKY_ORDER, detailOrder, NSNS_EDGE_DEC, segmentsFor, tileMesh, viewCircle, visibleTiles, type TileMesh } from './hipsSky'
import type { Survey } from './hips'
import { fetchTile } from './hipsTiles'
import { imageCache } from './imageCache'

export interface HipsSkyFrame {
  eqToView: Mat3
  /** Zenit w J2000. */
  zen: Vec3
  scale: number
  cx: number
  cy: number
  /** Rozmiar sceny w px CSS. */
  width: number
  height: number
  dpr: number
  /** Jasność nieba ze Słońca (1 w nocy), jak dla gwiazd. */
  bright: number
  /** Fałsz podczas odtwarzania nocy: bez nowych pobrań, rysowane tylko gotowe tekstury. */
  allowDecode: boolean
}

export interface HipsSkyLayer {
  /** Czy podkład jest już na ekranie (wtedy kopuła ukrywa gwiazdy katalogu i Drogę Mleczną w pokryciu). */
  ready(): boolean
  /** Czy ostatnia próba pobrania podkładu się nie udała (kopuła pokazuje wtedy komunikat zamiast podpisu). */
  failed(): boolean
  draw(frame: HipsSkyFrame): void
  dispose(): void
}

const VS = `#version 300 es
layout(location = 0) in vec3 a_dir;
layout(location = 1) in vec2 a_uv;
uniform mat3 u_m;
uniform vec3 u_zen;
uniform float u_scale;
uniform vec2 u_center;
uniform vec2 u_res;
out vec2 v_uv;
out float v_alpha;
out float v_z;
void main() {
  vec3 v = u_m * a_dir;
  float d = max(1.0 + v.z, 1e-3);
  vec2 p = u_center + 2.0 * u_scale * v.xy / d;
  gl_Position = vec4(p / u_res * 2.0 - 1.0, 0.0, 1.0);
  v_uv = a_uv;
  v_alpha = smoothstep(-0.03, 0.01, dot(u_zen, a_dir));
  v_z = a_dir.z;
}`

const FS = `#version 300 es
precision highp float;
in vec2 v_uv;
in float v_alpha;
in float v_z;
uniform sampler2D u_tex;
uniform float u_bright;
uniform vec2 u_edge;
out vec4 outColor;
void main() {
  float a = v_alpha * u_bright * smoothstep(u_edge.x, u_edge.y, v_z);
  outColor = vec4(texture(u_tex, v_uv).rgb * a, a);
}`

// Pobierane naraz kafelki szczegółowe i limit tekstur w pamięci GPU (kafelek 512² RGBA ≈ 1 MB).
const MAX_LOADING = 6
const MAX_TEXTURES = 64
// Nieudany kafelek lub Allsky (limit czasu przy zimnym pośredniku, 404 na skraju pokrycia) próbujemy znowu po tym czasie.
const RETRY_MS = 20000
const allskyCache = imageCache('tracker-hips-allsky', 4)

interface Mesh { vao: WebGLVertexArrayObject; buffers: WebGLBuffer[]; count: number }
interface Tile { mesh: Mesh | null; tex: WebGLTexture | null; lastDrawn: number; failedAt: number }

function compile(gl: WebGL2RenderingContext): WebGLProgram {
  const p = gl.createProgram()!
  const shaders = ([[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]] as const).map(([type, src]) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    gl.attachShader(p, s)
    return s
  })
  gl.linkProgram(p)
  shaders.forEach((s) => { gl.detachShader(p, s); gl.deleteShader(s) })
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'program')
  return p
}

export function createHipsSkyLayer(gl: WebGL2RenderingContext, survey: Survey, onLoaded: () => void): HipsSkyLayer {
  const prog = compile(gl)
  const u = (name: string) => gl.getUniformLocation(prog, name)
  const uM = u('u_m'), uZen = u('u_zen'), uScale = u('u_scale'), uCenter = u('u_center'), uRes = u('u_res'), uBright = u('u_bright'), uEdge = u('u_edge')
  const base = survey.mirrors[0]
  const tiles = new Map<string, Tile>()
  const allskyMeshes = new Map<number, Mesh>()
  let allsky: { tex: WebGLTexture; width: number; height: number } | null = null
  let allskyState: 'idle' | 'loading' | 'failed' = 'idle'
  let allskyFailedAt = 0
  let loading = 0
  let disposed = false
  let frameRequest = 0
  let retryTimer = 0
  // Po porażce jedno przerysowanie po RETRY_MS ponawia kafelki bez ruchu widoku.
  const retryLater = () => {
    if (!retryTimer) retryTimer = window.setTimeout(() => { retryTimer = 0; loaded() }, RETRY_MS + 100)
  }

  // Kafelki przychodzą seriami: jedno przerysowanie kopuły na klatkę.
  const loaded = () => {
    if (disposed || frameRequest) return
    frameRequest = requestAnimationFrame(() => { frameRequest = 0; if (!disposed) onLoaded() })
  }

  const mesh = (m: TileMesh): Mesh => {
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    const buffers = [gl.createBuffer()!, gl.createBuffer()!, gl.createBuffer()!]
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0])
    gl.bufferData(gl.ARRAY_BUFFER, m.dirs, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[1])
    gl.bufferData(gl.ARRAY_BUFFER, m.uv, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[2])
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.indices, gl.STATIC_DRAW)
    gl.bindVertexArray(null)
    return { vao, buffers, count: m.indices.length }
  }
  const freeMesh = (m: Mesh) => { gl.deleteVertexArray(m.vao); m.buffers.forEach((b) => gl.deleteBuffer(b)) }

  // Kafelki szczegółowe z mipmapami (pomniejszenie do 2×); Allsky bez nich, bo poziomy mipmap mieszałyby sąsiednie
  // komórki atlasu, które na niebie nie sąsiadują.
  const texture = (bitmap: ImageBitmap, mipmap: boolean): WebGLTexture => {
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
    if (mipmap) gl.generateMipmap(gl.TEXTURE_2D)
    return tex
  }

  async function loadAllsky() {
    allskyState = 'loading'
    try {
      const key = `/allsky/${survey.id}`
      let blob = await allskyCache.get(key)
      // Serwer bez pośrednika `/api/hips/` (np. dev uruchomiony przed jego dodaniem) odpowiada stroną HTML z kodem 200;
      // taki wpis w buforze blokowałby podkład na zawsze.
      if (blob && !blob.type.startsWith('image/')) blob = null
      if (!blob) {
        const res = await fetch(`${base}/Norder${ALLSKY_ORDER}/Allsky.jpg`)
        const type = res.headers.get('Content-Type') ?? ''
        if (!res.ok || !type.startsWith('image/')) throw new Error(`Allsky: HTTP ${res.status} ${type}`)
        blob = await res.blob()
        await allskyCache.put(key, blob)
      }
      const bitmap = await createImageBitmap(blob)
      if (disposed || gl.isContextLost()) { bitmap.close(); return }
      allsky = { tex: texture(bitmap, false), width: bitmap.width, height: bitmap.height }
      bitmap.close()
      allskyState = 'idle'
      loaded()
    } catch (e) {
      allskyState = 'failed'
      allskyFailedAt = performance.now()
      retryLater()
      loaded()
      console.error('Kopuła: podkład NSNS', e)
    }
  }

  function request(order: number, npix: number, key: string) {
    const tile: Tile = { mesh: null, tex: null, lastDrawn: 0, failedAt: 0 }
    tiles.set(key, tile)
    loading++
    fetchTile(survey, order, npix)
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => {
        if (disposed || gl.isContextLost() || tiles.get(key) !== tile) { bitmap.close(); return }
        tile.tex = texture(bitmap, true)
        bitmap.close()
        tile.mesh = mesh(tileMesh(order, npix, segmentsFor(order)))
        loaded()
      })
      .catch(() => { tile.failedAt = performance.now(); retryLater() })
      // Także po porażce: zwolnione miejsce w kolejce pozwala pobrać następne kafelki bez ruchu widoku.
      .finally(() => { loading--; loaded() })
  }

  function evict(keep: ReadonlySet<string>) {
    const withTex = [...tiles.entries()].filter(([, t]) => t.tex)
    if (withTex.length <= MAX_TEXTURES) return
    withTex.sort((a, b) => a[1].lastDrawn - b[1].lastDrawn)
    for (const [key, t] of withTex.slice(0, withTex.length - MAX_TEXTURES)) {
      if (keep.has(key)) continue
      gl.deleteTexture(t.tex)
      if (t.mesh) freeMesh(t.mesh)
      tiles.delete(key)
    }
  }

  const draw = (m: Mesh) => {
    gl.bindVertexArray(m.vao)
    gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0)
  }

  return {
    ready: () => allsky !== null,
    failed: () => allskyState === 'failed',
    draw(f) {
      const canvas = gl.canvas as HTMLCanvasElement
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      const now = performance.now()
      if (allskyState === 'failed' && now - allskyFailedAt > RETRY_MS) allskyState = 'idle'
      if (allskyState === 'idle' && !allsky && f.allowDecode) void loadAllsky()
      const maxR = Math.hypot(Math.max(f.cx, f.width - f.cx), Math.max(f.cy, f.height - f.cy))
      const { centre, radiusDeg, arcsecPerPx } = viewCircle(f.eqToView, f.scale, maxR)
      gl.useProgram(prog)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.uniformMatrix3fv(uM, true, new Float32Array(f.eqToView))
      gl.uniform3f(uZen, f.zen[0], f.zen[1], f.zen[2])
      gl.uniform1f(uScale, f.scale * f.dpr)
      gl.uniform2f(uCenter, f.cx * f.dpr, (f.height - f.cy) * f.dpr)
      gl.uniform2f(uRes, f.width * f.dpr, f.height * f.dpr)
      gl.uniform1f(uBright, f.bright)
      // Brzeg pokrycia wygaszany w pasie ±0,5° wokół granicy (sin δ).
      gl.uniform2f(uEdge, Math.sin((NSNS_EDGE_DEC - 0.5) * DEG), Math.sin((NSNS_EDGE_DEC + 0.5) * DEG))
      gl.activeTexture(gl.TEXTURE0)
      if (allsky) {
        gl.bindTexture(gl.TEXTURE_2D, allsky.tex)
        for (const p of visibleTiles(ALLSKY_ORDER, centre, radiusDeg, f.zen, NSNS_EDGE_DEC - 1)) {
          let m = allskyMeshes.get(p)
          if (!m) allskyMeshes.set(p, (m = mesh(tileMesh(ALLSKY_ORDER, p, segmentsFor(ALLSKY_ORDER), allskyUvRect(p, allsky.width, allsky.height)))))
          draw(m)
        }
      }
      const order = detailOrder(arcsecPerPx, survey.maxOrder)
      const keep = new Set<string>()
      if (order !== null) {
        for (const p of visibleTiles(order, centre, radiusDeg, f.zen, NSNS_EDGE_DEC - 1)) {
          const key = `${order}/${p}`
          keep.add(key)
          const tile = tiles.get(key)
          if (tile?.tex && tile.mesh) {
            tile.lastDrawn = now
            gl.bindTexture(gl.TEXTURE_2D, tile.tex)
            draw(tile.mesh)
          } else if ((!tile || (tile.failedAt && now - tile.failedAt > RETRY_MS)) && f.allowDecode && loading < MAX_LOADING) request(order, p, key)
        }
      }
      gl.bindVertexArray(null)
      evict(keep)
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frameRequest)
      clearTimeout(retryTimer)
      if (gl.isContextLost()) return
      for (const t of tiles.values()) {
        if (t.tex) gl.deleteTexture(t.tex)
        if (t.mesh) freeMesh(t.mesh)
      }
      allskyMeshes.forEach(freeMesh)
      if (allsky) gl.deleteTexture(allsky.tex)
      gl.deleteProgram(prog)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    },
  }
}
