// Kopuła nieba: gwiazdy w WebGL (rzut stereograficzny w shaderze), nakładka 2D z liniami i postaciami
// gwiazdozbiorów, horyzontem, torem obiektu i animacją „znajdź obiekt”. Rysuje tylko przy zmianie stanu.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  bodyAltAz,
  constellationOf,
  DEG,
  horizontalMatrix,
  horizontalToVec,
  moonInfo,
  mulVec,
  transpose,
  unitVector,
  vecToEquatorial,
  vecToHorizontal,
  type Mat3,
  type Vec3,
} from '../lib/astro'
import { displayName, type DSO } from '../lib/catalog'
import { horizonAltitude } from '../lib/horizon'
import { altitudeTrack, nightGrid } from '../lib/night'
import { affineFrom3, FULL_DOME, makeProjector, type Projector, type View } from '../lib/projection'
import { loadSky, type SkyData } from '../lib/sky'
import { useCatalog, useNight, useSelected, useSite, useTime } from '../state/data'
import { useStore } from '../state/store'

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

// ---------- WebGL: gwiazdy ----------

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
out vec3 v_color;
out float v_alpha;
vec3 bvColor(float bv) {
  float t = clamp((bv + 0.3) / 2.0, 0.0, 1.0);
  return mix(vec3(0.70, 0.82, 1.0), mix(vec3(1.0, 0.98, 0.94), vec3(1.0, 0.78, 0.55), smoothstep(0.35, 1.0, t)), smoothstep(0.0, 0.35, t));
}
void main() {
  vec3 v = u_m * a_dir;
  float d = 1.0 + v.z;
  float alt = dot(u_zen, a_dir);
  if (d < 0.02 || a_magbv.x > u_magLimit) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); gl_PointSize = 0.0; return; }
  vec2 p = u_center + 2.0 * u_scale * v.xy / d;
  vec2 clip = vec2(p.x / u_res.x * 2.0 - 1.0, p.y / u_res.y * 2.0 - 1.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  float m = u_magLimit - a_magbv.x;
  gl_PointSize = clamp(2.4 + m * 1.45, 2.4, 15.0) * u_dpr;
  v_color = bvColor(a_magbv.y);
  v_alpha = clamp(0.5 + m * 0.18, 0.45, 1.0) * smoothstep(-0.03, 0.01, alt) * u_bright;
}`

const FS = `#version 300 es
precision mediump float;
in vec3 v_color;
in float v_alpha;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = dot(c, c);
  if (r > 1.0) discard;
  float d = sqrt(r);
  float a = smoothstep(1.0, 0.0, d);
  a = (a * a * 0.75 + exp(-r * 18.0) * 0.5) * v_alpha;
  outColor = vec4(v_color * a, a);
}`

interface StarGL {
  draw(m: Mat3, zen: Vec3, p: Projector, width: number, height: number, dpr: number, magLimit: number, bright: number): void
  dispose(): void
}

function createStarGL(canvas: HTMLCanvasElement, sky: SkyData): StarGL | null {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true })
  if (!gl) return null
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(prog)
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
  }
  buf(dirs, 'a_dir', 3)
  buf(magbv, 'a_magbv', 2)
  const u = (name: string) => gl.getUniformLocation(prog, name)
  const uM = u('u_m'), uZen = u('u_zen'), uScale = u('u_scale'), uCenter = u('u_center'), uRes = u('u_res'), uMag = u('u_magLimit'), uDpr = u('u_dpr'), uBright = u('u_bright')
  return {
    draw(m, zen, p, width, height, dpr, magLimit, bright) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      // WebGL ma oś Y w górę: środek rzutu podany jako H − cy, a „góra” widoku to +Y w obu układach.
      gl.uniformMatrix3fv(uM, true, new Float32Array(m))
      gl.uniform3f(uZen, zen[0], zen[1], zen[2])
      gl.uniform1f(uScale, p.scale * dpr)
      gl.uniform2f(uCenter, p.cx * dpr, (height - p.cy) * dpr)
      gl.uniform2f(uRes, width * dpr, height * dpr)
      gl.uniform1f(uMag, magLimit)
      gl.uniform1f(uDpr, Math.min(dpr, 1.5))
      gl.uniform1f(uBright, bright)
      gl.drawArrays(gl.POINTS, 0, n)
    },
    dispose() {
      // Kontekst zostaje przy płótnie (StrictMode tworzy scenę dwa razy); zwalniamy tylko bufory i program.
      gl.deleteProgram(prog)
      gl.deleteVertexArray(vao)
    },
  }
}

// ---------- Komponent ----------

interface Props {
  /** Animacja czasu (odtwarzanie) — wyłącza ciężkie elementy pośrednie. */
  playing?: boolean
}

export function SkyDome({ playing = false }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const [sky, setSky] = useState<SkyData | null>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState<View>(FULL_DOME)
  const [hoverCon, setHoverCon] = useState<{ abbr: string; x: number; y: number; since: number } | null>(null)
  const [, setFrame] = useState(0)
  const anim = useRef<{ from: View; to: View; start: number; dur: number } | null>(null)
  const lockStart = useRef(0)
  const artCache = useRef(new Map<string, HTMLImageElement>())
  const starGL = useRef<StarGL | null>(null)
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null)

  const site = useSite()
  const time = useTime()
  const night = useNight()
  const { catalog } = useCatalog()
  const selected = useSelected()
  const horizon = useStore((s) => s.horizon)
  const showLines = useStore((s) => s.showLines)
  const showTracks = useStore((s) => s.showTracks)
  const showArt = useStore((s) => s.showArt)
  const showLabels = useStore((s) => s.showLabels)
  const findPulse = useStore((s) => s.findPulse)
  const plan = useStore((s) => s.plan)
  const select = useStore((s) => s.select)
  const tz = useStore((s) => s.location.timeZone)

  useEffect(() => {
    loadSky().then(setSky).catch(() => setSky(null))
  }, [])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(200, e.contentRect.width), h: Math.max(200, e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!sky || !glRef.current) return
    try {
      starGL.current = createStarGL(glRef.current, sky)
    } catch (e) {
      console.error('Kopuła: WebGL niedostępny', e)
      starGL.current = null
    }
    setFrame((f) => f + 1)
    return () => {
      starGL.current?.dispose()
      starGL.current = null
    }
  }, [sky])

  const horMatrix = useMemo(() => horizontalMatrix(time, site), [time, site])
  const sun = useMemo(() => bodyAltAz('sun', time, site), [time, site])
  const moon = useMemo(() => ({ ...bodyAltAz('moon', time, site), info: moonInfo(time) }), [time, site])

  // Tor wybranego obiektu przez noc (co 5 min).
  const grid = useMemo(() => nightGrid(night, site, 10), [night, site])
  const track = useMemo(() => (selected ? altitudeTrack(selected, grid) : []), [selected, grid])
  const messier = useMemo(() => (catalog ? catalog.filter((o) => o.catalogs.includes('M')) : []), [catalog])
  const planObjects = useMemo(() => (catalog ? plan.map((p) => catalog[p.objectIndex]).filter(Boolean) : []), [catalog, plan])

  // Animacja „znajdź obiekt”: przelot widoku do obiektu i namierzanie.
  useEffect(() => {
    if (!selected || findPulse === 0) return
    const h = vecToHorizontal(mulVec(horizontalMatrix(time, site), unitVector(selected.raDeg, selected.decDeg)))
    const fov = Math.max(28, Math.min(70, (selected.majArcmin / 60) * 40))
    // Obiekt pod horyzontem: widok na horyzont w jego kierunku, żeby było widać, gdzie wzejdzie.
    const target: View = { azDeg: h.azDeg, altDeg: Math.max(h.altDeg < 0 ? fov * 0.3 : -10, Math.min(89.9, h.altDeg)), fovDeg: fov }
    if (reducedMotion()) {
      setView(target)
      return
    }
    // Najpierw krótko do pełnej kopuły (jeśli przybliżono), potem do obiektu.
    anim.current = { from: view, to: target, start: performance.now(), dur: 1400 }
    lockStart.current = performance.now() + 1100
    setFrame((f) => f + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findPulse])

  // Pętla animacji tylko wtedy, gdy coś się porusza.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const now = performance.now()
      let again = false
      const a = anim.current
      if (a) {
        const k = Math.min(1, (now - a.start) / a.dur)
        const e = easeInOut(k)
        // Azymut po krótszym łuku; w środku drogi lekkie oddalenie (efekt „przelotu”).
        let dAz = ((a.to.azDeg - a.from.azDeg + 540) % 360) - 180
        if (a.from.altDeg > 89) dAz = 0
        const lift = Math.sin(Math.PI * e) * 25
        setView({
          azDeg: (a.from.altDeg > 89 ? a.to.azDeg : a.from.azDeg + dAz * e),
          altDeg: a.from.altDeg + (a.to.altDeg - a.from.altDeg) * e,
          fovDeg: Math.min(184, a.from.fovDeg + (a.to.fovDeg - a.from.fovDeg) * e + lift),
        })
        if (k < 1) again = true
        else anim.current = null
      }
      if (now - lockStart.current < 1600) again = true
      if (hoverCon && now - hoverCon.since < 500) again = true
      setFrame((f) => (f + 1) % 1e9)
      if (again) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findPulse, hoverCon?.abbr])

  const dpr = Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)
  const radius = Math.min(size.w, size.h) / 2 - 18
  const proj = useMemo(() => makeProjector(horMatrix, view, size.w / 2, size.h / 2, radius), [horMatrix, view, size, radius])

  // ---------- Rysowanie ----------
  useEffect(() => {
    const overlay = overlayRef.current
    const glCanvas = glRef.current
    if (!overlay || !glCanvas) return
    for (const c of [overlay, glCanvas]) {
      const w = Math.round(size.w * dpr)
      const h = Math.round(size.h * dpr)
      if (c.width !== w || c.height !== h) {
        c.width = w
        c.height = h
      }
    }
    const ctx = overlay.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    const fullDome = view.fovDeg > 150
    const zen: Vec3 = [horMatrix[6], horMatrix[7], horMatrix[8]]
    // Jasność nieba ze Słońca: dzień przygasza gwiazdy.
    const sunAlt = sun.altDeg
    const bright = sunAlt > 0 ? 0.08 : sunAlt > -6 ? 0.25 : sunAlt > -12 ? 0.6 : sunAlt > -18 ? 0.85 : 1
    const magLimit = Math.min(6.6, 4.6 + (184 - view.fovDeg) / 50)
    starGL.current?.draw(proj.eqToView, zen, proj, size.w, size.h, dpr, magLimit, bright)

    // Tło kopuły: kolor nieba zależny od Słońca (rysowany pod gwiazdami jako tło sceny).
    const stage = stageRef.current
    if (stage) {
      const sky1 = sunAlt > 0 ? '#16325a' : sunAlt > -6 ? '#0f2547' : sunAlt > -12 ? '#0a1934' : sunAlt > -18 ? '#071226' : '#040a18'
      stage.style.background = `radial-gradient(circle at 50% 50%, ${sky1} 0%, #02050d ${fullDome ? 62 : 120}%, #000 100%)`
    }

    const toScreenHor = (alt: number, az: number) => proj.hor(horizontalToVec({ altDeg: alt, azDeg: az }))

    // Siatka wysokości (pierścienie co 20°) i kierunki świata.
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(120, 150, 200, 0.16)'
    ctx.font = '11px ui-monospace, Consolas, monospace'
    ctx.fillStyle = 'rgba(160, 180, 210, 0.55)'
    for (const alt of [0, 20, 40, 60, 80]) {
      ctx.beginPath()
      let first = true
      for (let az = 0; az <= 360; az += 3) {
        const p = toScreenHor(alt, az)
        if (!p) {
          first = true
          continue
        }
        if (first) ctx.moveTo(p[0], p[1])
        else ctx.lineTo(p[0], p[1])
        first = false
      }
      ctx.stroke()
      if (alt > 0) {
        const p = toScreenHor(alt, 315)
        if (p) ctx.fillText(`${alt}°`, p[0] + 4, p[1] - 4)
      }
    }
    for (let az = 0; az < 360; az += 45) {
      ctx.beginPath()
      const a = toScreenHor(0, az)
      const b = toScreenHor(80, az)
      if (a && b) {
        ctx.moveTo(a[0], a[1])
        ctx.lineTo(b[0], b[1])
        ctx.strokeStyle = 'rgba(120, 150, 200, 0.07)'
        ctx.stroke()
      }
    }
    // Południk (N–zenit–S) przerywaną linią.
    ctx.setLineDash([3, 6])
    ctx.strokeStyle = 'rgba(0, 224, 255, 0.22)'
    ctx.beginPath()
    let first = true
    for (let alt = 0; alt <= 180; alt += 2) {
      const p = alt <= 90 ? toScreenHor(alt, 180) : toScreenHor(180 - alt, 0)
      if (!p) continue
      if (first) ctx.moveTo(p[0], p[1])
      else ctx.lineTo(p[0], p[1])
      first = false
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Linie gwiazdozbiorów.
    if (sky && showLines) {
      ctx.lineWidth = 1
      for (const c of sky.constellations) {
        const hovered = hoverCon?.abbr === c.abbr
        ctx.strokeStyle = hovered ? 'rgba(0, 224, 255, 0.75)' : 'rgba(150, 190, 230, 0.28)'
        ctx.lineWidth = hovered ? 1.4 : 1
        ctx.beginPath()
        for (const line of c.lines) {
          let prev: [number, number] | null = null
          for (const [ra, dec] of line) {
            const p = proj.eq(unitVector(ra, dec))
            if (p && prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < size.w) {
              ctx.moveTo(prev[0], prev[1])
              ctx.lineTo(p[0], p[1])
            }
            prev = p
          }
        }
        ctx.stroke()
      }
    }

    // Postać gwiazdozbioru pod kursorem: półprzezroczysta nakładka z płynnym pojawieniem.
    if (sky && showArt && hoverCon && !playing) {
      const c = sky.byAbbr.get(hoverCon.abbr)
      if (c?.art) {
        let img = artCache.current.get(c.art.file)
        if (!img) {
          img = new Image()
          img.decoding = 'async'
          img.src = `/data/art/${c.art.file}`
          img.onload = () => setFrame((f) => f + 1)
          artCache.current.set(c.art.file, img)
        }
        const dst = c.art.anchors.map(([, , ra, dec]) => proj.eq(unitVector(ra, dec)))
        if (img.complete && img.naturalWidth && dst.every((d) => d !== null)) {
          const m = affineFrom3(
            c.art.anchors.map(([x, y]) => [x, y] as [number, number]),
            dst as [number, number][],
          )
          if (m) {
            const k = Math.min(1, (performance.now() - hoverCon.since) / 450)
            ctx.save()
            ctx.globalAlpha = 0.42 * easeInOut(k)
            ctx.globalCompositeOperation = 'screen'
            ctx.setTransform(m[0] * dpr, m[1] * dpr, m[2] * dpr, m[3] * dpr, m[4] * dpr, m[5] * dpr)
            ctx.drawImage(img, 0, 0, 384, 384)
            ctx.restore()
          }
        }
      }
    }

    // Nazwy gwiazdozbiorów.
    if (sky && showLabels) {
      ctx.textAlign = 'center'
      for (const c of sky.constellations) {
        if (!c.label) continue
        if (fullDome && c.label[2] > 2) continue
        const lv = unitVector(c.label[0], c.label[1])
        if (horMatrix[6] * lv[0] + horMatrix[7] * lv[1] + horMatrix[8] * lv[2] < 0.02) continue
        const p = proj.eq(lv)
        if (!p) continue
        const hovered = hoverCon?.abbr === c.abbr
        ctx.font = hovered ? '600 13px system-ui, sans-serif' : '12px system-ui, sans-serif'
        ctx.fillStyle = hovered ? 'rgba(0, 224, 255, 0.95)' : 'rgba(190, 205, 230, 0.55)'
        ctx.fillText(c.pl, p[0], p[1])
      }
      ctx.textAlign = 'start'
    }

    // Obiekty Messiera (małe znaczniki) przy przybliżeniu.
    if (view.fovDeg < 150) {
      ctx.font = '10px ui-monospace, Consolas, monospace'
      for (const o of messier) {
        const p = proj.eq(unitVector(o.raDeg, o.decDeg))
        if (!p || p[0] < 0 || p[1] < 0 || p[0] > size.w || p[1] > size.h) continue
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.55)'
        ctx.beginPath()
        ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2)
        ctx.stroke()
        if (view.fovDeg < 90) {
          ctx.fillStyle = 'rgba(200, 190, 255, 0.6)'
          ctx.fillText(o.id.replace(' ', ''), p[0] + 6, p[1] + 3)
        }
      }
    }

    // Księżyc z fazą i Słońce.
    const drawBody = (alt: number, az: number, r: number, kind: 'moon' | 'sun') => {
      const p = toScreenHor(alt, az)
      if (!p) return
      ctx.save()
      if (kind === 'sun') {
        const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 3)
        g.addColorStop(0, 'rgba(255, 220, 140, 0.9)')
        g.addColorStop(1, 'rgba(255, 180, 60, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p[0], p[1], r * 3, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const f = moon.info.illumination
        ctx.fillStyle = 'rgba(40, 46, 60, 0.95)'
        ctx.beginPath()
        ctx.arc(p[0], p[1], r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#e8ecf2'
        ctx.beginPath()
        const dir = moon.info.waxing ? 1 : -1
        ctx.arc(p[0], p[1], r, -Math.PI / 2, Math.PI / 2, dir < 0)
        ctx.ellipse(p[0], p[1], Math.abs(1 - 2 * f) * r, r, 0, Math.PI / 2, -Math.PI / 2, (f > 0.5) !== dir > 0)
        ctx.fill()
        ctx.shadowColor = 'rgba(230, 236, 255, 0.6)'
        ctx.shadowBlur = 16
        ctx.strokeStyle = 'rgba(230, 236, 255, 0.3)'
        ctx.beginPath()
        ctx.arc(p[0], p[1], r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = 'rgba(220, 225, 235, 0.7)'
        ctx.font = '11px system-ui, sans-serif'
        ctx.shadowBlur = 0
        ctx.fillText('Księżyc', p[0] + r + 5, p[1] + 4)
      }
      ctx.restore()
    }
    if (moon.altDeg > -2) drawBody(moon.altDeg, moon.azDeg, Math.max(5, 9 * (184 / view.fovDeg) ** 0.5), 'moon')
    if (sun.altDeg > -2) drawBody(sun.altDeg, sun.azDeg, 8, 'sun')

    // Tor obiektu przez noc z godzinami.
    if (selected && showTracks && track.length) {
      ctx.save()
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = 'rgba(0, 224, 255, 0.75)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      let started = false
      const pts: { p: [number, number]; t: number; alt: number }[] = []
      for (const s of track) {
        const p = s.alt > -1 ? toScreenHor(s.alt, s.az) : null
        if (!p) {
          started = false
          continue
        }
        pts.push({ p, t: s.t, alt: s.alt })
        if (!started) ctx.moveTo(p[0], p[1])
        else ctx.lineTo(p[0], p[1])
        started = true
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.font = '10px ui-monospace, Consolas, monospace'
      for (const { p, t } of pts) {
        const local = new Date(t).toLocaleTimeString('pl-PL', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
        if (Number(local.slice(3, 5)) >= 10) continue
        ctx.fillStyle = 'rgba(0, 224, 255, 0.9)'
        ctx.beginPath()
        ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2)
        ctx.fill()
        if (Number(local.slice(0, 2)) % 2 === 0) {
          ctx.fillStyle = 'rgba(160, 220, 240, 0.65)'
          ctx.fillText(local.slice(0, 2), p[0] + 5, p[1] - 4)
        }
      }
      if (pts.length) {
        for (const end of [pts[0], pts[pts.length - 1]]) {
          ctx.fillStyle = '#9ef3ff'
          ctx.beginPath()
          ctx.arc(end.p[0], end.p[1], 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
    }

    // Ziemia: obszar pod własnym horyzontem i pod 0°.
    ctx.save()
    const ground = ctx.createLinearGradient(0, size.h * 0.4, 0, size.h)
    ground.addColorStop(0, 'rgba(3, 6, 12, 0.92)')
    ground.addColorStop(1, 'rgba(0, 0, 0, 0.98)')
    ctx.fillStyle = ground
    ctx.beginPath()
    first = true
    for (let az = 0; az <= 360; az += 2) {
      const p = toScreenHor(horizonAltitude(horizon, az), az)
      if (!p) {
        first = true
        continue
      }
      if (first) ctx.moveTo(p[0], p[1])
      else ctx.lineTo(p[0], p[1])
      first = false
    }
    if (fullDome) {
      // Pełna kopuła: wszystko poza linią horyzontu (prostokąt minus wnętrze, reguła evenodd).
      ctx.closePath()
      ctx.rect(0, 0, size.w, size.h)
      ctx.fill('evenodd')
    } else {
      for (let az = 360; az >= 0; az -= 6) {
        const p = toScreenHor(-60, az)
        if (p) ctx.lineTo(p[0], p[1])
      }
      ctx.closePath()
      ctx.fill()
    }
    ctx.strokeStyle = horizon.length ? 'rgba(245, 165, 36, 0.55)' : 'rgba(0, 224, 255, 0.35)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    first = true
    for (let az = 0; az <= 360; az += 2) {
      const p = toScreenHor(horizonAltitude(horizon, az), az)
      if (!p) {
        first = true
        continue
      }
      if (first) ctx.moveTo(p[0], p[1])
      else ctx.lineTo(p[0], p[1])
      first = false
    }
    ctx.stroke()
    ctx.restore()

    // Kierunki świata.
    ctx.font = '600 14px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const [label, az] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const) {
      const p = toScreenHor(fullDome ? -3.5 : 2, az)
      if (!p || p[0] < 0 || p[0] > size.w || p[1] < 0 || p[1] > size.h) continue
      ctx.fillStyle = 'rgba(230, 240, 255, 0.9)'
      ctx.fillText(label, p[0], p[1])
    }
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'

    // Obiekty z planu.
    ctx.font = '11px ui-monospace, Consolas, monospace'
    for (const o of planObjects) {
      if (!o || o.i === selected?.i) continue
      const p = proj.eq(unitVector(o.raDeg, o.decDeg))
      if (!p) continue
      ctx.strokeStyle = 'rgba(245, 165, 36, 0.85)'
      ctx.strokeRect(p[0] - 4, p[1] - 4, 8, 8)
      ctx.fillStyle = 'rgba(245, 200, 120, 0.85)'
      ctx.fillText(o.id, p[0] + 7, p[1] + 4)
    }

    // Wybrany obiekt: celownik i animacja namierzania.
    if (selected) {
      const p = proj.eq(unitVector(selected.raDeg, selected.decDeg))
      if (p) {
        const now = performance.now()
        const k = Math.max(0, Math.min(1, (now - lockStart.current) / 900))
        const e = 1 - (1 - k) ** 3
        const r = 9 + (1 - e) * 40
        ctx.save()
        ctx.strokeStyle = '#00e0ff'
        ctx.shadowColor = '#00e0ff'
        ctx.shadowBlur = 12
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.4 + 0.6 * e
        ctx.beginPath()
        ctx.arc(p[0], p[1], r, 0, Math.PI * 2)
        ctx.stroke()
        // Kreski celownika.
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + (1 - e) * Math.PI
          ctx.beginPath()
          ctx.moveTo(p[0] + Math.cos(a) * (r + 4), p[1] + Math.sin(a) * (r + 4))
          ctx.lineTo(p[0] + Math.cos(a) * (r + 12), p[1] + Math.sin(a) * (r + 12))
          ctx.stroke()
        }
        if (k > 0 && k < 1) {
          ctx.globalAlpha = 1 - k
          ctx.beginPath()
          ctx.arc(p[0], p[1], 9 + k * 60, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.restore()
        ctx.font = '600 13px ui-monospace, Consolas, monospace'
        ctx.fillStyle = '#e6fbff'
        ctx.fillText(selected.id, p[0] + 16, p[1] + 26)
        const h = vecToHorizontal(mulVec(horMatrix, unitVector(selected.raDeg, selected.decDeg)))
        if (h.altDeg < horizonAltitude(horizon, h.azDeg)) {
          ctx.font = '11px system-ui, sans-serif'
          ctx.fillStyle = 'rgba(245, 165, 36, 0.9)'
          ctx.fillText('pod horyzontem', p[0] + 16, p[1] + 41)
        }
      }
    }
  })

  // ---------- Interakcja ----------

  const pick = (x: number, y: number): DSO | null => {
    if (!catalog) return null
    let best: DSO | null = null
    let bestD = 14
    const candidates = view.fovDeg < 150 ? messier : []
    for (const o of [...planObjects, ...candidates, ...(selected ? [selected] : [])]) {
      if (!o) continue
      const p = proj.eq(unitVector(o.raDeg, o.decDeg))
      if (!p) continue
      const d = Math.hypot(p[0] - x, p[1] - y)
      if (d < bestD) {
        bestD = d
        best = o
      }
    }
    return best
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (drag.current) {
      const dx = x - drag.current.x
      const dy = y - drag.current.y
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true
      if (drag.current.moved && view.fovDeg < 180) {
        const degPerPx = drag.current.view.fovDeg / (radius * 2)
        setView({
          ...drag.current.view,
          azDeg: (drag.current.view.azDeg - dx * degPerPx / Math.max(0.2, Math.cos(drag.current.view.altDeg * DEG)) + 360) % 360,
          altDeg: Math.max(-20, Math.min(89.9, drag.current.view.altDeg + dy * degPerPx)),
        })
      }
      return
    }
    const v = proj.unprojectHor(x, y)
    const h = vecToHorizontal(v)
    if (h.altDeg < -5 || Math.hypot(x - proj.cx, y - proj.cy) > radius * 1.02 && view.fovDeg > 150) {
      if (hoverCon) setHoverCon(null)
      return
    }
    const eq = vecToEquatorial(mulVec(transpose(horMatrix), v))
    const abbr = constellationOf(eq)
    if (abbr !== hoverCon?.abbr) setHoverCon({ abbr, x, y, since: performance.now() })
    else if (hoverCon) setHoverCon({ ...hoverCon, x, y })
    overlayRef.current!.style.cursor = pick(x, y) ? 'pointer' : view.fovDeg < 180 ? 'grab' : 'crosshair'
  }

  const onWheel = (e: React.WheelEvent) => {
    const factor = Math.exp(e.deltaY * 0.0012)
    setView((v) => {
      const fovDeg = Math.max(8, Math.min(184, v.fovDeg * factor))
      if (fovDeg >= 184) return FULL_DOME
      if (v.fovDeg >= 150 && fovDeg < v.fovDeg) {
        // Przybliżanie z pełnej kopuły: w stronę kursora.
        const rect = overlayRef.current!.getBoundingClientRect()
        const h = vecToHorizontal(proj.unprojectHor(e.clientX - rect.left, e.clientY - rect.top))
        return { azDeg: h.azDeg, altDeg: Math.max(5, Math.min(89.9, (h.altDeg + 90) / 2)), fovDeg }
      }
      return { ...v, fovDeg }
    })
  }

  const hovered = hoverCon && sky ? sky.byAbbr.get(hoverCon.abbr) : null

  return (
    <div ref={stageRef} className="sky-stage" onWheel={onWheel}>
      <canvas ref={glRef} aria-hidden />
      <canvas
        ref={overlayRef}
        className="overlay"
        role="img"
        aria-label={`Kopuła nieba${selected ? `, wybrany obiekt ${selected.id}` : ''}`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          setHoverCon(null)
          drag.current = null
        }}
        onPointerDown={(e) => {
          const rect = overlayRef.current!.getBoundingClientRect()
          drag.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, view, moved: false }
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerUp={(e) => {
          const d = drag.current
          drag.current = null
          if (d && !d.moved) {
            const rect = overlayRef.current!.getBoundingClientRect()
            const o = pick(e.clientX - rect.left, e.clientY - rect.top)
            if (o) select(o.i, true)
          }
        }}
        onDoubleClick={() => {
          anim.current = { from: view, to: FULL_DOME, start: performance.now(), dur: 900 }
          setFrame((f) => f + 1)
          setHoverCon((h) => (h ? { ...h } : h))
        }}
      />
      {hovered && hoverCon && !drag.current && (
        <div className="const-tip" style={{ left: hoverCon.x, top: hoverCon.y }}>
          <b>{hovered.pl}</b> <span className="dim">· {hovered.la}</span>
        </div>
      )}
      <div className="sky-hud tl">
        {view.fovDeg > 150 ? 'KOPUŁA · ZENIT' : `POLE ${Math.round(view.fovDeg)}° · AZ ${Math.round(view.azDeg)}° · H ${Math.round(view.altDeg)}°`}
      </div>
      <div className="sky-hud tr">
        {selected ? `${selected.id} ${displayName(selected) ? '· ' + displayName(selected) : ''}` : 'Wybierz obiekt'}
      </div>
      {view.fovDeg < 180 && (
        <div className="sky-hud br">
          <button className="button small" onClick={() => setView(FULL_DOME)}>
            Cała kopuła
          </button>
        </div>
      )}
    </div>
  )
}
