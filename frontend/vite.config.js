import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || "/A2Z-Ecommerce-",
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})