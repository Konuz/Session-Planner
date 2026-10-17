// Ikona fazy Księżyca: kształt oświetlonej części tarczy jako ścieżka SVG (widok z półkuli północnej).

const round = (value: number) => Math.round(value * 100) / 100

/**
 * Oświetlona część tarczy o środku (cx, cy) i promieniu r: brzeg po stronie oświetlonej (prawej, gdy przybywa)
 * i terminator – półelipsa o półosi poziomej r·|1 − 2f|, wygięta ku stronie oświetlonej dla sierpa i ku ciemnej dla garbu.
 */
export function moonPhasePath(cx: number, cy: number, r: number, illuminatedFraction: number, waxing: boolean): string {
  const terminatorRx = round(r * Math.abs(1 - 2 * illuminatedFraction))
  const limbSweep = waxing ? 1 : 0
  const terminatorSweep = illuminatedFraction < 0.5 === waxing ? 0 : 1
  const [top, bottom] = [round(cy - r), round(cy + r)]
  return `M ${round(cx)} ${top} A ${round(r)} ${round(r)} 0 0 ${limbSweep} ${round(cx)} ${bottom} A ${terminatorRx} ${round(r)} 0 0 ${terminatorSweep} ${round(cx)} ${top} Z`
}
