// Ekran „Źródła i licencje” (sekcja 10). Lista katalogów VizieR i cytowanie Tycho-2 pochodzą z catalog/meta.json
// (pobieranego w efekcie, zapisanego wstępnie przez service worker), pełne teksty licencji krojów z repozytorium.
import { ExternalLink, Scale } from 'lucide-react'
import { useEffect, useState } from 'react'
import atkinsonLicense from '../../assets/fonts/OFL-AtkinsonHyperlegibleNext.txt?raw'
import garamondLicense from '../../assets/fonts/OFL-EBGaramond.txt?raw'
import { licenseGroups, readCatalogMeta, type CatalogMeta, type LicenseEntry } from './licensesModel'

const LICENSE_TEXTS: Record<NonNullable<LicenseEntry['licenseText']>, string> = {
  atkinson: atkinsonLicense,
  garamond: garamondLicense,
}

export function LicensesSection() {
  // undefined = wczytywanie, null = nie udało się wczytać meta.json.
  const [meta, setMeta] = useState<CatalogMeta | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    fetch(`${import.meta.env.BASE_URL}catalog/meta.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (raw: unknown) => {
          if (active) setMeta(readCatalogMeta(raw))
        },
        () => {
          if (active) setMeta(null)
        },
      )
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="card flex flex-col gap-4 p-4" aria-labelledby="licenses-title">
      <h2 id="licenses-title" className="flex items-center gap-2 font-serif text-xl font-medium text-parchment">
        <Scale aria-hidden size={20} className="text-accent" /> Źródła i licencje
      </h2>
      <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
        {licenseGroups(meta ?? null).map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{group.title}</h3>
            <ul className="flex flex-col divide-y divide-border">
              {group.entries.map((entry) => (
                <li key={entry.name} className="flex flex-col gap-0.5 py-2 text-sm">
                  {entry.url ? (
                    <a href={entry.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 self-start font-semibold underline-offset-4 hover:underline">
                      {entry.name}
                      <ExternalLink aria-hidden size={14} className="text-muted" />
                    </a>
                  ) : (
                    <span className="flex min-h-11 items-center font-semibold">{entry.name}</span>
                  )}
                  <span className="text-parchment">{entry.license}</span>
                  {entry.detail && <span className="text-xs text-muted">{entry.detail}</span>}
                  {entry.licenseText && (
                    <details className="text-xs">
                      <summary className="flex min-h-11 cursor-pointer items-center text-muted">Pełny tekst licencji</summary>
                      <pre className="max-h-64 overflow-auto rounded-md border border-border p-3 font-sans whitespace-pre-wrap">
                        {LICENSE_TEXTS[entry.licenseText]}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {meta === undefined && <p className="text-xs text-muted">Wczytywanie listy katalogów…</p>}
    </section>
  )
}
