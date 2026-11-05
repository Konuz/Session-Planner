// Warstwa WebGL2 moich zdjęć na kopule, w kontekście gwiazd (rysowana po nich). Zdjęcia w pełni kryjące idą do bufora
// poza ekranem, a bufor jest nakładany raz z kryciem z suwaka: w miejscu zachodzenia zdjęć krycie się nie sumuje.
// Tekstury dekodowane po jednym, w rozmiarze dobranym do zdjęcia na ekranie; bitmapy nie zostają w pamięci JS.
import type { Mat3 } from './astro'
import type { HorizonPoint } from './horizon'
import type { OwnPhotoRecord } from './ownPhoto'
import { drawOrder, evictionOrder, projectMesh, skyPhotos, textureBytes, textureLevel, TEXTURE_BUDGET_BYTES, type ProjectedMesh, type SkyPhoto } from './ownPhotoSky'
import type { Projector } from './projection'

export interface SkyPhotoFrame {
  proj: Projector
  horMatrix: Mat3
  horizon: readonly HorizonPoint[]
  /** Rozmiar sceny w px CSS. */
  width: number
  height: number
  dpr: number
  opacity: number
  selectedId: string | null
  /** Fałsz podczas odtwarzania nocy: rysowane tylko już załadowane tekstury. */
  allowDecode: boolean
}

export interface SkyPhotoLayer {
  setPhotos(records: readonly OwnPhotoRecord[]): void
  draw(frame: SkyPhotoFrame): void
  dispose(): void
}

const PHOTO_VS = `#version 300 es
layout(location = 0) in vec2 a_xy;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in float a_alpha;
uniform vec2 u_res;
out vec2 v_uv;
out float v_alpha;
void main() {
  v_uv = a_uv;
  v_alpha = a_alpha;
  gl_Position = vec4(a_xy.x / u_res.x * 2.0 - 1.0, 1.0 - a_xy.y / u_res.y * 2.0, 0.0, 1.0);
}`

// Krawędź zdjęcia wygładzona na ok. 1 px (kontekst bez antyaliasingu); maska czarnych brzegów w kanale czerwonym
// (bez maski: biała tekstura 1 × 1). Próg maski od 0,5: brzeg cofa się o pół teksela od czerni, więc filtrowanie
// obrazu nie wnosi ciemnej obwódki.
const PHOTO_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
in float v_alpha;
uniform sampler2D u_img;
uniform sampler2D u_mask;
out vec4 outColor;
void main() {
  vec2 d = min(v_uv, 1.0 - v_uv) / max(fwidth(v_uv), vec2(1e-6));
  float a = v_alpha * clamp(min(d.x, d.y), 0.0, 1.0);
  a *= smoothstep(0.5, 1.0, texture(u_mask, v_uv).r);
  outColor = vec4(texture(u_img, v_uv).rgb * a, a);
}`

const COMPOSE_VS = `#version 300 es
out vec2 v_uv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  v_uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`

const COMPOSE_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_layer;
uniform float u_opacity;
out vec4 outColor;
void main() {
  outColor = texture(u_layer, v_uv) * u_opacity;
}`

interface Entry {
  photo: SkyPhoto
  vao: WebGLVertexArrayObject
  buffers: WebGLBuffer[]
  xy: WebGLBuffer
  alpha: WebGLBuffer
  count: number
  img: WebGLTexture | null
  mask: WebGLTexture | null
  level: number
  bytes: number
  lastDrawn: number
  pending: boolean
  failed: boolean
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!
  const shaders = [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].map(([type, src]) => {
    const s = gl.createShader(type as number)!
    gl.shaderSource(s, src as string)
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

export function createSkyPhotoLayer(gl: WebGL2RenderingContext, onLoaded: () => void): SkyPhotoLayer {
  const photoProg = program(gl, PHOTO_VS, PHOTO_FS)
  const composeProg = program(gl, COMPOSE_VS, COMPOSE_FS)
  const uRes = gl.getUniformLocation(photoProg, 'u_res')
  const uOpacity = gl.getUniformLocation(composeProg, 'u_opacity')
  gl.useProgram(photoProg)
  gl.uniform1i(gl.getUniformLocation(photoProg, 'u_img'), 0)
  gl.uniform1i(gl.getUniformLocation(photoProg, 'u_mask'), 1)
  gl.useProgram(composeProg)
  gl.uniform1i(gl.getUniformLocation(composeProg, 'u_layer'), 0)
  const emptyVao = gl.createVertexArray()!
  const noMask = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, noMask)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([255]))
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number

  let photos: SkyPhoto[] = []
  const entries = new Map<string, Entry>()
  let frameNo = 0
  let lastDrawnKeys = new Set<string>()
  let disposed = false
  let fbo: WebGLFramebuffer | null = null
  let fboTex: WebGLTexture | null = null
  let fboW = 0
  let fboH = 0
  let fboOk = false

  const freeTextures = (e: Entry) => {
    if (e.img) gl.deleteTexture(e.img)
    if (e.mask) gl.deleteTexture(e.mask)
    e.img = null
    e.mask = null
    e.level = 0
    e.bytes = 0
  }

  const createEntry = (photo: SkyPhoto): Entry => {
    const { mesh } = photo
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    const attribute = (loc: number, size: number, data: Float32Array, usage: number) => {
      const b = gl.createBuffer()!
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.bufferData(gl.ARRAY_BUFFER, data, usage)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
      return b
    }
    const n = mesh.dirs.length
    const xy = attribute(0, 2, new Float32Array(2 * n), gl.DYNAMIC_DRAW)
    const uv = attribute(1, 2, mesh.uv, gl.STATIC_DRAW)
    const alpha = attribute(2, 1, new Float32Array(n), gl.DYNAMIC_DRAW)
    const idx = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW)
    gl.bindVertexArray(null)
    return { photo, vao, buffers: [xy, uv, alpha, idx], xy, alpha, count: mesh.indices.length, img: null, mask: null, level: 0, bytes: 0, lastDrawn: 0, pending: false, failed: false }
  }

  const deleteEntry = (e: Entry) => {
    freeTextures(e)
    gl.deleteVertexArray(e.vao)
    e.buffers.forEach((b) => gl.deleteBuffer(b))
  }

  const texture = (source: ImageBitmap, internal: number, format: number): WebGLTexture => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, format, gl.UNSIGNED_BYTE, source)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }

  // Kolejka dekodowania: po jednym zdjęciu naraz, więc szczyt pamięci to jedno zdekodowane zdjęcie.
  const queue: { e: Entry; level: number }[] = []
  let busy = false

  const load = async (e: Entry, level: number) => {
    const { record } = e.photo
    const k = level / Math.max(record.width, record.height)
    const opts: ImageBitmapOptions = {
      resizeWidth: Math.max(1, Math.round(record.width * k)),
      resizeHeight: Math.max(1, Math.round(record.height * k)),
      resizeQuality: 'high',
    }
    const img = await createImageBitmap(record.image, opts)
    let mask: ImageBitmap | null = null
    try {
      // Błąd samej maski: zdjęcie rysowane bez niej.
      mask = record.mask ? await createImageBitmap(record.mask, opts).catch((err: unknown) => {
        console.warn('Kopuła: maska mojego zdjęcia', e.photo.key, err)
        return null
      }) : null
      // Zdjęcie usunięte z zestawu, warstwa zamknięta albo kontekst utracony w trakcie dekodowania: tylko sprzątanie.
      if (disposed || gl.isContextLost() || entries.get(e.photo.key) !== e) return
      freeTextures(e)
      e.img = texture(img, gl.RGBA8, gl.RGBA)
      e.mask = mask ? texture(mask, gl.R8, gl.RED) : null
      e.level = level
      e.bytes = textureBytes(img.width, img.height, !!mask)
    } finally {
      img.close()
      mask?.close()
    }
    const keep = new Set([...lastDrawnKeys, e.photo.key])
    const loaded = [...entries.entries()].filter(([, x]) => x.img).map(([key, x]) => ({ key, bytes: x.bytes, lastDrawn: x.lastDrawn }))
    // Bufor poza ekranem liczy się do tego samego limitu pamięci.
    for (const key of evictionOrder(loaded, TEXTURE_BUDGET_BYTES - fboW * fboH * 4, keep)) freeTextures(entries.get(key)!)
    onLoaded()
  }

  const pump = async () => {
    if (busy || disposed) return
    const job = queue.shift()
    if (!job) return
    // Zdjęcie usunięte z zestawu, zanim przyszła jego kolej: bez dekodowania.
    if (entries.get(job.e.photo.key) !== job.e) {
      job.e.pending = false
      void pump()
      return
    }
    busy = true
    try {
      await load(job.e, job.level)
    } catch (err) {
      job.e.failed = true
      console.warn('Kopuła: moje zdjęcie', job.e.photo.key, err)
    } finally {
      job.e.pending = false
      busy = false
      void pump()
    }
  }

  const ensureTarget = (w: number, h: number) => {
    if (fbo && fboW === w && fboH === h) return
    if (!fbo) {
      fbo = gl.createFramebuffer()!
      fboTex = gl.createTexture()!
    }
    gl.bindTexture(gl.TEXTURE_2D, fboTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0)
    fboOk = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    if (!fboOk) console.warn('Kopuła: bufor warstwy moich zdjęć niekompletny', w, h)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    fboW = w
    fboH = h
  }

  return {
    setPhotos(records) {
      photos = skyPhotos(records)
      const keys = new Set(photos.map((p) => p.key))
      for (const [key, e] of entries) {
        if (keys.has(key)) continue
        deleteEntry(e)
        entries.delete(key)
      }
      for (const p of photos) {
        const e = entries.get(p.key)
        if (e) e.photo = p
        else entries.set(p.key, createEntry(p))
      }
    },

    draw({ proj, horMatrix, horizon, width, height, dpr, opacity, selectedId, allowDecode }) {
      if (disposed || gl.isContextLost()) return
      frameNo++
      const visible: { e: Entry; pm: ProjectedMesh }[] = []
      for (const photo of drawOrder(photos, selectedId)) {
        const e = entries.get(photo.key)
        if (!e) continue
        const pm = projectMesh(photo.mesh, proj, horMatrix, horizon, width, height)
        if (!pm) continue
        const needed = textureLevel(pm.longSidePx * dpr, Math.max(photo.record.width, photo.record.height), maxTexture)
        if ((!e.img || e.level < needed) && !e.pending && !e.failed && allowDecode) {
          e.pending = true
          queue.push({ e, level: needed })
          void pump()
        }
        if (e.img) visible.push({ e, pm })
      }
      lastDrawnKeys = new Set(visible.map(({ e }) => e.photo.key))
      if (!visible.length) return

      const w = gl.drawingBufferWidth
      const h = gl.drawingBufferHeight
      ensureTarget(w, h)
      if (!fboOk) return
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.viewport(0, 0, w, h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(photoProg)
      gl.uniform2f(uRes, width, height)
      for (const { e, pm } of visible) {
        gl.bindVertexArray(e.vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, e.xy)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, pm.xy)
        gl.bindBuffer(gl.ARRAY_BUFFER, e.alpha)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, pm.alpha)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, e.img)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, e.mask ?? noMask)
        gl.drawElements(gl.TRIANGLES, e.count, gl.UNSIGNED_SHORT, 0)
        e.lastDrawn = frameNo
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, w, h)
      gl.useProgram(composeProg)
      gl.bindVertexArray(emptyVao)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, fboTex)
      gl.uniform1f(uOpacity, opacity)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.bindVertexArray(null)
      gl.bindTexture(gl.TEXTURE_2D, null)
    },

    dispose() {
      disposed = true
      queue.length = 0
      for (const e of entries.values()) deleteEntry(e)
      entries.clear()
      gl.deleteProgram(photoProg)
      gl.deleteProgram(composeProg)
      gl.deleteVertexArray(emptyVao)
      gl.deleteTexture(noMask)
      if (fbo) gl.deleteFramebuffer(fbo)
      if (fboTex) gl.deleteTexture(fboTex)
    },
  }
}
