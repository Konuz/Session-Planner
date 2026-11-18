import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { cloudRowsUntil, createEarthMesh, setEarthOpacity, type EarthAssets } from './earthModel'

it('chmury liczone kawałkami w czasie bezczynności dają ten sam obraz co w jednym przebiegu', () => {
  const whole = new Uint8ClampedArray(384 * 192 * 4)
  expect(cloudRowsUntil(whole, 0, () => 100)).toBe(192)
  // Bez czasu bezczynności każdy kawałek liczy jeden wiersz; trzy wiersze na kawałek przy czterech wywołaniach timeLeft.
  const sliced = new Uint8ClampedArray(384 * 192 * 4)
  expect(cloudRowsUntil(sliced, 0, () => 0)).toBe(1)
  let calls = 0
  expect(cloudRowsUntil(sliced, 1, () => (++calls < 3 ? 5 : 0))).toBe(4)
  let y = 4
  while (y < 192) y = cloudRowsUntil(sliced, y, () => 0)
  expect(y).toBe(192)
  expect(sliced).toEqual(whole)
  // Chmury są, ale nie pokrywają całej kuli.
  const alpha = whole.filter((_, i) => i % 4 === 3)
  expect(alpha.some((a) => a > 0)).toBe(true)
  expect(alpha.some((a) => a === 0)).toBe(true)
})

function stubAssets(): EarthAssets {
  return {
    map: new THREE.Texture(),
    bumpMap: new THREE.Texture(),
    specularMap: new THREE.Texture(),
    cloudMap: new THREE.Texture(),
    dispose() {},
  }
}

describe('earthModel', () => {
  it('obraca powierzchnię o pełny obrót w 30 sekund i zachowuje płynny dryf chmur', () => {
    const rig = createEarthMesh(1, stubAssets())
    rig.spin(12_000)
    const before = rig.mesh.quaternion.clone()
    const cloudAngle = rig.clouds.rotation.y
    rig.spin(19_500)
    expect(rig.mesh.quaternion.angleTo(before)).toBeCloseTo(Math.PI / 2)
    rig.spin(42_000)
    expect(rig.mesh.quaternion.angleTo(before)).toBeCloseTo(0)
    expect(rig.clouds.rotation.y - cloudAngle).toBeCloseTo(Math.PI / 2)
    for (const d of rig.disposables) d.dispose()
  })

  it('tworzy kulę z chmurami i warstwami poświaty oraz skaluje krycie wszystkich warstw razem', () => {
    const assets = stubAssets()
    const rig = createEarthMesh(1.5, assets)
    expect(rig.mesh.geometry.parameters.radius).toBe(1.5)
    expect(rig.mesh.geometry.parameters.widthSegments).toBe(64)
    expect(rig.mesh.children).toHaveLength(3)

    const [, rim, halo] = rig.mesh.children as THREE.Mesh[]
    const rimMat = rim.material as THREE.ShaderMaterial
    const haloMat = halo.material as THREE.ShaderMaterial

    setEarthOpacity(rig.mesh, 0.5)
    expect(rig.mesh.material.transparent).toBe(true)
    expect(rig.mesh.material.opacity).toBeCloseTo(0.5)
    expect(rig.clouds.material.opacity).toBeCloseTo(0.17)
    expect(rimMat.uniforms.uOpacity.value).toBeCloseTo(0.5)
    expect(haloMat.uniforms.uOpacity.value).toBeCloseTo(0.5)
    expect(rig.clouds.visible).toBe(true)

    setEarthOpacity(rig.mesh, 0)
    expect(rig.clouds.visible).toBe(false)
    expect(rim.visible).toBe(false)
    expect(halo.visible).toBe(false)

    setEarthOpacity(rig.mesh, 1)
    expect(rig.mesh.material.transparent).toBe(false)
    expect(rig.mesh.material.opacity).toBe(1)
    expect(rig.clouds.visible).toBe(true)
    for (const d of rig.disposables) d.dispose()
  })

  it('działa poprawnie również dla zwykłej kuli testowej bez kontrolera warstw', () => {
    const plain = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial())
    setEarthOpacity(plain, 0.4)
    expect(plain.material.transparent).toBe(true)
    expect(plain.material.opacity).toBeCloseTo(0.4)
    setEarthOpacity(plain, 1)
    expect(plain.material.transparent).toBe(false)
    expect(plain.material.opacity).toBe(1)
    plain.geometry.dispose()
    plain.material.dispose()
  })
})
