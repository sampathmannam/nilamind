import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // Don't auto-inject SW registration — main.tsx registers it on WEB only. In the Capacitor
        // native WebView a service worker only causes stale-cache bugs (it serves an old precached
        // shell after an APK update), so there main.tsx unregisters it and loads bundled assets fresh.
        injectRegister: false,
        // Aggressively replace stale precaches so app updates apply on the next open (helps the
        // Capacitor WebView pick up a new build instead of serving an old cached shell).
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          // vosk-browser WASM chunk (~6 MB) exceeds the 2 MiB SW default;
          // exclude it from precache — it is fetched lazily at runtime instead.
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MiB
          // The on-device crisis classifier bundles MiniLM (.onnx, ~22 MB) + onnxruntime wasm (.wasm,
          // 12-26 MB). NEVER precache these — they're served directly from the bundle (native WebView)
          // or fetched on demand (web). Globbing them makes vite-plugin-pwa hard-error on the size limit.
          globIgnores: ['**/*.wasm', '**/*.onnx', 'models/**', 'ort/**'],
        },
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'NilaMind',
          short_name: 'NilaMind',
          description: 'A calm companion for the hard days',
          theme_color: '#1B0E20',
          background_color: '#1B0E20',
          display: 'standalone',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
