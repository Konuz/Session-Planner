// Kopia zapasowa i pamięć (sekcja 10): eksport i import wszystkich danych użytkownika w JSON, stan pamięci trwałej.
// Import najpierw sprawdza plik i pokazuje, co zawiera; dane zastępuje dopiero po potwierdzeniu, w jednej transakcji.
import { DatabaseBackup, HardDriveDownload, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useState, type ChangeEvent } from 'react'
import { appDb } from '../../data/appDb'
import { backupFileName, backupSummary, backupToFile, readAllTables, readBackupFile, replaceAllTables, type BackupTables } from '../../data/backup'
import { PERSISTENCE_TEXT, persistenceState, requestPersistence, usageText, type PersistenceState } from '../../services/persistentStorage'
import { usePlannerStore } from '../../state/plannerStore'
import { downloadText } from '../../ui/download'

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

interface PendingImport {
  tables: BackupTables
  exportedAtIso: string
}

/** `onRestored`: wywoływane po przywróceniu kopii, żeby formularze innych sekcji wczytały dane od nowa. */
export function BackupSection({ onRestored }: { onRestored?: () => void }) {
  const loadLocations = usePlannerStore((state) => state.loadLocations)
  const [persistence, setPersistence] = useState<PersistenceState | null>(null)
  const [usage, setUsage] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([persistenceState(navigator.storage), usageText(navigator.storage)]).then(([state, text]) => {
      if (!active) return
      setPersistence(state)
      setUsage(text)
    })
    return () => {
      active = false
    }
  }, [])

  const exportBackup = async () => {
    try {
      const nowIso = new Date().toISOString()
      downloadText(backupToFile(await readAllTables(appDb), nowIso), backupFileName(nowIso), 'application/json')
      setMessage({ kind: 'ok', text: 'Kopia zapisana w folderze pobranych plików.' })
    } catch (error) {
      setMessage({ kind: 'error', text: `Nie udało się wykonać kopii: ${errorText(error)}` })
    }
  }

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = readBackupFile(await file.text())
    if ('error' in result) {
      setPending(null)
      setMessage({ kind: 'error', text: result.error })
      return
    }
    setMessage(null)
    setPending(result)
  }

  const restore = async (backup: PendingImport) => {
    try {
      await replaceAllTables(appDb, backup.tables)
      await loadLocations()
      onRestored?.()
      setPending(null)
      setMessage({ kind: 'ok', text: `Przywrócono kopię: ${backupSummary(backup.tables)}.` })
    } catch (error) {
      setPending(null)
      setMessage({ kind: 'error', text: `Nie udało się przywrócić kopii; dane zostały bez zmian (${errorText(error)}).` })
    }
  }

  return (
    <section className="card flex flex-col gap-4 p-4" aria-labelledby="backup-title">
      <h2 id="backup-title" className="font-serif text-xl font-medium text-parchment">
        Kopia zapasowa i pamięć
      </h2>
      <p className="text-sm text-muted">
        Kopia obejmuje lokalizacje z horyzontami, zestawy, własny sprzęt, parametry planowania i projekty z dziennikami.
        Zapisane zdjęcia nieba nie wchodzą do kopii.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="button button-primary" onClick={() => void exportBackup()}>
          <HardDriveDownload aria-hidden size={18} /> Eksportuj kopię (JSON)
        </button>
        <label className="button cursor-pointer focus-within:outline-2 focus-within:outline-accent">
          <Upload aria-hidden size={18} /> Importuj kopię…
          <input type="file" accept=".json,application/json" className="sr-only" onChange={(event) => void chooseFile(event)} />
        </label>
      </div>
      {pending && (
        <div role="alertdialog" aria-label="Przywrócenie kopii" className="flex flex-col gap-3 rounded-lg border border-border p-3 text-sm">
          <p>
            <DatabaseBackup aria-hidden size={18} className="mr-1.5 inline text-accent" />
            Kopia{pending.exportedAtIso ? ` z ${new Date(pending.exportedAtIso).toLocaleString('pl-PL')}` : ''}: {backupSummary(pending.tables)}.
          </p>
          <p className="text-alert">Import zastąpi wszystkie obecne dane aplikacji danymi z kopii.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="button" onClick={() => void restore(pending)}>
              Zastąp dane kopią
            </button>
            <button type="button" className="button" onClick={() => setPending(null)}>
              Anuluj
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className={`text-sm ${message.kind === 'error' ? 'text-alert' : 'text-muted'}`}>
          {message.text}
        </p>
      )}
      <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
        <p className="flex gap-2">
          <ShieldCheck aria-hidden size={18} className="mt-0.5 shrink-0 text-accent" />
          {persistence === null ? 'Sprawdzanie pamięci trwałej…' : PERSISTENCE_TEXT[persistence]}
        </p>
        {usage && <p className="text-muted">{usage}</p>}
        {persistence === 'not-granted' && (
          <button
            type="button"
            className="button self-start"
            onClick={() => void requestPersistence(navigator.storage).then(setPersistence)}
          >
            Poproś o pamięć trwałą
          </button>
        )}
      </div>
    </section>
  )
}
