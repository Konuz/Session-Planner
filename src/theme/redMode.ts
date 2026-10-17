// Red Mode (sekcja 8): klasa `red-mode` na <html> przełącza tokeny, a <meta name="theme-color"> zmienia się na czerń.
import { darkCosmos, redMode, RED_MODE_CLASS } from './tokens'

export function applyRedMode(enabled: boolean): void {
  document.documentElement.classList.toggle(RED_MODE_CLASS, enabled)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', enabled ? redMode.background : darkCosmos.background)
}
