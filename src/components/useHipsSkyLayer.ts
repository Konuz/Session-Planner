// Niebo NSNS na kopule: leniwie ładowana warstwa WebGL we własnym płótnie pod resztą sceny, tylko przy wyglądzie z przeglądem HiPS.
// Utrata kontekstu zabiera zasoby warstwy; po przywróceniu warstwa tworzy się od nowa.
import { useEffect, useRef, useState, type RefObject } from 'react'
import { SURVEYS, type SurveyId } from '../lib/hips'
import type { HipsSkyLayer } from '../lib/hipsSkyGL'

export function useHipsSkyLayer(canvasRef: RefObject<HTMLCanvasElement | null>, survey: SurveyId | null, redraw: () => void): RefObject<HipsSkyLayer | null> {
  const layer = useRef<HipsSkyLayer | null>(null)
  const redrawRef = useRef(redraw)
  redrawRef.current = redraw
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!survey || !canvas) return
    let cancelled = false
    let created: HipsSkyLayer | null = null
    const lost = (e: Event) => {
      e.preventDefault()
      created = null
      layer.current = null
      redrawRef.current()
    }
    const restored = () => setEpoch((n) => n + 1)
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    import('../lib/hipsSkyGL').then((m) => {
      const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true })
      if (cancelled || !gl || gl.isContextLost()) return
      created = m.createHipsSkyLayer(gl, SURVEYS[survey], () => redrawRef.current())
      layer.current = created
      redrawRef.current()
    }).catch((e) => console.error('Kopuła: niebo NSNS', e))
    return () => {
      cancelled = true
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
      created?.dispose()
      if (layer.current === created) layer.current = null
      // Powrót do domyślnego wyglądu: kopuła rysuje się od nowa z gwiazdami i Drogą Mleczną.
      redrawRef.current()
    }
  }, [survey, epoch, canvasRef])

  return layer
}
