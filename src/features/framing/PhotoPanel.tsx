// Panel warstwy zdjęcia pod widokiem kadru (zdjecie-w-kadrze); komponent tylko renderuje `PhotoLayerView`.
//
// Znaczniki, których spec nie podaje (wybrane przez test-author):
// - lista źródeł: `<select>` z opcjami `<option value={choice.value}>{choice.label}</option>` z `view.sourceOptions`,
//   `value={view.source}`; zmiana → `onChooseSource(event.target.value)`;
// - lista warstw: `<select>` z `view.layerOptions`, `value={view.layer}`; zmiana → `onChooseLayer(event.target.value)`;
// - teksty: `view.caption`, `view.loadingText`, `view.missing.message` i każda linia `view.missing.attempts`,
//   `view.saveMessage`, każda linia `view.licenses`;
// - przycisk „Spróbuj ponownie” (`<button>`, tylko przy `view.missing`) → `onRetry()`;
// - przycisk offline (`<button>`, tylko przy `view.offline`) z tekstem `view.offline.label`, `disabled` przy
//   `view.offline.disabled` → `onSaveOffline()`.
import { useId, type ReactElement } from 'react'
import type { SkyImageLayerId } from '../../services/skyImage/sources'
import type { PhotoLayerView, SourceChoice } from './photoModel'

export interface PhotoPanelProps {
  view: PhotoLayerView
  onChooseSource: (source: SourceChoice) => void
  onChooseLayer: (layerId: SkyImageLayerId) => void
  onRetry: () => void
  onSaveOffline: () => void
}

export function PhotoPanel({ view, onChooseSource, onChooseLayer, onRetry, onSaveOffline }: PhotoPanelProps): ReactElement {
  const sourceId = useId()
  const layerId = useId()
  return (
    <div className="flex flex-col gap-2 text-sm">
      {view.caption && <p>{view.caption}</p>}
      {view.loadingText && (
        <p role="status" className="text-muted">
          {view.loadingText}
        </p>
      )}
      {view.missing && (
        <div role="alert" className="flex flex-col gap-1">
          <p>{view.missing.message}</p>
          <ul className="list-disc pl-5 text-xs text-muted">
            {view.missing.attempts.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div>
            <button type="button" className="button" onClick={() => onRetry()}>
              Spróbuj ponownie
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor={sourceId} className="flex flex-col gap-1 text-xs text-muted">
          Źródło zdjęcia
          <select
            id={sourceId}
            className="control text-sm"
            value={view.source}
            onChange={(event) => onChooseSource(event.target.value as SourceChoice)}
          >
            {view.sourceOptions.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={layerId} className="flex flex-col gap-1 text-xs text-muted">
          Warstwa
          <select
            id={layerId}
            className="control text-sm"
            value={view.layer}
            onChange={(event) => onChooseLayer(event.target.value as SkyImageLayerId)}
          >
            {view.layerOptions.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </label>
        {view.offline && (
          <button type="button" className="button" disabled={view.offline.disabled} onClick={() => onSaveOffline()}>
            {view.offline.label}
          </button>
        )}
      </div>
      {view.saveMessage && <p role="status">{view.saveMessage}</p>}
      <div className="flex flex-col gap-0.5 text-xs text-muted">
        {view.licenses.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  )
}
