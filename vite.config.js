import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { componentTagger } from 'lovable-tagger'

export default defineConfig(({ mode }) => ({
  base: '/', // 👈 NECESARIO para producción
  build: {
    outDir: 'dist', // 👈 Vercel servirá desde aquí
  },
  server: {
    host: '::',
    port: 8080,
    proxy:
      mode === 'development'
        ? {
            '/api': {
              target: 'http://localhost:3001',
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
  },
  plugins: [react(), mode === 'development' && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
}))
