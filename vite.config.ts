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
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@mui')) {
              return 'vendor-mui';
            }
            if (id.includes('supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('stripe')) {
              return 'vendor-stripe';
            }
            if (id.includes('pdf') || id.includes('pdfjs')) {
              return 'vendor-pdf';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            if (id.includes('formik') || id.includes('yup')) {
              return 'vendor-forms';
            }
            return 'vendor-other';
          }
        },
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
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

