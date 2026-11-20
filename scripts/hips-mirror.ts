// Pełna kopia zestawów HiPS NSNS w buforze pośrednika (`HIPS_CACHE_DIR`, domyślnie scripts/.cache/hips-proxy):
// po niej kopuła, kadrowanie i miniatury nie czekają na serwer autora, a pośrednik nie pyta go wcale.
// Użycie: node scripts/hips-mirror.ts [nsns-tc8] [nsns-rgb8] [nsns-ohs8]  (bez argumentów: wszystkie).
// Przerwane uruchomienie można powtórzyć: gotowe kafelki są czytane z dysku.
import { createHipsStore, HIPS_SETS, mirrorSet } from '../server/hipsProxy.ts'

const sets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(HIPS_SETS)
const unknown = sets.filter((s) => !Object.hasOwn(HIPS_SETS, s))
if (unknown.length) {
  console.error(`Nieznane zestawy: ${unknown.join(', ')}. Dostępne: ${Object.keys(HIPS_SETS).join(', ')}`)
  process.exit(1)
}
const store = createHipsStore(process.env)
let failed = 0
for (const set of sets) {
  const start = Date.now()
  console.log(`${set}: ${HIPS_SETS[set].url} → ${store.dir}`)
  const totals = await mirrorSet(store, set, (p) => {
    const at = p.order === 'allsky' ? 'Allsky' : `rząd ${p.order}`
    console.log(`  ${at}: ${p.done}/${p.total} (kafelki ${p.tiles}, brak ${p.missing}, błędy ${p.failed}) · ${Math.round((Date.now() - start) / 1000)} s`)
  })
  console.log(`${set}: ${totals.tiles} kafelków, ${totals.missing} poza pokryciem, ${totals.failed} błędów${totals.failed ? ' — uruchom ponownie' : ' — kopia pełna'}`)
  failed += totals.failed
}
process.exit(failed ? 2 : 0)
