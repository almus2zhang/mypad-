import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,svg,png,jpg,json}'],
        maximumFileSizeToCacheInBytes: 5000000,
      },
      manifest: false, // We already have a manifest.json in public/
    })
  ],

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/language',
            '@codemirror/commands',
            '@codemirror/search',
            '@codemirror/autocomplete',
          ],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['mypad.114.nasnas.site'],
    hmr: {
      host: 'mypad.114.nasnas.site',
      protocol: 'wss',
    },
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
