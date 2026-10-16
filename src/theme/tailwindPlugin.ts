// Ładowany przez Tailwind w czasie budowania (@plugin w index.css), nie trafia do paczki aplikacji.
import plugin from 'tailwindcss/plugin'
import { colorTokens, themeVariables, tokenCssName, tokenVariable } from './tokens'

export default plugin(
  (api) => {
    api.addBase(themeVariables())
  },
  {
    theme: {
      extend: {
        colors: Object.fromEntries(colorTokens.map((token) => [tokenCssName(token), `var(${tokenVariable(token)})`])),
      },
    },
  },
)
