import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { requestPersistence } from './services/persistentStorage'
import { usePlannerStore } from './state/plannerStore'
import { applyRedMode } from './theme/redMode'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Brak elementu #root w index.html')

// Preferencja z localStorage jest dostępna od razu, więc Red Mode włącza się przed pierwszym renderem aplikacji.
applyRedMode(usePlannerStore.getState().redMode)
usePlannerStore.subscribe((state, previous) => {
  if (state.redMode !== previous.redMode) applyRedMode(state.redMode)
})

// Pamięć trwała chroni dane użytkownika i zapisane zdjęcia przed usunięciem przez przeglądarkę (sekcja 10).
void requestPersistence(navigator.storage)

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
