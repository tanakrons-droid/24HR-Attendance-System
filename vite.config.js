import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ตั้ง base สำหรับ deploy GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './'
})

