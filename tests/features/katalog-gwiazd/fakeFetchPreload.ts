// Ładowany przez `node --import` przed scripts/build-stars.ts w testach katalog-gwiazd: podmienia globalny `fetch`.
// Ustawienia w pliku JSON wskazanym przez zmienną KATALOG_GWIAZD_FAKE (typ `FakeTapConfig` z helpers.ts).
// Każde żądanie jest dopisywane jako linia JSON (`LoggedRequest`) do `logFile`.
// Tryby:
// - 'offline': każde żądanie kończy się błędem sieci (sprawdzenie, że skrypt nie używa sieci);
// - 'simulator': zapytania ADQL wykonuje tapSimulator.ts na prawdziwych wierszach VizieR z vizierRows.ts;
// - 'fixed': dla każdej tabeli z `fixed` odpowiedź danych ma `rows` wierszy `ra,dec,bt,vt`, a COUNT podaje `count`
//   (symulacja obciętej odpowiedzi, P5).
import { appendFileSync, readFileSync } from 'node:fs'
import { runAdql } from './tapSimulator.ts'
import { TAP_TABLES } from './vizierRows.ts'

const TAP_SYNC = 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync'

interface Config {
  mode: 'offline' | 'simulator' | 'fixed'
  logFile: string
  fixed?: Record<string, { rows: number; count: number }>
}

const configPath = process.env.KATALOG_GWIAZD_FAKE
if (!configPath) throw new Error('KATALOG_GWIAZD_FAKE nie jest ustawione')
const config = JSON.parse(readFileSync(configPath, 'utf8')) as Config

function paramOf(params: URLSearchParams | FormData, name: string): string | null {
  for (const [key, value] of params.entries()) {
    if (key.toUpperCase() === name && typeof value === 'string') return value
  }
  return null
}

async function queryOf(url: URL, method: string, body: unknown): Promise<string | null> {
  const fromUrl = paramOf(url.searchParams, 'QUERY')
  if (fromUrl !== null) return fromUrl
  if (method === 'GET' || body === undefined || body === null) return null
  if (typeof body === 'string') return paramOf(new URLSearchParams(body), 'QUERY')
  if (body instanceof URLSearchParams || body instanceof FormData) return paramOf(body, 'QUERY')
  if (body instanceof Uint8Array || body instanceof ArrayBuffer) {
    return paramOf(new URLSearchParams(new TextDecoder().decode(body)), 'QUERY')
  }
  if (body instanceof Blob) return paramOf(new URLSearchParams(await body.text()), 'QUERY')
  return null
}

function tableOf(query: string): string | null {
  if (query.includes('I/259/suppl_1')) return 'I/259/suppl_1'
  if (query.includes('I/259/tyc2')) return 'I/259/tyc2'
  return null
}

function fixedRows(count: number): string {
  const lines = ['ra,dec,bt,vt']
  for (let i = 0; i < count; i++) lines.push(`${((i * 0.137) % 360).toFixed(5)},${((i % 170) - 85).toFixed(5)},9.50,9.00`)
  return lines.join('\n') + '\n'
}

async function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const request = input instanceof Request ? input : null
  const url = new URL(input instanceof Request ? input.url : input instanceof URL ? input.href : input)
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase()
  const headers = new Headers(init?.headers ?? request?.headers)
  const body: unknown = init?.body ?? (request && method !== 'GET' ? await request.text() : undefined)
  const query = await queryOf(url, method, body)
  const entry = {
    url: url.href,
    method,
    userAgent: headers.get('user-agent'),
    query,
    status: 0,
    isCount: query !== null && /\bCOUNT\s*\(/i.test(query),
    table: query === null ? null : tableOf(query),
    recnos: [] as number[],
    error: null as string | null,
  }
  const log = () => appendFileSync(config.logFile, JSON.stringify(entry) + '\n')
  if (config.mode === 'offline') {
    entry.error = 'sieć wyłączona w teście'
    log()
    throw new TypeError('fetch failed (test: sieć wyłączona)')
  }
  const reply = (status: number, text: string) => {
    entry.status = status
    log()
    return new Response(text, { status, headers: { 'content-type': status === 200 ? 'text/csv' : 'text/plain' } })
  }
  if (!url.href.startsWith(TAP_SYNC)) return reply(404, `nieznany adres: ${url.href}`)
  if (query === null) return reply(400, 'brak parametru QUERY')
  if (config.mode === 'fixed') {
    const spec = entry.table === null ? undefined : config.fixed?.[entry.table]
    if (!spec) return reply(400, `nieznana tabela w zapytaniu: ${query}`)
    return reply(200, entry.isCount ? `COUNT_ALL\n${spec.count}\n` : fixedRows(spec.rows))
  }
  try {
    const result = runAdql(query, TAP_TABLES)
    entry.recnos = result.recnos
    return reply(200, result.csv)
  } catch (error) {
    entry.error = error instanceof Error ? error.message : String(error)
    return reply(400, `<VOTABLE><INFO name="QUERY_STATUS" value="ERROR">${entry.error}</INFO></VOTABLE>`)
  }
}

globalThis.fetch = fakeFetch
