import * as THREE from 'three'
import type { RefObject } from 'react'
import { cutsInThreeD, photoFrame, type PhotoCut, type PhotoProject } from '../../lib/photo'
import { scenePosition } from '../../lib/space3d'
import type { Space3DHandle } from '../Space3D'

export interface UniversePhotoLabel { id: string; x: number; y: number; size: number; visible: boolean }

/** Rozłożone fragmenty fotografii otaczają kierunek zdjęcia; pomiary pozostają w target. */
export function universePhotoLayout(cuts: PhotoCut[]) {
  const enabled = cutsInThreeD(cuts).sort((a, b) => a.distLy! - b.distLy! || a.id.localeCompare(b.id))
  const targets = enabled.map(c => new THREE.Vector3(...scenePosition(c, c.distLy!, 'universe')))
  const span = Math.max(24, ...targets.map(p => p.length()))
  const direction = targets.at(-1)?.clone().normalize() ?? new THREE.Vector3(0, 0, 1)
  if (direction.lengthSq() === 0) direction.set(0, 0, 1)
  const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0))
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0)
  right.normalize()
  const up = new THREE.Vector3().crossVectors(right, direction).normalize()
  const size = span * 0.14
  const cards = enabled.map((cut, i) => {
    const angle = i * Math.PI * (3 - Math.sqrt(5))
    const position = targets[i].clone().addScaledVector(right, Math.cos(angle) * span * 0.4)
      .addScaledVector(up, Math.sin(angle) * span * 0.4)
    return { cut, target: targets[i], position }
  })
  return { cards, size, direction }
}

export function createUniversePhoto(handle: Space3DHandle, project: PhotoProject, progress: RefObject<number>, onLabels: (labels: UniversePhotoLabel[]) => void) {
  const { cards, size, direction } = universePhotoLayout(project.cuts)
  const { camera, scene, mount } = handle
  const group = new THREE.Group()
  group.name = 'universe-photo-fragments'
  scene.add(group)
  let disposed = false
  const sprites: { image: THREE.Sprite; border: THREE.Sprite; texture: THREE.Texture }[] = []
  const texture = new THREE.TextureLoader().load(project.image, () => {
    if (disposed) return
    sprites.forEach(s => { s.texture.needsUpdate = true })
    handle.invalidate()
  })
  texture.colorSpace = THREE.SRGBColorSpace
  for (const { cut } of cards) {
    const crop = texture.clone()
    crop.repeat.set(cut.radius * 2 / project.width, cut.radius * 2 / project.height)
    crop.offset.set((cut.x - cut.radius) / project.width, 1 - (cut.y + cut.radius) / project.height)
    const image = new THREE.Sprite(new THREE.SpriteMaterial({ map: crop, transparent: true, depthWrite: false }))
    const border = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x547a8a, transparent: true, depthWrite: false }))
    image.renderOrder = 3
    border.renderOrder = 2
    group.add(border, image)
    sprites.push({ image, border, texture: crop })
  }
  const vertices = new Float32Array(cards.length * 18)
  const linesGeometry = new THREE.BufferGeometry()
  linesGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  const linesMaterial = new THREE.LineBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: 0, depthWrite: false })
  group.add(new THREE.LineSegments(linesGeometry, linesMaterial))
  const dotsGeometry = new THREE.BufferGeometry().setFromPoints(cards.map(c => c.target))
  const dotsMaterial = new THREE.PointsMaterial({ color: 0x00e0ff, size: 4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false })
  group.add(new THREE.Points(dotsGeometry, dotsMaterial))
  const lastCamera = new THREE.Matrix4(), lastProjection = new THREE.Matrix4()
  let lastProgress = -1, lastWidth = 0, lastHeight = 0, selected: string | null = null
  const tmp = new THREE.Vector3(), source = new THREE.Vector3(), foot = new THREE.Vector3()
  const forward = new THREE.Vector3()

  const update = () => {
    const move = Math.max(0, Math.min(1, (progress.current - 0.18) / 0.82))
    const eased = move * move * (3 - 2 * move)
    camera.updateMatrixWorld()
    const width = mount.clientWidth, height = Math.max(1, mount.clientHeight)
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2)
    const frame = photoFrame(width, height, project)
    camera.getWorldDirection(forward)
    const depth = Math.max(1, camera.position.distanceTo(handle.controls.target))
    const units = 2 * depth * tan / height
    cards.forEach(({ cut, target, position }, i) => {
      const { image, border } = sprites[i]
      // Na początku sprite dokładnie pokrywa swój fragment płaskiego zdjęcia.
      source.set((frame.x + cut.x * frame.scale) / width * 2 - 1, 1 - (frame.y + cut.y * frame.scale) / height * 2, 0.5).unproject(camera)
      source.sub(camera.position)
      source.multiplyScalar(depth / source.dot(forward)).add(camera.position)
      image.position.copy(source).lerp(position, eased)
      border.position.copy(image.position)
      const currentDepth = Math.max(0.1, tmp.copy(image.position).sub(camera.position).dot(forward))
      const maxSize = 80 * 2 * currentDepth * tan / height
      const side = THREE.MathUtils.lerp(cut.radius * frame.scale * 2 * units, Math.min(size, maxSize), eased)
      image.scale.set(side, side, 1)
      border.scale.set(side * 1.035, side * 1.035, 1)
      image.material.rotation = border.material.rotation = Math.sin(i * 2.4) * 0.09 * eased
      image.material.opacity = border.material.opacity = Math.min(1, progress.current / 0.12)
      border.material.color.setHex(cut.id === selected ? 0x00e0ff : 0x547a8a)
      foot.set(target.x, 0, target.z)
      const floorEnd = foot.clone().multiplyScalar(Math.min(1, move * 2))
      const verticalEnd = foot.clone().lerp(target, Math.max(0, move * 2 - 1))
      const tetherEnd = target.clone().lerp(position, Math.max(0, (move - 0.75) * 4))
      const points = [new THREE.Vector3(), floorEnd, foot, verticalEnd, target, tetherEnd]
      points.forEach((p, j) => vertices.set(p.toArray(), i * 18 + j * 3))
    })
    linesMaterial.opacity = move * 0.35
    dotsMaterial.opacity = move
    linesGeometry.attributes.position.needsUpdate = true
    linesGeometry.computeBoundingSphere()
    if (lastProgress !== progress.current) handle.invalidate()
    // Projekcja po aktualizacji OrbitControls w step() sceny, bez opóźnienia podpisów względem kamery.
    queueMicrotask(() => {
      if (disposed || (lastProgress === progress.current && lastWidth === width && lastHeight === height
        && lastCamera.equals(camera.matrixWorld) && lastProjection.equals(camera.projectionMatrix))) return
      const labels = sprites.map(({ image }, i) => {
        const p = image.position.clone().project(camera)
        const depth = image.position.clone().applyMatrix4(camera.matrixWorldInverse).z
        return { id: cards[i].cut.id, x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2,
          size: depth < 0 ? image.scale.x * height / (-2 * depth * tan) : 0,
          visible: p.z >= -1 && p.z <= 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 }
      })
      onLabels(labels)
      lastProgress = progress.current
      lastWidth = width; lastHeight = height
      lastCamera.copy(camera.matrixWorld); lastProjection.copy(camera.projectionMatrix)
    })
  }
  handle.hooks.add(update)
  handle.invalidate()

  return {
    frameCamera() {
      handle.stopIntro()
      const points = [new THREE.Vector3(), ...cards.flatMap(c => [c.target, c.position])]
      const bounds = new THREE.Box3().setFromPoints(points)
      const center = bounds.getCenter(new THREE.Vector3())
      const side = new THREE.Vector3(-direction.z, 0, direction.x).normalize()
      if (side.lengthSq() === 0) side.set(1, 0, 0)
      const across = direction.clone().cross(side).normalize()
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2)
      let best = camera.position.clone(), bestScore = Infinity
      // Dobieramy kierunek oglądania fizycznego układu zdjęć, zamiast rozsuwać je w pikselach ekranu.
      const preview = camera.clone()
      for (let sample = 0; sample < 32; sample++) {
        const angle = sample * Math.PI * 2 / 32
        const view = direction.clone().multiplyScalar(0.55).addScaledVector(side, Math.cos(angle)).addScaledVector(across, Math.sin(angle)).normalize()
        if (view.y < 0.15) continue
        const right = new THREE.Vector3(0, 1, 0).cross(view).normalize()
        const up = view.clone().cross(right).normalize()
        let distance = 20
        for (const point of points) {
          const delta = point.clone().sub(center)
          distance = Math.max(distance, delta.dot(view) + (Math.abs(delta.dot(up)) + size) / (tan * 0.65),
            delta.dot(view) + (Math.abs(delta.dot(right)) + size) / (tan * camera.aspect * 0.7))
        }
        preview.position.copy(center).addScaledVector(view, distance)
        preview.lookAt(center)
        preview.updateMatrixWorld()
        const boxes = cards.map(c => {
          const p = c.position.clone().project(preview)
          const depth = -c.position.clone().applyMatrix4(preview.matrixWorldInverse).z
          const pixels = Math.min(80, size * mount.clientHeight / (2 * depth * tan))
          return { x: (p.x + 1) * mount.clientWidth / 2 - 55, y: (1 - p.y) * mount.clientHeight / 2 - pixels / 2, width: 110, height: pixels + 40 }
        })
        let score = 0
        boxes.forEach((a, i) => boxes.slice(0, i).forEach(b => {
          const w = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
          const h = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
          score += w * h
        }))
        if (score < bestScore) { bestScore = score; best.copy(preview.position) }
      }
      camera.position.copy(best)
      handle.controls.target.copy(center)
      camera.lookAt(center)
      const damping = handle.controls.enableDamping
      handle.controls.enableDamping = false
      handle.controls.update()
      handle.controls.enableDamping = damping
      handle.invalidate()
    },
    setSelected(id: string | null) { selected = id; handle.invalidate() },
    dispose() {
      disposed = true
      handle.hooks.delete(update)
      scene.remove(group)
      texture.dispose()
      sprites.forEach(s => { s.texture.dispose(); s.image.material.dispose(); s.border.material.dispose() })
      linesGeometry.dispose(); linesMaterial.dispose(); dotsGeometry.dispose(); dotsMaterial.dispose()
      handle.invalidate()
    },
  }
}
