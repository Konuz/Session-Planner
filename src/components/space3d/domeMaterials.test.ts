import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { DOME_STYLES } from '../../lib/space3d'
import { createDomeMaterial } from './domeMaterials'

describe('createDomeMaterial', () => {
  it('tworzy przezroczyste materiały kopuły z Addytywnym mieszaniem dla wszystkich stylów', () => {
    for (const style of DOME_STYLES) {
      const m = createDomeMaterial(style.id)
      expect(m.transparent).toBe(true)
      expect(m.depthWrite).toBe(false)
      expect(m.side).toBe(THREE.DoubleSide)
      expect(m.blending).toBe(THREE.AdditiveBlending)
      expect(m.uniforms.opacity.value).toBe(1)
    }
  })

  it('style szklane używają premultipliedAlpha i alfy z jasności zamiast stałego 1.0', () => {
    for (const id of ['glint', 'reflection', 'thick'] as const) {
      const m = createDomeMaterial(id)
      expect(m.premultipliedAlpha).toBe(true)
      expect(m.fragmentShader).toContain('domeColor(')
      expect(m.fragmentShader).not.toMatch(/gl_FragColor\s*=\s*vec4\([^;]*,\s*1\.0\s*\)/)
    }
  })
})
