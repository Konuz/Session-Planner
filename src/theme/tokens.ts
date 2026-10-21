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
  // Odznaki rekomendacji filtrów (karta obiektu): dobre, średnie i złe warunki.
  'badgeGood',
  'badgeFair',
  'badgePoor',
  // Ostrzeżenia i błędy formularzy: akcent jest achromatyczny, więc ostrzeżenie ma własny kolor.
  'alert',
  // Rampa zmierzchu (pas nocy na górnym pasku i wykres nocy): od dnia do zmierzchu astronomicznego; noc to tło.
  'skyDay',
  'skyCivil',
  'skyNautical',
  'skyAstronomical',
] as const

export type ColorToken = (typeof colorTokens)[number]
export type Palette = Record<ColorToken, string>

// Interfejs jest achromatyczny (światło gwiazd na nocnym niebie); barwy niosą tylko dane: typy obiektów, warunki
// filtrów i rampa zmierzchu.
export const darkCosmos: Palette = {
  background: '#05070D',
  card: '#0B0F1A',
  border: '#1C2436',
  foreground: '#D9D3C3',
  accent: '#F6F1E4',
  muted: '#8890A4',
  reflectionNebula: '#60A5FA',
  emissionNebula: '#F43F5E', // także SNR
  darkNebula: '#F59E0B',
  galaxy: '#A78BFA',
  planetaryNebula: '#2DD4BF', // [Z15]
  cluster: '#FACC15', // [Z15]
  badgeGood: '#5CD69B',
  badgeFair: '#E8C35A',
  badgePoor: '#F2706B',
  alert: '#F5A65B', // lampa sodowa
  skyDay: '#3D5D8F',
  skyCivil: '#2B4470',
  skyNautical: '#1B2A4A',
  skyAstronomical: '#101930',
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
  badgeGood: '#FF0000',
  badgeFair: '#CC0000',
  badgePoor: '#800000',
  alert: '#FF0000',
  skyDay: '#4D0000',
  skyCivil: '#360000',
  skyNautical: '#220000',
  skyAstronomical: '#120000',
}

/** Rozmycie tła karty: w Red Mode karta jest nieprzezroczysta i bez rozmycia. */
const cardBlurPx = { darkCosmos: 12, redMode: 0 }

export const RED_MODE_CLASS = 'red-mode'

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
