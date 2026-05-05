import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(() => ({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    https: true,
    hmr: {
      protocol: 'wss',
      host: '192.168.1.7',
      port: 5173,
    },
  },
}))