// Modele i tekstury sceny „Pozycja 3D” (three.js): Droga Mleczna, galaktyki Grupy Lokalnej, kopuły odległości i podpisy.
import * as THREE from 'three'
import { galacticVector, type Vec3 } from '../../lib/astro'
import type { DSO } from '../../lib/catalog'
import { scenePosition, toScene, UNIVERSE_GALAXY_SCALE, type SpaceScale } from '../../lib/space3d'
import type { ConstellationStar } from './spaceSettings'

export const MILKY_WAY_DIAMETER_LY = 100_000
export { UNIVERSE_GALAXY_SCALE }
export type GalaxyProfile = {
  kind: 'spiral' | 'flocculent' | 'elliptical' | 'irregular'
  label: string
  axisRatio: number
  core: number
  bar?: boolean
  /** Galaktyki nieregularne: PA poprzeczki na niebie (bez niego poprzeczka leży wzdłuż osi wielkiej). */
  barPa?: number
  /** Galaktyki nieregularne: długość poprzeczki w jednostkach modelu (średnica = 100). */
  barLength?: number
  knots?: number
}

// Typy: https://ned.ipac.caltech.edu/level5/Mateo/table1.html
// M33: https://www.nao.ac.jp/en/gallery/weekly/2017/20170307-subaru.html
// M33: zgrubienie ok. 3 % światła w podczerwieni (Kam i in. 2015, za https://arxiv.org/abs/1902.07222).
// LMC: poprzeczka o półosi 2,13 kpc w PA 121° (Rathore i in. 2025, https://doi.org/10.3847/1538-4357/ad93ae).
// Parametry rozkładu gwiazd są ilustracją morfologii, nie rekonstrukcją pojedynczych gwiazd.
export const LOCAL_GROUP_SHAPES: Record<string, GalaxyProfile> = {
  'M 31': { kind: 'spiral', label: 'Sb - spiralna, duże zgrubienie i pierścień', axisRatio: 1, core: 0.28, bar: true },
  'M 33': { kind: 'flocculent', label: 'Scd - spiralna, luźne i poszarpane ramiona', axisRatio: 1, core: 0.03 },
  // Poprzeczka 4,26 kpc przy średnicy z katalogu (646′, 161 tys. lś ≈ 9,3 kpc) to 46 j. modelu.
  'ESO 56-115': { kind: 'irregular', label: 'SBm - Magellanowa, poprzeczka i obszary gwiazdotwórcze', axisRatio: 0.85, core: 0, bar: true, barPa: 121, barLength: 46, knots: 8 },
  'M 32': { kind: 'elliptical', label: 'cE2 - zwarta eliptyczna', axisRatio: 0.8, core: 0.65 },
  'M 110': { kind: 'elliptical', label: 'dE5 - karłowata eliptyczna', axisRatio: 0.5, core: 0.12 },
  'NGC 147': { kind: 'elliptical', label: 'dE5 - rozproszona eliptyczna', axisRatio: 0.5, core: 0 },
  'NGC 185': { kind: 'elliptical', label: 'dE3 - karłowata eliptyczna', axisRatio: 0.7, core: 0.2 },
  'NGC 292': { kind: 'irregular', label: 'SMC - nieregularna, poprzeczka i skrzydło', axisRatio: 0.5, core: 0, bar: true, knots: 7 },
  'NGC 6822': { kind: 'irregular', label: 'IBm - nieregularna z poprzeczką', axisRatio: 0.7, core: 0, bar: true, knots: 6 },
  'IC 10': { kind: 'irregular', label: 'dIrr - nieregularna, intensywne tworzenie gwiazd', axisRatio: 0.8, core: 0, knots: 16 },
  'IC 1613': { kind: 'irregular', label: 'dIrr - rozproszona nieregularna', axisRatio: 0.8, core: 0, knots: 5 },
}

export type StarNameLayout = { group: THREE.Group; root: HTMLDivElement; anchors: { position: THREE.Vector3; el: HTMLSpanElement; width: number; height: number }[]; connectors: THREE.BufferAttribute }

/** Galaktyczne (x ku centrum, y ku l = 90°, z ku biegunowi N) → three.js (y w górę). */
export const toThree = (g: Vec3) => new THREE.Vector3(...toScene(g))

/** Położenie w scenie: Droga Mleczna: tys. lś od centrum Galaktyki; Wszechświat: skala log. od Słońca. */
export function position(o: Pick<DSO, 'raDeg' | 'decDeg'>, distLy: number, scale: SpaceScale): THREE.Vector3 {
  return new THREE.Vector3(...scenePosition(o, distLy, scale))
}

export function milkyWay(count: number, texture: THREE.Texture): THREE.Points {
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
    } else if (i < count * 0.42) {
      // Słabszy dysk pomiędzy ramionami, bez pustych szczelin.
      const r = Math.min(50, -Math.log(Math.max(1e-9, rnd() * rnd())) * 10)
      const a = rnd() * Math.PI * 2
      x = Math.cos(a) * r
      y = Math.sin(a) * r
      z = gauss() * 0.65
      c = [0.45, 0.42, 0.39]
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
  const m = galaxyMaterial(texture)
  return new THREE.Points(g, m)
}

export function galaxyMaterial(texture: THREE.Texture): THREE.PointsMaterial {
  return new THREE.PointsMaterial({ size: 2, map: texture, vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false })
}

export function localGroupGalaxy(o: DSO, profile: GalaxyProfile, texture: THREE.Texture): THREE.Points {
  // M31 i M33: średnice NASA; karły: średnica z rozmiaru kątowego i odległości katalogowej.
  const diameterLy = o.id === 'M 31' ? 220_000 : o.id === 'M 33' ? 50_000 : o.distLy! * o.majArcmin * Math.PI / 10_800
  const spiral = profile.kind === 'spiral' || profile.kind === 'flocculent'
  // Minimum próbek zachowuje czytelność karłów przy zbliżeniu; M33 ma rozległy, rozproszony dysk.
  const count = o.id === 'M 31' ? 36000 : o.id === 'M 33' ? 8800 : Math.max(600, Math.round(18000 * (diameterLy / MILKY_WAY_DIAMETER_LY) ** 1.8))
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  let seed = [...o.id].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) >>> 0
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd())
  const flocculent = profile.kind === 'flocculent'
  // Rozproszona otoczka i odrębny układ skupisk dla każdej galaktyki nieregularnej.
  const knots = Array.from({ length: profile.knots ?? 0 }, () => {
    const r = 10 + rnd() * 26
    const a = rnd() * Math.PI * 2
    return [Math.cos(a) * r, Math.sin(a) * r * profile.axisRatio, 2 + rnd() * 4]
  })
  const radius = (length: number) => {
    let r: number
    do { r = -Math.log(Math.max(1e-9, rnd() * rnd())) * length } while (r > 49)
    return r
  }
  // M33: skupiska młodych gwiazd w losowych miejscach obu ramion; ich promienie mają ten sam rozkład co dysk.
  const armClumps = flocculent ? Array.from({ length: 48 }, (_, i) => ({ arm: i % 2, r: radius(11), da: gauss() * 0.35 })) : []
  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number
    let color: [number, number, number]
    const part = rnd()
    if (spiral) {
      if (part < profile.core) {
        // M31: klasyczne zgrubienie i wydłużona składowa poprzeczki. M33: tylko małe zgrubienie.
        // https://www.aanda.org/articles/aa/pdf/2018/10/aa32517-17.pdf
        const r = radius(2.5)
        const a = rnd() * Math.PI * 2
        const h = rnd() * 2 - 1
        x = r * Math.sqrt(1 - h * h) * Math.cos(a)
        y = r * Math.sqrt(1 - h * h) * Math.sin(a)
        z = r * h * 0.65
        if (profile.bar && rnd() < 0.35) {
          // PA poprzeczki 55,7° rzutujemy z powrotem do płaszczyzny dysku nachylonego o 77°.
          const barAngle = -Math.atan(Math.tan((55.7 - (o.paDeg ?? 35)) * Math.PI / 180) / Math.cos(77 * Math.PI / 180))
          x *= 1.6
          y *= 0.65
          ;[x, y] = [x * Math.cos(barAngle) - y * Math.sin(barAngle), x * Math.sin(barAngle) + y * Math.cos(barAngle)]
        }
        color = [1, 0.8, 0.58]
      } else {
        const disk = part < profile.core + (flocculent ? 0.45 : 0.48)
        // Pierścień M31: ok. 10 kpc od centrum (NASA/Spitzer), na tle dysku i ramion.
        // https://science.nasa.gov/asset/webb/infrared-universe-andromeda-galaxy/
        const ring = !flocculent && part > 0.96
        let arm = Math.floor(rnd() * 2)
        // Skala dysku 11 j. modelu; dla M33 to 1,7 kpc przy średnicy 50 tys. lś (Kam i in. 2015).
        let r = ring ? 14.8 + gauss() * 2.4 : radius(11)
        // M33: dwa słabe, niesymetryczne ramiona ze skupiskami zamiast jednolitych wstęg.
        // https://www.aanda.org/articles/aa/pdf/2024/05/aa48910-23.pdf
        const clump = flocculent && !disk && rnd() < 0.6 ? armClumps[Math.floor(rnd() * armClumps.length)] : null
        if (clump) {
          arm = clump.arm
          r = Math.max(1, clump.r + gauss() * 1.2)
        }
        const pitch = (flocculent ? 22 + arm * 6 : 12) * Math.PI / 180
        const spiralAngle = Math.log(1 + r / 3) / Math.tan(pitch) + arm * Math.PI
        const scatter = () => (clump ? clump.da + gauss() * 0.12 : gauss() * (flocculent ? 0.5 : 0.35))
        const a = disk || ring ? rnd() * Math.PI * 2 : spiralAngle + scatter() + (flocculent ? 0.45 * Math.sin(r * 0.35 + arm * 2) : 0)
        if (ring) r += 1.5 * Math.sin(a) + 0.8 * Math.sin(3 * a)
        x = Math.cos(a) * r
        y = Math.sin(a) * r
        z = gauss() * (0.35 + r * 0.012)
        const hii = !disk && rnd() < (flocculent ? 0.09 : 0.035)
        color = disk ? (flocculent ? [0.56, 0.58, 0.64] : [0.42, 0.4, 0.37]) : hii ? [0.95, 0.42, 0.55] : ring ? [0.4, 0.45, 0.55] : [0.63, 0.76, 1]
        if (!flocculent) {
          // Poglądowe pasma pyłu: osłabienie światła w dysku, bez jasnego obrysu pierścienia.
          const lane = Math.exp(-((Math.sin(a - Math.log(1 + r / 3) / Math.tan(pitch) - 0.18) / 0.13) ** 2))
          const dim = 1 - 0.7 * lane * THREE.MathUtils.smoothstep(r, 4, 9)
          color = [color[0] * dim, color[1] * dim, color[2] * dim]
        }
      }
    } else if (profile.kind === 'elliptical') {
      const r = radius(part < profile.core ? 2.5 : 11)
      const a = rnd() * Math.PI * 2
      const h = rnd() * 2 - 1
      x = r * Math.sqrt(1 - h * h) * Math.cos(a)
      y = r * Math.sqrt(1 - h * h) * Math.sin(a) * profile.axisRatio
      z = r * h * profile.axisRatio
      color = part < profile.core ? [1, 0.83, 0.65] : [0.6, 0.53, 0.44]
    } else {
      if (part < 0.5) {
        const r = radius(12)
        const a = rnd() * Math.PI * 2
        x = Math.cos(a) * r
        y = Math.sin(a) * r * profile.axisRatio
        color = [0.44, 0.49, 0.56]
      } else if (profile.bar && part < 0.8) {
        x = (rnd() - 0.5) * (profile.barLength ?? 55)
        y = gauss() * 3 + (profile.barPa === undefined ? x * 0.12 : 0)
        if (profile.barPa !== undefined) {
          // Model leży w płaszczyźnie nieba: oś x w PA galaktyki, oś y w PA − 90°.
          const t = ((o.paDeg ?? 0) - profile.barPa) * Math.PI / 180
          ;[x, y] = [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)]
        }
        color = [0.65, 0.73, 0.86]
      } else {
        const [cx, cy, spread] = knots[Math.floor(rnd() * knots.length)]
        x = cx + gauss() * spread
        y = cy + gauss() * spread
        // W SMC młoda populacja rozciąga się w asymetryczne skrzydło.
        if (o.id === 'NGC 292') { x += 12; y += 8 }
        color = rnd() < 0.18 ? [0.94, 0.42, 0.55] : [0.6, 0.76, 1]
      }
      z = gauss() * 5
    }
    pos.set([x, y, z], i * 3)
    col.set(color, i * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const material = galaxyMaterial(texture)
  const points = new THREE.Points(geometry, material)
  points.scale.setScalar(UNIVERSE_GALAXY_SCALE * diameterLy / MILKY_WAY_DIAMETER_LY)
  // PA jest mierzone na niebie od północy ku wschodowi, nie względem osi sceny.
  const sight = toThree(galacticVector(o)).normalize()
  const north = toThree(galacticVector({ raDeg: o.raDeg, decDeg: o.decDeg + 0.01 }))
  north.addScaledVector(sight, -north.dot(sight)).normalize()
  const east = north.clone().cross(sight).normalize()
  const pa = (o.paDeg ?? 0) * Math.PI / 180
  const major = north.clone().multiplyScalar(Math.cos(pa)).addScaledVector(east, Math.sin(pa))
  const minor = sight.clone().cross(major).normalize()
  points.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(major, minor, sight))
  if (spiral) {
    // Orientacja dysków z badań, nie z elipsy całej galaktyki obejmującej zgrubienie.
    // M31: https://academic.oup.com/mnras/article/366/3/996/994137
    // M33: https://www.aanda.org/articles/aa/pdf/2025/08/aa55408-25.pdf
    const inclination = (flocculent ? 54 : 77) * Math.PI / 180
    points.rotateX(inclination)
  }
  return points
}

export function galaxyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const ctx = canvas.getContext('2d')!
  const glow = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.2, 'rgba(255,255,255,0.65)')
  glow.addColorStop(0.55, 'rgba(255,255,255,0.12)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(canvas)
}

export function dotTexture(): THREE.CanvasTexture {
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
export function domeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0x00e0ff) }, opacity: { value: 1 } },
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
      uniform float opacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.0);
        gl_FragColor = vec4(color, (0.0015 + f * 0.018) * opacity);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
}

export function textSprite(text: string, color = '#e6edf7', scale = 1): THREE.Sprite {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  const font = '600 44px ui-monospace, Consolas, monospace'
  ctx.font = font
  const w = Math.ceil(ctx.measureText(text).width) + 20
  c.width = w
  c.height = 64
  ctx.font = font
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 10, 34)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }))
  s.scale.set((w / 64) * 2.2 * scale, 2.2 * scale, 1)
  return s
}

export function fixedSizeTextSprite(sprite: THREE.Sprite, sprites: THREE.Sprite[]) {
  sprite.userData.fixedPixelHeight = 14
  sprite.userData.aspectRatio = sprite.scale.x / sprite.scale.y
  sprites.push(sprite)
}

export function addStarNameLabels(group: THREE.Group, stars: ConstellationStar[], overlay: HTMLElement): StarNameLayout {
  const points = new Float32Array(stars.length * 6)
  const geometry = new THREE.BufferGeometry()
  const connectors = new THREE.BufferAttribute(points, 3)
  connectors.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', connectors)
  const leaderLines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x858b93, transparent: true, opacity: 0.7, depthWrite: false }))
  leaderLines.frustumCulled = false
  leaderLines.renderOrder = 1
  leaderLines.userData.starNameConnector = true
  group.add(leaderLines)
  const root = document.createElement('div')
  root.style.visibility = 'hidden'
  const labels = stars.map((star) => {
    const el = document.createElement('span')
    el.className = 'obs-label'
    el.textContent = star.name
    root.appendChild(el)
    return { el, position: position(star, star.distLy, 'galaxy') }
  })
  overlay.appendChild(root)
  const anchors = labels.map((label) => ({ ...label, width: label.el.offsetWidth, height: label.el.offsetHeight }))
  root.hidden = true
  root.style.visibility = ''
  return { group, root, anchors, connectors }
}
