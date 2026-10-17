// Wspólne dane testów funkcji „karta-obiektu”.
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect } from 'vitest'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { ObjectCard } from '../../../src/features/catalog/ObjectCard'
import { objectCardModel, type CardContext, type ObjectCardModel } from '../../../src/features/catalog/objectCardModel'
import { bodyPosition } from '../../../src/services/astroMath'
import { designationKey, formatDesignation } from '../../../src/services/catalog/records'
import {
  prepareCatalogNight,
  summarizeObject,
  type CatalogNightParams,
  type ObjectNightSummary,
} from '../../../src/services/catalogNight'
import { filterAdvice, type FilterAdvice, type FilterAdviceColor, type MoonConditions } from '../../../src/services/filterAdvice'
import { DEFAULT_MOON_RULES, DEFAULT_PLANNING_SETTINGS } from '../../../src/services/planningSettings'
import { tokenCssName, tokenVariable, type ColorToken } from '../../../src/theme/tokens'
import type { Darkness } from '../../../src/services/visibility'
import { at } from '../../../src/test/fixtures'
import type { Designation, DsoObject, EquipmentProfile, FilterId, Mount, PlanningSettings } from '../../../src/types'

// ---------- Katalog ----------

/** Katalog aplikacji (public/catalog, 16 516 obiektów). */
export const CATALOG = JSON.parse(
  readFileSync(new URL('../../../public/catalog/catalog.v1.json', import.meta.url), 'utf8'),
) as DsoObject[]

const byDesignation = new Map(
  CATALOG.flatMap((object) => object.designations.map((designation) => [designationKey(designation), object] as const)),
)

/** Obiekt katalogu aplikacji po dowolnym oznaczeniu, np. catalogObject('M', '31'). */
export function catalogObject(catalog: Designation['catalog'], id: string): DsoObject {
  const object = byDesignation.get(designationKey({ catalog, id }))
  if (!object) throw new Error(`Brak obiektu ${formatDesignation({ catalog, id })} w katalogu`)
  return object
}

export const M31 = catalogObject('M', '31')
export const SH2_155 = catalogObject('Sh2', '155')
export const M45 = catalogObject('M', '45')
export const LDN1235 = catalogObject('LDN', '1235')
export const NGC6960 = catalogObject('NGC', '6960')
export const M101 = catalogObject('M', '101')
/** M 81: góruje w dzień (po końcu osi nocy), najwyżej na końcu okna ciemności. */
export const M81 = catalogObject('M', '81')
export const SIMEIS147 = catalogObject('Simeis', '147')
export const M42 = catalogObject('M', '42')
export const NGC7000 = catalogObject('NGC', '7000')
export const VDB141 = catalogObject('VdB', '141')
export const M57 = catalogObject('M', '57')
export const M13 = catalogObject('M', '13')
/** HCG 79 (Seyfert's Sextet): grupa galaktyk. */
export const HCG79 = catalogObject('Other', 'HCG 79')
/** IC 1090: typ „other”. */
export const IC1090 = catalogObject('IC', '1090')

/** Obiekt, który w noc z przykładów nie wznosi się ponad h_min 30° (Dec −60°): czas efektywny 0 min, bez danych Księżyca. */
export const SOUTHERN: DsoObject = { ...M31, uid: 'test-south', raDeg: 0, decDeg: -60 }

/** Obiekt z katalogu o innym typie (pozostałe pola bez zmian). */
export function withType(object: DsoObject, type: DsoObject['type']): DsoObject {
  return { ...object, type }
}

// ---------- Noc z przykładów ----------

/** Strefa czasowa lokalizacji z przykładów. */
export const TIME_ZONE = 'Europe/Warsaw'

/** Parametry planowania z przykładów: próg −18° z obniżaniem, h_min 30°, krok katalogowy 5 min. */
const SETTINGS: PlanningSettings = {
  ...DEFAULT_PLANNING_SETTINGS,
  darknessThresholdDeg: -18,
  autoLowerThreshold: true,
  minAltitudeDeg: 30,
  catalogStepMin: 5,
}

/** 52,0°N, 19,0°E, 150 m, horyzont płaski; noc 16/17.10.2026. */
export const NIGHT_PARAMS: CatalogNightParams = {
  location: { latDeg: 52, lonDegEast: 19, elevationM: 150, timezone: TIME_ZONE, horizon: [] },
  nightDate: '2026-10-16',
  settings: SETTINGS,
}

/** Noc przygotowana tak jak w Workerze (okno ciemności, siatka, macierz precesji nocy). */
export const NIGHT = prepareCatalogNight(NIGHT_PARAMS)

/** Kursor z przykładów: 00:00 CEST 17.10.2026. */
export const CURSOR_MS = at('2026-10-17 00:00', 'CEST')

/** Profil demonstracyjny po nazwie (sekcja 6.4). */
export function profileNamed(name: string): EquipmentProfile {
  const profile = DEMO_PROFILES.find((candidate) => candidate.name === name)
  if (!profile) throw new Error(`Brak profilu ${name}`)
  return profile
}

/** Mój zestaw: GEM, przerzut 10 min po południku, filtry L, R, G, B, Ha, OIII, SII. */
export const MY_SET = profileNamed('Mój zestaw')
export const MY_FILTERS: readonly FilterId[] = MY_SET.filters

/** Mój zestaw z innym montażem. */
export function withMount(mount: Mount): EquipmentProfile {
  return { ...MY_SET, mount }
}

/** Kontekst kart: noc z przykładów, Mój zestaw, kursor 00:00 CEST i Księżyc w kursorze (`bodyPosition('moon', …)`). */
export function cardContext(patch: Partial<CardContext> = {}): CardContext {
  const cursorMs = patch.cursorMs ?? CURSOR_MS
  return {
    site: NIGHT.site,
    timeZone: TIME_ZONE,
    precession: NIGHT.precession,
    profile: MY_SET,
    cursorMs,
    moonAtCursor: bodyPosition('moon', NIGHT.site, cursorMs),
    ...patch,
  }
}

/** Podsumowanie obiektu w nocy z przykładów, tak jak liczy je Worker (`summarizeObject`). */
export function nightSummary(object: DsoObject): ObjectNightSummary {
  return summarizeObject(NIGHT, object)
}

/** Rekomendacje dla filtrów Mojego zestawu z danych Księżyca podsumowania (`filterAdvice`, progi domyślne). */
export function mySetAdvice(object: DsoObject, summary: ObjectNightSummary): FilterAdvice[] {
  return filterAdvice(summary.moon ?? null, object.type, DEFAULT_MOON_RULES, MY_FILTERS)
}

/** Karta obiektu w nocy z przykładów: podsumowanie z `summarizeObject`, rekomendacje z `filterAdvice`. */
export function cardOf(object: DsoObject, patch: Partial<CardContext> = {}): ObjectCardModel {
  const summary = nightSummary(object)
  return objectCardModel(object, summary, mySetAdvice(object, summary), cardContext(patch))
}

/** Karta obiektu z podsumowaniem i rekomendacjami podanymi wprost. */
export function cardWith(
  object: DsoObject,
  summary: ObjectNightSummary,
  advice: readonly FilterAdvice[] = [],
  patch: Partial<CardContext> = {},
): ObjectCardModel {
  return objectCardModel(object, summary, advice, cardContext(patch))
}

// ---------- Podsumowania podane wprost ----------

/** Stan nocy z oknem ciemności. */
export type WindowDarkness = Extract<Darkness, { kind: 'window' }>

/** Okno ciemności −18° nocy 16/17.10.2026: 19:40–05:19 CEST [T4]. */
export const WINDOW_18: WindowDarkness = {
  kind: 'window',
  window: { startMs: at('2026-10-16 19:40', 'CEST'), endMs: at('2026-10-17 05:19', 'CEST') },
  thresholdDeg: -18,
  lowered: false,
}

/** Noc 21/22.06.2026 przy 52°N: próg obniżony do −12°, okno 23:15–02:16 CEST [T6]. */
export const LOWERED_12: WindowDarkness = {
  kind: 'window',
  window: { startMs: at('2026-06-21 23:15', 'CEST'), endMs: at('2026-06-22 02:16', 'CEST') },
  thresholdDeg: -12,
  lowered: true,
}

/** Brak okna nawet przy progu −12° (np. 54,83°N w noc 21/22.06.2026) [T6]. */
export const NONE_12: Darkness = { kind: 'none', thresholdDeg: -12 }

/** Dane Księżyca podane wprost: udział pod horyzontem (0–1), oświetlenie (0–1), najmniejsza separacja [°]. */
export function moon(moonDownFraction: number, illumination: number, minSeparationDeg: number): MoonConditions {
  return { moonDownFraction, illumination, minSeparationDeg }
}

/**
 * Podsumowanie podane wprost; domyślnie jak M 31 w nocy z przykładów (okno −18°, 579 min, górowanie 23:46 CEST na
 * wysokości 79,42°, najmniejsza separacja 110°).
 */
export function givenSummary(patch: Partial<ObjectNightSummary> = {}): ObjectNightSummary {
  const transitMs = at('2026-10-16 23:46', 'CEST')
  return {
    uid: 'NGC224',
    darkness: WINDOW_18,
    effectiveMinutes: 579,
    transitMs,
    highest: { timeMs: transitMs, altDeg: 79.42 },
    moon: moon(0.93, 0.34, 110),
    ...patch,
  }
}

/** Rekomendacje dla filtrów Mojego zestawu w jego kolejności (L, R, G, B, Ha, OIII, SII). */
export function adviceFor(colors: readonly FilterAdviceColor[]): FilterAdvice[] {
  expect(colors).toHaveLength(MY_FILTERS.length)
  return MY_FILTERS.map((filter, i) => ({ filter, color: colors[i] }))
}

// ---------- Godziny z tolerancją ----------

/** Tekst z godziną „HH:MM” przesuniętą o `minutes` minut (pierwsza godzina w tekście). */
function shiftClock(text: string, minutes: number): string {
  return text.replace(/(\d{2}):(\d{2})/, (_, hours: string, mins: string) => {
    const total = (((Number(hours) * 60 + Number(mins) + minutes) % 1440) + 1440) % 1440
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  })
}

/** Tekst zgodny z oczekiwanym, a godzina w nim z tolerancją ±1 min (tolerancja czasów z załącznika A). */
export function expectTextWithinMinute(actual: string | null, expected: string): void {
  expect([shiftClock(expected, -1), expected, shiftClock(expected, 1)]).toContain(actual)
}

export { at }

// ---------- Render karty ----------

/** Znaczniki karty z `renderToStaticMarkup` (bez DOM). */
export function renderCard(card: ObjectCardModel): string {
  return renderToStaticMarkup(createElement(ObjectCard, { card }))
}

/** Tekst widoczny w znacznikach: bez tagów, z rozkodowanymi encjami, spacje scalone, bez spacji przed „,” „.” „)”. */
export function visibleText(markup: string): string {
  return markup
    .replace(/<!--.*?-->/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .trim()
}

/** Klasy narzędziowe Tailwind, które ustawiają kolor (z wariantami, np. „md:”, i przezroczystością „/70”). */
const COLOR_UTILITY = '(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[a-z])?|fill|stroke|outline|ring|decoration|accent|caret|divide|shadow|from|via|to)'

/** Czy znaczniki używają tokenu: klasą koloru z nazwą tokenu (np. „text-emission-nebula”) albo zmienną CSS tokenu. */
export function usesToken(markup: string, token: ColorToken): boolean {
  const utility = new RegExp(`(?:^|[\\s"'])${COLOR_UTILITY}-${tokenCssName(token)}(?:/\\d+)?(?=[\\s"'])`)
  return utility.test(markup) || markup.includes(`var(${tokenVariable(token)})`)
}

/** Domyślna paleta Tailwind (spoza tokenów): odcienie z numerem, np. „text-green-500”, oraz biel i czerń. */
const PALETTE_CLASS = new RegExp(
  `(?:^|[\\s"'])${COLOR_UTILITY}-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}|white|black)(?:/\\d+)?(?=[\\s"'])`,
  'g',
)

/** Kolory wpisane wprost w znaczniki (poza tokenami): #hex, rgb()/hsl()/oklch(), nazwy kolorów w stylach i atrybutach SVG. */
export function colorsOutsideTokens(markup: string): string[] {
  const found: string[] = []
  found.push(...(markup.match(/(?<!&)#[0-9a-f]{3,8}\b/gi) ?? []))
  found.push(...(markup.match(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi) ?? []))
  found.push(...(markup.match(PALETTE_CLASS) ?? []))
  for (const [, style] of markup.matchAll(/style="([^"]*)"/g)) {
    const declarations = style.match(
      /(?:^|;)\s*(?:color|background|background-color|border-color|fill|stroke|outline-color)\s*:\s*(?!var\(|currentcolor|inherit|transparent|none)[^;]+/gi,
    )
    found.push(...(declarations ?? []))
  }
  found.push(...(markup.match(/\s(?:fill|stroke|color|stop-color)="(?!none"|currentColor"|var\(|url\()[^"]+"/g) ?? []))
  return found
}

/** Składowe [R, G, B, A] koloru zapisanego jako #RRGGBB albo rgb()/rgba() (jak w tokens.test.ts). */
export function channels(color: string): [number, number, number, number] {
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color)
  if (hex) return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16), 1]
  const fn = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(color)
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3]), fn[4] === undefined ? 1 : Number(fn[4])]
  throw new Error(`Nieobsługiwany zapis koloru: ${color}`)
}

/** Tokeny z tabeli sekcji 8 sprzed tej funkcji; trzy tokeny odznak mają być nowe. */
export const SECTION_8_TOKENS: readonly string[] = [
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
]
