import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

const alias = {
  '@': path.resolve(__dirname, 'src'),
  '@shared': path.resolve(__dirname, 'shared'),
}

export default defineConfig({
  base: './',
  resolve: { alias },
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          resolve: { alias },
          build: {
            outDir: 'dist-electron',
            rollupOptions: { external: ['electron', 'node:sqlite'] },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          resolve: { alias },
          build: { outDir: 'dist-electron' },
        },
      },
    }),
  ],
  test: { include: ['shared/**/*.test.ts', 'electron/**/*.test.ts'] },
})
