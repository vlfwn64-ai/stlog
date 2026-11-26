import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages 주소가 /stlog/ 아래라서 base를 맞춘다
export default defineConfig({
  base: '/stlog/',
  plugins: [react()],
})
