// Widok kadru w SVG (zakladka-kadr): mapa zastępcza pod ramką, panele mozaiki i pryzmat OAG.
//
// - Props: `fovDeg` (pole widoku = pole wycinka TAN o boku VIEW_SIZE jednostek), `profile`, `framing` (środek kadru =
//   środek widoku, PA, mozaika), `mapObjects` (wynik `fallbackMap` dla tego samego wycinka, więc piksele mapy to
//   jednostki widoku).
// - Jeden `<svg viewBox="0 0 1000 1000">`; punkty wpisane wprost w jednostkach widoku, bez `transform`.
// - Panel = `<g data-panel="N">` z wielokątem (LG, PG, PD, LD) i numerem; pryzmat OAG = `<polygon data-role="oag">`;
//   obiekt mapy = `<g data-map-uid>` (linia przerywana: `stroke-dasharray` na grupie). Mapa leży przed panelami (pod nimi).
// - Tło (tlo-mapy): siatka RA/Dec `<g data-role="grid">` i gwiazdy `<g data-role="stars">` z `mapBackground` leżą pod
//   zdjęciem; zależą tylko od wycinka widoku i gwiazd. Opis linii stoi przy punkcie wejścia, przesunięty do wnętrza.
// - Kolory tylko z klas tokenów.
import type { ReactElement } from 'react'
import { mosaicPanels, oagPrisms, skyToCutout, type CutoutPoint } from '../../services/framing'
import type { Star } from '../../services/stars'
import type { EquipmentProfile, Framing } from '../../types'
import type { FallbackMapObject } from './fallbackMap'
import { VIEW_SIZE, viewCutout } from './framingModel'
import { mapBackground, type GridLine } from './mapBackground'
import type { ViewRect } from './photoModel'

/**
 * Zdjęcie nieba pod mapą zastępczą i ramką (zdjecie-w-kadrze): `<image data-role="photo" href={href} x y width height preserveAspectRatio="none">` (prostokąt `rect`
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
  /**
   * Gwiazdy tła (tlo-mapy, nazwa wybrana przez test-author): brak / null / [] → sama siatka, bez komunikatu.
   * Tło w svg widoku: `<g data-role="grid">` (linie i opisy siatki RA/Dec, `<text>` z opisem linii), potem
   * `<g data-role="stars">` (kropki jako `<circle cx cy r>`), oba przed zdjęciem; bez `transform`, kolory z klas tokenów.
   */
  stars?: readonly Star[] | null
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

/** Miejsce opisu linii: punkt wejścia (albo pierwszy punkt w widoku) przesunięty do wnętrza widoku. */
function labelPosition(line: GridLine, size: number): CutoutPoint | null {
  const anchor =
    line.labelAnchor ?? line.points.find((p) => p.x >= 0 && p.x <= VIEW_SIZE && p.y >= 0 && p.y <= VIEW_SIZE) ?? null
  if (!anchor) return null
  return {
    x: Math.min(VIEW_SIZE - size * 4, Math.max(size * 0.3, anchor.x + size * 0.3)),
    y: Math.min(VIEW_SIZE - size * 0.4, Math.max(size * 1.2, anchor.y - size * 0.4)),
  }
}

export function FramingView({ fovDeg, profile, framing, mapObjects, photo = null, stars = null }: FramingViewProps): ReactElement {
  const cutout = viewCutout(framing, fovDeg)
  const background = mapBackground(stars ?? [], cutout)
  const gridLabelSize = VIEW_SIZE * 0.022
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

      <g data-role="grid">
        {background.grid.map((line) => (
          <polyline key={`${line.kind}${line.valueDeg}`} points={pointsText(line.points)} className="stroke-border" strokeWidth={1} {...LINE} />
        ))}
        {background.grid.map((line) => {
          const position = labelPosition(line, gridLabelSize)
          return (
            position && (
              <text
                key={`${line.kind}${line.valueDeg}`}
                x={round(position.x)}
                y={round(position.y)}
                fontSize={gridLabelSize}
                className="fill-muted stroke-none"
              >
                {line.label}
              </text>
            )
          )
        })}
      </g>

      <g data-role="stars" className="fill-foreground stroke-none">
        {background.stars.map((dot, i) => (
          <circle key={i} cx={round(dot.x)} cy={round(dot.y)} r={round(dot.radius)} />
        ))}
      </g>

      {photo && (
        <image
          data-role="photo"
          href={photo.href}
          x={round(photo.rect.x)}
          y={round(photo.rect.y)}
          width={round(photo.rect.width)}
          height={round(photo.rect.height)}
          preserveAspectRatio="none"
        />
      )}

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
