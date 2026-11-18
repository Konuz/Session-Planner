import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { beforeEach, expect, it, vi } from 'vitest'
import { photoApi } from '../../server/photo.ts'
import { magnitudeLimit } from '../../server/photoStars.ts'

// Atrapa mostu Skyshota: pole o środku (83,8; −5,4) i promieniu 0,5°, rzut liniowy 3600 px/°.
const bridge = vi.hoisted(() => vi.fn(async (_binary: string, args: string[]) => {
  const { stars } = JSON.parse(readFileSync(args[1], 'utf8')) as { stars: [number, number][] }
  const pixels = stars.map(([ra, dec]) => [(ra - 83.8) * 3600 + 500, (dec + 5.4) * 3600 + 500])
  return { stdout: JSON.stringify({ raDeg: 83.8, decDeg: -5.4, radiusDeg: field.radius, pixels }), stderr: '' }
}))
const field = vi.hoisted(() => ({ radius: 0.5 }))
vi.mock('node:child_process', () => ({
  execFile: Object.assign(() => {}, { [Symbol.for('nodejs.util.promisify.custom')]: bridge }),
}))
vi.mock('node:fs/promises', async (original) => {
  const fs = await original<typeof import('node:fs/promises')>()
  return { ...fs, access: vi.fn(async () => undefined) }
})
beforeEach(() => { bridge.mockClear(); field.radius = 0.5 })

const header = 'source_id,ra,dec,pmra,pmdec,phot_g_mean_mag,phot_bp_mean_mag,phot_rp_mean_mag,parallax,parallax_error,r_med_geo,r_lo_geo,r_hi_geo'
const csv = (...rows: string[]) => [header, ...rows].join('\r\n')
let wcsId = 0

async function post(body: unknown, fetchImpl: typeof fetch, contentType = 'application/json') {
  const server = createServer((req, res) => { void photoApi(req, res, {}, fetchImpl) })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/photo/stars`, { method: 'POST', headers: { 'Content-Type': contentType }, body: typeof body === 'string' ? body : JSON.stringify(body) })
    return { status: response.status, data: await response.json() }
  } finally { await new Promise<void>((r) => server.close(() => r())) }
}
// Każdy test ma inny WCS, bo serwer buforuje udane odpowiedzi według WCS.
const request = () => ({ wcs: { ra: 83.8, dec: -5.4, test: ++wcsId }, width: 1000, height: 1000 })

it('pyta GAVO stożkiem pola, zachowuje gwiazdy bez wiarygodnej paralaksy i rzutuje je przez most', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(csv(
    // θ¹ Ori C: Bailer-Jones 393 pc (373–412), ϖ/σ ≈ 18.
    '3017364063330718080,83.81861966,-5.38969608,1.0,2.0,4.96,4.79,4.62,2.5014,0.1352,393.43,373.59,411.63',
    // Słaba paralaksa (ϖ/σ = 2): odległość z priorytetu, więc bez odległości.
    '2,83.81,-5.39,,,12.5,13.1,11.9,1.0,0.5,900,600,1500',
    // Ujemna paralaksa i brak rozwiązania (pusta odległość).
    '3,83.79,-5.41,,,13.2,,,-0.4,0.1,,,',
    '4,83.80,-5.40,,,14.0,14.5,13.4,,,,,',
    // Poza kadrem 1000 × 1000 px.
    '5,83.95,-5.40,,,9.0,9.5,8.5,3.0,0.1,330,320,340',
  )))
  const { status, data } = await post(request(), fetchImpl)
  expect(status).toBe(200)
  const query = new URL(String(fetchImpl.mock.calls[0][0])).searchParams.get('QUERY')!
  expect(query).toContain("CIRCLE('ICRS', 83.800000, -5.400000, 0.500000)")
  expect(query).toContain('LEFT OUTER JOIN gedr3dist.main')
  expect(query).toMatch(/TOP 4000 .* ORDER BY g\.phot_g_mean_mag$/)
  expect(data.stars.map((s: { id: string }) => s.id)).toEqual(['Gaia DR3 3017364063330718080', 'Gaia DR3 2', 'Gaia DR3 3', 'Gaia DR3 4'])
  const [theta, weak, negative, none] = data.stars
  expect(theta.distLy).toBeCloseTo(393.43 * 3.26156)
  expect(theta.distLoLy).toBeCloseTo(373.59 * 3.26156)
  expect(theta.distHiLy).toBeCloseTo(411.63 * 3.26156)
  expect(theta.bpRp).toBeCloseTo(0.17)
  // Ruch własny przeniesiony na epokę 2025,0: Δδ = 2 mas/rok × 9 lat.
  expect(theta.decDeg).toBeCloseTo(-5.38969608 + 18 / 3.6e6, 9)
  expect(theta.x).toBeCloseTo((theta.raDeg - 83.8) * 3600 + 500, 6)
  expect(weak).toMatchObject({ distLy: null, distLoLy: null, parallaxOverError: 2 })
  expect(negative).toMatchObject({ distLy: null, parallaxMas: -0.4 })
  expect(none).toMatchObject({ distLy: null, parallaxMas: null, parallaxOverError: null })
  expect(negative.bpRp).toBeNull()
  // Pierwsze wywołanie: samo pole; drugie: rzut kandydatów (G < 18 dla pola 0,5°, bez drugiego zapytania).
  expect(bridge).toHaveBeenCalledTimes(2)
  expect(bridge.mock.calls[0][1][0]).toBe('project')
})

it('w rzadkim polu robi jedno głębsze zapytanie, a udany wynik buforuje', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(csv('7,83.8,-5.4,,,10,10.5,9.5,5,0.1,200,195,205')))
  field.radius = 2
  const body = request()
  const first = await post(body, fetchImpl)
  expect(first.status).toBe(200)
  expect(fetchImpl).toHaveBeenCalledTimes(2)
  const limits = fetchImpl.mock.calls.map(([url]) => Number(new URL(String(url)).searchParams.get('QUERY')!.match(/phot_g_mean_mag < ([\d.]+)/)![1]))
  expect(limits[1]).toBeCloseTo(Math.min(19, limits[0] + 2))
  expect(first.data.magLimit).toBe(limits[1])
  const second = await post(body, fetchImpl)
  expect(second.data).toEqual(first.data)
  expect(fetchImpl).toHaveBeenCalledTimes(2)
})

it('po przekroczeniu limitu GAVO pobiera gwiazdy z lustra i dopasowuje odległości po pełnych identyfikatorach', async () => {
  const thetaId = '3017364063330718080'
  const otherId = '3017364063330718081'
  const fetchImpl = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response('Field query: Query timed out', { status: 500 }))
    .mockResolvedValueOnce(new Response([
      header.split(',').slice(0, 10).join(','),
      `${thetaId},83.81861966,-5.38969608,1.0,2.0,4.96,4.79,4.62,2.5014,0.1352`,
      `${otherId},83.80,-5.40,,,14.0,14.5,13.4,,`,
    ].join('\r\n')))
    .mockResolvedValueOnce(new Response(`source_id,r_med_geo,r_lo_geo,r_hi_geo\r\n${thetaId},393.43,373.59,411.63`))
  const { status, data } = await post(request(), fetchImpl)
  expect(status).toBe(200)
  expect(fetchImpl).toHaveBeenCalledTimes(3)
  const mirror = new URL(String(fetchImpl.mock.calls[1][0]))
  expect(mirror.hostname).toBe('data.xao.ac.cn')
  expect(mirror.searchParams.get('QUERY')).toContain("CIRCLE('ICRS', 83.800000, -5.400000, 0.500000)")
  const [url, options] = fetchImpl.mock.calls[2]
  expect(new URL(String(url)).hostname).toBe('dc.zah.uni-heidelberg.de')
  expect(options?.method).toBe('POST')
  expect((options?.body as URLSearchParams).get('QUERY')).toContain(thetaId)
  expect(data.stars.map((star: { id: string }) => star.id)).toEqual([`Gaia DR3 ${thetaId}`, `Gaia DR3 ${otherId}`])
  expect(data.stars[0].distLy).toBeCloseTo(393.43 * 3.26156)
  expect(data.stars[1].distLy).toBeNull()
})

it('po awarii bazy GAVO pobiera gwiazdy z XAO i odległości z archiwum ESA', async () => {
  const id = '3017364063330718080'
  const fetchImpl = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response('<INFO name="QUERY_STATUS" value="ERROR">Database unavailable</INFO>'))
    .mockResolvedValueOnce(new Response(`${header.split(',').slice(0, 10).join(',')}\n${id},83.81,-5.39,,,5,5,5,2.5,0.1`))
    .mockRejectedValueOnce(new TypeError('fetch failed'))
    .mockResolvedValueOnce(new Response(`source_id,r_med_geo,r_lo_geo,r_hi_geo\n${id},393.43,373.59,411.63`))

  const { status, data } = await post(request(), fetchImpl)
  expect(status).toBe(200)
  expect(fetchImpl.mock.calls.map(([url]) => new URL(String(url)).hostname)).toEqual([
    'dc.zah.uni-heidelberg.de', 'data.xao.ac.cn', 'dc.zah.uni-heidelberg.de', 'gea.esac.esa.int',
  ])
  expect((fetchImpl.mock.calls[3][1]?.body as URLSearchParams).get('QUERY')).toContain(`external.gaiaedr3_distance WHERE source_id IN (${id})`)
  expect(data.stars[0].id).toBe(`Gaia DR3 ${id}`)
  expect(data.stars[0].distLy).toBeCloseTo(393.43 * 3.26156)
})

it('gdy GAVO i XAO są niedostępne, wyszukuje gwiazdy i odległości w ESA', async () => {
  const id = '3017364063330718080'
  const fetchImpl = vi.fn<typeof fetch>()
    .mockRejectedValueOnce(new TypeError('fetch failed'))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(`${header.split(',').slice(0, 10).join(',')}\n${id},83.81,-5.39,,,5,5,5,2.5,0.1`))
    .mockResolvedValueOnce(new Response(`source_id,r_med_geo,r_lo_geo,r_hi_geo\n${id},393.43,373.59,411.63`))

  const { status, data } = await post(request(), fetchImpl)
  expect(status).toBe(200)
  const url = new URL(String(fetchImpl.mock.calls[2][0]))
  expect(url.hostname).toBe('gea.esac.esa.int')
  expect(url.searchParams.get('QUERY')).toContain('FROM gaiadr3.gaia_source AS g')
  expect(new URL(String(fetchImpl.mock.calls[3][0])).hostname).toBe('gea.esac.esa.int')
  expect(data.stars[0].distLy).toBeCloseTo(393.43 * 3.26156)
})

it('zachowuje gwiazdy i granicę jasności z udanego zapytania, gdy głębsze wyszukiwanie zawiedzie', async () => {
  field.radius = 2
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(csv('7,83.8,-5.4,,,10,10.5,9.5,5,0.1,200,195,205')))

  const { status, data } = await post(request(), fetchImpl)
  expect(status).toBe(200)
  expect(data.stars.map((star: { id: string }) => star.id)).toEqual(['Gaia DR3 7'])
  expect(data.magLimit).toBe(magnitudeLimit(2))
})

it('po przekroczeniu czasu w gęstym polu pobiera jaśniejsze gwiazdy z archiwum zapasowego', async () => {
  const id = '3017364063330718080'
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockRejectedValueOnce(new DOMException('Limit czasu', 'TimeoutError'))
    .mockRejectedValueOnce(new DOMException('Limit czasu', 'TimeoutError'))
    .mockResolvedValueOnce(new Response(`${header.split(',').slice(0, 10).join(',')}\n${id},83.81,-5.39,,,5,5,5,2.5,0.1`))
    .mockResolvedValueOnce(new Response(`source_id,r_med_geo,r_lo_geo,r_hi_geo\n${id},393.43,373.59,411.63`))

  const { status, data } = await post(request(), fetchImpl)
  expect(status).toBe(200)
  expect(data.magLimit).toBe(14)
  const retry = new URL(String(fetchImpl.mock.calls[3][0]))
  expect(retry.hostname).toBe('gea.esac.esa.int')
  expect(retry.searchParams.get('QUERY')).toContain('phot_g_mean_mag < 14')
  expect(data.stars[0].id).toBe(`Gaia DR3 ${id}`)
  expect(data.stars[0].distLy).toBeCloseTo(393.43 * 3.26156)
  expect(fetchImpl).toHaveBeenCalledTimes(5)
})

it('odróżnia awarię GAVO, zbyt rozległe pole i niepoprawne zapytania', async () => {
  const failing = vi.fn<typeof fetch>(async () => new Response('', { status: 503 }))
  expect((await post(request(), failing)).status).toBe(502)
  field.radius = 12
  const wide = await post(request(), failing)
  expect(wide.status).toBe(422)
  expect(wide.data.error).toContain('zbyt rozległe')
  expect((await post(request(), failing, 'text/plain')).status).toBe(415)
  expect((await post('{', failing)).status).toBe(400)
  expect((await post({ wcs: {}, width: 0, height: 10 }, failing)).status).toBe(400)
  expect(failing).toHaveBeenCalledTimes(3)
})

it('granica jasności maleje z polem i ma rozsądne krańce', () => {
  expect(magnitudeLimit(0.05)).toBe(18)
  expect(magnitudeLimit(0.7)).toBeGreaterThan(magnitudeLimit(2))
  expect(magnitudeLimit(2)).toBeGreaterThan(magnitudeLimit(8))
  expect(magnitudeLimit(10)).toBeGreaterThanOrEqual(10)
})
