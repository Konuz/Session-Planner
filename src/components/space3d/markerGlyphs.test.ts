import { afterEach, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { TYPE_INFO, type ObjectType } from '../../lib/catalog'
import { glyphCanvas, glyphTexture } from './markerGlyphs'

interface StrokeRecord {
  style: string
  width: number
  dash: number[]
  ops: string[]
}

function makeStubCanvas() {
  const strokes: StrokeRecord[] = []
  let currentDash: number[] = []
  let ops: string[] = []
  const ctx = {
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    setLineDash(dash: number[]) { currentDash = [...dash] },
    beginPath() { ops = [] },
    moveTo() { ops.push('moveTo') },
    lineTo() { ops.push('lineTo') },
    rect() { ops.push('rect') },
    arc() { ops.push('arc') },
    ellipse() { ops.push('ellipse') },
    closePath() { ops.push('closePath') },
    stroke() { strokes.push({ style: String(this.strokeStyle), width: this.lineWidth, dash: currentDash, ops: [...ops] }) },
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement
  return { canvas, strokes }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it('rysuje galaktyki jako elipsy, a wszystkie pozostałe typy jako ciągłe okręgi w zadanym kolorze', () => {
  const types = Object.keys(TYPE_INFO) as ObjectType[]
  const color = '#12abcd'

  for (const type of types) {
    const { canvas, strokes } = makeStubCanvas()
    glyphCanvas(type, color, canvas)
    expect(canvas.width).toBe(96)
    expect(canvas.height).toBe(96)
    expect(strokes).toHaveLength(2)
    expect(strokes[0]).toMatchObject({ style: 'rgba(2, 5, 13, 0.7)', width: 10 })
    expect(strokes[1]).toMatchObject({ style: color, width: 4.5 })

    if (type === 'G') {
      expect(strokes[1].ops).toEqual(['moveTo', 'ellipse'])
      expect(strokes[1].dash).toEqual([])
    } else if (type === 'GG') {
      expect(strokes[1].ops).toEqual(['moveTo', 'ellipse'])
      expect(strokes[1].dash).toEqual([12, 9])
    } else {
      expect(strokes[1].ops).toEqual(['moveTo', 'arc'])
      expect(strokes[1].dash).toEqual([])
    }
  }
})

it('tworzy teksturę SRGB znacznika bez błędu w środowisku z płótnem', () => {
  const { canvas, strokes } = makeStubCanvas()
  vi.stubGlobal('document', { createElement: () => canvas })
  const texture = glyphTexture('EN', '#ff6b9d')
  expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
  expect(strokes[1].ops).toEqual(['moveTo', 'arc'])
  expect(strokes[1].style).toBe('#ff6b9d')
})
