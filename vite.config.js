import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    host: true,
    https: false,
    hmr: {
      protocol: 'ws',
      host: '192.168.1.7',
      port: 5173,
    },
  },
}))