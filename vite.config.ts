import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://accounts.google.com https://appleid.apple.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.ipify.org https://accounts.google.com https://appleid.apple.com; frame-src 'self' https://*.supabase.co https://accounts.google.com https://appleid.apple.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' https://source.unsplash.com https://*.googleusercontent.com;"
    }
  }
})

