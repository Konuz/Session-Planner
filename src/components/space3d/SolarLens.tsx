import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Minus, Plus } from 'lucide-react'
import * as THREE from 'three'
import { DEFAULT_ANNOTATION_COLORS } from '../../lib/catalog'
import { fmtDistance } from '../../lib/format'
import type { PhotoCut } from '../../lib/photo'
import { useStore } from '../../state/store'
import type { Space3DHandle } from '../Space3D'
import { glyphCanvas } from './markerGlyphs'
import type { PhotoGuide } from './photoGuide'

const DIAMETER = 174
type Mark = { cut: PhotoCut; x: number; y: number; depth: number }
const ringDistance = new Intl.NumberFormat('pl-PL', { maximumSignificantDigits: 2 })

interface LensProps {
  handle: Space3DHandle; guideRef: RefObject<PhotoGuide | null>; cuts: PhotoCut[]; selected: string | null; onPick(id: string): void
}

export function SolarLens(props: LensProps) {
  const [pinned, setPinned] = useState<string[]>([])
  return (pinned.length ? pinned : [null]).map(anchor => <Lens key={anchor ?? 'auto-lens'} {...props} anchor={anchor} pinned={pinned}
    onAdd={(id, next) => setPinned(ids => [...(ids.length > 1 ? ids : [id]), next])}
    onRemove={id => setPinned(ids => ids.filter(item => item !== id))} />)
}

function Lens({ handle, guideRef, cuts, selected, onPick, pinned, anchor, onAdd, onRemove }: LensProps & {
  pinned: string[]; anchor: string | null; onAdd(id: string, next: string): void; onRemove(id: string): void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [view, setView] = useState<{ x: number; y: number; marks: Mark[]; lyPerPixel: number; id: string; next: string | undefined } | null>(null)
  const colors = useStore(s => s.annotationColors)
  useEffect(() => {
    const { camera, mount, renderer } = handle
    const lens = new THREE.PerspectiveCamera()
    const world = new THREE.Matrix4(), projection = new THREE.Matrix4()
    const lookup = new Map(cuts.map(c => [c.id, c]))
    const p = new THREE.Vector3(), viewport = new THREE.Vector4(), scissor = new THREE.Vector4()
    let prev: PhotoGuide | null = null, width = 0, height = 0, shown = false, dirty = true
    let pointer = { x: Infinity, y: Infinity }
    const move = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      dirty = true
    }
    function hide() {
      if (shown) setView(null)
      shown = false
    }
    function update() {
      const guide = guideRef.current
      const w = mount.clientWidth, h = mount.clientHeight
      if (!guide || !guide.group.visible || handle.override.camera) { hide(); dirty = true; return }
      if (!dirty && prev === guide && width === w && height === h && world.equals(camera.matrixWorld) && projection.equals(camera.projectionMatrix)) return
      dirty = false; prev = guide; width = w; height = h
      world.copy(camera.matrixWorld); projection.copy(camera.projectionMatrix)
      const span = 2 * camera.position.distanceTo(handle.controls.target) * Math.tan(camera.getEffectiveFOV() * Math.PI / 360)
      if (span > 48 || Math.min(w,h) < DIAMETER) { hide(); return }
      const dots: Mark[] = []
      for (const marker of guide.markers.children) {
        const cut = lookup.get(marker.name)
        if (!cut) continue
        p.copy(marker.position).project(camera)
        if (Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) >= 1) continue
        dots.push({ cut, x: (1+p.x)*w/2, y: (1-p.y)*h/2, depth: -p.copy(marker.position).applyMatrix4(camera.matrixWorldInverse).z })
      }
      // Najpierw grupa pod kursorem, następnie grupa wybranego obiektu.
      dots.sort((a,b) => {
        const rank = (m: Mark) => Math.hypot(m.x-pointer.x, m.y-pointer.y) < DIAMETER/2 ? 0 : m.cut.id === selected ? 1 : 2
        return rank(a)-rank(b)
      })
      const hit = Math.max(10, h * 0.04 * camera.projectionMatrix.elements[5] / 2)
      const bins = new Map<string, Mark[]>()
      const cell = (v: number) => Math.floor(v / hit)
      for (const m of dots) {
        const key = cell(m.x) + ',' + cell(m.y)
        const bucket = bins.get(key)
        if (bucket) bucket.push(m)
        else bins.set(key, [m])
      }
      const occupied = dots.filter(m => pinned.includes(m.cut.id))
      const available = (m: Mark) => !occupied.some(b => Math.hypot(b.x-m.x,b.y-m.y) < hit*2)
      const collides = (m: Mark) => {
        for (let x = cell(m.x)-1; x <= cell(m.x)+1; x++) {
          for (let y = cell(m.y)-1; y <= cell(m.y)+1; y++) {
            if (bins.get(x+','+y)?.some(b => b !== m && Math.hypot(m.x-b.x,m.y-b.y) < hit)) return true
          }
        }
        return false
      }
      const seed = dots.find(m => (anchor ? m.cut.id === anchor : available(m)) && collides(m))
        ?? (pinned.length === 1 ? dots.find(collides) : undefined)
      if (!seed) { hide(); return }
      const group = dots.filter(m => Math.hypot(m.x-seed.x,m.y-seed.y)<hit)
      const cx = group.reduce((a,m)=>a+m.x,0)/group.length, cy = group.reduce((a,m)=>a+m.y,0)/group.length
      const mag = 4, radius = DIAMETER / 2, field = DIAMETER / mag
      const marks = dots.filter(m => Math.hypot(m.x-cx,m.y-cy) < field/2-2)
        .map(m => ({ ...m, x:radius+(m.x-cx)*mag, y:radius+(m.y-cy)*mag }))
      const target = canvas.current
      if (!target) return
      lens.copy(camera)
      lens.setViewOffset(w,h,cx-field/2,cy-field/2,field,field)
      renderer.getViewport(viewport); renderer.getScissor(scissor)
      const tested = renderer.getScissorTest(), visible = guide.markers.visible
      try {
        guide.markers.visible = false
        renderer.setViewport(0,0,DIAMETER,DIAMETER)
        renderer.setScissor(0,0,DIAMETER,DIAMETER); renderer.setScissorTest(true)
        renderer.render(handle.scene,lens)
        const src = renderer.domElement, pixels = Math.round(DIAMETER * renderer.getPixelRatio())
        const ctx = target.getContext('2d')!
        ctx.clearRect(0,0,target.width,target.height)
        ctx.drawImage(src,0,src.height-pixels,pixels,pixels,0,0,target.width,target.height)
      } finally {
        guide.markers.visible = visible
        renderer.setViewport(viewport); renderer.setScissor(scissor); renderer.setScissorTest(tested)
        handle.invalidate()
      }
      shown = true
      const next = dots.find(m => available(m) && Math.hypot(m.x-seed.x,m.y-seed.y) >= hit*2 && collides(m))
      const lyPerPixel = 2000 * seed.depth / (camera.projectionMatrix.elements[5] * h * mag)
      setView({ x:cx-radius, y:cy-radius, marks, lyPerPixel, id:seed.cut.id, next:next?.cut.id })
    }
    mount.addEventListener('pointermove',move)
    handle.layout.add(update)
    return () => { mount.removeEventListener('pointermove',move); handle.layout.delete(update) }
  }, [handle,guideRef,cuts,selected,pinned,anchor])
  return createPortal(<section className="solar-lens" hidden={!view} aria-label="Lupa nakładających się obiektów"
    style={{width:DIAMETER,height:DIAMETER,left:view?.x,top:view?.y}}>
    <div className="lens-glass">
    <canvas ref={canvas} width={DIAMETER*2} height={DIAMETER*2} />
    {view && <svg className="lens-rings" viewBox="0 0 174 174" aria-label="Odległość od środka lupy w płaszczyźnie obiektu">
      {[33, 65].map(r => <g key={r}>
        <circle cx="87" cy="87" r={r} />
        <text x="87" y={87-r+3}>{ringDistance.format(r * view.lyPerPixel)} lś</text>
      </g>)}
    </svg>}
    {view?.marks.map(({cut,x,y}) => <button key={cut.id} type="button" aria-label={cut.id} title={cut.id+' · '+fmtDistance(cut.distLy)}
      aria-pressed={selected===cut.id} style={{left:x,top:y}} onClick={()=>onPick(cut.id)}>
      <canvas width={24} height={24} ref={node=>{ if (node) glyphCanvas(cut.type,colors[cut.type]??DEFAULT_ANNOTATION_COLORS[cut.type],node) }} />
      <span>{cut.id}</span>
    </button>)}
    <small>4×</small>
    </div>
    {view && <div className="lens-tools">
      <button type="button" aria-label="Dodaj soczewkę" title="Dodaj soczewkę na kolejnej grupie" disabled={!view.next}
        onClick={() => { if (view.next) onAdd(view.id, view.next) }}><Plus size={14} /></button>
      <button type="button" aria-label="Usuń soczewkę" title="Usuń soczewkę" disabled={pinned.length < 2}
        onClick={() => { if (anchor) onRemove(anchor) }}><Minus size={14} /></button>
    </div>}
  </section>,handle.mount)
}
