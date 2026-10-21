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
  // Ostrzeżenia i błędy formularzy (akcent jest kolorem akcji, więc ostrzeżenie ma własny kolor).
  'alert',
  // Pergamin: nazwy obiektów i duże liczby pisane szeryfem.
  'parchment',
  // Lampka przełącznika Red Mode.
  'lamp',
  // Rampa zmierzchu (pas nocy na górnym pasku i wykres nocy): od dnia do zmierzchu astronomicznego; noc to tło.
  'skyDay',
  'skyCivil',
  'skyNautical',
  'skyAstronomical',
] as const

export type ColorToken = (typeof colorTokens)[number]
export type Palette = Record<ColorToken, string>

// Granat nocnego nieba z poświatą zenitu, panele jak przyciemnione szkło; bursztyn lampy sodowej oznacza akcje,
// pergamin nazwy obiektów i duże liczby.
export const darkCosmos: Palette = {
  background: '#050816',
  card: 'rgba(12,18,48,0.72)',
  border: '#1E2850',
  foreground: '#D6DCEA',
  accent: '#F2B35B',
  muted: '#8F9ABB',
  reflectionNebula: '#60A5FA',
  emissionNebula: '#F43F5E', // także SNR
  darkNebula: '#F59E0B',
  galaxy: '#A78BFA',
  planetaryNebula: '#2DD4BF', // [Z15]
  cluster: '#FACC15', // [Z15]
  badgeGood: '#5CD69B',
  badgeFair: '#E8C35A',
  badgePoor: '#F2706B',
  alert: '#EF7B6E',
  parchment: '#E8D5AD',
  lamp: '#E5484D',
  skyDay: '#33498A',
  skyCivil: '#263A70',
  skyNautical: '#1A2754',
  skyAstronomical: '#101938',
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
  parchment: '#CC0000',
  lamp: '#FF0000',
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
