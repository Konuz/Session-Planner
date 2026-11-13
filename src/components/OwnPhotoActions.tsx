import { useEffect, useRef, useState } from 'react'
import type { OwnPhotoSolved } from '../lib/ownPhoto'
import { deleteOwnPhoto, recordFromSolved, writeOwnPhoto } from '../lib/ownPhotoStorage'
import { useStore } from '../state/store'

const SOLVER_MISSING = 'Wymaga lokalnego solvera Skyshot (npm run setup:skyshot)'

/** Dodawanie, zmiana i usuwanie własnego zdjęcia obiektu; zdjęcie od razu idzie do solvera. */
export function OwnPhotoActions({ objectId }: { objectId: string }) {
  const own = useStore((s) => s.ownPhotos[objectId])
  const setOwnPhoto = useStore((s) => s.setOwnPhoto)
  const removeOwnPhoto = useStore((s) => s.removeOwnPhoto)
  const input = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [ready, setReady] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const abort = new AbortController()
    void fetch('/api/photo/status', { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((status) => setReady(status?.ready === true))
      .catch(() => { if (!abort.signal.aborted) setReady(false) })
    // Zamknięcie szczegółów przerywa także trwające rozwiązywanie.
    return () => { abort.abort(); abortRef.current?.abort() }
  }, [])

  async function upload(file: File) {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/photo/solve?object=${encodeURIComponent(objectId)}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Photo-Name': encodeURIComponent(file.name) },
        body: file,
        signal: abort.signal,
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error ?? 'Nie udało się wczytać zdjęcia.')
      const record = await recordFromSolved(result as OwnPhotoSolved)
      // Nowszy wybór pliku przerwał to wgrywanie: spóźniony wynik nie może nadpisać nowszego zdjęcia (C20).
      if (abort.signal.aborted) return
      await writeOwnPhoto(record)
      if (abort.signal.aborted) return
      setOwnPhoto(record.objectId, record.photoId)
    } catch (e) {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Nie udało się wczytać zdjęcia.')
    } finally {
      if (abortRef.current === abort) setBusy(false)
    }
  }

  async function remove() {
    setError('')
    try {
      await deleteOwnPhoto(objectId)
      removeOwnPhoto(objectId)
    } catch { setError('Nie udało się usunąć zdjęcia.') }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,image/tiff,.fits,.fit,.fts"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void upload(file)
        }}
      />
      <button className="button" disabled={busy || ready === false} title={ready === false ? SOLVER_MISSING : undefined} onClick={() => input.current?.click()}>
        {busy ? 'Rozwiązywanie…' : own ? 'Zmień moje zdjęcie' : 'Dodaj moje zdjęcie'}
      </button>
      {own && <button className="button" disabled={busy} onClick={() => void remove()}>Usuń moje zdjęcie</button>}
      {error && <span role="alert" style={{ color: 'var(--warn)', fontSize: 11, flexBasis: '100%' }}>{error}</span>}
    </>
  )
}
