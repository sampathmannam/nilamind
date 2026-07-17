import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Connect, type ViteDevServer} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

// @huggingface/transformers emits its own copy of the onnxruntime-web wasm via `new URL(...)`, which vite
// bundles into dist/assets (~22 MB). But the crisis classifier overrides ORT's wasmPaths (object form: the
// `mjs` glue from public/ort/, the `wasm` binary runtime-downloaded — see onDeviceAssets.ts), so this
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

// DEV-SERVER ONLY. The on-device §9 crisis classifier (crisisEmbedder.ts) points onnxruntime-web at the wasm
// glue in public/ort/ via `env.backends.onnx.wasm.wasmPaths.mjs`, and ORT loads that glue with a
// dynamic `import("/ort/ort-wasm-simd-threaded.asyncify.mjs")`. Vite's dep pipeline requests that URL with a
// `?import` query, which makes Vite's servePublicMiddleware skip it (it treats `?import` as a source import)
// and hand it to the transform middleware — which HARD-ERRORS because the file lives in /public ("...should
// not be imported from source code"). Under `vite dev` that surfaces as a blocking error overlay, and the
// classifier fails to load, so §9 silently degrades to the keyword-only floor in the browser preview.
//
// A production `vite build` has no dev server: public/ort/* is copied as-is and served statically, so
// wasmPaths="/ort/" resolves via a plain GET — this never fires. Native (Capacitor) is the same: bundled
// assets, no Vite. So this shim is scoped to `apply: 'serve'` and changes NOTHING about the build output or
// the runtime wasmPaths; it only makes the dev server answer /ort/*.mjs (with or without ?import) with the
// raw module bytes — exactly what a static host does in prod — instead of erroring. Registered from the
// configureServer BODY so it runs before Vite's internal transform middleware (which is where the throw is).
function serveOrtGlueInDev() {
  const ortDir = path.resolve(__dirname, 'public/ort');
  return {
    name: 'serve-ort-glue-in-dev',
    apply: 'serve' as const,
    configureServer(server: ViteDevServer) {
      const handler: Connect.NextHandleFunction = (req, res, next) => {
        // Match /ort/<name>.mjs regardless of query string (the failing case carries `?import`). Only .mjs:
        // the ~23 MB .wasm is fetch()'d (never import()'d) so it gets no `?import` and Vite already serves it.
        const m = /^\/ort\/([\w.-]+\.mjs)(?:\?.*)?$/.exec(req.url ?? '');
        if (!m) return next();
        const file = path.join(ortDir, m[1]);
        // Defense-in-depth: never escape public/ort, and fall through if the file is somehow absent.
        if (!file.startsWith(ortDir + path.sep) || !fs.existsSync(file)) return next();
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(fs.readFileSync(file));
      };
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    // Strip console.*/debugger from RELEASE bundles only (production + store) so nothing reaches logcat, where
    // a co-located app with READ_LOGS could read it. Dev + test keep their logs for debugging.
    esbuild: mode === 'production' || mode === 'store' ? { drop: ['console', 'debugger'] } : {},
    plugins: [
      serveOrtGlueInDev(),
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
          // MiniLM weights (.onnx, ~22 MB) and the ORT JS glue (.mjs) still ship in public/models and
          // public/ort respectively. NEVER precache these — served directly from the bundle. Globbing
          // them makes vite-plugin-pwa hard-error on the size limit. The Vosk model (.tgz) and the ORT
          // wasm binary (.wasm) are runtime-downloaded (onDeviceAssets.ts, native-only — see its
          // docstring) and no longer live under public/ at all, so there's nothing here to precache or
          // runtime-cache for them; a web/PWA build simply doesn't get the STT / semantic-classifier
          // tiers (it falls back to the always-bundled deterministic keyword §9 floor).
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
    // C2 bundle-size cleanup — deterministic chunk names for every heavy dependency
    // so cache keys are stable across builds. Libraries not listed here auto-chunk with
    // content-hash names that change every build, defeating browser caching.
    manualChunks: {
      recharts: ['recharts'],
      jspdf: ['jspdf'],
      'react-markdown': ['react-markdown'],
      dexie: ['dexie'],
      // C2 additions — previously auto-chunked with unstable names
      transformers: ['@huggingface/transformers'],    // 544 KB, MiniLM embedder (dynamic import)
      vosk: ['vosk-browser'],                         // 5.5 MB, on-device STT (dynamic import)
      html2canvas: ['html2canvas'],                   // 198 KB, jspdf transitive dep
      dompurify: ['dompurify'],                       // 27 KB, jspdf transitive dep
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
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
