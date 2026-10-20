// Widok kadru w SVG (zakladka-kadr): mapa zastępcza pod ramką, panele mozaiki i pryzmat OAG.
//
// - Props: `fovDeg` (pole widoku = pole wycinka TAN o boku VIEW_SIZE jednostek), `profile`, `framing` (środek kadru =
//   środek widoku, PA, mozaika), `mapObjects` (wynik `fallbackMap` dla tego samego wycinka, więc piksele mapy to
//   jednostki widoku).
// - Jeden `<svg viewBox="0 0 1000 1000">`; punkty wpisane wprost w jednostkach widoku, bez `transform`.
// - Panel = `<g data-panel="N">` z wielokątem (LG, PG, PD, LD) i numerem; pryzmat OAG = `<polygon data-role="oag">`;
//   obiekt mapy = `<g data-map-uid>` (linia przerywana: `stroke-dasharray` na grupie). Mapa leży przed panelami (pod nimi).
// - Kolory tylko z klas tokenów.
import type { ReactElement } from 'react'
import { mosaicPanels, oagPrisms, skyToCutout, type CutoutPoint } from '../../services/framing'
import type { EquipmentProfile, Framing } from '../../types'
import type { FallbackMapObject } from './fallbackMap'
import { VIEW_SIZE, viewCutout } from './framingModel'
import type { ViewRect } from './photoModel'

/**
 * Zdjęcie nieba pod mapą zastępczą i ramką (zdjecie-w-kadrze). ZAŚLEPKA: prop jeszcze nie jest rysowany.
 * Ma dać `<image data-role="photo" href={href} x y width height preserveAspectRatio="none">` (prostokąt `rect`
 * w jednostkach widoku, bez `transform`) przed obiektami mapy i panelami; bez `photo` (null) – brak `<image>`.
 */
export interface FramingPhoto {
  href: string
  rect: ViewRect
}

export interface FramingViewProps {
  fovDeg: number
  profile: EquipmentProfile
  framing: Framing
  mapObjects: readonly FallbackMapObject[]
  photo?: FramingPhoto | null
}

const round = (value: number) => Math.round(value * 100) / 100
const pointsText = (points: readonly CutoutPoint[]) => points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ')

function centroid(points: readonly CutoutPoint[]): CutoutPoint {
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  }
}

const LINE = { vectorEffect: 'non-scaling-stroke', fill: 'none' } as const

export function FramingView({ fovDeg, profile, framing, mapObjects }: FramingViewProps): ReactElement {
  const cutout = viewCutout(framing, fovDeg)
  const project = (quad: readonly { raDeg: number; decDeg: number }[]) => quad.map((corner) => skyToCutout(cutout, corner))
  const panels = mosaicPanels(profile, framing).map((panel) => project(panel.corners))
  const prisms = oagPrisms(profile, framing).map(project)
  const labelSize = VIEW_SIZE * 0.028
  const panelNumberSize = VIEW_SIZE * 0.05

  return (
    <svg
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      className="block aspect-square h-auto w-full select-none"
      role="img"
      aria-label="Kadr na niebie: północ u góry, wschód po lewej"
    >
      <rect x={0} y={0} width={VIEW_SIZE} height={VIEW_SIZE} className="fill-background" />

      {mapObjects.map((object) => (
        <g
          key={object.uid}
          data-map-uid={object.uid}
          className="stroke-muted"
          strokeWidth={1.25}
          strokeDasharray={object.lineStyle === 'dashed' ? '6 4' : undefined}
        >
          {object.shapes.map((shape, i) => (
            <polygon key={i} points={pointsText(shape)} {...LINE} />
          ))}
          {object.label.position && (
            <text
              x={round(object.label.position.x)}
              y={round(object.label.position.y - labelSize * 0.6)}
              textAnchor="middle"
              fontSize={labelSize}
              className="fill-muted stroke-none"
            >
              {object.label.text}
            </text>
          )}
        </g>
      ))}

      {panels.map((corners, i) => {
        const center = centroid(corners)
        return (
          <g key={i} data-panel={i + 1}>
            <polygon points={pointsText(corners)} className="stroke-accent" strokeWidth={2} {...LINE} />
            <text
              x={round(center.x)}
              y={round(center.y)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={panelNumberSize}
              className="fill-accent"
              fillOpacity={0.8}
            >
              {i + 1}
            </text>
          </g>
        )
      })}

      {prisms.map((corners, i) => (
        <polygon
          key={i}
          data-role="oag"
          points={pointsText(corners)}
          className="stroke-foreground"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          {...LINE}
        />
      ))}
    </svg>
  )
}
