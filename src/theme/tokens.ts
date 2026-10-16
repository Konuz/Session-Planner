// Tokeny kolorów z sekcji 8. Z nich powstają zmienne CSS (tailwindPlugin.ts) i z nich korzystają testy.

export const colorTokens = [
  'background',
  'card',
  'border',
  'foreground',
  'accent',
  'muted',
  'reflectionNebula',
  'emissionNebula',
  'darkNebula',
  'galaxy',
  'planetaryNebula',
  'cluster',
] as const

export type ColorToken = (typeof colorTokens)[number]
export type Palette = Record<ColorToken, string>

export const darkCosmos: Palette = {
  background: '#07090E',
  card: 'rgba(15,23,42,0.7)',
  border: 'rgba(30,41,59,0.8)',
  foreground: '#E2E8F0',
  accent: '#60A5FA',
  muted: '#94A3B8',
  reflectionNebula: '#60A5FA',
  emissionNebula: '#F43F5E', // także SNR
  darkNebula: '#F59E0B',
  galaxy: '#A78BFA',
  planetaryNebula: '#2DD4BF', // [Z15]
  cluster: '#FACC15', // [Z15]
}

export const redMode: Palette = {
  background: '#000000',
  card: '#140000',
  border: '#4D0000',
  foreground: '#CC0000',
  accent: '#FF0000',
  muted: '#800000',
  reflectionNebula: '#FF0000',
  emissionNebula: '#FF0000',
  darkNebula: '#CC0000',
  galaxy: '#CC0000',
  planetaryNebula: '#CC0000',
  cluster: '#CC0000',
}

/** Rozmycie tła karty: w Red Mode karta jest nieprzezroczysta i bez rozmycia. */
const cardBlurPx = { darkCosmos: 12, redMode: 0 }

const RED_MODE_CLASS = 'red-mode'

/** Nazwa tokenu w CSS, np. 'reflectionNebula' → 'reflection-nebula'. */
export function tokenCssName(token: ColorToken): string {
  return token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

export function tokenVariable(token: ColorToken): string {
  return `--token-${tokenCssName(token)}`
}

function paletteVariables(palette: Palette, blurPx: number): Record<string, string> {
  const variables: Record<string, string> = { '--token-card-blur': `${blurPx}px` }
  for (const token of colorTokens) variables[tokenVariable(token)] = palette[token]
  return variables
}

/** Zmienne CSS obu palet; klasa `red-mode` na <html> przełącza wszystkie tokeny. */
export function themeVariables(): Record<string, Record<string, string>> {
  return {
    ':root': paletteVariables(darkCosmos, cardBlurPx.darkCosmos),
    [`html.${RED_MODE_CLASS}`]: paletteVariables(redMode, cardBlurPx.redMode),
  }
}
