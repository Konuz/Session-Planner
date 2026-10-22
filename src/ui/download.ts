// Pobranie pliku tekstowego z przeglądarki (eksport CSV, JSON, horyzontu i kopii zapasowej); tylko w obsłudze zdarzeń.

export function downloadText(text: string, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
