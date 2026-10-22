/** Znak KONUZASTRO: łuk kopuły nad górami (linia jak na stronie, cyjan). */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 64 46" fill="none" aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" x2="1">
          <stop offset="0" stopColor="#00E0FF" />
          <stop offset="1" stopColor="#0080FF" />
        </linearGradient>
      </defs>
      <path d="M4 42a28 28 0 0 1 56 0" stroke="url(#logo-g)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10 42l11-13 6 6 9-12 18 19" stroke="url(#logo-g)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="44" cy="17" r="1.6" fill="#fff" />
      <circle cx="22" cy="14" r="1" fill="#fff" opacity="0.7" />
    </svg>
  )
}
