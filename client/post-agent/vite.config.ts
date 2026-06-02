import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({ ssr: false }),
    viteReact(),
  ],
  optimizeDeps: {
    exclude: ['@langchain/react'],
  },
  preview: {
    allowedHosts: [
      'posteragent-production.up.railway.app',
      '.railway.app',
      'localhost',
    ],
  },
})

export default config
