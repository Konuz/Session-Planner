import { memo, useEffect, useState } from 'react'

// „Rozszyfrowywanie” tekstu jak na kartach galerii konuzastro.pl: znaki losowe z tego samego zestawu,
// odsłaniane od lewej z łagodnym wyhamowaniem (ease-out cubic) w ciągu `duration` ms.
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&'
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function scramble(text: string, progress: number): string {
  const revealed = (progress * text.length) | 0
  let out = ''
  for (let i = 0; i < text.length; i++) out += i < revealed || text[i] === ' ' ? text[i] : CHARS[(Math.random() * CHARS.length) | 0]
  return out
}

/** Tekst rozszyfrowywany, gdy `trigger` przechodzi w true (np. najechanie) albo gdy zmienia się `text`. */
export const ScrambleText = memo(function ScrambleText({ text, trigger = true, duration = 1000 }: { text: string; trigger?: boolean; duration?: number }) {
  const [shown, setShown] = useState(text)
  useEffect(() => {
    if (!trigger || reduced()) {
      setShown(text)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration)
      setShown(k < 1 ? scramble(text, 1 - (1 - k) ** 3) : text)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, trigger, duration])
  return <>{shown}</>
})
