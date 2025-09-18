import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // Tauri API가 번들링되도록 설정
  define: {
    global: 'globalThis',
  },
  // Tauri 환경에서 window 객체 사용을 위한 설정
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
})