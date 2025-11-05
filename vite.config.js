import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ตั้ง base สำหรับ deploy GitHub Pages
// เปลี่ยน '/YOUR_REPO_NAME/' เป็นชื่อ repository ของคุณ
// ตัวอย่าง: ถ้าชื่อ repo คือ '24hr-attendance' ให้ใช้ base: '/24hr-attendance/'
export default defineConfig({
  plugins: [react()],
  base: '/24HR-Attendance-System/' // กลับไปใช้ GitHub Pages path
})
