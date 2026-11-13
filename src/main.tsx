import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/app.css'

// Po wdrożeniu nowej wersji stare chunki znikają z serwera: przeładuj raz zamiast pokazywać błąd (audyt C03).
// Najwyżej raz na minutę; kolejny błąd (np. brak sieci) trafia do granicy błędów z przyciskiem ponowienia.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'tracker-preload-reload'
  try {
    if (Date.now() - Number(sessionStorage.getItem(key) ?? 0) < 60_000) return
    sessionStorage.setItem(key, String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
