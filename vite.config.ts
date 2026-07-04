import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// @huggingface/transformers emits its own copy of the onnxruntime-web wasm via `new URL(...)`, which vite
// bundles into dist/assets (~22 MB). But the crisis classifier overrides ORT's wasmPaths to "/ort/" (served
// from public/ort/, the single asyncify variant that actually loads in the Capacitor WebView), so this
// bundled copy is NEVER fetched — pure APK/download bloat. Drop it from the output. Worst case (ORT somehow
// falls back to the bundled path) it 404s and the classifier fails closed to the deterministic keyword §9
// scan — still safe. publicDir files (public/ort/*) aren't part of this bundle, so only the dup is removed.
function dropRedundantOrtWasm() {
  return {
    name: 'drop-redundant-ort-wasm',
    generateBundle(_options: unknown, bundle: Record<string, unknown>) {
      for (const key of Object.keys(bundle)) {
        if (/ort-wasm.*\.wasm$/.test(key)) delete bundle[key];
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  return {
    // Strip console.*/debugger from RELEASE bundles only (production + store) so nothing reaches logcat, where
    // a co-located app with READ_LOGS could read it. Dev + test keep their logs for debugging.
    esbuild: mode === 'production' || mode === 'store' ? { drop: ['console', 'debugger'] } : {},
    plugins: [
      dropRedundantOrtWasm(),
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
    build: {
      rollupOptions: {
        output: {
          // Split heavy, non-boot-critical libraries into their own chunks so they're no longer welded
          // into the ~7.5 MB eager boot bundle. Each is only pulled when the screen that uses it mounts
          // (charts/insights → recharts, PDF export → jspdf, markdown rendering → react-markdown, the
          // encrypted local store → dexie). Shrinks first-paint parse/eval on a cold app open.
          manualChunks: {
            recharts: ['recharts'],
            jspdf: ['jspdf'],
            'react-markdown': ['react-markdown'],
            dexie: ['dexie'],
          },
        },
      },
    },
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
