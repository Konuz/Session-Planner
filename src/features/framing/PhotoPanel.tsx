// Panel warstwy zdjęcia pod widokiem kadru (zdjecie-w-kadrze); komponent tylko renderuje `PhotoLayerView`.
// ZAŚLEPKA: komponent rzuca NotImplementedError; implementację dopisuje implementer.
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
import type { ReactElement } from 'react'
import type { SkyImageLayerId } from '../../services/skyImage/sources'
import type { PhotoLayerView, SourceChoice } from './photoModel'

export interface PhotoPanelProps {
  view: PhotoLayerView
  onChooseSource: (source: SourceChoice) => void
  onChooseLayer: (layerId: SkyImageLayerId) => void
  onRetry: () => void
  onSaveOffline: () => void
}

export function PhotoPanel(props: PhotoPanelProps): ReactElement {
  const error = new Error(`PhotoPanel: not implemented (${Object.keys(props).length})`)
  error.name = 'NotImplementedError'
  throw error
}
