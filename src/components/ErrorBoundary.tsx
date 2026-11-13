// Granica błędów: wyjątek w renderze lub efekcie (np. brak WebGL, nieudane pobranie chunku) zostaje w swoim
// fragmencie zamiast odmontować całą aplikację (audyt C03).
import { Component, type ReactNode } from 'react'

interface Props {
  /** Treść zastępcza; domyślnie komunikat z przyciskiem przeładowania. */
  fallback?: (error: Error) => ReactNode
  children: ReactNode
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(error)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error)
    // React.lazy pamięta odrzucony import, więc ponowny render rzuciłby ten sam błąd: ponowienie przeładowuje stronę
    // (stan aplikacji jest w localStorage).
    return (
      <div className="empty" role="alert">
        Nie udało się wyświetlić widoku.{' '}
        <button className="button small" onClick={() => location.reload()}>Wczytaj ponownie</button>
      </div>
    )
  }
}
