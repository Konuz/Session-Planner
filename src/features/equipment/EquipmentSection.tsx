// Sekcja „Sprzęt” w Ustawieniach (zakladka-sprzet, kontener): nagłówek h2 „Sprzęt” i podsekcje h3 „Zestawy”,
// „Edycja zestawu: <nazwa>” i „Mój sprzęt”. Łączy stan aplikacji (`plannerStore`) i akcje własnych wpisów
// (`userEquipment.ts`) z komponentami ProfileList, ProfileEditor i OwnEquipmentList.
import { useEffect, useState, type ReactNode } from 'react'
import { appDb } from '../../data/appDb'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from '../../data/equipmentCatalog'
import { useActiveProfile, usePlannerStore } from '../../state/plannerStore'
import type { CameraSpec, EquipmentProfile, TelescopeSpec } from '../../types'
import { cameraEditForm, editedCamera, editedTelescope, telescopeEditForm } from './equipmentSectionModel'
import { OwnEquipmentList, type OwnCameraForm, type OwnEntryForm, type OwnEntryRef, type OwnTelescopeForm } from './OwnEquipmentList'
import { ProfileEditor, type EquipmentKind, type EquipmentMessage } from './ProfileEditor'
import { ProfileList } from './ProfileList'
import { profileToForm, readProfileForm } from './profileForm'
import {
  duplicateCamera,
  duplicateTelescope,
  editUserCamera,
  editUserTelescope,
  equipmentLabel,
  listUserCameras,
  listUserTelescopes,
  removeUserCamera,
  removeUserTelescope,
  saveAsMyCamera,
  saveAsMyTelescope,
} from './userEquipment'

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

interface OwnEntries {
  telescopes: TelescopeSpec[]
  cameras: CameraSpec[]
}

async function loadOwn(): Promise<OwnEntries> {
  const [telescopes, cameras] = await Promise.all([listUserTelescopes(appDb), listUserCameras(appDb)])
  return { telescopes, cameras }
}

export function EquipmentSection(): ReactNode {
  const profiles = usePlannerStore((state) => state.profiles)
  const active = useActiveProfile()
  const selectProfile = usePlannerStore((state) => state.selectProfile)
  const addProfile = usePlannerStore((state) => state.addProfile)
  const duplicateProfile = usePlannerStore((state) => state.duplicateProfile)
  const removeProfile = usePlannerStore((state) => state.removeProfile)

  const [listError, setListError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [editorMessage, setEditorMessage] = useState<EquipmentMessage | null>(null)
  const [own, setOwn] = useState<OwnEntries | null>(null)
  const [editing, setEditing] = useState<OwnEntryRef | null>(null)
  const [editForm, setEditForm] = useState<OwnEntryForm | null>(null)
  const [confirmOwnRemove, setConfirmOwnRemove] = useState<OwnEntryRef | null>(null)
  const [ownMessage, setOwnMessage] = useState<string | null>(null)

  const reload = () => loadOwn().then(setOwn)

  useEffect(() => {
    loadOwn().then(setOwn, (caught: unknown) => setOwnMessage(errorText(caught)))
  }, [])

  const run = async (action: () => Promise<unknown>, prefix: string) => {
    try {
      await action()
      setListError(null)
    } catch (caught) {
      setListError(`${prefix}: ${errorText(caught)}`)
    }
  }

  const ownAction = async (action: () => Promise<unknown>) => {
    try {
      await action()
      setOwnMessage(null)
    } catch (caught) {
      setOwnMessage(errorText(caught))
    }
    await reload().catch(() => undefined)
  }

  const startEdit = (kind: EquipmentKind, id: string) => {
    const spec = kind === 'telescope' ? own?.telescopes.find((entry) => entry.id === id) : own?.cameras.find((entry) => entry.id === id)
    if (!spec) return
    setEditing({ kind, id })
    setEditForm(kind === 'telescope' ? telescopeEditForm(spec as TelescopeSpec) : cameraEditForm(spec as CameraSpec))
  }

  const saveEdit = () =>
    void ownAction(async () => {
      if (!editing || !editForm) return
      if (editing.kind === 'telescope') {
        const spec = own?.telescopes.find((entry) => entry.id === editing.id)
        if (spec) await editUserTelescope(appDb, editedTelescope(spec, editForm as OwnTelescopeForm))
      } else {
        const spec = own?.cameras.find((entry) => entry.id === editing.id)
        if (spec) await editUserCamera(appDb, editedCamera(spec, editForm as OwnCameraForm))
      }
      setEditing(null)
      setEditForm(null)
    })

  const confirmOwn = () =>
    void ownAction(async () => {
      if (!confirmOwnRemove) return
      const { kind, id } = confirmOwnRemove
      setConfirmOwnRemove(null)
      await (kind === 'telescope' ? removeUserTelescope(appDb, id) : removeUserCamera(appDb, id))
      if (editing?.id === id) setEditing(null)
    })

  return (
    <section className="card flex flex-col gap-5 p-4" aria-labelledby="equipment-title">
      <h2 id="equipment-title" className="font-serif text-xl font-medium text-parchment">
        Sprzęt
      </h2>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Zestawy</h3>
        <ProfileList
          profiles={profiles}
          activeId={active.id}
          canRemove={profiles.length > 1}
          confirmRemove={confirmRemove}
          error={listError}
          onSelect={(id) => {
            selectProfile(id)
            setConfirmRemove(false)
            setEditorMessage(null)
          }}
          onAdd={() => void run(addProfile, 'Nie udało się dodać zestawu')}
          onDuplicate={() => void run(() => duplicateProfile(active.id), 'Nie udało się zduplikować zestawu')}
          onRemoveRequest={() => setConfirmRemove(true)}
          onRemoveConfirm={() => {
            setConfirmRemove(false)
            void run(() => removeProfile(active.id), 'Nie udało się usunąć')
          }}
          onRemoveCancel={() => setConfirmRemove(false)}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{`Edycja zestawu: ${active.name}`}</h3>
        {/* Klucz ustawia formularz na nowo po zmianie aktywnego zestawu albo po zapisie. */}
        <ActiveProfileEditor
          key={`${active.id}:${JSON.stringify(active)}`}
          saved={active}
          own={own}
          message={editorMessage}
          onMessage={setEditorMessage}
          onOwnChanged={() => void reload().catch(() => undefined)}
          onOwnError={setOwnMessage}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Mój sprzęt</h3>
        <OwnEquipmentList
          telescopes={own?.telescopes ?? null}
          cameras={own?.cameras ?? null}
          editing={editing}
          editForm={editForm}
          confirmRemove={confirmOwnRemove}
          message={ownMessage}
          onEdit={startEdit}
          onEditChange={setEditForm}
          onEditSave={saveEdit}
          onEditCancel={() => {
            setEditing(null)
            setEditForm(null)
          }}
          onRemoveRequest={(kind, id) => setConfirmOwnRemove({ kind, id })}
          onRemoveConfirm={confirmOwn}
          onRemoveCancel={() => setConfirmOwnRemove(null)}
        />
      </section>
    </section>
  )
}

function ActiveProfileEditor({
  saved,
  own,
  message,
  onMessage,
  onOwnChanged,
  onOwnError,
}: {
  saved: EquipmentProfile
  own: OwnEntries | null
  message: EquipmentMessage | null
  onMessage: (message: EquipmentMessage | null) => void
  onOwnChanged: () => void
  onOwnError: (message: string | null) => void
}) {
  const saveProfile = usePlannerStore((state) => state.saveProfile)
  const seeingArcsec = usePlannerStore((state) => state.planningSettings.seeingArcsec)
  const [form, setForm] = useState(() => profileToForm(saved))
  const [telescopeQuery, setTelescopeQuery] = useState('')
  const [cameraQuery, setCameraQuery] = useState('')

  const save = async () => {
    const { profile } = readProfileForm(form)
    if (!profile) return
    try {
      await saveProfile(profile)
      onMessage({ kind: 'saved', text: 'Zapisano zestaw.' })
    } catch (caught) {
      onMessage({ kind: 'error', text: `Nie udało się zapisać: ${errorText(caught)}` })
    }
  }

  const saveEntry = async (kind: EquipmentKind) => {
    try {
      const result = kind === 'telescope' ? await saveAsMyTelescope(appDb, form) : await saveAsMyCamera(appDb, form)
      setForm(result.form)
      const what = kind === 'telescope' ? 'mój teleskop' : 'moją kamerę'
      onMessage({ kind: 'saved', text: `Zapisano „${equipmentLabel(result.spec)}” jako ${what}.` })
      onOwnChanged()
    } catch (caught) {
      onMessage({ kind: 'error', text: `Nie udało się zapisać wpisu: ${errorText(caught)}` })
    }
  }

  const duplicate = async (kind: EquipmentKind, id: string) => {
    try {
      await (kind === 'telescope' ? duplicateTelescope(appDb, id) : duplicateCamera(appDb, id))
      onOwnError(null)
    } catch (caught) {
      onOwnError(errorText(caught))
    }
    onOwnChanged()
  }

  return (
    <ProfileEditor
      form={form}
      saved={saved}
      telescopes={[...BUILTIN_TELESCOPES, ...(own?.telescopes ?? [])]}
      cameras={[...BUILTIN_CAMERAS, ...(own?.cameras ?? [])]}
      seeingArcsec={seeingArcsec}
      telescopeQuery={telescopeQuery}
      cameraQuery={cameraQuery}
      message={message}
      onFormChange={(next) => {
        setForm(next)
        onMessage(null)
      }}
      onQueryChange={(kind, query) => (kind === 'telescope' ? setTelescopeQuery(query) : setCameraQuery(query))}
      onSave={() => void save()}
      onDiscard={() => {
        setForm(profileToForm(saved))
        onMessage(null)
      }}
      onSaveTelescope={() => void saveEntry('telescope')}
      onSaveCamera={() => void saveEntry('camera')}
      onDuplicateBuiltin={(kind, id) => void duplicate(kind, id)}
    />
  )
}
