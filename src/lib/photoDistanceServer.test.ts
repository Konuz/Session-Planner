import { createServer } from 'node:http'
import { expect, it, vi } from 'vitest'
import { photoApi } from '../../server/photo.ts'

const simbad = (data: unknown[][]) => JSON.stringify({ metadata: ['dist', 'unit', 'minus_err', 'plus_err', 'method', 'bibcode', 'qual'].map((name) => ({ name })), data })
const ned = (rows: string, available = 2) => `<?xml version="1.0"?><VOTABLE><RESOURCE><TABLE ID="distances"><GROUP><PARAM name="QUERY_STATUS" value="OK"/><PARAM name="RECORDS_AVAILABLE" value="${available}"/><PARAM name="RECORDS_RETURNED" value="2"/></GROUP><FIELD ID="row" name="No."/><FIELD ID="dist_mod_err" name="err(m-M)"/><FIELD ID="distance" name="Distance" unit="Mpc"/><FIELD ID="method" name="Method"/><FIELD ID="refcode" name="Reference"/><FIELD ID="notes" name="Notes"/><DATA><TABLEDATA>${rows}</TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`

async function request(id: string, fetchImpl: typeof fetch) {
  const server = createServer((req, res) => { void photoApi(req, res, {}, fetchImpl) })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/photo/distances?id=${encodeURIComponent(id)}`)
    return { status: response.status, data: await response.json() }
  } finally { await new Promise<void>((r) => server.close(() => r())) }
}

it('przelicza jednostki SIMBAD, zachowuje publikację i odrzuca granice oraz puste pomiary', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(simbad([
    [400, 'pc ', -20, 20, 'paral ', '2020A&A...633A..51Z', null],
    [0.4, 'kpc', null, null, null, '2021A&A...000A...1A', null],
    [0.0004, 'Mpc', -0.00001, 0.00002, 'dust', '2022A&A...000A...1A', null],
    [0.4, 'kpc', -0.02, 0.02, null, '2023A&A...000A...1A', '>'],
    [null, 'pc', null, null, null, '2024A&A...000A...1A', null],
    [500, 'unknown', null, null, null, '2025A&A...000A...1A', null],
  ])))
  const { status, data } = await request('B 33', fetchImpl)
  expect(status).toBe(200)
  const values = data.measurements.filter((m: { source: string }) => m.source === 'SIMBAD')
  expect(values).toHaveLength(3)
  expect(values.every((m: { distLy: number }) => Math.abs(m.distLy - 1304.624) < 0.001)).toBe(true)
  const symmetric = values.find((m: { distanceSource: string }) => m.distanceSource.includes('2020A&A'))
  expect(symmetric.uncertaintyLy).toBeCloseTo(65.2312)
  expect(symmetric.url).toContain('2020A%26A...633A..51Z')
  expect(values.find((m: { distanceSource: string }) => m.distanceSource.includes('2021A&A')).uncertaintyLy).toBeNull()
  expect(values.find((m: { distanceSource: string }) => m.distanceSource.includes('2022A&A')).uncertaintyLy).toBeNull()
  expect(data.warnings).toEqual([])
  expect(fetchImpl).toHaveBeenCalledTimes(1)
  const query = new URL(String(fetchImpl.mock.calls[0][0])).searchParams.get('query')
  expect(query).toContain("i.id = 'B 33'")
})

it('odczytuje NED TABLEDATA według identyfikatorów pól, także puste komórki i encje XML', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async (url) => String(url).includes('simbad')
    ? new Response(simbad([]))
    : new Response(ned('<TR><TD>1</TD><TD>0.11</TD><TD>6.19</TD><TD>Cepheids</TD><TD>2013ApJ...777...79M</TD><TD>V &amp; I</TD></TR><TR><TD>2</TD><TD/><TD>6.43</TD><TD>TRGB</TD><TD>2024A&amp;A...000A...1A</TD><TD/></TR>')))
  const { status, data } = await request('M 101', fetchImpl)
  expect(status).toBe(200)
  const values = data.measurements.filter((m: { source: string }) => m.source === 'NED')
  expect(values).toHaveLength(2)
  expect(values[0].distLy).toBeCloseTo(6.43 * 3.26156e6)
  expect(values[0].distanceSource).toContain('2024A&A')
  expect(values[0].uncertaintyLy).toBeNull()
  expect(values[1].distanceSource).toContain('0.11 mag')
  expect(data.warnings).toEqual([])
  expect(fetchImpl).toHaveBeenCalledTimes(2)
})

it('nie myli awarii źródła z brakiem danych i nadal udostępnia wyniki drugiej usługi', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async (url) => String(url).includes('simbad')
    ? new Response('unavailable', { status: 503 })
    : new Response(ned('<TR><TD>1</TD><TD/><TD>6.19</TD><TD>TRGB</TD><TD>2024ApJ...000...1A</TD><TD/></TR>')))
  const { status, data } = await request('M 101', fetchImpl)
  expect(status).toBe(200)
  expect(data.measurements.some((m: { source: string }) => m.source === 'NED')).toBe(true)
  expect(data.warnings.join(' ')).toContain('SIMBAD')
})

it('rozpoznaje błąd zapytania i obciętą listę NED', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async (url) => String(url).includes('simbad')
    ? new Response('{}')
    : new Response(ned('<TR><TD>1</TD><TD/><TD>6.19</TD><TD>TRGB</TD><TD>2024ApJ...000...1A</TD><TD/></TR>', 2000)))
  const { data } = await request('M 101', fetchImpl)
  expect(data.warnings.join(' ')).toContain('SIMBAD')
  expect(data.warnings.join(' ')).toContain('NED')
})

it('odrzuca nieznane oznaczenia i adresy bez wysyłania zewnętrznych zapytań', async () => {
  const fetchImpl = vi.fn<typeof fetch>()
  expect((await request("M 101' OR 1=1", fetchImpl)).status).toBe(404)
  expect((await request('https://other.example', fetchImpl)).status).toBe(404)
  expect(fetchImpl).not.toHaveBeenCalled()
})

it('poprawna pusta tabela oznacza brak pomiarów, a nie awarię źródła', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async (url) => new Response(String(url).includes('simbad') ? simbad([]) : ned('', 0)))
  const { status, data } = await request('M 101', fetchImpl)
  expect(status).toBe(200)
  expect(data.measurements.filter((m: { source: string }) => m.source !== 'Wikidata')).toEqual([])
  expect(data.warnings).toEqual([])
})

it('nie interpretuje błędu usługi NED ani deklaracji encji jako danych', async () => {
  for (const xml of [
    '<VOTABLE><RESOURCE><INFO name="QUERY_STATUS" value="ERROR">Bad target</INFO></RESOURCE></VOTABLE>',
    '<!DOCTYPE VOTABLE [<!ENTITY a "data">]>' + ned(''),
  ]) {
    const fetchImpl = vi.fn<typeof fetch>(async (url) => new Response(String(url).includes('simbad') ? simbad([]) : xml))
    const { data } = await request('M 101', fetchImpl)
    expect(data.warnings.join(' ')).toContain('NED')
  }
})

it.each(['SIMBAD', 'NED'] as const)('odrzuca za dużą odpowiedź %s bez nagłówka rozmiaru i zachowuje drugie źródło', async (source) => {
  const cancel = vi.fn()
  const payload = new TextEncoder().encode(source === 'SIMBAD' ? simbad([]) : ned('', 0))
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(payload)
      controller.enqueue(new Uint8Array(8 * 1024 * 1024).fill(32))
      controller.enqueue(Uint8Array.of(32))
      controller.close()
    },
    cancel,
  })
  const fetchImpl = vi.fn<typeof fetch>(async (url) => {
    const isSimbad = String(url).includes('simbad')
    if (isSimbad === (source === 'SIMBAD')) return new Response(stream)
    return new Response(isSimbad
      ? simbad([[6, 'Mpc', null, null, null, '2024A&A...000A...1A', null]])
      : ned('<TR><TD>1</TD><TD/><TD>6.19</TD><TD>TRGB</TD><TD>2024ApJ...000...1A</TD><TD/></TR>'))
  })
  const { status, data } = await request('M 101', fetchImpl)
  expect(status).toBe(200)
  expect(data.measurements.some((m: { source: string }) => m.source === (source === 'SIMBAD' ? 'NED' : 'SIMBAD'))).toBe(true)
  expect(data.warnings.join(' ')).toContain(source)
  expect(cancel).toHaveBeenCalledTimes(1)
})
