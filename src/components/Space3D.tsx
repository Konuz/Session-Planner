// Pozycja obiektu w przestrzeni 3D (three.js, ładowane leniwie). Odległości z Wikidata (mediana podanych wartości),
// kierunek ze współrzędnych galaktycznych. Dwie skale: Droga Mleczna (liniowa, 1 j. = 1000 lś) i Wszechświat
// lokalny (logarytmiczna). W tle wszystkie obiekty katalogu z odległością.
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { galactic, galacticVector } from '../lib/astro'
import { displayName, type DSO, type ObjectType } from '../lib/catalog'
import { fmtDistance, fmtNum } from '../lib/format'
import { useCatalog, useSelected } from '../state/data'
import { Range } from './Range'
import { LayersIcon } from './SkyDome'

const SUN_TO_GC_KLY = 26.7
const GALACTIC_LIMIT_LY = 150_000
const TYPE_RGB: Record<ObjectType, number> = { G: 0xa78bfa, GG: 0xa78bfa, EN: 0xf43f5e, RN: 0x60a5fa, DN: 0xf59e0b, PN: 0x2dd4bf, SNR: 0xfb923c, OC: 0xfacc15, GC: 0xfacc15, CN: 0xf43f5e, X: 0x99a1af }

type Scale = 'galaxy' | 'universe'

// Suwak liczby galaktyk (skala Wszechświat lokalny): górna granica odległości na każdym poziomie.
const GALAXY_LEVELS = [
  { maxLy: 5e6, title: 'Galaktyki 0: tylko Grupa Lokalna (do 5 mln lś)' },
  { maxLy: 5e7, title: 'Galaktyki 1: do 50 mln lś' },
  { maxLy: 5e8, title: 'Galaktyki 2: do 500 mln lś' },
  { maxLy: Infinity, title: 'Galaktyki 3: wszystkie z odległością' },
]

/** Galaktyczne (x ku centrum, y ku l = 90°, z ku biegunowi N) → three.js (y w górę). */
const toThree = (g: [number, number, number]) => new THREE.Vector3(g[0], g[2], -g[1])

/** Położenie w scenie: Droga Mleczna — tys. lś od centrum Galaktyki; Wszechświat — skala log. od Słońca. */
function position(o: Pick<DSO, 'raDeg' | 'decDeg'>, distLy: number, scale: Scale): THREE.Vector3 {
  const v = galacticVector(o)
  if (scale === 'galaxy') {
    const d = distLy / 1000
    return toThree([v[0] * d - SUN_TO_GC_KLY, v[1] * d, v[2] * d])
  }
  const r = Math.max(0, Math.log10(distLy / 1e4)) * 22
  return toThree([v[0] * r, v[1] * r, v[2] * r])
}

function milkyWay(count: number): THREE.Points {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const rnd = (() => {
    let s = 7
    return () => ((s = (s * 16807) % 2147483647) / 2147483647)
  })()
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd())
  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number, c: [number, number, number]
    if (i < count * 0.22) {
      // Zgrubienie centralne z poprzeczką.
      const r = Math.abs(gauss()) * 4.5
      const a = rnd() * Math.PI * 2
      x = Math.cos(a) * r * 1.6
      y = Math.sin(a) * r * 0.7
      const bar = 0.44
      ;[x, y] = [x * Math.cos(bar) - y * Math.sin(bar), x * Math.sin(bar) + y * Math.cos(bar)]
      z = gauss() * 1.6
      c = [1, 0.86, 0.62]
    } else {
      // Cztery ramiona spiralne (spirala logarytmiczna, nachylenie ok. 12°).
      const arm = Math.floor(rnd() * 4)
      const r = 4 + Math.pow(rnd(), 0.8) * 46
      const theta = Math.log(r / 4) / Math.tan((12 * Math.PI) / 180) + (arm * Math.PI) / 2 + gauss() * 0.28
      x = Math.cos(theta) * r + gauss() * 1.4
      y = Math.sin(theta) * r + gauss() * 1.4
      z = gauss() * 0.5
      const t = rnd()
      c = t < 0.15 ? [1, 0.55, 0.65] : t < 0.6 ? [0.62, 0.75, 1] : [0.85, 0.88, 1]
    }
    const p = toThree([x, y, z])
    pos.set([p.x, p.y, p.z], i * 3)
    col.set(c, i * 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const m = new THREE.PointsMaterial({ size: 1.6, vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false })
  return new THREE.Points(g, m)
}

function dotTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const ctx = c.getContext('2d')!
  // Miękka krawędź: przy kilku pikselach ostre koło zamienia się w plusik.
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, '#fff')
  g.addColorStop(0.6, '#fff')
  g.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(c)
}

/** Kopuła odległości: prawie przezroczysta, jaśniejsza przy krawędziach (efekt Fresnela), jak szklana bańka. */
function domeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0x00e0ff) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.0);
        gl_FragColor = vec4(color, 0.006 + f * 0.08);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
}

function textSprite(text: string, color = '#e6edf7', scale = 1): THREE.Sprite {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  ctx.font = '600 44px ui-monospace, Consolas, monospace'
  const w = Math.ceil(ctx.measureText(text).width) + 20
  c.width = w
  c.height = 64
  ctx.font = '600 44px ui-monospace, Consolas, monospace'
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 10, 34)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }))
  s.scale.set((w / 64) * 2.2 * scale, 2.2 * scale, 1)
  return s
}

export default function Space3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  // Punkty tła posortowane wg odległości: suwak zmienia tylko zakres rysowania, bez przebudowy sceny.
  const bgRef = useRef<{ geometry: THREE.BufferGeometry; counts: number[] } | null>(null)
  const [galaxyLevel, setGalaxyLevel] = useState(GALAXY_LEVELS.length - 1)
  const galaxyLevelRef = useRef(galaxyLevel)
  galaxyLevelRef.current = galaxyLevel
  const o = useSelected()
  const { catalog } = useCatalog()
  const dist = o?.distLy ?? null
  const auto: Scale = dist !== null && dist > GALACTIC_LIMIT_LY ? 'universe' : 'galaxy'
  const [scaleChoice, setScaleChoice] = useState<Scale | null>(null)
  const scale = scaleChoice ?? auto
  const withDistance = useMemo(() => (catalog ? catalog.filter((c) => c.distLy !== null) : []), [catalog])

  useEffect(() => {
    setScaleChoice(null)
  }, [o?.i])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !o) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(1.5, devicePixelRatio))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 5000)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = !reduced
    controls.autoRotateSpeed = 0.35
    const disposables: { dispose(): void }[] = [renderer, controls]

    const sunPos = scale === 'galaxy' ? toThree([-SUN_TO_GC_KLY, 0, 0]) : new THREE.Vector3()
    const target0 = dist !== null ? position(o, dist, scale) : sunPos.clone()
    // Rozmiar sceny wokół celu: etykiety i znaczniki skalują się z nim, punkty mają stały rozmiar w pikselach.
    const sep = sunPos.distanceTo(target0)
    // Kadr dopasowany do odległości Słońce–obiekt (bliskie obiekty: zbliżenie na okolicę Słońca).
    const span = Math.max(scale === 'galaxy' ? 8 : 70, sep * 2.2)
    const k = span / 40
    // Promień znaczników: najwyżej 15% odległości Słońce–obiekt, żeby kule i pierścień nigdy na siebie nie nachodziły.
    const mr = sep > 0 ? Math.min(0.5 * k, sep * 0.15) : 0.5 * k
    const label = (text: string, color: string, size: number) => textSprite(text, color, size * k)

    // Tło: obiekty katalogu z odległością.
    const bg = withDistance
      .filter((c) => (scale === 'galaxy' ? c.distLy! < GALACTIC_LIMIT_LY : c.distLy! > GALACTIC_LIMIT_LY))
      .sort((a, b) => a.distLy! - b.distLy!)
    {
      const pos = new Float32Array(bg.length * 3)
      const col = new Float32Array(bg.length * 3)
      const tmp = new THREE.Color()
      bg.forEach((c, i) => {
        const p = position(c, c.distLy!, scale)
        pos.set([p.x, p.y, p.z], i * 3)
        tmp.setHex(TYPE_RGB[c.type])
        col.set([tmp.r, tmp.g, tmp.b], i * 3)
      })
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      // Okrągłe kropki: tekstura koła zamiast domyślnego kwadratu.
      const dot = dotTexture()
      const m = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, vertexColors: true, map: dot, transparent: true, opacity: 0.8, depthWrite: false })
      scene.add(new THREE.Points(g, m))
      disposables.push(g, m, dot)
      const counts = GALAXY_LEVELS.map(({ maxLy }) => (scale === 'universe' ? bg.filter((c) => c.distLy! <= maxLy).length : bg.length))
      g.setDrawRange(0, counts[galaxyLevelRef.current])
      bgRef.current = { geometry: g, counts }
    }

    if (scale === 'galaxy') {
      const mw = milkyWay(26000)
      scene.add(mw)
      disposables.push(mw.geometry, mw.material as THREE.Material)
      const gc = label('Centrum Galaktyki', '#ffd9a0', 0.55)
      gc.position.set(0, 3 * k, 0)
      scene.add(gc)
    } else {
      // Pierścienie odległości (skala logarytmiczna) i Droga Mleczna w środku.
      for (const [ly, text] of [[1e6, '1 mln lś'], [1e7, '10 mln lś'], [1e8, '100 mln lś'], [1e9, '1 mld lś']] as const) {
        const r = Math.log10(ly / 1e4) * 22
        const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.08, r + 0.08, 128), new THREE.MeshBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide }))
        ring.rotation.x = -Math.PI / 2
        scene.add(ring)
        disposables.push(ring.geometry, ring.material as THREE.Material)
        // Półprzezroczysta kopuła nad pierścieniem: odległość czytelna także dla wysokości nad płaszczyzną.
        const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMaterial())
        scene.add(dome)
        disposables.push(dome.geometry, dome.material as THREE.Material)
        const t = label(text, '#6fdcf0', 0.6)
        t.position.set(r + 2, 1, 0)
        scene.add(t)
      }
      const mw = milkyWay(6000)
      mw.scale.setScalar(0.12)
      scene.add(mw)
      disposables.push(mw.geometry, mw.material as THREE.Material)
    }

    // Słońce.
    const sun = new THREE.Mesh(new THREE.SphereGeometry(mr * 0.9, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd27a }))
    sun.position.copy(sunPos)
    scene.add(sun)
    disposables.push(sun.geometry, sun.material as THREE.Material)
    const sunLabel = label(scale === 'galaxy' ? 'Słońce' : 'Droga Mleczna', '#ffd27a', 0.55)
    sunLabel.position.copy(sunPos).add(new THREE.Vector3(0, -2.4 * k, 0))
    scene.add(sunLabel)

    // Obiekt.
    let target = sunPos.clone()
    if (dist !== null) {
      target = target0.clone()
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([sunPos, target]), new THREE.LineDashedMaterial({ color: 0x00e0ff, dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: 0.8 }))
      line.computeLineDistances()
      scene.add(line)
      if (scale === 'universe') {
        // Pion obiektu do płaszczyzny Drogi Mlecznej i linia w płaszczyźnie do Słońca: z przerywaną tworzą trójkąt.
        const foot = new THREE.Vector3(target.x, 0, target.z)
        const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([target, foot, sunPos]), new THREE.LineBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: 0.6 }))
        scene.add(drop)
        disposables.push(drop.geometry, drop.material as THREE.Material)
      }
      const objLabel = label(o.id, '#00e0ff', 0.65)
      objLabel.position.copy(target).add(new THREE.Vector3(0, 2.4 * k, 0))
      scene.add(objLabel)
      disposables.push(line.geometry, line.material as THREE.Material)
    } else {
      // Tylko kierunek ze Słońca.
      const dir = toThree(galacticVector(o))
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([sunPos, sunPos.clone().add(dir.multiplyScalar(30))]), new THREE.LineDashedMaterial({ color: 0x00e0ff, dashSize: 0.8, gapSize: 0.6 }))
      line.computeLineDistances()
      scene.add(line)
      disposables.push(line.geometry, line.material as THREE.Material)
    }

    // Przelot kamery do celu.
    const focus = scale === 'galaxy' ? sunPos.clone().lerp(target, 0.5) : target.clone().multiplyScalar(0.5)
    const endCam = focus.clone().add(new THREE.Vector3(span * 0.55, span * 0.55, span * 0.75))
    const startCam = new THREE.Vector3(0, scale === 'galaxy' ? 120 : 200, 0.01)
    camera.position.copy(reduced ? endCam : startCam)
    controls.target.copy(reduced ? focus : new THREE.Vector3())
    const t0 = performance.now()
    let raf = 0
    let flying = !reduced
    const stopFly = () => (flying = false)
    controls.addEventListener('start', () => {
      stopFly()
      controls.autoRotate = false
    })
    const tick = () => {
      if (flying) {
        const k = Math.min(1, (performance.now() - t0) / 2200)
        const e = 1 - (1 - k) ** 3
        camera.position.lerpVectors(startCam, endCam, e)
        controls.target.lerpVectors(new THREE.Vector3(), focus, e)
        if (k >= 1) flying = false
      }
      controls.update()
      renderer.render(scene, camera)
      // Pinezka obiektu (HTML nad sceną) przypięta do rzutu jego położenia.
      const pin = pinRef.current
      if (pin) {
        const v = target.clone().project(camera)
        pin.style.display = dist !== null && v.z < 1 ? '' : 'none'
        pin.style.transform = `translate(${((v.x + 1) / 2) * mount.clientWidth}px, ${((1 - v.y) / 2) * mount.clientHeight}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    const ro = new ResizeObserver(() => {
      camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight)
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    })
    ro.observe(mount)
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Sprite) {
          obj.material.map?.dispose()
          obj.material.dispose()
        }
      })
      disposables.forEach((d) => d.dispose())
      renderer.domElement.remove()
    }
  }, [o, dist, scale, withDistance])

  useEffect(() => {
    const bg = bgRef.current
    if (bg) bg.geometry.setDrawRange(0, bg.counts[galaxyLevel])
  }, [galaxyLevel])

  if (!o) return <div className="sky-stage empty" style={{ display: 'grid', placeItems: 'center' }}>Wybierz obiekt.</div>
  const g = galactic(o)
  return (
    <div className="sky-stage" style={{ background: 'radial-gradient(circle at 50% 40%, #071022, #000 75%)' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <div ref={pinRef} className="pin" style={{ display: 'none' }} aria-hidden>
        <span className="pin-ring" />
        <span className="pin-ring" />
        <span className="pin-dot" />
      </div>
      <div className="sky-hud tl" style={{ lineHeight: 1.7, fontSize: 10 }}>
        <div className="accent" style={{ fontSize: 11 }}>{o.id} {displayName(o) && `· ${displayName(o)}`}</div>
        <div>ODLEGŁOŚĆ {dist !== null ? fmtDistance(dist).toUpperCase() : 'BRAK DANYCH'}</div>
        <div>l {fmtNum(g.lDeg, 1)}° · b {fmtNum(g.bDeg, 1)}°</div>
      </div>
      <div className="sky-hud tr" style={{ pointerEvents: 'auto', display: 'flex', gap: 6 }}>
        <button className={`toggle-chip${scale === 'galaxy' ? ' on' : ''}`} onClick={() => setScaleChoice('galaxy')}>Droga Mleczna</button>
        <button className={`toggle-chip${scale === 'universe' ? ' on' : ''}`} onClick={() => setScaleChoice('universe')}>Wszechświat lokalny</button>
      </div>
      <div className="sky-hud bl" style={{ maxWidth: 520, lineHeight: 1.6, fontSize: 10 }}>
        {dist === null
          ? 'Wikidata nie podaje odległości tego obiektu — pokazany jest tylko kierunek ze Słońca.'
          : scale === 'galaxy'
            ? `Skala liniowa, 1 j. = 1000 lś. Punkty: ${withDistance.filter((c) => c.distLy! < GALACTIC_LIMIT_LY).length} obiektów katalogu z odległością.`
            : 'Skala logarytmiczna od Słońca. Punkty: galaktyki katalogu z odległością.'}
        <br />
        Odległości: Wikidata (mediana wartości). Model Galaktyki poglądowy.
      </div>
      {scale === 'universe' && (
        <div className="sky-hud br hud-stack">
          <label className="zoom-slider" title={GALAXY_LEVELS[galaxyLevel].title}>
            <LayersIcon filled={false} />
            <Range
              min={0}
              max={GALAXY_LEVELS.length - 1}
              step={1}
              value={galaxyLevel}
              onChange={(e) => setGalaxyLevel(Number(e.target.value))}
              aria-label="Liczba galaktyk"
              aria-valuetext={GALAXY_LEVELS[galaxyLevel].title}
            />
            <LayersIcon filled />
          </label>
        </div>
      )}
    </div>
  )
}
