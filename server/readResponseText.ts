export async function readResponseText(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader()
  try {
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('Odpowiedź przekracza limit rozmiaru')
    if (!reader) return ''

    const decoder = new TextDecoder()
    let text = ''
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) return text + decoder.decode()
      size += value.byteLength
      if (size > maxBytes) throw new Error('Odpowiedź przekracza limit rozmiaru')
      text += decoder.decode(value, { stream: true })
    }
  } catch (error) {
    void reader?.cancel().catch(() => {})
    throw error
  } finally {
    reader?.releaseLock()
  }
}
