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
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-supabase': ['@supabase/supabase-js']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://accounts.google.com https://appleid.apple.com https://unpkg.com https://js.stripe.com https://*.stripe.com blob:; script-src-elem 'self' 'unsafe-inline' https://*.supabase.co https://unpkg.com https://js.stripe.com https://*.stripe.com blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.ipify.org https://accounts.google.com https://appleid.apple.com https://api.stripe.com https://*.stripe.com blob:; frame-src 'self' https://*.supabase.co https://accounts.google.com https://appleid.apple.com https://checkout.stripe.com https://js.stripe.com blob:; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: https://source.unsplash.com https://*.googleusercontent.com https://*.supabase.co; worker-src 'self' blob:;"
    }
  }
})

