import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { configDefaults, defineConfig } from 'vitest/config'
import { pwaOptions } from './src/pwaOptions.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA(pwaOptions)],
  test: {
    // .claude/worktrees/ to worktree innych sesji; ich testy nie należą do tego repo.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
