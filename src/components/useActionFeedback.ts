import { useEffect, useRef, useState } from 'react'

export function useActionFeedback() {
  const [feedback, setFeedback] = useState<{ action: string; message: string } | null>(null)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timeout.current), [])

  function confirm(action: string, message: string) {
    clearTimeout(timeout.current)
    setFeedback({ action, message })
    timeout.current = setTimeout(() => setFeedback(null), 900)
  }

  return { feedback, confirm }
}
