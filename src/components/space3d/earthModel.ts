import * as THREE from 'three'

const CLOUD_BASE_OPACITY = 0.34

export interface EarthAssets {
  map: THREE.Texture
  bumpMap: THREE.Texture
  specularMap: THREE.Texture
  cloudMap: THREE.Texture
  dispose(): void
}

export interface EarthRig {
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>
  clouds: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>
  disposables: { dispose(): void }[]
}

function hash3(ix: number, iy: number, iz: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7 + iz * 74.7) * 43758.5453123
  return n - Math.floor(n)
}

function valueNoise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const uz = fz * fz * (3 - 2 * fz)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const c00 = lerp(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), ux)
  const c10 = lerp(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), ux)
  const c01 = lerp(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), ux)
  const c11 = lerp(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), ux)
  return lerp(lerp(c00, c10, uy), lerp(c01, c11, uy), uz)
}

function fbm3D(x: number, y: number, z: number): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < 4; i++) {
    sum += amp * valueNoise3D(x * freq, y * freq, z * freq)
    freq *= 2.08
    amp *= 0.5
  }
  return sum
}

const CLOUD_WIDTH = 384
const CLOUD_HEIGHT = 192

/**
 * Wiersze chmur od `y` do bufora RGBA, dopóki `timeLeft()` > 1 ms (co najmniej jeden wiersz); zwraca następny wiersz.
 * Szum fBm na sferze jednostkowej (bezszwowy na długości geograficznej), ok. 0,5–0,9 ms na wiersz.
 */
export function cloudRowsUntil(data: Uint8ClampedArray, y: number, timeLeft: () => number): number {
  do {
    const phi = ((y + 0.5) / CLOUD_HEIGHT - 0.5) * Math.PI
    const cosPhi = Math.cos(phi)
    const sinPhi = Math.sin(phi)
    const polarFade = Math.max(0, 1 - Math.pow(Math.abs(sinPhi), 3.5))
    for (let x = 0; x < CLOUD_WIDTH; x++) {
      const theta = ((x + 0.5) / CLOUD_WIDTH) * Math.PI * 2
      const sx = Math.cos(theta) * cosPhi
      const sy = sinPhi
      const sz = Math.sin(theta) * cosPhi
      // Delikatne pasma cyklonalne wzdłuż równoleżników.
      const warp = fbm3D(sx * 2.1 + 3.1, sy * 2.1, sz * 2.1 - 1.7) * 0.65
      const density = fbm3D(sx * 3.8 + warp, sy * 4.6 + 1.3, sz * 3.8 - warp)
      const alpha = Math.max(0, Math.min(1, (density - 0.48) / 0.28)) * polarFade
      const idx = (y * CLOUD_WIDTH + x) * 4
      data[idx] = 240
      data[idx + 1] = 248
      data[idx + 2] = 255
      data[idx + 3] = Math.round(alpha * 255)
    }
    y++
  } while (y < CLOUD_HEIGHT && timeLeft() > 1)
  return y
}

/**
 * Chmury i mapy pochodne zdjęcia Ziemi liczone raz na stronę: każda scena (Pozycja 3D, Obserwatorium, ponowne otwarcie
 * okna) tworzyła je od nowa w zadaniu budowy sceny, a sam szum chmur to ok. 80–170 ms przed pierwszym malowaniem okna.
 * Chmury liczą się w czasie bezczynności, wierszami; do tego czasu tekstury pokazują puste (przezroczyste) płótno.
 * Przy otwarciu Ziemia jest znacznikiem kilku pikseli, więc chmur i tak nie widać.
 */
type CloudLayer = { canvas: HTMLCanvasElement; done: boolean; waiting: Set<{ texture: THREE.Texture; onReady?: () => void }> }
let clouds: CloudLayer | null = null
const derivedMaps = new Map<string, { bump: HTMLCanvasElement; spec: HTMLCanvasElement }>()

function cloudLayer(): CloudLayer | null {
  if (clouds) return clouds
  const canvas = document.createElement('canvas')
  canvas.width = CLOUD_WIDTH
  canvas.height = CLOUD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const layer: CloudLayer = { canvas, done: false, waiting: new Set() }
  clouds = layer
  const img = ctx.createImageData(CLOUD_WIDTH, CLOUD_HEIGHT)
  const idle = (work: (deadline: IdleDeadline) => void) => window.requestIdleCallback
    ? window.requestIdleCallback(work)
    : window.setTimeout(() => work({ didTimeout: false, timeRemaining: () => 8 }), 16)
  let y = 0
  const work = (deadline: IdleDeadline) => {
    y = cloudRowsUntil(img.data, y, () => deadline.timeRemaining())
    if (y < CLOUD_HEIGHT) { idle(work); return }
    ctx.putImageData(img, 0, 0)
    layer.done = true
    for (const { texture, onReady } of layer.waiting) { texture.needsUpdate = true; onReady?.() }
    layer.waiting.clear()
  }
  idle(work)
  return layer
}

/** Proceduralna warstwa chmur (wspólne płótno; tekstura odświeża się, gdy chmury będą policzone). */
function createCloudTexture(anisotropy: number, onReady?: () => void): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture()
  const layer = cloudLayer()
  if (!layer) return new THREE.Texture()
  const texture = new THREE.CanvasTexture(layer.canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = anisotropy
  if (!layer.done) {
    const entry = { texture, onReady }
    layer.waiting.add(entry)
    texture.addEventListener('dispose', () => layer.waiting.delete(entry))
  }
  return texture
}

function buildDerivedSurfaceMaps(
  source: HTMLImageElement,
  bumpMap: THREE.Texture,
  specularMap: THREE.Texture,
) {
  if (typeof document === 'undefined') return
  const known = derivedMaps.get(source.src)
  if (known) {
    bumpMap.image = known.bump
    bumpMap.needsUpdate = true
    specularMap.image = known.spec
    specularMap.needsUpdate = true
    return
  }
  const srcWidth = source.naturalWidth || source.width
  const srcHeight = source.naturalHeight || source.height
  const width = Math.min(1024, Math.max(1, srcWidth || 512))
  const height = Math.min(512, Math.max(1, srcHeight || 256))
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = width
  srcCanvas.height = height
  // Odczyt pikseli z płótna w pamięci CPU, bez kopii z GPU.
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })
  if (!srcCtx) return
  srcCtx.drawImage(source, 0, 0, width, height)
  const pixels = srcCtx.getImageData(0, 0, width, height).data

  const bumpCanvas = document.createElement('canvas')
  bumpCanvas.width = width
  bumpCanvas.height = height
  const bumpCtx = bumpCanvas.getContext('2d')
  const specCanvas = document.createElement('canvas')
  specCanvas.width = width
  specCanvas.height = height
  const specCtx = specCanvas.getContext('2d')
  if (!bumpCtx || !specCtx) return

  const bumpData = bumpCtx.createImageData(width, height)
  const specData = specCtx.createImageData(width, height)
  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    // Oceany mają wyraźną przewagę kanału B i nie są jasnym lodem polarnym.
    const oceanMask =
      clamp01((b - r - 10) / 34) *
      clamp01((b - g * 0.92 + 4) / 24) *
      clamp01((205 - r) / 55)
    const spec = Math.round(14 + oceanMask * 228)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    const landHeight = 70 + clamp01((lum - 0.1) * 1.45) * 185
    const bump = Math.round(oceanMask * 48 + (1 - oceanMask) * landHeight)

    bumpData.data[i] = bumpData.data[i + 1] = bumpData.data[i + 2] = bump
    bumpData.data[i + 3] = 255
    specData.data[i] = specData.data[i + 1] = specData.data[i + 2] = spec
    specData.data[i + 3] = 255
  }

  bumpCtx.putImageData(bumpData, 0, 0)
  specCtx.putImageData(specData, 0, 0)
  if (source.src) derivedMaps.set(source.src, { bump: bumpCanvas, spec: specCanvas })
  bumpMap.image = bumpCanvas
  bumpMap.needsUpdate = true
  specularMap.image = specCanvas
  specularMap.needsUpdate = true
}

/** Ładuje teksturę Ziemi i generuje powiązane mapy reliefu, odbić oceanicznych i chmur. */
export function createEarthAssets(baseUrl: string, maxAnisotropy = 4, onLoad?: () => void): EarthAssets {
  const anisotropy = Math.max(1, Math.min(8, maxAnisotropy))
  const bumpMap = new THREE.Texture()
  const specularMap = new THREE.Texture()
  bumpMap.anisotropy = anisotropy
  specularMap.anisotropy = anisotropy

  const map = new THREE.TextureLoader().load(`${baseUrl}textures/earth.webp`, (loaded) => {
    if (typeof HTMLImageElement !== 'undefined' && loaded.image instanceof HTMLImageElement) {
      buildDerivedSurfaceMaps(loaded.image, bumpMap, specularMap)
    }
    onLoad?.()
  })
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = anisotropy

  const cloudMap = createCloudTexture(anisotropy, onLoad)
  return {
    map,
    bumpMap,
    specularMap,
    cloudMap,
    dispose() {
      map.dispose()
      bumpMap.dispose()
      specularMap.dispose()
      cloudMap.dispose()
    },
  }
}

function createAtmosphereRimMaterial(): { material: THREE.ShaderMaterial; uniforms: { uOpacity: { value: number } } } {
  const uniforms = { uOpacity: { value: 1 } }
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float ndotv = clamp(dot(normalize(vNormalView), normalize(vViewDir)), 0.0, 1.0);
        float rim = pow(1.0 - ndotv, 3.0);
        vec3 color = mix(vec3(0.28, 0.68, 1.0), vec3(0.68, 0.92, 1.0), rim);
        float alpha = rim * 0.5 * uOpacity;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  })
  return { material, uniforms }
}

function createAtmosphereHaloMaterial(): { material: THREE.ShaderMaterial; uniforms: { uOpacity: { value: number } } } {
  const uniforms = { uOpacity: { value: 1 } }
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float d = max(0.0, -dot(normalize(vNormalView), normalize(vViewDir)));
        float rim = pow(clamp(d / 0.54, 0.0, 1.0), 2.8);
        float innerMask = 1.0 - smoothstep(0.54, 0.94, d);
        vec3 color = mix(vec3(0.22, 0.58, 0.98), vec3(0.58, 0.88, 1.0), rim);
        float alpha = rim * innerMask * 0.32 * uOpacity;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  })
  return { material, uniforms }
}

/** Buduje szczegółowy model Ziemi z reliefem, warstwą chmur i lekkim błękitnym glow atmosfery. */
export function createEarthMesh(radius: number, assets: EarthAssets): EarthRig {
  const surfaceGeometry = new THREE.SphereGeometry(radius, 64, 48)
  const surfaceMaterial = new THREE.MeshPhongMaterial({
    map: assets.map,
    bumpMap: assets.bumpMap,
    bumpScale: 0.032 * radius,
    specularMap: assets.specularMap,
    specular: new THREE.Color(0x74c4ff),
    shininess: 36,
    emissive: new THREE.Color(0x06162a),
    emissiveIntensity: 0.45,
  })
  const mesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial)

  const cloudGeometry = new THREE.SphereGeometry(radius * 1.012, 64, 48)
  const cloudMaterial = new THREE.MeshPhongMaterial({
    map: assets.cloudMap,
    transparent: true,
    opacity: CLOUD_BASE_OPACITY,
    depthWrite: false,
    shininess: 4,
    specular: new THREE.Color(0x223344),
    emissive: new THREE.Color(0x0c1d33),
    emissiveIntensity: 0.25,
  })
  const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial)
  clouds.renderOrder = 1

  const rimGeometry = new THREE.SphereGeometry(radius * 1.016, 64, 48)
  const { material: rimMaterial, uniforms: rimUniforms } = createAtmosphereRimMaterial()
  const rim = new THREE.Mesh(rimGeometry, rimMaterial)
  rim.renderOrder = 2

  const haloGeometry = new THREE.SphereGeometry(radius * 1.18, 64, 48)
  const { material: haloMaterial, uniforms: haloUniforms } = createAtmosphereHaloMaterial()
  const halo = new THREE.Mesh(haloGeometry, haloMaterial)
  halo.renderOrder = 3

  mesh.add(clouds, rim, halo)
  mesh.userData.setEarthOpacity = (opacity: number) => {
    const clamped = Math.max(0, Math.min(1, opacity))
    const fading = clamped < 0.999
    surfaceMaterial.transparent = fading
    surfaceMaterial.opacity = clamped
    cloudMaterial.opacity = CLOUD_BASE_OPACITY * clamped
    rimUniforms.uOpacity.value = clamped
    haloUniforms.uOpacity.value = clamped
    const visible = clamped > 0
    clouds.visible = visible
    rim.visible = visible
    halo.visible = visible
  }

  return {
    mesh,
    clouds,
    disposables: [
      surfaceGeometry,
      surfaceMaterial,
      cloudGeometry,
      cloudMaterial,
      rimGeometry,
      rimMaterial,
      haloGeometry,
      haloMaterial,
    ],
  }
}

/** Ustawia krycie Ziemi wraz z chmurami i poświatą atmosfery (działa też na prostej kuli testowej). */
export function setEarthOpacity(earth: THREE.Mesh, opacity: number) {
  const custom = earth.userData.setEarthOpacity as ((value: number) => void) | undefined
  if (custom) {
    custom(opacity)
    return
  }
  const material = earth.material as THREE.Material
  const clamped = Math.max(0, Math.min(1, opacity))
  material.transparent = clamped < 0.999
  material.opacity = clamped
}
