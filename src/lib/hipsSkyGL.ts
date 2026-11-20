// Warstwa WebGL2 nieba NSNS na kopule, we własnym płótnie pod resztą sceny. Podkład to Allsky rzędu 3 (jedna tekstura),
// na nim kafelki szczegółowe dobrane do skali ekranu (`hipsSky.ts`). Wierzchołki to kierunki J2000, rzut stereograficzny
// w shaderze ten sam co dla gwiazd; krycie z wysokości nad horyzontem, jasności nieba i granicy pokrycia.
import type { Mat3, Vec3 } from './astro'
import { DEG } from './astro'
import { allskyUvRect, ALLSKY_ORDER, detailOrder, detailOrderScale, NSNS_EDGE_DEC, segmentsFor, tileMesh, tileView, visibleTiles, type TileMesh } from './hipsSky'
import type { Survey } from './hips'
import { fetchTile } from './hipsTiles'
import { imageCache } from './imageCache'
import { compileProgram } from './webgl'

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
  /** Paleta SHO używa tych samych tekstur co OHS. */
  swapRedBlue?: boolean
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
uniform bool u_swapRedBlue;
uniform vec2 u_edge;
out vec4 outColor;
void main() {
  float a = v_alpha * u_bright * smoothstep(u_edge.x, u_edge.y, v_z);
  vec3 color = texture(u_tex, v_uv).rgb;
  outColor = vec4((u_swapRedBlue ? color.bgr : color) * a, a);
}`

// Kafelek 512² RGBA z mipmapami zajmuje ok. 1,33 MiB. Budżet mieści bieżący poziom i sąsiednie fragmenty pola.
const MAX_LOADING = 6
const MAX_TEXTURES = 112
const MAX_PRELOAD_LOADING = 2
const PRELOAD_DELAY_MS = 250
const FADE_MS = 200
const MAX_FADE_STEP_MS = 50
// Nieudany kafelek lub Allsky (limit czasu przy zimnym pośredniku, 404 na skraju pokrycia) próbujemy znowu po tym czasie.
const RETRY_MS = 20000
const allskyCache = imageCache('tracker-hips-allsky', 4)

interface Mesh { vao: WebGLVertexArrayObject; buffers: WebGLBuffer[]; count: number }
interface TileImage { mesh: Mesh; tex: WebGLTexture }
interface Tile {
  image: TileImage | null
  shown: boolean
  lastDrawn: number
  failedAt: number | null
  missing?: boolean
}

export function createHipsSkyLayer(gl: WebGL2RenderingContext, survey: Survey, onLoaded: () => void): HipsSkyLayer {
  const prog = compileProgram(gl, VS, FS)
  const u = (name: string) => gl.getUniformLocation(prog, name)
  const uM = u('u_m'), uZen = u('u_zen'), uScale = u('u_scale'), uCenter = u('u_center'), uRes = u('u_res'), uBright = u('u_bright'), uEdge = u('u_edge')
  const uSwapRedBlue = u('u_swapRedBlue')
  const base = survey.mirrors[0]
  const tiles = new Map<string, Tile>()
  const allskyMeshes = new Map<number, Mesh>()
  // Najnowszy poziom pokrywa starsze, które wypełniają luki po błędach i podczas ruchu widoku.
  let shownOrders: number[] = []
  let fade: { order: number | null; elapsed: number; lastFrameAt: number; tiles: Set<Tile> } | null = null
  let allsky: { tex: WebGLTexture; width: number; height: number } | null = null
  let allskyState: 'idle' | 'loading' | 'failed' = 'idle'
  let allskyFailedAt = 0
  let loading = 0
  let disposed = false
  let latestFrame: HipsSkyFrame | null = null
  let notifyDome = false
  let frameRequest = 0
  let retryTimer = 0
  let preloadTimer = 0
  let preloadAt = 0
  let lastViewKey = ''
  const visibleByOrder = new Map<number, number[]>()
  let preloadTiles: { order: number; npix: number; key: string }[] | null = null
  // Po porażce jedno przerysowanie po RETRY_MS ponawia kafelki bez ruchu widoku.
  const retryLater = () => {
    if (!disposed && !retryTimer) retryTimer = window.setTimeout(() => {
      retryTimer = 0
      scheduleDraw(allskyState === 'failed')
    }, RETRY_MS + 100)
  }

  // Pobrania i animacja odświeżają płótno warstwy. Kopuła musi zareagować tylko na stan podkładu.
  const scheduleDraw = (allskyChanged = false) => {
    if (disposed) return
    notifyDome ||= allskyChanged
    if (frameRequest) return
    frameRequest = requestAnimationFrame(() => {
      frameRequest = 0
      if (disposed || gl.isContextLost()) return
      if (notifyDome) {
        notifyDome = false
        onLoaded()
      } else if (latestFrame) layer.draw(latestFrame)
    })
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
      scheduleDraw(true)
    } catch (e) {
      allskyState = 'failed'
      allskyFailedAt = performance.now()
      retryLater()
      scheduleDraw(true)
      console.error('Kopuła: podkład NSNS', e)
    }
  }

  function request(order: number, npix: number, key: string) {
    const tile: Tile = { image: null, shown: false, lastDrawn: 0, failedAt: null }
    tiles.set(key, tile)
    loading++
    fetchTile(survey, order, npix)
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => {
        if (disposed || gl.isContextLost() || tiles.get(key) !== tile) { bitmap.close(); return }
        const tex = texture(bitmap, true)
        bitmap.close()
        tile.image = { tex, mesh: mesh(tileMesh(order, npix, segmentsFor(order))) }
      })
      .catch((err: unknown) => {
        if (disposed) return
        if ((err as { missing?: boolean } | null)?.missing === true) tile.missing = true
        else { tile.failedAt = performance.now(); retryLater() }
      })
      // Także po porażce: zwolnione miejsce w kolejce pozwala pobrać następne kafelki bez ruchu widoku.
      .finally(() => { loading--; scheduleDraw() })
  }

  function evict(keep: ReadonlySet<string>) {
    const withTex = [...tiles.entries()].filter(([, t]) => t.image)
    let excess = withTex.length - MAX_TEXTURES
    if (excess <= 0) return
    withTex.sort((a, b) => a[1].lastDrawn - b[1].lastDrawn)
    for (const [key, t] of withTex) {
      if (keep.has(key) || !t.image) continue
      gl.deleteTexture(t.image.tex)
      freeMesh(t.image.mesh)
      tiles.delete(key)
      if (--excess === 0) break
    }
  }

  const draw = (m: Mesh) => {
    gl.bindVertexArray(m.vao)
    gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0)
  }

  const layer: HipsSkyLayer = {
    ready: () => allsky !== null,
    failed: () => allskyState === 'failed',
    draw(f) {
      latestFrame = f
      const canvas = gl.canvas as HTMLCanvasElement
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      const now = performance.now()
      if (allskyState === 'failed' && now - allskyFailedAt > RETRY_MS) allskyState = 'idle'
      if (allskyState === 'idle' && !allsky && f.allowDecode) void loadAllsky()
      const view = tileView(f)
      const viewKey = [f.scale, f.width, f.height, f.cx, f.cy, ...f.eqToView, ...f.zen].join('/')
      if (viewKey !== lastViewKey) {
        lastViewKey = viewKey
        visibleByOrder.clear()
        preloadTiles = null
        preloadAt = now + PRELOAD_DELAY_MS
        window.clearTimeout(preloadTimer)
        preloadTimer = 0
      }
      const inView = (order: number) => {
        let pixels = visibleByOrder.get(order)
        if (!pixels) {
          pixels = visibleTiles(order, view, f.zen, NSNS_EDGE_DEC - 1)
          visibleByOrder.set(order, pixels)
        }
        return pixels
      }
      if (fade) {
        // Długa klatka wydłuża przejście, zachowując pośrednie stopnie ostrości.
        fade.elapsed += Math.min(now - fade.lastFrameAt, MAX_FADE_STEP_MS)
        fade.lastFrameAt = now
        if (fade.elapsed >= FADE_MS) {
          const { order, tiles: shown } = fade
          shownOrders = order === null ? [] : [...shownOrders.filter((old) => old !== order), order]
          for (const tile of shown) tile.shown = true
          fade = null
        }
      }

      const order = detailOrder(view.arcsecPerPx, survey.maxOrder)
      const keep = new Set<string>()
      let waiting = false
      if (order !== null) {
        const changedOrder = shownOrders.at(-1) !== order
        let hasNewImage = false
        for (const p of inView(order)) {
          const key = `${order}/${p}`
          keep.add(key)
          const tile = tiles.get(key)
          if (tile?.image) {
            hasNewImage ||= changedOrder || !tile.shown
          } else {
            waiting ||= !tile?.missing && tile?.failedAt == null
            const canRequest = !tile || (!tile.missing && tile.failedAt !== null && now - tile.failedAt > RETRY_MS)
            if (canRequest && f.allowDecode && loading < MAX_LOADING) request(order, p, key)
          }
        }
        if (!fade && !waiting && hasNewImage) {
          // Ustalamy zestaw na całą animację, także dla gotowych tekstur, które mogą wejść w kadr podczas ruchu.
          const ready = new Set<Tile>()
          for (const [key, tile] of tiles) {
            if (key.startsWith(`${order}/`) && tile.image && (changedOrder || !tile.shown)) ready.add(tile)
          }
          fade = { order, elapsed: 0, lastFrameAt: now, tiles: ready }
        }
      } else if (!fade && shownOrders.length && allsky) {
        fade = { order: null, elapsed: 0, lastFrameAt: now, tiles: new Set() }
      }

      gl.useProgram(prog)
      // Gotowy kafelek zastępuje podkład. Krycie horyzontu i zmierzchu obowiązuje raz, niezależnie od liczby warstw.
      gl.disable(gl.BLEND)
      gl.uniformMatrix3fv(uM, true, new Float32Array(f.eqToView))
      gl.uniform3f(uZen, f.zen[0], f.zen[1], f.zen[2])
      gl.uniform1f(uScale, f.scale * f.dpr)
      gl.uniform2f(uCenter, f.cx * f.dpr, (f.height - f.cy) * f.dpr)
      gl.uniform2f(uRes, f.width * f.dpr, f.height * f.dpr)
      gl.uniform1f(uBright, f.bright)
      gl.uniform1i(uSwapRedBlue, f.swapRedBlue ? 1 : 0)
      // Brzeg pokrycia wygaszany w pasie ±0,5° wokół granicy (sin δ).
      gl.uniform2f(uEdge, Math.sin((NSNS_EDGE_DEC - 0.5) * DEG), Math.sin((NSNS_EDGE_DEC + 0.5) * DEG))
      gl.activeTexture(gl.TEXTURE0)
      const drawAllsky = () => {
        if (!allsky) return
        gl.bindTexture(gl.TEXTURE_2D, allsky.tex)
        for (const p of inView(ALLSKY_ORDER)) {
          let m = allskyMeshes.get(p)
          if (!m) allskyMeshes.set(p, (m = mesh(tileMesh(ALLSKY_ORDER, p, segmentsFor(ALLSKY_ORDER), allskyUvRect(p, allsky.width, allsky.height)))))
          draw(m)
        }
      }
      const visibleImages = (level: number, include: (tile: Tile) => boolean) => {
        const images: TileImage[] = []
        for (const p of inView(level)) {
          const key = `${level}/${p}`
          const tile = tiles.get(key)
          if (!tile?.image || !include(tile)) continue
          keep.add(key)
          tile.lastDrawn = now
          images.push(tile.image)
        }
        return images
      }
      const drawImage = (image: TileImage) => {
        gl.bindTexture(gl.TEXTURE_2D, image.tex)
        draw(image.mesh)
      }
      drawAllsky()
      const layers: TileImage[][] = []
      for (let i = shownOrders.length - 1; i >= 0; i--) {
        const level = shownOrders[i]
        const images = visibleImages(level, (tile) => tile.shown)
        layers.push(images)
        if (images.length === inView(level).length) break
      }
      for (let i = layers.length - 1; i >= 0; i--) layers[i].forEach(drawImage)

      if (fade) {
        const t = fade.elapsed / FADE_MS
        if (t > 0) {
          // Kolor i krycie obu poziomów mieszamy z tą samą wagą dla całego widoku.
          gl.enable(gl.BLEND)
          gl.blendColor(0, 0, 0, t * t * (3 - 2 * t))
          gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA)
          if (fade.order === null) drawAllsky()
          else {
            const incoming = fade.tiles
            visibleImages(fade.order, (tile) => incoming.has(tile)).forEach(drawImage)
          }
        }
        scheduleDraw()
      }
      gl.bindVertexArray(null)

      if (allsky && f.allowDecode && !waiting && !fade) {
        if (now < preloadAt) {
          if (!preloadTimer) preloadTimer = window.setTimeout(() => {
            preloadTimer = 0
            scheduleDraw()
          }, preloadAt - now)
        } else {
          if (!preloadTiles) {
            const levels = order === null ? [1] : [order + 1, order - 1]
            preloadTiles = levels.filter((level) => level > 0 && level <= survey.maxOrder).flatMap((level) => {
              // Bierzemy pole dopiero na progu zmiany rozdzielczości. Przy powiększaniu będzie ono mniejsze.
              const nextView = tileView({ ...f, scale: detailOrderScale(level) })
              return visibleTiles(level, nextView, f.zen, NSNS_EDGE_DEC - 1)
                .map((npix) => ({ order: level, npix, key: `${level}/${npix}` }))
            })
          }
          for (const next of preloadTiles) {
            if (keep.size >= MAX_TEXTURES) break
            keep.add(next.key)
            // Pozostałe miejsca w kolejce są dostępne od razu po ruchu mapy.
            if (loading < MAX_PRELOAD_LOADING && !tiles.has(next.key)) request(next.order, next.npix, next.key)
          }
        }
      }
      evict(keep)
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frameRequest)
      clearTimeout(retryTimer)
      window.clearTimeout(preloadTimer)
      if (gl.isContextLost()) return
      for (const t of tiles.values()) {
        if (!t.image) continue
        gl.deleteTexture(t.image.tex)
        freeMesh(t.image.mesh)
      }
      allskyMeshes.forEach(freeMesh)
      if (allsky) gl.deleteTexture(allsky.tex)
      gl.deleteProgram(prog)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    },
  }
  return layer
}
