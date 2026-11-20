type CoordinateParts = {
  values: number[]
  negative: boolean
  hasHourUnit: boolean
  hasDegreeUnit: boolean
}

function coordinateParts(input: string): CoordinateParts | null {
  const value = input
    .trim()
    .replace(/^(?:ra|dec)\s*[:=]?\s*/i, '')
    .replace(/[−–—]/g, '-')
    .replace(/,/g, '.')
  if (!value) return null

  const hasHourUnit = /h|hour/i.test(value)
  const hasDegreeUnit = /[°ºd]|degree/i.test(value)
  const normalized = value
    .replace(/hours?|degrees?|minutes?|seconds?/gi, ' ')
    .replace(/[hHdD°ºmM′'’sS″"]/g, ' ')
    .replace(/[:=]/g, ' ')
    .trim()
  const tokens = normalized.split(/\s+/)
  if (tokens.length < 1 || tokens.length > 3 || tokens.some((token) => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token))) return null
  const values = tokens.map(Number)
  return values.every(Number.isFinite) ? { values, negative: tokens[0].startsWith('-'), hasHourUnit, hasDegreeUnit } : null
}

function sexagesimal(parts: CoordinateParts, unit: 'hours' | 'degrees'): number | null {
  const [first, minutes = 0, seconds = 0] = parts.values
  if (!Number.isInteger(Math.abs(first)) || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null
  const sign = parts.negative ? -1 : 1
  const magnitude = Math.abs(first) + minutes / 60 + seconds / 3600
  const limit = unit === 'hours' ? 24 : 360
  if (magnitude > limit) return null
  if (unit === 'hours') return ((sign * magnitude * 15) % 360 + 360) % 360
  return sign * magnitude
}

/** RA: decimal degrees, hours with an h suffix, or sexagesimal hours/degrees. */
export function parseRaCoordinate(input: string): number | null {
  const parts = coordinateParts(input)
  if (!parts || parts.negative) return null
  if (parts.values.length > 1) {
    const unit = parts.hasDegreeUnit ? 'degrees' : 'hours'
    return sexagesimal(parts, unit)
  }

  const value = parts.values[0]
  if (parts.hasHourUnit) {
    if (value < 0 || value > 24) return null
    return (value * 15) % 360
  }
  if (parts.hasDegreeUnit) return value >= 0 && value <= 360 ? value % 360 : null
  return value >= 0 && value <= 360 ? value % 360 : null
}

/** Dec: decimal degrees or sexagesimal degrees. */
export function parseDecCoordinate(input: string): number | null {
  const parts = coordinateParts(input)
  if (!parts) return null
  if (parts.values.length > 1) {
    const value = sexagesimal(parts, 'degrees')
    return value !== null && Math.abs(value) <= 90 ? value : null
  }

  const value = parts.values[0]
  return Math.abs(value) <= 90 ? value : null
}
