import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite(),
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // Sekcja 11: astronomy-engine tylko przez src/services/astroMath.ts (testy używają go jako referencji).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/services/astroMath.ts', 'src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'astronomy-engine',
              message: 'Importuj obliczenia astronomiczne przez src/services/astroMath.ts.',
            },
          ],
        },
      ],
    },
  },
])
